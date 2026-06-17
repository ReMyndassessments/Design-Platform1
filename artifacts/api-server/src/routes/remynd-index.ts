import { Router } from "express";
import { db } from "@workspace/db";
import { scoresTable, casesTable, assessmentToolsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { generateRemyndIndexInsights } from "../lib/ai.js";

const router = Router();

const REMYND_AUTO_TOOL_IDS = new Set([
  "RCS-80", "RASR", "RARI", "REFI", "RERMS", "RSCP", "RARPS", "RFII", "RCEP",
]);

const RESPONDENT_LABEL: Record<string, string> = {
  parent: "Parent / Guardian",
  teacher1: "Teacher 1",
  teacher2: "Teacher 2",
  self: "Student (Self-Report)",
  school_counselor: "School Counselor",
  boarding_staff: "Boarding Staff",
  referring_teacher: "Referring Teacher",
  invigilator: "Invigilator",
};

function getRiskBand(score: number): "low" | "mild" | "moderate" | "elevated" {
  if (score <= 25) return "low";
  if (score <= 50) return "mild";
  if (score <= 65) return "moderate";
  return "elevated";
}

async function getRemyndToolIds(): Promise<Set<string>> {
  try {
    const toolRows = await db
      .select({ id: assessmentToolsTable.id, scoringType: assessmentToolsTable.scoringType, isRemyndOwned: assessmentToolsTable.isRemyndOwned })
      .from(assessmentToolsTable);
    const dbIds = toolRows
      .filter(t => t.isRemyndOwned && t.scoringType === "auto")
      .map(t => t.id);
    return new Set([...REMYND_AUTO_TOOL_IDS, ...dbIds]);
  } catch {
    return REMYND_AUTO_TOOL_IDS;
  }
}

async function getToolNameMap(): Promise<Map<string, string>> {
  try {
    const toolRows = await db.select({ id: assessmentToolsTable.id, name: assessmentToolsTable.name }).from(assessmentToolsTable);
    return new Map(toolRows.map(t => [t.id, t.name]));
  } catch {
    return new Map();
  }
}

async function getCachedInsights(caseId: string): Promise<string | null> {
  try {
    const result = await db.execute(sql`SELECT remynd_insights_cache FROM cases WHERE id = ${caseId}`);
    return (result.rows?.[0] as Record<string, unknown>)?.remynd_insights_cache as string ?? null;
  } catch {
    return null;
  }
}

async function ensureInsightsCacheColumn(): Promise<void> {
  try {
    await db.execute(sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS remynd_insights_cache TEXT`);
  } catch {
    // column already exists or no permission — non-fatal
  }
}

async function buildIndexData(caseId: string) {
  const allScores = await db.select().from(scoresTable).where(eq(scoresTable.caseId, caseId));
  const remyndToolIds = await getRemyndToolIds();
  const toolNameMap = await getToolNameMap();
  const remyndScores = allScores.filter(s => remyndToolIds.has(s.toolId));

  if (remyndScores.length === 0) return { tools: [], index: {} };

  // Group by toolId
  const byTool = new Map<string, typeof remyndScores>();
  for (const score of remyndScores) {
    if (!byTool.has(score.toolId)) byTool.set(score.toolId, []);
    byTool.get(score.toolId)!.push(score);
  }

  const tools = [];
  for (const [toolId, scores] of byTool) {
    const domainSet = new Set<string>();
    for (const score of scores) {
      for (const d of Object.keys((score.normalizedScores ?? {}) as Record<string, number>)) {
        domainSet.add(d);
      }
    }
    const domains = [...domainSet];

    const respondents = scores.map(score => ({
      respondentType: score.respondentType ?? "unknown",
      respondentLabel: RESPONDENT_LABEL[score.respondentType ?? ""] ?? score.respondentType ?? "Unknown",
      normalizedScores: (score.normalizedScores ?? {}) as Record<string, number>,
      rawScore: score.rawScore ?? 0,
    }));

    const discrepancies = domains.map(domain => {
      const vals = respondents
        .map(r => r.normalizedScores[domain])
        .filter((v): v is number => v !== undefined && v !== null);
      if (vals.length < 2) return null;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const spread = max - min;
      return { domain, spread, isHigh: spread >= 20, min, max };
    }).filter((d): d is NonNullable<typeof d> => d !== null && d.spread > 0);

    tools.push({
      toolId,
      toolName: toolNameMap.get(toolId) ?? toolId,
      domains,
      respondents,
      discrepancies,
    });
  }

  // Build cross-tool domain index
  const domainAcc = new Map<string, { total: number; count: number; sources: string[] }>();
  for (const tool of tools) {
    for (const respondent of tool.respondents) {
      for (const [domain, score] of Object.entries(respondent.normalizedScores)) {
        if (!domainAcc.has(domain)) domainAcc.set(domain, { total: 0, count: 0, sources: [] });
        const entry = domainAcc.get(domain)!;
        entry.total += score;
        entry.count++;
        entry.sources.push(`${tool.toolName} (${respondent.respondentLabel})`);
      }
    }
  }

  const index: Record<string, { average: number; sources: string[]; riskBand: string }> = {};
  for (const [domain, { total, count, sources }] of domainAcc) {
    const average = Math.round(total / count);
    index[domain] = { average, sources, riskBand: getRiskBand(average) };
  }

  return { tools, index };
}

// GET /cases/:caseId/remynd-index
router.get("/cases/:caseId/remynd-index", authMiddleware, async (req, res) => {
  const { caseId } = req.params;

  const caseRows = await db.select({ id: casesTable.id })
    .from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRows[0]) { res.status(404).json({ error: "not_found" }); return; }

  const { tools, index } = await buildIndexData(caseId);
  const cachedInsights = await getCachedInsights(caseId);

  res.json({ tools, index, cachedInsights });
});

// POST /cases/:caseId/remynd-index/insights
router.post("/cases/:caseId/remynd-index/insights", authMiddleware, async (req, res) => {
  if (req.userRole === "assessment_invigilator") {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const { caseId } = req.params;

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRows[0]) { res.status(404).json({ error: "not_found" }); return; }

  const caseData = caseRows[0] as Record<string, unknown>;
  const { tools } = await buildIndexData(caseId);

  if (tools.length === 0) {
    res.status(400).json({ error: "no_scores", message: "No ReMynd scores available to analyse." });
    return;
  }

  const toolsForAI = tools.map(t => ({
    toolName: t.toolName,
    respondents: t.respondents.map(r => ({
      respondentType: r.respondentType,
      normalizedScores: r.normalizedScores,
    })),
  }));

  const insights = await generateRemyndIndexInsights(
    {
      studentName: String(caseData.studentName ?? "Student"),
      school: String(caseData.school ?? ""),
      grade: String(caseData.grade ?? ""),
      referralReason: String(caseData.referralReason ?? ""),
    },
    toolsForAI
  );

  // Cache in cases table
  await ensureInsightsCacheColumn();
  try {
    await db.execute(sql`UPDATE cases SET remynd_insights_cache = ${insights} WHERE id = ${caseId}`);
  } catch {
    // Non-fatal
  }

  res.json({ insights });
});

export default router;
