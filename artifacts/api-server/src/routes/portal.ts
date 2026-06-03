import { Router } from "express";
import { db } from "@workspace/db";
import { inquiriesTable, casesTable, assignmentsTable, referralInvitesTable } from "@workspace/db/schema";
import { nanoid } from "nanoid";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { sendInquiryNotification, sendEmail } from "../lib/outlookEmail.js";
import { logger } from "../lib/logger.js";
import { getAdminEmails } from "../lib/adminEmails.js";

const router = Router();

async function getInquiryNotifyEmails(): Promise<string[]> {
  const envList = (process.env.INQUIRY_NOTIFY_EMAIL || "")
    .split(",").map((e) => e.trim()).filter(Boolean);
  return envList.length > 0 ? envList : getAdminEmails();
}

router.post("/portal/inquiry", async (req, res) => {
  const {
    inquiryType,
    contactName,
    contactEmail,
    contactPhone,
    organisation,
    role,
    studentName,
    studentAge,
    yearGroup,
    message,
    wechatId,
    whatsappId,
  } = req.body;

  if (!inquiryType || !contactName || !contactEmail || !message) {
    res.status(400).json({ error: "bad_request", message: "Missing required fields" });
    return;
  }

  if (!["school", "parent", "partner_school"].includes(inquiryType)) {
    res.status(400).json({ error: "bad_request", message: "Invalid inquiry type" });
    return;
  }

  const {
    schoolType,
    schoolLocation,
    enrollment,
    currentSupport,
    howHeard,
    timeline,
  } = req.body;

  const row = await db.insert(inquiriesTable).values({
    id: nanoid(),
    inquiryType,
    contactName,
    contactEmail,
    contactPhone: contactPhone || null,
    wechatId: wechatId || null,
    whatsappId: whatsappId || null,
    organisation: organisation || null,
    role: role || null,
    studentName: studentName || null,
    studentAge: studentAge || null,
    yearGroup: yearGroup || null,
    message,
    schoolType: schoolType || null,
    schoolLocation: schoolLocation || null,
    enrollment: enrollment || null,
    currentSupport: currentSupport || null,
    howHeard: howHeard || null,
    timeline: timeline || null,
    status: "new",
  }).returning();

  getInquiryNotifyEmails().then(notifyEmails => {
    return sendInquiryNotification(
      {
        inquiryType,
        contactName,
        contactEmail,
        contactPhone,
        organisation,
        role,
        studentName,
        studentAge,
        yearGroup,
        message,
        wechatId,
        whatsappId,
        schoolType,
        schoolLocation,
        enrollment,
        currentSupport,
        howHeard,
        timeline,
      },
      notifyEmails
    ).then((fromAddress) => {
      logger.info({ from: fromAddress, to: notifyEmails }, "[email] Inquiry notification sent successfully");
    });
  }).catch((err) => {
    logger.error({ error: String(err) }, "[email] FAILED to send inquiry notification");
  });

  res.status(201).json({ success: true, id: row[0]?.id });
});

router.get("/portal/inquiries", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "assessment_invigilator") {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const rows = await db
    .select()
    .from(inquiriesTable)
    .orderBy(sql`${inquiriesTable.createdAt} DESC`);

  res.json(rows);
});

router.patch("/portal/inquiries/:id/status", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "assessment_invigilator") {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const { status } = req.body;
  const validStatuses = ["new", "contacted", "converted", "closed"];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: "bad_request", message: "Invalid status" });
    return;
  }

  await db
    .update(inquiriesTable)
    .set({ status, updatedAt: new Date() })
    .where(sql`${inquiriesTable.id} = ${req.params.id}`);

  res.json({ success: true });
});

