import { Router } from "express";
import { db } from "@workspace/db";
import { reportUploadsTable, reportTokensTable, casesTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";
import { sendEmail } from "../lib/outlookEmail.js";
import { randomUUID } from "crypto";
import { Readable } from "stream";

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
  const { fileKey, filename, parentEmail, teacherEmail } = req.body;

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
  const base = getBaseUrl(req);

  // Delete old tokens and regenerate
  await db.delete(reportTokensTable).where(eq(reportTokensTable.caseId, caseId));

  const roles: Array<{ role: "parent" | "teacher"; email: string }> = [];
  if (parentEmail) roles.push({ role: "parent", email: parentEmail });
  if (teacherEmail) roles.push({ role: "teacher", email: teacherEmail });

  const createdTokens: Record<string, string> = {};

  for (const { role, email } of roles) {
    const token = randomUUID();
    const tokenId = randomUUID();
    const link = `${base}/external/${token}`;

    await db.insert(reportTokensTable).values({
      id: tokenId,
      caseId,
      role,
      email,
      token,
      sentAt: new Date(),
    });

    createdTokens[role] = token;

    // Send email
    if (role === "parent") {
      await sendEmail({
        to: email,
        subject: `Assessment Report Ready — ${studentName}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#0a1628">Your child's assessment report is ready</h2>
            <p>The psychoeducational assessment report for <strong>${studentName}</strong> has been finalised and is ready for you to download.</p>
            <p>Please click the button below to access your confidential copy:</p>
            <p style="text-align:center;margin:28px 0">
              <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Download My Report</a>
            </p>
            <p style="font-size:13px;color:#64748b">After downloading, you will be asked whether you give permission for <strong>${schoolName}</strong> to access their copy of the report. This is entirely your choice.</p>
            <p style="font-size:13px;color:#64748b">This link is unique to you. Please do not share it.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
          </div>`,
      });
    } else {
      await sendEmail({
        to: email,
        subject: `Assessment Report — ${studentName} (Pending Parental Consent)`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
            <h2 style="color:#0a1628">Assessment report ready — awaiting parental consent</h2>
            <p>The psychoeducational assessment report for <strong>${studentName}</strong> has been finalised.</p>
            <p>As the report is confidential, the parents have been notified first. You will receive a follow-up email as soon as parental consent to release the report to the school has been provided.</p>
            <p style="font-size:13px;color:#64748b">If you have any questions, please contact the ReMynd assessment team directly.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
            <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
          </div>`,
      });
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
    const base = getBaseUrl(req);
    const link = `${base}/external/${t.token}`;

    await sendEmail({
      to: email,
      subject: `Assessment Report — ${studentName}`,
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#0a1628">Your assessment report link</h2>
        <p>Please use the link below to access the report for <strong>${studentName}</strong>:</p>
        <p style="text-align:center;margin:28px 0">
          <a href="${link}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Access Report</a>
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="font-size:12px;color:#94a3b8">ReMynd Student Services · Confidential</p>
      </div>`,
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
