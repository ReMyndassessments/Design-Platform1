import test from "node:test";
import assert from "node:assert/strict";
import {
  BATTERY_TEST_TOKEN_TTL_SECONDS,
  createBatteryTestToken,
  verifyBatteryTestToken,
  validateBatteryTestPackage,
} from "./batteryTestInvitation.ts";

const secret = "unit-test-only-session-secret";
const claims = {
  caseId: "case-1",
  assignmentIds: ["parent-1"],
  fingerprint: "a".repeat(64),
  exp: 2_000_000_000,
};

test("assessment test tokens are HMAC signed, domain-separated two-part values", () => {
  const token = createBatteryTestToken(claims, secret);
  const changedToken = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.equal(token.split(".").length, 2);
  assert.deepEqual(verifyBatteryTestToken(token, secret, 1_999_999_000_000), claims);
  assert.equal(verifyBatteryTestToken(token, `${secret}-different`, 1_999_999_000_000), null);
  assert.equal(verifyBatteryTestToken(changedToken, secret, 1_999_999_000_000), null);
});

test("RPPI cannot be included in a questionnaire test package even when mislabeled as a parent or teacher form", () => {
  for (const respondentType of ["parent", "teacher", "examiner"]) {
    const rppi = { id: "rppi", toolId: "RPPI", respondentType, respondentLabel: "Examiner" };
    assert.equal(validateBatteryTestPackage([rppi], ["rppi"]), null);
  }
});

test("assessment test tokens reject expiry, excessive lifetime, malformed claims, and missing secrets", () => {
  const expired = createBatteryTestToken({ ...claims, exp: 1_900_000_000 }, secret);
  assert.equal(verifyBatteryTestToken(expired, secret, 1_900_000_000_000), null);
  const tooLong = createBatteryTestToken({
    ...claims,
    exp: 1_900_000_000 + BATTERY_TEST_TOKEN_TTL_SECONDS + 61,
  }, secret);
  assert.equal(verifyBatteryTestToken(tooLong, secret, 1_900_000_000_000), null);
  assert.throws(() => createBatteryTestToken(claims, ""), /SESSION_SECRET/);
  assert.throws(() => verifyBatteryTestToken("invalid", "", 1), /SESSION_SECRET/);
});

test("package validation accepts a complete parent or same-email teacher package", () => {
  const rows = [
    { id: "parent-1", toolId: "PHQ-9", respondentType: "parent", respondentLabel: "Parent", assignedToEmail: "parent@example.org" },
    { id: "parent-2", toolId: "GAD-7", respondentType: "parent", respondentLabel: "Parent Assessment Package", assignedToEmail: "parent@example.org" },
    { id: "teacher-1", toolId: "SDQ", respondentType: "teacher1", respondentLabel: "Teacher 1", assignedToEmail: "teacher@example.org" },
    { id: "teacher-2", toolId: "BRIEF", respondentType: "teacher2", respondentLabel: "Teacher 2", assignedToEmail: "teacher@example.org" },
  ];

  assert.equal(validateBatteryTestPackage(rows, ["parent-1", "parent-2"])?.category, "parent");
  assert.equal(validateBatteryTestPackage(rows, ["teacher-1", "teacher-2"])?.category, "teacher");
  assert.equal(validateBatteryTestPackage([
    rows[2],
    { ...rows[3], assignedToEmail: "TEACHER@example.org" },
  ], ["teacher-1", "teacher-2"]), null);
});

test("package validation rejects intake, mixed audiences/groups, split selection, duplicate, and foreign IDs", () => {
  const rows = [
    { id: "parent-1", toolId: "PHQ-9", respondentType: "parent", respondentLabel: "Parent", assignedToEmail: null },
    { id: "parent-2", toolId: "GAD-7", respondentType: "parent", respondentLabel: "Parent", assignedToEmail: null },
    { id: "teacher-1", toolId: "SDQ", respondentType: "teacher1", respondentLabel: "Teacher 1", assignedToEmail: null },
    { id: "teacher-2", toolId: "SDQ", respondentType: "teacher2", respondentLabel: "Teacher 2", assignedToEmail: null },
    { id: "intake", toolId: "INTAKE", respondentType: "parent", respondentLabel: "Parent", assignedToEmail: null },
    { id: "self", toolId: "PHQ-9", respondentType: "self", respondentLabel: "Student", assignedToEmail: null },
  ];

  assert.equal(validateBatteryTestPackage(rows, ["parent-1"]), null);
  assert.equal(validateBatteryTestPackage(rows, ["parent-1", "teacher-1"]), null);
  assert.equal(validateBatteryTestPackage(rows, ["parent-1", "parent-2", "intake"]), null);
  assert.equal(validateBatteryTestPackage(rows, ["parent-1", "parent-1"]), null);
  assert.equal(validateBatteryTestPackage(rows, ["not-in-case"]), null);
  assert.equal(validateBatteryTestPackage(rows, ["parent-1", "parent-2"])?.category, "parent");
});