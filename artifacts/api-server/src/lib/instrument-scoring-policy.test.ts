import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { assertGenericScoringAllowed, instrumentScoringFamily, usesInstrumentSpecificScoring } from "./instrument-scoring-policy.ts";

test("all four instrument families, historical aliases and unknown editions avoid generic scoring", () => {
  for (const [id, family] of [
    ["BRIEF2-P", "BRIEF2"], ["BRIEF-2-SR", "BRIEF2"], ["BREIF2-T", "BRIEF2"],
    [" brief2_future ", "BRIEF2"], ["BASC3", "BASC3"], ["BASC-3-PRS", "BASC3"],
    ["BYI2", "BYI2"], ["BYI-2-BSCI-Y", "BYI2"],
    ["SDQ-P", "SDQ"], ["SDQ-SR18", "SDQ"], ["SDQ-T4", "SDQ"], ["SDQ-future", "SDQ"],
  ] as const) {
    assert.equal(instrumentScoringFamily(id), family);
    assert.equal(usesInstrumentSpecificScoring(id), true);
    assert.throws(() => assertGenericScoringAllowed(id), /instrument-specific scoring pathway/);
  }
});

test("unrelated RAOS instruments keep their existing scoring eligibility", () => {
  for (const id of ["RFII", "RCEP-CORE", "RPPI", "RCFI", "BEHAVOBS", "PHQ-9", "BRIEF-A", "BDI-II"]) {
    assert.equal(usesInstrumentSpecificScoring(id), false);
    assert.doesNotThrow(() => assertGenericScoringAllowed(id));
  }
  assert.equal(usesInstrumentSpecificScoring(null), false);
});

test("generic writer and aggregate routes retain the common instrument policy", () => {
  for (const name of ["scores", "remynd-index", "products", "reports", "cases", "apprentices", "assignments"]) {
    const source = readFileSync(new URL(`../routes/${name}.ts`, import.meta.url), "utf8");
    assert.match(source, /usesInstrumentSpecificScoring\(/, `${name} must not bypass protected scoring families`);
  }
  const helpers = readFileSync(new URL("./scoringHelpers.ts", import.meta.url), "utf8");
  assert.match(helpers, /buildDomainMap[\s\S]*?assertGenericScoringAllowed\(toolId\)/);
  assert.match(helpers, /getScaleMax[\s\S]*?assertGenericScoringAllowed\(toolId\)/);
});
