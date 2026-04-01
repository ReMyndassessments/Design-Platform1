import { Router } from "express";
import { db } from "@workspace/db";
import { reportUploadsTable, reportTokensTable, casesTable, usersTable, responsesTable, scoresTable, assessmentToolsTable, assignmentsTable } from "@workspace/db/schema";
import { eq, and, or, sql, inArray, asc, isNotNull } from "drizzle-orm";
import archiver from "archiver";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";
import { sendEmail } from "../lib/outlookEmail.js";
import { randomUUID } from "crypto";
import { Readable } from "stream";

type Lang = "english" | "mandarin" | "korean";

function normLang(raw: string | null | undefined): Lang {
  if (raw === "mandarin") return "mandarin";
  if (raw === "korean") return "korean";
  return "english";
}

const EMAIL_COPY = {
  parentSubject: {
    english: (name: string) => `Assessment Report Ready — ${name}`,
    mandarin: (name: string) => `评估报告已准备就绪 — ${name}`,
    korean:   (name: string) => `평가 보고서 준비 완료 — ${name}`,
  },
  parentHeading: {
    english: "Your child's assessment report is ready",
    mandarin: "您孩子的评估报告已准备就绪",
    korean:   "자녀의 평가 보고서가 준비되었습니다",
  },
  parentBody: {
    english: (name: string) => `The psychoeducational assessment report for <strong>${name}</strong> has been finalised and is ready for you to download.`,
    mandarin: (name: string) => `<strong>${name}</strong> 的心理教育评估报告已完成，可供您下载。`,
    korean:   (name: string) => `<strong>${name}</strong>의 심리교육 평가 보고서가 완료되었으며 다운로드할 준비가 되었습니다.`,
  },
  parentCTA: {
    english: "Please click the button below to access your confidential copy:",
    mandarin: "请点击下面的按钮访问您的保密副本：",
    korean:   "아래 버튼을 클릭하여 기밀 사본에 접근하세요:",
  },
  parentDownloadBtn: {
    english: "Download My Report",
    mandarin: "下载我的报告",
    korean:   "내 보고서 다운로드",
  },
  parentConsent: {
    english: (school: string) => `After downloading, you will be asked whether you give permission for <strong>${school}</strong> to access their copy of the report. This is entirely your choice.`,
    mandarin: (school: string) => `下载后，系统会询问您是否允许 <strong>${school}</strong> 访问其报告副本。这完全是您的选择。`,
    korean:   (school: string) => `다운로드 후, <strong>${school}</strong>에서 보고서 사본에 접근할 수 있도록 허용할지 여부를 묻는 메시지가 표시됩니다. 이것은 전적으로 귀하의 선택입니다.`,
  },
  parentUniqueLink: {
    english: "This link is unique to you. Please do not share it.",
    mandarin: "此链接是您专用的。请勿与他人共享。",
    korean:   "이 링크는 귀하 전용입니다. 다른 사람과 공유하지 마세요.",
  },
  resendHeading: {
    english: "Your assessment report link",
    mandarin: "您的评估报告链接",
    korean:   "평가 보고서 링크",
  },
  resendBody: {
    english: (name: string) => `Please use the link below to access the report for <strong>${name}</strong>:`,
    mandarin: (name: string) => `请使用以下链接访问 <strong>${name}</strong> 的报告：`,
    korean:   (name: string) => `아래 링크를 사용하여 <strong>${name}</strong>의 보고서에 접근하세요:`,
  },
  resendBtn: {
    english: "Access Report",
    mandarin: "访问报告",
    korean:   "보고서 접근",
  },
  teacherOverrideHeading: {
    english: "Assessment report now available",
    mandarin: "评估报告现已可获取",
    korean:   "평가 보고서가 이제 제공됩니다",
  },
  teacherOverrideBody: {
    english: (name: string) => `Access to the assessment report for <strong>${name}</strong> has been authorised. You can now download your copy:`,
    mandarin: (name: string) => `访问 <strong>${name}</strong> 评估报告的权限已获授权。您现在可以下载您的副本：`,
    korean:   (name: string) => `<strong>${name}</strong>의 평가 보고서에 대한 접근 권한이 승인되었습니다. 이제 사본을 다운로드할 수 있습니다:`,
  },
  teacherOverrideBtn: {
    english: "Download Report",
    mandarin: "下载报告",
    korean:   "보고서 다운로드",
  },
} as const;

