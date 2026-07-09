import { Router } from "express";
import { db } from "@workspace/db";
import { interviewRecordingsTable, casesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { transcribeAudio } from "../lib/groqTranscription.js";
import { structureInterviewNotes, type ConversationType } from "../lib/interviewStructuring.js";
import { randomUUID } from "crypto";

const router = Router();
const objectStorageService = new ObjectStorageService();

const ALLOWED_ROLES = ["admin", "school_clinical_coordinator", "psychometrician", "clinical_apprentice"];
const DEBRIEF_ROLES = ["admin", "school_clinical_coordinator", "psychometrician"];

const VALID_TYPES: ConversationType[] = [
  "parent_intake",
  "teacher_consultation",
  "student_interview",
  "classroom_observation",
  "report_debrief",
];

// ── POST /cases/:caseId/interview-recordings ──────────────────────────────────
// Accepts raw audio body (Content-Type: audio/*), transcribes + structures it.
router.post("/cases/:caseId/interview-recordings", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const { caseId } = req.params;
  const conversationType = (req.query.type as ConversationType) ?? "parent_intake";
  const durationSeconds = req.query.duration ? parseInt(req.query.duration as string, 10) : undefined;

  if (!VALID_TYPES.includes(conversationType)) {
    res.status(400).json({ error: "invalid_type", message: `conversation type must be one of: ${VALID_TYPES.join(", ")}` }); return;
  }

  if (conversationType === "report_debrief" && !DEBRIEF_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden", message: "Only admin/coordinator/psychometrician can record debriefs" }); return;
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
  if (audioBuffer.length === 0) {
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

  // Structure
  let structured;
  try {
    structured = await structureInterviewNotes({
      conversationType,
      transcript,
      studentName: caseRow.studentName,
    });
  } catch (err) {
    console.error("Structuring failed", err);
    structured = null;
  }

  // Persist
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

  const recordings = await db
    .select()
    .from(interviewRecordingsTable)
    .where(eq(interviewRecordingsTable.caseId, req.params.caseId))
    .orderBy(desc(interviewRecordingsTable.createdAt));

  res.json(recordings);
});

// ── DELETE /cases/:caseId/interview-recordings/:id ────────────────────────────
router.delete("/cases/:caseId/interview-recordings/:id", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  await db
    .delete(interviewRecordingsTable)
    .where(eq(interviewRecordingsTable.id, req.params.id));

  res.json({ success: true });
});

// ── PATCH /cases/:caseId/interview-recordings/:id/notes ──────────────────────
// Save edited structured notes back after clinician edits
router.patch("/cases/:caseId/interview-recordings/:id/notes", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const { structuredNotes } = req.body;
  if (!structuredNotes) {
    res.status(400).json({ error: "missing structuredNotes" }); return;
  }

  await db
    .update(interviewRecordingsTable)
    .set({ structuredNotes })
    .where(eq(interviewRecordingsTable.id, req.params.id));

  res.json({ success: true });
});

export default router;
