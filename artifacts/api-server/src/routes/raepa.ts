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
import { ai } from "@workspace/integrations-gemini-ai";

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
      db.execute(sql`SELECT student_name, date_of_birth FROM cases WHERE id = ${caseId} LIMIT 1`),
      db.execute(sql`SELECT language_background FROM raepa_sessions WHERE case_id = ${caseId} LIMIT 1`),
      db.execute(sql`SELECT subject, grade_level, task_type, ai_analysis FROM raepa_work_samples WHERE case_id = ${caseId} AND ai_analysis IS NOT NULL ORDER BY created_at DESC LIMIT 6`),
    ]);

    const caseRow = caseRows.rows[0] as any;
    const sessionRow = sessionRows.rows[0] as any;
    const samples = sampleRows.rows as any[];

    // Calculate student age
    let ageStr = "school-age";
    if (caseRow?.date_of_birth) {
      const dob = new Date(caseRow.date_of_birth);
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

Generate ONLY the actual content the examiner can immediately read aloud or present to the student. Do NOT include any preamble, instructions to the examiner, or meta-commentary. Format clearly and concisely for direct use in a clinical session.`;

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

Generate the ready-to-use content (passage, question, instructions, vocabulary list, or scenario as appropriate). Where vocabulary lists or suggested questions are available above, use them directly. Calibrate difficulty to the student's age and background. Keep it suitable for a 2–4 minute assessment activity.`;

    const content = await callGroq([
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ], 700);

    res.json({ content });
  } catch (err) {
    logger.error({ err }, "raepa generate-elicitation");
    res.status(500).json({ error: "Generation failed" });
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

export { MODULES, DOMAINS, LANGUAGE_FUNCTIONS };
export default router;
