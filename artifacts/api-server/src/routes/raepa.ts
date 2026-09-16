import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { casesTable, assignmentsTable, reportsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { logger } from "../lib/logger.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { canUserAccessCase } from "../lib/permissions.js";
import multer from "multer";
import { ai, generateImage } from "@workspace/integrations-gemini-ai";
import crypto from "crypto";
import { z } from "zod/v4";
import { writeAudit } from "../lib/audit.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
const storage = new ObjectStorageService();

const textValue = z.string().trim().max(20000);
const jsonObject = z.record(z.string(), z.unknown());
const profileSchema = z.object({
  referral_question: textValue.optional(),
  data: jsonObject.optional(),
  status: z.enum(["draft", "in_progress", "reviewed", "complete"]).optional(),
  pathway: z.enum(["standalone", "comprehensive"]).optional(),
}).strict();
const sessionSchema = z.object({
  status: z.enum(["setup", "in_progress", "complete", "active"]).optional(),
  pathway: z.enum(["standalone", "comprehensive"]).optional(),
  language_background: jsonObject.optional(),
  modules_selected: z.array(z.string().max(120)).max(40).optional(),
  general_notes: z.string().max(20000).optional(),
  overall_summary: z.string().max(20000).optional(),
  interpretive_profiles: jsonObject.optional(),
  confidence_level: z.enum(["low", "moderate", "high"]).optional(),
}).strict();
const historySchema = z.object({
  language: z.string().trim().min(1).max(120),
  age_first_exposed: z.string().max(120).optional(),
  proficiency: z.string().max(500).optional(),
  speaking_experience: z.string().max(500).optional(),
  reading_experience: z.string().max(500).optional(),
  writing_experience: z.string().max(500).optional(),
  formal_schooling_experience: z.string().max(1000).optional(),
  years_of_instruction: z.string().max(120).optional(),
  subjects: z.array(z.string().max(120)).max(30).optional(),
  source: z.string().max(80).optional(),
  original_text: z.string().max(20000).optional(),
  translated_text: z.string().max(20000).optional(),
  translation_metadata: jsonObject.optional(),
}).strict();
const responseItemSchema = z.object({
  question_id: z.string().max(160),
  prompt_original: z.string().max(5000).optional(),
  response_original: z.string().max(20000),
  response_translated: z.string().max(20000).optional(),
  language: z.string().max(120).optional(),
  translation_metadata: jsonObject.optional(),
}).strict();
const v2AcademicLanguageSchema = z.object({
  id: z.string().optional(),
  language: z.string().trim().min(1).max(120),
  relationship: z.string().max(80).optional(),
  age_first_exposed: z.string().max(120).optional(),
  years: z.string().max(120).optional(),
  academic_use: z.string().max(1000).optional(),
  years_of_instruction: z.string().max(120).optional(),
  proficiency: z.string().max(500).optional(),
  formal_schooling_experience: z.string().max(1000).optional(),
  instruction_years: z.string().max(120).optional(),
  confidence: z.string().max(500).optional(),
  speaking_experience: z.string().max(500).optional(),
  reading_experience: z.string().max(500).optional(),
  writing_experience: z.string().max(500).optional(),
  subjects: z.array(z.string().max(120)).max(30).optional(),
  source: z.string().max(80).optional(),
  original_text: z.string().max(20000).optional(),
  translated_text: z.string().max(20000).optional(),
  translation_metadata: jsonObject.optional(),
  notes: z.string().max(1000).optional(),
}).strict();
const v2SubjectHistorySchema = z.object({
  subject: z.string().trim().min(1).max(120),
  language: z.string().trim().min(1).max(120),
  years: z.string().max(120).optional(),
  experience: z.string().max(1000).optional(),
  source: z.string().max(80).optional(),
  notes: z.string().max(5000).optional(),
}).strict();
const v2AcademicHistorySchema = z.object({
  languages: z.array(v2AcademicLanguageSchema).max(40),
  subjects: z.array(v2SubjectHistorySchema).max(60).optional().default([]),
  parent_voice: z.string().max(20000).optional().default(""),
  student_voice: z.string().max(20000).optional().default(""),
  teacher_voice: z.string().max(20000).optional().default(""),
}).strict();
const canonicalAcademicHistorySchema = z.object({
  languages: z.array(historySchema).max(40),
  subjects: z.array(v2SubjectHistorySchema).max(60).optional().default([]),
}).strict();
const multipartBoolean = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === true || value === "true" || value === "1") return true;
  if (value === false || value === "false" || value === "0") return false;
  return value;
}, z.boolean().optional());
const multipartJsonObject = z.string().max(20000).refine((value) => {
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}, "must be a JSON object");
const teacherUploadSchema = z.object({
  title: z.string().max(500).optional(),
  subject: z.string().max(200).optional(),
  task_type: z.string().max(200).optional(),
  date_completed: z.string().max(30).regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  teacher: z.string().max(300).optional(),
  grade_level: z.string().max(120).optional(),
  source: z.string().max(300).optional(),
  language_of_instruction: z.string().max(200).optional(),
  original_instructions: z.string().max(20000).optional(),
  assignment_instructions: z.string().max(20000).optional(),
  expected_outcome: z.string().max(5000).optional(),
  rubric: z.string().max(20000).optional(),
  student_score: z.string().max(200).optional(),
  score: z.string().max(200).optional(),
  teacher_comments: z.string().max(20000).optional(),
  classroom_context: z.string().max(20000).optional(),
  support_provided: z.string().max(5000).optional(),
  classroom_access_profile: multipartJsonObject.optional(),
  support_response_matrix: multipartJsonObject.optional(),
  independent_completion: multipartBoolean,
  completion_setting: z.string().max(80).optional(),
  student_selected: multipartBoolean,
  idempotency_key: z.string().max(500).optional(),
}).strict();
const domainRatingSchema = z.object({
  domain: z.string().trim().min(1).max(200),
  score: z.number().finite().int().min(0).max(4),
  confidence: z.string().max(100).optional(),
  evidence: z.string().max(10000).optional(),
  support_level_required: z.string().max(200).optional(),
}).strict();
const moduleScoreSchema = z.object({
  module_id: z.string().trim().min(1).max(120),
  administered: z.boolean().optional(),
  score: z.number().finite().int().min(0).max(4).optional(),
  support_level: z.number().finite().int().min(0).max(5).nullable().optional(),
  observations: z.string().max(10000).optional(),
  task_notes: jsonObject.optional(),
}).strict();
const languageFunctionSchema = z.object({
  function_name: z.string().trim().min(1).max(120),
  level: z.enum(["not_assessed", "not_demonstrated", "emerging", "developing", "functional", "independent"]),
  evidence: z.string().max(10000).optional(),
  subject_context: z.string().max(200).optional(),
}).strict();

function parseBody<T>(schema: z.ZodType<T>, body: unknown, res: any): T | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}

function isAssessmentLead(role?: string): boolean {
  return role === "admin" || role === "assessment_invigilator";
}

function tokenHash(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value && typeof value === "object" ? value : {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonField(value: unknown): string {
  return JSON.stringify(parseJsonValue(value));
}

function firstNonBlank(...values: unknown[]): string | undefined {
  const value = values.find(candidate => typeof candidate === "string" && candidate.trim().length > 0);
  return typeof value === "string" ? value : undefined;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function idempotencyKey(req: any, scope: string, fallback: unknown): string {
  const supplied = req.get?.("Idempotency-Key") ?? req.body?.idempotency_key;
  if (typeof supplied === "string" && supplied.trim()) {
    return `${scope}:client:${crypto.createHash("sha256").update(supplied.trim().slice(0, 500)).digest("hex")}`;
  }
  return `${scope}:derived:${crypto.createHash("sha256").update(stableJson(fallback)).digest("hex")}`;
}

async function ensureSession(caseId: string, executor: any = db): Promise<string | null> {
  const row = await executor.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
  return row.rows.length ? String(row.rows[0].id) : null;
}

async function ensureProfile(caseId: string, actorId?: string, executor: any = db): Promise<string> {
  const existing = await executor.execute(sql`SELECT id FROM raepa_profiles WHERE case_id = ${caseId} LIMIT 1`);
  if (existing.rows.length) return String(existing.rows[0].id);
  const id = nanoid();
  const sessionId = await ensureSession(caseId, executor);
  await executor.execute(sql`INSERT INTO raepa_profiles (id, case_id, session_id, creator_id) VALUES (${id}, ${caseId}, ${sessionId}, ${actorId ?? null})`);
  if (sessionId) await executor.execute(sql`UPDATE raepa_sessions SET profile_id = ${id}, updated_at = NOW() WHERE id = ${sessionId}`);
  return id;
}

async function markProfileNeedsReview(caseId: string, executor: any = db): Promise<void> {
  await executor.execute(sql`UPDATE raepa_profiles
    SET review_status = 'unreviewed', reviewed_by = NULL, reviewed_at = NULL, updated_at = NOW()
    WHERE case_id = ${caseId}`);
}

/**
 * Evidence changes invalidate every persisted RAEPA release. The executor
 * parameter lets callers include this operation in the same transaction as
 * their evidence mutation; calls without one still perform the invalidation
 * atomically and audit only after that transaction commits.
 */
async function invalidateRaepaEvidence(
  caseId: string,
  actorId?: string,
  actorRole?: string,
  resetProfile = false,
  executor?: any,
): Promise<{ reportCount: number; genericReportCount: number }> {
  const invalidate = async (tx: any): Promise<{ reportCount: number; genericReportCount: number }> => {
    if (resetProfile) await markProfileNeedsReview(caseId, tx);
    const reportRows = await tx.execute(sql`
      UPDATE raepa_reports
      SET status = 'draft', professional_approved_by = NULL, professional_approved_at = NULL,
        approved_by = NULL, approved_at = NULL, qa_status = 'not_run',
        version = COALESCE(version, 0) + 1, updated_at = NOW()
      WHERE case_id = ${caseId}
      RETURNING id
    `);
    const markerPattern = "--- Academic English Access & Performance ---[\\s\\S]*?--- End Academic English Access & Performance ---[[:space:]]*";
    const genericRows = await tx.execute(sql`
      UPDATE reports
      SET domain_analysis = btrim(regexp_replace(COALESCE(domain_analysis, ''), ${markerPattern}, '', 'g')),
        status = 'draft', approved_at = NULL, updated_at = NOW()
      WHERE case_id = ${caseId} AND domain_analysis LIKE ${"%--- Academic English Access & Performance ---%"}
      RETURNING id
    `);
    return { reportCount: reportRows.rows.length, genericReportCount: genericRows.rows.length };
  };
  const result = executor
    ? await invalidate(executor)
    : await db.transaction(async (tx) => invalidate(tx));
  if (!executor) {
    await writeAudit({
      eventType: "raepa.reports.invalidated",
      caseId,
      actorId,
      actorRole,
      metadata: result,
    });
  }
  return result;
}

async function requireCaseAccess(req: any, res: any, caseId: string): Promise<boolean> {
  if (!req.userId || !(await verifyCaseAccess(caseId, req.userId, req.userRole))) {
    res.status(req.userId ? 403 : 401).json({ error: req.userId ? "Forbidden" : "Unauthorized" });
    return false;
  }
  return true;
}

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function callGroq(messages: Array<{ role: string; content: string }>, maxTokens = 1024): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY not configured");
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.8, max_tokens: maxTokens }),
  });
  if (!r.ok) throw new Error(`Groq error: ${r.status}`);
  const data = await r.json() as any;
  return data.choices[0].message.content;
}

const MODULES = [
  { id: "social_communication", name: "Module 1: Social Communication Baseline", required: true },
  { id: "academic_listening",   name: "Module 2: Academic Listening" },
  { id: "academic_speaking",    name: "Module 3: Academic Speaking" },
  { id: "academic_reading",     name: "Module 4: Academic Reading" },
  { id: "academic_writing",     name: "Module 5: Academic Writing" },
  { id: "mathematics_language", name: "Module 6: Mathematics Language" },
  { id: "science_language",     name: "Module 7: Science Language" },
  { id: "humanities_language",  name: "Module 8: Humanities and Social Studies Language" },
  { id: "literature",           name: "Module 9: Literature and Extended Text" },
  { id: "academic_independence",name: "Module 10: Academic Independence and Classroom Access" },
];

const DOMAINS = [
  "Social Communication English","Academic Listening","Academic Speaking",
  "Academic Reading","Academic Writing","General Academic Vocabulary",
  "Subject-Specific Vocabulary","Understanding of Classroom Directions",
  "Explanation and Elaboration","Sequencing and Organization",
  "Comparison and Classification","Cause-and-Effect Reasoning",
  "Inference and Prediction","Justification and Evidence",
  "Evaluation and Hypothesizing","Mathematics Language",
  "Science Language","Humanities Language",
  "Academic Independence","Academic Language Structures","Response to Scaffolding",
];

const LANGUAGE_FUNCTIONS = [
  "identify","recall","describe","sequence","classify","compare",
  "summarize","explain","infer","predict","justify","evaluate",
  "hypothesize","argue","support with evidence",
];

async function verifyCaseAccess(caseId: string, userId: string, role: string): Promise<boolean> {
  return canUserAccessCase({ id: userId, role }, caseId);
}

// ── GET session ──────────────────────────────────────────────────────────────
router.get("/cases/:caseId/raepa/session", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const rows = await db.execute(sql`SELECT * FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (rows.rows.length === 0) return res.json(null);
    res.json(rows.rows[0]);
  } catch (err) { logger.error({ err }, "raepa get session"); res.status(500).json({ error: "Server error" }); }
});

// ── POST session (create or update) ─────────────────────────────────────────
router.post("/cases/:caseId/raepa/session", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const parsedSession = sessionSchema.safeParse(req.body);
    if (!parsedSession.success) {
      res.status(400).json({ error: "Invalid session fields", details: parsedSession.error.flatten() }); return;
    }
    const body = parsedSession.data;
    const row = await db.transaction(async (tx) => {
      const existing = await tx.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
      if (existing.rows.length === 0) {
        const id = nanoid();
        await tx.execute(sql`
        INSERT INTO raepa_sessions (id, case_id, examiner_id, status, pathway, language_background,
          modules_selected, general_notes, created_at, updated_at)
        VALUES (
          ${id}, ${caseId}, ${user.id}, ${body.status ?? "setup"}, ${body.pathway ?? "standalone"},
          ${JSON.stringify(body.language_background ?? {})}::jsonb,
          ${JSON.stringify(body.modules_selected ?? [])}::jsonb,
          ${body.general_notes ?? null}, NOW(), NOW()
        )
        `);
        await invalidateRaepaEvidence(caseId, user.id, user.role, false, tx);
        const result = await tx.execute(sql`SELECT * FROM raepa_sessions WHERE id = ${id}`);
        return result.rows[0];
      }
      const sid = existing.rows[0].id as string;
      const updates: any[] = [];
      if (body.status !== undefined) updates.push(sql`status = ${body.status}`);
      if (body.pathway !== undefined) updates.push(sql`pathway = ${body.pathway}`);
      if (body.language_background !== undefined) updates.push(sql`language_background = ${JSON.stringify(body.language_background)}::jsonb`);
      if (body.modules_selected !== undefined) updates.push(sql`modules_selected = ${JSON.stringify(body.modules_selected)}::jsonb`);
      if (body.general_notes !== undefined) updates.push(sql`general_notes = ${body.general_notes}`);
      if (body.overall_summary !== undefined) updates.push(sql`overall_summary = ${body.overall_summary}`);
      if (body.interpretive_profiles !== undefined) updates.push(sql`interpretive_profiles = ${JSON.stringify(body.interpretive_profiles)}::jsonb`);
      if (body.confidence_level !== undefined) updates.push(sql`confidence_level = ${body.confidence_level}`);
      if (updates.length > 0) {
        await tx.execute(sql`UPDATE raepa_sessions SET ${sql.join(updates, sql`, `)}, updated_at = NOW() WHERE id = ${sid}`);
        await invalidateRaepaEvidence(caseId, user.id, user.role, false, tx);
      }
      const result = await tx.execute(sql`SELECT * FROM raepa_sessions WHERE id = ${sid}`);
      return result.rows[0];
    });
    await writeAudit({ eventType: "raepa.reports.invalidated", caseId, actorId: user.id, actorRole: user.role,
      metadata: { reason: "raepa.session.updated" } });
    return res.json(row);
  } catch (err) { logger.error({ err }, "raepa post session"); res.status(500).json({ error: "Server error" }); }
});

// ── GET work samples ──────────────────────────────────────────────────────────
router.get("/cases/:caseId/raepa/work-samples", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const rows = await db.execute(sql`SELECT * FROM raepa_work_samples WHERE case_id = ${caseId} ORDER BY created_at ASC`);
    res.json(rows.rows);
  } catch (err) { logger.error({ err }, "raepa get work samples"); res.status(500).json({ error: "Server error" }); }
});

// ── POST work sample (upload) ─────────────────────────────────────────────────
router.post("/cases/:caseId/raepa/work-samples", authMiddleware, upload.single("file"), async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const parsedUpload = teacherUploadSchema.safeParse(Object.fromEntries(
      Object.entries(req.body ?? {}).map(([key, value]) => [key, value === "" ? undefined : value]),
    ));
    if (!parsedUpload.success) {
      res.status(400).json({ error: "Invalid teacher work-sample fields", details: parsedUpload.error.flatten() }); return;
    }
    const body = parsedUpload.data;
    let file_url: string | null = null;
    let file_name: string | null = null;
    let file_type: string | null = null;
    if (req.file) {
      const ext = req.file.originalname.split(".").pop() ?? "bin";
      const key = `raepa/${caseId}/${nanoid()}.${ext}`;
      await storage.uploadFile(key, req.file.buffer, req.file.mimetype);
      file_url = await storage.getFileUrl(key);
      file_name = req.file.originalname;
      file_type = req.file.mimetype;
    }
    const id = nanoid();
    const row = await db.transaction(async (tx) => {
      await tx.execute(sql`
      INSERT INTO raepa_work_samples (id, case_id, file_name, file_url, file_type,
        title, subject, task_type, date_completed, teacher, grade_level,
        source, language_of_instruction, expected_outcome, rubric, classroom_context,
        completion_setting, independent_completion, support_provided, assignment_instructions,
        student_score, teacher_comments, student_selected,
        ai_analysis_status, assessor_approved, created_at, updated_at)
      VALUES (
        ${id}, ${caseId}, ${file_name}, ${file_url}, ${file_type},
        ${body.title ?? null}, ${body.subject ?? null}, ${body.task_type ?? null},
        ${body.date_completed ?? null}, ${body.teacher ?? null}, ${body.grade_level ?? null},
        ${body.source ?? null}, ${body.language_of_instruction ?? null},
        ${body.expected_outcome ?? null}, ${body.rubric ?? null}, ${body.classroom_context ?? null},
        ${body.completion_setting ?? null},
        ${body.independent_completion ?? true},
        ${body.support_provided ?? null}, ${body.original_instructions ?? body.assignment_instructions ?? null},
        ${body.student_score ?? body.score ?? null}, ${body.teacher_comments ?? null},
        ${body.student_selected ?? false},
        'pending', false, NOW(), NOW()
      )
      `);
      await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
      return tx.execute(sql`SELECT * FROM raepa_work_samples WHERE id = ${id}`);
    });
    await writeAudit({ eventType: "raepa.work_sample.created", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { sampleId: id } });
    res.json(row.rows[0]);
  } catch (err) { logger.error({ err }, "raepa upload work sample"); res.status(500).json({ error: "Server error" }); }
});

// ── PATCH work sample ─────────────────────────────────────────────────────────
router.patch("/cases/:caseId/raepa/work-samples/:sampleId", authMiddleware, async (req, res) => {
  const { caseId, sampleId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const b = req.body;
    if (b.assessor_approved !== undefined && !isAssessmentLead(user.role)) {
      return res.status(403).json({ error: "Assessment Lead or admin approval required" });
    }
    const fields: any[] = [];
    if (b.title !== undefined) fields.push(sql`title = ${b.title}`);
    if (b.subject !== undefined) fields.push(sql`subject = ${b.subject}`);
    if (b.grade_level !== undefined) fields.push(sql`grade_level = ${b.grade_level}`);
    if (b.teacher !== undefined) fields.push(sql`teacher = ${b.teacher}`);
    if (b.independent_completion !== undefined) fields.push(sql`independent_completion = ${b.independent_completion}`);
    if (b.support_provided !== undefined) fields.push(sql`support_provided = ${b.support_provided}`);
    if (b.student_selected !== undefined) fields.push(sql`student_selected = ${b.student_selected}`);
    if (b.assessor_approved !== undefined) fields.push(sql`assessor_approved = ${b.assessor_approved}`);
    if (b.teacher_comments !== undefined) fields.push(sql`teacher_comments = ${b.teacher_comments}`);
    if (fields.length === 0) return res.json({ ok: true });
    const row = await db.transaction(async (tx) => {
      await tx.execute(sql`UPDATE raepa_work_samples SET ${sql.join(fields, sql`, `)}, updated_at = NOW() WHERE id = ${sampleId} AND case_id = ${caseId}`);
      await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
      return tx.execute(sql`SELECT * FROM raepa_work_samples WHERE id = ${sampleId}`);
    });
    await writeAudit({ eventType: "raepa.work_sample.updated", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { sampleId } });
    res.json(row.rows[0]);
  } catch (err) { logger.error({ err }, "raepa patch work sample"); res.status(500).json({ error: "Server error" }); }
});

// ── DELETE work sample ────────────────────────────────────────────────────────
router.delete("/cases/:caseId/raepa/work-samples/:sampleId", authMiddleware, async (req, res) => {
  const { caseId, sampleId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM raepa_work_sample_analyses WHERE work_sample_id = ${sampleId} AND case_id = ${caseId}`);
      await tx.execute(sql`DELETE FROM raepa_work_samples WHERE id = ${sampleId} AND case_id = ${caseId}`);
      await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
    });
    await writeAudit({ eventType: "raepa.work_sample.deleted", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { sampleId } });
    res.json({ ok: true });
  } catch (err) { logger.error({ err }, "raepa delete work sample"); res.status(500).json({ error: "Server error" }); }
});

