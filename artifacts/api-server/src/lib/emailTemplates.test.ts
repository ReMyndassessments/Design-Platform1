import test from "node:test";
import assert from "node:assert/strict";
import { buildTeacherEmail } from "./emailTemplates.ts";

test("teacher report and debrief invitation opens the portal, not a separate meeting link", () => {
  const html = buildTeacherEmail(
    "Example Student",
    "https://example.org/external/recipient",
    "https://example.org/join/debrief?redirectUrl=meeting",
    "Monday at 10:00",
  );
  assert.match(html, /href="https:\/\/example.org\/external\/recipient"/);
  assert.doesNotMatch(html, /href="https:\/\/example.org\/join\/debrief/);
  assert.match(html, /meeting link at the scheduled time/);
});