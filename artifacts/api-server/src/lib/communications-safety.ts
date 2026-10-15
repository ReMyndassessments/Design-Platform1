import type { CommunicationsMailer, OutboundMessage } from "./communications.js";

export type CommunicationKind = "promotional" | "operational";

export type SourceContact = {
  email: unknown;
  name: string | null;
  sourceType: string;
  sourceId: string;
  consent: boolean;
};

export type EligibleContact = Omit<SourceContact, "email"> & { email: string };

export type AudienceResolution = {
  recipients: EligibleContact[];
  counts: {
    included: number;
    excluded: number;
    invalid: number;
    duplicate: number;
    suppressed: number;
    noConsent: number;
  };
};

const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeCommunicationEmail(value: unknown): string {
  const email = String(value || "").trim().toLowerCase();
  const angleWrapped = email.match(/^<([^<>]+)>$/);
  return angleWrapped ? angleWrapped[1].trim() : email;
}

export function isValidCommunicationEmail(email: string): boolean {
  return validEmail.test(normalizeCommunicationEmail(email));
}

export function isCommunicationBlocked(kind: CommunicationKind, suppression: string | undefined): boolean {
  return suppression === "hard" || (kind === "promotional" && Boolean(suppression));
}

export function resolveEligibleContacts(
  contacts: readonly SourceContact[],
  kind: CommunicationKind,
  suppressions: ReadonlyMap<string, string>,
): AudienceResolution {
  const recipients: EligibleContact[] = [];
  const seen = new Set<string>();
  const counts = { included: 0, excluded: 0, invalid: 0, duplicate: 0, suppressed: 0, noConsent: 0 };

  for (const contact of contacts) {
    const email = normalizeCommunicationEmail(contact.email);
    const suppression = suppressions.get(email);
    if (!isValidCommunicationEmail(email)) {
      counts.invalid++;
      continue;
    }
    if (isCommunicationBlocked(kind, suppression)) {
      counts.suppressed++;
      continue;
    }
    if (kind === "promotional" && !contact.consent) {
      counts.noConsent++;
      continue;
    }
    if (seen.has(email)) {
      counts.duplicate++;
      continue;
    }
    seen.add(email);
    recipients.push({ ...contact, email });
  }

  counts.included = recipients.length;
  counts.excluded = counts.invalid + counts.duplicate + counts.suppressed + counts.noConsent;
  return { recipients, counts };
}

type GmailRecipient = { id: string; email: string; name?: string | null; source_type?: string; unsubscribe_token?: string };

export async function sendGmailGroup(options: {
  kind: CommunicationKind;
  recipients: readonly GmailRecipient[];
  subject: string;
  renderHtml: (recipient: GmailRecipient) => string;
  mailer: CommunicationsMailer;
  markSent: (recipient: GmailRecipient, messageId?: string) => Promise<void>;
  markFailed: (recipient: GmailRecipient, error: Error) => Promise<void>;
  shouldSkip?: (recipient: GmailRecipient) => Promise<boolean>;
  markSkipped?: (recipient: GmailRecipient) => Promise<void>;
  batchDelayMs?: number;
  concurrency?: number;
}): Promise<void> {
  if (options.kind !== "operational") {
    throw new Error("Gmail campaigns are limited to operational communication; use EmailOctopus for promotional cohorts");
  }
  const batchSize = 50;
  const batchDelayMs = options.batchDelayMs ?? 5_000;
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 5, batchSize));
  for (let offset = 0; offset < options.recipients.length; offset += batchSize) {
    const batch = options.recipients.slice(offset, offset + batchSize);
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < batch.length) {
        const recipient = batch[nextIndex++];
        try {
          if (await options.shouldSkip?.(recipient)) {
            await options.markSkipped?.(recipient);
            continue;
          }
          const result = await options.mailer.send({
            to: recipient.email,
            subject: options.subject,
            html: options.renderHtml(recipient),
          });
          await options.markSent(recipient, result.id);
        } catch (error) {
          await options.markFailed(recipient, error instanceof Error ? error : new Error("Delivery failed"));
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, batch.length) }, () => worker()));
    if (offset + batchSize < options.recipients.length && batchDelayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, batchDelayMs));
    }
  }
}

export function isPermanentOperationalEmailFailure(error: Error): boolean {
  const message = error.message;
  return /\b5\.1\.(?:1|2|3|6|10)\b/i.test(message) ||
    /user unknown|no such (user|recipient)|mailbox (does not exist|not found)|mailbox name not allowed|invalid (recipient|mailbox|email)( address)?|bad destination mailbox address/i.test(message);
}

export function collectPermanentlyFailedEmails(rows: readonly { email: unknown; error: unknown }[]) {
  const result = new Map<string, string>();
  for (const row of rows) {
    const email = normalizeCommunicationEmail(row.email);
    const error = String(row.error || "");
    if (!isValidCommunicationEmail(email) || result.has(email) || !isPermanentOperationalEmailFailure(new Error(error))) continue;
    result.set(email, error);
  }
  return [...result].map(([email, error]) => ({ email, error }));
}

export async function sendGmailTest(options: {
  email: string;
  subject: string;
  html: string;
  mailer: CommunicationsMailer;
}): Promise<void> {
  await options.mailer.send({ to: options.email, subject: `[TEST] ${options.subject}`, html: options.html });
}

export async function runWithCampaignLock<T>(options: {
  claim: () => Promise<T | null>;
  deliver: (campaign: T) => Promise<void>;
  markFailed: (campaign: T, error: unknown) => Promise<void>;
}): Promise<boolean> {
  const campaign = await options.claim();
  if (!campaign) return false;
  try {
    await options.deliver(campaign);
  } catch (error) {
    await options.markFailed(campaign, error);
    throw error;
  }
  return true;
}

export type { OutboundMessage };