import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { assignmentsTable, responsesTable, casesTable, assessmentToolsTable, referralInvitesTable } from "@workspace/db/schema";
import { reportUploadsTable, reportTokensTable } from "@workspace/db/schema";
import { eq, and, or, ne, asc, sql } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { Readable } from "stream";
import { nanoid } from "nanoid";
import { SAMPLE_QUESTIONS, FormQuestion } from "../lib/questions.js";
import { buildTeacherEmail } from "../lib/emailTemplates.js";
import { getAdminEmails } from "../lib/adminEmails.js";
import { writeAudit } from "../lib/audit.js";
import * as airwallex from "../lib/airwallex.js";

const storage = new ObjectStorageService();

function resolveReportRole(respondentType: string | null): "parent" | "teacher" | null {
  if (!respondentType) return null;
  if (respondentType === "parent") return "parent";
  if (respondentType.startsWith("teacher")) return "teacher";
  return null;
}

const FORM_TYPES = ["REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING", "CONSENT", "INTAKE"];

const ITEM_TYPE_MAP: Record<string, string> = {
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
      required: item.required ?? false,
      note: item.note,
      noteChinese: item.noteChinese,
      noteKorean: item.noteKorean,
    }));
  }

  return SAMPLE_QUESTIONS[toolId] ?? SAMPLE_QUESTIONS["default"];
}

const router = Router();

router.get("/external/portal/:token", async (req, res) => {
  const portalToken = req.params.token;

  // ── Path A: token matches an assignment (normal portal link) ──────────────
  const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.uniqueToken, portalToken)).limit(1);
  const assignment = rows[0];

  if (assignment) {
    const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, assignment.caseId)).limit(1);
    const caseData = caseRows[0];

    // Group by respondentType + respondentLabel (exact match).
    // Empty-label assignments are backfilled at startup so they always carry
    // the correct label by the time a portal is opened.
    const anchorLabel = assignment.respondentLabel ?? "";
    const anchorType = assignment.respondentType;
    // When the portal is opened by a self-report respondent (or an invigilator acting
    // on their behalf), also include invigilator-type forms (e.g. ABO) for the same case
    // so the invigilator can complete their observation form in the same session.
    const typeCondition = anchorType === "self"
      ? or(eq(assignmentsTable.respondentType, "self"), eq(assignmentsTable.respondentType, "invigilator"))
      : eq(assignmentsTable.respondentType, anchorType);
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
          typeCondition,
          or(
            eq(assignmentsTable.respondentLabel, anchorLabel),
            eq(assignmentsTable.respondentType, "invigilator"),
          ),
        )
      );

    // Check if reports are available for this respondent
    let reportAccess: object | null = null;
    const reportPhases = ["report", "debrief", "complete"];
    if (caseData && reportPhases.includes(caseData.currentPhase ?? "")) {
      const reportRole = resolveReportRole(assignment.respondentType);
      if (reportRole) {
        const uploads = await db.select().from(reportUploadsTable).where(eq(reportUploadsTable.caseId, assignment.caseId));
        if (uploads.length > 0) {
          const [tok] = await db
            .select()
            .from(reportTokensTable)
            .where(and(eq(reportTokensTable.caseId, assignment.caseId), eq(reportTokensTable.role, reportRole)));
          if (tok) {
            reportAccess = {
              tokenId: tok.id,
              role: tok.role,
              files: uploads.map(u => ({ id: u.id, filename: u.filename, label: u.label, uploadedAt: u.uploadedAt })),
              downloadedAt: tok.downloadedAt,
              permissionGranted: tok.permissionGranted,
              adminOverride: tok.adminOverride,
              blocked: (tok.role === "teacher" || tok.role === "other") && !tok.permissionGranted && !tok.adminOverride,
              hasAccessCode: !!tok.accessCode,
            };
          }
        }
      }
    }

    // Map internal phases to the 5 phases visible to respondents
    const rawPhaseA = caseData?.currentPhase ?? "pre_commitment";
    const displayPhaseA =
      rawPhaseA === "pre_commitment" ? "intake"
      : rawPhaseA === "setup"        ? "intake"
      : rawPhaseA === "forms"        ? "intake"
      : rawPhaseA === "final_review" ? "debrief"
      : rawPhaseA === "complete"     ? "debrief"
      : rawPhaseA;

    res.json({
      studentName: caseData?.studentName ?? "the student",
      currentPhase: displayPhaseA,
      progressPercentage: caseData?.progressPercentage ?? 0,
      languagePreference: caseData?.languagePreference ?? "english",
      respondentLabel: assignment.respondentLabel,
      respondentType: assignment.respondentType,
      assignedToName: assignment.assignedToName ?? null,
      forms: siblings.map(s => ({
        toolId: s.toolId,
        toolName: s.toolName,
        status: s.status,
        uniqueToken: s.uniqueToken,
      })),
      reportAccess,
      debriefMeetingUrl: caseData?.debriefMeetingUrl ?? null,
      debriefMeetingDate: caseData?.debriefMeetingDate ?? null,
      bobbyAiPortalCredentials: caseData?.bobbyAiPortalCredentials ?? null,
    });
    return;
  }

  // ── Path B: token matches a report token (report-only link from email) ────
  const [reportTok] = await db
    .select()
    .from(reportTokensTable)
    .where(eq(reportTokensTable.token, portalToken))
    .limit(1);

  if (reportTok) {
    const [caseData] = await db.select().from(casesTable).where(eq(casesTable.id, reportTok.caseId)).limit(1);
    const uploads = await db.select().from(reportUploadsTable).where(eq(reportUploadsTable.caseId, reportTok.caseId));

    const reportAccess = uploads.length > 0 ? {
      tokenId: reportTok.id,
      role: reportTok.role,
      files: uploads.map(u => ({ id: u.id, filename: u.filename, label: u.label, uploadedAt: u.uploadedAt })),
      downloadedAt: reportTok.downloadedAt,
      hasAccessCode: !!reportTok.accessCode,
      permissionGranted: reportTok.permissionGranted,
      adminOverride: reportTok.adminOverride,
      blocked: (reportTok.role === "teacher" || reportTok.role === "other") && !reportTok.permissionGranted && !reportTok.adminOverride,
    } : null;

    // Map internal phases to the 5 phases visible to respondents
    const rawPhase = caseData?.currentPhase ?? "debrief";
    const displayPhase =
      rawPhase === "pre_commitment" ? "intake"
      : rawPhase === "setup"        ? "intake"
      : rawPhase === "forms"        ? "intake"
      : rawPhase === "final_review" ? "debrief"
      : rawPhase === "complete"     ? "debrief"
      : rawPhase;

    res.json({
      studentName: caseData?.studentName ?? "the student",
      currentPhase: displayPhase,
      progressPercentage: caseData?.progressPercentage ?? 100,
      languagePreference: caseData?.languagePreference ?? "english",
      respondentLabel: reportTok.role === "parent" ? "Parent / Guardian" : reportTok.role === "teacher" ? "Teacher" : (reportTok.recipientName ?? "Recipient"),
      respondentType: reportTok.role,
      forms: [],
      reportAccess,
      debriefMeetingUrl: caseData?.debriefMeetingUrl ?? null,
      debriefMeetingDate: caseData?.debriefMeetingDate ?? null,
      bobbyAiPortalCredentials: (caseData as any)?.bobbyAiPortalCredentials ?? null,
    });
    return;
  }

  // ── Path C: token matches a referral invite (no case yet) ────────────────
  const [invite] = await db
    .select()
    .from(referralInvitesTable)
    .where(eq(referralInvitesTable.token, portalToken))
    .limit(1);

  if (invite) {
    const FORM_LABELS: Record<string, string> = {
      "REFERRAL":          "Referral Form — School",
      "REFERRAL-CORP":     "Referral Form — Corporate",
      "REFERRAL-UNI":      "Referral Form — University",
      "REFERRAL-PARENT":   "Referral Form — Parent",
      "REFERRAL-BOARDING": "Referral Form — Boarding School",
    };
    const forms = [
      { toolId: invite.formId, toolName: FORM_LABELS[invite.formId] ?? "Referral Form", status: invite.usedAt ? "completed" : "not_started", uniqueToken: invite.token },
      ...(invite.includeConsent && !invite.usedAt
        ? [{ toolId: "CONSENT", toolName: "Consent Form", status: "not_started" as const, uniqueToken: `${invite.token}__consent` }]
        : []),
    ];
    res.json({
      studentName: "the student",
      currentPhase: "intake",
      progressPercentage: 0,
      languagePreference: "english",
      respondentLabel: "Referring Teacher",
      respondentType: "referring_teacher",
      forms,
      reportAccess: null,
      debriefMeetingUrl: null,
      debriefMeetingDate: null,
      isInvite: true,
    });
    return;
  }

  res.status(404).json({ error: "not_found", message: "Form link not found" });
});

