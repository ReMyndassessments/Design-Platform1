import test from "node:test";
import assert from "node:assert/strict";
import { BEHAVOBS_DETAILS, withBehavobsDetails } from "./behavobsDetails.ts";

test("legacy observation gets a multiline Yes-only follow-up immediately after q24", () => {
  const questions = [{ id: "q24" }, { id: "q25" }];
  const result = withBehavobsDetails(questions, "BEHAVOBS");
  assert.deepEqual(result.map(q => q.id), ["q24", "q24_details", "q25"]);
  assert.equal(BEHAVOBS_DETAILS.type, "textarea");
  assert.equal(BEHAVOBS_DETAILS.conditionalOn, "q24");
  assert.equal(BEHAVOBS_DETAILS.conditionalValue, "Yes");
  const yes: Record<string, string> = { q24: "Yes" };
  const no: Record<string, string> = { q24: "No" };
  assert.equal(yes[BEHAVOBS_DETAILS.conditionalOn!], BEHAVOBS_DETAILS.conditionalValue);
  assert.notEqual(no[BEHAVOBS_DETAILS.conditionalOn!], BEHAVOBS_DETAILS.conditionalValue);
  assert.deepEqual(questions, [{ id: "q24" }, { id: "q25" }]);
});

test("follow-up is not duplicated and unrelated questionnaires are unchanged", () => {
  const questions = [{ id: "q24" }, BEHAVOBS_DETAILS];
  assert.equal(withBehavobsDetails(questions, "BEHAVOBS").length, 2);
  assert.deepEqual(withBehavobsDetails([{ id: "q24" }], "BYI2"), [{ id: "q24" }]);
});