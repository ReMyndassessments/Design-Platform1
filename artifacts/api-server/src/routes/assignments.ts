import { Router } from "express";
import { db } from "@workspace/db";
import { assignmentsTable, casesTable, responsesTable, assessmentToolsTable, scoresTable, batteriesTable, usersTable, strengthenCoreProgramTable } from "@workspace/db/schema";
import { eq, and, ne, inArray, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { SAMPLE_QUESTIONS } from "../lib/questions.js";
import { CHINESE_LITERACY_KEY, validateLiteracyInput } from "../lib/chineseLiteracy.js";
import { isChineseLiteracy, isParentLiteracy, literacyMetadata } from "../lib/chineseLiteracyInstruments.js";
import { loadLiteracy } from "../lib/chineseLiteracyStore.js";
import { generateIntakeSummary, generateAboSummary, generateFormSummary, generateRppiSummary, generateRdaSummary, generateRrfaSummary, generateRrcaSummary, translateAnswersToEnglish } from "../lib/ai.js";
import { sendEmail } from "../lib/outlookEmail.js";
import { writeAudit } from "../lib/audit.js";
import { normalizeAssignmentRespondentType } from "../lib/assignmentRespondent.js";
import { canAssignObservation, visibleObservationAssignments } from "../lib/observationAssignment.js";
import { withBehavobsDetails } from "../lib/behavobsDetails.js";
import { planParentPackageConsolidation, tokenFromPortalLink, parentPortalLinkAfterRecipientUpdate } from "../lib/parentPackageConsolidation.js";
import { buildBatteryReviewState, INTAKE_TOOL_IDS, isSpecializedExaminerAssignment } from "../lib/batteryReview.js";
import type { BatteryApproval } from "../lib/batteryReview.js";
import { getRrcaLanguageTrialResults } from "../lib/rrca.js";
import type { RrcaAnswers } from "../lib/rrca.js";
import { questionsFromAssignmentSnapshot } from "../lib/assignmentSnapshotQuestions.js";
import {
  buildQuestionnaireTestFingerprint,
  buildQuestionnaireTestFormKey,
  checklistIsComplete,
  resolveQuestionnaireTestResults,
  toStaffTestResult,
  validateStaffTestAnswers,
  type QuestionnaireTestEvidence,
  type StaffTestChecklist,
} from "../lib/staffQuestionnaireTests.js";
import {
  BATTERY_TEST_TOKEN_TTL_SECONDS,
  createBatteryTestToken,
  validateBatteryTestPackage,
} from "../lib/batteryTestInvitation.js";
import { z } from "zod";
import { readQuestionnaireTestHistory, lockQuestionnaireTestForms } from "../lib/questionnaireTestHistory.js";
import { selectReadyInvitationForms } from "../lib/formInvitationReadiness.js";

const router = Router();

function generateQRData(link: string): string {
  return link;
}

function getBaseUrl(req: { headers: Record<string, string | string[] | undefined> }): string {
  const host = req.headers.host as string ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  return `${proto}://${host}`;
}

async function checkCaseAccess(_role: string, _userId: string, caseId: string): Promise<boolean> {
  const rows = await db.select({ id: casesTable.id })
    .from(casesTable)
    .where(eq(casesTable.id, caseId))
    .limit(1);
  return !!rows[0];
}

router.get("/cases/:caseId/assignments", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const assignments = await db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, req.params.caseId));
  const observationIds = assignments.filter(a => a.toolId === "BEHAVOBS").map(a => a.id);
  const savedObservations = observationIds.length
    ? await db.select({ assignmentId: responsesTable.assignmentId }).from(responsesTable)
      .where(inArray(responsesTable.assignmentId, observationIds))
    : [];
  res.json(visibleObservationAssignments(assignments, new Set(savedObservations.map(r => r.assignmentId)))
    .map(({ formItemsSnapshot: _snapshot, ...assignment }) => assignment));
});

function mayReviewBattery(role: string | undefined): boolean {
  return role === "admin" || role === "psychometrician";
}

async function getBatteryReview(caseId: string, reader: any = db, lockRows = false) {
  const caseQuery = reader.select({
    id: casesTable.id,
    batteryApproval: casesTable.batteryApproval,
    languagePreference: casesTable.languagePreference,
  }).from(casesTable).where(eq(casesTable.id, caseId));
  const [caseRow] = lockRows
    ? await caseQuery.for("update").limit(1)
    : await caseQuery.limit(1);
  if (!caseRow) return null;

  const assignmentQuery = reader.select({
    id: assignmentsTable.id,
    toolId: assignmentsTable.toolId,
    toolName: assignmentsTable.toolName,
    respondentLabel: assignmentsTable.respondentLabel,
    respondentType: assignmentsTable.respondentType,
    uniqueLink: assignmentsTable.uniqueLink,
    formItemsSnapshot: assignmentsTable.formItemsSnapshot,
    assignedToName: assignmentsTable.assignedToName,
    assignedToEmail: assignmentsTable.assignedToEmail,
  }).from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId));
  const assignmentRows = lockRows
    ? await assignmentQuery.for("update")
    : await assignmentQuery;
  const assignments = assignmentRows.map((row: any) => ({
    ...row,
    assignedLanguage: caseRow.languagePreference ?? "english",
  }));

  if (lockRows) await lockQuestionnaireTestForms(assignments, reader);
  const evidence = await readQuestionnaireTestHistory(caseId, assignments, reader);
  return buildBatteryReviewState(assignments, caseRow.batteryApproval as BatteryApproval | null, evidence);
}

router.get("/cases/:caseId/battery-review", authMiddleware, async (req, res): Promise<void> => {
  if (!mayReviewBattery(req.userRole)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const caseId = req.params.caseId;
  if (typeof caseId !== "string") {
    res.status(400).json({ error: "invalid_case_id" });
    return;
  }
  const state = await getBatteryReview(caseId);
  if (!state) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(state);
});

router.get("/cases/:caseId/assignments/:assignmentId/staff-preview", authMiddleware, async (req, res): Promise<void> => {
  if (!mayReviewBattery(req.userRole)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const caseId = req.params.caseId;
  const assignmentId = req.params.assignmentId;
  if (typeof caseId !== "string" || typeof assignmentId !== "string") {
    res.status(400).json({ error: "invalid_assignment_id" });
    return;
  }
  const [assignment] = await db.select().from(assignmentsTable).where(and(
    eq(assignmentsTable.id, assignmentId),
    eq(assignmentsTable.caseId, caseId),
  )).limit(1);
  if (!assignment) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (isSpecializedExaminerAssignment(assignment)) {
    res.status(400).json({
      error: "examiner_workflow",
      message: "This is an examiner-administered assessment, not a questionnaire. Use its examiner session from the case page. No questionnaire test is required.",
    });
    return;
  }
  if (INTAKE_TOOL_IDS.has(assignment.toolId)) {
    res.status(400).json({ error: "not_assessment_form", message: "Staff battery previews are only available for assessment assignments." });
    return;
  }
  const snapshotQuestions = questionsFromAssignmentSnapshot(assignment.formItemsSnapshot);
  const questions = snapshotQuestions ? withBehavobsDetails(snapshotQuestions, assignment.toolId) : null;
  if (!questions) {
    res.status(409).json({ error: "missing_snapshot", message: "This assignment has no valid frozen form snapshot and cannot be safely previewed." });
    return;
  }
  const [caseRow] = await db.select({
    studentName: casesTable.studentName,
    languagePreference: casesTable.languagePreference,
  }).from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRow) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const currentFingerprint = buildQuestionnaireTestFingerprint({
    id: assignment.id,
    toolId: assignment.toolId,
    toolName: assignment.toolName,
    respondentType: assignment.respondentType,
    respondentLabel: assignment.respondentLabel,
    formItemsSnapshot: assignment.formItemsSnapshot,
    assignedLanguage: caseRow.languagePreference ?? "english",
  });
  const caseAssignments = await db.select({
    id: assignmentsTable.id,
    toolId: assignmentsTable.toolId,
    toolName: assignmentsTable.toolName,
    respondentType: assignmentsTable.respondentType,
    respondentLabel: assignmentsTable.respondentLabel,
    formItemsSnapshot: assignmentsTable.formItemsSnapshot,
  }).from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId));
  const eligibleAssignments = caseAssignments
    .filter(row => !INTAKE_TOOL_IDS.has(row.toolId) && !isSpecializedExaminerAssignment(row))
    .map(row => ({ ...row, assignedLanguage: caseRow.languagePreference ?? "english" }));
  const testEvidence = await readQuestionnaireTestHistory(caseId, eligibleAssignments);
  const effectiveTestResult = resolveQuestionnaireTestResults(eligibleAssignments, testEvidence)
    .get(assignmentId);
  res.json({
    assignmentId: assignment.id,
    testFingerprint: currentFingerprint,
    testResult: effectiveTestResult ?? toStaffTestResult(currentFingerprint, null),
    toolId: assignment.toolId,
    formType: "screener",
    toolName: assignment.toolName,
    respondentLabel: assignment.respondentLabel,
    studentName: caseRow.studentName,
    language: caseRow.languagePreference ?? "english",
    questions,
    alreadySubmitted: false,
    preview: true,
  });
});