// ── POST work sample AI analysis ───────────────────────────────────────────────
router.post("/cases/:caseId/raepa/work-samples/:sampleId/analyze", authMiddleware, async (req, res) => {
  const { caseId, sampleId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    if (!isAssessmentLead(user.role)) return res.status(403).json({ error: "Assessment Lead or admin review required" });
    const rows = await db.execute(sql`SELECT * FROM raepa_work_samples WHERE id = ${sampleId} AND case_id = ${caseId}`);
    if (rows.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const sample = rows.rows[0] as any;
    if (!sample.file_url) return res.status(400).json({ error: "No file uploaded" });

    await db.execute(sql`UPDATE raepa_work_samples SET ai_analysis_status = 'processing', updated_at = NOW() WHERE id = ${sampleId} AND case_id = ${caseId}`);

    (async () => {
      try {
        const prompt = `You are an expert educational language assessor analysing a student's school work sample for the ReMynd Academic English Performance Assessment (RAEPA).

Analyse this work sample and return a JSON object with these fields:
{
  "subject": "likely subject area",
  "grade_range": "estimated grade range (e.g. Year 5-7)",
  "task_type": "type of task (e.g. written explanation, lab report, essay, worksheet)",
  "text_type": "type of text (e.g. informational, narrative, procedural)",
  "reading_demand": "low/medium/high",
  "writing_demand": "low/medium/high",
  "estimated_steps": number,
  "academic_vocabulary": ["list of general academic vocabulary words found"],
  "subject_vocabulary": ["list of subject-specific vocabulary words found"],
  "command_words": ["verbs that tell the student what to do (e.g. describe, explain, compare)"],
  "language_functions_required": ["list from: identify, recall, describe, sequence, classify, compare, summarize, explain, infer, predict, justify, evaluate, hypothesize, argue, support with evidence"],
  "academic_language_structures": ["structures required or demonstrated, selected where relevant from: passive constructions, nominalization, complex noun phrases, embedded clauses, relative clauses, causal constructions, conditional language, comparison/contrast structures, temporal/sequential structures, evidential language, modality, hedging, academic connectors, cohesion, pronoun/reference chains, agentless constructions, information density, abstraction, discipline-specific register, academic command verbs"],
  "potential_barriers": ["list of specific language barriers that might prevent an EAL student from succeeding"],
  "sentence_complexity": "low/medium/high",
  "text_complexity_notes": "brief note on text complexity",
  "suggested_questions": {
    "recall": ["1-2 recall questions about this work"],
    "explanation": ["1-2 explanation questions"],
    "reasoning": ["1-2 reasoning questions"],
    "vocabulary": ["1-2 vocabulary probe questions"],
    "scaffolding": ["1-2 scaffolding prompts to reduce language demand"]
  }
}

Return ONLY valid JSON. Do not include any text outside the JSON object.`;

        let analysisResult: any;
        const isImage = sample.file_type?.startsWith("image/");
        const isPdf = sample.file_type === "application/pdf";

        if (isImage || isPdf) {
          const fileResp = await fetch(sample.file_url);
          const buffer = Buffer.from(await fileResp.arrayBuffer());
          const base64 = buffer.toString("base64");
          const mimeType = sample.file_type;
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{
              role: "user",
              parts: [
                { inlineData: { mimeType, data: base64 } },
                { text: prompt },
              ],
            }],
            config: { maxOutputTokens: 4096 },
          });
          const text = response.text ?? "{}";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        } else {
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: `Work sample title: "${sample.title}"\nSubject: ${sample.subject || "Unknown"}\n\n${prompt}` }] }],
            config: { maxOutputTokens: 4096 },
          });
          const text = response.text ?? "{}";
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        }

        await db.transaction(async (tx) => {
          await tx.execute(sql`UPDATE raepa_work_samples SET ai_analysis = ${JSON.stringify(analysisResult)}::jsonb,
            ai_analysis_status = 'complete', updated_at = NOW() WHERE id = ${sampleId} AND case_id = ${caseId}`);
          await tx.execute(sql`
          INSERT INTO raepa_work_sample_analyses
            (id, case_id, work_sample_id, layer_vocabulary, layer_structures, layer_functions, layer_cognitive,
             conceptual_demand, english_language_demand, academic_register_demand, output_demand,
             evidence_sufficiency, ai_generated, ai_model, ai_version, source_evidence_refs, review_status)
          VALUES (${nanoid()}, ${caseId}, ${sampleId},
            ${JSON.stringify({
              general_academic: analysisResult.academic_vocabulary ?? [],
              discipline_specific: analysisResult.subject_vocabulary ?? [],
              command_words: analysisResult.command_words ?? [],
              polysemous: analysisResult.polysemous_vocabulary ?? [],
              abstract: analysisResult.abstract_terminology ?? [],
            })}::jsonb,
            ${JSON.stringify({
              identified: analysisResult.academic_language_structures ?? [],
              notes: analysisResult.text_complexity_notes ?? null,
            })}::jsonb,
            ${JSON.stringify({ required: analysisResult.language_functions_required ?? [] })}::jsonb,
            ${JSON.stringify({
              steps: analysisResult.estimated_steps ?? null,
              barriers: analysisResult.potential_barriers ?? [],
              cognitive_demand: analysisResult.cognitive_demand ?? null,
            })}::jsonb,
            ${analysisResult.conceptual_demand ?? null}, ${analysisResult.english_language_demand ?? null},
            ${analysisResult.academic_register_demand ?? null}, ${analysisResult.writing_demand ?? null},
            ${analysisResult.evidence_sufficiency ?? "limited"}, TRUE, 'gemini', 'gemini-2.5-flash',
             ${JSON.stringify([{ type: "work_sample", id: sampleId }])}::jsonb, 'unreviewed')
          ON CONFLICT (work_sample_id) DO UPDATE SET
            layer_vocabulary = EXCLUDED.layer_vocabulary, layer_structures = EXCLUDED.layer_structures,
            layer_functions = EXCLUDED.layer_functions, layer_cognitive = EXCLUDED.layer_cognitive,
            evidence_sufficiency = EXCLUDED.evidence_sufficiency, ai_generated = TRUE,
             ai_model = EXCLUDED.ai_model, ai_version = EXCLUDED.ai_version, review_status = 'unreviewed',
             reviewer_id = NULL, reviewed_at = NULL, updated_at = NOW()
          `);
          await invalidateRaepaEvidence(caseId, user.id, user.role, true, tx);
        });
        await writeAudit({ eventType: "raepa.work_sample_analysis.generated", caseId, actorId: user.id, actorRole: user.role, metadata: { sampleId } });
        logger.info({ sampleId }, "RAEPA work sample AI analysis complete");
      } catch (err) {
        logger.error({ err, sampleId }, "RAEPA AI analysis failed");
        await db.execute(sql`UPDATE raepa_work_samples SET ai_analysis_status = 'error', updated_at = NOW() WHERE id = ${sampleId} AND case_id = ${caseId}`);
      }
    })();

    res.json({ ok: true, status: "processing" });
  } catch (err) { logger.error({ err }, "raepa trigger analysis"); res.status(500).json({ error: "Server error" }); }
});

// ── GET domain ratings ────────────────────────────────────────────────────────
router.get("/cases/:caseId/raepa/domain-ratings", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const session = await db.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (session.rows.length === 0) return res.json([]);
    const sid = session.rows[0].id as string;
    const rows = await db.execute(sql`SELECT * FROM raepa_domain_ratings WHERE session_id = ${sid}`);
    res.json(rows.rows);
  } catch (err) { logger.error({ err }, "raepa get domain ratings"); res.status(500).json({ error: "Server error" }); }
});

// ── POST domain ratings (upsert) ──────────────────────────────────────────────
router.post("/cases/:caseId/raepa/domain-ratings", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const parsedRatings = z.array(domainRatingSchema).safeParse(req.body?.ratings ?? []);
    if (!parsedRatings.success) { res.status(400).json({ error: "Invalid domain ratings", details: parsedRatings.error.flatten() }); return; }
    const ratings = parsedRatings.data;
    const updated = await db.transaction(async (tx) => {
      const session = await tx.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
      if (session.rows.length === 0) return null;
      const sid = session.rows[0].id as string;
      for (const r of ratings) {
      const existing = await tx.execute(sql`SELECT id FROM raepa_domain_ratings WHERE session_id = ${sid} AND domain = ${r.domain} LIMIT 1`);
      if (existing.rows.length === 0) {
        await tx.execute(sql`INSERT INTO raepa_domain_ratings
          (id, session_id, domain, score, confidence, evidence, support_level_required, created_at, updated_at)
          VALUES (${nanoid()}, ${sid}, ${r.domain}, ${r.score ?? 0}, ${r.confidence ?? null},
            ${r.evidence ?? null}, ${r.support_level_required ?? null}, NOW(), NOW())`);
      } else {
        const rid = existing.rows[0].id as string;
        await tx.execute(sql`UPDATE raepa_domain_ratings SET score = ${r.score ?? 0},
          confidence = ${r.confidence ?? null}, evidence = ${r.evidence ?? null},
          support_level_required = ${r.support_level_required ?? null}, updated_at = NOW() WHERE id = ${rid}`);
      }
      }
      await invalidateRaepaEvidence(caseId, user.id, user.role, false, tx);
      return tx.execute(sql`SELECT * FROM raepa_domain_ratings WHERE session_id = ${sid}`);
    });
    if (!updated) { res.status(400).json({ error: "No session found" }); return; }
    await writeAudit({ eventType: "raepa.reports.invalidated", caseId, actorId: user.id, actorRole: user.role,
      metadata: { reason: "raepa.domain_ratings.updated" } });
    res.json(updated.rows);
  } catch (err) { logger.error({ err }, "raepa post domain ratings"); res.status(500).json({ error: "Server error" }); }
});

// ── GET language functions ────────────────────────────────────────────────────
router.get("/cases/:caseId/raepa/language-functions", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const session = await db.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (session.rows.length === 0) return res.json([]);
    const sid = session.rows[0].id as string;
    const rows = await db.execute(sql`SELECT * FROM raepa_language_functions WHERE session_id = ${sid}`);
    res.json(rows.rows);
  } catch (err) { logger.error({ err }, "raepa get language functions"); res.status(500).json({ error: "Server error" }); }
});

// ── POST language functions (upsert) ──────────────────────────────────────────
router.post("/cases/:caseId/raepa/language-functions", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const parsedFunctions = z.array(languageFunctionSchema).safeParse(req.body?.functions ?? []);
    if (!parsedFunctions.success) { res.status(400).json({ error: "Invalid language functions", details: parsedFunctions.error.flatten() }); return; }
    const functions = parsedFunctions.data;
    const updated = await db.transaction(async (tx) => {
      const session = await tx.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
      if (session.rows.length === 0) return null;
      const sid = session.rows[0].id as string;
      for (const f of functions) {
      const existing = await tx.execute(sql`SELECT id FROM raepa_language_functions WHERE session_id = ${sid} AND function_name = ${f.function_name} LIMIT 1`);
      if (existing.rows.length === 0) {
        await tx.execute(sql`INSERT INTO raepa_language_functions
          (id, session_id, function_name, level, evidence, subject_context, created_at, updated_at)
          VALUES (${nanoid()}, ${sid}, ${f.function_name}, ${f.level}, ${f.evidence ?? null},
            ${f.subject_context ?? null}, NOW(), NOW())`);
      } else {
        const fid = existing.rows[0].id as string;
        await tx.execute(sql`UPDATE raepa_language_functions SET level = ${f.level},
          evidence = ${f.evidence ?? null}, subject_context = ${f.subject_context ?? null},
          updated_at = NOW() WHERE id = ${fid}`);
      }
      }
      await invalidateRaepaEvidence(caseId, user.id, user.role, false, tx);
      return tx.execute(sql`SELECT * FROM raepa_language_functions WHERE session_id = ${sid}`);
    });
    if (!updated) { res.status(400).json({ error: "No session found" }); return; }
    await writeAudit({ eventType: "raepa.reports.invalidated", caseId, actorId: user.id, actorRole: user.role,
      metadata: { reason: "raepa.language_functions.updated" } });
    res.json(updated.rows);
  } catch (err) { logger.error({ err }, "raepa post language functions"); res.status(500).json({ error: "Server error" }); }
});

// ── GET module scores ─────────────────────────────────────────────────────────
router.get("/cases/:caseId/raepa/module-scores", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const session = await db.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (session.rows.length === 0) return res.json([]);
    const sid = session.rows[0].id as string;
    const rows = await db.execute(sql`SELECT * FROM raepa_module_scores WHERE session_id = ${sid}`);
    res.json(rows.rows);
  } catch (err) { logger.error({ err }, "raepa get module scores"); res.status(500).json({ error: "Server error" }); }
});

// ── POST module score (upsert) ────────────────────────────────────────────────
router.post("/cases/:caseId/raepa/module-scores", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const parsedScore = moduleScoreSchema.safeParse(req.body);
    if (!parsedScore.success) { res.status(400).json({ error: "Invalid module score", details: parsedScore.error.flatten() }); return; }
    const b = parsedScore.data;
    const result = await db.transaction(async (tx) => {
    const session = await tx.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (session.rows.length === 0) return null;
    const sid = session.rows[0].id as string;
    const existing = await tx.execute(sql`SELECT id FROM raepa_module_scores WHERE session_id = ${sid} AND module_id = ${b.module_id} LIMIT 1`);
    if (existing.rows.length === 0) {
      const id = nanoid();
      await tx.execute(sql`INSERT INTO raepa_module_scores
        (id, session_id, case_id, module_id, administered, score, support_level, observations, task_notes, created_at, updated_at)
        VALUES (${id}, ${sid}, ${caseId}, ${b.module_id}, ${b.administered ?? false}, ${b.score ?? 0},
          ${b.support_level ?? null}, ${b.observations ?? null}, ${JSON.stringify(b.task_notes ?? {})}::jsonb, NOW(), NOW())`);
      await invalidateRaepaEvidence(caseId, user.id, user.role, false, tx);
      return tx.execute(sql`SELECT * FROM raepa_module_scores WHERE id = ${id}`);
    } else {
      const mid = existing.rows[0].id as string;
      await tx.execute(sql`UPDATE raepa_module_scores SET administered = ${b.administered ?? false},
        score = ${b.score ?? 0}, support_level = ${b.support_level ?? null},
        observations = ${b.observations ?? null}, task_notes = ${JSON.stringify(b.task_notes ?? {})}::jsonb,
        updated_at = NOW() WHERE id = ${mid}`);
      await invalidateRaepaEvidence(caseId, user.id, user.role, false, tx);
      return tx.execute(sql`SELECT * FROM raepa_module_scores WHERE id = ${mid}`);
    }
    });
    if (!result) { res.status(400).json({ error: "No session found" }); return; }
    await writeAudit({ eventType: "raepa.reports.invalidated", caseId, actorId: user.id, actorRole: user.role,
      metadata: { reason: "raepa.module_score.updated" } });
    return res.json(result.rows[0]);
  } catch (err) { logger.error({ err }, "raepa post module score"); res.status(500).json({ error: "Server error" }); }
});

// ── GET / generate teacher upload token ────────────────────────────────────────
router.get("/cases/:caseId/raepa/teacher-token", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id!, user.role!)) return res.status(403).json({ error: "Forbidden" });
    if (!isAssessmentLead(user.role)) return res.status(403).json({ error: "Assessment Lead or admin access required" });
    const existing = await db.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Session not found. Save setup first." });
    const token = crypto.randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.execute(sql`INSERT INTO raepa_access_tokens (id, case_id, token_hash, scope, expires_at, created_by)
      VALUES (${nanoid()}, ${caseId}, ${tokenHash(token)}, 'teacher', ${expiresAt}, ${user.id})`);
    await writeAudit({ eventType: "raepa.access_token.minted", caseId, actorId: user.id, actorRole: user.role, metadata: { scope: "teacher", expiresAt, source: "teacher-token" } });
    res.json({ token, scope: "teacher", expires_at: expiresAt.toISOString() });
  } catch (err) { logger.error({ err }, "raepa get teacher token"); res.status(500).json({ error: "Server error" }); }
});

// ── AI: generate elicitation content ──────────────────────────────────────────
router.post("/cases/:caseId/raepa/generate-elicitation", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  const { domain, promptIndex, promptText } = req.body as { domain: string; promptIndex: number; promptText: string };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });

    // Fetch case, session, and work sample context in parallel
    const [caseRows, sessionRows, sampleRows] = await Promise.all([
      db.execute(sql`SELECT student_name, dob FROM cases WHERE id = ${caseId} LIMIT 1`),
      db.execute(sql`SELECT language_background FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`),
      db.execute(sql`SELECT subject, grade_level, task_type, ai_analysis FROM raepa_work_samples WHERE case_id = ${caseId} AND ai_analysis IS NOT NULL ORDER BY created_at DESC LIMIT 6`),
    ]);

    const caseRow = caseRows.rows[0] as any;
    const sessionRow = sessionRows.rows[0] as any;
    const samples = sampleRows.rows as any[];

    // Calculate student age
    let ageStr = "school-age";
    if (caseRow?.dob) {
      const dob = new Date(caseRow.dob);
      const today = new Date();
      let a = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
      ageStr = `${a} years old`;
    }

    const langBg: Record<string, string> = sessionRow?.language_background
      ? (typeof sessionRow.language_background === "string"
          ? JSON.parse(sessionRow.language_background)
          : sessionRow.language_background)
      : {};
    const l1 = langBg.l1 || "unknown";
    const yearsInEnglish = langBg.years_in_english || "unknown";

    // Parse AI analysis from each work sample to extract vocabulary and suggested questions
    const parsedSamples = samples.map(s => {
      let analysis: any = {};
      try {
        analysis = typeof s.ai_analysis === "string" ? JSON.parse(s.ai_analysis) : (s.ai_analysis ?? {});
      } catch { /* ignore */ }
      return { subject: s.subject, grade_level: s.grade_level, task_type: s.task_type, analysis };
    });

    const allAcademicVocab = [...new Set(parsedSamples.flatMap(s => s.analysis.academic_vocabulary ?? []))].slice(0, 12);
    const allSubjectVocab  = [...new Set(parsedSamples.flatMap(s => s.analysis.subject_vocabulary  ?? []))].slice(0, 12);
    const allCommandWords  = [...new Set(parsedSamples.flatMap(s => s.analysis.command_words       ?? []))].slice(0, 8);
    const allBarriers      = [...new Set(parsedSamples.flatMap(s => s.analysis.potential_barriers  ?? []))].slice(0, 5);
    const suggestedQs      = parsedSamples[0]?.analysis.suggested_questions ?? {};

    const sampleContext = parsedSamples.length > 0
      ? parsedSamples.map(s => `- Subject: ${s.subject || "unknown"}, Grade: ${s.grade_level || "not specified"}, Task type: ${s.task_type || "unknown"}`).join("\n")
      : "No work samples on file.";

    const vocabContext = [
      allAcademicVocab.length > 0 ? `Academic (Tier 2) vocabulary found in work samples: ${allAcademicVocab.join(", ")}` : null,
      allSubjectVocab.length  > 0 ? `Subject-specific (Tier 3) vocabulary found: ${allSubjectVocab.join(", ")}` : null,
      allCommandWords.length  > 0 ? `Task command words used: ${allCommandWords.join(", ")}` : null,
      allBarriers.length      > 0 ? `Identified language barriers: ${allBarriers.join("; ")}` : null,
      suggestedQs.vocabulary  ? `Suggested vocabulary probe questions from work sample analysis: ${(suggestedQs.vocabulary as string[]).join(" | ")}` : null,
      suggestedQs.explanation ? `Suggested explanation questions: ${(suggestedQs.explanation as string[]).join(" | ")}` : null,
      suggestedQs.reasoning   ? `Suggested reasoning questions: ${(suggestedQs.reasoning as string[]).join(" | ")}` : null,
    ].filter(Boolean).join("\n");

    const gradeHint = parsedSamples.find(s => s.grade_level)?.grade_level ?? "primary/secondary school";

    const isReadingDomain = ["Academic Reading", "Inference and Prediction"].includes(domain);

    const systemPrompt = `You are an expert EAL/D (English as an Additional Language or Dialect) assessment specialist creating ready-to-use elicitation content for the ReMynd Academic English Performance Assessment (RAEPA).

Return ONLY a valid JSON object. No preamble, no commentary, no markdown code fences. All string values must use \\n for line breaks — never include literal newline characters inside JSON string values.

Structure A — standard (spoken questions, word lists, instructions, non-reading tasks):
{"text":"<content here>","imagePrompts":null}

Structure B — reading passage tasks (ONLY for Academic Reading or Inference and Prediction):
{"passage":"<the reading text the student reads silently>","questions":["<comprehension question 1>","<comprehension question 2>","<comprehension question 3>"],"imagePrompts":null}
Use Structure B when the task requires the student to read a passage and then answer comprehension or inference questions. The passage and questions MUST be separate fields — never combine them into a single text string.

Structure C — when visuals ARE needed (pictures/objects the student looks at):
{"text":"Look at Picture 1 and Picture 2 below.\\n\\nHow are these two animals similar? How are they different?","imagePrompts":[{"label":"Picture 1","description":"a domestic cat sitting on a mat, simple cartoon illustration"},{"label":"Picture 2","description":"a domestic dog sitting, simple cartoon illustration"}]}

ASSESSMENT SETTING (apply to ALL content):
The RAEPA is conducted one-on-one at a table or desk in a quiet room. The student is seated and focused. All tasks must be completable WITHOUT leaving the seat. Never generate instructions that require the student to walk around the room, fetch objects from shelves or other furniture, stand up, or interact with things outside the immediate desk area.

For multi-step verbal instructions (Academic Listening), instructions must describe REAL, OBSERVABLE actions the student physically carries out right now — not imagined, hypothetical, or described actions. The examiner has basic materials at the desk: a pencil, a blank sheet of paper, and 2–3 small cards or objects. Use only these. Good examples:
- "Pick up your pencil. Write your first name at the top of the paper. Then turn the paper over."
- "Take the blue card and place it on top of the paper. Then pick up the pencil and tap the card twice."
- "Draw a circle in the middle of the paper. Write the number 3 inside the circle. Then put your pencil down."
Never use "imagine", "pretend", "think about", or any frame that removes the need for physical action.

CRITICAL RULES:
1. When images are required, put rich descriptions in "imagePrompts[].description" — NOT inline in "text".
2. In "text", only refer to images by label ("Picture 1", "Picture 2") — never write "(Picture 1: a cat)" or similar.
3. imagePrompts descriptions must be detailed enough to generate a clear image (species, colour, setting, style).
4. Return ONLY the raw JSON object — no wrapping text before or after.`;

    const userMessage = `${isReadingDomain
      ? `IMPORTANT: This is a READING PASSAGE task. You MUST use Structure B:
{"passage":"<reading text only — no questions>","questions":["<question 1>","<question 2>","<question 3>"],"imagePrompts":null}
The passage and questions MUST be in separate JSON fields. Do NOT combine them into one "text" field.

`
      : ""}Student profile:
- Age: ${ageStr}
- First language (L1): ${l1}
- Years in English-medium schooling: ${yearsInEnglish}
- Approximate grade: ${gradeHint}

Work samples on file:
${sampleContext}
${vocabContext ? `\nExtracted from work sample AI analysis:\n${vocabContext}` : ""}
RAEPA domain being assessed: ${domain}

The examiner prompt says: "${promptText}"

Generate the ready-to-use content. Calibrate difficulty to the student's age and background. Keep it suitable for a 2–4 minute activity.
${isReadingDomain ? "Return Structure B JSON (passage + questions array)." : "Return Structure A JSON (or Structure C if images are needed)."}
Return ONLY the JSON object.`;

    const rawContent = await callGroq([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], 900);

    // Parse structured response
    logger.info({ rawContent }, "raepa generate-elicitation raw AI response");
    let textContent = rawContent;
    let questions: string[] | undefined = undefined;
    let imagePrompts: Array<{ label: string; description: string }> | null = null;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(jsonStr) as Record<string, unknown>;
        } catch {
          // Groq sometimes emits literal newlines inside JSON string values (invalid JSON).
          // Sanitize: replace literal newlines within quoted string values, then retry.
          const sanitized = jsonStr.replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
            match.replace(/\n/g, "\\n").replace(/\r/g, "").replace(/\t/g, "\\t")
          );
          parsed = JSON.parse(sanitized) as Record<string, unknown>;
        }
        // Structure B: reading passage with separate questions array
        if (typeof parsed.passage === "string") {
          textContent = parsed.passage;
          if (Array.isArray(parsed.questions) && (parsed.questions as unknown[]).length > 0) {
            questions = (parsed.questions as unknown[]).filter(q => typeof q === "string") as string[];
          }
        } else if (typeof parsed.text === "string") {
          textContent = parsed.text;
        }
        if (Array.isArray(parsed.imagePrompts) && (parsed.imagePrompts as unknown[]).length > 0) {
          imagePrompts = parsed.imagePrompts as Array<{ label: string; description: string }>;
        }
      }
    } catch (parseErr) {
      logger.warn({ parseErr, rawContent }, "raepa JSON parse failed — using raw text");
    }

    // Final defensive strip: if textContent is still raw JSON (both parse attempts failed),
    // extract the passage/text field with a regex as last resort.
    if (textContent.trimStart().startsWith("{")) {
      const passageMatch = textContent.match(/"passage"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
      const textMatch    = textContent.match(/"text"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
      const questionsMatch = textContent.match(/"questions"\s*:\s*\[([\s\S]*?)\]/);
      if (passageMatch) {
        textContent = passageMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"');
        if (!questions && questionsMatch) {
          try {
            questions = JSON.parse(`[${questionsMatch[1]}]`) as string[];
          } catch { /* ignore */ }
        }
      } else if (textMatch) {
        textContent = textMatch[1].replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"');
      }
      logger.info({ textContent }, "raepa defensive strip applied");
    }

    logger.info({ textContent, imagePrompts }, "raepa parsed result");

    // Fallback: detect inline picture descriptions the model left in the text.
    // Handles both bracketed "(Picture 1: A cat)" and bare "Picture 1: A cat" on its own line.
    if (!imagePrompts) {
      // Pattern A — bracketed: (Picture 1: ...) or [Image 2: ...]
      const bracketedPattern = /[\[\(](?:Picture|Image|Stimulus|Photo|Item)\s*(\d+)[:\s-]+([^\]\)\n]{3,200})[\]\)]/gi;
      // Pattern B — bare line: "Picture 1: A cat" or "Image 2 - A dog" (must start at line boundary)
      const barePattern = /^[ \t]*(?:Picture|Image|Stimulus|Photo|Item)\s*(\d+)[:\s-]+([^\n]{3,200})/gim;

      const seen = new Set<string>();
      const extracted: Array<{ label: string; description: string }> = [];

      for (const pattern of [bracketedPattern, barePattern]) {
        for (const m of textContent.matchAll(pattern)) {
          const key = `Picture ${m[1]}`;
          if (!seen.has(key)) {
            seen.add(key);
            extracted.push({ label: key, description: m[2].trim() });
          }
        }
      }

      if (extracted.length > 0) {
        imagePrompts = extracted;
        // Replace all matching text with clean label references
        textContent = textContent
          .replace(bracketedPattern, (_m, n) => `[Picture ${n} shown below]`)
          .replace(barePattern, (_m, n) => `[Picture ${n} shown below]`);
      }
    }

    // Generate images in parallel (Gemini vision)
    let images: Array<{ label: string; dataUrl: string }> | undefined = undefined;
    if (imagePrompts && imagePrompts.length > 0) {
      try {
        images = await Promise.all(
          imagePrompts.map(async (ip) => {
            const result = await generateImage(
              `Simple, clean educational illustration for a child language assessment. ${ip.description}. White background, no text or letters in the image, clear cartoon style suitable for school-age children.`
            );
            const dataUrl = `data:${result.mimeType};base64,${result.b64_json}`;
            logger.info({ label: ip.label, mimeType: result.mimeType, b64Len: result.b64_json.length }, "raepa image generated");
            return { label: ip.label, dataUrl };
          })
        );
      } catch (imgErr) {
        logger.warn({ imgErr }, "raepa image generation failed — returning text only");
      }
    }

    res.json({ content: textContent, questions, images });
  } catch (err) {
    logger.error({ err }, "raepa generate-elicitation");
    res.status(500).json({ error: "Generation failed" });
  }
});

