import test from "node:test";
import assert from "node:assert/strict";
import { createIntakeQuestionPreviewToken, readIntakeQuestionPreviewToken } from "./intakeQuestionPreview.ts";

const secret = "test-only-signing-secret";
const now = Date.UTC(2026, 8, 25);

test("a signed preview identifies only its case and audience for 24 hours", () => {
  const token = createIntakeQuestionPreviewToken("case-123", "teacher", secret, now);
  assert.deepEqual(readIntakeQuestionPreviewToken(token, secret, now + 1000), {
    caseId: "case-123", audience: "teacher", expiresAt: now + 24 * 60 * 60 * 1000,
  });
  assert.doesNotMatch(token, /student|question|answer/);
  assert.equal(readIntakeQuestionPreviewToken(token, secret, now + 24 * 60 * 60 * 1000), null);
});

test("forged, corrupted and wrong-key preview links cannot be opened", () => {
  const token = createIntakeQuestionPreviewToken("case-123", "parent", secret, now);
  assert.equal(readIntakeQuestionPreviewToken(token, "another-secret", now), null);
  assert.equal(readIntakeQuestionPreviewToken(token.replace("parent", "teacher") + "x", secret, now), null);
  assert.equal(readIntakeQuestionPreviewToken("preview.invalid.invalid", secret, now), null);
});