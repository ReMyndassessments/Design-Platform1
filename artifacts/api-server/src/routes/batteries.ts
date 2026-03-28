import { Router } from "express";
import { db } from "@workspace/db";
import { batteriesTable, assessmentToolsTable, assignmentsTable, scoresTable } from "@workspace/db/schema";
import { eq, inArray, and, desc } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { buildDomainMap, getScaleMax, computeDomainScores, normalizeScores, getLatestAnswers } from "../lib/scoringHelpers.js";

const router = Router();
const CDP_TOOL_IDS = ["CDP-CL", "CDP-SI", "CDP-SR", "CDP-CI"];

// GET /api/batteries — list all batteries
router.get("/batteries", async (_req, res) => {
  try {
    const batteries = await db.select().from(batteriesTable).orderBy(batteriesTable.name);
    return res.json(batteries);
  } catch {
    return res.status(500).json({ error: "Failed to fetch batteries" });
  }
});

// PATCH /api/batteries/:id — update battery tool membership
router.patch("/batteries/:id", authMiddleware, async (req, res) => {
  try {
    const { toolIds } = req.body as { toolIds: string[] };
    if (!Array.isArray(toolIds)) return res.status(400).json({ error: "toolIds must be an array" });
    const [updated] = await db
      .update(batteriesTable)
      .set({ toolIds })
      .where(eq(batteriesTable.id, req.params.id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Battery not found" });
    return res.json(updated);
  } catch {
    return res.status(500).json({ error: "Failed to update battery" });
  }
});

// GET /api/batteries/:id — get a single battery with its tools
router.get("/batteries/:id", async (req, res) => {
  try {
    const [battery] = await db.select().from(batteriesTable).where(eq(batteriesTable.id, req.params.id));
    if (!battery) return res.status(404).json({ error: "Battery not found" });

    const toolIds = (battery.toolIds as string[]) ?? [];
    const tools = toolIds.length > 0
      ? await db.select({ id: assessmentToolsTable.id, name: assessmentToolsTable.name, description: assessmentToolsTable.description, domains: assessmentToolsTable.domains })
          .from(assessmentToolsTable).where(inArray(assessmentToolsTable.id, toolIds))
      : [];

    return res.json({ ...battery, tools });
  } catch {
    return res.status(500).json({ error: "Failed to fetch battery" });
  }
});

// GET /api/cases/:caseId/cdp/profile — CDP Battery composite profile
router.get("/cases/:caseId/cdp/profile", authMiddleware, async (req, res) => {
  const { caseId } = req.params;

  const assignments = await db.select().from(assignmentsTable)
    .where(and(
      eq(assignmentsTable.caseId, caseId),
      inArray(assignmentsTable.toolId, CDP_TOOL_IDS),
    ));

  // Load scoring configs for all 4 CDP tools
  const toolRows = await db.select({
    id: assessmentToolsTable.id,
    name: assessmentToolsTable.name,
    scoringConfig: assessmentToolsTable.scoringConfig,
  }).from(assessmentToolsTable).where(inArray(assessmentToolsTable.id, CDP_TOOL_IDS));

  const toolConfigMap = Object.fromEntries(toolRows.map(t => [t.id, t]));

  const forms: Record<string, any> = {};

  // Initialize all 4 forms
  for (const tid of CDP_TOOL_IDS) {
    const toolInfo = toolConfigMap[tid];
    forms[tid] = {
      toolId: tid,
      toolName: toolInfo?.name ?? tid,
      status: "not_assigned",
      scoringConfig: toolInfo?.scoringConfig ?? null,
      assignments: [],
    };
  }

  // Group assignments by toolId
  for (const a of assignments) {
    const form = forms[a.toolId];
    if (!form) continue;
    form.assignments.push(a);
    // Use the most recent completed assignment if available
    if (a.status === "completed") {
      form.status = "completed";
    } else if (form.status === "not_assigned") {
      form.status = "pending";
    }
  }

  // For each form, get or calculate scores
  const result: any[] = [];
  for (const tid of CDP_TOOL_IDS) {
    const form = forms[tid];
    // Find the most recent completed assignment
    const completedAssignment = form.assignments
      .filter((a: any) => a.status === "completed")
      .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

    let scoreData = null;

    if (completedAssignment) {
      // Try to find an existing score
      const existingScores = await db.select().from(scoresTable)
        .where(and(
          eq(scoresTable.caseId, caseId),
          eq(scoresTable.toolId, tid),
        ))
        .orderBy(desc(scoresTable.generatedAt))
        .limit(1);

      if (existingScores[0]) {
        const s = existingScores[0];
        scoreData = {
          rawScore: s.rawScore,
          domainScores: s.domainScores as Record<string, number>,
          normalizedScores: s.normalizedScores as Record<string, number>,
          scoredAt: s.generatedAt,
        };
      } else {
        // Calculate on the fly from the latest response
        const answers = await getLatestAnswers(completedAssignment.id);
        if (answers) {
          const domainMap = await buildDomainMap(tid);
          const scaleMax = await getScaleMax(tid);
          const domainScores = computeDomainScores(answers, domainMap);
          const normalized = normalizeScores(domainScores, scaleMax);
          const domainVals = Object.values(domainScores);
          const rawScore = domainVals.length > 0
            ? domainVals.reduce((a, b) => a + b, 0) / domainVals.length
            : 0;
          scoreData = {
            rawScore,
            domainScores,
            normalizedScores: normalized,
            scoredAt: null,
          };
        }
      }
    }

    const assignmentSummaries = form.assignments.map((a: any) => ({
      id: a.id,
      status: a.status,
      respondentType: a.respondentType,
      respondentLabel: a.respondentLabel,
      assignedToName: a.assignedToName,
      assignedToEmail: a.assignedToEmail,
    }));

    result.push({
      toolId: tid,
      toolName: form.toolName,
      status: form.status as "not_assigned" | "pending" | "completed",
      assignments: assignmentSummaries,
      score: scoreData,
      scoringConfig: form.scoringConfig,
    });
  }

  return res.json({
    caseId,
    forms: result,
  });
});

export default router;
