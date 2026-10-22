import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const strengthenCoreApplicationsTable = pgTable("syc_applications", {
  id: text("id").primaryKey(),
  schoolName: text("school_name").notNull(),
  primaryConcern: text("primary_concern").notNull(),
  language: text("language").notNull().default("en"),
  status: text("status").notNull().default("submitted"),
  data: jsonb("data").$type<Record<string, unknown>>().notNull(),
  analysis: jsonb("analysis").$type<Record<string, unknown> | null>(),
  approvedExtension: text("approved_extension"),
  reviewReason: text("review_reason"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const strengthenCoreProgramTable = pgTable("syc_program_settings", {
  id: text("id").primaryKey(),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStrengthenCoreApplicationSchema = createInsertSchema(strengthenCoreApplicationsTable);
export type InsertStrengthenCoreApplication = z.infer<typeof insertStrengthenCoreApplicationSchema>;
export type StrengthenCoreApplication = typeof strengthenCoreApplicationsTable.$inferSelect;
export type StrengthenCoreProgram = typeof strengthenCoreProgramTable.$inferSelect;
