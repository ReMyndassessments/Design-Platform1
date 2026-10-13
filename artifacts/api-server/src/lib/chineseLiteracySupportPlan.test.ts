import { test } from "node:test";
import assert from "node:assert/strict";
import { buildChineseLiteracySupportPlanPrompt, parseChineseLiteracySupportPlanDraft } from "./chineseLiteracySupportPlan.ts";

function document(respondent: "parent" | "teacher") {
  return {
    metadata: {
      respondent,
      reportLimitation: "This describes one respondent's observations and is not diagnostic.",
      domains: [{ id: "R", label: "Reading", items: [{ id: "R1", text: "Reads Chinese text." }, { id: "R2", text: "Explains meaning." }] }],
      strategies: [{ id: "reading-access", label: "Effortful reading", options: ["Supported reading"] }],
    },
    input: {
      context: { grade: "9", setting: respondent === "parent" ? "Home" : "Classroom" },
      responses: [{ itemId: "R1", status: "rated", value: 4 }, { itemId: "R2", status: "not_observed", value: null }],
      evidence: { R: { examples: [], strengths: "Chinese source text", supports: "Usual support", setting: "Home" } },
      summary: { strengths: "Learner strength", barriers: "One concern", supportResponse: "Usual support", discussion: "Discuss access", priorities: [] },
    },
    selectedDomains: ["R"],
    scores: [{ id: "R", label: "Reading", mean: 4, status: "scored" }],
    report: { narrative: "Approved report based on this respondent only." },
  } as any;
}

test("support-plan prompt keeps home and classroom sources separate and requires reviewable, non-diagnostic suggestions", () => {
  const parentPrompt = buildChineseLiteracySupportPlanPrompt(document("parent"));
  const teacherPrompt = buildChineseLiteracySupportPlanPrompt(document("teacher"));
  assert.match(parentPrompt, /One parent's or caregiver's home observations only/);
  assert.match(parentPrompt, /Do not assign school teaching responsibilities to the family/);
  assert.match(parentPrompt, /Do not select the classroom_support_review pathway from parent-only evidence/);
  assert.match(teacherPrompt, /One teacher's classroom or teaching-setting observations only/);
  assert.match(teacherPrompt, /Do not present teacher observations as parent or home evidence/);
  assert.match(parentPrompt, /not a dyslexia screener, risk rating/);
  assert.match(parentPrompt, /Do not invent a review date/);
  assert.match(parentPrompt, /Approved report based on this respondent only/);
});

test("support-plan parser rejects unobserved item links and accepts only rated evidence", () => {
  const doc = document("teacher");
  const base = {
    pathway: "targeted_support_planning",
    rationale: "Use supported reading based on the teacher's observation.",
    priorities: [{
      text: "Provide supported practice with taught Chinese text.",
      itemIds: ["R1"],
      strategyId: "reading-access",
      owner: "Chinese-language teacher (confirm locally)",
      indicator: "Record the student's response during comparable supported reading activities.",
      reviewDate: "2099-01-01",
    }],
  };
  const valid = parseChineseLiteracySupportPlanDraft(JSON.stringify(base), doc);
  assert.deepEqual(valid.priorities[0].itemIds, ["R1"]);
  assert.equal(valid.priorities[0].reviewDate, "");

  assert.throws(() => parseChineseLiteracySupportPlanDraft(JSON.stringify({
    ...base, priorities: [{ ...base.priorities[0], itemIds: ["R2"] }],
  }), doc), /rated items/);
  assert.throws(() => parseChineseLiteracySupportPlanDraft(JSON.stringify({
    ...base, priorities: [{ ...base.priorities[0], strategyId: "not-a-strategy" }],
  }), doc), /incomplete or not linked/);
  assert.throws(() => parseChineseLiteracySupportPlanDraft(JSON.stringify({
    ...base, pathway: "classroom_support_review",
  }), document("parent")), /source-inappropriate/);
});