function buildParentEmail(lang: Lang, studentName: string, schoolName: string, link: string): string {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#0a1628">${EMAIL_COPY.parentHeading[lang]}</h2>
    <p>${EMAIL_COPY.parentBody[lang](studentName)}</p>
    <p>${EMAIL_COPY.parentCTA[lang]}</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">${EMAIL_COPY.parentDownloadBtn[lang]}</a>
    </p>
    <p style="font-size:13px;color:#64748b">${EMAIL_COPY.parentConsent[lang](schoolName)}</p>
    <p style="font-size:13px;color:#64748b">${EMAIL_COPY.parentUniqueLink[lang]}</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
  </div>`;
}

function buildResendEmail(lang: Lang, studentName: string, link: string): string {
  return `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
    <h2 style="color:#0a1628">${EMAIL_COPY.resendHeading[lang]}</h2>
    <p>${EMAIL_COPY.resendBody[lang](studentName)}</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">${EMAIL_COPY.resendBtn[lang]}</a>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
    <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
  </div>`;
}

const router = Router();
const storage = new ObjectStorageService();

function getBaseUrl(req: any): string {
  const host = req.headers.host as string ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  return `${proto}://${host}`;
}

// ── Admin: get report uploads + token status for a case ───────────────────────
router.get("/cases/:id/report-access", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "assessment_invigilator") {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const caseId = req.params.id;

  const uploads = await db.select().from(reportUploadsTable)
    .where(eq(reportUploadsTable.caseId, caseId))
    .orderBy(asc(reportUploadsTable.uploadedAt));
  const tokens = await db.select().from(reportTokensTable).where(eq(reportTokensTable.caseId, caseId));

  res.json({ uploads, tokens });
});

