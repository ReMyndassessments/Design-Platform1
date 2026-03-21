import { pgTable, text, timestamp, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scoresTable = pgTable("scores", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  toolId: text("tool_id").notNull(),
  toolName: text("tool_name").notNull(),
  respondentType: text("respondent_type").notNull(),
  rawScore: real("raw_score"),
  domainScores: jsonb("domain_scores").notNull().$type<Record<string, number>>(),
  normalizedScores: jsonb("normalized_scores").notNull().$type<Record<string, number>>(),
  agreementIndex: real("agreement_index"),
  hasHighDiscrepancy: boolean("has_high_discrepancy").notNull().default(false),
  isManual: boolean("is_manual").notNull().default(false),
  notes: text("notes"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

export const insertScoreSchema = createInsertSchema(scoresTable).omit({
  generatedAt: true,
});
export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scoresTable.$inferSelect;
