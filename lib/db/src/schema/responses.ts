import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const responsesTable = pgTable("responses", {
  id: text("id").primaryKey(),
  assignmentId: text("assignment_id").notNull(),
  answers: jsonb("answers").notNull().$type<Record<string, unknown>>(),
  language: text("language").notNull().default("english"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

export const insertResponseSchema = createInsertSchema(responsesTable).omit({
  submittedAt: true,
});
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type ResponseRow = typeof responsesTable.$inferSelect;
