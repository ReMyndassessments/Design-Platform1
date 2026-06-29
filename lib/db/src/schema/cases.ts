import { pgTable, text, timestamp, integer, boolean, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const caseStatusEnum = pgEnum("case_status", [
  "active",
  "on_hold",
  "completed",
  "archived",
]);

export const casePhaseEnum = pgEnum("case_phase", [
  "pre_commitment",
  "intake",
  "setup",
  "forms",
  "assessment",
  "scoring",
  "report",
  "final_review",
  "debrief",
  "complete",
]);

export const riskLevelEnum = pgEnum("risk_level", ["low", "moderate", "high"]);

export const languageEnum = pgEnum("language", ["english", "mandarin", "cantonese"]);

export const casesTable = pgTable("cases", {
  id: text("id").primaryKey(),
  studentName: text("student_name").notNull(),
  dob: text("dob").notNull(),
  school: text("school").notNull(),
  grade: text("grade"),
  languagePreference: languageEnum("language_preference").notNull().default("english"),
  referralReason: text("referral_reason").notNull(),
  caseStatus: caseStatusEnum("case_status").notNull().default("active"),
  currentPhase: casePhaseEnum("current_phase").notNull().default("pre_commitment"),
  progressPercentage: integer("progress_percentage").notNull().default(0),
  riskLevel: riskLevelEnum("risk_level"),
  assignedLeadId: text("assigned_lead_id"),
  assignedPsychId: text("assigned_psych_id"),
  parentName: text("parent_name"),
  parentEmail: text("parent_email"),
  parentPhone: text("parent_phone"),
  consentObtained: boolean("consent_obtained").notNull().default(false),
  workingDocUrl: text("working_doc_url"),
  adminApprovedReport: boolean("admin_approved_report").notNull().default(false),
  psychApprovedReport: boolean("psych_approved_report").notNull().default(false),
  customMeetingUrl: text("custom_meeting_url"),
  moderatorMeetingUrl: text("moderator_meeting_url"),
  assessmentMeetingDate: text("assessment_meeting_date"),
  debriefMeetingUrl: text("debrief_meeting_url"),
  debriefMeetingDate: text("debrief_meeting_date"),
  bobbyAiPortalCredentials: text("bobby_ai_portal_credentials"),
  productIds: jsonb("product_ids").$type<string[]>().notNull().default([]),
  intakeData: jsonb("intake_data"),
  intakeAnalysis: jsonb("intake_analysis"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCaseSchema = createInsertSchema(casesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Case = typeof casesTable.$inferSelect;
