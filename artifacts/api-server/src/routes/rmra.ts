import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { rmraSessionsTable, rmraTaskResponsesTable, assignmentsTable, scoresTable, casesTable, rmraAccessCodesTable } from "@workspace/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { logger } from "../lib/logger.js";
import { nanoid } from "nanoid";
import { RMRA_DOMAINS, RMRA_ITEMS, getItemsForSession } from "../lib/rmra-items.js";
import nodemailer from "nodemailer";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODEL = "deepseek-chat";

async function verifyExaminerToken(sessionId: string, token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const result = await db.execute(sql`
    SELECT examiner_token FROM rmra_sessions WHERE id = ${sessionId} AND case_id IS NULL LIMIT 1
  `);
  const row = (result as unknown as { rows?: Record<string, unknown>[] }).rows?.[0];
  return !!(row && row["examiner_token"] === token);
}

async function callDeepSeekRmra(prompt: string, maxTokens = 4096): Promise<string> {
  if (!DEEPSEEK_API_KEY) throw new Error("DEEPSEEK_API_KEY is not configured");
  const response = await fetch(`${DEEPSEEK_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });
  if (!response.ok) throw new Error(`DeepSeek error: ${response.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

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

async function handleStudentPoll(req: Request, res: Response) {
  try {
    const { sessionToken } = req.params;

    const [assignment] = await db
      .select({ id: assignmentsTable.id, caseId: assignmentsTable.caseId })
      .from(assignmentsTable)
      .where(eq(assignmentsTable.uniqueToken, sessionToken))
      .limit(1);

    let session: typeof rmraSessionsTable.$inferSelect | undefined;

    if (!assignment) {
      // Try standalone session (no assignment) — token is the session id
      const [standalone] = await db
        .select()
        .from(rmraSessionsTable)
        .where(and(eq(rmraSessionsTable.id, sessionToken), isNull(rmraSessionsTable.caseId)))
        .limit(1);
      session = standalone;
    } else {
      const [assignmentSession] = await db
        .select()
        .from(rmraSessionsTable)
        .where(and(
          eq(rmraSessionsTable.assignmentId, assignment.id),
          eq(rmraSessionsTable.caseId, assignment.caseId ?? ""),
        ))
        .limit(1);
      session = assignmentSession;
    }

    if (!session) return res.status(404).json({ error: "Session not found or not started" });

    const currentItem = session.currentTaskId
      ? RMRA_ITEMS.find(i => i.id === session.currentTaskId)
      : null;

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
    logger.error({ err }, "GET student poll failed");
    return res.status(500).json({ error: "Failed to load student view" });
  }
}

async function handleStudentConfidence(req: Request, res: Response) {
  try {
    const { sessionToken } = req.params;
    const { rating, taskId } = req.body as { rating: unknown; taskId: unknown };

    // Input validation
    if (typeof rating !== "number" || rating < 0 || rating > 3 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: "rating must be an integer 0–3" });
    }
    if (typeof taskId !== "string" || !taskId.trim()) {
      return res.status(400).json({ error: "taskId is required" });
    }

    const [assignment] = await db
      .select({ id: assignmentsTable.id, caseId: assignmentsTable.caseId })
      .from(assignmentsTable)
      .where(eq(assignmentsTable.uniqueToken, sessionToken))
      .limit(1);

    let sessionId: string;
    let sessionAgeBand: string;

    if (!assignment) {
      // Standalone: token IS the session id (caseId IS NULL)
      const [standalone] = await db
        .select({ id: rmraSessionsTable.id, ageBand: rmraSessionsTable.ageBand })
        .from(rmraSessionsTable)
        .where(and(eq(rmraSessionsTable.id, sessionToken), isNull(rmraSessionsTable.caseId)))
        .limit(1);
      if (!standalone) return res.status(404).json({ error: "Session not found" });
      sessionId = standalone.id;
      sessionAgeBand = standalone.ageBand ?? "upper_primary";
    } else {
      const [linked] = await db
        .select({ id: rmraSessionsTable.id, ageBand: rmraSessionsTable.ageBand })
        .from(rmraSessionsTable)
        .where(and(
          eq(rmraSessionsTable.assignmentId, assignment.id),
          eq(rmraSessionsTable.caseId, assignment.caseId ?? ""),
        ))
        .limit(1);
      if (!linked) return res.status(404).json({ error: "Session not found" });
      sessionId = linked.id;
      sessionAgeBand = linked.ageBand ?? "upper_primary";
    }

    const [existing] = await db
      .select({ id: rmraTaskResponsesTable.id })
      .from(rmraTaskResponsesTable)
      .where(and(
        eq(rmraTaskResponsesTable.sessionId, sessionId),
        eq(rmraTaskResponsesTable.taskId, taskId),
      ))
      .limit(1);

    if (existing) {
      await db.update(rmraTaskResponsesTable)
        .set({ confidenceRating: rating, updatedAt: new Date() })
        .where(eq(rmraTaskResponsesTable.id, existing.id));
    } else {
      const itemMeta = RMRA_ITEMS.find(i => i.id === taskId);
      const domain = itemMeta?.domain ?? "Unknown";
      await db.insert(rmraTaskResponsesTable).values({
        id: nanoid(),
        sessionId,
        taskId,
        domain,
        ageBand: sessionAgeBand,
        confidenceRating: rating,
        hintLevel: 0,
        attempts: 1,
        selfCorrection: false,
        discontinued: false,
      }).onConflictDoNothing();
    }

    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "POST student confidence failed");
    return res.status(500).json({ error: "Failed to save confidence" });
  }
}

