import { INTAKE_TOOL_IDS, SPECIALIZED_EXAMINER_TOOL_IDS } from "./batteryReview.js";
import { isRetiredAssignment, TEACHER_RESPONDENT_TYPES } from "./assignmentRetirement.js";

type ReassignmentTarget = {
  id: string;
  toolId: string;
  respondentType: string;
  respondentLabel: string | null;
  assignedToEmail: string | null;
  metadata?: unknown;
};

export function isTeacherQuestionnaire(row: ReassignmentTarget): boolean {
  return TEACHER_RESPONDENT_TYPES.has(row.respondentType) &&
    !INTAKE_TOOL_IDS.has(row.toolId) &&
    !SPECIALIZED_EXAMINER_TOOL_IDS.has(row.toolId) &&
    !isRetiredAssignment(row);
}

export function sameTeacherPackage(left: ReassignmentTarget, right: ReassignmentTarget): boolean {
  const email = left.assignedToEmail?.trim().toLowerCase();
  return email
    ? email === right.assignedToEmail?.trim().toLowerCase()
    : !right.assignedToEmail?.trim() &&
      left.respondentType === right.respondentType && left.respondentLabel === right.respondentLabel;
}

/** Require the entire currently active package; stale/partial selections never
 * revoke some links while accidentally leaving other forms with the old teacher.
 */
export function validateTeacherReassignment(
  rows: readonly ReassignmentTarget[], selectedIds: readonly string[], newEmail: string,
): { error: string } | { targets: ReassignmentTarget[] } {
  const selected = new Set(selectedIds);
  if (!selected.size || selected.size !== selectedIds.length) return { error: "invalid_selection" };
  const targets = rows.filter(row => selected.has(row.id));
  if (targets.length !== selected.size || targets.some(row => !isTeacherQuestionnaire(row))) {
    return { error: "package_changed" };
  }
  const anchor = targets[0];
  const packageRows = rows.filter(row => isTeacherQuestionnaire(row) && sameTeacherPackage(anchor, row));
  if (targets.some(row => !sameTeacherPackage(anchor, row)) ||
    packageRows.length !== targets.length) return { error: "package_changed" };
  const normalizedEmail = newEmail.trim().toLowerCase();
  if (anchor.assignedToEmail?.trim().toLowerCase() === normalizedEmail) {
    return { error: "same_recipient" };
  }
  if (rows.some(row => isTeacherQuestionnaire(row) && !selected.has(row.id) &&
    row.assignedToEmail?.trim().toLowerCase() === normalizedEmail)) {
    return { error: "recipient_has_package" };
  }
  return { targets };
}