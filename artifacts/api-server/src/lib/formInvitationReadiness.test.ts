import test from "node:test";
import assert from "node:assert/strict";
import { selectReadyInvitationForms } from "./formInvitationReadiness.js";

const rows = [
  { id: "ready", toolId: "SDQ", toolName: "Ready teacher form", respondentType: "teacher1", respondentLabel: "Chinese teacher" },
  { id: "pending", toolId: "SPP", toolName: "Untested teacher form", respondentType: "teacher1", respondentLabel: "Chinese teacher" },
  { id: "other", toolId: "BRIEF2", toolName: "Other teacher", respondentType: "teacher2", respondentLabel: "Other teacher" },
];
const review = { testResults: { ready: { status: "passed" as const, testedBy: null } } };
test("one passed form sends with unrelated untested forms and no battery approval", () => {
  const result = selectReadyInvitationForms(rows, "pending", ["ready"], review);
  assert.ok("assignments" in result);
  assert.deepEqual(result.assignments.map(row => row.id), ["ready"]);
});
test("selected untested or subsequently failed form cannot be sent", () => {
  assert.equal((selectReadyInvitationForms(rows, "ready", ["pending"], review) as any).error, "form_test_required");
  assert.equal((selectReadyInvitationForms(rows, "ready", ["ready"], { testResults: { ready: { status: "failed", testedBy: null } } }) as any).error, "form_test_required");
});
test("another recipient or case cannot be smuggled into an invitation", () => {
  for (const ids of [["other"], ["foreign"], [], "ready"]) assert.equal((selectReadyInvitationForms(rows, "ready", ids, review) as any).error, "invalid_assignments");
});
test("legacy whole-package invitation requires only that package to pass", () => {
  assert.equal((selectReadyInvitationForms(rows, "ready", undefined, review) as any).error, "form_test_required");
  const result = selectReadyInvitationForms(rows, "ready", undefined, { testResults: { ...review.testResults, pending: { status: "passed", testedBy: null } } });
  assert.ok("assignments" in result);
  assert.equal(result.assignments.length, 2);
});
