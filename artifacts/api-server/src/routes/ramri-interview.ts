import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, casesTable, responsesTable } from "@workspace/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { logger } from "../lib/logger.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import mammoth from "mammoth";
import { ai } from "@workspace/integrations-gemini-ai";
import multer from "multer";

const offlineUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

async function pdfToText(pdfBuffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default as (buf: Buffer) => Promise<{ text: string }>;
  const result = await pdfParse(pdfBuffer);
  return result.text ?? "";
}

async function callDeepSeekText(prompt: string, systemPrompt?: string, maxTokens = 4096): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");
  const messages = [
    ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
    { role: "user" as const, content: prompt },
  ];
  const r = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "deepseek-chat", messages, temperature: 0.3, max_tokens: maxTokens }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => "");
    throw new Error(`DeepSeek error ${r.status}: ${body.slice(0, 300)}`);
  }
  const data = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

const router: IRouter = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";
async function docxToText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

async function imageToText(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const base64 = imageBuffer.toString("base64");
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{
      role: "user",
      parts: [
        { inlineData: { mimeType, data: base64 } },
        { text: "This is a photo of a student's mathematics work. Please transcribe ALL visible text exactly as written, including every problem, number, working/calculation steps, and any written answers. Preserve layout where possible — use new lines for separate problems. Do not interpret or correct — transcribe exactly what is shown including any errors or teacher marks." },
      ],
    }],
    config: { maxOutputTokens: 8192 },
  });
  return response.text ?? "";
}

async function callGroq(prompt: string, systemPrompt?: string, maxTokens = 2048): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");
  const messages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    { role: "user", content: prompt },
  ];
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7, max_tokens: maxTokens }),
  });
  if (!r.ok) throw new Error(`Groq error: ${r.status}`);
  const data = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}


async function resolveSession(caseId: string, assignmentId: string) {
  const rows = await db.execute(sql`
    SELECT * FROM ramri_sessions WHERE case_id = ${caseId} AND assignment_id = ${assignmentId} LIMIT 1
  `);
  return rows.rows[0] ?? null;
}

async function getUserName(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null;
  const rows = await db.execute(sql`SELECT name, email FROM users WHERE id = ${userId} LIMIT 1`);
  const u = rows.rows[0] as { name?: string; email?: string } | undefined;
  return u?.name ?? u?.email ?? null;
}

function isInvigilator(req: import("express").Request): boolean {
  return req.userRole === "assessment_invigilator";
}

/**
 * Returns true if the problem text is a cross-reference or meta-question that
 * only makes sense in the context of another problem — these must never appear
 * in a student choice set.
 */
function isCrossReferenceItem(text: string): boolean {
  return /\b(both problems?|either problem|each problem|problem [a-z0-9]+|question [0-9]+|the above|these problems?|part [a-z0-9]\b|as above|from above|in question|in problem|explain why you (can|can'?t|cannot)|how do you know .{0,30} (both|either|works? for)|compare your|what did you notice|what do you notice)\b/i.test(text);
}

// ── Create or get session ─────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions", authMiddleware, async (req, res) => {
  try {
    const { caseId } = req.params;
    const { assignmentId } = req.body as { assignmentId: string };

    let [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment) {
      const [fallback] = await db
        .select()
        .from(assignmentsTable)
        .where(and(eq(assignmentsTable.caseId, caseId), eq(assignmentsTable.toolId, "RAMRI")))
        .limit(1);
      if (!fallback) return res.status(404).json({ error: "Assignment not found" });
      assignment = fallback;
    }
    if (assignment.toolId !== "RAMRI") return res.status(400).json({ error: "Assignment is not a RAMRI session" });

    const existing = await resolveSession(caseId, assignment.id);
    if (existing) {
      const sess = existing as Record<string, unknown>;
      // Stamp invigilator_id on first invigilator access (atomic — WHERE IS NULL prevents races)
      if (isInvigilator(req) && req.userId) {
        await db.execute(sql`UPDATE ramri_sessions SET invigilator_id = ${req.userId}, updated_at = NOW() WHERE id = ${existing.id} AND invigilator_id IS NULL`);
        const fresh = (await db.execute(sql`SELECT invigilator_id FROM ramri_sessions WHERE id = ${existing.id} LIMIT 1`)).rows[0] as { invigilator_id?: string } | undefined;
        sess.invigilator_id = fresh?.invigilator_id ?? sess.invigilator_id;
      }
      const docs = await db.execute(sql`SELECT * FROM ramri_work_documents WHERE session_id = ${existing.id} ORDER BY created_at ASC`);
      const samples = await db.execute(sql`SELECT * FROM ramri_work_samples WHERE session_id = ${existing.id} ORDER BY sort_order ASC, created_at ASC`);
      const choiceSets = await db.execute(sql`SELECT cs.*, COALESCE(json_agg(csi ORDER BY csi.display_order) FILTER (WHERE csi.id IS NOT NULL), '[]') AS items FROM ramri_choice_sets cs LEFT JOIN ramri_choice_set_items csi ON csi.choice_set_id = cs.id WHERE cs.session_id = ${existing.id} GROUP BY cs.id ORDER BY cs.display_order ASC`);
      const selections = await db.execute(sql`SELECT * FROM ramri_sample_selections WHERE session_id = ${existing.id} ORDER BY sequence_number ASC`);
      const ratings = await db.execute(sql`SELECT * FROM ramri_domain_ratings WHERE session_id = ${existing.id}`);
      const report = (await db.execute(sql`SELECT * FROM ramri_reports WHERE session_id = ${existing.id} LIMIT 1`)).rows[0] ?? null;
      const uploadsClosed = !!(assignment.metadata as Record<string, unknown> | null)?.ramriUploadsClosed;
      const invigilatorName = await getUserName(sess.invigilator_id as string | null);
      const caseRow = await db.select({ studentName: casesTable.studentName }).from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
      const studentName = caseRow[0]?.studentName ?? null;
      return res.json({
        session: sess, docs: docs.rows, samples: samples.rows,
        choiceSets: choiceSets.rows, selections: selections.rows,
        ratings: ratings.rows, report,
        assignmentToken: assignment.uniqueToken, uploadsClosed,
        userRole: req.userRole ?? null,
        invigilatorId: sess.invigilator_id ?? null,
        invigilatorName, studentName,
      });
    }

    const sessionId = nanoid();
    await db.execute(sql`
      INSERT INTO ramri_sessions (id, case_id, assignment_id, examiner_id, status, created_at, updated_at)
      VALUES (${sessionId}, ${caseId}, ${assignment.id}, ${req.userId ?? null}, 'upload', NOW(), NOW())
    `);
    const session = (await db.execute(sql`SELECT * FROM ramri_sessions WHERE id = ${sessionId} LIMIT 1`)).rows[0];
    const caseRow2 = await db.select({ studentName: casesTable.studentName }).from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
    return res.json({
      session, docs: [], samples: [], choiceSets: [], selections: [], ratings: [], report: null,
      assignmentToken: assignment.uniqueToken, uploadsClosed: false,
      userRole: req.userRole ?? null,
      invigilatorId: null,
      invigilatorName: null,
      studentName: caseRow2[0]?.studentName ?? null,
    });
  } catch (err) {
    logger.error({ err }, "RAMRI session create failed");
    return res.status(500).json({ error: "Failed to create RAMRI session" });
  }
});

// ── Update session ────────────────────────────────────────────────────────────
router.patch("/cases/:caseId/ramri/sessions/:sessionId", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status, openingScriptDelivered, openingNotes, generalNotes, stopReason, sessionReflectionExaminer } = req.body as Record<string, unknown>;
    await db.execute(sql`
      UPDATE ramri_sessions SET
        status = COALESCE(${status ?? null}, status),
        opening_script_delivered = COALESCE(${openingScriptDelivered ?? null}, opening_script_delivered),
        opening_notes = COALESCE(${openingNotes ?? null}, opening_notes),
        general_notes = COALESCE(${generalNotes ?? null}, general_notes),
        stop_reason = COALESCE(${stopReason ?? null}, stop_reason),
        session_reflection_examiner = COALESCE(${sessionReflectionExaminer ? JSON.stringify(sessionReflectionExaminer) : null}::jsonb, session_reflection_examiner),
        updated_at = NOW()
      WHERE id = ${sessionId}
    `);
    const session = (await db.execute(sql`SELECT * FROM ramri_sessions WHERE id = ${sessionId} LIMIT 1`)).rows[0];
    return res.json({ session });
  } catch (err) {
    logger.error({ err }, "RAMRI session update failed");
    return res.status(500).json({ error: "Failed to update session" });
  }
});

// ── Reset session (keep docs, wipe samples + everything downstream) ───────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/reset-samples", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot reset the session" });
  try {
    const { sessionId } = req.params;
    await db.execute(sql`
      DELETE FROM ramri_interview_responses
      WHERE sample_selection_id IN (
        SELECT id FROM ramri_sample_selections WHERE session_id = ${sessionId}
      )
    `);
    await db.execute(sql`
      DELETE FROM ramri_transfer_prompts
      WHERE sample_selection_id IN (
        SELECT id FROM ramri_sample_selections WHERE session_id = ${sessionId}
      )
    `);
    await db.execute(sql`
      DELETE FROM ramri_behavioral_obs
      WHERE sample_selection_id IN (
        SELECT id FROM ramri_sample_selections WHERE session_id = ${sessionId}
      )
    `);
    await db.execute(sql`DELETE FROM ramri_sample_selections WHERE session_id = ${sessionId}`);
    await db.execute(sql`
      DELETE FROM ramri_choice_set_items
      WHERE choice_set_id IN (
        SELECT id FROM ramri_choice_sets WHERE session_id = ${sessionId}
      )
    `);
    await db.execute(sql`DELETE FROM ramri_choice_sets WHERE session_id = ${sessionId}`);
    await db.execute(sql`DELETE FROM ramri_domain_ratings WHERE session_id = ${sessionId}`);
    await db.execute(sql`DELETE FROM ramri_reports WHERE session_id = ${sessionId}`);
    await db.execute(sql`DELETE FROM ramri_work_samples WHERE session_id = ${sessionId}`);
    await db.execute(sql`
      UPDATE ramri_work_documents SET extraction_status = 'pending'
      WHERE session_id = ${sessionId}
    `);
    await db.execute(sql`
      UPDATE ramri_sessions SET status = 'active', updated_at = NOW()
      WHERE id = ${sessionId}
    `);
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "RAMRI reset-samples failed");
    return res.status(500).json({ error: "Reset failed" });
  }
});

// ── Toggle contributor uploads ────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/toggle-uploads", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot control upload access" });
  try {
    const { sessionId } = req.params;
    const { closed } = req.body as { closed?: boolean };
    const sessionRows = await db.execute(sql`SELECT assignment_id FROM ramri_sessions WHERE id = ${sessionId} LIMIT 1`);
    const sessionRow = sessionRows.rows[0] as { assignment_id?: string } | undefined;
    if (!sessionRow?.assignment_id) return res.status(404).json({ error: "Session not found" });

    const [assignment] = await db.select().from(assignmentsTable).where(eq(assignmentsTable.id, sessionRow.assignment_id)).limit(1);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    // If explicit closed value provided, use it; otherwise toggle
    const currentClosed = !!(assignment.metadata as Record<string, unknown> | null)?.ramriUploadsClosed;
    const newClosed = typeof closed === "boolean" ? closed : !currentClosed;
    const existingMeta = (assignment.metadata as Record<string, unknown> | null) ?? {};
    const newMeta = { ...existingMeta, ramriUploadsClosed: newClosed };

    await db.execute(sql`UPDATE assignments SET metadata = ${JSON.stringify(newMeta)}::jsonb WHERE id = ${assignment.id}`);

    return res.json({ uploadsClosed: newClosed });
  } catch (err) {
    logger.error({ err }, "RAMRI toggle uploads failed");
    return res.status(500).json({ error: "Failed to toggle uploads" });
  }
});

// ── Work Documents ────────────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/documents", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot upload documents" });
  try {
    const { caseId, sessionId } = req.params;
    const { fileName, fileUrl, fileType, sourceType, contributorName, completionDate, gradeLevel, mathTopic, independenceReported, teacherAssistance, parentAssistance, exampleShown, manipulativesUsed, calculatorUsed, completionSetting, timed, teacherMarked, teacherComments, contributorNotes } = req.body;
    const id = nanoid();
    await db.execute(sql`
      INSERT INTO ramri_work_documents (id, case_id, session_id, file_name, file_url, file_type, source_type, contributor_name, completion_date, grade_level, math_topic, independence_reported, teacher_assistance, parent_assistance, example_shown, manipulatives_used, calculator_used, completion_setting, timed, teacher_marked, teacher_comments, contributor_notes, extraction_status, created_at)
      VALUES (${id}, ${caseId}, ${sessionId}, ${fileName ?? null}, ${fileUrl ?? null}, ${fileType ?? null}, ${sourceType ?? null}, ${contributorName ?? null}, ${completionDate ?? null}, ${gradeLevel ?? null}, ${mathTopic ?? null}, ${independenceReported ?? null}, ${teacherAssistance ?? null}, ${parentAssistance ?? null}, ${exampleShown ?? null}, ${manipulativesUsed ?? null}, ${calculatorUsed ?? null}, ${completionSetting ?? null}, ${timed ?? null}, ${teacherMarked ?? null}, ${teacherComments ?? null}, ${contributorNotes ?? null}, 'pending', NOW())
    `);
    const doc = (await db.execute(sql`SELECT * FROM ramri_work_documents WHERE id = ${id} LIMIT 1`)).rows[0];
    return res.json({ document: doc });
  } catch (err) {
    logger.error({ err }, "RAMRI document create failed");
    return res.status(500).json({ error: "Failed to create document" });
  }
});

