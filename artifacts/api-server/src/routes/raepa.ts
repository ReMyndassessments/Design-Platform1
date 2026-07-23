import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { casesTable, assignmentsTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { logger } from "../lib/logger.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { canUserAccessCase } from "../lib/permissions.js";
import multer from "multer";
import { ai, generateImage } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
const storage = new ObjectStorageService();

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
  "Academic Independence","Response to Scaffolding",
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
    const existing = await db.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    const body = req.body;
    if (existing.rows.length === 0) {
      const id = nanoid();
      await db.execute(sql`
        INSERT INTO raepa_sessions (id, case_id, examiner_id, status, pathway, language_background,
          modules_selected, general_notes, created_at, updated_at)
        VALUES (
          ${id}, ${caseId}, ${user.id}, ${body.status ?? "setup"}, ${body.pathway ?? "standalone"},
          ${JSON.stringify(body.language_background ?? {})}::jsonb,
          ${JSON.stringify(body.modules_selected ?? [])}::jsonb,
          ${body.general_notes ?? null}, NOW(), NOW()
        )
      `);
      const row = await db.execute(sql`SELECT * FROM raepa_sessions WHERE id = ${id}`);
      return res.json(row.rows[0]);
    } else {
      const sid = existing.rows[0].id as string;
      const updates: string[] = [];
      if (body.status !== undefined) updates.push(`status = '${body.status}'`);
      if (body.pathway !== undefined) updates.push(`pathway = '${body.pathway}'`);
      if (body.language_background !== undefined) updates.push(`language_background = '${JSON.stringify(body.language_background)}'::jsonb`);
      if (body.modules_selected !== undefined) updates.push(`modules_selected = '${JSON.stringify(body.modules_selected)}'::jsonb`);
      if (body.general_notes !== undefined) updates.push(`general_notes = '${(body.general_notes as string).replace(/'/g,"''")}'`);
      if (body.overall_summary !== undefined) updates.push(`overall_summary = '${(body.overall_summary as string).replace(/'/g,"''")}'`);
      if (body.interpretive_profiles !== undefined) updates.push(`interpretive_profiles = '${JSON.stringify(body.interpretive_profiles)}'::jsonb`);
      if (body.confidence_level !== undefined) updates.push(`confidence_level = '${body.confidence_level}'`);
      if (updates.length > 0) {
        await db.execute(sql.raw(`UPDATE raepa_sessions SET ${updates.join(", ")}, updated_at = NOW() WHERE id = '${sid}'`));
      }
      const row = await db.execute(sql`SELECT * FROM raepa_sessions WHERE id = ${sid}`);
      return res.json(row.rows[0]);
    }
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
    const body = req.body;
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
    await db.execute(sql`
      INSERT INTO raepa_work_samples (id, case_id, file_name, file_url, file_type,
        title, subject, task_type, date_completed, teacher, grade_level,
        independent_completion, support_provided, assignment_instructions,
        student_score, teacher_comments, student_selected,
        ai_analysis_status, assessor_approved, created_at, updated_at)
      VALUES (
        ${id}, ${caseId}, ${file_name}, ${file_url}, ${file_type},
        ${body.title ?? null}, ${body.subject ?? null}, ${body.task_type ?? null},
        ${body.date_completed ?? null}, ${body.teacher ?? null}, ${body.grade_level ?? null},
        ${body.independent_completion === "true" || body.independent_completion === true},
        ${body.support_provided ?? null}, ${body.assignment_instructions ?? null},
        ${body.student_score ?? null}, ${body.teacher_comments ?? null},
        ${body.student_selected === "true" || body.student_selected === true},
        'pending', false, NOW(), NOW()
      )
    `);
    const row = await db.execute(sql`SELECT * FROM raepa_work_samples WHERE id = ${id}`);
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
    const fields: string[] = [];
    const safe = (v: string) => v.replace(/'/g, "''");
    if (b.title !== undefined) fields.push(`title = '${safe(b.title)}'`);
    if (b.subject !== undefined) fields.push(`subject = '${safe(b.subject)}'`);
    if (b.grade_level !== undefined) fields.push(`grade_level = '${safe(b.grade_level)}'`);
    if (b.teacher !== undefined) fields.push(`teacher = '${safe(b.teacher)}'`);
    if (b.independent_completion !== undefined) fields.push(`independent_completion = ${b.independent_completion}`);
    if (b.support_provided !== undefined) fields.push(`support_provided = '${safe(b.support_provided)}'`);
    if (b.student_selected !== undefined) fields.push(`student_selected = ${b.student_selected}`);
    if (b.assessor_approved !== undefined) fields.push(`assessor_approved = ${b.assessor_approved}`);
    if (b.teacher_comments !== undefined) fields.push(`teacher_comments = '${safe(b.teacher_comments)}'`);
    if (fields.length === 0) return res.json({ ok: true });
    await db.execute(sql.raw(`UPDATE raepa_work_samples SET ${fields.join(", ")}, updated_at = NOW() WHERE id = '${sampleId}' AND case_id = '${caseId}'`));
    const row = await db.execute(sql`SELECT * FROM raepa_work_samples WHERE id = ${sampleId}`);
    res.json(row.rows[0]);
  } catch (err) { logger.error({ err }, "raepa patch work sample"); res.status(500).json({ error: "Server error" }); }
});

