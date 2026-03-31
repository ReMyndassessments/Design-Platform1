import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, responsesTable, casesTable, assessmentToolsTable } from "@workspace/db/schema";
import { reportUploadsTable, reportTokensTable } from "@workspace/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { Readable } from "stream";
import { nanoid } from "nanoid";
import { SAMPLE_QUESTIONS, FormQuestion } from "../lib/questions.js";

const storage = new ObjectStorageService();

function resolveReportRole(respondentType: string | null): "parent" | "teacher" | null {
  if (!respondentType) return null;
  if (respondentType === "parent") return "parent";
  if (respondentType.startsWith("teacher")) return "teacher";
  return null;
}

const FORM_TYPES = ["REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING", "CONSENT", "INTAKE"];

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

router.get("/external/portal/:token", async (req, res) => {
  const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.uniqueToken, req.params.token)).limit(1);
  const assignment = rows[0];
  if (!assignment) {
    res.status(404).json({ error: "not_found", message: "Form link not found" });
    return;
  }

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, assignment.caseId)).limit(1);
  const caseData = caseRows[0];

  const groupByEmail = !!assignment.assignedToEmail;
  const siblings = await db
    .select({
      toolId: assignmentsTable.toolId,
      toolName: assignmentsTable.toolName,
      status: assignmentsTable.status,
      uniqueToken: assignmentsTable.uniqueToken,
      respondentLabel: assignmentsTable.respondentLabel,
      respondentType: assignmentsTable.respondentType,
    })
    .from(assignmentsTable)
    .where(
      and(
        eq(assignmentsTable.caseId, assignment.caseId),
        groupByEmail
          ? eq(assignmentsTable.assignedToEmail, assignment.assignedToEmail!)
          : and(
              eq(assignmentsTable.respondentType, assignment.respondentType),
              eq(assignmentsTable.respondentLabel, assignment.respondentLabel ?? ""),
            ),
      )
    );

  // Check if a report is available for this respondent
  let reportAccess: object | null = null;
  const reportPhases = ["report", "debrief", "complete"];
  if (caseData && reportPhases.includes(caseData.currentPhase ?? "")) {
    const reportRole = resolveReportRole(assignment.respondentType);
    if (reportRole) {
      const [upload] = await db.select().from(reportUploadsTable).where(eq(reportUploadsTable.caseId, assignment.caseId));
      if (upload) {
        const [tok] = await db
          .select()
          .from(reportTokensTable)
          .where(and(eq(reportTokensTable.caseId, assignment.caseId), eq(reportTokensTable.role, reportRole)));
        if (tok) {
          reportAccess = {
            tokenId: tok.id,
            role: tok.role,
            filename: upload.filename,
            downloadedAt: tok.downloadedAt,
            permissionGranted: tok.permissionGranted,
            adminOverride: tok.adminOverride,
            // teacher access blocked until parent grants permission
            blocked: tok.role === "teacher" && !tok.permissionGranted && !tok.adminOverride,
          };
        }
      }
    }
  }

  res.json({
    studentName: caseData?.studentName ?? "the student",
    currentPhase: caseData?.currentPhase ?? "pre_commitment",
    progressPercentage: caseData?.progressPercentage ?? 0,
    respondentLabel: assignment.respondentLabel,
    respondentType: assignment.respondentType,
    forms: siblings.map(s => ({
      toolId: s.toolId,
      toolName: s.toolName,
      status: s.status,
      uniqueToken: s.uniqueToken,
    })),
    reportAccess,
  });
});

// Download report via portal token (records the download event)
router.get("/external/report/:tokenId/download", async (req, res) => {
  const [tok] = await db.select().from(reportTokensTable).where(eq(reportTokensTable.id, req.params.tokenId));
  if (!tok) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  if (tok.role === "teacher" && !tok.permissionGranted && !tok.adminOverride) {
    res.status(403).json({ error: "awaiting_consent", message: "Parent consent is required before downloading." });
    return;
  }

  const [upload] = await db.select().from(reportUploadsTable).where(eq(reportUploadsTable.caseId, tok.caseId));
  if (!upload) {
    res.status(404).json({ error: "no_report" });
    return;
  }

  // Record first download
  if (!tok.downloadedAt) {
    await db.update(reportTokensTable)
      .set({ downloadedAt: new Date(), updatedAt: new Date() })
      .where(eq(reportTokensTable.id, tok.id));
  }

  // Stream the file from object storage
  try {
    const objectFile = await storage.getObjectEntityFile(upload.fileKey);
    const response = await storage.downloadObject(objectFile);
    res.setHeader("Content-Disposition", `attachment; filename="${upload.filename}"`);
    res.setHeader("Content-Type", "application/pdf");
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key !== "content-disposition" && key !== "content-type") res.setHeader(key, value);
    });
    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error("Error downloading report (external)", err);
    res.status(500).json({ error: "download_failed" });
  }
});

// Grant or withhold parental permission
router.post("/external/report/:tokenId/permission", async (req, res) => {
  const [tok] = await db.select().from(reportTokensTable).where(eq(reportTokensTable.id, req.params.tokenId));
  if (!tok || tok.role !== "parent") {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const { granted } = req.body as { granted: boolean };
  await db.update(reportTokensTable)
    .set({ permissionGranted: granted, permissionGrantedAt: new Date(), updatedAt: new Date() })
    .where(eq(reportTokensTable.id, tok.id));

  // If withheld, notify admins
  if (!granted) {
    try {
      const { sendEmail } = await import("../lib/outlookEmail.js");
      const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, tok.caseId));
      const studentName = caseRow?.studentName ?? "Unknown Student";
      const html = `<p>The parent/guardian for <strong>${studentName}</strong> has chosen <strong>Not Yet</strong> when asked whether to share the psychoeducational report with their school.</p><p>No school access has been granted at this time. You may use the admin override in RAOS if required.</p>`;
      await sendEmail({ to: "noelroberts43@gmail.com", subject: `Parent withheld school consent — ${studentName}`, html });
      await sendEmail({ to: "hayleyxu13@gmail.com", subject: `Parent withheld school consent — ${studentName}`, html });
    } catch (_) {}
  }

  res.json({ ok: true });
});

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

  let nextForms: { toolName: string; uniqueToken: string; respondentLabel: string }[] = [];
  const groupByEmail = !!assignment.assignedToEmail;
  const siblings = await db
    .select({
      toolName: assignmentsTable.toolName,
      uniqueToken: assignmentsTable.uniqueToken,
      respondentLabel: assignmentsTable.respondentLabel,
    })
    .from(assignmentsTable)
    .where(
      and(
        eq(assignmentsTable.caseId, assignment.caseId),
        groupByEmail
          ? eq(assignmentsTable.assignedToEmail, assignment.assignedToEmail!)
          : and(
              eq(assignmentsTable.respondentType, assignment.respondentType),
              eq(assignmentsTable.respondentLabel, assignment.respondentLabel ?? ""),
            ),
        ne(assignmentsTable.id, assignment.id),
        ne(assignmentsTable.status, "completed"),
      )
    );
  nextForms = siblings;

  res.json({ success: true, message: "Thank you! Your response has been submitted.", nextForms });
});

export default router;
