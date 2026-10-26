import assert from "node:assert/strict";
import test from "node:test";
import { classifySdqReferenceScore, scoreSdq, type SdqScoringQuestion } from "./sdq-scoring.ts";
import { SDQ_P4_FORM, SDQ_P11_FORM, SDQ_T4_FORM, SDQ_T11_FORM, SDQ_SR11_FORM, SDQ_SR18_FORM } from "./opentools.ts";

const domains: Record<number, string> = {};
for (const [domain, items] of Object.entries({
  emotional: [3, 8, 13, 16, 24],
  conduct: [5, 7, 12, 18, 22],
  hyperactivity: [2, 10, 15, 21, 25],
  peer: [6, 11, 14, 19, 23],
  prosocial: [1, 4, 9, 17, 20],
})) for (const item of items) domains[item] = domain;

function fixture(toolId = "SDQ-P11", prefix = "sdqp11") {
  const questions: SdqScoringQuestion[] = Array.from({ length: 25 }, (_, index) => ({
    id: `${prefix}_${index + 1}`,
    domain: domains[index + 1],
    options: ["Not True", "Somewhat True", "Certainly True"],
  }));
  return {
    toolId,
    questions,
    language: "en",
    dateOfBirth: "2012-01-01",
    administeredAt: "2026-01-01",
    formSnapshotPresent: true,
    answers: Object.fromEntries(questions.map(question => [question.id, "Not True"])) as Record<string, unknown>,
  };
}

test("SDQ exact all-answer fixtures and Prosocial exclusion", () => {
  const input = fixture();
  let result = scoreSdq(input);
  assert.equal(result.scoringState, "scored");
  assert.deepEqual(Object.values(result.scales).map(scale => scale.score), [0, 2, 4, 4, 0]);
  assert.equal(result.totalDifficulties.score, 10);
  for (const question of input.questions) input.answers[question.id] = "Somewhat True";
  result = scoreSdq(input);
  assert.deepEqual(Object.values(result.scales).map(scale => scale.score), [5, 5, 5, 5, 5]);
  assert.equal(result.totalDifficulties.score, 20);
  for (const question of input.questions) input.answers[question.id] = "Certainly True";
  result = scoreSdq(input);
  assert.deepEqual(Object.values(result.scales).map(scale => scale.score), [10, 8, 6, 6, 10]);
  assert.equal(result.totalDifficulties.score, 30);
  for (const item of [1, 4, 9, 17, 20]) input.answers[`sdqp11_${item}`] = "Not True";
  assert.equal(scoreSdq(input).totalDifficulties.score, 30);
});

test("only the five canonical difficulty items reverse once", () => {
  const input = fixture();
  for (const item of [7, 11, 14, 21, 25]) {
    for (const [response, expected] of [["Not True", 2], ["Somewhat True", 1], ["Certainly True", 0]] as const) {
      input.answers[`sdqp11_${item}`] = response;
      const contribution = scoreSdq(input).itemContributions.find(row => row.itemNumber === item);
      assert.equal(contribution?.contribution, expected);
      assert.equal(contribution?.response, response);
    }
  }
  input.answers.sdqp11_1 = "Certainly True";
  assert.equal(scoreSdq(input).itemContributions.find(item => item.itemNumber === 1)?.contribution, 2);
});

test("missing answers prorate only at three/four and never substitute zero", () => {
  const input = fixture();
  for (const item of [3, 8, 13, 16, 24]) delete input.answers[`sdqp11_${item}`];
  input.answers.sdqp11_3 = 0;
  input.answers.sdqp11_8 = 2;
  input.answers.sdqp11_13 = 2;
  let result = scoreSdq(input);
  assert.equal(result.scales["Emotional Symptoms"].score, 7);
  assert.equal(result.scales["Emotional Symptoms"].prorated, true);
  assert.equal(result.scales["Emotional Symptoms"].unroundedScore, 20 / 3);
  delete input.answers.sdqp11_13;
  result = scoreSdq(input);
  assert.equal(result.scales["Emotional Symptoms"].score, null);
  assert.equal(result.totalDifficulties.score, null);
  input.answers.sdqp11_3 = 13;
  assert.equal(scoreSdq(input).scoringState, "blocked");
});