type ReportEvidenceRef = { id: string; type: string; label: string };
type ReportFinding = { id: string; section_key: string; narrative_text: string; conclusion: string; evidence_refs: string[] };
type CanonicalEvidenceBundle = {
  profile: any;
  language_history: any[];
  subject_history: any[];
  work_samples: any[];
  work_sample_analyses: any[];
  structure_results: any[];
  discipline_results: any[];
  teacher_profiles: any[];
  student_interviews: any[];
  student_responses: any[];
  hypotheses: any[];
  plans: any[];
  tasks: any[];
  module_scores: any[];
  domain_results: any[];
  language_functions: any[];
  dynamic_trials: any[];
  concept_language: any[];
  recommendations: any[];
  additional_evidence: any[];
  source_refs: ReportEvidenceRef[];
  findings: ReportFinding[];
};

function bundleRef(type: string, row: any, label: string): ReportEvidenceRef {
  return { id: `${type}:${String(row.id)}`, type, label };
}

async function buildCanonicalEvidenceBundle(caseId: string, executor: any = db): Promise<CanonicalEvidenceBundle> {
  const session = await executor.execute(sql`SELECT id, language_background, pathway FROM raepa_sessions WHERE case_id = ${caseId} ORDER BY updated_at DESC LIMIT 1`);
  const sessionId = (session.rows[0] as any)?.id ?? "";
  const [
    profileRows, languageRows, subjectRows, sampleRows, analysisRows, teacherRows,
    interviewRows, responseRows, hypothesisRows, planRows, taskRows, moduleRows,
    domainRows, functionRows, trialRows, conceptRows, recommendationRows, evidenceRows,
  ] = await Promise.all([
    executor.execute(sql`SELECT * FROM raepa_profiles WHERE case_id = ${caseId} LIMIT 1`),
    executor.execute(sql`SELECT * FROM raepa_language_academic_history WHERE case_id = ${caseId} ORDER BY created_at`),
    executor.execute(sql`SELECT * FROM raepa_subject_language_history WHERE case_id = ${caseId} ORDER BY created_at`),
    executor.execute(sql`SELECT * FROM raepa_work_samples WHERE case_id = ${caseId} ORDER BY created_at`),
    executor.execute(sql`SELECT a.* FROM raepa_work_sample_analyses a
      INNER JOIN raepa_work_samples s ON s.id = a.work_sample_id AND s.case_id = a.case_id
      WHERE s.case_id = ${caseId} ORDER BY a.created_at`),
    executor.execute(sql`SELECT * FROM raepa_teacher_profiles WHERE case_id = ${caseId} ORDER BY created_at`),
    executor.execute(sql`SELECT * FROM raepa_student_interviews WHERE case_id = ${caseId} ORDER BY created_at`),
    executor.execute(sql`SELECT * FROM raepa_student_responses WHERE case_id = ${caseId} ORDER BY created_at`),
    executor.execute(sql`SELECT * FROM raepa_hypotheses WHERE case_id = ${caseId} ORDER BY created_at`),
    executor.execute(sql`SELECT * FROM raepa_assessment_plans WHERE case_id = ${caseId} ORDER BY version DESC`),
    executor.execute(sql`SELECT * FROM raepa_assessment_tasks WHERE case_id = ${caseId} ORDER BY created_at`),
    sessionId ? executor.execute(sql`SELECT * FROM raepa_module_scores WHERE case_id = ${caseId} AND session_id = ${sessionId} ORDER BY created_at`) : Promise.resolve({ rows: [] }),
    sessionId ? executor.execute(sql`SELECT * FROM raepa_domain_ratings WHERE session_id = ${sessionId} ORDER BY domain`) : Promise.resolve({ rows: [] }),
    sessionId ? executor.execute(sql`SELECT * FROM raepa_language_functions WHERE session_id = ${sessionId} ORDER BY function_name`) : Promise.resolve({ rows: [] }),
    executor.execute(sql`SELECT * FROM raepa_dynamic_trials WHERE case_id = ${caseId} ORDER BY created_at`),
    executor.execute(sql`SELECT * FROM raepa_concept_language_relationships WHERE case_id = ${caseId} ORDER BY created_at`),
    executor.execute(sql`SELECT * FROM raepa_recommendations WHERE case_id = ${caseId} ORDER BY created_at`),
    executor.execute(sql`SELECT * FROM raepa_v2_evidence WHERE case_id = ${caseId} ORDER BY created_at`),
  ]);
  const profile = profileRows.rows[0] ?? null;
  const rows: Array<{ type: string; values: any[]; label: string }> = [
    { type: "profile", values: profile ? [profile] : [], label: "Reviewed profile" },
    { type: "language-history", values: languageRows.rows as any[], label: "Language history" },
    { type: "subject-history", values: subjectRows.rows as any[], label: "Subject language history" },
    { type: "work-sample", values: sampleRows.rows as any[], label: "Contextualized work sample" },
    { type: "work-analysis", values: analysisRows.rows as any[], label: "Four-layer work analysis" },
    { type: "teacher-profile", values: teacherRows.rows as any[], label: "Teacher profile" },
    { type: "student-interview", values: interviewRows.rows as any[], label: "Student interview" },
    { type: "student-response", values: responseRows.rows as any[], label: "Student response" },
    { type: "hypothesis", values: hypothesisRows.rows as any[], label: "Reviewed hypothesis" },
    { type: "plan", values: planRows.rows as any[], label: "Assessment plan" },
    { type: "task", values: taskRows.rows as any[], label: "Assessment task" },
    { type: "module-score", values: moduleRows.rows as any[], label: "Module result" },
    { type: "domain-result", values: domainRows.rows as any[], label: "Domain result" },
    { type: "language-function", values: functionRows.rows as any[], label: "Language function result" },
    { type: "dynamic-trial", values: trialRows.rows as any[], label: "Dynamic trial" },
    { type: "concept-language", values: conceptRows.rows as any[], label: "Concept-language relationship" },
    { type: "recommendation", values: recommendationRows.rows as any[], label: "Evidence-linked recommendation" },
    { type: "evidence", values: evidenceRows.rows as any[], label: "Additional evidence" },
  ];
  const sourceRefs = rows.flatMap(group => group.values.map(row => bundleRef(group.type, row, group.label)));
  if (sessionId) sourceRefs.push({ id: `session:${sessionId}`, type: "session", label: "RAEPA session" });
  const byType = (type: string) => sourceRefs.filter(ref => ref.type === type).map(ref => ref.id);
  const findings: ReportFinding[] = [];
  const addFinding = (id: string, conclusion: string, refs: string[]) => {
    if (refs.length) findings.push({ id, conclusion, evidence_refs: refs });
  };
  addFinding("profile-context", "The report is grounded in reviewed profile and language/subject context.", [
    ...byType("profile"), ...byType("language-history"), ...byType("subject-history"),
  ]);
  addFinding("work-products", "Work products are interpreted with classroom context and four-layer analysis.", [
    ...byType("work-sample"), ...byType("work-analysis"),
  ]);
  addFinding("performance-results", "Observed performance includes recorded module, domain, and language-function results.", [
    ...byType("module-score"), ...byType("domain-result"), ...byType("language-function"),
  ]);
  addFinding("dynamic-evidence", "Mediation, transfer, and concept-language relationships are represented where recorded.", [
    ...byType("dynamic-trial"), ...byType("concept-language"),
  ]);
  addFinding("supports", "Recommendations and planning are linked to recorded evidence.", [
    ...byType("hypothesis"), ...byType("plan"), ...byType("task"), ...byType("recommendation"),
  ]);
  return {
    profile, language_history: languageRows.rows as any[], subject_history: subjectRows.rows as any[],
    work_samples: sampleRows.rows as any[], work_sample_analyses: analysisRows.rows as any[],
    structure_results: (analysisRows.rows as any[]).map(row => ({ id: row.id, work_sample_id: row.work_sample_id, structures: row.layer_structures, evidence_refs: [`work-analysis:${row.id}`] })),
    discipline_results: (sampleRows.rows as any[]).map(row => ({ id: row.id, subject: row.subject, task_type: row.task_type, evidence_refs: [`work-sample:${row.id}`] })),
    teacher_profiles: teacherRows.rows as any[], student_interviews: interviewRows.rows as any[],
    student_responses: responseRows.rows as any[], hypotheses: hypothesisRows.rows as any[],
    plans: planRows.rows as any[], tasks: taskRows.rows as any[], module_scores: moduleRows.rows as any[],
    domain_results: domainRows.rows as any[], language_functions: functionRows.rows as any[],
    dynamic_trials: trialRows.rows as any[], concept_language: conceptRows.rows as any[],
    recommendations: recommendationRows.rows as any[], additional_evidence: evidenceRows.rows as any[],
    source_refs: sourceRefs, findings,
  };
}

function referenceId(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value && typeof value === "object" && typeof (value as any).id === "string") return String((value as any).id).trim();
  return "";
}

function reportFindings(value: unknown): ReportFinding[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any, index) => ({
    id: typeof item?.id === "string" && item.id.trim() ? item.id.trim() : `finding-${index + 1}`,
    section_key: typeof item?.section_key === "string" ? item.section_key.trim() : "",
    narrative_text: typeof item?.narrative_text === "string" ? item.narrative_text.trim() : "",
    conclusion: typeof item?.conclusion === "string" ? item.conclusion.trim() : "",
    evidence_refs: Array.isArray(item?.evidence_refs) ? item.evidence_refs.map(referenceId).filter(Boolean) : [],
  }));
}

function narrativeSections(text: string): Array<{ section_key: string; narrative_text: string }> {
  const headings = [...text.matchAll(/^\s*\*\*(.+?)\*\*\s*$/gm)];
  if (!headings.length) return text.trim() ? [{ section_key: "report", narrative_text: text.trim() }] : [];
  const sections: Array<{ section_key: string; narrative_text: string }> = [];
  const preamble = text.slice(0, headings[0].index ?? 0).trim();
  if (preamble) sections.push({ section_key: "preamble", narrative_text: preamble });
  sections.push(...headings.map((heading, index) => {
    const start = (heading.index ?? 0) + heading[0].length;
    const end = index + 1 < headings.length ? (headings[index + 1].index ?? text.length) : text.length;
    const title = String(heading[1]).trim();
    const section_key = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${index + 1}`;
    return { section_key, narrative_text: text.slice(start, end).trim() };
  }).filter(section => section.narrative_text.length >= 20));
  return sections;
}

function refsForNarrativeSection(sectionKey: string, bundle: CanonicalEvidenceBundle): string[] {
  const key = sectionKey.toLowerCase();
  const refs = (types: string[]) => bundle.source_refs.filter(ref => types.includes(ref.type)).map(ref => ref.id);
  let selected: string[] = [];
  if (key.includes("work") || key.includes("subject")) selected = refs(["work-sample", "work-analysis"]);
  else if (key.includes("domain") || key.includes("performance") || key.includes("result")) selected = refs(["module-score", "domain-result", "language-function"]);
  else if (key.includes("function")) selected = refs(["language-function", "work-analysis"]);
  else if (key.includes("structure")) selected = refs(["work-analysis"]);
  else if (key.includes("recommend") || key.includes("strategy") || key.includes("goal") || key.includes("support")) selected = refs(["recommendation", "hypothesis", "plan", "task", "dynamic-trial"]);
  else selected = refs(["profile", "language-history", "subject-history", "teacher-profile", "student-interview", "student-response", "evidence", "work-sample"]);
  return selected.length ? selected : bundle.source_refs.map(ref => ref.id);
}

function deriveNarrativeFindings(text: string, bundle: CanonicalEvidenceBundle): ReportFinding[] {
  return narrativeSections(text).map((section, index) => ({
    id: `finding-${index + 1}-${section.section_key}`,
    section_key: section.section_key,
    narrative_text: section.narrative_text,
    conclusion: section.narrative_text,
    evidence_refs: refsForNarrativeSection(section.section_key, bundle),
  }));
}

function validateNarrativeFindings(text: string, value: unknown, bundle: CanonicalEvidenceBundle): { valid: boolean; findings: ReportFinding[]; error?: string } {
  const findings = reportFindings(value);
  const sections = narrativeSections(text);
  const knownRefs = new Set(bundle.source_refs.flatMap(ref => [ref.id, ref.id.slice(ref.id.indexOf(":") + 1)]));
  if (!sections.length) return { valid: false, findings, error: "Narrative must contain substantive text" };
  if (!findings.length) return { valid: false, findings, error: "findings must contain one mapping per substantive narrative section" };
  const normalized: ReportFinding[] = [];
  for (const section of sections) {
    const finding = findings.find(item => item.section_key === section.section_key || (item.narrative_text && item.narrative_text === section.narrative_text));
    if (!finding) return { valid: false, findings, error: `Missing evidence mapping for narrative section '${section.section_key}'` };
    if (finding.narrative_text && finding.narrative_text !== section.narrative_text) {
      return { valid: false, findings, error: `Narrative mapping for '${section.section_key}' is stale; resend narrative_text or use the current stable section_key` };
    }
    if (!finding.evidence_refs.length) return { valid: false, findings, error: `Narrative section '${section.section_key}' requires evidence_refs` };
    if (finding.evidence_refs.some(ref => !knownRefs.has(ref))) return { valid: false, findings, error: `Narrative section '${section.section_key}' contains an unknown evidence reference` };
    normalized.push({ ...finding, section_key: section.section_key, narrative_text: section.narrative_text, conclusion: section.narrative_text });
  }
  if (findings.length !== normalized.length) return { valid: false, findings, error: "Findings contain stale mappings for removed narrative sections" };
  return { valid: true, findings: normalized };
}

type ReportPathway = "standalone" | "comprehensive";

function resolveReportNarrative(value: any, pathway: ReportPathway): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const selectedKey = pathway === "comprehensive" ? "comprehensive_text" : "standalone_text";
  if (typeof value[selectedKey] === "string") return value[selectedKey];
  if (typeof value.markdown === "string") return value.markdown;
  return "";
}

// ── AI: generate RAEPA narrative report ──────────────────────────────────────
router.post("/cases/:caseId/raepa/generate-report", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });

    // First fetch the session id (domain_ratings and language_functions are keyed by session_id)
    const sessionIdRow = await db.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    const sessionId = (sessionIdRow.rows[0] as any)?.id as string | undefined;

    const [caseRows, sessionRows, ratingsRows, functionsRows, samplesRows] = await Promise.all([
      db.execute(sql`SELECT student_name, dob FROM cases WHERE id = ${caseId} LIMIT 1`),
      db.execute(sql`SELECT language_background, pathway FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`),
      sessionId
        ? db.execute(sql`SELECT domain, score, confidence, evidence FROM raepa_domain_ratings WHERE session_id = ${sessionId} ORDER BY domain`)
        : Promise.resolve({ rows: [] }),
      sessionId
        ? db.execute(sql`SELECT function_name, level, evidence, subject_context FROM raepa_language_functions WHERE session_id = ${sessionId} ORDER BY function_name`)
        : Promise.resolve({ rows: [] }),
      db.execute(sql`SELECT title, subject, grade_level, task_type, teacher_comments, assignment_instructions, ai_analysis FROM raepa_work_samples WHERE case_id = ${caseId} ORDER BY created_at ASC`),
    ]);
    const evidenceBundle = await buildCanonicalEvidenceBundle(caseId);

    const caseRow = caseRows.rows[0] as any;
    const sessionRow = sessionRows.rows[0] as any;
    const ratings = ratingsRows.rows as any[];
    const fnLevels = functionsRows.rows as any[];
    const samples = samplesRows.rows as any[];

    // Student profile
    const studentName = caseRow?.student_name ?? "the student";
    const firstName = studentName.split(" ")[0];
    let ageStr = "school-age";
    if (caseRow?.dob) {
      const dob = new Date(caseRow.dob);
      const today = new Date();
      let a = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--;
      ageStr = `${a} years old`;
    }

    const langBg: Record<string, string> = sessionRow?.language_background
      ? (typeof sessionRow.language_background === "string" ? JSON.parse(sessionRow.language_background) : sessionRow.language_background)
      : {};
    const l1 = langBg.l1 || "unknown";
    const yearsInEnglish = langBg.years_in_english || "unknown";
    const gradeHint = samples.find((s: any) => s.grade_level)?.grade_level ?? "unknown grade";

    // Domain ratings summary
    const ratingsSummary = ratings.map((r: any) =>
      `${r.domain}: ${r.score}/4 (${r.confidence || "no confidence noted"})${r.evidence ? ` — Evidence: ${r.evidence}` : ""}`
    ).join("\n");

    const strengths = ratings.filter((r: any) => r.score >= 3).map((r: any) => r.domain);
    const developing = ratings.filter((r: any) => r.score === 2).map((r: any) => r.domain);
    const needs = ratings.filter((r: any) => r.score <= 1).map((r: any) => r.domain);

    // Language functions summary
    const fnSummary = fnLevels.map((f: any) =>
      `${f.function_name}: ${f.level}${f.subject_context ? ` (${f.subject_context})` : ""}${f.evidence ? ` — ${f.evidence}` : ""}`
    ).join("\n");

    const securedFns = fnLevels.filter((f: any) => ["functional","independent"].includes(f.level)).map((f: any) => f.function_name);
    const emergingFns = fnLevels.filter((f: any) => ["emerging","developing"].includes(f.level)).map((f: any) => f.function_name);
    const notDemonstratedFns = fnLevels.filter((f: any) => f.level === "not_demonstrated").map((f: any) => f.function_name);

    // Work sample AI analysis — extract rich findings
    const parsedSamples = samples.map((s: any) => {
      let analysis: any = {};
      try { analysis = typeof s.ai_analysis === "string" ? JSON.parse(s.ai_analysis) : (s.ai_analysis ?? {}); } catch { /* */ }
      return { ...s, analysis };
    });

    const allAcademicVocab = [...new Set(parsedSamples.flatMap((s: any) => s.analysis.academic_vocabulary ?? []))];
    const allSubjectVocab = [...new Set(parsedSamples.flatMap((s: any) => s.analysis.subject_vocabulary ?? []))];
    const allBarriers = [...new Set(parsedSamples.flatMap((s: any) => s.analysis.potential_barriers ?? []))];
    const allCommandWords = [...new Set(parsedSamples.flatMap((s: any) => s.analysis.command_words ?? []))];
    const allFnsRequired = [...new Set(parsedSamples.flatMap((s: any) => s.analysis.language_functions_required ?? []))];
    const allStructures = [...new Set(parsedSamples.flatMap((s: any) => s.analysis.academic_language_structures ?? []))];
    const subjectsObserved = [...new Set(parsedSamples.map((s: any) => s.subject || s.analysis.subject).filter(Boolean))];

    const workSampleBlock = parsedSamples.length > 0
      ? parsedSamples.map((s: any, i: number) => {
          const a = s.analysis;
          const lines = [
            `Work Sample ${i + 1}: "${s.title || s.subject || "Untitled"}" — ${a.subject || s.subject || "?"} | ${a.task_type || s.task_type || "?"} | Grade: ${a.grade_range || s.grade_level || "?"}`,
            a.text_complexity_notes ? `  Complexity: ${a.text_complexity_notes}` : null,
            a.reading_demand ? `  Reading demand: ${a.reading_demand} | Writing demand: ${a.writing_demand || "?"}` : null,
            s.assignment_instructions ? `  Assignment: ${s.assignment_instructions.slice(0, 200)}` : null,
            s.teacher_comments ? `  Teacher comments: ${s.teacher_comments.slice(0, 200)}` : null,
            (a.academic_vocabulary?.length) ? `  Academic vocabulary: ${a.academic_vocabulary.slice(0, 10).join(", ")}` : null,
            (a.subject_vocabulary?.length) ? `  Subject vocabulary: ${a.subject_vocabulary.slice(0, 10).join(", ")}` : null,
            (a.command_words?.length) ? `  Command words: ${a.command_words.join(", ")}` : null,
            (a.academic_language_structures?.length) ? `  Academic language structures: ${a.academic_language_structures.slice(0, 10).join(", ")}` : null,
            (a.potential_barriers?.length) ? `  Language barriers identified: ${a.potential_barriers.slice(0, 4).join("; ")}` : null,
          ].filter(Boolean);
          return lines.join("\n");
        }).join("\n\n")
      : "No work samples on file.";

    const systemPrompt = `You are an expert EAL/D assessment specialist writing a comprehensive, clinically rich RAEPA (ReMynd Academic English Performance Assessment) narrative report for a school team.

Write a professional, detailed report in third person using the student's name. Use the student's first name for readability. Be SPECIFIC — reference actual domain scores, language function levels, vocabulary found in work samples, and language barriers identified. Draw directly on the work sample analysis data provided.

Format the report using EXACTLY these section headings (each on its own line, wrapped in **):

**Academic Language Profile Summary**
**Key Findings from Work Sample Analysis**
**Domain Performance Profile**
**Language Function Profile**
**Academic Language Structures Profile**
**Subject-Specific Strategies**
**Classroom Teacher Recommendations**
**Home Support Strategies**
**Tutor Support Strategies**
**Department and School Recommendations**
**Priority Learning Goals**

Rules:
- Use bullet points (- ) for all strategy sections and goals
- In Subject-Specific Strategies, provide tailored bullet points grouped by subject (e.g. Mathematics, Science, English/ELA, Humanities) — only include subjects that appear in the work samples or that are clearly impacted
- In Home Support Strategies, write for parents/carers — practical, jargon-free daily activities
- In Tutor Support Strategies, write for a private tutor or learning support teacher — targeted skill-building activities
- In Department and School Recommendations, address school leadership — systemic supports, timetabling, EAL/D coordinator actions
- In Priority Learning Goals, list 3–5 specific, measurable goals with a timeframe (e.g. "By end of Term 2…")
- Never invent data not present in the input; if a section has limited data, say so briefly
- Write 4–8 bullet points per strategy section`;

    const userMessage = `Student: ${studentName} (${firstName}), ${ageStr}, Grade: ${gradeHint}
First language: ${l1} | Years in English-medium schooling: ${yearsInEnglish}
Subjects observed in work samples: ${subjectsObserved.length > 0 ? subjectsObserved.join(", ") : "Not specified"}

═══════════════════════════════════════════
CANONICAL REPORT EVIDENCE BUNDLE (use only this supplied evidence)
═══════════════════════════════════════════
${JSON.stringify(evidenceBundle)}

═══════════════════════════════════════════
WORK SAMPLE ANALYSIS (from AI analysis of uploaded student work)
═══════════════════════════════════════════
${workSampleBlock}

Across all work samples:
- Academic (Tier 2) vocabulary identified: ${allAcademicVocab.length > 0 ? allAcademicVocab.slice(0, 20).join(", ") : "None extracted"}
- Subject-specific vocabulary identified: ${allSubjectVocab.length > 0 ? allSubjectVocab.slice(0, 20).join(", ") : "None extracted"}
- Command words present in tasks: ${allCommandWords.length > 0 ? allCommandWords.join(", ") : "None extracted"}
- Language functions required by tasks: ${allFnsRequired.length > 0 ? allFnsRequired.join(", ") : "None extracted"}
- Academic language structures required or demonstrated: ${allStructures.length > 0 ? allStructures.join(", ") : "None extracted"}
- Language barriers identified: ${allBarriers.length > 0 ? allBarriers.join("; ") : "None noted"}

═══════════════════════════════════════════
DOMAIN RATINGS (0=Not Demonstrated, 1=Emerging, 2=Developing, 3=Functional, 4=Independent)
═══════════════════════════════════════════
${ratingsSummary}

- Functional/Independent (3–4): ${strengths.length > 0 ? strengths.join(", ") : "None"}
- Developing (2): ${developing.length > 0 ? developing.join(", ") : "None"}
- Emerging/Not Demonstrated (0–1): ${needs.length > 0 ? needs.join(", ") : "None"}

═══════════════════════════════════════════
LANGUAGE FUNCTION LEVELS
═══════════════════════════════════════════
${fnSummary}

- Secured (Functional/Independent): ${securedFns.length > 0 ? securedFns.join(", ") : "None"}
- Emerging/Developing: ${emergingFns.length > 0 ? emergingFns.join(", ") : "None"}
- Not Demonstrated: ${notDemonstratedFns.length > 0 ? notDemonstratedFns.join(", ") : "None"}

Generate the full comprehensive RAEPA report now. Be specific, evidence-based, and practical.`;

    const report = await callGroq([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], 3500);
    const generatedFindings = deriveNarrativeFindings(report, evidenceBundle);

    const persistedSessionId = await ensureSession(caseId);
    const reportPathway = sessionRow?.pathway === "comprehensive" ? "comprehensive" : "standalone";
    const existingReport = await db.execute(sql`SELECT id, status, version, generated_narrative, edited_narrative FROM raepa_reports
      WHERE case_id = ${caseId} ORDER BY updated_at DESC LIMIT 1`);
    const reportId = existingReport.rows[0]?.id ? String(existingReport.rows[0].id) : nanoid();
    const narrativeKey = reportPathway === "comprehensive" ? "comprehensive_text" : "standalone_text";
    const previousGenerated = (existingReport.rows[0] as any)?.generated_narrative;
    const previousEdited = (existingReport.rows[0] as any)?.edited_narrative;
    const generatedBase = previousGenerated && typeof previousGenerated === "object"
      ? previousGenerated
      : typeof previousGenerated === "string" ? { markdown: previousGenerated } : {};
    const editedBase = previousEdited && typeof previousEdited === "object"
      ? previousEdited
      : typeof previousEdited === "string" ? { markdown: previousEdited } : {};
    const generated = { ...generatedBase, [narrativeKey]: report };
    const edited = { ...editedBase, [narrativeKey]: report };
    if (existingReport.rows.length) {
      await db.execute(sql`UPDATE raepa_reports SET generated_narrative = ${JSON.stringify(generated)}::jsonb,
        edited_narrative = ${JSON.stringify(edited)}::jsonb, source_evidence_refs = ${JSON.stringify(evidenceBundle.source_refs)}::jsonb,
        report_findings = ${JSON.stringify(generatedFindings)}::jsonb, status = 'draft',
        professional_approved_by = NULL, professional_approved_at = NULL, approved_by = NULL, approved_at = NULL, qa_status = 'not_run',
        pathway = ${reportPathway},
        version = version + 1, updated_at = NOW() WHERE id = ${reportId}`);
    } else if (persistedSessionId) {
      await db.execute(sql`INSERT INTO raepa_reports
        (id, case_id, session_id, report_type, generated_narrative, edited_narrative, status, source_evidence_refs, report_findings, pathway)
        VALUES (${reportId}, ${caseId}, ${persistedSessionId}, 'raepa', ${JSON.stringify(generated)}::jsonb,
          ${JSON.stringify(edited)}::jsonb, 'draft',
          ${JSON.stringify(evidenceBundle.source_refs)}::jsonb, ${JSON.stringify(generatedFindings)}::jsonb, ${reportPathway})`);
    }
    if (existingReport.rows.length) {
      await writeAudit({ eventType: "raepa.report.regenerated", caseId, actorId: req.userId, actorRole: req.userRole,
        metadata: { reportId, priorStatus: (existingReport.rows[0] as any).status, priorVersion: (existingReport.rows[0] as any).version, pathway: reportPathway } });
    }
    res.json({ report, report_id: reportId });
  } catch (err) {
    logger.error({ err }, "raepa generate-report");
    res.status(500).json({ error: "Report generation failed" });
  }
});

// ── AI: translate RAEPA report ────────────────────────────────────────────────
router.post("/cases/:caseId/raepa/translate-report", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  const { text, targetLang } = req.body as { text: string; targetLang: "zh" | "ko" };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    if (!text || !["zh", "ko"].includes(targetLang)) return res.status(400).json({ error: "Missing text or invalid targetLang" });
    const langName = targetLang === "zh" ? "Simplified Chinese (简体中文)" : "Korean (한국어)";
    const report = await callGroq([
      {
        role: "system",
        content: `You are a professional educational assessment translator specialising in psychoeducational and language assessment reports. Translate the following assessment report into ${langName}. Rules: preserve ALL markdown formatting exactly — bullet points starting with "- ", section headings wrapped in "**...**", bold text with **. Maintain the professional clinical tone. Output ONLY the translated text with no commentary.`,
      },
      { role: "user", content: text },
    ], 4000);
    res.json({ translatedText: report });
  } catch (err) {
    logger.error({ err }, "raepa translate-report");
    res.status(500).json({ error: "Translation failed" });
  }
});

// ── Public: validate teacher token ─────────────────────────────────────────────
router.get("/public/raepa/teacher/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const scoped = await getScopedToken(token);
    if (!scoped || scoped.scope !== "teacher") return res.status(404).json({ error: "Invalid or expired link" });
    const context = await db.execute(sql`
      SELECT c.grade AS grade_level, ws.subject
      FROM cases c LEFT JOIN raepa_work_samples ws ON ws.case_id = c.id
      WHERE c.id = ${scoped.case_id} ORDER BY ws.created_at DESC LIMIT 1
    `);
    const profile = context.rows[0] as any;
    res.json({
      ok: true, scope: scoped.scope, expires_at: scoped.expires_at,
      profile: { gradeLevel: profile?.grade_level ?? null, subject: profile?.subject ?? null },
    });
  } catch (err) { logger.error({ err }, "raepa public teacher validate"); res.status(500).json({ error: "Server error" }); }
});

// ── Public: teacher uploads a work sample ──────────────────────────────────────
router.post("/public/raepa/teacher/:token/upload", upload.single("file"), async (req, res) => {
  const { token } = req.params;
  try {
    const scoped = await getScopedToken(token);
    if (!scoped || scoped.scope !== "teacher") return res.status(404).json({ error: "Invalid or expired link" });
    const caseId = String(scoped.case_id);
    const parsedUpload = teacherUploadSchema.safeParse(Object.fromEntries(
      Object.entries(req.body ?? {}).map(([key, value]) => [key, value === "" ? undefined : value]),
    ));
    if (!parsedUpload.success) {
      res.status(400).json({ error: "Invalid teacher work-sample fields", details: parsedUpload.error.flatten() }); return;
    }
    const body = parsedUpload.data;
    const uploadKey = idempotencyKey(req, "teacher-upload", {
      caseId, tokenId: scoped.id, body,
      file: req.file ? {
        name: req.file.originalname, type: req.file.mimetype, size: req.file.size,
        digest: crypto.createHash("sha256").update(req.file.buffer).digest("hex"),
      } : null,
    });
    const prior = await db.execute(sql`SELECT * FROM raepa_work_samples
      WHERE case_id = ${caseId} AND idempotency_key = ${uploadKey} LIMIT 1`);
    if (prior.rows.length) return res.json({ ok: true, id: prior.rows[0].id, duplicate: true });
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;
    if (req.file) {
      const ext = req.file.originalname.split(".").pop() ?? "bin";
      const key = `raepa/${caseId}/teacher-${nanoid()}.${ext}`;
      await storage.upload(key, req.file.buffer, req.file.mimetype);
      fileUrl = await storage.getSignedUrl(key);
      fileName = req.file.originalname;
      fileType = req.file.mimetype;
    }
    const id = nanoid();
    const result = await db.transaction(async (tx) => {
      const inserted = await tx.execute(sql`
      INSERT INTO raepa_work_samples (
        id, case_id, file_name, file_url, file_type, title, subject, grade_level,
        teacher, task_type, date_completed, independent_completion, support_provided,
        assignment_instructions, student_score, teacher_comments, student_selected, ai_analysis_status, source, language_of_instruction,
        completion_setting,
        expected_outcome, rubric, classroom_context, classroom_access_profile, support_response_matrix, idempotency_key,
        created_at, updated_at
      ) VALUES (
        ${id}, ${caseId}, ${fileName}, ${fileUrl}, ${fileType},
        ${body.title ?? null}, ${body.subject ?? null}, ${body.grade_level ?? null},
        ${body.teacher ?? null}, ${body.task_type ?? null},
        ${body.date_completed ? body.date_completed : null},
        ${body.independent_completion ?? true},
        ${body.support_provided ?? null}, ${body.original_instructions ?? body.assignment_instructions ?? null},
        ${body.student_score ?? body.score ?? null}, ${body.teacher_comments ?? null},
        ${body.student_selected ?? false},
        'pending',
        ${typeof body.source === "string" ? body.source.slice(0, 300) : null},
        ${typeof body.language_of_instruction === "string" ? body.language_of_instruction.slice(0, 200) : null},
        ${typeof body.completion_setting === "string" ? body.completion_setting.slice(0, 80) : null},
        ${typeof body.expected_outcome === "string" ? body.expected_outcome.slice(0, 5000) : null},
        ${typeof body.rubric === "string" ? body.rubric.slice(0, 10000) : null},
        ${typeof body.classroom_context === "string" ? body.classroom_context.slice(0, 10000) : null},
        ${parseJsonField(body.classroom_access_profile)}::jsonb,
        ${parseJsonField(body.support_response_matrix)}::jsonb,
        ${uploadKey},
        NOW(), NOW()
      )
      ON CONFLICT (case_id, idempotency_key) DO NOTHING
      RETURNING *`);
      if (!inserted.rows.length) {
        const duplicate = await tx.execute(sql`SELECT * FROM raepa_work_samples
          WHERE case_id = ${caseId} AND idempotency_key = ${uploadKey} LIMIT 1`);
        return { row: duplicate.rows[0], created: false };
      }
      if (typeof body.classroom_access_profile === "string" || typeof body.support_response_matrix === "string") {
        await tx.execute(sql`INSERT INTO raepa_teacher_profiles (id, case_id, data, original_text, review_status, idempotency_key)
        VALUES (${nanoid()}, ${caseId},
          ${JSON.stringify({
            classroom_access_profile: parseJsonValue(body.classroom_access_profile),
            support_response_matrix: parseJsonValue(body.support_response_matrix),
          })}::jsonb, ${typeof body.classroom_context === "string" ? body.classroom_context.slice(0, 10000) : null}, 'unreviewed', ${uploadKey})`);
      }
      await invalidateRaepaEvidence(caseId, undefined, undefined, true, tx);
      await tx.execute(sql`UPDATE raepa_access_tokens SET used_at = NOW() WHERE id = ${scoped.id}`);
      return { row: inserted.rows[0], created: true };
    });
    if (result.created) {
      await writeAudit({ eventType: "raepa.public.teacher_work_sample.created", caseId, metadata: { workSampleId: id } });
    }
    res.json({ ok: true, id: result.row?.id ?? id, duplicate: !result.created });
  } catch (err) { logger.error({ err }, "raepa public teacher upload"); res.status(500).json({ error: "Server error" }); }
});

// ── Examiner: push stimulus to student view ────────────────────────────────
router.post("/cases/:caseId/raepa/push-stimulus", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const { text, images, questions } = req.body as { text: string; images?: { label: string; dataUrl: string }[]; questions?: string[] };
    // For reading stimuli start at -1 (passage phase); examiner advances via PUT question-index
    const questionIndex = questions && questions.length > 0 ? -1 : undefined;
    await db.execute(sql`UPDATE raepa_sessions SET current_stimulus = ${JSON.stringify({ text, images, questions, questionIndex })}::jsonb WHERE case_id = ${caseId}`);
    res.json({ ok: true });
  } catch (err) { logger.error({ err }, "raepa push-stimulus"); res.status(500).json({ error: "Server error" }); }
});

// ── Examiner: advance to a specific question index (−1 = passage) ──────────
router.put("/cases/:caseId/raepa/question-index", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const { questionIndex } = req.body as { questionIndex: number };
    await db.execute(sql`
      UPDATE raepa_sessions
      SET current_stimulus = jsonb_set(current_stimulus, '{questionIndex}', ${questionIndex}::text::jsonb)
      WHERE case_id = ${caseId}
    `);
    res.json({ ok: true });
  } catch (err) { logger.error({ err }, "raepa question-index"); res.status(500).json({ error: "Server error" }); }
});

// ── Examiner: clear student stimulus ───────────────────────────────────────
router.delete("/cases/:caseId/raepa/push-stimulus", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    await db.execute(sql`UPDATE raepa_sessions SET current_stimulus = NULL WHERE case_id = ${caseId}`);
    res.json({ ok: true });
  } catch (err) { logger.error({ err }, "raepa clear-stimulus"); res.status(500).json({ error: "Server error" }); }
});

// ── Public: student view polls current stimulus ────────────────────────────
router.get("/public/raepa/student/:caseId", async (req, res) => {
  const { caseId } = req.params;
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const scoped = await getScopedToken(token);
    // The authenticated professional workspace probes this legacy URL without
    // a public token only to detect whether a stimulus is active. Return an
    // empty projection in that case; never return case data without a scope.
    if (!token) { res.json({ stimulus: null }); return; }
    if (!scoped || scoped.scope !== "student" || String(scoped.case_id) !== String(caseId)) {
      return res.status(404).json({ error: "Invalid or expired student access link" });
    }
    const row = await db.execute(sql`SELECT current_stimulus FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (row.rows.length === 0) return res.status(404).json({ error: "Session not found" });
    const stimulus = (row.rows[0] as any).current_stimulus ?? null;
    res.json({ stimulus });
  } catch (err) { logger.error({ err }, "raepa student poll"); res.status(500).json({ error: "Server error" }); }
});

router.get("/public/raepa/student/:caseId/responses", async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const scoped = await getScopedToken(token);
  if (!scoped || scoped.scope !== "student" || String(scoped.case_id) !== String(caseId)) {
    res.status(404).json({ error: "Invalid or expired student access link" }); return;
  }
  const rows = await db.execute(sql`SELECT id, response_type, prompt_id, prompt, original_language, original_response, response_mode, created_at
    FROM raepa_student_responses WHERE case_id = ${caseId} ORDER BY created_at`);
  res.json({ responses: rows.rows.map((row: any) => ({
    id: row.id, responseType: row.response_type, promptId: row.prompt_id, prompt: row.prompt,
    originalLanguage: row.original_language, originalResponse: row.original_response, responseMode: row.response_mode,
    savedAt: row.created_at,
  })) });
});

