import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable, casesTable, scoresTable, assignmentsTable } from "@workspace/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import { generateReportWithAI } from "../lib/ai.js";
import { isChineseLiteracy, isParentLiteracy } from "../lib/chineseLiteracyInstruments.js";
import { isBrief2ToolId } from "../lib/brief2-descriptive.js";
import { isPublisherScoredToolId } from "../lib/publisher-descriptive.js";

const router = Router();

async function canAccessCase(role: string, userId: string, caseId: string): Promise<boolean> {
  if (role === "admin") return true;
  // Clinical apprentices reach here only after apprenticeGuard has already
  // scoped their access (elevated to "admin" on a test case, or allowed
  // read-only GET on a live case) — so any apprentice request that gets this
  // far is already permitted.
  if (role === "clinical_apprentice") return true;
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
  if (req.userRole === "assessment_invigilator") {
    res.status(403).json({ error: "forbidden", message: "Assessment Invigilators cannot generate reports" });
    return;
  }
  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!caseRows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const caseData = caseRows[0];
  const scores = await db.select().from(scoresTable).where(eq(scoresTable.caseId, req.params.caseId));
  const literacyRecords = await db.execute(sql`SELECT document FROM chinese_literacy_administrations WHERE case_id=${req.params.caseId} AND document->'report'->>'status'='approved'`);

  const reportContent = await generateReportWithAI({
    caseData: { ...caseData, caseId: req.params.caseId },
    scores: scores.filter(score =>
      !isChineseLiteracy(score.toolId) && !isBrief2ToolId(score.toolId) && !isPublisherScoredToolId(score.toolId)
    ),
    intakeAnalysis: caseData.intakeAnalysis as Record<string, unknown> | null,
    debriefNotes: (caseData as any).debriefNotes ?? null,
  });
  // Add only professionally approved, explicitly labelled teacher evidence.
  // Generic diagnostic AI never receives or reinterprets these profile scores.
  for (const row of literacyRecords.rows as any[]) {
    const doc = row.document;
    const parent = isParentLiteracy(doc.metadata.key);
    const approvedTeacherEvidence = `\n\nChinese literacy — ${parent ? "Parent-reported observations in the home setting; one parent's perspective" : "developmental teacher observation; one teacher's classroom perspective"} (${doc.instrumentVersion}, ${doc.scoringVersion})\n${doc.report.narrative}\n${doc.report.classroomAvailabilityNote ?? ""}\n${doc.metadata.reportLimitation}`;
    reportContent.domainAnalysis += approvedTeacherEvidence;
    if (doc.plan?.approvedAt) reportContent.recommendations += `\n\nAgreed Chinese literacy ${parent ? "home" : "classroom"} support: ${doc.plan.rationale}\n${doc.plan.priorities.map((p: any) => `${p.text} [${p.itemIds.join(", ")}]; strategy ${p.strategyId}; owner ${p.owner}; review ${p.reviewDate}; indicator ${p.indicator}`).join("\n")}`;
  }

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
  if (req.userRole === "assessment_invigilator") {
    res.status(403).json({ error: "forbidden", message: "Assessment Invigilators cannot edit reports" });
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
