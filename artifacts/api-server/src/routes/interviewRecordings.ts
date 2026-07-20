import { Router } from "express";
import { db } from "@workspace/db";
import { interviewRecordingsTable, casesTable, assignmentsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { transcribeAudio } from "../lib/groqTranscription.js";
import { structureInterviewNotes, type ConversationType } from "../lib/interviewStructuring.js";
import { randomUUID } from "crypto";

const router = Router();
const objectStorageService = new ObjectStorageService();

const ALLOWED_ROLES = ["admin", "school_clinical_coordinator", "psychometrician", "clinical_apprentice", "assessment_invigilator"];
const DEBRIEF_ROLES = ["admin", "school_clinical_coordinator", "psychometrician"];

const VALID_TYPES: ConversationType[] = [
  "parent_intake",
  "teacher_consultation",
  "tutor_consultation",
  "student_interview",
  "classroom_observation",
  "report_debrief",
];

const INVIGILATOR_TYPES: ConversationType[] = [
  "parent_intake",
  "teacher_consultation",
  "tutor_consultation",
  "student_interview",
  "classroom_observation",
];

/** True when the role may access debrief-type recordings. */
function canAccessDebrief(role: string): boolean {
  return DEBRIEF_ROLES.includes(role);
}

/** Resolve the email for the currently authenticated user. */
async function getUserEmail(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return user?.email ?? null;
}

/**
 * Returns true when the invigilator (identified by userId) is assigned to caseId.
 * Looks up the user's email then checks the assignments table.
 */
async function isInvigilatorAssignedToCase(userId: string, caseId: string): Promise<boolean> {
  const email = await getUserEmail(userId);
  if (!email) return false;
  const rows = await db
    .select({ id: assignmentsTable.id })
    .from(assignmentsTable)
    .where(and(
      eq(assignmentsTable.caseId, caseId),
      eq(assignmentsTable.respondentType, "invigilator"),
      eq(assignmentsTable.assignedToEmail, email),
    ))
    .limit(1);
  return rows.length > 0;
}

/** Return all active cases assigned to a given invigilator email (any phase). */
async function getInvigilatorActiveCases(email: string) {
  return db
    .selectDistinct({
      id: casesTable.id,
      studentName: casesTable.studentName,
      assessmentMeetingDate: casesTable.assessmentMeetingDate,
    })
    .from(casesTable)
    .innerJoin(assignmentsTable, eq(assignmentsTable.caseId, casesTable.id))
    .where(and(
      eq(casesTable.caseStatus, "active"),
      eq(assignmentsTable.respondentType, "invigilator"),
      eq(assignmentsTable.assignedToEmail, email),
    ))
    .orderBy(casesTable.studentName);
}

// ── GET /invigilator/active-cases ─────────────────────────────────────────────
// Returns only the cases assigned to the currently logged-in invigilator.
router.get("/invigilator/active-cases", authMiddleware, async (req, res) => {
  if (req.userRole !== "assessment_invigilator" && req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const email = await getUserEmail(req.userId!);
  if (!email) { res.status(403).json({ error: "forbidden" }); return; }

  const cases = await getInvigilatorActiveCases(email);
  res.json(cases);
});

// ── GET /invigilator/all-recordings ───────────────────────────────────────────
// Returns all invigilator-appropriate recordings across every active case
// assigned to the logged-in invigilator, each annotated with studentName.
router.get("/invigilator/all-recordings", authMiddleware, async (req, res) => {
  if (req.userRole !== "assessment_invigilator" && req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const email = await getUserEmail(req.userId!);
  if (!email) { res.status(403).json({ error: "forbidden" }); return; }

  const activeCases = await getInvigilatorActiveCases(email);
  if (activeCases.length === 0) { res.json([]); return; }

  const caseIds = activeCases.map(c => c.id);
  const caseNameMap = Object.fromEntries(activeCases.map(c => [c.id, c.studentName]));

  const recordings = await db
    .select()
    .from(interviewRecordingsTable)
    .where(and(
      inArray(interviewRecordingsTable.caseId, caseIds),
    ))
    .orderBy(desc(interviewRecordingsTable.createdAt));

  const filtered = recordings.filter(r => INVIGILATOR_TYPES.includes(r.conversationType as ConversationType));

  const annotated = filtered.map(r => ({
    ...r,
    studentName: caseNameMap[r.caseId] ?? null,
  }));

  res.json(annotated);
});

// ── POST /cases/:caseId/interview-recordings ──────────────────────────────────
router.post("/cases/:caseId/interview-recordings", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const { caseId } = req.params;
  const conversationType = (req.query.type as ConversationType) ?? "parent_intake";
  const durationSeconds = req.query.duration ? parseInt(req.query.duration as string, 10) : undefined;
  const interviewDateRaw = req.query.interview_date as string | undefined;
  const interviewDate = interviewDateRaw ? new Date(interviewDateRaw) : undefined;

  if (!VALID_TYPES.includes(conversationType)) {
    res.status(400).json({ error: "invalid_type", message: `conversation type must be one of: ${VALID_TYPES.join(", ")}` }); return;
  }

  if (conversationType === "report_debrief" && !canAccessDebrief(role)) {
    res.status(403).json({ error: "forbidden", message: "Only admin/coordinator/psychometrician can record debriefs" }); return;
  }

  // Invigilators may only record student interviews and classroom observations
  if (role === "assessment_invigilator" && !INVIGILATOR_TYPES.includes(conversationType)) {
    res.status(403).json({ error: "forbidden", message: "Invigilators may only record student interviews and classroom observations" }); return;
  }

  // Invigilators may only record on cases they are assigned to
  if (role === "assessment_invigilator") {
    const assigned = await isInvigilatorAssignedToCase(req.userId!, caseId);
    if (!assigned) { res.status(403).json({ error: "forbidden", message: "Not assigned to this case" }); return; }
  }

  const [caseRow] = await db.select({ id: casesTable.id, studentName: casesTable.studentName })
    .from(casesTable).where(eq(casesTable.id, caseId));
  if (!caseRow) { res.status(404).json({ error: "case_not_found" }); return; }

  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  await new Promise<void>((resolve, reject) => {
    req.on("end", resolve);
    req.on("error", reject);
  });

  const audioBuffer = Buffer.concat(chunks);
  if (audioBuffer.length < 100) {
    res.status(400).json({ error: "empty_audio", message: "No audio data received" }); return;
  }

  const mimeType = (req.headers["content-type"] || "audio/webm").split(";")[0].trim();

  // Upload to object storage
  let storagePath: string;
  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    storagePath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    const putRes = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: audioBuffer,
    });
    if (!putRes.ok) throw new Error(`Storage PUT failed: ${putRes.status}`);
  } catch (err) {
    console.error("Audio upload failed", err);
    res.status(500).json({ error: "upload_failed", message: "Could not save audio" }); return;
  }

  // Transcribe
  let transcript: string;
  try {
    transcript = await transcribeAudio(audioBuffer, mimeType);
  } catch (err) {
    console.error("Transcription failed", err);
    res.status(502).json({ error: "transcription_failed", message: String(err) }); return;
  }

  if (!transcript.trim()) {
    res.status(422).json({ error: "empty_transcript", message: "No speech detected in recording" }); return;
  }

  // Structure — gracefully fall back to null; frontend handles the null case
  let structured;
  try {
    structured = await structureInterviewNotes({
      conversationType,
      transcript,
      studentName: caseRow.studentName,
    });
  } catch (err) {
    console.error("Structuring failed — raw transcript will be used", err);
    structured = null;
  }

  // Persist recording
  const id = randomUUID();
  await db.insert(interviewRecordingsTable).values({
    id,
    caseId,
    storagePath,
    durationSeconds: isNaN(durationSeconds!) ? undefined : durationSeconds,
    conversationType,
    mimeType,
    transcript,
    structuredNotes: structured ?? undefined,
    createdBy: req.userId,
    interviewDate: interviewDate && !isNaN(interviewDate.getTime()) ? interviewDate : undefined,
    createdAt: new Date(),
  });

  res.json({ id, transcript, structuredNotes: structured });
});