router.post("/public/raepa/student/:caseId/responses", async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  const token = typeof req.query.token === "string" ? req.query.token : "";
  const scoped = await getScopedToken(token);
  if (!scoped || scoped.scope !== "student" || String(scoped.case_id) !== String(caseId)) {
    res.status(404).json({ error: "Invalid or expired student access link" }); return;
  }
  const b = req.body;
  if (!b || !["interview", "stimulus"].includes(b.responseType) || typeof b.promptId !== "string" ||
      typeof b.originalLanguage !== "string" || typeof b.originalResponse !== "string" || !b.originalResponse.trim()) {
    res.status(400).json({ error: "responseType, promptId, originalLanguage, and originalResponse are required" }); return;
  }
  if (b.promptId.length > 200 || b.originalLanguage.length > 120 || b.originalResponse.length > 50000) {
    res.status(400).json({ error: "Response exceeds allowed limits" }); return;
  }
  const responseKey = idempotencyKey(req, "student-response", {
    caseId, tokenId: scoped.id, responseType: b.responseType, promptId: b.promptId,
    originalLanguage: b.originalLanguage, originalResponse: b.originalResponse, responseMode: b.responseMode,
  });
  const prior = await db.execute(sql`SELECT id, response_type, prompt_id, prompt, original_language,
      original_response, response_mode, created_at
    FROM raepa_student_responses WHERE case_id = ${caseId} AND idempotency_key = ${responseKey} LIMIT 1`);
  if (prior.rows.length) {
    const saved: any = prior.rows[0];
    res.json({ response: {
      id: saved.id, responseType: saved.response_type, promptId: saved.prompt_id, prompt: saved.prompt,
      originalLanguage: saved.original_language, originalResponse: saved.original_response,
      responseMode: saved.response_mode, savedAt: saved.created_at,
    }, duplicate: true });
    return;
  }
  const id = nanoid();
  const result = await db.transaction(async (tx) => {
    const inserted = await tx.execute(sql`INSERT INTO raepa_student_responses
    (id, case_id, response_type, prompt_id, prompt, original_language, original_response, response_mode, non_scored_evidence, idempotency_key)
    VALUES (${id}, ${caseId}, ${b.responseType}, ${b.promptId}, ${typeof b.prompt === "string" ? b.prompt.slice(0, 5000) : null},
      ${b.originalLanguage.slice(0, 120)}, ${b.originalResponse}, ${typeof b.responseMode === "string" ? b.responseMode.slice(0, 40) : null},
      ${b.nonScoredEvidence !== false}, ${responseKey})
      ON CONFLICT (case_id, idempotency_key) DO NOTHING RETURNING *`);
    if (!inserted.rows.length) {
      const duplicate = await tx.execute(sql`SELECT id, response_type, prompt_id, prompt, original_language,
          original_response, response_mode, created_at FROM raepa_student_responses
        WHERE case_id = ${caseId} AND idempotency_key = ${responseKey} LIMIT 1`);
      return { saved: duplicate.rows[0], created: false };
    }
    if (b.responseType === "interview") {
      await tx.execute(sql`INSERT INTO raepa_student_interviews
      (id, case_id, responses, original_language, review_status, idempotency_key)
      VALUES (${nanoid()}, ${caseId}, ${JSON.stringify([{
        question_id: b.promptId,
        prompt_original: typeof b.prompt === "string" ? b.prompt : "",
        response_original: b.originalResponse,
        language: b.originalLanguage,
        response_mode: typeof b.responseMode === "string" ? b.responseMode : null,
      }])}::jsonb, ${b.originalLanguage.slice(0, 120)}, 'unreviewed', ${responseKey})`);
    }
    await invalidateRaepaEvidence(caseId, undefined, undefined, true, tx);
    await tx.execute(sql`UPDATE raepa_access_tokens SET used_at = COALESCE(used_at, NOW()) WHERE id = ${scoped.id}`);
    const row = await tx.execute(sql`SELECT id, response_type, prompt_id, prompt, original_language,
      original_response, response_mode, created_at FROM raepa_student_responses WHERE id = ${id}`);
    return { saved: row.rows[0], created: true };
  });
  const saved: any = result.saved;
  res.status(201).json({ response: {
    id: saved.id, responseType: saved.response_type, promptId: saved.prompt_id, prompt: saved.prompt,
    originalLanguage: saved.original_language, originalResponse: saved.original_response, responseMode: saved.response_mode, savedAt: saved.created_at,
  }, duplicate: !result.created });
});

// ── RAEPA v2 structured profile and evidence API ─────────────────────────────
// These endpoints intentionally return only professional data fields. Prompt
// text, model configuration, and decision logic remain server-side.
router.get("/cases/:caseId/raepa/profile", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_profiles WHERE case_id = ${caseId} LIMIT 1`);
  res.json(rows.rows[0] ?? null);
});

router.put("/cases/:caseId/raepa/profile", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const body = parseBody(profileSchema, req.body, res);
  if (!body) return;
  if (body.status === "reviewed" || body.status === "complete") {
    res.status(409).json({ error: "Use the Assessment Lead profile review endpoint to change professional review state" }); return;
  }
  const row = await db.transaction(async (tx) => {
  const id = await ensureProfile(caseId, req.userId, tx);
  const sessionId = await ensureSession(caseId, tx);
  await tx.execute(sql`
    UPDATE raepa_profiles SET referral_question = COALESCE(${body.referral_question ?? null}, referral_question),
      data = COALESCE(${body.data ? JSON.stringify(body.data) : null}::jsonb, data),
      status = COALESCE(${body.status ?? null}, status), updated_at = NOW() WHERE id = ${id}
  `);
  if (sessionId && body.pathway) {
    await tx.execute(sql`UPDATE raepa_sessions SET pathway = ${body.pathway}, profile_id = ${id}, updated_at = NOW() WHERE id = ${sessionId}`);
  }
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
  return tx.execute(sql`SELECT * FROM raepa_profiles WHERE id = ${id}`);
  });
  await writeAudit({ eventType: "raepa.profile.updated", caseId, actorId: req.userId, actorRole: req.userRole });
  res.json(row.rows[0]);
});

// Professional review is deliberately a separate authority-bearing action.
// Draft intake updates must never be able to mark the profile reviewed.
router.post("/cases/:caseId/raepa/profile/review", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!isAssessmentLead(req.userRole)) {
    res.status(403).json({ error: "Assessment Lead or admin review required" }); return;
  }
  const decision = req.body?.decision;
  if (decision !== "approve" && decision !== "reject") {
    res.status(400).json({ error: "decision must be approve or reject" }); return;
  }
  const reviewStatus = decision === "approve" ? "reviewed" : "rejected";
  const row = await db.transaction(async (tx) => {
    const id = await ensureProfile(caseId, req.userId, tx);
    const updated = await tx.execute(sql`UPDATE raepa_profiles SET review_status = ${reviewStatus}, status = ${decision === "approve" ? "reviewed" : "in_progress"},
      reviewed_by = ${req.userId}, reviewed_at = NOW(), reviewer_note = ${typeof req.body?.note === "string" ? req.body.note.slice(0, 5000) : null},
      updated_at = NOW() WHERE id = ${id} RETURNING *`);
    // Reviewing the profile invalidates downstream report approvals, but must
    // preserve the review decision that was just established above.
    await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
    return updated.rows[0];
  });
  await writeAudit({
    eventType: `raepa.profile.${decision === "approve" ? "reviewed" : "review_rejected"}`,
    caseId, actorId: req.userId, actorRole: req.userRole, metadata: { reviewStatus },
  });
  res.json(row);
});

router.get("/cases/:caseId/raepa/language-history", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const [languages, subjects] = await Promise.all([
    db.execute(sql`SELECT * FROM raepa_language_academic_history WHERE case_id = ${caseId} ORDER BY created_at`),
    db.execute(sql`SELECT * FROM raepa_subject_language_history WHERE case_id = ${caseId} ORDER BY created_at`),
  ]);
  res.json({ languages: languages.rows, subjects: subjects.rows });
});

router.post("/cases/:caseId/raepa/language-history", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const parsed = canonicalAcademicHistorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid academic history; no existing history was changed", details: parsed.error.flatten() }); return;
  }
  const payload = parsed.data;
  const created: unknown[] = await db.transaction(async (tx) => {
    const profileId = await ensureProfile(caseId, req.userId, tx);
    await tx.execute(sql`DELETE FROM raepa_language_academic_history WHERE case_id = ${caseId}`);
    await tx.execute(sql`DELETE FROM raepa_subject_language_history WHERE case_id = ${caseId}`);
    const languages: unknown[] = [];
    const subjects: unknown[] = [];
    for (const body of payload.languages) {
      const row = await tx.execute(sql`
        INSERT INTO raepa_language_academic_history
          (id, case_id, profile_id, parent_id, language, age_first_exposed, proficiency,
           speaking_experience, reading_experience, writing_experience, formal_schooling_experience,
           years_of_instruction, subjects, source, original_text, translated_text, translation_metadata)
        VALUES (${nanoid()}, ${caseId}, ${profileId}, ${req.userId ?? null}, ${body.language},
          ${body.age_first_exposed ?? null}, ${body.proficiency ?? null}, ${body.speaking_experience ?? null},
          ${body.reading_experience ?? null}, ${body.writing_experience ?? null}, ${body.formal_schooling_experience ?? null},
          ${body.years_of_instruction ?? null}, ${JSON.stringify(body.subjects ?? [])}::jsonb, ${body.source ?? "parent"},
          ${body.original_text ?? null}, ${body.translated_text ?? null},
          ${body.translation_metadata ? JSON.stringify(body.translation_metadata) : null}::jsonb)
        RETURNING *
      `);
      languages.push(row.rows[0]);
    }
    for (const item of payload.subjects) {
      const row = await tx.execute(sql`
        INSERT INTO raepa_subject_language_history
          (id, case_id, profile_id, subject, language, years, experience, source, notes)
        VALUES (${nanoid()}, ${caseId}, ${profileId}, ${item.subject}, ${item.language},
          ${item.years ?? null}, ${item.experience ?? null}, ${item.source ?? null}, ${item.notes ?? null})
        RETURNING *
      `);
      subjects.push(row.rows[0]);
    }
    await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
    return { languages, subjects };
  });
  await writeAudit({ eventType: "raepa.language_history.replaced", caseId, actorId: req.userId, actorRole: req.userRole,
    metadata: { languageCount: created.languages.length, subjectCount: created.subjects.length } });
  res.status(201).json(created);
});

router.post("/cases/:caseId/raepa/subject-language-history", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const items = Array.isArray(req.body?.items) ? req.body.items : [req.body];
  if (!items.length || items.length > 60) { res.status(400).json({ error: "items must contain 1-60 records" }); return; }
  if (items.some((item: any) => !item || typeof item.subject !== "string" || typeof item.language !== "string")) {
    res.status(400).json({ error: "subject and language are required" }); return;
  }
  const created = await db.transaction(async (tx) => {
  const profileId = await ensureProfile(caseId, req.userId, tx);
  const created: unknown[] = [];
  for (const item of items) {
    const id = nanoid();
    await tx.execute(sql`INSERT INTO raepa_subject_language_history
      (id, case_id, profile_id, subject, language, years, experience, source, notes)
      VALUES (${id}, ${caseId}, ${profileId}, ${item.subject.trim().slice(0, 120)}, ${item.language.trim().slice(0, 120)},
        ${typeof item.years === "string" ? item.years.slice(0, 120) : null},
        ${typeof item.experience === "string" ? item.experience.slice(0, 1000) : null},
        ${typeof item.source === "string" ? item.source.slice(0, 80) : null},
        ${typeof item.notes === "string" ? item.notes.slice(0, 5000) : null})`);
    const row = await tx.execute(sql`SELECT * FROM raepa_subject_language_history WHERE id = ${id}`);
    created.push(row.rows[0]);
  }
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
  return created;
  });
  await writeAudit({ eventType: "raepa.subject_language_history.created", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { count: created.length } });
  res.status(201).json(created);
});

router.get("/cases/:caseId/raepa/subject-language-history", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_subject_language_history WHERE case_id = ${caseId} ORDER BY created_at`);
  res.json(rows.rows);
});

