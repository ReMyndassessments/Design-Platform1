import test from "node:test";
import assert from "node:assert/strict";
import { parseIntakeAnalysisResult } from "./intakeAnalysisValidation.ts";

const complete = {
  recommendedTools: [{ toolId: "TEST", name: "Test", rationale: "Checks the reported reading concerns.", priority: "recommended" }],
  recommendedDomains: ["reading"],
  riskLevel: "moderate",
  summary: "The submitted teacher and parent responses describe new reading concerns.",
  flags: [],
  suggestedQuestions: { teacher: ["What supports help?"], parent: ["When did you first notice this?"] },
};

test("valid intake AI result can replace generated analysis fields", () => {
  assert.deepEqual(parseIntakeAnalysisResult(JSON.stringify(complete)), complete);
});

test("parseable but incomplete AI results cannot replace the prior analysis", () => {
  assert.throws(() => parseIntakeAnalysisResult("{}"), /incomplete/);
  assert.throws(() => parseIntakeAnalysisResult(JSON.stringify({ ...complete, summary: "" })), /incomplete/);
  assert.throws(() => parseIntakeAnalysisResult(JSON.stringify({ ...complete, suggestedQuestions: undefined })), /incomplete/);
  assert.throws(() => parseIntakeAnalysisResult(JSON.stringify({ ...complete, recommendedTools: [] })), /incomplete/);
});