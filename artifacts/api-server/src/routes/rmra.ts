import { Router } from "express";
import { db } from "@workspace/db";
import { rmraSessionsTable, rmraTaskResponsesTable, assignmentsTable, scoresTable, casesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { logger } from "../lib/logger.js";
import { nanoid } from "nanoid";
import { RMRA_DOMAINS, RMRA_ITEMS, getItemsForSession } from "../lib/rmra-items.js";

const router = Router();

// ── Helper: load session and verify it belongs to caseId ─────────────────────
async function loadSession(sessionId: string, caseId: string) {
  const [session] = await db
    .select()
    .from(rmraSessionsTable)
    .where(and(eq(rmraSessionsTable.id, sessionId), eq(rmraSessionsTable.caseId, caseId)))
    .limit(1);
  return session ?? null;
}

// ── Visual params helper (student-facing, answer-key free) ────────────────────
function computeVisualParams(item: { visualType: string; exactAnswer?: number | string; expectedAnswerRange?: [number, number] }): Record<string, unknown> {
  const ea = item.exactAnswer;
  const er = item.expectedAnswerRange;
  switch (item.visualType) {
    case "dot_array": {
      const count = typeof ea === "number" ? Math.min(ea, 30) : 12;
      return { dotCount: count };
    }
    case "number_line": {
      const exact = typeof ea === "number" ? ea : parseFloat(String(ea ?? "NaN"));
      const rawMax = er ? er[1] : (!isNaN(exact) ? Math.ceil(exact * 1.5 / 10) * 10 : 20);
      const rawMin = er ? Math.min(0, er[0]) : 0;
      const range = rawMax - rawMin;
      const step = range <= 20 ? 1 : range <= 100 ? 10 : range <= 1000 ? 100 : 1000;
      return { scaleMin: Math.floor(rawMin / step) * step, scaleMax: Math.ceil(rawMax / step) * step };
    }
    case "base_ten_blocks": {
      let t = 0, h = 0, ten = 0, o = 0;
      if (typeof ea === "string") {
        const ms = ea.match(/(\d+)\s*thousand/i); const mh = ea.match(/(\d+)\s*hundred/i);
        const mt = ea.match(/(\d+)\s*ten/i); const mo = ea.match(/(\d+)\s*one/i);
        if (ms) t = parseInt(ms[1]); if (mh) h = parseInt(mh[1]);
        if (mt) ten = parseInt(mt[1]); if (mo) o = parseInt(mo[1]);
        if (!ms && !mh && !mt && !mo) { const n = parseInt(ea.replace(/,/g, "")); if (!isNaN(n)) { t = Math.floor(n / 1000); h = Math.floor((n % 1000) / 100); ten = Math.floor((n % 100) / 10); o = n % 10; } }
      } else if (typeof ea === "number") { t = Math.floor(ea / 1000); h = Math.floor((ea % 1000) / 100); ten = Math.floor((ea % 100) / 10); o = ea % 10; } else { ten = 2; o = 3; }
      return { thousands: Math.min(t, 5), hundreds: Math.min(h, 5), tens: Math.min(ten, 5), ones: Math.min(o, 5) };
    }
    case "fraction_bar":
    case "fraction_circle": {
      let num = 3, den = 4;
      if (typeof ea === "string") { const m = ea.match(/(\d+)\s*\/\s*(\d+)/); if (m) { num = parseInt(m[1]); den = parseInt(m[2]); } }
      else if (typeof ea === "number") { num = Math.round(ea * 4); den = 4; }
      return { numerator: Math.max(1, num), denominator: Math.max(2, den) };
    }
    case "clock": {
      const eaStr = String(ea ?? "");
      const m = eaStr.match(/(\d+)[.:](\d+)/);
      const hour = m ? (parseInt(m[1]) % 12 || 12) : 3;
      const minute = m ? parseInt(m[2]) : 0;
      return { hour, minute };
    }
    case "place_value_chart": {
      let t = 0, h = 0, ten = 0, o = 0;
      if (typeof ea === "number") { t = Math.floor(ea / 1000) % 10; h = Math.floor(ea / 100) % 10; ten = Math.floor(ea / 10) % 10; o = ea % 10; }
      else if (typeof ea === "string") { const n = parseFloat(ea.replace(/,/g, "")); if (!isNaN(n)) { t = Math.floor(n / 1000) % 10; h = Math.floor(n / 100) % 10; ten = Math.floor(n / 10) % 10; o = Math.floor(n) % 10; } }
      return { thousands: t, hundreds: h, tens: ten, ones: o };
    }
    case "number_bond": {
      const total = typeof ea === "number" ? ea : parseInt(String(ea ?? "10"));
      return { total: isNaN(total) ? 10 : total };
    }
    case "bar_model": {
      const total = typeof ea === "number" ? ea : parseInt(String(ea ?? "100").replace(/,/g, ""));
      return { total: isNaN(total) ? 100 : total };
    }
    case "area_model": {
      const n = typeof ea === "number" ? ea : parseInt(String(ea ?? "12"));
      const safe = isNaN(n) ? 12 : Math.min(n, 100);
      const cols = Math.min(10, Math.ceil(Math.sqrt(safe)));
      const rows = Math.ceil(safe / cols);
      return { cols, rows };
    }
    case "tally_marks": {
      const count = typeof ea === "number" ? Math.min(ea, 25) : 13;
      return { count };
    }
    default:
      return {};
  }
}

// ── Create or retrieve session for an assignment ──────────────────────────────
router.post("/cases/:caseId/rmra/sessions", authMiddleware, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { assignmentId, ageBand, version, theme } = req.body as {
      assignmentId: string;
      ageBand: string;
      version: "full" | "brief";
      theme: string;
    };

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.toolId !== "RMRA") return res.status(400).json({ error: "Assignment is not an RMRA session" });

    const existing = await db
      .select()
      .from(rmraSessionsTable)
      .where(and(eq(rmraSessionsTable.assignmentId, assignmentId), eq(rmraSessionsTable.caseId, caseId)))
      .limit(1);

    if (existing[0]) {
      const responses = await db
        .select()
        .from(rmraTaskResponsesTable)
        .where(eq(rmraTaskResponsesTable.sessionId, existing[0].id));
      return res.json({ session: existing[0], responses, assignmentToken: assignment.uniqueToken });
    }

    const sessionId = nanoid();
    const [session] = await db
      .insert(rmraSessionsTable)
      .values({
        id: sessionId,
        caseId,
        assignmentId,
        examinerId: req.userId ?? null,
        ageBand: ageBand ?? "upper_primary",
        version: version ?? "full",
        theme: theme ?? "space_mission",
        status: "not_started",
      })
      .returning();

    return res.status(201).json({ session, responses: [], assignmentToken: assignment.uniqueToken });
  } catch (err) {
    logger.error({ err }, "POST /rmra/sessions failed");
    return res.status(500).json({ error: "Failed to create RMRA session" });
  }
});

