/** Submitted intake evidence is immutable in assessment and all later phases.
 * Use the internal case phase, never the respondent-facing display phase.
 * Unanswered requests can still receive their first response.
 */
export function canEditIntakeQuestionResponse(
  phase: string | null | undefined,
  submittedAt: Date | string | null | undefined,
): boolean {
  if (!submittedAt) return true;
  return ["pre_commitment", "intake", "setup", "forms"].includes(phase ?? "");
}