// Verify access code for a report token
router.post("/external/report/:tokenId/verify", async (req, res) => {
  const [tok] = await db.select().from(reportTokensTable).where(eq(reportTokensTable.id, req.params.tokenId));
  if (!tok) { res.status(404).json({ error: "not_found" }); return; }
  if (!tok.accessCode) { res.json({ ok: true }); return; }
  const { code } = req.body as { code?: string };
  if (!code || code.trim() !== tok.accessCode) {
    res.status(401).json({ error: "invalid_code", message: "Incorrect access code." });
    return;
  }
  res.json({ ok: true });
});

// Download report via portal token (records the download event)
// Optional ?uploadId=... to download a specific file; defaults to most recent
router.get("/external/report/:tokenId/download", async (req, res) => {
  const [tok] = await db.select().from(reportTokensTable).where(eq(reportTokensTable.id, req.params.tokenId));
  if (!tok) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  // Check access code if one is set
  if (tok.accessCode) {
    const providedCode = (req.headers["x-access-code"] as string | undefined)?.trim();
    if (!providedCode || providedCode !== tok.accessCode) {
      res.status(401).json({ error: "access_code_required", message: "A valid access code is required to download this report." });
      return;
    }
  }

  if ((tok.role === "teacher" || tok.role === "other") && !tok.permissionGranted && !tok.adminOverride) {
    res.status(403).json({ error: "awaiting_consent", message: "Parent consent is required before downloading." });
    return;
  }

  const { uploadId } = req.query as { uploadId?: string };
  const allUploads = await db.select().from(reportUploadsTable)
    .where(eq(reportUploadsTable.caseId, tok.caseId))
    .orderBy(asc(reportUploadsTable.uploadedAt));

  const upload = uploadId
    ? allUploads.find(u => u.id === uploadId)
    : allUploads[allUploads.length - 1];

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
    res.setHeader("Content-Type", "application/octet-stream");
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
  // Update the parent token
  await db.update(reportTokensTable)
    .set({ permissionGranted: granted, permissionGrantedAt: new Date(), updatedAt: new Date() })
    .where(eq(reportTokensTable.id, tok.id));

  // Also unlock / re-lock all teacher and other tokens for this case so they reflect the parent's decision
  await db.update(reportTokensTable)
    .set({ permissionGranted: granted, permissionGrantedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(reportTokensTable.caseId, tok.caseId),
      sql`${reportTokensTable.role} IN ('teacher', 'other')`
    ));

  const { sendEmail } = await import("../lib/outlookEmail.js");
  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, tok.caseId));
  const studentName = caseRow?.studentName ?? "Unknown Student";
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const host = req.headers.host as string ?? "localhost";
  const base = `${proto}://${host}`;

  if (granted) {
    // Find and notify the teacher with their download link
    try {
      const [teacherTok] = await db
        .select()
        .from(reportTokensTable)
        .where(and(eq(reportTokensTable.caseId, tok.caseId), eq(reportTokensTable.role, "teacher")));

      const isTestPreview = tok.recipientName === "TEST PREVIEW (admin)";

      if (teacherTok) {
        const teacherLink = `${base}/external/${teacherTok.token}`;
        const debriefJoinUrl = caseRow?.debriefMeetingUrl ? `${base}/join/debrief?type=debrief&student=${encodeURIComponent(studentName)}&redirectUrl=${encodeURIComponent(caseRow.debriefMeetingUrl)}` : null;
        const teacherEmailHtml = buildTeacherEmail(studentName, teacherLink, debriefJoinUrl, caseRow?.debriefMeetingDate ?? null);
        const teacherTestBanner = isTestPreview
          ? `<div style="background:#ede9fe;border:2px dashed #7c3aed;border-radius:8px;padding:14px 18px;margin-bottom:28px;font-family:sans-serif">
              <p style="margin:0;font-size:14px;font-weight:700;color:#4c1d95">⚠️ ADMIN TEST PREVIEW — Step 2 of 2: School / Teacher Email</p>
              <p style="margin:6px 0 0;font-size:12px;color:#6d28d9">This is exactly what the teacher receives once the parent grants consent. The download button below is a real working link to the teacher portal — no access code is required for teachers.</p>
            </div>`
          : "";
        await sendEmail({
          to: isTestPreview ? tok.email : teacherTok.email,
          subject: isTestPreview
            ? `[TEST — Teacher] Assessment Report Now Available — ${studentName}`
            : `Assessment Report Available — ${studentName}`,
          html: teacherTestBanner + teacherEmailHtml,
        });
      } else if (isTestPreview) {
        // No permanent teacher token yet — create a real temporary test teacher token so the admin
        // can experience the complete end-to-end flow including actually downloading the report.
        const testTeacherToken = randomUUID();
        await db.insert(reportTokensTable).values({
          id: randomUUID(),
          caseId: tok.caseId,
          role: "teacher",
          email: tok.email,
          token: testTeacherToken,
          accessCode: null,
          recipientName: "TEST PREVIEW (admin)",
          sentAt: new Date(),
          permissionGranted: true,
          permissionGrantedAt: new Date(),
        });
        const teacherLink = `${base}/external/${testTeacherToken}`;
        const teacherTestBanner = `<div style="background:#ede9fe;border:2px dashed #7c3aed;border-radius:8px;padding:14px 18px;margin-bottom:28px;font-family:sans-serif">
          <p style="margin:0;font-size:14px;font-weight:700;color:#4c1d95">⚠️ ADMIN TEST PREVIEW — Step 2 of 2: School / Teacher Email</p>
          <p style="margin:6px 0 0;font-size:12px;color:#6d28d9">This is exactly what the school receives once the parent grants consent. The "Download Report" button below is a real, working link — click it to experience the full teacher flow. No access code is required.</p>
        </div>`;
        await sendEmail({
          to: tok.email,
          subject: `[TEST — Teacher] Assessment Report Now Available — ${studentName}`,
          html: teacherTestBanner + buildTeacherEmail(studentName, teacherLink, caseRow?.debriefMeetingUrl ? `${base}/join/debrief?type=debrief&student=${encodeURIComponent(studentName)}&redirectUrl=${encodeURIComponent(caseRow.debriefMeetingUrl)}` : null, caseRow?.debriefMeetingDate ?? null),
        });
      }
    } catch (_) {}
  } else {
    // Parent withheld — notify admins
    try {
      const html = `<p>The parent/guardian for <strong>${studentName}</strong> has chosen <strong>Not Yet</strong> when asked whether to share the psychoeducational report with their school.</p><p>No school access has been granted at this time. You may use the admin override in RAOS if required.</p>`;
      const adminEmails = await getAdminEmails();
      for (const adminEmail of adminEmails) {
        await sendEmail({ to: adminEmail, subject: `Parent withheld school consent — ${studentName}`, html });
      }
    } catch (_) {}
  }

  res.json({ ok: true });
});

router.get("/external/form/:token", async (req, res) => {
  const rawToken = req.params.token;

  // ── Standard assignment token (checked first — takes priority after invite is submitted) ──
  const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.uniqueToken, rawToken)).limit(1);
  const assignment = rows[0];

  if (!assignment) {
    // ── Fallback: referral invite token (no case created yet) ────────────────
    const isConsentSuffix = rawToken.endsWith("__consent");
    const baseToken = isConsentSuffix ? rawToken.replace(/__consent$/, "") : rawToken;
    const [invite] = await db.select().from(referralInvitesTable).where(eq(referralInvitesTable.token, baseToken)).limit(1);
    if (invite) {
      const toolId = isConsentSuffix ? "CONSENT" : invite.formId;
      const FORM_LABELS: Record<string, string> = {
        "REFERRAL":          "Referral Form — School",
        "REFERRAL-CORP":     "Referral Form — Corporate",
        "REFERRAL-UNI":      "Referral Form — University",
        "REFERRAL-PARENT":   "Referral Form — Parent",
        "REFERRAL-BOARDING": "Referral Form — Boarding School",
        "CONSENT":           "Consent Form",
      };
      const formType = FORM_TYPES.includes(toolId) ? toolId : "screener";
      const questions = await resolveQuestions(toolId);
      // Block consent form access if the referral hasn't been submitted yet
      const lockedPendingReferral = isConsentSuffix && !invite.usedAt;
      res.json({
        assignmentId: rawToken,
        toolId,
        formType,
        toolName: FORM_LABELS[toolId] ?? toolId,
        respondentLabel: "Referring Teacher",
        studentName: "the student",
        language: "english",
        questions,
        alreadySubmitted: !!invite.usedAt,
        lockedPendingReferral,
        isInvite: true,
      });
      return;
    }
    res.status(404).json({ error: "not_found", message: "Form link not found or has expired" });
    return;
  }

  const caseRows = await db.select().from(casesTable).where(eq(casesTable.id, assignment.caseId)).limit(1);
  const caseData = caseRows[0];

  const responseRows = await db.select().from(responsesTable).where(eq(responsesTable.assignmentId, assignment.id)).limit(1);
  const alreadySubmitted = responseRows.length > 0;

  const toolId = assignment.toolId;
  const formType = FORM_TYPES.includes(toolId) ? toolId : "screener";

  // Use the frozen snapshot stored at assignment-creation time so the respondent
  // always sees the exact form that was in the library when the link was sent —
  // even if the library is later updated by an admin.
  let questions: Awaited<ReturnType<typeof resolveQuestions>>;
  const snapRow = await db.execute(sql`SELECT form_items_snapshot FROM assignments WHERE id = ${assignment.id}`);
  const snapshotJson = (snapRow.rows?.[0] as any)?.form_items_snapshot ?? null;
  if (snapshotJson) {
    try {
      const stored = JSON.parse(snapshotJson) as StoredFormItem[];
      questions = stored.map(item => ({
        id: item.id,
        text: item.text,
        textChinese: item.textChinese,
        textKorean: item.textKorean,
        type: (ITEM_TYPE_MAP[item.type] ?? item.type) as FormQuestion["type"],
        options: item.options,
        optionsChinese: item.optionsChinese,
        optionsKorean: item.optionsKorean,
        domain: item.domain ?? "",
        required: item.required ?? false,
        note: item.note,
        noteChinese: item.noteChinese,
        noteKorean: item.noteKorean,
      }));
    } catch {
      questions = await resolveQuestions(toolId);
    }
  } else {
    questions = await resolveQuestions(toolId);
  }

  if (!alreadySubmitted) {
    void writeAudit({
      eventType: "form.opened",
      caseId: assignment.caseId,
      assignmentId: assignment.id,
      toolId,
      ipAddress: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? null,
      metadata: { toolName: assignment.toolName, respondentLabel: assignment.respondentLabel },
    });
  }

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
    isExaminerAdministered: toolId === "RPPI",
  });
});