router.post("/cases/:caseId/assignments/:assignmentId/staff-test-result", authMiddleware, async (req, res): Promise<void> => {
  if (!mayReviewBattery(req.userRole)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const caseId = req.params.caseId;
  const assignmentId = req.params.assignmentId;
  if (typeof caseId !== "string" || typeof assignmentId !== "string") {
    res.status(400).json({ error: "invalid_assignment_id" });
    return;
  }
  if (!await checkCaseAccess(req.userRole!, req.userId!, caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const body = z.object({
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
    result: z.enum(["passed", "failed"]),
    mode: z.enum(["manual", "automatic"]).optional(),
    language: z.string().trim().min(1).max(40),
    notes: z.string().max(4000).optional(),
    checklist: z.object({
      correctForm: z.boolean(),
      contentLanguage: z.boolean(),
      controls: z.boolean(),
      safeTesting: z.boolean(),
    }).strict().optional(),
    answers: z.record(z.string(), z.unknown()).optional(),
  }).strict().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid_request", message: "The staff test result is invalid." });
    return;
  }
  const notes = body.data.mode === "automatic" && body.data.result === "passed"
    ? "Automatic synthetic-answer validation. No human visual, language-quality or clinical review is certified."
    : body.data.notes?.trim() || null;
  if (body.data.result === "failed" && (!notes || notes.length < 10)) {
    res.status(400).json({ error: "notes_required", message: "A meaningful note of at least 10 characters is required for a failed test." });
    return;
  }
  if (body.data.result === "passed" && body.data.mode !== "automatic" && !checklistIsComplete(body.data.checklist)) {
    res.status(400).json({ error: "checklist_incomplete", message: "All four staff-test checklist items must be confirmed before recording a pass." });
    return;
  }
  if (!req.userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const outcome = await db.transaction(async tx => {
    const [caseRow] = await tx.select({
      id: casesTable.id,
      languagePreference: casesTable.languagePreference,
    }).from(casesTable).where(eq(casesTable.id, caseId)).for("update").limit(1);
    if (!caseRow) return { kind: "not_found" as const };

    const [assignment] = await tx.select({
      id: assignmentsTable.id,
      toolId: assignmentsTable.toolId,
      toolName: assignmentsTable.toolName,
      respondentType: assignmentsTable.respondentType,
      respondentLabel: assignmentsTable.respondentLabel,
      formItemsSnapshot: assignmentsTable.formItemsSnapshot,
    }).from(assignmentsTable).where(and(
      eq(assignmentsTable.id, assignmentId),
      eq(assignmentsTable.caseId, caseId),
    )).for("update").limit(1);
    if (!assignment) return { kind: "not_found" as const };
    if (INTAKE_TOOL_IDS.has(assignment.toolId) || isSpecializedExaminerAssignment(assignment)) {
      return { kind: "not_questionnaire" as const };
    }

    const assignedLanguage = caseRow.languagePreference ?? "english";
    const testFingerprint = buildQuestionnaireTestFingerprint({
      id: assignment.id,
      toolId: assignment.toolId,
      toolName: assignment.toolName,
      respondentType: assignment.respondentType,
      respondentLabel: assignment.respondentLabel,
      formItemsSnapshot: assignment.formItemsSnapshot,
      assignedLanguage,
    });
    if (body.data.fingerprint !== testFingerprint) {
      return { kind: "stale" as const, testFingerprint };
    }
    if (body.data.result === "passed") {
      if (isChineseLiteracy(assignment.toolId)) {
        try {
          if (body.data.mode === "automatic") {
            let rejectsIncomplete = false;
            try { validateLiteracyInput({}, undefined, true, literacyMetadata(assignment.toolId)); }
            catch { rejectsIncomplete = true; }
            if (!rejectsIncomplete) return { kind: "answers_incomplete" as const };
          }
          validateLiteracyInput(body.data.answers?.__chineseLiteracy, undefined, true, literacyMetadata(assignment.toolId));
        }
        catch { return { kind: "answers_incomplete" as const }; }
      } else {
      const snapshotQuestions = questionsFromAssignmentSnapshot(assignment.formItemsSnapshot);
      const questions = snapshotQuestions ? withBehavobsDetails(snapshotQuestions, assignment.toolId) : null;
      if (!questions) return { kind: "missing_snapshot" as const };
      const validation = validateStaffTestAnswers(questions, body.data.answers ?? {}, assignment.toolId);
      if (body.data.mode === "automatic" && questions.some(question => question.required && question.type !== "section_header" && !question.conditionalOn && !question.conditionalType) &&
          validateStaffTestAnswers(questions, {}, assignment.toolId).valid) {
        return { kind: "answers_incomplete" as const };
      }
      if (!validation.valid) {
        return { kind: "answers_incomplete" as const };
      }
      }
    }

    const [tester] = await tx.select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
    if (!tester || !tester.name.trim()) return { kind: "tester_not_found" as const };

    const evidenceId = nanoid();
    const testedAt = new Date();
    const currentForm = {
      ...assignment,
      assignedLanguage,
    };
    const formKey = buildQuestionnaireTestFormKey(currentForm);
    await lockQuestionnaireTestForms([currentForm], tx);
    const checklist: StaffTestChecklist = {
      ...(body.data.checklist ?? { correctForm: false, contentLanguage: false, controls: false, safeTesting: false }),
      ...(body.data.mode === "automatic" ? {
        correctForm: true, contentLanguage: false, controls: false, safeTesting: true,
      } : {}),
      mode: body.data.mode ?? "manual",
      formKey,
    };
    await tx.execute(sql`
      INSERT INTO questionnaire_test_evidence (
        id, case_id, assignment_id, tester_id, tester_name, tested_at,
        fingerprint, result, language, checklist, notes
      ) VALUES (
        ${evidenceId}, ${caseId}, ${assignment.id}, ${tester.id}, ${tester.name},
        ${testedAt}, ${testFingerprint}, ${body.data.result}, ${body.data.language},
        ${checklist ? JSON.stringify(checklist) : null}::jsonb, ${notes}
      )
    `);
    const evidence: QuestionnaireTestEvidence = {
      id: evidenceId,
      assignmentId: assignment.id,
      testerId: tester.id,
      testerName: tester.name,
      testedAt,
      fingerprint: testFingerprint,
      result: body.data.result,
      language: body.data.language,
      checklist,
      notes,
    };
    const currentAssignments = await tx.select({
      id: assignmentsTable.id,
      toolId: assignmentsTable.toolId,
      toolName: assignmentsTable.toolName,
      respondentType: assignmentsTable.respondentType,
      respondentLabel: assignmentsTable.respondentLabel,
      formItemsSnapshot: assignmentsTable.formItemsSnapshot,
    }).from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId));
    const eligibleAssignments = currentAssignments
      .filter(row => !INTAKE_TOOL_IDS.has(row.toolId) && !isSpecializedExaminerAssignment(row))
      .map(row => ({ ...row, assignedLanguage }));
    const allEvidence = await readQuestionnaireTestHistory(caseId, eligibleAssignments, tx);
    const testResult = resolveQuestionnaireTestResults(eligibleAssignments, allEvidence).get(assignment.id)
      ?? toStaffTestResult(testFingerprint, evidence);
    const targetFormKey = buildQuestionnaireTestFormKey({
      id: assignment.id,
      toolId: assignment.toolId,
      toolName: assignment.toolName,
      respondentType: assignment.respondentType,
      respondentLabel: assignment.respondentLabel,
      formItemsSnapshot: assignment.formItemsSnapshot,
      assignedLanguage,
    });
    const coveredAssignmentCount = targetFormKey
      ? eligibleAssignments.filter(candidate => buildQuestionnaireTestFormKey(candidate) === targetFormKey).length
      : 1;
    return {
      kind: "saved" as const,
      testFingerprint,
      testResult,
      coveredAssignmentCount,
      result: body.data.result,
    };
  });

  if (outcome.kind === "not_found") {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (outcome.kind === "not_questionnaire") {
    res.status(400).json({ error: "not_assessment_form", message: "Staff test results are only available for questionnaire assignments." });
    return;
  }
  if (outcome.kind === "stale") {
    res.status(409).json({ error: "stale_test_fingerprint", message: "The assigned form or case language changed. Refresh the preview before recording a test result.", testFingerprint: outcome.testFingerprint });
    return;
  }
  if (outcome.kind === "missing_snapshot") {
    res.status(409).json({ error: "missing_snapshot", message: "This assignment has no valid frozen form snapshot." });
    return;
  }
  if (outcome.kind === "answers_incomplete") {
    res.status(422).json({ error: "test_validation_failed", message: "Complete all required visible questions and resolve any consent blockers before recording a passing test." });
    return;
  }
  if (outcome.kind === "tester_not_found") {
    res.status(401).json({ error: "unauthorized", message: "The authenticated tester could not be verified." });
    return;
  }

  void writeAudit({
    eventType: "assessment.questionnaire_staff_test_recorded",
    caseId,
    assignmentId,
    actorId: req.userId,
    actorRole: req.userRole ?? null,
    metadata: { result: outcome.result, fingerprint: outcome.testFingerprint },
  });
  res.json({
    testFingerprint: outcome.testFingerprint,
    testResult: outcome.testResult,
    coveredAssignmentCount: outcome.coveredAssignmentCount,
  });
});

router.post("/cases/:caseId/battery-test-email", authMiddleware, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only an administrator can send an assessment test package." });
    return;
  }

  const caseId = req.params.caseId;
  if (typeof caseId !== "string" || !caseId.trim()) {
    res.status(400).json({ error: "invalid_case_id" });
    return;
  }

  const body = z.object({
    toEmail: z.string().trim().email().max(254).transform(email => email.toLowerCase()),
    assignmentIds: z.array(z.string().min(1).max(256)).min(1).max(100),
  }).strict().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid_request", message: "Provide a valid email address and one complete parent or teacher package." });
    return;
  }

  const [caseRow] = await db.select({
    id: casesTable.id,
    batteryApproval: casesTable.batteryApproval,
  }).from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRow) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  const caseAssignments = await db.select({
    id: assignmentsTable.id,
    toolId: assignmentsTable.toolId,
    toolName: assignmentsTable.toolName,
    respondentLabel: assignmentsTable.respondentLabel,
    respondentType: assignmentsTable.respondentType,
    uniqueLink: assignmentsTable.uniqueLink,
    formItemsSnapshot: assignmentsTable.formItemsSnapshot,
    assignedToName: assignmentsTable.assignedToName,
    assignedToEmail: assignmentsTable.assignedToEmail,
  }).from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId));
  const packageData = validateBatteryTestPackage(caseAssignments, body.data.assignmentIds);
  if (!packageData) {
    res.status(400).json({
      error: "invalid_package",
      message: "Selected forms must be the complete parent or teacher package for this case.",
    });
    return;
  }

  if (packageData.assignments.some(assignment => !questionsFromAssignmentSnapshot(assignment.formItemsSnapshot))) {
    res.status(409).json({
      error: "missing_snapshot",
      message: "Every selected form must have a valid frozen snapshot before a test link can be sent.",
    });
    return;
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret?.trim()) {
    res.status(503).json({
      error: "test_links_unavailable",
      message: "Assessment test links are unavailable because SESSION_SECRET is not configured.",
    });
    return;
  }

  const fingerprint = buildBatteryReviewState(
    caseAssignments,
    caseRow.batteryApproval as BatteryApproval | null,
  ).fingerprint;
  const expiresAtSeconds = Math.ceil(Date.now() / 1000) + BATTERY_TEST_TOKEN_TTL_SECONDS;
  let token: string;
  try {
    token = createBatteryTestToken({
      caseId,
      assignmentIds: body.data.assignmentIds.slice().sort(),
      fingerprint,
      exp: expiresAtSeconds,
    }, secret);
  } catch {
    res.status(503).json({
      error: "test_links_unavailable",
      message: "Assessment test links could not be created. Confirm SESSION_SECRET is configured.",
    });
    return;
  }

  const expiresAt = new Date(expiresAtSeconds * 1000).toISOString();
  const testPackageLink = `${getBaseUrl(req)}/test-package?token=${encodeURIComponent(token)}`;
  const escapedTestPackageLink = testPackageLink
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
    <h2 style="color:#0a1628">Assessment package test link</h2>
    <p><strong>[TEST ONLY]</strong> This link opens a non-submitting preview of an assessment package.</p>
    <p><a href="${escapedTestPackageLink}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">Open test package</a></p>
    <p>This preview expires in 48 hours. Answers are not saved and the link must not be used for a real assessment response.</p>
  </div>`;

  try {
    await sendEmail({
      to: body.data.toEmail,
      subject: "[TEST ONLY] Assessment package preview",
      html,
    });
  } catch {
    req.log.error({ caseId }, "Could not send assessment test package email");
    res.status(502).json({
      error: "send_failed",
      message: "The assessment test email could not be sent. Please try again.",
    });
    return;
  }

  try {
    await writeAudit({
      eventType: "assessment.test_package_email_sent",
      caseId,
      actorId: req.userId ?? null,
      actorRole: req.userRole ?? null,
      ipAddress: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? null,
      metadata: {
        recipientEmail: body.data.toEmail,
        packageType: packageData.category,
        assignmentCount: packageData.assignments.length,
        expiresAt,
      },
    });
  } catch (error) {
    req.log.error({ err: error, caseId }, "Assessment test email was sent but its audit entry could not be recorded");
  }

  res.json({ success: true, expiresAt });
});

router.post("/cases/:caseId/battery-review/approve", authMiddleware, async (req, res): Promise<void> => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden", message: "Only an administrator can approve an assessment battery." });
    return;
  }
  const body = z.object({ fingerprint: z.string().regex(/^[a-f0-9]{64}$/i) }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "invalid_request", message: "A valid battery fingerprint is required." });
    return;
  }
  const caseId = req.params.caseId;
  if (typeof caseId !== "string") {
    res.status(400).json({ error: "invalid_case_id" });
    return;
  }
  if (!req.userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const approvalResult = await db.transaction(async tx => {
    const [caseRow] = await tx.select({
      id: casesTable.id,
      batteryApproval: casesTable.batteryApproval,
      languagePreference: casesTable.languagePreference,
    }).from(casesTable).where(eq(casesTable.id, caseId)).for("update").limit(1);
    if (!caseRow) return { kind: "not_found" as const };
    const assignmentRows = await tx.select({
      id: assignmentsTable.id,
      toolId: assignmentsTable.toolId,
      toolName: assignmentsTable.toolName,
      respondentLabel: assignmentsTable.respondentLabel,
      respondentType: assignmentsTable.respondentType,
      uniqueLink: assignmentsTable.uniqueLink,
      formItemsSnapshot: assignmentsTable.formItemsSnapshot,
      assignedToName: assignmentsTable.assignedToName,
      assignedToEmail: assignmentsTable.assignedToEmail,
    }).from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId)).for("update");
    const assignments = assignmentRows.map(row => ({
      ...row,
      assignedLanguage: caseRow.languagePreference ?? "english",
    }));
    await lockQuestionnaireTestForms(assignments, tx);
    const testEvidence = await readQuestionnaireTestHistory(caseId, assignments, tx);
    const state = buildBatteryReviewState(
      assignments,
      caseRow.batteryApproval as BatteryApproval | null,
      testEvidence,
    );
    if (state.fingerprint !== body.data.fingerprint) {
      return { kind: "stale" as const, state };
    }
    const blockingIssues = state.issues.filter(issue =>
      !issue.startsWith("Assessment assignments changed after approval."),
    );
    if (blockingIssues.length > 0) return { kind: "issues" as const, state };

    const approval = {
      fingerprint: state.fingerprint,
      approvedAt: new Date().toISOString(),
      approvedBy: req.userId!,
    };
    await tx.update(casesTable).set({ batteryApproval: approval }).where(eq(casesTable.id, caseId));
    return {
      kind: "approved" as const,
      state: buildBatteryReviewState(assignments, approval, testEvidence),
    };
  });
  if (approvalResult.kind === "not_found") {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (approvalResult.kind === "stale") {
    res.status(409).json({ error: "battery_changed", message: "The assessment battery changed during review. Refresh and review the current forms.", ...approvalResult.state });
    return;
  }
  if (approvalResult.kind === "issues") {
    res.status(409).json({ error: "review_issues", message: "Resolve the listed assessment battery issues before approval.", ...approvalResult.state });
    return;
  }
  void writeAudit({
    eventType: "assessment_battery.review_approved",
    caseId,
    actorId: req.userId,
    actorRole: req.userRole ?? null,
    metadata: { fingerprint: approvalResult.state.fingerprint, assignmentCount: approvalResult.state.assignmentCount },
  });
  res.json(approvalResult.state);
});

// Staff-confirmed parent consolidation: one shared entry link while per-form
// tokens remain available for submitting the individual questionnaires.
router.post("/cases/:caseId/assignments/consolidate-parent", authMiddleware, async (req, res) => {
  if (!["admin", "psychometrician", "school_clinical_coordinator"].includes(req.userRole ?? "")) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  const caseId = req.params.caseId;
  if (typeof caseId !== "string") {
    res.status(400).json({ error: "invalid_case_id" });
    return;
  }
  const [caseRow] = await db.select({ id: casesTable.id, school: casesTable.school })
    .from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRow) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  if (req.userRole === "school_clinical_coordinator" && (!req.userSchool || caseRow.school !== req.userSchool)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  let result: { updated: number; expected: number } | { error: string; message: string };
  try {
    result = await db.transaction(async tx => {
      const parentRows = await tx.select({
        id: assignmentsTable.id,
        toolId: assignmentsTable.toolId,
        respondentLabel: assignmentsTable.respondentLabel,
        assignedToName: assignmentsTable.assignedToName,
        assignedToEmail: assignmentsTable.assignedToEmail,
        createdAt: assignmentsTable.createdAt,
        uniqueToken: assignmentsTable.uniqueToken,
        uniqueLink: assignmentsTable.uniqueLink,
      }).from(assignmentsTable).where(and(
        eq(assignmentsTable.caseId, caseId),
        eq(assignmentsTable.respondentType, "parent"),
        inArray(assignmentsTable.respondentLabel, ["Parent", "Parent Assessment Package"]),
      )).for("update");
      const assessmentRows = parentRows.filter(a => !INTAKE_TOOL_IDS.has(a.toolId));
      const plan = planParentPackageConsolidation(assessmentRows);
      if ("error" in plan) {
        return plan.error === "recipient_identified"
          ? { error: plan.error, message: "A parent form has a name or email. Review the recipients before combining packages." }
          : { error: plan.error, message: "The two unnamed parent packages are not present." };
      }
      const canonical = [...assessmentRows].sort((a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() || a.uniqueToken.localeCompare(b.uniqueToken))[0];
      if (tokenFromPortalLink(canonical.uniqueLink) !== canonical.uniqueToken) {
        return { error: "invalid_parent_link", message: "The original parent link could not be verified. No forms were changed." };
      }
      const updated = await tx.update(assignmentsTable).set({
        respondentLabel: "Parent Assessment Package",
        uniqueLink: canonical.uniqueLink,
        qrCodeData: canonical.uniqueLink,
      }).where(and(
        eq(assignmentsTable.caseId, caseId),
        eq(assignmentsTable.respondentType, "parent"),
        inArray(assignmentsTable.id, assessmentRows.map(a => a.id)),
        sql`coalesce(btrim(${assignmentsTable.assignedToName}), '') = ''`,
        sql`coalesce(btrim(${assignmentsTable.assignedToEmail}), '') = ''`,
      )).returning({ id: assignmentsTable.id });
      if (updated.length !== assessmentRows.length) {
        throw new Error("Parent assignments changed during consolidation");
      }
      return { updated: plan.sourceIds.length, expected: plan.sourceIds.length };
    });
  } catch {
    console.error("[consolidate-parent] Transaction failed");
    res.status(500).json({ error: "consolidation_failed", message: "No parent forms were changed. Refresh and try again." });
    return;
  }
  if ("error" in result) {
    res.status(409).json(result);
    return;
  }
  void writeAudit({
    eventType: "assignment.parent_packages_consolidated",
    caseId,
    actorId: req.userId ?? null,
    actorRole: req.userRole ?? null,
    metadata: { count: result.updated },
  });
  res.json(result);
});

router.post("/cases/:caseId/assignments", authMiddleware, async (req, res) => {
  const { toolId, respondentLabel, assignedToName, assignedToEmail, dueDate } = req.body;
  const caseId = req.params.caseId;
  if (typeof caseId !== "string") {
    res.status(400).json({ error: "invalid_case_id" });
    return;
  }

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  if (!caseRows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  // Strengthen Your Core stays inside the normal case/assignment workflow.
  // Parent/guardian consent is the only required consent form before assessments.
  const isStrengthenCoreCase = ((caseRows[0].productIds as string[] | null) ?? []).includes("STRENGTHEN_CORE");
  const intakeAnalysis = (caseRows[0].intakeAnalysis ?? {}) as Record<string, unknown>;
  const sycWorkflow = intakeAnalysis.sycWorkflow && typeof intakeAnalysis.sycWorkflow === "object"
    ? intakeAnalysis.sycWorkflow as Record<string, unknown>
    : {};
  const sycConsentVerified = caseRows[0].consentObtained === true && typeof sycWorkflow.verifiedAt === "string";
  if (isStrengthenCoreCase && String(toolId) === "SYC-ASSENT") {
    res.status(410).json({
      error: "student_assent_not_required",
      message: "A separate student assent form is not used in this workflow. Parent/guardian consent is the required consent form.",
    });
    return;
  }
  if (isStrengthenCoreCase && !sycConsentVerified && String(toolId) !== "CONSENT") {
    res.status(403).json({
      error: "strengthen_core_consent_not_verified",
      message: "This Strengthen Your Core case requires verified parent/guardian consent before assessment assignments can be created.",
    });
    return;
  }
  const sycIntakeFormIds = new Set([
    "CONSENT", "INTAKE", "REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING",
  ]);
  if (isStrengthenCoreCase && sycConsentVerified && !sycIntakeFormIds.has(String(toolId))) {
    const [program] = await db.select().from(strengthenCoreProgramTable)
      .where(eq(strengthenCoreProgramTable.id, "default")).limit(1);
    const settings = (program?.settings ?? {}) as { coreInstrumentEnabled?: boolean; allowedExtensions?: string[] };
    const allowedSycTools = new Set<string>();
    if (settings.coreInstrumentEnabled === true) {
      allowedSycTools.add("RCEP-CORE");
      allowedSycTools.add("REMYND-CLASSROOM-OBS");
      allowedSycTools.add("REMYND-WORK-REVIEW");
    }
    const approvedExtension = typeof sycWorkflow.approvedExtension === "string" ? sycWorkflow.approvedExtension : null;
    if (approvedExtension && settings.allowedExtensions?.includes(approvedExtension)) {
      allowedSycTools.add(approvedExtension);
    }
    if (!allowedSycTools.has(String(req.body.toolId ?? ""))) {
      res.status(403).json({
        error: "strengthen_core_instrument_not_approved",
        message: "This Strengthen Your Core case can only receive its enabled core instrument and the single extension approved for this application.",
      });
      return;
    }
  }

  const { userRole } = req;
  if (userRole !== "admin" && userRole !== "psychometrician" && userRole !== "school_clinical_coordinator") {
    res.status(403).json({ error: "forbidden", message: "Only administrators and psychometricians can assign forms" });
    return;
  }
  const respondentType = normalizeAssignmentRespondentType(req.body.respondentType);
  if (!respondentType) {
    res.status(400).json({ error: "invalid_respondent_type", message: "Choose a valid respondent type for this assignment." });
    return;
  }
  if (!canAssignObservation(toolId, respondentType)) {
    res.status(400).json({ error: "invigilator_only", message: "Assessment Behavior Observation is for the invigilator only." });
    return;
  }
  if (isChineseLiteracy(toolId)) {
    if (isParentLiteracy(toolId) ? respondentType !== "parent" : !["teacher1", "teacher2", "special_needs_teacher"].includes(respondentType)) {
      res.status(422).json({ message: isParentLiteracy(toolId) ? "Assign the parent observation form to one parent or caregiver, using their own name and email." : "Chinese literacy is a teacher-only instrument. One teacher is sufficient; a second teacher is optional." });
      return;
    }
    const grade = caseRows[0].grade?.match(/(?:^|\D)(\d{1,2})(?:\D|$)/)?.[1];
    if (grade && (Number(grade) < 3 || Number(grade) > 12)) {
      res.status(422).json({ message: "This instrument is for Grades 3–12 only." });
      return;
    }
    if (userRole === "psychometrician" && caseRows[0].assignedPsychId !== req.userId && caseRows[0].assignedLeadId !== req.userId) {
      res.status(403).json({ message: "You are not assigned to this case." }); return;
    }
    if (userRole === "school_clinical_coordinator") {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
      if (!user?.schoolName || user.schoolName !== caseRows[0].school) { res.status(403).json({ message: "This case belongs to another school." }); return; }
    }
  }

  const token = crypto.randomBytes(24).toString("hex");
  const baseUrl = getBaseUrl(req as unknown as Parameters<typeof getBaseUrl>[0]);
  const uniqueLink = `${baseUrl}/external/${token}`;

  const assignment = await db.transaction(async tx => {
    // Serialize battery membership changes with approval and staff-test writes.
    const [lockedCase] = await tx.select({ id: casesTable.id }).from(casesTable)
      .where(eq(casesTable.id, caseId)).for("update").limit(1);
    if (!lockedCase) return [];
    if (toolId === "BEHAVOBS") {
      const existing = await tx.select().from(assignmentsTable).where(and(
        eq(assignmentsTable.caseId, caseId),
        eq(assignmentsTable.toolId, toolId),
        eq(assignmentsTable.respondentType, "invigilator"),
      )).limit(1);
      if (existing.length) return existing;
    }
    const created = await tx.insert(assignmentsTable).values({
      id: nanoid(),
      caseId,
      toolId,
      toolName: req.body.toolName ?? toolId,
      respondentType,
      respondentLabel,
      assignedToName,
      assignedToEmail,
      uniqueToken: token,
      uniqueLink,
      qrCodeData: uniqueLink,
      status: "not_started",
      dueDate: dueDate ? new Date(dueDate) : null,
    }).returning();

    // Freeze the library's exact formItems + version into the assignment row.
    const toolRes = await tx.execute(sql`SELECT version_id, form_items FROM assessment_tools WHERE id = ${toolId}`);
    const toolRow = toolRes.rows?.[0] as any;
    const toolVersionId = toolRow?.version_id ?? null;
    const formItemsSnapshot = toolRow?.form_items ? JSON.stringify(toolRow.form_items) : null;
    if (created[0]) {
      await tx.execute(sql`
        UPDATE assignments
        SET tool_version_id = ${toolVersionId}, form_items_snapshot = ${formItemsSnapshot}
        WHERE id = ${created[0].id}
      `);
      if (isChineseLiteracy(toolId)) await loadLiteracy(created[0], tx);
    }
    return created;
  });
  if (!assignment[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  void writeAudit({
    eventType: "assignment.created",
    caseId,
    assignmentId: assignment[0]?.id,
    toolId,
    actorId: req.userId ?? null,
    actorRole: req.userRole ?? null,
    metadata: { respondentType, respondentLabel, assignedToName: assignedToName ?? null },
  });

  res.status(201).json(assignment[0]);
});

router.patch("/cases/:caseId/assignments/:assignmentId", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const updates: Partial<typeof assignmentsTable.$inferInsert> = {};
  if (req.body.status) {
    const [existing] = await db.select().from(assignmentsTable).where(and(eq(assignmentsTable.id, String(req.params.assignmentId)), eq(assignmentsTable.caseId, String(req.params.caseId)))).limit(1);
    if (isChineseLiteracy(existing?.toolId)) {
      res.status(409).json({ message: "Change this instrument's state through its versioned teacher/reviewer workflow." }); return;
    }
  }
  if (req.body.status) updates.status = req.body.status;
  if (req.body.assignedToName) updates.assignedToName = req.body.assignedToName;
  if (req.body.assignedToEmail) updates.assignedToEmail = req.body.assignedToEmail;
  if (req.body.dueDate) updates.dueDate = new Date(req.body.dueDate);

  const rows = await db.update(assignmentsTable).set(updates)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .returning();
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const { formItemsSnapshot: _snapshot, ...assignment } = rows[0];
  res.json(assignment);
});

router.get("/cases/:caseId/assignments/:assignmentId/response", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const assignmentRows = await db.select().from(assignmentsTable)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .limit(1);
  const assignment = assignmentRows[0];
  if (!assignment) {
    res.status(404).json({ error: "not_found", message: "Assignment not found" });
    return;
  }

  const responseRows = await db.select().from(responsesTable)
    .where(eq(responsesTable.assignmentId, assignment.id))
    .limit(1);
  if (!responseRows[0]) {
    res.status(404).json({ error: "not_found", message: "No response submitted yet" });
    return;
  }

  const caseRows = await db.select({ studentName: casesTable.studentName, school: casesTable.school, grade: casesTable.grade })
    .from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);

  const [toolRows, existingScoreRows, snapRow] = await Promise.all([
    db.select({ formItems: assessmentToolsTable.formItems, scoringType: assessmentToolsTable.scoringType, domains: assessmentToolsTable.domains, scoringConfig: assessmentToolsTable.scoringConfig })
      .from(assessmentToolsTable).where(eq(assessmentToolsTable.id, assignment.toolId)).limit(1),
    db.select().from(scoresTable)
      .where(and(
        eq(scoresTable.caseId, req.params.caseId),
        eq(scoresTable.toolId, assignment.toolId),
        eq(scoresTable.respondentType, assignment.respondentType)
      ))
      .limit(1),
    db.execute(sql`SELECT form_items_snapshot FROM assignments WHERE id = ${assignment.id}`),
  ]);

  const ITEM_TYPE_MAP: Record<string, string> = {
    checkbox: "checkbox_group",
    radio: "radio_group",
    multiple_choice: "radio_group",
  };
  type StoredItem = { id: string; text: string; textChinese?: string; textKorean?: string; type: string; options?: string[]; optionsChinese?: string[]; optionsKorean?: string[]; domain?: string; required?: boolean; note?: string; noteChinese?: string; noteKorean?: string };

  const snapshotJson = (snapRow.rows?.[0] as any)?.form_items_snapshot ?? null;
  let questions: StoredItem[];
  if (snapshotJson) {
    try {
      const snapshotItems = JSON.parse(snapshotJson) as StoredItem[];
      questions = snapshotItems.map(item => ({
        ...item,
        type: ITEM_TYPE_MAP[item.type] ?? item.type,
        domain: item.domain ?? "",
        required: item.required ?? true,
      }));
    } catch {
      const rawItems = toolRows[0]?.formItems;
      questions = (rawItems && Array.isArray(rawItems) && rawItems.length > 0)
        ? (rawItems as StoredItem[]).map(item => ({ ...item, type: ITEM_TYPE_MAP[item.type] ?? item.type, domain: item.domain ?? "", required: item.required ?? true }))
        : (SAMPLE_QUESTIONS[assignment.toolId] ?? SAMPLE_QUESTIONS["default"] ?? []);
    }
  } else {
    const rawItems = toolRows[0]?.formItems;
    questions = (rawItems && Array.isArray(rawItems) && rawItems.length > 0)
      ? (rawItems as StoredItem[]).map(item => ({
          ...item,
          type: ITEM_TYPE_MAP[item.type] ?? item.type,
          domain: item.domain ?? "",
          required: item.required ?? true,
        }))
      : (SAMPLE_QUESTIONS[assignment.toolId] ?? SAMPLE_QUESTIONS["default"] ?? []);
  }

  if (Object.hasOwn(responseRows[0].answers ?? {}, "q24_details")) {
    questions = withBehavobsDetails(questions, assignment.toolId);
  }

  let bascCorrectionApplied = false;
  try {
    const bcResult = await db.execute(sql`
      SELECT COALESCE(basc_correction_applied, FALSE) AS applied
      FROM responses WHERE id = ${responseRows[0].id}
    `);
    bascCorrectionApplied = (bcResult.rows?.[0] as any)?.applied ?? false;
  } catch { /* column may not exist on very first boot before migration runs */ }

  res.json({
    assignment: {
      id: assignment.id,
      toolId: assignment.toolId,
      toolName: assignment.toolName,
      respondentType: assignment.respondentType,
      respondentLabel: assignment.respondentLabel,
      assignedToName: assignment.assignedToName,
    },
    response: responseRows[0],
    bascCorrectionApplied,
    questions,
    studentName: caseRows[0]?.studentName ?? "Unknown Student",
    school: caseRows[0]?.school ?? "",
    grade: caseRows[0]?.grade ?? "",
    scoringType: toolRows[0]?.scoringType ?? null,
    toolDomains: toolRows[0]?.domains ?? [],
    scoringConfig: toolRows[0]?.scoringConfig ?? null,
    existingScore: existingScoreRows[0] ?? null,
  });
});

router.post("/cases/:caseId/assignments/:assignmentId/response/summary", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const assignmentRows = await db.select().from(assignmentsTable)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .limit(1);
  const assignment = assignmentRows[0];
  if (!assignment) {
    res.status(404).json({ error: "not_found", message: "Assignment not found" });
    return;
  }
  const [responseRows, caseRows, toolRows] = await Promise.all([
    db.select().from(responsesTable).where(eq(responsesTable.assignmentId, assignment.id)).limit(1),
    db.select({ studentName: casesTable.studentName, school: casesTable.school, grade: casesTable.grade })
      .from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1),
    db.select({ name: assessmentToolsTable.name, formItems: assessmentToolsTable.formItems })
      .from(assessmentToolsTable).where(eq(assessmentToolsTable.id, assignment.toolId ?? "")).limit(1),
  ]);

  if (!responseRows[0]) {
    res.status(404).json({ error: "not_found", message: "No response submitted yet" });
    return;
  }

  const commonParams = {
    studentName: caseRows[0]?.studentName ?? "Unknown Student",
    school: caseRows[0]?.school ?? "",
    grade: caseRows[0]?.grade ?? "",
    answers: responseRows[0].answers,
  };

  let summary: string;
  if (assignment.toolId === "INTAKE") {
    summary = await generateIntakeSummary(commonParams);
  } else if (assignment.toolId === "BEHAVOBS") {
    summary = await generateAboSummary(commonParams);
  } else if (assignment.toolId === "RPPI") {
    // Fetch score row for domain scores and risk levels
    const [rppiScore] = await db.select().from(scoresTable)
      .where(and(
        eq(scoresTable.caseId, req.params.caseId),
        eq(scoresTable.toolId, "RPPI")
      ))
      .limit(1);
    const scoreNotes = (rppiScore?.notes ? JSON.parse(rppiScore.notes as string) : {}) as Record<string, unknown>;
    const answers = responseRows[0].answers as Record<string, unknown>;
    summary = await generateRppiSummary({
      studentName: commonParams.studentName,
      school: commonParams.school,
      grade: commonParams.grade,
      normalizedScores: (rppiScore?.normalizedScores ?? {}) as Record<string, number>,
      paRisk: (scoreNotes.paRisk as string) ?? "low",
      nonwordRisk: (scoreNotes.nonwordRisk as string) ?? "low",
      rapidRisk: (scoreNotes.rapidRisk as string) ?? "low",
      overallRisk: (scoreNotes.overallRisk as string) ?? "low",
      interpretationText: (scoreNotes.interpretationText as string) ?? "",
      rapidNaming: (scoreNotes.rapidNaming ?? (answers.rapidNaming ?? {})) as Parameters<typeof generateRppiSummary>[0]["rapidNaming"],
      mode: (scoreNotes.mode as string) ?? (answers.mode as string) ?? "Unknown",
      generalNotes: (scoreNotes.generalNotes as string) ?? (answers.generalNotes as string) ?? "",
    });
  } else if (assignment.toolId === "RDA") {
    const [rdaScore] = await db.select().from(scoresTable)
      .where(and(eq(scoresTable.caseId, req.params.caseId), eq(scoresTable.toolId, "RDA")))
      .limit(1);
    const sn = (rdaScore?.notes ? JSON.parse(rdaScore.notes as string) : {}) as Record<string, unknown>;
    const ans = responseRows[0].answers as Record<string, unknown>;
    summary = await generateRdaSummary({
      studentName: commonParams.studentName,
      school: commonParams.school,
      grade: commonParams.grade,
      rawScore: (sn.rawScore as number) ?? 0,
      maxScore: (sn.maxScore as number) ?? 20,
      percentage: (sn.percentage as number) ?? 0,
      riskLevel: (sn.riskLevel as string) ?? "low",
      correctCount: (sn.correctCount as number) ?? 0,
      partialCount: (sn.partialCount as number) ?? 0,
      incorrectCount: (sn.incorrectCount as number) ?? 0,
      interpretationText: (sn.interpretationText as string) ?? "",
      mode: (sn.mode as string) ?? (ans.mode as string) ?? "Unknown",
      generalNotes: (sn.generalNotes as string) ?? (ans.generalNotes as string) ?? "",
    });
  } else if (assignment.toolId === "RRFA") {
    const [rrfaScore] = await db.select().from(scoresTable)
      .where(and(eq(scoresTable.caseId, req.params.caseId), eq(scoresTable.toolId, "RRFA")))
      .limit(1);
    const sn = (rrfaScore?.notes ? JSON.parse(rrfaScore.notes as string) : {}) as Record<string, unknown>;
    const ans = responseRows[0].answers as Record<string, unknown>;
    summary = await generateRrfaSummary({
      studentName: commonParams.studentName,
      school: commonParams.school,
      grade: commonParams.grade,
      wordsPerMinute: (sn.wordsPerMinute as number | null) ?? null,
      accuracyPercentage: (sn.accuracyPercentage as number | null) ?? null,
      fluencyRating: (sn.fluencyRating as string) ?? (ans.examinerRating as string) ?? "",
      riskLevel: (sn.riskLevel as string) ?? "low",
      passageType: (sn.passageType as string) ?? (ans.passageType as string) ?? "",
      wordsRead: (sn.wordsRead as number | null) ?? null,
      errors: (sn.errors as number | null) ?? null,
      selfCorrections: (sn.selfCorrections as number | null) ?? null,
      hesitations: (sn.hesitations as number | null) ?? null,
      readingTimeSeconds: (sn.readingTimeSeconds as number | null) ?? null,
      interpretationText: (sn.interpretationText as string) ?? "",
      mode: (sn.mode as string) ?? (ans.mode as string) ?? "Unknown",
      generalNotes: (sn.generalNotes as string) ?? (ans.generalNotes as string) ?? "",
    });
  } else if (assignment.toolId === "RRCA") {
    const [rrcaScore] = await db.select().from(scoresTable)
      .where(and(eq(scoresTable.caseId, req.params.caseId), eq(scoresTable.toolId, "RRCA")))
      .limit(1);
    const sn = (rrcaScore?.notes ? JSON.parse(rrcaScore.notes as string) : {}) as Record<string, unknown>;
    const ans = responseRows[0].answers as Record<string, unknown>;
    const languageTrials = getRrcaLanguageTrialResults(ans as unknown as RrcaAnswers);
    const currentTrial = languageTrials[languageTrials.length - 1];
    const maxScore = currentTrial?.maxScore ?? (sn.maxScore as number) ?? 10;
    summary = await generateRrcaSummary({
      studentName: commonParams.studentName,
      school: commonParams.school,
      grade: commonParams.grade,
      rawScore: currentTrial?.rawScore ?? (sn.rawScore as number) ?? 0,
      maxScore,
      percentage: maxScore > 0 ? currentTrial?.percentage ?? (sn.percentage as number) ?? 0 : null,
      riskLevel: maxScore > 0 ? (sn.riskLevel as string) ?? "low" : "unscored",
      literalScore: currentTrial?.literalScore ?? (sn.literalScore as number) ?? 0,
      inferentialScore: currentTrial?.inferentialScore ?? (sn.inferentialScore as number) ?? 0,
      vocabularyScore: currentTrial?.vocabularyScore ?? (sn.vocabularyScore as number) ?? 0,
      literalItemsScored: currentTrial?.literalItemsScored ?? 0,
      inferentialItemsScored: currentTrial?.inferentialItemsScored ?? 0,
      vocabularyItemsScored: currentTrial?.vocabularyItemsScored ?? 0,
      passageTopic: (sn.passageTopic as string) ?? (ans.passageTopic as string) ?? "",
      passageDifficulty: (sn.passageDifficulty as string) ?? (ans.passageDifficulty as string) ?? "expected",
      interpretationText: (sn.interpretationText as string) ?? "",
      mode: (sn.mode as string) ?? (ans.mode as string) ?? "Unknown",
      generalNotes: (sn.generalNotes as string) ?? (ans.generalNotes as string) ?? "",
      languageTrials,
    });
  } else {
    const formItems = (toolRows[0]?.formItems as Array<{ id: string; text: string; type: string; options?: string[]; rows?: Array<{ id: string; text: string }> }>) ?? [];
    summary = await generateFormSummary({
      ...commonParams,
      toolId: assignment.toolId ?? "",
      toolName: assignment.toolName ?? toolRows[0]?.name ?? "Assessment Form",
      respondentType: assignment.respondentType ?? "unknown",
      formItems,
    });
  }

  await db.update(responsesTable)
    .set({ summary })
    .where(eq(responsesTable.id, responseRows[0].id));

  res.json({ summary });
});

router.post("/cases/:caseId/assignments/:assignmentId/response/translate", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const assignmentRows = await db.select().from(assignmentsTable)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .limit(1);
  if (!assignmentRows[0]) { res.status(404).json({ error: "not_found" }); return; }

  const responseRows = await db.select().from(responsesTable)
    .where(eq(responsesTable.assignmentId, req.params.assignmentId))
    .limit(1);
  if (!responseRows[0]) { res.status(404).json({ error: "not_found", message: "No response found" }); return; }

  const { language, answers } = responseRows[0];
  if (!language || language === "english") {
    res.json({ translatedAnswers: {} });
    return;
  }

  const translatedAnswers = await translateAnswersToEnglish(
    answers as Record<string, unknown>,
    language
  );
  res.json({ translatedAnswers });
});

router.delete("/cases/:caseId/assignments/:assignmentId", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }
  const rows = await db.delete(assignmentsTable)
    .where(and(eq(assignmentsTable.id, req.params.assignmentId), eq(assignmentsTable.caseId, req.params.caseId)))
    .returning();
  if (!rows[0]) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json({ success: true });
});

// POST /cases/:caseId/batteries/:batteryId/assign
// Creates one assignment per tool in the battery (bulk assign)
router.post("/cases/:caseId/batteries/:batteryId/assign", authMiddleware, async (req, res) => {
  if (!await checkCaseAccess(req.userRole!, req.userId!, req.params.caseId)) {
    res.status(403).json({ error: "forbidden", message: "Access denied" });
    return;
  }

  const [battery] = await db.select().from(batteriesTable).where(eq(batteriesTable.id, req.params.batteryId));
  if (!battery) {
    res.status(404).json({ error: "not_found", message: "Battery not found" });
    return;
  }

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, req.params.caseId)).limit(1);
  if (!caseRows[0]) {
    res.status(404).json({ error: "not_found", message: "Case not found" });
    return;
  }

  const { respondentLabel, assignedToName, assignedToEmail, dueDate } = req.body;
  const respondentType = normalizeAssignmentRespondentType(req.body.respondentType ?? "parent");
  if (!respondentType) {
    res.status(400).json({ error: "invalid_respondent_type", message: "Choose a valid respondent type for this battery." });
    return;
  }
  const toolIds = (battery.toolIds as string[]) ?? [];
  if (toolIds.some(id => isChineseLiteracy(id))) {
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, String(req.params.caseId))).limit(1);
    const grade = caseRow?.grade?.match(/(?:^|\D)(\d{1,2})(?:\D|$)/)?.[1];
    if (grade && (Number(grade) < 3 || Number(grade) > 12)) { res.status(422).json({ message: "Chinese literacy observation forms cover Grades 3–12." }); return; }
    if (req.userRole === "psychometrician" && caseRow?.assignedPsychId !== req.userId && caseRow?.assignedLeadId !== req.userId) { res.status(403).json({ message: "You are not assigned to this case." }); return; }
    if (req.userRole === "school_clinical_coordinator") {
      const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
      if (!user?.schoolName || user.schoolName !== caseRow?.school) { res.status(403).json({ message: "This case belongs to another school." }); return; }
    }
  }

  // Fetch tool names for label
  const tools = toolIds.length > 0
    ? await db.select({ id: assessmentToolsTable.id, name: assessmentToolsTable.name })
        .from(assessmentToolsTable)
    : [];
  const toolNameMap = new Map(tools.map(t => [t.id, t.name]));

  const baseUrl = getBaseUrl(req as unknown as Parameters<typeof getBaseUrl>[0]);
  const created = [];
  for (const toolId of toolIds) {
    if (!canAssignObservation(toolId, respondentType)) continue;
    if (isChineseLiteracy(toolId) && (isParentLiteracy(toolId) ? respondentType !== "parent" : !["teacher1", "teacher2", "special_needs_teacher"].includes(respondentType))) continue;
    if (toolId === "BEHAVOBS") {
      const existing = await db.select({ id: assignmentsTable.id }).from(assignmentsTable).where(and(
        eq(assignmentsTable.caseId, req.params.caseId),
        eq(assignmentsTable.toolId, toolId),
        eq(assignmentsTable.respondentType, "invigilator"),
      )).limit(1);
      if (existing.length) continue;
    }
    const token = crypto.randomBytes(24).toString("hex");
    const uniqueLink = `${baseUrl}/external/${token}`;
    const newAssignment = await db.insert(assignmentsTable).values({
      id: nanoid(),
      caseId: req.params.caseId,
      toolId,
      toolName: toolNameMap.get(toolId) ?? toolId,
      respondentType,
      respondentLabel: respondentLabel ?? respondentType,
      assignedToName: assignedToName ?? null,
      assignedToEmail: assignedToEmail ?? null,
      status: "not_started",
      uniqueToken: token,
      uniqueLink,
      qrCodeData: uniqueLink,
      dueDate: dueDate ? new Date(dueDate) : null,
    }).returning();
    created.push(newAssignment[0]);
    // Freeze the library's exact formItems + version into the assignment row
    try {
      const toolRes = await db.execute(sql`SELECT version_id, form_items FROM assessment_tools WHERE id = ${toolId}`);
      const toolRow = toolRes.rows?.[0] as any;
      const toolVersionId = toolRow?.version_id ?? null;
      const formItemsSnapshot = toolRow?.form_items ? JSON.stringify(toolRow.form_items) : null;
      if (newAssignment[0]) {
        await db.execute(sql`
          UPDATE assignments
          SET tool_version_id = ${toolVersionId}, form_items_snapshot = ${formItemsSnapshot}
          WHERE id = ${newAssignment[0].id}
        `);
      }
    } catch { /* optional */ }
    void writeAudit({
      eventType: "assignment.created",
      caseId: req.params.caseId,
      assignmentId: newAssignment[0]?.id,
      toolId,
      actorId: req.userId ?? null,
      actorRole: req.userRole ?? null,
      metadata: { respondentType, respondentLabel, assignedToName: assignedToName ?? null, batteryId: req.params.batteryId },
    });
  }

  res.status(201).json({ assignments: created, batteryId: battery.id, count: created.length });
});

// ── POST /api/cases/:caseId/assignments/reset-completed ──────────────────────
// Reset a list of completed assignments back to pending so they can be refilled
router.post("/cases/:caseId/assignments/reset-completed", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "psychometrician") {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const caseId = req.params.caseId;
  if (typeof caseId !== "string") {
    res.status(400).json({ error: "invalid_case_id" });
    return;
  }
  const { assignmentIds } = req.body as { assignmentIds: string[] };
  if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
    res.status(400).json({ error: "bad_request", message: "assignmentIds array is required" }); return;
  }

  const resetResult = await db.transaction(async tx => {
    const [caseRow] = await tx.select({ id: casesTable.id })
      .from(casesTable).where(eq(casesTable.id, caseId)).for("update").limit(1);
    if (!caseRow) return { kind: "reset" as const, count: 0 };

    // Lock only completed assignments that still belong to this case.
    const targets = await tx.select({ id: assignmentsTable.id, toolId: assignmentsTable.toolId })
      .from(assignmentsTable)
      .where(and(
        eq(assignmentsTable.caseId, caseId),
        inArray(assignmentsTable.id, assignmentIds),
        eq(assignmentsTable.status, "completed"),
      ))
      .for("update");
    if (targets.some(target => isChineseLiteracy(target.toolId))) {
      // The versioned observation record can only be reopened explicitly by
      // a professional reviewer. Resending a package cannot erase its input.
      return { kind: "reset" as const, count: 0, message: "Chinese literacy records are preserved. Use Return for revision in Chinese literacy review to reopen a record." };
    }
    if (targets.length === 0) return { kind: "reset" as const, count: 0 };

    const ids = targets.map(target => target.id);
    if (targets.some(target => !INTAKE_TOOL_IDS.has(target.toolId))) {
      const review = await getBatteryReview(caseId, tx, true);
      if (!review?.approved) return { kind: "approval_required" as const, review };
    }

    await tx.delete(responsesTable).where(inArray(responsesTable.assignmentId, ids));
    await tx.update(assignmentsTable)
      .set({ status: "pending" as any })
      .where(inArray(assignmentsTable.id, ids));
    return { kind: "reset" as const, count: ids.length };
  });

  if (resetResult.kind === "approval_required") {
    res.status(409).json({
      error: "battery_approval_required",
      message: "An administrator must approve the current assessment battery before completed assessment responses can be reset for sending.",
      review: resetResult.review,
    });
    return;
  }
  res.json({ reset: resetResult.count });
});

// ── POST /api/cases/:caseId/send-respondent-email ────────────────────────────
// Send one branded email to a respondent with their unique form link
router.post("/cases/:caseId/send-respondent-email", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "psychometrician") {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const caseId = req.params.caseId;
  if (typeof caseId !== "string") {
    res.status(400).json({ error: "invalid_case_id" });
    return;
  }

  const { toEmail, toName, formLink, formNames, studentName, respondentRole, assignmentIds } = req.body as {
    toEmail: string;
    toName: string;
    formLink: string;
    formNames: string[];
    studentName?: string;
    respondentRole?: string;
    assignmentIds?: string[];
  };

  if (!toEmail || !toName || !formLink || !Array.isArray(formNames)) {
    res.status(400).json({ error: "bad_request", message: "toEmail, toName, formLink, and formNames are required" }); return;
  }

  try {
    const sendResult = await db.transaction(async tx => {
      const [caseRow] = await tx.select({ id: casesTable.id, studentName: casesTable.studentName })
        .from(casesTable).where(eq(casesTable.id, caseId)).for("update").limit(1);
      if (!caseRow) return { kind: "not_found" as const };

      const invitationToken = tokenFromPortalLink(formLink);
      if (!invitationToken) return { kind: "invalid_form_link" as const, belongs: false };
      const [invitationAssignment] = await tx.select({
        id: assignmentsTable.id,
        toolId: assignmentsTable.toolId,
        uniqueLink: assignmentsTable.uniqueLink,
        uniqueToken: assignmentsTable.uniqueToken,
        respondentType: assignmentsTable.respondentType,
        respondentLabel: assignmentsTable.respondentLabel,
        assignedToEmail: assignmentsTable.assignedToEmail,
      }).from(assignmentsTable).where(and(
        eq(assignmentsTable.caseId, caseId),
        eq(assignmentsTable.uniqueToken, invitationToken),
      )).for("update").limit(1);
      if (!invitationAssignment || invitationAssignment.uniqueLink !== formLink) {
        return { kind: "invalid_form_link" as const, belongs: true };
      }

      const review = !INTAKE_TOOL_IDS.has(invitationAssignment.toolId)
        ? await getBatteryReview(caseId, tx, true) : null;
      const recipientRows = await tx.select({
        id: assignmentsTable.id, toolId: assignmentsTable.toolId, toolName: assignmentsTable.toolName,
        respondentType: assignmentsTable.respondentType, respondentLabel: assignmentsTable.respondentLabel,
        assignedToEmail: assignmentsTable.assignedToEmail,
        uniqueToken: assignmentsTable.uniqueToken, uniqueLink: assignmentsTable.uniqueLink,
      }).from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId));
      const readiness = selectReadyInvitationForms(recipientRows, invitationAssignment.id, assignmentIds, review);
      if ("error" in readiness) return { kind: "form_not_ready" as const, ...readiness };
      const selectedFormNames = readiness.assignments.map(row => row.toolName);
      const invitationLink = invitationAssignment.respondentType === "parent" && !INTAKE_TOOL_IDS.has(invitationAssignment.toolId)
        ? parentPortalLinkAfterRecipientUpdate(invitationAssignment, recipientRows.filter(row =>
          row.respondentType === "parent" && !INTAKE_TOOL_IDS.has(row.toolId)), toEmail)
        : formLink;
      if (!invitationLink) return { kind: "invalid_form_link" as const, belongs: true };

      const resolvedStudentName = studentName ?? caseRow.studentName ?? "the student";
      const formsListHtml = selectedFormNames.map(f => `<li style="margin-bottom:4px">${f}</li>`).join("");
      const roleLabel = respondentRole ?? "respondent";

      const html = `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1e293b">
  <div style="background:#0a1628;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
    <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.3px">ReMynd Student Services</p>
    <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Assessment Operating System</p>
  </div>
  <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
    <h2 style="margin:0 0 16px;font-size:18px;color:#0a1628">Hi ${toName},</h2>
    <p style="margin:0 0 12px;font-size:14px;color:#475569">
      As part of the psychoeducational assessment for <strong>${resolvedStudentName}</strong>, we are requesting your input as their <strong>${roleLabel}</strong>.
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#475569">Please complete the following form${selectedFormNames.length > 1 ? "s" : ""} at the link below:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#475569">${formsListHtml}</ul>
    <p style="margin:0 0 24px;font-size:14px;color:#475569">Each form takes just a few minutes. You can return to the same link at any time to continue or review your responses.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${invitationLink}" style="background:#1d4ed8;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Open My Forms ↗</a>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:12px;color:#94a3b8;text-align:center">ReMynd Student Services · Confidential<br/>This invitation was sent by our assessment team. Please do not share this link.</p>
  </div>
