import assert from "node:assert/strict";
import { test } from "node:test";
import { validateTeacherReassignment, isTeacherQuestionnaire } from "./teacherReassignment.js";
const a = { id: "a", toolId: "ASSQ", respondentType: "teacher1", respondentLabel: "Teacher", assignedToEmail: "old@example.invalid" };
const b = { ...a, id: "b", toolId: "SDQ-T11" };

test("replace the whole package without accepting stale, mixed or partial IDs", () => {
  assert.ok("targets" in validateTeacherReassignment([a, b], ["a", "b"], "new@example.invalid"));
  for (const ids of [["a"], ["a", "missing"], ["a", "a"]]) {
    assert.ok("error" in validateTeacherReassignment([a, b], ids, "new@example.invalid"));
  }
  assert.ok("error" in validateTeacherReassignment([a, { ...b, assignedToEmail: "other@example.invalid" }], ["a", "b"], "new@example.invalid"));
});
test("reject same recipient and merging into another teacher's package", () => {
  assert.deepEqual(validateTeacherReassignment([a], ["a"], " OLD@EXAMPLE.INVALID "), { error: "same_recipient" });
  assert.deepEqual(validateTeacherReassignment([a, { ...b, assignedToEmail: "new@example.invalid" }], ["a"], "new@example.invalid"), { error: "recipient_has_package" });
});
test("never reassign intake, RPPI, parents or retired history", () => {
  for (const row of [{ ...a, toolId: "INTAKE" }, ...["RPPI", "RDA", "RRCA", "RRFA", "RAEPA", "RAMRI", "RMRA"].map(toolId => ({ ...a, toolId })), { ...a, respondentType: "parent" }, { ...a, metadata: { retiredAt: "2026-01-01" } }]) {
    assert.equal(isTeacherQuestionnaire(row), false);
  }
});