router.post("/external/form/:token/submit", async (req, res) => {
  const rawToken = req.params.token;
  const { answers, language } = req.body;

  // ── Standard assignment path (checked first — handles post-submission consent) ─
  const existingAssignmentRows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.uniqueToken, rawToken)).limit(1);
  if (existingAssignmentRows[0]) {
    const assignment = existingAssignmentRows[0];
    await db.insert(responsesTable).values({ id: nanoid(), assignmentId: assignment.id, answers: answers ?? {}, language: language ?? "english" });
    await db.update(assignmentsTable).set({ status: "completed", submittedAt: new Date() }).where(eq(assignmentsTable.id, assignment.id));
    void writeAudit({
      eventType: "response.submitted",
      caseId: assignment.caseId,
      assignmentId: assignment.id,
      toolId: assignment.toolId,
      ipAddress: (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? null,
      metadata: { language: language ?? "english" },
    });
    const groupByEmail = !!assignment.assignedToEmail;
    const siblings = await db.select({ toolName: assignmentsTable.toolName, uniqueToken: assignmentsTable.uniqueToken, respondentLabel: assignmentsTable.respondentLabel })
      .from(assignmentsTable)
      .where(and(
        eq(assignmentsTable.caseId, assignment.caseId),
        groupByEmail ? eq(assignmentsTable.assignedToEmail, assignment.assignedToEmail!) : and(eq(assignmentsTable.respondentType, assignment.respondentType), eq(assignmentsTable.respondentLabel, assignment.respondentLabel ?? "")),
        ne(assignmentsTable.id, assignment.id),
        ne(assignmentsTable.status, "completed"),
      ));
    res.json({ success: true, message: "Thank you! Your response has been submitted.", nextForms: siblings });
    return;
  }

  // ── Invite token path — create case + assignments on first real submission ─
  const isConsentSuffix = rawToken.endsWith("__consent");
  const baseToken = isConsentSuffix ? rawToken.replace(/__consent$/, "") : rawToken;

  const [invite] = await db.select().from(referralInvitesTable).where(eq(referralInvitesTable.token, baseToken)).limit(1);

  if (invite) {
    if (invite.usedAt) {
      res.json({ success: true, message: "This form has already been submitted. Thank you!", nextForms: [] });
      return;
    }

    // Block consent submission if the referral form hasn't been submitted yet
    if (isConsentSuffix) {
      res.status(400).json({
        error: "referral_required",
        message: "The referral form must be completed before submitting the consent form. Please go back and complete the referral form first.",
      });
      return;
    }

    const { randomBytes } = await import("crypto");
    const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
    const host  = (req.headers.host as string) ?? "localhost";
    const baseUrl = `${proto}://${host}`;

    const FORM_LABELS: Record<string, string> = {
      "REFERRAL":          "Referral Form — School",
      "REFERRAL-CORP":     "Referral Form — Corporate",
      "REFERRAL-UNI":      "Referral Form — University",
      "REFERRAL-PARENT":   "Referral Form — Parent",
      "REFERRAL-BOARDING": "Referral Form — Boarding School",
      "CONSENT":           "Consent Form",
    };

    // Extract student info from consent answers if consent was submitted first
    const consentAnswers = isConsentSuffix ? (answers ?? {}) as Record<string, string> : {};
    const consentFirstName = (consentAnswers.student_first_name ?? "").trim();
    const consentLastName  = (consentAnswers.student_last_name  ?? "").trim();
    const consentStudentName = [consentFirstName, consentLastName].filter(Boolean).join(" ") || "Referral Pending";
    const consentDob         = consentAnswers.student_dob   || "TBD";
    const consentGuardian    = consentAnswers.guardian_name  || undefined;
    const consentEmail       = consentAnswers.student_email  || undefined;

    // Create the case
    const caseId = nanoid();
    await db.insert(casesTable).values({
      id: caseId,
      studentName: consentStudentName,
      dob: consentDob,
      school: invite.schoolName || "TBD",
      grade: null,
      referralReason: `Referral form submitted by ${invite.toName} (${invite.toEmail})`,
      currentPhase: "pre_commitment",
      progressPercentage: 0,
      caseStatus: "active",
      ...(consentGuardian ? { parentName: consentGuardian } : {}),
      ...(consentEmail    ? { parentEmail: consentEmail }   : {}),
    });

    // Create the referral assignment (completed immediately)
    const referralToken = baseToken;
    const referralAssignmentId = nanoid();
    await db.insert(assignmentsTable).values({
      id: referralAssignmentId,
      caseId,
      toolId: invite.formId,
      toolName: FORM_LABELS[invite.formId] ?? "Referral Form",
      respondentType: "referring_teacher",
      respondentLabel: "Referring Teacher",
      assignedToName: invite.toName,
      assignedToEmail: invite.toEmail,
      uniqueToken: referralToken,
      uniqueLink: `${baseUrl}/external/${referralToken}`,
      qrCodeData: `${baseUrl}/external/${referralToken}`,
      status: "completed",
      submittedAt: new Date(),
      dueDate: null,
    });

    // Store the response for the referral form (if this is the referral submission)
    const submittedToolId = isConsentSuffix ? "CONSENT" : invite.formId;
    let submittedAssignmentId = referralAssignmentId;

    if (isConsentSuffix) {
      // Consent submitted — create consent assignment as well
      const consentToken = randomBytes(24).toString("hex");
      submittedAssignmentId = nanoid();
      await db.insert(assignmentsTable).values({
        id: submittedAssignmentId,
        caseId,
        toolId: "CONSENT",
        toolName: "Consent Form",
        respondentType: "referring_teacher",
        respondentLabel: "Referring Teacher",
        assignedToName: invite.toName,
        assignedToEmail: invite.toEmail,
        uniqueToken: consentToken,
        uniqueLink: `${baseUrl}/external/${consentToken}`,
        qrCodeData: `${baseUrl}/external/${consentToken}`,
        status: "completed",
        submittedAt: new Date(),
        dueDate: null,
      });
    } else if (invite.includeConsent) {
      // Create pending consent assignment
      const consentToken = randomBytes(24).toString("hex");
      await db.insert(assignmentsTable).values({
        id: nanoid(),
        caseId,
        toolId: "CONSENT",
        toolName: "Consent Form",
        respondentType: "referring_teacher",
        respondentLabel: "Referring Teacher",
        assignedToName: invite.toName,
        assignedToEmail: invite.toEmail,
        uniqueToken: `${baseToken}__consent`,
        uniqueLink: `${baseUrl}/external/${baseToken}__consent`,
        qrCodeData: `${baseUrl}/external/${baseToken}__consent`,
        status: "not_started",
        dueDate: null,
      });
    }

    // Store the actual form answers
    await db.insert(responsesTable).values({
      id: nanoid(),
      assignmentId: submittedAssignmentId,
      answers: answers ?? {},
      language: language ?? "english",
    });

    // Mark invite as used
    await db.update(referralInvitesTable).set({
      usedAt: new Date(),
      resultingCaseId: caseId,
    }).where(eq(referralInvitesTable.token, baseToken));

    // Determine next form (consent still pending)
    const nextForms = !isConsentSuffix && invite.includeConsent
      ? [{ toolName: "Consent Form", uniqueToken: `${baseToken}__consent`, respondentLabel: "Referring Teacher" }]
      : [];

    res.json({ success: true, message: "Thank you! Your response has been submitted.", nextForms });
    return;
  }

  // Token not found in assignments or invites
  res.status(404).json({ error: "not_found", message: "Form link not found" });
});

