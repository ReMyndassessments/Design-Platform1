import { Router } from "express";
import { db } from "@workspace/db";
import { scoresTable, responsesTable, assignmentsTable, casesTable, assessmentToolsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";
import { writeAudit } from "../lib/audit.js";
import { isChineseLiteracy } from "../lib/chineseLiteracyInstruments.js";
import { isBrief2ToolId } from "../lib/brief2-descriptive.js";

const router = Router();

async function checkCaseAccess(_role: string, _userId: string, caseId: string): Promise<boolean> {
  const rows = await db.select({ id: casesTable.id })
    .from(casesTable)
    .where(eq(casesTable.id, caseId))
    .limit(1);
  return !!rows[0];
}

const NON_CLINICAL_DOMAINS = new Set(["admin", "referral", "demographic", "admin_info", "instructions", "general_info", "identifying_info"]);

/** Map text option labels to numeric values so scoring works regardless of whether the
 *  form stored the answer as a raw number, a numeric string, or an option label string. */
const LABEL_TO_NUMBER: Record<string, number> = {
  "never": 0, "sometimes": 1, "often": 2, "almost always": 3,
  "true": 1, "false": 0, "yes": 1, "no": 0,
  "not at all": 0, "just a little": 1, "pretty much": 2, "very much": 3,
  "not true": 0, "somewhat true": 1, "certainly true": 2,
  "never/rarely": 0, "occasionally": 1, "frequently": 2, "almost/always": 3,
  "no difficulty": 0, "mild difficulty": 1, "moderate difficulty": 2, "severe difficulty": 3,
  "没有困难": 0, "轻度困难": 1, "中度困难": 2, "严重困难": 3,
  "어려움 없음": 0, "약간의 어려움": 1, "중간 정도의 어려움": 2, "심각한 어려움": 3,
};

function labelToNum(value: unknown): number | null {
  if (typeof value === "number") return value;
  const s = String(value).trim();
  const n = parseFloat(s);
  if (!isNaN(n)) return n;
  return LABEL_TO_NUMBER[s.toLowerCase()] ?? null;
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

/** Fetch the scale max from the tool's scoringConfig (fallback to 5). */
async function getScaleMax(toolId: string): Promise<number> {
  const toolRows = await db.select({ scoringConfig: assessmentToolsTable.scoringConfig })
    .from(assessmentToolsTable)
    .where(eq(assessmentToolsTable.id, toolId))
    .limit(1);
  const cfg = toolRows[0]?.scoringConfig as { max?: number } | null | undefined;
  return cfg?.max ?? 5;
}

function computeDomainScores(answers: Record<string, unknown>, domainMap: Record<string, string>): Record<string, number> {
  const domains: Record<string, number[]> = {};
  for (const [key, value] of Object.entries(answers)) {
    const domain = domainMap[key] ?? "general";
    if (NON_CLINICAL_DOMAINS.has(domain)) continue;
    if (!domains[domain]) domains[domain] = [];
    const numVal = labelToNum(value);
    if (numVal !== null) domains[domain].push(numVal);
  }
  const result: Record<string, number> = {};
  for (const [domain, vals] of Object.entries(domains)) {
    if (vals.length === 0) continue;
    result[domain] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }
  return result;
}

function normalize(scores: Record<string, number>, max = 5): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(scores)) {
    result[k] = Math.min(100, Math.max(0, Math.round((v / max) * 100)));
  }
  return result;
}

router.get("/cases/:caseId/scores", authMiddleware, async (req, res) => {
  const scores = await db.select().from(scoresTable).where(eq(scoresTable.caseId, req.params.caseId));
  // Descriptive literacy profiles have their own coverage/evidence view, not
  // the generic normalized/risk visualizations used by other instruments.
  res.json(scores.filter(score => !isChineseLiteracy(score.toolId) && !isBrief2ToolId(score.toolId)));
});

router.post("/cases/:caseId/scores/calculate", authMiddleware, async (req, res) => {
  if (req.userRole === "assessment_invigilator") {
    res.status(403).json({ error: "forbidden", message: "Invigilators have view-only access" });
    return;
  }
  const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, req.params.caseId));
  const completedAssignments = assignments.filter(a => a.status === "completed");

  const newScores = [];

  for (const assignment of completedAssignments) {
    if (isChineseLiteracy(assignment.toolId) || isBrief2ToolId(assignment.toolId)) continue;
    const responses = await db.select().from(responsesTable).where(eq(responsesTable.assignmentId, assignment.id));
    if (responses.length === 0) continue;

    const latestResponse = responses[responses.length - 1];
    const domainMap = await buildDomainMap(assignment.toolId);
    const scaleMax = await getScaleMax(assignment.toolId);
    const domainScores = computeDomainScores(latestResponse.answers as Record<string, unknown>, domainMap);
    const normalizedScores = normalize(domainScores, scaleMax);
    const rawScore = Object.values(domainScores).reduce((a, b) => a + b, 0) / Object.keys(domainScores).length;

    // Remove stale auto-computed scores for this tool+respondent before inserting fresh ones.
    await db.delete(scoresTable).where(
      and(
        eq(scoresTable.caseId, req.params.caseId),
        eq(scoresTable.toolId, assignment.toolId),
        eq(scoresTable.respondentType, assignment.respondentType),
        eq(scoresTable.isManual, false)
      )
    );

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
    void writeAudit({
      eventType: "score.computed",
      caseId: req.params.caseId,
      assignmentId: assignment.id,
      toolId: assignment.toolId,
      actorId: req.userId ?? null,
      actorRole: req.userRole ?? null,
      metadata: { rawScore, isManual: false, respondentType: assignment.respondentType },
    });
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
  res.json(allScores.filter(score => !isChineseLiteracy(score.toolId) && !isBrief2ToolId(score.toolId)));
});

router.post("/cases/:caseId/scores/manual", authMiddleware, async (req, res) => {
  if (req.userRole === "assessment_invigilator") {
    res.status(403).json({ error: "forbidden", message: "Invigilators have view-only access" });
    return;
  }
  const { toolId, toolName, respondentType, rawScore, domainScores, notes } = req.body;
  if (isChineseLiteracy(toolId)) {
    res.status(409).json({ message: "This profile uses server-calculated descriptive coverage and separate domain means. Manual scores and diagnostic normalization are not permitted." }); return;
  }
  if (isBrief2ToolId(toolId)) {
    res.status(409).json({ message: "BRIEF-2 cannot use RAOS /100 or generic severity scoring. Use descriptive response frequencies or enter results from an authorized scoring source through a reviewed workflow." }); return;
  }
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
  if (req.userRole === "assessment_invigilator") {
    res.status(403).json({ error: "forbidden", message: "Invigilators have view-only access" });
    return;
  }
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
  if (isChineseLiteracy(assignment?.toolId)) {
    res.status(409).json({ message: "Use Chinese literacy review for the pinned teacher score snapshot." }); return;
  }
  if (isBrief2ToolId(assignment?.toolId)) {
    res.status(409).json({ message: "BRIEF-2 cannot use RAOS /100 or generic severity scoring. Review descriptive response frequencies instead." }); return;
  }

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
  const scaleMax = await getScaleMax(assignment.toolId);
  const domainScores = computeDomainScores(answers, domainMap);
  const normalizedScores = normalize(domainScores, scaleMax);
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

  void writeAudit({
    eventType: "score.computed",
    caseId,
    assignmentId,
    toolId: assignment.toolId,
    actorId: req.userId ?? null,
    actorRole: req.userRole ?? null,
    metadata: { rawScore, isManual: false, respondentType: assignment.respondentType },
  });

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