// ── GET /cases/:caseId/interview-recordings ───────────────────────────────────
router.get("/cases/:caseId/interview-recordings", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  if (role === "assessment_invigilator") {
    const assigned = await isInvigilatorAssignedToCase(req.userId!, req.params.caseId);
    if (!assigned) { res.status(403).json({ error: "forbidden", message: "Not assigned to this case" }); return; }
  }

  const allRecordings = await db
    .select()
    .from(interviewRecordingsTable)
    .where(eq(interviewRecordingsTable.caseId, req.params.caseId))
    .orderBy(desc(interviewRecordingsTable.createdAt));

  let recordings = allRecordings;

  if (!canAccessDebrief(role)) {
    recordings = recordings.filter(r => r.conversationType !== "report_debrief");
  }

  if (role === "assessment_invigilator") {
    recordings = recordings.filter(r => INVIGILATOR_TYPES.includes(r.conversationType as ConversationType));
  }

  res.json(recordings);
});

// ── GET /cases/:caseId/interview-recordings/:id/audio-url ────────────────────
router.get("/cases/:caseId/interview-recordings/:id/audio-url", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  if (role === "assessment_invigilator") {
    const assigned = await isInvigilatorAssignedToCase(req.userId!, req.params.caseId);
    if (!assigned) { res.status(403).json({ error: "forbidden", message: "Not assigned to this case" }); return; }
  }

  const [rec] = await db
    .select({
      storagePath: interviewRecordingsTable.storagePath,
      mimeType: interviewRecordingsTable.mimeType,
      conversationType: interviewRecordingsTable.conversationType,
    })
    .from(interviewRecordingsTable)
    .where(and(
      eq(interviewRecordingsTable.id, req.params.id),
      eq(interviewRecordingsTable.caseId, req.params.caseId),
    ));

  if (!rec) { res.status(404).json({ error: "not_found" }); return; }

  if (rec.conversationType === "report_debrief" && !canAccessDebrief(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  try {
    const signedUrl = await objectStorageService.getObjectEntitySignedDownloadURL(rec.storagePath, 3600);
    res.json({ url: signedUrl, mimeType: rec.mimeType });
  } catch (err) {
    console.error("Audio signed URL failed", err);
    res.status(502).json({ error: "signed_url_failed" });
  }
});

// ── DELETE /cases/:caseId/interview-recordings/:id ────────────────────────────
router.delete("/cases/:caseId/interview-recordings/:id", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  if (role === "assessment_invigilator") {
    const assigned = await isInvigilatorAssignedToCase(req.userId!, req.params.caseId);
    if (!assigned) { res.status(403).json({ error: "forbidden", message: "Not assigned to this case" }); return; }
  }

  const [rec] = await db
    .select({ id: interviewRecordingsTable.id, conversationType: interviewRecordingsTable.conversationType })
    .from(interviewRecordingsTable)
    .where(and(
      eq(interviewRecordingsTable.id, req.params.id),
      eq(interviewRecordingsTable.caseId, req.params.caseId),
    ));

  if (!rec) { res.status(404).json({ error: "not_found" }); return; }

  if (rec.conversationType === "report_debrief" && !canAccessDebrief(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  await db
    .delete(interviewRecordingsTable)
    .where(and(
      eq(interviewRecordingsTable.id, req.params.id),
      eq(interviewRecordingsTable.caseId, req.params.caseId),
    ));

  res.json({ success: true });
});

// ── PATCH /cases/:caseId/interview-recordings/:id/notes ──────────────────────
router.patch("/cases/:caseId/interview-recordings/:id/notes", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  if (role === "assessment_invigilator") {
    const assigned = await isInvigilatorAssignedToCase(req.userId!, req.params.caseId);
    if (!assigned) { res.status(403).json({ error: "forbidden", message: "Not assigned to this case" }); return; }
  }

  const { structuredNotes } = req.body;
  if (!structuredNotes) {
    res.status(400).json({ error: "missing structuredNotes" }); return;
  }

  const [rec] = await db
    .select({ id: interviewRecordingsTable.id, conversationType: interviewRecordingsTable.conversationType })
    .from(interviewRecordingsTable)
    .where(and(
      eq(interviewRecordingsTable.id, req.params.id),
      eq(interviewRecordingsTable.caseId, req.params.caseId),
    ));

  if (!rec) {
    res.status(404).json({ error: "not_found" }); return;
  }

  if (rec.conversationType === "report_debrief" && !canAccessDebrief(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  await db
    .update(interviewRecordingsTable)
    .set({ structuredNotes })
    .where(and(
      eq(interviewRecordingsTable.id, req.params.id),
      eq(interviewRecordingsTable.caseId, req.params.caseId),
    ));

  if (structuredNotes.sections && Array.isArray(structuredNotes.sections)) {
    try {
      const isDebriefType = rec.conversationType === "report_debrief";

      const [caseRow] = await db
        .select({
          parentInterviewNotes: casesTable.parentInterviewNotes,
          debriefNotes: casesTable.debriefNotes,
        })
        .from(casesTable)
        .where(eq(casesTable.id, req.params.caseId));

      const typeLine = `[${structuredNotes.conversationType ?? rec.conversationType} — ${new Date().toLocaleDateString()}]`;
      const sectionText = (structuredNotes.sections as Array<{ label: string; content: string }>)
        .filter(s => s.content?.trim())
        .map(s => `${s.label}:\n${s.content.trim()}`)
        .join("\n\n");
      const newBlock = `${typeLine}\n${sectionText}`;

      if (isDebriefType) {
        const existing = caseRow?.debriefNotes ?? "";
        const merged = existing ? `${newBlock}\n\n---\n\n${existing}` : newBlock;
        await db
          .update(casesTable)
          .set({ debriefNotes: merged })
          .where(eq(casesTable.id, req.params.caseId));
      } else {
        const existing = caseRow?.parentInterviewNotes ?? "";
        const merged = existing ? `${newBlock}\n\n---\n\n${existing}` : newBlock;
        await db
          .update(casesTable)
          .set({ parentInterviewNotes: merged } as any)
          .where(eq(casesTable.id, req.params.caseId));
      }
    } catch (err) {
      console.error("Failed to sync notes to case field", err);
    }
  }

  res.json({ success: true });
});

export default router;
