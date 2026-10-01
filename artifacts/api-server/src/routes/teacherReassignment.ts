import { Router } from "express";
import { randomBytes } from "node:crypto";
import { nanoid } from "nanoid";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { assignmentsTable, casesTable, scoresTable } from "@workspace/db/schema";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { activeAssignmentCondition } from "../lib/assignmentRetirement.js";
import { validateTeacherReassignment } from "../lib/teacherReassignment.js";
import { writeAudit } from "../lib/audit.js";

const router = Router();
const inputSchema = z.object({
  assignmentIds: z.array(z.string().min(1)).min(1).max(100),
  recipientName: z.string().trim().min(1).max(200),
  recipientEmail: z.string().trim().email().max(320),
  acknowledgeRevocation: z.literal(true),
}).strict();

const messages: Record<string, string> = {
  not_found: "Case not found.",
  invalid_selection: "Choose the complete teacher assessment package.",
  package_changed: "The teacher package has changed. Refresh the case and try again.",
  same_recipient: "Enter a different teacher email address. Use the pencil to correct a name only.",
  recipient_has_package: "That teacher already has an assessment package in this case. Review their existing package instead of merging responses.",
};

router.post("/cases/:caseId/teacher-reassignment", authMiddleware, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only an administrator can change the teacher for a sent assessment package." });
    return;
  }
  const parsed = inputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_error", message: "Enter the new teacher's name and email and confirm revocation of the previous links." });
    return;
  }
  const caseId = String(req.params.caseId);
  const input = parsed.data;
  const proto = String(req.headers["x-forwarded-proto"] ?? "https").split(",")[0].trim();
  const host = req.headers.host ?? "localhost";
  const baseUrl = `${proto}://${host}`;
  const result = await db.transaction(async tx => {
    // Every public form submission and package dispatch uses this same order.
    const [caseRow] = await tx.select({ id: casesTable.id }).from(casesTable)
      .where(eq(casesTable.id, caseId)).for("update");
    if (!caseRow) return { error: "not_found" };
    const rows = await tx.select().from(assignmentsTable)
      .where(and(eq(assignmentsTable.caseId, caseId), activeAssignmentCondition())).for("update");
    const plan = validateTeacherReassignment(rows, input.assignmentIds, input.recipientEmail);
    if ("error" in plan) return plan;
    const ids = new Set(plan.targets.map(row => row.id));
    const targets = rows.filter(row => ids.has(row.id));
    const retiredAt = new Date().toISOString();
    const newAssignments: typeof rows = [];
    for (const old of targets) {
      const token = randomBytes(24).toString("hex");
      const link = `${baseUrl}/external/${token}`;
      const replacementId = nanoid();
      const originalScores = await tx.select().from(scoresTable).where(and(
        eq(scoresTable.caseId, caseId), eq(scoresTable.toolId, old.toolId),
        eq(scoresTable.respondentType, old.respondentType),
      )).for("update");
      const [replacement] = await tx.insert(assignmentsTable).values({
        id: replacementId,
        caseId,
        toolId: old.toolId,
        toolName: old.toolName,
        respondentType: old.respondentType,
        respondentLabel: old.respondentLabel,
        assignedToName: input.recipientName,
        assignedToEmail: input.recipientEmail.toLowerCase(),
        uniqueToken: token,
        uniqueLink: link,
        qrCodeData: link,
        status: "not_started",
        dueDate: old.dueDate,
        submittedAt: null,
        formItemsSnapshot: old.formItemsSnapshot,
        toolVersionId: old.toolVersionId,
        // Never copy respondent drafts/session state or saved answers embedded
        // in legacy metadata. Questionnaire configuration is in the snapshot.
        metadata: { replacesAssignmentId: old.id },
      }).returning();
      // Preserve assignment identity, attribution, answers and timestamps.
      // Rotating the token invalidates every already-issued per-form/QR link.
      await tx.update(assignmentsTable).set({
        uniqueToken: randomBytes(24).toString("hex"),
        uniqueLink: "",
        qrCodeData: "",
        metadata: {
          ...(old.metadata ?? {}),
          retiredAt,
          retiredReason: "teacher_reassigned",
          retiredBy: req.userId,
          replacedByAssignmentId: replacementId,
          historicalScores: originalScores,
        },
      }).where(eq(assignmentsTable.id, old.id));
      // Archived scores remain in history, never attributed to the new teacher.
      for (const score of originalScores) {
        await tx.delete(scoresTable).where(eq(scoresTable.id, score.id));
      }
      newAssignments.push(replacement);
    }
    await tx.update(casesTable).set({ batteryApproval: null, updatedAt: new Date() })
      .where(eq(casesTable.id, caseId));
    return { retiredAssignmentIds: targets.map(row => row.id), newAssignments };
  });
  if ("error" in result) {
    res.status(result.error === "not_found" ? 404 : 409).json({
      error: result.error, message: messages[result.error] ?? messages.package_changed,
    });
    return;
  }
  void writeAudit({
    eventType: "assignment.teacher_reassigned",
    caseId,
    actorId: req.userId ?? null,
    actorRole: req.actualUserRole ?? req.userRole ?? null,
    metadata: { retiredAssignmentIds: result.retiredAssignmentIds,
      replacementAssignmentIds: result.newAssignments.map(row => row.id), count: result.newAssignments.length },
  });
  res.json({
    success: true,
    reassignedCount: result.newAssignments.length,
    retiredAssignmentIds: result.retiredAssignmentIds,
    newAssignments: result.newAssignments.map(({ formItemsSnapshot: _snapshot, ...row }) => row),
    requiresApproval: true,
  });
});

export default router;