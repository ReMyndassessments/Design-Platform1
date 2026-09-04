import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { writeAudit } from "../lib/audit.js";
import { createEmailOctopusCampaign, getCommunicationsMailer, renderEmail, sanitizeEmailHtml, sendEmailOctopusCampaign, type CommunicationsProvider } from "../lib/communications.js";
import { ObjectStorageService } from "../lib/objectStorage.js";
import { logger } from "../lib/logger.js";

const router = Router();
const objectStorage = new ObjectStorageService();
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.userRole !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
  next();
}
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_recipients (id text PRIMARY KEY, campaign_id text NOT NULL REFERENCES communication_campaigns(id) ON DELETE CASCADE, email text NOT NULL, name text, source_type text NOT NULL, source_id text NOT NULL, status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0, provider_message_id text, error text, sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT NOW(), UNIQUE(campaign_id, email))`);
  await db.execute(sql`ALTER TABLE communication_recipients ADD COLUMN IF NOT EXISTS unsubscribe_token text UNIQUE`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS communication_suppressions (email text PRIMARY KEY, kind text NOT NULL DEFAULT 'unsubscribe', reason text, created_at timestamptz NOT NULL DEFAULT NOW())`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS communication_campaign_due_idx ON communication_campaigns(status, scheduled_at)`);
})();
async function ensureReady() { await ready; }
router.use(async (_req, res, next) => { try { await ensureReady(); next(); } catch (err) { logger.error({ err }, "Communications initialization failed"); res.status(500).json({ error: "Communications storage is unavailable" }); } });
router.get("/communications/unsubscribe/:token", async (req, res) => {
  const found = await db.execute(sql`SELECT email FROM communication_recipients WHERE unsubscribe_token=${req.params.token} LIMIT 1`);
  if (!found.rows.length) { res.status(404).send("Unsubscribe link is invalid or expired."); return; }
  const email = (found.rows[0] as any).email;
  await db.execute(sql`INSERT INTO communication_suppressions(email,kind,reason) VALUES(${email},'unsubscribe','recipient unsubscribe link') ON CONFLICT(email) DO UPDATE SET kind='unsubscribe',reason=EXCLUDED.reason`);
  res.type("text/plain").send("You have been unsubscribed from promotional communications.");
});
router.use(authMiddleware, requireAdmin);
router.get("/communications/provider-status", (_req, res) => {
  res.json({
    providers: {
      gmail: { configured: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD), capabilities: ["individual_send", "test_send", "scheduled_send"] },
      emailoctopus: { configured: Boolean(process.env.EMAILOCTOPUS_API_KEY && process.env.EMAILOCTOPUS_DEFAULT_LIST_ID), capabilities: ["list_contact_sync", "campaign_create", "campaign_send"] },
    },
  });
});
router.post("/communications/audience-preview", async (req, res): Promise<void> => {
  const { audience = {}, kind = "promotional" } = req.body ?? {};
  if (!["promotional", "operational"].includes(kind) || typeof audience !== "object" || Array.isArray(audience) ||
    (audience.sources !== undefined && (!Array.isArray(audience.sources) || audience.sources.some((x: unknown) => typeof x !== "string")))) {
    res.status(400).json({ error: "Invalid audience or kind" }); return;
  }
  const rows = await resolveContacts(audience, kind);
  // Preview is admin-only and deliberately shows one address per row, never a
  // recipient-to-recipient disclosure. Counts match the send-time resolution.
  res.json({ counts: { included: rows.length, excluded: 0, invalid: 0, duplicate: 0, suppressed: 0, noConsent: 0 },
    recipients: rows.map(c => ({ email: c.email, name: c.name, sourceType: c.sourceType, sourceId: c.sourceId, included: true, reason: "eligible" })) });
});
router.get("/communications/contract", (_req, res) => {
  res.json({ base: "/api/communications", endpoints: {
    campaigns: "GET/POST /campaigns; POST /campaigns/:id/send|send-test|schedule|retry-failed; GET /campaigns/:id/summary",
    content: "GET/POST /templates; GET/POST/PUT /drafts; GET/PUT /brand",
    compliance: "POST /suppressions", assets: "GET /assets; POST /assets/request-upload; POST /assets", providers: "GET /provider-status",
  } });
});

type Contact = { email: string; name: string | null; sourceType: string; sourceId: string; consent: boolean };
async function resolveContacts(audience: any, kind: string): Promise<Contact[]> {
  const sources: string[] = Array.isArray(audience?.sources) ? audience.sources : ["training"];
  const found: Contact[] = [];
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
      SELECT id, workshop_id, email, concat_ws(' ', first_name, last_name) AS name, marketing_consent
      FROM workshop_registrations
      WHERE status != 'cancelled'
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
  const unique = new Map<string, Contact>();
  for (const contact of selectedFound) {
    const email = String(contact.email || "").trim().toLowerCase();
    const suppression = block.get(email);
    if (!validEmail.test(email) || suppression === "hard" || (kind === "promotional" && (!contact.consent || !!suppression))) continue;
    if (!unique.has(email)) unique.set(email, { ...contact, email });
  }
  return [...unique.values()];
}

async function snapshot(campaign: any) {
  const existing = await db.execute(sql`SELECT COUNT(*)::int AS count FROM communication_recipients WHERE campaign_id = ${campaign.id}`);
  if (Number((existing.rows[0] as any).count)) return;
  for (const c of await resolveContacts(campaign.audience, campaign.kind)) {
    await db.execute(sql`INSERT INTO communication_recipients (id,campaign_id,email,name,source_type,source_id,unsubscribe_token) VALUES (${nanoid()},${campaign.id},${c.email},${c.name},${c.sourceType},${c.sourceId},${nanoid(32)}) ON CONFLICT (campaign_id,email) DO NOTHING`);
  }
}
async function deliver(campaignId: string, retry = false) {
  const lock = await db.execute(sql`UPDATE communication_campaigns SET status = 'sending', updated_at = NOW() WHERE id = ${campaignId} AND status IN ('draft','scheduled','failed') RETURNING *`);
  if (!lock.rows.length) return;
  const campaign: any = lock.rows[0];
  await snapshot(campaign);
  const recipients = await db.execute(sql`SELECT * FROM communication_recipients WHERE campaign_id = ${campaignId} AND status IN ('pending'${retry ? sql`, 'failed'` : sql``})`);
  if (campaign.provider === "emailoctopus") {
    const rows = recipients.rows as any[];
    if (!rows.length) { await db.execute(sql`UPDATE communication_campaigns SET status='sent', sent_at=COALESCE(sent_at,NOW()) WHERE id=${campaignId}`); return; }
    const brand = await db.execute(sql`SELECT settings FROM communication_brand_settings WHERE id='default'`);
    const settings: any = (brand.rows[0] as any)?.settings ?? {};
    const footer = typeof settings.footer === "string" ? settings.footer.replace(/[<>&]/g, "") : "";
    const brandedHtml = `${campaign.html}${footer ? `<hr><p style="font-size:12px;color:#64748b">${footer}</p>` : ""}`;
    const text = String(brandedHtml).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    try {
      const providerId = campaign.provider_campaign_id || await createEmailOctopusCampaign({
        name: campaign.name, subject: campaign.subject, html: brandedHtml, text,
        fromName: typeof settings.fromName === "string" ? settings.fromName : undefined,
        fromEmail: typeof settings.fromEmail === "string" ? settings.fromEmail : undefined,
        recipients: rows.map(row => ({ to: row.email, subject: campaign.subject, html: brandedHtml, name: row.name })),
      });
      // API 1.6 documents POST /campaigns/{id}/send. Scheduling remains RAOS-owned:
      // the poller invokes this documented send action only at the requested time.
      await db.execute(sql`UPDATE communication_campaigns SET provider_campaign_id=${providerId}, status='ready', updated_at=NOW() WHERE id=${campaignId}`);
      await sendEmailOctopusCampaign(providerId);
      await db.execute(sql`UPDATE communication_recipients SET status='sent', attempts=attempts+1, provider_message_id=${providerId}, sent_at=NOW(), error=NULL WHERE campaign_id=${campaignId} AND status IN ('pending','failed')`);
      await db.execute(sql`UPDATE communication_campaigns SET status='sent', sent_at=NOW(), updated_at=NOW() WHERE id=${campaignId}`);
    } catch (err) {
      await db.execute(sql`UPDATE communication_campaigns SET status='failed', updated_at=NOW() WHERE id=${campaignId}`);
      throw err;
    }
    return;
  }
  if (campaign.kind !== "operational" || (recipients.rows as any[]).length > 50) {
    await db.execute(sql`UPDATE communication_campaigns SET status='failed', updated_at=NOW() WHERE id=${campaignId}`);
    throw new Error(campaign.kind !== "operational" ? "Gmail campaigns are limited to operational communication; use EmailOctopus for promotional cohorts" : "Gmail operational campaigns are limited to 50 recipients; use EmailOctopus for bulk cohorts");
  }
  const mailer = getCommunicationsMailer(campaign.provider as CommunicationsProvider);
  for (const recipient of recipients.rows as any[]) {
    try {
      const unsubscribe = campaign.kind === "promotional" && recipient.unsubscribe_token
        ? `<p style="font-size:12px;color:#64748b"><a href="${process.env.RAOS_PUBLIC_URL || "https://remyndassessments.com"}/api/communications/unsubscribe/${recipient.unsubscribe_token}">Unsubscribe from promotional emails</a></p>` : "";
      const result = await mailer.send({ to: recipient.email, subject: campaign.subject, html: `${renderEmail(campaign.html, recipient.name)}${unsubscribe}` });
      await db.execute(sql`UPDATE communication_recipients SET status = 'sent', attempts = attempts + 1, provider_message_id = ${result.id ?? null}, sent_at = NOW(), error = NULL WHERE id = ${recipient.id}`);
    } catch (err) {
      await db.execute(sql`UPDATE communication_recipients SET status = 'failed', attempts = attempts + 1, error = ${err instanceof Error ? err.message.slice(0, 1000) : "Delivery failed"} WHERE id = ${recipient.id}`);
    }
  }
  const totals = await db.execute(sql`SELECT COUNT(*) FILTER (WHERE status = 'failed')::int AS failed FROM communication_recipients WHERE campaign_id = ${campaignId}`);
  const failed = Number((totals.rows[0] as any).failed);
  await db.execute(sql`UPDATE communication_campaigns SET status = ${failed ? "failed" : "sent"}, sent_at = CASE WHEN ${failed} THEN sent_at ELSE NOW() END, updated_at = NOW() WHERE id = ${campaignId}`);
}