</div>`;

      // Dispatch while the case, assignments, and relevant form-key locks remain held.
      await sendEmail({ to: toEmail, subject: `Assessment Forms for ${resolvedStudentName} — ReMynd Student Services`, html });

      const anchor = await tx.select({
        id: assignmentsTable.id,
        respondentLabel: assignmentsTable.respondentLabel,
        assignedToEmail: assignmentsTable.assignedToEmail,
      }).from(assignmentsTable).where(and(
        eq(assignmentsTable.caseId, caseId),
        eq(assignmentsTable.uniqueToken, invitationToken),
      )).limit(1);
      if (anchor[0]) {
        // Match by email if stored, otherwise match by respondentLabel within this case.
        const siblings = anchor[0].assignedToEmail
          ? await tx.select({ id: assignmentsTable.id }).from(assignmentsTable)
              .where(and(eq(assignmentsTable.caseId, caseId), eq(assignmentsTable.assignedToEmail, anchor[0].assignedToEmail!)))
          : await tx.select({ id: assignmentsTable.id }).from(assignmentsTable)
              .where(and(eq(assignmentsTable.caseId, caseId), eq(assignmentsTable.respondentLabel, anchor[0].respondentLabel ?? ""),
                sql`COALESCE(${assignmentsTable.assignedToEmail}, '') = ''`));

        if (siblings.length > 0) {
          await tx.update(assignmentsTable)
            .set({ assignedToName: toName, assignedToEmail: toEmail })
            .where(inArray(assignmentsTable.id, siblings.map(sibling => sibling.id)));
        }
      }
      return { kind: "sent" as const };
    });

    if (sendResult.kind === "not_found") {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (sendResult.kind === "invalid_form_link") {
      res.status(400).json(sendResult.belongs
        ? { error: "invalid_form_link", message: "The invitation link must match an assignment in this case." }
        : { error: "invalid_form_link", message: "The invitation link must belong to an assignment in this case." });
      return;
    }
    if (sendResult.kind === "form_not_ready") {
      res.status(409).json({
        error: sendResult.error,
        message: sendResult.message,
      });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error("[send-respondent-email] SMTP error:", err?.message ?? err, "code:", err?.code, "response:", err?.response);
    res.status(502).json({ error: "send_failed", message: err?.message ?? "Email could not be sent. Please try again." });
  }
});

// GET /api/assignments/my-pending — returns invigilator's own pending forms
router.get("/assignments/my-pending", authMiddleware, async (req, res) => {
  const { userId } = req;
  const userRows = await db.select().from(usersTable).where(eq(usersTable.id, userId!)).limit(1);
  if (!userRows[0]) { res.status(404).json({ error: "user_not_found" }); return; }
  const email = userRows[0].email;

  const assignments = await db.select().from(assignmentsTable).where(
    and(
      eq(assignmentsTable.assignedToEmail, email),
      eq(assignmentsTable.respondentType, "invigilator"),
      ne(assignmentsTable.status, "completed"),
    )
  );

  if (assignments.length === 0) { res.json([]); return; }

  const caseIds = [...new Set(assignments.map(a => a.caseId))];
  const cases = caseIds.length === 1
    ? await db.select().from(casesTable).where(eq(casesTable.id, caseIds[0]))
    : await db.select().from(casesTable).where(inArray(casesTable.id, caseIds));
  const caseMap = new Map(cases.map(c => [c.id, c]));

  const result = assignments.map(a => ({
    id: a.id,
    caseId: a.caseId,
    studentName: caseMap.get(a.caseId)?.studentName ?? "Unknown",
    toolName: a.toolName,
    status: a.status,
    uniqueLink: a.uniqueLink,
    respondentType: a.respondentType,
    updatedAt: a.submittedAt ?? a.createdAt,
  }));

  res.json(result);
});

export default router;
