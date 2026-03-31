import { pgTable, text, timestamp, boolean, pgEnum, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportRecipientRoleEnum = pgEnum("report_recipient_role", ["parent", "teacher"]);

export const reportUploadsTable = pgTable("report_uploads", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull().unique(),
  fileKey: text("file_key").notNull(),
  filename: text("filename").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const reportTokensTable = pgTable("report_tokens", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  role: reportRecipientRoleEnum("role").notNull(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  sentAt: timestamp("sent_at"),
  downloadedAt: timestamp("downloaded_at"),
  permissionGranted: boolean("permission_granted"),
  permissionGrantedAt: timestamp("permission_granted_at"),
  adminOverride: boolean("admin_override").notNull().default(false),
  adminOverrideAt: timestamp("admin_override_at"),
  adminOverrideBy: text("admin_override_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ── Report Drafts (versioned working documents) ─────────────────────────────
export const reportDraftsTable = pgTable("report_drafts", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  version: integer("version").notNull(),
  fileKey: text("file_key").notNull(),
  filename: text("filename").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  uploaderName: text("uploader_name").notNull(),
  note: text("note"),
  isActive: boolean("is_active").notNull().default(false),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertReportUploadSchema = createInsertSchema(reportUploadsTable).omit({ uploadedAt: true });
export const insertReportTokenSchema = createInsertSchema(reportTokensTable).omit({ createdAt: true, updatedAt: true });

export const insertReportDraftSchema = createInsertSchema(reportDraftsTable).omit({ uploadedAt: true });

export type ReportUpload = typeof reportUploadsTable.$inferSelect;
export type ReportToken = typeof reportTokensTable.$inferSelect;
export type ReportDraft = typeof reportDraftsTable.$inferSelect;
export type InsertReportUpload = z.infer<typeof insertReportUploadSchema>;
export type InsertReportToken = z.infer<typeof insertReportTokenSchema>;
export type InsertReportDraft = z.infer<typeof insertReportDraftSchema>;