router.get("/cases/:caseId/raepa/teacher-profile", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_teacher_profiles WHERE case_id = ${caseId} ORDER BY created_at DESC`);
  res.json(rows.rows);
});

router.post("/cases/:caseId/raepa/teacher-profile", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!req.body || typeof req.body !== "object" || !req.body.data || typeof req.body.data !== "object") {
    res.status(400).json({ error: "data object is required" }); return;
  }
  const id = nanoid();
  const row = await db.transaction(async (tx) => {
  const profileId = await ensureProfile(caseId, req.userId, tx);
  await tx.execute(sql`INSERT INTO raepa_teacher_profiles
    (id, case_id, profile_id, teacher_id, data, original_text, translated_text, translation_metadata)
    VALUES (${id}, ${caseId}, ${profileId}, ${req.userId ?? null}, ${JSON.stringify(req.body.data)}::jsonb,
      ${typeof req.body.original_text === "string" ? req.body.original_text.slice(0, 20000) : null},
      ${typeof req.body.translated_text === "string" ? req.body.translated_text.slice(0, 20000) : null},
      ${req.body.translation_metadata && typeof req.body.translation_metadata === "object" ? JSON.stringify(req.body.translation_metadata) : null}::jsonb)
    RETURNING *`);
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
  return tx.execute(sql`SELECT * FROM raepa_teacher_profiles WHERE id = ${id}`);
  });
  await writeAudit({ eventType: "raepa.teacher_profile.created", caseId, actorId: req.userId, actorRole: req.userRole });
  res.status(201).json(row.rows[0]);
});

router.get("/cases/:caseId/raepa/student-interview", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_student_interviews WHERE case_id = ${caseId} ORDER BY created_at DESC`);
  res.json(rows.rows);
});

router.post("/cases/:caseId/raepa/student-interview", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const responses = req.body?.responses;
  if (!Array.isArray(responses) || responses.length > 200) { res.status(400).json({ error: "responses must be an array (max 200)" }); return; }
  const parsed = z.array(responseItemSchema).safeParse(responses);
  if (!parsed.success) { res.status(400).json({ error: "Invalid interview responses", details: parsed.error.flatten() }); return; }
  const id = nanoid();
  const row = await db.transaction(async (tx) => {
  const profileId = await ensureProfile(caseId, req.userId, tx);
  await tx.execute(sql`INSERT INTO raepa_student_interviews
    (id, case_id, profile_id, student_id, responses, original_language, translation_metadata)
    VALUES (${id}, ${caseId}, ${profileId}, ${req.userId ?? null}, ${JSON.stringify(parsed.data)}::jsonb,
      ${typeof req.body.original_language === "string" ? req.body.original_language.slice(0, 120) : null},
      ${req.body.translation_metadata && typeof req.body.translation_metadata === "object" ? JSON.stringify(req.body.translation_metadata) : null}::jsonb)`);
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
  return tx.execute(sql`SELECT * FROM raepa_student_interviews WHERE id = ${id}`);
  });
  await writeAudit({ eventType: "raepa.student_interview.created", caseId, actorId: req.userId, actorRole: req.userRole });
  res.status(201).json(row.rows[0]);
});

router.get("/cases/:caseId/raepa/work-samples/:sampleId/analysis", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_work_sample_analyses WHERE case_id = ${caseId} AND work_sample_id = ${req.params.sampleId} LIMIT 1`);
  res.json(rows.rows[0] ?? null);
});

router.put("/cases/:caseId/raepa/work-samples/:sampleId/analysis", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin review required" }); return; }
  const sample = await db.execute(sql`SELECT id FROM raepa_work_samples WHERE id = ${req.params.sampleId} AND case_id = ${caseId} LIMIT 1`);
  if (!sample.rows.length) { res.status(404).json({ error: "Work sample not found" }); return; }
  const b = req.body;
  if (!b || typeof b !== "object") { res.status(400).json({ error: "Analysis object is required" }); return; }
  const fields = ["layer_vocabulary", "layer_structures", "layer_functions", "layer_cognitive"] as const;
  if (fields.some((key) => b[key] !== undefined && (!b[key] || typeof b[key] !== "object"))) {
    res.status(400).json({ error: "Analysis layers must be objects" }); return;
  }
  const existing = await db.execute(sql`SELECT id FROM raepa_work_sample_analyses WHERE work_sample_id = ${req.params.sampleId} LIMIT 1`);
  const id = existing.rows[0]?.id ? String(existing.rows[0].id) : nanoid();
  await db.transaction(async (tx) => {
  if (!existing.rows.length) {
    await tx.execute(sql`INSERT INTO raepa_work_sample_analyses
      (id, case_id, work_sample_id, layer_vocabulary, layer_structures, layer_functions, layer_cognitive,
       conceptual_demand, english_language_demand, academic_register_demand, output_demand,
       evidence_sufficiency, ai_generated, source_evidence_refs, review_status, reviewer_id)
      VALUES (${id}, ${caseId}, ${req.params.sampleId}, ${JSON.stringify(b.layer_vocabulary ?? {})}::jsonb,
        ${JSON.stringify(b.layer_structures ?? {})}::jsonb, ${JSON.stringify(b.layer_functions ?? {})}::jsonb,
        ${JSON.stringify(b.layer_cognitive ?? {})}::jsonb, ${typeof b.conceptual_demand === "string" ? b.conceptual_demand.slice(0, 40) : null},
        ${typeof b.english_language_demand === "string" ? b.english_language_demand.slice(0, 40) : null},
        ${typeof b.academic_register_demand === "string" ? b.academic_register_demand.slice(0, 40) : null},
        ${typeof b.output_demand === "string" ? b.output_demand.slice(0, 40) : null},
        ${typeof b.evidence_sufficiency === "string" ? b.evidence_sufficiency.slice(0, 40) : "limited"},
        ${b.ai_generated === true}, ${JSON.stringify(Array.isArray(b.source_evidence_refs) ? b.source_evidence_refs : [])}::jsonb,
        ${isAssessmentLead(req.userRole) ? "reviewed" : "unreviewed"}, ${isAssessmentLead(req.userRole) ? req.userId : null})`);
  } else {
    await tx.execute(sql`UPDATE raepa_work_sample_analyses SET
      layer_vocabulary = COALESCE(${b.layer_vocabulary ? JSON.stringify(b.layer_vocabulary) : null}::jsonb, layer_vocabulary),
      layer_structures = COALESCE(${b.layer_structures ? JSON.stringify(b.layer_structures) : null}::jsonb, layer_structures),
      layer_functions = COALESCE(${b.layer_functions ? JSON.stringify(b.layer_functions) : null}::jsonb, layer_functions),
      layer_cognitive = COALESCE(${b.layer_cognitive ? JSON.stringify(b.layer_cognitive) : null}::jsonb, layer_cognitive),
      review_status = ${isAssessmentLead(req.userRole) ? "reviewed" : "unreviewed"},
      reviewer_id = ${isAssessmentLead(req.userRole) ? req.userId : null}, reviewed_at = ${isAssessmentLead(req.userRole) ? new Date() : null},
      updated_at = NOW() WHERE id = ${id} AND case_id = ${caseId}`);
  }
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
  });
  const row = await db.execute(sql`SELECT * FROM raepa_work_sample_analyses WHERE id = ${id}`);
  await writeAudit({ eventType: "raepa.work_sample_analysis.updated", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { sampleId: req.params.sampleId } });
  res.json(row.rows[0]);
});

router.get("/cases/:caseId/raepa/hypotheses", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_hypotheses WHERE case_id = ${caseId} ORDER BY created_at`);
  res.json(rows.rows);
});

router.post("/cases/:caseId/raepa/hypotheses/generate", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const [caseRows, profileRows, teacherRows, studentRows, sampleRows] = await Promise.all([
    db.execute(sql`SELECT referral_reason FROM cases WHERE id = ${caseId} LIMIT 1`),
    db.execute(sql`SELECT referral_question, data FROM raepa_profiles WHERE case_id = ${caseId} LIMIT 1`),
    db.execute(sql`SELECT data FROM raepa_teacher_profiles WHERE case_id = ${caseId} ORDER BY created_at DESC LIMIT 1`),
    db.execute(sql`SELECT responses FROM raepa_student_interviews WHERE case_id = ${caseId} ORDER BY created_at DESC LIMIT 1`),
    db.execute(sql`SELECT id, subject, ai_analysis FROM raepa_work_samples WHERE case_id = ${caseId} ORDER BY created_at DESC LIMIT 10`),
  ]);
  const context = {
    referral: (caseRows.rows[0] as any)?.referral_reason ?? null,
    profile: profileRows.rows[0] ?? null,
    teacher: teacherRows.rows[0] ?? null,
    student: studentRows.rows[0] ?? null,
    work_samples: sampleRows.rows,
  };
  try {
    const output = await callGroq([
      { role: "system", content: "Generate evidence-linked RAEPA assessment hypotheses. Return only a JSON array. Each item must have statement, hypothesis_type, confidence, and evidence_refs. Use cautious non-deterministic language for cross-linguistic patterns. Never diagnose or infer ability from English proficiency." },
      { role: "user", content: JSON.stringify(context) },
    ], 1800);
    const match = output.match(/\[[\s\S]*\]/);
    const parsed = match ? JSON.parse(match[0]) : [];
    if (!Array.isArray(parsed) || parsed.length > 30) { res.status(502).json({ error: "AI returned invalid hypothesis data" }); return; }
    const created = await db.transaction(async (tx) => {
    const created: unknown[] = [];
    for (const item of parsed) {
      if (!item || typeof item.statement !== "string" || item.statement.trim().length < 5) continue;
      const id = nanoid();
      await tx.execute(sql`INSERT INTO raepa_hypotheses
        (id, case_id, session_id, statement, hypothesis_type, evidence_refs, confidence, ai_generated, ai_model, ai_version, original_statement)
        VALUES (${id}, ${caseId}, ${await ensureSession(caseId, tx)}, ${item.statement.trim().slice(0, 10000)},
          ${typeof item.hypothesis_type === "string" ? item.hypothesis_type.slice(0, 120) : null},
          ${JSON.stringify(Array.isArray(item.evidence_refs) ? item.evidence_refs : [])}::jsonb,
          ${typeof item.confidence === "string" ? item.confidence.slice(0, 40) : "limited"}, TRUE, 'groq', ${GROQ_MODEL}, ${item.statement.trim().slice(0, 10000)})`);
      const row = await tx.execute(sql`SELECT * FROM raepa_hypotheses WHERE id = ${id}`);
      created.push(row.rows[0]);
    }
    await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
    return created;
    });
    await writeAudit({ eventType: "raepa.hypotheses.ai_generated", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { count: created.length, model: GROQ_MODEL } });
    res.status(201).json(created);
  } catch (err) {
    logger.error({ err, caseId }, "RAEPA hypothesis generation failed");
    res.status(503).json({ error: "Hypothesis generation unavailable" });
  }
});

router.post("/cases/:caseId/raepa/hypotheses", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const items = Array.isArray(req.body?.items) ? req.body.items : [req.body];
  if (!items.length || items.length > 100) { res.status(400).json({ error: "items must contain 1-100 hypotheses" }); return; }
  if (items.some((item: any) => !item || typeof item.statement !== "string" || item.statement.trim().length < 5 || item.statement.length > 10000)) {
    res.status(400).json({ error: "Each hypothesis requires a statement of 5-10000 characters" }); return;
  }
  const ids: string[] = [];
  const rows = await db.transaction(async (tx) => {
  for (const b of items) {
    const id = nanoid(); ids.push(id);
    await tx.execute(sql`INSERT INTO raepa_hypotheses
      (id, case_id, session_id, statement, hypothesis_type, evidence_refs, confidence, ai_generated, ai_model, ai_version, original_statement)
      VALUES (${id}, ${caseId}, ${await ensureSession(caseId, tx)}, ${b.statement.trim()}, ${typeof b.hypothesis_type === "string" ? b.hypothesis_type.slice(0, 120) : null},
        ${JSON.stringify(Array.isArray(b.evidence_refs) ? b.evidence_refs : [])}::jsonb, ${typeof b.confidence === "string" ? b.confidence.slice(0, 40) : "limited"},
        ${b.ai_generated !== false}, ${typeof b.ai_model === "string" ? b.ai_model.slice(0, 120) : null}, ${typeof b.ai_version === "string" ? b.ai_version.slice(0, 120) : null},
        ${typeof b.original_statement === "string" ? b.original_statement.slice(0, 10000) : b.statement.trim()})`);
  }
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
  return tx.execute(sql`SELECT * FROM raepa_hypotheses WHERE id IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`);
  });
  await writeAudit({ eventType: "raepa.hypotheses.created", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { ids } });
  res.status(201).json(rows.rows);
});

router.patch("/cases/:caseId/raepa/hypotheses/:hypothesisId", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin approval required" }); return; }
  if (!["approved", "modified", "rejected"].includes(req.body?.status)) { res.status(400).json({ error: "status must be approved, modified, or rejected" }); return; }
  const statement = typeof req.body.statement === "string" ? req.body.statement.trim() : null;
  if (req.body.status === "modified" && (!statement || statement.length < 5)) { res.status(400).json({ error: "Modified hypotheses require statement" }); return; }
  const rows = await db.transaction(async (tx) => {
  const rows = await tx.execute(sql`UPDATE raepa_hypotheses SET status = ${req.body.status},
    statement = COALESCE(${statement}, statement), reviewer_id = ${req.userId}, reviewer_notes = ${typeof req.body.reviewer_notes === "string" ? req.body.reviewer_notes.slice(0, 5000) : null},
    reviewed_at = NOW(), updated_at = NOW() WHERE id = ${req.params.hypothesisId} AND case_id = ${caseId} RETURNING *`);
  if (!rows.rows.length) return null;
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
  return rows;
  });
  if (!rows) { res.status(404).json({ error: "Hypothesis not found" }); return; }
  await writeAudit({ eventType: `raepa.hypothesis.${req.body.status}`, caseId, actorId: req.userId, actorRole: req.userRole, metadata: { hypothesisId: req.params.hypothesisId } });
  res.json(rows.rows[0]);
});

router.get("/cases/:caseId/raepa/assessment-plan", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_assessment_plans WHERE case_id = ${caseId} ORDER BY version DESC, created_at DESC`);
  const recommendations = await db.execute(sql`SELECT strategy, evidence_refs, identified_need FROM raepa_recommendations WHERE case_id = ${caseId} ORDER BY created_at`);
  res.json(rows.rows.map((row: any) => ({
    ...row,
    recommendations: recommendations.rows.map((item: any) => ({
      text: item.strategy ?? "", evidence_ids: Array.isArray(item.evidence_refs) ? item.evidence_refs : [], rationale: item.identified_need ?? "",
    })),
  })));
});

router.post("/cases/:caseId/raepa/assessment-plan", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const b = req.body;
  if (!b || typeof b !== "object") { res.status(400).json({ error: "Assessment plan object is required" }); return; }
  const hypothesisIds = Array.isArray(b.hypothesis_ids) ? b.hypothesis_ids.filter((id: unknown): id is string => typeof id === "string") : [];
  if (!hypothesisIds.length) { res.status(400).json({ error: "At least one hypothesis_id is required" }); return; }
  const approved = b.status === "approved";
  if (approved && !isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin approval required" }); return; }
  if (approved) {
    const pending = await db.execute(sql`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status NOT IN ('approved','modified'))::int AS pending
      FROM raepa_hypotheses WHERE case_id = ${caseId} AND id IN (${sql.join(hypothesisIds.map((id) => sql`${id}`), sql`, `)})`);
    if (Number((pending.rows[0] as any)?.total ?? 0) !== hypothesisIds.length || Number((pending.rows[0] as any)?.pending ?? 0) > 0) {
      res.status(409).json({ error: "All plan hypotheses must exist and be approved or modified before plan approval" }); return;
    }
  }
  const id = nanoid();
  const result = await db.transaction(async (tx) => {
  const versionRow = await tx.execute(sql`SELECT COALESCE(MAX(version), 0) + 1 AS version FROM raepa_assessment_plans WHERE case_id = ${caseId}`);
  const version = Number((versionRow.rows[0] as any)?.version ?? 1);
  if (approved) {
    await tx.execute(sql`INSERT INTO raepa_assessment_plans
      (id, case_id, session_id, hypothesis_ids, work_sample_ids, modules, probes, functions, structures, dynamic_conditions,
       status, version, created_by, approved_by, approved_at, reviewer_notes)
      VALUES (${id}, ${caseId}, ${await ensureSession(caseId, tx)}, ${JSON.stringify(hypothesisIds)}::jsonb,
        ${JSON.stringify(Array.isArray(b.work_sample_ids) ? b.work_sample_ids : [])}::jsonb,
        ${JSON.stringify(Array.isArray(b.modules) ? b.modules : [])}::jsonb, ${JSON.stringify(Array.isArray(b.probes) ? b.probes : [])}::jsonb,
        ${JSON.stringify(Array.isArray(b.functions) ? b.functions : [])}::jsonb, ${JSON.stringify(Array.isArray(b.structures) ? b.structures : [])}::jsonb,
        ${JSON.stringify(Array.isArray(b.dynamic_conditions) ? b.dynamic_conditions : [])}::jsonb,
        'approved', ${version}, ${req.userId}, ${req.userId}, NOW(),
        ${typeof b.reviewer_notes === "string" ? b.reviewer_notes.slice(0, 5000) : null})`);
  } else {
    await tx.execute(sql`INSERT INTO raepa_assessment_plans
      (id, case_id, session_id, hypothesis_ids, work_sample_ids, modules, probes, functions, structures, dynamic_conditions,
       status, version, created_by, reviewer_notes)
      VALUES (${id}, ${caseId}, ${await ensureSession(caseId, tx)}, ${JSON.stringify(hypothesisIds)}::jsonb,
        ${JSON.stringify(Array.isArray(b.work_sample_ids) ? b.work_sample_ids : [])}::jsonb,
        ${JSON.stringify(Array.isArray(b.modules) ? b.modules : [])}::jsonb, ${JSON.stringify(Array.isArray(b.probes) ? b.probes : [])}::jsonb,
        ${JSON.stringify(Array.isArray(b.functions) ? b.functions : [])}::jsonb, ${JSON.stringify(Array.isArray(b.structures) ? b.structures : [])}::jsonb,
        ${JSON.stringify(Array.isArray(b.dynamic_conditions) ? b.dynamic_conditions : [])}::jsonb,
        'draft', ${version}, ${req.userId ?? null},
        ${typeof b.reviewer_notes === "string" ? b.reviewer_notes.slice(0, 5000) : null})`);
  }
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
  const row = await tx.execute(sql`SELECT * FROM raepa_assessment_plans WHERE id = ${id}`);
  return { row, version };
  });
  const { row, version } = result;
  await writeAudit({ eventType: approved ? "raepa.assessment_plan.approved" : "raepa.assessment_plan.created", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { planId: id, version } });
  res.status(201).json(row.rows[0]);
});

router.post("/cases/:caseId/raepa/assessment-tasks", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const b = req.body;
  if (!b || typeof b.plan_id !== "string" || typeof b.task_type !== "string" || !b.task_type.trim()) {
    res.status(400).json({ error: "plan_id and task_type are required" }); return;
  }
  const plan = await db.execute(sql`SELECT status FROM raepa_assessment_plans WHERE id = ${b.plan_id} AND case_id = ${caseId} LIMIT 1`);
  if (!plan.rows.length) { res.status(404).json({ error: "Assessment plan not found" }); return; }
  if (plan.rows[0].status !== "approved") { res.status(409).json({ error: "Assessment plan must be approved before tasks are created" }); return; }
  const id = nanoid();
  const row = await db.transaction(async (tx) => {
  await tx.execute(sql`INSERT INTO raepa_assessment_tasks (id, case_id, plan_id, task_type, task_data, status)
    VALUES (${id}, ${caseId}, ${b.plan_id}, ${b.task_type.trim().slice(0, 160)}, ${JSON.stringify(b.task_data && typeof b.task_data === "object" ? b.task_data : {})}::jsonb, ${typeof b.status === "string" ? b.status.slice(0, 40) : "planned"})`);
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
  return tx.execute(sql`SELECT * FROM raepa_assessment_tasks WHERE id = ${id}`);
  });
  res.status(201).json(row.rows[0]);
});

router.get("/cases/:caseId/raepa/assessment-tasks", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_assessment_tasks WHERE case_id = ${caseId} ORDER BY created_at`);
  res.json(rows.rows);
});

router.get("/cases/:caseId/raepa/dynamic-trials", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_dynamic_trials WHERE case_id = ${caseId} ORDER BY created_at`);
  res.json(rows.rows);
});

router.post("/cases/:caseId/raepa/dynamic-trials", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const b = req.body;
  const supportLevel = Number(b?.support_level);
  const validConditions = ["independent", "mediated", "transfer"];
  if (!b || !validConditions.includes(b.condition) || !Number.isInteger(supportLevel) || supportLevel < 0 || supportLevel > 5) {
    res.status(400).json({ error: "condition must be independent, mediated, or transfer; support_level must be an integer from 0 to 5" }); return;
  }
  if (b.task_id !== undefined && typeof b.task_id !== "string") { res.status(400).json({ error: "task_id must be a string" }); return; }
  const id = nanoid();
  const row = await db.transaction(async (tx) => {
  await tx.execute(sql`INSERT INTO raepa_dynamic_trials
    (id, case_id, task_id, hypothesis_id, condition, support_level, initial_performance, support_provided, response,
     mediated_performance, transfer_performance, conceptual_understanding_visible, observations, evidence_refs, created_by)
    VALUES (${id}, ${caseId}, ${b.task_id ?? null}, ${typeof b.hypothesis_id === "string" ? b.hypothesis_id : null},
      ${b.condition}, ${supportLevel}, ${b.initial_performance && typeof b.initial_performance === "object" ? JSON.stringify(b.initial_performance) : null}::jsonb,
      ${typeof b.support_provided === "string" ? b.support_provided.slice(0, 5000) : null},
      ${b.response && typeof b.response === "object" ? JSON.stringify(b.response) : null}::jsonb,
      ${b.mediated_performance && typeof b.mediated_performance === "object" ? JSON.stringify(b.mediated_performance) : null}::jsonb,
      ${b.transfer_performance && typeof b.transfer_performance === "object" ? JSON.stringify(b.transfer_performance) : null}::jsonb,
      ${typeof b.conceptual_understanding_visible === "boolean" ? b.conceptual_understanding_visible : null},
      ${typeof b.observations === "string" ? b.observations.slice(0, 10000) : null},
      ${JSON.stringify(Array.isArray(b.evidence_refs) ? b.evidence_refs : [])}::jsonb, ${req.userId ?? null})`);
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
  return tx.execute(sql`SELECT * FROM raepa_dynamic_trials WHERE id = ${id}`);
  });
  await writeAudit({ eventType: "raepa.dynamic_trial.created", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { condition: b.condition, supportLevel } });
  res.status(201).json(row.rows[0]);
});

router.get("/cases/:caseId/raepa/concept-language", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_concept_language_relationships WHERE case_id = ${caseId} ORDER BY created_at DESC`);
  res.json(rows.rows);
});

router.post("/cases/:caseId/raepa/concept-language", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const allowed = ["concept_language_both_accessible", "concept_stronger_than_english", "improves_with_mediation", "academic_register_restricts", "conceptual_difficulty_persists", "evidence_mixed", "insufficient_evidence"];
  if (!req.body || typeof req.body.classification !== "string" || !allowed.includes(req.body.classification) || typeof req.body.narrative !== "string" || req.body.narrative.trim().length < 5) {
    res.status(400).json({ error: "classification and narrative are required; classification is invalid" }); return;
  }
  const id = nanoid();
  const row = await db.transaction(async (tx) => {
  if (isAssessmentLead(req.userRole)) {
    await tx.execute(sql`INSERT INTO raepa_concept_language_relationships
      (id, case_id, session_id, classification, narrative, evidence_refs, status, created_by, reviewed_by, reviewed_at)
      VALUES (${id}, ${caseId}, ${await ensureSession(caseId, tx)}, ${req.body.classification}, ${req.body.narrative.trim().slice(0, 20000)},
        ${JSON.stringify(Array.isArray(req.body.evidence_refs) ? req.body.evidence_refs : [])}::jsonb,
        'reviewed', ${req.userId}, ${req.userId}, NOW())`);
  } else {
    await tx.execute(sql`INSERT INTO raepa_concept_language_relationships
      (id, case_id, session_id, classification, narrative, evidence_refs, status, created_by)
      VALUES (${id}, ${caseId}, ${await ensureSession(caseId, tx)}, ${req.body.classification}, ${req.body.narrative.trim().slice(0, 20000)},
        ${JSON.stringify(Array.isArray(req.body.evidence_refs) ? req.body.evidence_refs : [])}::jsonb, 'draft', ${req.userId ?? null})`);
  }
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
  return tx.execute(sql`SELECT * FROM raepa_concept_language_relationships WHERE id = ${id}`);
  });
  await writeAudit({ eventType: "raepa.concept_language.created", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { relationshipId: id } });
  res.status(201).json(row.rows[0]);
});

