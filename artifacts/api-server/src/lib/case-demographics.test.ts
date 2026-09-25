import assert from "node:assert/strict";
import test from "node:test";
import { ageOnDate, isValidDob } from "./case-demographics.ts";

test("age changes on the birthday, not at the start of the calendar year", () => {
  assert.equal(ageOnDate("2011-11-10", new Date("2026-09-25T12:00:00Z")), 14);
  assert.equal(ageOnDate("2011-11-10", new Date("2026-11-09T23:59:59Z")), 14);
  assert.equal(ageOnDate("2011-11-10", new Date("2026-11-10T00:00:00Z")), 15);
});

test("invalid birth dates are not accepted or converted into misleading ages", () => {
  assert.equal(isValidDob("2011-11-10"), true);
  assert.equal(isValidDob("2011.11.10"), false);
  assert.equal(isValidDob("2011-02-29"), false);
  assert.equal(ageOnDate("not-a-date"), null);
});