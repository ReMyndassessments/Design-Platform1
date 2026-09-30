import test from "node:test";
import assert from "node:assert/strict";
import { formatSubmittedIntakeResponses, readSubmittedIntakeAnswers } from "./submittedIntakeAnswers.ts";

const submittedAt = new Date("2026-09-30T01:00:00Z");

test("new per-question answers are paired to the exact questions in regenerated analysis", () => {
  const response = JSON.stringify({ format: "remynd.intake.answers.v1", answers: ["汉语回答", "한국어 답변"] });
  assert.deepEqual(readSubmittedIntakeAnswers(response, 2), ["汉语回答", "한국어 답변"]);
  const formatted = JSON.parse(formatSubmittedIntakeResponses([{
    audience: "parent", questions: ["First question?", "Second question?"],
    answer: response, submittedAt,
  }]));
  assert.deepEqual(formatted[0].questionAnswers, [
    { question: "First question?", answer: "汉语回答" },
    { question: "Second question?", answer: "한국어 답변" },
  ]);
});

test("legacy combined replies stay intact and are not assigned to individual questions", () => {
  const narrative = "The parent describes both school and home.";
  assert.equal(readSubmittedIntakeAnswers(narrative, 2), null);
  const formatted = JSON.parse(formatSubmittedIntakeResponses([{
    audience: "parent", questions: ["School?", "Home?"],
    answer: narrative, submittedAt,
  }]));
  assert.equal(formatted[0].combinedResponseAsWritten, narrative);
  assert.equal(formatted[0].questionAnswers, undefined);
  assert.equal(readSubmittedIntakeAnswers(JSON.stringify({ format: "remynd.intake.answers.v1", answers: ["only one"] }), 2), null);
  assert.deepEqual(JSON.parse(formatSubmittedIntakeResponses([{
    audience: "teacher", questions: ["Question?"], answer: "unsent draft", submittedAt: null,
  }])), []);
});