// ── Admin: upload report PDF for a case ───────────────────────────────────────
router.post("/cases/:id/report-access/upload", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "assessment_invigilator") {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const caseId = req.params.id;
  const {
    fileKey,
    filename,
    label,
    parentEmail,
    teacherEmail,
    notifyTeam = false,
    sendInternalCopy = false,
    notifyRecipients = false,
    additionalRecipients = [],
  }: {
    fileKey: string;
    filename: string;
    label?: string;
    parentEmail?: string;
    teacherEmail?: string;
    notifyTeam?: boolean;
    sendInternalCopy?: boolean;
    notifyRecipients?: boolean;
    additionalRecipients?: Array<{ name: string; email: string }>;
  } = req.body;

  if (!fileKey || !filename) {
    res.status(400).json({ error: "fileKey and filename required" }); return;
  }

  // Gate: only allowed during Final Review or Debrief
  const [phaseCheck] = await db.select({ currentPhase: casesTable.currentPhase })
    .from(casesTable).where(eq(casesTable.id, caseId));
  if (!phaseCheck) { res.status(404).json({ error: "case_not_found" }); return; }
  if (phaseCheck.currentPhase !== "final_review" && phaseCheck.currentPhase !== "debrief") {
    res.status(409).json({ error: "wrong_phase", message: "Reports can only be sent during Final Review or Debrief." }); return;
  }

  const isReuploading = phaseCheck.currentPhase === "debrief";

  // Record new upload (history kept — never delete old ones)
  await db.insert(reportUploadsTable).values({
    id: randomUUID(),
    caseId,
    fileKey,
    filename,
    label: (label as string | undefined)?.trim() || null,
    uploadedBy: req.userId ?? "admin",
  });

  // Get case info
  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, caseId));
  const studentName = caseRow?.studentName ?? "your student";
  const schoolName = caseRow?.school ?? "the school";
  const lang = normLang(caseRow?.languagePreference);
  const base = getBaseUrl(req);

  if (!isReuploading) {
    // ── FIRST UPLOAD (final_review): create tokens, send emails, advance phase ─
    await db.delete(reportTokensTable).where(eq(reportTokensTable.caseId, caseId));
    const createdTokens: Record<string, string> = {};

    if (parentEmail) {
      const token = randomUUID();
      await db.insert(reportTokensTable).values({
        id: randomUUID(), caseId, role: "parent", email: parentEmail, token, sentAt: new Date(),
      });
      createdTokens["parent"] = token;
      await sendEmail({
        to: parentEmail,
        subject: EMAIL_COPY.parentSubject[lang](studentName),
        html: buildParentEmail(lang, studentName, schoolName, `${base}/external/${token}`),
      });
    }

    if (teacherEmail) {
      const token = randomUUID();
      await db.insert(reportTokensTable).values({
        id: randomUUID(), caseId, role: "teacher", email: teacherEmail, token,
      });
      createdTokens["teacher"] = token;
    }

    for (const { name, email } of additionalRecipients) {
      if (!email?.trim()) continue;
      const token = randomUUID();
      const link = `${base}/external/${token}`;
      await db.insert(reportTokensTable).values({
        id: randomUUID(), caseId, role: "other", email: email.trim(), token,
        recipientName: name?.trim() || null,
        sentAt: new Date(),
      });
      await sendEmail({
        to: email.trim(),
        subject: `Assessment Report Ready — ${studentName}`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#0a1628">Assessment report available</h2>
          <p>With the consent of ${studentName}'s parent/guardian, you have been given access to their psychoeducational assessment report.</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Download Report</a>
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
        </div>`,
      });
    }

    if (sendInternalCopy) {
      const internalStaff = await db.select().from(usersTable)
        .where(inArray(usersTable.role, ["assessment_invigilator", "psychometrician"]));
      for (const staff of internalStaff) {
        const token = randomUUID();
        const roleLabel = staff.role === "assessment_invigilator" ? "Assessment Invigilator" : "Psychometrician";
        await db.insert(reportTokensTable).values({
          id: randomUUID(), caseId, role: "other", email: staff.email, token,
          recipientName: staff.name, sentAt: new Date(),
        });
        await sendEmail({
          to: staff.email,
          subject: `Assessment Report Ready — ${studentName}`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#0a1628">Final report ready for download</h2>
            <p>Hi ${staff.name} (${roleLabel}), the final assessment report for <strong>${studentName}</strong> is now available.</p>
            <p style="text-align:center;margin:28px 0">
              <a href="${base}/external/${token}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Download Report</a>
            </p>
            <p style="font-size:13px;color:#64748b">This link is unique to you. Please do not share it.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
          </div>`,
        });
      }
    }

    if (notifyTeam) {
      try {
        const teamUserIds = [caseRow?.assignedLeadId, caseRow?.assignedPsychId].filter(Boolean) as string[];
        if (teamUserIds.length > 0) {
          const teamUsers = await db.select().from(usersTable).where(inArray(usersTable.id, teamUserIds));
          const caseUrl = `${base}/cases/${caseId}`;
          for (const user of teamUsers) {
            await sendEmail({
              to: user.email,
              subject: `Final Report Uploaded — ${studentName}`,
              html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
                <h2 style="color:#0a1628">Final report uploaded</h2>
                <p>The final assessment report for <strong>${studentName}</strong> has been uploaded to RAOS.</p>
                <p style="text-align:center;margin:28px 0">
                  <a href="${caseUrl}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Open Case in RAOS</a>
                </p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
                <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
              </div>`,
            });
          }
        }
      } catch (err) {
        console.error("Failed to notify internal team", err);
      }
    }

    // Advance to Debrief
    await db.update(casesTable)
      .set({ currentPhase: "debrief", progressPercentage: 100 })
      .where(eq(casesTable.id, caseId));

    res.json({ success: true, isFirstUpload: true, tokens: createdTokens });

  } else {
    // ── RE-UPLOAD (debrief): notify existing recipients if requested ────────────
    if (notifyRecipients) {
      const existingTokens = await db.select().from(reportTokensTable)
        .where(and(eq(reportTokensTable.caseId, caseId), isNotNull(reportTokensTable.sentAt)));
      const fileLabel = (label as string | undefined)?.trim() || filename;
      for (const tok of existingTokens) {
        const portalLink = `${base}/external/${tok.token}`;
        await sendEmail({
          to: tok.email,
          subject: `Updated Document Available — ${studentName}`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#0a1628">An updated document is available</h2>
            <p>A new document (<strong>${fileLabel}</strong>) has been added to the assessment report package for <strong>${studentName}</strong>.</p>
            <p>Your existing download link still works — click below to access all documents.</p>
            <p style="text-align:center;margin:28px 0">
              <a href="${portalLink}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Access Documents</a>
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
          </div>`,
        });
      }
    }

    res.json({ success: true, isFirstUpload: false });
  }
});

