export interface MultiInformantScore {
  respondentType: string;
  toolId?: string;
  toolName?: string;
  normalizedScores?: Record<string, unknown> | null;
}

export interface MultiInformantSource {
  key: string;
  label: string;
  index: number;
  score: MultiInformantScore;
}

export interface MultiInformantRating {
  sourceKey: string;
  sourceLabel: string;
  value: number;
  band: string;
}

export interface MultiInformantDomainFinding {
  domain: string;
  label: string;
  ratings: MultiInformantRating[];
  spread: number;
  pattern: "similar" | "different";
  interpretation: string;
}

export interface MultiInformantSingleSourceDomain {
  domain: string;
  label: string;
  rating: MultiInformantRating;
}

export interface MultiInformantReport {
  sources: MultiInformantSource[];
  summary: string;
  domainFindings: MultiInformantDomainFinding[];
  singleSourceDomains: MultiInformantSingleSourceDomain[];
  coverageNote: string;
  recommendations: string[];
  limitations: string;
}

const NON_CLINICAL_DOMAINS = new Set([
  "admin",
  "referral",
  "demographic",
  "admin_info",
  "instructions",
  "general_info",
  "identifying_info",
]);

const RESPONDENT_LABELS: Record<string, string> = {
  parent: "Parent / caregiver",
  teacher: "Teacher",
  teacher1: "Teacher 1",
  teacher2: "Teacher 2",
  self: "Student self-report",
  student: "Student self-report",
  referring_teacher: "Referring teacher",
  boarding_staff: "Boarding staff",
  clinician: "Clinician",
  invigilator: "Examiner",
};

