import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, responsesTable, scoresTable, casesTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { calculateRrcaScores } from "../lib/rrca.js";
import type { RrcaAnswers } from "../lib/rrca.js";
import { generateRrcaPassage } from "../lib/ai.js";
import { logger } from "../lib/logger.js";
import { nanoid } from "nanoid";

const router = Router();

router.get("/cases/:caseId/assignments/:assignmentId/rrca", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.toolId !== "RRCA") return res.status(400).json({ error: "Assignment is not an RRCA session" });

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
    const draft = (snapRow?.metadata as Record<string, unknown> | null)?.rrcaDraft ?? null;

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
    logger.error({ err }, "GET /rrca failed");
    return res.status(500).json({ error: "Failed to load RRCA session" });
  }
});

router.put("/cases/:caseId/assignments/:assignmentId/rrca/draft", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;
    const answers: RrcaAnswers = req.body;

    const [assignment] = await db
      .select({ id: assignmentsTable.id, toolId: assignmentsTable.toolId })
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment || assignment.toolId !== "RRCA") {
      return res.status(404).json({ error: "RRCA assignment not found" });
    }

    const draftJson = JSON.stringify(answers);
    await db.execute(
      sql`UPDATE assignments SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rrcaDraft', ${draftJson}::jsonb) WHERE id = ${assignmentId}`
    );

    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "PUT /rrca/draft failed");
    return res.status(500).json({ error: "Failed to save draft" });
  }
});

router.post("/cases/:caseId/assignments/:assignmentId/rrca/generate-passage", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;
    const { age, grade, language, difficulty, topic } = req.body as {
      age: number;
      grade: string;
      language: string;
      difficulty: string;
      topic: string;
    };

    const [assignment] = await db
      .select({ id: assignmentsTable.id, toolId: assignmentsTable.toolId })
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment || assignment.toolId !== "RRCA") {
      return res.status(404).json({ error: "RRCA assignment not found" });
    }

    const result = await generateRrcaPassage({ age, grade, language, difficulty, topic });
    return res.json(result);
  } catch (err) {
    logger.error({ err }, "POST /rrca/generate-passage failed");
    return res.status(500).json({ error: "Failed to generate passage" });
  }
});

router.post("/cases/:caseId/assignments/:assignmentId/rrca/submit", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;
    const answers: RrcaAnswers = req.body;

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment || assignment.toolId !== "RRCA") {
      return res.status(404).json({ error: "RRCA assignment not found" });
    }

    const scores = calculateRrcaScores(answers);

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
        eq(scoresTable.toolId, "RRCA"),
        eq(scoresTable.respondentType, assignment.respondentType ?? "invigilator"),
      ))
      .limit(1);

    const scoreNotes = JSON.stringify({
      riskLevel: scores.riskLevel,
      percentage: scores.percentage,
      rawScore: scores.rawScore,
      maxScore: scores.maxScore,
      literalScore: scores.literalScore,
      inferentialScore: scores.inferentialScore,
      vocabularyScore: scores.vocabularyScore,
      interpretationText: scores.interpretationText,
      mode: answers.mode,
      passageTopic: answers.passageTopic,
      passageDifficulty: answers.passageDifficulty,
      passageLanguage: answers.passageLanguage,
      passageWordCount: answers.passageWordCount,
      generalNotes: answers.generalNotes,
    });

    if (existingScore) {
      await db
        .update(scoresTable)
        .set({
          rawScore: scores.rawScore,
          domainScores: {
            comprehension: scores.rawScore,
            literal: scores.literalScore,
            inferential: scores.inferentialScore,
            vocabulary: scores.vocabularyScore,
          } as Record<string, number>,
          normalizedScores: { comprehension: scores.percentage } as Record<string, number>,
          isManual: true,
          notes: scoreNotes,
        })
        .where(eq(scoresTable.id, existingScore.id));
    } else {
      await db.insert(scoresTable).values({
        id: nanoid(),
        caseId,
        toolId: "RRCA",
        toolName: "ReMynd Reading Comprehension Assessment (RRCA)",
        respondentType: assignment.respondentType ?? "invigilator",
        rawScore: scores.rawScore,
        domainScores: {
          comprehension: scores.rawScore,
          literal: scores.literalScore,
          inferential: scores.inferentialScore,
          vocabulary: scores.vocabularyScore,
        } as Record<string, number>,
        normalizedScores: { comprehension: scores.percentage } as Record<string, number>,
        isManual: true,
        notes: scoreNotes,
      });
    }

    await db.execute(
      sql`UPDATE assignments SET status = 'completed', submitted_at = NOW(), metadata = (COALESCE(metadata, '{}'::jsonb) - 'rrcaDraft') WHERE id = ${assignmentId}`
    );

    return res.json({ ok: true, scores });
  } catch (err) {
    logger.error({ err }, "POST /rrca/submit failed");
    return res.status(500).json({ error: "Failed to submit RRCA" });
  }
});

export default router;
