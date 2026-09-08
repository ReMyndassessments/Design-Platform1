import { Router } from "express";
import { db } from "@workspace/db";
import { sql, SQL } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { sendEmail } from "../lib/outlookEmail.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import type { Request, Response, NextFunction } from "express";
import { Readable } from "stream";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if ((req as any).userRole !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}
import { getAdminEmails } from "../lib/adminEmails.js";
import { logger } from "../lib/logger.js";

const router = Router();
const storage = new ObjectStorageService();

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEmailRow(label: string, value: string | null | undefined) {
  if (!value) return "";
  return `<tr><td style="padding:5px 12px;font-weight:600;color:#475569;white-space:nowrap;vertical-align:top;font-size:13px">${label}</td><td style="padding:5px 12px;color:#0f172a;font-size:13px">${value}</td></tr>`;
}

function escapeHtml(value: string | null | undefined): string {
  return (value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[char]!));
}

function workshopManualSalesMode(): boolean {
  return process.env.WORKSHOP_MANUAL_SALES_MODE === "true";
}

function shouldSendManualSalesEmails(): boolean {
  return process.env.NODE_ENV === "production" && process.env.WORKSHOP_MANUAL_SALES_EMAIL_ENABLED !== "false";
}

function publicQrPath(value: string | undefined): string | null {
  const path = value?.trim();
  return path && (path.startsWith("/") || path.startsWith("https://")) ? path : null;
}

function workshopList(reg: any): string {
  const ws = [];
  if (reg.workshop_1_selected) ws.push("Workshop 1 — Why Is This Student Struggling?");
  if (reg.workshop_2_selected) ws.push("Workshop 2 — Understanding the ReMynd Assessment Ecosystem");
  if (reg.workshop_3_selected) ws.push("Workshop 3 — Thinking Like a ReMynd Clinician");
  if (reg.workshop_4_selected) ws.push("Workshop 4 — The Comprehensive Educational Profile & Support Plan");
  return ws.length ? ws.join("<br>") : "None selected";
}

async function sendTrainingConfirmation(reg: any): Promise<void> {
  const toEmail = reg.email;
  const firstName = reg.first_name;
  const ws = workshopList(reg);

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
  <div style="background:#0f172a;padding:28px 32px;border-radius:12px 12px 0 0">
    <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.1em;color:#94a3b8;text-transform:uppercase;font-weight:600">ReMynd Student Services</p>
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">You're Registered — ReMynd Assessment System Training</h1>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:32px">
    <p style="margin:0 0 16px 0;color:#0f172a;font-size:15px">Dear ${firstName},</p>
    <p style="margin:0 0 16px 0;color:#334155;font-size:14px;line-height:1.7">
      Thank you for registering for the <strong>ReMynd Assessment System Training Series</strong>.
      We are delighted to have you join educators and student-support professionals exploring how schools can move from student concern toward deeper educational understanding and more effective support.
    </p>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:20px 0">
      <p style="margin:0 0 8px 0;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Your Workshop Registrations</p>
      <p style="margin:0;font-size:14px;color:#0f172a;line-height:1.8">${ws}</p>
    </div>

    <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:14px 18px;margin:20px 0">
      <p style="margin:0;font-size:13px;color:#065f46">
        <strong>Participation is complimentary.</strong> This programme is offered as part of ReMynd Student Services' commitment to strengthening schools' capacity to support students.
      </p>
    </div>

    <p style="margin:16px 0;color:#334155;font-size:14px;line-height:1.7">
      <strong>Programme window: September–October 2026</strong><br>
      Final workshop dates, joining instructions, and programme details will be sent to your registered email address in advance of each session.
    </p>

    <p style="margin:24px 0 8px 0;color:#334155;font-size:14px;line-height:1.7">
      There is no requirement to purchase ReMynd assessment services in order to participate.
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
    <p style="margin:0;font-size:12px;color:#94a3b8;font-style:italic;text-align:center;line-height:1.7">
      Understand First. See the Whole Learner. Act on Understanding. Support Growth.<br>
      <a href="https://remyndassessments.com" style="color:#0ea5e9;text-decoration:none">remyndassessments.com</a>
    </p>
  </div>
</div>`;

  await sendEmail({ to: toEmail, subject: "You're Registered — ReMynd Assessment System Training", html });
}

async function sendTrainingAdminNotification(reg: any, adminEmails: string[]): Promise<void> {
  const toList = adminEmails.join(", ");
  const ws = workshopList(reg);
  const areasOfInterest = Array.isArray(reg.areas_of_interest) ? reg.areas_of_interest.join(", ") : (reg.areas_of_interest ?? "");
  const adminUrl = `https://remyndassessments.com/admin/training-registrations`;

  const rows = [
    makeEmailRow("Name", `${reg.first_name} ${reg.last_name}`),
    makeEmailRow("Email", reg.email),
    makeEmailRow("Job Title", reg.job_title),
    makeEmailRow("Role", reg.professional_role + (reg.professional_role_other ? ` — ${reg.professional_role_other}` : "")),
    makeEmailRow("School", reg.school_name),
    makeEmailRow("City / Country", [reg.city, reg.country].filter(Boolean).join(", ")),
    makeEmailRow("School Type", reg.school_type),
    makeEmailRow("School Size", reg.school_size),
    makeEmailRow("Workshops", ws),
    makeEmailRow("Areas of Interest", areasOfInterest),
    makeEmailRow("School Challenge", reg.school_support_challenge),
    makeEmailRow("Future School Training", reg.interested_school_training ? "Yes" : "No"),
    makeEmailRow("Assessment Services Interest", reg.interested_assessment_services ? "Yes" : "No"),
    makeEmailRow("Partner School Interest", reg.interested_partner_school ? "Yes" : "No"),
    makeEmailRow("Marketing Consent", reg.marketing_consent ? "Yes ✓" : "No"),
    makeEmailRow("Registration Time", new Date(reg.created_at).toISOString()),
  ].join("");

  const html = `
<div style="font-family:sans-serif;max-width:640px;margin:0 auto">
  <div style="background:#0f172a;padding:24px 28px;border-radius:12px 12px 0 0">
    <p style="margin:0 0 4px 0;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;font-weight:600">RAOS Admin</p>
    <h1 style="margin:0;color:#fff;font-size:17px">New Training Registration — ${reg.first_name} ${reg.last_name}</h1>
    <p style="margin:4px 0 0 0;color:#94a3b8;font-size:13px">${reg.school_name ?? ""}</p>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px">
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
      <a href="${adminUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">View in Admin →</a>
    </div>
  </div>
</div>`;

  await sendEmail({
    to: toList,
    subject: `New ReMynd Training Registration — ${reg.first_name} ${reg.last_name} — ${reg.school_name ?? reg.email}`,
    html,
  });
}

