import type { LiteracyDocument } from "./chineseLiteracyStore.js";

export const LITERACY_FREQUENCY_LABELS = [
  { value: 1, label: "Never or almost never" },
  { value: 2, label: "Occasionally" },
  { value: 3, label: "Sometimes" },
  { value: 4, label: "Often" },
  { value: 5, label: "Almost always" },
] as const;

export interface ChineseLiteracyDomainObservation {
  id: string;
  label: string;
  distribution: Array<{ value: number; label: string; count: number }>;
  mean: string | number | null;
  validCount: number;
  applicableCount: number;
  requiredValidCount: number;
  coverage: number | null;
  frequentDifficultyCount: number;
  frequentDifficultyItemIds: string[];
  notObservedCount: number;
  notApplicableCount: number;
  unansweredCount: number;
  impact: number | null;
  strengths: string;
  supports: string;
  examples: Array<{ text: string; itemIds: string[] }>;
  narrative: string;
  itemsWithFrequentRatings: Array<{ id: string; text: string; value: number }>;
}

const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

/**
 * Derives a brief, factual result explanation and rating distribution from one
 * submitted parent OR teacher record. It deliberately does not infer severity.
 */
export function buildChineseLiteracyDomainObservations(doc: LiteracyDocument): ChineseLiteracyDomainObservation[] {
  const selected = new Set(doc.selectedDomains ?? []);
  const responseByItem = new Map((doc.input?.responses ?? []).map(response => [response.itemId, response]));

  return (doc.metadata?.domains ?? [])
    .filter(domain => selected.has(domain.id))
    .map(domain => {
      const score = (doc.scores ?? []).find(entry => entry.id === domain.id);
      const evidence = doc.input?.evidence?.[domain.id];
      const rated = domain.items.flatMap(item => {
        const response = responseByItem.get(item.id);
        return response?.status === "rated" && typeof response.value === "number"
          ? [{ id: item.id, text: item.text, value: response.value }]
          : [];
      });
      const distribution = LITERACY_FREQUENCY_LABELS.map(anchor => ({
        ...anchor,
        count: rated.filter(response => response.value === anchor.value).length,
      }));
      const topCount = Math.max(0, ...distribution.map(item => item.count));
      const mostCommon = topCount
        ? distribution.filter(item => item.count === topCount).map(item => `${item.value} (${item.label.toLowerCase()})`)
        : [];
      const validCount = Number(score?.validCount ?? rated.length);
      const applicableCount = Number(score?.applicableCount ?? domain.items.length);
      const requiredValidCount = Number(score?.requiredValidCount ?? Math.max(2, Math.ceil(4 * applicableCount / 5)));
      const coverage = typeof score?.coverage === "number" ? score.coverage : null;
      const frequentDifficultyItemIds = Array.isArray(score?.frequentDifficultyItemIds)
        ? score.frequentDifficultyItemIds
        : rated.filter(item => item.value >= 4).map(item => item.id);
      const frequentDifficultyCount = Number(score?.frequentDifficultyCount ?? frequentDifficultyItemIds.length);
      const notObservedCount = Number(score?.notObservedCount ?? 0);
      const notApplicableCount = Number(score?.notApplicableCount ?? 0);
      const unansweredCount = Number(score?.unansweredCount ?? 0);
      const impact = typeof score?.impact === "number" ? score.impact : null;
      const mean = score?.displayMean ?? null;
      const distributionText = distribution.map(item => `${item.value}: ${item.count}`).join(", ");
      const meanText = mean !== null
        ? `The descriptive mean is ${mean} of 5.`
        : `A domain mean is not reported: ${validCount} of ${applicableCount} applicable ${applicableCount === 1 ? "item was" : "items were"} rated, and ${requiredValidCount} ${requiredValidCount === 1 ? "rating is" : "ratings are"} required by the provisional completeness guide.`;
      const commonText = mostCommon.length
        ? `The most common rating${mostCommon.length === 1 ? " was" : "s were"} ${mostCommon.join(" and ")}.`
        : "No numeric frequency ratings were recorded.";
      const responseText = `${plural(validCount, "applicable item")} received numeric ratings. Rating counts (1–5): ${distributionText}. ${commonText}`;
      const frequentText = frequentDifficultyCount
        ? `Ratings of 4 or 5 were recorded on ${plural(frequentDifficultyCount, "item")}${frequentDifficultyItemIds.length ? ` (${frequentDifficultyItemIds.join(", ")})` : ""}; this is a review aid, not a cutoff.`
        : "No rated items were at 4 or 5; this is a description of this record, not a rule-out.";
      const missingText = `Not observed: ${notObservedCount}; not applicable: ${notApplicableCount}; unanswered: ${unansweredCount}. These categories are kept distinct and are not treated as negative ratings.`;
      const coverageText = coverage === null ? "" : ` Rated-item coverage was ${Math.round(coverage * 100)}% of applicable items.`;
      const impactText = `Separately recorded access impact: ${impact === null ? "unknown" : `${impact} of 3`}; impact is not averaged into the frequency ratings.`;
      const narrative = `${responseText} ${meanText} ${frequentText}${coverageText} ${missingText} ${impactText} These are descriptive observations from this ${doc.metadata.respondent === "parent" ? "parent's home-setting" : "teacher's teaching-setting"} record only; they are not norm-referenced, diagnostic, or clinical severity scores.`;

      return {
        id: domain.id,
        label: domain.label,
        distribution,
        mean,
        validCount,
        applicableCount,
        requiredValidCount,
        coverage,
        frequentDifficultyCount,
        frequentDifficultyItemIds,
        notObservedCount,
        notApplicableCount,
        unansweredCount,
        impact,
        strengths: String(evidence?.strengths ?? ""),
        supports: String(evidence?.supports ?? ""),
        examples: Array.isArray(evidence?.examples) ? evidence.examples : [],
        narrative,
        itemsWithFrequentRatings: rated.filter(item => item.value >= 4),
      };
    });
}