router.get("/cases/:caseId/ramri/sessions/:sessionId/documents", authMiddleware, async (req, res) => {
  try {
    const { caseId, sessionId } = req.params;
    const docs = await db.execute(sql`SELECT * FROM ramri_work_documents WHERE session_id = ${sessionId} ORDER BY created_at ASC`);
    // Also return current uploadsClosed so the frontend can self-correct stale state
    const session = (await db.execute(sql`SELECT assignment_id FROM ramri_sessions WHERE id = ${sessionId} LIMIT 1`)).rows[0] as { assignment_id: string } | undefined;
    let uploadsClosed = false;
    if (session) {
      const asgn = (await db.execute(sql`SELECT metadata FROM assignments WHERE id = ${session.assignment_id} LIMIT 1`)).rows[0] as { metadata: unknown } | undefined;
      uploadsClosed = !!(asgn?.metadata as Record<string, unknown> | null)?.ramriUploadsClosed;
    }
    return res.json({ documents: docs.rows, uploadsClosed });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.delete("/cases/:caseId/ramri/sessions/:sessionId/documents/:docId", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot delete documents" });
  try {
    const { docId } = req.params;
    await db.execute(sql`DELETE FROM ramri_work_documents WHERE id = ${docId}`);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete document" });
  }
});

router.get("/cases/:caseId/ramri/sessions/:sessionId/documents/:docId/preview", authMiddleware, async (req, res) => {
  try {
    const { docId } = req.params;
    const result = await db.execute(sql`SELECT file_url, file_name, file_type FROM ramri_work_documents WHERE id = ${docId} LIMIT 1`);
    const doc = result.rows[0] as { file_url: string | null; file_name: string | null; file_type: string | null } | undefined;
    if (!doc?.file_url) return res.status(404).json({ error: "Document not found" });
    const objectStorage = new ObjectStorageService();
    const signedUrl = await objectStorage.getObjectEntitySignedDownloadURL(doc.file_url);
    return res.json({ url: signedUrl, fileName: doc.file_name, fileType: doc.file_type });
  } catch (err) {
    logger.error({ err }, "RAMRI doc preview failed");
    return res.status(500).json({ error: "Failed to generate preview URL" });
  }
});

// ── Work Samples ──────────────────────────────────────────────────────────────
/** Normalise a problem string for duplicate detection.
 *  Lowercases, collapses whitespace, strips punctuation that isn't a math
 *  operator/symbol, and trims. Two problems are considered duplicates when
 *  their normalised forms are identical. */
function normaliseProblem(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s+\-×÷*/=<>%°½⅓¼√^.]/g, " ")  // strip punctuation except math
    .replace(/\s+/g, " ")
    .trim();
}