async function sendSchoolInquiryNotification(inq: any, adminEmails: string[]): Promise<void> {
  const rows = [
    makeEmailRow("Name", inq.contact_name),
    makeEmailRow("Email", inq.contact_email),
    makeEmailRow("Role", inq.role),
    makeEmailRow("School", inq.school_name),
    makeEmailRow("Country", inq.country),
    makeEmailRow("School Size", inq.school_size),
    makeEmailRow("Preferred Contact", inq.preferred_contact),
    makeEmailRow("Message", inq.message),
  ].join("");

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <div style="background:#0d9488;padding:24px 28px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;color:#fff;font-size:17px">Bring This Series To My School — New Inquiry</h1>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px">
    <table style="width:100%;border-collapse:collapse">${rows}</table>
  </div>
</div>`;

  await sendEmail({
    to: adminEmails.join(", "),
    subject: `School Training Inquiry — ${inq.contact_name} — ${inq.school_name ?? inq.contact_email}`,
    html,
  });
}

function parseArrayField(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : [val]; } catch { return val.split(",").map(s => s.trim()).filter(Boolean); }
  }
  return [];
}

// ── Public: Register ──────────────────────────────────────────────────────────
router.post("/training/register", async (req, res) => {
  try {
    const {
      first_name, last_name, email, job_title, professional_role, professional_role_other,
      school_name, city, country, school_type, school_size,
      workshop_1_selected, workshop_2_selected, workshop_3_selected, workshop_4_selected,
      full_series_selected, areas_of_interest, school_support_challenge,
      interested_future_learning, interested_school_training, interested_assessment_services,
      interested_partner_school, training_only,
      marketing_consent, privacy_consent, registration_source,
    } = req.body;

    // Validation
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "First name, last name and email are required" });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    if (!privacy_consent) {
      return res.status(400).json({ error: "Privacy consent is required" });
    }

    const normalEmail = email.trim().toLowerCase();
    const now = new Date();
    const consentTs = marketing_consent ? now.toISOString() : null;

    // Duplicate check — upsert on email
    const existing = await db.execute(sql`SELECT id FROM training_registrations WHERE email = ${normalEmail}`);

    let regId: string;
    let regRow: any;

    if (existing.rows.length > 0) {
      regId = (existing.rows[0] as any).id;
      await db.execute(sql`UPDATE training_registrations SET
        first_name = ${first_name.trim()},
        last_name = ${last_name.trim()},
        job_title = ${job_title?.trim() ?? null},
        professional_role = ${professional_role ?? null},
        professional_role_other = ${professional_role_other?.trim() ?? null},
        school_name = ${school_name?.trim() ?? null},
        city = ${city?.trim() ?? null},
        country = ${country?.trim() ?? null},
        school_type = ${school_type ?? null},
        school_size = ${school_size ?? null},
        workshop_1_selected = ${!!workshop_1_selected},
        workshop_2_selected = ${!!workshop_2_selected},
        workshop_3_selected = ${!!workshop_3_selected},
        workshop_4_selected = ${!!workshop_4_selected},
        full_series_selected = ${!!full_series_selected},
        areas_of_interest = ${JSON.stringify(parseArrayField(areas_of_interest))}::jsonb,
        school_support_challenge = ${school_support_challenge?.trim() ?? null},
        interested_future_learning = ${!!interested_future_learning},
        interested_school_training = ${!!interested_school_training},
        interested_assessment_services = ${!!interested_assessment_services},
        interested_partner_school = ${!!interested_partner_school},
        training_only = ${!!training_only},
        marketing_consent = CASE WHEN ${!!marketing_consent} = TRUE THEN TRUE ELSE marketing_consent END,
        marketing_consent_timestamp = CASE WHEN ${!!marketing_consent} = TRUE AND marketing_consent_timestamp IS NULL THEN ${now.toISOString()} ELSE marketing_consent_timestamp END,
        registration_source = COALESCE(${registration_source ?? null}, registration_source),
        updated_at = NOW()
        WHERE id = ${regId}`);
    } else {
      regId = nanoid();
      await db.execute(sql`INSERT INTO training_registrations (
        id, first_name, last_name, email, job_title, professional_role, professional_role_other,
        school_name, city, country, school_type, school_size,
        workshop_1_selected, workshop_2_selected, workshop_3_selected, workshop_4_selected,
        full_series_selected, areas_of_interest, school_support_challenge,
        interested_future_learning, interested_school_training, interested_assessment_services,
        interested_partner_school, training_only,
        marketing_consent, marketing_consent_timestamp,
        privacy_consent, privacy_consent_timestamp,
        registration_source, status, created_at, updated_at
      ) VALUES (
        ${regId}, ${first_name.trim()}, ${last_name.trim()}, ${normalEmail},
        ${job_title?.trim() ?? null}, ${professional_role ?? null}, ${professional_role_other?.trim() ?? null},
        ${school_name?.trim() ?? null}, ${city?.trim() ?? null}, ${country?.trim() ?? null},
        ${school_type ?? null}, ${school_size ?? null},
        ${!!workshop_1_selected}, ${!!workshop_2_selected}, ${!!workshop_3_selected}, ${!!workshop_4_selected},
        ${!!full_series_selected}, ${JSON.stringify(parseArrayField(areas_of_interest))}::jsonb,
        ${school_support_challenge?.trim() ?? null},
        ${!!interested_future_learning}, ${!!interested_school_training},
        ${!!interested_assessment_services}, ${!!interested_partner_school}, ${!!training_only},
        ${!!marketing_consent}, ${consentTs}::timestamptz,
        TRUE, ${now.toISOString()}::timestamptz,
        ${registration_source ?? null}, 'registered', NOW(), NOW()
      )`);
    }

    // Fetch the row for emails
    const fetched = await db.execute(sql`SELECT * FROM training_registrations WHERE id = ${regId}`);
    regRow = fetched.rows[0];

    // Fire emails async — don't block response or fail registration
    (async () => {
      try {
        await sendTrainingConfirmation(regRow);
        await db.execute(sql`UPDATE training_registrations SET confirmation_email_sent_at = NOW(), confirmation_email_status = 'sent' WHERE id = ${regId}`);
      } catch (err) {
        logger.error({ err, regId }, "Failed to send training confirmation email");
        await db.execute(sql`UPDATE training_registrations SET confirmation_email_status = 'failed' WHERE id = ${regId}`).catch(() => {});
      }
      try {
        const notifyEnv = process.env.TRAINING_ADMIN_NOTIFICATION_EMAIL;
        const adminEmails = notifyEnv
          ? notifyEnv.split(",").map(e => e.trim()).filter(Boolean)
          : await getAdminEmails();
        if (adminEmails.length > 0) {
          await sendTrainingAdminNotification(regRow, adminEmails);
          await db.execute(sql`UPDATE training_registrations SET admin_notification_sent_at = NOW(), admin_notification_status = 'sent' WHERE id = ${regId}`);
        }
      } catch (err) {
        logger.error({ err, regId }, "Failed to send training admin notification");
        await db.execute(sql`UPDATE training_registrations SET admin_notification_status = 'failed' WHERE id = ${regId}`).catch(() => {});
      }
    })();

    return res.status(201).json({ ok: true, id: regId });
  } catch (err) {
    logger.error({ err }, "Training registration failed");
    return res.status(500).json({ error: "Registration failed" });
  }
});

// ── Public: Bring Series to School inquiry ────────────────────────────────────
router.post("/training/school-inquiry", async (req, res) => {
  try {
    const { contact_name, contact_email, role, school_name, country, school_size, preferred_contact, message } = req.body;
    if (!contact_name?.trim() || !contact_email?.trim()) {
      return res.status(400).json({ error: "Name and email are required" });
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(contact_email.trim())) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    const id = nanoid();
    await db.execute(sql`INSERT INTO training_school_inquiries
      (id, contact_name, contact_email, role, school_name, country, school_size, preferred_contact, message, created_at)
      VALUES (${id}, ${contact_name.trim()}, ${contact_email.trim().toLowerCase()},
        ${role?.trim() ?? null}, ${school_name?.trim() ?? null}, ${country?.trim() ?? null},
        ${school_size ?? null}, ${preferred_contact ?? null}, ${message?.trim() ?? null}, NOW())`);

    // Fire admin notification async
    (async () => {
      try {
        const notifyEnv = process.env.TRAINING_ADMIN_NOTIFICATION_EMAIL;
        const adminEmails = notifyEnv
          ? notifyEnv.split(",").map(e => e.trim()).filter(Boolean)
          : await getAdminEmails();
        if (adminEmails.length > 0) {
          await sendSchoolInquiryNotification(req.body, adminEmails);
        }
      } catch (err) {
        logger.error({ err }, "Failed to send school inquiry notification");
      }
    })();

    return res.status(201).json({ ok: true, id });
  } catch (err) {
    logger.error({ err }, "School inquiry submission failed");
    return res.status(500).json({ error: "Submission failed" });
  }
});

// ── Admin: List registrations ─────────────────────────────────────────────────
router.get("/training/registrations", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { workshop, role, country, school, marketing_consent, assessment_interest, partner_school, status, search } = req.query as Record<string, string>;

    const conditions: SQL[] = [sql`1=1`];

    if (workshop === "1") conditions.push(sql`workshop_1_selected = TRUE`);
    else if (workshop === "2") conditions.push(sql`workshop_2_selected = TRUE`);
    else if (workshop === "3") conditions.push(sql`workshop_3_selected = TRUE`);
    else if (workshop === "4") conditions.push(sql`workshop_4_selected = TRUE`);

    if (role) conditions.push(sql`professional_role = ${role}`);
    if (country) conditions.push(sql`country ILIKE ${"%" + country + "%"}`);
    if (school) conditions.push(sql`school_name ILIKE ${"%" + school + "%"}`);
    if (marketing_consent === "true") conditions.push(sql`marketing_consent = TRUE`);
    if (marketing_consent === "false") conditions.push(sql`marketing_consent = FALSE`);
    if (assessment_interest === "true") conditions.push(sql`interested_assessment_services = TRUE`);
    if (partner_school === "true") conditions.push(sql`interested_partner_school = TRUE`);
    if (status) conditions.push(sql`status = ${status}`);
    if (search) {
      const like = "%" + search + "%";
      conditions.push(sql`(first_name ILIKE ${like} OR last_name ILIKE ${like} OR email ILIKE ${like} OR school_name ILIKE ${like})`);
    }

    const whereClause = sql.join(conditions, sql` AND `);
    const result = await db.execute(sql`SELECT * FROM training_registrations WHERE ${whereClause} ORDER BY created_at DESC`);
    return res.json({ registrations: result.rows });
  } catch (err) {
    logger.error({ err }, "Failed to list training registrations");
    return res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

// ── Admin: Stats ──────────────────────────────────────────────────────────────
router.get("/training/registrations/stats", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const r = await db.execute(sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE full_series_selected)::int AS full_series,
        COUNT(*) FILTER (WHERE workshop_1_selected)::int AS workshop_1,
        COUNT(*) FILTER (WHERE workshop_2_selected)::int AS workshop_2,
        COUNT(*) FILTER (WHERE workshop_3_selected)::int AS workshop_3,
        COUNT(*) FILTER (WHERE workshop_4_selected)::int AS workshop_4,
        COUNT(DISTINCT school_name) FILTER (WHERE school_name IS NOT NULL)::int AS schools,
        COUNT(DISTINCT country) FILTER (WHERE country IS NOT NULL)::int AS countries,
        COUNT(*) FILTER (WHERE marketing_consent = TRUE)::int AS marketing_opt_ins,
        COUNT(*) FILTER (WHERE interested_school_training = TRUE)::int AS school_training_inquiries,
        COUNT(*) FILTER (WHERE interested_assessment_services = TRUE)::int AS assessment_inquiries,
        COUNT(*) FILTER (WHERE interested_partner_school = TRUE)::int AS partner_school_inquiries
      FROM training_registrations
    `);
    const schoolInquiries = await db.execute(sql`SELECT COUNT(*)::int AS total FROM training_school_inquiries`);
    return res.json({ stats: r.rows[0], school_inquiry_total: (schoolInquiries.rows[0] as any).total });
  } catch (err) {
    logger.error({ err }, "Failed to get training stats");
    return res.status(500).json({ error: "Failed" });
  }
});