// ── AI: resolve case from any portal token ────────────────────────────────────
async function getCaseFromPortalToken(token: string): Promise<{ caseId: string; role: string } | null> {
  const [assignment] = await db.select({ caseId: assignmentsTable.caseId, respondentType: assignmentsTable.respondentType })
    .from(assignmentsTable).where(eq(assignmentsTable.uniqueToken, token)).limit(1);
  if (assignment) return { caseId: assignment.caseId, role: assignment.respondentType ?? "parent" };
  const [tok] = await db.select({ caseId: reportTokensTable.caseId, role: reportTokensTable.role })
    .from(reportTokensTable).where(eq(reportTokensTable.token, token)).limit(1);
  if (tok) return { caseId: tok.caseId, role: tok.role };
  return null;
}

async function callDeepSeekChat(systemPrompt: string, messages: Array<{ role: string; content: string }>, maxTokens = 1200): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");
  const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });
  if (!resp.ok) throw new Error(`DeepSeek error ${resp.status}: ${await resp.text()}`);
  const data = await resp.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

// ── AI: generate dynamic prompts for this child's specific profile ────────────
router.get("/external/portal/:token/prompts", async (req, res) => {
  const info = await getCaseFromPortalToken(req.params.token);
  if (!info) { res.status(404).json({ error: "not_found" }); return; }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, info.caseId)).limit(1);
  if (!caseRow) { res.status(404).json({ error: "not_found" }); return; }

  const role = (req.query.role as string) === "teacher" ? "teacher" : "parent";
  const rawLang = (req.query.language as string) ?? "english";
  const langLabel = rawLang === "mandarin" ? "Simplified Chinese (Mandarin)" : rawLang === "korean" ? "Korean" : "English";
  const intake = caseRow.intakeAnalysis as any;
  const domains: string[] = Array.isArray(intake?.recommendedDomains) ? intake.recommendedDomains : [];
  const flags: string[] = Array.isArray(intake?.flags) ? intake.flags : [];
  const summary: string = intake?.summary ?? "";

  const systemPrompt = `You are a specialist helping ${role === "parent" ? "a parent" : "a teacher"} understand a child's psychoeducational assessment report.
Generate 6 practical, specific suggested questions this ${role} might want to ask about the child's assessment results.
The questions must be directly relevant to this child's specific profile — NOT generic.
For parents: focus on home strategies, conversations with the child, emotional support, explaining results to the child.
For teachers: focus on classroom accommodations, intervention strategies, communication with parents, seating/grouping, curriculum adjustments.
IMPORTANT: Write ALL 6 questions in ${langLabel}. Do not use any other language.
Return ONLY a JSON array of 6 strings. No markdown, no explanation.`;

  const userMsg = `Child: ${caseRow.studentName}, Grade: ${caseRow.grade ?? "not specified"}, School: ${caseRow.school}
Referral reason: ${caseRow.referralReason}
Key areas of concern: ${domains.join(", ") || "general learning and behaviour"}
Clinical flags: ${flags.join("; ") || "none noted"}
Summary: ${summary}
Role: ${role}`;

  try {
    const raw = await callDeepSeekChat(systemPrompt, [{ role: "user", content: userMsg }], 600);
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    const arrStart = cleaned.indexOf("[");
    const arrEnd = cleaned.lastIndexOf("]");
    const prompts = arrStart !== -1 ? JSON.parse(cleaned.slice(arrStart, arrEnd + 1)) : [];
    res.json({ prompts: Array.isArray(prompts) ? prompts.slice(0, 6) : [] });
  } catch {
    res.json({ prompts: [] });
  }
});

// ── AI: chat about the report ─────────────────────────────────────────────────
router.post("/external/portal/:token/chat", async (req, res) => {
  const info = await getCaseFromPortalToken(req.params.token);
  if (!info) { res.status(404).json({ error: "not_found" }); return; }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, info.caseId)).limit(1);
  if (!caseRow) { res.status(404).json({ error: "not_found" }); return; }

  const { message, history, role: reqRole, language: reqLang } = req.body as {
    message: string;
    history: Array<{ role: string; content: string }>;
    role?: string;
    language?: string;
  };
  if (!message?.trim()) { res.status(400).json({ error: "message required" }); return; }

  const role = reqRole === "teacher" ? "teacher" : "parent";
  const rawLang = reqLang ?? "english";
  const langLabel = rawLang === "mandarin" ? "Simplified Chinese (Mandarin)" : rawLang === "korean" ? "Korean" : "English";
  const intake = caseRow.intakeAnalysis as any;
  const domains: string[] = Array.isArray(intake?.recommendedDomains) ? intake.recommendedDomains : [];
  const summary: string = intake?.summary ?? "";
  const flags: string[] = Array.isArray(intake?.flags) ? intake.flags : [];

  const systemPrompt = `You are a warm, knowledgeable educational psychologist AI helping ${role === "parent" ? "a parent" : "a teacher"} understand and act on the psychoeducational assessment report for ${caseRow.studentName}.

STUDENT PROFILE:
- Name: ${caseRow.studentName}
- Grade: ${caseRow.grade ?? "not specified"}
- School: ${caseRow.school}
- Referral reason: ${caseRow.referralReason}
- Key areas assessed: ${domains.join(", ") || "general learning and behaviour"}
- Clinical summary: ${summary}
- Notable flags: ${flags.join("; ") || "none"}

YOUR ROLE:
${role === "parent"
  ? "Help this parent understand what the results mean for their child at home and in daily life. Give practical, caring advice about how to support their child, have positive conversations with them about the results, and implement recommended strategies at home."
  : "Help this teacher understand the assessment findings and how to translate them into classroom practice. Give concrete, evidence-based suggestions for accommodations, seating, instruction strategies, intervention approaches, and communication with parents."}

HARD LIMIT — LESSON & ASSIGNMENT SUPPORT:
You must detect and redirect ANY request that is about supporting a child through a specific lesson, assignment, subject area, or academic task — regardless of how it is phrased. This includes (but is not limited to):
- "Can you generate a support guide for this lesson…"
- "How can I help my child with [subject/task/assignment]?"
- "Is there a strategy for [specific academic skill or topic]?"
- "I need help with [a lesson / homework / assignment / worksheet]"
- "What strategies work for teaching [topic]?"
- "Can you adapt this lesson for my child?"
- "How should I explain [concept] to my child?"
- "What activities can I do at home for [subject]?"
- Any request that includes a lesson description, assignment text, or specific academic content for you to respond to

When you detect any of these, you must NOT provide strategies, guides, activities, or advice about that specific task. Instead, respond warmly in one short paragraph: acknowledge what they're looking for, explain that personalised lesson and assignment support is handled by the ReMynd Learning Support Coach™ (a dedicated premium tool that analyses each specific lesson or assignment against the child's assessment profile to produce a structured support guide), and direct them to use the "Learning Support Coach™" button on their portal. Do not provide the content even partially or as a "quick example."

EXCEPTION — you MAY answer general questions about the assessment results, understanding the child's profile, emotional support, how to have conversations with the child, or how to work with the school — as long as the user is NOT asking about a specific lesson, assignment, or subject task.

GUIDELINES:
- Be warm, practical, and encouraging — never clinical or alarming
- Use plain language, avoid jargon; if you must use a term, explain it simply
- Keep responses concise (3-5 short paragraphs max)
- Always end with one concrete next step they can take today
- Do NOT provide a diagnosis; this is a screening report, use language like "the results suggest..." or "the assessment indicates..."`;

  const messages = [
    ...(Array.isArray(history) ? history.slice(-8) : []),
    { role: "user", content: message.trim() },
  ];

  try {
    const reply = await callDeepSeekChat(systemPrompt, messages, 800);
    res.json({ reply });
  } catch {
    res.status(500).json({ error: "ai_error", reply: "I'm sorry, I could not process your question right now. Please try again." });
  }
});

