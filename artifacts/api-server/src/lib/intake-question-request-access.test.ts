import test from "node:test";
import assert from "node:assert/strict";
import { assignmentMatchesQuestionRecipient, assignmentOwnsQuestionRequest } from "./intake-question-request-access.ts";

const sentAt = new Date("2026-01-01T00:00:00Z");
const request = {
  caseId: "case-1",
  assignmentId: "assignment-1",
  audience: "teacher" as const,
  recipientEmail: "Teacher@school.example",
  sentAt,
};
const assignment = {
  id: "assignment-1",
  caseId: "case-1",
  respondentType: "teacher1",
  assignedToEmail: "teacher@school.example",
};

test("assignment portal exposes a sent request only to its matching recipient and audience", () => {
  assert.equal(assignmentOwnsQuestionRequest(request, assignment), true);
  assert.equal(assignmentOwnsQuestionRequest(request, { ...assignment, assignedToEmail: "other@school.example" }), false);
  assert.equal(assignmentOwnsQuestionRequest(request, { ...assignment, respondentType: "parent" }), false);
  assert.equal(assignmentOwnsQuestionRequest({ ...request, sentAt: null }, assignment), false);
});

test("parent requests are limited to parent assignments for the same case and assignment", () => {
  const parentRequest = { ...request, audience: "parent" as const };
  assert.equal(assignmentOwnsQuestionRequest(parentRequest, { ...assignment, respondentType: "parent" }), true);
  assert.equal(assignmentOwnsQuestionRequest(parentRequest, { ...assignment, caseId: "another-case", respondentType: "parent" }), false);
  assert.equal(assignmentOwnsQuestionRequest(parentRequest, { ...assignment, id: "another-assignment", respondentType: "parent" }), false);
});

test("an early question-only portal gains later forms only for the exact case, role and email", () => {
  const earlyRequest = { ...request, assignmentId: null, questionOnlyToken: "private-original-link" };
  assert.equal(assignmentMatchesQuestionRecipient(earlyRequest, assignment), true);
  assert.equal(assignmentOwnsQuestionRequest(earlyRequest, assignment), true);
  assert.equal(assignmentMatchesQuestionRecipient(earlyRequest, { ...assignment, caseId: "another-case" }), false);
  assert.equal(assignmentMatchesQuestionRecipient(earlyRequest, { ...assignment, respondentType: "parent" }), false);
  assert.equal(assignmentMatchesQuestionRecipient(earlyRequest, { ...assignment, assignedToEmail: "someone@school.example" }), false);
  assert.equal(assignmentMatchesQuestionRecipient({ ...earlyRequest, sentAt: null }, assignment), false);
  assert.equal(assignmentOwnsQuestionRequest({ ...earlyRequest, questionOnlyToken: null }, assignment), false);
  assert.equal(assignmentOwnsQuestionRequest({ ...request, assignmentId: "different-assignment" }, assignment), false);
});