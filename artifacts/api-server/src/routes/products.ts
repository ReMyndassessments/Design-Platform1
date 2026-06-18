import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, assignmentsTable, assessmentToolsTable, scoresTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { generateProductReport } from "../lib/ai.js";
import { AssessmentProduct as AssessmentProductDef, ASSESSMENT_PRODUCTS as PRODUCTS_LIST, MARKET_LABELS } from "@workspace/api-zod";

export type { AssessmentProductDef };

const router = Router();

// ── Access control (mirrors canAccessCase in cases.ts) ────────────────────────
function canAccessCase(role: string, c: typeof casesTable.$inferSelect, userSchool?: string): boolean {
  if (role === "school_clinical_coordinator") {
    return !!userSchool && c.school === userSchool;
  }
  return true;
}

const PRODUCTS_BY_ID = new Map(PRODUCTS_LIST.map(p => [p.id, p]));

// ── GET /api/products ─────────────────────────────────────────────────────────
router.get("/products", authMiddleware, (_req, res) => {
  const grouped = Object.entries(MARKET_LABELS).map(([market, label]) => ({
    market,
    label,
    products: PRODUCTS_LIST.filter(p => p.market === market).map(p => ({
      id: p.id,
      name: p.name,
      market: p.market,
      toolCount: p.toolIds.length,
    })),
  }));
  res.json(grouped);
});

// ── GET /api/cases/:caseId/product-dashboard ──────────────────────────────────
router.get("/cases/:caseId/product-dashboard", authMiddleware, async (req, res) => {
  const { caseId } = req.params;

  const [caseRows, assignments, scores] = await Promise.all([
    db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1),
    db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId)),
    db.select().from(scoresTable).where(eq(scoresTable.caseId, caseId)),
  ]);

  if (!caseRows[0]) { res.status(404).json({ error: "not_found" }); return; }
  const c = caseRows[0];

  if (!canAccessCase(req.userRole!, c, req.userSchool)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const caseProductIds = (c.productIds as string[]) ?? [];
  if (caseProductIds.length === 0) {
    res.json({ products: [], caseProductIds: [] });
    return;
  }

  // Gather all unique tool IDs across assigned products (including overrides)
  const overrides = (c.intakeAnalysis as any)?.productToolOverrides ?? {};
  const allToolIds = new Set<string>();
  for (const pid of caseProductIds) {
    const product = PRODUCTS_BY_ID.get(pid);
    if (!product) continue;
    const added: string[] = overrides[pid]?.addedToolIds ?? [];
    const removed = new Set<string>(overrides[pid]?.removedToolIds ?? []);
    for (const t of product.toolIds) { if (!removed.has(t)) allToolIds.add(t); }
    for (const t of added) allToolIds.add(t);
  }

  const allToolIdArr = [...allToolIds];
  const toolRows = allToolIdArr.length > 0
    ? await db.select().from(assessmentToolsTable).where(inArray(assessmentToolsTable.id, allToolIdArr))
    : [];
  const toolsById = new Map(toolRows.map(t => [t.id, t]));
  const assignedToolIds = new Set(assignments.map(a => a.toolId));
  // Score lookup by toolId (may have multiple respondents)
  const scoresByTool = new Map<string, typeof scores>();
  for (const s of scores) {
    if (!scoresByTool.has(s.toolId)) scoresByTool.set(s.toolId, []);
    scoresByTool.get(s.toolId)!.push(s);
  }

  const products = caseProductIds.map(pid => {
    const product = PRODUCTS_BY_ID.get(pid);
    if (!product) return null;
    const addedToolIds: string[] = overrides[pid]?.addedToolIds ?? [];
    const removedToolIds: string[] = overrides[pid]?.removedToolIds ?? [];
    const removed = new Set<string>(removedToolIds);
    const effectiveToolIds = [
      ...product.toolIds.filter(t => !removed.has(t)),
      ...addedToolIds.filter(t => !product.toolIds.includes(t)),
    ];

    const effectiveTools = effectiveToolIds.map(toolId => {
      const tool = toolsById.get(toolId);
      const toolAssignments = assignments.filter(a => a.toolId === toolId).map(a => ({
        id: a.id,
        status: a.status,
        respondentType: a.respondentType,
        respondentLabel: a.respondentLabel,
      }));
      const toolScores = (scoresByTool.get(toolId) ?? []).map(s => ({
        respondentType: s.respondentType,
        rawScore: s.rawScore,
        domainScores: s.domainScores as Record<string, number>,
        normalizedScores: s.normalizedScores as Record<string, number>,
        notes: s.notes,
      }));
      return {
        toolId,
        toolName: tool?.name ?? toolId,
        category: tool?.category ?? null,
        respondentTypes: (tool?.respondentTypes as string[]) ?? [],
        isRemyndOwned: tool?.isRemyndOwned ?? false,
        scoringType: tool?.scoringType ?? "manual",
        isAssigned: assignedToolIds.has(toolId),
        assignments: toolAssignments,
        scores: toolScores,
      };
    });

    return {
      productId: pid,
      productName: product.name,
      market: product.market,
      marketLabel: MARKET_LABELS[product.market] ?? product.market,
      defaultToolIds: product.toolIds,
      addedToolIds,
      removedToolIds,
      effectiveTools,
    };
  }).filter(Boolean);

  res.json({ products, caseProductIds });
});

