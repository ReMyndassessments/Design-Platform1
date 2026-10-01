import { sql } from "drizzle-orm";
import { bigserial, check, index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Schema changes belong to the development schema and are applied to
// production by Publish, never by application startup.
export const questionnaireTestEvidenceTable = pgTable("questionnaire_test_evidence", {
  id: text("id").primaryKey(),
  evidenceOrder: bigserial("evidence_order", { mode: "bigint" })
    .notNull().unique("questionnaire_test_evidence_evidence_order_key"),
  caseId: text("case_id").notNull(),
  assignmentId: text("assignment_id").notNull(),
  testerId: text("tester_id").notNull(),
  testerName: text("tester_name").notNull(),
  testedAt: timestamp("tested_at", { withTimezone: true }).notNull(),
  fingerprint: text("fingerprint").notNull(),
  result: text("result").$type<"passed" | "failed">().notNull(),
  language: text("language").notNull(),
  checklist: jsonb("checklist").$type<{
    correctForm: boolean;
    contentLanguage: boolean;
    controls: boolean;
    safeTesting: boolean;
  }>(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [
  check("questionnaire_test_evidence_result_check",
    sql`${table.result} = ANY (ARRAY['passed'::text, 'failed'::text])`),
  index("questionnaire_test_evidence_latest_idx")
    .on(table.caseId, table.assignmentId, table.evidenceOrder.desc().nullsFirst()),
]);

export const insertQuestionnaireTestEvidenceSchema = createInsertSchema(questionnaireTestEvidenceTable).omit({
  evidenceOrder: true,
  createdAt: true,
});
export type InsertQuestionnaireTestEvidence = z.infer<typeof insertQuestionnaireTestEvidenceSchema>;
export type QuestionnaireTestEvidence = typeof questionnaireTestEvidenceTable.$inferSelect;