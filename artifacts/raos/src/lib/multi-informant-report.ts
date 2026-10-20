export interface MultiInformantScore {
  respondentType: string;
  sourceLabel?: string;
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
  supportIdea?: string;
}

export interface MultiInformantSingleSourceDomain {
  domain: string;
  label: string;
  rating: MultiInformantRating;
}

export interface MultiInformantStrength {
  domain: string;
  label: string;
  sourceLabel: string;
  value: number;
  interpretation: string;
}

export interface MultiInformantReport {
  sources: MultiInformantSource[];
  summary: string;
  domainFindings: MultiInformantDomainFinding[];
  singleSourceDomains: MultiInformantSingleSourceDomain[];
  strengths: MultiInformantStrength[];
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

const CDP_DOMAIN_GUIDANCE: Record<string, { meaning: string; support: string }> = {
  organization_planning: {
    meaning: "organizing materials, choosing a first step, sequencing work, and following a task through",
    support: "Use a short visual plan or checklist, make the first action explicit, and gradually reduce prompts as the learner completes each step.",
  },
  working_memory: {
    meaning: "holding and using information while listening, processing instructions, or completing a task",
    support: "Give directions in brief chunks, pair spoken instructions with a written or visual cue, and check understanding by asking the learner to identify the next step.",
  },
  reasoning: {
    meaning: "solving problems, explaining choices, and adjusting a strategy when circumstances change",
    support: "Model a think-aloud, teach a small set of problem-solving steps, and practise applying them to both familiar and new tasks.",
  },
  applied_academic: {
    meaning: "using academic knowledge in practical, functional activities",
    support: "Teach the target skill explicitly, then practise it in meaningful everyday tasks with examples, guided practice, and feedback.",
  },
  time_measurement: {
    meaning: "understanding time, schedules, measurement, and related quantitative concepts",
    support: "Use a visible schedule or timer and provide hands-on practice with clocks, durations, quantities, and measurement in real routines.",
  },
  social_cognitive: {
    meaning: "interpreting social situations, considering another person's perspective, and selecting a response",
    support: "Use concrete scenarios, guided discussion, and role-play to make social cues, possible responses, and likely outcomes explicit.",
  },
  independence: {
    meaning: "managing age-appropriate routines, responsibilities, and everyday tasks with increasing independence",
    support: "Break routines into observable steps, use a checklist where helpful, and fade adult prompts only as independent completion becomes reliable.",
  },
  managing_emotions: {
    meaning: "recognizing emotions, communicating feelings, and adjusting responses across situations",
    support: "Practise naming feelings and noticing early cues during calm moments; agree on a small set of coping choices the learner can use with support.",
  },
  adaptive_behavior: {
    meaning: "understanding expectations, responding to guidance, and reflecting on one's own behaviour",
    support: "State expectations positively and specifically, reinforce the behaviour when it occurs, and use consistent prompts across the relevant routines.",
  },
  managing_stress: {
    meaning: "noticing stress, communicating worry, and using coping strategies or trusted support",
    support: "Work with the learner to identify stress cues and helpful responses, then make those options easy to access in the situations where they are needed.",
  },
  coping_with_change: {
    meaning: "moving between activities and adapting when routines or expectations change",
    support: "Preview transitions, use a visual schedule and clear advance notice, and practise manageable changes with predictable adult support.",
  },
  physical_wellness: {
    meaning: "communicating basic needs and participating in self-care and wellness routines",
    support: "Teach self-care routines step by step and provide an accessible way to request help; consult relevant health professionals when a specific health concern is reported.",
  },
  social_interaction: {
    meaning: "joining, maintaining, and navigating social interaction with other people",
    support: "Offer structured, low-pressure opportunities to practise interaction, with clear roles, modelling, and feedback matched to the learner's interests.",
  },
  executive_functioning: {
    meaning: "planning, organizing, remembering steps, and shifting approach when needed",
    support: "Use an external plan or checklist, model how to begin and check work, and teach one routine at a time before fading support.",
  },
  metacognition: {
    meaning: "noticing how a task is going, checking one's work, and reflecting on progress",
    support: "Teach a brief self-check routine, model how to compare work with a goal, and invite the learner to name what helped and what to try next.",
  },
  attention_listening: {
    meaning: "attending to spoken information and identifying the important parts of a message",
    support: "Gain the learner's attention before giving a concise direction, reduce competing information when possible, and pair key points with a visual reminder.",
  },
  gestural_cues: {
    meaning: "noticing and interpreting contextual, nonverbal, or gestural information",
    support: "Make important cues explicit, explain what they mean in the moment, and practise reading them in concrete examples without assuming intent.",
  },
  comprehension: {
    meaning: "understanding spoken or contextual language and responding to its meaning",
    support: "Use clear, concise language, check understanding without pressure, and add visual examples or rephrasing when a message is not understood.",
  },
  expressive_communication: {
    meaning: "expressing needs, ideas, information, or feelings so others can understand",
    support: "Allow adequate response time, offer more than one communication route, and model or scaffold the language needed for the activity.",
  },
  social_skills: {
    meaning: "using learned interaction skills in everyday social activities",
    support: "Teach and practise one clearly defined interaction skill in a real activity, with preparation beforehand and supportive feedback afterward.",
  },
  social_awareness: {
    meaning: "noticing other people's perspectives, reactions, and social context",
    support: "Use concrete examples to discuss what different people may know, feel, or expect, while checking the learner's own understanding rather than assuming it.",
  },
  social_initiation: {
    meaning: "starting an interaction, requesting help, or joining an activity",
    support: "Create predictable invitations to participate, model simple ways to begin, and respect the learner's preferred communication style and choice.",
  },
  strengths: {
    meaning: "capabilities identified by the strength-focused items on this form",
    support: "Use the learner's demonstrated interests and capabilities as entry points for participation, relationship-building, and new learning.",
  },
  peer_interaction: {
    meaning: "participating with peers and navigating the give-and-take of shared activities",
    support: "Plan supported peer activities around shared interests, make roles and expectations clear, and observe which conditions help participation.",
  },
  safety_awareness: {
    meaning: "recognizing safety, privacy, and personal-boundary expectations",
    support: "Teach safety and privacy rules explicitly with concrete scenarios, rehearse how to seek help, and check understanding in the settings where the rules apply.",
  },
  empathy_emotions: {
    meaning: "noticing and interpreting emotions and perspectives in other people",
    support: "Discuss emotions using concrete examples, invite more than one possible explanation, and practise helpful responses without treating a single interpretation as certain.",
  },
  social_norms: {
    meaning: "understanding expectations and conventions that vary across social settings",
    support: "Explain the specific expectation for each setting, show examples, and give a discreet prompt before the relevant situation when helpful.",
  },
  self_advocacy: {
    meaning: "communicating preferences, needs, boundaries, or requests for support",
    support: "Offer regular, low-pressure choices and teach a usable phrase or communication method for requesting help, clarification, or a break.",
  },
  friendship: {
    meaning: "developing and maintaining positive peer relationships",
    support: "Support repeated, interest-based opportunities with compatible peers and teach relationship skills in context rather than relying only on abstract advice.",
  },
  conflict_resolution: {
    meaning: "communicating during disagreement and identifying safe, constructive next steps",
    support: "Teach a simple pause–explain–listen–choose routine and practise it with adult support before expecting independent use in a difficult moment.",
  },
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
    const baseLabel = score.sourceLabel || readableRespondentType(score.respondentType || "respondent");
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

function getRatingBand(value: number, higherIsBetter: boolean, profile?: "cdp"): string {
  if (profile === "cdp") {
    if (value < 25) return "Significant concern";
    if (value < 50) return "Moderate concern";
    if (value < 75) return "Mild concern";
    return "Typical range";
  }
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

function hasConcern(value: number, higherIsBetter: boolean, profile?: "cdp"): boolean {
  if (profile === "cdp") return value < 75;
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

function cdpDomainId(domain: string): string {
  return domain.split(":").at(-1) ?? domain;
}

function buildCdpDomainInterpretation(
  domain: string,
  ratings: MultiInformantRating[],
  pattern: "similar" | "different",
): { interpretation: string; supportIdea: string } {
  const guidance = CDP_DOMAIN_GUIDANCE[cdpDomainId(domain)];
  const meaning = guidance?.meaning ?? "a developmental or everyday learning skill";
  const lowerRatings = ratings.filter((rating) => rating.value < 50);
  const mildRatings = ratings.filter((rating) => rating.value >= 50 && rating.value < 75);

  let patternText: string;
  if (lowerRatings.length === ratings.length) {
    patternText = "Every available respondent rating falls below 50%, making this a shared area to prioritize for direct, practical support.";
  } else if (lowerRatings.length > 1) {
    patternText = "At least two respondents place this area below 50%, providing a convergent signal for targeted support while still requiring examples from the settings they know.";
  } else if (lowerRatings.length === 1) {
    const otherRatingText = ratings.length === 2 ? "the other rating does not" : "the remaining ratings do not";
    patternText = `One respondent places this area below 50%; ${otherRatingText} show the same level of concern, so follow up first in the context described by ${lowerRatings[0].sourceLabel}.`;
  } else if (mildRatings.length > 0) {
    patternText = "The ratings fall in the 50–74% band, suggesting that this skill may be less consistent or may benefit from occasional scaffolding rather than indicating a uniform difficulty.";
  } else {
    patternText = "All available ratings are 75% or higher, indicating a relative capability reported across these respondents; this does not mean the skill is effortless in every activity.";
  }

  const comparisonText = pattern === "similar"
    ? "The ratings are numerically close, so respondents describe a broadly similar level on this form."
    : "The ratings differ meaningfully, so the skill may look different across settings, tasks, supports, observation opportunities, or time periods; the difference should be explored, not treated as a disagreement about who is correct.";
  const evidenceText = "A domain score summarizes several items and cannot identify which individual item or circumstance is driving the result.";

  return {
    interpretation: `This domain concerns ${meaning}. ${patternText} ${comparisonText} ${evidenceText}`,
    supportIdea: guidance?.support ?? "Review the item-level responses with recent examples, then select a specific skill to practise in the relevant setting.",
  };
}

function buildCdpSummary(
  studentName: string,
  sources: MultiInformantSource[],
  findings: MultiInformantDomainFinding[],
  strengths: MultiInformantStrength[],
  singleSourceDomains: MultiInformantSingleSourceDomain[],
): string {
  const respondentNames = sources.map((source) => source.label);
  const similarCount = findings.filter((finding) => finding.pattern === "similar").length;
  const differentCount = findings.length - similarCount;
  const sharedPriorities = findings.filter(
    (finding) => finding.ratings.filter((rating) => rating.value < 50).length >= 2,
  );
  const individualPriorities = findings.filter(
    (finding) => finding.ratings.filter((rating) => rating.value < 50).length === 1,
  );
  const sharedNames = sharedPriorities.slice(0, 4).map((finding) => finding.label);
  const individualDetails = individualPriorities.slice(0, 4).map((finding) => {
    const source = finding.ratings.find((rating) => rating.value < 50)?.sourceLabel;
    return source ? `${finding.label} (${source})` : finding.label;
  });
  const strengthNames = Array.from(new Set(strengths.slice(0, 5).map((strength) => strength.label)));

  const opening = `${studentName}'s Child Development Profile brings together separate reports from ${respondentNames.join(", ")}. The forms describe skills across learning, communication, social participation, and self-regulation. Results are interpreted by respondent and domain; they are not combined into a single student score.`;
  const comparison = findings.length > 0
    ? `Across ${findings.length} domain areas rated by more than one respondent, ${similarCount} show numerically close ratings and ${differentCount} show meaningful differences. Similarity suggests convergence in how the skill is described on this form, while differences can point to the settings, task demands, supports, or observation opportunities that need closer review.`
    : "The available records do not share domains that can be compared directly. Each respondent's profile should therefore be considered on its own, with context gathered before drawing conclusions across settings.";
  const scoreContext = "On the CDP's descriptive 0–100 scale, a rating below 50 falls in the moderate or significant concern bands. This is not a percent-correct score, diagnosis, or proof that the student cannot do the skill; it indicates where the team should look more closely.";
  const interventionGuidance = "To plan support, open the item-level responses and use recent examples to identify the specific task and routine that are difficult. Start with one or two goals, not one goal for every domain. Make each goal observable by stating what the student will do, where or when they will do it, and how much help is allowed. Then agree on a matching support, who will provide it, how progress will be noted, and when the team will review it.";
  const priorities = sharedNames.length > 0
    ? `Start by reviewing these shared priority areas: ${sharedNames.join(", ")}. At least two respondents rated each below 50%, so the concern is reported by more than one respondent. ${scoreContext}\n\n${interventionGuidance}${individualDetails.length > 0 ? `\n\nAlso follow up on ${individualDetails.join(", ")}. Only one respondent rated each below 50%, so first check that person's recent examples and compare with another respondent's observations before treating it as a need across settings.` : ""}`
    : individualDetails.length > 0
      ? `No matched domain was rated below 50% by two or more respondents. The areas flagged by one respondent are ${individualDetails.join(", ")}. Treat each as a concern to investigate in that respondent's setting, not as a confirmed difficulty everywhere. ${scoreContext}\n\n${interventionGuidance}`
      : `No matched domain has ratings below 50% from multiple respondents. Continue to review item-level responses and areas in the 50–74% band to see whether they affect participation in everyday activities. ${scoreContext}\n\n${interventionGuidance}`;
  const strengthsText = strengthNames.length > 0
    ? `Potential assets are also present: ratings of 75% or higher were reported in ${strengthNames.join(", ")}. These are relative strengths within the available CDP records—not proof of mastery in every situation—and can provide useful entry points for teaching and participation.`
    : "The current records do not identify a domain with a rating of 75% or higher. Strengths may still be evident in item responses, the student's perspective, interests, or direct observation and should be documented alongside support needs.";
  const singleSourceText = singleSourceDomains.length > 0
    ? `Some domains appear in only one respondent record (${singleSourceDomains.length} domain${singleSourceDomains.length === 1 ? "" : "s"}); these are reported as individual observations and are not compared with another setting.`
    : "";

  return [opening, comparison, priorities, strengthsText, singleSourceText].filter(Boolean).join("\n\n");
}

export function buildMultiInformantReport(
  scores: MultiInformantScore[],
  options: {
    studentName: string;
    higherIsBetter: boolean;
    domainLabels?: Record<string, string>;
    profile?: "cdp";
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
        band: getRatingBand(value, options.higherIsBetter, options.profile),
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
    const cdpInterpretation = options.profile === "cdp"
      ? buildCdpDomainInterpretation(domain, ratings, pattern)
      : undefined;
    const interpretation = cdpInterpretation?.interpretation ?? (pattern === "similar"
      ? `Ratings for ${label} are numerically close across the available respondents (${ratingText}). This indicates a similar reported pattern on this dashboard's scale; check it against examples and other evidence.`
      : `Ratings for ${label} differ across respondents (${ratingText}). Differences may reflect setting, task demands, opportunity to observe, current supports, expectations, or timing; they do not establish that one account is more accurate.`);

    domainFindings.push({
      domain,
      label,
      ratings,
      spread,
      pattern,
      interpretation,
      ...(cdpInterpretation ? { supportIdea: cdpInterpretation.supportIdea } : {}),
    });
  }

  const names = sources.map((source) => source.label);
  const sharedCount = domainFindings.length;
  const similarCount = domainFindings.filter((finding) => finding.pattern === "similar").length;
  const differentCount = sharedCount - similarCount;
  const standardSummary = sharedCount > 0
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
        band: getRatingBand(value, options.higherIsBetter, options.profile),
      };
      return [{
        domain,
        label,
        rating,
      }];
    });
  const strengths: MultiInformantStrength[] = options.profile === "cdp"
    ? sources.flatMap(({ label: sourceLabel, score }) => toDomainEntries(score)
      .filter(([, value]) => value >= 75)
      .map(([domain, value]) => ({
        domain,
        label: options.domainLabels?.[domain] ?? domain.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
        sourceLabel,
        value,
        interpretation: `This respondent's ${value}% rating identifies a relative asset on the CDP items for this domain. Consider how it can support participation and learning in the activities this respondent observes.`,
      })))
    : [];
  const summary = options.profile === "cdp"
    ? buildCdpSummary(options.studentName, sources, domainFindings, strengths, singleSourceDomains)
    : standardSummary;
  const coverageNote = sharedCount > 0
    ? `${unsharedDomains > 0 ? `${unsharedDomains} domain${unsharedDomains === 1 ? "" : "s"} appear in only one respondent record and are not directly compared. ` : ""}Only matching domain keys are compared; forms may still differ in items, wording, or observation context.`
    : "Because no domain scores are shared across respondents, review each respondent's profile separately rather than comparing unlike domains.";

  const recommendations: string[] = [];
  const sharedConcerns = domainFindings.filter(
    (finding) => finding.ratings.filter((rating) => hasConcern(rating.value, options.higherIsBetter, options.profile)).length >= 2,
  );
  const contextSpecificConcerns = domainFindings.filter((finding) => {
    const concernedCount = finding.ratings.filter((rating) => hasConcern(rating.value, options.higherIsBetter, options.profile)).length;
    return concernedCount > 0 && concernedCount < finding.ratings.length;
  });
  const differingDomains = domainFindings.filter((finding) => finding.pattern === "different");
  const singleSourceConcerns = singleSourceDomains.filter((finding) =>
    options.profile === "cdp"
      ? finding.rating.value < 50
      : hasConcern(finding.rating.value, options.higherIsBetter, options.profile),
  );
  const sharedNames = sharedConcerns.map((finding) => finding.label);

  const strengthsOrLowerConcern = domainFindings.filter((finding) =>
    finding.ratings.some((rating) => options.profile === "cdp"
      ? rating.value >= 75
      : options.higherIsBetter ? rating.value >= 80 : rating.value <= 25),
  );
  if (options.profile === "cdp") {
    const priorityFindings = domainFindings
      .map((finding) => ({
        finding,
        lowerCount: finding.ratings.filter((rating) => rating.value < 50).length,
        significantCount: finding.ratings.filter((rating) => rating.value < 25).length,
        mildCount: finding.ratings.filter((rating) => rating.value >= 50 && rating.value < 75).length,
      }))
      .filter((item) => item.lowerCount > 0 || item.mildCount > 0)
      .sort((a, b) =>
        b.lowerCount - a.lowerCount ||
        b.significantCount - a.significantCount ||
        b.mildCount - a.mildCount,
      )
      .slice(0, 4);

    for (const { finding, lowerCount, mildCount } of priorityFindings) {
      const concernedSources = finding.ratings.filter((rating) => rating.value < 50).map((rating) => rating.sourceLabel);
      const context = lowerCount === finding.ratings.length
        ? `All respondents with ratings placed ${finding.label} below 50%`
        : lowerCount > 1
          ? `Multiple respondents rated ${finding.label} below 50%`
        : lowerCount === 1
          ? `${concernedSources[0]} rated ${finding.label} below 50%`
          : `${mildCount} respondent rating${mildCount === 1 ? "" : "s"} place ${finding.label} in the 50–74% band`;
      recommendations.push(
        `${context}. ${finding.supportIdea ?? "Review recent examples and identify a practical support for the activity concerned."} Agree on one observable indicator of progress and identify who will notice it.`,
      );
    }

    if (differingDomains.length > 0) {
      recommendations.push(
        `For ${differingDomains.slice(0, 4).map((finding) => finding.label).join(", ")}, compare recent examples from each setting: the activity, task demands, available supports, how often the respondent sees the skill, and when the example occurred. Use this context to determine whether the learner needs different supports by setting.`,
      );
    }

    if (singleSourceConcerns.length > 0) {
      recommendations.push(
        `Before extending a single-source concern in ${singleSourceConcerns.slice(0, 4).map((finding) => `${finding.label} (${finding.rating.sourceLabel})`).join(", ")} to other settings, seek a relevant observation, student perspective, or additional respondent evidence.`,
      );
    }

    if (strengths.length > 0) {
      const strengthDomains = Array.from(new Set(strengths.slice(0, 5).map((strength) => strength.label)));
      recommendations.push(
        `Build on the relative assets reported in ${strengthDomains.join(", ")} by using the learner's interests and demonstrated capabilities as entry points for participation and new skill practice.`,
      );
    }

    recommendations.push(
      "Select one or two priorities with the learner and relevant adults, record the current level of independence or support, and review concrete examples after an agreed period (for example, four to six weeks). Consider item responses, direct observation, work samples, and student perspective alongside these descriptive scores.",
    );
  } else {
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
  }

  return {
    sources,
    summary,
    domainFindings,
    singleSourceDomains,
    strengths,
    coverageNote,
    recommendations,
    limitations: options.profile === "cdp"
      ? "The 0–100 values are descriptive conversions of CDP item responses, not age-based standard scores, probabilities, or diagnostic results. Ratings are not pooled or averaged. Interpret them with item-level responses, direct observation, student perspective, and relevant history; this profile alone does not establish a diagnosis, severity, or eligibility."
      : "The displayed 0–100 values are descriptive conversions of form responses, not pooled scores or norm-referenced estimates. Comparisons are limited to matching domain keys and do not by themselves establish diagnosis, severity, or eligibility.",
  };
}