// ── AI: differentiate a lesson/assignment ─────────────────────────────────────
router.post("/external/portal/:token/differentiate", async (req, res) => {
  const info = await getCaseFromPortalToken(req.params.token);
  if (!info) { res.status(404).json({ error: "not_found" }); return; }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, info.caseId)).limit(1);
  if (!caseRow) { res.status(404).json({ error: "not_found" }); return; }

  const { content, language: reqLang, role: reqRole } = req.body as {
    content: string; language?: string; role?: string;
  };
  if (!content?.trim()) { res.status(400).json({ error: "content required" }); return; }

  const role = reqRole === "teacher" ? "teacher" : reqRole === "tutor" ? "tutor" : "parent";
  const rawLang = reqLang ?? "english";
  const langLabel = rawLang === "mandarin" ? "Simplified Chinese (Mandarin)" : rawLang === "korean" ? "Korean" : "English";
  const intake = caseRow.intakeAnalysis as any;
  const domains: string[] = Array.isArray(intake?.recommendedDomains) ? intake.recommendedDomains : [];
  const summary: string = intake?.summary ?? "";
  const flags: string[] = Array.isArray(intake?.flags) ? intake.flags : [];

  const roleContext = role === "parent" ? "a parent helping their child at home"
    : role === "tutor" ? "a private tutor working 1-on-1 with the child"
    : "a classroom teacher";
  const strategyContext = role === "parent" ? "home support strategies"
    : role === "tutor" ? "1-on-1 tutoring strategies"
    : "classroom delivery strategies";

  const systemPrompt = `You are a specialist educational psychologist AI helping ${roleContext} support a child with a specific learning task.

STUDENT PROFILE:
- Name: ${caseRow.studentName}
- Grade: ${caseRow.grade ?? "not specified"}
- Referral reason: ${caseRow.referralReason}
- Key areas of concern: ${domains.join(", ") || "general learning and behaviour"}
- Clinical summary: ${summary}
- Notable flags: ${flags.join("; ") || "none"}

YOUR TASK:
Analyse the provided assignment/homework/lesson and produce a personalised support plan for THIS child specifically.
Return a JSON object with exactly these 5 keys:
{
  "overview": "2-3 sentences explaining what this task requires cognitively and why it may specifically challenge this child based on their profile",
  "challenges": "3-5 specific challenges THIS child is likely to face with this exact task. Each on a new line starting with •",
  "strategies": "4-6 concrete, practical ${strategyContext} for this specific task. Each on a new line starting with •",
  "stepByStep": "A simplified numbered step-by-step guide for working through this task with the child. Each step on its own line",
  "language": "Specific phrases and language to USE and AVOID when working through this task. Format each as: USE: [example phrase] or AVOID: [example phrase], one per line"
}

Write ALL content in ${langLabel}. Plain language only — no jargon. Be warm, encouraging, and highly specific to this child's profile and this exact task.
Return ONLY valid JSON. No markdown code fences. No explanation outside the JSON object.`;

  try {
    const raw = await callDeepSeekChat(
      systemPrompt,
      [{ role: "user", content: `Assignment/homework/lesson content:\n\n${content.trim().slice(0, 4000)}` }],
      2000,
    );
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    const objStart = cleaned.indexOf("{");
    const objEnd = cleaned.lastIndexOf("}");
    if (objStart === -1 || objEnd === -1) throw new Error("No JSON in response");
    const parsed = JSON.parse(cleaned.slice(objStart, objEnd + 1)) as Record<string, string>;
    const required = ["overview", "challenges", "strategies", "stepByStep", "language"];
    for (const k of required) if (!parsed[k]) throw new Error(`Missing field: ${k}`);
    res.json({ sections: parsed });
  } catch {
    res.status(500).json({ error: "ai_error", message: "Could not generate support plan. Please try again." });
  }
});

// ── Portal credential login ───────────────────────────────────────────────────
// POST /api/external/portal-login
// Body: { caseId: string, password: string }
// Two auth paths:
//   A) Bobby AI credentials — Case ID + Access Code from bobbyAiPortalCredentials field
//   B) Report access code   — any identifier + the 6-digit code from a sent report token
// No phase gate: the portal shows phase-appropriate content at any case stage.
router.post("/external/portal-login", async (req, res) => {
  const { caseId, password } = req.body ?? {};

  if (!caseId || !password) {
    res.status(400).json({ error: "bad_request", message: "Case ID and Password are required." });
    return;
  }

  const caseId_ = String(caseId).trim();
  const password_ = String(password).trim();

  // ── Path A: Bobby AI credentials ──────────────────────────────────────────
  const caseRows = await db
    .select()
    .from(casesTable)
    .where(
      sql`(
        lower(${casesTable.bobbyAiCaseId}) = lower(${caseId_})
        OR ${casesTable.bobbyAiPortalCredentials} ILIKE ${"%" + caseId_ + "%"}
      )`
    )
    .limit(5);

  const bobbyCase = caseRows.find(row => {
    const creds = row.bobbyAiPortalCredentials ?? "";
    const idMatch = creds.match(/Case\s*ID\s*[:\-]\s*([^\n\r]+)/i);
    return idMatch && idMatch[1].trim().toLowerCase() === caseId_.toLowerCase();
  }) ?? caseRows[0];

  if (bobbyCase) {
    const creds = bobbyCase.bobbyAiPortalCredentials ?? "";
    const codeMatch = creds.match(/Access\s*Code\s*[:\-]\s*([^\n\r]+)/i);
    const expectedCode = codeMatch ? codeMatch[1].trim() : null;

    if (expectedCode && password_.toLowerCase() === expectedCode.toLowerCase()) {
      // Credentials match — find or create a report token
      const tokenRows = await db
        .select()
        .from(reportTokensTable)
        .where(eq(reportTokensTable.caseId, bobbyCase.id))
        .limit(10);

      let tok = tokenRows.find(t => t.role === "parent") ?? tokenRows.find(t => t.role === "teacher") ?? tokenRows[0];

      if (!tok) {
        // No token yet — create a preview token so the parent portal opens
        const newToken = randomUUID();
        const [inserted] = await db.insert(reportTokensTable).values({
          id: randomUUID(),
          caseId: bobbyCase.id,
          role: "parent",
          email: "preview@internal",
          token: newToken,
          accessCode: password_,
          recipientName: "Portal Preview",
          sentAt: new Date(),
        }).returning();
        tok = inserted;
      }

      res.json({ token: tok!.token });
      return;
    }
  }

  // ── Path B: Report token access code ─────────────────────────────────────
  // Match by access code (the 6-digit code from the report email).
  // The "Case ID" field is used as a hint to disambiguate if multiple tokens share a code,
  // but a single code match is accepted directly since codes are random and case-scoped.
  const tokensByCode = await db
    .select()
    .from(reportTokensTable)
    .where(sql`lower(${reportTokensTable.accessCode}) = lower(${password_})`)
    .limit(20);

  if (tokensByCode.length > 0) {
    // Prefer a token whose caseId matches the input, then fall back to any match
    const tok =
      tokensByCode.find(t => t.caseId.toLowerCase() === caseId_.toLowerCase()) ??
      tokensByCode.find(t => t.caseId.toLowerCase().includes(caseId_.toLowerCase())) ??
      (tokensByCode.length === 1 ? tokensByCode[0] : null);

    if (tok) {
      res.json({ token: tok.token });
      return;
    }
  }

  res.status(401).json({ error: "invalid_credentials", message: "Case ID or Password is incorrect." });
});

// ── RAMRI Contributor Upload (public, no auth) ────────────────────────────────
router.get("/ramri-upload/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const rows = await db.execute(sql`SELECT id, case_id, tool_id, metadata FROM assignments WHERE unique_token = ${token} LIMIT 1`);
    const assignment = rows.rows[0] as { id: string; case_id: string; tool_id: string; metadata: Record<string, unknown> | null } | undefined;
    if (!assignment || assignment.tool_id !== "RAMRI") {
      return res.status(404).json({ error: "not_found" });
    }
    const caseRows = await db.execute(sql`SELECT student_name FROM cases WHERE id = ${assignment.case_id} LIMIT 1`);
    const studentName = (caseRows.rows[0] as { student_name?: string })?.student_name ?? "the student";
    const sessionRows = await db.execute(sql`SELECT id FROM ramri_sessions WHERE case_id = ${assignment.case_id} AND assignment_id = ${assignment.id} LIMIT 1`);
    const sessionId = (sessionRows.rows[0] as { id?: string })?.id ?? null;
    const uploadsClosed = !!(assignment.metadata as Record<string, unknown> | null)?.ramriUploadsClosed;
    return res.json({ ok: true, studentName, caseId: assignment.case_id, assignmentId: assignment.id, sessionId, uploadsClosed });
  } catch (err) {
    console.error("RAMRI upload lookup failed", err);
    return res.status(500).json({ error: "server_error" });
  }
});

router.post("/ramri-upload/:token/documents", async (req, res) => {
  try {
    const { token } = req.params;
    const rows = await db.execute(sql`SELECT id, case_id, tool_id, metadata FROM assignments WHERE unique_token = ${token} LIMIT 1`);
    const assignment = rows.rows[0] as { id: string; case_id: string; tool_id: string; metadata: Record<string, unknown> | null } | undefined;
    if (!assignment || assignment.tool_id !== "RAMRI") {
      return res.status(404).json({ error: "not_found" });
    }
    if (assignment.metadata?.ramriUploadsClosed) {
      return res.status(403).json({ error: "uploads_closed" });
    }

    // Ensure a session exists (create if missing)
    const existing = await db.execute(sql`SELECT id FROM ramri_sessions WHERE case_id = ${assignment.case_id} AND assignment_id = ${assignment.id} LIMIT 1`);
    let sessionId: string;
    if (existing.rows.length > 0) {
      sessionId = (existing.rows[0] as { id: string }).id;
    } else {
      sessionId = nanoid();
      await db.execute(sql`INSERT INTO ramri_sessions (id, case_id, assignment_id, status, created_at, updated_at) VALUES (${sessionId}, ${assignment.case_id}, ${assignment.id}, 'upload', NOW(), NOW())`);
    }

    const { fileName, fileUrl, fileType, sourceType, completionDate, gradeLevel, mathTopic, independenceReported, teacherMarked, teacherComments, contributorNotes } = req.body as Record<string, string>;
    const docId = nanoid();
    await db.execute(sql`
      INSERT INTO ramri_work_documents
        (id, case_id, session_id, file_name, file_url, file_type, source_type, completion_date, grade_level, math_topic, independence_reported, teacher_marked, teacher_comments, contributor_notes, extraction_status, created_at)
      VALUES
        (${docId}, ${assignment.case_id}, ${sessionId}, ${fileName ?? null}, ${fileUrl ?? null}, ${fileType ?? null}, ${sourceType ?? "contributor"}, ${completionDate ?? null}, ${gradeLevel ?? null}, ${mathTopic ?? null}, ${independenceReported ?? "unknown"}, ${teacherMarked ?? "unknown"}, ${teacherComments ?? null}, ${contributorNotes ?? null}, 'pending', NOW())
    `);
    return res.status(201).json({ ok: true, docId, sessionId });
  } catch (err) {
    console.error("RAMRI contributor upload failed", err);
    return res.status(500).json({ error: "server_error" });
  }
});


