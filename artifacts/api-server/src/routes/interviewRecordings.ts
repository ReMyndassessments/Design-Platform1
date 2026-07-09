import { Router } from "express";
import { db } from "@workspace/db";
import { interviewRecordingsTable, casesTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
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

// ── GET /cases/:caseId/interview-recordings/:id/audio ────────────────────────
// Streams the audio file back for in-browser playback (authenticated)
router.get("/cases/:caseId/interview-recordings/:id/audio", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const [rec] = await db
    .select({ storagePath: interviewRecordingsTable.storagePath, mimeType: interviewRecordingsTable.mimeType })
    .from(interviewRecordingsTable)
    .where(and(
      eq(interviewRecordingsTable.id, req.params.id),
      eq(interviewRecordingsTable.caseId, req.params.caseId),
    ));

  if (!rec) { res.status(404).json({ error: "not_found" }); return; }

  try {
    const objectFile = await objectStorageService.getObjectEntityFile(rec.storagePath);
    const [metadata] = await objectFile.getMetadata();
    const contentType = (metadata as any).contentType ?? rec.mimeType ?? "audio/webm";
    const size = (metadata as any).size;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    if (size) res.setHeader("Content-Length", String(size));
    res.setHeader("Cache-Control", "private, max-age=3600");

    const stream = objectFile.createReadStream();
    stream.on("error", () => res.end());
    stream.pipe(res);
  } catch (err) {
    console.error("Audio stream failed", err);
    res.status(502).json({ error: "stream_failed" });
  }
});

// ── DELETE /cases/:caseId/interview-recordings/:id ────────────────────────────
router.delete("/cases/:caseId/interview-recordings/:id", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  // Scope by BOTH id AND caseId to prevent cross-case mutations
  const deleted = await db
    .delete(interviewRecordingsTable)
    .where(and(
      eq(interviewRecordingsTable.id, req.params.id),
      eq(interviewRecordingsTable.caseId, req.params.caseId),
    ))
    .returning({ id: interviewRecordingsTable.id });

  if (!deleted.length) {
    res.status(404).json({ error: "not_found" }); return;
  }

  res.json({ success: true });
});

// ── PATCH /cases/:caseId/interview-recordings/:id/notes ──────────────────────
// Save edited structured notes back after clinician edits.
// Also writes a text summary into cases.parentInterviewNotes for AI injection.
router.patch("/cases/:caseId/interview-recordings/:id/notes", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const { structuredNotes } = req.body;
  if (!structuredNotes) {
    res.status(400).json({ error: "missing structuredNotes" }); return;
  }

  // Verify the recording belongs to this case (prevents cross-case write)
  const [rec] = await db
    .select({ id: interviewRecordingsTable.id })
    .from(interviewRecordingsTable)
    .where(and(
      eq(interviewRecordingsTable.id, req.params.id),
      eq(interviewRecordingsTable.caseId, req.params.caseId),
    ));

  if (!rec) {
    res.status(404).json({ error: "not_found" }); return;
  }

  await db
    .update(interviewRecordingsTable)
    .set({ structuredNotes })
    .where(and(
      eq(interviewRecordingsTable.id, req.params.id),
      eq(interviewRecordingsTable.caseId, req.params.caseId),
    ));

  // Also persist a human-readable summary into cases.parentInterviewNotes
  // so the AI intake analysis can pick up these notes automatically.
  // We prepend this recording's notes rather than overwriting, so notes accumulate.
  if (structuredNotes.sections && Array.isArray(structuredNotes.sections)) {
    try {
      const [caseRow] = await db
        .select({ parentInterviewNotes: (casesTable as any).parentInterviewNotes })
        .from(casesTable)
        .where(eq(casesTable.id, req.params.caseId));

      const typeLine = `[${structuredNotes.conversationType ?? "recording"} — ${new Date().toLocaleDateString()}]`;
      const sectionText = (structuredNotes.sections as Array<{ label: string; content: string }>)
        .filter(s => s.content?.trim())
        .map(s => `${s.label}:\n${s.content.trim()}`)
        .join("\n\n");
      const newBlock = `${typeLine}\n${sectionText}`;

      const existing = (caseRow as any)?.parentInterviewNotes ?? "";
      const merged = existing ? `${newBlock}\n\n---\n\n${existing}` : newBlock;

      await db
        .update(casesTable)
        .set({ parentInterviewNotes: merged } as any)
        .where(eq(casesTable.id, req.params.caseId));
    } catch (err) {
      // Non-fatal: structured notes are saved; only the case field update failed
      console.error("Failed to sync notes to case.parentInterviewNotes", err);
    }
  }

  res.json({ success: true });
});

export default router;
