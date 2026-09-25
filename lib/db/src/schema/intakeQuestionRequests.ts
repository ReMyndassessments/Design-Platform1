import { pgTable, text, jsonb, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const intakeQuestionAudienceEnum = pgEnum("intake_question_audience", ["teacher", "parent"]);

export const intakeQuestionRequestsTable = pgTable("intake_question_requests", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  audience: intakeQuestionAudienceEnum("audience").notNull(),
  assignmentId: text("assignment_id"),
  recipientName: text("recipient_name").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  // Present only for question-only links. Assignment-backed requests use the
  // assignment's existing portal token and are queried by assignmentId.
  questionOnlyToken: text("question_only_token").unique(),
  questions: jsonb("questions").$type<string[]>().notNull(),
  answer: text("answer"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, table => ({
  caseIdIdx: index("intake_question_requests_case_id_idx").on(table.caseId),
  assignmentIdIdx: index("intake_question_requests_assignment_id_idx").on(table.assignmentId),
}));

export const insertIntakeQuestionRequestSchema = createInsertSchema(intakeQuestionRequestsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertIntakeQuestionRequest = z.infer<typeof insertIntakeQuestionRequestSchema>;
export type IntakeQuestionRequest = typeof intakeQuestionRequestsTable.$inferSelect;