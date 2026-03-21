import { Router } from "express";
import { db } from "@workspace/db";
import { scoresTable, responsesTable, assignmentsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";

const router = Router();

function computeDomainScores(answers: Record<string, unknown>): Record<string, number> {
  const domains: Record<string, number[]> = {};
  for (const [key, value] of Object.entries(answers)) {
    const parts = key.split("_");
    const domain = parts[parts.length - 1] ?? "general";
    if (!domains[domain]) domains[domain] = [];
    const numVal = typeof value === "number" ? value : parseInt(String(value), 10);
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
    const domainScores = computeDomainScores(latestResponse.answers as Record<string, unknown>);
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

  const score = await db.insert(scoresTable).values({
    id: nanoid(),
    caseId: req.params.caseId,
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

  res.status(201).json(score[0]);
});

export default router;
