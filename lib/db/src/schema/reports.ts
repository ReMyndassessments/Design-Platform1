import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportStatusEnum = pgEnum("report_status", ["draft", "approved", "exported"]);

export const reportsTable = pgTable("reports", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().unique(),
  status: reportStatusEnum("status").notNull().default("draft"),
  backgroundSummary: text("background_summary").notNull().default(""),
  domainAnalysis: text("domain_analysis").notNull().default(""),
  strengths: text("strengths").notNull().default(""),
  areasOfConcern: text("areas_of_concern").notNull().default(""),
  crossSettingComparison: text("cross_setting_comparison").notNull().default(""),
  recommendations: text("recommendations").notNull().default(""),
  adminNotes: text("admin_notes"),
  generatedAt: timestamp("generated_at"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
