import { sql } from "drizzle-orm";
import { assignmentsTable } from "@workspace/db/schema";

export const TEACHER_RESPONDENT_TYPES = new Set([
  "teacher1", "teacher2", "school_counselor", "special_needs_teacher",
  "referring_teacher", "boarding_staff",
]);

export function isRetiredAssignment(row: { metadata?: unknown }): boolean {
  const metadata = row.metadata;
  return !!metadata && typeof metadata === "object" &&
    typeof (metadata as Record<string, unknown>).retiredAt === "string" &&
    !!(metadata as Record<string, unknown>).retiredAt;
}

/** Keep retired records out of active workflows without deleting their evidence. */
export function activeAssignmentCondition() {
  return sql<boolean>`coalesce(${assignmentsTable.metadata}->>'retiredAt', '') = ''`;
}