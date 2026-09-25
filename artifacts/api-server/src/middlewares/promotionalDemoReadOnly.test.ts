import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { promotionalDemoReadOnly, PROMOTIONAL_DEMO_CASE_ID } from "./promotionalDemoReadOnly.ts";

function check(method: string, path: string, body?: unknown) {
  let passed = false;
  let status: number | undefined;
  const req = { method, path, body } as Request;
  const res = {
    status(code: number) { status = code; return this; },
    json() { return this; },
  } as unknown as Response;
  promotionalDemoReadOnly(req, res, (() => { passed = true; }) as NextFunction);
  return { passed, status };
}

test("only the exact Avery case DELETE reaches the admin-only route", () => {
  assert.deepEqual(check("DELETE", `/cases/${PROMOTIONAL_DEMO_CASE_ID}`), { passed: true, status: undefined });
  assert.deepEqual(check("DELETE", `/api/cases/${PROMOTIONAL_DEMO_CASE_ID}`), { passed: true, status: undefined });
  assert.deepEqual(check("PATCH", `/cases/${PROMOTIONAL_DEMO_CASE_ID}`), { passed: false, status: 403 });
  assert.deepEqual(check("DELETE", `/cases/${PROMOTIONAL_DEMO_CASE_ID}/assignments/one`), { passed: false, status: 403 });
  assert.deepEqual(check("POST", "/cases/other/advance", { caseId: PROMOTIONAL_DEMO_CASE_ID }), { passed: false, status: 403 });
  assert.deepEqual(check("DELETE", "/cases/another-demo"), { passed: true, status: undefined });
});