import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, responsesTable, casesTable, assessmentToolsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";

const router = Router();

router.get("/external/form/:token", async (req, res) => {
  const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.uniqueToken, req.params.token)).limit(1);
  const assignment = rows[0];

  if (!assignment) {
    res.status(404).json({ error: "not_found", message: "Form link not found or has expired" });
    return;
  }

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, assignment.caseId)).limit(1);
  const caseData = caseRows[0];

  const responseRows = await db.select().from(responsesTable).where(eq(responsesTable.assignmentId, assignment.id)).limit(1);
  const alreadySubmitted = responseRows.length > 0;

  const questions = SAMPLE_QUESTIONS[assignment.toolId] ?? SAMPLE_QUESTIONS["default"];

  res.json({
    assignmentId: assignment.id,
    toolName: assignment.toolName,
    respondentLabel: assignment.respondentLabel,
    studentName: caseData?.studentName ?? "the student",
    language: caseData?.languagePreference ?? "english",
    questions,
    alreadySubmitted,
  });
});

router.post("/external/form/:token/submit", async (req, res) => {
  const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.uniqueToken, req.params.token)).limit(1);
  const assignment = rows[0];

  if (!assignment) {
    res.status(404).json({ error: "not_found", message: "Form link not found" });
    return;
  }

  const { answers, language } = req.body;

  await db.insert(responsesTable).values({
    id: nanoid(),
    assignmentId: assignment.id,
    answers: answers ?? {},
    language: language ?? "english",
  });

  await db.update(assignmentsTable).set({
    status: "completed",
    submittedAt: new Date(),
  }).where(eq(assignmentsTable.id, assignment.id));

  res.json({ success: true, message: "Thank you! Your response has been submitted." });
});

export default router;