// ── DELETE work sample ────────────────────────────────────────────────────────
router.delete("/cases/:caseId/raepa/work-samples/:sampleId", authMiddleware, async (req, res) => {
  const { caseId, sampleId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    await db.execute(sql`DELETE FROM raepa_work_samples WHERE id = ${sampleId} AND case_id = ${caseId}`);
    res.json({ ok: true });
  } catch (err) { logger.error({ err }, "raepa delete work sample"); res.status(500).json({ error: "Server error" }); }
});

// ── POST work sample AI analysis ───────────────────────────────────────────────
router.post("/cases/:caseId/raepa/work-samples/:sampleId/analyze", authMiddleware, async (req, res) => {
  const { caseId, sampleId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const rows = await db.execute(sql`SELECT * FROM raepa_work_samples WHERE id = ${sampleId} AND case_id = ${caseId}`);
    if (rows.rows.length === 0) return res.status(404).json({ error: "Not found" });
    const sample = rows.rows[0] as any;
    if (!sample.file_url) return res.status(400).json({ error: "No file uploaded" });

    await db.execute(sql.raw(`UPDATE raepa_work_samples SET ai_analysis_status = 'processing', updated_at = NOW() WHERE id = '${sampleId}'`));

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

        await db.execute(sql.raw(
          `UPDATE raepa_work_samples SET ai_analysis = '${JSON.stringify(analysisResult).replace(/'/g, "''")}', ai_analysis_status = 'complete', updated_at = NOW() WHERE id = '${sampleId}'`
        ));
        logger.info({ sampleId }, "RAEPA work sample AI analysis complete");
      } catch (err) {
        logger.error({ err, sampleId }, "RAEPA AI analysis failed");
        await db.execute(sql.raw(`UPDATE raepa_work_samples SET ai_analysis_status = 'error', updated_at = NOW() WHERE id = '${sampleId}'`));
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
    const session = await db.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (session.rows.length === 0) return res.status(400).json({ error: "No session found" });
    const sid = session.rows[0].id as string;
    const ratings: Array<{ domain: string; score: number; confidence?: string; evidence?: string; support_level_required?: string }> = req.body.ratings ?? [];
    for (const r of ratings) {
      const existing = await db.execute(sql`SELECT id FROM raepa_domain_ratings WHERE session_id = ${sid} AND domain = ${r.domain} LIMIT 1`);
      const safe = (v?: string) => (v ?? "").replace(/'/g, "''");
      if (existing.rows.length === 0) {
        await db.execute(sql.raw(
          `INSERT INTO raepa_domain_ratings (id, session_id, domain, score, confidence, evidence, support_level_required, created_at, updated_at)
           VALUES ('${nanoid()}', '${sid}', '${safe(r.domain)}', ${r.score ?? 0}, '${safe(r.confidence)}', '${safe(r.evidence)}', '${safe(r.support_level_required)}', NOW(), NOW())`
        ));
      } else {
        const rid = existing.rows[0].id as string;
        await db.execute(sql.raw(
          `UPDATE raepa_domain_ratings SET score = ${r.score ?? 0}, confidence = '${safe(r.confidence)}', evidence = '${safe(r.evidence)}', support_level_required = '${safe(r.support_level_required)}', updated_at = NOW() WHERE id = '${rid}'`
        ));
      }
    }
    const updated = await db.execute(sql`SELECT * FROM raepa_domain_ratings WHERE session_id = ${sid}`);
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
    const session = await db.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (session.rows.length === 0) return res.status(400).json({ error: "No session found" });
    const sid = session.rows[0].id as string;
    const functions: Array<{ function_name: string; level: string; evidence?: string; subject_context?: string }> = req.body.functions ?? [];
    for (const f of functions) {
      const existing = await db.execute(sql`SELECT id FROM raepa_language_functions WHERE session_id = ${sid} AND function_name = ${f.function_name} LIMIT 1`);
      const safe = (v?: string) => (v ?? "").replace(/'/g, "''");
      if (existing.rows.length === 0) {
        await db.execute(sql.raw(
          `INSERT INTO raepa_language_functions (id, session_id, function_name, level, evidence, subject_context, created_at, updated_at)
           VALUES ('${nanoid()}', '${sid}', '${safe(f.function_name)}', '${safe(f.level)}', '${safe(f.evidence)}', '${safe(f.subject_context)}', NOW(), NOW())`
        ));
      } else {
        const fid = existing.rows[0].id as string;
        await db.execute(sql.raw(
          `UPDATE raepa_language_functions SET level = '${safe(f.level)}', evidence = '${safe(f.evidence)}', subject_context = '${safe(f.subject_context)}', updated_at = NOW() WHERE id = '${fid}'`
        ));
      }
    }
    const updated = await db.execute(sql`SELECT * FROM raepa_language_functions WHERE session_id = ${sid}`);
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
    const session = await db.execute(sql`SELECT id FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (session.rows.length === 0) return res.status(400).json({ error: "No session found" });
    const sid = session.rows[0].id as string;
    const b = req.body;
    const safe = (v?: string) => (v ?? "").replace(/'/g, "''");
    const existing = await db.execute(sql`SELECT id FROM raepa_module_scores WHERE session_id = ${sid} AND module_id = ${b.module_id} LIMIT 1`);
    if (existing.rows.length === 0) {
      const id = nanoid();
      await db.execute(sql.raw(
        `INSERT INTO raepa_module_scores (id, session_id, case_id, module_id, administered, score, support_level, observations, task_notes, created_at, updated_at)
         VALUES ('${id}', '${sid}', '${caseId}', '${safe(b.module_id)}', ${b.administered ?? false}, ${b.score ?? 0}, '${safe(b.support_level)}', '${safe(b.observations)}', '${safe(JSON.stringify(b.task_notes ?? {}))}', NOW(), NOW())`
      ));
      const row = await db.execute(sql`SELECT * FROM raepa_module_scores WHERE id = ${id}`);
      return res.json(row.rows[0]);
    } else {
      const mid = existing.rows[0].id as string;
      await db.execute(sql.raw(
        `UPDATE raepa_module_scores SET administered = ${b.administered ?? false}, score = ${b.score ?? 0}, support_level = '${safe(b.support_level)}', observations = '${safe(b.observations)}', task_notes = '${safe(JSON.stringify(b.task_notes ?? {}))}', updated_at = NOW() WHERE id = '${mid}'`
      ));
      const row = await db.execute(sql`SELECT * FROM raepa_module_scores WHERE id = ${mid}`);
      return res.json(row.rows[0]);
    }
  } catch (err) { logger.error({ err }, "raepa post module score"); res.status(500).json({ error: "Server error" }); }
});

// ── GET / generate teacher upload token ────────────────────────────────────────
router.get("/cases/:caseId/raepa/teacher-token", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id!, user.role!)) return res.status(403).json({ error: "Forbidden" });
    const existing = await db.execute(sql`SELECT id, teacher_upload_token FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (existing.rows.length === 0) return res.status(404).json({ error: "Session not found. Save setup first." });
    let token = existing.rows[0].teacher_upload_token as string | null;
    if (!token) {
      token = nanoid(32);
      await db.execute(sql`UPDATE raepa_sessions SET teacher_upload_token = ${token} WHERE case_id = ${caseId}`);
    }
    res.json({ token });
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

    const systemPrompt = `You are an expert EAL/D (English as an Additional Language or Dialect) assessment specialist creating ready-to-use elicitation content for the ReMynd Academic English Performance Assessment (RAEPA).

Return ONLY a valid JSON object. No preamble, no commentary, no markdown code fences.

Structure when NO visuals needed (passages, word lists, spoken questions):
{"text":"<examiner content>","imagePrompts":null}

Structure when visuals ARE needed (pictures/objects the student looks at):
{"text":"Look at Picture 1 and Picture 2 below.\n\nHow are these two animals similar? How are they different?","imagePrompts":[{"label":"Picture 1","description":"a domestic cat sitting on a mat, simple cartoon illustration"},{"label":"Picture 2","description":"a domestic dog sitting, simple cartoon illustration"}]}

CRITICAL RULES:
1. When images are required, put rich descriptions in "imagePrompts[].description" — NOT inline in "text".
2. In "text", only refer to images by label ("Picture 1", "Picture 2") — never write "(Picture 1: a cat)" or similar.
3. imagePrompts descriptions must be detailed enough to generate a clear image (species, colour, setting, style).
4. Return ONLY the raw JSON object — no wrapping text before or after.`;

    const userMessage = `Student profile:
- Age: ${ageStr}
- First language (L1): ${l1}
- Years in English-medium schooling: ${yearsInEnglish}
- Approximate grade: ${gradeHint}

Work samples on file:
${sampleContext}
${vocabContext ? `\nExtracted from work sample AI analysis:\n${vocabContext}` : ""}
RAEPA domain being assessed: ${domain}

The examiner prompt says: "${promptText}"

Generate the ready-to-use content. Calibrate difficulty to the student's age and background. Keep it suitable for a 2–4 minute activity. Return ONLY the JSON object.`;

    const rawContent = await callGroq([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], 900);

    // Parse structured response
    logger.info({ rawContent }, "raepa generate-elicitation raw AI response");
    let textContent = rawContent;
    let imagePrompts: Array<{ label: string; description: string }> | null = null;
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.text) textContent = parsed.text;
        if (Array.isArray(parsed.imagePrompts) && parsed.imagePrompts.length > 0) {
          imagePrompts = parsed.imagePrompts;
        }
      }
    } catch (parseErr) {
      logger.warn({ parseErr, rawContent }, "raepa JSON parse failed — using raw text");
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

    res.json({ content: textContent, images });
  } catch (err) {
    logger.error({ err }, "raepa generate-elicitation");
    res.status(500).json({ error: "Generation failed" });
  }
});

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
WORK SAMPLE ANALYSIS (from AI analysis of uploaded student work)
═══════════════════════════════════════════
${workSampleBlock}

Across all work samples:
- Academic (Tier 2) vocabulary identified: ${allAcademicVocab.length > 0 ? allAcademicVocab.slice(0, 20).join(", ") : "None extracted"}
- Subject-specific vocabulary identified: ${allSubjectVocab.length > 0 ? allSubjectVocab.slice(0, 20).join(", ") : "None extracted"}
- Command words present in tasks: ${allCommandWords.length > 0 ? allCommandWords.join(", ") : "None extracted"}
- Language functions required by tasks: ${allFnsRequired.length > 0 ? allFnsRequired.join(", ") : "None extracted"}
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

    res.json({ report });
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
    const row = await db.execute(sql`SELECT id FROM raepa_sessions WHERE teacher_upload_token = ${token} LIMIT 1`);
    if (row.rows.length === 0) return res.status(404).json({ error: "Invalid or expired link" });
    res.json({ ok: true });
  } catch (err) { logger.error({ err }, "raepa public teacher validate"); res.status(500).json({ error: "Server error" }); }
});