router.get("/cases/:caseId/raepa/recommendations", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_recommendations WHERE case_id = ${caseId} ORDER BY created_at`);
  res.json(rows.rows);
});

router.post("/cases/:caseId/raepa/recommendations", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const b = req.body;
  if (!b || typeof b.category !== "string" || typeof b.identified_need !== "string" || typeof b.strategy !== "string" ||
      !b.category.trim() || !b.identified_need.trim() || !b.strategy.trim() || !Array.isArray(b.evidence_refs) || !b.evidence_refs.length) {
    res.status(400).json({ error: "category, identified_need, strategy, and at least one evidence_refs item are required" }); return;
  }
  const id = nanoid();
  const row = await db.transaction(async (tx) => {
  if (isAssessmentLead(req.userRole)) {
    await tx.execute(sql`INSERT INTO raepa_recommendations
      (id, case_id, category, identified_need, evidence_refs, strategy, responsible_person, context_frequency, progress_indicator, status, ai_generated, reviewer_id, reviewed_at)
      VALUES (${id}, ${caseId}, ${b.category.trim().slice(0, 120)}, ${b.identified_need.trim().slice(0, 5000)},
        ${JSON.stringify(b.evidence_refs)}::jsonb, ${b.strategy.trim().slice(0, 10000)},
        ${typeof b.responsible_person === "string" ? b.responsible_person.slice(0, 300) : null},
        ${typeof b.context_frequency === "string" ? b.context_frequency.slice(0, 500) : null},
        ${typeof b.progress_indicator === "string" ? b.progress_indicator.slice(0, 2000) : null},
        'reviewed', ${b.ai_generated === true}, ${req.userId}, NOW())`);
  } else {
    await tx.execute(sql`INSERT INTO raepa_recommendations
      (id, case_id, category, identified_need, evidence_refs, strategy, responsible_person, context_frequency, progress_indicator, status, ai_generated)
      VALUES (${id}, ${caseId}, ${b.category.trim().slice(0, 120)}, ${b.identified_need.trim().slice(0, 5000)},
        ${JSON.stringify(b.evidence_refs)}::jsonb, ${b.strategy.trim().slice(0, 10000)},
        ${typeof b.responsible_person === "string" ? b.responsible_person.slice(0, 300) : null},
        ${typeof b.context_frequency === "string" ? b.context_frequency.slice(0, 500) : null},
        ${typeof b.progress_indicator === "string" ? b.progress_indicator.slice(0, 2000) : null},
        'draft', ${b.ai_generated === true})`);
  }
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
  return tx.execute(sql`SELECT * FROM raepa_recommendations WHERE id = ${id}`);
  });
  await writeAudit({ eventType: "raepa.recommendation.created", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { recommendationId: id } });
  res.status(201).json(row.rows[0]);
});

type CanonicalQaCheck = { key: string; passed: boolean; details: string };
class CanonicalQaBlockedError extends Error {
  constructor(public readonly checks: CanonicalQaCheck[]) {
    super("Report approval blocked until all canonical QA checks pass");
  }
}
class V2ReportVersionConflictError extends Error {}

async function recomputeCanonicalQa(caseId: string, reportId: string, actorId?: string, executor: any = db, pathwayOverride?: "standalone" | "comprehensive"): Promise<{ passed: boolean; blocked: boolean; checks: CanonicalQaCheck[]; reportVersion: number }> {
  const reportRows = await executor.execute(sql`SELECT version, pathway, generated_narrative, edited_narrative, source_evidence_refs, report_findings FROM raepa_reports WHERE id = ${reportId} AND case_id = ${caseId} LIMIT 1`);
  const report: any = reportRows.rows[0];
  if (!report) throw new Error("Report not found");
  const evidenceBundle = await buildCanonicalEvidenceBundle(caseId, executor);
  const [caseRows, profileRows, sampleRows, analysisRows, hypothesisRows, planRows, taskRows, trialRows, recRows, evidenceRows, scoreRows, ratingRows] = await Promise.all([
    executor.execute(sql`SELECT consent_obtained FROM cases WHERE id = ${caseId} LIMIT 1`),
    executor.execute(sql`SELECT review_status FROM raepa_profiles WHERE case_id = ${caseId} LIMIT 1`),
    executor.execute(sql`SELECT count(*)::int AS count FROM raepa_work_samples WHERE case_id = ${caseId}`),
    executor.execute(sql`SELECT count(*)::int AS count,
      count(*) FILTER (WHERE review_status IN ('reviewed','approved'))::int AS reviewed
      FROM raepa_work_sample_analyses WHERE case_id = ${caseId}`),
    executor.execute(sql`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status IN ('approved','modified'))::int AS reviewed,
      count(*) FILTER (WHERE status IN ('approved','modified') AND jsonb_array_length(COALESCE(evidence_refs, '[]'::jsonb)) > 0)::int AS supported
      FROM raepa_hypotheses WHERE case_id = ${caseId}`),
    executor.execute(sql`SELECT count(*) FILTER (WHERE status = 'approved')::int AS count FROM raepa_assessment_plans WHERE case_id = ${caseId}`),
    executor.execute(sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE status IN ('completed','not_administered'))::int AS completed FROM raepa_assessment_tasks WHERE case_id = ${caseId}`),
    executor.execute(sql`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE condition = 'mediated')::int AS mediated,
      count(*) FILTER (WHERE condition = 'mediated' AND support_provided IS NOT NULL AND length(trim(support_provided)) > 0)::int AS mediated_documented,
      count(*) FILTER (WHERE condition = 'transfer')::int AS transfer,
      count(*) FILTER (WHERE condition = 'transfer' AND (transfer_performance IS NOT NULL OR response IS NOT NULL))::int AS transfer_documented
      FROM raepa_dynamic_trials WHERE case_id = ${caseId}`),
    executor.execute(sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE jsonb_array_length(COALESCE(evidence_refs, '[]'::jsonb)) > 0)::int AS linked FROM raepa_recommendations WHERE case_id = ${caseId}`),
    executor.execute(sql`SELECT (
      (SELECT count(*) FROM raepa_v2_evidence WHERE case_id = ${caseId}) +
      (SELECT count(*) FROM raepa_teacher_profiles WHERE case_id = ${caseId}) +
      (SELECT count(*) FROM raepa_student_interviews WHERE case_id = ${caseId}) +
      (SELECT CASE WHEN EXISTS (
        SELECT 1 FROM raepa_profiles WHERE case_id = ${caseId}
          AND COALESCE(data->>'parent_voice', '') <> ''
      ) THEN 1 ELSE 0 END)
    )::int AS count`),
    executor.execute(sql`SELECT count(*)::int AS count FROM raepa_module_scores WHERE session_id = (SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1) AND (administered = TRUE OR score IS NOT NULL)`),
    executor.execute(sql`SELECT count(*)::int AS count FROM raepa_domain_ratings WHERE session_id = (SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1) AND score IS NOT NULL`),
  ]);
  const profile: any = profileRows.rows[0];
  const samples = Number((sampleRows.rows[0] as any)?.count ?? 0);
  const analyses = Number((analysisRows.rows[0] as any)?.count ?? 0);
  const reviewedAnalyses = Number((analysisRows.rows[0] as any)?.reviewed ?? 0);
  const hypotheses: any = hypothesisRows.rows[0];
  const tasks: any = taskRows.rows[0];
  const trials: any = trialRows.rows[0];
  const recommendations: any = recRows.rows[0];
  const selectedPathway = pathwayOverride ?? (report.pathway === "comprehensive" ? "comprehensive" : "standalone");
  const selectedEditedText = resolveReportNarrative(report.edited_narrative, selectedPathway);
  const reportText = selectedEditedText.toLowerCase();
  const claimIsUnqualified = (pattern: RegExp): boolean => {
    for (const match of reportText.matchAll(pattern)) {
      const before = reportText.slice(Math.max(0, (match.index ?? 0) - 45), match.index ?? 0);
      if (!/\b(no|not|without|never|doesn['’]?t|do not|cannot|avoid)\b/i.test(before)) return true;
    }
    return false;
  };
  const unsupportedDiagnosis = claimIsUnqualified(/\b(?:diagnos(?:e|is|ed|tic)|intellectual disability|learning disability|language disorder)\b/gi);
  const deterministicCrossLinguistic = claimIsUnqualified(/\b(?:first|home|native|heritage|cross[- ]linguistic)\s+language\b[\s\S]{0,100}\b(?:caus(?:e|es|ed)|determin(?:e|es|ed)|predicts?|because of|due to)\b|\b(?:caus(?:e|es|ed)|determin(?:e|es|ed)|predicts?|because of|due to)\b[\s\S]{0,100}\b(?:first|home|native|heritage|cross[- ]linguistic)\s+language\b/gi);
  const englishEquatedAbility = claimIsUnqualified(/\b(?:limited|poor|low|developing)\s+(?:english|english proficiency|eal)\b[\s\S]{0,100}\b(?:low|limited|poor|high|intellectual|academic|cognitive)\s+ability\b|\b(?:english proficiency|eal status|limited english)\b[\s\S]{0,100}\b(?:proves?|means?|indicates?|equals?|demonstrates?)\b[\s\S]{0,50}\b(?:ability|intelligence|capacity)\b/gi);
  const knownRefs = new Set<string>();
  for (const ref of evidenceBundle.source_refs) {
    knownRefs.add(ref.id);
    knownRefs.add(ref.id.slice(ref.id.indexOf(":") + 1));
  }
  const sourceRefs = Array.isArray(report.source_evidence_refs) ? report.source_evidence_refs : [];
  const normalizedSourceRefs = sourceRefs.map(referenceId);
  const findings = reportFindings(report.report_findings);
  const editedReportText = selectedEditedText;
  const mappingValidation = validateNarrativeFindings(editedReportText, findings, evidenceBundle);
  const allFindingRefsValid = mappingValidation.valid;
  const allSourceRefsValid = normalizedSourceRefs.length > 0 && normalizedSourceRefs.every(ref => knownRefs.has(ref));
  const linkedEvidenceRefs: string[] = [];
  const collectRefs = (rows: any[], field = "evidence_refs") => {
    for (const row of rows) {
      const refs = Array.isArray(row?.[field]) ? row[field] : [];
      linkedEvidenceRefs.push(...refs.map(referenceId).filter(Boolean));
    }
  };
  collectRefs(evidenceBundle.work_sample_analyses, "source_evidence_refs");
  collectRefs(evidenceBundle.hypotheses);
  collectRefs(evidenceBundle.dynamic_trials);
  collectRefs(evidenceBundle.concept_language);
  collectRefs(evidenceBundle.recommendations);
  for (const plan of evidenceBundle.plans) {
    const planData = parseJsonValue(plan?.reviewer_notes);
    for (const recommendation of Array.isArray(planData?.recommendations) ? planData.recommendations : []) {
      if (Array.isArray(recommendation?.evidence_ids)) linkedEvidenceRefs.push(...recommendation.evidence_ids.map(referenceId).filter(Boolean));
    }
  }
  const linkedEvidenceRefsValid = linkedEvidenceRefs.every(ref => knownRefs.has(ref));
  const scoreCount = Number((scoreRows.rows[0] as any)?.count ?? 0) + Number((ratingRows.rows[0] as any)?.count ?? 0);
  const checks: CanonicalQaCheck[] = [
    { key: "consent_complete", passed: (caseRows.rows[0] as any)?.consent_obtained === true, details: "Parent/guardian consent must be complete" },
    { key: "intake_reviewed", passed: profile?.review_status === "reviewed" || profile?.review_status === "approved", details: "The RAEPA profile must be reviewed by an Assessment Lead or admin" },
    { key: "work_product_context", passed: samples === 0 || (analyses >= samples && reviewedAnalyses >= samples), details: "Every work product must have a reviewed four-layer contextual analysis" },
    { key: "hypotheses_reviewed", passed: Number(hypotheses?.total ?? 0) === 0 || Number(hypotheses?.total ?? 0) === Number(hypotheses?.reviewed ?? 0), details: "Every hypothesis must be professionally reviewed" },
    { key: "evidence_supported_conclusions", passed: Number(hypotheses?.total ?? 0) === 0 || Number(hypotheses?.reviewed ?? 0) === Number(hypotheses?.supported ?? 0), details: "Reviewed hypotheses must link to evidence" },
    { key: "assessment_plan_approved", passed: Number((planRows.rows[0] as any)?.count ?? 0) > 0, details: "An approved individualized assessment plan is required" },
    { key: "tasks_completed_or_marked", passed: Number(tasks?.total ?? 0) === 0 || Number(tasks?.total ?? 0) === Number(tasks?.completed ?? 0), details: "Selected tasks must be completed or marked not administered" },
    { key: "scores_or_results_recorded", passed: scoreCount > 0, details: "At least one scored domain, administered module, or result must be recorded" },
    { key: "mediation_documented", passed: Number(trials?.mediated ?? 0) === Number(trials?.mediated_documented ?? 0), details: "Mediation trials must include the support provided" },
    { key: "transfer_documented", passed: Number(trials?.transfer ?? 0) === Number(trials?.transfer_documented ?? 0), details: "Transfer trials must record a response or transfer performance" },
    { key: "evidence_available", passed: Number(evidenceRows.rows[0] ? (evidenceRows.rows[0] as any).count : 0) > 0, details: "Conclusions require at least one recorded evidence source" },
    { key: "recommendations_linked", passed: Number(recommendations?.total ?? 0) === 0 || Number(recommendations?.total ?? 0) === Number(recommendations?.linked ?? 0), details: "Every recommendation must link to evidence" },
    { key: "report_evidence_refs_valid", passed: allSourceRefsValid, details: "Every persisted report source reference must identify evidence in the canonical bundle" },
    { key: "report_findings_evidence_refs", passed: allFindingRefsValid, details: mappingValidation.error ?? "Every substantive edited narrative section must have an exact, known evidence mapping" },
    { key: "linked_evidence_refs_valid", passed: linkedEvidenceRefsValid, details: "Every evidence-linked record must reference a known canonical evidence item" },
    { key: "unsupported_diagnosis_safeguard", passed: !unsupportedDiagnosis, details: "Report text contains an unsupported diagnosis or disability claim" },
    { key: "deterministic_cross_linguistic_safeguard", passed: !deterministicCrossLinguistic, details: "Report text makes a deterministic cross-linguistic causal claim" },
    { key: "english_ability_equivalence_safeguard", passed: !englishEquatedAbility, details: "Report text equates limited English with ability, intelligence, or capacity" },
  ];
  const passed = checks.every(check => check.passed);
  const reportVersion = Number(report.version ?? 1);
  for (const check of checks) {
    await executor.execute(sql`INSERT INTO raepa_qa_checks (id, case_id, report_id, report_version, check_key, passed, details, checked_by)
      VALUES (${nanoid()}, ${caseId}, ${reportId}, ${reportVersion}, ${check.key}, ${check.passed}, ${check.details}, ${actorId ?? null})
      ON CONFLICT (case_id, report_id, check_key) DO UPDATE SET report_version = EXCLUDED.report_version, passed = EXCLUDED.passed,
        details = EXCLUDED.details, checked_by = EXCLUDED.checked_by, checked_at = NOW()`);
  }
  await executor.execute(sql`UPDATE raepa_reports SET qa_status = ${passed ? "passed" : "blocked"}, updated_at = NOW() WHERE id = ${reportId} AND case_id = ${caseId}`);
  return { passed, blocked: !passed, checks, reportVersion };
}

router.post("/cases/:caseId/raepa/qa", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const reportId = typeof req.body?.report_id === "string" ? req.body.report_id : "";
  if (!reportId) { res.status(400).json({ error: "report_id is required for canonical QA" }); return; }
  try {
    const result = await recomputeCanonicalQa(caseId, reportId, req.userId);
    await writeAudit({ eventType: `raepa.qa.${result.passed ? "passed" : "blocked"}`, caseId, actorId: req.userId, actorRole: req.userRole, metadata: { reportId, checks: result.checks, reportVersion: result.reportVersion } });
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "Report not found") { res.status(404).json({ error: err.message }); return; }
    throw err;
  }
  return;
  /*
  const reportId = typeof req.body?.report_id === "string" ? req.body.report_id : null;
  const qaReportId = reportId ?? "";
  const [caseRows, profileRows, sampleRows, analysisRows, hypothesisRows, planRows, taskRows, trialRows, recRows] = await Promise.all([
    db.execute(sql`SELECT consent_obtained FROM cases WHERE id = ${caseId} LIMIT 1`),
    db.execute(sql`SELECT review_status FROM raepa_profiles WHERE case_id = ${caseId} LIMIT 1`),
    db.execute(sql`SELECT count(*)::int AS count FROM raepa_work_samples WHERE case_id = ${caseId}`),
    db.execute(sql`SELECT count(*)::int AS count FROM raepa_work_sample_analyses WHERE case_id = ${caseId}`),
    db.execute(sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE status IN ('approved','modified'))::int AS reviewed FROM raepa_hypotheses WHERE case_id = ${caseId}`),
    db.execute(sql`SELECT count(*) FILTER (WHERE status = 'approved')::int AS count FROM raepa_assessment_plans WHERE case_id = ${caseId}`),
    db.execute(sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE status IN ('completed','not_administered'))::int AS completed FROM raepa_assessment_tasks WHERE case_id = ${caseId}`),
    db.execute(sql`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE condition = 'mediated')::int AS mediated,
      count(*) FILTER (WHERE condition = 'mediated' AND support_provided IS NOT NULL AND length(trim(support_provided)) > 0)::int AS mediated_documented,
      count(*) FILTER (WHERE condition = 'transfer')::int AS transfer,
      count(*) FILTER (WHERE condition = 'transfer' AND (transfer_performance IS NOT NULL OR response IS NOT NULL))::int AS transfer_documented
      FROM raepa_dynamic_trials WHERE case_id = ${caseId}`),
    db.execute(sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE jsonb_array_length(evidence_refs) > 0)::int AS linked FROM raepa_recommendations WHERE case_id = ${caseId}`),
  ]);
  const profile = profileRows.rows[0] as any;
  const samples = Number((sampleRows.rows[0] as any)?.count ?? 0);
  const analyses = Number((analysisRows.rows[0] as any)?.count ?? 0);
  const hypotheses = hypothesisRows.rows[0] as any;
  const tasks = taskRows.rows[0] as any;
  const trials = trialRows.rows[0] as any;
  const recommendations = recRows.rows[0] as any;
  const checks = [
    { key: "consent_complete", passed: (caseRows.rows[0] as any)?.consent_obtained === true, details: "Parent/guardian consent must be complete" },
    { key: "intake_reviewed", passed: profile?.review_status === "reviewed" || profile?.review_status === "approved", details: "RAEPA profile must be professionally reviewed" },
    { key: "work_product_context", passed: samples === 0 || analyses >= samples, details: "Every work product must have contextual analysis" },
    { key: "hypotheses_reviewed", passed: Number(hypotheses?.total ?? 0) === 0 || Number(hypotheses?.total ?? 0) === Number(hypotheses?.reviewed ?? 0), details: "AI hypotheses require professional review" },
    { key: "assessment_plan_approved", passed: Number((planRows.rows[0] as any)?.count ?? 0) > 0, details: "An approved individualized assessment plan is required" },
    { key: "tasks_completed_or_marked", passed: Number(tasks?.total ?? 0) === 0 || Number(tasks?.total ?? 0) === Number(tasks?.completed ?? 0), details: "Selected tasks must be completed or marked not administered" },
    { key: "mediation_documented", passed: Number(trials?.mediated ?? 0) === Number(trials?.mediated_documented ?? 0), details: "Mediation must include the support provided" },
    { key: "transfer_documented", passed: Number(trials?.transfer ?? 0) === Number(trials?.transfer_documented ?? 0), details: "Transfer trials must record a response or transfer performance" },
    { key: "recommendations_linked", passed: Number(recommendations?.total ?? 0) === 0 || Number(recommendations?.total ?? 0) === Number(recommendations?.linked ?? 0), details: "Recommendations must link to evidence" },
  ];
  for (const check of checks) {
    await db.execute(sql`INSERT INTO raepa_qa_checks (id, case_id, report_id, check_key, passed, details, checked_by)
      VALUES (${nanoid()}, ${caseId}, ${qaReportId}, ${check.key}, ${check.passed}, ${check.details}, ${req.userId})
      ON CONFLICT (case_id, report_id, check_key) DO UPDATE SET passed = EXCLUDED.passed, details = EXCLUDED.details, checked_by = EXCLUDED.checked_by, checked_at = NOW()`);
  }
  const passed = checks.every((check) => check.passed);
  if (reportId) await db.execute(sql`UPDATE raepa_reports SET qa_status = ${passed ? "passed" : "blocked"}, updated_at = NOW() WHERE id = ${reportId} AND case_id = ${caseId}`);
  await writeAudit({ eventType: `raepa.qa.${passed ? "passed" : "blocked"}`, caseId, actorId: req.userId, actorRole: req.userRole, metadata: { reportId, checks } });
  res.json({ passed, blocked: !passed, checks });
  */
});

async function persistApprovedComprehensiveSection(caseId: string, raepaReportId: string, narrative: unknown, actorId?: string, actorRole?: string, executor: any = db): Promise<void> {
  const section = resolveReportNarrative(narrative, "comprehensive").trim();
  if (!section) return;
  const markerStart = "Academic English Access & Performance";
  const markerEnd = "End Academic English Access & Performance";
  const existing = await executor.select().from(reportsTable).where(eq(reportsTable.caseId, caseId)).limit(1);
  const current = existing[0];
  const markedSection = `--- ${markerStart} ---\n${section}\n--- ${markerEnd} ---`;
  const previous = current?.domainAnalysis ?? "";
  const nextDomainAnalysis = previous.includes(`--- ${markerStart} ---`)
    ? previous.replace(new RegExp(`--- ${markerStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} ---[\\s\\S]*?--- ${markerEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} ---`, "g"), markedSection)
    : previous ? `${previous.trim()}\n\n${markedSection}` : markedSection;
  if (current) {
    await executor.update(reportsTable).set({
      domainAnalysis: nextDomainAnalysis, status: "draft", approvedAt: null, updatedAt: new Date(),
    })
      .where(eq(reportsTable.caseId, caseId));
  } else {
    await executor.insert(reportsTable).values({
      id: nanoid(), caseId, domainAnalysis: nextDomainAnalysis, status: "draft",
      generatedAt: new Date(),
    });
  }
}

async function removePersistedComprehensiveSection(caseId: string, executor: any = db): Promise<void> {
  const markerStart = "Academic English Access & Performance";
  const markerEnd = "End Academic English Access & Performance";
  const existing = await executor.select().from(reportsTable).where(eq(reportsTable.caseId, caseId)).limit(1);
  const current = existing[0];
  if (!current?.domainAnalysis || !current.domainAnalysis.includes(`--- ${markerStart} ---`)) return;
  const escapedStart = markerStart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = markerEnd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const nextDomainAnalysis = current.domainAnalysis
    .replace(new RegExp(`\\s*--- ${escapedStart} ---[\\s\\S]*?--- ${escapedEnd} ---\\s*`, "g"), "\n")
    .trim();
  await executor.update(reportsTable).set({
    domainAnalysis: nextDomainAnalysis,
    status: "draft",
    approvedAt: null,
    updatedAt: new Date(),
  }).where(eq(reportsTable.caseId, caseId));
}

router.get("/cases/:caseId/raepa/qa", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const requestedId = typeof req.query.report_id === "string" ? req.query.report_id : "";
  const latest = requestedId ? { rows: [{ id: requestedId }] } : await db.execute(sql`SELECT id FROM raepa_reports WHERE case_id = ${caseId} ORDER BY updated_at DESC LIMIT 1`);
  const reportId = String((latest.rows[0] as any)?.id ?? "");
  const rows = reportId
    ? await db.execute(sql`SELECT * FROM raepa_qa_checks WHERE case_id = ${caseId} AND report_id = ${reportId} ORDER BY checked_at DESC`)
    : { rows: [] };
  res.json(rows.rows);
});