// ── Get session with all responses ───────────────────────────────────────────
router.get("/cases/:caseId/rmra/sessions/:sessionId", authMiddleware, async (req, res) => {
  try {
    const { caseId, sessionId } = req.params;

    const session = await loadSession(sessionId, caseId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const responses = await db
      .select()
      .from(rmraTaskResponsesTable)
      .where(eq(rmraTaskResponsesTable.sessionId, sessionId));

    const [caseRow] = await db
      .select({ studentName: casesTable.studentName, dob: casesTable.dob, grade: casesTable.grade })
      .from(casesTable)
      .where(eq(casesTable.id, caseId))
      .limit(1);

    return res.json({ session, responses, case: caseRow ?? null });
  } catch (err) {
    logger.error({ err }, "GET /rmra/sessions/:id failed");
    return res.status(500).json({ error: "Failed to load RMRA session" });
  }
});

// ── Update session (notes, status, current task, theme/ageBand) ───────────────
router.patch("/cases/:caseId/rmra/sessions/:sessionId", authMiddleware, async (req, res) => {
  try {
    const { caseId, sessionId } = req.params;
    const { generalNotes, status, currentTaskId, ageBand, version, theme } = req.body;

    const existing = await loadSession(sessionId, caseId);
    if (!existing) return res.status(404).json({ error: "Session not found" });

    const updates: Partial<typeof rmraSessionsTable.$inferInsert> = { updatedAt: new Date() };
    if (generalNotes !== undefined) updates.generalNotes = generalNotes;
    if (status !== undefined) updates.status = status;
    if (currentTaskId !== undefined) updates.currentTaskId = currentTaskId;
    if (ageBand !== undefined) updates.ageBand = ageBand;
    if (version !== undefined) updates.version = version;
    if (theme !== undefined) updates.theme = theme;

    if (status === "in_progress" && !existing.startedAt) {
      updates.startedAt = new Date();
    }

    const [session] = await db
      .update(rmraSessionsTable)
      .set(updates)
      .where(and(eq(rmraSessionsTable.id, sessionId), eq(rmraSessionsTable.caseId, caseId)))
      .returning();

    return res.json({ session });
  } catch (err) {
    logger.error({ err }, "PATCH /rmra/sessions/:id failed");
    return res.status(500).json({ error: "Failed to update RMRA session" });
  }
});

// ── Upsert task response ──────────────────────────────────────────────────────
router.post("/cases/:caseId/rmra/sessions/:sessionId/tasks/:taskId/response", authMiddleware, async (req, res) => {
  try {
    const { caseId, sessionId, taskId } = req.params;

    const session = await loadSession(sessionId, caseId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const body = req.body as {
      domain: string;
      ageBand: string;
      accuracy?: number;
      reasoning?: number;
      strategyLevel?: number;
      strategyLabel?: string;
      hintLevel?: number;
      attempts?: number;
      selfCorrection?: boolean;
      confidenceRating?: number;
      responseTimeSeconds?: number;
      firstResponse?: string;
      finalResponse?: string;
      productiveStrugglePersistence?: number;
      productiveStruggleFlexibility?: number;
      productiveStruggleEmotionalRegulation?: number;
      productiveStruggleErrorRecovery?: number;
      productiveStruggleHelpUtilization?: number;
      discontinued?: boolean;
      discontinuationReason?: string;
      examinerNotes?: string;
    };

    const existing = await db
      .select({ id: rmraTaskResponsesTable.id })
      .from(rmraTaskResponsesTable)
      .where(and(
        eq(rmraTaskResponsesTable.sessionId, sessionId),
        eq(rmraTaskResponsesTable.taskId, taskId),
      ))
      .limit(1);

    const values = {
      sessionId,
      domain: body.domain,
      taskId,
      ageBand: body.ageBand,
      accuracy: body.accuracy ?? null,
      reasoning: body.reasoning ?? null,
      strategyLevel: body.strategyLevel ?? null,
      strategyLabel: body.strategyLabel ?? null,
      hintLevel: body.hintLevel ?? 0,
      attempts: body.attempts ?? 1,
      selfCorrection: body.selfCorrection ?? false,
      confidenceRating: body.confidenceRating ?? null,
      responseTimeSeconds: body.responseTimeSeconds ?? null,
      firstResponse: body.firstResponse ?? null,
      finalResponse: body.finalResponse ?? null,
      productiveStrugglePersistence: body.productiveStrugglePersistence ?? null,
      productiveStruggleFlexibility: body.productiveStruggleFlexibility ?? null,
      productiveStruggleEmotionalRegulation: body.productiveStruggleEmotionalRegulation ?? null,
      productiveStruggleErrorRecovery: body.productiveStruggleErrorRecovery ?? null,
      productiveStruggleHelpUtilization: body.productiveStruggleHelpUtilization ?? null,
      discontinued: body.discontinued ?? false,
      discontinuationReason: body.discontinuationReason ?? null,
      examinerNotes: body.examinerNotes ?? null,
      updatedAt: new Date(),
    };

    let response;
    if (existing[0]) {
      [response] = await db
        .update(rmraTaskResponsesTable)
        .set(values)
        .where(eq(rmraTaskResponsesTable.id, existing[0].id))
        .returning();
    } else {
      [response] = await db
        .insert(rmraTaskResponsesTable)
        .values({ id: nanoid(), ...values })
        .returning();
    }

    if (session.status === "not_started") {
      await db.update(rmraSessionsTable)
        .set({ status: "in_progress", startedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(rmraSessionsTable.id, sessionId), eq(rmraSessionsTable.caseId, caseId)));
    }

    return res.json({ response });
  } catch (err) {
    logger.error({ err }, "POST /rmra/sessions/:id/tasks/:taskId/response failed");
    return res.status(500).json({ error: "Failed to save task response" });
  }
});

// ── Complete session — calculate domain scores ────────────────────────────────
router.post("/cases/:caseId/rmra/sessions/:sessionId/complete", authMiddleware, async (req, res) => {
  try {
    const { caseId, sessionId } = req.params;

    const session = await loadSession(sessionId, caseId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const responses = await db
      .select()
      .from(rmraTaskResponsesTable)
      .where(eq(rmraTaskResponsesTable.sessionId, sessionId));

    const domainScores: Record<string, {
      accuracy: number;
      reasoning: number;
      strategyLevel: number;
      hintDependency: number;
      productiveStruggle: number;
      confidence: number;
      tasksAdministered: number;
      tasksDiscontinued: number;
      level: "strength" | "developing" | "vulnerable" | "high_concern";
    }> = {};

    const avg = (vals: (number | null)[]) => {
      const filtered = vals.filter((v): v is number => v !== null);
      return filtered.length > 0 ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
    };

    for (const domain of RMRA_DOMAINS) {
      const domainResponses = responses.filter(r => r.domain === domain && !r.discontinued);
      const discontinued = responses.filter(r => r.domain === domain && r.discontinued).length;

      if (domainResponses.length === 0) continue;

      const accuracy = avg(domainResponses.map(r => r.accuracy)) / 2 * 100;
      const reasoning = avg(domainResponses.map(r => r.reasoning)) / 4 * 100;
      const strategyLevel = avg(domainResponses.map(r => r.strategyLevel)) / 14 * 100;
      const hintDependency = avg(domainResponses.map(r => r.hintLevel)) / 4 * 100;

      const psScores = domainResponses
        .filter(r => r.productiveStrugglePersistence !== null)
        .map(r => avg([
          r.productiveStrugglePersistence,
          r.productiveStruggleFlexibility,
          r.productiveStruggleEmotionalRegulation,
          r.productiveStruggleErrorRecovery,
          r.productiveStruggleHelpUtilization,
        ]));
      const productiveStruggle = psScores.length > 0 ? avg(psScores) / 4 * 100 : 0;

      const confidence = avg(domainResponses.map(r => r.confidenceRating)) / 4 * 100;

      const composite = (accuracy * 0.35) + (reasoning * 0.3) + (strategyLevel * 0.2) + (confidence * 0.15);
      const level: "strength" | "developing" | "vulnerable" | "high_concern" =
        composite >= 75 ? "strength" :
        composite >= 50 ? "developing" :
        composite >= 25 ? "vulnerable" : "high_concern";

      domainScores[domain] = {
        accuracy: Math.round(accuracy),
        reasoning: Math.round(reasoning),
        strategyLevel: Math.round(strategyLevel),
        hintDependency: Math.round(hintDependency),
        productiveStruggle: Math.round(productiveStruggle),
        confidence: Math.round(confidence),
        tasksAdministered: domainResponses.length,
        tasksDiscontinued: discontinued,
        level,
      };
    }

    const [updatedSession] = await db
      .update(rmraSessionsTable)
      .set({
        status: "completed",
        completedAt: new Date(),
        domainScores,
        updatedAt: new Date(),
      })
      .where(and(eq(rmraSessionsTable.id, sessionId), eq(rmraSessionsTable.caseId, caseId)))
      .returning();

    if (session.assignmentId) {
      await db.update(assignmentsTable)
        .set({ status: "completed", submittedAt: new Date() })
        .where(eq(assignmentsTable.id, session.assignmentId));
    }

    const overallScore = Object.values(domainScores).length > 0
      ? Math.round(Object.values(domainScores).reduce((sum, d) => sum + d.accuracy, 0) / Object.values(domainScores).length)
      : 0;

    const existing = await db.select({ id: scoresTable.id })
      .from(scoresTable)
      .where(and(
        eq(scoresTable.caseId, caseId),
        eq(scoresTable.toolId, "RMRA"),
        eq(scoresTable.respondentType, "invigilator"),
      ))
      .limit(1);

    const scoreValues = {
      caseId,
      toolId: "RMRA",
      toolName: "RMRA — ReMynd Mathematical Reasoning Assessment",
      respondentType: "invigilator",
      rawScore: overallScore,
      domainScores: Object.fromEntries(Object.entries(domainScores).map(([k, v]) => [k, v.accuracy])) as Record<string, number>,
      normalizedScores: Object.fromEntries(Object.entries(domainScores).map(([k, v]) => [k, v.reasoning])) as Record<string, number>,
      isManual: true,
      notes: JSON.stringify({ sessionId, domainScores }),
    };

    if (existing[0]) {
      await db.update(scoresTable).set(scoreValues).where(eq(scoresTable.id, existing[0].id));
    } else {
      await db.insert(scoresTable).values({ id: nanoid(), ...scoreValues });
    }

    return res.json({ session: updatedSession, domainScores });
  } catch (err) {
    logger.error({ err }, "POST /rmra/sessions/:id/complete failed");
    return res.status(500).json({ error: "Failed to complete RMRA session" });
  }
});

// ── Get item bank for a session config ────────────────────────────────────────
router.get("/rmra/items", authMiddleware, async (req, res) => {
  try {
    const { ageBand, version } = req.query as { ageBand: string; version: string };
    const items = getItemsForSession(
      (ageBand as any) ?? "upper_primary",
      (version as any) ?? "full",
    );
    return res.json({ items });
  } catch (err) {
    logger.error({ err }, "GET /rmra/items failed");
    return res.status(500).json({ error: "Failed to load item bank" });
  }
});

// ── Public: student polling endpoint ─────────────────────────────────────────
router.get("/public/rmra/student/:sessionToken", async (req, res) => {
  try {
    const { sessionToken } = req.params;

    const [assignment] = await db
      .select({ id: assignmentsTable.id, caseId: assignmentsTable.caseId })
      .from(assignmentsTable)
      .where(eq(assignmentsTable.uniqueToken, sessionToken))
      .limit(1);

    if (!assignment) return res.status(404).json({ error: "Session not found" });

    const [session] = await db
      .select()
      .from(rmraSessionsTable)
      .where(and(
        eq(rmraSessionsTable.assignmentId, assignment.id),
        eq(rmraSessionsTable.caseId, assignment.caseId ?? ""),
      ))
      .limit(1);

    if (!session) return res.status(404).json({ error: "Session not started" });

    const currentItem = session.currentTaskId
      ? RMRA_ITEMS.find(i => i.id === session.currentTaskId)
      : null;

    // Fetch hint level from current task response
    let hintLevel = 0;
    if (session.currentTaskId) {
      const [taskResp] = await db
        .select({ hintLevel: rmraTaskResponsesTable.hintLevel })
        .from(rmraTaskResponsesTable)
        .where(and(
          eq(rmraTaskResponsesTable.sessionId, session.id),
          eq(rmraTaskResponsesTable.taskId, session.currentTaskId),
        ))
        .limit(1);
      hintLevel = taskResp?.hintLevel ?? 0;
    }

    return res.json({
      status: session.status,
      theme: session.theme,
      ageBand: session.ageBand,
      currentTaskId: session.currentTaskId,
      hintLevel,
      currentTask: currentItem ? {
        id: currentItem.id,
        domain: currentItem.domain,
        taskType: currentItem.taskType,
        visualType: currentItem.visualType,
        prompt: currentItem.prompts[session.theme as keyof typeof currentItem.prompts] ?? currentItem.prompts.space_mission,
        showConfidenceSlider: currentItem.showConfidenceSlider,
        productiveStruggleTrigger: currentItem.productiveStruggleTrigger,
        visualParams: computeVisualParams(currentItem),
      } : null,
    });
  } catch (err) {
    logger.error({ err }, "GET /public/rmra/student/:token failed");
    return res.status(500).json({ error: "Failed to load student view" });
  }
});

// ── Public: student submits confidence rating ─────────────────────────────────
router.post("/public/rmra/student/:sessionToken/confidence", async (req, res) => {
  try {
    const { sessionToken } = req.params;
    const { rating, taskId } = req.body as { rating: number; taskId: string };

    const [assignment] = await db
      .select({ id: assignmentsTable.id, caseId: assignmentsTable.caseId })
      .from(assignmentsTable)
      .where(eq(assignmentsTable.uniqueToken, sessionToken))
      .limit(1);

    if (!assignment) return res.status(404).json({ error: "Session not found" });

    const [session] = await db
      .select({ id: rmraSessionsTable.id, ageBand: rmraSessionsTable.ageBand })
      .from(rmraSessionsTable)
      .where(and(
        eq(rmraSessionsTable.assignmentId, assignment.id),
        eq(rmraSessionsTable.caseId, assignment.caseId ?? ""),
      ))
      .limit(1);

    if (!session) return res.status(404).json({ error: "Session not found" });

    const [existing] = await db
      .select({ id: rmraTaskResponsesTable.id })
      .from(rmraTaskResponsesTable)
      .where(and(
        eq(rmraTaskResponsesTable.sessionId, session.id),
        eq(rmraTaskResponsesTable.taskId, taskId),
      ))
      .limit(1);

    if (existing) {
      await db.update(rmraTaskResponsesTable)
        .set({ confidenceRating: rating, updatedAt: new Date() })
        .where(eq(rmraTaskResponsesTable.id, existing.id));
    } else {
      // Upsert: create a stub response row so confidence is never silently dropped.
      // Look up domain from item bank so required NOT NULL constraint is satisfied.
      const itemMeta = RMRA_ITEMS.find(i => i.id === taskId);
      const domain = itemMeta?.domain ?? "Unknown";
      const ageBand = session.ageBand ?? "upper_primary";
      await db.insert(rmraTaskResponsesTable).values({
        id: nanoid(),
        sessionId: session.id,
        taskId,
        domain,
        ageBand,
        confidenceRating: rating,
        hintLevel: 0,
        attempts: 1,
        selfCorrection: false,
        discontinued: false,
      }).onConflictDoNothing();
    }

    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "POST /public/rmra/student/:token/confidence failed");
    return res.status(500).json({ error: "Failed to save confidence" });
  }
});

export default router;