function readableRespondentType(value: string): string {
  return RESPONDENT_LABELS[value] ??
    value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildMultiInformantSources(scores: MultiInformantScore[]): MultiInformantSource[] {
  const counts = new Map<string, number>();
  for (const score of scores) {
    counts.set(score.respondentType, (counts.get(score.respondentType) ?? 0) + 1);
  }

  const seen = new Map<string, number>();
  return scores.map((score, index) => {
    const ordinal = (seen.get(score.respondentType) ?? 0) + 1;
    seen.set(score.respondentType, ordinal);
    const baseLabel = readableRespondentType(score.respondentType || "respondent");
    const repeated = (counts.get(score.respondentType) ?? 0) > 1;
    const label = repeated
      ? `${baseLabel} · Record ${ordinal}${score.toolName ? ` (${score.toolName})` : ""}`
      : baseLabel;

    return {
      key: repeated ? `${score.respondentType || "respondent"}-${index}` : score.respondentType || `respondent-${index}`,
      label,
      index,
      score,
    };
  });
}

function getRatingBand(value: number, higherIsBetter: boolean): string {
  if (higherIsBetter) {
    if (value < 40) return "High support need";
    if (value < 60) return "Emerging";
    if (value < 80) return "Developing";
    return "Relative strength";
  }
  if (value <= 25) return "Low";
  if (value <= 50) return "Mild";
  if (value <= 65) return "Moderate";
  return "Elevated";
}

function hasConcern(value: number, higherIsBetter: boolean): boolean {
  return higherIsBetter ? value < 60 : value > 50;
}

function toDomainEntries(score: MultiInformantScore): [string, number][] {
  const entries: [string, number][] = [];
  for (const [domain, value] of Object.entries(score.normalizedScores ?? {})) {
    if (
      !NON_CLINICAL_DOMAINS.has(domain) &&
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      entries.push([domain, value]);
    }
  }
  return entries;
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

export function buildMultiInformantReport(
  scores: MultiInformantScore[],
  options: {
    studentName: string;
    higherIsBetter: boolean;
    domainLabels?: Record<string, string>;
  },
): MultiInformantReport {
  const sources = buildMultiInformantSources(scores);
  const domainKeys = new Set(scores.flatMap((score) => toDomainEntries(score).map(([domain]) => domain)));
  const domainFindings: MultiInformantDomainFinding[] = [];

  for (const domain of domainKeys) {
    const ratings = sources.flatMap(({ key, label, score }) => {
      const value = score.normalizedScores?.[domain];
      if (typeof value !== "number" || !Number.isFinite(value)) return [];
      return [{
        sourceKey: key,
        sourceLabel: label,
        value,
        band: getRatingBand(value, options.higherIsBetter),
      }];
    });
    if (ratings.length < 2) continue;

    const values = ratings.map((rating) => rating.value);
    const spread = Math.max(...values) - Math.min(...values);
    const pattern = spread <= 15 ? "similar" : "different";
    const label = options.domainLabels?.[domain] ??
      domain.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    const ratingText = ratings
      .map((rating) => `${rating.sourceLabel}: ${rating.value}/100 (${rating.band})`)
      .join("; ");
    const interpretation = pattern === "similar"
      ? `Ratings for ${label} are numerically close across the available respondents (${ratingText}). This indicates a similar reported pattern on this dashboard's scale; check it against examples and other evidence.`
      : `Ratings for ${label} differ across respondents (${ratingText}). Differences may reflect setting, task demands, opportunity to observe, current supports, expectations, or timing; they do not establish that one account is more accurate.`;

    domainFindings.push({ domain, label, ratings, spread, pattern, interpretation });
  }

  const names = sources.map((source) => source.label);
  const sharedCount = domainFindings.length;
  const similarCount = domainFindings.filter((finding) => finding.pattern === "similar").length;
  const differentCount = sharedCount - similarCount;
  const summary = sharedCount > 0
    ? `For ${options.studentName}, this comparative report brings together ${sources.length} separate respondent records (${names.join(", ")}). Ratings are retained by respondent and are not averaged. Of ${sharedCount} domain${sharedCount === 1 ? "" : "s"} rated by at least two respondents, ${similarCount} ${pluralize(similarCount, "domain")} show numerically close ratings and ${differentCount} ${pluralize(differentCount, "domain")} show differences.`
    : `For ${options.studentName}, this report brings together ${sources.length} separate respondent records (${names.join(", ")}), with ratings kept separate. The selected forms do not contain domain scores that can be compared across at least two respondents.`;

  const domainCounts = new Map<string, number>();
  const domainSourceIndexes = new Map<string, number[]>();
  for (const [sourceIndex, score] of scores.entries()) {
    for (const [domain] of toDomainEntries(score)) {
      domainCounts.set(domain, (domainCounts.get(domain) ?? 0) + 1);
      domainSourceIndexes.set(domain, [...(domainSourceIndexes.get(domain) ?? []), sourceIndex]);
    }
  }
  const unsharedDomains = Array.from(domainCounts.values()).filter((count) => count === 1).length;
  const singleSourceDomains: MultiInformantSingleSourceDomain[] = Array.from(domainCounts.entries())
    .filter(([, count]) => count === 1)
    .flatMap(([domain]) => {
      const sourceIndex = domainSourceIndexes.get(domain)?.[0];
      const source = sourceIndex === undefined ? undefined : sources[sourceIndex];
      const value = source?.score.normalizedScores?.[domain];
      if (!source || typeof value !== "number" || !Number.isFinite(value)) return [];
      const label = options.domainLabels?.[domain] ??
        domain.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
      const rating: MultiInformantRating = {
        sourceKey: source.key,
        sourceLabel: source.label,
        value,
        band: getRatingBand(value, options.higherIsBetter),
      };
      return [{
        domain,
        label,
        rating,
      }];
    });
  const coverageNote = sharedCount > 0
    ? `${unsharedDomains > 0 ? `${unsharedDomains} domain${unsharedDomains === 1 ? "" : "s"} appear in only one respondent record and are not directly compared. ` : ""}Only matching domain keys are compared; forms may still differ in items, wording, or observation context.`
    : "Because no domain scores are shared across respondents, review each respondent's profile separately rather than comparing unlike domains.";

  const recommendations: string[] = [];
  const sharedConcerns = domainFindings.filter(
    (finding) => finding.ratings.filter((rating) => hasConcern(rating.value, options.higherIsBetter)).length >= 2,
  );
  const contextSpecificConcerns = domainFindings.filter((finding) => {
    const concernedCount = finding.ratings.filter((rating) => hasConcern(rating.value, options.higherIsBetter)).length;
    return concernedCount > 0 && concernedCount < finding.ratings.length;
  });
  const differingDomains = domainFindings.filter((finding) => finding.pattern === "different");
  const singleSourceConcerns = singleSourceDomains.filter((finding) =>
    hasConcern(finding.rating.value, options.higherIsBetter),
  );
  const sharedNames = sharedConcerns.map((finding) => finding.label);

  if (sharedNames.length > 0) {
    recommendations.push(
      `Review ${sharedNames.join(", ")} collaboratively because at least two respondents reported ratings in the dashboard's concern range. Select one or two observable goals, agree on practical supports in the relevant settings, and record how progress will be noticed.`,
    );
  }

  if (differingDomains.length > 0) {
    recommendations.push(
      `For ${differingDomains.map((finding) => finding.label).join(", ")}, ask each respondent for recent, specific examples. Record the activity, setting, task demand, available support, and time period so the team can understand when the difficulty is more or less apparent.`,
    );
  }

  if (contextSpecificConcerns.length > 0) {
    recommendations.push(
      `For ${contextSpecificConcerns.map((finding) => finding.label).join(", ")}, follow up first in the context of the respondent(s) reporting greater concern. Seek a brief observation, work sample, or student perspective before extending that interpretation to other settings.`,
    );
  }

  if (singleSourceConcerns.length > 0) {
    recommendations.push(
      `For ${singleSourceConcerns.map((finding) => `${finding.label} (${finding.rating.sourceLabel})`).join(", ")}, the concern-range rating is available from one respondent record only. Gather a relevant observation, student perspective, or additional informant evidence before treating it as a broader pattern.`,
    );
  }

  const strengthsOrLowerConcern = domainFindings.filter((finding) =>
    finding.ratings.some((rating) => options.higherIsBetter ? rating.value >= 80 : rating.value <= 25),
  );
  if (strengthsOrLowerConcern.length > 0) {
    recommendations.push(
      `Use ${strengthsOrLowerConcern.map((finding) => finding.label).join(", ")} as possible entry points for engagement or support, while confirming how these areas present in everyday activities.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Review each respondent's profile alongside specific examples and existing supports. If a concern is raised in discussion, gather direct observations or work samples in the relevant setting before setting a shared goal.",
    );
  }

  recommendations.push(
    "At review, compare observable examples from the same settings and similar activities. Interpret these descriptive ratings with interviews, direct observation, work samples, and the assessment's own guidance; do not use this cross-informant summary alone to make a diagnosis or eligibility decision.",
  );

  return {
    sources,
    summary,
    domainFindings,
    singleSourceDomains,
    coverageNote,
    recommendations,
    limitations: "The displayed 0–100 values are descriptive conversions of form responses, not pooled scores or norm-referenced estimates. Comparisons are limited to matching domain keys and do not by themselves establish diagnosis, severity, or eligibility.",
  };
}
