import { Router } from "express";
import { db } from "@workspace/db";
import { casesTable, assignmentsTable, assessmentToolsTable } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { generateProductReport } from "../lib/ai.js";

const router = Router();

// ── Access control (mirrors canAccessCase in cases.ts) ────────────────────────
function canAccessCase(role: string, c: typeof casesTable.$inferSelect, userSchool?: string): boolean {
  if (role === "school_clinical_coordinator") {
    return !!userSchool && c.school === userSchool;
  }
  return true;
}

// ── Static product definitions (canonical — must stay in sync with raos/src/lib/products.ts) ──

export type AssessmentProductDef = {
  id: string;
  name: string;
  market: "schools" | "parents" | "corporate" | "universities" | "specialized";
  toolIds: string[];
};

export const PRODUCTS_LIST: AssessmentProductDef[] = [
  // Schools
  {
    id: "comprehensive-psych-profile",
    name: "Comprehensive Psychoeducational Profile & Support Plan",
    market: "schools",
    toolIds: ["REFERRAL","INTAKE","CONSENT","RCS-80","BEHAVOBS","BASC3-PRS-A","BASC3-PRS-C","BRIEF2-P","SDQ-P","SDQ-P11","RCADS","SCDQPF","BASC3-TRS-A","BASC3-TRS-C","BRIEF2-T","SDQ-T","SDQ-T11","BSPP","BASC3-SRP-A","BASC3-SRP-C","BRIEF2-SR","BYI2","RSCA","REFI","RFII","RSCP","RARPS","FASM"],
  },
  {
    id: "school-snapshot",
    name: "School Wellbeing & Learning Snapshot",
    market: "schools",
    toolIds: ["RCS-80","RASR","RERMS","RSSC","RSCP","SDQ-P","SDQ-T","SDQ-SR","PSC"],
  },
  {
    id: "focused-support",
    name: "Focused Student Support Assessment",
    market: "schools",
    toolIds: ["RCS-80","RCEP-CORE","REFI","RFII","RARPS","RSCP","BASC3-TRS-A","BASC3-PRS-A","BASC3-TRS-C","BASC3-PRS-C","BRIEF2-P","BRIEF2-T","BRIEF2-SR"],
  },
  {
    id: "sen-learning-support",
    name: "Learning Support Decision System (SEN)",
    market: "schools",
    toolIds: ["RCS-80","RCEP-CORE","REFI","RFII","RARPS","RASR","SCAS","RCADS","BYI2","RSCA","EFA"],
  },
  {
    id: "boarding-wellbeing",
    name: "Boarding Student Adjustment & Wellbeing",
    market: "schools",
    toolIds: ["REFERRAL-BOARDING","BSPP","RERMS","RSCP","RFII","WHO-5","PSS-10","SDQ-SR","GAD-7"],
  },
  // Parents
  {
    id: "why-struggling",
    name: "Why Is My Child Struggling?",
    market: "parents",
    toolIds: ["REFERRAL-PARENT","INTAKE","RCS-80","RASR","RSCP","RARPS","RFII","RCADS","BYI2"],
  },
  {
    id: "ef-coaching",
    name: "Executive Function Coaching Assessment",
    market: "parents",
    toolIds: ["REFERRAL-PARENT","REFI","RASR","BRIEF2-SR"],
  },
  {
    id: "emotional-wellbeing",
    name: "Emotional Wellbeing Check",
    market: "parents",
    toolIds: ["REFERRAL-PARENT","RERMS","DASS-21","GAD-7","PHQ-9"],
  },
  {
    id: "school-readiness",
    name: "School Readiness / Transition Assessment",
    market: "parents",
    toolIds: ["REFERRAL-PARENT","RSSC","RERMS","REFI","SDQ-SR","WHO-5"],
  },
  // Corporate
  {
    id: "employee-wellbeing",
    name: "Employee Wellbeing & Burnout Screen",
    market: "corporate",
    toolIds: ["REFERRAL-CORP","PSS-10","DASS-21","RSES","GHQ-12"],
  },
  {
    id: "leadership-profiling",
    name: "Leadership / High-Performer Profiling",
    market: "corporate",
    toolIds: ["REFERRAL-CORP","REFI","RERMS","RSES"],
  },
  {
    id: "graduate-readiness",
    name: "Graduate / Intern Readiness Assessment",
    market: "corporate",
    toolIds: ["REFERRAL-CORP","REFI","RSCA","RSES","GHQ-12"],
  },
  // Universities
  {
    id: "intl-student",
    name: "International Student Adjustment Assessment",
    market: "universities",
    toolIds: ["REFERRAL-UNI","RERMS","PSS-10","DASS-21","RSCA","WHO-5","RSES"],
  },
  {
    id: "academic-risk",
    name: "Academic Risk Early Warning System",
    market: "universities",
    toolIds: ["REFERRAL-UNI","RCS-80","RCEP-CORE","REFI","RFII","RARPS","RERMS","RASR"],
  },
  // Specialized
  {
    id: "cdp",
    name: "ReMynd Child Development Profile (CDP)",
    market: "specialized",
    toolIds: ["CDP-CL","CDP-SI","CDP-SR","CDP-CI"],
  },
  {
    id: "hidden-struggler",
    name: "Hidden Struggler Assessment",
    market: "specialized",
    toolIds: ["REFI","RFII","RSCA","RERMS","RCADS","BYI2"],
  },
  {
    id: "underachievement",
    name: "Underachievement Profile",
    market: "specialized",
    toolIds: ["RCS-80","RCEP-CORE","RASR","RARPS","REFI","RFII"],
  },
  {
    id: "digital-distraction",
    name: "Digital Distraction & Focus Assessment",
    market: "specialized",
    toolIds: ["RASR","REFI","BYI2"],
  },
];

const PRODUCTS_BY_ID = new Map(PRODUCTS_LIST.map(p => [p.id, p]));

const MARKET_LABELS: Record<string, string> = {
  schools: "Schools",
  parents: "Parents",
  corporate: "Corporate",
  universities: "Universities",
  specialized: "Specialized",
};

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

  const [caseRows, assignments] = await Promise.all([
    db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1),
    db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId)),
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
      return {
        toolId,
        toolName: tool?.name ?? toolId,
        category: tool?.category ?? null,
        respondentTypes: (tool?.respondentTypes as string[]) ?? [],
        isRemyndOwned: tool?.isRemyndOwned ?? false,
        scoringType: tool?.scoringType ?? "manual",
        isAssigned: assignedToolIds.has(toolId),
        assignments: toolAssignments,
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

  const [caseRows, assignments] = await Promise.all([
    db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1),
    db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId)),
  ]);

  if (!caseRows[0]) { res.status(404).json({ error: "not_found" }); return; }
  const c = caseRows[0];

  if (!canAccessCase(req.userRole!, c, req.userSchool)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

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
    return {
      productId: pid,
      productName: product.name,
      market: product.market,
      effectiveToolCount: effectiveTools.length,
      assignedToolCount: assignedTools.length,
      completedToolCount: completedTools.length,
      completedToolIds: completedTools,
    };
  }).filter(Boolean) as NonNullable<ReturnType<typeof PRODUCTS_BY_ID.get>> extends never ? never : any[];

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
    products: productSummaries as any[],
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
