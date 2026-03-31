import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
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

export const insertReportUploadSchema = createInsertSchema(reportUploadsTable).omit({ uploadedAt: true });
export const insertReportTokenSchema = createInsertSchema(reportTokensTable).omit({ createdAt: true, updatedAt: true });

export type ReportUpload = typeof reportUploadsTable.$inferSelect;
export type ReportToken = typeof reportTokensTable.$inferSelect;
export type InsertReportUpload = z.infer<typeof insertReportUploadSchema>;
export type InsertReportToken = z.infer<typeof insertReportTokenSchema>;
