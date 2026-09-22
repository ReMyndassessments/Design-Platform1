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
    if (suppression === "hard" || (kind === "promotional" && Boolean(suppression))) {
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

type GmailRecipient = { id: string; email: string; name?: string | null };

export async function sendGmailGroup(options: {
  kind: CommunicationKind;
  recipients: readonly GmailRecipient[];
  subject: string;
  renderHtml: (recipient: GmailRecipient) => string;
  mailer: CommunicationsMailer;
  markSent: (recipient: GmailRecipient, messageId?: string) => Promise<void>;
  markFailed: (recipient: GmailRecipient, error: Error) => Promise<void>;
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
  return /\b(550|551|553)\b|user unknown|no such (user|recipient)|recipient address rejected|mailbox (does not exist|not found)/i.test(message);
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