// ── Admin: Get single registrant ──────────────────────────────────────────────
router.get("/training/registrations/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM training_registrations WHERE id = ${req.params.id}`);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    return res.json({ registration: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "Failed to get training registration");
    return res.status(500).json({ error: "Failed" });
  }
});

// ── Admin: Update status ──────────────────────────────────────────────────────
router.patch("/training/registrations/:id/status", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status, internal_notes } = req.body;
    const allowed = ["registered", "confirmed", "attended", "no_show", "cancelled"];
    if (status && !allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    await db.execute(sql`UPDATE training_registrations SET
      status = COALESCE(${status ?? null}, status),
      internal_notes = COALESCE(${internal_notes ?? null}, internal_notes),
      updated_at = NOW()
      WHERE id = ${req.params.id}`);
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to update training registration");
    return res.status(500).json({ error: "Failed" });
  }
});

// ── Admin: CSV Export ─────────────────────────────────────────────────────────
router.get("/training/registrations/export/csv", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM training_registrations ORDER BY created_at DESC`);
    const rows = result.rows as any[];
    const columns: Array<[string, (row: any) => unknown]> = [
      ["First Name", r => r.first_name], ["Last Name", r => r.last_name],
      ["Email", r => r.email], ["Job Title", r => r.job_title],
      ["Professional Role", r => r.professional_role],
      ["Other Role", r => r.professional_role_other],
      ["School / Organisation", r => r.school_name], ["City", r => r.city],
      ["Country / Region", r => r.country], ["School Type", r => r.school_type],
      ["Approximate Student Count", r => r.school_size],
      ["Workshop 1", r => r.workshop_1_selected ? "Yes" : "No"],
      ["Workshop 2", r => r.workshop_2_selected ? "Yes" : "No"],
      ["Workshop 3", r => r.workshop_3_selected ? "Yes" : "No"],
      ["Workshop 4", r => r.workshop_4_selected ? "Yes" : "No"],
      ["Full Series", r => r.full_series_selected ? "Yes" : "No"],
      ["Areas of Interest", r => Array.isArray(r.areas_of_interest) ? r.areas_of_interest.join("; ") : ""],
      ["School Support Challenge", r => r.school_support_challenge],
      ["Future Learning Interest", r => r.interested_future_learning ? "Yes" : "No"],
      ["School Training Interest", r => r.interested_school_training ? "Yes" : "No"],
      ["Assessment Services Interest", r => r.interested_assessment_services ? "Yes" : "No"],
      ["Partner School Interest", r => r.interested_partner_school ? "Yes" : "No"],
      ["Training Only", r => r.training_only ? "Yes" : "No"],
      ["Marketing Consent", r => r.marketing_consent ? "Yes" : "No"],
      ["Registration Status", r => r.status],
      ["Confirmation Email", r => r.confirmation_email_status],
      ["Registered At", r => r.created_at],
    ];
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const csv = [
      columns.map(([label]) => escape(label)).join(","),
      ...rows.map(row => columns.map(([, value]) => escape(value(row))).join(",")),
    ].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="series-registrations-${Date.now()}.csv"`);
    return res.send(`\uFEFF${csv}`);
  } catch (err) {
    logger.error({ err }, "Failed to export training registrations");
    return res.status(500).json({ error: "Failed" });
  }
});

// ============================================================
//  WORKSHOP BUILDER
// ============================================================

function makeSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 80);
}

async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  let slug = baseSlug;
  let counter = 0;
  while (true) {
    const existing = excludeId
      ? await db.execute(sql`SELECT id FROM workshops WHERE slug = ${slug} AND id != ${excludeId}`)
      : await db.execute(sql`SELECT id FROM workshops WHERE slug = ${slug}`);
    if (existing.rows.length === 0) return slug;
    counter++;
    slug = `${baseSlug}-${counter}`;
  }
}

async function sendWorkshopConfirmation(reg: { id: string; first_name: string; last_name: string; email: string }, workshop: any): Promise<void> {
  const sessions: any[] = Array.isArray(workshop.session_dates) ? workshop.session_dates : [];
  const dateStr = sessions.length
    ? sessions.map((s: any) => `${s.date}${s.start_time ? ` ${s.start_time}–${s.end_time ?? ''}` : ''}`).join('; ')
    : 'Dates to be confirmed';

  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#ffffff">
  <div style="background:#0f172a;padding:28px 32px;border-radius:12px 12px 0 0">
    <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.1em;color:#94a3b8;text-transform:uppercase;font-weight:600">ReMynd Student Services</p>
    <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">You're Registered — ${workshop.title}</h1>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:32px">
    <p style="margin:0 0 16px 0;color:#0f172a;font-size:15px">Dear ${reg.first_name},</p>
    <p style="margin:0 0 16px 0;color:#334155;font-size:14px;line-height:1.7">Thank you for registering for <strong>${workshop.title}</strong>${workshop.subtitle ? ` — ${workshop.subtitle}` : ''}.</p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:20px 0">
      ${dateStr ? `<p style="margin:0 0 4px 0;font-size:14px;color:#0f172a"><strong>Date:</strong> ${dateStr}</p>` : ''}
      ${workshop.timezone ? `<p style="margin:0 0 4px 0;font-size:14px;color:#0f172a"><strong>Time zone:</strong> ${workshop.timezone}</p>` : ''}
      ${workshop.delivery_method ? `<p style="margin:0 0 4px 0;font-size:14px;color:#0f172a"><strong>Delivery:</strong> ${workshop.delivery_method}</p>` : ''}
      ${workshop.venue_info ? `<p style="margin:0;font-size:14px;color:#0f172a"><strong>Venue:</strong> ${workshop.venue_info}</p>` : ''}
    </div>
    ${workshop.contact_email ? `<p style="margin:16px 0;color:#334155;font-size:14px">Questions? <a href="mailto:${workshop.contact_email}" style="color:#0ea5e9">${workshop.contact_email}</a></p>` : ''}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0">
    <p style="margin:0;font-size:12px;color:#94a3b8;font-style:italic;text-align:center">ReMynd Student Services — <a href="https://remyndassessments.com" style="color:#0ea5e9;text-decoration:none">remyndassessments.com</a></p>
  </div>
</div>`;

  await sendEmail({ to: reg.email, subject: `You're Registered — ${workshop.title}`, html });
}

// ── PUBLIC: Workshop image proxy ──────────────────────────────────────────────
router.get("/training/workshops/public/:slug/image", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT image_object_id FROM workshops WHERE slug = ${req.params.slug} AND status != 'draft'`);
    if (!result.rows.length || !(result.rows[0] as any).image_object_id) return res.status(404).end();
    const objectId = (result.rows[0] as any).image_object_id;
    const { ObjectStorageService } = await import("../lib/objectStorage.js");
    const service = new ObjectStorageService();
    const file = await service.getObjectEntityFile(objectId);
    const upstream = await service.downloadObject(file);
    const ct = upstream.headers.get('content-type') ?? 'image/jpeg';
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.end(buf);
  } catch { res.status(404).end(); }
});

// ── PUBLIC: Workshop page data ────────────────────────────────────────────────
// ── PUBLIC: List all published workshops ─────────────────────────────────────
router.get("/training/workshops/public/list", async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT id, slug, title, subtitle, image_object_id, is_free, price, currency, status,
             session_dates, timezone, delivery_method
      FROM workshops WHERE status IN ('published', 'full') ORDER BY created_at DESC`);
    return res.json({ workshops: result.rows });
  } catch (err) {
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/training/workshops/public/:slug", async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM workshops WHERE slug = ${req.params.slug} AND status != 'draft'`);
    if (!result.rows.length) return res.status(404).json({ error: "Workshop not found" });
    const workshop = result.rows[0] as any;
    workshop.manual_sales_mode = !workshop.is_free && workshopManualSalesMode();
    const countRes = await db.execute(sql`
      SELECT COUNT(*)::int AS total
      FROM workshop_registrations
      WHERE workshop_id = ${workshop.id}
        AND status != 'cancelled'
        AND (${workshop.is_free} OR payment_status = 'paid')
    `);
    workshop.registration_count = (countRes.rows[0] as any).total;
    return res.json({ workshop });
  } catch (err) {
    logger.error({ err }, "Failed to get public workshop");
    return res.status(500).json({ error: "Failed" });
  }
});

