import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, responsesTable, scoresTable, casesTable, assessmentToolsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { calculateRppiScores, RPPI_FORM_ITEMS } from "../lib/rppi.js";
import type { RppiAnswers } from "../lib/rppi.js";
import { logger } from "../lib/logger.js";
import { nanoid } from "nanoid";

const router = Router();

// GET /api/cases/:caseId/assignments/:assignmentId/rppi
// Load assignment + case info + any existing draft/response
router.get("/cases/:caseId/assignments/:assignmentId/rppi", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.toolId !== "RPPI") return res.status(400).json({ error: "Assignment is not an RPPI session" });

    const [caseRow] = await db
      .select({ studentName: casesTable.studentName, dateOfBirth: casesTable.dateOfBirth, id: casesTable.id })
      .from(casesTable)
      .where(eq(casesTable.id, caseId))
      .limit(1);

    const [existingResponse] = await db
      .select()
      .from(responsesTable)
      .where(eq(responsesTable.assignmentId, assignmentId))
      .limit(1);

    // Load form_items_snapshot via raw SQL (column added by migration)
    const snapResult = await db.execute(sql`SELECT form_items_snapshot, metadata FROM assignments WHERE id = ${assignmentId}`);
    const snapRow = snapResult.rows?.[0] as { form_items_snapshot?: string; metadata?: Record<string, unknown> } | undefined;
    const snapshotJson = snapRow?.form_items_snapshot ?? null;
    const formItems = snapshotJson ? JSON.parse(snapshotJson) : RPPI_FORM_ITEMS;
    const draft = (snapRow?.metadata as Record<string, unknown> | null)?.rppiDraft ?? null;

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
      formItems,
      draft: draft ?? null,
      existingAnswers: existingResponse ? (existingResponse.answers as unknown) : null,
    });
  } catch (err) {
    logger.error({ err }, "GET /rppi failed");
    return res.status(500).json({ error: "Failed to load RPPI session" });
  }
});

// PUT /api/cases/:caseId/assignments/:assignmentId/rppi/draft
// Autosave draft into assignment metadata via raw SQL
router.put("/cases/:caseId/assignments/:assignmentId/rppi/draft", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;
    const answers: RppiAnswers = req.body;

    const [assignment] = await db
      .select({ id: assignmentsTable.id, toolId: assignmentsTable.toolId })
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment || assignment.toolId !== "RPPI") {
      return res.status(404).json({ error: "RPPI assignment not found" });
    }

    const draftJson = JSON.stringify(answers);
    await db.execute(
      sql`UPDATE assignments SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('rppiDraft', ${draftJson}::jsonb) WHERE id = ${assignmentId}`
    );

    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "PUT /rppi/draft failed");
    return res.status(500).json({ error: "Failed to save draft" });
  }
});

// POST /api/cases/:caseId/assignments/:assignmentId/rppi/submit
// Submit RPPI: save response + calculate + save scores + mark completed
router.post("/cases/:caseId/assignments/:assignmentId/rppi/submit", authMiddleware, async (req, res) => {
  try {
    const { caseId, assignmentId } = req.params;
    const answers: RppiAnswers = req.body;

    const [assignment] = await db
      .select()
      .from(assignmentsTable)
      .where(and(eq(assignmentsTable.id, assignmentId), eq(assignmentsTable.caseId, caseId)))
      .limit(1);

    if (!assignment || assignment.toolId !== "RPPI") {
      return res.status(404).json({ error: "RPPI assignment not found" });
    }

    // Load form items from snapshot
    const snapResult = await db.execute(sql`SELECT form_items_snapshot FROM assignments WHERE id = ${assignmentId}`);
    const snapRow = snapResult.rows?.[0] as { form_items_snapshot?: string } | undefined;
    const snapshotJson = snapRow?.form_items_snapshot ?? null;
    const formItems = snapshotJson ? JSON.parse(snapshotJson) : RPPI_FORM_ITEMS;
    const scores = calculateRppiScores(answers, formItems);

    // Upsert response record (answers only — responses table has id, assignmentId, answers, language, submittedAt)
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

    // Upsert scores record
    const [existingScore] = await db
      .select({ id: scoresTable.id })
      .from(scoresTable)
      .where(and(
        eq(scoresTable.caseId, caseId),
        eq(scoresTable.toolId, "RPPI"),
        eq(scoresTable.respondentType, assignment.respondentType ?? "invigilator"),
      ))
      .limit(1);

    const scoreNotes = JSON.stringify({
      overallRisk: scores.overallRisk,
      paRisk: scores.paRisk,
      nonwordRisk: scores.nonwordRisk,
      rapidRisk: scores.rapidRisk,
      interpretationText: scores.interpretationText,
      mode: answers.mode,
      generalNotes: answers.generalNotes,
      rapidNaming: answers.rapidNaming,
    });

    if (existingScore) {
      await db
        .update(scoresTable)
        .set({
          rawScore: scores.rawScore,
          domainScores: scores.domainScores as Record<string, number>,
          normalizedScores: scores.normalizedScores as Record<string, number>,
          isManual: true,
          notes: scoreNotes,
        })
        .where(eq(scoresTable.id, existingScore.id));
    } else {
      await db.insert(scoresTable).values({
        id: nanoid(),
        caseId,
        toolId: "RPPI",
        toolName: "ReMynd Phonological Processing Index (RPPI)",
        respondentType: assignment.respondentType ?? "invigilator",
        rawScore: scores.rawScore,
        domainScores: scores.domainScores as Record<string, number>,
        normalizedScores: scores.normalizedScores as Record<string, number>,
        isManual: true,
        notes: scoreNotes,
      });
    }

    // Mark assignment completed and clear draft from metadata
    await db.execute(
      sql`UPDATE assignments SET status = 'completed', submitted_at = NOW(), metadata = (COALESCE(metadata, '{}'::jsonb) - 'rppiDraft') WHERE id = ${assignmentId}`
    );

    return res.json({ ok: true, scores });
  } catch (err) {
    logger.error({ err }, "POST /rppi/submit failed");
    return res.status(500).json({ error: "Failed to submit RPPI" });
  }
});

export default router;
