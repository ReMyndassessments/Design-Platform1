import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, responsesTable, scoresTable, casesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { calculateRdaScores, RDA_ITEMS } from "../lib/rda.js";
import type { RdaAnswers } from "../lib/rda.js";
import { logger } from "../lib/logger.js";
import { nanoid } from "nanoid";

const router = Router();

router.get("/cases/:caseId/assignments/:assignmentId/rda", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.toolId !== "RDA") return res.status(400).json({ error: "Assignment is not an RDA session" });

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
    const draft = (snapRow?.metadata as Record<string, unknown> | null)?.rdaDraft ?? null;

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
      items: RDA_ITEMS,
      draft: draft ?? null,
      existingAnswers: existingResponse ? (existingResponse.answers as unknown) : null,
      summary: existingResponse?.summary ?? null,
    });
  } catch (err) {
    logger.error({ err }, "GET /rda failed");
    return res.status(500).json({ error: "Failed to load RDA session" });
  }
});

router.put("/cases/:caseId/assignments/:assignmentId/rda/draft", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;
    const answers: RdaAnswers = req.body;

    const [assignment] = await db
      .select({ id: assignmentsTable.id, toolId: assignmentsTable.toolId })
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment || assignment.toolId !== "RDA") {
      return res.status(404).json({ error: "RDA assignment not found" });
    }

    const draftJson = JSON.stringify(answers);
    await db.execute(
      sql`UPDATE assignments SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rdaDraft', ${draftJson}::jsonb) WHERE id = ${assignmentId}`
    );

    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "PUT /rda/draft failed");
    return res.status(500).json({ error: "Failed to save draft" });
  }
});

router.post("/cases/:caseId/assignments/:assignmentId/rda/submit", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;
    const answers: RdaAnswers = req.body;

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment || assignment.toolId !== "RDA") {
      return res.status(404).json({ error: "RDA assignment not found" });
    }

    const scores = calculateRdaScores(answers);

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
        eq(scoresTable.toolId, "RDA"),
        eq(scoresTable.respondentType, assignment.respondentType ?? "invigilator"),
      ))
      .limit(1);

    const scoreNotes = JSON.stringify({
      riskLevel: scores.riskLevel,
      percentage: scores.percentage,
      rawScore: scores.rawScore,
      maxScore: scores.maxScore,
      correctCount: scores.correctCount,
      partialCount: scores.partialCount,
      incorrectCount: scores.incorrectCount,
      interpretationText: scores.interpretationText,
      mode: answers.mode,
      generalNotes: answers.generalNotes,
    });

    if (existingScore) {
      await db
        .update(scoresTable)
        .set({
          rawScore: scores.rawScore,
          domainScores: { decoding: scores.rawScore } as Record<string, number>,
          normalizedScores: { decoding: scores.percentage } as Record<string, number>,
          isManual: true,
          notes: scoreNotes,
        })
        .where(eq(scoresTable.id, existingScore.id));
    } else {
      await db.insert(scoresTable).values({
        id: nanoid(),
        caseId,
        toolId: "RDA",
        toolName: "ReMynd Decoding Assessment (RDA)",
        respondentType: assignment.respondentType ?? "invigilator",
        rawScore: scores.rawScore,
        domainScores: { decoding: scores.rawScore } as Record<string, number>,
        normalizedScores: { decoding: scores.percentage } as Record<string, number>,
        isManual: true,
        notes: scoreNotes,
      });
    }

    await db.execute(
      sql`UPDATE assignments SET status = 'completed', submitted_at = NOW(), metadata = (COALESCE(metadata, '{}'::jsonb) - 'rdaDraft') WHERE id = ${assignmentId}`
    );

    return res.json({ ok: true, scores });
  } catch (err) {
    logger.error({ err }, "POST /rda/submit failed");
    return res.status(500).json({ error: "Failed to submit RDA" });
  }
});

export default router;
