import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const assignmentStatusEnum = pgEnum("assignment_status", [
  "not_started",
  "in_progress",
  "completed",
  "overdue",
]);

export const respondentTypeEnum = pgEnum("respondent_type", [
  "parent",
  "teacher1",
  "teacher2",
  "student",
  "self",
  "school_counselor",
  "special_needs_teacher",
  "referring_teacher",
  "boarding_staff",
  "invigilator",
]);

export const assignmentsTable = pgTable("assignments", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  toolId: text("tool_id").notNull(),
  toolName: text("tool_name").notNull(),
  respondentType: respondentTypeEnum("respondent_type").notNull(),
  respondentLabel: text("respondent_label").notNull(),
  assignedToName: text("assigned_to_name"),
  assignedToEmail: text("assigned_to_email"),
  uniqueToken: text("unique_token").notNull().unique(),
  uniqueLink: text("unique_link").notNull(),
  qrCodeData: text("qr_code_data").notNull(),
  status: assignmentStatusEnum("status").notNull().default("not_started"),
  dueDate: timestamp("due_date"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAssignmentSchema = createInsertSchema(assignmentsTable).omit({
  createdAt: true,
});
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type Assignment = typeof assignmentsTable.$inferSelect;
