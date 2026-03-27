import { pgTable, text, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const batteriesTable = pgTable("batteries", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  toolIds: jsonb("tool_ids").notNull().$type<string[]>(),
  isRemyndOwned: boolean("is_remynd_owned").notNull().default(false),
  domains: jsonb("domains").notNull().$type<string[]>().default([]),
  scoringNotes: text("scoring_notes"),
});

export const insertBatterySchema = createInsertSchema(batteriesTable);
export type InsertBattery = z.infer<typeof insertBatterySchema>;
export type Battery = typeof batteriesTable.$inferSelect;
