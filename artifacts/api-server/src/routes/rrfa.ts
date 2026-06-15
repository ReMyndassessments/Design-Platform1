import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, responsesTable, scoresTable, casesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { calculateRrfaScores } from "../lib/rrfa.js";
import type { RrfaAnswers } from "../lib/rrfa.js";
import { logger } from "../lib/logger.js";
import { nanoid } from "nanoid";

const router = Router();

router.get("/cases/:caseId/assignments/:assignmentId/rrfa", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.toolId !== "RRFA") return res.status(400).json({ error: "Assignment is not an RRFA session" });

    const [caseRow] = await db
      .select({ studentName: casesTable.studentName, dob: casesTable.dob, id: casesTable.id })
      .from(casesTable)
      .where(eq(casesTable.id, caseId))
      .limit(1);

    const [existingResponse] = await db
      .select()
      .from(responsesTable)
      .where(eq(responsesTable.assignmentId, assignmentId))
      .limit(1);

    const snapResult = await db.execute(sql`SELECT metadata FROM assignments WHERE id = ${assignmentId}`);
    const snapRow = snapResult.rows?.[0] as { metadata?: Record<string, unknown> } | undefined;
    const draft = (snapRow?.metadata as Record<string, unknown> | null)?.rrfaDraft ?? null;

    return res.json({
      assignment: {
        id: assignment.id,
        status: assignment.status,
        toolId: assignment.toolId,
        toolName: assignment.toolName,
        submittedAt: assignment.submittedAt,
        createdAt: assignment.createdAt,
      },
      case: caseRow ?? null,
      draft: draft ?? null,
      existingAnswers: existingResponse ? (existingResponse.answers as unknown) : null,
      summary: existingResponse?.summary ?? null,
    });
  } catch (err) {
    logger.error({ err }, "GET /rrfa failed");
    return res.status(500).json({ error: "Failed to load RRFA session" });
  }
});

router.put("/cases/:caseId/assignments/:assignmentId/rrfa/draft", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;
    const answers: RrfaAnswers = req.body;

    const [assignment] = await db
      .select({ id: assignmentsTable.id, toolId: assignmentsTable.toolId })
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment || assignment.toolId !== "RRFA") {
      return res.status(404).json({ error: "RRFA assignment not found" });
    }

    const draftJson = JSON.stringify(answers);
    await db.execute(
      sql`UPDATE assignments SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rrfaDraft', ${draftJson}::jsonb) WHERE id = ${assignmentId}`
    );

    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "PUT /rrfa/draft failed");
    return res.status(500).json({ error: "Failed to save draft" });
  }
});

router.post("/cases/:caseId/assignments/:assignmentId/rrfa/submit", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;
    const answers: RrfaAnswers = req.body;

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment || assignment.toolId !== "RRFA") {
      return res.status(404).json({ error: "RRFA assignment not found" });
    }

    const scores = calculateRrfaScores(answers);

    const [existingResponse] = await db
      .select({ id: responsesTable.id })
      .from(responsesTable)
      .where(eq(responsesTable.assignmentId, assignmentId))
      .limit(1);

    if (existingResponse) {
      await db
        .update(responsesTable)
        .set({ answers: answers as unknown as Record<string, unknown>, submittedAt: new Date() })
        .where(eq(responsesTable.id, existingResponse.id));
    } else {
      await db.insert(responsesTable).values({
        id: nanoid(),
        assignmentId,
        answers: answers as unknown as Record<string, unknown>,
        language: "english",
        submittedAt: new Date(),
      });
    }

    const [existingScore] = await db
      .select({ id: scoresTable.id })
      .from(scoresTable)
      .where(and(
        eq(scoresTable.caseId, caseId),
        eq(scoresTable.toolId, "RRFA"),
        eq(scoresTable.respondentType, assignment.respondentType ?? "invigilator"),
      ))
      .limit(1);

    const scoreNotes = JSON.stringify({
      riskLevel: scores.riskLevel,
      wordsPerMinute: scores.wordsPerMinute,
      accuracyPercentage: scores.accuracyPercentage,
      fluencyRating: scores.fluencyRating,
      interpretationText: scores.interpretationText,
      mode: answers.mode,
      passageType: answers.passageType,
      wordsRead: answers.wordsRead,
      errors: answers.errors,
      selfCorrections: answers.selfCorrections,
      hesitations: answers.hesitations,
      readingTimeSeconds: answers.readingTimeSeconds,
      generalNotes: answers.generalNotes,
    });

    const wpmScore = scores.wordsPerMinute ?? 0;

    if (existingScore) {
      await db
        .update(scoresTable)
        .set({
          rawScore: wpmScore,
          domainScores: { fluency: wpmScore } as Record<string, number>,
          normalizedScores: { fluency: scores.accuracyPercentage ?? 0 } as Record<string, number>,
          isManual: true,
          notes: scoreNotes,
        })
        .where(eq(scoresTable.id, existingScore.id));
    } else {
      await db.insert(scoresTable).values({
        id: nanoid(),
        caseId,
        toolId: "RRFA",
        toolName: "ReMynd Reading Fluency Assessment (RRFA)",
        respondentType: assignment.respondentType ?? "invigilator",
        rawScore: wpmScore,
        domainScores: { fluency: wpmScore } as Record<string, number>,
        normalizedScores: { fluency: scores.accuracyPercentage ?? 0 } as Record<string, number>,
        isManual: true,
        notes: scoreNotes,
      });
    }

    await db.execute(
      sql`UPDATE assignments SET status = 'completed', submitted_at = NOW(), metadata = (COALESCE(metadata, '{}'::jsonb) - 'rrfaDraft') WHERE id = ${assignmentId}`
    );

    return res.json({ ok: true, scores });
  } catch (err) {
    logger.error({ err }, "POST /rrfa/submit failed");
    return res.status(500).json({ error: "Failed to submit RRFA" });
  }
});

export default router;
