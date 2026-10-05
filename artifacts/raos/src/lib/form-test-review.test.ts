import test from "node:test";
import assert from "node:assert/strict";
import { questionnairePassBlockers } from "./form-test-review.ts";

test("an unchecked form explains the answer check and missing confirmations", () => {
  const blockers = questionnairePassBlockers(null, "mandarin", 4);
  assert.equal(blockers.length, 2);
  assert.match(blockers[0], /Check form/);
  assert.match(blockers[1], /4 remaining/);
  assert.ok(!blockers.some(reason => reason.includes("assigned language")));
});

test("a passed answer check still needs human review confirmations", () => {
  const blockers = questionnairePassBlockers({ passed: true, language: "english", answers: {} }, "english", 1);
  assert.deepEqual(blockers, ["Tick the 1 remaining review confirmation."]);
});

test("staff can check English even when the respondent is assigned Mandarin", () => {
  const blockers = questionnairePassBlockers({ passed: true, language: "english", answers: {} }, "mandarin", 0);
  assert.deepEqual(blockers, []);
});

test("matching language, answer validation, and confirmations permit recording", () => {
  assert.deepEqual(questionnairePassBlockers({ passed: true, language: "zh", answers: {} }, "mandarin", 0), []);
});

test("editing answers and invalidating validation requires another answer check", () => {
  const blockers = questionnairePassBlockers({ passed: false, language: "english", answers: {} }, "english", 0);
  assert.equal(blockers.length, 1);
  assert.match(blockers[0], /Check form/);
});