// ── PATCH /api/cases/:caseId/product-ids ─────────────────────────────────────
router.patch("/cases/:caseId/product-ids", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const { productIds } = req.body as { productIds: string[] };
  if (!Array.isArray(productIds)) {
    res.status(400).json({ error: "productIds must be an array" }); return;
  }

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRows[0]) { res.status(404).json({ error: "not_found" }); return; }

  if (!canAccessCase(req.userRole!, caseRows[0], req.userSchool)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const updated = await db
    .update(casesTable)
    .set({ productIds, updatedAt: new Date() })
    .where(eq(casesTable.id, caseId))
    .returning();

  res.json({ productIds: (updated[0].productIds as string[]) ?? [] });
});

// ── PATCH /api/cases/:caseId/product-tool-overrides ───────────────────────────
router.patch("/cases/:caseId/product-tool-overrides", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const { productId, addedToolIds, removedToolIds } = req.body as {
    productId: string;
    addedToolIds: string[];
    removedToolIds: string[];
  };
  if (!productId) { res.status(400).json({ error: "productId required" }); return; }

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRows[0]) { res.status(404).json({ error: "not_found" }); return; }

  if (!canAccessCase(req.userRole!, caseRows[0], req.userSchool)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const existing = (caseRows[0].intakeAnalysis as any) ?? {};
  const existingOverrides = existing.productToolOverrides ?? {};
  const updated = await db
    .update(casesTable)
    .set({
      intakeAnalysis: {
        ...existing,
        productToolOverrides: {
          ...existingOverrides,
          [productId]: {
            addedToolIds: addedToolIds ?? [],
            removedToolIds: removedToolIds ?? [],
          },
        },
      },
      updatedAt: new Date(),
    })
    .where(eq(casesTable.id, caseId))
    .returning();

  const result = (updated[0].intakeAnalysis as any)?.productToolOverrides ?? {};
  res.json({ productToolOverrides: result });
});

// ── POST /api/cases/:caseId/product-report ────────────────────────────────────
router.post("/cases/:caseId/product-report", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const { productId } = req.body as { productId?: string };

  const [caseRows, assignments, allScores] = await Promise.all([
    db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1),
    db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId)),
    db.select().from(scoresTable).where(eq(scoresTable.caseId, caseId)),
  ]);

  if (!caseRows[0]) { res.status(404).json({ error: "not_found" }); return; }
  const c = caseRows[0];

  if (!canAccessCase(req.userRole!, c, req.userSchool)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  // Fetch tool names for score entries
  const scoreToolIds = [...new Set(allScores.map(s => s.toolId))];
  const scoreToolRows = scoreToolIds.length > 0
    ? await db.select().from(assessmentToolsTable).where(inArray(assessmentToolsTable.id, scoreToolIds))
    : [];
  const scoreToolNameMap = new Map(scoreToolRows.map(t => [t.id, t.name]));

  const caseProductIds = (c.productIds as string[]) ?? [];
  const targetIds = productId ? [productId] : caseProductIds;
  const overrides = (c.intakeAnalysis as any)?.productToolOverrides ?? {};

  const productSummaries = targetIds.map(pid => {
    const product = PRODUCTS_BY_ID.get(pid);
    if (!product) return null;
    const added: string[] = overrides[pid]?.addedToolIds ?? [];
    const removed = new Set<string>(overrides[pid]?.removedToolIds ?? []);
    const effectiveTools = [
      ...product.toolIds.filter(t => !removed.has(t)),
      ...added.filter(t => !product.toolIds.includes(t)),
    ];
    const assignedTools = effectiveTools.filter(t => assignments.some(a => a.toolId === t));
    const completedTools = assignedTools.filter(t =>
      assignments.filter(a => a.toolId === t).every(a => a.status === "completed")
    );

    // Build toolScores from completed tools' score records
    const toolScores = allScores
      .filter(s => completedTools.includes(s.toolId))
      .map(s => ({
        toolId: s.toolId,
        toolName: scoreToolNameMap.get(s.toolId) ?? s.toolName ?? s.toolId,
        respondentType: s.respondentType,
        rawScore: s.rawScore,
        domainScores: (s.domainScores as Record<string, number>) ?? {},
        normalizedScores: (s.normalizedScores as Record<string, number>) ?? {},
        notes: s.notes,
      }));

    return {
      productId: pid,
      productName: product.name,
      market: product.market,
      effectiveToolCount: effectiveTools.length,
      assignedToolCount: assignedTools.length,
      completedToolCount: completedTools.length,
      completedToolIds: completedTools,
      toolScores,
    };
  }).filter(Boolean) as any[];

  // Gate: require at least one completed tool across targeted products
  const totalCompleted = productSummaries.reduce((sum: number, p: any) => sum + (p?.completedToolCount ?? 0), 0);
  if (totalCompleted === 0) {
    res.status(400).json({ error: "no_completed_tools", message: "At least one tool must be completed before generating a report." });
    return;
  }

  const report = await generateProductReport({
    studentName: c.studentName,
    school: c.school,
    grade: c.grade ?? undefined,
    products: productSummaries,
  });

  // Persist to intakeAnalysis
  const existing = (c.intakeAnalysis as any) ?? {};
  const existingReports = existing.productReports ?? {};
  const key = productId ?? "all";
  await db.update(casesTable).set({
    intakeAnalysis: {
      ...existing,
      productReports: {
        ...existingReports,
        [key]: { report, generatedAt: new Date().toISOString() },
      },
    },
    updatedAt: new Date(),
  }).where(eq(casesTable.id, caseId));

  res.json({ report, generatedAt: new Date().toISOString() });
});

export default router;
