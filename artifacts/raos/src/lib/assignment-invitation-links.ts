type InvitationAssignment = {
  id: string;
  respondentType: string;
  uniqueLink: string;
};

type InvitationGroup = {
  link: string;
  forms: readonly { id: string }[];
};

export function respondentInvitationGroupKey(assignment: {
  respondentType: string;
  respondentLabel?: string | null;
  assignedToEmail?: string | null;
}): string {
  const { respondentType } = assignment;
  if (respondentType === "self" || respondentType === "invigilator") return `type:${respondentType}`;
  const email = assignment.assignedToEmail?.trim().toLowerCase();
  if (!email) return `type:${respondentType}:${assignment.respondentLabel ?? ""}`;
  const teacherRoles = ["teacher1", "teacher2", "school_counselor", "special_needs_teacher", "referring_teacher", "boarding_staff"];
  const audience = teacherRoles.includes(respondentType) ? "teacher-family" : respondentType;
  return `email:${audience}:${email}`;
}

/** Parent rows share their recipient's existing portal, not a second entry URL. */
export function assignmentInvitationLink(
  assignment: InvitationAssignment,
  groups: readonly InvitationGroup[],
): string {
  if (assignment.respondentType !== "parent") return assignment.uniqueLink;
  return groups.find(group => group.forms.some(form => form.id === assignment.id))?.link
    ?? assignment.uniqueLink;
}
