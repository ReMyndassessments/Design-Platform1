import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, casesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import crypto from "crypto";

const router = Router();

const INTAKE_TOOL_IDS = new Set(["REFERRAL", "CONSENT", "INTAKE"]);

function generateQRData(link: string): string {
  return link;
}

function getBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const host = req.headers.host as string ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  return `${proto}://${host}`;
}

async function checkCaseAccess(role: string, userId: string, caseId: string): Promise<boolean> {
  if (role === "admin") return true;
  const rows = await db.select({ assignedLeadId: casesTable.assignedLeadId, assignedPsychId: casesTable.assignedPsychId })
    .from(casesTable)
    .where(eq(casesTable.id, caseId))
    .limit(1);
  if (!rows[0]) return false;
  return rows[0].assignedLeadId === userId || rows[0].assignedPsychId === userId;
}

router.get("/cases/:caseId/assignments", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, req.params.caseId));
  res.json(assignments);
});

router.post("/cases/:caseId/assignments", authMiddleware, async (req, res) => {
  const { toolId, respondentType, respondentLabel, assignedToName, assignedToEmail, dueDate } = req.body;

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!caseRows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const { userRole, userId } = req;
  const isAssigned = caseRows[0].assignedLeadId === userId || caseRows[0].assignedPsychId === userId;
  if (userRole !== "admin" && !isAssigned) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  if (userRole === "assessment_lead" && !INTAKE_TOOL_IDS.has(toolId)) {
    res.status(403).json({ error: "forbidden", message: "Invigilators can only deploy Referral, Consent, and Intake forms" });
    return;
  }
  if (userRole === "psychometrician" && INTAKE_TOOL_IDS.has(toolId)) {
    res.status(403).json({ error: "forbidden", message: "Psychometricians cannot deploy intake-stage forms" });
    return;
  }

  const token = crypto.randomBytes(24).toString("hex");
  const baseUrl = getBaseUrl(req as unknown as Parameters<typeof getBaseUrl>[0]);
  const uniqueLink = `${baseUrl}/external/${token}`;

  const assignment = await db.insert(assignmentsTable).values({
    id: nanoid(),
    caseId: req.params.caseId,
    toolId,
    toolName: req.body.toolName ?? toolId,
    respondentType,
    respondentLabel,
    assignedToName,
    assignedToEmail,
    uniqueToken: token,
    uniqueLink,
    qrCodeData: uniqueLink,
    status: "not_started",
    dueDate: dueDate ? new Date(dueDate) : null,
  }).returning();

  res.status(201).json(assignment[0]);
});

router.patch("/cases/:caseId/assignments/:assignmentId", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const updates: Partial<typeof assignmentsTable.$inferInsert> = {};
  if (req.body.status) updates.status = req.body.status;
  if (req.body.assignedToName) updates.assignedToName = req.body.assignedToName;
  if (req.body.assignedToEmail) updates.assignedToEmail = req.body.assignedToEmail;
  if (req.body.dueDate) updates.dueDate = new Date(req.body.dueDate);

  const rows = await db.update(assignmentsTable).set(updates)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .returning();
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(rows[0]);
});

router.delete("/cases/:caseId/assignments/:assignmentId", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const rows = await db.delete(assignmentsTable)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .returning();
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ success: true });
});

export default router;
