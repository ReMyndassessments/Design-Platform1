import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { assignmentsTable, responsesTable, casesTable, assessmentToolsTable, referralInvitesTable } from "@workspace/db/schema";
import { reportUploadsTable, reportTokensTable } from "@workspace/db/schema";
import { eq, and, ne, asc } from "drizzle-orm";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { Readable } from "stream";
import { nanoid } from "nanoid";
import { SAMPLE_QUESTIONS, FormQuestion } from "../lib/questions.js";
import { buildTeacherEmail } from "../lib/emailTemplates.js";
import { getAdminEmails } from "../lib/adminEmails.js";

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
  const portalToken = req.params.token;

  // ── Path A: token matches an assignment (normal portal link) ──────────────
  const rows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.uniqueToken, portalToken)).limit(1);
  const assignment = rows[0];

  if (assignment) {
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
              blocked: tok.role === "teacher" && !tok.permissionGranted && !tok.adminOverride,
              hasAccessCode: !!tok.accessCode,
            };
          }
        }
      }
    }

    // Map internal phases to the 6 phases visible to respondents
    const rawPhaseA = caseData?.currentPhase ?? "pre_commitment";
    const displayPhaseA =
      rawPhaseA === "pre_commitment" ? "intake"
      : rawPhaseA === "setup"        ? "forms"
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
      forms: siblings.map(s => ({
        toolId: s.toolId,
        toolName: s.toolName,
        status: s.status,
        uniqueToken: s.uniqueToken,
      })),
      reportAccess,
      debriefMeetingUrl: caseData?.debriefMeetingUrl ?? null,
      debriefMeetingDate: caseData?.debriefMeetingDate ?? null,
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
      blocked: reportTok.role === "teacher" && !reportTok.permissionGranted && !reportTok.adminOverride,
    } : null;

    // Map internal admin phases to parent-visible phases
    const rawPhase = caseData?.currentPhase ?? "debrief";
    const displayPhase = rawPhase === "final_review" ? "debrief"
      : rawPhase === "pre_commitment" || rawPhase === "intake" || rawPhase === "forms" || rawPhase === "report" || rawPhase === "scoring" || rawPhase === "assessment"
        ? "debrief" : rawPhase;

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

  if (tok.role === "teacher" && !tok.permissionGranted && !tok.adminOverride) {
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

  // Also unlock / re-lock all teacher tokens for this case so they reflect the parent's decision
  await db.update(reportTokensTable)
    .set({ permissionGranted: granted, permissionGrantedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(reportTokensTable.caseId, tok.caseId), eq(reportTokensTable.role, "teacher")));

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
  const rawToken = req.params.token;
  const { answers, language } = req.body;

  // ── Standard assignment path (checked first — handles post-submission consent) ─
  const existingAssignmentRows = await db.select().from(assignmentsTable).where(eq(assignmentsTable.uniqueToken, rawToken)).limit(1);
  if (existingAssignmentRows[0]) {
    const assignment = existingAssignmentRows[0];
    await db.insert(responsesTable).values({ id: nanoid(), assignmentId: assignment.id, answers: answers ?? {}, language: language ?? "english" });
    await db.update(assignmentsTable).set({ status: "completed", submittedAt: new Date() }).where(eq(assignmentsTable.id, assignment.id));
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

    // Create the case
    const caseId = nanoid();
    await db.insert(casesTable).values({
      id: caseId,
      studentName: "Referral Pending",
      dob: "TBD",
      school: invite.schoolName || "TBD",
      grade: null,
      referralReason: `Referral form submitted by ${invite.toName} (${invite.toEmail})`,
      currentPhase: "pre_commitment",
      progressPercentage: 0,
      caseStatus: "active",
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

export default router;