// ══════════════════════════════════════════════════════════════════════════════
// ── LEARNING SUPPORT COACH™ ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

async function getLscSub(caseId: string): Promise<Record<string, unknown>> {
  const r = await db.execute(sql`SELECT * FROM lsc_subscriptions WHERE case_id = ${caseId} LIMIT 1`);
  if (r.rows.length > 0) return r.rows[0] as Record<string, unknown>;
  const newId = randomUUID();
  await db.execute(sql`
    INSERT INTO lsc_subscriptions (id, case_id, subscription_status, monthly_allowance, monthly_usage)
    VALUES (${newId}, ${caseId}, 'trial_available', 25, 0)
    ON CONFLICT (case_id) DO NOTHING
  `);
  const fresh = await db.execute(sql`SELECT * FROM lsc_subscriptions WHERE case_id = ${caseId} LIMIT 1`);
  return (fresh.rows[0] ?? { id: newId, case_id: caseId, subscription_status: "trial_available", monthly_allowance: 25, monthly_usage: 0 }) as Record<string, unknown>;
}

async function runLscAnalysis(
  caseRow: Record<string, unknown>,
  lessonContent: string,
  role: string,
  language: string,
): Promise<{ slp: Record<string, string>; guide: Record<string, unknown>; demandProfile: Record<string, string> }> {
  const intake = (caseRow["intakeAnalysis"] ?? {}) as Record<string, unknown>;
  const domains = Array.isArray(intake["recommendedDomains"]) ? (intake["recommendedDomains"] as string[]).join(", ") : "";
  const flags = Array.isArray(intake["flags"]) ? (intake["flags"] as string[]).join("; ") : "None";
  const summary = (intake["summary"] as string | undefined) ?? "Comprehensive psychoeducational assessment completed.";

  const slp: Record<string, string> = {
    studentName: (caseRow["studentName"] as string | undefined) ?? "Student",
    grade: (caseRow["grade"] as string | undefined) ?? "Not specified",
    school: (caseRow["school"] as string | undefined) ?? "Not specified",
    referralReason: (caseRow["referralReason"] as string | undefined) ?? "Not specified",
    keyDomains: domains || "Not specified",
    clinicalSummary: summary,
    flags,
  };

  const roleContext: Record<string, string> = {
    parent: "a parent supporting their child at home",
    teacher: "a classroom teacher providing in-class support",
    tutor: "a private tutor working one-on-one with the student",
    student: "a student support specialist",
  };
  const roleStr = roleContext[role] ?? "a parent supporting their child at home";
  const langLabel = language === "mandarin" ? "Simplified Chinese (Mandarin)" : language === "korean" ? "Korean" : "English";

  const systemPrompt = `You are the ReMynd Learning Support Coach™ — an assessment-based educational decision support engine for ${roleStr}.

STUDENT LEARNING PROFILE:
- Name: ${slp["studentName"]}
- Grade: ${slp["grade"]}
- School: ${slp["school"]}
- Referral Reason: ${slp["referralReason"]}
- Key Areas of Need: ${slp["keyDomains"]}
- Clinical Summary: ${slp["clinicalSummary"]}
- Notable Flags: ${slp["flags"]}

MANDATORY PRINCIPLES:
1. STRENGTH-FIRST: Open the strengths section with what this student CAN do
2. ASSESSMENT-GROUNDED: Every recommendation must reference the student profile above
3. ROLE-SPECIFIC: Strategies must be practical for ${roleStr}
4. SAFE: Never diagnose, never replace professional judgment, never contradict approved findings
5. SPECIFIC: No generic advice — tie everything to this student and this task

Analyze the submitted lesson/homework content. Return ONLY a valid JSON object — no markdown, no text outside the JSON:

{
  "demandProfile": {
    "overview": "1-2 sentences on this lesson's main cognitive demands",
    "reading": "low|medium|high — brief note",
    "writing": "low|medium|high — brief note",
    "mathematics": "low|medium|high — brief note",
    "executiveFunction": "low|medium|high — brief note",
    "memory": "low|medium|high — brief note",
    "attention": "low|medium|high — brief note"
  },
  "strengths": "What ${slp["studentName"]} can bring to this task. Use bullet points starting with •, one per line.",
  "overview": "2-3 sentences connecting this task to ${slp["studentName"]}'s learning profile.",
  "challenges": "3-5 specific barriers for ${slp["studentName"]} referencing the profile. Use bullet points starting with •.",
  "strategies": "4-6 practical, task-specific strategies for ${roleStr}. Use bullet points starting with •.",
  "stepByStep": "5-8 numbered steps for working through this task. One step per line.",
  "language": "Phrases to USE and AVOID. Format as 'USE: [phrase]' or 'AVOID: [phrase]'. 3-4 of each, one per line.",
  "observationPoints": "3-4 progress indicators to watch during or after this task. Use bullet points starting with •.",
  "safetyNote": "A brief warm reminder that all recommendations must be reviewed by an authorized adult before use."
}

Write ALL content in ${langLabel}.`;

  const raw = await callDeepSeekChat(systemPrompt, [{ role: "user", content: `Lesson/assignment content:\n\n${lessonContent.slice(0, 5000)}` }], 3500);
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No valid JSON in AI response");
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
  const required = ["demandProfile", "strengths", "overview", "challenges", "strategies", "stepByStep"];
  for (const k of required) { if (!parsed[k]) throw new Error(`Missing field: ${k}`); }
  return { slp, guide: parsed, demandProfile: parsed["demandProfile"] as Record<string, string> };
}