router.get("/communications/campaigns", async (_req, res) => {
  const r = await db.execute(sql`SELECT c.*, COUNT(r.id)::int AS recipient_count, COUNT(r.id) FILTER (WHERE r.status = 'sent')::int AS sent_count, COUNT(r.id) FILTER (WHERE r.status = 'failed')::int AS failed_count FROM communication_campaigns c LEFT JOIN communication_recipients r ON r.campaign_id=c.id GROUP BY c.id ORDER BY c.created_at DESC`);
  res.json({ campaigns: r.rows }); // No address-level data is ever returned.
});
router.post("/communications/campaigns", async (req, res): Promise<void> => {
  const { name, subject, html, kind = "promotional", provider = "gmail", audience = {} } = req.body;
  if (!name?.trim() || !subject?.trim() || !html?.trim() || !["promotional", "operational"].includes(kind) || !["gmail", "emailoctopus"].includes(provider) || (provider === "gmail" && kind !== "operational") || (provider === "emailoctopus" && kind !== "promotional")) { res.status(400).json({ error: "Gmail is for small operational campaigns; EmailOctopus is for promotional bulk campaigns" }); return; }
  const id = nanoid(); await db.execute(sql`INSERT INTO communication_campaigns (id,name,subject,html,kind,provider,audience,created_by) VALUES (${id},${name.trim()},${subject.trim()},${sanitizeEmailHtml(html)},${kind},${provider},${JSON.stringify(audience)}::jsonb,${req.userId!})`);
  await writeAudit({ eventType: "communications.campaign.created", actorId: req.userId, actorRole: req.userRole, metadata: { campaignId: id } }); res.status(201).json({ id });
});
router.post("/communications/campaigns/:id/send-test", async (req, res): Promise<void> => {
  const email = String(req.body?.email || "").trim().toLowerCase(); if (!validEmail.test(email)) { res.status(400).json({ error: "A valid test email is required" }); return; }
  const r = await db.execute(sql`SELECT * FROM communication_campaigns WHERE id=${req.params.id}`); if (!r.rows.length) { res.status(404).json({ error: "Not found" }); return; }
  const c: any = r.rows[0]; try { await getCommunicationsMailer("gmail").send({ to: email, subject: `[TEST] ${c.subject}`, html: renderEmail(c.html, req.body?.name) }); res.json({ ok: true, provider: "gmail" }); } catch (err) { res.status(409).json({ error: err instanceof Error ? err.message : "Test send failed" }); }
});
router.post("/communications/campaigns/:id/send", async (req, res) => {
  try { await deliver(req.params.id); await writeAudit({ eventType: "communications.campaign.sent", actorId: req.userId, actorRole: req.userRole, metadata: { campaignId: req.params.id } }); res.json({ ok: true }); }
  catch (err) { res.status(409).json({ error: err instanceof Error ? err.message : "Campaign send failed" }); }
});
router.post("/communications/campaigns/:id/retry-failed", async (req, res) => {
  try { await deliver(req.params.id, true); res.json({ ok: true }); }
  catch (err) { res.status(409).json({ error: err instanceof Error ? err.message : "Retry failed" }); }
});
router.post("/communications/campaigns/:id/schedule", async (req, res): Promise<void> => {
  const date = new Date(req.body?.scheduledAt); if (Number.isNaN(date.valueOf()) || date <= new Date()) { res.status(400).json({ error: "scheduledAt must be in the future" }); return; }
  await db.execute(sql`UPDATE communication_campaigns SET status='scheduled', scheduled_at=${date.toISOString()}, updated_at=NOW() WHERE id=${req.params.id}`); res.json({ ok: true });
});
router.get("/communications/campaigns/:id/summary", async (req, res) => { const r = await db.execute(sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='sent')::int AS sent, COUNT(*) FILTER (WHERE status='failed')::int AS failed, COUNT(*) FILTER (WHERE status='pending')::int AS pending FROM communication_recipients WHERE campaign_id=${req.params.id}`); res.json({ summary: r.rows[0] }); });
router.get("/communications/campaigns/:id", async(req,res)=>{const c=await db.execute(sql`SELECT * FROM communication_campaigns WHERE id=${req.params.id}`);if(!c.rows.length){res.status(404).json({error:"Not found"});return;}const history=await db.execute(sql`SELECT id,source_type,source_id,status,attempts,provider_message_id,error,sent_at,created_at FROM communication_recipients WHERE campaign_id=${req.params.id} ORDER BY created_at`);res.json({campaign:c.rows[0],history:history.rows});});
router.post("/communications/campaigns/:id/cancel", async(req,res)=>{const r=await db.execute(sql`UPDATE communication_campaigns SET status='cancelled',updated_at=NOW() WHERE id=${req.params.id} AND status='scheduled' RETURNING id`);if(!r.rows.length){res.status(409).json({error:"Only scheduled campaigns can be cancelled"});return;}res.json({ok:true});});
router.post("/communications/direct-send", async(req,res): Promise<void>=>{const {email,subject,html,sourceType,sourceId,name}=req.body??{};const to=String(email??"").trim().toLowerCase();if(!validEmail.test(to)||typeof subject!=="string"||!subject.trim()||typeof html!=="string"||!html.trim()||typeof sourceType!=="string"||!sourceType.trim()||typeof sourceId!=="string"||!sourceId.trim()){res.status(400).json({error:"email, subject, html, sourceType and sourceId are required"});return;}const campaignId=nanoid(),recipientId=nanoid();await db.execute(sql`INSERT INTO communication_campaigns(id,name,subject,html,kind,provider,audience,status,created_by) VALUES(${campaignId},'Direct operational email',${subject.trim()},${sanitizeEmailHtml(html)},'operational','gmail','{}'::jsonb,'sending',${req.userId!})`);await db.execute(sql`INSERT INTO communication_recipients(id,campaign_id,email,name,source_type,source_id,status) VALUES(${recipientId},${campaignId},${to},${typeof name==="string"?name:null},${sourceType},${sourceId},'pending')`);try{const sent=await getCommunicationsMailer("gmail").send({to,subject:subject.trim(),html:sanitizeEmailHtml(html)});await db.execute(sql`UPDATE communication_recipients SET status='sent',attempts=1,provider_message_id=${sent.id??null},sent_at=NOW() WHERE id=${recipientId}`);await db.execute(sql`UPDATE communication_campaigns SET status='sent',sent_at=NOW(),updated_at=NOW() WHERE id=${campaignId}`);await writeAudit({eventType:"communications.direct.sent",actorId:req.userId,actorRole:req.userRole,metadata:{campaignId,sourceType,sourceId}});res.status(201).json({id:campaignId,status:"sent"});}catch(err){await db.execute(sql`UPDATE communication_recipients SET status='failed',attempts=1,error=${err instanceof Error?err.message:"Delivery failed"} WHERE id=${recipientId}`);await db.execute(sql`UPDATE communication_campaigns SET status='failed',updated_at=NOW() WHERE id=${campaignId}`);res.status(409).json({error:err instanceof Error?err.message:"Delivery failed",id:campaignId});}});
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
router.get("/communications/brand", async (_req,res)=>{ const r=await db.execute(sql`SELECT settings FROM communication_brand_settings WHERE id='default'`); res.json({settings:(r.rows[0] as any)?.settings ?? {}}); });
router.put("/communications/brand", async (req,res)=>{ await db.execute(sql`INSERT INTO communication_brand_settings (id,settings,updated_by) VALUES ('default',${JSON.stringify(req.body?.settings ?? {})}::jsonb,${req.userId!}) ON CONFLICT (id) DO UPDATE SET settings=EXCLUDED.settings,updated_by=EXCLUDED.updated_by,updated_at=NOW()`); res.json({ok:true}); });
router.post("/communications/suppressions", async(req,res): Promise<void> => {const email=String(req.body?.email||"").trim().toLowerCase();if(!validEmail.test(email)){res.status(400).json({error:"Valid email required"});return;}const kind=req.body?.kind==="hard"?"hard":"unsubscribe";await db.execute(sql`INSERT INTO communication_suppressions(email,kind,reason) VALUES(${email},${kind},${req.body?.reason??null}) ON CONFLICT(email) DO UPDATE SET kind=EXCLUDED.kind,reason=EXCLUDED.reason`);res.status(201).json({ok:true});});
router.get("/communications/suppressions", async(_req,res)=>{const r=await db.execute(sql`SELECT email,kind,reason,created_at FROM communication_suppressions ORDER BY created_at DESC`);res.json({suppressions:r.rows});});
router.delete("/communications/suppressions/:email", async(req,res)=>{await db.execute(sql`DELETE FROM communication_suppressions WHERE email=${String(req.params.email).toLowerCase()}`);res.json({ok:true});});
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageBytes = Number(process.env.COMMUNICATIONS_MAX_IMAGE_BYTES || 5 * 1024 * 1024);
router.post("/communications/assets/request-upload", async(req,res): Promise<void> => {const {name,size,contentType}=req.body??{};if(typeof name!=="string"||!Number.isInteger(size)||size<1||size>maxImageBytes||typeof contentType!=="string"||!imageTypes.has(contentType)){res.status(400).json({error:"Only JPG, PNG, or WebP images up to the configured maximum are allowed"});return;}const uploadURL=await objectStorage.getObjectEntityUploadURL();res.json({uploadURL,objectPath:objectStorage.normalizeObjectEntityPath(uploadURL),maxBytes:maxImageBytes});});
router.post("/communications/assets", async(req,res): Promise<void> => {const {objectPath,name,size,contentType,altText}=req.body??{};if(typeof objectPath!=="string"||!objectPath.startsWith("/objects/")||typeof name!=="string"||!Number.isInteger(size)||size<1||size>maxImageBytes||typeof contentType!=="string"||!imageTypes.has(contentType)||(altText!==undefined&&typeof altText!=="string")){res.status(400).json({error:"Invalid image asset metadata"});return;}const id=nanoid();await db.execute(sql`INSERT INTO communication_assets(id,object_path,name,size,content_type,alt_text,uploaded_by) VALUES(${id},${objectPath},${name},${size},${contentType},${altText??null},${req.userId!})`);res.status(201).json({id,servingUrl:`/api/storage${objectPath}`});});
router.get("/communications/assets", async(_req,res)=>{const r=await db.execute(sql`SELECT id,object_path,name,size,content_type,alt_text,created_at FROM communication_assets ORDER BY created_at DESC`);res.json({assets:(r.rows as any[]).map(x=>({...x,serving_url:`/api/storage${x.object_path}`}))});});

setInterval(() => { void (async () => { try { await ensureReady(); const due=await db.execute(sql`SELECT id FROM communication_campaigns WHERE status='scheduled' AND scheduled_at <= NOW()`); for(const c of due.rows as any[]) await deliver(c.id); } catch(err) { logger.error({err},"Communications schedule poll failed"); } })(); }, 60_000).unref();
export default router;