import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const auditLogTable = pgTable("audit_log", {
  id: text("id").primaryKey(),
  eventType: text("event_type").notNull(),
  caseId: text("case_id"),
  assignmentId: text("assignment_id"),
  toolId: text("tool_id"),
  actorId: text("actor_id"),
  actorRole: text("actor_role"),
  ipAddress: text("ip_address"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLogEntry = typeof auditLogTable.$inferSelect;
