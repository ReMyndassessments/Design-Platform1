import test from "node:test";
import assert from "node:assert/strict";
import { canAssignObservation, visibleObservationAssignments } from "./observationAssignment.ts";

const correct = { id: "staff", toolId: "BEHAVOBS", respondentType: "invigilator", respondentLabel: "Post-Assessment", status: "not_started" };
const incorrect = { ...correct, id: "examiner", respondentType: "examiner", respondentLabel: "Examiner-Administered Battery" };

test("observation is invigilator-only, without affecting other tools", () => {
  assert.equal(canAssignObservation("BEHAVOBS", "invigilator"), true);
  for (const role of ["examiner", "self", "student", "parent", "teacher1"]) {
    assert.equal(canAssignObservation("BEHAVOBS", role), false);
  }
  assert.equal(canAssignObservation("RPPI", "examiner"), true);
});

test("an unused examiner duplicate is hidden, not modified", () => {
  assert.deepEqual(visibleObservationAssignments([incorrect, correct], new Set()), [correct]);
  assert.equal(incorrect.respondentType, "examiner");
});

test("saved, submitted and in-progress observations remain visible under staff", () => {
  for (const row of [incorrect, { ...incorrect, status: "completed" }, { ...incorrect, status: "in_progress" }, { ...incorrect, submittedAt: "2026-01-01" }]) {
    const result = visibleObservationAssignments([row, correct], new Set([row.id]));
    assert.equal(result.length, 2);
    assert.equal(result[0].respondentType, "invigilator");
    assert.equal(result[0].id, row.id);
  }
});

test("a lone legacy observation is retained, and unrelated assignments are unchanged", () => {
  const student = { ...incorrect, id: "student", toolId: "BYI2", respondentType: "self" };
  const result = visibleObservationAssignments([incorrect, student], new Set());
  assert.equal(result[0].respondentType, "invigilator");
  assert.strictEqual(result[1], student);
});