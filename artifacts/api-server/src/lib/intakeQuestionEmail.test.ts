import test from "node:test";
import assert from "node:assert/strict";
import { buildIntakeQuestionEmail } from "./intakeQuestionEmail.ts";

test("invitation includes its exact questions and private response link", () => {
  const html = buildIntakeQuestionEmail({
    audience: "teacher",
    questions: ["How is reading going?", "What support is helpful?"],
    recipientName: "Ms Lee",
    portalUrl: "https://example.test/external/secure-token",
  });
  assert.match(html, /How is reading going\?/);
  assert.match(html, /What support is helpful\?/);
  assert.match(html, /Ms Lee/);
  assert.match(html, /https:\/\/example.test\/external\/secure-token/);
  assert.match(html, /Respond securely in your portal/);
});

test("test copy has questions but no invitation or response link", () => {
  const html = buildIntakeQuestionEmail({
    audience: "parent",
    questions: ["When does this happen?"],
    isTest: true,
  });
  assert.match(html, /TEST COPY/);
  assert.match(html, /When does this happen\?/);
  assert.doesNotMatch(html, /Respond securely|href=/);
});

test("email escapes untrusted questions, names and portal links", () => {
  const html = buildIntakeQuestionEmail({
    audience: "teacher",
    questions: ['<script>alert("x")</script>'],
    recipientName: "<b>Recipient</b>",
    portalUrl: 'https://example.test/"onclick="evil',
  });
  assert.doesNotMatch(html, /<script>|<b>Recipient<\/b>|"onclick="/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /&quot;onclick=/);
});