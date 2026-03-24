import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, responsesTable, casesTable, assessmentToolsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { SAMPLE_QUESTIONS, FormQuestion } from "../lib/questions.js";

const FORM_TYPES = ["REFERRAL", "CONSENT", "INTAKE"];

const ITEM_TYPE_MAP: Record<string, string> = {
  checkbox: "checkbox_group",
  radio: "radio_group",
  multiple_choice: "radio_group",
};

type StoredFormItem = {
  id: string;
  text: string;
  textChinese?: string;
  textKorean?: string;
  type: string;
  options?: string[];
  optionsChinese?: string[];
  optionsKorean?: string[];
  domain?: string;
  required?: boolean;
  note?: string;
  noteChinese?: string;
  noteKorean?: string;
};

async function resolveQuestions(toolId: string): Promise<FormQuestion[]> {
  const toolRows = await db
    .select()
    .from(assessmentToolsTable)
    .where(eq(assessmentToolsTable.id, toolId))
    .limit(1);
  const tool = toolRows[0];

  if (tool?.formItems && Array.isArray(tool.formItems) && (tool.formItems as unknown[]).length > 0) {
    return (tool.formItems as StoredFormItem[]).map(item => ({
      id: item.id,
      text: item.text,
      textChinese: item.textChinese,
      textKorean: item.textKorean,
      type: (ITEM_TYPE_MAP[item.type] ?? item.type) as FormQuestion["type"],
      options: item.options,
      optionsChinese: item.optionsChinese,
      optionsKorean: item.optionsKorean,
      domain: item.domain ?? "",
      required: item.required ?? true,
      note: item.note,
      noteChinese: item.noteChinese,
      noteKorean: item.noteKorean,
    }));
  }

  return SAMPLE_QUESTIONS[toolId] ?? SAMPLE_QUESTIONS["default"];
}

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

  const toolId = assignment.toolId;
  const formType = FORM_TYPES.includes(toolId) ? toolId : "screener";
  const questions = await resolveQuestions(toolId);

  res.json({
    assignmentId: assignment.id,
    toolId,
    formType,
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
