import { test } from "node:test";
import assert from "node:assert/strict";
import { sampleQuestionnaireAnswers } from "./form-test-samples";
import { literacyTestSample } from "../components/chinese-literacy/testSamples";
import { validateInput } from "../components/chinese-literacy/logic";
import { LITERACY_METADATA, validateLiteracyInput } from "../../../api-server/src/lib/chineseLiteracy";
import { PARENT_LITERACY_METADATA } from "../../../api-server/src/lib/chineseLiteracyParent";
import { validateStaffTestAnswers } from "../../../api-server/src/lib/staffQuestionnaireTests";

for (const meta of [LITERACY_METADATA, PARENT_LITERACY_METADATA]) {
  test(`${meta.key}: one-click sample passes real client/server validation in both languages`, () => {
    for (const language of ["english", "mandarin"] as const) {
      const sample = literacyTestSample(meta, language);
      assert.deepEqual(validateInput(sample, meta, meta.domains), []);
      assert.doesNotThrow(() => validateLiteracyInput(sample, undefined, true, meta));
      assert.throws(() => validateLiteracyInput({}, undefined, true, meta));
      assert.equal(sample.responses.length, meta.domains.reduce((n, domain) => n + domain.items.length, 0));
      assert.equal(sample.interfaceLanguage, language);
      assert.ok(sample.summary.strengths.includes("SAMPLE ONLY"));
    }
  });
}

test("parent and teacher high ratings submit without examples in both languages", () => {
  for (const language of ["english", "mandarin"] as const) {
    for (const meta of [PARENT_LITERACY_METADATA, LITERACY_METADATA]) {
      const sample = literacyTestSample(meta, language);
      sample.responses = sample.responses.map(response => ({ ...response, status: "rated", value: 5 }));
      Object.values(sample.evidence).forEach(evidence => { evidence.examples = []; });
      const issues = validateInput(sample, meta, meta.domains);
      assert.deepEqual(issues, []);
      assert.doesNotThrow(() => validateLiteracyInput(sample, undefined, true, meta));
    }
  }
});

test("automatic samples fill choices, dates, multi-select and frequency-grid rows without mutating the questionnaire", () => {
  const questions = [
    { id: "heading", text: "Section", type: "section_header", domain: "test" },
    { id: "name", text: "Name", type: "text", required: true, domain: "test" },
    { id: "student_dob", text: "Date of birth", type: "date", required: true, domain: "test" },
    { id: "choice", text: "Choice", type: "radio", options: ["No", "Yes"], required: true, domain: "test" },
    { id: "multiple", text: "Choose", type: "checkbox_group", options: ["A", "B"], required: true, domain: "test" },
    { id: "single", text: "Confirm", type: "checkbox", required: true, domain: "test" },
    { id: "rating", text: "Rate", type: "likert", required: true, domain: "test" },
    { id: "grid", text: "Grid", type: "frequency_grid", options: ["Never", "Often"], required: true, domain: "test",
      rows: [{ id: "row", text: "Row", type: "radio", domain: "test" }] },
  ];
  const original = JSON.stringify(questions);
  const answers = sampleQuestionnaireAnswers(questions);
  assert.equal(answers.choice, "Yes");
  assert.deepEqual(answers.multiple, ["A"]);
  assert.equal(answers.single, "1");
  assert.equal(answers.rating, "Never");
  assert.equal(answers.row, "Never");
  assert.equal(answers.heading, undefined);
  assert.equal(JSON.stringify(questions), original);
  assert.equal(validateStaffTestAnswers(questions, {}).valid, false);
  assert.equal(validateStaffTestAnswers(questions, answers).valid, true);
});