// Register at both spec path (/rmra/student/...) and original public path
router.get("/rmra/student/:sessionToken", handleStudentPoll);
router.get("/public/rmra/student/:sessionToken", handleStudentPoll);
router.post("/rmra/student/:sessionToken/confidence", handleStudentConfidence);
router.post("/public/rmra/student/:sessionToken/confidence", handleStudentConfidence);

// ── AI Report Generation ───────────────────────────────────────────────────────

router.post("/cases/:caseId/rmra/sessions/:sessionId/generate-report", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { caseId, sessionId } = req.params;
    const session = await loadSession(sessionId, caseId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.status !== "completed") return res.status(400).json({ error: "Session is not completed" });
    if (!session.domainScores) return res.status(400).json({ error: "No domain scores available" });

    const scores = session.domainScores as Record<string, {
      accuracy: number; reasoning: number; strategyLevel: number;
      hintDependency: number; productiveStruggle: number; confidence: number;
      tasksAdministered: number; tasksDiscontinued: number;
      level: "strength" | "developing" | "vulnerable" | "high_concern";
    }>;

    const AGE_BAND_LABELS: Record<string, string> = {
      early_primary: "Early Primary (Ages 5–8, K–Yr 2)",
      upper_primary: "Upper Primary (Ages 8–11, Yr 3–5)",
      middle_school: "Middle School (Ages 11–14, Yr 6–8)",
      secondary: "Secondary (Ages 14–16, Yr 9–10)",
    };

    const LEVEL_LABELS: Record<string, string> = {
      strength: "Strength (≥80%)",
      developing: "Developing (60–79%)",
      vulnerable: "Vulnerable (40–59%)",
      high_concern: "High Concern (<40%)",
    };

    const domainTable = RMRA_DOMAINS
      .filter(d => scores[d])
      .map(d => {
        const s = scores[d];
        return `- ${d}: Accuracy ${s.accuracy}%, Reasoning ${s.reasoning}%, Strategy ${s.strategyLevel}%, Hint Dependency ${s.hintDependency}%, Productive Struggle ${s.productiveStruggle}%, Confidence ${s.confidence}%, Tasks Administered ${s.tasksAdministered} (${s.tasksDiscontinued > 0 ? `${s.tasksDiscontinued} discontinued` : "no discontinuations"}), Level: ${LEVEL_LABELS[s.level] ?? s.level}`;
      }).join("\n");

    const prompt = `You are a specialist psychometrician writing a clinical psychoeducational report for the ReMynd Mathematical Reasoning Assessment (RMRA), a structured examiner-administered assessment of mathematical reasoning.

ASSESSMENT INFORMATION:
- Age Band: ${AGE_BAND_LABELS[session.ageBand] ?? session.ageBand}
- Assessment Version: ${session.version === "full" ? "Full (all domains)" : "Brief"}
- Completion Date: ${session.completedAt ? new Date(session.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "Unknown"}
${session.generalNotes ? `- Examiner Notes: ${session.generalNotes}` : ""}

DOMAIN SCORES (13 domains assessed):
${domainTable}

SCORING LEGEND:
- Accuracy: % of tasks answered correctly
- Reasoning: % quality of mathematical reasoning demonstrated
- Strategy Level: % developmental maturity of problem-solving strategies
- Hint Dependency: % of tasks requiring examiner hints (higher = more dependent)
- Productive Struggle: % positive engagement with challenging tasks
- Confidence: % of self-rated confidence across tasks
- Level thresholds: Strength ≥80%, Developing 60–79%, Vulnerable 40–59%, High Concern <40%

Generate a comprehensive clinical assessment report. Return ONLY valid JSON with this exact structure:
{
  "overview": "2–3 paragraphs: purpose of assessment, referral context, administration conditions, and overall presentation",
  "behavioralObservations": "2–3 paragraphs: observed approach to tasks, engagement level, emotional response to challenge, language use, self-monitoring behaviours",
  "mathematicalProfile": "3–4 paragraphs: detailed analysis of mathematical reasoning patterns, domain-by-domain narrative with reference to specific scores, relationships between domains",
  "strategyUseProfile": "2 paragraphs: developmental stage of strategy use across domains, flexibility vs rigidity, evidence of conceptual vs procedural understanding",
  "strengths": ["4–6 specific identified strength statements, each referencing a domain or score pattern"],
  "areasOfNeed": ["4–6 specific areas requiring targeted support, each referencing a domain or score pattern"],
  "classroomRecommendations": ["4–6 specific, actionable classroom and instructional recommendations"],
  "parentRecommendations": ["3–4 plain-language home support recommendations"]
}

Write in professional clinical language appropriate for a psychoeducational report. Be specific and evidence-based, referencing actual domain scores. Return only the JSON object with no markdown or preamble.`;

    const raw = await callDeepSeekRmra(prompt, 3000);

    let narrative: Record<string, unknown>;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      narrative = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "AI returned malformed JSON. Please try again." });
    }

    const reportData = { narrative, generatedAt: new Date().toISOString() };

    await db.update(rmraSessionsTable)
      .set({ reportData: reportData as any, updatedAt: new Date() })
      .where(eq(rmraSessionsTable.id, sessionId));

    return res.json({ reportData });
  } catch (err) {
    logger.error({ err }, "POST generate-report failed");
    return res.status(500).json({ error: "Failed to generate report" });
  }
});