router.post("/cases/:caseId/ramri/sessions/:sessionId/samples", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify the sample bank" });
  try {
    const { caseId, sessionId } = req.params;
    const { documentId, imageUrl, extractedProblem, studentAnswer, visibleWorking, teacherCorrection, teacherComments, domain, skill, reasoningFocus, difficulty, estimatedGrade, answerStatus, languageDemand, suitability, examinerNotes, sampleRole } = req.body;

    // ── Duplicate detection ───────────────────────────────────────────────────
    const incomingNorm = normaliseProblem(extractedProblem);
    if (incomingNorm) {
      const existing = (await db.execute(sql`
        SELECT id, extracted_problem FROM ramri_work_samples
        WHERE session_id = ${sessionId} AND case_id = ${caseId}
      `)).rows as Array<{ id: string; extracted_problem: string | null }>;
      const dupe = existing.find(r => normaliseProblem(r.extracted_problem) === incomingNorm);
      if (dupe) {
        // Return the existing row — frontend handles it identically to a fresh insert
        const existingSample = (await db.execute(sql`SELECT * FROM ramri_work_samples WHERE id = ${dupe.id} LIMIT 1`)).rows[0];
        return res.json({ sample: existingSample, duplicate: true });
      }
    }

    const id = nanoid();
    const countRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ramri_work_samples WHERE session_id = ${sessionId}`);
    const sortOrder = Number((countRes.rows[0] as { cnt: string })?.cnt ?? 0);
    const resolvedRole = (sampleRole && ["interview", "evidence", "observation"].includes(sampleRole)) ? sampleRole : "interview";
    await db.execute(sql`
      INSERT INTO ramri_work_samples (id, document_id, case_id, session_id, image_url, extracted_problem, student_answer, visible_working, teacher_correction, teacher_comments, domain, skill, reasoning_focus, difficulty, estimated_grade, answer_status, language_demand, suitability, approved, examiner_notes, sort_order, sample_role, suggested_for_interview, created_at, updated_at)
      VALUES (${id}, ${documentId ?? null}, ${caseId}, ${sessionId}, ${imageUrl ?? null}, ${extractedProblem ?? null}, ${studentAnswer ?? null}, ${visibleWorking ?? null}, ${teacherCorrection ?? null}, ${teacherComments ?? null}, ${domain ?? null}, ${skill ?? null}, ${reasoningFocus ? JSON.stringify(reasoningFocus) : null}, ${difficulty ?? null}, ${estimatedGrade ?? null}, ${answerStatus ?? null}, ${languageDemand ?? null}, ${suitability ?? 'suitable'}, false, ${examinerNotes ?? null}, ${sortOrder}, ${resolvedRole}, false, NOW(), NOW())
    `);
    const sample = (await db.execute(sql`SELECT * FROM ramri_work_samples WHERE id = ${id} LIMIT 1`)).rows[0];
    return res.json({ sample });
  } catch (err) {
    logger.error({ err }, "RAMRI sample create failed");
    return res.status(500).json({ error: "Failed to create sample" });
  }
});

router.patch("/cases/:caseId/ramri/sessions/:sessionId/samples/:sampleId", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify the sample bank" });
  try {
    const { sampleId } = req.params;
    const { extractedProblem, studentAnswer, visibleWorking, teacherCorrection, teacherComments, domain, skill, reasoningFocus, difficulty, estimatedGrade, answerStatus, languageDemand, suitability, approved, examinerNotes, imageUrl, sampleRole, suggestedForInterview } = req.body;
    const validRole = (sampleRole && ["interview", "evidence", "observation"].includes(sampleRole)) ? sampleRole : null;
    await db.execute(sql`
      UPDATE ramri_work_samples SET
        extracted_problem = COALESCE(${extractedProblem ?? null}, extracted_problem),
        student_answer = COALESCE(${studentAnswer ?? null}, student_answer),
        visible_working = COALESCE(${visibleWorking ?? null}, visible_working),
        teacher_correction = COALESCE(${teacherCorrection ?? null}, teacher_correction),
        teacher_comments = COALESCE(${teacherComments ?? null}, teacher_comments),
        domain = COALESCE(${domain ?? null}, domain),
        skill = COALESCE(${skill ?? null}, skill),
        reasoning_focus = COALESCE(${reasoningFocus ? JSON.stringify(reasoningFocus) : null}, reasoning_focus),
        difficulty = COALESCE(${difficulty ?? null}, difficulty),
        estimated_grade = COALESCE(${estimatedGrade ?? null}, estimated_grade),
        answer_status = COALESCE(${answerStatus ?? null}, answer_status),
        language_demand = COALESCE(${languageDemand ?? null}, language_demand),
        suitability = COALESCE(${suitability ?? null}, suitability),
        approved = COALESCE(${approved ?? null}, approved),
        examiner_notes = COALESCE(${examinerNotes ?? null}, examiner_notes),
        image_url = COALESCE(${imageUrl ?? null}, image_url),
        sample_role = COALESCE(${validRole}, sample_role),
        suggested_for_interview = COALESCE(${suggestedForInterview ?? null}, suggested_for_interview),
        updated_at = NOW()
      WHERE id = ${sampleId}
    `);
    const sample = (await db.execute(sql`SELECT * FROM ramri_work_samples WHERE id = ${sampleId} LIMIT 1`)).rows[0];
    return res.json({ sample });
  } catch (err) {
    logger.error({ err }, "RAMRI sample update failed");
    return res.status(500).json({ error: "Failed to update sample" });
  }
});

// Bulk-delete all samples for a session — allows examiner to wipe and re-extract
router.delete("/cases/:caseId/ramri/sessions/:sessionId/samples", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify the sample bank" });
  try {
    const { sessionId, caseId } = req.params;
    const result = await db.execute(sql`DELETE FROM ramri_work_samples WHERE session_id = ${sessionId} AND case_id = ${caseId}`);
    const deleted = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    return res.json({ ok: true, deleted });
  } catch (err) {
    logger.error({ err }, "RAMRI bulk delete samples failed");
    return res.status(500).json({ error: "Failed to delete samples" });
  }
});

router.delete("/cases/:caseId/ramri/sessions/:sessionId/samples/:sampleId", authMiddleware, async (req, res) => {
  const role = (req as unknown as Record<string, Record<string, string>>).user?.role;
  if (!["supervisor", "administrator"].includes(role)) return res.status(403).json({ error: "Only supervisors/administrators can permanently delete samples" });
  try {
    const { sampleId, sessionId, caseId } = req.params;
    await db.execute(sql`DELETE FROM ramri_work_samples WHERE id = ${sampleId} AND session_id = ${sessionId} AND case_id = ${caseId}`);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete sample" });
  }
});

// ── AI: Suggest strongest interview candidates ────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/suggest-interview-samples", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify the sample bank" });
  try {
    const { sessionId, caseId } = req.params;

    // Fetch case for referral context
    const caseRow = (await db.execute(sql`SELECT referral_reason, student_name, grade FROM cases WHERE id = ${caseId} LIMIT 1`)).rows[0] as Record<string, string | null> | undefined;

    // ── Fetch all unclassified items (role=interview or null) ─────────────────
    const allRows = (await db.execute(sql`
      SELECT id, domain, skill, difficulty, answer_status, suitability, examiner_notes, extracted_problem
      FROM ramri_work_samples
      WHERE session_id = ${sessionId} AND case_id = ${caseId}
        AND (sample_role = 'interview' OR sample_role IS NULL)
      ORDER BY created_at ASC
    `)).rows as Array<Record<string, string | null>>;

    if (allRows.length === 0) {
      const existing = (await db.execute(sql`SELECT * FROM ramri_work_samples WHERE session_id = ${sessionId} AND case_id = ${caseId}`)).rows;
      return res.json({ suggestedIds: [], updatedSamples: existing, autoApproved: false });
    }

    // ── suitability=excluded: always Evidence, never Interview ───────────────
    // Move them first so they're out of the selection pool.
    await db.execute(sql`
      UPDATE ramri_work_samples
      SET sample_role = 'evidence', approved = false, suggested_for_interview = false
      WHERE session_id = ${sessionId} AND case_id = ${caseId}
        AND (sample_role = 'interview' OR sample_role IS NULL)
        AND suitability = 'excluded'
    `);

    // Candidates = everything that isn't suitability=excluded
    const candidates = allRows.filter(s => s.suitability !== "excluded");

    if (candidates.length === 0) {
      const existing = (await db.execute(sql`SELECT * FROM ramri_work_samples WHERE session_id = ${sessionId} AND case_id = ${caseId}`)).rows;
      return res.json({ suggestedIds: [], updatedSamples: existing, autoApproved: false });
    }

    // ── Unified priority score ────────────────────────────────────────────────
    // Error items score higher — they expose gaps.
    // Hard/developing correct items score mid-range — they confirm strengths & ceiling.
    // Easy correct items score lowest — minimal clinical interview value.
    const priorityScore = (s: Record<string, string | null>): number => {
      const status = s.answer_status ?? "";
      const diff   = s.difficulty ?? "";
      const isError = status === "incorrect" || status === "partial_correct" || status === "unclear";
      let score = 0;
      if (status === "incorrect")            score = 10;
      else if (status === "partial_correct") score = 8;
      else if (status === "unclear")         score = 6;
      else if (diff === "hard")              score = 4;  // correct + hard: confirms ceiling
      else if (diff === "developing")        score = 2;  // correct + developing: confirms progress
      else                                   score = 1;  // correct + easy: low value
      if (isError && diff === "hard")        score += 1; // hard error: especially revealing
      if (s.examiner_notes?.trim())          score += 1; // examiner flagged something
      return score;
    };

    // ── Target count: RAMRI interviews probe 6–10 items ──────────────────────
    // For small pools always take all candidates rather than leaving interview empty.
    const targetCount = Math.min(10, Math.max(Math.min(6, candidates.length), Math.ceil(candidates.length * 0.06)));

    // ── Deterministic selection with domain spread ────────────────────────────
    // Sort by score desc, then pick greedily preferring domain variety.
    const sortedCandidates = [...candidates].sort((a, b) => priorityScore(b) - priorityScore(a));

    const domainCount = new Map<string, number>();
    const deterministicPicks: typeof candidates = [];
    // First pass: pick top items, max 2 per domain, until targetCount filled
    for (const item of sortedCandidates) {
      if (deterministicPicks.length >= targetCount) break;
      const d = item.domain ?? "Other";
      if ((domainCount.get(d) ?? 0) < 2) {
        deterministicPicks.push(item);
        domainCount.set(d, (domainCount.get(d) ?? 0) + 1);
      }
    }
    // Second pass: fill remaining slots from highest-score items (relax domain spread)
    if (deterministicPicks.length < targetCount) {
      const pickedIds = new Set(deterministicPicks.map(p => p.id));
      for (const item of sortedCandidates) {
        if (deterministicPicks.length >= targetCount) break;
        if (!pickedIds.has(item.id)) {
          deterministicPicks.push(item);
          pickedIds.add(item.id as string);
        }
      }
    }

    // ── AI refinement (for large pools only) ─────────────────────────────────
    // AI sees the full pre-filtered candidate set and picks the best N.
    // Falls back to deterministic picks if AI fails or returns bad IDs.
    let finalInterviewIds: string[] = deterministicPicks.map(s => s.id as string);

    if (candidates.length > 20) {
      try {
        const referralContext = caseRow?.referral_reason ?? "not specified";
        const studentGrade = caseRow?.grade ?? "unknown";

        // Give AI the top-scoring candidates (capped for token budget)
        const aiPool = sortedCandidates.slice(0, Math.min(60, sortedCandidates.length));

        const errorCount = aiPool.filter(s => ["incorrect","partial_correct","unclear"].includes(s.answer_status ?? "")).length;
        const correctCount = aiPool.length - errorCount;

        const prompt = `You are a clinical educational psychologist preparing a RAMRI interview for a student in ${studentGrade}.
Referral concern: ${referralContext}

Select exactly ${targetCount} items for a 60–90 minute RAMRI interview that will:
1. INVESTIGATE gaps — probe items the student got wrong or partially right
2. CONFIRM strengths — probe 1–3 hard/developing correct items to understand reasoning strategy

The pool has ${errorCount} error items (incorrect/partial/unclear) and ${correctCount} correct items.
Prioritise errors — but if the student got most things right, include some hard correct items to map their ceiling.

Rules:
- Prefer items matching the referral concern
- Spread across different domains — do not cluster all picks in one domain
- Include at least one hard-difficulty item if available
- Include items with examiner notes flagging clinical interest

Candidates (sorted by clinical priority):
${JSON.stringify(aiPool.map(s => ({
  id: s.id,
  domain: s.domain,
  skill: s.skill,
  difficulty: s.difficulty,
  answerStatus: s.answer_status,
  examinerNotes: s.examiner_notes,
  problem: (s.extracted_problem ?? "").slice(0, 100),
})), null, 2)}

Return ONLY a JSON array of exactly ${targetCount} IDs from the list above — no markdown, no explanation:
["id1", "id2", ...]`;

        const raw = await callGroq(prompt, undefined, 512);
        const clean = raw.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();
        const arrStart = clean.indexOf("[");
        const arrEnd = clean.lastIndexOf("]");
        let suggestedIds: string[] = [];
        if (arrStart !== -1 && arrEnd > arrStart) {
          try { suggestedIds = JSON.parse(clean.slice(arrStart, arrEnd + 1)) as string[]; } catch { /* fall through */ }
        }
        const verifiedCandidateIds = new Set(candidates.map(s => s.id as string));
        const validIds = suggestedIds.filter(id => verifiedCandidateIds.has(id)).slice(0, targetCount);
        if (validIds.length > 0) {
          finalInterviewIds = validIds;
        }
      } catch (aiErr) {
        logger.warn({ aiErr }, "RAMRI AI suggest failed — using priority-score deterministic fallback");
      }
    }

    // ── Apply classification ──────────────────────────────────────────────────
    const finalSet = new Set(finalInterviewIds);

    // Clear stale suggestion flags
    await db.execute(sql`
      UPDATE ramri_work_samples SET suggested_for_interview = false
      WHERE session_id = ${sessionId} AND case_id = ${caseId} AND suggested_for_interview = true
    `);

    // Mark selected items as interview + approved (≤10 scalar updates, no arrays)
    for (const pickId of finalInterviewIds) {
      await db.execute(sql`
        UPDATE ramri_work_samples
        SET sample_role = 'interview', approved = true, suggested_for_interview = true
        WHERE id = ${pickId} AND session_id = ${sessionId} AND case_id = ${caseId}
      `);
    }

    // Non-selected error items → Observation
    for (const item of candidates) {
      if (finalSet.has(item.id as string)) continue;
      const isError = item.answer_status === "incorrect" || item.answer_status === "partial_correct" || item.answer_status === "unclear";
      if (isError) {
        await db.execute(sql`
          UPDATE ramri_work_samples
          SET sample_role = 'observation', approved = false, suggested_for_interview = false
          WHERE id = ${item.id} AND session_id = ${sessionId} AND case_id = ${caseId}
        `);
      } else {
        // Non-selected correct items → Evidence
        await db.execute(sql`
          UPDATE ramri_work_samples
          SET sample_role = 'evidence', approved = false, suggested_for_interview = false
          WHERE id = ${item.id} AND session_id = ${sessionId} AND case_id = ${caseId}
        `);
      }
    }

    // Return all samples for full frontend reconciliation
    const allUpdated = (await db.execute(sql`SELECT * FROM ramri_work_samples WHERE session_id = ${sessionId} AND case_id = ${caseId}`)).rows;
    return res.json({ suggestedIds: finalInterviewIds, updatedSamples: allUpdated, autoApproved: true });

  } catch (err) {
    logger.error({ err }, "RAMRI suggest-interview-samples failed");
    return res.status(500).json({ error: "Suggestion failed — please try again." });
  }
});

// ── AI: Classify a sample ─────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/samples/:sampleId/classify", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify the sample bank" });
  try {
    const { sampleId } = req.params;
    const { extractedProblem, studentAnswer, visibleWorking } = req.body as { extractedProblem?: string; studentAnswer?: string; visibleWorking?: string };
    const prompt = `You are a mathematics education expert. Classify this student work sample.

Problem: ${extractedProblem ?? ""}
Student answer: ${studentAnswer ?? ""}
Working visible: ${visibleWorking ?? "unknown"}

Return a JSON object (no markdown) with:
{
  "domain": one of [Number Sense, Addition Reasoning, Subtraction Reasoning, Multiplicative Reasoning, Division Reasoning, Fractions, Decimals, Percentages, Ratio and Proportional Reasoning, Algebraic Reasoning, Pattern and Relational Reasoning, Mathematical Problem-Solving, Measurement, Geometry, Spatial Reasoning, Data Interpretation, Statistics, Probability, Money, Time, Other],
  "skill": specific skill name (e.g. "Regrouping", "Fraction Equivalence"),
  "answerStatus": one of [correct, incorrect, partially_correct, unclear],
  "difficulty": one of [introductory, developing, expected, advanced],
  "reasoningFocus": array of 2-3 items from [Conceptual Understanding, Strategy Awareness, Procedural Reasoning, Mathematical Communication, Error Awareness, Verification, Strategy Flexibility, Transfer, Metacognition, Independence],
  "suitability": one of [suitable, limited, strong, excluded],
  "languageDemand": one of [low, moderate, high],
  "estimatedGrade": grade level string e.g. "Year 3", "Grade 4"
}`;
    const text = await callGroq(prompt);
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    const classification = JSON.parse(clean);
    await db.execute(sql`
      UPDATE ramri_work_samples SET
        domain = ${classification.domain},
        skill = ${classification.skill},
        answer_status = ${classification.answerStatus},
        difficulty = ${classification.difficulty},
        reasoning_focus = ${JSON.stringify(classification.reasoningFocus)},
        suitability = ${classification.suitability},
        language_demand = ${classification.languageDemand},
        estimated_grade = ${classification.estimatedGrade},
        updated_at = NOW()
      WHERE id = ${sampleId}
    `);
    const sample = (await db.execute(sql`SELECT * FROM ramri_work_samples WHERE id = ${sampleId} LIMIT 1`)).rows[0];
    return res.json({ sample, classification });
  } catch (err) {
    logger.error({ err }, "RAMRI classify failed");
    return res.status(500).json({ error: "Classification failed" });
  }
});

// ── AI: Extract samples from uploaded documents ───────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/extract-samples", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot run extraction" });
  try {
    const { caseId, sessionId } = req.params;

    // ── 1. Case demographics ─────────────────────────────────────────────────
    const [caseRow] = await db.select({
      studentName: casesTable.studentName,
      dob: casesTable.dob,
      grade: casesTable.grade,
      school: casesTable.school,
      languagePreference: casesTable.languagePreference,
      referralReason: casesTable.referralReason,
    }).from(casesTable).where(eq(casesTable.id, caseId)).limit(1);

    // Compute age from dob
    let ageStr = "unknown";
    if (caseRow?.dob) {
      const dob = new Date(caseRow.dob);
      const today = new Date();
      let yrs = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) yrs--;
      const totalMonths = (today.getFullYear() - dob.getFullYear()) * 12 + today.getMonth() - dob.getMonth() + (today.getDate() < dob.getDate() ? -1 : 0);
      const rem = totalMonths % 12;
      ageStr = rem > 0 ? `${yrs} years, ${rem} months` : `${yrs} years`;
    }

    // ── 2. Completed form responses for this case ────────────────────────────
    const completedAssignments = await db.select({
      id: assignmentsTable.id,
      toolId: assignmentsTable.toolId,
      respondentType: assignmentsTable.respondentType,
      respondentLabel: assignmentsTable.respondentLabel,
    }).from(assignmentsTable).where(
      and(eq(assignmentsTable.caseId, caseId), eq(assignmentsTable.status, "completed"))
    );

    // Demographic-relevant answer keys (case-insensitive partial match)
    const DEMO_KEYS = [
      "grade", "year", "level", "age", "dob", "birth", "school", "language",
      "diagnosis", "diagnos", "concern", "difficulty", "difficulties", "special",
      "support", "learning", "english", "bilingual", "adhd", "asd", "autism",
      "anxiety", "referral", "reason", "strength", "weakness", "subject",
      "reading", "writing", "math", "numeracy", "literacy", "attendance",
      "behaviour", "behavior", "iep", "plan", "adjustment",
    ];

    const formContext: string[] = [];
    if (completedAssignments.length > 0) {
      const assignmentIds = completedAssignments.map(a => a.id);
      const responses = await db.select({
        assignmentId: responsesTable.assignmentId,
        answers: responsesTable.answers,
      }).from(responsesTable).where(inArray(responsesTable.assignmentId, assignmentIds));

      for (const assignment of completedAssignments) {
        const response = responses.find(r => r.assignmentId === assignment.id);
        if (!response?.answers) continue;
        const answers = response.answers as Record<string, unknown>;

        // Filter to demographically relevant fields with short non-empty values
        const relevant = Object.entries(answers)
          .filter(([k, v]) => {
            if (!v || typeof v !== "string") return false;
            if (v.length > 300) return false; // skip essay fields
            const kl = k.toLowerCase();
            return DEMO_KEYS.some(dk => kl.includes(dk));
          })
          .map(([k, v]) => `  ${k}: ${v}`)
          .join("\n");

        if (relevant) {
          const label = assignment.respondentLabel
            ? `${assignment.respondentType} (${assignment.respondentLabel})`
            : (assignment.respondentType ?? "respondent");
          formContext.push(`[${assignment.toolId} — ${label}]\n${relevant}`);
        }
      }
    }

    // ── 3. Documents ─────────────────────────────────────────────────────────
    // Process max 6 per run to avoid HTTP timeouts (each doc needs ~15–45 s of AI).
    // Client passes ?offset=N so subsequent "Extract next batch" clicks advance through all docs.
    // We never filter by extraction_status — docs are always re-extractable so candidates
    // are never lost if the page reloaded before the user saved them.
    const BATCH_SIZE = 6;
    const offset = Math.max(0, parseInt(String(req.query.offset ?? "0"), 10) || 0);
    const allDocsResult = await db.execute(sql`
      SELECT * FROM ramri_work_documents
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `);
    const allDocs = allDocsResult.rows as Array<{
      id: string; file_name: string | null; file_url: string | null; file_type: string | null;
      grade_level: string | null; math_topic: string | null; source_type: string | null;
      teacher_marked: string | null; teacher_comments: string | null; contributor_notes: string | null;
    }>;
    if (allDocs.length === 0) {
      return res.json({ candidates: [], errors: ["No documents found for this session"], remaining: 0 });
    }
    const docs = allDocs.slice(offset, offset + BATCH_SIZE);
    if (docs.length === 0) {
      // offset beyond end — wrap back from the start
      return res.json({ candidates: [], errors: [], remaining: 0, message: "All documents have been processed in this pass. Click Extract to start again from the beginning." });
    }
    const remaining = Math.max(0, allDocs.length - (offset + BATCH_SIZE));

    // ── 4. Extract from each image ───────────────────────────────────────────
    const objectStorage = new ObjectStorageService();
    const candidates: Array<Record<string, unknown>> = [];
    const errors: string[] = [];

    const studentBlock = [
      `- Name: ${caseRow?.studentName ?? "unknown"}`,
      `- Age: ${ageStr}`,
      `- Grade/Year: ${caseRow?.grade ?? "unknown"}`,
      `- School: ${caseRow?.school ?? "unknown"}`,
      `- Language preference: ${caseRow?.languagePreference ?? "english"}`,
      `- Referral reason: ${caseRow?.referralReason ?? "not specified"}`,
    ].join("\n");

    const formBlock = formContext.length > 0
      ? `\nReported information from completed assessments/forms:\n${formContext.join("\n\n")}`
      : "";

    for (const doc of docs) {
      const name = doc.file_name || "Document";
      if (!doc.file_url) {
        errors.push(`${name}: no file attached`);
        continue;
      }
      const nameLower = (doc.file_name ?? "").toLowerCase();
      const typeLower = (doc.file_type ?? "").toLowerCase();
      const isPdf =
        typeLower === "pdf" || typeLower === "application/pdf" ||
        nameLower.endsWith(".pdf");
      const isDocx =
        typeLower.includes("wordprocessingml") || typeLower.includes("msword") ||
        typeLower === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        nameLower.endsWith(".docx") || nameLower.endsWith(".doc");
      const isImage =
        typeLower.startsWith("image/") ||
        nameLower.endsWith(".jpg") || nameLower.endsWith(".jpeg") ||
        nameLower.endsWith(".png") || nameLower.endsWith(".heic") ||
        nameLower.endsWith(".heif") || nameLower.endsWith(".webp");

      try {
        const signedUrl = await objectStorage.getObjectEntitySignedDownloadURL(doc.file_url);

        const docBlock = [
          `- Document topic: ${doc.math_topic ?? "general mathematics"}`,
          `- Document grade level noted by contributor: ${doc.grade_level ?? "not specified"}`,
          `- Source: ${doc.source_type ?? "unknown"}`,
          `- Teacher marked: ${doc.teacher_marked ?? "unknown"}`,
          `- Teacher comments: ${doc.teacher_comments ?? "none"}`,
          `- Contributor notes: ${doc.contributor_notes ?? "none"}`,
        ].join("\n");

        // ── Download file ──────────────────────────────────────────────────────
        const fileResponse = await fetch(signedUrl);
        if (!fileResponse.ok) throw new Error(`Failed to download file: ${fileResponse.status}`);
        const fileBuf = Buffer.from(await fileResponse.arrayBuffer());

        let extractedText = "";
        let sourceLabel = "document";

        if (isPdf) {
          extractedText = await pdfToText(fileBuf);
          sourceLabel = "PDF";
          if (extractedText.length < 20) {
            // Scanned PDF — fall through to vision
            const mimeType = "image/png"; // treat as image for vision
            // Try rendering first page as image via pdftotext isn't enough — use vision on the raw PDF
            // For scanned PDFs we encode the raw PDF bytes and send to vision model
            const pdfBase64 = fileBuf.toString("base64");
            const dataUrl = `data:application/pdf;base64,${pdfBase64}`;
            // Groq vision doesn't handle PDF natively; instead surface a useful error
            errors.push(`${name}: this PDF appears to be a scanned image. Please re-upload as a JPEG or PNG photo instead.`);
            continue;
          }
        } else if (isDocx) {
          extractedText = await docxToText(fileBuf);
          sourceLabel = "Word document";
          if (extractedText.trim().length < 10) {
            errors.push(`${name}: Word document appears to be empty or unreadable`);
            continue;
          }
        } else if (isImage) {
          // Detect MIME type
          let mimeType = typeLower.startsWith("image/") ? typeLower : "image/jpeg";
          if (nameLower.endsWith(".png")) mimeType = "image/png";
          else if (nameLower.endsWith(".heic") || nameLower.endsWith(".heif")) mimeType = "image/heic";
          else if (nameLower.endsWith(".webp")) mimeType = "image/webp";
          extractedText = await imageToText(fileBuf, mimeType);
          sourceLabel = "photo";
          if (extractedText.trim().length < 10) {
            errors.push(`${name}: could not read any text from the image — please ensure the photo is clear and well-lit`);
            continue;
          }
        } else {
          errors.push(`${name}: unsupported file type — please upload a PDF, Word document, or photo (JPEG/PNG)`);
          continue;
        }

        const textPrompt = `You are reviewing a student's mathematics work extracted from a ${sourceLabel}.

STUDENT PROFILE (use this to calibrate your interpretation of difficulty, expected performance, and any error patterns):
${studentBlock}${formBlock}

DOCUMENT DETAILS:
${docBlock}

DOCUMENT TEXT (extracted from ${sourceLabel} — layout preserved):
${extractedText.slice(0, 8000)}

Using the student's age, grade, known difficulties, and referral context above, extract ONLY standalone, self-contained maths problems/tasks visible in the text above.

STRICT EXCLUSION RULES — do NOT extract any item that:
- References another problem (e.g. contains "both problems", "Question 1", "the above", "Problem A", "these problems", "either problem", "each problem")
- Is a teacher instruction, lesson heading, or page label (e.g. "Complete the following", "Name:", "Date:", "Worksheet 3")
- Is a cross-problem reflection or discussion question (e.g. "How do you know X works for both?", "What did you notice about...?", "Compare your answers")
- Is a meta-cognitive prompt that only makes sense in context of a specific prior problem
- Contains no mathematical content (numbers, operators, shapes, fractions, measurement units)

A valid problem must stand alone — an examiner must be able to show it to a student without needing any other problem on the page for it to make sense.

For each valid problem return an object with exactly these keys:
- extractedProblem: the exact problem or task as shown (e.g. "368 + 157 = ___")
- studentAnswer: exactly what the student wrote as their answer (empty string if blank or not shown)
- visibleWorking: "yes", "no", or "partial" — whether method/steps are shown
- answerStatus: "correct", "incorrect", "partially_correct", or "unclear" — judge against the student's expected grade level
- teacherCorrection: what the teacher wrote/marked if visible, or null
- examinerNotes: a brief pre-interview observation based solely on what is VISIBLE in the written work — phrase it as what the work shows (e.g. "The written work shows the student used a column method but misaligned the tens column"), not as a description of student behaviour or intent. Flag grade-level mismatches or error patterns visible in the script that are relevant to the referral concern. Never infer what the student was thinking — only describe what is observable on the page.
- domain: one of [Number Sense, Addition Reasoning, Subtraction Reasoning, Multiplicative Reasoning, Division Reasoning, Fractions, Decimals, Percentages, Ratio and Proportional Reasoning, Algebraic Reasoning, Pattern and Relational Reasoning, Mathematical Problem-Solving, Measurement, Geometry, Spatial Reasoning, Data Interpretation, Statistics, Probability, Money, Time, Other]
- skill: specific skill name (e.g. "Regrouping", "Fraction Equivalence")
- answerStatus: one of [correct, incorrect, partially_correct, unclear]
- difficulty: one of [introductory, developing, expected, advanced] — calibrated against the student's grade level from the profile above
- reasoningFocus: array of 2–3 items from [Conceptual Understanding, Strategy Awareness, Procedural Reasoning, Mathematical Communication, Error Awareness, Verification, Strategy Flexibility, Transfer, Metacognition, Independence] — the cognitive dimensions most relevant to this problem
- suitability: one of [suitable, limited, strong, excluded] — how useful this sample would be for a RAMRI interview
- languageDemand: one of [low, moderate, high]
- estimatedGrade: grade level string e.g. "Year 3", "Grade 4"

Return ONLY a valid JSON array (no markdown fences, no extra text). If no valid standalone maths problems are visible return [].`;

        const raw = await callDeepSeekText(textPrompt, undefined, 8192);
        // Strip all markdown code fences, then find the outermost JSON array
        let clean = raw.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();
        // If the model prefixed text before the array, extract from first '[' to last ']'
        const arrStart = clean.indexOf("[");
        const arrEnd = clean.lastIndexOf("]");
        if (arrStart !== -1 && arrEnd > arrStart) {
          clean = clean.slice(arrStart, arrEnd + 1);
        }
        let extracted: Array<Record<string, string | null>> = [];
        try { extracted = JSON.parse(clean); } catch {
          const preview = raw.slice(0, 300).replace(/\n/g, " ");
          errors.push(`${name}: AI returned unparseable response — raw: ${preview}`);
          continue;
        }
        for (const item of extracted) {
          // Hard filter: reject any candidate that references another problem —
          // these are follow-up/meta questions that slipped past the AI instructions.
          if (isCrossReferenceItem(String(item.extractedProblem ?? ""))) continue;
          candidates.push({
            ...item,
            sourceDocId: doc.id,
            sourceDocName: name,
            gradeLevel: doc.grade_level,
            mathTopic: doc.math_topic,
          });
        }

        try { await db.execute(sql`UPDATE ramri_work_documents SET extraction_status = 'extracted' WHERE id = ${doc.id}`); } catch { /* non-fatal */ }
      } catch (err) {
        errors.push(`${name}: ${err instanceof Error ? err.message.slice(0, 160) : "extraction failed"}`);
      }
    }
    return res.json({ candidates, errors, remaining });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, msg }, "RAMRI extract-samples failed");
    return res.status(500).json({ error: `Extraction failed: ${msg}` });
  }
});

// ── Choice Sets ───────────────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/choice-sets", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify choice sets" });
  try {
    const { caseId, sessionId } = req.params;
    const { title, choiceType, targetDomain, studentPrompt, displayOrder, sampleIds } = req.body as { title?: string; choiceType?: string; targetDomain?: string; studentPrompt?: string; displayOrder?: number; sampleIds?: string[] };
    const id = nanoid();
    await db.execute(sql`
      INSERT INTO ramri_choice_sets (id, session_id, case_id, title, choice_type, target_domain, student_prompt, display_order, created_by, created_at)
      VALUES (${id}, ${sessionId}, ${caseId}, ${title ?? null}, ${choiceType ?? 'open'}, ${targetDomain ?? null}, ${studentPrompt ?? null}, ${displayOrder ?? 0}, ${req.userId ?? null}, NOW())
    `);
    if (sampleIds?.length) {
      for (let i = 0; i < sampleIds.length; i++) {
        await db.execute(sql`INSERT INTO ramri_choice_set_items (id, choice_set_id, work_sample_id, display_order) VALUES (${nanoid()}, ${id}, ${sampleIds[i]}, ${i})`);
      }
    }
    const cs = (await db.execute(sql`SELECT cs.*, COALESCE(json_agg(csi ORDER BY csi.display_order) FILTER (WHERE csi.id IS NOT NULL), '[]') AS items FROM ramri_choice_sets cs LEFT JOIN ramri_choice_set_items csi ON csi.choice_set_id = cs.id WHERE cs.id = ${id} GROUP BY cs.id`)).rows[0];
    return res.json({ choiceSet: cs });
  } catch (err) {
    logger.error({ err }, "RAMRI choice set create failed");
    return res.status(500).json({ error: "Failed to create choice set" });
  }
});

router.patch("/cases/:caseId/ramri/sessions/:sessionId/choice-sets/:setId", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify choice sets" });
  try {
    const { setId } = req.params;
    const { title, choiceType, targetDomain, studentPrompt, displayOrder, sampleIds } = req.body;
    await db.execute(sql`
      UPDATE ramri_choice_sets SET
        title = COALESCE(${title ?? null}, title),
        choice_type = COALESCE(${choiceType ?? null}, choice_type),
        target_domain = COALESCE(${targetDomain ?? null}, target_domain),
        student_prompt = COALESCE(${studentPrompt ?? null}, student_prompt),
        display_order = COALESCE(${displayOrder ?? null}, display_order)
      WHERE id = ${setId}
    `);
    if (sampleIds !== undefined) {
      await db.execute(sql`DELETE FROM ramri_choice_set_items WHERE choice_set_id = ${setId}`);
      for (let i = 0; i < sampleIds.length; i++) {
        await db.execute(sql`INSERT INTO ramri_choice_set_items (id, choice_set_id, work_sample_id, display_order) VALUES (${nanoid()}, ${setId}, ${sampleIds[i]}, ${i})`);
      }
    }
    const cs = (await db.execute(sql`SELECT cs.*, COALESCE(json_agg(csi ORDER BY csi.display_order) FILTER (WHERE csi.id IS NOT NULL), '[]') AS items FROM ramri_choice_sets cs LEFT JOIN ramri_choice_set_items csi ON csi.choice_set_id = cs.id WHERE cs.id = ${setId} GROUP BY cs.id`)).rows[0];
    return res.json({ choiceSet: cs });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update choice set" });
  }
});

router.delete("/cases/:caseId/ramri/sessions/:sessionId/choice-sets/:setId", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify choice sets" });
  try {
    const { setId } = req.params;
    await db.execute(sql`DELETE FROM ramri_choice_set_items WHERE choice_set_id = ${setId}`);
    await db.execute(sql`DELETE FROM ramri_choice_sets WHERE id = ${setId}`);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete choice set" });
  }
});

// ── AI: Generate all choice sets from approved samples ────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/generate-choice-sets", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot generate choice sets" });
  try {
    const { caseId, sessionId } = req.params;
    const samples = (await db.execute(sql`
      SELECT id, extracted_problem, student_answer, visible_working, answer_status,
             domain, skill, difficulty, examiner_notes
      FROM ramri_work_samples
      WHERE session_id = ${sessionId} AND approved = true AND sample_role = 'interview'
      ORDER BY created_at ASC
    `)).rows as Array<Record<string, string | null>>;

    if (samples.length === 0) return res.status(400).json({ error: "No approved interview-role samples to group. Make sure samples have the Interview role set." });

    const prompt = `You are a clinical mathematics assessment specialist designing student choice sets for a ReMynd Authentic Mathematical Reasoning Interview (RAMRI).

Approved work samples:
${JSON.stringify(samples.map(s => ({ id: s.id, problem: s.extracted_problem, answer: s.student_answer, answerStatus: s.answer_status, domain: s.domain, skill: s.skill, difficulty: s.difficulty, notes: s.examiner_notes })), null, 2)}

Group these samples into 2–4 choice sets of 2–3 samples each. Rules:
- Each set should have diversity: mix correct/incorrect answers, mix domains/skills where possible
- Avoid grouping samples that are too similar (same operation, same difficulty)
- Each set should give the student meaningful choice
- Generate a short examiner-facing title and a natural student-facing prompt for each set

Return ONLY valid JSON (no markdown):
[
  {
    "title": "Set A — Operations Mix",
    "choiceType": "open",
    "studentPrompt": "Which of these problems would you like to tell me about?",
    "rationale": "one sentence why these were grouped",
    "sampleIds": ["id1", "id2", "id3"]
  }
]`;

    const raw = await callGroq(prompt, undefined, 2048);
    const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
    const groups = JSON.parse(clean) as Array<{
      title: string; choiceType: string; studentPrompt: string; rationale: string; sampleIds: string[];
    }>;

    // Delete existing AI-generated sets for this session before creating new ones
    const existingSets = (await db.execute(sql`SELECT id FROM ramri_choice_sets WHERE session_id = ${sessionId} AND created_by = 'ai'`)).rows as Array<{ id: string }>;
    for (const s of existingSets) {
      await db.execute(sql`DELETE FROM ramri_choice_set_items WHERE choice_set_id = ${s.id}`);
      await db.execute(sql`DELETE FROM ramri_choice_sets WHERE id = ${s.id}`);
    }

    const created = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const id = nanoid();

      // Generate one novel transfer/control problem matched to this set's domain & difficulty
      const setMembers = g.sampleIds
        .map(sid => samples.find(s => s.id === sid))
        .filter(Boolean) as Array<Record<string, string | null>>;
      let controlProblem: Record<string, string> | null = null;
      if (setMembers.length > 0) {
        try {
          const ctrlPrompt = `You are a specialist mathematics assessment designer creating a transfer probe for a RAMRI (Authentic Mathematical Reasoning Interview).

The student choice set contains these problems from the student's own work:
${setMembers.map(s => `- Domain: ${s.domain}, Skill: ${s.skill}, Difficulty: ${s.difficulty}, Problem: "${s.extracted_problem}", Answer status: ${s.answer_status}`).join("\n")}

Design ONE novel, self-contained maths problem that:
- Targets the SAME domain and skill(s) as the problems above
- Is at the SAME or ONE level harder difficulty
- Uses DIFFERENT numbers, context, or surface structure so the student cannot recall a rehearsed answer
- Can be read aloud and understood without any visual aids or prior work
- Has a single unambiguous correct answer the examiner can verify immediately

Return ONLY valid JSON (no markdown fences):
{
  "problem": "the problem text as it would be shown to the student",
  "expectedAnswer": "the correct answer",
  "domain": "domain name",
  "skill": "specific skill",
  "difficulty": "introductory|developing|expected|advanced",
  "rationale": "one sentence — why this probes transfer of the skills in this set"
}`;
          const ctrlRaw = await callDeepSeekText(ctrlPrompt, undefined, 512);
          const ctrlClean = ctrlRaw.replace(/```(?:json)?\n?/g, "").replace(/\n?```/g, "").trim();
          const parsed = JSON.parse(ctrlClean);
          if (parsed.problem && parsed.expectedAnswer) controlProblem = parsed;
        } catch {
          // non-fatal — set proceeds without control problem
        }
      }

      await db.execute(sql`
        INSERT INTO ramri_choice_sets (id, session_id, case_id, title, choice_type, student_prompt, display_order, created_by, control_problem, created_at)
        VALUES (${id}, ${sessionId}, ${caseId}, ${g.title}, ${g.choiceType ?? "open"}, ${g.studentPrompt ?? null}, ${i}, 'ai', ${controlProblem ? JSON.stringify(controlProblem) : null}, NOW())
      `);
      const validIds = g.sampleIds.filter(sid => samples.some(s => s.id === sid));
      for (let j = 0; j < validIds.length; j++) {
        await db.execute(sql`INSERT INTO ramri_choice_set_items (id, choice_set_id, work_sample_id, display_order) VALUES (${nanoid()}, ${id}, ${validIds[j]}, ${j})`);
      }
      const cs = (await db.execute(sql`SELECT cs.*, COALESCE(json_agg(csi ORDER BY csi.display_order) FILTER (WHERE csi.id IS NOT NULL), '[]') AS items FROM ramri_choice_sets cs LEFT JOIN ramri_choice_set_items csi ON csi.choice_set_id = cs.id WHERE cs.id = ${id} GROUP BY cs.id`)).rows[0];
      created.push(cs);
    }
    return res.json({ choiceSets: created });
  } catch (err) {
    logger.error({ err }, "RAMRI generate choice sets failed");
    return res.status(500).json({ error: "Failed to generate choice sets" });
  }
});

// ── AI: Recommend choice set ──────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/recommend-choice-set", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify choice sets" });
  try {
    const { sessionId } = req.params;
    const { targetDomain } = req.body as { targetDomain?: string };
    const rawSamples = (await db.execute(sql`SELECT id, extracted_problem, domain, skill, answer_status, suitability, difficulty FROM ramri_work_samples WHERE session_id = ${sessionId} AND approved = true ORDER BY created_at ASC`)).rows;
    // Strip any cross-reference items that slipped into the bank before extraction filtering was tightened
    const samples = rawSamples.filter(s => !isCrossReferenceItem(String((s as Record<string,unknown>).extracted_problem ?? "")));
    const prompt = `You are a clinical mathematics assessment specialist. From the following approved work samples, recommend 2-4 samples for a student choice set${targetDomain ? ` focusing on: ${targetDomain}` : ""}.

Samples:
${JSON.stringify(samples, null, 2)}

Return JSON only (no markdown):
{
  "recommendedIds": ["id1", "id2", ...],
  "rationale": "brief explanation"
}`;
    const text = await callGroq(prompt);
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    return res.json(JSON.parse(clean));
  } catch (err) {
    logger.error({ err }, "RAMRI recommend failed");
    return res.status(500).json({ error: "Recommendation failed" });
  }
});

// ── Sample Selections (during interview) ──────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/selections", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { choiceSetId, workSampleId, offeredSampleIds, selectionLatencyLabel, selectionBehavior, recognition, rememberedCompletion, familiarityNotes } = req.body;
    // Prevent selecting the exact same work sample twice in the same set, but allow
    // a different problem to be selected (examiner trying another due to student difficulty).
    if (choiceSetId && workSampleId) {
      const dupe = await db.execute(sql`SELECT id FROM ramri_sample_selections WHERE session_id = ${sessionId} AND choice_set_id = ${choiceSetId} AND work_sample_id = ${workSampleId} LIMIT 1`);
      if (dupe.rows.length > 0) return res.status(409).json({ error: "This problem is already selected in this set" });
    }
    const seqRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ramri_sample_selections WHERE session_id = ${sessionId}`);
    const seqNum = Number((seqRes.rows[0] as { cnt: string })?.cnt ?? 0) + 1;
    const id = nanoid();
    await db.execute(sql`
      INSERT INTO ramri_sample_selections (id, session_id, choice_set_id, work_sample_id, offered_sample_ids, selection_latency_label, selection_behavior, recognition, remembered_completion, familiarity_notes, sequence_number, created_at)
      VALUES (${id}, ${sessionId}, ${choiceSetId ?? null}, ${workSampleId}, ${offeredSampleIds ? JSON.stringify(offeredSampleIds) : null}, ${selectionLatencyLabel ?? null}, ${selectionBehavior ?? null}, ${recognition ?? null}, ${rememberedCompletion ?? null}, ${familiarityNotes ?? null}, ${seqNum}, NOW())
    `);
    const sel = (await db.execute(sql`SELECT * FROM ramri_sample_selections WHERE id = ${id} LIMIT 1`)).rows[0];
    return res.json({ selection: sel });
  } catch (err) {
    logger.error({ err }, "RAMRI selection create failed");
    return res.status(500).json({ error: "Failed to record selection" });
  }
});