// ── Public: teacher uploads a work sample ──────────────────────────────────────
router.post("/public/raepa/teacher/:token/upload", upload.single("file"), async (req, res) => {
  const { token } = req.params;
  try {
    const row = await db.execute(sql`SELECT id, case_id FROM raepa_sessions WHERE teacher_upload_token = ${token} LIMIT 1`);
    if (row.rows.length === 0) return res.status(404).json({ error: "Invalid or expired link" });
    const caseId = row.rows[0].case_id as string;
    const body = req.body;
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
    await db.execute(sql`
      INSERT INTO raepa_work_samples (
        id, case_id, file_name, file_url, file_type, title, subject, grade_level,
        teacher, task_type, date_completed, independent_completion, support_provided,
        teacher_comments, student_selected, ai_analysis_status, created_at, updated_at
      ) VALUES (
        ${id}, ${caseId}, ${fileName}, ${fileUrl}, ${fileType},
        ${body.title ?? null}, ${body.subject ?? null}, ${body.grade_level ?? null},
        ${body.teacher ?? null}, ${body.task_type ?? null},
        ${body.date_completed ? body.date_completed : null},
        ${body.independent_completion === "true" || body.independent_completion === true},
        ${body.support_provided ?? null}, ${body.teacher_comments ?? null},
        ${body.student_selected === "true"},
        'pending', NOW(), NOW()
      )
    `);
    res.json({ ok: true });
  } catch (err) { logger.error({ err }, "raepa public teacher upload"); res.status(500).json({ error: "Server error" }); }
});

// ── Examiner: push stimulus to student view ────────────────────────────────
router.post("/cases/:caseId/raepa/push-stimulus", authMiddleware, async (req, res) => {
  const { caseId } = req.params;
  const user = { id: req.userId, role: req.userRole };
  try {
    if (!await verifyCaseAccess(caseId, user.id, user.role)) return res.status(403).json({ error: "Forbidden" });
    const { text, images } = req.body as { text: string; images?: { label: string; dataUrl: string }[] };
    await db.execute(sql`UPDATE raepa_sessions SET current_stimulus = ${JSON.stringify({ text, images })}::jsonb WHERE case_id = ${caseId}`);
    res.json({ ok: true });
  } catch (err) { logger.error({ err }, "raepa push-stimulus"); res.status(500).json({ error: "Server error" }); }
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
    const row = await db.execute(sql`SELECT current_stimulus FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`);
    if (row.rows.length === 0) return res.status(404).json({ error: "Session not found" });
    const stimulus = (row.rows[0] as any).current_stimulus ?? null;
    res.json({ stimulus });
  } catch (err) { logger.error({ err }, "raepa student poll"); res.status(500).json({ error: "Server error" }); }
});

export { MODULES, DOMAINS, LANGUAGE_FUNCTIONS };
export default router;
