import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChineseLiteracyReportPrompt } from "./chineseLiteracyReportDraft.ts";

function document(respondent: "parent" | "teacher") {
  const metadata = {
    respondent,
    reportLimitation: "This describes one respondent's observations and is not diagnostic.",
    domains: [{ id: "R", label: "Reading", items: [{ id: "R1", text: "Reads Chinese text." }] }],
  };
  const domain = metadata.domains[0];
  return {
    metadata, input: {
      context: { grade: "9" }, responses: domain.items.map((item: any) => ({ itemId: item.id, status: "rated", value: 4 })),
      evidence: { [domain.id]: { examples: [], strengths: "Chinese source text", setting: "Home" } },
      summary: { strengths: "Learner strength", barriers: "One concern", supportResponse: "Usual support", discussion: "Discuss access", priorities: [] },
    },
    selectedDomains: [domain.id], scores: [{ id: domain.id, label: domain.label, mean: 4, status: "scored" }],
  } as any;
}

test("parent draft prompt is limited to one parent's source and forbids cross-source or diagnostic claims", () => {
  const prompt = buildChineseLiteracyReportPrompt(document("parent"));
  assert.match(prompt, /One parent's or caregiver's observations in the home setting only/);
  assert.match(prompt, /Do not include, infer, merge, or compare another respondent's record/);
  assert.match(prompt, /Do not diagnose or rule out dyslexia/);
  assert.match(prompt, /Chinese source text/);
  assert.match(prompt, /Source and scope; Context; Strengths and current supports/);
  assert.match(prompt, /Do not write an Observations by domain section/);
  assert.match(prompt, /rating-distribution chart and a factual narrative for every selected domain/);
  assert.match(prompt, /Recommended monitoring plan/);
  assert.match(prompt, /Recommended follow-up plan/);
  assert.match(prompt, /concise narrative paragraphs/);
  assert.match(prompt, /not a record that support was delivered or progress occurred/);
  assert.match(prompt, /same respondent, setting and applicable domains/);
  assert.match(prompt, /6–8 weeks/);
});

test("teacher draft prompt uses teacher-only source and descriptive scoring safeguards", () => {
  const prompt = buildChineseLiteracyReportPrompt(document("teacher"));
  assert.match(prompt, /One teacher's observations in the classroom or teaching setting only/);
  assert.match(prompt, /not norm-referenced, diagnostic, validated screening, risk, or clinical severity scores/);
  assert.match(prompt, /Do not combine or compare parent and teacher evidence/);
});