// ── Bobby Agent OS ─────────────────────────────────────────────────────────────

const BOBBY_PROMPTS: Record<string, (ctx: string, ageBand: string) => string> = {
  math_support_plan: (ctx, ageBand) => `You are a specialist mathematics intervention coordinator creating a structured 12-week support plan.

STUDENT MATHEMATICAL PROFILE:
${ctx}

Create a detailed 12-week math support plan for ${ageBand} targeting the identified areas of need. Format as:

WEEK-BY-WEEK PLAN:
For each of the 12 weeks, provide:
- Week [N]: [Theme/Focus]
  - Learning Intention: ...
  - Key Activities (2–3): ...
  - Resources/Materials: ...
  - Progress Check: ...

Include an overall structure with early weeks building foundational skills, mid-weeks consolidating, and later weeks generalising. Be specific to the domains showing Vulnerable or High Concern levels.`,

  parent_summary: (ctx, ageBand) => `You are a specialist educational psychologist writing a parent-friendly summary of a child's mathematical assessment results.

ASSESSMENT FINDINGS:
${ctx}

Write a warm, plain-language parent summary (no jargon) that:
1. Explains what the assessment measured and how it was done (1 paragraph)
2. Describes your child's mathematical strengths in clear, encouraging language (1–2 paragraphs)
3. Explains the areas where your child needs support, using everyday language (1–2 paragraphs)
4. Provides 4–5 specific, practical activities families can do at home to support each area of need
5. Ends with a positive, forward-looking paragraph about next steps

Write conversationally, avoid clinical terms, and use "your child" throughout.`,

  teacher_accommodation: (ctx, ageBand) => `You are a specialist learning support coordinator creating a teacher accommodation plan.

STUDENT MATHEMATICAL PROFILE:
${ctx}

Create a comprehensive teacher accommodation plan structured as:

ACADEMIC ACCOMMODATIONS:
- Assessment accommodations (5–6 specific items)
- Instructional accommodations (5–6 specific items)
- Environmental accommodations (3–4 items)

CURRICULUM MODIFICATIONS:
- Content modifications for High Concern domains (specific, actionable)
- Alternative assessment approaches

CLASSROOM STRATEGIES:
- Universal Design for Learning (UDL) strategies applicable to this profile
- Differentiation strategies for small group and individual work

TECHNOLOGY AND TOOLS:
- Recommended assistive tools and technology supports

Be specific, practical, and directly linked to the identified domain profiles.`,

  confidence_plan: (ctx, ageBand) => `You are a specialist educational psychologist creating a mathematical confidence and self-efficacy support plan.

STUDENT PROFILE:
${ctx}

Create a comprehensive Math Confidence Support Plan that addresses mathematical anxiety and builds self-efficacy. Structure as:

CURRENT CONFIDENCE PROFILE:
- Analysis of confidence vs accuracy gap (reference the scores)
- Productive struggle engagement analysis

CONFIDENCE-BUILDING FRAMEWORK (8–10 weeks):
- Week-by-week focus areas for building mathematical identity and confidence
- Specific activities for each phase (building safety, celebrating effort, embracing challenge)

CLASSROOM STRATEGIES FOR THE TEACHER:
- 5–6 specific strategies to build mathematical self-efficacy in the classroom
- Language and feedback frameworks (praise process over product)

HOME STRATEGIES FOR PARENTS:
- 4–5 specific ways to support mathematical confidence at home
- Growth mindset conversations to have

PROGRESS INDICATORS:
- How to know confidence is improving (observable behaviours)
- Suggested check-in schedule`,
};