async function generateLscRoleVersion(
  slp: Record<string, string>,
  guide: Record<string, unknown>,
  newRole: string,
  language: string,
): Promise<Record<string, unknown>> {
  const roleContext: Record<string, string> = {
    parent: "a parent supporting their child at home",
    teacher: "a classroom teacher providing in-class support",
    tutor: "a private tutor working one-on-one with the student",
    student: "a student support specialist",
  };
  const roleStr = roleContext[newRole] ?? "a parent supporting their child at home";
  const langLabel = language === "mandarin" ? "Simplified Chinese (Mandarin)" : language === "korean" ? "Korean" : "English";
  const systemPrompt = `You are the ReMynd Learning Support Coach™.
Rewrite the "strategies", "stepByStep", and "language" fields of this support guide specifically for ${roleStr}.
Keep ALL other fields (demandProfile, strengths, overview, challenges, observationPoints, safetyNote) EXACTLY the same.
Return the COMPLETE JSON object with all fields. Write ALL content in ${langLabel}.`;

  const raw = await callDeepSeekChat(systemPrompt, [{
    role: "user",
    content: `Student: ${slp["studentName"]} (Grade ${slp["grade"]}), Key needs: ${slp["keyDomains"]}\n\nOriginal guide:\n${JSON.stringify(guide)}`,
  }], 2500);
  const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in role version");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

async function runLscFollowUp(
  slp: Record<string, string>,
  guide: Record<string, unknown>,
  history: Array<{ role: string; content: string }>,
  question: string,
  language: string,
): Promise<string> {
  const langLabel = language === "mandarin" ? "Simplified Chinese (Mandarin)" : language === "korean" ? "Korean" : "English";
  const systemPrompt = `You are the ReMynd Learning Support Coach™ answering a follow-up question about a specific support guide.
Student: ${slp["studentName"]} (Grade ${slp["grade"]}), Key needs: ${slp["keyDomains"]}
Answer helpfully, warmly, and specifically. Do not regenerate the full guide. Respond in ${langLabel}.`;
  const messages = [
    { role: "user" as const, content: `Guide overview: ${guide["overview"]}\nGuide strategies: ${guide["strategies"]}` },
    { role: "assistant" as const, content: "Understood. I'll answer follow-up questions about this support guide." },
    ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user" as const, content: question },
  ];
  return callDeepSeekChat(systemPrompt, messages, 800);
}

// GET /external/portal/:token/lsc/status
router.get("/external/portal/:token/lsc/status", async (req, res) => {
  try {
    const info = await getCaseFromPortalToken(req.params.token);
    if (!info) return res.status(404).json({ error: "not_found" });
    const [settingsRow] = (await db.execute(sql`SELECT * FROM lsc_settings LIMIT 1`)).rows;
    const s = (settingsRow ?? {}) as Record<string, unknown>;
    const sub = await getLscSub(info.caseId);
    // If subscription has an expiry date and it's in the past, treat as expired
    let status = (sub["subscription_status"] as string) ?? "trial_available";
    const expiresAt = sub["expires_at"] as string | null ?? null;
    const PAID_STATUSES = ["active_monthly", "active_annual"];
    if (PAID_STATUSES.includes(status) && expiresAt && new Date(expiresAt) < new Date()) {
      status = "expired";
    }
    return res.json({
      productName: s["product_name"] ?? "ReMynd Learning Support Coach",
      productSubtitle: s["product_subtitle"] ?? "Assessment-Based Educational Decision Support",
      subscriptionStatus: status,
      monthlyPrice: s["monthly_price_rmb"] ?? 388,
      annualPrice: s["annual_price_rmb"] ?? 3880,
      monthlyLimit: s["monthly_analysis_limit"] ?? 25,
      trialLimit: s["trial_analysis_limit"] ?? 1,
      monthlyUsage: sub["monthly_usage"] ?? 0,
      monthlyAllowance: sub["monthly_allowance"] ?? 25,
      expiresAt,
    });
  } catch (err) {
    console.error("[LSC] status:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /external/portal/:token/lsc/analyze
router.post("/external/portal/:token/lsc/analyze", async (req, res) => {
  try {
    const info = await getCaseFromPortalToken(req.params.token);
    if (!info) return res.status(404).json({ error: "not_found" });
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, info.caseId)).limit(1);
    if (!caseRow) return res.status(404).json({ error: "not_found" });

    const { content, role = "parent", language = "english", acknowledged } = req.body as {
      content?: string; role?: string; language?: string; acknowledged?: boolean;
    };
    if (!content?.trim()) return res.status(400).json({ error: "content_required" });
    if (!acknowledged) return res.status(400).json({ error: "acknowledgement_required" });

    // Admin preview tokens (created by "Open Portal Preview") are demo sessions —
    // skip all subscription checks and counters so the parent's trial is never touched.
    const [tokenRow] = await db.select({ recipientName: reportTokensTable.recipientName })
      .from(reportTokensTable).where(eq(reportTokensTable.token, req.params.token)).limit(1);
    const isAdminDemo = tokenRow?.recipientName === "TEST PREVIEW (admin)";

    if (!isAdminDemo) {
      const sub = await getLscSub(info.caseId);
      const status = sub["subscription_status"] as string;
      const ACTIVE = ["active_monthly", "active_annual", "complimentary", "administrator_override"];
      const TRIAL = ["trial_available", "trial_active"];

      if (!TRIAL.includes(status) && !ACTIVE.includes(status)) {
        return res.status(402).json({ error: "subscription_required", subscriptionStatus: status });
      }
      if (ACTIVE.includes(status)) {
        const [s] = (await db.execute(sql`SELECT monthly_analysis_limit FROM lsc_settings LIMIT 1`)).rows;
        const limit = ((s as Record<string, unknown> | undefined)?.["monthly_analysis_limit"] as number | undefined) ?? 25;
        if (((sub["monthly_usage"] as number | undefined) ?? 0) >= limit) {
          return res.status(402).json({ error: "monthly_limit_reached" });
        }
      }
      if (TRIAL.includes(status)) {
        await db.execute(sql`UPDATE lsc_subscriptions SET subscription_status='trial_active', trial_used_at=NOW(), updated_at=NOW() WHERE case_id=${info.caseId}`);
      }

      let result: { slp: Record<string, string>; guide: Record<string, unknown>; demandProfile: Record<string, string> };
      try {
        result = await runLscAnalysis(caseRow as unknown as Record<string, unknown>, content.trim(), role, language);
      } catch (aiErr) {
        if (TRIAL.includes(status)) {
          await db.execute(sql`UPDATE lsc_subscriptions SET subscription_status='trial_available', trial_used_at=NULL, updated_at=NOW() WHERE case_id=${info.caseId}`);
        }
        console.error("[LSC] AI failed:", aiErr);
        return res.status(500).json({ error: "ai_failed" });
      }

      const analysisId = randomUUID();
      await db.execute(sql`
        INSERT INTO lsc_analyses (id, case_id, portal_token, user_role, language, lesson_content, status, slp_snapshot, demand_profile, guide, output_versions, follow_up_messages)
        VALUES (${analysisId}, ${info.caseId}, ${req.params.token}, ${role}, ${language}, ${content.trim().slice(0, 5000)}, 'completed',
          ${JSON.stringify(result.slp)}, ${JSON.stringify(result.demandProfile)}, ${JSON.stringify(result.guide)}, '{}', '[]')
      `);
      if (TRIAL.includes(status)) {
        await db.execute(sql`UPDATE lsc_subscriptions SET subscription_status='trial_used', monthly_usage=monthly_usage+1, updated_at=NOW() WHERE case_id=${info.caseId}`);
      } else {
        await db.execute(sql`UPDATE lsc_subscriptions SET monthly_usage=monthly_usage+1, updated_at=NOW() WHERE case_id=${info.caseId}`);
      }
      return res.json({ analysisId, guide: result.guide, demandProfile: result.demandProfile, slp: result.slp });
    }

    // Admin demo path — run analysis, save result, touch nothing on the subscription
    let result: { slp: Record<string, string>; guide: Record<string, unknown>; demandProfile: Record<string, string> };
    try {
      result = await runLscAnalysis(caseRow as unknown as Record<string, unknown>, content.trim(), role, language);
    } catch (aiErr) {
      console.error("[LSC] AI failed (demo):", aiErr);
      return res.status(500).json({ error: "ai_failed" });
    }
    const analysisId = randomUUID();
    await db.execute(sql`
      INSERT INTO lsc_analyses (id, case_id, portal_token, user_role, language, lesson_content, status, slp_snapshot, demand_profile, guide, output_versions, follow_up_messages)
      VALUES (${analysisId}, ${info.caseId}, ${req.params.token}, ${role}, ${language}, ${content.trim().slice(0, 5000)}, 'completed',
        ${JSON.stringify(result.slp)}, ${JSON.stringify(result.demandProfile)}, ${JSON.stringify(result.guide)}, '{}', '[]')
    `);
    return res.json({ analysisId, guide: result.guide, demandProfile: result.demandProfile, slp: result.slp });
  } catch (err) {
    console.error("[LSC] analyze:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /external/portal/:token/lsc/analyses
router.get("/external/portal/:token/lsc/analyses", async (req, res) => {
  try {
    const info = await getCaseFromPortalToken(req.params.token);
    if (!info) return res.status(404).json({ error: "not_found" });
    const rows = await db.execute(sql`
      SELECT id, user_role, language, lesson_content, status, demand_profile, guide, output_versions, follow_up_messages, created_at
      FROM lsc_analyses WHERE case_id=${info.caseId} ORDER BY created_at DESC LIMIT 20
    `);
    return res.json({ analyses: rows.rows });
  } catch (err) {
    console.error("[LSC] analyses:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /external/portal/:token/lsc/analyses/:id/followup
router.post("/external/portal/:token/lsc/analyses/:id/followup", async (req, res) => {
  try {
    const info = await getCaseFromPortalToken(req.params.token);
    if (!info) return res.status(404).json({ error: "not_found" });
    const [aRow] = (await db.execute(sql`SELECT * FROM lsc_analyses WHERE id=${req.params.id} AND case_id=${info.caseId} LIMIT 1`)).rows;
    if (!aRow) return res.status(404).json({ error: "not_found" });
    const a = aRow as Record<string, unknown>;
    const { question, language = "english" } = req.body as { question?: string; language?: string };
    if (!question?.trim()) return res.status(400).json({ error: "question_required" });
    const history = Array.isArray(a["follow_up_messages"]) ? a["follow_up_messages"] as Array<{ role: string; content: string }> : [];
    const reply = await runLscFollowUp(
      (a["slp_snapshot"] ?? {}) as Record<string, string>,
      (a["guide"] ?? {}) as Record<string, unknown>,
      history, question.trim(), language,
    );
    const newHistory = [...history, { role: "user", content: question.trim() }, { role: "assistant", content: reply }];
    await db.execute(sql`UPDATE lsc_analyses SET follow_up_messages=${JSON.stringify(newHistory)}, updated_at=NOW() WHERE id=${req.params.id}`);
    return res.json({ reply });
  } catch (err) {
    console.error("[LSC] followup:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /external/portal/:token/lsc/inquiry
// Body: { name, email, months }  — sends a purchase inquiry to ne_roberts@yahoo.com
router.post("/external/portal/:token/lsc/inquiry", async (req, res) => {
  try {
    const info = await getCaseFromPortalToken(req.params.token);
    if (!info) return res.status(404).json({ error: "not_found" });
    const { name, email, months } = req.body as { name?: string; email?: string; months?: number };
    if (!name?.trim() || !email?.trim() || !months) {
      return res.status(400).json({ error: "bad_request", message: "Name, email and duration are required." });
    }
    const [caseRow] = await db.select({ studentName: casesTable.studentName }).from(casesTable).where(eq(casesTable.id, info.caseId)).limit(1);
    const studentName = caseRow?.studentName ?? "Unknown student";
    const { sendEmail } = await import("../lib/outlookEmail.js");
    await sendEmail({
      to: "ne_roberts@yahoo.com",
      subject: `LSC Purchase Inquiry — ${name.trim()} (${studentName})`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#7c3aed;margin-bottom:4px;">Learning Support Coach — Purchase Inquiry</h2>
          <p style="color:#64748b;font-size:13px;margin-top:0;">Submitted via the ReMynd parent portal</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
            <tr><td style="padding:8px 0;color:#94a3b8;width:120px;">Name</td><td style="padding:8px 0;font-weight:600;color:#0f172a;">${name.trim()}</td></tr>
            <tr><td style="padding:8px 0;color:#94a3b8;">Email</td><td style="padding:8px 0;font-weight:600;color:#0f172a;"><a href="mailto:${email.trim()}" style="color:#7c3aed;">${email.trim()}</a></td></tr>
            <tr><td style="padding:8px 0;color:#94a3b8;">Duration</td><td style="padding:8px 0;font-weight:600;color:#0f172a;">${months} month${months > 1 ? "s" : ""}</td></tr>
            <tr><td style="padding:8px 0;color:#94a3b8;">Student</td><td style="padding:8px 0;color:#0f172a;">${studentName}</td></tr>
          </table>
        </div>`,
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("[LSC] inquiry:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// POST /external/portal/:token/lsc/analyses/:id/version
router.post("/external/portal/:token/lsc/analyses/:id/version", async (req, res) => {
  try {
    const info = await getCaseFromPortalToken(req.params.token);
    if (!info) return res.status(404).json({ error: "not_found" });
    const [aRow] = (await db.execute(sql`SELECT * FROM lsc_analyses WHERE id=${req.params.id} AND case_id=${info.caseId} LIMIT 1`)).rows;
    if (!aRow) return res.status(404).json({ error: "not_found" });
    const a = aRow as Record<string, unknown>;
    const { role, language = "english" } = req.body as { role?: string; language?: string };
    if (!role) return res.status(400).json({ error: "role_required" });
    const versions = (a["output_versions"] ?? {}) as Record<string, unknown>;
    if (versions[role]) return res.json({ guide: versions[role], cached: true });
    const newGuide = await generateLscRoleVersion(
      (a["slp_snapshot"] ?? {}) as Record<string, string>,
      (a["guide"] ?? {}) as Record<string, unknown>,
      role, language,
    );
    const updatedVersions = { ...versions, [role]: newGuide };
    await db.execute(sql`UPDATE lsc_analyses SET output_versions=${JSON.stringify(updatedVersions)}, updated_at=NOW() WHERE id=${req.params.id}`);
    return res.json({ guide: newGuide });
  } catch (err) {
    console.error("[LSC] version:", err);
    return res.status(500).json({ error: "server_error" });
  }
});

// ── Airwallex LSC checkout ────────────────────────────────────────────────────
router.post("/external/portal/:token/lsc/checkout", async (req, res) => {
  const { token } = req.params;
  const { months } = req.body as { months?: number };

  const numMonths = Number(months);
  if (!numMonths || numMonths < 1 || numMonths > 12 || !Number.isInteger(numMonths)) {
    res.status(400).json({ error: "months must be an integer between 1 and 12" }); return;
  }
  if (!airwallex.isConfigured()) {
    res.status(503).json({ error: "payment_not_configured" }); return;
  }

  // Resolve portal token → case
  const info = await getCaseFromPortalToken(token);
  if (!info) { res.status(404).json({ error: "invalid_token" }); return; }
  const caseId = info.caseId;

  // Get price from lsc_settings
  const settings = await db.execute(sql`SELECT monthly_price_rmb FROM lsc_settings LIMIT 1`);
  const s = settings.rows[0] as Record<string, unknown> | undefined;
  const monthlyPrice = s?.["monthly_price_rmb"] as number ?? 388;
  const amount = monthlyPrice * numMonths;

  const returnUrl = `${process.env.APP_BASE_URL ?? "https://remyndassessments.com"}/lsc-checkout?payment_return=true`;

  // plan field stores months as string for the DB
  const planStr = String(numMonths);

  const intent = await airwallex.createPaymentIntent({
    amount,
    currency: "CNY",
    plan: `${numMonths}mo`,
    caseId,
    portalToken: token,
    returnUrl,
  });

  if (!intent) { res.status(500).json({ error: "checkout_failed" }); return; }

  // Store pending intent for webhook idempotency
  await db.execute(sql`
    INSERT INTO lsc_payment_intents (id, case_id, portal_token, plan, amount, currency, status)
    VALUES (${intent.id}, ${caseId}, ${token}, ${planStr}, ${amount}, 'CNY', 'pending')
    ON CONFLICT (id) DO NOTHING
  `);

  res.json({
    intent_id: intent.id,
    client_secret: intent.clientSecret,
    env: airwallex.getEnv(),
    months: numMonths,
    amount,
  });
});

// ── Airwallex LSC confirm (called from checkout page on onSuccess) ─────────────
router.post("/external/portal/:token/lsc/confirm", async (req, res) => {
  const { token } = req.params;
  const { intent_id, plan } = req.body as { intent_id?: string; plan?: string };

  if (!intent_id) { res.status(400).json({ error: "intent_id required" }); return; }

  // Look up the stored intent
  // Verify portal token is valid
  const info = await getCaseFromPortalToken(token);
  if (!info) { res.status(404).json({ error: "invalid_token" }); return; }

  const intentRows = await db.execute(sql`
    SELECT case_id, plan, status FROM lsc_payment_intents WHERE id = ${intent_id} AND case_id = ${info.caseId} LIMIT 1
  `);
  if (!intentRows.rows.length) { res.status(404).json({ error: "not_found" }); return; }
  const row = intentRows.rows[0] as Record<string, unknown>;
  if (row["status"] === "succeeded") { res.json({ ok: true, already: true }); return; }

  const caseId = row["case_id"] as string;
  // plan stores the number of months as a string (e.g. "3")
  const numMonths = parseInt((row["plan"] as string) ?? "1", 10) || 1;
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + numMonths);

  // Upsert subscription
  const existing = await db.execute(sql`SELECT id FROM lsc_subscriptions WHERE case_id = ${caseId} LIMIT 1`);
  if (existing.rows.length) {
    await db.execute(sql`UPDATE lsc_subscriptions SET subscription_status = 'active_monthly', expires_at = ${expiresAt.toISOString()}, updated_at = NOW() WHERE case_id = ${caseId}`);
  } else {
    const subId = randomUUID();
    await db.execute(sql`INSERT INTO lsc_subscriptions (id, case_id, subscription_status, monthly_allowance, monthly_usage, expires_at) VALUES (${subId}, ${caseId}, 'active_monthly', 25, 0, ${expiresAt.toISOString()})`);
  }

  // Mark intent as succeeded
  await db.execute(sql`UPDATE lsc_payment_intents SET status = 'succeeded', updated_at = NOW() WHERE id = ${intent_id}`);

  res.json({ ok: true, expiresAt: expiresAt.toISOString() });
});

// ── Airwallex webhook (no auth — idempotent via lsc_payment_intents) ──────────
router.post("/external/payments/webhook", async (req, res) => {
  const body = req.body as { name?: string; data?: Record<string, unknown> };
  const eventName = body.name ?? "";
  const data = body.data ?? {};

  if (eventName === "payment_intent.succeeded") {
    const intentId = (data["id"] ?? data["payment_intent_id"]) as string | undefined;
    if (!intentId) { res.json({ status: "ok" }); return; }

    const intentRows = await db.execute(sql`
      SELECT case_id, plan, status FROM lsc_payment_intents WHERE id = ${intentId} LIMIT 1
    `);
    if (!intentRows.rows.length) { res.json({ status: "ok" }); return; }
    const row = intentRows.rows[0] as Record<string, unknown>;
    if (row["status"] === "succeeded") { res.json({ status: "ok" }); return; } // idempotent

    const caseId = row["case_id"] as string;
    const numMonths = parseInt((row["plan"] as string) ?? "1", 10) || 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + numMonths);

    const existing = await db.execute(sql`SELECT id FROM lsc_subscriptions WHERE case_id = ${caseId} LIMIT 1`);
    if (existing.rows.length) {
      await db.execute(sql`UPDATE lsc_subscriptions SET subscription_status = 'active_monthly', expires_at = ${expiresAt.toISOString()}, updated_at = NOW() WHERE case_id = ${caseId}`);
    } else {
      const subId = randomUUID();
      await db.execute(sql`INSERT INTO lsc_subscriptions (id, case_id, subscription_status, monthly_allowance, monthly_usage, expires_at) VALUES (${subId}, ${caseId}, 'active_monthly', 25, 0, ${expiresAt.toISOString()})`);
    }
    await db.execute(sql`UPDATE lsc_payment_intents SET status = 'succeeded', updated_at = NOW() WHERE id = ${intentId}`);

  } else if (eventName === "payment_intent.payment_failed" || eventName === "payment_intent.cancelled") {
    const intentId = (data["id"] ?? data["payment_intent_id"]) as string | undefined;
    if (intentId) {
      await db.execute(sql`UPDATE lsc_payment_intents SET status = 'failed', updated_at = NOW() WHERE id = ${intentId} AND status = 'pending'`);
    }
  }

  res.json({ status: "ok" });
});

export default router;
