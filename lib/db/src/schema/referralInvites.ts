import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const referralInvitesTable = pgTable("referral_invites", {
  token:           text("token").primaryKey(),
  formId:          text("form_id").notNull(),
  includeConsent:  boolean("include_consent").notNull().default(false),
  toEmail:         text("to_email").notNull(),
  toName:          text("to_name").notNull(),
  schoolName:      text("school_name"),
  createdAt:       timestamp("created_at").notNull().defaultNow(),
  usedAt:          timestamp("used_at"),
  resultingCaseId: text("resulting_case_id"),
});

export type ReferralInvite = typeof referralInvitesTable.$inferSelect;
