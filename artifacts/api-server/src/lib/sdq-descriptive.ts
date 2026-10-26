import { scoreSdq, type SdqScoringQuestion } from "./sdq-scoring.js";

export const SDQ_TOOL_IDS = new Set([
  "SDQ-P",
  "SDQ-P11",
  "SDQ-T",
  "SDQ-T11",
  "SDQ-SR",
  "SDQ-SR18",
  // Historical identifiers may still exist on saved assignments.
  "SDQ-P4",
  "SDQ-T4",
  "SDQ-SR4",
  "SDQ-SR11",
]);

const POSITIVELY_WORDED_ITEMS = new Set([1, 4, 7, 9, 11, 14, 17, 20, 21, 25]);

type SdqQuestion = {
  id: string;
  text?: string;
  textEnglish?: string;
  textChinese?: string;
  textKorean?: string;
  type?: string;
  domain?: string;
  options?: string[];
  rows?: SdqScoringQuestion[];
};

function itemNumberFromId(id: string): number | null {
  const match = id.match(/(?:_|-)(\d{1,2})$/);
  if (!match) return null;
  const itemNumber = Number(match[1]);
  return itemNumber >= 1 && itemNumber <= 25 ? itemNumber : null;
}

function displayValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[Recorded response]";
  }
}

export function isSdqToolId(toolId: string | null | undefined): boolean {
  return typeof toolId === "string" && SDQ_TOOL_IDS.has(toolId);
}

export function buildSdqDescriptiveResponse(input: {
  toolId: string;
  questions: SdqScoringQuestion[] & SdqQuestion[];
  answers: Record<string, unknown>;
  language?: string | null;
  dateOfBirth?: string | Date | null;
  administeredAt?: string | Date | null;
  formSnapshotPresent?: boolean;
}) {
  const scoring = scoreSdq({
    toolId: input.toolId,
    questions: input.questions,
    answers: input.answers,
    language: input.language,
    dateOfBirth: input.dateOfBirth,
    administeredAt: input.administeredAt,
    formSnapshotPresent: input.formSnapshotPresent,
  });
  const coreItems = input.questions
    .map(question => ({
      question,
      itemNumber: itemNumberFromId(question.id),
      response: displayValue(input.answers[question.id]),
    }))
    .filter(item => item.itemNumber !== null)
    .sort((a, b) => (a.itemNumber ?? 0) - (b.itemNumber ?? 0));

  const uniqueItemNumbers = new Set(coreItems.map(item => item.itemNumber));
  const missingCoreItems = Array.from({ length: 25 }, (_, index) => index + 1)
    .filter(itemNumber => !uniqueItemNumbers.has(itemNumber));
  const positivePhraseItems = coreItems
    .filter(item => item.itemNumber !== null && POSITIVELY_WORDED_ITEMS.has(item.itemNumber))
    .map(item => ({
      itemNumber: item.itemNumber,
      prompt: item.question.textEnglish ?? item.question.text ?? "",
      response: item.response,
      state: item.response === null ? "missing" as const : "recorded" as const,
      interpretationNote: (() => {
        const value = typeof item.response === "string" ? item.response.trim().toLowerCase() : "";
        if (value === "certainly true") {
          return item.itemNumber === 25
            ? "The respondent endorses sustained attention and task completion as a strength."
            : "The respondent endorses this positively worded strength.";
        }
        if (value === "somewhat true") return "This strength is partly endorsed; this answer alone does not establish severe impairment.";
        if (value === "not true") return "This positively worded strength is not endorsed; preserve that meaning without inventing a different symptom.";
        return "Preserve the recorded answer; do not infer a frequency or difficulty level from an unverified label or code.";
      })(),
    }));

  const supplemental = input.questions
    .filter(question => itemNumberFromId(question.id) === null)
    .map(question => ({
      id: question.id,
      prompt: question.textEnglish ?? question.text ?? "",
      response: displayValue(input.answers[question.id]),
      state: displayValue(input.answers[question.id]) === null ? "missing" as const : "recorded" as const,
    }));

  const answersRecorded = coreItems.filter(item => item.response !== null).length;
  const formCompatibility = coreItems.length === 25 && missingCoreItems.length === 0
    ? "expected_item_set" as const
    : "item_set_unverified" as const;
  const language = input.language ?? null;
  const summary = [
    "SDQ descriptive response record",
    `Respondent form: ${input.toolId}${language ? ` · language: ${language}` : ""}.`,
    `Recorded core responses: ${answersRecorded} of ${coreItems.length} items shown in this saved form.`,
    scoring.scoringState === "scored"
      ? "Scale totals and eligible reference bands were calculated using the verified response and form mapping. Review the scoring panel and its limitations."
      : "No scale totals, impact score, norm band, or classification has been calculated. The saved answers are available for human review.",
    "Keep positively worded items as strengths when endorsed; do not describe them as difficulties.",
    scoring.referencePopulation
      ? `Classification reference: ${scoring.referencePopulation}.`
      : scoring.classificationLimit,
  ].join("\n");
  const reportText = [
    summary,
    `Scoring version: ${scoring.scoringVersion}. ${scoring.source}.`,
    "This is a draft respondent-specific screening record requiring professional review, not a diagnosis.",
    ...(scoring.scoringState === "scored" ? [
      "Classification scheme: UK four-band (2016). No scores are pooled across respondents.",
      ...Object.entries(scoring.scales).map(([name, scale]) =>
        `${name}: ${scale.score === null ? "unavailable" : `${scale.score}/10`}; ${scale.validAnswers}/5 valid responses${scale.prorated ? "; prorated and rounded half-up" : ""}; reference band: ${scoring.classificationSchemes.four_band[name] ?? "withheld"}.`),
      `Total Difficulties: ${scoring.totalDifficulties.score === null ? "unavailable" : `${scoring.totalDifficulties.score}/40`}; excludes Prosocial and impact; reference band: ${scoring.classificationSchemes.four_band["Total Difficulties"] ?? "withheld"}.`,
      `Impact (separate): ${scoring.impact.score === null ? "unavailable" : `${scoring.impact.score}/${scoring.impact.maximum}`}; ${scoring.impact.validComponents}/${scoring.impact.requiredComponents} components; reference band: ${scoring.classificationSchemes.four_band.Impact ?? "withheld"}. Duration and burden are excluded. Missing components are not imputed as zero.`,
    ] : []),
    ...positivePhraseItems.filter(item => item.state === "recorded").map(item =>
      `Positive item ${item.itemNumber}: ${item.response}. ${item.interpretationNote}`),
    ...scoring.issues,
  ].join("\n");

  return {
    reportingState: "descriptive_only" as const,
    scoringEligibility: scoring.scoringState === "scored" ? "rule_supported" as const : "not_verified" as const,
    formCompatibility,
    completeness: {
      answered: answersRecorded,
      missing: Math.max(0, coreItems.length - answersRecorded),
      total: coreItems.length,
    },
    missingCoreItems,
    sourceVerification: "unverified" as const,
    reviewerApproval: "not_reviewed" as const,
    items: coreItems.map(item => ({
      id: item.question.id,
      itemNumber: item.itemNumber,
      prompt: item.question.textEnglish ?? item.question.text ?? "",
      response: item.response,
      state: item.response === null ? "missing" as const : "recorded" as const,
      positivelyWorded: item.itemNumber !== null && POSITIVELY_WORDED_ITEMS.has(item.itemNumber),
    })),
    positivePhraseItems,
    supplemental,
    summary,
    scoring,
    reportText,
  };
}
