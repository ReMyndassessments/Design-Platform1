import test from "node:test";
import assert from "node:assert/strict";
import { isRetiredAssignment } from "./assignmentRetirement.ts";

test("an assignment is retired only when metadata has a non-empty retiredAt string", () => {
  assert.equal(isRetiredAssignment({ metadata: { retiredAt: "2025-03-01T12:00:00.000Z" } }), true);
  assert.equal(isRetiredAssignment({ metadata: { retiredAt: "" } }), false);
  assert.equal(isRetiredAssignment({ metadata: {} }), false);
  assert.equal(isRetiredAssignment({ metadata: null }), false);
  assert.equal(isRetiredAssignment({}), false);
});