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
  interpretation: string;
  planningRecommendation: string;
  itemsForDiscussion: Array<{ id: string; text: string; value: number }>;
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
      const itemsForDiscussion = rated.filter(item => item.value >= 3).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
      const sometimesOrMoreCount = distribution.filter(item => item.value >= 3).reduce((total, item) => total + item.count, 0);
      const impactLabels = [
        "No observed access impact",
        "Minor additional effort",
        "Repeated support needed",
        "Substantial restriction of participation or demonstration of learning",
      ];
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
      const narrative = `${responseText} ${meanText} ${frequentText}${coverageText} ${missingText} ${impactText}`;
      const interpretationModes = distribution
        .filter(item => item.count > 0 && item.count === topCount)
        .map(item => `${item.value} (${item.label})`);
      const modalDescription = interpretationModes.length
        ? `The response pattern is centered on ${interpretationModes.join(" and ")}.`
        : "";
      const impactDescription = impact === null
        ? "No separate access-impact rating was recorded."
        : `Separately, the respondent marked access impact as “${impactLabels[impact]}”; this describes reported participation or demonstration of learning and is not part of the frequency mean.`;
      let interpretation: string;
      if (validCount === 0) {
        interpretation = `There are no numeric frequency ratings to interpret for this domain. Review any recorded examples and context; the missing ratings do not show that difficulties are absent. ${impactDescription}`;
      } else if (validCount < requiredValidCount) {
        interpretation = `${modalDescription} This pattern is incomplete under the provisional data-completeness guide, so it may not represent the full domain. Gather further observations and review examples before drawing conclusions. ${impactDescription}`;
      } else if (frequentDifficultyCount > 0) {
        interpretation = `${modalDescription} Ratings of Often or Almost always on ${plural(frequentDifficultyCount, "item")} identify specific experiences to review in context. The pattern does not establish cause, diagnosis, or clinical severity. ${impactDescription}`;
      } else if (sometimesOrMoreCount > 0) {
        const sometimesPhrase = sometimesOrMoreCount === 1
          ? "1 item was rated Sometimes"
          : `${sometimesOrMoreCount} items were rated Sometimes`;
        interpretation = `${modalDescription} ${sometimesPhrase}, with no items rated Often or Almost always. This describes intermittent observations in this record, not a conclusion about other settings or whether support is needed. ${impactDescription}`;
      } else {
        interpretation = `${modalDescription} Ratings are concentrated below Sometimes in this record. This indicates less frequent observations here, but does not rule out needs in other tasks or settings. ${impactDescription}`;
      }
      const planningItemIds = itemsForDiscussion.map(item => item.id);
      let planningRecommendation: string;
      if (validCount === 0 || validCount < requiredValidCount) {
        planningRecommendation = "In the Support plan tab, record an observation or information-gathering priority only if staff can identify a specific context to review. Avoid setting a skill target from incomplete ratings alone.";
      } else if (planningItemIds.length > 0) {
        planningRecommendation = `In the Support plan tab, review ${planningItemIds.join(", ")} and any linked examples. If staff confirm an access barrier, connect a priority to those observations and define a suitable strategy, owner, observable progress indicator, and review date.`;
      } else if ((impact ?? 0) >= 2 || (evidence?.examples?.length ?? 0) > 0) {
        planningRecommendation = "No item was rated Sometimes or more often, but the separately recorded impact or examples may warrant contextual discussion. Review them in the Support plan tab; if staff confirm a barrier, document a context-specific priority rather than dismissing it based on frequency ratings.";
      } else {
        planningRecommendation = "Do not create a score-only goal from this pattern. If later observations identify an access barrier, use the Support plan tab to record a specific, monitored priority with an owner and review date.";
      }

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
        interpretation,
        planningRecommendation,
        itemsForDiscussion,
        itemsWithFrequentRatings: rated.filter(item => item.value >= 4),
      };
    });
}
