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

export type EmailOctopusReportType = "sent" | "bounced" | "complained" | "unsubscribed";
export interface EmailOctopusReportEntry {
  contactId: string | null;
  email: string | null;
  occurredAt: string | null;
  bounceType: "hard" | "soft" | null;
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

async function emailOctopusGet(urlOrPath: string) {
  const { apiKey } = emailOctopusConfig();
  const url = new URL(urlOrPath, "https://emailoctopus.com");
  if (url.origin !== "https://emailoctopus.com" || !url.pathname.startsWith("/api/1.6/")) {
    throw new Error("EmailOctopus returned an invalid pagination URL");
  }
  url.searchParams.set("api_key", apiKey);
  const response = await fetch(url);
  const payload: any = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || payload?.message || `EmailOctopus request failed (${response.status})`);
  return payload;
}

export async function getEmailOctopusCampaignReport(id: string, report: EmailOctopusReportType): Promise<EmailOctopusReportEntry[]> {
  let next: string | null = `/api/1.6/campaigns/${encodeURIComponent(id)}/reports/${report}?limit=100`;
  const entries: EmailOctopusReportEntry[] = [];
  while (next) {
    const payload = await emailOctopusGet(next);
    for (const item of Array.isArray(payload?.data) ? payload.data : []) {
      const contact = item?.contact ?? item;
      const rawBounceType = String(item?.type ?? item?.bounce_type ?? "").toLowerCase();
      entries.push({
        contactId: typeof contact?.id === "string" ? contact.id : null,
        email: typeof contact?.email_address === "string" ? contact.email_address.trim().toLowerCase() : null,
        occurredAt: typeof item?.occurred_at === "string" ? item.occurred_at : null,
        bounceType: rawBounceType === "hard" || rawBounceType === "soft" ? rawBounceType : null,
      });
    }
    next = typeof payload?.paging?.next === "string" && payload.paging.next ? payload.paging.next : null;
  }
  return entries;
}

export async function createEmailOctopusCampaign(input: EmailOctopusCampaignInput): Promise<string> {
  emailOctopusConfig();
  // EmailOctopus campaigns send to their entire bound list. Use a dedicated
  // campaign list so the provider audience exactly matches RAOS's consent,
  // suppression, deduplication, and prior-send filtering snapshot.
  const targetList = await emailOctopusRequest("/lists", {
    name: `RAOS Campaign - ${input.name}`.slice(0, 200),
  });
  const listId = String(targetList?.id || "");
  if (!listId) throw new Error("EmailOctopus did not return a campaign audience list ID");
  // API 1.6 supports list contact creation and list-bound campaigns. This is
  // intentionally called only after RAOS has applied its consent/suppression filter.
  // A campaign can contain hundreds of contacts. Sequential requests exceed
  // the deployment request timeout, while unbounded concurrency risks provider
  // rate limits. Three workers keep the import comfortably bounded.
  let nextRecipientIndex = 0;
  const addContact = async () => {
    while (nextRecipientIndex < input.recipients.length) {
      const recipient = input.recipients[nextRecipientIndex++];
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
  };
  await Promise.all(
    Array.from({ length: Math.min(3, input.recipients.length) }, () => addContact()),
  );
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

export type CommunicationBrandSettings = {
  fromName?: string;
  fromEmail?: string;
  footer?: string;
};

/**
 * Applies the shared ReMynd presentation at delivery time so saved content stays
 * reusable while Gmail tests, operational mail, and provider campaigns match.
 */
export function renderBrandedEmail(contentHtml: string, settings: CommunicationBrandSettings = {}): string {
  const content = sanitizeEmailHtml(contentHtml);
  const customFooter = typeof settings.footer === "string"
    ? sanitizeEmailHtml(settings.footer)
    : "";
  const footer = customFooter || `
    <p style="margin:0 0 8px;font-size:12px;color:#64748b;">ReMynd Student Services</p>
    <p style="margin:0;font-size:12px;color:#94a3b8;">
      Assessment · Consultation · Student Support<br>
      <a href="https://remyndassessments.com" style="color:#9a7a18;text-decoration:none;">remyndassessments.com</a>
    </p>`;

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f3f5f7;font-family:Arial,Helvetica,sans-serif;color:#243247;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f5f7;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background:#ffffff;border:1px solid #dfe4ea;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0c1a2e;padding:28px 34px 24px;border-bottom:5px solid #c7a54b;">
              <p style="margin:0;color:#ffffff;font-size:25px;line-height:1.1;font-weight:700;letter-spacing:-0.3px;">ReMynd</p>
              <p style="margin:7px 0 0;color:#d9e0e8;font-size:11px;line-height:1.4;letter-spacing:1.5px;text-transform:uppercase;">Student Services</p>
            </td>
          </tr>
          <tr>
            <td style="padding:34px 36px 30px;background:#ffffff;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:21px 36px 24px;background:#f8f9fa;border-top:1px solid #e5e9ee;">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}