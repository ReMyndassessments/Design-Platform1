import { Router } from "express";
import { db } from "@workspace/db";
import { reportUploadsTable, reportTokensTable, casesTable, usersTable } from "@workspace/db/schema";
import { eq, and, or, sql, inArray } from "drizzle-orm";
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

// ── Admin: get report upload + token status for a case ────────────────────────
router.get("/cases/:id/report-access", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "assessment_invigilator") {
    res.status(403).json({ error: "forbidden" }); return;
  }
  const caseId = req.params.id;

  const [upload] = await db.select().from(reportUploadsTable).where(eq(reportUploadsTable.caseId, caseId));
  const tokens = await db.select().from(reportTokensTable).where(eq(reportTokensTable.caseId, caseId));

  res.json({ upload: upload ?? null, tokens });
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
    parentEmail,
    teacherEmail,
    notifyTeam = false,
    additionalRecipients = [],
  }: {
    fileKey: string;
    filename: string;
    parentEmail?: string;
    teacherEmail?: string;
    notifyTeam?: boolean;
    additionalRecipients?: Array<{ name: string; email: string }>;
  } = req.body;

  if (!fileKey || !filename) {
    res.status(400).json({ error: "fileKey and filename required" }); return;
  }

  // Upsert report upload record
  const uploadId = randomUUID();
  await db.delete(reportUploadsTable).where(eq(reportUploadsTable.caseId, caseId));
  await db.insert(reportUploadsTable).values({
    id: uploadId,
    caseId,
    fileKey,
    filename,
    uploadedBy: req.userId ?? "admin",
  });

  // Get case info for emails
  const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, caseId));
  const studentName = caseRow?.studentName ?? "your student";
  const schoolName = caseRow?.school ?? "the school";
  const lang = normLang(caseRow?.languagePreference);
  const base = getBaseUrl(req);

  // Delete old tokens and regenerate
  await db.delete(reportTokensTable).where(eq(reportTokensTable.caseId, caseId));

  const createdTokens: Record<string, string> = {};

  // Parent token
  if (parentEmail) {
    const token = randomUUID();
    await db.insert(reportTokensTable).values({
      id: randomUUID(), caseId, role: "parent", email: parentEmail, token, sentAt: new Date(),
    });
    createdTokens["parent"] = token;
    const link = `${base}/external/${token}`;
    await sendEmail({
      to: parentEmail,
      subject: EMAIL_COPY.parentSubject[lang](studentName),
      html: buildParentEmail(lang, studentName, schoolName, link),
    });
  }

  // Teacher token — no email until parent grants consent
  if (teacherEmail) {
    const token = randomUUID();
    await db.insert(reportTokensTable).values({
      id: randomUUID(), caseId, role: "teacher", email: teacherEmail, token, sentAt: new Date(),
    });
    createdTokens["teacher"] = token;
  }

  // Additional consented recipients — immediate download links
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

  // Optionally notify assigned internal team (invigilator + psychometrician)
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
              <p>The final psychoeducational assessment report for <strong>${studentName}</strong> has been uploaded to RAOS.</p>
              <p>You can download your copy directly from the case:</p>
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
      console.error("Failed to notify internal team of report upload", err);
    }
  }

  res.json({ success: true, tokens: createdTokens });
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

  // Record download timestamp on first download
  if (!token.downloadedAt) {
    await db.update(reportTokensTable)
      .set({ downloadedAt: new Date(), updatedAt: new Date() })
      .where(eq(reportTokensTable.id, token.id));
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
    }
  } else {
    // Parent chose "Not Yet" — notify admin if already downloaded
    const [caseRow] = await db.select().from(casesTable).where(eq(casesTable.id, token.caseId));
    const ADMIN_EMAILS = ["noelroberts43@gmail.com", "hayleyxu13@gmail.com"];
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

export default router;
