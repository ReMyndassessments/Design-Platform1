import assert from "node:assert/strict";
import test from "node:test";
import { buildSdqDescriptiveResponse, isSdqToolId } from "./sdq-descriptive.ts";

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
