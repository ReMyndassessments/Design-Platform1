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

function isAdminLike(role?: string): boolean {
  return role === "admin" || role === "school_clinical_coordinator";
}

function canAccessCase(role: string, c: { school?: string | null }, userSchool?: string): boolean {
  if (role === "school_clinical_coordinator") {
    return !!userSchool && c.school === userSchool;
  }
  return true;
}

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
    const result = await db.execute(sql`
      SELECT intake_analysis->>'remyndInsights' AS insights
      FROM cases WHERE id = ${caseId}
    `);
    return (result.rows?.[0] as Record<string, unknown>)?.insights as string ?? null;
  } catch {
    return null;
  }
}

async function setCachedInsights(caseId: string, insights: string): Promise<void> {
  try {
    await db.execute(sql`
      UPDATE cases
      SET intake_analysis = COALESCE(intake_analysis, '{}'::jsonb) || jsonb_build_object('remyndInsights', ${insights}::text)
      WHERE id = ${caseId}
    `);
  } catch {
    // Non-fatal — insights still returned to client
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
      for (const d of Object.keys((score.domainScores ?? {}) as Record<string, number>)) {
        domainSet.add(d);
      }
    }
    const domains = [...domainSet];

    const respondents = scores.map(score => ({
      respondentType: score.respondentType ?? "unknown",
      respondentLabel: RESPONDENT_LABEL[score.respondentType ?? ""] ?? score.respondentType ?? "Unknown",
      // Raw domain scores (0–5 scale) — used for discrepancy threshold calculation
      domainScores: (score.domainScores ?? {}) as Record<string, number>,
      // Normalized domain scores (0–100) — used for visualization
      normalizedScores: (score.normalizedScores ?? {}) as Record<string, number>,
      rawScore: score.rawScore ?? 0,
    }));

    // Per-domain discrepancy: compare RAW domain scores, flag spread ≥ 1.5
    const discrepancies = domains.map(domain => {
      const vals = respondents
        .map(r => r.domainScores[domain])
        .filter((v): v is number => v !== undefined && v !== null);
      if (vals.length < 2) return null;
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const spread = max - min;
      return {
        domain,
        rawSpread: spread,
        isHigh: spread >= 1.5,
        // Normalized spread for chart display
        normalizedSpread: Math.round(
          (respondents.map(r => r.normalizedScores[domain]).filter((v): v is number => v !== undefined).reduce((a, b) => Math.max(a, b), 0)) -
          (respondents.map(r => r.normalizedScores[domain]).filter((v): v is number => v !== undefined).reduce((a, b) => Math.min(a, b), Infinity))
        ),
      };
    }).filter((d): d is NonNullable<typeof d> => d !== null);

    tools.push({
      toolId,
      toolName: toolNameMap.get(toolId) ?? toolId,
      domains,
      respondents,
      discrepancies,
    });
  }

  // Build cross-tool domain Index: average normalized scores per domain
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

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRows[0]) { res.status(404).json({ error: "not_found" }); return; }

  if (!canAccessCase(req.userRole!, caseRows[0], req.userSchool)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const { tools, index } = await buildIndexData(caseId);
  const cachedInsights = await getCachedInsights(caseId);

  res.json({ tools, index, cachedInsights });
});

// POST /cases/:caseId/remynd-index/insights
router.post("/cases/:caseId/remynd-index/insights", authMiddleware, async (req, res) => {
  if (!isAdminLike(req.userRole)) {
    res.status(403).json({ error: "forbidden", message: "Only admins and coordinators can generate insights" });
    return;
  }

  const { caseId } = req.params;

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRows[0]) { res.status(404).json({ error: "not_found" }); return; }

  if (!canAccessCase(req.userRole!, caseRows[0], req.userSchool)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

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

  // Build the aggregated index map to pass to AI for holistic interpretation
  const indexForAI: Record<string, { average: number; riskBand: string; sources: string[] }> = {};
  for (const tool of tools) {
    for (const r of tool.respondents) {
      for (const [domain] of Object.entries(r.normalizedScores)) {
        if (!indexForAI[domain]) indexForAI[domain] = { average: 0, riskBand: "", sources: [] };
        indexForAI[domain].sources.push(`${tool.toolName} / ${r.respondentType}`);
      }
    }
  }
  // Compute averages and risk bands for the index map
  for (const [domain, entry] of Object.entries(indexForAI)) {
    const scores = tools.flatMap(t =>
      t.respondents.map(r => r.normalizedScores[domain]).filter((v): v is number => v !== undefined)
    );
    entry.average = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    entry.riskBand = entry.average <= 25 ? "low" : entry.average <= 50 ? "mild" : entry.average <= 65 ? "moderate" : "elevated";
  }

  const insights = await generateRemyndIndexInsights(
    {
      studentName: String(caseData.studentName ?? "Student"),
      school: String(caseData.school ?? ""),
      grade: String(caseData.grade ?? ""),
      referralReason: String(caseData.referralReason ?? ""),
    },
    toolsForAI,
    indexForAI
  );

  // Cache in case intake_analysis JSONB (additive, no schema change required)
  await setCachedInsights(caseId, insights);

  res.json({ insights });
});

export default router;
