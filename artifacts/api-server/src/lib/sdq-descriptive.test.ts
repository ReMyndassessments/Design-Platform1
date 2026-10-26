import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";

// The app is bundled from .js specifiers; Node's strip-types test runner does
// not resolve that one source dependency to TypeScript on its own.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./sdq-scoring.js" && context.parentURL?.endsWith("/sdq-descriptive.ts")) {
      return nextResolve("./sdq-scoring.ts", context);
    }
    return nextResolve(specifier, context);
  },
});
const { buildSdqDescriptiveResponse, isSdqToolId } = await import("./sdq-descriptive.ts");

test("SDQ report text is generated from the same deterministic score record", () => {
  const domains: Record<string, number[]> = {
    emotional: [3, 8, 13, 16, 24], conduct: [5, 7, 12, 18, 22],
    hyperactivity: [2, 10, 15, 21, 25], peer: [6, 11, 14, 19, 23],
    prosocial: [1, 4, 9, 17, 20],
  };
  const questions = Array.from({ length: 25 }, (_, index) => ({
    id: `sdqp11_${index + 1}`, text: `Synthetic item ${index + 1}`,
    domain: Object.entries(domains).find(([, items]) => items.includes(index + 1))![0],
    options: ["Not True", "Somewhat True", "Certainly True"],
  }));
  const result = buildSdqDescriptiveResponse({
    toolId: "SDQ-P11", questions,
    answers: Object.fromEntries(questions.map(question => [question.id, "Somewhat True"])),
    language: "english", formSnapshotPresent: true,
    dateOfBirth: "2012-01-01", administeredAt: "2026-01-01",
  });
  assert.equal(result.scoring.totalDifficulties.score, 20);
  assert.match(result.reportText, /Total Difficulties: 20\/40/);
  assert.match(result.reportText, /reference band: Very high/);
  assert.match(result.reportText, /No scores are pooled across respondents/);
});

test("recognizes current and saved SDQ form identifiers only", () => {
  assert.equal(isSdqToolId("SDQ-P"), true);
  assert.equal(isSdqToolId("SDQ-SR18"), true);
  assert.equal(isSdqToolId("SDQ-SR4"), true);
  assert.equal(isSdqToolId("SNAPIV26"), false);
});

test("keeps saved SDQ answers descriptive and preserves positive item endorsements", () => {
  const questions = Array.from({ length: 25 }, (_, index) => ({
    id: `sdqp11_${index + 1}`,
    text: `Item ${index + 1}`,
  }));
  const answers = Object.fromEntries(questions.map((question, index) => [question.id, index === 24 ? "Certainly true" : "Not true"]));
  const result = buildSdqDescriptiveResponse({
    toolId: "SDQ-P11",
    questions,
    answers,
    language: "en",
  });

  assert.equal(result.reportingState, "descriptive_only");
  assert.equal(result.scoringEligibility, "not_verified");
  assert.equal(result.completeness.answered, 25);
  assert.equal(result.items.find(item => item.itemNumber === 25)?.response, "Certainly true");
  assert.equal(result.items.find(item => item.itemNumber === 25)?.positivelyWorded, true);
  assert.equal(result.positivePhraseItems.find(item => item.itemNumber === 25)?.response, "Certainly true");
  assert.deepEqual(result.missingCoreItems, []);
  assert.equal("rawScore" in result, false);
  assert.equal("classification" in result, false);
});

test("flags incomplete or noncanonical saved item sets without assigning scores", () => {
  const result = buildSdqDescriptiveResponse({
    toolId: "SDQ-T",
    questions: [
      { id: "sdqt_1", text: "A positively worded item" },
      { id: "sdqt_26", text: "Not a core item" },
    ],
    answers: { sdqt_1: "Certainly true" },
  });

  assert.equal(result.formCompatibility, "item_set_unverified");
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].positivelyWorded, true);
  assert.equal(result.supplemental[0].response, null);
  assert.equal(result.missingCoreItems.length, 24);
});
