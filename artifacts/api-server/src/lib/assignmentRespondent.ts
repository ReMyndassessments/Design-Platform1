const allowedRespondentTypes = [
  "parent", "teacher1", "teacher2", "student", "self",
  "school_counselor", "special_needs_teacher", "referring_teacher",
  "boarding_staff", "invigilator", "examiner",
] as const;

export type AssignmentRespondentType = typeof allowedRespondentTypes[number];

/** Tool catalogues use "teacher"; assignment records use numbered teacher slots. */
export function normalizeAssignmentRespondentType(value: unknown): AssignmentRespondentType | null {
  if (value === "teacher") return "teacher1";
  return allowedRespondentTypes.find(type => type === value) ?? null;
}