router.post("/cases/:caseId/rmra/sessions/:sessionId/bobby-agent", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { caseId, sessionId } = req.params;
    const { action } = req.body as { action?: string };

    if (!action || !BOBBY_PROMPTS[action]) {
      return res.status(400).json({ error: "Invalid action. Must be one of: math_support_plan, parent_summary, teacher_accommodation, confidence_plan" });
    }

    const session = await loadSession(sessionId, caseId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    if (!session.domainScores) return res.status(400).json({ error: "No domain scores available" });

    const scores = session.domainScores as Record<string, { accuracy: number; level: string; strategyLevel: number; hintDependency: number; confidence: number }>;

    const AGE_BAND_LABELS: Record<string, string> = {
      early_primary: "Early Primary (Ages 5–8)",
      upper_primary: "Upper Primary (Ages 8–11)",
      middle_school: "Middle School (Ages 11–14)",
      secondary: "Secondary (Ages 14–16)",
    };

    const highConcernCount = RMRA_DOMAINS.filter(d => scores[d]?.level === "high_concern").length;
    const vulnerableCount = RMRA_DOMAINS.filter(d => scores[d]?.level === "vulnerable").length;
    const riskLevel = highConcernCount >= 5
      ? `Elevated (${highConcernCount} domains at High Concern — formal dyscalculia evaluation recommended)`
      : highConcernCount >= 3
        ? `Moderate (${highConcernCount} domains at High Concern — targeted dyscalculia screening recommended)`
        : highConcernCount >= 1 || vulnerableCount >= 3
          ? `Low-Moderate (${highConcernCount} High Concern, ${vulnerableCount} Vulnerable — continued monitoring recommended)`
          : `Low (no significant dyscalculia indicators across domains)`;

    const ctx = `DYSCALCULIA RISK LEVEL: ${riskLevel}\n\n` + RMRA_DOMAINS
      .filter(d => scores[d])
      .map(d => {
        const s = scores[d];
        return `${d}: Accuracy ${s.accuracy}%, Strategy ${s.strategyLevel}%, Hint Dependency ${s.hintDependency}%, Confidence ${s.confidence}%, Level: ${s.level.replace(/_/g, " ")}`;
      }).join("\n");

    const ageBandLabel = AGE_BAND_LABELS[session.ageBand] ?? session.ageBand;
    const prompt = BOBBY_PROMPTS[action](ctx, ageBandLabel);

    const content = await callDeepSeekRmra(prompt, 2500);
    return res.json({ content });
  } catch (err) {
    logger.error({ err }, "POST bobby-agent failed");
    return res.status(500).json({ error: "Failed to generate content" });
  }
});

// ── Standalone Access Code Validation ─────────────────────────────────────────

router.get("/rmra/access-codes/:code/validate", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const [record] = await db
      .select()
      .from(rmraAccessCodesTable)
      .where(eq(rmraAccessCodesTable.code, code.toUpperCase().trim()))
      .limit(1);

    if (!record) return res.status(404).json({ error: "Access code not found." });
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return res.status(410).json({ error: "This access code has expired." });
    }
    if (record.usageCount >= record.usageLimit) {
      return res.status(429).json({ error: "This access code has reached its usage limit." });
    }

    return res.json({ valid: true, description: record.description });
  } catch (err) {
    logger.error({ err }, "GET access-code validate failed");
    return res.status(500).json({ error: "Failed to validate access code" });
  }
});

// ── Standalone Session Creation ────────────────────────────────────────────────

router.post("/rmra/standalone/sessions", async (req: Request, res: Response) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) return res.status(400).json({ error: "Access code is required" });

    const [record] = await db
      .select()
      .from(rmraAccessCodesTable)
      .where(eq(rmraAccessCodesTable.code, code.toUpperCase().trim()))
      .limit(1);

    if (!record) return res.status(404).json({ error: "Access code not found." });
    if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
      return res.status(410).json({ error: "This access code has expired." });
    }
    if (record.usageCount >= record.usageLimit) {
      return res.status(429).json({ error: "This access code has reached its usage limit." });
    }

    await db.update(rmraAccessCodesTable)
      .set({ usageCount: record.usageCount + 1 })
      .where(eq(rmraAccessCodesTable.id, record.id));

    const sessionId = nanoid();
    const examinerToken = nanoid(48);
    await db.insert(rmraSessionsTable).values({
      id: sessionId,
      caseId: null,
      assignmentId: null,
      examinerId: null,
      ageBand: "upper_primary",
      version: "full",
      theme: "space_mission",
      status: "not_started",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await db.execute(sql`UPDATE rmra_sessions SET examiner_token = ${examinerToken} WHERE id = ${sessionId}`);

    return res.json({ sessionToken: sessionId, examinerToken });
  } catch (err) {
    logger.error({ err }, "POST standalone sessions failed");
    return res.status(500).json({ error: "Failed to create session" });
  }
});

// ── Standalone: Generate Report (examiner-only) ────────────────────────────────

