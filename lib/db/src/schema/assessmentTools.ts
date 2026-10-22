import { pgTable, text, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scoringTypeEnum = pgEnum("scoring_type", ["auto", "manual"]);

export type FormItem = {
  id: string;
  text: string;
  textChinese?: string;
  textKorean?: string;
  type:
    | "likert"
    | "text"
    | "checkbox"
    | "radio"
    | "multiple_choice"
    | "scale"
    | "textarea"
    | "section_header"
    | "checkbox_group"
    | "yes_no"
    | "select"
    | "date"
    | "signature"
    | "radio_group"
    | "number"
    | "frequency_grid";
  options?: string[];
  optionsChinese?: string[];
  optionsKorean?: string[];
  domain?: string;
  required?: boolean;
  reversed?: boolean;
  rows?: FormItem[];
  conditionalOn?: string;
  conditionalValue?: string;
  conditionalType?: string;
  note?: string;
  noteChinese?: string;
  noteKorean?: string;
  links?: Array<{ text: string; url: string }>;
};

export type ScoringConfig = {
  max: number;
  higherIsBetter?: boolean;
  thresholds?: { low: number; mild: number; moderate: number };
  domains?: Record<string, {
    label: string;
    shortLabel: string;
    narratives: { low: string; mild: string; moderate: string; elevated: string };
  }>;
};

export const assessmentToolsTable = pgTable("assessment_tools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull().default(""),
  isRemyndOwned: boolean("is_remynd_owned").notNull().default(false),
  respondentTypes: jsonb("respondent_types").notNull().$type<string[]>(),
  scoringType: scoringTypeEnum("scoring_type").notNull().default("auto"),
  domains: jsonb("domains").notNull().$type<string[]>(),
  formItems: jsonb("form_items").$type<FormItem[]>(),
  scoringConfig: jsonb("scoring_config").$type<ScoringConfig>(),
  productIds: jsonb("product_ids").$type<string[]>().notNull().default([]),
});

export const insertAssessmentToolSchema = createInsertSchema(assessmentToolsTable);
export type InsertAssessmentTool = z.infer<typeof insertAssessmentToolSchema>;
export type AssessmentTool = typeof assessmentToolsTable.$inferSelect;