async function sendWorkshopManualSalesEmails(inquiry: any): Promise<void> {
  if (!shouldSendManualSalesEmails()) {
    logger.info({ inquiryId: inquiry.id }, "Manual workshop-sales email suppressed outside production");
    return;
  }
  const name = escapeHtml(`${inquiry.first_name} ${inquiry.last_name}`);
  const workshopTitle = escapeHtml(inquiry.workshop_title);
  const rows = [
    makeEmailRow("Workshop", workshopTitle),
    makeEmailRow("Name", name),
    makeEmailRow("Email", escapeHtml(inquiry.email)),
    makeEmailRow("Phone", escapeHtml(inquiry.phone)),
    makeEmailRow("Job title", escapeHtml(inquiry.job_title)),
    makeEmailRow("Professional role", escapeHtml(inquiry.professional_role)),
    makeEmailRow("School / organisation", escapeHtml(inquiry.school_name)),
    makeEmailRow("School type", escapeHtml(inquiry.school_type)),
    makeEmailRow("Approximate students", escapeHtml(inquiry.school_size)),
    makeEmailRow("Areas of interest", Array.isArray(inquiry.areas_of_interest) ? inquiry.areas_of_interest.map((value: string) => escapeHtml(value)).join(", ") : ""),
    makeEmailRow("School support challenge", escapeHtml(inquiry.school_support_challenge)),
    makeEmailRow("Location", escapeHtml([inquiry.city, inquiry.country].filter(Boolean).join(", "))),
    makeEmailRow("Future interests", [
      inquiry.interested_future_learning && "Future free professional learning",
      inquiry.interested_school_training && "Dedicated school professional learning",
      inquiry.interested_assessment_services && "Educational assessment services",
      inquiry.interested_partner_school && "ReMynd Partner School",
      inquiry.training_only && "Workshop registration only",
    ].filter(Boolean).join(", ")),
    makeEmailRow("Marketing consent", inquiry.marketing_consent ? "Yes" : "No"),
    makeEmailRow("Payment choice", inquiry.payment_method === "wechat_pay" ? "WeChat Pay" : inquiry.payment_method === "alipay" ? "Alipay" : "Credit Card"),
    makeEmailRow("Payment reference", escapeHtml(inquiry.payment_reference)),
    makeEmailRow("Receipt screenshot", inquiry.receipt_object_path ? "Uploaded — pending administrator verification" : ""),
    makeEmailRow("Message", escapeHtml(inquiry.message)),
  ].join("");
  await sendEmail({
    to: "ne_roberts@yahoo.com",
    subject: `Workshop sales inquiry — ${inquiry.workshop_title} — ${inquiry.first_name} ${inquiry.last_name}`,
    html: `<div style="font-family:sans-serif;max-width:600px"><div style="background:#0c1a2e;padding:24px;color:#fff"><h1 style="margin:0;font-size:18px">New ReMynd Workshop Sales Inquiry</h1></div><div style="padding:24px;border:1px solid #e2e8f0"><table style="width:100%;border-collapse:collapse">${rows}</table></div></div>`,
  });
  await sendEmail({
    to: inquiry.email,
    subject: `We received your workshop inquiry — ${inquiry.workshop_title}`,
    html: `<div style="font-family:sans-serif;max-width:600px"><div style="background:#0c1a2e;padding:24px;color:#fff"><p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase">ReMynd Student Services</p><h1 style="margin:6px 0 0;font-size:20px">Your inquiry has been received</h1></div><div style="padding:28px;border:1px solid #e2e8f0"><p>Dear ${escapeHtml(inquiry.first_name)},</p><p>Thank you for your interest in <strong>${workshopTitle}</strong>. A ReMynd team member will review your inquiry and contact you about registration and payment options.</p><p>This inquiry is not a workshop registration or payment confirmation. Access is not activated until arrangements have been confirmed by ReMynd.</p></div></div>`,
  });
}

router.get("/training/workshops/public/:slug/manual-sales/payment-qr/:method", async (req, res) => {
  if (!workshopManualSalesMode()) return res.status(404).json({ error: "Not found" });
  const configuredPath = req.params.method === "wechat_pay"
    ? publicQrPath(process.env.AIRWALLEX_WECHAT_QR_PATH)
    : req.params.method === "alipay"
      ? publicQrPath(process.env.AIRWALLEX_ALIPAY_QR_PATH)
      : null;
  if (!configuredPath || configuredPath.startsWith("https://")) return res.status(404).json({ error: "QR code not available" });
  try {
    const objectFile = await storage.getObjectEntityFile(configuredPath);
    const response = await storage.downloadObject(objectFile);
    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") ?? "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    if (!response.body) return res.end();
    Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
  } catch {
    return res.status(404).json({ error: "QR code not available" });
  }
});

router.get("/training/workshops/public/:slug/manual-sales/payment-options", async (req, res) => {
  if (!workshopManualSalesMode()) return res.status(404).json({ error: "Not found" });
  const workshop = await db.execute(sql`SELECT id FROM workshops WHERE slug = ${req.params.slug} AND is_free = FALSE AND status IN ('published', 'full') LIMIT 1`);
  if (!workshop.rows.length) return res.status(404).json({ error: "Workshop not available" });
  const base = `/api/training/workshops/public/${encodeURIComponent(req.params.slug)}/manual-sales/payment-qr`;
  return res.json({
    wechatPayQr: publicQrPath(process.env.AIRWALLEX_WECHAT_QR_PATH) ? `${base}/wechat_pay` : null,
    alipayQr: publicQrPath(process.env.AIRWALLEX_ALIPAY_QR_PATH) ? `${base}/alipay` : null,
  });
});