test("parent/teacher/self impact uses exact semantic components and excludes burden", () => {
  for (const [toolId, prefix, keys, expected] of [
    ["SDQ-P11", "sdqp11", ["distress", "if_home", "if_friends", "if_learn", "if_leisure"], 5],
    ["SDQ-T11", "sdqt11", ["distress", "if_peers", "if_class"], 3],
    ["SDQ-SR", "sdqsr11", ["distress", "if_home", "if_friends", "if_class", "if_leisure"], 5],
  ] as const) {
    const input = fixture(toolId, prefix);
    for (const key of keys) {
      input.questions.push({ id: `${prefix}_${key}` });
      input.answers[`${prefix}_${key}`] = "A medium amount";
    }
    input.answers[`${prefix}_burden`] = "A great deal";
    input.answers[`${prefix}_duration`] = "Over a year";
    assert.equal(scoreSdq(input).impact.score, expected);
    delete input.answers[`${prefix}_${keys[1]}`];
    input.answers[`${prefix}_overall`] = "No";
    assert.equal(scoreSdq(input).impact.score, null);
  }
});

test("nested impact grid values are read by stable row IDs", () => {
  const input = fixture();
  input.questions.push({
    id: "sdqp11_interfere",
    rows: ["home", "friends", "learn", "leisure"].map(key => ({ id: `sdqp11_if_${key}` })),
  });
  input.questions.push({ id: "sdqp11_distress" });
  input.answers.sdqp11_distress = "A medium amount";
  input.answers.sdqp11_interfere = {
    sdqp11_if_home: "Only a little",
    sdqp11_if_friends: "A great deal",
    sdqp11_if_learn: "A medium amount",
    sdqp11_if_leisure: "Not at all",
  };
  assert.equal(scoreSdq(input).impact.score, 4);
});

test("UK reference classifications remain respondent and scheme specific", () => {
  const input = fixture();
  for (const question of input.questions) input.answers[question.id] = "Somewhat True";
  const parent = scoreSdq(input);
  assert.equal(parent.classificationSchemes.four_band["Total Difficulties"], "Very high");
  assert.equal(parent.classificationSchemes.four_band["Prosocial Behaviour"], "Very low");
  const teacherInput = fixture("SDQ-T11", "sdqt11");
  for (const question of teacherInput.questions) teacherInput.answers[question.id] = "Somewhat True";
  const teacher = scoreSdq(teacherInput);
  assert.equal(teacher.classificationSchemes.four_band["Prosocial Behaviour"], "Slightly lowered");
  assert.equal(parent.classificationSchemes.three_band["Prosocial Behaviour"], "Borderline");
});

test("18+ has raw core scores but no child norm band; unverified language/form cannot score", () => {
  const adult = fixture("SDQ-SR18", "sdqsr18");
  adult.dateOfBirth = "2000-01-01";
  const result = scoreSdq(adult);
  assert.equal(result.scoringState, "scored");
  assert.equal(result.classificationState, "withheld");
  assert.equal(result.classificationSchemes.four_band["Total Difficulties"], null);
  const input = fixture();
  input.language = "zh";
  assert.equal(scoreSdq(input).scoringState, "blocked");
  input.language = "english";
  input.questions[0].domain = "conduct";
  assert.equal(scoreSdq(input).scoringState, "blocked");
});

test("reordering and introductory fields do not change core scoring", () => {
  const input = fixture();
  const expected = scoreSdq(input).totalDifficulties.score;
  input.questions.reverse();
  for (const question of input.questions) question.options?.reverse();
  input.questions.unshift({ id: "intro", domain: "admin", options: [] });
  input.answers.intro = 999;
  assert.equal(scoreSdq(input).totalDifficulties.score, expected);
});

