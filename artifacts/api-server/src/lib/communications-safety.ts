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

export function isValidCommunicationEmail(email: string): boolean {
  return validEmail.test(email);
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
    const email = String(contact.email || "").trim().toLowerCase();
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
}): Promise<void> {
  if (options.kind !== "operational") {
    throw new Error("Gmail campaigns are limited to operational communication; use EmailOctopus for promotional cohorts");
  }
  if (options.recipients.length > 50) {
    throw new Error("Gmail operational campaigns are limited to 50 recipients; use EmailOctopus for bulk cohorts");
  }
  for (const recipient of options.recipients) {
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
  markFailed: (campaign: T) => Promise<void>;
}): Promise<boolean> {
  const campaign = await options.claim();
  if (!campaign) return false;
  try {
    await options.deliver(campaign);
  } catch (error) {
    await options.markFailed(campaign);
    throw error;
  }
  return true;
}

export type { OutboundMessage };