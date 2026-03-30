import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable, casesTable, scoresTable, assignmentsTable } from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import { generateReportWithAI } from "../lib/ai.js";

const router = Router();

async function canAccessCase(role: string, userId: string, caseId: string): Promise<boolean> {
  if (role === "admin") return true;
  const rows = await db.select({ assignedLeadId: casesTable.assignedLeadId, assignedPsychId: casesTable.assignedPsychId })
    .from(casesTable)
    .where(eq(casesTable.id, caseId))
    .limit(1);
  if (!rows[0]) return false;
  return rows[0].assignedLeadId === userId || rows[0].assignedPsychId === userId;
}

router.get("/cases/:caseId/report", authMiddleware, async (req, res) => {
  if (!await canAccessCase(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const rows = await db.select().from(reportsTable).where(eq(reportsTable.caseId, req.params.caseId)).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "not_found", message: "No report generated yet" });
    return;
  }
  res.json(rows[0]);
});

router.post("/cases/:caseId/report/generate", authMiddleware, async (req, res) => {
  if (!await canAccessCase(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  if (req.userRole === "psychometrician") {
    res.status(403).json({ error: "forbidden", message: "Psychometricians cannot generate AI reports directly" });
    return;
  }
  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!caseRows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const caseData = caseRows[0];
  const scores = await db.select().from(scoresTable).where(eq(scoresTable.caseId, req.params.caseId));

  const reportContent = await generateReportWithAI({
    caseData,
    scores,
    intakeAnalysis: caseData.intakeAnalysis as Record<string, unknown> | null,
  });

  const existingReport = await db.select().from(reportsTable).where(eq(reportsTable.caseId, req.params.caseId)).limit(1);

  let report;
  if (existingReport[0]) {
    report = await db.update(reportsTable).set({
      ...reportContent,
      status: "draft",
      generatedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(reportsTable.caseId, req.params.caseId)).returning();
  } else {
    report = await db.insert(reportsTable).values({
      id: nanoid(),
      caseId: req.params.caseId,
      ...reportContent,
      status: "draft",
      generatedAt: new Date(),
    }).returning();
  }

  res.json(report[0]);
});

router.patch("/cases/:caseId/report/update", authMiddleware, async (req, res) => {
  if (!await canAccessCase(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  if (req.userRole === "psychometrician") {
    res.status(403).json({ error: "forbidden", message: "Psychometricians cannot edit reports directly" });
    return;
  }
  const allowed = ["backgroundSummary", "domainAnalysis", "strengths", "areasOfConcern", "crossSettingComparison", "recommendations", "adminNotes"];
  const updates: Partial<typeof reportsTable.$inferInsert> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) (updates as Record<string, unknown>)[key] = req.body[key];
  }
  updates.updatedAt = new Date();

  const rows = await db.update(reportsTable).set(updates).where(eq(reportsTable.caseId, req.params.caseId)).returning();
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(rows[0]);
});

router.post("/cases/:caseId/report/approve", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only admins can approve reports" });
    return;
  }
  const rows = await db.update(reportsTable).set({
    status: "approved",
    approvedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(reportsTable.caseId, req.params.caseId)).returning();

  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(rows[0]);
});

export default router;
