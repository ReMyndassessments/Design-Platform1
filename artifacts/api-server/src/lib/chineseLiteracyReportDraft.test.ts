import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appendChineseLiteracyRecommendationSections,
  buildChineseLiteracyReportPrompt, buildChineseLiteracyRecommendationPrompt,
  parseChineseLiteracyRecommendationSections,
} from "./chineseLiteracyReportDraft.ts";

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

test("recommendation prompt asks DeepSeek for only two additive narratives and preserves the existing report", () => {
  const prompt = buildChineseLiteracyRecommendationPrompt(document("parent"));
  assert.match(prompt, /Do not rewrite, summarize, replace, or reproduce any part of the existing report/);
  assert.match(prompt, /One parent's or caregiver's home observations only/);
  assert.match(prompt, /Return valid JSON only, exactly/);
  assert.match(prompt, /6–8 weeks/);
  assert.match(prompt, /never assign school teaching duties to the parent/);
  assert.deepEqual(parseChineseLiteracyRecommendationSections(
    '{"monitoring":"Review observable reading and writing participation after agreed support begins.","followUp":"Consider a repeat home observation in 6–8 weeks if useful."}',
  ), {
    monitoring: "Review observable reading and writing participation after agreed support begins.",
    followUp: "Consider a repeat home observation in 6–8 weeks if useful.",
  });
  assert.throws(() => parseChineseLiteracyRecommendationSections('{"monitoring":"Only one section."}'), /incomplete/);
});

test("appending recommendations preserves every byte of the existing report before the new sections", () => {
  const original = "# Existing report\n\n## Observations by domain\nOriginal domain findings and data.";
  const result = appendChineseLiteracyRecommendationSections(original, {
    monitoring: "Review the reported indicators after support starts.",
    followUp: "Consider a repeat observation in 6–8 weeks if useful.",
  });
  assert.equal(result.slice(0, original.length), original);
  assert.match(result, /## Observations by domain\nOriginal domain findings and data\.\n\n## Recommended monitoring plan/);
  assert.match(result, /## Recommended follow-up plan/);
});
