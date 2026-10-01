import assert from "node:assert/strict";
import { test } from "node:test";
import { canEditIntakeQuestionResponse } from "./intakeQuestionEditPolicy.js";

test("submitted evidence is locked throughout assessment and later phases", () => {
  for (const phase of ["assessment", "scoring", "report", "final_review", "debrief", "complete"]) {
    assert.equal(canEditIntakeQuestionResponse(phase, new Date()), false, phase);
  }
});

test("intake-stage corrections remain possible before assessment", () => {
  for (const phase of ["pre_commitment", "intake", "setup", "forms"]) {
    assert.equal(canEditIntakeQuestionResponse(phase, "2026-01-01"), true, phase);
  }
});

test("first responses remain possible without reopening submitted evidence", () => {
  assert.equal(canEditIntakeQuestionResponse("assessment", null), true);
  assert.equal(canEditIntakeQuestionResponse("complete", null), true);
});

test("unknown or missing phases cannot unlock submitted evidence", () => {
  for (const phase of ["unexpected", undefined, null]) {
    assert.equal(canEditIntakeQuestionResponse(phase, "2026-01-01"), false);
  }
});