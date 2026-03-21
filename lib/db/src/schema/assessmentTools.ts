import { pgTable, text, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scoringTypeEnum = pgEnum("scoring_type", ["auto", "manual"]);

export const assessmentToolsTable = pgTable("assessment_tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  isRemyndOwned: boolean("is_remynd_owned").notNull().default(false),
  respondentTypes: jsonb("respondent_types").notNull().$type<string[]>(),
  scoringType: scoringTypeEnum("scoring_type").notNull().default("auto"),
  domains: jsonb("domains").notNull().$type<string[]>(),
});

export const insertAssessmentToolSchema = createInsertSchema(assessmentToolsTable);
export type InsertAssessmentTool = z.infer<typeof insertAssessmentToolSchema>;
export type AssessmentTool = typeof assessmentToolsTable.$inferSelect;
