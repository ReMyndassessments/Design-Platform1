import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const interviewRecordingsTable = pgTable("interview_recordings", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  storagePath: text("storage_path").notNull(),
  durationSeconds: integer("duration_seconds"),
  conversationType: text("conversation_type").notNull(),
  mimeType: text("mime_type").notNull().default("audio/webm"),
  transcript: text("transcript"),
  structuredNotes: jsonb("structured_notes"),
  createdBy: text("created_by"),
  interviewDate: timestamp("interview_date", { withTimezone: true }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type InterviewRecording = typeof interviewRecordingsTable.$inferSelect;
export type InsertInterviewRecording = typeof interviewRecordingsTable.$inferInsert;