router.patch("/cases/:caseId/ramri/sessions/:sessionId/selections/:selId", authMiddleware, async (req, res) => {
  try {
    const { selId } = req.params;
    const { selectionLatencyLabel, selectionBehavior, recognition, rememberedCompletion, familiarityNotes } = req.body;
    await db.execute(sql`
      UPDATE ramri_sample_selections SET
        selection_latency_label = COALESCE(${selectionLatencyLabel ?? null}, selection_latency_label),
        selection_behavior = COALESCE(${selectionBehavior ?? null}, selection_behavior),
        recognition = COALESCE(${recognition ?? null}, recognition),
        remembered_completion = COALESCE(${rememberedCompletion ?? null}, remembered_completion),
        familiarity_notes = COALESCE(${familiarityNotes ?? null}, familiarity_notes)
      WHERE id = ${selId}
    `);
    const sel = (await db.execute(sql`SELECT * FROM ramri_sample_selections WHERE id = ${selId} LIMIT 1`)).rows[0];
    return res.json({ selection: sel });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update selection" });
  }
});

router.delete("/cases/:caseId/ramri/sessions/:sessionId/selections/:selId", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot delete selections" });
  try {
    const { sessionId, selId } = req.params;
    // Find this selection so we can also sweep any duplicates for the same choice set
    const target = (await db.execute(sql`SELECT choice_set_id FROM ramri_sample_selections WHERE id = ${selId} LIMIT 1`)).rows[0] as { choice_set_id: string | null } | undefined;
    // Collect all IDs to delete: the named one + any duplicates sharing the same choice_set
    let idsToDelete: string[] = [selId];
    if (target?.choice_set_id) {
      const dupes = await db.execute(sql`SELECT id FROM ramri_sample_selections WHERE session_id = ${sessionId} AND choice_set_id = ${target.choice_set_id} AND id != ${selId}`);
      idsToDelete = [...idsToDelete, ...(dupes.rows as { id: string }[]).map(r => r.id)];
    }
    for (const id of idsToDelete) {
      await db.execute(sql`DELETE FROM ramri_interview_responses WHERE sample_selection_id = ${id}`);
      await db.execute(sql`DELETE FROM ramri_ownership_context WHERE sample_selection_id = ${id}`);
      await db.execute(sql`DELETE FROM ramri_transfer_prompts WHERE sample_selection_id = ${id}`);
      await db.execute(sql`DELETE FROM ramri_behavioral_obs WHERE sample_selection_id = ${id}`);
      await db.execute(sql`DELETE FROM ramri_sample_selections WHERE id = ${id}`);
    }
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "RAMRI selection delete failed");
    return res.status(500).json({ error: "Failed to delete selection" });
  }
});