router.post("/training/workshops/public/:slug/manual-sales/request-verification", async (req, res) => {
  try {
    if (!workshopManualSalesMode()) return res.status(404).json({ error: "Not found" });
    const { first_name, last_name, email, phone, job_title, professional_role, school_name, school_type, school_size,
      areas_of_interest, school_support_challenge, city, country, message,
      interested_future_learning, interested_school_training, interested_assessment_services, interested_partner_school,
      training_only, marketing_consent, privacy_consent, payment_method, other_payment_options, payment_reference } = req.body;
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) return res.status(400).json({ error: "Name and email are required" });
    if (privacy_consent !== true) return res.status(400).json({ error: "Privacy consent is required" });
    if (!["wechat_pay", "alipay", "credit_card"].includes(payment_method)) return res.status(400).json({ error: "Select a payment option" });
    const requestedOptions = Array.isArray(other_payment_options)
      ? other_payment_options.filter((value: unknown): value is string => typeof value === "string" && ["credit_card", "bank_transfer", "invoice", "other"].includes(value))
      : [];
    const interestAreas = Array.isArray(areas_of_interest)
      ? areas_of_interest.filter((value: unknown): value is string => typeof value === "string").slice(0, 30)
      : [];
    if (typeof payment_reference === "string" && payment_reference.length > 200) return res.status(400).json({ error: "Payment reference is too long" });
    if ([first_name, last_name, phone, job_title, professional_role, school_name, city, country].some(value => typeof value === "string" && value.length > 200)
      || (typeof message === "string" && message.length > 5000)) {
      return res.status(400).json({ error: "One or more fields are too long" });
    }
    const normalEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalEmail)) return res.status(400).json({ error: "Invalid email address" });
    const requestIp = req.ip || req.socket.remoteAddress || "unknown";
    const recentIpRequests = await db.execute(sql`SELECT COUNT(*)::int AS total
      FROM workshop_manual_sales_inquiries
      WHERE request_ip = ${requestIp} AND verification_sent_at > NOW() - INTERVAL '15 minutes'`);
    if (Number((recentIpRequests.rows[0] as any)?.total ?? 0) >= 10) {
      return res.status(429).json({ error: "Too many verification requests. Please try again later." });
    }
    const workshopRes = await db.execute(sql`SELECT id, title, is_free, status FROM workshops WHERE slug = ${req.params.slug} AND status IN ('published', 'full')`);
    if (!workshopRes.rows.length || (workshopRes.rows[0] as any).is_free) return res.status(404).json({ error: "Workshop not available for manual sales" });
    const workshop = workshopRes.rows[0] as any;
    const existing = await db.execute(sql`SELECT * FROM workshop_manual_sales_inquiries WHERE workshop_id = ${workshop.id} AND email = ${normalEmail} AND submitted_at IS NULL ORDER BY created_at DESC LIMIT 1`);
    const previous = existing.rows[0] as any;
    if (previous?.verification_sent_at && Date.now() - new Date(previous.verification_sent_at).getTime() < 60_000) {
      return res.status(429).json({ error: "Please wait before requesting another verification code" });
    }
    const id = previous?.id ?? `wms_${nanoid()}`;
    const code = crypto.randomInt(100000, 1000000).toString();
    const hash = crypto.createHash("sha256").update(`${id}:${code}`).digest("hex");
    await db.execute(sql`INSERT INTO workshop_manual_sales_inquiries
      (id, workshop_id, workshop_title, first_name, last_name, email, phone, job_title, professional_role, school_name, city, country, message,
       school_type, school_size, areas_of_interest, school_support_challenge,
       interested_future_learning, interested_school_training, interested_assessment_services, interested_partner_school,
       training_only, marketing_consent, privacy_consent,
       payment_method, other_payment_options, payment_reference, payment_status,
       verification_code_hash, verification_expires_at, verification_sent_at, verification_attempts, request_ip, updated_at)
      VALUES (${id}, ${workshop.id}, ${workshop.title}, ${first_name.trim()}, ${last_name.trim()}, ${normalEmail}, ${phone?.trim() ?? null}, ${job_title?.trim() ?? null}, ${professional_role?.trim() ?? null}, ${school_name?.trim() ?? null}, ${city?.trim() ?? null}, ${country?.trim() ?? null}, ${message?.trim() ?? null},
       ${school_type?.trim() ?? null}, ${school_size?.trim() ?? null}, ${JSON.stringify(interestAreas)}::jsonb, ${school_support_challenge?.trim() ?? null},
       ${!!interested_future_learning}, ${!!interested_school_training}, ${!!interested_assessment_services}, ${!!interested_partner_school},
       ${!!training_only}, ${!!marketing_consent}, TRUE,
       ${payment_method}, ${JSON.stringify(requestedOptions)}::jsonb, ${payment_reference?.trim() ?? null}, ${payment_method === "credit_card" ? "follow_up_required" : "awaiting_receipt"},
       ${hash}, NOW() + INTERVAL '15 minutes', NOW(), 0, ${requestIp}, NOW())
      ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, phone = EXCLUDED.phone, job_title = EXCLUDED.job_title, professional_role = EXCLUDED.professional_role, school_name = EXCLUDED.school_name, city = EXCLUDED.city, country = EXCLUDED.country, message = EXCLUDED.message,
       school_type = EXCLUDED.school_type, school_size = EXCLUDED.school_size, areas_of_interest = EXCLUDED.areas_of_interest,
       school_support_challenge = EXCLUDED.school_support_challenge,
       interested_future_learning = EXCLUDED.interested_future_learning, interested_school_training = EXCLUDED.interested_school_training,
       interested_assessment_services = EXCLUDED.interested_assessment_services, interested_partner_school = EXCLUDED.interested_partner_school,
       training_only = EXCLUDED.training_only, marketing_consent = EXCLUDED.marketing_consent, privacy_consent = TRUE,
       payment_method = EXCLUDED.payment_method, other_payment_options = EXCLUDED.other_payment_options, payment_reference = EXCLUDED.payment_reference,
       payment_status = EXCLUDED.payment_status, receipt_object_path = NULL,
       verification_code_hash = EXCLUDED.verification_code_hash, verification_expires_at = EXCLUDED.verification_expires_at, verification_sent_at = NOW(), verification_attempts = 0, request_ip = EXCLUDED.request_ip, updated_at = NOW()`);
    if (shouldSendManualSalesEmails()) {
      await sendEmail({ to: normalEmail, subject: `Your ReMynd verification code — ${workshop.title}`, html: `<p>Your ReMynd workshop inquiry verification code is <strong style="font-size:22px;letter-spacing:3px">${code}</strong>.</p><p>It expires in 15 minutes. Do not share this code.</p>` });
    } else {
      logger.info({ inquiryId: id }, "Manual workshop verification email suppressed outside production");
    }
    return res.status(201).json({ ok: true, inquiryId: id });
  } catch (err) {
    logger.error({ err }, "Workshop manual-sales verification request failed");
    return res.status(500).json({ error: "Unable to send verification code" });
  }
});

router.post("/training/workshops/public/:slug/manual-sales/:inquiryId/receipt-upload-url", async (req, res) => {
  if (!workshopManualSalesMode()) return res.status(404).json({ error: "Not found" });
  const result = await db.execute(sql`SELECT i.payment_method, i.submitted_at
    FROM workshop_manual_sales_inquiries i JOIN workshops w ON w.id = i.workshop_id
    WHERE i.id = ${req.params.inquiryId} AND w.slug = ${req.params.slug} LIMIT 1`);
  const inquiry = result.rows[0] as any;
  if (!inquiry || inquiry.submitted_at || !["wechat_pay", "alipay"].includes(inquiry.payment_method)) return res.status(404).json({ error: "Upload not available" });
  const { size, contentType } = req.body as { size?: unknown; contentType?: unknown };
  if (typeof size !== "number" || size < 1 || size > 10 * 1024 * 1024 ||
      typeof contentType !== "string" || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    return res.status(400).json({ error: "Receipt must be a PNG, JPEG, or WebP image under 10 MB." });
  }
  try {
    const uploadURL = await storage.getObjectEntityUploadURL();
    return res.json({ uploadURL, objectPath: storage.normalizeObjectEntityPath(uploadURL) });
  } catch {
    return res.status(500).json({ error: "Unable to prepare receipt upload" });
  }
});

router.post("/training/workshops/public/:slug/manual-sales/submit", async (req, res) => {
  try {
    if (!workshopManualSalesMode()) return res.status(404).json({ error: "Not found" });
    const { inquiry_id, verification_code, receipt_object_path } = req.body;
    if (!inquiry_id || !/^\d{6}$/.test(verification_code ?? "")) return res.status(400).json({ error: "A valid verification code is required" });
    const result = await db.execute(sql`SELECT i.* FROM workshop_manual_sales_inquiries i JOIN workshops w ON w.id = i.workshop_id WHERE i.id = ${inquiry_id} AND w.slug = ${req.params.slug} AND w.is_free = FALSE`);
    if (!result.rows.length) return res.status(404).json({ error: "Inquiry not found" });
    const inquiry = result.rows[0] as any;
    if (inquiry.submitted_at) return res.json({ ok: true, alreadySubmitted: true });
    if (new Date(inquiry.verification_expires_at) < new Date()) return res.status(400).json({ error: "Verification code has expired. Request a new code." });
    if (Number(inquiry.verification_attempts ?? 0) >= 5) return res.status(429).json({ error: "Too many incorrect attempts. Request a new code." });
    if (["wechat_pay", "alipay"].includes(inquiry.payment_method)) {
      if (typeof receipt_object_path !== "string" || !receipt_object_path.startsWith("/objects/")) {
        return res.status(400).json({ error: "Upload your payment receipt screenshot before submitting" });
      }
      try {
        await storage.getObjectEntityFile(receipt_object_path);
      } catch {
        return res.status(400).json({ error: "The payment receipt screenshot could not be verified" });
      }
    }
    const hash = crypto.createHash("sha256").update(`${inquiry.id}:${verification_code}`).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(inquiry.verification_code_hash))) {
      await db.execute(sql`UPDATE workshop_manual_sales_inquiries SET verification_attempts = verification_attempts + 1, updated_at = NOW() WHERE id = ${inquiry.id}`);
      return res.status(400).json({ error: "Incorrect verification code" });
    }
    await db.execute(sql`UPDATE workshop_manual_sales_inquiries
      SET verified_at = NOW(), submitted_at = NOW(),
          receipt_object_path = ${receipt_object_path ?? null},
          payment_status = ${inquiry.payment_method === "credit_card" ? "follow_up_required" : "pending_verification"},
          updated_at = NOW()
      WHERE id = ${inquiry.id}`);
    inquiry.receipt_object_path = receipt_object_path ?? null;
    inquiry.payment_status = inquiry.payment_method === "credit_card" ? "follow_up_required" : "pending_verification";
    inquiry.verified_at = new Date();
    inquiry.submitted_at = new Date();
    sendWorkshopManualSalesEmails(inquiry).catch(err => logger.error({ err, inquiryId: inquiry.id }, "Workshop manual-sales emails failed"));
    return res.status(201).json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Workshop manual-sales submission failed");
    return res.status(500).json({ error: "Unable to submit inquiry" });
  }
});

