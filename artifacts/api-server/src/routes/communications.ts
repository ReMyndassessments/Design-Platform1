import { Router, type Request, type Response, type NextFunction } from "express";
import { Readable } from "stream";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { writeAudit } from "../lib/audit.js";
import { prepareEmailOctopusAudience, getCommunicationsMailer, getEmailOctopusCampaignReport, getEmailOctopusListUnsubscribes, renderBrandedEmail, renderEmail, sanitizeEmailHtml, type CommunicationBrandSettings, type CommunicationsProvider, type EmailOctopusReportType } from "../lib/communications.js";
import { collectPermanentlyFailedEmails, isCommunicationBlocked, isPermanentOperationalEmailFailure, isValidCommunicationEmail, resolveEligibleContacts, runWithCampaignLock, sendGmailGroup, sendGmailTest, type SourceContact } from "../lib/communications-safety.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { logger } from "../lib/logger.js";

const router = Router();
const objectStorage = new ObjectStorageService();
const validEmail = { test: isValidCommunicationEmail };
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}

/* Additive and repeatable for installations which predate this module. */
const ready = (async () => {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_templates (id text PRIMARY KEY, name text NOT NULL, subject text NOT NULL, html text NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW())`);
  await db.execute(sql`ALTER TABLE communication_templates ADD COLUMN IF NOT EXISTS archived_at timestamptz`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_drafts (id text PRIMARY KEY, name text NOT NULL, subject text NOT NULL DEFAULT '', html text NOT NULL DEFAULT '', audience jsonb NOT NULL DEFAULT '{}'::jsonb, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW())`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_brand_settings (id text PRIMARY KEY, settings jsonb NOT NULL DEFAULT '{}'::jsonb, updated_by text NOT NULL, updated_at timestamptz NOT NULL DEFAULT NOW())`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_assets (id text PRIMARY KEY, object_path text NOT NULL, name text NOT NULL, content_type text NOT NULL, size integer NOT NULL, uploaded_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW())`);
  await db.execute(sql`ALTER TABLE communication_assets ADD COLUMN IF NOT EXISTS alt_text text`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_campaigns (id text PRIMARY KEY, name text NOT NULL, subject text NOT NULL, html text NOT NULL, kind text NOT NULL DEFAULT 'promotional', provider text NOT NULL DEFAULT 'gmail', audience jsonb NOT NULL DEFAULT '{}'::jsonb, status text NOT NULL DEFAULT 'draft', scheduled_at timestamptz, sent_at timestamptz, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW())`);
  await db.execute(sql`ALTER TABLE communication_campaigns ADD COLUMN IF NOT EXISTS provider_campaign_id text`);
  await db.execute(sql`ALTER TABLE communication_campaigns ADD COLUMN IF NOT EXISTS archived_at timestamptz`);
  await db.execute(sql`ALTER TABLE communication_campaigns ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false`);
  await db.execute(sql`ALTER TABLE communication_campaigns ADD COLUMN IF NOT EXISTS last_error text`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_recipients (id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE, email text NOT NULL, name text, source_type text NOT NULL, source_id text NOT NULL, status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0, provider_message_id text, error text, sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT NOW(), UNIQUE(campaign_id, email))`);
  await db.execute(sql`ALTER TABLE communication_recipients ADD COLUMN IF NOT EXISTS unsubscribe_token text UNIQUE`);
  await db.execute(sql`ALTER TABLE communication_recipients ADD COLUMN IF NOT EXISTS delivered_at timestamptz`);
  await db.execute(sql`ALTER TABLE communication_recipients ADD COLUMN IF NOT EXISTS bounced_at timestamptz`);
  await db.execute(sql`ALTER TABLE communication_recipients ADD COLUMN IF NOT EXISTS complained_at timestamptz`);
  await db.execute(sql`ALTER TABLE communication_recipients ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_delivery_events (id text PRIMARY KEY, event_key text NOT NULL UNIQUE, campaign_id text NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE, recipient_id text NOT NULL REFERENCES communication_recipients(id) ON DELETE CASCADE, provider text NOT NULL, event_type text NOT NULL, occurred_at timestamptz, payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT NOW())`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_suppressions (email text PRIMARY KEY, kind text NOT NULL DEFAULT 'unsubscribe', reason text, created_at timestamptz NOT NULL DEFAULT NOW())`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_operational_contacts (email text PRIMARY KEY, name text, active boolean NOT NULL DEFAULT true, failure_reason text, created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW())`);
  await db.execute(sql`UPDATE communication_operational_contacts SET active=true,updated_at=NOW() WHERE active=false AND failure_reason ~* '(^|[^0-9])4[0-9]{2}([^0-9]|$)'`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS communication_campaign_due_idx ON communication_campaigns(status, scheduled_at)`);
  await backfillPermanentOperationalFailures();
  await backfillConfirmedCampaignRecipientBlock();
})();
async function ensureReady() { await ready; }
async function getSuppressionKind(email: string): Promise<string | undefined> {
  const result = await db.execute(sql`SELECT kind FROM communication_suppressions WHERE lower(email)=${email.toLowerCase()} LIMIT 1`);
  return (result.rows[0] as { kind?: string } | undefined)?.kind;
}
async function applySuppression(email: string, kind: "hard" | "unsubscribe", reason: string): Promise<void> {
  await db.execute(sql`INSERT INTO communication_suppressions(email,kind,reason) VALUES(${email},${kind},${reason})
    ON CONFLICT(email) DO UPDATE SET
      kind=CASE WHEN communication_suppressions.kind='hard' THEN 'hard' ELSE EXCLUDED.kind END,
      reason=CASE WHEN communication_suppressions.kind='hard' THEN communication_suppressions.reason ELSE EXCLUDED.reason END`);
  if (kind === "hard") {
    await db.execute(sql`DELETE FROM communication_operational_contacts WHERE lower(email)=${email}`);
  }
  await db.execute(sql`UPDATE communication_recipients r SET status='unsubscribed',unsubscribed_at=NOW()
    FROM communication_campaigns c WHERE r.campaign_id=c.id AND lower(r.email)=${email}
    AND r.status IN ('pending','queued','failed') AND (${kind}='hard' OR c.kind='promotional')`);
}
async function suppressPermanentlyInvalidAddress(email: string, reason: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  await db.execute(sql`INSERT INTO communication_suppressions(email,kind,reason)
    VALUES(${normalizedEmail},'hard',${reason})
    ON CONFLICT(email) DO UPDATE SET
      kind='hard',
      reason=CASE WHEN communication_suppressions.kind='hard' THEN communication_suppressions.reason ELSE EXCLUDED.reason END`);
  await db.execute(sql`DELETE FROM communication_operational_contacts WHERE lower(email)=${normalizedEmail}`);
}
async function backfillPermanentOperationalFailures(): Promise<void> {
  const result = await db.execute(sql`
    SELECT lower(r.email) AS email, r.error
    FROM communication_recipients r
    JOIN communication_campaigns c ON c.id=r.campaign_id
    WHERE c.kind='operational' AND c.provider='gmail'
      AND c.is_test IS NOT TRUE AND r.source_type <> 'test'
      AND r.status='failed' AND r.error IS NOT NULL
  `);
  const permanentFailures = collectPermanentlyFailedEmails(result.rows as Array<{ email: string; error: string | null }>);
  for (const { email } of permanentFailures) {
    await suppressPermanentlyInvalidAddress(email, "Permanent recipient-address failure");
  }
  if (permanentFailures.length) logger.info({ count: permanentFailures.length }, "Previously failed permanent addresses excluded from future campaigns");
}
async function backfillConfirmedCampaignRecipientBlock(): Promise<void> {
  const campaignId = "ZDaSMnmaPF338gSRfLFrL";
  const reason = `Admin-requested hard block after repeated Gmail quota failures for campaign ${campaignId}`;
  const result = await db.execute(sql`
    WITH already_applied AS (
      SELECT EXISTS (
        SELECT 1 FROM communication_suppressions WHERE reason=${reason}
      ) AS done
    ),
    target_emails AS MATERIALIZED (
      SELECT DISTINCT lower(r.email) AS email
      FROM communication_recipients r
      JOIN communication_campaigns c ON c.id=r.campaign_id
      WHERE c.id=${campaignId}
        AND c.name='Workshop 3 This Wednesday!'
        AND c.subject='Workshop 3 Recording - New Leadership Series'
        AND c.kind='operational' AND c.provider='gmail' AND c.is_test IS NOT TRUE
        AND r.source_type <> 'test' AND r.status='failed' AND r.attempts >= 2
        AND r.error ~* '(^|[^0-9])550([^0-9]|$)' AND r.error ~* '5[.]4[.]5'
        AND (SELECT done FROM already_applied)=false
    ),
    inserted AS (
      INSERT INTO communication_suppressions(email,kind,reason)
      SELECT email,'hard',${reason} FROM target_emails
      ON CONFLICT(email) DO UPDATE SET
        kind='hard',
        reason=CASE WHEN communication_suppressions.kind='hard' THEN communication_suppressions.reason ELSE EXCLUDED.reason END
      RETURNING email
    ),
    removed_saved_contacts AS (
      DELETE FROM communication_operational_contacts oc
      USING target_emails t
      WHERE lower(oc.email)=t.email
      RETURNING oc.email
    )
    SELECT COUNT(*)::int AS blocked FROM inserted
  `);
  const blocked = Number((result.rows[0] as { blocked?: number } | undefined)?.blocked ?? 0);
  if (blocked) logger.info({ count: blocked, campaignId }, "Applied requested block for repeatedly failed campaign recipients");
}
function requestOrigin(req: Request): string {
  const protocol = String(req.headers["x-forwarded-proto"] ?? req.protocol).split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "").split(",")[0].trim();
  if (!["https", "http"].includes(protocol) || !/^[a-zA-Z0-9.:-]+$/.test(host)) {
    throw new Error("Cannot determine a safe unsubscribe link origin");
  }
  return `${protocol}://${host}`;
}
function withUnsubscribeLink(html: string, origin: string, token: string): string {
  return `${html}<p style="font-size:12px;color:#666;margin-top:24px">To stop future ReMynd Communications emails, <a href="${origin}/api/communications/unsubscribe/${encodeURIComponent(token)}">unsubscribe here</a>.</p>`;
}
router.use(async (_req, res, next) => { try { await ensureReady(); next(); } catch (err) { logger.error({ err }, "Communications initialization failed"); res.status(500).json({ error: "Communications storage is unavailable" }); } });
router.get("/communications/unsubscribe/:token", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (!/^[\w-]{16,64}$/.test(String(req.params.token))) { res.status(404).send("This unsubscribe link is invalid."); return; }
  const found = await db.execute(sql`SELECT email FROM communication_recipients WHERE unsubscribe_token=${req.params.token} LIMIT 1`);
  if (!found.rows.length) { res.status(404).send("This unsubscribe link is invalid."); return; }
  // A GET must not unsubscribe: mail-security scanners routinely prefetch links.
  res.type("html").send(`<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirm unsubscribe</title><body style="font:16px system-ui;max-width:32rem;margin:4rem auto;padding:1rem"><h1>Stop emails from ReMynd Communications?</h1><p>Confirm to stop future promotional and operational emails. Your address will be removed from the saved contact list.</p><form method="post" action="/api/communications/unsubscribe/${encodeURIComponent(String(req.params.token))}"><button type="submit" style="padding:0.7rem 1rem;cursor:pointer">Confirm unsubscribe</button></form></body></html>`);
});
router.post("/communications/unsubscribe/:token", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (!/^[\w-]{16,64}$/.test(String(req.params.token))) { res.status(404).send("This unsubscribe link is invalid."); return; }
  const found = await db.execute(sql`SELECT email FROM communication_recipients WHERE unsubscribe_token=${req.params.token} LIMIT 1`);
  if (!found.rows.length) { res.status(404).send("This unsubscribe link is invalid."); return; }
  await applySuppression(String((found.rows[0] as { email: string }).email).toLowerCase(), "hard", "recipient confirmed unsubscribe link");
  res.type("html").send("<!doctype html><html lang=\"en\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Unsubscribed</title><body style=\"font:16px system-ui;max-width:32rem;margin:4rem auto;padding:1rem\"><h1>Unsubscribed</h1><p>You will no longer receive ReMynd Communications emails.</p></body></html>");
});
router.get("/communications/assets/public/:id", async (req, res): Promise<void> => {
  const found = await db.execute(sql`SELECT object_path,content_type,name FROM communication_assets WHERE id=${req.params.id} LIMIT 1`);
  if (!found.rows.length) { res.status(404).json({ error: "Asset not found" }); return; }
  try {
    const asset = found.rows[0] as any;
    const objectFile = await objectStorage.getObjectEntityFile(asset.object_path);
    const response = await objectStorage.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("Content-Type", asset.content_type);
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!String(asset.content_type).startsWith("image/")) {
      const safeName = String(asset.name || "download").replace(/["\r\n]/g, "_");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    if (!response.body) { res.end(); return; }
    Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
  } catch (err) {
    logger.error({ err, assetId: req.params.id }, "Communication asset download failed");
    res.status(404).json({ error: "Asset not found" });
  }
});
router.use(authMiddleware, requireAdmin);
router.get("/communications/provider-status", (_req, res) => {
  res.json({
    providers: {
      gmail: { configured: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD), capabilities: ["individual_send", "test_send", "scheduled_send"] },
      emailoctopus: { configured: Boolean(process.env.EMAILOCTOPUS_API_KEY && process.env.EMAILOCTOPUS_DEFAULT_LIST_ID), capabilities: ["list_contact_sync", "campaign_create", "campaign_send", "campaign_report_sync"] },
    },
  });
});
router.post("/communications/audience-preview", async (req, res): Promise<void> => {
  const { audience = {}, kind = "promotional" } = req.body ?? {};
  if (!["promotional", "operational"].includes(kind) || typeof audience !== "object" || Array.isArray(audience) ||
    (audience.sources !== undefined && (!Array.isArray(audience.sources) || audience.sources.some((x: unknown) => typeof x !== "string")))) {
    res.status(400).json({ error: "Invalid audience or kind" }); return;
  }
  if (kind === "promotional" && Array.isArray(audience.manualRecipients) && audience.manualRecipients.length && audience.marketingConsentOverride !== true) {
    res.status(400).json({ error: "Administrator confirmation of prior marketing consent is required for pasted promotional lists" }); return;
  }
  const resolution = await resolveContacts(audience, kind);
  // Preview is admin-only and deliberately shows one address per row, never a
  // recipient-to-recipient disclosure. Counts match the send-time resolution.
  res.json({ counts: resolution.counts,
    recipients: [
      ...resolution.recipients.map(c => ({ email: c.email, name: c.name, sourceType: c.sourceType, sourceId: c.sourceId, included: true, reason: "eligible" })),
      ...resolution.alreadySentRecipients.map(c => ({ email: c.email, name: c.name, sourceType: c.sourceType, sourceId: c.sourceId, included: false, reason: "already sent" })),
    ] });
});
router.get("/communications/contract", (_req, res) => {
  res.json({ base: "/api/communications", endpoints: {
    campaigns: "GET/POST /campaigns; POST /campaigns/:id/send|send-test|schedule|retry-failed|sync-results; GET /campaigns/:id/summary",
    content: "GET/POST /templates; GET/POST/PUT /drafts; GET/PUT /brand",
    compliance: "POST /suppressions", assets: "GET /assets; POST /assets/request-upload; POST /assets", providers: "GET /provider-status",
  } });
});

async function resolveContacts(audience: any, kind: string) {
  const sources: string[] = Array.isArray(audience?.sources) ? audience.sources : ["training"];
  const found: SourceContact[] = [];
  if (kind === "operational" && Array.isArray(audience?.manualRecipients)) {
    for (const value of audience.manualRecipients) {
      if (typeof value !== "string") continue;
      const email = value.trim().toLowerCase();
      found.push({ email, name: null, sourceType: "manual", sourceId: email, consent: false });
    }
  }
  if (kind === "operational" && sources.includes("operational_saved")) {
    const r = await db.execute(sql`SELECT email, name FROM communication_operational_contacts WHERE active=true ORDER BY email`);
    found.push(...(r.rows as any[]).map(x => ({
      email: x.email,
      name: x.name,
      sourceType: "operational_saved",
      sourceId: x.email,
      consent: false,
    })));
  }
  if (kind === "promotional" && audience?.marketingConsentOverride === true && Array.isArray(audience?.manualRecipients)) {
    for (const value of audience.manualRecipients.slice(0, 10_000)) {
      if (typeof value !== "string") continue;
      const email = value.trim().toLowerCase();
      found.push({ email, name: null, sourceType: "consented_marketing_list", sourceId: email, consent: true });
    }
  }
  // Source records remain authoritative; this creates only a send-time snapshot.
  if (sources.includes("training")) {
    const r = await db.execute(sql`SELECT id, email, concat_ws(' ', first_name, last_name) AS name, marketing_consent FROM training_registrations WHERE status != 'cancelled'`);
    found.push(...(r.rows as any[]).map(x => ({ email: x.email, name: x.name, sourceType: "training", sourceId: x.id, consent: !!x.marketing_consent })));
  }
  if (sources.includes("training_series") && Array.isArray(audience?.seriesCohorts) && audience.seriesCohorts.length) {
    const r = await db.execute(sql`
      SELECT id, email, concat_ws(' ', first_name, last_name) AS name, marketing_consent,
        workshop_1_selected, workshop_2_selected, workshop_3_selected, workshop_4_selected,
        full_series_selected
      FROM training_registrations
      WHERE status != 'cancelled'
    `);
    const selectedCohorts = new Set(audience.seriesCohorts.map(String));
    const matches = (r.rows as any[]).filter(x =>
      (selectedCohorts.has("full_series") && x.full_series_selected) ||
      ([1, 2, 3, 4] as const).some(n =>
        selectedCohorts.has(`workshop_${n}`) &&
        (x[`workshop_${n}_selected`] || x.full_series_selected)
      )
    );
    found.push(...matches.map(x => ({ email: x.email, name: x.name, sourceType: "training_series", sourceId: x.id, consent: !!x.marketing_consent })));
  }
  if (sources.includes("workshops") && Array.isArray(audience?.workshopIds) && audience.workshopIds.length) {
    const r = await db.execute(sql`
      SELECT r.id, r.workshop_id, r.email, concat_ws(' ', r.first_name, r.last_name) AS name, r.marketing_consent
      FROM workshop_registrations r
      JOIN workshops w ON w.id = r.workshop_id
      WHERE r.status != 'cancelled'
        AND (w.is_free = TRUE OR r.payment_status = 'paid')
    `);
    const selectedWorkshopIds = new Set(audience.workshopIds.map(String));
    const matches = (r.rows as any[]).filter(x => selectedWorkshopIds.has(String(x.workshop_id)));
    found.push(...matches.map(x => ({ email: x.email, name: x.name, sourceType: "workshop", sourceId: x.id, consent: !!x.marketing_consent })));
  }
  if (sources.includes("cases")) {
    const r = await db.execute(sql`SELECT id, parent_email AS email, parent_name AS name, consent_obtained FROM cases WHERE parent_email IS NOT NULL`);
    found.push(...(r.rows as any[]).map(x => ({ email: x.email, name: x.name, sourceType: "case", sourceId: x.id, consent: false })));
  }
  if (sources.includes("users")) {
    const r = await db.execute(sql`SELECT id, email, name FROM users`);
    found.push(...(r.rows as any[]).map(x => ({ email: x.email, name: x.name, sourceType: "user", sourceId: x.id, consent: false })));
  }
  if (sources.includes("inquiries")) {
    const r = await db.execute(sql`SELECT id, contact_email AS email, contact_name AS name FROM inquiries`);
    found.push(...(r.rows as any[]).map(x => ({ email: x.email, name: x.name, sourceType: "inquiry", sourceId: x.id, consent: false })));
  }
  const sourceIds: Record<string, string[]> = {
    ...(audience?.sourceIds && typeof audience.sourceIds === "object" ? audience.sourceIds : {}),
    training: Array.isArray(audience?.registrationIds) ? audience.registrationIds : (audience?.sourceIds?.training ?? []),
    training_series: audience?.sourceIds?.training_series ?? [],
    case: Array.isArray(audience?.caseIds) ? audience.caseIds : (audience?.sourceIds?.case ?? []),
    user: Array.isArray(audience?.userIds) ? audience.userIds : (audience?.sourceIds?.user ?? []),
    inquiry: Array.isArray(audience?.inquiryIds) ? audience.inquiryIds : (audience?.sourceIds?.inquiry ?? []),
  };
  const selected = Object.entries(sourceIds).filter(([, ids]) => Array.isArray(ids) && ids.length);
  const selectedFound = selected.length ? found.filter(c => !sourceIds[c.sourceType]?.length || sourceIds[c.sourceType].includes(c.sourceId)) : found;
  const suppressed = await db.execute(sql`SELECT email, kind FROM communication_suppressions`);
  const block = new Map((suppressed.rows as any[]).map(x => [String(x.email).toLowerCase(), x.kind]));
  const resolution = resolveEligibleContacts(selectedFound, kind === "operational" ? "operational" : "promotional", block);
  const alreadySentRecipients: typeof resolution.recipients = [];
  if (kind === "promotional" && typeof audience?.priorCampaignName === "string" && audience.priorCampaignName.trim()) {
    const prior = await db.execute(sql`
      SELECT DISTINCT lower(r.email) AS email
      FROM communication_recipients r
      JOIN communication_campaigns c ON c.id = r.campaign_id
      WHERE lower(trim(c.name)) = lower(trim(${audience.priorCampaignName}))
        AND r.status IN ('sent','delivered')
    `);
    const sentEmails = new Set((prior.rows as any[]).map(row => String(row.email)));
    const remaining = resolution.recipients.filter(recipient => {
      if (!sentEmails.has(recipient.email)) return true;
      alreadySentRecipients.push(recipient);
      return false;
    });
    resolution.recipients = remaining;
    resolution.counts.included = remaining.length;
    (resolution.counts as any).alreadySent = alreadySentRecipients.length;
    resolution.counts.excluded += alreadySentRecipients.length;
  } else {
    (resolution.counts as any).alreadySent = 0;
  }
  return { ...resolution, alreadySentRecipients };
}

async function snapshot(campaign: any) {
  const existing = await db.execute(sql`SELECT COUNT(*)::int AS count FROM communication_recipients WHERE campaign_id = ${campaign.id}`);
  if (Number((existing.rows[0] as any).count)) return;
  for (const c of (await resolveContacts(campaign.audience, campaign.kind)).recipients) {
    await db.execute(sql`INSERT INTO communication_recipients (id,campaign_id,email,name,source_type,source_id,status,unsubscribe_token) VALUES (${nanoid()},${campaign.id},${c.email},${c.name},${c.sourceType},${c.sourceId},'queued',${nanoid(32)}) ON CONFLICT (campaign_id,email) DO NOTHING`);
  }
}
async function getBrandSettings(): Promise<CommunicationBrandSettings> {
  const brand = await db.execute(sql`SELECT settings FROM communication_brand_settings WHERE id='default'`);
  return ((brand.rows[0] as any)?.settings ?? {}) as CommunicationBrandSettings;
}
async function deliver(campaignId: string, retry = false) {
  await runWithCampaignLock<any>({
    claim: async () => {
      const lock = await db.execute(sql`UPDATE communication_campaigns SET status = 'sending', last_error = NULL, updated_at = NOW() WHERE id = ${campaignId} AND status IN ('draft','scheduled','failed'${retry ? sql`, 'ready'` : sql``}) RETURNING *`);
      return (lock.rows[0] as any) ?? null;
    },
    deliver: async (campaign) => {
      await snapshot(campaign);
      const recipients = await db.execute(sql`SELECT * FROM communication_recipients WHERE campaign_id = ${campaignId} AND status IN ('pending','queued'${retry ? sql`, 'failed'` : sql``})`);
      if (campaign.provider === "emailoctopus") {
         const currentSuppressions = await db.execute(sql`SELECT email,kind FROM communication_suppressions`);
         const suppressedByEmail = new Map((currentSuppressions.rows as { email: string; kind: string }[]).map(row => [row.email.toLowerCase(), row.kind]));
         const excluded = (recipients.rows as any[]).filter(row => isCommunicationBlocked("promotional", suppressedByEmail.get(String(row.email).toLowerCase())));
         for (const recipient of excluded) {
           await db.execute(sql`UPDATE communication_recipients SET status='unsubscribed',unsubscribed_at=NOW() WHERE id=${recipient.id} AND status IN ('pending','queued','failed')`);
         }
         const rows = (recipients.rows as any[]).filter(row => !isCommunicationBlocked("promotional", suppressedByEmail.get(String(row.email).toLowerCase())));
         const existingListId = typeof campaign.provider_campaign_id === "string" && campaign.provider_campaign_id.startsWith("list:")
           ? campaign.provider_campaign_id.slice(5)
           : null;
         if (existingListId && excluded.length) {
           throw new Error("A prepared EmailOctopus list contains an unsubscribed address. Remove it from the provider list before sending or retrying.");
         }
        if (!rows.length) { await db.execute(sql`UPDATE communication_campaigns SET status='sent', sent_at=COALESCE(sent_at,NOW()) WHERE id=${campaignId}`); return; }
        const settings = await getBrandSettings();
        const brandedHtml = renderBrandedEmail(campaign.html, settings);
        const text = String(brandedHtml).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
       const listId = await prepareEmailOctopusAudience({
        name: campaign.name, subject: campaign.subject, html: brandedHtml, text,
        fromName: typeof settings.fromName === "string" ? settings.fromName : undefined,
        fromEmail: typeof settings.fromEmail === "string" ? settings.fromEmail : undefined,
        recipients: rows.map(row => ({ to: row.email, subject: campaign.subject, html: brandedHtml, name: row.name })),
         existingListId,
         onListCreated: async createdListId => {
           await db.execute(sql`UPDATE communication_campaigns SET provider_campaign_id=${`list:${createdListId}`}, updated_at=NOW() WHERE id=${campaignId}`);
         },
      });
        const latestSuppressions = await db.execute(sql`SELECT email,kind FROM communication_suppressions`);
        const latestByEmail = new Map((latestSuppressions.rows as { email: string; kind: string }[]).map(row => [row.email.toLowerCase(), row.kind]));
        const newlyExcluded = rows.filter(row => isCommunicationBlocked("promotional", latestByEmail.get(String(row.email).toLowerCase())));
        if (newlyExcluded.length) {
          for (const recipient of newlyExcluded) {
            await db.execute(sql`UPDATE communication_recipients SET status='unsubscribed',unsubscribed_at=NOW() WHERE id=${recipient.id} AND status IN ('pending','queued','failed')`);
          }
          throw new Error("A recipient opted out while the EmailOctopus list was being prepared. Remove them from the provider list before sending or retrying.");
        }
      // EmailOctopus's documented API can prepare lists and contacts, but does
      // not create or dispatch broadcast campaigns. Keep recipients queued
      // until an administrator sends to this list in EmailOctopus and confirms.
      await db.execute(sql`UPDATE communication_campaigns SET provider_campaign_id=${`list:${listId}`}, status='ready', last_error=NULL, updated_at=NOW() WHERE id=${campaignId}`);
        return;
      }
       const settings = await getBrandSettings();
        const unsubscribeOrigin = typeof campaign.audience?.unsubscribeOrigin === "string" ? campaign.audience.unsubscribeOrigin : "";
        if ((recipients.rows as any[]).length && !/^https?:\/\/[a-zA-Z0-9.:-]+$/.test(unsubscribeOrigin)) {
          throw new Error("This older campaign has no valid unsubscribe link origin. Send or reschedule it from Communications Center to generate one.");
        }
        for (const recipient of recipients.rows as any[]) {
          if (!recipient.unsubscribe_token) {
            recipient.unsubscribe_token = nanoid(32);
            await db.execute(sql`UPDATE communication_recipients SET unsubscribe_token=${recipient.unsubscribe_token} WHERE id=${recipient.id} AND unsubscribe_token IS NULL`);
          }
        }
       await sendGmailGroup({
        kind: campaign.kind,
        recipients: recipients.rows as any[],
        subject: campaign.subject,
        mailer: getCommunicationsMailer(campaign.provider as CommunicationsProvider),
          renderHtml: recipient => {
            const content = renderEmail(campaign.html, recipient.name);
            const token = (recipient as typeof recipient & { unsubscribe_token?: string }).unsubscribe_token;
            return renderBrandedEmail(unsubscribeOrigin && token ? withUnsubscribeLink(content, unsubscribeOrigin, token) : content, settings);
          },
          shouldSkip: async recipient => isCommunicationBlocked("operational", await getSuppressionKind(recipient.email)),
          markSkipped: async recipient => {
            await db.execute(sql`UPDATE communication_recipients SET status='unsubscribed',unsubscribed_at=NOW() WHERE id=${recipient.id} AND status IN ('pending','queued','failed')`);
          },
        markSent: async (recipient, messageId) => {
          await db.execute(sql`UPDATE communication_recipients SET status = 'sent', attempts = attempts + 1, provider_message_id = ${messageId ?? null}, sent_at = NOW(), error = NULL WHERE id = ${recipient.id}`);
           if (recipient.source_type === "manual" || recipient.source_type === "operational_saved") {
              await db.execute(sql`INSERT INTO communication_operational_contacts(email,name,active,failure_reason)
                SELECT ${recipient.email},${recipient.name ?? null},true,NULL
                WHERE NOT EXISTS (SELECT 1 FROM communication_suppressions WHERE lower(email)=lower(${recipient.email}) AND kind='hard')
                ON CONFLICT(email) DO UPDATE SET name=COALESCE(EXCLUDED.name,communication_operational_contacts.name),active=true,failure_reason=NULL,updated_at=NOW()
                WHERE NOT EXISTS (SELECT 1 FROM communication_suppressions WHERE lower(email)=lower(${recipient.email}) AND kind='hard')`);
           }
        },
        markFailed: async (recipient, error) => {
          await db.execute(sql`UPDATE communication_recipients SET status = 'failed', attempts = attempts + 1, error = ${error.message.slice(0, 1000)} WHERE id = ${recipient.id}`);
            if (isPermanentOperationalEmailFailure(error)) {
              await suppressPermanentlyInvalidAddress(recipient.email, "Permanent recipient-address failure");
            } else if (recipient.source_type === "manual" || recipient.source_type === "operational_saved") {
              await db.execute(sql`INSERT INTO communication_operational_contacts(email,name,active,failure_reason)
                SELECT ${recipient.email},${recipient.name ?? null},true,${error.message.slice(0, 1000)}
                WHERE NOT EXISTS (SELECT 1 FROM communication_suppressions WHERE lower(email)=lower(${recipient.email}) AND kind='hard')
                ON CONFLICT(email) DO UPDATE SET name=COALESCE(EXCLUDED.name,communication_operational_contacts.name),active=true,failure_reason=EXCLUDED.failure_reason,updated_at=NOW()
                WHERE NOT EXISTS (SELECT 1 FROM communication_suppressions WHERE lower(email)=lower(${recipient.email}) AND kind='hard')`);
            }
        },
      });
      const totals = await db.execute(sql`SELECT COUNT(*) FILTER (WHERE status = 'failed')::int AS failed FROM communication_recipients WHERE campaign_id = ${campaignId}`);
      const failed = Number((totals.rows[0] as any).failed);
      await db.execute(sql`UPDATE communication_campaigns SET status = ${failed ? "failed" : "sent"}, sent_at = CASE WHEN ${failed > 0} THEN sent_at ELSE NOW() END, updated_at = NOW() WHERE id = ${campaignId}`);
    },
    markFailed: async (_campaign, error) => {
      const message = error instanceof Error ? error.message : "Campaign preparation failed";
      logger.error({ err: error, campaignId }, "Campaign delivery failed");
      await db.execute(sql`UPDATE communication_campaigns SET status='failed', last_error=${message.slice(0, 1000)}, updated_at=NOW() WHERE id=${campaignId}`);
    },
  });
}

const reportStatus: Record<EmailOctopusReportType, string> = {
  sent: "delivered", bounced: "bounced", complained: "complained", unsubscribed: "unsubscribed",
};
const reportRank: Record<string, number> = {
  pending: 0, queued: 0, sent: 1, delivered: 2, bounced: 3, complained: 4, unsubscribed: 5,
};
async function reconcileEmailOctopusCampaign(campaign: any) {
  if (campaign.provider !== "emailoctopus" || !campaign.provider_campaign_id) return { processed: 0 };
  // A list:* reference has no campaign reports, but its native unsubscribe
  // link updates the list contact status. Import those opt-outs into RAOS.
  if (String(campaign.provider_campaign_id).startsWith("list:")) {
    const listId = String(campaign.provider_campaign_id).slice(5);
    const recipients = await db.execute(sql`SELECT id,lower(email) AS email FROM communication_recipients WHERE campaign_id=${campaign.id}`);
    const byEmail = new Map((recipients.rows as { id: string; email: string }[]).map(row => [row.email, row.id]));
    let processed = 0;
    for (const email of await getEmailOctopusListUnsubscribes(listId)) {
      const recipientId = byEmail.get(email);
      if (!recipientId) continue;
      await applySuppression(email, "hard", "EmailOctopus list unsubscribe");
      await db.execute(sql`UPDATE communication_recipients SET
        status=CASE WHEN status IN ('pending','queued','failed') THEN 'unsubscribed' ELSE status END,
        unsubscribed_at=COALESCE(unsubscribed_at,NOW()) WHERE id=${recipientId}`);
      processed++;
    }
    return { processed };
  }
  let processed = 0;
  for (const report of ["sent", "bounced", "complained", "unsubscribed"] as EmailOctopusReportType[]) {
    for (const event of await getEmailOctopusCampaignReport(campaign.provider_campaign_id, report)) {
      if (!event.email) continue;
      const found = await db.execute(sql`SELECT id,status,email FROM communication_recipients WHERE campaign_id=${campaign.id} AND lower(email)=${event.email} LIMIT 1`);
      if (!found.rows.length) continue;
      const recipient: any = found.rows[0];
      const status = reportStatus[report];
      const eventKey = `${campaign.provider_campaign_id}:${report}:${event.contactId || event.email}`;
      const inserted = await db.execute(sql`INSERT INTO communication_delivery_events(id,event_key,campaign_id,recipient_id,provider,event_type,occurred_at,payload) VALUES(${nanoid()},${eventKey},${campaign.id},${recipient.id},'emailoctopus',${status},${event.occurredAt},${JSON.stringify({ bounceType: event.bounceType })}::jsonb) ON CONFLICT(event_key) DO NOTHING RETURNING id`);
      if (inserted.rows.length) processed++;
      if ((reportRank[status] ?? 0) >= (reportRank[recipient.status] ?? 0)) {
        const reason = report === "bounced" ? `${event.bounceType || "unknown"} bounce reported by EmailOctopus` : report === "complained" ? "spam complaint reported by EmailOctopus" : null;
        await db.execute(sql`UPDATE communication_recipients SET status=${status}, error=COALESCE(${reason},error), delivered_at=CASE WHEN ${report}='sent' THEN COALESCE(delivered_at,${event.occurredAt},NOW()) ELSE delivered_at END, bounced_at=CASE WHEN ${report}='bounced' THEN COALESCE(bounced_at,${event.occurredAt},NOW()) ELSE bounced_at END, complained_at=CASE WHEN ${report}='complained' THEN COALESCE(complained_at,${event.occurredAt},NOW()) ELSE complained_at END, unsubscribed_at=CASE WHEN ${report}='unsubscribed' THEN COALESCE(unsubscribed_at,${event.occurredAt},NOW()) ELSE unsubscribed_at END WHERE id=${recipient.id}`);
      }
      if (report === "unsubscribed" || report === "complained" || (report === "bounced" && event.bounceType === "hard")) {
        const suppressionReason = report === "unsubscribed" ? "EmailOctopus unsubscribe report" : report === "complained" ? "EmailOctopus complaint report" : "EmailOctopus hard bounce report";
        await applySuppression(event.email, "hard", suppressionReason);
      }
    }
  }
  return { processed };
}

router.get("/communications/campaigns", async (_req, res) => {
  const r = await db.execute(sql`SELECT c.*, COUNT(r.id)::int AS recipient_count, COUNT(r.id) FILTER (WHERE r.status IN ('pending','queued'))::int AS queued_count, COUNT(r.id) FILTER (WHERE r.status = 'sent')::int AS sent_count, COUNT(r.id) FILTER (WHERE r.status = 'delivered')::int AS delivered_count, COUNT(r.id) FILTER (WHERE r.status = 'bounced')::int AS bounced_count, COUNT(r.id) FILTER (WHERE r.status = 'complained')::int AS complained_count, COUNT(r.id) FILTER (WHERE r.status = 'unsubscribed')::int AS unsubscribed_count, COUNT(r.id) FILTER (WHERE r.status = 'failed')::int AS failed_count FROM communication_campaigns c LEFT JOIN communication_recipients r ON r.campaign_id=c.id WHERE c.archived_at IS NULL GROUP BY c.id ORDER BY c.created_at DESC`);
  res.json({ campaigns: r.rows }); // No address-level data is ever returned.
});
router.delete("/communications/campaigns/test-drafts", async (req, res) => {
  const deleted = await db.execute(sql`
    DELETE FROM communication_campaigns c
    WHERE c.is_test = true OR c.name LIKE '[TEST]%'
    RETURNING c.id
  `);
  await writeAudit({ eventType: "communications.test_drafts.deleted", actorId: req.userId, actorRole: req.userRole, metadata: { count: deleted.rows.length } });
  res.json({ ok: true, deleted: deleted.rows.length });
});
router.post("/communications/campaigns", async (req, res): Promise<void> => {
  const { name, subject, html, kind = "promotional", provider = "gmail", audience = {}, isTest = false } = req.body;
  if (!name?.trim() || !subject?.trim() || !html?.trim() || !["promotional", "operational"].includes(kind) || !["gmail", "emailoctopus"].includes(provider) || (provider === "gmail" && kind !== "operational") || (provider === "emailoctopus" && kind !== "promotional")) { res.status(400).json({ error: "Gmail is for small operational campaigns; EmailOctopus is for promotional bulk campaigns" }); return; }
  if (kind === "promotional" && Array.isArray(audience?.manualRecipients) && audience.manualRecipients.length && audience.marketingConsentOverride !== true) { res.status(400).json({ error: "Administrator confirmation of prior marketing consent is required for pasted promotional lists" }); return; }
  const id = nanoid();
  const storedAudience = { ...audience, unsubscribeOrigin: requestOrigin(req) };
  await db.execute(sql`INSERT INTO communication_campaigns (id,name,subject,html,kind,provider,audience,is_test,created_by) VALUES (${id},${name.trim()},${subject.trim()},${sanitizeEmailHtml(html)},${kind},${provider},${JSON.stringify(storedAudience)}::jsonb,${Boolean(isTest)},${req.userId!})`);
  await writeAudit({ eventType: "communications.campaign.created", actorId: req.userId, actorRole: req.userRole, metadata: { campaignId: id, marketingConsentOverride: audience?.marketingConsentOverride === true, manualRecipientCount: Array.isArray(audience?.manualRecipients) ? audience.manualRecipients.length : 0 } }); res.status(201).json({ id });
});
router.post("/communications/campaigns/:id/send-test", async (req, res): Promise<void> => {
  const email = String(req.body?.email || "").trim().toLowerCase(); if (!isValidCommunicationEmail(email)) { res.status(400).json({ error: "A valid test email is required" }); return; }
  if (isCommunicationBlocked("operational", await getSuppressionKind(email))) { res.status(409).json({ error: "Recipient has opted out of all communications" }); return; }
  const r = await db.execute(sql`SELECT * FROM communication_campaigns WHERE id=${req.params.id}`); if (!r.rows.length) { res.status(404).json({ error: "Not found" }); return; }
  const c: any = r.rows[0]; const recipientId = nanoid();
  await db.execute(sql`INSERT INTO communication_recipients(id,campaign_id,email,name,source_type,source_id,status) VALUES(${recipientId},${req.params.id},${email},${typeof req.body?.name === "string" ? req.body.name : null},'test','manual-test','pending') ON CONFLICT (campaign_id,email) DO UPDATE SET status='pending',error=NULL`);
  try {
    const settings = await getBrandSettings();
    const sent = await sendGmailTest({ email, subject: c.subject, html: renderBrandedEmail(renderEmail(c.html, req.body?.name), settings), mailer: getCommunicationsMailer("gmail") });
    await db.execute(sql`UPDATE communication_recipients SET status='sent',attempts=attempts+1,provider_message_id=${sent.id ?? null},sent_at=NOW() WHERE campaign_id=${req.params.id} AND email=${email}`);
    await db.execute(sql`UPDATE communication_campaigns SET is_test=true,status='sent',sent_at=NOW(),updated_at=NOW() WHERE id=${req.params.id}`);
    res.json({ ok: true, provider: "gmail" });
  } catch (err) {
    await db.execute(sql`UPDATE communication_recipients SET status='failed',attempts=attempts+1,error=${err instanceof Error ? err.message : "Test send failed"} WHERE campaign_id=${req.params.id} AND email=${email}`);
    await db.execute(sql`UPDATE communication_campaigns SET is_test=true,status='failed',updated_at=NOW() WHERE id=${req.params.id}`);
    res.status(409).json({ error: err instanceof Error ? err.message : "Test send failed" });
  }
});
router.post("/communications/campaigns/:id/send", async (req, res) => {
  const campaignId = req.params.id;
  const actorId = req.userId;
  const actorRole = req.userRole;
  const origin = requestOrigin(req);
  await db.execute(sql`UPDATE communication_campaigns SET audience=jsonb_set(audience,'{unsubscribeOrigin}',to_jsonb(${origin}::text),true) WHERE id=${campaignId}`);
  void deliver(campaignId)
    .then(() => writeAudit({ eventType: "communications.campaign.sent", actorId, actorRole, metadata: { campaignId } }))
    .catch(err => logger.error({ err, campaignId }, "Background campaign delivery failed"));
  res.status(202).json({ ok: true, status: "preparing" });
});
router.post("/communications/campaigns/:id/retry-failed", async (req, res) => {
  const campaignId = req.params.id;
  void deliver(campaignId, true)
    .catch(err => logger.error({ err, campaignId }, "Background campaign retry failed"));
  res.status(202).json({ ok: true, status: "preparing" });
});
router.post("/communications/campaigns/:id/confirm-emailoctopus-sent", async (req, res): Promise<void> => {
  const campaignId = req.params.id;
  const result = await db.execute(sql`UPDATE communication_campaigns
    SET status='sent', sent_at=NOW(), updated_at=NOW()
    WHERE id=${campaignId} AND provider='emailoctopus' AND status='ready'
      AND provider_campaign_id LIKE 'list:%'
    RETURNING id`);
  if (!result.rows.length) {
    res.status(409).json({ error: "Only a prepared EmailOctopus audience can be confirmed as sent" });
    return;
  }
  await db.execute(sql`UPDATE communication_recipients
    SET status='sent', attempts=attempts+1, sent_at=NOW(), error=NULL
    WHERE campaign_id=${campaignId} AND status IN ('pending','queued','failed')`);
  await writeAudit({
    eventType: "communications.campaign.external_sent_confirmed",
    actorId: req.userId,
    actorRole: req.userRole,
    metadata: { campaignId },
  });
  res.json({ ok: true });
});
router.post("/communications/campaigns/:id/schedule", async (req, res): Promise<void> => {
  const date = new Date(req.body?.scheduledAt); if (Number.isNaN(date.valueOf()) || date <= new Date()) { res.status(400).json({ error: "scheduledAt must be in the future" }); return; }
  const origin = requestOrigin(req);
  await db.execute(sql`UPDATE communication_campaigns SET status='scheduled', scheduled_at=${date.toISOString()}, audience=jsonb_set(audience,'{unsubscribeOrigin}',to_jsonb(${origin}::text),true), updated_at=NOW() WHERE id=${req.params.id}`); res.json({ ok: true });
});
router.get("/communications/campaigns/:id/summary", async (req, res) => { const r = await db.execute(sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('pending','queued'))::int AS queued, COUNT(*) FILTER (WHERE status='sent')::int AS sent, COUNT(*) FILTER (WHERE status='delivered')::int AS delivered, COUNT(*) FILTER (WHERE status='bounced')::int AS bounced, COUNT(*) FILTER (WHERE status='complained')::int AS complained, COUNT(*) FILTER (WHERE status='unsubscribed')::int AS unsubscribed, COUNT(*) FILTER (WHERE status='failed')::int AS failed FROM communication_recipients WHERE campaign_id=${req.params.id}`); res.json({ summary: r.rows[0] }); });
router.post("/communications/campaigns/:id/sync-results", async(req,res): Promise<void>=>{const c=await db.execute(sql`SELECT * FROM communication_campaigns WHERE id=${req.params.id}`);if(!c.rows.length){res.status(404).json({error:"Not found"});return;}try{const result=await reconcileEmailOctopusCampaign(c.rows[0]);res.json({ok:true,...result});}catch(err){req.log.error({err,campaignId:req.params.id},"EmailOctopus report sync failed");res.status(409).json({error:err instanceof Error?err.message:"Report sync failed"});}});
router.get("/communications/campaigns/:id", async(req,res)=>{const c=await db.execute(sql`SELECT * FROM communication_campaigns WHERE id=${req.params.id}`);if(!c.rows.length){res.status(404).json({error:"Not found"});return;}const history=await db.execute(sql`SELECT id,email,name,source_type,source_id,status,attempts,provider_message_id,error,sent_at,delivered_at,bounced_at,complained_at,unsubscribed_at,created_at FROM communication_recipients WHERE campaign_id=${req.params.id} ORDER BY created_at`);const summary=await db.execute(sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('pending','queued'))::int AS queued, COUNT(*) FILTER (WHERE status='sent')::int AS sent, COUNT(*) FILTER (WHERE status='delivered')::int AS delivered, COUNT(*) FILTER (WHERE status='bounced')::int AS bounced, COUNT(*) FILTER (WHERE status='complained')::int AS complained, COUNT(*) FILTER (WHERE status='unsubscribed')::int AS unsubscribed, COUNT(*) FILTER (WHERE status='failed')::int AS failed FROM communication_recipients WHERE campaign_id=${req.params.id}`);res.json({campaign:c.rows[0],summary:summary.rows[0],history:history.rows});});
router.post("/communications/campaigns/:id/cancel", async(req,res)=>{const r=await db.execute(sql`UPDATE communication_campaigns SET status='cancelled',updated_at=NOW() WHERE id=${req.params.id} AND status='scheduled' RETURNING id`);if(!r.rows.length){res.status(409).json({error:"Only scheduled campaigns can be cancelled"});return;}res.json({ok:true});});
router.delete("/communications/campaigns/:id", async (req, res): Promise<void> => {
  const r = await db.execute(sql`
    DELETE FROM communication_campaigns c
    WHERE c.id=${req.params.id}
      AND (
        c.is_test=true
        OR c.name LIKE '[TEST]%'
        OR NOT EXISTS (
          SELECT 1 FROM communication_recipients r
          WHERE r.campaign_id=c.id
        )
        OR (
          c.status IN ('draft','cancelled','failed')
          AND NOT EXISTS (
            SELECT 1 FROM communication_recipients r
            WHERE r.campaign_id=c.id AND r.status IN ('sent','delivered')
          )
        )
      )
    RETURNING c.id,c.is_test,c.status
  `);
  if (!r.rows.length) {
    const exists = await db.execute(sql`SELECT id FROM communication_campaigns WHERE id=${req.params.id}`);
    res.status(exists.rows.length ? 409 : 404).json({
      error: exists.rows.length
        ? "Only test records, empty campaigns, or failed/unsent campaigns with no sent recipients can be permanently deleted"
        : "Campaign not found",
    });
    return;
  }
  await writeAudit({
    eventType: "communications.campaign.deleted",
    actorId: req.userId,
    actorRole: req.userRole,
    metadata: { campaignId: req.params.id, isTest: (r.rows[0] as any).is_test, status: (r.rows[0] as any).status },
  });
  res.json({ ok: true });
});
router.post("/communications/campaigns/:id/archive", async(req,res): Promise<void>=>{const r=await db.execute(sql`UPDATE communication_campaigns SET archived_at=NOW(),updated_at=NOW() WHERE id=${req.params.id} AND archived_at IS NULL RETURNING id`);if(!r.rows.length){res.status(404).json({error:"Campaign not found"});return;}await writeAudit({eventType:"communications.campaign.archived",actorId:req.userId,actorRole:req.userRole,metadata:{campaignId:req.params.id}});res.json({ok:true});});
router.post("/communications/direct-send", async (req, res): Promise<void> => {
  const { email, subject, html, sourceType, sourceId, name } = req.body ?? {};
  const to = String(email ?? "").trim().toLowerCase();
  if (!validEmail.test(to) || typeof subject !== "string" || !subject.trim() || typeof html !== "string" || !html.trim() ||
    typeof sourceType !== "string" || !sourceType.trim() || typeof sourceId !== "string" || !sourceId.trim()) {
    res.status(400).json({ error: "email, subject, html, sourceType and sourceId are required" }); return;
  }
  if (isCommunicationBlocked("operational", await getSuppressionKind(to))) {
    res.status(409).json({ error: "Recipient has opted out of all communications" }); return;
  }
  const campaignId = nanoid();
  const recipientId = nanoid();
  const unsubscribeToken = nanoid(32);
  const origin = requestOrigin(req);
  await db.execute(sql`INSERT INTO communication_campaigns(id,name,subject,html,kind,provider,audience,status,created_by)
    VALUES(${campaignId},'Direct operational email',${subject.trim()},${sanitizeEmailHtml(html)},'operational','gmail','{}'::jsonb,'sending',${req.userId!})`);
  await db.execute(sql`INSERT INTO communication_recipients(id,campaign_id,email,name,source_type,source_id,status,unsubscribe_token)
    VALUES(${recipientId},${campaignId},${to},${typeof name === "string" ? name : null},${sourceType},${sourceId},'pending',${unsubscribeToken})`);
  if (isCommunicationBlocked("operational", await getSuppressionKind(to))) {
    await db.execute(sql`UPDATE communication_recipients SET status='unsubscribed',unsubscribed_at=NOW() WHERE id=${recipientId}`);
    await db.execute(sql`UPDATE communication_campaigns SET status='sent',updated_at=NOW() WHERE id=${campaignId}`);
    res.status(409).json({ error: "Recipient has opted out of all communications" }); return;
  }
  try {
    const settings = await getBrandSettings();
    const body = renderBrandedEmail(withUnsubscribeLink(renderEmail(html, typeof name === "string" ? name : null), origin, unsubscribeToken), settings);
    const sent = await getCommunicationsMailer("gmail").send({ to, subject: subject.trim(), html: body });
    await db.execute(sql`UPDATE communication_recipients SET status='sent',attempts=1,provider_message_id=${sent.id ?? null},sent_at=NOW() WHERE id=${recipientId}`);
    await db.execute(sql`UPDATE communication_campaigns SET status='sent',sent_at=NOW(),updated_at=NOW() WHERE id=${campaignId}`);
    await writeAudit({ eventType: "communications.direct.sent", actorId: req.userId, actorRole: req.userRole, metadata: { campaignId, sourceType, sourceId } });
    res.status(201).json({ id: campaignId, status: "sent" });
  } catch (err) {
    await db.execute(sql`UPDATE communication_recipients SET status='failed',attempts=1,error=${err instanceof Error ? err.message : "Delivery failed"} WHERE id=${recipientId}`);
    await db.execute(sql`UPDATE communication_campaigns SET status='failed',updated_at=NOW() WHERE id=${campaignId}`);
    res.status(409).json({ error: err instanceof Error ? err.message : "Delivery failed", id: campaignId });
  }
});
router.get("/communications/templates", async (_req,res) => { const r=await db.execute(sql`SELECT id,name,subject,created_at,updated_at FROM communication_templates ORDER BY updated_at DESC`); res.json({templates:r.rows}); });
router.post("/communications/templates", async (req,res): Promise<void> => { if(!req.body?.name?.trim()||!req.body?.subject?.trim()) { res.status(400).json({error:"Name and subject are required"}); return; } const id=nanoid(); await db.execute(sql`INSERT INTO communication_templates (id,name,subject,html,created_by) VALUES (${id},${req.body.name.trim()},${req.body.subject.trim()},${sanitizeEmailHtml(req.body.html)},${req.userId!})`); res.status(201).json({id}); });
router.get("/communications/templates/:id", async(req,res)=>{const r=await db.execute(sql`SELECT * FROM communication_templates WHERE id=${req.params.id}`);if(!r.rows.length){res.status(404).json({error:"Not found"});return;}res.json({template:r.rows[0]});});
router.put("/communications/templates/:id", async(req,res)=>{await db.execute(sql`UPDATE communication_templates SET name=COALESCE(${req.body?.name??null},name),subject=COALESCE(${req.body?.subject??null},subject),html=COALESCE(${req.body?.html===undefined?null:sanitizeEmailHtml(req.body.html)},html),updated_at=NOW() WHERE id=${req.params.id}`);res.json({ok:true});});
router.post("/communications/templates/:id/duplicate", async(req,res)=>{const r=await db.execute(sql`SELECT * FROM communication_templates WHERE id=${req.params.id}`);if(!r.rows.length){res.status(404).json({error:"Not found"});return;}const t:any=r.rows[0],id=nanoid();await db.execute(sql`INSERT INTO communication_templates(id,name,subject,html,created_by) VALUES(${id},${`${t.name} copy`},${t.subject},${t.html},${req.userId!})`);res.status(201).json({id});});
router.post("/communications/templates/:id/archive", async(req,res)=>{await db.execute(sql`UPDATE communication_templates SET archived_at=NOW(),updated_at=NOW() WHERE id=${req.params.id}`);res.json({ok:true});});
router.get("/communications/drafts", async (_req,res) => { const r=await db.execute(sql`SELECT id,name,subject,audience,created_at,updated_at FROM communication_drafts ORDER BY updated_at DESC`); res.json({drafts:r.rows}); });
router.post("/communications/drafts", async (req,res): Promise<void> => { if(!req.body?.name?.trim()) { res.status(400).json({error:"Name is required"}); return; } const id=nanoid(); await db.execute(sql`INSERT INTO communication_drafts (id,name,subject,html,audience,created_by) VALUES(${id},${req.body.name.trim()},${String(req.body.subject??"")},${sanitizeEmailHtml(req.body.html)},${JSON.stringify(req.body.audience??{})}::jsonb,${req.userId!})`); res.status(201).json({id}); });
router.get("/communications/drafts/:id", async(req,res)=>{const r=await db.execute(sql`SELECT * FROM communication_drafts WHERE id=${req.params.id}`);if(!r.rows.length){res.status(404).json({error:"Not found"});return;}res.json({draft:r.rows[0]});});
router.put("/communications/drafts/:id", async (req,res) => { await db.execute(sql`UPDATE communication_drafts SET name=COALESCE(${req.body?.name??null},name),subject=COALESCE(${req.body?.subject??null},subject),html=COALESCE(${req.body?.html===undefined?null:sanitizeEmailHtml(req.body.html)},html),audience=COALESCE(${req.body?.audience===undefined?null:JSON.stringify(req.body.audience)}::jsonb,audience),updated_at=NOW() WHERE id=${req.params.id}`); res.json({ok:true}); });
router.delete("/communications/drafts/:id", async (req,res): Promise<void> => {
  const deleted = await db.execute(sql`DELETE FROM communication_drafts WHERE id=${req.params.id} RETURNING id`);
  if (!deleted.rows.length) { res.status(404).json({error:"Draft not found"}); return; }
  await writeAudit({eventType:"communications.draft.deleted",actorId:req.userId,actorRole:req.userRole,metadata:{draftId:req.params.id}});
  res.json({ok:true});
});
router.get("/communications/brand", async (_req,res)=>{ const r=await db.execute(sql`SELECT settings FROM communication_brand_settings WHERE id='default'`); res.json({settings:(r.rows[0] as any)?.settings ?? {}}); });
router.put("/communications/brand", async (req,res)=>{ await db.execute(sql`INSERT INTO communication_brand_settings (id,settings,updated_by) VALUES ('default',${JSON.stringify(req.body?.settings ?? {})}::jsonb,${req.userId!}) ON CONFLICT (id) DO UPDATE SET settings=EXCLUDED.settings,updated_by=EXCLUDED.updated_by,updated_at=NOW()`); res.json({ok:true}); });
router.post("/communications/suppressions", async (req, res): Promise<void> => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (!validEmail.test(email)) { res.status(400).json({ error: "Valid email required" }); return; }
  const kind = req.body?.kind === "hard" ? "hard" : "unsubscribe";
  await applySuppression(email, kind, String(req.body?.reason || "administrator request"));
  await writeAudit({ eventType: "communications.suppression.added", actorId: req.userId, actorRole: req.userRole, metadata: { kind } });
  res.status(201).json({ ok: true });
});
router.get("/communications/suppressions", async(_req,res)=>{const r=await db.execute(sql`SELECT email,kind,reason,created_at FROM communication_suppressions ORDER BY created_at DESC`);res.json({suppressions:r.rows});});
router.delete("/communications/suppressions/:email", async(req,res)=>{await db.execute(sql`DELETE FROM communication_suppressions WHERE email=${String(req.params.email).toLowerCase()}`);res.json({ok:true});});
const maxAssetBytes = Number(process.env.COMMUNICATIONS_MAX_ASSET_BYTES || 25 * 1024 * 1024);
const blockedAssetExtensions = new Set([
  "html", "htm", "svg", "js", "mjs", "cjs", "jsx", "ts", "tsx",
  "exe", "dll", "com", "bat", "cmd", "msi", "sh", "ps1", "php", "jar",
]);
const blockedAssetTypes = new Set([
  "text/html", "image/svg+xml", "application/javascript", "text/javascript",
  "application/x-msdownload", "application/x-sh", "application/x-httpd-php",
]);
function isAllowedCommunicationAsset(name: unknown, size: unknown, contentType: unknown): boolean {
  if (typeof name !== "string" || !name.trim() || name.length > 255) return false;
  if (!Number.isInteger(size) || Number(size) < 1 || Number(size) > maxAssetBytes) return false;
  if (typeof contentType !== "string" || !contentType.trim() || blockedAssetTypes.has(contentType.toLowerCase())) return false;
  const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return !blockedAssetExtensions.has(extension);
}
router.post("/communications/assets/request-upload", async(req,res): Promise<void> => {
  const {name,size,contentType}=req.body??{};
  if(!isAllowedCommunicationAsset(name,size,contentType)){
    res.status(400).json({error:"This file type is not allowed, or the file exceeds the 25 MB limit"});return;
  }
  const uploadURL=await objectStorage.getObjectEntityUploadURL();
  res.json({uploadURL,objectPath:objectStorage.normalizeObjectEntityPath(uploadURL),maxBytes:maxAssetBytes});
});
router.post("/communications/assets", async(req,res): Promise<void> => {
  const {objectPath,name,size,contentType,altText}=req.body??{};
  if(typeof objectPath!=="string"||!objectPath.startsWith("/objects/")||!isAllowedCommunicationAsset(name,size,contentType)||(altText!==undefined&&typeof altText!=="string")){
    res.status(400).json({error:"Invalid asset metadata"});return;
  }
  const id=nanoid();
  await db.execute(sql`INSERT INTO communication_assets(id,object_path,name,size,content_type,alt_text,uploaded_by) VALUES(${id},${objectPath},${name},${size},${contentType},${altText??null},${req.userId!})`);
  res.status(201).json({id,servingUrl:`/api/communications/assets/public/${id}`});
});
router.get("/communications/assets", async(_req,res)=>{const r=await db.execute(sql`SELECT id,object_path,name,size,content_type,alt_text,created_at FROM communication_assets ORDER BY created_at DESC`);res.json({assets:(r.rows as any[]).map(x=>({...x,serving_url:`/api/communications/assets/public/${x.id}`}))});});

setInterval(() => { void (async () => { try { await ensureReady(); const due=await db.execute(sql`SELECT id FROM communication_campaigns WHERE status='scheduled' AND scheduled_at <= NOW()`); for(const c of due.rows as any[]) await deliver(c.id); } catch(err) { logger.error({err},"Communications schedule poll failed"); } })(); }, 60_000).unref();
setInterval(() => { void (async () => { try { await ensureReady(); const campaigns=await db.execute(sql`SELECT * FROM communication_campaigns WHERE provider='emailoctopus' AND provider_campaign_id IS NOT NULL AND status='sent'`); for(const campaign of campaigns.rows as any[]) { try { await reconcileEmailOctopusCampaign(campaign); } catch(err) { logger.error({err,campaignId:campaign.id},"EmailOctopus report reconciliation failed"); } } } catch(err) { logger.error({err},"EmailOctopus report reconciliation failed"); } })(); }, 15 * 60_000).unref();
export default router;