import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, casesTable, responsesTable } from "@workspace/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { logger } from "../lib/logger.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdir, rmdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execFileAsync = promisify(execFile);

async function pdfToText(pdfBuffer: Buffer): Promise<string> {
  const dir = join(tmpdir(), `ramri-pdf-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  const pdfPath = join(dir, "input.pdf");
  try {
    await writeFile(pdfPath, pdfBuffer);
    const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"]);
    return stdout.trim();
  } finally {
    try { await unlink(pdfPath).catch(() => {}); } catch {}
    try { await rmdir(dir).catch(() => {}); } catch {}
  }
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
      const docs = await db.execute(sql`SELECT * FROM ramri_work_documents WHERE session_id = ${existing.id} ORDER BY created_at ASC`);
      const samples = await db.execute(sql`SELECT * FROM ramri_work_samples WHERE session_id = ${existing.id} ORDER BY sort_order ASC, created_at ASC`);
      const choiceSets = await db.execute(sql`SELECT cs.*, COALESCE(json_agg(csi ORDER BY csi.display_order) FILTER (WHERE csi.id IS NOT NULL), '[]') AS items FROM ramri_choice_sets cs LEFT JOIN ramri_choice_set_items csi ON csi.choice_set_id = cs.id WHERE cs.session_id = ${existing.id} GROUP BY cs.id ORDER BY cs.display_order ASC`);
      const selections = await db.execute(sql`SELECT * FROM ramri_sample_selections WHERE session_id = ${existing.id} ORDER BY sequence_number ASC`);
      const ratings = await db.execute(sql`SELECT * FROM ramri_domain_ratings WHERE session_id = ${existing.id}`);
      const report = (await db.execute(sql`SELECT * FROM ramri_reports WHERE session_id = ${existing.id} LIMIT 1`)).rows[0] ?? null;
      const uploadsClosed = !!(assignment.metadata as Record<string, unknown> | null)?.ramriUploadsClosed;
      return res.json({ session: existing, docs: docs.rows, samples: samples.rows, choiceSets: choiceSets.rows, selections: selections.rows, ratings: ratings.rows, report, assignmentToken: assignment.uniqueToken, uploadsClosed });
    }

    const sessionId = nanoid();
    await db.execute(sql`
      INSERT INTO ramri_sessions (id, case_id, assignment_id, examiner_id, status, created_at, updated_at)
      VALUES (${sessionId}, ${caseId}, ${assignment.id}, ${req.userId ?? null}, 'upload', NOW(), NOW())
    `);
    const session = (await db.execute(sql`SELECT * FROM ramri_sessions WHERE id = ${sessionId} LIMIT 1`)).rows[0];
    return res.json({ session, docs: [], samples: [], choiceSets: [], selections: [], ratings: [], report: null, assignmentToken: assignment.uniqueToken, uploadsClosed: false });
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

// ── Toggle contributor uploads ────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/toggle-uploads", authMiddleware, async (req, res) => {
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
  try {
    const { docId } = req.params;
    await db.execute(sql`DELETE FROM ramri_work_documents WHERE id = ${docId}`);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete document" });
  }
});

// ── Work Samples ──────────────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/samples", authMiddleware, async (req, res) => {
  try {
    const { caseId, sessionId } = req.params;
    const { documentId, imageUrl, extractedProblem, studentAnswer, visibleWorking, teacherCorrection, teacherComments, domain, skill, reasoningFocus, difficulty, estimatedGrade, answerStatus, languageDemand, suitability, examinerNotes } = req.body;
    const id = nanoid();
    const countRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM ramri_work_samples WHERE session_id = ${sessionId}`);
    const sortOrder = Number((countRes.rows[0] as { cnt: string })?.cnt ?? 0);
    await db.execute(sql`
      INSERT INTO ramri_work_samples (id, document_id, case_id, session_id, image_url, extracted_problem, student_answer, visible_working, teacher_correction, teacher_comments, domain, skill, reasoning_focus, difficulty, estimated_grade, answer_status, language_demand, suitability, approved, examiner_notes, sort_order, created_at, updated_at)
      VALUES (${id}, ${documentId ?? null}, ${caseId}, ${sessionId}, ${imageUrl ?? null}, ${extractedProblem ?? null}, ${studentAnswer ?? null}, ${visibleWorking ?? null}, ${teacherCorrection ?? null}, ${teacherComments ?? null}, ${domain ?? null}, ${skill ?? null}, ${reasoningFocus ? JSON.stringify(reasoningFocus) : null}, ${difficulty ?? null}, ${estimatedGrade ?? null}, ${answerStatus ?? null}, ${languageDemand ?? null}, ${suitability ?? 'suitable'}, false, ${examinerNotes ?? null}, ${sortOrder}, NOW(), NOW())
    `);
    const sample = (await db.execute(sql`SELECT * FROM ramri_work_samples WHERE id = ${id} LIMIT 1`)).rows[0];
    return res.json({ sample });
  } catch (err) {
    logger.error({ err }, "RAMRI sample create failed");
    return res.status(500).json({ error: "Failed to create sample" });
  }
});