router.post("/rmra/standalone/sessions/:sessionId/generate-report", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const examToken = req.headers["x-examiner-token"] as string | undefined;
    if (!await verifyExaminerToken(sessionId, examToken)) {
      return res.status(403).json({ error: "Unauthorized: valid examiner token required" });
    }
    const [session] = await db
      .select()
      .from(rmraSessionsTable)
      .where(and(eq(rmraSessionsTable.id, sessionId), isNull(rmraSessionsTable.caseId)))
      .limit(1);

    if (!session) return res.status(404).json({ error: "Standalone session not found" });
    if (session.status !== "completed") return res.status(400).json({ error: "Session is not completed" });
    if (!session.domainScores) return res.status(400).json({ error: "No domain scores available" });

    const scores = session.domainScores as Record<string, {
      accuracy: number; reasoning: number; strategyLevel: number;
      hintDependency: number; productiveStruggle: number; confidence: number;
      tasksAdministered: number; tasksDiscontinued: number;
      level: "strength" | "developing" | "vulnerable" | "high_concern";
    }>;

    const AGE_BAND_LABELS: Record<string, string> = {
      early_primary: "Early Primary (Ages 5–8, K–Yr 2)",
      upper_primary: "Upper Primary (Ages 8–11, Yr 3–5)",
      middle_school: "Middle School (Ages 11–14, Yr 6–8)",
      secondary: "Secondary (Ages 14–16, Yr 9–10)",
    };
    const LEVEL_LABELS: Record<string, string> = {
      strength: "Strength (≥80%)", developing: "Developing (60–79%)",
      vulnerable: "Vulnerable (40–59%)", high_concern: "High Concern (<40%)",
    };

    const domainTable = RMRA_DOMAINS
      .filter(d => scores[d])
      .map(d => {
        const s = scores[d];
        return `- ${d}: Accuracy ${s.accuracy}%, Reasoning ${s.reasoning}%, Strategy ${s.strategyLevel}%, Hint ${s.hintDependency}%, PS ${s.productiveStruggle}%, Confidence ${s.confidence}%, Level: ${LEVEL_LABELS[s.level] ?? s.level}`;
      }).join("\n");

    const prompt = `You are a specialist psychometrician writing a clinical psychoeducational report for the ReMynd Mathematical Reasoning Assessment (RMRA).

ASSESSMENT INFORMATION:
- Age Band: ${AGE_BAND_LABELS[session.ageBand] ?? session.ageBand}
- Assessment Version: ${session.version === "full" ? "Full" : "Brief"}
- Completion Date: ${session.completedAt ? new Date(session.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) : "Unknown"}
${session.generalNotes ? `- Examiner Notes: ${session.generalNotes}` : ""}

DOMAIN SCORES:
${domainTable}

Generate a comprehensive clinical assessment report. Return ONLY valid JSON:
{
  "overview": "2–3 paragraphs",
  "behavioralObservations": "2–3 paragraphs",
  "mathematicalProfile": "3–4 paragraphs",
  "strategyUseProfile": "2 paragraphs",
  "strengths": ["4–6 items"],
  "areasOfNeed": ["4–6 items"],
  "classroomRecommendations": ["4–6 items"],
  "parentRecommendations": ["3–4 items"]
}

Write in professional clinical language. Reference actual domain scores. Return only the JSON with no markdown.`;

    const raw = await callDeepSeekRmra(prompt, 3000);
    let narrative: Record<string, unknown>;
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      narrative = JSON.parse(cleaned);
    } catch {
      return res.status(500).json({ error: "AI returned malformed JSON. Please try again." });
    }

    const reportData = { narrative, generatedAt: new Date().toISOString() };
    await db.update(rmraSessionsTable)
      .set({ reportData: reportData as any, updatedAt: new Date() })
      .where(eq(rmraSessionsTable.id, sessionId));

    return res.json({ reportData });
  } catch (err) {
    logger.error({ err }, "POST standalone generate-report failed");
    return res.status(500).json({ error: "Failed to generate report" });
  }
});

// ── Standalone: Bobby Agent OS (examiner-only) ──────────────────────────────────

router.post("/rmra/standalone/sessions/:sessionId/bobby-agent", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const examToken = req.headers["x-examiner-token"] as string | undefined;
    if (!await verifyExaminerToken(sessionId, examToken)) {
      return res.status(403).json({ error: "Unauthorized: valid examiner token required" });
    }
    const { action } = req.body as { action?: string };

    if (!action || !BOBBY_PROMPTS[action]) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const [session] = await db
      .select()
      .from(rmraSessionsTable)
      .where(and(eq(rmraSessionsTable.id, sessionId), isNull(rmraSessionsTable.caseId)))
      .limit(1);

    if (!session) return res.status(404).json({ error: "Standalone session not found" });
    if (!session.domainScores) return res.status(400).json({ error: "No domain scores available" });

    const scores = session.domainScores as Record<string, { accuracy: number; level: string; strategyLevel: number; hintDependency: number; confidence: number }>;
    const AGE_BAND_LABELS: Record<string, string> = {
      early_primary: "Early Primary (Ages 5–8)",
      upper_primary: "Upper Primary (Ages 8–11)",
      middle_school: "Middle School (Ages 11–14)",
      secondary: "Secondary (Ages 14–16)",
    };

    const highConcernCountS = RMRA_DOMAINS.filter(d => scores[d]?.level === "high_concern").length;
    const vulnerableCountS = RMRA_DOMAINS.filter(d => scores[d]?.level === "vulnerable").length;
    const riskLevelS = highConcernCountS >= 5
      ? `Elevated (${highConcernCountS} domains at High Concern — formal dyscalculia evaluation recommended)`
      : highConcernCountS >= 3
        ? `Moderate (${highConcernCountS} domains at High Concern — targeted dyscalculia screening recommended)`
        : highConcernCountS >= 1 || vulnerableCountS >= 3
          ? `Low-Moderate (${highConcernCountS} High Concern, ${vulnerableCountS} Vulnerable — continued monitoring recommended)`
          : `Low (no significant dyscalculia indicators across domains)`;

    const ctx = `DYSCALCULIA RISK LEVEL: ${riskLevelS}\n\n` + RMRA_DOMAINS
      .filter(d => scores[d])
      .map(d => {
        const s = scores[d];
        return `${d}: Accuracy ${s.accuracy}%, Strategy ${s.strategyLevel}%, Hint Dependency ${s.hintDependency}%, Confidence ${s.confidence}%, Level: ${s.level.replace(/_/g, " ")}`;
      }).join("\n");

    const content = await callDeepSeekRmra(BOBBY_PROMPTS[action](ctx, AGE_BAND_LABELS[session.ageBand] ?? session.ageBand), 2500);
    return res.json({ content });
  } catch (err) {
    logger.error({ err }, "POST standalone bobby-agent failed");
    return res.status(500).json({ error: "Failed to generate content" });
  }
});

