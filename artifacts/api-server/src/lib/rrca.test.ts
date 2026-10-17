import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateRrcaScores,
  detectRrcaTextScript,
  getRrcaLanguageTrialResults,
  type RrcaAnswers,
} from "./rrca.ts";

const questions = (scores: Array<number | null>) => scores.map((score, index) => ({
  id: `q${index + 1}`,
  text: `Question ${index + 1}`,
  type: (index < 5 ? "literal" : index < 8 ? "inferential" : "vocabulary") as "literal" | "inferential" | "vocabulary",
  score,
  notes: "",
}));

test("script detection identifies writing systems without claiming dialect", () => {
  assert.equal(detectRrcaTextScript("这是一段中文阅读材料。"), "Chinese characters");
  assert.equal(detectRrcaTextScript("The student reads this passage."), "Latin script");
  assert.equal(detectRrcaTextScript("학생은 이 글을 읽습니다."), "Hangul");
  assert.equal(detectRrcaTextScript("中文 and English"), "Mixed scripts");
  assert.equal(detectRrcaTextScript("123 — …"), "Unclear");
});

test("separate language phases retain separate scores and stopping information", () => {
  const answers: RrcaAnswers = {
    mode: "In-Person",
    passage: "中文阅读材料",
    passageLanguage: "mandarin",
    passageDifficulty: "below",
    passageTopic: "Animals",
    passageWordCount: 6,
    questions: questions(Array(10).fill(1)),
    generalNotes: "",
    languageTrials: [
      {
        passageLanguage: "english",
        responseLanguage: "english",
        passage: "An English passage.",
        passageDifficulty: "expected",
        passageTopic: "Animals",
        passageWordCount: 3,
        questions: questions([null]),
        outcome: "stopped_early",
        questionsReached: 1,
        notes: "Unable to continue after the first question.",
      },
      {
        passageLanguage: "mandarin",
        responseLanguage: "mandarin",
        passage: "中文阅读材料",
        passageDifficulty: "below",
        passageTopic: "Animals",
        passageWordCount: 6,
        questions: questions(Array(10).fill(1)),
        outcome: "completed",
        questionsReached: 10,
        notes: "",
      },
    ],
    activeLanguageTrialIndex: 1,
  };

  const results = getRrcaLanguageTrialResults(answers);
  assert.equal(results.length, 2);
  assert.deepEqual(
    results.map(result => [result.passageLanguage, result.outcome, result.questionsReached, result.rawScore, result.maxScore]),
    [
      ["english", "stopped_early", 1, 0, 0],
      ["mandarin", "completed", 10, 10, 10],
    ],
  );
  assert.equal(results[0].percentage, null);
  assert.equal(results[0].itemsScored, 0);
  assert.equal(results[1].literalItemsScored, 5);
  assert.equal(results[1].inferentialItemsScored, 3);
  assert.equal(results[1].vocabularyItemsScored, 2);
  assert.equal(results[0].detectedPassageScript, "Latin script");
  assert.equal(results[1].detectedPassageScript, "Chinese characters");
  assert.equal(results[1].responseLanguage, "mandarin");
});

test("legacy single-passage records remain readable and preserve their original score", () => {
  const legacy: RrcaAnswers = {
    mode: "Virtual",
    passage: "这是一段中文阅读材料。",
    passageLanguage: "mandarin",
    passageDifficulty: "below",
    passageTopic: "Animals",
    passageWordCount: 8,
    questions: questions(Array(10).fill(1)),
    generalNotes: "Student did better in Chinese and stopped after the first question in English.",
  };

  const results = getRrcaLanguageTrialResults(legacy);
  assert.equal(results.length, 1);
  assert.equal(results[0].passageLanguage, "mandarin");
  assert.equal(results[0].rawScore, 10);
  assert.equal(results[0].maxScore, 10);
  assert.equal(results[0].questionsReached, 10);
  assert.equal(results[0].responseLanguage, "not recorded");
  assert.equal(calculateRrcaScores(legacy).percentage, 100);
});
