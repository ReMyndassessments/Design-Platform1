import { Router } from "express";
import { db } from "@workspace/db";
import { scoresTable, responsesTable, assignmentsTable, casesTable, assessmentToolsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";

const router = Router();

async function checkCaseAccess(_role: string, _userId: string, caseId: string): Promise<boolean> {
  const rows = await db.select({ id: casesTable.id })
    .from(casesTable)
    .where(eq(casesTable.id, caseId))
    .limit(1);
  return !!rows[0];
}

/** Build a questionId → domain lookup from the tool's canonical or DB-stored question list. */
async function buildDomainMap(toolId: string): Promise<Record<string, string>> {
  const toolRows = await db.select({ formItems: assessmentToolsTable.formItems })
    .from(assessmentToolsTable)
    .where(eq(assessmentToolsTable.id, toolId))
    .limit(1);
  const stored = toolRows[0]?.formItems;
  const questions = (stored && Array.isArray(stored) && stored.length > 0)
    ? (stored as { id: string; domain?: string }[])
    : (SAMPLE_QUESTIONS[toolId] ?? SAMPLE_QUESTIONS["default"] ?? []);
  const map: Record<string, string> = {};
  for (const q of questions) {
    if (q.id && q.domain) map[q.id] = q.domain;
  }
  return map;
}

function computeDomainScores(answers: Record<string, unknown>, domainMap: Record<string, string>): Record<string, number> {
  const domains: Record<string, number[]> = {};
  for (const [key, value] of Object.entries(answers)) {
    const domain = domainMap[key] ?? "general";
    if (!domains[domain]) domains[domain] = [];
    const numVal = typeof value === "number" ? value : parseFloat(String(value));
    if (!isNaN(numVal)) domains[domain].push(numVal);
  }
  const result: Record<string, number> = {};
  for (const [domain, vals] of Object.entries(domains)) {
    result[domain] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }
  return result;
}

function normalize(scores: Record<string, number>, max = 5): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(scores)) {
    result[k] = Math.round((v / max) * 100);
  }
  return result;
}

router.get("/cases/:caseId/scores", authMiddleware, async (req, res) => {
  const scores = await db.select().from(scoresTable).where(eq(scoresTable.caseId, req.params.caseId));
  res.json(scores);
});

router.post("/cases/:caseId/scores/calculate", authMiddleware, async (req, res) => {
  const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, req.params.caseId));
  const completedAssignments = assignments.filter(a => a.status === "completed");

  const newScores = [];

  for (const assignment of completedAssignments) {
    const existingScore = await db.select().from(scoresTable)
      .where(eq(scoresTable.caseId, req.params.caseId))
      .limit(1);

    const responses = await db.select().from(responsesTable).where(eq(responsesTable.assignmentId, assignment.id));
    if (responses.length === 0) continue;

    const latestResponse = responses[responses.length - 1];
    const domainMap = await buildDomainMap(assignment.toolId);
    const domainScores = computeDomainScores(latestResponse.answers as Record<string, unknown>, domainMap);
    const normalizedScores = normalize(domainScores);
    const rawScore = Object.values(domainScores).reduce((a, b) => a + b, 0) / Object.keys(domainScores).length;

    const score = await db.insert(scoresTable).values({
      id: nanoid(),
      caseId: req.params.caseId,
      toolId: assignment.toolId,
      toolName: assignment.toolName,
      respondentType: assignment.respondentType,
      rawScore,
      domainScores,
      normalizedScores,
      hasHighDiscrepancy: false,
      isManual: false,
    }).returning();

    newScores.push(score[0]);
  }

  const teacher1 = newScores.find(s => s.respondentType === "teacher1");
  const teacher2 = newScores.find(s => s.respondentType === "teacher2");
  if (teacher1 && teacher2 && teacher1.rawScore != null && teacher2.rawScore != null) {
    const agreementIndex = Math.abs(teacher1.rawScore - teacher2.rawScore);
    const hasHighDiscrepancy = agreementIndex > 1.5;
    await db.update(scoresTable).set({ agreementIndex, hasHighDiscrepancy }).where(eq(scoresTable.id, teacher1.id));
    await db.update(scoresTable).set({ agreementIndex, hasHighDiscrepancy }).where(eq(scoresTable.id, teacher2.id));
  }

  const allScores = await db.select().from(scoresTable).where(eq(scoresTable.caseId, req.params.caseId));
  res.json(allScores);
});