// ── Ownership Context ─────────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/selections/:selId/ownership", authMiddleware, async (req, res) => {
  try {
    const { selId } = req.params;
    const { remembersProblem, reportedIndependence, assistanceSource, exampleShown, supportsUsed, completionSetting, directQuote, examinerNotes } = req.body;
    await db.execute(sql`DELETE FROM ramri_ownership_context WHERE sample_selection_id = ${selId}`);
    const id = nanoid();
    await db.execute(sql`
      INSERT INTO ramri_ownership_context (id, sample_selection_id, remembers_problem, reported_independence, assistance_source, example_shown, supports_used, completion_setting, direct_quote, examiner_notes)
      VALUES (${id}, ${selId}, ${remembersProblem ?? null}, ${reportedIndependence ?? null}, ${assistanceSource ?? null}, ${exampleShown ?? null}, ${supportsUsed ? JSON.stringify(supportsUsed) : null}, ${completionSetting ?? null}, ${directQuote ?? null}, ${examinerNotes ?? null})
    `);
    const ctx = (await db.execute(sql`SELECT * FROM ramri_ownership_context WHERE id = ${id} LIMIT 1`)).rows[0];
    return res.json({ context: ctx });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save ownership context" });
  }
});

// ── Interview Responses ───────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/selections/:selId/responses", authMiddleware, async (req, res) => {
  try {
    const { selId } = req.params;
    const { questionType, generatedQuestion, approvedQuestion, responseMode, directQuote, examinerParaphrase, examinerInterpretation, skipped, notObserved } = req.body;
    const seqRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ramri_interview_responses WHERE sample_selection_id = ${selId}`);
    const seqNum = Number((seqRes.rows[0] as { cnt: string })?.cnt ?? 0) + 1;
    const id = nanoid();
    await db.execute(sql`
      INSERT INTO ramri_interview_responses (id, sample_selection_id, question_type, generated_question, approved_question, response_mode, direct_quote, examiner_paraphrase, examiner_interpretation, skipped, not_observed, sequence_number, created_at)
      VALUES (${id}, ${selId}, ${questionType ?? null}, ${generatedQuestion ?? null}, ${approvedQuestion ?? null}, ${responseMode ?? null}, ${directQuote ?? null}, ${examinerParaphrase ?? null}, ${examinerInterpretation ?? null}, ${skipped ?? false}, ${notObserved ?? false}, ${seqNum}, NOW())
    `);
    const resp = (await db.execute(sql`SELECT * FROM ramri_interview_responses WHERE id = ${id} LIMIT 1`)).rows[0];
    return res.json({ response: resp });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save response" });
  }
});

router.patch("/cases/:caseId/ramri/sessions/:sessionId/selections/:selId/responses/:respId", authMiddleware, async (req, res) => {
  try {
    const { respId } = req.params;
    const { approvedQuestion, responseMode, directQuote, examinerParaphrase, examinerInterpretation, skipped, notObserved } = req.body;
    await db.execute(sql`
      UPDATE ramri_interview_responses SET
        approved_question = COALESCE(${approvedQuestion ?? null}, approved_question),
        response_mode = COALESCE(${responseMode ?? null}, response_mode),
        direct_quote = COALESCE(${directQuote ?? null}, direct_quote),
        examiner_paraphrase = COALESCE(${examinerParaphrase ?? null}, examiner_paraphrase),
        examiner_interpretation = COALESCE(${examinerInterpretation ?? null}, examiner_interpretation),
        skipped = COALESCE(${skipped ?? null}, skipped),
        not_observed = COALESCE(${notObserved ?? null}, not_observed)
      WHERE id = ${respId}
    `);
    const resp = (await db.execute(sql`SELECT * FROM ramri_interview_responses WHERE id = ${respId} LIMIT 1`)).rows[0];
    return res.json({ response: resp });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update response" });
  }
});

// ── AI: Generate questions for a sample ───────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/selections/:selId/generate-questions", authMiddleware, async (req, res) => {
  try {
    const { selId } = req.params;
    const { domain, skill, extractedProblem, studentAnswer, answerStatus, visibleWorking, teacherCorrection, reportedIndependence, ageGroup } = req.body as Record<string, string>;
    const prompt = `You are an expert educational psychologist conducting a ReMynd Authentic Mathematical Reasoning Interview (RAMRI). Generate a structured set of interview questions for a student who has completed this mathematics work.

Problem: ${extractedProblem ?? ""}
Student answer: ${studentAnswer ?? ""}
Answer status: ${answerStatus ?? "unknown"}
Domain: ${domain ?? "general"}
Skill: ${skill ?? "general"}
Visible working: ${visibleWorking ?? "unknown"}
Teacher correction: ${teacherCorrection ?? "none"}
Reported independence: ${reportedIndependence ?? "unknown"}
Age group: ${ageGroup ?? "primary"}

IMPORTANT rules:
- Questions must be brief, natural, and non-threatening
- Do not ask the student to redo the problem
- Focus on understanding REASONING, not just correctness
- Use "can you show me" language, not "tell me why you were wrong"
- Include universal opening questions, then conceptual/strategy/verification questions

Return JSON only (no markdown):
{
  "questions": [
    {
      "type": "universal|conceptual|strategy|verification|error_awareness|metacognition",
      "question": "the actual question text",
      "purpose": "brief note on what this explores"
    }
  ]
}
Generate 6-8 questions.`;
    const text = await callGroq(prompt, "You are a skilled educational assessment specialist.", 1500);
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    return res.json(JSON.parse(clean));
  } catch (err) {
    logger.error({ err }, "RAMRI generate questions failed");
    return res.status(500).json({ error: "Failed to generate questions" });
  }
});

// ── AI: Generate transfer prompt ──────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/selections/:selId/generate-transfer", authMiddleware, async (req, res) => {
  try {
    const { domain, skill, extractedProblem, studentAnswer, transferLevel } = req.body as Record<string, string>;
    const levelDesc: Record<string, string> = {
      A: "Verbal variation — ask what would change without requiring a calculation",
      B: "Partial demonstration — ask the student to show only the first step",
      C: "Similar complete problem — offer a closely related item using the same concept",
      D: "Different representation — move from written calculation to visual, verbal or practical",
    };
    const prompt = `Generate a RAMRI transfer prompt for a student.

Original problem: ${extractedProblem ?? ""}
Student answer: ${studentAnswer ?? ""}
Domain: ${domain ?? ""}
Skill: ${skill ?? ""}
Transfer Level: ${transferLevel ?? "A"} — ${levelDesc[transferLevel ?? "A"] ?? ""}

Return JSON only (no markdown):
{
  "prompt": "the transfer prompt text shown to the student",
  "examinerNote": "brief note for the examiner on what to watch for",
  "level": "${transferLevel ?? "A"}"
}`;
    const text = await callGroq(prompt);
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    return res.json(JSON.parse(clean));
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate transfer prompt" });
  }
});

// ── Transfer Prompts ──────────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/selections/:selId/transfer", authMiddleware, async (req, res) => {
  try {
    const { selId } = req.params;
    const { transferLevel, generatedPrompt, approvedPrompt, studentResponse, supportLevel, transferRating, notes } = req.body;
    await db.execute(sql`DELETE FROM ramri_transfer_prompts WHERE sample_selection_id = ${selId}`);
    const id = nanoid();
    await db.execute(sql`
      INSERT INTO ramri_transfer_prompts (id, sample_selection_id, transfer_level, generated_prompt, approved_prompt, student_response, support_level, transfer_rating, notes)
      VALUES (${id}, ${selId}, ${transferLevel ?? null}, ${generatedPrompt ?? null}, ${approvedPrompt ?? null}, ${studentResponse ?? null}, ${supportLevel ?? null}, ${transferRating ?? null}, ${notes ?? null})
    `);
    const tp = (await db.execute(sql`SELECT * FROM ramri_transfer_prompts WHERE id = ${id} LIMIT 1`)).rows[0];
    return res.json({ transferPrompt: tp });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save transfer prompt" });
  }
});

// ── Domain Ratings ────────────────────────────────────────────────────────────
router.put("/cases/:caseId/ramri/sessions/:sessionId/ratings", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify domain ratings" });
  try {
    const { sessionId } = req.params;
    const { ratings } = req.body as { ratings: Array<{ domain: string; rating: number | null; evidenceStrength?: string; supportingEvidence?: string }> };
    for (const r of ratings) {
      const existing = (await db.execute(sql`SELECT id FROM ramri_domain_ratings WHERE session_id = ${sessionId} AND domain = ${r.domain} LIMIT 1`)).rows[0] as { id?: string } | undefined;
      if (existing?.id) {
        await db.execute(sql`
          UPDATE ramri_domain_ratings SET rating = ${r.rating ?? null}, evidence_strength = ${r.evidenceStrength ?? null}, supporting_evidence = ${r.supportingEvidence ?? null}
          WHERE id = ${existing.id}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO ramri_domain_ratings (id, session_id, domain, rating, evidence_strength, supporting_evidence, examiner_override)
          VALUES (${nanoid()}, ${sessionId}, ${r.domain}, ${r.rating ?? null}, ${r.evidenceStrength ?? null}, ${r.supportingEvidence ?? null}, false)
        `);
      }
    }
    const allRatings = (await db.execute(sql`SELECT * FROM ramri_domain_ratings WHERE session_id = ${sessionId}`)).rows;
    return res.json({ ratings: allRatings });
  } catch (err) {
    logger.error({ err }, "RAMRI ratings update failed");
    return res.status(500).json({ error: "Failed to save ratings" });
  }
});

// ── Behavioral Observations ───────────────────────────────────────────────────
router.put("/cases/:caseId/ramri/sessions/:sessionId/selections/:selId/observations", authMiddleware, async (req, res) => {
  try {
    const { selId } = req.params;
    const { anxietyRating, confidenceRating, engagementRating, reassuranceRequired, communicationMode, notes } = req.body;
    const existing = (await db.execute(sql`SELECT id FROM ramri_behavioral_obs WHERE sample_selection_id = ${selId} LIMIT 1`)).rows[0] as { id?: string } | undefined;
    if (existing?.id) {
      await db.execute(sql`
        UPDATE ramri_behavioral_obs SET anxiety_rating = ${anxietyRating ?? null}, confidence_rating = ${confidenceRating ?? null}, engagement_rating = ${engagementRating ?? null}, reassurance_required = ${reassuranceRequired ?? null}, communication_mode = ${communicationMode ? JSON.stringify(communicationMode) : null}, notes = ${notes ?? null}
        WHERE id = ${existing.id}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO ramri_behavioral_obs (id, sample_selection_id, anxiety_rating, confidence_rating, engagement_rating, reassurance_required, communication_mode, notes)
        VALUES (${nanoid()}, ${selId}, ${anxietyRating ?? null}, ${confidenceRating ?? null}, ${engagementRating ?? null}, ${reassuranceRequired ?? null}, ${communicationMode ? JSON.stringify(communicationMode) : null}, ${notes ?? null})
      `);
    }
    const obs = (await db.execute(sql`SELECT * FROM ramri_behavioral_obs WHERE sample_selection_id = ${selId} LIMIT 1`)).rows[0];
    return res.json({ observations: obs });
  } catch (err) {
    return res.status(500).json({ error: "Failed to save observations" });
  }
});

// ── Get all interview data for a selection ────────────────────────────────────
router.get("/cases/:caseId/ramri/sessions/:sessionId/selections/:selId", authMiddleware, async (req, res) => {
  try {
    const { selId } = req.params;
    const [selection, ownership, responses, transfer, obs] = await Promise.all([
      db.execute(sql`SELECT * FROM ramri_sample_selections WHERE id = ${selId} LIMIT 1`),
      db.execute(sql`SELECT * FROM ramri_ownership_context WHERE sample_selection_id = ${selId} LIMIT 1`),
      db.execute(sql`SELECT * FROM ramri_interview_responses WHERE sample_selection_id = ${selId} ORDER BY sequence_number ASC`),
      db.execute(sql`SELECT * FROM ramri_transfer_prompts WHERE sample_selection_id = ${selId} LIMIT 1`),
      db.execute(sql`SELECT * FROM ramri_behavioral_obs WHERE sample_selection_id = ${selId} LIMIT 1`),
    ]);
    return res.json({
      selection: selection.rows[0] ?? null,
      ownership: ownership.rows[0] ?? null,
      responses: responses.rows,
      transfer: transfer.rows[0] ?? null,
      observations: obs.rows[0] ?? null,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch selection data" });
  }
});

// ── Generate Report ───────────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/report", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot generate the report" });
  try {
    const { caseId, sessionId } = req.params;
    const [session, selections, ratings, allResponses, evidenceRows, unusedApprovedRows, docsRows] = await Promise.all([
      db.execute(sql`SELECT * FROM ramri_sessions WHERE id = ${sessionId} LIMIT 1`),
      db.execute(sql`SELECT sels.*, ws.extracted_problem, ws.domain, ws.skill, ws.answer_status FROM ramri_sample_selections sels JOIN ramri_work_samples ws ON ws.id = sels.work_sample_id WHERE sels.session_id = ${sessionId} ORDER BY sels.sequence_number ASC`),
      db.execute(sql`SELECT * FROM ramri_domain_ratings WHERE session_id = ${sessionId}`),
      db.execute(sql`SELECT ir.* FROM ramri_interview_responses ir JOIN ramri_sample_selections sels ON sels.id = ir.sample_selection_id WHERE sels.session_id = ${sessionId} ORDER BY ir.sequence_number ASC`),
      db.execute(sql`SELECT domain, skill, answer_status, sample_role, examiner_notes FROM ramri_work_samples WHERE session_id = ${sessionId} AND sample_role IN ('evidence', 'observation') ORDER BY domain ASC, created_at ASC`),
      // Approved items that were never presented in the interview (approved but not in any selection)
      db.execute(sql`SELECT domain, skill, difficulty, answer_status, extracted_problem, examiner_notes FROM ramri_work_samples WHERE session_id = ${sessionId} AND case_id = ${caseId} AND approved = true AND sample_role = 'interview' AND id NOT IN (SELECT work_sample_id FROM ramri_sample_selections WHERE session_id = ${sessionId})`),
      // Uploaded documents — we'll extract text from PDFs/Word docs to include in the report
      db.execute(sql`SELECT id, file_url, file_name, file_type, source_type, math_topic, contributor_notes FROM ramri_work_documents WHERE session_id = ${sessionId} ORDER BY created_at ASC`),
    ]);

    // ── Extract text from uploaded documents ──────────────────────────────────
    const docRows = docsRows.rows as Array<{ id: string; file_url: string | null; file_name: string | null; file_type: string | null; source_type: string | null; math_topic: string | null; contributor_notes: string | null }>;
    const objectStorage = new ObjectStorageService();
    const docTexts: string[] = [];
    for (const doc of docRows) {
      if (!doc.file_url) continue;
      try {
        const signedUrl = await objectStorage.getObjectEntitySignedDownloadURL(doc.file_url);
        const res2 = await fetch(signedUrl);
        if (!res2.ok) continue;
        const arrayBuf = await res2.arrayBuffer();
        const buf = Buffer.from(arrayBuf);
        const ft = (doc.file_type ?? "").toLowerCase();
        const fn = (doc.file_name ?? "").toLowerCase();
        let text = "";
        if (ft.includes("pdf") || fn.endsWith(".pdf")) {
          text = await pdfToText(buf).catch(() => "");
        } else if (ft.includes("word") || ft.includes("openxmlformats") || fn.endsWith(".docx") || fn.endsWith(".doc")) {
          const r = await mammoth.extractRawText({ buffer: buf }).catch(() => ({ value: "" }));
          text = r.value ?? "";
        }
        if (text.trim()) {
          const label = doc.file_name ?? "document";
          docTexts.push(`--- Uploaded document: ${label} (${doc.source_type ?? "unknown source"}) ---\n${text.slice(0, 8000)}`);
        }
      } catch {
        // Skip documents that cannot be extracted
      }
    }
    const s = session.rows[0] as Record<string, unknown>;
    const sels = selections.rows as Record<string, unknown>[];
    const ratingList = ratings.rows as Record<string, unknown>[];
    const respList = allResponses.rows as Record<string, unknown>[];
    const evidenceList = evidenceRows.rows as Array<{ domain: string | null; skill: string | null; answer_status: string | null; sample_role: string; examiner_notes: string | null }>;
    const unusedApproved = unusedApprovedRows.rows as Array<{ domain: string | null; skill: string | null; difficulty: string | null; answer_status: string | null; extracted_problem: string | null; examiner_notes: string | null }>;

    // Build a domain-grouped digest of evidence & observation items
    const evidenceByDomain: Record<string, typeof evidenceList> = {};
    for (const e of evidenceList) {
      const d = e.domain ?? "Unclassified";
      if (!evidenceByDomain[d]) evidenceByDomain[d] = [];
      evidenceByDomain[d].push(e);
    }
    const evidenceDigest = Object.entries(evidenceByDomain).map(([domain, items]) => {
      const counts = { correct: 0, incorrect: 0, partial: 0, unclear: 0 };
      const notes: string[] = [];
      for (const i of items) {
        if (i.answer_status === "correct") counts.correct++;
        else if (i.answer_status === "incorrect") counts.incorrect++;
        else if (i.answer_status === "partially_correct") counts.partial++;
        else counts.unclear++;
        if (i.examiner_notes) notes.push(i.examiner_notes);
      }
      const countStr = [`${counts.correct} correct`, `${counts.incorrect} incorrect`, counts.partial ? `${counts.partial} partial` : null, counts.unclear ? `${counts.unclear} unclear` : null].filter(Boolean).join(", ");
      const noteSample = notes.slice(0, 2).join("; ");
      const typeLabel = items.some(i => i.sample_role === "observation") ? "(observations included)" : "";
      return `${domain} ${typeLabel}[${items.length} items: ${countStr}]${noteSample ? ` — Notes: ${noteSample}` : ""}`;
    }).join("\n");
    

    const ALL_MATH_DOMAINS = [
      "Number Sense", "Addition Reasoning", "Subtraction Reasoning", "Multiplicative Reasoning",
      "Division Reasoning", "Fractions", "Decimals", "Percentages", "Ratio and Proportional Reasoning",
      "Algebraic Reasoning", "Pattern and Relational Reasoning", "Mathematical Problem-Solving",
      "Measurement", "Geometry", "Spatial Reasoning", "Data Interpretation", "Statistics",
      "Probability", "Money", "Time",
    ];
    const assessedDomains = [...new Set(sels.map(s => s.domain).filter(Boolean))] as string[];
    const unassessedDomains = ALL_MATH_DOMAINS.filter(d => !assessedDomains.includes(d));

    const prompt = `You are a clinical educational psychologist writing a professional RAMRI (ReMynd Authentic Mathematical Reasoning Interview) report. Generate structured report sections based on this session data.

Session status: ${s?.status}
Samples discussed: ${sels.length}
Domains assessed in this session: ${assessedDomains.join(", ") || "None"}
Domains NOT represented in submitted work: ${unassessedDomains.join(", ") || "None"}

Domain ratings (reasoning process dimensions):
${ratingList.map(r => `${r.domain}: ${r.rating !== null ? r.rating + "/4" : "not rated"} (${r.evidence_strength ?? "unrated"})`).join("\n")}

Sample responses summary:
${respList.filter(r => r.direct_quote).slice(0, 10).map(r => `Q: ${r.approved_question ?? r.generated_question}\nA: "${r.direct_quote}"`).join("\n\n")}

General notes: ${s?.general_notes ?? "None"}
${unusedApproved.length > 0 ? `\nApproved samples not reached in interview (written work only — no verbal reasoning captured, but answer patterns are valid evidence of the student's mathematical thinking):\n${unusedApproved.map(u => `- ${u.domain ?? "?"} | ${u.skill ?? "?"} | ${u.difficulty ?? "?"} | ${u.answer_status ?? "?"}: ${(u.extracted_problem ?? "").slice(0, 100)}${u.examiner_notes ? ` [Note: ${u.examiner_notes}]` : ""}`).join("\n")}` : ""}
${evidenceDigest ? `\nBackground evidence (items classified as Evidence or Observation — NOT used in interview but preserved from submitted work for contextual reference):\n${evidenceDigest}` : ""}
${docTexts.length > 0 ? `\n\n=== FULL UPLOADED EXAMINER WORKSHEETS / DOCUMENTS ===\nThe following documents were uploaded as part of this session. Read them carefully — they contain the complete examiner interview notes, student verbal responses, and clinical observations that form the primary evidence base for this report.\n\n${docTexts.join("\n\n")}` : ""}

IMPORTANT rules for this report:
- RAMRI is a structured qualitative and criterion-referenced reasoning interview, NOT a standardized assessment
- Do NOT assign standardized scores, percentiles, or age/grade equivalents
- Do NOT make diagnoses
- All AI statements must be labelled as requiring human review
- Distinguish between original work evidence, interview evidence, and transfer evidence
- Use professional but accessible language

For "domainCoverage": Write 2-3 sentences naming which content domains were represented in submitted work and which were not. Note that absence of a domain does not imply difficulty — the student may simply not have encountered that content yet. Be explicit about this distinction.

For "transferableStrategies": Based on the reasoning process dimensions rated above (e.g. Metacognition, Strategy Flexibility, Transfer, Conceptual Understanding), write 2-3 sentences explaining how the reasoning strengths observed across assessed domains are expected to transfer to unassessed domains when the student encounters them. Give one or two concrete examples linking an observed strength to an unassessed domain (e.g. strong multiplicative reasoning as a foundation for algebraic thinking). Frame these as hypotheses requiring ongoing observation, not predictions.

Return JSON only (no markdown):
{
  "assessmentContext": "1-2 sentences on basis and method",
  "participationSummary": "paragraph on engagement, confidence, anxiety observations",
  "reasoningProfile": "paragraph synthesizing the domain ratings and evidence",
  "performanceVsReasoning": "paragraph on relationship between written work and demonstrated reasoning",
  "conditionEffect": "paragraph on whether familiar/student-selected material appeared to help",
  "domainCoverage": "paragraph on which domains were and were not represented, and what that means",
  "transferableStrategies": "paragraph on how observed reasoning strengths are expected to apply to unassessed domains",
  "strengths": ["strength1", "strength2", "strength3"],
  "areasForDevelopment": ["area1", "area2"],
  "recommendations": ["rec1", "rec2", "rec3", "rec4"],
  "limitations": ["This is not a standardized assessment.", "The quality of conclusions depends on the authenticity and context of submitted work.", "Previously completed work may have involved unrecorded assistance.", "Transfer evidence is important when interpreting independent understanding.", "Domains not represented in submitted work cannot be assessed — absence from this report does not indicate difficulty in those areas."],
  "disclaimer": "RAMRI is a structured qualitative and criterion-referenced reasoning interview. Results must not be represented as standardized scores, age equivalents, grade equivalents, or diagnostic conclusions."
}`;
    const text = await callGroq(prompt, "You are a professional clinical report writer.", 4096);
    const clean = text.replace(/```json\n?|\n?```/g, "").trim();
    const narrative = JSON.parse(clean);

    const existingReport = (await db.execute(sql`SELECT id FROM ramri_reports WHERE session_id = ${sessionId} LIMIT 1`)).rows[0] as { id?: string } | undefined;
    let reportId: string;
    if (existingReport?.id) {
      reportId = existingReport.id;
      await db.execute(sql`UPDATE ramri_reports SET generated_narrative = ${JSON.stringify(narrative)}, status = 'draft', updated_at = NOW() WHERE id = ${reportId}`);
    } else {
      reportId = nanoid();
      await db.execute(sql`INSERT INTO ramri_reports (id, case_id, session_id, generated_narrative, status, created_at, updated_at) VALUES (${reportId}, ${caseId}, ${sessionId}, ${JSON.stringify(narrative)}, 'draft', NOW(), NOW())`);
    }
    const report = (await db.execute(sql`SELECT * FROM ramri_reports WHERE id = ${reportId} LIMIT 1`)).rows[0];
    return res.json({ report });
  } catch (err) {
    logger.error({ err }, "RAMRI report generate failed");
    return res.status(500).json({ error: "Failed to generate report" });
  }
});

router.patch("/cases/:caseId/ramri/sessions/:sessionId/report", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Invigilators cannot modify the report" });
  try {
    const { sessionId } = req.params;
    const { editedNarrative, status } = req.body;
    const report = (await db.execute(sql`SELECT id FROM ramri_reports WHERE session_id = ${sessionId} LIMIT 1`)).rows[0] as { id?: string } | undefined;
    if (!report?.id) return res.status(404).json({ error: "Report not found" });
    await db.execute(sql`
      UPDATE ramri_reports SET
        edited_narrative = COALESCE(${editedNarrative ? JSON.stringify(editedNarrative) : null}, edited_narrative),
        status = COALESCE(${status ?? null}, status),
        approved_by = CASE WHEN ${status ?? null} = 'approved' THEN ${req.userId ?? null} ELSE approved_by END,
        approved_at = CASE WHEN ${status ?? null} = 'approved' THEN NOW() ELSE approved_at END,
        updated_at = NOW()
      WHERE id = ${report.id}
    `);
    const updated = (await db.execute(sql`SELECT * FROM ramri_reports WHERE id = ${report.id} LIMIT 1`)).rows[0];
    return res.json({ report: updated });
  } catch (err) {
    return res.status(500).json({ error: "Failed to update report" });
  }
});

// ── GET /invigilator/ramri-sessions ────────────────────────────────────────────
// Returns RAMRI sessions that have at least one populated choice-set item and
// that are assigned to (or already stamped for) the logged-in invigilator.
router.get("/invigilator/ramri-sessions", authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "unauthorized" });
    if (!isInvigilator(req) && req.userRole !== "admin") {
      return res.status(403).json({ error: "forbidden" });
    }
    const rows = await db.execute(sql`
      SELECT
        rs.id          AS session_id,
        rs.case_id,
        rs.assignment_id,
        rs.invigilator_id,
        c.student_name,
        c.case_mode,
        COUNT(DISTINCT csi.id)  AS item_count,
        COUNT(DISTINCT sel.id)  AS selection_count
      FROM ramri_sessions rs
      JOIN cases c ON c.id = rs.case_id
      LEFT JOIN ramri_choice_sets cs      ON cs.session_id  = rs.id
      LEFT JOIN ramri_choice_set_items csi ON csi.choice_set_id = cs.id
      LEFT JOIN ramri_sample_selections sel ON sel.session_id = rs.id
      WHERE c.case_status = 'active'
        AND (
          rs.invigilator_id = ${userId}
          OR EXISTS (
            SELECT 1 FROM assignments a
            INNER JOIN users u ON u.email = a.assigned_to_email
            WHERE a.case_id          = rs.case_id
              AND a.respondent_type  = 'invigilator'
              AND u.id               = ${userId}
          )
        )
      GROUP BY rs.id, rs.case_id, rs.assignment_id, rs.invigilator_id, c.student_name, c.case_mode
      HAVING COUNT(DISTINCT csi.id) > 0
    `);
    return res.json(rows.rows);
  } catch (err) {
    logger.error({ err }, "RAMRI invigilator sessions list failed");
    return res.status(500).json({ error: "Failed to fetch RAMRI sessions" });
  }
});

// ── GET /cases/:caseId/ramri/sessions/:sessionId/progress ──────────────────────
// Lightweight read used by the admin live-monitor to poll interview state.
router.get("/cases/:caseId/ramri/sessions/:sessionId/progress", authMiddleware, async (req, res) => {
  try {
    const { caseId, sessionId } = req.params;
    const selections = (await db.execute(sql`
      SELECT sel.*, ws.extracted_problem, ws.domain, ws.skill
      FROM ramri_sample_selections sel
      INNER JOIN ramri_work_samples ws ON ws.id = sel.work_sample_id
      WHERE sel.session_id = ${sessionId}
      ORDER BY sel.sequence_number ASC
    `)).rows;
    const session = (await db.execute(sql`
      SELECT general_notes, status FROM ramri_sessions
      WHERE id = ${sessionId} AND case_id = ${caseId} LIMIT 1
    `)).rows[0] ?? null;
    const choiceSets = (await db.execute(sql`
      SELECT cs.id FROM ramri_choice_sets cs
      INNER JOIN ramri_choice_set_items csi ON csi.choice_set_id = cs.id
      WHERE cs.session_id = ${sessionId}
      LIMIT 1
    `)).rows;
    return res.json({ selections, session, hasPopulatedChoiceSets: choiceSets.length > 0 });
  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// ── Transcribe + save recording + speaker separation ──────────────────────────
const objectStorage = new ObjectStorageService();

router.post("/cases/:caseId/ramri/sessions/:sessionId/transcribe", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const question = (req.query.question as string | undefined) ?? "";
    const selectionId = (req.query.selectionId as string | undefined) ?? null;
    const durationSeconds = req.query.duration ? parseInt(req.query.duration as string, 10) : null;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    await new Promise<void>((resolve, reject) => { req.on("end", resolve); req.on("error", reject); });
    const audioBuffer = Buffer.concat(chunks);
    if (audioBuffer.length < 100) return res.status(400).json({ error: "empty_audio" });
    const mimeType = (req.headers["content-type"] || "audio/webm").split(";")[0].trim();

    // Save audio to object storage
    let storagePath: string | null = null;
    try {
      const uploadURL = await objectStorage.getObjectEntityUploadURL();
      storagePath = objectStorage.normalizeObjectEntityPath(uploadURL);
      const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": mimeType }, body: audioBuffer });
      if (!putRes.ok) throw new Error(`Storage PUT failed: ${putRes.status}`);
    } catch (storageErr) {
      logger.warn({ storageErr }, "Audio storage failed — continuing without saving");
    }

    const { transcribeAudio, separateSpeakers } = await import("../lib/groqTranscription.js");
    const transcript = await transcribeAudio(audioBuffer, mimeType);
    const turns = question.trim()
      ? await separateSpeakers(transcript, question)
      : [{ speaker: "Student", text: transcript }];

    // Persist the recording record
    const recordingId = nanoid();
    if (storagePath) {
      await db.execute(sql`
        INSERT INTO ramri_question_recordings
          (id, session_id, selection_id, question_text, storage_path, mime_type, full_transcript, turns, report_mode, duration_seconds)
        VALUES
          (${recordingId}, ${sessionId}, ${selectionId}, ${question || null}, ${storagePath}, ${mimeType},
           ${transcript}, ${JSON.stringify(turns)}::jsonb, 'student_only', ${durationSeconds})
      `);
    }

    return res.json({ transcript, turns, recordingId: storagePath ? recordingId : null });
  } catch (err) {
    logger.error({ err }, "RAMRI transcribe failed");
    return res.status(502).json({ error: "transcription_failed", message: String(err) });
  }
});

// ── List recordings for a session (with signed playback URLs) ─────────────────
router.get("/cases/:caseId/ramri/sessions/:sessionId/recordings", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const rows = (await db.execute(sql`
      SELECT * FROM ramri_question_recordings WHERE session_id = ${sessionId} ORDER BY created_at ASC
    `)).rows as Array<Record<string, unknown>>;
    const withUrls = await Promise.all(rows.map(async r => {
      try {
        const audioUrl = await objectStorage.getObjectEntitySignedDownloadURL(r.storage_path as string, 3600);
        return { ...r, audioUrl };
      } catch {
        return { ...r, audioUrl: null };
      }
    }));
    return res.json({ recordings: withUrls });
  } catch (err) {
    logger.error({ err }, "RAMRI recordings list failed");
    return res.status(500).json({ error: "Failed to fetch recordings" });
  }
});

// ── Translate worksheet texts for student sheet printing ──────────────────────
// ── Parse offline completed worksheet (PDF/Word → structured JSON) ────────────
router.post(
  "/cases/:caseId/ramri/sessions/:sessionId/parse-offline-worksheet",
  authMiddleware,
  offlineUpload.single("file"),
  async (req, res) => {
    if (isInvigilator(req)) return res.status(403).json({ error: "Forbidden" });
    try {
      const file = (req as typeof req & { file?: Express.Multer.File }).file;
      if (!file) return res.status(400).json({ error: "No file provided" });

      const ft = file.mimetype.toLowerCase();
      const fn = file.originalname.toLowerCase();
      let text = "";
      if (ft.includes("pdf") || fn.endsWith(".pdf")) {
        text = await pdfToText(file.buffer);
      } else if (ft.includes("word") || ft.includes("openxmlformats") || fn.endsWith(".docx") || fn.endsWith(".doc")) {
        const r = await mammoth.extractRawText({ buffer: file.buffer });
        text = r.value ?? "";
      } else {
        return res.status(400).json({ error: "Only PDF and Word documents are supported" });
      }
      if (!text.trim()) return res.status(400).json({ error: "No text could be extracted from the document" });

      const systemPrompt = "You are a specialist in educational assessment data extraction. Parse RAMRI examiner interview worksheets precisely and return valid JSON only.";
      const prompt = `Parse this completed RAMRI Examiner Interview Worksheet and extract all structured data.

For each "SET N · OPTION X" interview sheet, extract one object:
{
  "setNumber": <1|2|3>,
  "option": "<A|B|C>",
  "domain": "<math domain e.g. Geometry, Addition Reasoning, Number Sense, Subtraction Reasoning, Time>",
  "skill": "<specific skill from the CLINICAL FOCUS line>",
  "extractedProblem": "<the math problem shown to the student>",
  "studentAnswer": "<student's written answer if visible, else empty string>",
  "answerStatus": "<correct|incorrect|partially_correct|unclear>",
  "responses": [
    { "questionType": "<type>", "directQuote": "<full examiner notes for this section>" }
  ],
  "behavioralObs": { "anxietyRating": null, "confidenceRating": null, "engagementRating": null }
}

Map section headings to questionType values:
  "UNIVERSAL — OPENING"          → "universal"
  "CONCEPTUAL — UNDERSTANDING"   → "conceptual"
  "STRATEGY — METHOD"            → "strategy"
  "VERIFICATION — CHECKING"      → "verification"
  "ERROR AWARENESS — REFLECTION" → "error_awareness"
  "METACOGNITION — THINKING"     → "metacognition"

Include ONLY sections with actual written content. Skip blank sections and sections that say only "No response provided."
For behavioralObs: use a number 0-4 only if explicitly circled/marked; otherwise keep null.

For each "Transfer Probe Sheet" (SET N · TRANSFER), extract:
{ "setNumber": <number>, "transferProblem": "<problem text>", "examinerObservations": "<text from EXAMINER OBSERVATIONS & NOTES>" }
Only include transfer probes that have examinerObservations content.

Return ONLY valid JSON (no markdown, no explanation):
{ "sheets": [...], "transferProbes": [...] }

WORKSHEET TEXT:
${text.slice(0, 22000)}`;

      const raw = await callGroq(prompt, systemPrompt, 4096);
      const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(clean);
      return res.json({ parsed });
    } catch (err) {
      logger.error({ err }, "RAMRI offline worksheet parse failed");
      return res.status(500).json({ error: "Failed to parse worksheet. Please check the file and try again." });
    }
  }
);

// ── Confirm offline import — write parsed data into DB as selections + responses ─
router.post("/cases/:caseId/ramri/sessions/:sessionId/confirm-offline-import", authMiddleware, async (req, res) => {
  if (isInvigilator(req)) return res.status(403).json({ error: "Forbidden" });
  try {
    const { caseId, sessionId } = req.params;
    type OfflineSheet = {
      setNumber: number; option: string; domain: string; skill: string;
      extractedProblem: string; studentAnswer: string; answerStatus: string;
      responses: Array<{ questionType: string; directQuote: string }>;
      behavioralObs: { anxietyRating: number | null; confidenceRating: number | null; engagementRating: number | null };
    };
    type OfflineTransfer = { setNumber: number; transferProblem: string; examinerObservations: string };
    const { sheets, transferProbes } = req.body as { sheets: OfflineSheet[]; transferProbes: OfflineTransfer[] };

    const seqRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ramri_sample_selections WHERE session_id = ${sessionId}`);
    let seqBase = Number((seqRes.rows[0] as { cnt: string })?.cnt ?? 0);

    const selBySet: Record<number, string> = {};
    const createdSelections: unknown[] = [];

    for (const sheet of (sheets ?? [])) {
      if (!sheet.responses?.length) continue;

      // 1. Create work sample
      const sampleId = nanoid();
      const sortRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ramri_work_samples WHERE session_id = ${sessionId}`);
      const sortOrder = Number((sortRes.rows[0] as { cnt: string })?.cnt ?? 0);
      await db.execute(sql`
        INSERT INTO ramri_work_samples
          (id, document_id, case_id, session_id, image_url, extracted_problem, student_answer,
           domain, skill, answer_status, approved, sort_order, sample_role, suggested_for_interview, created_at, updated_at)
        VALUES
          (${sampleId}, null, ${caseId}, ${sessionId}, null,
           ${sheet.extractedProblem || null}, ${sheet.studentAnswer || null},
           ${sheet.domain || null}, ${sheet.skill || null}, ${sheet.answerStatus || "unclear"},
           true, ${sortOrder}, 'interview', true, NOW(), NOW())
      `);

      // 2. Create sample selection (no choice set — offline import)
      const selId = nanoid();
      seqBase++;
      await db.execute(sql`
        INSERT INTO ramri_sample_selections
          (id, session_id, choice_set_id, work_sample_id, offered_sample_ids, sequence_number, created_at)
        VALUES (${selId}, ${sessionId}, null, ${sampleId}, null, ${seqBase}, NOW())
      `);
      selBySet[sheet.setNumber] = selId; // last selection in this set wins for transfer linkage

      // 3. Create interview responses
      for (let i = 0; i < sheet.responses.length; i++) {
        const resp = sheet.responses[i];
        if (!resp.directQuote?.trim()) continue;
        await db.execute(sql`
          INSERT INTO ramri_interview_responses
            (id, sample_selection_id, question_type, generated_question, approved_question,
             response_mode, direct_quote, examiner_paraphrase, skipped, not_observed, sequence_number, created_at)
          VALUES
            (${nanoid()}, ${selId}, ${resp.questionType}, null, null,
             'verbal', ${resp.directQuote}, null, false, false, ${i + 1}, NOW())
        `);
      }

      // 4. Behavioral observations (only if any rating is set)
      const obs = sheet.behavioralObs ?? {};
      if (obs.anxietyRating != null || obs.confidenceRating != null || obs.engagementRating != null) {
        await db.execute(sql`
          INSERT INTO ramri_behavioral_obs
            (id, sample_selection_id, anxiety_rating, confidence_rating, engagement_rating, reassurance_required, created_at)
          VALUES (${nanoid()}, ${selId}, ${obs.anxietyRating ?? null}, ${obs.confidenceRating ?? null}, ${obs.engagementRating ?? null}, false, NOW())
        `);
      }

      const selRow = (await db.execute(sql`
        SELECT sels.*, ws.extracted_problem, ws.domain, ws.skill, ws.answer_status
        FROM ramri_sample_selections sels
        JOIN ramri_work_samples ws ON ws.id = sels.work_sample_id
        WHERE sels.id = ${selId} LIMIT 1
      `)).rows[0];
      createdSelections.push(selRow);
    }

    // 5. Transfer prompts — link to last selection in each set
    for (const tp of (transferProbes ?? [])) {
      if (!tp.examinerObservations?.trim()) continue;
      const targetSelId = selBySet[tp.setNumber];
      if (!targetSelId) continue;
      await db.execute(sql`
        INSERT INTO ramri_transfer_prompts
          (id, sample_selection_id, transfer_level, generated_prompt, approved_prompt,
           student_response, support_level, transfer_rating, notes)
        VALUES
          (${nanoid()}, ${targetSelId}, 'expected',
           ${tp.transferProblem || null}, ${tp.transferProblem || null},
           ${tp.examinerObservations}, null, null, ${tp.examinerObservations})
      `);
    }

    return res.json({ ok: true, created: createdSelections.length, selections: createdSelections });
  } catch (err) {
    logger.error({ err }, "RAMRI offline import confirm failed");
    return res.status(500).json({ error: "Failed to import worksheet responses" });
  }
});

router.post("/cases/:caseId/ramri/translate-worksheet", authMiddleware, async (req, res) => {
  try {
    const { lang, texts } = req.body as { lang: "zh" | "ko"; texts: string[] };
    if (!lang || !texts?.length) return res.status(400).json({ error: "Missing lang or texts" });
    const langName = lang === "zh" ? "Simplified Chinese" : "Korean";
    const numbered = texts.map((t, i) => `[${i}] ${t}`).join("\n");
    const prompt = `You are a translator. Translate each numbered item below into ${langName}. Return ONLY the translations, one per line, in the same numbered format [0], [1], etc. Do not add any explanation or extra text. Preserve any mathematical notation, numbers, equations, and symbols exactly as they appear.\n\n${numbered}`;
    const raw = await callGroq(prompt, undefined, 4096);
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    const result: string[] = new Array(texts.length).fill("");
    for (const line of lines) {
      const m = line.match(/^\[(\d+)\]\s*(.*)/s);
      if (m) result[parseInt(m[1])] = m[2].trim();
    }
    return res.json({ translations: result });
  } catch (err) {
    logger.error({ err }, "RAMRI worksheet translation failed");
    return res.status(500).json({ error: "Translation failed" });
  }
});

// ── Update recording (edited transcript / report_mode toggle) ─────────────────
router.patch("/cases/:caseId/ramri/sessions/:sessionId/recordings/:recordingId", authMiddleware, async (req, res) => {
  try {
    const { recordingId } = req.params;
    const { fullTranscript, turns, reportMode } = req.body as { fullTranscript?: string; turns?: unknown[]; reportMode?: string };
    await db.execute(sql`
      UPDATE ramri_question_recordings SET
        full_transcript = COALESCE(${fullTranscript ?? null}, full_transcript),
        turns = COALESCE(${turns ? JSON.stringify(turns) : null}::jsonb, turns),
        report_mode = COALESCE(${reportMode ?? null}, report_mode)
      WHERE id = ${recordingId}
    `);
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "RAMRI recording patch failed");
    return res.status(500).json({ error: "Failed to update recording" });
  }
});

export default router;
