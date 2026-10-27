import test from "node:test";
import assert from "node:assert/strict";
import { buildResponseBasedScreeningNarrative } from "./response-based-screening-narrative.js";

test("response narrative uses exact saved answer labels and gives neutral planning prompts", () => {
  const narrative = buildResponseBasedScreeningNarrative({
    instrument: "Synthetic form",
    answered: 3,
    total: 4,
    items: [
      { prompt: "Synthetic item about starting tasks", response: "Often", options: ["Never", "Sometimes", "Often"] },
      { prompt: "Synthetic item about organizing materials", response: "Often", options: ["Never", "Sometimes", "Often"] },
      { prompt: "Synthetic item with a different scale", response: "True", options: ["True", "False"] },
      { prompt: "Synthetic numeric item", response: "Recorded code/value: 2", options: ["Never", "Sometimes", "Often"] },
    ],
  });

  assert.match(narrative, /“Often” was selected for 2 items/);
  assert.match(narrative, /Synthetic item about starting tasks — “Often”/);
  assert.match(narrative, /how it affects learning or participation/);
  assert.match(narrative, /not calculate scores, infer severity, apply norms, or establish a diagnosis/);
  assert.match(narrative, /not assigned a response label/);
  assert.doesNotMatch(narrative, /clinically elevated|diagnosed with/i);
});

test("response narrative handles no matched option labels without inventing a classification", () => {
  const narrative = buildResponseBasedScreeningNarrative({
    instrument: "Synthetic form",
    answered: 1,
    total: 1,
    items: [{ prompt: "Synthetic item", response: "2", options: ["Never", "Sometimes", "Often"] }],
  });

  assert.match(narrative, /No responses could be matched to the saved answer labels/);
  assert.match(narrative, /not assigned a response label/);
});