// ── PUBLIC: Register ──────────────────────────────────────────────────────────
router.post("/training/workshops/public/:slug/register", async (req, res) => {
  try {
    const {
      first_name, last_name, email, job_title, professional_role, professional_role_other,
      school_name, city, country, phone, school_type, school_size, areas_of_interest,
      school_support_challenge, interested_future_learning, interested_school_training,
      interested_assessment_services, interested_partner_school, training_only,
      marketing_consent, privacy_consent,
    } = req.body;
    if (!first_name?.trim() || !last_name?.trim() || !email?.trim()) return res.status(400).json({ error: "Name and email are required" });
    if (!privacy_consent) return res.status(400).json({ error: "Privacy consent is required" });
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email.trim())) return res.status(400).json({ error: "Invalid email address" });

    const workshopRes = await db.execute(sql`SELECT * FROM workshops WHERE slug = ${req.params.slug} AND status IN ('published', 'full')`);
    if (!workshopRes.rows.length) return res.status(404).json({ error: "Workshop not open for registration" });
    const workshop = workshopRes.rows[0] as any;
    if (!workshop.is_free && workshopManualSalesMode()) {
      return res.status(403).json({
        error: "Workshop registration and payment are currently arranged directly with ReMynd",
        manualSalesMode: true,
      });
    }
    const requiresExtendedProfile = workshop.slug === "from-inquiry-to-self-authorship";
    if (requiresExtendedProfile && (!professional_role?.trim()
      || !school_name?.trim() || !city?.trim() || !country?.trim())) {
      return res.status(400).json({ error: "Please complete all required personal and professional information" });
    }
    if (requiresExtendedProfile && professional_role === "Other" && !professional_role_other?.trim()) {
      return res.status(400).json({ error: "Please specify your professional role" });
    }

    if (workshop.registration_closes_at && new Date(workshop.registration_closes_at) < new Date()) {
      return res.status(400).json({ error: "Registration has closed" });
    }
    if (workshop.max_participants) {
      const cnt = await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM workshop_registrations
        WHERE workshop_id = ${workshop.id}
          AND status != 'cancelled'
          AND (${workshop.is_free} OR payment_status = 'paid')
      `);
      if ((cnt.rows[0] as any).total >= workshop.max_participants) return res.status(400).json({ error: "This workshop is full" });
    }
    const normalEmail = email.trim().toLowerCase();
    const dup = await db.execute(sql`
      SELECT id, payment_status, status, payment_intent_id
      FROM workshop_registrations
      WHERE workshop_id = ${workshop.id} AND email = ${normalEmail}
    `);
    if (dup.rows.length) {
      const existing = dup.rows[0] as any;
      if (!workshop.is_free && existing.payment_status === "pending" && existing.status !== "cancelled") {
        return res.json({
          ok: true,
          id: existing.id,
          requiresPayment: true,
          workshopId: workshop.id,
          resumed: true,
        });
      }
      return res.status(409).json({ error: "You are already registered for this workshop", id: existing.id });
    }

    const regId = nanoid();
    const paymentStatus = workshop.is_free ? 'free' : 'pending';
    const regStatus = workshop.is_free ? 'registered' : 'pending_payment';

    await db.execute(sql`INSERT INTO workshop_registrations
      (id, workshop_id, first_name, last_name, email, job_title, professional_role, professional_role_other,
       school_name, city, country, phone, school_type, school_size, areas_of_interest, school_support_challenge,
       interested_future_learning, interested_school_training, interested_assessment_services,
       interested_partner_school, training_only, marketing_consent, marketing_consent_timestamp,
       privacy_consent, privacy_consent_timestamp, payment_status, status, created_at, updated_at)
      VALUES (${regId}, ${workshop.id}, ${first_name.trim()}, ${last_name.trim()}, ${normalEmail},
        ${job_title?.trim() ?? null}, ${professional_role?.trim() ?? null}, ${professional_role_other?.trim() ?? null},
        ${school_name?.trim() ?? null}, ${city?.trim() ?? null}, ${country?.trim() ?? null}, ${phone?.trim() ?? null},
        ${school_type?.trim() ?? null}, ${school_size?.trim() ?? null},
        ${JSON.stringify(Array.isArray(areas_of_interest) ? areas_of_interest : [])}::jsonb,
        ${school_support_challenge?.trim() ?? null},
        ${!!interested_future_learning}, ${!!interested_school_training},
        ${!!interested_assessment_services}, ${!!interested_partner_school}, ${!!training_only},
        ${!!marketing_consent}, ${marketing_consent ? sql`NOW()` : null},
        TRUE, NOW(), ${paymentStatus}, ${regStatus}, NOW(), NOW())`);

    if (workshop.is_free) {
      (async () => {
        try {
          const reg = { id: regId, first_name: first_name.trim(), last_name: last_name.trim(), email: normalEmail };
          await sendWorkshopConfirmation(reg, workshop);
          await db.execute(sql`UPDATE workshop_registrations SET confirmation_email_status = 'sent', confirmation_email_sent_at = NOW() WHERE id = ${regId}`);
        } catch (err) {
          logger.error({ err, regId }, "Workshop confirmation email failed");
          await db.execute(sql`UPDATE workshop_registrations SET confirmation_email_status = 'failed' WHERE id = ${regId}`).catch(() => {});
        }
      })();
      return res.status(201).json({ ok: true, id: regId, requiresPayment: false });
    }
    return res.status(201).json({ ok: true, id: regId, requiresPayment: true, workshopId: workshop.id });
  } catch (err) {
    logger.error({ err }, "Workshop registration failed");
    return res.status(500).json({ error: "Registration failed" });
  }
});

// ── PUBLIC: Create Airwallex payment intent ───────────────────────────────────
router.post("/training/workshops/public/:slug/payment/create", async (req, res) => {
  try {
    const { registration_id, return_url } = req.body;
    if (!registration_id) return res.status(400).json({ error: "registration_id required" });
    const workshopRes = await db.execute(sql`SELECT * FROM workshops WHERE slug = ${req.params.slug}`);
    if (!workshopRes.rows.length) return res.status(404).json({ error: "Workshop not found" });
    const workshop = workshopRes.rows[0] as any;
    if (!workshop.is_free && workshopManualSalesMode()) {
      return res.status(403).json({ error: "Workshop payments are being arranged directly with ReMynd" });
    }
    const regRes = await db.execute(sql`SELECT * FROM workshop_registrations WHERE id = ${registration_id} AND workshop_id = ${workshop.id}`);
    if (!regRes.rows.length) return res.status(404).json({ error: "Registration not found" });
    const reg = regRes.rows[0] as any;
    if (reg.payment_status === 'paid') return res.json({ alreadyPaid: true });

    const { createPaymentIntent, isConfigured, getEnv } = await import("../lib/airwallex.js");
    if (!isConfigured()) return res.status(503).json({ error: "Payment not configured" });
    const amount = Number(workshop.price ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      logger.error({ workshopId: workshop.id, price: workshop.price }, "Workshop has invalid payment amount");
      return res.status(500).json({ error: "Workshop payment amount is invalid" });
    }
    const amountCents = Math.round(amount * 100);
    const origin = req.headers.origin ?? 'https://remyndassessments.com';
    const intent = await createPaymentIntent({
      amount,
      currency: workshop.currency ?? 'USD',
      plan: `workshop-${workshop.id}`,
      caseId: registration_id,
      portalToken: registration_id,
      returnUrl: return_url ?? `${origin}/training/${workshop.slug}?payment=complete`,
    });
    if (!intent) return res.status(502).json({ error: "Payment intent creation failed" });
    await db.execute(sql`INSERT INTO workshop_payment_intents (id, workshop_id, registration_id, amount, currency, status)
      VALUES (${intent.id}, ${workshop.id}, ${registration_id}, ${amountCents}, ${workshop.currency ?? 'USD'}, 'pending')`);
    await db.execute(sql`UPDATE workshop_registrations SET payment_intent_id = ${intent.id} WHERE id = ${registration_id}`);
    return res.json({ intentId: intent.id, clientSecret: intent.clientSecret, env: getEnv() });
  } catch (err) {
    logger.error({ err }, "Workshop payment intent failed");
    return res.status(500).json({ error: "Failed" });
  }
});

// ── ADMIN: List workshops ─────────────────────────────────────────────────────
router.get("/training/workshops", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT w.*,
        (SELECT COUNT(*)::int
         FROM workshop_registrations r
         WHERE r.workshop_id = w.id
           AND r.status != 'cancelled'
           AND (w.is_free = TRUE OR r.payment_status = 'paid')) AS registration_count
      FROM workshops w ORDER BY w.created_at DESC`);
    return res.json({ workshops: result.rows });
  } catch (err) {
    logger.error({ err }, "Failed to list workshops");
    return res.status(500).json({ error: "Failed" });
  }
});

