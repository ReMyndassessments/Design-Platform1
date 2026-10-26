import assert from "node:assert/strict";
import test from "node:test";
import { getPublisherCriteria, interpretVerifiedPublisherTScore } from "./publisher-criteria.ts";

const interpret = (family: "BRIEF2" | "BASC3" | "BYI2", tScore: number, adaptive = false) =>
  interpretVerifiedPublisherTScore({
    family, tScore, sourceVerified: true, applicabilityVerified: true,
    scaleType: adaptive ? "ordinary_adaptive" : "ordinary_problem",
  });

test("BRIEF-2 inclusive T-score boundaries", () => {
  for (const [score, expected] of [[59, "Not elevated"], [60, "Mildly elevated"], [64, "Mildly elevated"], [65, "Potentially clinically elevated"], [69, "Potentially clinically elevated"], [70, "Clinically elevated"]] as const) {
    assert.equal(interpret("BRIEF2", score).classification, expected);
  }
});
test("BASC-3 every supplied boundary respects scale direction", () => {
  for (const [score, clinical, adaptive] of [
    [30, "Very low", "Clinically Significant"], [31, "Low", "At-Risk"],
    [40, "Low", "At-Risk"], [41, "Average", "Average"],
    [59, "Average", "Average"], [60, "At-Risk", "High"],
    [69, "At-Risk", "High"], [70, "Clinically Significant", "Very high"],
  ] as const) {
    assert.equal(interpret("BASC3", score).classification, clinical);
    assert.equal(interpret("BASC3", score, true).classification, adaptive);
  }
});
test("unverified sources, applicability and nonnumeric scores cannot receive bands", () => {
  const input = { family: "BRIEF2" as const, tScore: 70, sourceVerified: false, applicabilityVerified: true, scaleType: "ordinary_problem" as const };
  assert.equal(interpretVerifiedPublisherTScore(input).classification, null);
  assert.equal(interpretVerifiedPublisherTScore({ ...input, sourceVerified: true, applicabilityVerified: false }).classification, null);
  assert.equal(interpret("BRIEF2", Number.NaN).classification, null);
});
test("special indexes and BYI never inherit an ordinary symptom table", () => {
  const input = { family: "BASC3" as const, tScore: 70, sourceVerified: true, applicabilityVerified: true, scaleType: "special" as const };
  assert.equal(interpretVerifiedPublisherTScore(input).classification, null);
  assert.equal(interpretVerifiedPublisherTScore({ ...input, sourceClassification: "Source-specific category" }).classification, "Source-specific category");
  assert.equal(interpret("BYI2", 55).classification, null);
  assert.equal(interpret("BYI2", 70, true).classification, null);
});
test("exact source classifications are retained separately from reference criteria", () => {
  const result = interpretVerifiedPublisherTScore({
    family: "BRIEF2", tScore: 70, sourceVerified: true, applicabilityVerified: true,
    scaleType: "ordinary_problem", sourceClassification: "Exact wording from authorized source",
  });
  assert.equal(result.classification, "Exact wording from authorized source");
  assert.equal(result.referenceBand, "Clinically elevated");
  assert.equal(result.provenance, "publisher_source");
});
test("form-specific reference structures do not manufacture self-report constructs or overall BYI scores", () => {
  const self = getPublisherCriteria("BRIEF2-SR")!;
  assert.ok(self.clinicalScales.includes("Task Completion"));
  assert.ok(!self.clinicalScales.includes("Initiate"));
  assert.ok(!self.clinicalScales.includes("Task-Monitor"));
  const byi = getPublisherCriteria("BYI2")!;
  assert.equal(byi.inventories.length, 5);
  assert.equal(byi.bands.length, 0);
  assert.deepEqual(byi.responseAnchors, ["0 = Never", "1 = Sometimes", "2 = Often", "3 = Always"]);
  assert.equal(getPublisherCriteria("SDQ-P"), null);
});
