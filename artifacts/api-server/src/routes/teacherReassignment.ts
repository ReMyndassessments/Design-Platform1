import { Router } from "express";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import { assignmentsTable, casesTable } from "@workspace/db/schema";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { activeAssignmentCondition } from "../lib/assignmentRetirement.js";
import { validateTeacherContactUpdate } from "../lib/teacherReassignment.js";
import { writeAudit } from "../lib/audit.js";

const router = Router();
const inputSchema = z.object({
  assignmentIds: z.array(z.string().min(1)).min(1).max(100),
  recipientName: z.string().trim().min(1).max(200),
  recipientEmail: z.string().trim().email().max(320),
}).strict();

// Keep the existing URL, but this action now edits contact details in place.
router.post("/cases/:caseId/teacher-reassignment", authMiddleware, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only an administrator can change teacher contact details." });
    return;
  }
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "Enter the teacher's name and a valid email address." });
    return;
  }
  const caseId = String(req.params.caseId);
  const input = parsed.data;
  const result = await db.transaction(async tx => {
    const [caseRow] = await tx.select({ id: casesTable.id }).from(casesTable)
      .where(eq(casesTable.id, caseId)).for("update");
    if (!caseRow) return { error: "not_found" };
    const rows = await tx.select().from(assignmentsTable)
      .where(and(eq(assignmentsTable.caseId, caseId), activeAssignmentCondition())).for("update");
    const plan = validateTeacherContactUpdate(rows, input.assignmentIds);
    if ("error" in plan) return plan;
    const updated = await tx.update(assignmentsTable).set({
      assignedToName: input.recipientName,
      assignedToEmail: input.recipientEmail.toLowerCase(),
    }).where(and(
      eq(assignmentsTable.caseId, caseId),
      inArray(assignmentsTable.id, plan.targets.map(row => row.id)),
      activeAssignmentCondition(),
    )).returning({ id: assignmentsTable.id });
    // Leave tokens, answers, status, snapshots, scores and batteryApproval alone.
    return { updatedCount: updated.length };
  });
  if ("error" in result) {
    res.status(result.error === "not_found" ? 404 : 409).json({
      error: result.error,
      message: result.error === "not_found" ? "Case not found." : "The teacher package has changed. Refresh the case and try again.",
    });
    return;
  }
  void writeAudit({
    eventType: "assignment.teacher_contact_updated",
    caseId,
    actorId: req.userId ?? null,
    actorRole: req.actualUserRole ?? req.userRole ?? null,
    metadata: { assignmentIds: input.assignmentIds, count: result.updatedCount },
  });
  res.json({ success: true, updatedCount: result.updatedCount, requiresApproval: false });
});

export default router;