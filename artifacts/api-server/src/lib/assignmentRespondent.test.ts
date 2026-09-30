import test from "node:test";
import assert from "node:assert/strict";
import { normalizeAssignmentRespondentType } from "./assignmentRespondent.ts";

test("catalogue teacher role maps to the first valid assignment slot", () => {
  assert.equal(normalizeAssignmentRespondentType("teacher"), "teacher1");
  assert.equal(normalizeAssignmentRespondentType("teacher2"), "teacher2");
  assert.equal(normalizeAssignmentRespondentType("parent"), "parent");
});

test("invalid roles are rejected before a database insert", () => {
  assert.equal(normalizeAssignmentRespondentType("unknown"), null);
  assert.equal(normalizeAssignmentRespondentType(undefined), null);
});