// ── ADMIN: Manual workshop-sales inquiries ─────────────────────────────────────
router.get("/training/workshops/manual-sales-inquiries", authMiddleware, requireAdmin, async (_req, res) => {
  try {
    const result = await db.execute(sql`SELECT id, 'workshop_sales' AS "inquiryType", status,
      first_name || ' ' || last_name AS "contactName", email AS "contactEmail", phone AS "contactPhone",
      school_name AS organisation, professional_role AS role,
      COALESCE(message, '') AS message, workshop_title AS "workshopTitle",
      school_type AS "schoolType", school_size AS "schoolSize",
      areas_of_interest AS "areasOfInterest", school_support_challenge AS "schoolSupportChallenge",
      interested_future_learning AS "interestedFutureLearning",
      interested_school_training AS "interestedSchoolTraining",
      interested_assessment_services AS "interestedAssessmentServices",
      interested_partner_school AS "interestedPartnerSchool",
      training_only AS "trainingOnly", marketing_consent AS "marketingConsent",
      payment_method AS "paymentMethod", other_payment_options AS "otherPaymentOptions",
      payment_reference AS "paymentReference", payment_status AS "paymentStatus",
      (receipt_object_path IS NOT NULL) AS "receiptUploaded",
      created_at AS "createdAt"
      FROM workshop_manual_sales_inquiries WHERE submitted_at IS NOT NULL ORDER BY created_at DESC`);
    return res.json({ inquiries: result.rows });
  } catch (err) {
    logger.error({ err }, "Failed to list manual workshop-sales inquiries");
    return res.status(500).json({ error: "Failed" });
  }
});

router.patch("/training/workshops/manual-sales-inquiries/:id/status", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status, paymentConfirmed } = req.body;
    if (!["new", "contacted", "converted", "closed"].includes(status)) return res.status(400).json({ error: "Invalid status" });
    if (status !== "converted") {
      await db.execute(sql`UPDATE workshop_manual_sales_inquiries SET status = ${status}, updated_at = NOW() WHERE id = ${req.params.id} AND submitted_at IS NOT NULL`);
      return res.json({ ok: true });
    }
    if (paymentConfirmed !== true) {
      return res.status(400).json({ error: "Confirm that payment was received before adding this person to the attendee roster" });
    }

    const inquiryResult = await db.execute(sql`
      SELECT i.*, w.title, w.session_dates, w.timezone, w.contact_email
      FROM workshop_manual_sales_inquiries i
      JOIN workshops w ON w.id = i.workshop_id
      WHERE i.id = ${req.params.id} AND i.submitted_at IS NOT NULL
      LIMIT 1
    `);
    if (!inquiryResult.rows.length) return res.status(404).json({ error: "Workshop inquiry not found" });
    const inquiry = inquiryResult.rows[0] as any;

    const existingResult = await db.execute(sql`
      SELECT id, confirmation_email_status
      FROM workshop_registrations
      WHERE workshop_id = ${inquiry.workshop_id} AND lower(email) = lower(${inquiry.email})
      LIMIT 1
    `);
    const existing = existingResult.rows[0] as any;
    const registrationId = existing?.id ?? nanoid();

    if (existing) {
      await db.execute(sql`
        UPDATE workshop_registrations
        SET payment_status = 'paid', status = 'registered', updated_at = NOW()
        WHERE id = ${registrationId}
      `);
    } else {
      await db.execute(sql`INSERT INTO workshop_registrations
        (id, workshop_id, first_name, last_name, email, job_title, professional_role,
         school_name, city, country, phone, school_type, school_size, areas_of_interest,
         school_support_challenge, interested_future_learning, interested_school_training,
         interested_assessment_services, interested_partner_school, training_only,
         marketing_consent, marketing_consent_timestamp, privacy_consent,
         privacy_consent_timestamp, payment_status, status, created_at, updated_at)
        VALUES (${registrationId}, ${inquiry.workshop_id}, ${inquiry.first_name}, ${inquiry.last_name},
          ${inquiry.email}, ${inquiry.job_title}, ${inquiry.professional_role}, ${inquiry.school_name},
          ${inquiry.city}, ${inquiry.country}, ${inquiry.phone}, ${inquiry.school_type},
          ${inquiry.school_size}, ${JSON.stringify(inquiry.areas_of_interest ?? [])}::jsonb,
          ${inquiry.school_support_challenge}, ${!!inquiry.interested_future_learning},
          ${!!inquiry.interested_school_training}, ${!!inquiry.interested_assessment_services},
          ${!!inquiry.interested_partner_school}, ${!!inquiry.training_only},
          ${!!inquiry.marketing_consent}, ${inquiry.marketing_consent ? sql`NOW()` : null},
          TRUE, COALESCE(${inquiry.verified_at}, NOW()), 'paid', 'registered', NOW(), NOW())`);
    }

    await db.execute(sql`
      UPDATE workshop_manual_sales_inquiries
      SET status = 'converted', payment_status = 'paid', updated_at = NOW()
      WHERE id = ${inquiry.id}
    `);

    if (!existing || existing.confirmation_email_status !== "sent") {
      try {
        await sendWorkshopConfirmation(
          { id: registrationId, first_name: inquiry.first_name, last_name: inquiry.last_name, email: inquiry.email },
          inquiry,
        );
        await db.execute(sql`
          UPDATE workshop_registrations
          SET confirmation_email_status = 'sent', confirmation_email_sent_at = NOW()
          WHERE id = ${registrationId}
        `);
      } catch (emailError) {
        logger.error({ err: emailError, registrationId }, "Converted workshop attendee confirmation email failed");
        await db.execute(sql`
          UPDATE workshop_registrations SET confirmation_email_status = 'failed' WHERE id = ${registrationId}
        `).catch(() => {});
      }
    }

    return res.json({ ok: true, registrationId, attendeeCreated: !existing });
  } catch (err) {
    logger.error({ err }, "Failed to update manual workshop-sales inquiry");
    return res.status(500).json({ error: "Failed" });
  }
});

router.get("/training/workshops/manual-sales-inquiries/:id/receipt", authMiddleware, requireAdmin, async (req, res) => {
  const result = await db.execute(sql`SELECT receipt_object_path FROM workshop_manual_sales_inquiries
    WHERE id = ${req.params.id} AND submitted_at IS NOT NULL LIMIT 1`);
  const objectPath = (result.rows[0] as any)?.receipt_object_path;
  if (!objectPath) return res.status(404).json({ error: "Receipt not found" });
  try {
    const objectFile = await storage.getObjectEntityFile(objectPath);
    const response = await storage.downloadObject(objectFile);
    res.status(response.status);
    res.setHeader("Content-Type", response.headers.get("content-type") ?? "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="workshop-payment-receipt"`);
    if (!response.body) return res.end();
    Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
  } catch {
    return res.status(404).json({ error: "Receipt not found" });
  }
});

router.delete("/training/workshops/manual-sales-inquiries/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM workshop_manual_sales_inquiries WHERE id = ${req.params.id} AND submitted_at IS NOT NULL`);
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete manual workshop-sales inquiry");
    return res.status(500).json({ error: "Failed" });
  }
});

// ── ADMIN: Create workshop ────────────────────────────────────────────────────
// Coerce empty strings to null (for optional timestamp/numeric fields)
function orNull(v: any): any { return (v === "" || v === undefined) ? null : v; }

router.post("/training/workshops", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { title, subtitle, description, additional_info, image_object_id, image_alt,
      session_dates, timezone, delivery_method, venue_info, facilitator_name, pl_hours,
      registration_opens_at, registration_closes_at, max_participants,
      is_free, price, currency, contact_email, status } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
    const baseSlug = makeSlug(title.trim());
    const slug = await ensureUniqueSlug(baseSlug);
    const id = nanoid();
    await db.execute(sql`INSERT INTO workshops (
      id, slug, title, subtitle, description, additional_info, image_object_id, image_alt,
      session_dates, timezone, delivery_method, venue_info, facilitator_name, pl_hours,
      registration_opens_at, registration_closes_at, max_participants,
      is_free, price, currency, contact_email, status, created_at, updated_at
    ) VALUES (
      ${id}, ${slug}, ${title.trim()}, ${orNull(subtitle?.trim())}, ${orNull(description?.trim())},
      ${orNull(additional_info)}, ${orNull(image_object_id)}, ${orNull(image_alt?.trim())},
      ${JSON.stringify(session_dates ?? [])}::jsonb, ${timezone ?? 'Asia/Hong_Kong'},
      ${delivery_method ?? 'online'}, ${orNull(venue_info?.trim())}, ${orNull(facilitator_name?.trim())},
      ${orNull(pl_hours)},
      ${orNull(registration_opens_at)}::timestamptz, ${orNull(registration_closes_at)}::timestamptz,
      ${orNull(max_participants)}, ${is_free !== false}, ${orNull(price)}, ${currency ?? 'USD'},
      ${orNull(contact_email?.trim())}, ${status ?? 'draft'}, NOW(), NOW())`);
    const created = await db.execute(sql`SELECT * FROM workshops WHERE id = ${id}`);
    return res.status(201).json({ workshop: created.rows[0] });
  } catch (err) {
    logger.error({ err }, "Failed to create workshop");
    return res.status(500).json({ error: "Failed to create workshop" });
  }
});

// ── ADMIN: Get single workshop ────────────────────────────────────────────────
router.get("/training/workshops/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM workshops WHERE id = ${req.params.id}`);
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    return res.json({ workshop: result.rows[0] });
  } catch (err) { return res.status(500).json({ error: "Failed" }); }
});

