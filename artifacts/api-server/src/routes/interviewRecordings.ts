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

/** True when the role may access debrief-type recordings. */
function canAccessDebrief(role: string): boolean {
  return DEBRIEF_ROLES.includes(role);
}

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

  if (conversationType === "report_debrief" && !canAccessDebrief(role)) {
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
    createdAt: new Date(),
  });

  res.json({ id, transcript, structuredNotes: structured });
});

// ── GET /cases/:caseId/interview-recordings ───────────────────────────────────
// Returns recordings visible to the caller.
// Apprentices receive only non-debrief recordings; debrief-eligible roles see all.
router.get("/cases/:caseId/interview-recordings", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const allRecordings = await db
    .select()
    .from(interviewRecordingsTable)
    .where(eq(interviewRecordingsTable.caseId, req.params.caseId))
    .orderBy(desc(interviewRecordingsTable.createdAt));

  // Filter out debrief recordings for roles that cannot access them
  const recordings = canAccessDebrief(role)
    ? allRecordings
    : allRecordings.filter(r => r.conversationType !== "report_debrief");

  res.json(recordings);
});

// ── GET /cases/:caseId/interview-recordings/:id/audio-url ────────────────────
// Returns a short-lived signed URL (1 hour) so the browser can play audio
// directly without embedding the Bearer token in the audio src.
router.get("/cases/:caseId/interview-recordings/:id/audio-url", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
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

  // Debrief recordings require elevated role
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

  // Fetch the recording first to check its type before deleting
  const [rec] = await db
    .select({ id: interviewRecordingsTable.id, conversationType: interviewRecordingsTable.conversationType })
    .from(interviewRecordingsTable)
    .where(and(
      eq(interviewRecordingsTable.id, req.params.id),
      eq(interviewRecordingsTable.caseId, req.params.caseId),
    ));

  if (!rec) { res.status(404).json({ error: "not_found" }); return; }

  // Debrief recordings require elevated role to delete
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
// Save edited structured notes. Also writes a plain-text summary into the
// appropriate case field:
//   - Interview types  → cases.parent_interview_notes  (injected into AI intake)
//   - report_debrief  → cases.debrief_notes            (kept separate)
router.patch("/cases/:caseId/interview-recordings/:id/notes", authMiddleware, async (req, res) => {
  const role = req.userRole ?? "";
  if (!ALLOWED_ROLES.includes(role)) {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const { structuredNotes } = req.body;
  if (!structuredNotes) {
    res.status(400).json({ error: "missing structuredNotes" }); return;
  }

  // Verify the recording belongs to this case and check its type
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

  // Debrief recordings require elevated role to patch
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

  // Persist a human-readable summary into the correct case field.
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