// ── Standalone: Items (public, no auth) ──────────────────────────────────────

router.get("/rmra/standalone/sessions/:sessionId/items", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const [session] = await db
      .select({ ageBand: rmraSessionsTable.ageBand, version: rmraSessionsTable.version })
      .from(rmraSessionsTable)
      .where(and(eq(rmraSessionsTable.id, sessionId), isNull(rmraSessionsTable.caseId)))
      .limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const ageBand = (req.query.ageBand as string) || session.ageBand || "upper_primary";
    const version = (req.query.version as string) || session.version || "full";
    const items = getItemsForSession(ageBand as any, version as any);
    return res.json({ items });
  } catch (err) {
    logger.error({ err }, "GET standalone items failed");
    return res.status(500).json({ error: "Failed to load item bank" });
  }
});

// ── Standalone: Update session (examiner-only) ────────────────────────────────

router.patch("/rmra/standalone/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const examToken = req.headers["x-examiner-token"] as string | undefined;
    if (!await verifyExaminerToken(sessionId, examToken)) {
      return res.status(403).json({ error: "Unauthorized: valid examiner token required" });
    }
    const [existing] = await db
      .select({ id: rmraSessionsTable.id, startedAt: rmraSessionsTable.startedAt })
      .from(rmraSessionsTable)
      .where(and(eq(rmraSessionsTable.id, sessionId), isNull(rmraSessionsTable.caseId)))
      .limit(1);
    if (!existing) return res.status(404).json({ error: "Session not found" });

    const { generalNotes, status, currentTaskId, ageBand, version, theme } = req.body;
    const updates: Partial<typeof rmraSessionsTable.$inferInsert> = { updatedAt: new Date() };
    if (generalNotes !== undefined) updates.generalNotes = generalNotes;
    if (status !== undefined) updates.status = status;
    if (currentTaskId !== undefined) updates.currentTaskId = currentTaskId;
    if (ageBand !== undefined) updates.ageBand = ageBand;
    if (version !== undefined) updates.version = version;
    if (theme !== undefined) updates.theme = theme;
    if (status === "in_progress" && !existing.startedAt) updates.startedAt = new Date();

    const [session] = await db
      .update(rmraSessionsTable)
      .set(updates)
      .where(eq(rmraSessionsTable.id, sessionId))
      .returning();

    return res.json({ session });
  } catch (err) {
    logger.error({ err }, "PATCH standalone session failed");
    return res.status(500).json({ error: "Failed to update session" });
  }
});

// ── Standalone: Save task response (examiner-only) ────────────────────────────

