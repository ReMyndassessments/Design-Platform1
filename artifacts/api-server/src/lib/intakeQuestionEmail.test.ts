import test from "node:test";
import assert from "node:assert/strict";
import { buildIntakeQuestionEmail } from "./intakeQuestionEmail.ts";

test("invitation uses ReMynd branding and links to the private respondent portal", () => {
  const html = buildIntakeQuestionEmail({
    audience: "teacher",
    recipientName: "Ms Lee",
    portalUrl: "https://example.test/external/secure-token",
  });
  assert.match(html, /ReMynd Student Services/);
  assert.match(html, /Assessment Operating System/);
  assert.match(html, /Ms Lee/);
  assert.match(html, /https:\/\/example.test\/external\/secure-token/);
  assert.match(html, /Open My ReMynd Portal/);
  assert.doesNotMatch(html, /<ol>|questions below|How is reading going/);
});

test("test copy links to a read-only preview and includes no case questions", () => {
  const html = buildIntakeQuestionEmail({
    audience: "parent",
    portalUrl: "https://example.test/external/preview.signed.token",
    isTest: true,
  });
  assert.match(html, /TEST PREVIEW/);
  assert.match(html, /Preview ReMynd Portal/);
  assert.match(html, /https:\/\/example.test\/external\/preview.signed.token/);
  assert.doesNotMatch(html, /When does this happen\?|<ol>/);
});

test("email escapes untrusted names and portal links", () => {
  const html = buildIntakeQuestionEmail({
    audience: "teacher",
    recipientName: "<b>Recipient</b>",
    portalUrl: 'https://example.test/"onclick="evil',
  });
  assert.doesNotMatch(html, /<b>Recipient<\/b>|"onclick="/);
  assert.match(html, /&lt;b&gt;Recipient&lt;\/b&gt;/);
  assert.match(html, /&quot;onclick=/);
});