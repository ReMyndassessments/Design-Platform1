type IntakeQuestionAudience = "teacher" | "parent";

type AssignmentAccessTarget = {
  id: string;
  caseId: string;
  respondentType: string;
  assignedToEmail: string | null;
};

type IntakeQuestionRequestAccessTarget = {
  caseId: string;
  assignmentId: string | null;
  audience: IntakeQuestionAudience;
  recipientEmail: string;
  sentAt: Date | null;
};

const TEACHER_RESPONDENT_TYPES = new Set([
  "teacher1",
  "teacher2",
  "school_counselor",
  "special_needs_teacher",
  "referring_teacher",
  "boarding_staff",
]);

/** A portal token only reveals a sent request for its exact current recipient. */
export function assignmentOwnsQuestionRequest(
  request: IntakeQuestionRequestAccessTarget,
  assignment: AssignmentAccessTarget,
): boolean {
  if (!request.sentAt || request.assignmentId !== assignment.id || request.caseId !== assignment.caseId) return false;
  if (!assignment.assignedToEmail || request.recipientEmail.trim().toLowerCase() !== assignment.assignedToEmail.trim().toLowerCase()) return false;
  return request.audience === "parent"
    ? assignment.respondentType === "parent"
    : TEACHER_RESPONDENT_TYPES.has(assignment.respondentType);
}