router.post("/rmra/standalone/sessions/:sessionId/tasks/:taskId/response", async (req: Request, res: Response) => {
  try {
    const { sessionId, taskId } = req.params;
    const examToken = req.headers["x-examiner-token"] as string | undefined;
    if (!await verifyExaminerToken(sessionId, examToken)) {
      return res.status(403).json({ error: "Unauthorized: valid examiner token required" });
    }
    const [session] = await db
      .select({ id: rmraSessionsTable.id, status: rmraSessionsTable.status, ageBand: rmraSessionsTable.ageBand })
      .from(rmraSessionsTable)
      .where(and(eq(rmraSessionsTable.id, sessionId), isNull(rmraSessionsTable.caseId)))
      .limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const body = req.body as {
      domain?: string; ageBand?: string; accuracy?: number; reasoning?: number;
      strategyLevel?: number; strategyLabel?: string; hintLevel?: number;
      attempts?: number; selfCorrection?: boolean; confidenceRating?: number;
      responseTimeSeconds?: number; firstResponse?: string; finalResponse?: string;
      productiveStrugglePersistence?: number; productiveStruggleFlexibility?: number;
      productiveStruggleEmotionalRegulation?: number; productiveStruggleErrorRecovery?: number;
      productiveStruggleHelpUtilization?: number; discontinued?: boolean;
      discontinuationReason?: string; examinerNotes?: string;
    };

    const itemMeta = RMRA_ITEMS.find(i => i.id === taskId);
    const [existing] = await db
      .select({ id: rmraTaskResponsesTable.id })
      .from(rmraTaskResponsesTable)
      .where(and(eq(rmraTaskResponsesTable.sessionId, sessionId), eq(rmraTaskResponsesTable.taskId, taskId)))
      .limit(1);

    const values = {
      sessionId,
      domain: body.domain ?? itemMeta?.domain ?? "Unknown",
      taskId,
      ageBand: body.ageBand ?? session.ageBand ?? "upper_primary",
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
    if (existing) {
      [response] = await db.update(rmraTaskResponsesTable).set(values).where(eq(rmraTaskResponsesTable.id, existing.id)).returning();
    } else {
      [response] = await db.insert(rmraTaskResponsesTable).values({ id: nanoid(), ...values }).returning();
    }

    if (session.status === "not_started") {
      await db.update(rmraSessionsTable)
        .set({ status: "in_progress", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(rmraSessionsTable.id, sessionId));
    }

    return res.json({ response });
  } catch (err) {
    logger.error({ err }, "POST standalone task response failed");
    return res.status(500).json({ error: "Failed to save task response" });
  }
});

// ── Standalone: Complete session — calculate domain scores (public, no auth) ──

router.post("/rmra/standalone/sessions/:sessionId/complete", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const examToken = req.headers["x-examiner-token"] as string | undefined;
    if (!await verifyExaminerToken(sessionId, examToken)) {
      return res.status(403).json({ error: "Unauthorized: valid examiner token required" });
    }
    const [session] = await db
      .select()
      .from(rmraSessionsTable)
      .where(and(eq(rmraSessionsTable.id, sessionId), isNull(rmraSessionsTable.caseId)))
      .limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const responses = await db
      .select()
      .from(rmraTaskResponsesTable)
      .where(eq(rmraTaskResponsesTable.sessionId, sessionId));

    const domainScores: Record<string, {
      accuracy: number; reasoning: number; strategyLevel: number;
      hintDependency: number; productiveStruggle: number; confidence: number;
      tasksAdministered: number; tasksDiscontinued: number;
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
        .map(r => avg([r.productiveStrugglePersistence, r.productiveStruggleFlexibility,
          r.productiveStruggleEmotionalRegulation, r.productiveStruggleErrorRecovery,
          r.productiveStruggleHelpUtilization]));
      const productiveStruggle = psScores.length > 0 ? avg(psScores) / 4 * 100 : 0;
      const confidence = avg(domainResponses.map(r => r.confidenceRating)) / 4 * 100;
      const composite = (accuracy * 0.35) + (reasoning * 0.3) + (strategyLevel * 0.2) + (confidence * 0.15);
      const level: "strength" | "developing" | "vulnerable" | "high_concern" =
        composite >= 75 ? "strength" : composite >= 50 ? "developing" : composite >= 25 ? "vulnerable" : "high_concern";

      domainScores[domain] = {
        accuracy: Math.round(accuracy), reasoning: Math.round(reasoning),
        strategyLevel: Math.round(strategyLevel), hintDependency: Math.round(hintDependency),
        productiveStruggle: Math.round(productiveStruggle), confidence: Math.round(confidence),
        tasksAdministered: domainResponses.length, tasksDiscontinued: discontinued, level,
      };
    }

    const [updatedSession] = await db
      .update(rmraSessionsTable)
      .set({ status: "completed", completedAt: new Date(), domainScores, updatedAt: new Date() })
      .where(eq(rmraSessionsTable.id, sessionId))
      .returning();

    return res.json({ session: updatedSession, domainScores });
  } catch (err) {
    logger.error({ err }, "POST standalone complete failed");
    return res.status(500).json({ error: "Failed to complete session" });
  }
});

// ── Standalone: Email report delivery (examiner-only) ────────────────────────