// ── Admin: update email for a token and optionally resend ─────────────────────
router.patch("/cases/:id/report-access/tokens/:tokenId", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "assessment_invigilator") {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const { email, resend } = req.body;
  const token = await db.select().from(reportTokensTable).where(eq(reportTokensTable.id, req.params.tokenId));
  if (!token[0]) { res.status(404).json({ error: "not_found" }); return; }

  await db.update(reportTokensTable)
    .set({ email, updatedAt: new Date() })
    .where(eq(reportTokensTable.id, req.params.tokenId));

  if (resend) {
    const t = token[0];
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, t.caseId));
    const studentName = caseRow?.studentName ?? "your student";
    const resendLang = normLang(caseRow?.languagePreference);
    const base = getBaseUrl(req);
    const link = `${base}/external/${t.token}`;

    await sendEmail({
      to: email,
      subject: EMAIL_COPY.resendHeading[resendLang] + ` — ${studentName}`,
      html: buildResendEmail(resendLang, studentName, link),
    });

    await db.update(reportTokensTable)
      .set({ sentAt: new Date(), updatedAt: new Date() })
      .where(eq(reportTokensTable.id, req.params.tokenId));
  }

  res.json({ success: true });
});

// ── Admin: override parental consent (only if parent has downloaded) ───────────
router.post("/cases/:id/report-access/tokens/:tokenId/override", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const [token] = await db.select().from(reportTokensTable).where(eq(reportTokensTable.id, req.params.tokenId));
  if (!token) { res.status(404).json({ error: "not_found" }); return; }
  if (token.role !== "parent") { res.status(400).json({ error: "Can only override parent token" }); return; }
  if (!token.downloadedAt) { res.status(400).json({ error: "Cannot override before parent has downloaded" }); return; }

  // Grant permission via admin override
  await db.update(reportTokensTable)
    .set({ permissionGranted: true, adminOverride: true, adminOverrideAt: new Date(), adminOverrideBy: req.userId ?? "admin", updatedAt: new Date() })
    .where(eq(reportTokensTable.id, req.params.tokenId));

  // Notify teacher
  const [teacherToken] = await db.select().from(reportTokensTable)
    .where(and(eq(reportTokensTable.caseId, token.caseId), eq(reportTokensTable.role, "teacher")));

  if (teacherToken) {
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, token.caseId));
    const studentName = caseRow?.studentName ?? "your student";
    const base = getBaseUrl(req);
    const link = `${base}/external/${teacherToken.token}`;

    await sendEmail({
      to: teacherToken.email,
      subject: `Assessment Report Now Available — ${studentName}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#0a1628">Report access granted</h2>
        <p>Access to the assessment report for <strong>${studentName}</strong> has been authorised. You can now download your copy:</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Download Report</a>
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
      </div>`,
    });
    // Mark sentAt now that the email has actually been sent
    await db.update(reportTokensTable)
      .set({ sentAt: new Date(), updatedAt: new Date() })
      .where(eq(reportTokensTable.id, teacherToken.id));
  }

  res.json({ success: true });
});