router.post("/cases/:caseId/raepa/report/persist", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const b = req.body;
  if (!b || typeof b.narrative !== "object" || b.narrative === null) { res.status(400).json({ error: "narrative object is required" }); return; }
  const pathway = b.pathway === "comprehensive" ? "comprehensive" : "standalone";
  const narrativeKey = pathway === "comprehensive" ? "comprehensive_text" : "standalone_text";
  const evidenceBundle = await buildCanonicalEvidenceBundle(caseId);
  const submittedFindings = reportFindings(b.findings ?? b.conclusions);
  const latestDraft = typeof b.report_id === "string" ? { rows: [] } : await db.execute(sql`SELECT id FROM raepa_reports
    WHERE case_id = ${caseId} AND status = 'draft' ORDER BY updated_at DESC LIMIT 1`);
  const id = typeof b.report_id === "string" ? b.report_id : String((latestDraft.rows[0] as any)?.id ?? nanoid());
  const sessionId = await ensureSession(caseId);
  const existing = await db.execute(sql`SELECT id, edited_narrative, report_findings FROM raepa_reports WHERE id = ${id} AND case_id = ${caseId} LIMIT 1`);
  const currentText = existing.rows.length ? resolveReportNarrative((existing.rows[0] as any).edited_narrative, pathway) : "";
  const nextText = resolveReportNarrative(b.narrative, pathway);
  const normalizedNarrative = { ...b.narrative, [narrativeKey]: nextText };
  const narrativeChanged = !existing.rows.length || currentText !== nextText;
  if (narrativeChanged && !Array.isArray(b.findings) && !Array.isArray(b.conclusions)) {
    res.status(400).json({ error: "Updated narrative requires findings (or conclusions): [{ id, section_key, narrative_text, evidence_refs }]" }); return;
  }
  const findingsInput = submittedFindings.length ? submittedFindings : reportFindings((existing.rows[0] as any)?.report_findings);
  const validated = validateNarrativeFindings(nextText, findingsInput, evidenceBundle);
  if (!validated.valid) {
    res.status(400).json({ error: validated.error ?? "Narrative evidence mappings are invalid", contract: "findings: [{ id, section_key, narrative_text, evidence_refs }]" }); return;
  }
  const findings = validated.findings;
  if (existing.rows.length) {
    await db.execute(sql`UPDATE raepa_reports SET edited_narrative = ${JSON.stringify(normalizedNarrative)}::jsonb,
      source_evidence_refs = ${JSON.stringify(evidenceBundle.source_refs)}::jsonb, report_findings = ${JSON.stringify(findings)}::jsonb,
      pathway = ${pathway}, status = 'draft', professional_approved_by = NULL, professional_approved_at = NULL,
      approved_by = NULL, approved_at = NULL, qa_status = 'not_run', version = version + 1, updated_at = NOW() WHERE id = ${id}`);
  } else {
    await db.execute(sql`INSERT INTO raepa_reports
      (id, case_id, session_id, report_type, generated_narrative, edited_narrative, status, source_evidence_refs, report_findings, pathway)
      VALUES (${id}, ${caseId}, ${sessionId}, ${pathway}, ${JSON.stringify(normalizedNarrative)}::jsonb, ${JSON.stringify(normalizedNarrative)}::jsonb,
        'draft', ${JSON.stringify(evidenceBundle.source_refs)}::jsonb, ${JSON.stringify(findings)}::jsonb, ${pathway})`);
  }
  const row = await db.execute(sql`SELECT * FROM raepa_reports WHERE id = ${id}`);
  await writeAudit({ eventType: "raepa.report.persisted", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { reportId: id, pathway } });
  res.status(existing.rows.length ? 200 : 201).json(row.rows[0]);
});

router.post("/cases/:caseId/raepa/report/:reportId/professional-approve", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin approval required" }); return; }
  try {
    const approval = await db.transaction(async (tx) => {
      const locked = await tx.execute(sql`SELECT * FROM raepa_reports
        WHERE id = ${req.params.reportId} AND case_id = ${caseId} LIMIT 1 FOR UPDATE`);
      if (!locked.rows.length) return { notFound: true as const };
      const report = locked.rows[0] as any;
      const currentVersion = Number(report.version ?? 1);
      const expected = expectedVersion(req);
      if (expected !== null && expected !== currentVersion) throw new V2ReportVersionConflictError();

      const canonicalQa = await recomputeCanonicalQa(caseId, req.params.reportId, req.userId, tx);
      if (!canonicalQa.passed) throw new CanonicalQaBlockedError(canonicalQa.checks);

      const approved = await tx.execute(sql`UPDATE raepa_reports SET status = 'approved',
        professional_approved_by = ${req.userId}, professional_approved_at = NOW(),
        approved_by = ${req.userId}, approved_at = NOW(), updated_at = NOW(), version = version + 1
        WHERE id = ${req.params.reportId} AND case_id = ${caseId} AND version = ${currentVersion}
        RETURNING *`);
      if (!approved.rows.length) throw new V2ReportVersionConflictError();
      const approvedReport = approved.rows[0] as any;
      if (approvedReport.pathway === "comprehensive") {
        await persistApprovedComprehensiveSection(caseId, String(req.params.reportId),
          approvedReport.edited_narrative, req.userId, req.userRole, tx);
      }
      return { notFound: false as const, report: approvedReport, canonicalQa };
    });
    if (approval.notFound) { res.status(404).json({ error: "Report not found" }); return; }
    if (approval.report.pathway === "comprehensive" && resolveReportNarrative(approval.report.edited_narrative, "comprehensive").trim()) {
      await writeAudit({ eventType: "raepa.comprehensive_section.persisted", caseId, actorId: req.userId, actorRole: req.userRole,
        metadata: { raepaReportId: req.params.reportId, section: "Academic English Access & Performance", resetToDraft: true } });
    }
    await writeAudit({ eventType: "raepa.report.professionally_approved", caseId, actorId: req.userId, actorRole: req.userRole,
      metadata: { reportId: req.params.reportId, reportVersion: approval.report.version, qaChecks: approval.canonicalQa.checks } });
    res.json(approval.report);
    return;
  } catch (err) {
    if (err instanceof CanonicalQaBlockedError) {
      res.status(422).json({ error: err.message, code: "qa_blocked", checks: err.checks }); return;
    }
    if (err instanceof V2ReportVersionConflictError) {
      const current = await db.execute(sql`SELECT version FROM raepa_reports WHERE id = ${req.params.reportId} AND case_id = ${caseId} LIMIT 1`);
      res.status(409).json({
        error: "version_conflict", code: "version_conflict",
        current_version: current.rows.length ? Number((current.rows[0] as any).version ?? 1) : null,
      });
      return;
    }
    logger.error({ err, caseId }, "canonical RAEPA QA failed");
    res.status(500).json({ error: "Canonical QA failed" }); return;
  }
});

router.post("/cases/:caseId/raepa/access-tokens", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin access required" }); return; }
  const scope = req.body?.scope;
  if (!["teacher", "student"].includes(scope)) { res.status(400).json({ error: "scope must be teacher or student" }); return; }
  const expiresHours = Number(req.body?.expires_hours ?? 168);
  if (!Number.isFinite(expiresHours) || expiresHours <= 0 || expiresHours > 720) { res.status(400).json({ error: "expires_hours must be between 1 and 720" }); return; }
  if (req.body?.rotate === true) {
    const rotated = await db.execute(sql`UPDATE raepa_access_tokens SET revoked_at = NOW()
      WHERE case_id = ${caseId} AND scope = ${scope} AND revoked_at IS NULL RETURNING id`);
    await writeAudit({ eventType: "raepa.access_token.rotated", caseId, actorId: req.userId, actorRole: req.userRole,
      metadata: { scope, revokedCount: rotated.rows.length } });
  }
  const raw = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);
  await db.execute(sql`INSERT INTO raepa_access_tokens (id, case_id, token_hash, scope, expires_at, created_by)
    VALUES (${nanoid()}, ${caseId}, ${tokenHash(raw)}, ${scope}, ${expiresAt}, ${req.userId})`);
  await writeAudit({ eventType: "raepa.access_token.minted", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { scope, expiresAt, source: "access-tokens" } });
  res.status(201).json({ token: raw, scope, expires_at: expiresAt.toISOString() });
});

router.post("/cases/:caseId/raepa/access-tokens/:tokenId/revoke", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin access required" }); return; }
  const rows = await db.execute(sql`UPDATE raepa_access_tokens SET revoked_at = COALESCE(revoked_at, NOW())
    WHERE id = ${req.params.tokenId} AND case_id = ${caseId} RETURNING id, scope, revoked_at`);
  if (!rows.rows.length) { res.status(404).json({ error: "Access token not found" }); return; }
  await writeAudit({ eventType: "raepa.access_token.revoked", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { tokenId: req.params.tokenId } });
  res.json({ ok: true, token: rows.rows[0] });
});

router.get("/cases/:caseId/raepa/access-tokens", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin access required" }); return; }
  const rows = await db.execute(sql`SELECT id, scope, expires_at, used_at, revoked_at, created_at FROM raepa_access_tokens WHERE case_id = ${caseId} ORDER BY created_at DESC`);
  res.json(rows.rows);
});

async function getScopedToken(token: string): Promise<any | null> {
  if (!token || token.length < 32 || token.length > 200) return null;
  const rows = await db.execute(sql`SELECT id, case_id, scope, expires_at FROM raepa_access_tokens
    WHERE token_hash = ${tokenHash(token)} AND revoked_at IS NULL AND expires_at > NOW() LIMIT 1`);
  return rows.rows[0] ?? null;
}

router.get("/public/raepa/access/:token", async (req, res): Promise<void> => {
  const info = await getScopedToken(req.params.token);
  if (!info) { res.status(404).json({ error: "Invalid or expired access link" }); return; }
  await db.execute(sql`UPDATE raepa_access_tokens SET used_at = COALESCE(used_at, NOW()) WHERE id = ${info.id}`);
  res.json({ case_id: info.case_id, scope: info.scope, expires_at: info.expires_at });
});

router.post("/public/raepa/access/:token/intake", async (req, res): Promise<void> => {
  const info = await getScopedToken(req.params.token);
  if (!info) { res.status(404).json({ error: "Invalid or expired access link" }); return; }
  if (!req.body || typeof req.body !== "object") { res.status(400).json({ error: "intake payload is required" }); return; }
  if (info.scope === "teacher" && (!req.body.data || typeof req.body.data !== "object")) { res.status(400).json({ error: "teacher intake requires data" }); return; }
  const intakeKey = idempotencyKey(req, `public-${info.scope}-intake`, { caseId: info.case_id, tokenId: info.id, body: req.body });
  if (info.scope === "student") {
    const parsed = z.array(responseItemSchema).safeParse(req.body.responses);
    if (!parsed.success) { res.status(400).json({ error: "student responses must preserve original text and use response_original", details: parsed.error.flatten() }); return; }
    const id = nanoid();
    const result = await db.transaction(async (tx) => {
      const inserted = await tx.execute(sql`INSERT INTO raepa_student_interviews
      (id, case_id, responses, original_language, translation_metadata, idempotency_key)
      VALUES (${id}, ${info.case_id}, ${JSON.stringify(parsed.data)}::jsonb,
        ${typeof req.body.original_language === "string" ? req.body.original_language.slice(0, 120) : null},
        ${req.body.translation_metadata && typeof req.body.translation_metadata === "object" ? JSON.stringify(req.body.translation_metadata) : null}::jsonb, ${intakeKey})
      ON CONFLICT (case_id, idempotency_key) DO NOTHING RETURNING id`);
      if (!inserted.rows.length) {
        const duplicate = await tx.execute(sql`SELECT id FROM raepa_student_interviews
          WHERE case_id = ${info.case_id} AND idempotency_key = ${intakeKey} LIMIT 1`);
        return { id: duplicate.rows[0]?.id ?? id, created: false };
      }
      for (const [index, response] of parsed.data.entries()) {
        await tx.execute(sql`INSERT INTO raepa_student_responses
        (id, case_id, response_type, prompt_id, prompt, original_language, original_response, response_mode, non_scored_evidence, idempotency_key)
        VALUES (${nanoid()}, ${info.case_id}, 'interview', ${response.question_id}, ${response.prompt_original ?? null},
          ${response.language ?? req.body.original_language ?? "Unknown / unsure"}, ${response.response_original},
          ${typeof (response as any).response_mode === "string" ? (response as any).response_mode : null}, TRUE, ${`${intakeKey}:${index}`})`);
      }
      await invalidateRaepaEvidence(String(info.case_id), undefined, undefined, true, tx);
      await tx.execute(sql`UPDATE raepa_access_tokens SET used_at = NOW() WHERE id = ${info.id}`);
      return { id, created: true };
    });
    if (result.created) {
      await writeAudit({ eventType: "raepa.public.student_interview.created", caseId: String(info.case_id), metadata: { interviewId: result.id } });
    }
    res.status(result.created ? 201 : 200).json({ id: result.id, accepted: true, duplicate: !result.created });
    return;
  }
  const id = nanoid();
  const result = await db.transaction(async (tx) => {
    const inserted = await tx.execute(sql`INSERT INTO raepa_teacher_profiles
    (id, case_id, data, original_text, translated_text, translation_metadata, idempotency_key)
    VALUES (${id}, ${info.case_id}, ${JSON.stringify(req.body.data)}::jsonb,
      ${typeof req.body.original_text === "string" ? req.body.original_text.slice(0, 20000) : null},
      ${typeof req.body.translated_text === "string" ? req.body.translated_text.slice(0, 20000) : null},
      ${req.body.translation_metadata && typeof req.body.translation_metadata === "object" ? JSON.stringify(req.body.translation_metadata) : null}::jsonb, ${intakeKey})
    ON CONFLICT (case_id, idempotency_key) DO NOTHING RETURNING id`);
    if (!inserted.rows.length) {
      const duplicate = await tx.execute(sql`SELECT id FROM raepa_teacher_profiles
        WHERE case_id = ${info.case_id} AND idempotency_key = ${intakeKey} LIMIT 1`);
      return { id: duplicate.rows[0]?.id ?? id, created: false };
    }
    await invalidateRaepaEvidence(String(info.case_id), undefined, undefined, true, tx);
    await tx.execute(sql`UPDATE raepa_access_tokens SET used_at = NOW() WHERE id = ${info.id}`);
    return { id, created: true };
  });
  if (result.created) {
    await writeAudit({ eventType: "raepa.public.teacher_profile.created", caseId: String(info.case_id), metadata: { teacherProfileId: result.id } });
  }
  res.status(result.created ? 201 : 200).json({ id: result.id, accepted: true, duplicate: !result.created });
});

// ── RAEPA v2 frontend compatibility contract ─────────────────────────────────
// The professional workspace uses the concise /v2 resource names below. Keep
// these aliases separate from the original endpoints so existing integrations
// continue to receive their v1 shapes.
router.get("/cases/:caseId/raepa/v2/academic-history", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_language_academic_history WHERE case_id = ${caseId} ORDER BY created_at`);
  const profile = await db.execute(sql`SELECT data FROM raepa_profiles WHERE case_id = ${caseId} LIMIT 1`);
  const data = (profile.rows[0] as any)?.data ?? {};
  res.json({
    languages: rows.rows.map((row: any) => ({
      id: row.id, language: row.language, relationship: row.source ?? "home",
      age_first_exposed: row.age_first_exposed ?? "",
      years: row.years_of_instruction ?? "", academic_use: row.formal_schooling_experience ?? "",
      years_of_instruction: row.years_of_instruction ?? "", proficiency: row.proficiency ?? "",
      formal_schooling_experience: row.formal_schooling_experience ?? "",
      instruction_years: row.years_of_instruction ?? "", confidence: row.proficiency ?? "",
      speaking_experience: row.speaking_experience ?? "", reading_experience: row.reading_experience ?? "",
      writing_experience: row.writing_experience ?? "", subjects: row.subjects ?? [],
      source: row.source ?? "", original_text: row.original_text ?? "", translated_text: row.translated_text ?? "",
      translation_metadata: row.translation_metadata ?? {}, notes: row.writing_experience ?? "",
    })),
    parent_voice: data.parent_voice ?? "", student_voice: data.student_voice ?? "", teacher_voice: data.teacher_voice ?? "",
  });
});

router.put("/cases/:caseId/raepa/v2/academic-history", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const parsed = v2AcademicHistorySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid academic history; no existing history was changed", details: parsed.error.flatten() }); return; }
  const payload = parsed.data;
  let languages: typeof payload.languages = [];
  await db.transaction(async (tx) => {
    const profileId = await ensureProfile(caseId, req.userId, tx);
    const existingRows = await tx.execute(sql`SELECT * FROM raepa_language_academic_history WHERE case_id = ${caseId} ORDER BY created_at`);
    const existingByLanguage = new Map(existingRows.rows.map((row: any) => [String(row.language).trim().toLowerCase(), row]));
    languages = payload.languages.map((item) => {
      const previous: any = existingByLanguage.get(item.language.trim().toLowerCase()) ?? {};
      return {
        ...item,
        age_first_exposed: firstNonBlank(item.age_first_exposed, previous.age_first_exposed),
        years_of_instruction: firstNonBlank(item.years_of_instruction, item.instruction_years, item.years, previous.years_of_instruction),
        proficiency: firstNonBlank(item.proficiency, item.confidence, previous.proficiency),
        formal_schooling_experience: firstNonBlank(item.formal_schooling_experience, item.academic_use, previous.formal_schooling_experience),
        speaking_experience: firstNonBlank(item.speaking_experience, previous.speaking_experience),
        reading_experience: firstNonBlank(item.reading_experience, previous.reading_experience),
        writing_experience: firstNonBlank(item.writing_experience, item.notes, previous.writing_experience),
        subjects: item.subjects?.length ? item.subjects : (previous.subjects ?? []),
        source: firstNonBlank(item.source, item.relationship, previous.source),
        original_text: firstNonBlank(item.original_text, previous.original_text),
        translated_text: firstNonBlank(item.translated_text, previous.translated_text),
        translation_metadata: item.translation_metadata ?? previous.translation_metadata ?? {},
      } as typeof payload.languages[number];
    });
    await tx.execute(sql`DELETE FROM raepa_language_academic_history WHERE case_id = ${caseId}`);
    await tx.execute(sql`DELETE FROM raepa_subject_language_history WHERE case_id = ${caseId}`);
    for (const item of languages) {
      await tx.execute(sql`INSERT INTO raepa_language_academic_history
        (id, case_id, profile_id, parent_id, language, age_first_exposed, proficiency,
         speaking_experience, reading_experience, writing_experience, formal_schooling_experience,
         years_of_instruction, subjects, source, original_text, translated_text, translation_metadata)
        VALUES (${nanoid()}, ${caseId}, ${profileId}, ${req.userId}, ${item.language},
          ${item.age_first_exposed ?? null}, ${item.proficiency ?? null},
          ${item.speaking_experience ?? null}, ${item.reading_experience ?? null}, ${item.writing_experience ?? null},
          ${item.formal_schooling_experience ?? null}, ${item.years_of_instruction ?? null},
          ${JSON.stringify(item.subjects ?? [])}::jsonb, ${item.source ?? item.relationship ?? "home"},
          ${item.original_text ?? null}, ${item.translated_text ?? null},
          ${JSON.stringify(item.translation_metadata ?? {})}::jsonb)`);
    }
    for (const item of payload.subjects) {
      await tx.execute(sql`INSERT INTO raepa_subject_language_history
        (id, case_id, profile_id, subject, language, years, experience, source, notes)
        VALUES (${nanoid()}, ${caseId}, ${profileId}, ${item.subject}, ${item.language},
          ${item.years ?? null}, ${item.experience ?? null}, ${item.source ?? null}, ${item.notes ?? null})`);
    }
    const profileRows = await tx.execute(sql`SELECT data FROM raepa_profiles WHERE id = ${profileId} LIMIT 1`);
    const existingProfileData = (profileRows.rows[0] as any)?.data ?? {};
    const profileData = {
      parent_voice: firstNonBlank(payload.parent_voice, existingProfileData.parent_voice) ?? "",
      student_voice: firstNonBlank(payload.student_voice, existingProfileData.student_voice) ?? "",
      teacher_voice: firstNonBlank(payload.teacher_voice, existingProfileData.teacher_voice) ?? "",
    };
    await tx.execute(sql`UPDATE raepa_profiles SET data = data || ${JSON.stringify(profileData)}::jsonb, updated_at = NOW() WHERE id = ${profileId}`);
    await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
  });
  await writeAudit({ eventType: "raepa.reports.invalidated", caseId, actorId: req.userId, actorRole: req.userRole,
    metadata: { reason: "raepa.v2.academic_history.replaced" } });
  await writeAudit({ eventType: "raepa.v2.academic_history.replaced", caseId, actorId: req.userId, actorRole: req.userRole,
    metadata: { languageCount: payload.languages.length, subjectCount: payload.subjects.length } });
  res.json({ languages: payload.languages, subjects: payload.subjects, parent_voice: payload.parent_voice, student_voice: payload.student_voice, teacher_voice: payload.teacher_voice });
});

router.get("/cases/:caseId/raepa/v2/evidence", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_v2_evidence WHERE case_id = ${caseId} ORDER BY created_at`);
  res.json(rows.rows);
});

router.post("/cases/:caseId/raepa/v2/evidence", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const b = req.body;
  if (!b || !["parent", "teacher", "student"].includes(b.source) || typeof b.summary !== "string" || !b.summary.trim()) {
    res.status(400).json({ error: "source and summary are required" }); return;
  }
  const id = nanoid();
  const row = await db.transaction(async (tx) => {
  await tx.execute(sql`INSERT INTO raepa_v2_evidence
    (id, case_id, source, contributor, context, summary, supports, concerns, created_by)
    VALUES (${id}, ${caseId}, ${b.source}, ${typeof b.contributor === "string" ? b.contributor.slice(0, 300) : null},
      ${typeof b.context === "string" ? b.context.slice(0, 5000) : null}, ${b.summary.trim().slice(0, 20000)},
      ${typeof b.supports === "string" ? b.supports.slice(0, 10000) : null}, ${typeof b.concerns === "string" ? b.concerns.slice(0, 10000) : null}, ${req.userId})`);
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
  return tx.execute(sql`SELECT * FROM raepa_v2_evidence WHERE id = ${id}`);
  });
  await writeAudit({ eventType: "raepa.v2.evidence.created", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { evidenceId: id } });
  res.status(201).json(row.rows[0]);
});

router.put("/cases/:caseId/raepa/v2/work-samples/:sampleId/demand-map", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin review required" }); return; }
  const b = req.body;
  if (!b || !b.layers || typeof b.layers !== "object") { res.status(400).json({ error: "layers are required" }); return; }
  const id = nanoid();
  const mapData = {
    task_demand: typeof b.task_demand === "string" ? b.task_demand : "",
    language_demand: typeof b.language_demand === "string" ? b.language_demand : "",
    concept_demand: typeof b.concept_demand === "string" ? b.concept_demand : "",
    support_and_independence: typeof b.support_and_independence === "string" ? b.support_and_independence : "",
    reviewer_note: typeof b.reviewer_note === "string" ? b.reviewer_note.slice(0, 5000) : "",
  };
  const result = await db.transaction(async (tx) => {
  const sample = await tx.execute(sql`SELECT id FROM raepa_work_samples WHERE id = ${req.params.sampleId} AND case_id = ${caseId} LIMIT 1`);
  if (!sample.rows.length) return null;
  const existing = await tx.execute(sql`SELECT id FROM raepa_work_sample_analyses WHERE work_sample_id = ${req.params.sampleId} LIMIT 1`);
  const analysisId = existing.rows[0]?.id ? String(existing.rows[0].id) : id;
  if (!existing.rows.length) {
    await tx.execute(sql`INSERT INTO raepa_work_sample_analyses
      (id, case_id, work_sample_id, layer_vocabulary, layer_structures, layer_functions, layer_cognitive,
       evidence_sufficiency, review_status, reviewer_id, reviewed_at)
      VALUES (${analysisId}, ${caseId}, ${req.params.sampleId}, ${JSON.stringify(b.layers)}::jsonb,
        ${JSON.stringify({ language: b.layers.language ?? {} })}::jsonb, ${JSON.stringify({ task: b.layers.task ?? {} })}::jsonb,
        ${JSON.stringify({ concept: b.layers.concept ?? {}, support: b.layers.support ?? {} })}::jsonb,
        'moderate', 'reviewed', ${req.userId}, NOW())`);
  } else {
    await tx.execute(sql`UPDATE raepa_work_sample_analyses SET layer_vocabulary = ${JSON.stringify(b.layers)}::jsonb,
      layer_structures = ${JSON.stringify({ language: b.layers.language ?? {} })}::jsonb,
      layer_functions = ${JSON.stringify({ task: b.layers.task ?? {} })}::jsonb,
      layer_cognitive = ${JSON.stringify({ concept: b.layers.concept ?? {}, support: b.layers.support ?? {} })}::jsonb,
      review_status = 'reviewed', reviewer_id = ${req.userId}, reviewed_at = NOW(), edits = edits || ${JSON.stringify([mapData])}::jsonb,
      updated_at = NOW() WHERE id = ${analysisId}`);
  }
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, true, tx);
  return { id: analysisId };
  });
  if (!result) { res.status(404).json({ error: "Work sample not found" }); return; }
  await writeAudit({ eventType: "raepa.v2.work_sample_analysis.reviewed", caseId, actorId: req.userId, actorRole: req.userRole, metadata: { sampleId: req.params.sampleId } });
  res.json({ id: result.id, work_sample_id: req.params.sampleId, ...mapData, layers: b.layers });
});

