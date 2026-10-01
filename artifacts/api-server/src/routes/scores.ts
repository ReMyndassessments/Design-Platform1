import { Router } from "express";
import { db } from "@workspace/db";
import { scoresTable, responsesTable, assignmentsTable, casesTable, assessmentToolsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";
import { writeAudit } from "../lib/audit.js";
import { activeAssignmentCondition, isRetiredAssignment } from "../lib/assignmentRetirement.js";

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
};

function labelToNum(value: unknown): number | null {
  if (typeof value === "number") return value;
  const s = String(value).trim();
  const n = parseFloat(s);
  if (!isNaN(n)) return n;
  return LABEL_TO_NUMBER[s.toLowerCase()] ?? null;
}

/** Build a questionId → domain lookup from the tool's canonical or DB-stored question list. */
async function buildDomainMap(toolId: string, reader: Pick<typeof db, "select"> = db): Promise<Record<string, string>> {
  const toolRows = await reader.select({ formItems: assessmentToolsTable.formItems })
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
async function getScaleMax(toolId: string, reader: Pick<typeof db, "select"> = db): Promise<number> {
  const toolRows = await reader.select({ scoringConfig: assessmentToolsTable.scoringConfig })
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
  const [scores, assignments] = await Promise.all([
    db.select().from(scoresTable).where(eq(scoresTable.caseId, req.params.caseId)),
    db.select().from(assignmentsTable).where(and(
      eq(assignmentsTable.caseId, req.params.caseId),
      activeAssignmentCondition(),
    )),
  ]);
  const activePairs = new Set(assignments.map(a => `${a.toolId}::${a.respondentType ?? ""}`));
  res.json(scores.filter(score => activePairs.has(`${score.toolId}::${score.respondentType ?? ""}`)));
});