// ── External: get report info by portal token ──────────────────────────────────
router.get("/report-access/:token", async (req, res) => {
  const [token] = await db.select().from(reportTokensTable).where(eq(reportTokensTable.token, req.params.token));
  if (!token) { res.status(404).json({ error: "not_found" }); return; }

  const [upload] = await db.select().from(reportUploadsTable).where(eq(reportUploadsTable.caseId, token.caseId));
  if (!upload) { res.status(404).json({ error: "report_not_ready" }); return; }

  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, token.caseId));

  // For teacher: check if parent has granted permission (or admin override)
  let canDownload = true;
  let awaitingConsent = false;

  if (token.role === "teacher") {
    const [parentToken] = await db.select().from(reportTokensTable)
      .where(and(eq(reportTokensTable.caseId, token.caseId), eq(reportTokensTable.role, "parent")));

    if (parentToken && !parentToken.permissionGranted) {
      canDownload = false;
      awaitingConsent = true;
    }
  }

  res.json({
    role: token.role,
    studentName: caseRow?.studentName ?? "Student",
    filename: upload.filename,
    canDownload,
    awaitingConsent,
    hasDownloaded: !!token.downloadedAt,
    permissionGranted: token.permissionGranted,
  });
});

// ── External: download report PDF ─────────────────────────────────────────────
router.get("/report-access/:token/download", async (req, res) => {
  const [token] = await db.select().from(reportTokensTable).where(eq(reportTokensTable.token, req.params.token));
  if (!token) { res.status(404).json({ error: "not_found" }); return; }

  // Teacher: check parental consent
  if (token.role === "teacher") {
    const [parentToken] = await db.select().from(reportTokensTable)
      .where(and(eq(reportTokensTable.caseId, token.caseId), eq(reportTokensTable.role, "parent")));
    if (parentToken && !parentToken.permissionGranted) {
      res.status(403).json({ error: "awaiting_consent" }); return;
    }
  }

  const [upload] = await db.select().from(reportUploadsTable).where(eq(reportUploadsTable.caseId, token.caseId));
  if (!upload) { res.status(404).json({ error: "report_not_ready" }); return; }

  // Record download timestamp on first download and notify admins
  if (!token.downloadedAt) {
    await db.update(reportTokensTable)
      .set({ downloadedAt: new Date(), updatedAt: new Date() })
      .where(eq(reportTokensTable.id, token.id));

    try {
      const [caseRowForNotif] = await db.select().from(casesTable).where(eq(casesTable.id, token.caseId));
      const studentNameForNotif = caseRowForNotif?.studentName ?? "Unknown student";
      const recipientLabel =
        token.role === "parent" ? "the parent / guardian"
        : token.role === "teacher" ? "the school teacher"
        : (token.recipientName || "an additional recipient");
      const downloadedAt = new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai", dateStyle: "full", timeStyle: "short" });
      const ADMIN_EMAILS = ["noelroberts43@gmail.com"];
      for (const adminEmail of ADMIN_EMAILS) {
        await sendEmail({
          to: adminEmail,
          subject: `Report Downloaded — ${studentNameForNotif}`,
          html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#0a1628">Report downloaded</h2>
            <p>The final assessment report for <strong>${studentNameForNotif}</strong> has been downloaded by ${recipientLabel} (<strong>${token.email}</strong>).</p>
            <p style="font-size:13px;color:#64748b">Downloaded: ${downloadedAt} (China Standard Time)</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Internal</p>
          </div>`,
        });
      }
    } catch (err) {
      console.error("Failed to send download notification to admins", err);
    }
  }

  // Stream file from object storage
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
    } else { res.end(); }
  } catch (err) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "File not found in storage" }); return;
    }
    console.error("Error downloading report", err);
    res.status(500).json({ error: "Download failed" });
  }
});

// ── External: parent grants/defers permission ─────────────────────────────────
router.post("/report-access/:token/permission", async (req, res) => {
  const [token] = await db.select().from(reportTokensTable).where(eq(reportTokensTable.token, req.params.token));
  if (!token) { res.status(404).json({ error: "not_found" }); return; }
  if (token.role !== "parent") { res.status(400).json({ error: "Only parents can grant permission" }); return; }

  const { grant } = req.body as { grant: boolean };

  await db.update(reportTokensTable)
    .set({ permissionGranted: grant, permissionGrantedAt: grant ? new Date() : null, updatedAt: new Date() })
    .where(eq(reportTokensTable.id, token.id));

  if (grant) {
    // Notify teacher that download is now available
    const [teacherToken] = await db.select().from(reportTokensTable)
      .where(and(eq(reportTokensTable.caseId, token.caseId), eq(reportTokensTable.role, "teacher")));
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, token.caseId));

    if (teacherToken && caseRow) {
      const base = getBaseUrl(req);
      const link = `${base}/external/${teacherToken.token}`;
      await sendEmail({
        to: teacherToken.email,
        subject: `Assessment Report Now Available — ${caseRow.studentName}`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#0a1628">Report access granted</h2>
          <p>The parent has given consent for the school to access the assessment report for <strong>${caseRow.studentName}</strong>. You can now download your copy:</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Download Report</a>
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
        </div>`,
      });
      // Mark sentAt now that the email has actually been sent
      await db.update(reportTokensTable)
        .set({ sentAt: new Date(), updatedAt: new Date() })
        .where(eq(reportTokensTable.id, teacherToken.id));
    }
  } else {
    // Parent chose "Not Yet" — notify admin if already downloaded
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, token.caseId));
    const ADMIN_EMAILS = ["noelroberts43@gmail.com"];
    for (const adminEmail of ADMIN_EMAILS) {
      await sendEmail({
        to: adminEmail,
        subject: `Action Required: Parent has not released report — ${caseRow?.studentName ?? token.caseId}`,
        html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#b45309">Parent has downloaded but not released the report</h2>
          <p>The parent for <strong>${caseRow?.studentName ?? "student"}</strong> has downloaded their copy of the assessment report but has chosen not to release it to the school at this time.</p>
          <p>You can review this in the case management portal and use the admin override if appropriate.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Internal</p>
        </div>`,
      });
    }
  }

  res.json({ success: true });
});

// ── Admin: download full case archive as ZIP ─────────────────────────────────
router.get("/cases/:id/archive", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const caseId = req.params.id;
  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, caseId));
  if (!caseRow) { res.status(404).json({ error: "case_not_found" }); return; }

  const [uploads, tokens, responses, scores, assignments] = await Promise.all([
    db.select().from(reportUploadsTable).where(eq(reportUploadsTable.caseId, caseId)).orderBy(asc(reportUploadsTable.uploadedAt)),
    db.select().from(reportTokensTable).where(eq(reportTokensTable.caseId, caseId)),
    db.select().from(responsesTable).where(eq(responsesTable.caseId, caseId)),
    db.select().from(scoresTable).where(eq(scoresTable.caseId, caseId)),
    db.select().from(assignmentsTable).where(eq(assignmentsTable.caseId, caseId)),
  ]);

  const safeName = (caseRow.studentName ?? caseId).replace(/[^a-zA-Z0-9_\- ]/g, "").trim();
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${safeName} - Case Archive.zip"`);

  const archive = archiver("zip", { zlib: { level: 6 } });
  archive.pipe(res);

  // Case data JSON
  archive.append(JSON.stringify({ caseData: caseRow, recipients: tokens, assignments }, null, 2), { name: "01 - case-data.json" });
  archive.append(JSON.stringify(responses, null, 2), { name: "02 - form-responses.json" });
  archive.append(JSON.stringify(scores, null, 2), { name: "03 - scores.json" });

  // Buffer all uploaded files before archiving to ensure complete, valid ZIP
  for (let i = 0; i < uploads.length; i++) {
    const upload = uploads[i];
    const idx = String(i + 1).padStart(2, "0");
    const date = upload.uploadedAt.toISOString().slice(0, 10);
    const tag = upload.label ? `${upload.label} ` : "";
    const entryName = `documents/${idx} - ${tag}${date} - ${upload.filename}`;
    try {
      const objectFile = await storage.getObjectEntityFile(upload.fileKey);
      const dlRes = await storage.downloadObject(objectFile);
      if (dlRes.body) {
        const arrayBuffer = await dlRes.arrayBuffer();
        archive.append(Buffer.from(arrayBuffer), { name: entryName });
      }
    } catch (err) {
      console.error("Archive: failed to include file", upload.filename, err);
    }
  }

  archive.finalize();
});

export default router;
