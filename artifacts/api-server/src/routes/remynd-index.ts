import { Router } from "express";
import { db } from "@workspace/db";
import { scoresTable, casesTable, assessmentToolsTable, assignmentsTable } from "@workspace/db/schema";
import { eq, sql, and } from "drizzle-orm";
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

type ToolThresholds = { low: number; mild: number; moderate: number };
const DEFAULT_THRESHOLDS: ToolThresholds = { low: 25, mild: 50, moderate: 65 };

function getRiskBandForThresholds(score: number, t: ToolThresholds): "low" | "mild" | "moderate" | "elevated" {
  if (score <= t.low) return "low";
  if (score <= t.mild) return "mild";
  if (score <= t.moderate) return "moderate";
  return "elevated";
}

type ToolConfig = { thresholds: ToolThresholds; domains: Record<string, string> };

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

async function getToolConfigMap(): Promise<Map<string, ToolConfig>> {
  try {
    const toolRows = await db
      .select({ id: assessmentToolsTable.id, scoringConfig: assessmentToolsTable.scoringConfig })
      .from(assessmentToolsTable);
    const map = new Map<string, ToolConfig>();
    for (const row of toolRows) {
      const cfg = row.scoringConfig as {
        thresholds?: { low?: number; mild?: number; moderate?: number };
        domains?: Record<string, { label?: string }>;
      } | null | undefined;
      const raw = cfg?.thresholds;
      const thresholds: ToolThresholds = {
        low: raw?.low ?? DEFAULT_THRESHOLDS.low,
        mild: raw?.mild ?? DEFAULT_THRESHOLDS.mild,
        moderate: raw?.moderate ?? DEFAULT_THRESHOLDS.moderate,
      };
      const domains: Record<string, string> = {};
      if (cfg?.domains && typeof cfg.domains === "object") {
        for (const [key, val] of Object.entries(cfg.domains)) {
          domains[key] = (val as { label?: string })?.label ?? key;
        }
      }
      map.set(row.id, { thresholds, domains });
    }
    return map;
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
  const [remyndToolIds, toolNameMap, toolConfigMap] = await Promise.all([
    getRemyndToolIds(),
    getToolNameMap(),
    getToolConfigMap(),
  ]);

  // 1. Drive from completed assignments — only include ReMynd tools that are fully scored
  const allAssignments = await db
    .select()
    .from(assignmentsTable)
    .where(and(eq(assignmentsTable.caseId, caseId), eq(assignmentsTable.status, "completed")));
  const remyndAssignments = allAssignments.filter(a => remyndToolIds.has(a.toolId));

  if (remyndAssignments.length === 0) return { tools: [], index: {} };

  // 2. Fetch all score rows for this case, then deduplicate per (toolId, respondentType)
  //    by keeping the last row encountered (query returns rows in insertion order,
  //    so later = more recent rescoring).
  const allScoreRows = await db.select().from(scoresTable).where(eq(scoresTable.caseId, caseId));
  const scoreMap = new Map<string, typeof allScoreRows[0]>();
  for (const score of allScoreRows) {
    const key = `${score.toolId}::${score.respondentType ?? ""}`;
    scoreMap.set(key, score);
  }

  // 3. Map each completed ReMynd assignment to its deduplicated score
  const remyndScores = remyndAssignments
    .map(a => scoreMap.get(`${a.toolId}::${a.respondentType ?? ""}`))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  if (remyndScores.length === 0) return { tools: [], index: {} };

  // Group by toolId
  const byTool = new Map<string, typeof remyndScores>();
  for (const score of remyndScores) {
    if (!byTool.has(score.toolId)) byTool.set(score.toolId, []);
    byTool.get(score.toolId)!.push(score);
  }

  const tools: Array<{
    toolId: string;
    toolName: string;
    thresholds: ToolThresholds;
    domains: string[];
    respondents: Array<{
      respondentType: string;
      respondentLabel: string;
      domainScores: Record<string, number>;
      normalizedScores: Record<string, number>;
      rawScore: number;
    }>;
    discrepancies: Array<{
      domain: string;
      rawSpread: number;
      isHigh: boolean;
      normalizedSpread: number;
    }>;
  }> = [];

  for (const [toolId, scores] of byTool) {
    const config = toolConfigMap.get(toolId);
    const thresholds = config?.thresholds ?? DEFAULT_THRESHOLDS;

    // Canonical domain list: from scoringConfig.domains keys (fallback to score payload keys)
    const configDomains = config?.domains ? Object.keys(config.domains) : [];
    const scoreKeySet = new Set<string>();
    for (const score of scores) {
      for (const d of Object.keys((score.domainScores ?? {}) as Record<string, number>)) {
        scoreKeySet.add(d);
      }
    }
    const domains = configDomains.length > 0 ? configDomains : [...scoreKeySet];

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

    tools.push({ toolId, toolName: toolNameMap.get(toolId) ?? toolId, thresholds, domains, respondents, discrepancies });
  }

  // Build cross-tool domain Index: average normalized scores per domain.
  // Track the most conservative (lowest) moderate threshold across contributing
  // tool-respondent pairs so risk band classification is not under-reported.
  const domainAcc = new Map<string, {
    total: number;
    count: number;
    sources: string[];
    minMild: number;
    minModerate: number;
  }>();

  for (const tool of tools) {
    for (const respondent of tool.respondents) {
      for (const [domain, score] of Object.entries(respondent.normalizedScores)) {
        if (!domainAcc.has(domain)) {
          domainAcc.set(domain, {
            total: 0, count: 0, sources: [],
            minMild: tool.thresholds.mild,
            minModerate: tool.thresholds.moderate,
          });
        }
        const entry = domainAcc.get(domain)!;
        entry.total += score;
        entry.count++;
        entry.sources.push(`${tool.toolName} (${respondent.respondentLabel})`);
        entry.minMild = Math.min(entry.minMild, tool.thresholds.mild);
        entry.minModerate = Math.min(entry.minModerate, tool.thresholds.moderate);
      }
    }
  }

  const index: Record<string, { average: number; sources: string[]; riskBand: string }> = {};
  for (const [domain, { total, count, sources, minMild, minModerate }] of domainAcc) {
    const average = Math.round(total / count);
    // Use the most conservative thresholds from contributing tools so risk is not under-reported
    const indexThresholds: ToolThresholds = { low: DEFAULT_THRESHOLDS.low, mild: minMild, moderate: minModerate };
    index[domain] = { average, sources, riskBand: getRiskBandForThresholds(average, indexThresholds) };
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
  // Block data-collection-only role; all other authenticated users with case access may generate
  if (req.userRole === "assessment_invigilator") {
    res.status(403).json({ error: "forbidden", message: "Invigilators cannot generate clinical narratives" });
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
  const { tools, index } = await buildIndexData(caseId);

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

  // Use the correctly-computed index (with per-tool thresholds) for holistic AI interpretation
  const indexForAI = index;

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
