import { pgTable, text, integer, jsonb, timestamp, primaryKey, index } from "drizzle-orm/pg-core";

// Administration revisions are append-only snapshots. No cascading link to
// assignments: revoking a link must not silently erase approved observations.
export const chineseLiteracyAdministrationsTable = pgTable("chinese_literacy_administrations", {
  assignmentId: text("assignment_id").primaryKey(),
  caseId: text("case_id").notNull(),
  revision: integer("revision").notNull().default(0),
  document: jsonb("document").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("chinese_literacy_case_idx").on(table.caseId)]);

export const chineseLiteracyRevisionsTable = pgTable("chinese_literacy_revisions", {
  assignmentId: text("assignment_id").notNull(),
  revision: integer("revision").notNull(),
  document: jsonb("document").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [primaryKey({ columns: [table.assignmentId, table.revision] })]);

// One current, case-level comparison draft. Regeneration replaces this snapshot;
// parent and teacher source documents remain independent and unchanged.
export const chineseLiteracyDashboardComparisonsTable = pgTable("chinese_literacy_dashboard_comparisons", {
  caseId: text("case_id").primaryKey(),
  parentAssignmentId: text("parent_assignment_id").notNull(),
  teacherAssignmentId: text("teacher_assignment_id").notNull(),
  parentRevision: integer("parent_revision").notNull(),
  teacherRevision: integer("teacher_revision").notNull(),
  content: jsonb("content").notNull(),
  generatedBy: text("generated_by").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});