// ── Send referral form invite to a school contact ───────────────────────────
router.post("/portal/send-referral-invite", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin" && req.userRole !== "assessment_invigilator") {
    res.status(403).json({ error: "forbidden" }); return;
  }

  const { toEmail, toName, schoolName, note, formId, includeConsent, sendEmail: doSendEmail = true, existingToken } = req.body;
  if (!toEmail || !toName) {
    res.status(400).json({ error: "bad_request", message: "toEmail and toName are required" }); return;
  }

  const VALID_FORM_IDS = ["REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING"];
  const resolvedFormId = VALID_FORM_IDS.includes(formId) ? formId : "REFERRAL";

  const FORM_LABELS: Record<string, string> = {
    "REFERRAL":          "Referral Form — School",
    "REFERRAL-CORP":     "Referral Form — Corporate",
    "REFERRAL-UNI":      "Referral Form — University",
    "REFERRAL-PARENT":   "Referral Form — Parent",
    "REFERRAL-BOARDING": "Referral Form — Boarding School",
  };
  const formLabel = FORM_LABELS[resolvedFormId] ?? "Referral Form";

  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const host  = req.headers.host as string ?? "localhost";
  const baseUrl = `${proto}://${host}`;

  // ── Reuse existing invite token if already generated this session ──────────
  let inviteToken: string;
  if (existingToken) {
    inviteToken = existingToken;
  } else {
    // ── Create a lightweight invite record — NO case or assignment yet ────────
    inviteToken = crypto.randomBytes(24).toString("hex");
    await db.insert(referralInvitesTable).values({
      token:          inviteToken,
      formId:         resolvedFormId,
      includeConsent: !!includeConsent,
      toEmail,
      toName,
      schoolName:     schoolName || null,
    });
  }

  const portalLink = `${baseUrl}/external/${inviteToken}`;

  // ── Optionally send email ──────────────────────────────────────────────────
  if (doSendEmail) {
    const schoolLine = schoolName ? `<p style="margin:0 0 12px;font-size:14px;color:#475569">We are reaching out regarding assessment services for students at <strong>${schoolName}</strong>.</p>` : "";
    const noteLine   = note ? `<p style="margin:0 0 20px;font-size:14px;color:#475569;font-style:italic">${note}</p>` : "";
    const formCount  = includeConsent ? "forms" : "form";
    const formTakes  = includeConsent ? "they take" : "it takes";

    const html = `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;color:#1e293b">
    <div style="background:#0a1628;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
      <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.3px">ReMynd Student Services</p>
      <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Assessment Operating System</p>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
      <h2 style="margin:0 0 16px;font-size:18px;color:#0a1628">Hi ${toName},</h2>
      <p style="margin:0 0 12px;font-size:14px;color:#475569">Thank you for your interest in ReMynd Student Services. Please complete the ${formCount} at the link below — ${formTakes} just a few minutes.</p>
      ${schoolLine}${noteLine}
      <p style="margin:0 0 24px;font-size:14px;color:#475569">Once received, a member of our team will be in touch within one business day to discuss next steps. You can return to this link at any time.</p>
      <p style="text-align:center;margin:28px 0">
        <a href="${portalLink}" style="background:#1d4ed8;color:#fff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Open ${formLabel} ↗</a>
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
      <p style="font-size:12px;color:#94a3b8;text-align:center">ReMynd Student Services · Confidential<br/>This invitation was sent by our assessment team.</p>
    </div>
  </div>`;

    try {
      await sendEmail({ to: toEmail, subject: `${formLabel} — ReMynd Student Services`, html });
    } catch (err: any) {
      logger.error({ error: String(err) }, "[email] Failed to send referral invite");
      res.status(502).json({ error: "send_failed", message: "Invite created but email could not be sent." }); return;
    }
  }

  res.json({ success: true, link: portalLink, inviteToken });
});

router.delete("/portal/inquiries/:id", authMiddleware, async (req, res) => {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  await db
    .delete(inquiriesTable)
    .where(sql`${inquiriesTable.id} = ${req.params.id}`);

  res.json({ success: true });
});

export default router;
