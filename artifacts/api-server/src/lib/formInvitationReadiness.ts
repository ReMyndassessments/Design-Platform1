import { INTAKE_TOOL_IDS, isSpecializedExaminerAssignment, type BatteryReviewState } from "./batteryReview.js";

export type InvitationAssignment = {
  id: string; toolId: string; toolName: string; respondentType: string;
  respondentLabel?: string | null; assignedToEmail?: string | null;
};

/** A current form pass is sufficient; unrelated forms and battery sign-off are irrelevant. */
export function selectReadyInvitationForms(
  rows: readonly InvitationAssignment[], anchorId: string,
  requestedIds: unknown, review: Pick<BatteryReviewState, "testResults"> | null,
): { assignments: InvitationAssignment[] } | { error: string; message: string } {
  const anchor = rows.find(row => row.id === anchorId);
  if (!anchor) return { error: "invalid_form_link", message: "The form link does not belong to this case." };
  const sameRecipient = (row: InvitationAssignment) => {
    if (["self", "invigilator"].includes(anchor.respondentType)) return row.respondentType === anchor.respondentType;
    if (anchor.assignedToEmail?.trim()) return row.assignedToEmail?.trim().toLowerCase() === anchor.assignedToEmail.trim().toLowerCase();
    return row.respondentType === anchor.respondentType && (row.respondentLabel ?? "") === (anchor.respondentLabel ?? "");
  };
  const packageRows = rows.filter(row => sameRecipient(row) && INTAKE_TOOL_IDS.has(row.toolId) === INTAKE_TOOL_IDS.has(anchor.toolId));
  if (requestedIds !== undefined && (!Array.isArray(requestedIds) || requestedIds.length === 0 || requestedIds.some(id => typeof id !== "string"))) {
    return { error: "invalid_assignments", message: "Select at least one form to send." };
  }
  const ids = requestedIds === undefined ? packageRows.map(row => row.id) : [...new Set(requestedIds as string[])];
  const selected = ids.map(id => packageRows.find(row => row.id === id));
  if (selected.some(row => !row)) return { error: "invalid_assignments", message: "Every selected form must belong to this case and respondent package." };
  const assignments = selected as InvitationAssignment[];
  const notReady = assignments.filter(row => !INTAKE_TOOL_IDS.has(row.toolId) &&
    (isSpecializedExaminerAssignment(row) || review?.testResults[row.id]?.status !== "passed"));
  if (notReady.length) return { error: "form_test_required", message: `Test these forms successfully before sending: ${notReady.map(row => row.toolName).join(", ")}. Other forms do not need to be tested first.` };
  return { assignments };
}