// ── ADMIN: Update workshop ────────────────────────────────────────────────────
router.put("/training/workshops/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { title, subtitle, description, additional_info, image_object_id, image_alt,
      session_dates, timezone, delivery_method, venue_info, facilitator_name, pl_hours,
      registration_opens_at, registration_closes_at, max_participants,
      is_free, price, currency, contact_email, status } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title is required" });
    const baseSlug = makeSlug(title.trim());
    const slug = await ensureUniqueSlug(baseSlug, req.params.id);
    await db.execute(sql`UPDATE workshops SET
      title = ${title.trim()}, slug = ${slug},
      subtitle = ${orNull(subtitle?.trim())}, description = ${orNull(description?.trim())},
      additional_info = ${orNull(additional_info)}, image_object_id = ${orNull(image_object_id)},
      image_alt = ${orNull(image_alt?.trim())},
      session_dates = ${JSON.stringify(session_dates ?? [])}::jsonb,
      timezone = ${timezone ?? 'Asia/Hong_Kong'}, delivery_method = ${delivery_method ?? 'online'},
      venue_info = ${orNull(venue_info?.trim())}, facilitator_name = ${orNull(facilitator_name?.trim())},
      pl_hours = ${orNull(pl_hours)},
      registration_opens_at = ${orNull(registration_opens_at)}::timestamptz,
      registration_closes_at = ${orNull(registration_closes_at)}::timestamptz,
      max_participants = ${orNull(max_participants)}, is_free = ${is_free !== false},
      price = ${orNull(price)}, currency = ${currency ?? 'USD'},
      contact_email = ${orNull(contact_email?.trim())}, status = ${status ?? 'draft'},
      updated_at = NOW()
      WHERE id = ${req.params.id}`);
    const updated = await db.execute(sql`SELECT * FROM workshops WHERE id = ${req.params.id}`);
    return res.json({ workshop: updated.rows[0] });
  } catch (err) {
    logger.error({ err }, "Failed to update workshop");
    return res.status(500).json({ error: "Failed to update workshop" });
  }
});

// ── ADMIN: Publish / Unpublish ────────────────────────────────────────────────
router.post("/training/workshops/:id/publish", authMiddleware, requireAdmin, async (req, res) => {
  try {
    await db.execute(sql`UPDATE workshops SET status = 'published', updated_at = NOW() WHERE id = ${req.params.id}`);
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: "Failed" }); }
});
router.post("/training/workshops/:id/unpublish", authMiddleware, requireAdmin, async (req, res) => {
  try {
    await db.execute(sql`UPDATE workshops SET status = 'draft', updated_at = NOW() WHERE id = ${req.params.id}`);
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

// ── ADMIN: Duplicate ──────────────────────────────────────────────────────────
router.post("/training/workshops/:id/duplicate", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM workshops WHERE id = ${req.params.id}`);
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    const src = result.rows[0] as any;
    const newId = nanoid();
    const slug = await ensureUniqueSlug(makeSlug(`${src.title} copy`));
    await db.execute(sql`INSERT INTO workshops (
      id, slug, title, subtitle, description, additional_info, image_object_id, image_alt,
      session_dates, timezone, delivery_method, venue_info, facilitator_name, pl_hours,
      registration_opens_at, registration_closes_at, max_participants,
      is_free, price, currency, contact_email, status, created_at, updated_at
    ) VALUES (
      ${newId}, ${slug}, ${src.title + ' (Copy)'}, ${src.subtitle}, ${src.description},
      ${src.additional_info}, ${src.image_object_id}, ${src.image_alt},
      ${JSON.stringify(src.session_dates ?? [])}::jsonb, ${src.timezone}, ${src.delivery_method},
      ${src.venue_info}, ${src.facilitator_name}, ${src.pl_hours},
      ${null}::timestamptz, ${null}::timestamptz, ${src.max_participants},
      ${src.is_free}, ${src.price}, ${src.currency}, ${src.contact_email}, 'draft', NOW(), NOW())`);
    const created = await db.execute(sql`SELECT * FROM workshops WHERE id = ${newId}`);
    return res.status(201).json({ workshop: created.rows[0] });
  } catch (err) {
    logger.error({ err }, "Failed to duplicate workshop");
    return res.status(500).json({ error: "Failed" });
  }
});

// ── ADMIN: Delete workshop ────────────────────────────────────────────────────
router.delete("/training/workshops/:id", authMiddleware, requireAdmin, async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM workshops WHERE id = ${req.params.id}`);
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

// ── ADMIN: List workshop registrations ────────────────────────────────────────
router.get("/training/workshops/:id/registrations", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(sql`SELECT * FROM workshop_registrations WHERE workshop_id = ${req.params.id} ORDER BY created_at DESC`);
    return res.json({ registrations: result.rows });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

// ── ADMIN: Delete an unpaid workshop registration ──────────────────────────────
router.delete("/training/workshops/:id/registrations/:regId", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const existing = await db.execute(sql`
      SELECT payment_status
      FROM workshop_registrations
      WHERE id = ${req.params.regId} AND workshop_id = ${req.params.id}
      LIMIT 1
    `);
    if (!existing.rows.length) return res.status(404).json({ error: "Registration not found" });
    if ((existing.rows[0] as any).payment_status === "paid") {
      return res.status(409).json({ error: "Paid registrations cannot be deleted" });
    }

    await db.execute(sql`DELETE FROM workshop_payment_intents WHERE registration_id = ${req.params.regId}`);
    await db.execute(sql`
      DELETE FROM workshop_registrations
      WHERE id = ${req.params.regId} AND workshop_id = ${req.params.id}
    `);
    return res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete workshop registration");
    return res.status(500).json({ error: "Failed to delete registration" });
  }
});

// ── ADMIN: Update workshop registration status ────────────────────────────────
router.patch("/training/workshops/:id/registrations/:regId/status", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const { status, internal_notes } = req.body;
    await db.execute(sql`UPDATE workshop_registrations SET
      status = COALESCE(${status ?? null}, status),
      internal_notes = COALESCE(${internal_notes ?? null}, internal_notes),
      updated_at = NOW()
      WHERE id = ${req.params.regId} AND workshop_id = ${req.params.id}`);
    return res.json({ ok: true });
  } catch { return res.status(500).json({ error: "Failed" }); }
});

// ── ADMIN: Export workshop registrations CSV ──────────────────────────────────
router.get("/training/workshops/:id/registrations/export/csv", authMiddleware, requireAdmin, async (req, res) => {
  try {
    const workshopResult = await db.execute(sql`SELECT title, slug, is_free FROM workshops WHERE id = ${req.params.id}`);
    if (!workshopResult.rows.length) return res.status(404).json({ error: "Workshop not found" });
    const workshop = workshopResult.rows[0] as any;
    const result = await db.execute(sql`
      SELECT *
      FROM workshop_registrations
      WHERE workshop_id = ${req.params.id}
        AND status != 'cancelled'
        AND (${workshop.is_free} OR payment_status = 'paid')
      ORDER BY created_at DESC
    `);
    const rows = result.rows as any[];
    const columns: Array<[string, (row: any) => unknown]> = [
      ["First Name", r => r.first_name], ["Last Name", r => r.last_name],
      ["Email", r => r.email], ["Phone", r => r.phone],
      ["Job Title", r => r.job_title], ["Professional Role", r => r.professional_role],
      ["Other Role", r => r.professional_role_other],
      ["School / Organisation", r => r.school_name], ["City", r => r.city],
      ["Country / Region", r => r.country], ["School Type", r => r.school_type],
      ["Approximate Student Count", r => r.school_size],
      ["Areas of Interest", r => Array.isArray(r.areas_of_interest) ? r.areas_of_interest.join("; ") : ""],
      ["School Support Challenge", r => r.school_support_challenge],
      ["Future Learning Interest", r => r.interested_future_learning ? "Yes" : "No"],
      ["School Training Interest", r => r.interested_school_training ? "Yes" : "No"],
      ["Assessment Services Interest", r => r.interested_assessment_services ? "Yes" : "No"],
      ["Partner School Interest", r => r.interested_partner_school ? "Yes" : "No"],
      ["Training Only", r => r.training_only ? "Yes" : "No"],
      ["Marketing Consent", r => r.marketing_consent ? "Yes" : "No"],
      ["Payment Status", r => r.payment_status], ["Registration Status", r => r.status],
      ["Confirmation Email", r => r.confirmation_email_status],
      ["Internal Notes", r => r.internal_notes], ["Registered At", r => r.created_at],
    ];
    const escape = (v: any) => {
      if (v === null || v === undefined) return "";
      return `"${String(v).replace(/"/g, '""')}"`;
    };
    const csv = [
      columns.map(([label]) => escape(label)).join(","),
      ...rows.map(row => columns.map(([, value]) => escape(value(row))).join(",")),
    ].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${workshop.slug}-attendees-${Date.now()}.csv"`);
    return res.send(`\uFEFF${csv}`);
  } catch (err) {
    logger.error({ err, workshopId: req.params.id }, "Failed to export workshop attendees");
    return res.status(500).json({ error: "Failed to export workshop attendees" });
  }
});

export default router;
