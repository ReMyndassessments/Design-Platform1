import { db } from "@workspace/db";
import { auditLogTable } from "@workspace/db/schema";
import { nanoid } from "nanoid";

export interface AuditParams {
  eventType: string;
  caseId?: string | null;
  assignmentId?: string | null;
  toolId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      id: nanoid(),
      eventType: params.eventType,
      caseId: params.caseId ?? null,
      assignmentId: params.assignmentId ?? null,
      toolId: params.toolId ?? null,
      actorId: params.actorId ?? null,
      actorRole: params.actorRole ?? null,
      ipAddress: params.ipAddress ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    // Audit failures must never surface to callers or break primary operations
  }
}
