import assert from "node:assert/strict";
import { test } from "node:test";
import { validateTeacherContactUpdate, isTeacherQuestionnaire } from "./teacherReassignment.js";
const a = { id: "a", toolId: "ASSQ", respondentType: "teacher1", respondentLabel: "Teacher", assignedToEmail: "old@example.invalid" };
const b = { ...a, id: "b", toolId: "SDQ-T11" };

test("edit the whole package without accepting stale, mixed or partial IDs", () => {
  assert.ok("targets" in validateTeacherContactUpdate([a, b], ["a", "b"]));
  for (const ids of [["a"], ["a", "missing"], ["a", "a"]]) {
    assert.ok("error" in validateTeacherContactUpdate([a, b], ids));
  }
  assert.ok("error" in validateTeacherContactUpdate([a, { ...b, assignedToEmail: "other@example.invalid" }], ["a", "b"]));
});
test("contact edits accept existing recipients without generating new assignments", () => {
  assert.deepEqual(validateTeacherContactUpdate([a], ["a"]), { targets: [a] });
  assert.deepEqual(validateTeacherContactUpdate([a, b], ["a", "b"]), { targets: [a, b] });
});
test("never reassign intake, RPPI, parents or retired history", () => {
  for (const row of [{ ...a, toolId: "INTAKE" }, ...["RPPI", "RDA", "RRCA", "RRFA", "RAEPA", "RAMRI", "RMRA"].map(toolId => ({ ...a, toolId })), { ...a, respondentType: "parent" }, { ...a, metadata: { retiredAt: "2026-01-01" } }]) {
    assert.equal(isTeacherQuestionnaire(row), false);
  }
});