import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveEligibleContacts,
  runWithCampaignLock,
  sendGmailGroup,
  sendGmailTest,
  type SourceContact,
} from "./communications-safety.ts";

test("audience resolution removes invalid, duplicate, suppressed, and non-consenting contacts without mutating sources", () => {
  const contacts: SourceContact[] = [
    { email: " Eligible@Example.com ", name: "Eligible", sourceType: "workshop", sourceId: "w1", consent: true },
    { email: "eligible@example.com", name: "Duplicate", sourceType: "training", sourceId: "t1", consent: true },
    { email: "invalid", name: "Invalid", sourceType: "workshop", sourceId: "w2", consent: true },
    { email: "suppressed@example.com", name: "Suppressed", sourceType: "workshop", sourceId: "w3", consent: true },
    { email: "no-consent@example.com", name: "No consent", sourceType: "workshop", sourceId: "w4", consent: false },
  ];
  const before = structuredClone(contacts);
  const result = resolveEligibleContacts(
    contacts,
    "promotional",
    new Map([["suppressed@example.com", "unsubscribe"]]),
  );

  assert.deepEqual(result.recipients.map(contact => contact.email), ["eligible@example.com"]);
  assert.deepEqual(result.counts, {
    included: 1, excluded: 4, invalid: 1, duplicate: 1, suppressed: 1, noConsent: 1,
  });
  assert.deepEqual(contacts, before, "workshop registrations and other source records remain authoritative and unchanged");
});

test("operational resolution honors hard suppressions but does not require promotional consent", () => {
  const result = resolveEligibleContacts([
    { email: "family@example.com", name: null, sourceType: "case", sourceId: "case-1", consent: false },
    { email: "hard@example.com", name: null, sourceType: "case", sourceId: "case-2", consent: false },
  ], "operational", new Map([["hard@example.com", "hard"]]));
  assert.deepEqual(result.recipients.map(contact => contact.email), ["family@example.com"]);
  assert.equal(result.counts.suppressed, 1);
});

test("Gmail groups use one transaction per recipient and never expose peer addresses", async () => {
  const messages: Array<{ to: string; subject: string; html: string }> = [];
  const marked: string[] = [];
  const recipients = [
    { id: "1", email: "one@example.com", name: "One" },
    { id: "2", email: "two@example.com", name: "Two" },
  ];
  const sourceRecords = structuredClone(recipients);

  await sendGmailGroup({
    kind: "operational",
    recipients,
    subject: "Update",
    renderHtml: recipient => `Hello ${recipient.name}`,
    mailer: { send: async message => { messages.push(message); return { id: `m-${messages.length}` }; } },
    markSent: async recipient => { marked.push(recipient.id); },
    markFailed: async () => { assert.fail("send should not fail"); },
  });

  assert.equal(messages.length, 2);
  assert.deepEqual(messages.map(message => message.to), ["one@example.com", "two@example.com"]);
  assert.ok(messages.every(message => !message.to.includes(",") && !message.to.includes(";")));
  assert.ok(!messages[0].html.includes("two@example.com") && !messages[1].html.includes("one@example.com"));
  assert.deepEqual(marked, ["1", "2"]);
  assert.deepEqual(recipients, sourceRecords, "delivery does not mutate case or workshop source snapshots");
});

test("Gmail groups reject recipient 51 before any transaction", async () => {
  let sends = 0;
  await assert.rejects(sendGmailGroup({
    kind: "operational",
    recipients: Array.from({ length: 51 }, (_, index) => ({ id: String(index), email: `family${index}@example.com` })),
    subject: "Update",
    renderHtml: () => "Update",
    mailer: { send: async () => { sends++; return {}; } },
    markSent: async () => {},
    markFailed: async () => {},
  }), /limited to 50 recipients/);
  assert.equal(sends, 0);
});

test("Gmail groups isolate failures so a retry can target only failed recipients", async () => {
  const failed: string[] = [];
  const sent: string[] = [];
  const recipients = [
    { id: "1", email: "ok@example.com" },
    { id: "2", email: "retry@example.com" },
  ];
  await sendGmailGroup({
    kind: "operational",
    recipients,
    subject: "Update",
    renderHtml: () => "Update",
    mailer: { send: async message => {
      if (message.to === "retry@example.com") throw new Error("temporary failure");
      return { id: "sent-1" };
    } },
    markSent: async recipient => { sent.push(recipient.id); },
    markFailed: async recipient => { failed.push(recipient.id); },
  });
  assert.deepEqual(sent, ["1"]);
  assert.deepEqual(failed, ["2"]);

  await sendGmailGroup({
    kind: "operational",
    recipients: recipients.filter(recipient => failed.includes(recipient.id)),
    subject: "Update",
    renderHtml: () => "Update",
    mailer: { send: async () => ({ id: "sent-2" }) },
    markSent: async recipient => { sent.push(recipient.id); },
    markFailed: async () => { assert.fail("retry should succeed"); },
  });
  assert.deepEqual(sent, ["1", "2"]);
});

test("test sends use only the supplied Gmail mailer and cannot synchronize EmailOctopus", async () => {
  let gmailSends = 0;
  let emailOctopusSynchronizations = 0;
  await sendGmailTest({
    email: "admin@example.com",
    subject: "Campaign",
    html: "Preview",
    mailer: { send: async message => {
      gmailSends++;
      assert.deepEqual(message, { to: "admin@example.com", subject: "[TEST] Campaign", html: "Preview" });
      return {};
    } },
  });
  assert.equal(gmailSends, 1);
  assert.equal(emailOctopusSynchronizations, 0);
});

test("campaign locking is idempotent across scheduler races and permits a safe retry after failure", async () => {
  let status: "scheduled" | "sending" | "failed" | "sent" = "scheduled";
  let attempts = 0;
  const run = () => runWithCampaignLock({
    claim: async () => {
      if (status !== "scheduled" && status !== "failed") return null;
      status = "sending";
      return { id: "campaign-1" };
    },
    deliver: async () => {
      attempts++;
      if (attempts === 1) throw new Error("temporary provider failure");
      status = "sent";
    },
    markFailed: async () => { status = "failed"; },
  });

  const first = run();
  const racing = await run();
  assert.equal(racing, false, "only one scheduler invocation claims the campaign");
  await assert.rejects(first, /temporary provider failure/);
  assert.equal(status, "failed");
  assert.equal(await run(), true, "failed campaigns can be claimed for retry");
  assert.equal(status, "sent");
  assert.equal(attempts, 2);
  assert.equal(await run(), false, "sent campaigns cannot be delivered twice");
});