router.get("/cases/:caseId/raepa/v2/hypotheses", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_hypotheses WHERE case_id = ${caseId} ORDER BY created_at`);
  res.json(rows.rows.map((row: any) => ({
    ...row, evidence_ids: Array.isArray(row.evidence_refs) ? row.evidence_refs : [], reviewer_note: row.reviewer_notes ?? "",
  })));
});

router.post("/cases/:caseId/raepa/v2/hypotheses/:hypothesisId/review", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin approval required" }); return; }
  const decisionMap: Record<string, string> = { approve: "approved", modify: "modified", reject: "rejected" };
  const status = decisionMap[req.body?.decision];
  if (!status) { res.status(400).json({ error: "decision must be approve, modify, or reject" }); return; }
  const rows = await db.transaction(async (tx) => {
  const rows = await tx.execute(sql`UPDATE raepa_hypotheses SET status = ${status}, reviewer_id = ${req.userId},
    reviewer_notes = ${typeof req.body.reviewer_note === "string" ? req.body.reviewer_note.slice(0, 5000) : null},
    reviewed_at = NOW(), updated_at = NOW() WHERE id = ${req.params.hypothesisId} AND case_id = ${caseId} RETURNING *`);
  if (!rows.rows.length) return null;
  const row: any = rows.rows[0];
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
  return row;
  });
  if (!rows) { res.status(404).json({ error: "Hypothesis not found" }); return; }
  res.json({ ...rows, evidence_ids: Array.isArray(rows.evidence_refs) ? rows.evidence_refs : [], reviewer_note: rows.reviewer_notes });
});

function v2PlanShape(row: any): any {
  const data = parseJsonValue(row?.reviewer_notes);
  return {
    id: row?.id, goals: data.goals ?? "", supports: data.supports ?? "",
    success_indicators: data.success_indicators ?? "", recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    status: row?.status ?? "draft", version: row?.version,
  };
}

router.get("/cases/:caseId/raepa/v2/plan", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_assessment_plans WHERE case_id = ${caseId} ORDER BY version DESC LIMIT 1`);
  res.json(rows.rows.length ? v2PlanShape(rows.rows[0]) : null);
});

async function saveV2Plan(caseId: string, body: any, actorId: string | undefined, status = "draft", executor: any = db): Promise<any> {
  const existing = await executor.execute(sql`SELECT id, version FROM raepa_assessment_plans WHERE case_id = ${caseId} ORDER BY version DESC LIMIT 1`);
  const id = existing.rows[0]?.id ? String(existing.rows[0].id) : nanoid();
  const version = Number(existing.rows[0]?.version ?? 0) || 1;
  const planData = {
    goals: typeof body.goals === "string" ? body.goals.slice(0, 10000) : "",
    supports: typeof body.supports === "string" ? body.supports.slice(0, 10000) : "",
    success_indicators: typeof body.success_indicators === "string" ? body.success_indicators.slice(0, 10000) : "",
    recommendations: Array.isArray(body.recommendations) ? body.recommendations.slice(0, 100).map((item: any) => ({
      text: typeof item?.text === "string" ? item.text.slice(0, 5000) : "",
      evidence_ids: Array.isArray(item?.evidence_ids) ? item.evidence_ids.filter((id: unknown): id is string => typeof id === "string") : [],
      rationale: typeof item?.rationale === "string" ? item.rationale.slice(0, 5000) : "",
    })) : [],
  };
  if (existing.rows.length) {
    if (status === "approved") {
      await executor.execute(sql`UPDATE raepa_assessment_plans SET reviewer_notes = ${JSON.stringify(planData)},
        status = 'approved', approved_by = ${actorId}, approved_at = NOW(), updated_at = NOW() WHERE id = ${id}`);
    } else {
      await executor.execute(sql`UPDATE raepa_assessment_plans SET reviewer_notes = ${JSON.stringify(planData)},
        status = 'draft', updated_at = NOW() WHERE id = ${id}`);
    }
  } else {
    if (status === "approved") {
      await executor.execute(sql`INSERT INTO raepa_assessment_plans
        (id, case_id, session_id, reviewer_notes, status, version, created_by, approved_by, approved_at)
        VALUES (${id}, ${caseId}, ${await ensureSession(caseId, executor)}, ${JSON.stringify(planData)}, 'approved', ${version}, ${actorId}, ${actorId}, NOW())`);
    } else {
      await executor.execute(sql`INSERT INTO raepa_assessment_plans
        (id, case_id, session_id, reviewer_notes, status, version, created_by)
        VALUES (${id}, ${caseId}, ${await ensureSession(caseId, executor)}, ${JSON.stringify(planData)}, 'draft', ${version}, ${actorId ?? null})`);
    }
  }
  const row = await executor.execute(sql`SELECT * FROM raepa_assessment_plans WHERE id = ${id}`);
  return v2PlanShape(row.rows[0]);
}

router.put("/cases/:caseId/raepa/v2/plan", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!req.body || typeof req.body !== "object") { res.status(400).json({ error: "plan object is required" }); return; }
  const row = await db.transaction(async (tx) => {
    const saved = await saveV2Plan(caseId, req.body, req.userId, "draft", tx);
    await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
    return saved;
  });
  await writeAudit({ eventType: "raepa.v2.assessment_plan.saved", caseId, actorId: req.userId, actorRole: req.userRole });
  res.json(row);
});

router.post("/cases/:caseId/raepa/v2/plan/approve", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  if (!isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin approval required" }); return; }
  const existing = await db.execute(sql`SELECT reviewer_notes FROM raepa_assessment_plans WHERE case_id = ${caseId} ORDER BY version DESC LIMIT 1`);
  if (!existing.rows.length) { res.status(409).json({ error: "Save the assessment plan before approving it" }); return; }
  const row = await db.transaction(async (tx) => {
    const saved = await saveV2Plan(caseId, req.body && Object.keys(req.body).length ? req.body : parseJsonValue(existing.rows[0].reviewer_notes), req.userId, "approved", tx);
    await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
    return saved;
  });
  await writeAudit({ eventType: "raepa.v2.assessment_plan.approved", caseId, actorId: req.userId, actorRole: req.userRole });
  res.json(row);
});

router.get("/cases/:caseId/raepa/v2/trials", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_dynamic_trials WHERE case_id = ${caseId} ORDER BY created_at`);
  res.json(rows.rows.map((row: any) => ({
    id: row.id, task: row.observations ?? "", phase: row.condition, support_level: row.support_provided ?? (row.support_level === 0 ? "none" : String(row.support_level)),
    performance: row.response?.performance ?? "", concept_understanding: row.response?.concept_understanding ?? "",
    language_access: row.response?.language_access ?? "", evidence_ids: Array.isArray(row.evidence_refs) ? row.evidence_refs : [],
  })));
});

router.post("/cases/:caseId/raepa/v2/trials", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const b = req.body;
  const supportMap: Record<string, number> = { none: 0, independent: 0, "general prompt": 1, clarification: 2, structured: 3, modeling: 4, intensive: 5, "intensive mediation": 5 };
  const phase = ["independent", "mediated", "transfer"].includes(b?.phase) ? b.phase : null;
  if (!phase || typeof b.task !== "string" || !b.task.trim() || typeof b.performance !== "string" || !b.performance.trim()) {
    res.status(400).json({ error: "task, performance, and phase are required" }); return;
  }
  const supportText = typeof b.support_level === "string" ? b.support_level : "none";
  const supportLevel = supportMap[supportText.toLowerCase()] ?? 0;
  const id = nanoid();
  const response = { performance: b.performance.slice(0, 10000), concept_understanding: typeof b.concept_understanding === "string" ? b.concept_understanding.slice(0, 5000) : "", language_access: typeof b.language_access === "string" ? b.language_access.slice(0, 5000) : "" };
  const row = await db.transaction(async (tx) => {
  await tx.execute(sql`INSERT INTO raepa_dynamic_trials
    (id, case_id, condition, support_level, support_provided, response, observations, evidence_refs, created_by)
    VALUES (${id}, ${caseId}, ${phase}, ${supportLevel}, ${supportText.slice(0, 100)}, ${JSON.stringify(response)}::jsonb,
      ${b.task.slice(0, 10000)}, ${JSON.stringify(Array.isArray(b.evidence_ids) ? b.evidence_ids : [])}::jsonb, ${req.userId})`);
  await invalidateRaepaEvidence(caseId, req.userId, req.userRole, false, tx);
  return tx.execute(sql`SELECT * FROM raepa_dynamic_trials WHERE id = ${id}`);
  });
  res.status(201).json({ id, task: b.task, phase, support_level: supportText, ...response, evidence_ids: b.evidence_ids ?? [], created_at: (row.rows[0] as any)?.created_at });
});

router.get("/cases/:caseId/raepa/v2/qa", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const requestedId = typeof req.query.report_id === "string" ? req.query.report_id : "";
  const reportRows = requestedId
    ? await db.execute(sql`SELECT id FROM raepa_reports WHERE id = ${requestedId} AND case_id = ${caseId} LIMIT 1`)
    : await db.execute(sql`SELECT id FROM raepa_reports WHERE case_id = ${caseId} ORDER BY updated_at DESC LIMIT 1`);
  const reportId = String((reportRows.rows[0] as any)?.id ?? "");
  const rows = reportId
    ? await db.execute(sql`SELECT check_key, passed, details FROM raepa_qa_checks WHERE case_id = ${caseId} AND report_id = ${reportId} ORDER BY checked_at DESC`)
    : { rows: [] };
  const checks: Record<string, boolean> = {};
  let note = "";
  for (const row of rows.rows as any[]) {
    if (!(row.check_key in checks)) checks[row.check_key] = Boolean(row.passed);
    if (!note && row.details) note = String(row.details);
  }
  res.json({ checks, note });
});

router.put("/cases/:caseId/raepa/v2/qa", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const requestedId = typeof req.body?.report_id === "string" ? req.body.report_id : "";
  const reportRows = requestedId
    ? await db.execute(sql`SELECT id FROM raepa_reports WHERE id = ${requestedId} AND case_id = ${caseId} LIMIT 1`)
    : await db.execute(sql`SELECT id FROM raepa_reports WHERE case_id = ${caseId} ORDER BY updated_at DESC LIMIT 1`);
  const reportId = String((reportRows.rows[0] as any)?.id ?? "");
  if (!reportId) { res.status(409).json({ error: "Create a report before running canonical QA" }); return; }
  const result = await recomputeCanonicalQa(caseId, reportId, req.userId);
  await writeAudit({ eventType: `raepa.v2.qa.recomputed`, caseId, actorId: req.userId, actorRole: req.userRole, metadata: { reportId, reportVersion: result.reportVersion } });
  res.json(result);
});

function v2ReportShape(row: any): any {
  const generated = row?.generated_narrative ?? {};
  const edited = row?.edited_narrative ?? {};
  return {
    id: row?.id,
    standalone_text: resolveReportNarrative(edited, "standalone") || resolveReportNarrative(generated, "standalone"),
    comprehensive_text: resolveReportNarrative(edited, "comprehensive") || resolveReportNarrative(generated, "comprehensive"),
    status: row?.status ?? "draft", pathway: row?.pathway ?? "standalone", reviewer_note: row?.reviewer_note ?? "",
    source_evidence_refs: Array.isArray(row?.source_evidence_refs) ? row.source_evidence_refs : [],
    findings: reportFindings(row?.report_findings),
    conclusions: reportFindings(row?.report_findings),
    version: Number(row?.version ?? 1),
  };
}

function expectedVersion(req: any): number | null {
  const value = Number(req.body?.expected_version ?? req.body?.version);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

async function respondV2VersionConflict(res: any, caseId: string, message = "Report changed; refresh and retry with the current expected_version"): Promise<void> {
  const current = await db.execute(sql`SELECT * FROM raepa_reports WHERE case_id = ${caseId} ORDER BY updated_at DESC LIMIT 1`);
  res.status(409).json({
    error: message,
    current_version: current.rows.length ? Number((current.rows[0] as any).version ?? 1) : 0,
    report: current.rows.length ? v2ReportShape(current.rows[0]) : null,
  });
}

router.get("/cases/:caseId/raepa/v2/reports", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const rows = await db.execute(sql`SELECT * FROM raepa_reports WHERE case_id = ${caseId} ORDER BY updated_at DESC LIMIT 1`);
  res.json(rows.rows.length ? v2ReportShape(rows.rows[0]) : null);
});

router.post("/cases/:caseId/raepa/v2/reports/generate", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const expected = expectedVersion(req);
  if (expected === null) { res.status(400).json({ error: "expected_version is required and must be a non-negative integer" }); return; }
  const mode = req.body?.mode === "comprehensive" ? "comprehensive" : "standalone";
  const initial = await db.execute(sql`SELECT * FROM raepa_reports WHERE case_id = ${caseId} ORDER BY updated_at DESC LIMIT 1`);
  const initialVersion = initial.rows.length ? Number((initial.rows[0] as any).version ?? 1) : 0;
  if (expected !== initialVersion) { await respondV2VersionConflict(res, caseId); return; }
  const evidenceBundle = await buildCanonicalEvidenceBundle(caseId);
  try {
    const text = await callGroq([
      { role: "system", content: "Write a cautious professional RAEPA report draft using only the supplied evidence. Do not diagnose, infer ability from English proficiency, or make deterministic cross-linguistic claims. Clearly distinguish documented evidence from hypotheses. Return plain text only." },
       { role: "user", content: JSON.stringify({ mode, evidence_bundle: evidenceBundle }) },
    ], 3500);
    const latest = await db.execute(sql`SELECT id, session_id, status, version, generated_narrative, edited_narrative FROM raepa_reports WHERE case_id = ${caseId} ORDER BY updated_at DESC LIMIT 1`);
    const latestVersion = latest.rows.length ? Number((latest.rows[0] as any).version ?? 1) : 0;
    if (latestVersion !== expected) { await respondV2VersionConflict(res, caseId); return; }
    const id = latest.rows[0]?.id ? String(latest.rows[0].id) : nanoid();
    const oldGeneratedValue = (latest.rows[0] as any)?.generated_narrative;
    const oldEditedValue = (latest.rows[0] as any)?.edited_narrative;
    const oldGenerated = oldGeneratedValue && typeof oldGeneratedValue === "object"
      ? oldGeneratedValue
      : { markdown: resolveReportNarrative(oldGeneratedValue, mode) };
    const oldEdited = oldEditedValue && typeof oldEditedValue === "object"
      ? oldEditedValue
      : { markdown: resolveReportNarrative(oldEditedValue, mode) };
    const narrativeKey = mode === "standalone" ? "standalone_text" : "comprehensive_text";
    const generated = { ...oldGenerated, [narrativeKey]: text };
    const edited = { ...oldEdited, [narrativeKey]: text };
    const generatedFindings = deriveNarrativeFindings(text, evidenceBundle);
    if (latest.rows.length) {
      const updated = await db.execute(sql`UPDATE raepa_reports SET generated_narrative = ${JSON.stringify(generated)}::jsonb,
        edited_narrative = ${JSON.stringify(edited)}::jsonb, source_evidence_refs = ${JSON.stringify(evidenceBundle.source_refs)}::jsonb,
        report_findings = ${JSON.stringify(generatedFindings)}::jsonb, status = 'draft',
        professional_approved_by = NULL, professional_approved_at = NULL, approved_by = NULL, approved_at = NULL, qa_status = 'not_run',
        pathway = ${mode}, version = version + 1, updated_at = NOW() WHERE id = ${id} AND case_id = ${caseId} AND version = ${expected} RETURNING *`);
      if (!updated.rows.length) { await respondV2VersionConflict(res, caseId); return; }
    } else {
      const sessionIdForInsert = await ensureSession(caseId);
      const inserted = await db.transaction(async (tx) => {
        // expected_version=0 is create-only. Serialize first creation per case
        // so concurrent generators cannot both observe an empty report set.
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${caseId}, 0))`);
        const current = await tx.execute(sql`SELECT id FROM raepa_reports WHERE case_id = ${caseId} ORDER BY updated_at DESC LIMIT 1`);
        if (current.rows.length) return { rows: [] };
        return tx.execute(sql`INSERT INTO raepa_reports (id, case_id, session_id, report_type, generated_narrative, edited_narrative, status, source_evidence_refs, report_findings, pathway)
          VALUES (${id}, ${caseId}, ${sessionIdForInsert}, 'raepa', ${JSON.stringify(generated)}::jsonb, ${JSON.stringify(edited)}::jsonb, 'draft',
            ${JSON.stringify(evidenceBundle.source_refs)}::jsonb, ${JSON.stringify(generatedFindings)}::jsonb, ${mode})
          RETURNING *`);
      });
      if (!inserted.rows.length) { await respondV2VersionConflict(res, caseId); return; }
    }
    if (latest.rows.length) {
      await writeAudit({ eventType: "raepa.v2.report.regenerated", caseId, actorId: req.userId, actorRole: req.userRole,
        metadata: { reportId: id, priorStatus: (latest.rows[0] as any).status, priorVersion: (latest.rows[0] as any).version, pathway: mode } });
    }
    const row = await db.execute(sql`SELECT * FROM raepa_reports WHERE id = ${id}`);
    res.status(201).json(v2ReportShape(row.rows[0]));
  } catch (err) {
    logger.error({ err, caseId }, "RAEPA v2 report generation failed");
    res.status(503).json({ error: "Report generation unavailable" });
  }
});

router.post("/cases/:caseId/raepa/v2/reports/:reportId/review", authMiddleware, async (req, res): Promise<void> => {
  const caseId = req.params.caseId;
  if (!await requireCaseAccess(req, res, caseId)) return;
  const expected = expectedVersion(req);
  if (expected === null) { res.status(400).json({ error: "expected_version is required and must be a non-negative integer" }); return; }
  const decision = req.body?.decision;
  if (!["save", "approve"].includes(decision) || !["standalone", "comprehensive"].includes(req.body?.mode) || typeof req.body?.text !== "string") {
    res.status(400).json({ error: "mode, text, and decision are required" }); return;
  }
  const rows = await db.execute(sql`SELECT * FROM raepa_reports WHERE case_id = ${caseId} AND (${req.params.reportId} = 'current' OR id = ${req.params.reportId}) ORDER BY updated_at DESC LIMIT 1`);
  if (!rows.rows.length) { res.status(404).json({ error: "Report not found" }); return; }
  const report: any = rows.rows[0];
  if (Number(report.version ?? 1) !== expected) { await respondV2VersionConflict(res, caseId); return; }
  if (decision === "approve" && !isAssessmentLead(req.userRole)) { res.status(403).json({ error: "Assessment Lead or admin approval required" }); return; }
  const edited = report.edited_narrative && typeof report.edited_narrative === "object"
    ? report.edited_narrative
    : typeof report.edited_narrative === "string" ? { markdown: report.edited_narrative } : {};
  const key = req.body.mode === "standalone" ? "standalone_text" : "comprehensive_text";
  const nextText = req.body.text.slice(0, 100000);
  const previousText = resolveReportNarrative(edited, req.body.mode);
  const narrativeChanged = previousText !== nextText;
  const evidenceBundle = await buildCanonicalEvidenceBundle(caseId);
  const hasFindingsPayload = Array.isArray(req.body.findings) || Array.isArray(req.body.conclusions);
  if (narrativeChanged && !hasFindingsPayload) {
    res.status(400).json({ error: "Narrative changes require findings (or conclusions): [{ id, section_key, narrative_text, evidence_refs }]" }); return;
  }
  const submittedFindings = reportFindings(req.body.findings ?? req.body.conclusions);
  const findingsInput = hasFindingsPayload ? submittedFindings : reportFindings(report.report_findings);
  const validated = validateNarrativeFindings(nextText, findingsInput, evidenceBundle);
  if (!validated.valid) {
    res.status(400).json({ error: validated.error ?? "Narrative evidence mappings are invalid", contract: "findings: [{ id, section_key, narrative_text, evidence_refs }]" }); return;
  }
  const findings = validated.findings;
  edited[key] = nextText;
  let savedReport: any;
  if (decision === "approve") {
    try {
      savedReport = await db.transaction(async (tx) => {
        const locked = await tx.execute(sql`SELECT id, version FROM raepa_reports
          WHERE id = ${report.id} AND case_id = ${caseId} LIMIT 1 FOR UPDATE`);
        if (!locked.rows.length) throw new V2ReportVersionConflictError();
        if (Number((locked.rows[0] as any).version ?? 1) !== expected) throw new V2ReportVersionConflictError();
        const approvalEvidenceBundle = req.body.mode === "comprehensive"
          ? await buildCanonicalEvidenceBundle(caseId, tx)
          : evidenceBundle;
        const editedUpdate = await tx.execute(sql`UPDATE raepa_reports SET edited_narrative = ${JSON.stringify(edited)}::jsonb,
          source_evidence_refs = ${JSON.stringify(approvalEvidenceBundle.source_refs)}::jsonb,
          report_findings = ${JSON.stringify(findings)}::jsonb, status = 'draft',
          professional_approved_by = NULL, professional_approved_at = NULL, approved_by = NULL, approved_at = NULL,
          qa_status = 'not_run', pathway = ${req.body.mode}, version = version + 1, updated_at = NOW()
          WHERE id = ${report.id} AND case_id = ${caseId} AND version = ${expected} RETURNING *`);
        if (!editedUpdate.rows.length) throw new V2ReportVersionConflictError();
        const persistedPathway = (editedUpdate.rows[0] as any).pathway === "comprehensive" ? "comprehensive" : "standalone";
        const canonicalQa = await recomputeCanonicalQa(caseId, String(report.id), req.userId, tx, persistedPathway);
        if (!canonicalQa.passed) throw new CanonicalQaBlockedError(canonicalQa.checks);
        const approved = await tx.execute(sql`UPDATE raepa_reports SET status = 'approved',
          professional_approved_by = ${req.userId}, professional_approved_at = NOW(),
          approved_by = ${req.userId}, approved_at = NOW(), updated_at = NOW()
          WHERE id = ${report.id} AND case_id = ${caseId} AND version = ${expected + 1} RETURNING *`);
        if (!approved.rows.length) throw new V2ReportVersionConflictError();
        const approvedPathway = (approved.rows[0] as any).pathway === "comprehensive" ? "comprehensive" : "standalone";
        if (approvedPathway === "comprehensive") {
          await persistApprovedComprehensiveSection(caseId, String(report.id),
            (approved.rows[0] as any).edited_narrative, req.userId, req.userRole, tx);
        } else {
          await removePersistedComprehensiveSection(caseId, tx);
        }
        return approved.rows[0];
      });
    } catch (err) {
      if (err instanceof CanonicalQaBlockedError) {
        res.status(422).json({ error: err.message, code: "qa_blocked", checks: err.checks }); return;
      }
      if (err instanceof V2ReportVersionConflictError) {
        await respondV2VersionConflict(res, caseId); return;
      }
      throw err;
    }
  } else {
    try {
      savedReport = await db.transaction(async (tx) => {
        const locked = await tx.execute(sql`SELECT id, version FROM raepa_reports
          WHERE id = ${report.id} AND case_id = ${caseId} LIMIT 1 FOR UPDATE`);
        if (!locked.rows.length) throw new V2ReportVersionConflictError();
        if (Number((locked.rows[0] as any).version ?? 1) !== expected) throw new V2ReportVersionConflictError();
        const editedUpdate = await tx.execute(sql`UPDATE raepa_reports SET edited_narrative = ${JSON.stringify(edited)}::jsonb,
          source_evidence_refs = ${JSON.stringify(evidenceBundle.source_refs)}::jsonb,
          report_findings = ${JSON.stringify(findings)}::jsonb, status = 'draft',
          professional_approved_by = NULL, professional_approved_at = NULL, approved_by = NULL, approved_at = NULL,
          qa_status = 'not_run', pathway = ${req.body.mode}, version = version + 1, updated_at = NOW()
          WHERE id = ${report.id} AND case_id = ${caseId} AND version = ${expected} RETURNING *`);
        if (!editedUpdate.rows.length) throw new V2ReportVersionConflictError();
        const persistedPathway = (editedUpdate.rows[0] as any).pathway === "comprehensive" ? "comprehensive" : "standalone";
        if (persistedPathway === "standalone") await removePersistedComprehensiveSection(caseId, tx);
        return editedUpdate.rows[0];
      });
    } catch (err) {
      if (err instanceof V2ReportVersionConflictError) {
        await respondV2VersionConflict(res, caseId); return;
      }
      throw err;
    }
  }
  const persistedPathway = savedReport.pathway === "comprehensive" ? "comprehensive" : "standalone";
  if (decision === "approve" && persistedPathway === "comprehensive" && resolveReportNarrative(savedReport.edited_narrative, "comprehensive").trim()) {
    await writeAudit({ eventType: "raepa.comprehensive_section.persisted", caseId, actorId: req.userId, actorRole: req.userRole,
      metadata: { raepaReportId: report.id, section: "Academic English Access & Performance", resetToDraft: true } });
  }
  await writeAudit({ eventType: `raepa.v2.report.${decision === "approve" ? "approved" : "reviewed"}`, caseId, actorId: req.userId, actorRole: req.userRole, metadata: { reportId: report.id, mode: req.body.mode } });
  res.json(v2ReportShape(savedReport));
});

export { MODULES, DOMAINS, LANGUAGE_FUNCTIONS };
export default router;
