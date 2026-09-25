import assert from "node:assert/strict";
import test from "node:test";
import { resolveStepBackTarget } from "./phase-navigation.ts";

test("progress steps can return only to earlier displayed phases", () => {
  assert.equal(resolveStepBackTarget("forms", "intake"), "intake");
  assert.equal(resolveStepBackTarget("report", "assessment"), "assessment");
  assert.equal(resolveStepBackTarget("complete", "debrief"), "debrief");
  assert.equal(resolveStepBackTarget("assessment", "assessment"), null);
  assert.equal(resolveStepBackTarget("assessment", "report"), null);
  assert.equal(resolveStepBackTarget("report", "setup"), null);
  assert.equal(resolveStepBackTarget("pre_commitment", "intake"), null);
});

test("menu Step Back still moves one internal phase", () => {
  assert.equal(resolveStepBackTarget("forms"), "setup");
  assert.equal(resolveStepBackTarget("setup"), "intake");
  assert.equal(resolveStepBackTarget("intake"), "pre_commitment");
  assert.equal(resolveStepBackTarget("pre_commitment"), null);
});