router.post("/rmra/standalone/sessions/:sessionId/email-report", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const examToken = req.headers["x-examiner-token"] as string | undefined;
    if (!await verifyExaminerToken(sessionId, examToken)) {
      return res.status(403).json({ error: "Unauthorized: valid examiner token required" });
    }
    const { recipientEmail, recipientName } = req.body as { recipientEmail?: string; recipientName?: string };

    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      return res.status(400).json({ error: "Valid recipient email is required" });
    }

    const [session] = await db
      .select()
      .from(rmraSessionsTable)
      .where(and(eq(rmraSessionsTable.id, sessionId), isNull(rmraSessionsTable.caseId)))
      .limit(1);

    if (!session) return res.status(404).json({ error: "Session not found" });
    if (session.status !== "completed") return res.status(400).json({ error: "Session is not completed" });
    if (!session.domainScores) return res.status(400).json({ error: "No domain scores available" });

    const scores = session.domainScores as Record<string, {
      accuracy: number; reasoning: number; strategyLevel: number;
      hintDependency: number; productiveStruggle: number; confidence: number;
      tasksAdministered: number; level: "strength" | "developing" | "vulnerable" | "high_concern";
    }>;

    const reportData = session.reportData as { narrative?: { overview?: string; strengths?: string[]; areasOfNeed?: string[]; classroomRecommendations?: string[] }; generatedAt?: string } | null;

    const LEVEL_COLORS_HTML: Record<string, string> = {
      strength: "#059669", developing: "#2563eb", vulnerable: "#d97706", high_concern: "#dc2626",
    };
    const LEVEL_LABELS_HTML: Record<string, string> = {
      strength: "Strength", developing: "Developing", vulnerable: "Vulnerable", high_concern: "High Concern",
    };
    const AGE_BAND_LABELS: Record<string, string> = {
      early_primary: "Early Primary (Ages 5–8)", upper_primary: "Upper Primary (Ages 8–11)",
      middle_school: "Middle School (Ages 11–14)", secondary: "Secondary (Ages 14–16)",
    };

    const completedDate = session.completedAt
      ? new Date(session.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
      : "Unknown";

    const domainRows = RMRA_DOMAINS
      .filter(d => scores[d])
      .map(d => {
        const s = scores[d];
        const color = LEVEL_COLORS_HTML[s.level] ?? "#6b7280";
        return `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#1e293b;">${d}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;">${s.accuracy}%</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;">${s.reasoning}%</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;">${s.hintDependency}%</td>
          <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;text-align:center;"><span style="color:${color};font-weight:600;">${LEVEL_LABELS_HTML[s.level] ?? s.level}</span></td>
        </tr>`;
      }).join("");

    const strengthsList = (reportData?.narrative?.strengths ?? []).map(s => `<li style="margin-bottom:4px;font-size:13px;color:#1e293b;">${s}</li>`).join("");
    const needsList = (reportData?.narrative?.areasOfNeed ?? []).map(s => `<li style="margin-bottom:4px;font-size:13px;color:#1e293b;">${s}</li>`).join("");
    const recsList = (reportData?.narrative?.classroomRecommendations ?? []).map(s => `<li style="margin-bottom:4px;font-size:13px;color:#1e293b;">${s}</li>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>RMRA Report</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:0;">
<div style="max-width:680px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
  <div style="background:linear-gradient(135deg,#4c1d95,#6d28d9);padding:24px 32px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="background:rgba(255,255,255,0.2);border-radius:8px;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;">🧠</div>
      <div>
        <h1 style="color:#fff;font-size:18px;font-weight:700;margin:0;">ReMynd Mathematical Reasoning Assessment</h1>
        <p style="color:rgba(255,255,255,0.75);font-size:13px;margin:4px 0 0;">RMRA Report Summary</p>
      </div>
    </div>
  </div>
  <div style="padding:24px 32px;">
    <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
      <tr>
        <td style="font-size:13px;color:#64748b;padding-bottom:4px;">Completed:</td>
        <td style="font-size:13px;color:#1e293b;font-weight:600;padding-bottom:4px;">${completedDate}</td>
        <td style="font-size:13px;color:#64748b;padding-bottom:4px;">Age Band:</td>
        <td style="font-size:13px;color:#1e293b;font-weight:600;padding-bottom:4px;">${AGE_BAND_LABELS[session.ageBand] ?? session.ageBand}</td>
      </tr>
    </table>
    ${session.generalNotes ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#475569;"><strong>Examiner Notes:</strong> ${session.generalNotes}</div>` : ""}

    <h2 style="font-size:15px;font-weight:600;color:#1e293b;margin:0 0 12px;">Domain Score Summary</h2>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Domain</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Accuracy</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Reasoning</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Hint Dep.</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Level</th>
        </tr>
      </thead>
      <tbody>${domainRows}</tbody>
    </table>

    ${strengthsList ? `<div style="margin-bottom:20px;">
      <h3 style="font-size:14px;font-weight:600;color:#059669;margin:0 0 8px;">✓ Identified Strengths</h3>
      <ul style="margin:0;padding-left:20px;">${strengthsList}</ul>
    </div>` : ""}
    ${needsList ? `<div style="margin-bottom:20px;">
      <h3 style="font-size:14px;font-weight:600;color:#d97706;margin:0 0 8px;">⚠ Areas of Need</h3>
      <ul style="margin:0;padding-left:20px;">${needsList}</ul>
    </div>` : ""}
    ${recsList ? `<div style="margin-bottom:20px;">
      <h3 style="font-size:14px;font-weight:600;color:#2563eb;margin:0 0 8px;">📋 Classroom Recommendations</h3>
      <ul style="margin:0;padding-left:20px;">${recsList}</ul>
    </div>` : ""}

    ${reportData?.narrative?.overview ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <h3 style="font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Assessment Overview</h3>
      <p style="font-size:13px;color:#475569;line-height:1.6;margin:0;">${reportData.narrative.overview}</p>
    </div>` : ""}
  </div>
  <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">Generated by ReMynd Assessment Operating System · Session ID: ${sessionId}</p>
    <p style="font-size:11px;color:#cbd5e1;margin:4px 0 0;">This report is a screening tool only. It does not constitute a clinical diagnosis.</p>
  </div>
</div>
</body>
</html>`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"ReMynd RMRA" <${process.env.GMAIL_USER}>`,
      to: recipientName ? `"${recipientName}" <${recipientEmail}>` : recipientEmail,
      subject: `RMRA Assessment Report — ${completedDate}`,
      html,
      text: `RMRA Assessment Report\nCompleted: ${completedDate}\nAge Band: ${AGE_BAND_LABELS[session.ageBand] ?? session.ageBand}\n\nThis report was generated by ReMynd RMRA. Session ID: ${sessionId}`,
    });

    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "POST standalone email-report failed");
    return res.status(500).json({ error: "Failed to send report email" });
  }
});

// ── Standalone: Get Session (public, no auth) ────────────────────────────────────

router.get("/rmra/standalone/sessions/:sessionId", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const [session] = await db
      .select()
      .from(rmraSessionsTable)
      .where(and(eq(rmraSessionsTable.id, sessionId), isNull(rmraSessionsTable.caseId)))
      .limit(1);

    if (!session) return res.status(404).json({ error: "Session not found" });

    const responses = await db
      .select()
      .from(rmraTaskResponsesTable)
      .where(eq(rmraTaskResponsesTable.sessionId, sessionId));

    return res.json({ session, responses });
  } catch (err) {
    logger.error({ err }, "GET standalone session failed");
    return res.status(500).json({ error: "Failed to load session" });
  }
});

export default router;
