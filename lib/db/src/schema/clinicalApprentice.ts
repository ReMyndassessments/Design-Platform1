import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const apprenticeAssignmentStatusEnum = pgEnum("apprentice_assignment_status", [
  "active",
  "completed",
  "removed",
]);

export const apprenticeNoteVisibilityEnum = pgEnum("apprentice_note_visibility", [
  "private_to_apprentice",
  "visible_to_mentor",
]);

export const apprenticeCompetencyStatusEnum = pgEnum("apprentice_competency_status", [
  "not_started",
  "observing",
  "guided_practice",
  "competent",
]);

export const caseApprenticeAssignmentsTable = pgTable("case_apprentice_assignments", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  apprenticeUserId: text("apprentice_user_id").notNull(),
  assignedByUserId: text("assigned_by_user_id").notNull(),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  status: apprenticeAssignmentStatusEnum("status").notNull().default("active"),
  notes: text("notes"),
});

export const insertCaseApprenticeAssignmentSchema = createInsertSchema(caseApprenticeAssignmentsTable).omit({
  assignedAt: true,
});
export type InsertCaseApprenticeAssignment = z.infer<typeof insertCaseApprenticeAssignmentSchema>;
export type CaseApprenticeAssignment = typeof caseApprenticeAssignmentsTable.$inferSelect;

export const clinicalApprenticeNotesTable = pgTable("clinical_apprentice_notes", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  apprenticeUserId: text("apprentice_user_id").notNull(),
  noteText: text("note_text").notNull(),
  visibility: apprenticeNoteVisibilityEnum("visibility").notNull().default("private_to_apprentice"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClinicalApprenticeNoteSchema = createInsertSchema(clinicalApprenticeNotesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertClinicalApprenticeNote = z.infer<typeof insertClinicalApprenticeNoteSchema>;
export type ClinicalApprenticeNote = typeof clinicalApprenticeNotesTable.$inferSelect;

export const clinicalApprenticeFeedbackTable = pgTable("clinical_apprentice_feedback", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  apprenticeUserId: text("apprentice_user_id").notNull(),
  mentorUserId: text("mentor_user_id").notNull(),
  feedbackText: text("feedback_text").notNull(),
  competencyArea: text("competency_area"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClinicalApprenticeFeedbackSchema = createInsertSchema(clinicalApprenticeFeedbackTable).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertClinicalApprenticeFeedback = z.infer<typeof insertClinicalApprenticeFeedbackSchema>;
export type ClinicalApprenticeFeedback = typeof clinicalApprenticeFeedbackTable.$inferSelect;

export const clinicalApprenticeCompetenciesTable = pgTable("clinical_apprentice_competencies", {
  id: text("id").primaryKey(),
  apprenticeUserId: text("apprentice_user_id").notNull(),
  competencyKey: text("competency_key").notNull(),
  competencyLabel: text("competency_label").notNull(),
  status: apprenticeCompetencyStatusEnum("status").notNull().default("not_started"),
  mentorUserId: text("mentor_user_id"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  mentorNotes: text("mentor_notes"),
});

export const insertClinicalApprenticeCompetencySchema = createInsertSchema(clinicalApprenticeCompetenciesTable).omit({
  updatedAt: true,
});
export type InsertClinicalApprenticeCompetency = z.infer<typeof insertClinicalApprenticeCompetencySchema>;
export type ClinicalApprenticeCompetency = typeof clinicalApprenticeCompetenciesTable.$inferSelect;