router.post("/cases/:caseId/scores/calculate", authMiddleware, async (req, res) => {
  if (req.userRole === "assessment_invigilator") {
    res.status(403).json({ error: "forbidden", message: "Invigilators have view-only access" });
    return;
  }
  const caseId = req.params.caseId;
  const result = await db.transaction(async tx => {
    const [caseRow] = await tx.select({ id: casesTable.id }).from(casesTable)
      .where(eq(casesTable.id, caseId)).for("update");
    if (!caseRow) return { notFound: true as const };

    // Reassignment takes locks in case -> assignment order. Holding the same
    // locks until score writes commit prevents a retired response being scored
    // back into the active score table.
    const assignments = await tx.select().from(assignmentsTable).where(and(
      eq(assignmentsTable.caseId, caseId),
      activeAssignmentCondition(),
    )).for("update");
    const completedAssignments = assignments.filter(a => a.status === "completed");
    const written: Array<{ score: typeof scoresTable.$inferSelect; assignment: typeof assignmentsTable.$inferSelect }> = [];

    for (const assignment of completedAssignments) {
      const [latestResponse] = await tx.select().from(responsesTable)
        .where(eq(responsesTable.assignmentId, assignment.id))
        .orderBy(desc(responsesTable.submittedAt))
        .limit(1);
      if (!latestResponse) continue;

      const domainMap = await buildDomainMap(assignment.toolId, tx);
      const scaleMax = await getScaleMax(assignment.toolId, tx);
      const domainScores = computeDomainScores(latestResponse.answers as Record<string, unknown>, domainMap);
      const normalizedScores = normalize(domainScores, scaleMax);
      const values = Object.values(domainScores);
      const rawScore = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

      await tx.delete(scoresTable).where(and(
        eq(scoresTable.caseId, caseId),
        eq(scoresTable.toolId, assignment.toolId),
        eq(scoresTable.respondentType, assignment.respondentType),
        eq(scoresTable.isManual, false),
      ));
      const [score] = await tx.insert(scoresTable).values({
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
      written.push({ score, assignment });
    }

    const teacher1 = written.find(row => row.score.respondentType === "teacher1")?.score;
    const teacher2 = written.find(row => row.score.respondentType === "teacher2")?.score;
    if (teacher1 && teacher2 && teacher1.rawScore != null && teacher2.rawScore != null) {
      const agreementIndex = Math.abs(teacher1.rawScore - teacher2.rawScore);
      const hasHighDiscrepancy = agreementIndex > 1.5;
      await tx.update(scoresTable).set({ agreementIndex, hasHighDiscrepancy }).where(eq(scoresTable.id, teacher1.id));
      await tx.update(scoresTable).set({ agreementIndex, hasHighDiscrepancy }).where(eq(scoresTable.id, teacher2.id));
    }

    const allScores = await tx.select().from(scoresTable).where(eq(scoresTable.caseId, caseId));
    const activePairs = new Set(assignments.map(a => `${a.toolId}::${a.respondentType ?? ""}`));
    return {
      notFound: false as const,
      scores: allScores.filter(score => activePairs.has(`${score.toolId}::${score.respondentType ?? ""}`)),
      written,
    };
  });
  if (result.notFound) {
    res.status(404).json({ error: "not_found", message: "Case not found" });
    return;
  }
  for (const { score, assignment } of result.written) {
    void writeAudit({
      eventType: "score.computed",
      caseId,
      assignmentId: assignment.id,
      toolId: assignment.toolId,
      actorId: req.userId ?? null,
      actorRole: req.userRole ?? null,
      metadata: { rawScore: score.rawScore, isManual: false, respondentType: assignment.respondentType },
    });
  }
  res.json(result.scores);
});

router.post("/cases/:caseId/scores/manual", authMiddleware, async (req, res) => {
  if (req.userRole === "assessment_invigilator") {
    res.status(403).json({ error: "forbidden", message: "Invigilators have view-only access" });
    return;
  }
  const { assignmentId, toolId, respondentType, rawScore, domainScores, notes } = req.body as {
    assignmentId?: unknown;
    toolId?: unknown;
    respondentType?: unknown;
    rawScore?: number | null;
    domainScores?: Record<string, number>;
    notes?: string | null;
  };
  const caseId = req.params.caseId;
  if (typeof assignmentId !== "string" || typeof toolId !== "string" || typeof respondentType !== "string") {
    res.status(400).json({ error: "validation_error", message: "assignmentId, toolId, and respondentType are required" });
    return;
  }
  const normalizedScores = normalize(domainScores ?? {});

  if (!await checkCaseAccess(req.userRole!, req.userId!, caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const result = await db.transaction(async tx => {
    const [caseRow] = await tx.select({ id: casesTable.id }).from(casesTable)
      .where(eq(casesTable.id, caseId)).for("update");
    if (!caseRow) return { error: "not_found" as const };
    const [assignment] = await tx.select().from(assignmentsTable).where(and(
      eq(assignmentsTable.id, assignmentId),
      eq(assignmentsTable.caseId, caseId),
    )).for("update");
    if (!assignment) return { error: "assignment_not_found" as const };
    if (isRetiredAssignment(assignment)) return { error: "assignment_retired" as const };
    if (assignment.toolId !== toolId || assignment.respondentType !== respondentType) {
      return { error: "assignment_mismatch" as const };
    }

    const [existing] = await tx.select().from(scoresTable).where(and(
      eq(scoresTable.caseId, caseId),
      eq(scoresTable.toolId, assignment.toolId),
      eq(scoresTable.respondentType, assignment.respondentType),
    )).orderBy(desc(scoresTable.generatedAt)).limit(1);
    if (existing) {
      const [score] = await tx.update(scoresTable)
        .set({ rawScore, domainScores: domainScores ?? {}, normalizedScores, notes, isManual: true })
        .where(eq(scoresTable.id, existing.id))
        .returning();
      return { error: null, score, created: false as const };
    }
    const [score] = await tx.insert(scoresTable).values({
      id: nanoid(),
      caseId,
      toolId: assignment.toolId,
      toolName: assignment.toolName,
      respondentType: assignment.respondentType,
      rawScore,
      domainScores: domainScores ?? {},
      normalizedScores,
      hasHighDiscrepancy: false,
      isManual: true,
      notes,
    }).returning();
    return { error: null, score, created: true as const };
  });
  if (result.error) {
    const status = result.error === "assignment_retired" ? 409
      : result.error === "assignment_mismatch" ? 400 : 404;
    res.status(status).json({
      error: result.error,
      message: result.error === "assignment_retired" ? "A retired assignment cannot be scored"
        : result.error === "assignment_mismatch" ? "Score details do not match the originating assignment"
          : "Assignment not found for this case",
    });
    return;
  }
  res.status(result.created ? 201 : 200).json(result.score);
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

  const result = await db.transaction(async tx => {
    const [caseRow] = await tx.select({ id: casesTable.id }).from(casesTable)
      .where(eq(casesTable.id, caseId)).for("update");
    if (!caseRow) return { error: "not_found" as const };

    // Use the same case -> assignment lock order as teacher reassignment.
    const assignments = await tx.select().from(assignmentsTable)
      .where(eq(assignmentsTable.caseId, caseId)).for("update");
    const assignment = assignments.find(row => row.id === assignmentId);
    if (!assignment) return { error: "assignment_not_found" as const };
    if (isRetiredAssignment(assignment)) return { error: "assignment_retired" as const };

    // Response and score sources are re-read only after the assignment lock.
    const [response] = await tx.select().from(responsesTable)
      .where(eq(responsesTable.assignmentId, assignmentId))
      .orderBy(desc(responsesTable.submittedAt))
      .limit(1);
    if (!response) return { error: "response_not_found" as const };

    const answers = response.answers as Record<string, unknown>;
    const domainMap = await buildDomainMap(assignment.toolId, tx);
    const scaleMax = await getScaleMax(assignment.toolId, tx);
    const domainScores = computeDomainScores(answers, domainMap);
    const normalizedScores = normalize(domainScores, scaleMax);
    const domainValues = Object.values(domainScores);
    const rawScore = domainValues.length
      ? domainValues.reduce((a, b) => a + b, 0) / domainValues.length
      : 0;

    const [existing] = await tx.select().from(scoresTable).where(and(
      eq(scoresTable.caseId, caseId),
      eq(scoresTable.toolId, assignment.toolId),
      eq(scoresTable.respondentType, assignment.respondentType),
    )).orderBy(desc(scoresTable.generatedAt)).limit(1);

    let score;
    if (existing) {
      [score] = await tx.update(scoresTable)
        .set({ domainScores, normalizedScores, rawScore, isManual: false })
        .where(eq(scoresTable.id, existing.id))
        .returning();
    } else {
      [score] = await tx.insert(scoresTable).values({
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
    }

    const activeAssignments = assignments.filter(row => !isRetiredAssignment(row));
    const activePairs = new Set(activeAssignments.map(row => `${row.toolId}::${row.respondentType ?? ""}`));
    const allScores = (await tx.select().from(scoresTable).where(eq(scoresTable.caseId, caseId)))
      .filter(row => activePairs.has(`${row.toolId}::${row.respondentType ?? ""}`));
    const teacher1 = allScores.find(row => row.respondentType === "teacher1");
    const teacher2 = allScores.find(row => row.respondentType === "teacher2");
    if (teacher1 && teacher2 && teacher1.rawScore != null && teacher2.rawScore != null) {
      const agreementIndex = Math.abs(teacher1.rawScore - teacher2.rawScore);
      const hasHighDiscrepancy = agreementIndex > 1.5;
      await tx.update(scoresTable).set({ agreementIndex, hasHighDiscrepancy }).where(eq(scoresTable.id, teacher1.id));
      await tx.update(scoresTable).set({ agreementIndex, hasHighDiscrepancy }).where(eq(scoresTable.id, teacher2.id));
      if (score.id === teacher1.id || score.id === teacher2.id) {
        [score] = await tx.select().from(scoresTable).where(eq(scoresTable.id, score.id)).limit(1);
      }
    }
    return { error: null, score, assignment };
  });

  if (result.error) {
    const status = result.error === "assignment_retired" ? 409 : 404;
    res.status(status).json({
      error: result.error,
      message: result.error === "assignment_retired" ? "A retired assignment cannot be scored"
        : result.error === "response_not_found" ? "No response submitted yet"
          : "Assignment not found",
    });
    return;
  }
  void writeAudit({
    eventType: "score.computed",
    caseId,
    assignmentId,
    toolId: result.assignment.toolId,
    actorId: req.userId ?? null,
    actorRole: req.userRole ?? null,
    metadata: { rawScore: result.score.rawScore, isManual: false, respondentType: result.assignment.respondentType },
  });
  res.json(result.score);
});

export default router;