test("the actual six RAOS form definitions match the supported canonical keys", () => {
  for (const [toolId, questions, birthDate] of [
    ["SDQ-P", SDQ_P4_FORM, "2018-01-01"],
    ["SDQ-P11", SDQ_P11_FORM, "2012-01-01"],
    ["SDQ-T", SDQ_T4_FORM, "2018-01-01"],
    ["SDQ-T11", SDQ_T11_FORM, "2012-01-01"],
    ["SDQ-SR", SDQ_SR11_FORM, "2012-01-01"],
    ["SDQ-SR18", SDQ_SR18_FORM, "2000-01-01"],
  ] as const) {
    const result = scoreSdq({
      toolId, questions: [...questions], language: "english",
      dateOfBirth: birthDate, administeredAt: "2026-01-01", formSnapshotPresent: true,
      answers: Object.fromEntries(questions.filter(question => /_\d+$/.test(question.id)).map(question => [question.id, "Somewhat True"])),
    });
    assert.equal(result.scoringState, "scored", `${toolId}: ${result.issues.join("; ")}`);
    assert.equal(result.totalDifficulties.score, 20);
  }
});

test("every supplied classification boundary, direction, and scheme is covered", () => {
  const criteria = {
    parent: {
      four_band: [[13, 16, 19], [3, 4, 6], [2, 3, 5], [5, 7, 8], [2, 3, 4], [5, 6, 7], [0, 1, 2]],
      three_band: [[13, 16], [3, 4], [2, 3], [5, 6], [2, 3], [4, 5], [0, 1]],
    },
    teacher: {
      four_band: [[11, 15, 18], [3, 4, 5], [2, 3, 4], [5, 7, 8], [2, 4, 5], [3, 4, 5], [0, 1, 2]],
      three_band: [[11, 15], [4, 5], [2, 3], [5, 6], [3, 4], [4, 5], [0, 1]],
    },
    self: {
      four_band: [[14, 17, 19], [4, 5, 6], [3, 4, 5], [5, 6, 7], [2, 3, 4], [4, 5, 6], [0, 1, 2]],
      three_band: [[15, 19], [5, 6], [3, 4], [5, 6], [3, 5], [4, 5], [0, 1]],
    },
  } as const;
  const names = ["Total Difficulties", "Emotional Symptoms", "Conduct Problems", "Hyperactivity/Inattention", "Peer Problems", "Prosocial Behaviour", "Impact"] as const;
  for (const respondent of ["parent", "teacher", "self"] as const) {
    for (const scheme of ["four_band", "three_band"] as const) {
      names.forEach((scale, index) => {
        const thresholds = criteria[respondent][scheme][index];
        const strength = scale === "Prosocial Behaviour";
        const labels = scheme === "four_band"
          ? strength ? ["Very low", "Low", "Slightly lowered", "Close to average"] : ["Close to average", "Slightly raised", "High", "Very high"]
          : strength ? ["Abnormal", "Borderline", "Normal"] : ["Normal", "Borderline", "Abnormal"];
        const maximum = scale === "Total Difficulties" ? 40 : scale === "Impact" && respondent === "teacher" ? 6 : 10;
        for (let score = 0; score <= maximum; score++) {
          const expectedIndex = thresholds.filter(threshold => score > threshold).length;
          assert.equal(classifySdqReferenceScore({ respondent, scheme, scale, score }), labels[expectedIndex], `${respondent}/${scheme}/${scale}/${score}`);
        }
      });
    }
  }
  assert.throws(() => classifySdqReferenceScore({ respondent: "parent", scheme: "four_band", scale: "Prosocial Behaviour", score: 13 }), RangeError);
});

test("missing administered snapshot never scores against current library definitions", () => {
  const input = fixture();
  input.formSnapshotPresent = false;
  const result = scoreSdq(input);
  assert.equal(result.scoringState, "blocked");
  assert.equal(result.totalDifficulties.score, null);
  assert.ok(result.itemContributions.every(item => item.contribution === null));
  assert.ok(Object.values(result.scales).every(scale => scale.unroundedScore === null));
});
