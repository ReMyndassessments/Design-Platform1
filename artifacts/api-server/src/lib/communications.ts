import nodemailer from "nodemailer";

export type CommunicationsProvider = "gmail" | "emailoctopus";

export interface OutboundMessage {
  to: string;
  subject: string;
  html: string;
}

export interface CommunicationsMailer {
  send(message: OutboundMessage): Promise<{ id?: string }>;
}
export interface EmailOctopusCampaignInput {
  name: string; subject: string; html: string; text: string; recipients: Array<OutboundMessage & { name?: string | null }>;
  fromName?: string; fromEmail?: string;
}

function gmailMailer(): CommunicationsMailer {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD environment variable is not set");
  const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  return {
    async send(message) {
      // One SMTP transaction per recipient is intentional: no address is disclosed to another recipient.
      const result = await transport.sendMail({ from: `"ReMynd Student Services" <${user}>`, ...message });
      return { id: result.messageId };
    },
  };
}

/**
 * EmailOctopus API 1.6 is list/campaign based. It has no transactional,
 * per-recipient HTML send endpoint, so it cannot safely deliver an immutable
 * RAOS recipient snapshot without first mutating/syncing a provider list.
 */
function emailOctopusConfig() {
  const apiKey = process.env.EMAILOCTOPUS_API_KEY;
  const listId = process.env.EMAILOCTOPUS_DEFAULT_LIST_ID;
  if (!apiKey || !listId) throw new Error("EmailOctopus is not configured: set EMAILOCTOPUS_API_KEY and EMAILOCTOPUS_DEFAULT_LIST_ID");
  return { apiKey, listId };
}
async function emailOctopusRequest(path: string, body: Record<string, unknown>) {
  const { apiKey } = emailOctopusConfig();
  const response = await fetch(`https://emailoctopus.com/api/1.6${path}?api_key=${encodeURIComponent(apiKey)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `EmailOctopus request failed (${response.status})`);
  return payload;
}

export async function createEmailOctopusCampaign(input: EmailOctopusCampaignInput): Promise<string> {
  const { listId } = emailOctopusConfig();
  // API 1.6 supports list contact creation and list-bound campaigns. This is
  // intentionally called only after RAOS has applied its consent/suppression filter.
  for (const recipient of input.recipients) {
    try {
      await emailOctopusRequest(`/lists/${encodeURIComponent(listId)}/contacts`, {
        email_address: recipient.to, fields: recipient.name ? { FirstName: recipient.name } : {}, status: "SUBSCRIBED",
      });
    } catch (error) {
      // API 1.6 returns a validation/conflict response for an existing contact.
      // Do not issue an update: that could overwrite fields or re-subscribe a
      // provider-unsubscribed person. Other provider errors remain fatal.
      if (!/already|exist|duplicate/i.test(error instanceof Error ? error.message : "")) throw error;
    }
  }
  const fromEmail = input.fromEmail || process.env.EMAILOCTOPUS_FROM_EMAIL || process.env.GMAIL_USER;
  if (!fromEmail) throw new Error("EmailOctopus requires EMAILOCTOPUS_FROM_EMAIL (or GMAIL_USER) as a verified sender");
  const campaign = await emailOctopusRequest("/campaigns", {
    list_id: listId, name: input.name, subject: input.subject, from_name: input.fromName || "ReMynd Student Services",
    from_email: fromEmail, content_html: input.html, content_text: input.text,
  });
  if (!campaign?.id) throw new Error("EmailOctopus did not return a campaign ID");
  return campaign.id;
}
export async function sendEmailOctopusCampaign(id: string): Promise<void> {
  await emailOctopusRequest(`/campaigns/${encodeURIComponent(id)}/send`, {});
}

function emailOctopusMailer(): CommunicationsMailer {
  emailOctopusConfig();
  return {
    async send() {
      throw new Error("EmailOctopus campaigns must be dispatched through the list campaign workflow");
    },
  };
}

export function getCommunicationsMailer(provider: CommunicationsProvider): CommunicationsMailer {
  return provider === "emailoctopus" ? emailOctopusMailer() : gmailMailer();
}

/** Conservative dependency-free sanitizer suitable for stored email fragments. */
export function sanitizeEmailHtml(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<\s*(script|style|iframe|object|embed|form|base|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|form|base|meta|link)[^>]*\/?\s*>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');
}

export function renderEmail(html: string, recipientName?: string | null): string {
  return html.replace(/\{\{\s*(first_name|name)\s*\}\}/gi, recipientName || "there");
}