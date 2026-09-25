import test from "node:test";
import assert from "node:assert/strict";
import { matchingAssignmentPortalToken, matchingQuestionPortalToken, parentPermissionError, recipientMatchesReportToken, resolveReportRole } from "./recipientPortalIdentity.ts";

const report = { caseId: "case-1", role: "teacher" as const, email: "Teacher@school.example" };

test("report access requires the same case, role and recipient email", () => {
  assert.equal(recipientMatchesReportToken(report, { caseId: "case-1", role: "teacher", email: " teacher@school.example " }), true);
  assert.equal(recipientMatchesReportToken(report, { caseId: "case-1", role: "parent", email: report.email }), false);
  assert.equal(recipientMatchesReportToken(report, { caseId: "case-2", role: "teacher", email: report.email }), false);
  assert.equal(recipientMatchesReportToken(report, { caseId: "case-1", role: "teacher", email: "other@school.example" }), false);
  assert.equal(recipientMatchesReportToken(report, { caseId: "case-1", role: "teacher", email: null }), false);
  assert.equal(recipientMatchesReportToken({ ...report, recipientName: "TEST PREVIEW (admin)" }, { caseId: "case-1", role: "teacher", email: report.email }), false);
});

test("reuse only a sent, standalone question link for the same recipient and audience", () => {
  const requests = [
    { sentAt: new Date(), assignmentId: null, questionOnlyToken: "original", audience: "teacher" as const, recipientEmail: "teacher@school.example" },
  ];
  assert.equal(matchingQuestionPortalToken(requests, "teacher", "Teacher@school.example"), "original");
  assert.equal(matchingQuestionPortalToken(requests, "parent", "teacher@school.example"), null);
  assert.equal(matchingQuestionPortalToken(requests, "teacher", "other@school.example"), null);
  assert.equal(matchingQuestionPortalToken([{ ...requests[0], sentAt: null }], "teacher", "teacher@school.example"), null);
  assert.equal(matchingQuestionPortalToken([{ ...requests[0], assignmentId: "another" }], "teacher", "teacher@school.example"), null);
});

test("reuse only a same-recipient form link for the matching role", () => {
  const assignments = [{ assignedToEmail: "Counselor@school.example", respondentType: "school_counselor", uniqueToken: "forms" }];
  assert.equal(matchingAssignmentPortalToken(assignments, "teacher", " counselor@school.example "), "forms");
  assert.equal(matchingAssignmentPortalToken(assignments, "parent", "counselor@school.example"), null);
  assert.equal(matchingAssignmentPortalToken(assignments, "teacher", "other@school.example"), null);
  assert.equal(resolveReportRole("school_counselor"), "teacher");
  assert.equal(resolveReportRole("boarding_staff"), "teacher");
  assert.equal(resolveReportRole("self"), null);
});

test("an old portal link cannot grant parent consent without code and a completed download", () => {
  const token = { accessCode: "123456", downloadedAt: null };
  assert.equal(parentPermissionError(token, undefined), "access_code_required");
  assert.equal(parentPermissionError(token, "123456"), "report_not_downloaded");
  assert.equal(parentPermissionError({ ...token, downloadedAt: new Date() }, "123456"), null);
});