router.patch("/cases/:caseId/ramri/sessions/:sessionId/samples/:sampleId", authMiddleware, async (req, res) => {
  try {
    const { sampleId } = req.params;
    const { extractedProblem, studentAnswer, visibleWorking, teacherCorrection, teacherComments, domain, skill, reasoningFocus, difficulty, estimatedGrade, answerStatus, languageDemand, suitability, approved, examinerNotes, imageUrl } = req.body;
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

router.delete("/cases/:caseId/ramri/sessions/:sessionId/samples/:sampleId", authMiddleware, async (req, res) => {
  try {
    const { sampleId } = req.params;
    await db.execute(sql`DELETE FROM ramri_work_samples WHERE id = ${sampleId}`);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete sample" });
  }
});

// ── AI: Classify a sample ─────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/samples/:sampleId/classify", authMiddleware, async (req, res) => {
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
    const docsResult = await db.execute(sql`
      SELECT * FROM ramri_work_documents WHERE session_id = ${sessionId} ORDER BY created_at ASC
    `);
    const docs = docsResult.rows as Array<{
      id: string; file_name: string | null; file_url: string | null; file_type: string | null;
      grade_level: string | null; math_topic: string | null; source_type: string | null;
      teacher_marked: string | null; teacher_comments: string | null; contributor_notes: string | null;
    }>;
    if (docs.length === 0) {
      return res.json({ candidates: [], errors: ["No documents found for this session"] });
    }

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
      const url = doc.file_url.toLowerCase();
      const isPdf =
        doc.file_type === "pdf" ||
        doc.file_type === "application/pdf" ||
        (doc.file_name ?? "").toLowerCase().endsWith(".pdf") ||
        url.endsWith(".pdf");
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

        // For PDFs: extract text with pdftotext; images are not supported without vision
        if (!isPdf) {
          errors.push(`${name}: image files cannot be processed — please upload PDFs`);
          continue;
        }

        const pdfResponse = await fetch(signedUrl);
        if (!pdfResponse.ok) throw new Error(`Failed to download PDF: ${pdfResponse.status}`);
        const pdfBuf = Buffer.from(await pdfResponse.arrayBuffer());
        const pdfText = await pdfToText(pdfBuf);

        if (pdfText.length < 20) {
          errors.push(`${name}: PDF appears to be a scanned image with no selectable text — cannot extract without OCR`);
          continue;
        }

        const textPrompt = `You are reviewing a student's mathematics work extracted from a PDF document.

STUDENT PROFILE (use this to calibrate your interpretation of difficulty, expected performance, and any error patterns):
${studentBlock}${formBlock}

DOCUMENT DETAILS:
${docBlock}

DOCUMENT TEXT (extracted from PDF — layout preserved):
${pdfText.slice(0, 8000)}

Using the student's age, grade, known difficulties, and referral context above, extract ALL individual maths problems/tasks visible in the text above.
For each problem return an object with exactly these keys:
- extractedProblem: the exact problem or task as shown (e.g. "368 + 157 = ___")
- studentAnswer: exactly what the student wrote as their answer (empty string if blank or not shown)
- visibleWorking: "yes", "no", or "partial" — whether method/steps are shown
- answerStatus: "correct", "incorrect", "partially_correct", or "unclear" — judge against the student's expected grade level
- teacherCorrection: what the teacher wrote/marked if visible, or null
- examinerNotes: a brief observation calibrated to this student's profile (e.g. note if a Year 5 student is working on Year 2 content, or highlight an error pattern relevant to the referral concern)

Return ONLY a valid JSON array (no markdown fences, no extra text). If no clear maths problems are visible return [].`;

        const raw = await callDeepSeekText(textPrompt);
        const clean = raw.replace(/```json\n?|\n?```/g, "").trim();
        let extracted: Array<Record<string, string | null>> = [];
        try { extracted = JSON.parse(clean); } catch {
          errors.push(`${name}: AI returned unparseable response`);
          continue;
        }
        for (const item of extracted) {
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
    return res.json({ candidates, errors });
  } catch (err) {
    logger.error({ err }, "RAMRI extract-samples failed");
    return res.status(500).json({ error: "Extraction failed" });
  }
});

// ── Choice Sets ───────────────────────────────────────────────────────────────
router.post("/cases/:caseId/ramri/sessions/:sessionId/choice-sets", authMiddleware, async (req, res) => {
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
  try {
    const { caseId, sessionId } = req.params;
    const samples = (await db.execute(sql`
      SELECT id, extracted_problem, student_answer, visible_working, answer_status,
             domain, skill, difficulty, examiner_notes
      FROM ramri_work_samples
      WHERE session_id = ${sessionId} AND approved = true
      ORDER BY created_at ASC
    `)).rows as Array<Record<string, string | null>>;

    if (samples.length === 0) return res.status(400).json({ error: "No approved samples to group" });

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
      await db.execute(sql`
        INSERT INTO ramri_choice_sets (id, session_id, case_id, title, choice_type, student_prompt, display_order, created_by, created_at)
        VALUES (${id}, ${sessionId}, ${caseId}, ${g.title}, ${g.choiceType ?? "open"}, ${g.studentPrompt ?? null}, ${i}, 'ai', NOW())
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
  try {
    const { sessionId } = req.params;
    const { targetDomain } = req.body as { targetDomain?: string };
    const samples = (await db.execute(sql`SELECT id, extracted_problem, domain, skill, answer_status, suitability, difficulty FROM ramri_work_samples WHERE session_id = ${sessionId} AND approved = true ORDER BY created_at ASC`)).rows;
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
  try {
    const { caseId, sessionId } = req.params;
    const [session, selections, ratings, allResponses] = await Promise.all([
      db.execute(sql`SELECT * FROM ramri_sessions WHERE id = ${sessionId} LIMIT 1`),
      db.execute(sql`SELECT sels.*, ws.extracted_problem, ws.domain, ws.skill, ws.answer_status FROM ramri_sample_selections sels JOIN ramri_work_samples ws ON ws.id = sels.work_sample_id WHERE sels.session_id = ${sessionId} ORDER BY sels.sequence_number ASC`),
      db.execute(sql`SELECT * FROM ramri_domain_ratings WHERE session_id = ${sessionId}`),
      db.execute(sql`SELECT ir.* FROM ramri_interview_responses ir JOIN ramri_sample_selections sels ON sels.id = ir.sample_selection_id WHERE sels.session_id = ${sessionId} ORDER BY ir.sequence_number ASC`),
    ]);
    const s = session.rows[0] as Record<string, unknown>;
    const sels = selections.rows as Record<string, unknown>[];
    const ratingList = ratings.rows as Record<string, unknown>[];
    const respList = allResponses.rows as Record<string, unknown>[];

    const prompt = `You are a clinical educational psychologist writing a professional RAMRI (ReMynd Authentic Mathematical Reasoning Interview) report. Generate structured report sections based on this session data.

Session status: ${s?.status}
Samples discussed: ${sels.length}
Domains covered: ${[...new Set(sels.map(s => s.domain).filter(Boolean))].join(", ")}

Domain ratings:
${ratingList.map(r => `${r.domain}: ${r.rating !== null ? r.rating + "/4" : "NO"} (${r.evidence_strength ?? "unrated"})`).join("\n")}

Sample responses summary:
${respList.filter(r => r.direct_quote).slice(0, 10).map(r => `Q: ${r.approved_question ?? r.generated_question}\nA: "${r.direct_quote}"`).join("\n\n")}

General notes: ${s?.general_notes ?? "None"}

IMPORTANT rules for this report:
- RAMRI is a structured qualitative and criterion-referenced reasoning interview, NOT a standardized assessment
- Do NOT assign standardized scores, percentiles, or age/grade equivalents
- Do NOT make diagnoses
- All AI statements must be labelled as requiring human review
- Distinguish between original work evidence, interview evidence, and transfer evidence
- Use professional but accessible language

Return JSON only (no markdown):
{
  "assessmentContext": "1-2 sentences on basis and method",
  "participationSummary": "paragraph on engagement, confidence, anxiety observations",
  "reasoningProfile": "paragraph synthesizing the domain ratings and evidence",
  "performanceVsReasoning": "paragraph on relationship between written work and demonstrated reasoning",
  "conditionEffect": "paragraph on whether familiar/student-selected material appeared to help",
  "strengths": ["strength1", "strength2", "strength3"],
  "areasForDevelopment": ["area1", "area2"],
  "recommendations": ["rec1", "rec2", "rec3", "rec4"],
  "limitations": ["This is not a standardized assessment.", "The quality of conclusions depends on the authenticity and context of submitted work.", "Previously completed work may have involved unrecorded assistance.", "Transfer evidence is important when interpreting independent understanding."],
  "disclaimer": "RAMRI is a structured qualitative and criterion-referenced reasoning interview. Results must not be represented as standardized scores, age equivalents, grade equivalents, or diagnostic conclusions."
}`;
    const text = await callGroq(prompt, "You are a professional clinical report writer.", 2500);
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

export default router;
