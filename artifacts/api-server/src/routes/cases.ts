import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, assignmentsTable, scoresTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import { analyzeIntakeWithAI } from "../lib/gemini.js";

const router = Router();

const PHASE_PROGRESS: Record<string, number> = {
  pre_commitment: 5,
  intake: 15,
  setup: 25,
  forms: 40,
  assessment: 55,
  scoring: 70,
  report: 85,
  debrief: 95,
  complete: 100,
};

const PHASE_ORDER = [
  "pre_commitment", "intake", "setup", "forms", "assessment",
  "scoring", "report", "debrief", "complete"
];

function nextPhase(current: string): string {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx === PHASE_ORDER.length - 1) return current;
  return PHASE_ORDER[idx + 1];
}

function formatCase(c: typeof casesTable.$inferSelect) {
  return {
    id: c.id,
    studentName: c.studentName,
    dob: c.dob,
    school: c.school,
    grade: c.grade,
    languagePreference: c.languagePreference,
    referralReason: c.referralReason,
    caseStatus: c.caseStatus,
    currentPhase: c.currentPhase,
    progressPercentage: c.progressPercentage,
    riskLevel: c.riskLevel,
    assignedLeadId: c.assignedLeadId,
    assignedPsychId: c.assignedPsychId,
    parentName: c.parentName,
    parentEmail: c.parentEmail,
    parentPhone: c.parentPhone,
    consentObtained: c.consentObtained,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

router.get("/cases", authMiddleware, async (req, res) => {
  const cases = await db.select().from(casesTable).orderBy(sql`${casesTable.updatedAt} DESC`);
  res.json(cases.map(formatCase));
});

router.post("/cases", authMiddleware, async (req, res) => {
  const { studentName, dob, school, grade, languagePreference, referralReason, parentName, parentEmail, parentPhone, assignedLeadId, assignedPsychId } = req.body;

  const newCase = await db.insert(casesTable).values({
    id: nanoid(),
    studentName,
    dob,
    school,
    grade,
    languagePreference: languagePreference ?? "english",
    referralReason,
    parentName,
    parentEmail,
    parentPhone,
    assignedLeadId,
    assignedPsychId,
    caseStatus: "active",
    currentPhase: "pre_commitment",
    progressPercentage: PHASE_PROGRESS["pre_commitment"],
    consentObtained: false,
  }).returning();

  res.status(201).json(formatCase(newCase[0]));
});

router.get("/cases/:caseId", authMiddleware, async (req, res) => {
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "not_found", message: "Case not found" });
    return;
  }
  const c = rows[0];
  const [assignments, scores] = await Promise.all([
    db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, req.params.caseId)),
    db.select().from(scoresTable).where(eq(scoresTable.caseId, req.params.caseId)),
  ]);
  res.json({
    ...formatCase(c),
    intakeData: c.intakeData,
    intakeAnalysis: c.intakeAnalysis,
    assignments,
    scores,
  });
});

router.patch("/cases/:caseId", authMiddleware, async (req, res) => {
  const updates: Partial<typeof casesTable.$inferInsert> = {};
  const allowed = ["studentName", "school", "grade", "languagePreference", "caseStatus", "currentPhase", "riskLevel", "parentName", "parentEmail", "parentPhone", "assignedLeadId", "assignedPsychId", "consentObtained"];

  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      (updates as Record<string, unknown>)[key === "studentName" ? "studentName" : key] = req.body[key];
    }
  }

  if (updates.currentPhase) {
    updates.progressPercentage = PHASE_PROGRESS[updates.currentPhase as string] ?? 0;
  }
  updates.updatedAt = new Date();

  const rows = await db.update(casesTable).set(updates).where(eq(casesTable.id, req.params.caseId)).returning();
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(formatCase(rows[0]));
});

router.post("/cases/:caseId/advance", authMiddleware, async (req, res) => {
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const current = rows[0].currentPhase;
  const next = nextPhase(current);
  const updated = await db.update(casesTable).set({
    currentPhase: next as typeof casesTable.$inferSelect["currentPhase"],
    progressPercentage: PHASE_PROGRESS[next] ?? 100,
    updatedAt: new Date(),
  }).where(eq(casesTable.id, req.params.caseId)).returning();
  res.json(formatCase(updated[0]));
});

router.post("/cases/:caseId/intake-analysis", authMiddleware, async (req, res) => {
  const rows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const c = rows[0];
  const analysis = await analyzeIntakeWithAI({
    studentName: c.studentName,
    school: c.school,
    referralReason: c.referralReason,
    grade: c.grade,
    intakeData: c.intakeData,
  });

  await db.update(casesTable).set({
    intakeAnalysis: analysis as Record<string, unknown>,
    riskLevel: analysis.riskLevel as typeof casesTable.$inferSelect["riskLevel"],
    updatedAt: new Date(),
  }).where(eq(casesTable.id, req.params.caseId));

  res.json(analysis);
});

export default router;
