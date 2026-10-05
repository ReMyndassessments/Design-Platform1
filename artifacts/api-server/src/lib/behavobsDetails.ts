import type { FormQuestion } from "./questions.js";

export const BEHAVOBS_DETAILS: FormQuestion = {
  id: "q24_details",
  text: "Please describe the unusual or bizarre behavior observed.",
  textChinese: "请详细描述观察到的异常或怪异行为。",
  textKorean: "관찰된 비정상적이거나 기이한 행동을 자세히 설명해 주세요.",
  type: "textarea",
  domain: "behavioral_observation",
  required: false,
  conditionalOn: "q24",
  conditionalValue: "Yes",
};

/** Add the follow-up to active legacy forms without rewriting frozen snapshots. */
export function withBehavobsDetails<T extends { id: string }>(
  questions: readonly T[],
  toolId: string,
): Array<T | FormQuestion> {
  if (toolId !== "BEHAVOBS" || questions.some(q => q.id === BEHAVOBS_DETAILS.id)) {
    return [...questions];
  }
  return questions.flatMap<T | FormQuestion>(q =>
    q.id === "q24" ? [q, { ...BEHAVOBS_DETAILS }] : [q]);
}