router.post("/cases/:caseId/scores/manual", authMiddleware, async (req, res) => {
  const { toolId, toolName, respondentType, rawScore, domainScores, notes } = req.body;
  const normalizedScores = normalize(domainScores ?? {});
  const caseId = req.params.caseId;

  if (!await checkCaseAccess(req.userRole!, req.userId!, caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const existing = await db.select().from(scoresTable)
    .where(and(
      eq(scoresTable.caseId, caseId),
      eq(scoresTable.toolId, toolId),
      eq(scoresTable.respondentType, respondentType)
    ))
    .orderBy(desc(scoresTable.generatedAt))
    .limit(1);

  let score;
  if (existing[0]) {
    const rows = await db.update(scoresTable)
      .set({ rawScore, domainScores: domainScores ?? {}, normalizedScores, notes, isManual: true })
      .where(eq(scoresTable.id, existing[0].id))
      .returning();
    score = rows[0];
    res.json(score);
  } else {
    const rows = await db.insert(scoresTable).values({
      id: nanoid(),
      caseId,
      toolId,
      toolName,
      respondentType,
      rawScore,
      domainScores: domainScores ?? {},
      normalizedScores,
      hasHighDiscrepancy: false,
      isManual: true,
      notes,
    }).returning();
    score = rows[0];
    res.status(201).json(score);
  }
});

router.post("/cases/:caseId/assignments/:assignmentId/score", authMiddleware, async (req, res) => {
  const { caseId, assignmentId } = req.params;

  if (!await checkCaseAccess(req.userRole!, req.userId!, caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const assignmentRows = await db.select().from(assignmentsTable)
    .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
    .limit(1);
  if (!assignmentRows[0]) {
    res.status(404).json({ error: "not_found", message: "Assignment not found" });
    return;
  }
  const assignment = assignmentRows[0];

  const responseRows = await db.select().from(responsesTable)
    .where(eq(responsesTable.assignmentId, assignmentId))
    .orderBy(desc(responsesTable.submittedAt))
    .limit(1);
  if (!responseRows[0]) {
    res.status(404).json({ error: "not_found", message: "No response submitted yet" });
    return;
  }

  const answers = responseRows[0].answers as Record<string, unknown>;
  const domainMap = await buildDomainMap(assignment.toolId);
  const domainScores = computeDomainScores(answers, domainMap);
  const normalizedScores = normalize(domainScores);
  const domainValues = Object.values(domainScores);
  const rawScore = domainValues.length > 0
    ? domainValues.reduce((a, b) => a + b, 0) / domainValues.length
    : 0;

  const existing = await db.select().from(scoresTable)
    .where(and(
      eq(scoresTable.caseId, caseId),
      eq(scoresTable.toolId, assignment.toolId),
      eq(scoresTable.respondentType, assignment.respondentType)
    ))
    .orderBy(desc(scoresTable.generatedAt))
    .limit(1);

  let score;
  if (existing[0]) {
    const rows = await db.update(scoresTable)
      .set({ domainScores, normalizedScores, rawScore, isManual: false })
      .where(eq(scoresTable.id, existing[0].id))
      .returning();
    score = rows[0];
  } else {
    const rows = await db.insert(scoresTable).values({
      id: nanoid(),
      caseId,
      toolId: assignment.toolId,
      toolName: assignment.toolName,
      respondentType: assignment.respondentType,
      rawScore,
      domainScores,
      normalizedScores,
      hasHighDiscrepancy: false,
      isManual: false,
    }).returning();
    score = rows[0];
  }

  const allScores = await db.select().from(scoresTable).where(eq(scoresTable.caseId, caseId));
  const teacher1 = allScores.find(s => s.respondentType === "teacher1");
  const teacher2 = allScores.find(s => s.respondentType === "teacher2");
  if (teacher1 && teacher2 && teacher1.rawScore != null && teacher2.rawScore != null) {
    const agreementIndex = Math.abs(teacher1.rawScore - teacher2.rawScore);
    const hasHighDiscrepancy = agreementIndex > 1.5;
    await db.update(scoresTable).set({ agreementIndex, hasHighDiscrepancy }).where(eq(scoresTable.id, teacher1.id));
    await db.update(scoresTable).set({ agreementIndex, hasHighDiscrepancy }).where(eq(scoresTable.id, teacher2.id));
    if (score && (score.id === teacher1.id || score.id === teacher2.id)) {
      const refreshed = await db.select().from(scoresTable).where(eq(scoresTable.id, score.id)).limit(1);
      if (refreshed[0]) score = refreshed[0];
    }
  }

  res.json(score);
});

export default router;
