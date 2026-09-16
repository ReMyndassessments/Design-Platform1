import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { db } from "@workspace/db";
import raepaRouter from "../src/routes/raepa.ts";

type Query = { queryChunks?: unknown[] };
type ExecuteResult = { rows: any[] };
type ExecuteStub = (query: Query) => ExecuteResult | Promise<ExecuteResult>;

const CASE_ID = "case-synthetic-99";
const SAMPLE_ID = "sample-synthetic-99";
const TOKEN = "synthetic-token-99-abcdefghijklmnopqrstuvwxyz";
const AUTHORITY_ROLE = "assessment_invigilator";
const NON_LEAD_ROLE = "psychometrician";

function queryText(query: Query): string {
  return (query.queryChunks ?? []).map(chunk => {
    if (typeof chunk === "string") return chunk;
    if (chunk && typeof chunk === "object" && "value" in chunk) {
      const value = (chunk as { value?: unknown }).value;
      return Array.isArray(value) ? value.join("") : String(value ?? "");
    }
    return "";
  }).join("").trim().replace(/\s+/g, " ");
}

function queryValues(query: Query): unknown[] {
  return (query.queryChunks ?? []).flatMap(chunk => {
    if (typeof chunk === "string") return [];
    if (chunk && typeof chunk === "object" && "value" in chunk) return [];
    if (chunk && typeof chunk === "object" && "queryChunks" in chunk) return queryValues(chunk as Query);
    return [chunk];
  });
}

function routeHandler(path: string, method: string): (req: any, res: any) => unknown {
  const layer = (raepaRouter as any).stack.find((item: any) =>
    item.route?.path === path && item.route.methods?.[method.toLowerCase()]);
  assert.ok(layer, `route ${method.toUpperCase()} ${path} should exist`);
  // Route tests intentionally bypass authMiddleware. Authorization is supplied
  // directly on the synthetic request so the test can isolate route behavior.
  return layer.route.stack.at(-1).handle;
}

async function callRoute(
  path: string,
  method: string,
  request: Partial<{ params: any; query: any; body: any; userId: string; userRole: string; file: any; headers: Record<string, string> }> = {},
): Promise<{ statusCode: number; body: any }> {
  let statusCode = 200;
  let body: any;
  const response = {
    status(code: number) { statusCode = code; return response; },
    json(value: any) { body = value; return response; },
    send(value: any) { body = value; return response; },
  };
  const handler = routeHandler(path, method);
  await handler({
    params: {},
    query: {},
    body: {},
    userId: "professional-synthetic-99",
    userRole: "admin",
    get(name: string) {
      return request.headers?.[name.toLowerCase()] ?? request.headers?.[name] ?? undefined;
    },
    ...request,
  }, response);
  return { statusCode, body };
}

function installExecute(stub: ExecuteStub): { calls: Array<{ text: string; values: unknown[] }> } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  (db as any).execute = async (query: Query) => {
    calls.push({ text: queryText(query), values: queryValues(query) });
    return await stub(query);
  };
  (db as any).transaction = async (callback: (tx: any) => unknown) =>
    callback({
      execute: (query: Query) => (db as any).execute(query),
      select: (...args: any[]) => (db as any).select(...args),
      update: (...args: any[]) => (db as any).update(...args),
      insert: (...args: any[]) => (db as any).insert(...args),
    });
  (db as any).select = () => ({
    from: () => ({
      where: () => ({
        limit: async () => [],
      }),
    }),
  });
  (db as any).update = () => ({
    set: () => ({
      where: async () => [],
    }),
  });
  // Audit writes are deliberately irrelevant to these route contracts.
  (db as any).insert = () => ({ values: async () => [] });
  return { calls };
}

type TransactionTracker = { begun: number; committed: number; rolledBack: number };

function installAtomicExecute<T extends Record<string, any>>(
  state: T,
  stub: (query: Query, workingState: T) => ExecuteResult | Promise<ExecuteResult>,
): { calls: Array<{ text: string; values: unknown[] }>; transactions: TransactionTracker } {
  const calls: Array<{ text: string; values: unknown[] }> = [];
  const transactions: TransactionTracker = { begun: 0, committed: 0, rolledBack: 0 };
  const execute = async (query: Query, workingState: T) => {
    calls.push({ text: queryText(query), values: queryValues(query) });
    return await stub(query, workingState);
  };
  const replaceState = (target: T, source: T) => {
    for (const key of Object.keys(target)) delete (target as any)[key];
    Object.assign(target, structuredClone(source));
  };
  (db as any).execute = (query: Query) => execute(query, state);
  (db as any).transaction = async (callback: (tx: { execute: (query: Query) => Promise<ExecuteResult> }) => unknown) => {
    transactions.begun++;
    const before = structuredClone(state);
    const working = structuredClone(state);
    try {
      const result = await callback({ execute: query => execute(query, working) });
      replaceState(state, working);
      transactions.committed++;
      return result;
    } catch (error) {
      replaceState(state, before);
      transactions.rolledBack++;
      throw error;
    }
  };
  (db as any).select = () => ({
    from: () => ({
      where: () => ({
        limit: async () => [],
      }),
    }),
  });
  (db as any).update = () => ({
    set: () => ({
      where: async () => [],
    }),
  });
  (db as any).insert = () => ({ values: async () => [] });
  return { calls, transactions };
}

type HistoryState = {
  languages: Array<{ id: string; language: string }>;
  subjects: Array<{ id: string; subject: string; language: string }>;
  profileData: Record<string, unknown>;
  nextLanguage?: string;
  nextSubject?: { subject: string; language: string };
};

function installHistoryState(initial: Pick<HistoryState, "languages" | "subjects">): {
  state: HistoryState;
  calls: Array<{ text: string; values: unknown[] }>;
} {
  const state: HistoryState = {
    languages: structuredClone(initial.languages),
    subjects: structuredClone(initial.subjects),
    profileData: {},
  };
  let languageSequence = state.languages.length;
  let subjectSequence = state.subjects.length;
  const execute: ExecuteStub = async query => {
    const text = queryText(query);
    if (text.startsWith("DELETE FROM raepa_language_academic_history")) {
      state.languages = [];
      return { rows: [] };
    }
    if (text.startsWith("DELETE FROM raepa_subject_language_history")) {
      state.subjects = [];
      return { rows: [] };
    }
    if (text.startsWith("INSERT INTO raepa_language_academic_history")) {
      state.languages.push({
        id: `synthetic-language-${++languageSequence}`,
        language: state.nextLanguage ?? "unknown",
      });
      return { rows: [] };
    }
    if (text.startsWith("INSERT INTO raepa_subject_language_history")) {
      state.subjects.push({
        id: `synthetic-subject-${++subjectSequence}`,
        subject: state.nextSubject?.subject ?? "unknown",
        language: state.nextSubject?.language ?? "unknown",
      });
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_profiles SET data = data")) {
      state.profileData = { updated: true };
      return { rows: [] };
    }
    if (text.startsWith("SELECT * FROM raepa_language_academic_history WHERE id =")) {
      return { rows: state.languages.length ? [state.languages.at(-1)] : [] };
    }
    if (text.startsWith("SELECT * FROM raepa_subject_language_history WHERE id =")) {
      return { rows: state.subjects.length ? [state.subjects.at(-1)] : [] };
    }
    if (text.startsWith("SELECT * FROM raepa_language_academic_history WHERE case_id")) {
      return { rows: state.languages };
    }
    if (text.startsWith("SELECT * FROM raepa_subject_language_history WHERE case_id")) {
      return { rows: state.subjects };
    }
    if (text.startsWith("SELECT data FROM raepa_profiles")) {
      return { rows: [{ data: state.profileData }] };
    }
    return { rows: [] };
  };
  const setup = installExecute(execute);
  (db as any).transaction = async (callback: (tx: { execute: (query: Query) => Promise<ExecuteResult> }) => unknown) => {
    const snapshot = structuredClone(state);
    try {
      return await callback({ execute: query => (db as any).execute(query) });
    } catch (error) {
      state.languages = snapshot.languages;
      state.subjects = snapshot.subjects;
      state.profileData = snapshot.profileData;
      throw error;
    }
  };
  return { state, calls: setup.calls };
}

const originalDbMethods = {
  execute: (db as any).execute,
  transaction: (db as any).transaction,
  select: (db as any).select,
  update: (db as any).update,
  insert: (db as any).insert,
};

test.afterEach(() => {
  (db as any).execute = originalDbMethods.execute;
  (db as any).transaction = originalDbMethods.transaction;
  (db as any).select = originalDbMethods.select;
  (db as any).update = originalDbMethods.update;
  (db as any).insert = originalDbMethods.insert;
});

test("every evidence mutation route performs its write and invalidation in one transaction", () => {
  const source = fs.readFileSync("src/routes/raepa.ts", "utf8");
  const mutationRoutes = [
    ["post", '/cases/:caseId/raepa/session'],
    ["post", '/cases/:caseId/raepa/work-samples'],
    ["patch", '/cases/:caseId/raepa/work-samples/:sampleId'],
    ["delete", '/cases/:caseId/raepa/work-samples/:sampleId'],
    ["post", '/public/raepa/teacher/:token/upload'],
    ["post", '/public/raepa/student/:caseId/responses'],
    ["post", '/public/raepa/access/:token/intake'],
    ["put", '/cases/:caseId/raepa/profile'],
    ["post", '/cases/:caseId/raepa/language-history'],
    ["post", '/cases/:caseId/raepa/subject-language-history'],
    ["post", '/cases/:caseId/raepa/teacher-profile'],
    ["post", '/cases/:caseId/raepa/student-interview'],
    ["put", '/cases/:caseId/raepa/work-samples/:sampleId/analysis'],
    ["post", '/cases/:caseId/raepa/hypotheses'],
    ["patch", '/cases/:caseId/raepa/hypotheses/:hypothesisId'],
    ["post", '/cases/:caseId/raepa/assessment-plan'],
    ["post", '/cases/:caseId/raepa/assessment-tasks'],
    ["post", '/cases/:caseId/raepa/dynamic-trials'],
    ["post", '/cases/:caseId/raepa/concept-language'],
    ["post", '/cases/:caseId/raepa/recommendations'],
    ["post", '/cases/:caseId/raepa/domain-ratings'],
    ["post", '/cases/:caseId/raepa/language-functions'],
    ["post", '/cases/:caseId/raepa/module-scores'],
    ["put", '/cases/:caseId/raepa/v2/academic-history'],
    ["post", '/cases/:caseId/raepa/v2/evidence'],
    ["put", '/cases/:caseId/raepa/v2/work-samples/:sampleId/demand-map'],
    ["post", '/cases/:caseId/raepa/v2/hypotheses/:hypothesisId/review'],
    ["put", '/cases/:caseId/raepa/v2/plan'],
    ["post", '/cases/:caseId/raepa/v2/plan/approve'],
    ["post", '/cases/:caseId/raepa/v2/trials'],
  ];
  const gaps: string[] = [];
  for (const [method, path] of mutationRoutes) {
    const routePathIndex = source.indexOf(`router.${method}("${path}"`);
    const start = source.lastIndexOf("router.", routePathIndex);
    const end = source.indexOf("\nrouter.", start + 7);
    const block = source.slice(start, end < 0 ? source.length : end);
    if (!block.includes("db.transaction(async (tx")) gaps.push(`${path}: mutation is not wrapped in db.transaction`);
    if (!block.includes("invalidateRaepaEvidence")) gaps.push(`${path}: no centralized invalidation`);
    if (!/invalidateRaepaEvidence\([\s\S]*?,\s*tx\)/.test(block)) gaps.push(`${path}: invalidation does not use the mutation transaction`);
    if (/\bdb\.execute\(sql[\s\S]*?(?:INSERT|UPDATE|DELETE)/.test(block) && !block.includes("db.transaction(async (tx")) {
      gaps.push(`${path}: direct db.execute mutation is outside a transaction`);
    }
  }
  assert.deepEqual(gaps, [], `evidence mutation transaction gaps:\n${gaps.join("\n")}`);
});

function installFailingEvidenceTransaction(tokenScope: "student" | "teacher" = "student", failDuringInvalidation = true): {
  state: any;
  calls: Array<{ text: string; values: unknown[] }>;
  transactions: TransactionTracker;
} {
  const state = {
    evidenceRows: [] as Array<{ table: string; id: string }>,
    report: { status: "approved", qa_status: "passed", approved_by: "approved-professional" },
    profile: { review_status: "reviewed", reviewed_by: "approved-professional" },
    tokenScope,
    failDuringInvalidation,
  };
  const installed = installAtomicExecute(state, async (query, working) => {
    const text = queryText(query);
    if (text.startsWith("SELECT id, case_id, scope, expires_at FROM raepa_access_tokens")) {
      return { rows: [{ id: `${working.tokenScope}-token-99`, case_id: CASE_ID, scope: working.tokenScope, expires_at: "2099-01-01T00:00:00.000Z" }] };
    }
    if (text.startsWith("SELECT * FROM raepa_work_samples WHERE case_id") && text.includes("idempotency_key")) {
      return { rows: working.evidenceRows.filter((row: any) => row.table === "raepa_work_samples") };
    }
    if (text.startsWith("SELECT id, response_type, prompt_id")) {
      return { rows: working.evidenceRows.filter((row: any) => row.table === "raepa_student_responses") };
    }
    if (text.startsWith("SELECT id FROM raepa_sessions")) return { rows: [{ id: "session-atomic-99" }] };
    if (text.startsWith("SELECT id FROM raepa_profiles")) return { rows: [{ id: "profile-atomic-99" }] };
    if (text.startsWith("SELECT id FROM raepa_work_samples")) return { rows: [{ id: SAMPLE_ID }] };
    if (text.startsWith("SELECT id FROM raepa_module_scores")) return { rows: [] };
    if (text.startsWith("INSERT INTO")) {
      const table = text.match(/^INSERT INTO ([a-z_]+)/)?.[1] ?? "evidence";
      const row = { table, id: `evidence-${working.evidenceRows.length + 1}` };
      working.evidenceRows.push(row);
      return { rows: [row] };
    }
    if (text.startsWith("SELECT * FROM raepa_student_responses WHERE id")) {
      return { rows: working.evidenceRows.filter((row: any) => row.table === "raepa_student_responses") };
    }
    if (text.startsWith("SELECT * FROM raepa_dynamic_trials WHERE id")) {
      return { rows: working.evidenceRows.filter((row: any) => row.table === "raepa_dynamic_trials") };
    }
    if (text.startsWith("SELECT * FROM raepa_recommendations WHERE id")) {
      return { rows: working.evidenceRows.filter((row: any) => row.table === "raepa_recommendations") };
    }
    if (text.startsWith("SELECT * FROM raepa_module_scores WHERE id")) {
      return { rows: working.evidenceRows.filter((row: any) => row.table === "raepa_module_scores") };
    }
    if (text.startsWith("UPDATE raepa_profiles")) {
      working.profile = { review_status: "unreviewed", reviewed_by: null };
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_reports SET")) {
      if (working.failDuringInvalidation) throw new Error("synthetic invalidateRaepaEvidence failure");
      working.report = { status: "draft", qa_status: "not_run", approved_by: null };
      return { rows: [] };
    }
    return { rows: [] };
  });
  return { state, ...installed };
}

test("evidence writes roll back with approved report and profile state when invalidation fails", async () => {
  const mutations: Array<{ label: string; path: string; method: string; params?: any; query?: any; body?: any; headers?: Record<string, string> }> = [
    {
      label: "public student response",
      path: "/public/raepa/student/:caseId/responses",
      method: "post",
      query: { token: TOKEN },
      body: { responseType: "stimulus", promptId: "atomic-stimulus-99", originalLanguage: "Maren", originalResponse: "Atomic response" },
      headers: { "Idempotency-Key": "atomic-student-99" },
    },
    {
      label: "public teacher upload metadata",
      path: "/public/raepa/teacher/:token/upload",
      method: "post",
      params: { token: TOKEN },
      body: { title: "Atomic upload", classroom_access_profile: '{"independent":true}' },
      headers: { "Idempotency-Key": "atomic-teacher-99" },
    },
    {
      label: "canonical academic history",
      path: "/cases/:caseId/raepa/v2/academic-history",
      method: "put",
      body: { languages: [{ language: "Maren" }], subjects: [], parent_voice: "", student_voice: "", teacher_voice: "" },
    },
    {
      label: "canonical work sample",
      path: "/cases/:caseId/raepa/work-samples/:sampleId",
      method: "patch",
      params: { sampleId: SAMPLE_ID },
      body: { title: "Atomic work sample" },
    },
    {
      label: "professional result",
      path: "/cases/:caseId/raepa/module-scores",
      method: "post",
      body: { module_id: "atomic-module-99", administered: true, score: 3 },
    },
    {
      label: "professional trial",
      path: "/cases/:caseId/raepa/dynamic-trials",
      method: "post",
      body: { condition: "mediated", support_level: 2, support_provided: "Atomic support" },
    },
    {
      label: "professional recommendation",
      path: "/cases/:caseId/raepa/recommendations",
      method: "post",
      body: { category: "classroom", identified_need: "Atomic need", strategy: "Atomic strategy", evidence_refs: ["atomic-evidence-99"] },
    },
  ];
  for (const mutation of mutations) {
    const installed = installFailingEvidenceTransaction(mutation.label === "public teacher upload metadata" ? "teacher" : "student");
    let rejected = false;
    try {
      const response = await callRoute(mutation.path, mutation.method, {
        params: { caseId: CASE_ID, ...(mutation.params ?? {}) },
        query: mutation.query,
        body: mutation.body,
        headers: mutation.headers,
        userRole: AUTHORITY_ROLE,
      });
      assert.equal(response.statusCode, 500, `${mutation.label} should surface invalidation failure`);
    } catch {
      rejected = true;
    }
    assert.ok(rejected || mutation.label !== "public student response", `${mutation.label} should not silently succeed`);
    assert.equal(installed.transactions.begun, 1, `${mutation.label} should use one transaction (${installed.calls.map(call => call.text).join(" | ")})`);
    assert.equal(installed.transactions.committed, 0, `${mutation.label} must not commit`);
    assert.equal(installed.transactions.rolledBack, 1, `${mutation.label} must roll back`);
    assert.deepEqual(installed.state.evidenceRows, [], `${mutation.label} evidence write must roll back`);
    assert.deepEqual(installed.state.report, { status: "approved", qa_status: "passed", approved_by: "approved-professional" });
    assert.deepEqual(installed.state.profile, { review_status: "reviewed", reviewed_by: "approved-professional" });
    const invalidationIndex = installed.calls.findIndex(call => call.text.startsWith("UPDATE raepa_reports SET"));
    const writeIndex = installed.calls.findIndex(call =>
      /^(?:INSERT INTO|UPDATE) raepa_(?:student_responses|work_samples|language_academic_history|module_scores|dynamic_trials|recommendations|teacher_profiles)/.test(call.text));
    assert.ok(writeIndex >= 0 && writeIndex < invalidationIndex, `${mutation.label} must fail after its evidence write`);
  }
});

test("public student response and teacher upload retries are idempotent", async () => {
  const student = installFailingEvidenceTransaction("student", false);
  const studentRequest = {
    params: { caseId: CASE_ID },
    query: { token: TOKEN },
    headers: { "Idempotency-Key": "retry-student-99" },
    body: { responseType: "stimulus", promptId: "retry-stimulus-99", originalLanguage: "Maren", originalResponse: "Retry-safe response" },
  };
  const firstStudent = await callRoute("/public/raepa/student/:caseId/responses", "post", studentRequest);
  const secondStudent = await callRoute("/public/raepa/student/:caseId/responses", "post", studentRequest);
  assert.equal(firstStudent.statusCode, 201);
  assert.equal(secondStudent.statusCode, 200);
  assert.equal(secondStudent.body.duplicate, true);
  assert.deepEqual(secondStudent.body.response, firstStudent.body.response);
  assert.equal(student.state.evidenceRows.filter((row: any) => row.table === "raepa_student_responses").length, 1);
  assert.equal(student.calls.filter(call => call.text.startsWith("UPDATE raepa_reports SET")).length, 1);
  assert.equal(student.transactions.begun, 1);
  assert.equal(student.transactions.committed, 1);

  const teacher = installFailingEvidenceTransaction("teacher", false);
  const teacherRequest = {
    params: { token: TOKEN },
    headers: { "Idempotency-Key": "retry-teacher-99" },
    body: { title: "Retry-safe upload", classroom_access_profile: '{"independent":true}' },
  };
  const firstTeacher = await callRoute("/public/raepa/teacher/:token/upload", "post", teacherRequest);
  const secondTeacher = await callRoute("/public/raepa/teacher/:token/upload", "post", teacherRequest);
  assert.equal(firstTeacher.statusCode, 200);
  assert.equal(secondTeacher.statusCode, 200);
  assert.equal(secondTeacher.body.duplicate, true);
  assert.equal(secondTeacher.body.id, firstTeacher.body.id);
  assert.equal(teacher.state.evidenceRows.filter((row: any) => row.table === "raepa_work_samples").length, 1);
  assert.equal(teacher.state.evidenceRows.filter((row: any) => row.table === "raepa_teacher_profiles").length, 1);
  assert.equal(teacher.calls.filter(call => call.text.startsWith("UPDATE raepa_reports SET")).length, 1);
  assert.equal(teacher.transactions.begun, 1);
  assert.equal(teacher.transactions.committed, 1);
});

test("non-Assessment-Leads cannot mark work-sample demand analysis reviewed on either route", async () => {
  const canonical = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT id FROM raepa_work_samples")) return { rows: [{ id: SAMPLE_ID }] };
    if (text.startsWith("SELECT id FROM raepa_work_sample_analyses")) return { rows: [] };
    if (text.startsWith("SELECT * FROM raepa_work_sample_analyses")) return { rows: [{ id: "analysis-99", review_status: "unreviewed" }] };
    return { rows: [] };
  });
  const canonicalResponse = await callRoute(
    "/cases/:caseId/raepa/work-samples/:sampleId/analysis",
    "put",
    {
      params: { caseId: CASE_ID, sampleId: SAMPLE_ID },
      userRole: NON_LEAD_ROLE,
      body: { layer_vocabulary: {}, review_status: "reviewed" },
    },
  );
  assert.notEqual(canonicalResponse.body?.review_status, "reviewed");
  assert.ok(canonical.calls.every(call => !call.values.includes("reviewed")));

  const v2 = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT id FROM raepa_work_samples")) return { rows: [{ id: SAMPLE_ID }] };
    if (text.startsWith("SELECT id FROM raepa_work_sample_analyses")) return { rows: [{ id: "analysis-99" }] };
    return { rows: [] };
  });
  const v2Response = await callRoute(
    "/cases/:caseId/raepa/v2/work-samples/:sampleId/demand-map",
    "put",
    {
      params: { caseId: CASE_ID, sampleId: SAMPLE_ID },
      userRole: NON_LEAD_ROLE,
      body: { layers: { language: {}, task: {}, concept: {}, support: {} } },
    },
  );
  assert.equal(v2Response.statusCode, 403);
  assert.equal(v2.calls.filter(call => call.text.startsWith("INSERT INTO raepa_work_sample_analyses") || call.text.startsWith("UPDATE raepa_work_sample_analyses")).length, 0);
});

test("assessment_invigilator can reach RAEPA authority actions and approval gates", async () => {
  const profileSetup = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT id FROM raepa_profiles")) return { rows: [{ id: "profile-synthetic-99" }] };
    if (text.startsWith("SELECT * FROM raepa_profiles")) return { rows: [{ id: "profile-synthetic-99", review_status: "reviewed" }] };
    return { rows: [] };
  });
  const profileReview = await callRoute("/cases/:caseId/raepa/profile/review", "post", {
    params: { caseId: CASE_ID },
    userRole: AUTHORITY_ROLE,
    body: { decision: "approve" },
  });
  assert.equal(profileReview.statusCode, 200);
  assert.ok(profileSetup.calls.some(call => call.text.includes("UPDATE raepa_profiles") && call.text.includes("review_status")));

  installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT id FROM raepa_work_samples")) return { rows: [{ id: SAMPLE_ID }] };
    if (text.startsWith("SELECT id FROM raepa_work_sample_analyses")) return { rows: [{ id: "analysis-synthetic-99" }] };
    return { rows: [] };
  });
  const demandMapReview = await callRoute("/cases/:caseId/raepa/v2/work-samples/:sampleId/demand-map", "put", {
    params: { caseId: CASE_ID, sampleId: SAMPLE_ID },
    userRole: AUTHORITY_ROLE,
    body: { layers: { language: {}, task: {}, concept: {}, support: {} } },
  });
  assert.equal(demandMapReview.statusCode, 200);

  installExecute(async query => {
    if (queryText(query).startsWith("UPDATE raepa_hypotheses")) {
      return { rows: [{ id: "hypothesis-synthetic-99", status: "approved" }] };
    }
    return { rows: [] };
  });
  const hypothesisReview = await callRoute("/cases/:caseId/raepa/v2/hypotheses/:hypothesisId/review", "post", {
    params: { caseId: CASE_ID, hypothesisId: "hypothesis-synthetic-99" },
    userRole: AUTHORITY_ROLE,
    body: { decision: "approve" },
  });
  assert.equal(hypothesisReview.statusCode, 200);

  installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT reviewer_notes FROM raepa_assessment_plans")) {
      return { rows: [{ reviewer_notes: JSON.stringify({ goals: "Synthetic goal" }) }] };
    }
    if (text.startsWith("SELECT id, version FROM raepa_assessment_plans")) {
      return { rows: [{ id: "plan-synthetic-99", version: 1 }] };
    }
    if (text.startsWith("SELECT * FROM raepa_assessment_plans")) {
      return { rows: [{ id: "plan-synthetic-99", status: "approved", version: 1, reviewer_notes: JSON.stringify({ goals: "Synthetic goal" }) }] };
    }
    return { rows: [] };
  });
  const planApproval = await callRoute("/cases/:caseId/raepa/v2/plan/approve", "post", {
    params: { caseId: CASE_ID },
    userRole: AUTHORITY_ROLE,
    body: {},
  });
  assert.equal(planApproval.statusCode, 200);

  const report = {
    id: "report-authority-synthetic-99",
    version: 1,
    pathway: "standalone",
    generated_narrative: { standalone_text: "Synthetic report narrative." },
    edited_narrative: { standalone_text: "Synthetic report narrative." },
    source_evidence_refs: [],
    report_findings: [],
  };
  installExecute(async query => {
    if (queryText(query).startsWith("SELECT version, pathway, generated_narrative")) return { rows: [report] };
    return { rows: [] };
  });
  const reportApprovalGate = await callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
    params: { caseId: CASE_ID, reportId: report.id },
    userRole: AUTHORITY_ROLE,
  });
  assert.notEqual(reportApprovalGate.statusCode, 403);

  installExecute(async () => ({ rows: [] }));
  const tokenMint = await callRoute("/cases/:caseId/raepa/access-tokens", "post", {
    params: { caseId: CASE_ID },
    userRole: AUTHORITY_ROLE,
    body: { scope: "teacher", expires_hours: 24 },
  });
  assert.equal(tokenMint.statusCode, 201);
  assert.equal(tokenMint.body.scope, "teacher");
});

test("profile approval commits reviewed metadata and canonical QA passes intake_reviewed", async () => {
  const report = {
    id: "report-profile-review-99",
    version: 3,
    pathway: "standalone",
    generated_narrative: { standalone_text: "Synthetic profile review report narrative." },
    edited_narrative: { standalone_text: "Synthetic profile review report narrative." },
    source_evidence_refs: ["evidence:evidence-profile-review-99"],
    report_findings: [{
      id: "finding-profile-review-99",
      section_key: "report",
      narrative_text: "Synthetic profile review report narrative.",
      evidence_refs: ["evidence:evidence-profile-review-99"],
    }],
  };
  const state = {
    profile: {
      id: "profile-review-99",
      case_id: CASE_ID,
      review_status: "unreviewed",
      status: "in_progress",
      reviewed_by: null as string | null,
      reviewed_at: null as string | null,
      reviewer_note: null as string | null,
    },
    report: { ...report, status: "approved", qa_status: "passed" },
  };
  const setup = installAtomicExecute(state, async (query, working) => {
    const text = queryText(query);
    if (text.startsWith("SELECT id FROM raepa_profiles")) return { rows: [{ id: working.profile.id }] };
    if (text.startsWith("UPDATE raepa_profiles SET review_status")) {
      working.profile = {
        ...working.profile,
        review_status: "reviewed",
        status: "reviewed",
        reviewed_by: "professional-synthetic-99",
        reviewed_at: "synthetic-committed-time",
        reviewer_note: "Synthetic approval note",
      };
      return { rows: [working.profile] };
    }
    if (text.startsWith("UPDATE raepa_reports SET status = 'draft'")) {
      working.report = { ...working.report, status: "draft", qa_status: "not_run", approved_by: null };
      return { rows: [{ id: working.report.id }] };
    }
    if (text.startsWith("UPDATE reports SET")) return { rows: [] };
    if (text.startsWith("SELECT version, pathway, generated_narrative")) return { rows: [working.report] };
    if (text.startsWith("SELECT * FROM raepa_v2_evidence")) return { rows: [{ id: "evidence-profile-review-99" }] };
    if (text.startsWith("SELECT consent_obtained FROM cases")) return { rows: [{ consent_obtained: true }] };
    if (text.startsWith("SELECT review_status FROM raepa_profiles")) return { rows: [{ review_status: working.profile.review_status }] };
    if (text.startsWith("SELECT count(*) FILTER (WHERE status = 'approved')::int AS count FROM raepa_assessment_plans")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_module_scores")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_domain_ratings")) return { rows: [{ count: 0 }] };
    if (text.startsWith("SELECT (")) return { rows: [{ count: 1 }] };
    if (text.startsWith("UPDATE raepa_reports SET qa_status")) {
      working.report = { ...working.report, qa_status: "passed" };
      return { rows: [] };
    }
    return { rows: [] };
  });

  const review = await callRoute("/cases/:caseId/raepa/profile/review", "post", {
    params: { caseId: CASE_ID },
    userRole: AUTHORITY_ROLE,
    body: { decision: "approve", note: "Synthetic approval note" },
  });
  assert.equal(review.statusCode, 200, JSON.stringify(review.body));
  assert.equal(setup.transactions.begun, 1);
  assert.equal(setup.transactions.committed, 1);
  assert.equal(state.profile.review_status, "reviewed");
  assert.equal(state.profile.status, "reviewed");
  assert.equal(state.profile.reviewed_by, "professional-synthetic-99");
  assert.equal(state.profile.reviewer_note, "Synthetic approval note");
  assert.equal(setup.calls.filter(call => call.text.startsWith("UPDATE raepa_profiles")).length, 1);
  assert.ok(setup.calls.some(call => call.text.startsWith("UPDATE raepa_reports SET status = 'draft'")));
  assert.ok(!setup.calls.some(call => call.values.includes("unreviewed")));

  const qa = await callRoute("/cases/:caseId/raepa/qa", "post", {
    params: { caseId: CASE_ID },
    userRole: AUTHORITY_ROLE,
    body: { report_id: report.id },
  });
  assert.equal(qa.statusCode, 200, JSON.stringify(qa.body));
  assert.equal(qa.body.passed, true, JSON.stringify(qa.body));
  assert.equal(qa.body.checks.find((check: any) => check.key === "intake_reviewed")?.passed, true, JSON.stringify(qa.body.checks));
  assert.equal(state.profile.review_status, "reviewed");
  assert.equal(state.report.qa_status, "passed");
});

test("v2 academic-history validates the complete replacement before changing rows", async () => {
  const validRow = {
    language: "Maren",
    relationship: "home",
    years: "4",
    academic_use: "Used for science discussions",
    instruction_years: "3",
    confidence: "emerging",
    notes: "Synthetic family description",
  };
  const malformedSetup = installHistoryState({
    languages: [{ id: "prior-language", language: "Prior synthetic language" }],
    subjects: [{ id: "prior-subject", subject: "Prior subject", language: "Prior synthetic language" }],
  });
  malformedSetup.state.nextLanguage = validRow.language;
  const malformed = await callRoute(
    "/cases/:caseId/raepa/v2/academic-history",
    "put",
    {
      params: { caseId: CASE_ID },
      body: {
        languages: [validRow, { ...validRow, confidence: 99 }],
        parent_voice: "Synthetic parent voice",
        student_voice: "Synthetic student voice",
        teacher_voice: "Synthetic teacher voice",
      },
    },
  );
  assert.equal(malformed.statusCode, 400);
  assert.deepEqual(malformedSetup.state.languages, [{ id: "prior-language", language: "Prior synthetic language" }]);
  assert.deepEqual(malformedSetup.state.subjects, [{ id: "prior-subject", subject: "Prior subject", language: "Prior synthetic language" }]);
  assert.equal(malformedSetup.calls.filter(call => call.text.startsWith("DELETE FROM raepa_language_academic_history")).length, 0);
  assert.equal(malformedSetup.calls.filter(call => call.text.startsWith("INSERT INTO raepa_language_academic_history")).length, 0);

  const validSetup = installHistoryState({
    languages: [{ id: "prior-language", language: "Prior synthetic language" }],
    subjects: [{ id: "prior-subject", subject: "Prior subject", language: "Prior synthetic language" }],
  });
  validSetup.state.nextLanguage = validRow.language;
  validSetup.state.nextSubject = { subject: "Science", language: "Maren" };
  const valid = await callRoute(
    "/cases/:caseId/raepa/v2/academic-history",
    "put",
    {
      params: { caseId: CASE_ID },
      body: {
        languages: [validRow],
        subjects: [{ subject: "Science", language: "Maren", years: "2" }],
        parent_voice: "Synthetic parent voice",
        student_voice: "Synthetic student voice",
        teacher_voice: "Synthetic teacher voice",
      },
    },
  );
  assert.equal(valid.statusCode, 200);
  assert.deepEqual(valid.body.languages, [validRow]);
  assert.equal(validSetup.state.languages.length, 1);
  assert.deepEqual(validSetup.state.languages.map(row => row.language), ["Maren"]);
  assert.equal(validSetup.state.subjects.length, 1);
  assert.deepEqual(validSetup.state.subjects.map(row => [row.subject, row.language]), [["Science", "Maren"]]);
  assert.ok(validSetup.calls.some(call => call.text.includes("UPDATE raepa_profiles") && call.text.includes("data = data")));
});

test("canonical academic-history replacement preserves prior rows on malformed input and replaces on valid input", async () => {
  const malformedSetup = installHistoryState({
    languages: [{ id: "prior-language", language: "Prior synthetic language" }],
    subjects: [],
  });
  malformedSetup.state.nextLanguage = "Maren";
  const malformed = await callRoute(
    "/cases/:caseId/raepa/language-history",
    "post",
    {
      params: { caseId: CASE_ID },
      body: {
        languages: [
          { language: "Maren", proficiency: "emerging" },
          { language: 42 },
        ],
      },
    },
  );
  assert.equal(malformed.statusCode, 400);
  assert.deepEqual(malformedSetup.state.languages, [{ id: "prior-language", language: "Prior synthetic language" }]);

  const validSetup = installHistoryState({
    languages: [{ id: "prior-language", language: "Prior synthetic language" }],
    subjects: [],
  });
  validSetup.state.nextLanguage = "Maren";
  const valid = await callRoute(
    "/cases/:caseId/raepa/language-history",
    "post",
    {
      params: { caseId: CASE_ID },
      body: { languages: [{ language: "Maren", proficiency: "emerging" }] },
    },
  );
  assert.equal(valid.statusCode, 201);
  assert.equal(validSetup.state.languages.length, 1);
  assert.deepEqual(validSetup.state.languages.map(row => row.language), ["Maren"]);
});

test("all canonical intake and history mutations invalidate professional profile review", async () => {
  const mutations: Array<{ path: string; method: string; body: any }> = [
    { path: "/cases/:caseId/raepa/profile", method: "put", body: { data: { referral: "synthetic" } } },
    { path: "/cases/:caseId/raepa/language-history", method: "post", body: { languages: [{ language: "Maren" }] } },
    { path: "/cases/:caseId/raepa/subject-language-history", method: "post", body: { subject: "Science", language: "Maren" } },
    { path: "/cases/:caseId/raepa/teacher-profile", method: "post", body: { data: { access: "synthetic" } } },
    {
      path: "/cases/:caseId/raepa/student-interview",
      method: "post",
      body: { responses: [{ question_id: "q-synthetic", response_original: "Synthetic response" }] },
    },
    {
      path: "/cases/:caseId/raepa/v2/academic-history",
      method: "put",
      body: { languages: [{ language: "Maren" }], parent_voice: "Synthetic voice" },
    },
  ];

  for (const mutation of mutations) {
    const setup = installExecute(async () => ({ rows: [] }));
    const response = await callRoute(mutation.path, mutation.method, {
      params: { caseId: CASE_ID },
      body: mutation.body,
    });
    assert.ok(response.statusCode < 400, `${mutation.method} ${mutation.path} should accept synthetic mutation`);
    assert.ok(
      setup.calls.some(call => call.text.includes("UPDATE raepa_profiles") && call.text.includes("review_status")),
      `${mutation.method} ${mutation.path} should invalidate profile review`,
    );
  }
});

test("public teacher and student routes enforce scope, case binding, and expiry", async () => {
  let tokenState: "teacher" | "student" | "expired" = "teacher";
  let responseInserted = false;
  const setup = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT id, case_id, scope, expires_at FROM raepa_access_tokens")) {
      if (tokenState === "expired") return { rows: [] };
      return { rows: [{ id: "token-99", case_id: CASE_ID, scope: tokenState, expires_at: "2099-01-01T00:00:00.000Z" }] };
    }
    if (text.startsWith("SELECT id, response_type, prompt_id, prompt, original_language")) {
      return responseInserted
        ? { rows: [{ id: "response-99", response_type: "interview", prompt_id: "q-synthetic", original_language: "Maren", original_response: "Synthetic student response" }] }
        : { rows: [] };
    }
    if (text.startsWith("INSERT INTO raepa_work_samples")) return { rows: [{ id: "work-sample-99" }] };
    if (text.startsWith("INSERT INTO raepa_student_responses")) {
      responseInserted = true;
      return { rows: [{ id: "response-99", response_type: "interview", prompt_id: "q-synthetic", original_language: "Maren", original_response: "Synthetic student response" }] };
    }
    return { rows: [] };
  });

  tokenState = "student";
  const teacherWrongScope = await callRoute("/public/raepa/teacher/:token/upload", "post", {
    params: { token: TOKEN },
    body: { title: "Synthetic work sample" },
  });
  assert.equal(teacherWrongScope.statusCode, 404);

  tokenState = "teacher";
  const studentWrongScope = await callRoute("/public/raepa/student/:caseId/responses", "get", {
    params: { caseId: CASE_ID },
    query: { token: TOKEN },
  });
  assert.equal(studentWrongScope.statusCode, 404);

  tokenState = "student";
  const wrongCase = await callRoute("/public/raepa/student/:caseId/responses", "get", {
    params: { caseId: "other-synthetic-case" },
    query: { token: TOKEN },
  });
  assert.equal(wrongCase.statusCode, 404);

  tokenState = "expired";
  const expiredTeacher = await callRoute("/public/raepa/teacher/:token", "get", {
    params: { token: TOKEN },
  });
  assert.equal(expiredTeacher.statusCode, 404);
  assert.ok(setup.calls.some(call => call.text.includes("expires_at > NOW()")));

  tokenState = "teacher";
  const teacherMutation = await callRoute("/public/raepa/teacher/:token/upload", "post", {
    params: { token: TOKEN },
    body: { title: "Synthetic work sample" },
  });
  assert.equal(teacherMutation.statusCode, 200);
  assert.ok(setup.calls.some(call => call.text.includes("UPDATE raepa_profiles") && call.text.includes("review_status")));

  tokenState = "student";
  const studentMutation = await callRoute("/public/raepa/student/:caseId/responses", "post", {
    params: { caseId: CASE_ID },
    query: { token: TOKEN },
    body: {
      responseType: "interview",
      promptId: "q-synthetic",
      originalLanguage: "Maren",
      originalResponse: "Synthetic student response",
    },
  });
  assert.equal(studentMutation.statusCode, 201);
  assert.ok(setup.calls.some(call => call.text.includes("UPDATE raepa_profiles") && call.text.includes("review_status")));
});

test("repeated teacher-token retrieval preserves active records until explicit rotation or revocation", async () => {
  const activeTokens: Array<{ id: string; case_id: string; scope: string; expires_at: string; revoked_at?: string }> = [
    { id: "teacher-token-1", case_id: CASE_ID, scope: "teacher", expires_at: "2099-01-01T00:00:00.000Z" },
    { id: "teacher-token-2", case_id: CASE_ID, scope: "teacher", expires_at: "2099-01-01T00:00:00.000Z" },
  ];
  let publicTokenLookup = 0;
  const setup = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT id FROM raepa_sessions")) return { rows: [{ id: "session-synthetic-99" }] };
    if (text.startsWith("UPDATE raepa_access_tokens SET revoked_at = NOW()")) {
      for (const token of activeTokens) token.revoked_at = "synthetic-revoked";
      return { rows: [] };
    }
    if (text.startsWith("INSERT INTO raepa_access_tokens")) {
      activeTokens.push({
        id: `minted-teacher-token-${activeTokens.length + 1}`,
        case_id: CASE_ID,
        scope: "teacher",
        expires_at: "2099-01-01T00:00:00.000Z",
      });
      return { rows: [] };
    }
    if (text.startsWith("SELECT id, case_id, scope, expires_at FROM raepa_access_tokens")) {
      const record = activeTokens.filter(token => !token.revoked_at)[publicTokenLookup++];
      return { rows: record ? [record] : [] };
    }
    if (text.startsWith("UPDATE raepa_access_tokens SET revoked_at = COALESCE")) {
      const token = activeTokens.find(item => item.id === "minted-teacher-token-5");
      if (token) token.revoked_at = "synthetic-revoked";
      return { rows: token ? [token] : [] };
    }
    return { rows: [] };
  });

  const firstRetrieval = await callRoute("/cases/:caseId/raepa/teacher-token", "get", {
    params: { caseId: CASE_ID },
    userRole: AUTHORITY_ROLE,
  });
  const secondRetrieval = await callRoute("/cases/:caseId/raepa/teacher-token", "get", {
    params: { caseId: CASE_ID },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(firstRetrieval.statusCode, 200);
  assert.equal(secondRetrieval.statusCode, 200);
  assert.equal(setup.calls.filter(call => call.text.startsWith("UPDATE raepa_access_tokens SET revoked_at = NOW()")).length, 0);
  assert.equal(activeTokens.filter(token => !token.revoked_at).length, 4);
  assert.equal(activeTokens.find(token => token.id === "teacher-token-1")?.revoked_at, undefined);
  assert.equal(activeTokens.find(token => token.id === "teacher-token-2")?.revoked_at, undefined);

  const firstPreviouslyMinted = await callRoute("/public/raepa/teacher/:token", "get", {
    params: { token: "teacher-token-99-one-abcdefghijklmnopqrstuvwxyz" },
  });
  const secondPreviouslyMinted = await callRoute("/public/raepa/teacher/:token", "get", {
    params: { token: "teacher-token-99-two-abcdefghijklmnopqrstuvwxyz" },
  });
  assert.equal(firstPreviouslyMinted.statusCode, 200);
  assert.equal(secondPreviouslyMinted.statusCode, 200);

  const rotated = await callRoute("/cases/:caseId/raepa/access-tokens", "post", {
    params: { caseId: CASE_ID },
    userRole: AUTHORITY_ROLE,
    body: { scope: "teacher", expires_hours: 24, rotate: true },
  });
  assert.equal(rotated.statusCode, 201);
  assert.equal(setup.calls.filter(call => call.text.startsWith("UPDATE raepa_access_tokens SET revoked_at = NOW()")).length, 1);
  assert.equal(activeTokens.find(token => token.id === "teacher-token-1")?.revoked_at, "synthetic-revoked");
  assert.equal(activeTokens.find(token => token.id === "teacher-token-2")?.revoked_at, "synthetic-revoked");

  const revoked = await callRoute("/cases/:caseId/raepa/access-tokens/:tokenId/revoke", "post", {
    params: { caseId: CASE_ID, tokenId: "minted-teacher-token-5" },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(revoked.statusCode, 200);
  assert.equal(activeTokens.find(token => token.id === "minted-teacher-token-5")?.revoked_at, "synthetic-revoked");
});

test("public student stimulus submissions persist as stimulus responses, not interviews", async () => {
  const savedResponses: Array<{ id: string; response_type: string }> = [];
  const setup = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT id, case_id, scope, expires_at FROM raepa_access_tokens")) {
      return { rows: [{ id: "student-token-99", case_id: CASE_ID, scope: "student", expires_at: "2099-01-01T00:00:00.000Z" }] };
    }
    if (text.startsWith("INSERT INTO raepa_student_responses")) {
      savedResponses.push({ id: "response-stimulus-99", response_type: "stimulus" });
      return { rows: [] };
    }
    if (text.startsWith("SELECT id, response_type, prompt_id, prompt, original_language, original_response")) {
      return { rows: savedResponses.length ? [savedResponses.at(-1)] : [] };
    }
    return { rows: [] };
  });
  const response = await callRoute("/public/raepa/student/:caseId/responses", "post", {
    params: { caseId: CASE_ID },
    query: { token: TOKEN },
    body: {
      responseType: "stimulus",
      promptId: "stimulus-q-99",
      originalLanguage: "Maren",
      originalResponse: "Synthetic stimulus response",
    },
  });
  assert.equal(response.statusCode, 201);
  assert.equal(response.body.response.responseType, "stimulus");
  assert.deepEqual(savedResponses, [{ id: "response-stimulus-99", response_type: "stimulus" }]);
  assert.equal(setup.calls.filter(call => call.text.startsWith("INSERT INTO raepa_student_interviews")).length, 0);
});

function installInvalidationState(): {
  state: {
    raepaReport: any;
    legacyReport: any;
  };
  calls: Array<{ text: string; values: unknown[] }>;
} {
  const state = {
    raepaReport: {
      id: "report-invalidation-99",
      status: "approved",
      qa_status: "passed",
      professional_approved_by: "admin-synthetic-99",
      approved_by: "admin-synthetic-99",
      edited_narrative: { standalone_text: "Keep this report content." },
      admin_notes: "Keep this RAEPA admin note.",
    },
    legacyReport: {
      id: "legacy-report-invalidation-99",
      caseId: CASE_ID,
      status: "approved",
      domainAnalysis: "Unrelated admin content.\n\n--- Academic English Access & Performance ---\nCopied comprehensive section.\n--- End Academic English Access & Performance ---\n\nAnother unrelated section.",
      adminNotes: "Keep this legacy admin note.",
    },
  };
  let studentResponseInserted = false;
  const setup = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("UPDATE raepa_profiles")) return { rows: [] };
    if (text.startsWith("UPDATE raepa_reports SET")) {
      state.raepaReport = {
        ...state.raepaReport,
        status: "draft",
        qa_status: "not_run",
        professional_approved_by: null,
        approved_by: null,
      };
      return { rows: [] };
    }
    if (text.startsWith("UPDATE reports SET")) {
      state.legacyReport.domainAnalysis = "Unrelated admin content.\n\nAnother unrelated section.";
      state.legacyReport.status = "draft";
      return { rows: [{ id: state.legacyReport.id }] };
    }
    if (text.startsWith("SELECT id FROM raepa_profiles")) return { rows: [{ id: "profile-invalidation-99" }] };
    if (text.startsWith("SELECT id FROM raepa_sessions")) return { rows: [{ id: "session-invalidation-99" }] };
    if (text.startsWith("SELECT id FROM raepa_work_samples")) return { rows: [{ id: SAMPLE_ID }] };
    if (text.startsWith("SELECT id FROM raepa_work_sample_analyses")) return { rows: [{ id: "analysis-invalidation-99" }] };
    if (text.startsWith("UPDATE raepa_hypotheses")) return { rows: [{ id: "hypothesis-invalidation-99", status: "approved" }] };
    if (text.startsWith("SELECT reviewer_notes FROM raepa_assessment_plans")) {
      return { rows: [{ reviewer_notes: JSON.stringify({ goals: "Synthetic goal" }) }] };
    }
    if (text.startsWith("SELECT id, version FROM raepa_assessment_plans")) return { rows: [{ id: "plan-invalidation-99", version: 1 }] };
    if (text.startsWith("SELECT status FROM raepa_assessment_plans")) return { rows: [{ status: "approved" }] };
    if (text.startsWith("SELECT * FROM raepa_assessment_plans")) {
      return { rows: [{ id: "plan-invalidation-99", status: "approved", version: 1, reviewer_notes: JSON.stringify({ goals: "Synthetic goal" }) }] };
    }
    if (text.startsWith("SELECT id, case_id, scope, expires_at FROM raepa_access_tokens")) {
      return { rows: [{ id: "student-token-invalidation-99", case_id: CASE_ID, scope: "student", expires_at: "2099-01-01T00:00:00.000Z" }] };
    }
    if (text.startsWith("SELECT id, response_type, prompt_id, prompt, original_language")) {
      return studentResponseInserted
        ? { rows: [{ id: "response-invalidation-99", response_type: "stimulus", original_language: "Maren", original_response: "Synthetic response" }] }
        : { rows: [] };
    }
    if (text.startsWith("INSERT INTO raepa_student_responses")) {
      studentResponseInserted = true;
      return { rows: [{ id: "response-invalidation-99", response_type: "stimulus", original_language: "Maren", original_response: "Synthetic response" }] };
    }
    return { rows: [] };
  });
  (db as any).select = () => ({
    from: () => ({
      where: () => ({
        limit: async () => [state.legacyReport],
      }),
    }),
  });
  (db as any).update = () => ({
    set: (updates: any) => ({
      where: async () => {
        if (typeof updates.domainAnalysis === "string") state.legacyReport.domainAnalysis = updates.domainAnalysis;
        if (updates.status !== undefined) state.legacyReport.status = updates.status;
      },
    }),
  });
  return { state, calls: setup.calls };
}

test("centralized mutation invalidation resets approval and removes only copied comprehensive content", async () => {
  const mutations: Array<{ label: string; path: string; method: string; body?: any; query?: any; params?: any }> = [
    { label: "profile intake", path: "/cases/:caseId/raepa/profile", method: "put", body: { data: { referral: "changed" } } },
    { label: "academic history", path: "/cases/:caseId/raepa/v2/academic-history", method: "put", body: { languages: [{ language: "Maren" }] } },
    { label: "work sample", path: "/cases/:caseId/raepa/work-samples/:sampleId", method: "patch", params: { sampleId: SAMPLE_ID }, body: { title: "Changed synthetic sample" } },
    { label: "work sample analysis", path: "/cases/:caseId/raepa/work-samples/:sampleId/analysis", method: "put", params: { sampleId: SAMPLE_ID }, body: { layer_vocabulary: {} } },
    { label: "teacher profile", path: "/cases/:caseId/raepa/teacher-profile", method: "post", body: { data: { context: "changed" } } },
    { label: "student interview", path: "/cases/:caseId/raepa/student-interview", method: "post", body: { responses: [{ question_id: "q-invalidation-99", response_original: "Changed response" }] } },
    {
      label: "public student response",
      path: "/public/raepa/student/:caseId/responses",
      method: "post",
      query: { token: TOKEN },
      body: { responseType: "stimulus", promptId: "stimulus-invalidation-99", originalLanguage: "Maren", originalResponse: "Changed stimulus" },
    },
    { label: "hypothesis", path: "/cases/:caseId/raepa/v2/hypotheses/:hypothesisId/review", method: "post", params: { hypothesisId: "hypothesis-invalidation-99" }, body: { decision: "approve" } },
    { label: "assessment plan", path: "/cases/:caseId/raepa/v2/plan/approve", method: "post", body: {} },
    { label: "assessment task", path: "/cases/:caseId/raepa/assessment-tasks", method: "post", body: { plan_id: "plan-invalidation-99", task_type: "language-probe" } },
    { label: "module result", path: "/cases/:caseId/raepa/module-scores", method: "post", body: { module_id: "module-invalidation-99", administered: true, score: 3 } },
    { label: "dynamic trial", path: "/cases/:caseId/raepa/dynamic-trials", method: "post", body: { condition: "mediated", support_level: 2, support_provided: "Synthetic support" } },
    { label: "concept relationship", path: "/cases/:caseId/raepa/concept-language", method: "post", body: { classification: "evidence_mixed", narrative: "Synthetic concept relationship." } },
    { label: "recommendation", path: "/cases/:caseId/raepa/recommendations", method: "post", body: { category: "classroom", identified_need: "Synthetic need", strategy: "Synthetic strategy", evidence_refs: ["evidence-invalidation-99"] } },
    { label: "evidence", path: "/cases/:caseId/raepa/v2/evidence", method: "post", body: { source: "teacher", summary: "Synthetic evidence summary" } },
  ];

  for (const mutation of mutations) {
    const { state } = installInvalidationState();
    const response = await callRoute(mutation.path, mutation.method, {
      params: { caseId: CASE_ID, ...(mutation.params ?? {}) },
      query: mutation.query,
      body: mutation.body,
      userRole: AUTHORITY_ROLE,
    });
    assert.ok(response.statusCode < 400, `${mutation.label} should succeed: ${response.statusCode} ${JSON.stringify(response.body)}`);
    assert.equal(state.raepaReport.status, "draft", `${mutation.label} should reset RAEPA approval`);
    assert.equal(state.raepaReport.qa_status, "not_run", `${mutation.label} should reset RAEPA QA`);
    assert.equal(state.raepaReport.professional_approved_by, null, `${mutation.label} should clear professional approval`);
    assert.equal(state.raepaReport.approved_by, null, `${mutation.label} should clear approval`);
    assert.equal(state.raepaReport.edited_narrative.standalone_text, "Keep this report content.", `${mutation.label} should preserve report content`);
    assert.equal(state.raepaReport.admin_notes, "Keep this RAEPA admin note.", `${mutation.label} should preserve admin notes`);
    assert.equal(state.legacyReport.status, "draft", `${mutation.label} should invalidate copied report`);
    assert.ok(state.legacyReport.domainAnalysis.includes("Unrelated admin content."));
    assert.ok(state.legacyReport.domainAnalysis.includes("Another unrelated section."));
    assert.ok(!state.legacyReport.domainAnalysis.includes("Academic English Access & Performance"));
    assert.equal(state.legacyReport.adminNotes, "Keep this legacy admin note.", `${mutation.label} should preserve legacy admin notes`);
  }
});

function installPassingCanonicalQa(report: any): { calls: Array<{ text: string; values: unknown[] }> } {
  return installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT * FROM raepa_reports WHERE id")) return { rows: [report] };
    if (text.startsWith("SELECT version, pathway, generated_narrative")) return { rows: [report] };
    if (text.startsWith("SELECT * FROM raepa_v2_evidence")) return { rows: [{ id: "evidence-qa-99" }] };
    if (text.startsWith("SELECT consent_obtained FROM cases")) return { rows: [{ consent_obtained: true }] };
    if (text.startsWith("SELECT review_status FROM raepa_profiles")) return { rows: [{ review_status: "reviewed" }] };
    if (text.startsWith("SELECT count(*) FILTER (WHERE status = 'approved')::int AS count FROM raepa_assessment_plans")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_module_scores")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_domain_ratings")) return { rows: [{ count: 0 }] };
    if (text.startsWith("SELECT (")) return { rows: [{ count: 1 }] };
    if (text.startsWith("UPDATE raepa_reports SET status = 'approved'")) return { rows: [{ ...report, status: "approved" }] };
    return { rows: [] };
  });
}

test("corrected edited selected-pathway narrative can replace unsafe generated wording", async () => {
  const safeNarrative = "Synthetic standalone report narrative with enough detail.";
  const report = {
    id: "report-generated-unsafe-99",
    version: 4,
    pathway: "standalone",
    generated_narrative: { standalone_text: "The student has a diagnosis of language disorder." },
    edited_narrative: { standalone_text: safeNarrative },
    source_evidence_refs: ["evidence:evidence-qa-99"],
    report_findings: [{
      id: "finding-qa-99",
      section_key: "report",
      narrative_text: safeNarrative,
      evidence_refs: ["evidence:evidence-qa-99"],
    }],
  };
  const setup = installPassingCanonicalQa(report);
  const response = await callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
    params: { caseId: CASE_ID, reportId: report.id },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(response.statusCode, 200);
  assert.ok(response.body.status === "approved");
  assert.ok(setup.calls.some(call => call.text.startsWith("UPDATE raepa_reports SET status = 'approved'")));
});

test("unsafe wording in the edited selected pathway remains blocked", async () => {
  const unsafeNarrative = "The student has a diagnosis of language disorder.";
  const report = {
    id: "report-edited-unsafe-99",
    version: 4,
    pathway: "standalone",
    generated_narrative: { standalone_text: "Synthetic safe report narrative with enough detail." },
    edited_narrative: { standalone_text: unsafeNarrative },
    source_evidence_refs: ["evidence:evidence-qa-99"],
    report_findings: [{
      id: "finding-qa-99",
      section_key: "report",
      narrative_text: unsafeNarrative,
      evidence_refs: ["evidence:evidence-qa-99"],
    }],
  };
  const setup = installPassingCanonicalQa(report);
  const response = await callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
    params: { caseId: CASE_ID, reportId: report.id },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(response.statusCode, 422);
  assert.ok(response.body.checks.some((check: any) => check.key === "unsupported_diagnosis_safeguard" && check.passed === false));
  assert.equal(setup.calls.filter(call => call.text.startsWith("UPDATE raepa_reports SET status = 'approved'")).length, 0);
});

test("unselected pathway wording does not affect selected-pathway QA", async () => {
  const safeNarrative = "Synthetic standalone report narrative with enough detail.";
  const report = {
    id: "report-unselected-pathway-99",
    version: 4,
    pathway: "standalone",
    generated_narrative: { standalone_text: safeNarrative, comprehensive_text: "Synthetic safe comprehensive narrative." },
    edited_narrative: {
      standalone_text: safeNarrative,
      comprehensive_text: "The student has a diagnosis of language disorder.",
    },
    source_evidence_refs: ["evidence:evidence-qa-99"],
    report_findings: [{
      id: "finding-qa-99",
      section_key: "report",
      narrative_text: safeNarrative,
      evidence_refs: ["evidence:evidence-qa-99"],
    }],
  };
  const setup = installPassingCanonicalQa(report);
  const response = await callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
    params: { caseId: CASE_ID, reportId: report.id },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(response.statusCode, 200);
  assert.ok(setup.calls.some(call => call.text.startsWith("UPDATE raepa_reports SET status = 'approved'")));
});

test("legacy generation normalizes selected pathway shape and approval reads comprehensive text with markdown fallback", async () => {
  const generatedText = "Synthetic comprehensive report generated from canonical evidence.";
  const finding = {
    id: "finding-shape-99",
    section_key: "report",
    narrative_text: generatedText,
    evidence_refs: ["evidence:evidence-shape-99"],
  };
  let persistedReport: any = {
    id: "report-shape-99",
    version: 2,
    status: "draft",
    pathway: "standalone",
    generated_narrative: { markdown: "Prior synthetic markdown." },
    edited_narrative: { markdown: "Prior synthetic markdown." },
    source_evidence_refs: ["evidence:evidence-shape-99"],
    report_findings: [finding],
  };
  const setup = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT id FROM raepa_sessions")) return { rows: [{ id: "session-shape-99" }] };
    if (text.startsWith("SELECT language_background, pathway FROM raepa_sessions")) {
      return { rows: [{ language_background: {}, pathway: "comprehensive" }] };
    }
    if (text.startsWith("SELECT id, status, version, generated_narrative")) return { rows: [persistedReport] };
    if (text.startsWith("SELECT * FROM raepa_reports WHERE id")) return { rows: [persistedReport] };
    if (text.startsWith("SELECT version, pathway, generated_narrative")) return { rows: [persistedReport] };
    if (text.startsWith("SELECT * FROM raepa_v2_evidence")) return { rows: [{ id: "evidence-shape-99" }] };
    if (text.startsWith("SELECT consent_obtained FROM cases")) return { rows: [{ consent_obtained: true }] };
    if (text.startsWith("SELECT review_status FROM raepa_profiles")) return { rows: [{ review_status: "reviewed" }] };
    if (text.startsWith("SELECT count(*) FILTER (WHERE status = 'approved')::int AS count FROM raepa_assessment_plans")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_module_scores")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_domain_ratings")) return { rows: [{ count: 0 }] };
    if (text.startsWith("SELECT (")) return { rows: [{ count: 1 }] };
    if (text.startsWith("UPDATE raepa_reports SET generated_narrative")) {
      persistedReport = {
        ...persistedReport,
        status: "draft",
        pathway: "comprehensive",
        version: persistedReport.version + 1,
        generated_narrative: { ...persistedReport.generated_narrative, markdown: generatedText, comprehensive_text: generatedText },
        edited_narrative: { ...persistedReport.edited_narrative, markdown: generatedText, comprehensive_text: generatedText },
        report_findings: [finding],
      };
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_reports SET status = 'approved'")) {
      persistedReport = { ...persistedReport, status: "approved" };
      return { rows: [persistedReport] };
    }
    return { rows: [] };
  });

  const previousFetch = (globalThis as any).fetch;
  (globalThis as any).fetch = async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: generatedText } }] }),
  });
  try {
    const generated = await callRoute("/cases/:caseId/raepa/generate-report", "post", {
      params: { caseId: CASE_ID },
      userRole: AUTHORITY_ROLE,
    });
    assert.equal(generated.statusCode, 200, JSON.stringify(generated.body));
    assert.equal(persistedReport.pathway, "comprehensive");
    assert.equal(persistedReport.generated_narrative.comprehensive_text, generatedText);
    assert.equal(persistedReport.edited_narrative.comprehensive_text, generatedText);
    assert.equal(persistedReport.generated_narrative.markdown, generatedText);

    const approved = await callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
      params: { caseId: CASE_ID, reportId: persistedReport.id },
      userRole: AUTHORITY_ROLE,
    });
    assert.equal(approved.statusCode, 200, `${JSON.stringify(approved.body)} calls=${JSON.stringify(setup.calls.map(call => call.text).slice(-5))}`);
    assert.equal(approved.body.status, "approved");

    persistedReport = {
      ...persistedReport,
      status: "draft",
      pathway: "comprehensive",
      generated_narrative: { markdown: generatedText },
      edited_narrative: { markdown: generatedText },
      report_findings: [finding],
    };
    const legacyMarkdownApproval = await callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
      params: { caseId: CASE_ID, reportId: persistedReport.id },
      userRole: AUTHORITY_ROLE,
    });
    assert.equal(legacyMarkdownApproval.statusCode, 200, JSON.stringify(legacyMarkdownApproval.body));
    assert.equal(legacyMarkdownApproval.body.status, "approved");
  } finally {
    (globalThis as any).fetch = previousFetch;
  }
  assert.ok(setup.calls.some(call => call.text.startsWith("UPDATE raepa_reports SET generated_narrative")));
});

test("report approval is blocked by canonical QA failures and invalid evidence mappings", async () => {
  const report = {
    id: "report-synthetic-99",
    version: 3,
    pathway: "standalone",
    generated_narrative: { standalone_text: "Synthetic report narrative with enough text." },
    edited_narrative: { standalone_text: "Synthetic report narrative with enough text." },
    source_evidence_refs: [],
    report_findings: [],
  };
  const qaSetup = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT * FROM raepa_reports WHERE id")) return { rows: [report] };
    if (text.startsWith("SELECT version, pathway, generated_narrative")) return { rows: [report] };
    return { rows: [] };
  });
  const blocked = await callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
    params: { caseId: CASE_ID, reportId: report.id },
  });
  assert.equal(blocked.statusCode, 422);
  assert.ok(blocked.body.checks.some((check: any) => check.key === "consent_complete" && check.passed === false));
  assert.equal(qaSetup.calls.filter(call => call.text.startsWith("UPDATE raepa_reports SET status = 'approved'")).length, 0);

  const mappingSetup = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT * FROM raepa_reports WHERE case_id")) return { rows: [report] };
    return { rows: [] };
  });
  const mappingFailure = await callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", {
    params: { caseId: CASE_ID, reportId: report.id },
    body: {
      expected_version: report.version,
      decision: "approve",
      mode: "standalone",
      text: "A changed synthetic narrative that needs evidence mapping.",
      findings: [],
    },
  });
  assert.equal(mappingFailure.statusCode, 400);
  assert.match(mappingFailure.body.error, /evidence mapping|findings/i);
  assert.equal(mappingSetup.calls.filter(call => call.text.startsWith("UPDATE raepa_reports")).length, 0);
});

test("failed v2 approval leaves report narrative, status, and version unchanged", async () => {
  const narrative = "Synthetic report narrative with enough text.";
  const initialReport = {
    id: "report-synthetic-approval-99",
    version: 3,
    status: "draft",
    pathway: "standalone",
    generated_narrative: { standalone_text: narrative },
    edited_narrative: { standalone_text: narrative },
    source_evidence_refs: ["evidence:evidence-99"],
    report_findings: [{
      id: "finding-99",
      section_key: "report",
      narrative_text: narrative,
      evidence_refs: ["evidence:evidence-99"],
    }],
  };
  let persistedReport = structuredClone(initialReport);
  const setup = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT * FROM raepa_reports WHERE case_id")) return { rows: [persistedReport] };
    if (text.startsWith("SELECT id, version FROM raepa_reports")) return { rows: [{ id: persistedReport.id, version: persistedReport.version }] };
    if (text.startsWith("SELECT version, pathway, generated_narrative")) return { rows: [persistedReport] };
    if (text.startsWith("SELECT * FROM raepa_v2_evidence")) return { rows: [{ id: "evidence-99" }] };
    if (text.startsWith("SELECT (")) return { rows: [{ count: 1 }] };
    if (text.startsWith("UPDATE raepa_reports SET edited_narrative")) {
      persistedReport = {
        ...persistedReport,
        edited_narrative: { standalone_text: "Changed synthetic narrative." },
        status: "draft",
        version: persistedReport.version + 1,
      };
      return { rows: [persistedReport] };
    }
    return { rows: [] };
  });
  (db as any).transaction = async (callback: (tx: { execute: (query: Query) => Promise<ExecuteResult> }) => unknown) => {
    const snapshot = structuredClone(persistedReport);
    try {
      return await callback({ execute: query => (db as any).execute(query) });
    } catch (error) {
      persistedReport = snapshot;
      throw error;
    }
  };

  const response = await callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", {
    params: { caseId: CASE_ID, reportId: initialReport.id },
    body: {
      expected_version: initialReport.version,
      decision: "approve",
      mode: "standalone",
      text: narrative,
    },
  });
  assert.equal(response.statusCode, 422);
  assert.notEqual(response.statusCode, 409, "QA rejection is not an optimistic version conflict");
  assert.deepEqual(persistedReport, initialReport);
  assert.ok(setup.calls.some(call => call.text.startsWith("UPDATE raepa_reports SET edited_narrative")));
});

test("optimistic v2 report version conflicts return 409 with the current version", async () => {
  const report = {
    id: "report-synthetic-99",
    version: 8,
    pathway: "standalone",
    generated_narrative: { standalone_text: "Synthetic report narrative." },
    edited_narrative: { standalone_text: "Synthetic report narrative." },
    source_evidence_refs: [],
    report_findings: [],
  };
  installExecute(async query => {
    if (queryText(query).startsWith("SELECT * FROM raepa_reports")) return { rows: [report] };
    return { rows: [] };
  });
  const response = await callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", {
    params: { caseId: CASE_ID, reportId: report.id },
    body: {
      expected_version: 7,
      decision: "save",
      mode: "standalone",
      text: "Synthetic report narrative.",
    },
  });
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.current_version, 8);
  assert.equal(response.body.report.id, report.id);
});

test("v2 report mode switches use selected QA text, pathway shape, versions, and atomic comprehensive copy", async () => {
  const reportId = "report-mode-switch-99";
  const evidence = { id: "evidence-mode-switch-99", source: "teacher", summary: "Recorded mode-switch evidence." };
  const standaloneText = "Standalone narrative grounded in recorded evidence.";
  const generatedComprehensiveText = "Limited English indicates low academic ability.";
  const comprehensiveText = "Comprehensive narrative grounded in recorded evidence.";
  const finding = (text: string) => [{
    id: `finding-${text.slice(0, 10).toLowerCase().replace(/\W+/g, "-")}`,
    section_key: "report",
    narrative_text: text,
    evidence_refs: [`evidence:${evidence.id}`],
  }];
  const state: any = {
    report: {
      id: reportId, version: 1, status: "draft", qa_status: "not_run", pathway: "comprehensive",
      generated_narrative: { comprehensive_text: generatedComprehensiveText },
      edited_narrative: { comprehensive_text: generatedComprehensiveText },
      source_evidence_refs: [`evidence:${evidence.id}`],
      report_findings: finding(generatedComprehensiveText),
    },
    genericReport: {
      domainAnalysis: "Unrelated legacy content.\n\n--- Academic English Access & Performance ---\nStale comprehensive copy.\n--- End Academic English Access & Performance ---\n\nLegacy tail.",
      status: "approved",
    },
  };
  let nextMode: "standalone" | "comprehensive" = "standalone";
  let nextText = standaloneText;
  const qaPathways: string[] = [];
  const copyExecutors: string[] = [];
  const execute = async (query: Query, working: any, executor: "db" | "tx"): Promise<ExecuteResult> => {
    const text = queryText(query);
    if (text.startsWith("SELECT * FROM raepa_reports WHERE case_id")) return { rows: [structuredClone(working.report)] };
    if (text.startsWith("SELECT * FROM raepa_reports WHERE id")) return { rows: [structuredClone(working.report)] };
    if (text.startsWith("SELECT id, version FROM raepa_reports")) return { rows: [{ id: reportId, version: working.report.version }] };
    if (text.startsWith("SELECT version, pathway, generated_narrative")) {
      qaPathways.push(working.report.pathway);
      return { rows: [structuredClone(working.report)] };
    }
    if (text.startsWith("SELECT id, language_background, pathway")) {
      return { rows: [{ id: "session-mode-switch-99", language_background: {}, pathway: working.report.pathway }] };
    }
    if (text.startsWith("SELECT * FROM raepa_v2_evidence")) return { rows: [evidence] };
    if (text.startsWith("SELECT consent_obtained")) return { rows: [{ consent_obtained: true }] };
    if (text.startsWith("SELECT review_status FROM raepa_profiles")) return { rows: [{ review_status: "reviewed" }] };
    if (text.startsWith("SELECT count(*) FILTER (WHERE status = 'approved')::int AS count FROM raepa_assessment_plans")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_module_scores")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_domain_ratings")) return { rows: [{ count: 0 }] };
    if (text.startsWith("SELECT (")) return { rows: [{ count: 1 }] };
    if (text.startsWith("UPDATE raepa_reports SET edited_narrative")) {
      working.report = {
        ...working.report,
        edited_narrative: { ...working.report.edited_narrative, [`${nextMode}_text`]: nextText },
        pathway: nextMode,
        status: "draft",
        qa_status: "not_run",
        version: Number(working.report.version) + 1,
        report_findings: finding(nextText),
      };
      return { rows: [structuredClone(working.report)] };
    }
    if (text.startsWith("INSERT INTO raepa_qa_checks")) return { rows: [] };
    if (text.startsWith("UPDATE raepa_reports SET qa_status")) {
      working.report.qa_status = "passed";
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_reports SET status = 'approved'")) {
      working.report = { ...working.report, status: "approved", qa_status: "passed" };
      return { rows: [structuredClone(working.report)] };
    }
    return { rows: [] };
  };
  (db as any).execute = async (query: Query) => execute(query, state, "db");
  (db as any).transaction = async (callback: (tx: any) => unknown) => {
    const before = structuredClone(state);
    const working = structuredClone(state);
    const tx = {
      execute: (query: Query) => execute(query, working, "tx"),
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => [structuredClone(working.genericReport)] }),
        }),
      }),
      update: () => ({
        set: (updates: any) => ({
          where: async () => {
            copyExecutors.push("tx");
            working.genericReport = { ...working.genericReport, ...updates };
            return [];
          },
        }),
      }),
      insert: () => ({ values: async () => { copyExecutors.push("tx"); return []; } }),
    };
    try {
      const result = await callback(tx);
      Object.assign(state, structuredClone(working));
      return result;
    } catch (error) {
      Object.assign(state, before);
      throw error;
    }
  };
  (db as any).select = () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) });
  (db as any).update = () => ({ set: () => ({ where: async () => [] }) });
  (db as any).insert = () => ({ values: async () => [] });

  const staleStandaloneSave = await callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", {
    params: { caseId: CASE_ID, reportId },
    body: { expected_version: 0, decision: "save", mode: "standalone", text: standaloneText, findings: finding(standaloneText) },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(staleStandaloneSave.statusCode, 409);
  assert.equal(staleStandaloneSave.body.current_version, 1);

  const standaloneSave = await callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", {
    params: { caseId: CASE_ID, reportId },
    body: { expected_version: 1, decision: "save", mode: "standalone", text: standaloneText, findings: finding(standaloneText) },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(standaloneSave.statusCode, 200, JSON.stringify(standaloneSave.body));
  assert.equal(standaloneSave.body.pathway, "standalone");
  assert.equal(standaloneSave.body.version, 2);
  assert.equal(state.report.pathway, "standalone");
  assert.doesNotMatch(state.genericReport.domainAnalysis, /Academic English Access & Performance/);

  const standaloneApproval = await callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", {
    params: { caseId: CASE_ID, reportId },
    body: { expected_version: 2, decision: "approve", mode: "standalone", text: standaloneText, findings: finding(standaloneText) },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(standaloneApproval.statusCode, 200, JSON.stringify(standaloneApproval.body));
  assert.equal(standaloneApproval.body.pathway, "standalone");
  assert.equal(standaloneApproval.body.standalone_text, standaloneText);
  assert.equal(standaloneApproval.body.version, 3);
  assert.equal(state.report.pathway, "standalone");
  assert.doesNotMatch(state.genericReport.domainAnalysis, /Academic English Access & Performance/);
  assert.deepEqual(qaPathways, ["standalone"]);

  const staleComprehensiveSave = await callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", {
    params: { caseId: CASE_ID, reportId },
    body: { expected_version: 2, decision: "save", mode: "comprehensive", text: comprehensiveText, findings: finding(comprehensiveText) },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(staleComprehensiveSave.statusCode, 409);
  assert.equal(staleComprehensiveSave.body.current_version, 3);

  nextMode = "comprehensive";
  nextText = comprehensiveText;
  const comprehensiveSave = await callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", {
    params: { caseId: CASE_ID, reportId },
    body: { expected_version: 3, decision: "save", mode: "comprehensive", text: comprehensiveText, findings: finding(comprehensiveText) },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(comprehensiveSave.statusCode, 200, JSON.stringify(comprehensiveSave.body));
  assert.equal(comprehensiveSave.body.pathway, "comprehensive");
  assert.equal(comprehensiveSave.body.version, 4);

  const comprehensiveApproval = await callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", {
    params: { caseId: CASE_ID, reportId },
    body: { expected_version: 4, decision: "approve", mode: "comprehensive", text: comprehensiveText, findings: finding(comprehensiveText) },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(comprehensiveApproval.statusCode, 200, JSON.stringify(comprehensiveApproval.body));
  assert.equal(comprehensiveApproval.body.pathway, "comprehensive");
  assert.equal(comprehensiveApproval.body.comprehensive_text, comprehensiveText);
  assert.equal(comprehensiveApproval.body.version, 5);
  assert.equal(state.report.pathway, "comprehensive");
  assert.match(state.genericReport.domainAnalysis, /Academic English Access & Performance/);
  assert.match(state.genericReport.domainAnalysis, new RegExp(comprehensiveText));
  assert.deepEqual(qaPathways, ["standalone", "comprehensive"]);
  assert.deepEqual(copyExecutors, ["tx", "tx"]);
});

test("legacy professional approval serializes with concurrent evidence invalidation", { concurrency: false }, async () => {
  const narrative = "Synthetic concurrency report narrative grounded in recorded evidence.";
  const reportId = "report-concurrency-99";
  const evidence = { id: "evidence-concurrency-99", source: "teacher", summary: "Recorded concurrency evidence." };
  const state: any = {
    report: {
      id: reportId,
      case_id: CASE_ID,
      version: 7,
      status: "draft",
      qa_status: "not_run",
      pathway: "standalone",
      generated_narrative: { standalone_text: narrative },
      edited_narrative: { standalone_text: narrative },
      source_evidence_refs: ["evidence:evidence-concurrency-99"],
      report_findings: [{
        id: "finding-concurrency-99",
        section_key: "report",
        narrative_text: narrative,
        evidence_refs: ["evidence:evidence-concurrency-99"],
      }],
      professional_approved_by: null,
      approved_by: null,
    },
    evidenceRows: [evidence],
  };
  const calls: Array<{ text: string; executor: "db" | "tx" }> = [];
  let barrierArmed = true;
  let reportLockHeld = false;
  const workingKinds = new WeakMap<object, "approval" | "mutation">();
  let qaReachedResolve!: () => void;
  let mutationWriteResolve!: () => void;
  let releaseApprovalResolve!: () => void;
  const qaReached = new Promise<void>(resolve => { qaReachedResolve = resolve; });
  const mutationWriteReached = new Promise<void>(resolve => { mutationWriteResolve = resolve; });
  const releaseApproval = new Promise<void>(resolve => { releaseApprovalResolve = resolve; });

  const execute = async (query: Query, working: any, executor: "db" | "tx"): Promise<ExecuteResult> => {
    const text = queryText(query);
    calls.push({ text, executor });
    if (text.startsWith("SELECT * FROM raepa_reports WHERE id") && text.includes("FOR UPDATE")) {
      if (barrierArmed) {
        barrierArmed = false;
        workingKinds.set(working, "approval");
        reportLockHeld = true;
      }
      return { rows: [structuredClone(working.report)] };
    }
    if (text.startsWith("SELECT version, pathway, generated_narrative")) return { rows: [structuredClone(working.report)] };
    if (text.startsWith("SELECT id, language_background, pathway")) return { rows: [{ id: "session-concurrency-99", pathway: "standalone", language_background: {} }] };
    if (text.startsWith("SELECT * FROM raepa_v2_evidence")) return { rows: structuredClone(working.evidenceRows) };
    if (text.startsWith("SELECT * FROM raepa_profiles")) return { rows: [{ id: "profile-concurrency-99", review_status: "reviewed" }] };
    if (text.startsWith("SELECT consent_obtained FROM cases")) return { rows: [{ consent_obtained: true }] };
    if (text.startsWith("SELECT review_status FROM raepa_profiles")) return { rows: [{ review_status: "reviewed" }] };
    if (text.startsWith("SELECT count(*) FILTER (WHERE status = 'approved')::int AS count FROM raepa_assessment_plans")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_module_scores")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_domain_ratings")) return { rows: [{ count: 0 }] };
    if (text.startsWith("SELECT (")) return { rows: [{ count: 1 }] };
    if (text.startsWith("INSERT INTO raepa_v2_evidence")) {
      workingKinds.set(working, "mutation");
      const row = { ...evidence, id: "evidence-concurrency-new-99" };
      working.evidenceRows.push(row);
      mutationWriteResolve();
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_reports SET qa_status")) {
      working.report.qa_status = "passed";
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_reports SET status = 'approved'")) {
      // This is the barrier after canonical QA has fully completed and while
      // the legacy transaction still holds the report-row lock.
      if (barrierArmed === false && workingKinds.get(working) === "approval" && reportLockHeld) {
        qaReachedResolve();
        await releaseApproval;
      }
      working.report = {
        ...working.report,
        status: "approved",
        qa_status: "passed",
        version: Number(working.report.version) + 1,
        professional_approved_by: "professional-synthetic-99",
        approved_by: "professional-synthetic-99",
      };
      return { rows: [structuredClone(working.report)] };
    }
    if (text.startsWith("UPDATE raepa_profiles")) {
      working.profile = { review_status: "unreviewed" };
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_reports SET status = 'draft'")) {
      // PostgreSQL waits on the approval's report-row lock, then evaluates
      // version = version + 1 against the now-committed row.
      if (reportLockHeld) await releaseApproval;
      working.report = {
        ...structuredClone(state.report),
        status: "draft",
        qa_status: "not_run",
        professional_approved_by: null,
        approved_by: null,
        version: Number(state.report.version) + 1,
      };
      return { rows: [{ id: reportId }] };
    }
    if (text.startsWith("SELECT * FROM raepa_v2_evidence WHERE id")) {
      return { rows: [working.evidenceRows.at(-1)] };
    }
    if (text.startsWith("SELECT version FROM raepa_reports WHERE id")) {
      return { rows: [{ version: state.report.version }] };
    }
    if (text.startsWith("INSERT INTO raepa_qa_checks")) return { rows: [] };
    return { rows: [] };
  };

  (db as any).execute = async (query: Query) => execute(query, state, "db");
  (db as any).transaction = async (callback: (tx: any) => unknown) => {
    const before = structuredClone(state);
    const working = structuredClone(state);
    let kind: "approval" | "mutation" | null = null;
    workingKinds.set(working, "approval");
    const tx = { execute: (query: Query) => execute(query, working, "tx") };
    try {
      const result = await callback(tx);
      kind = workingKinds.get(working) ?? null;
      Object.assign(state, structuredClone(working));
      if (kind === "approval") reportLockHeld = false;
      return result;
    } catch (error) {
      Object.assign(state, before);
      if (workingKinds.get(working) === "approval") reportLockHeld = false;
      throw error;
    }
  };
  (db as any).select = () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) });
  (db as any).update = () => ({ set: () => ({ where: async () => [] }) });
  (db as any).insert = () => ({ values: async () => [] });

  const approvalPromise = callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
    params: { caseId: CASE_ID, reportId },
    body: { expected_version: 7 },
    userRole: AUTHORITY_ROLE,
  });
  await qaReached;
  const mutationPromise = callRoute("/cases/:caseId/raepa/v2/evidence", "post", {
    params: { caseId: CASE_ID },
    body: { source: "teacher", summary: "Concurrent evidence mutation." },
    userRole: AUTHORITY_ROLE,
  });
  await mutationWriteReached;
  releaseApprovalResolve();
  const [approval, mutation] = await Promise.all([approvalPromise, mutationPromise]);

  assert.equal(approval.statusCode, 200, JSON.stringify(approval.body));
  assert.equal(approval.body.status, "approved");
  assert.equal(mutation.statusCode, 201, JSON.stringify(mutation.body));
  assert.equal(state.report.status, "draft", "invalidation must win after the approval commits");
  assert.equal(state.report.qa_status, "not_run");
  assert.equal(state.report.professional_approved_by, null);
  assert.equal(state.report.approved_by, null);
  assert.equal(state.report.version, 9, "approval and invalidation must each increment version atomically");
  assert.equal(state.evidenceRows.length, 2);
  assert.ok(calls.some(call => call.text.includes("FOR UPDATE")));
  assert.ok(calls.some(call => call.text.startsWith("UPDATE raepa_reports SET status = 'approved'") &&
    call.text.includes("version = version + 1") && call.text.includes("AND version =")));
  const qaEvidenceReads = calls.filter(call => call.text.startsWith("SELECT * FROM raepa_v2_evidence"));
  assert.ok(qaEvidenceReads.length > 0);
  assert.ok(qaEvidenceReads.every(call => call.executor === "tx"), "canonical QA evidence reads must use approval transaction");

  const stale = await callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
    params: { caseId: CASE_ID, reportId },
    body: { expected_version: 7 },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(stale.statusCode, 409);
  assert.equal(stale.body.current_version, 9);
  assert.equal(state.report.status, "draft");
});

test("legacy QA failure rolls back the approval transaction", { concurrency: false }, async () => {
  const narrative = "Synthetic report narrative that fails canonical quality assurance.";
  const initialReport = {
    id: "report-legacy-qa-failure-99",
    version: 4,
    status: "draft",
    qa_status: "not_run",
    pathway: "standalone",
    generated_narrative: { standalone_text: narrative },
    edited_narrative: { standalone_text: narrative },
    source_evidence_refs: [],
    report_findings: [],
    professional_approved_by: null,
    approved_by: null,
  };
  const state = { report: structuredClone(initialReport), qaWrites: 0 };
  const setup = installAtomicExecute(state, async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT * FROM raepa_reports WHERE id")) return { rows: [state.report] };
    if (text.startsWith("SELECT version, pathway, generated_narrative")) return { rows: [state.report] };
    if (text.startsWith("INSERT INTO raepa_qa_checks")) { state.qaWrites++; return { rows: [] }; }
    return { rows: [] };
  });
  const blocked = await callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
    params: { caseId: CASE_ID, reportId: initialReport.id },
    body: { expected_version: initialReport.version },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(blocked.statusCode, 422);
  assert.ok(blocked.body.checks.some((check: any) => check.passed === false));
  assert.deepEqual(state.report, initialReport);
  assert.equal(setup.transactions.committed, 0);
  assert.equal(setup.transactions.rolledBack, 1);
  assert.equal(setup.calls.filter(call => call.text.startsWith("UPDATE raepa_reports SET status = 'approved'")).length, 0);
});

test("legacy approval keeps canonical QA and comprehensive copy on transaction executors", () => {
  const source = fs.readFileSync("src/routes/raepa.ts", "utf8");
  const qaStart = source.indexOf("async function recomputeCanonicalQa");
  const qaEnd = source.indexOf('\nrouter.post("/cases/:caseId/raepa/qa"', qaStart);
  const qaBlock = source.slice(qaStart, qaEnd);
  assert.ok(qaStart >= 0 && qaEnd > qaStart);
  assert.match(qaBlock, /buildCanonicalEvidenceBundle\(caseId, executor\)/);
  assert.doesNotMatch(qaBlock, /\bdb\.execute\(/);
  const copyStart = source.indexOf("async function persistApprovedComprehensiveSection");
  const copyEnd = source.indexOf('\nrouter.post("/cases/:caseId/raepa/access-tokens"', copyStart);
  const copyBlock = source.slice(copyStart, copyEnd);
  assert.match(copyBlock, /executor\.select\(\)/);
  assert.match(copyBlock, /executor\.update\(/);
  assert.match(copyBlock, /executor\.insert\(/);
  const approvalStart = source.indexOf('router.post("/cases/:caseId/raepa/report/:reportId/professional-approve"');
  const approvalEnd = source.indexOf('\nrouter.', approvalStart + 8);
  const approvalBlock = source.slice(approvalStart, approvalEnd);
  assert.match(approvalBlock, /FOR UPDATE/);
  assert.match(approvalBlock, /version = version \+ 1/);
  assert.match(approvalBlock, /version = \$\{currentVersion\}/);
  assert.match(approvalBlock, /persistApprovedComprehensiveSection\([\s\S]*?, tx\)/);
});

test("UI profile review refreshes the report version before approval without recursive profile review", () => {
  const source = fs.readFileSync("../raos/src/pages/cases/[id]/raepa.tsx", "utf8");
  const profileStart = source.indexOf("const reviewProfile = useCallback");
  const profileEnd = source.indexOf("\n  const markProfileReviewed", profileStart);
  const profileBlock = source.slice(profileStart, profileEnd);
  assert.match(profileBlock, /await refetchV2Report\(\)/);
  assert.match(profileBlock, /setV2Report\(currentReport\)/);
  assert.match(profileBlock, /setV2ReportDraft\(currentText\)/);
  assert.match(profileBlock, /setReportFindingsDraft\(/);
  assert.ok(profileBlock.indexOf("await refetchV2Report()") > profileBlock.indexOf("await api("));

  const approvalStart = source.indexOf("const reviewV2Report = useCallback");
  const approvalEnd = source.indexOf("\n  // ── Computed values", approvalStart);
  const approvalBlock = source.slice(approvalStart, approvalEnd);
  assert.doesNotMatch(approvalBlock, /\breviewProfile\s*\(/);
  assert.match(approvalBlock, /const expectedVersion = v2Report\.version \?\? v2ReportSaved\?\.version/);
  assert.match(approvalBlock, /expected_version: expectedVersion/);
  assert.match(approvalBlock, /await refetchV2Report\(\)/, "conflicts refresh once instead of retrying approval recursively");
});

function installV2ComprehensiveConcurrencyHarness(options: {
  pauseAfterCopy?: boolean;
  failCopy?: boolean;
} = {}): {
  state: any;
  calls: Array<{ text: string; executor: "db" | "tx" }>;
  copyExecutors: string[];
  copyReached: Promise<void>;
  mutationWriteReached: Promise<void>;
  releaseCopy: () => void;
} {
  const reportId = "report-v2-comprehensive-concurrency-99";
  const narrative = "Synthetic comprehensive report narrative grounded in recorded evidence.";
  const evidence = { id: "evidence-v2-comprehensive-99", source: "teacher", summary: "Recorded comprehensive evidence." };
  const state: any = {
    report: {
      id: reportId, case_id: CASE_ID, version: 7, status: "draft", qa_status: "not_run",
      pathway: "comprehensive",
      generated_narrative: { comprehensive_text: narrative },
      edited_narrative: { comprehensive_text: narrative },
      source_evidence_refs: ["evidence:evidence-v2-comprehensive-99"],
      report_findings: [{
        id: "finding-v2-comprehensive-99", section_key: "report", narrative_text: narrative,
        evidence_refs: ["evidence:evidence-v2-comprehensive-99"],
      }],
      professional_approved_by: null, approved_by: null,
    },
    evidenceRows: [evidence],
    genericReport: {
      domainAnalysis: "Unrelated legacy content.\n\n--- Academic English Access & Performance ---\nOld copied section.\n--- End Academic English Access & Performance ---\n\nLegacy tail.",
      status: "approved",
    },
  };
  const calls: Array<{ text: string; executor: "db" | "tx" }> = [];
  const copyExecutors: string[] = [];
  const workingKinds = new WeakMap<object, "approval" | "mutation">();
  let reportLockHeld = false;
  let barrierArmed = options.pauseAfterCopy === true;
  let copyReachedResolve!: () => void;
  let mutationWriteResolve!: () => void;
  let releaseCopyResolve!: () => void;
  let approvalCommitResolve!: () => void;
  const copyReached = new Promise<void>(resolve => { copyReachedResolve = resolve; });
  const mutationWriteReached = new Promise<void>(resolve => { mutationWriteResolve = resolve; });
  const copyRelease = options.pauseAfterCopy ? new Promise<void>(resolve => { releaseCopyResolve = resolve; }) : Promise.resolve();
  const approvalCommitted = new Promise<void>(resolve => { approvalCommitResolve = resolve; });
  if (!options.pauseAfterCopy) releaseCopyResolve = () => {};

  const execute = async (query: Query, working: any, executor: "db" | "tx"): Promise<ExecuteResult> => {
    const text = queryText(query);
    calls.push({ text, executor });
    if (text.startsWith("SELECT * FROM raepa_reports WHERE case_id")) return { rows: [structuredClone(working.report)] };
    if (text.startsWith("SELECT id, version FROM raepa_reports")) {
      workingKinds.set(working, "approval");
      reportLockHeld = true;
      return { rows: [{ id: reportId, version: working.report.version }] };
    }
    if (text.startsWith("SELECT version, pathway, generated_narrative")) return { rows: [structuredClone(working.report)] };
    if (text.startsWith("SELECT id, language_background, pathway")) return { rows: [{ id: "session-v2-comprehensive-99", pathway: "comprehensive", language_background: {} }] };
    if (text.startsWith("SELECT * FROM raepa_v2_evidence")) return { rows: structuredClone(working.evidenceRows) };
    if (text.startsWith("SELECT * FROM raepa_profiles")) return { rows: [{ id: "profile-v2-comprehensive-99", review_status: "reviewed" }] };
    if (text.startsWith("SELECT consent_obtained FROM cases")) return { rows: [{ consent_obtained: true }] };
    if (text.startsWith("SELECT review_status FROM raepa_profiles")) return { rows: [{ review_status: "reviewed" }] };
    if (text.startsWith("SELECT count(*) FILTER (WHERE status = 'approved')::int AS count FROM raepa_assessment_plans")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_module_scores")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_domain_ratings")) return { rows: [{ count: 0 }] };
    if (text.startsWith("SELECT (")) return { rows: [{ count: 1 }] };
    if (text.startsWith("INSERT INTO raepa_v2_evidence")) {
      workingKinds.set(working, "mutation");
      working.evidenceRows.push({ ...evidence, id: "evidence-v2-comprehensive-new-99" });
      mutationWriteResolve();
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_reports SET edited_narrative")) {
      working.report = { ...working.report, status: "draft", qa_status: "not_run", version: Number(working.report.version) + 1 };
      return { rows: [structuredClone(working.report)] };
    }
    if (text.startsWith("INSERT INTO raepa_qa_checks")) return { rows: [] };
    if (text.startsWith("UPDATE raepa_reports SET qa_status")) {
      working.report.qa_status = "passed";
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_reports SET status = 'approved'")) {
      working.report = { ...working.report, status: "approved", qa_status: "passed", professional_approved_by: "professional-v2-99", approved_by: "professional-v2-99" };
      return { rows: [structuredClone(working.report)] };
    }
    if (text.startsWith("UPDATE raepa_profiles")) {
      working.profile = { review_status: "unreviewed" };
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_reports SET status = 'draft'")) {
      if (reportLockHeld) {
        await copyRelease;
        await approvalCommitted;
      }
      working.report = {
        ...structuredClone(state.report), status: "draft", qa_status: "not_run",
        professional_approved_by: null, approved_by: null,
        version: Number(state.report.version) + 1,
      };
      return { rows: [{ id: reportId }] };
    }
    if (text.startsWith("UPDATE reports SET domain_analysis")) {
      const withoutCopiedSection = String(state.genericReport.domainAnalysis).replace(
        /--- Academic English Access & Performance ---[\s\S]*?--- End Academic English Access & Performance ---\s*/g, "",
      ).trim();
      working.genericReport = { ...state.genericReport, domainAnalysis: withoutCopiedSection, status: "draft" };
      return { rows: [{ id: "legacy-v2-comprehensive-99" }] };
    }
    if (text.startsWith("SELECT * FROM raepa_v2_evidence WHERE id")) return { rows: [working.evidenceRows.at(-1)] };
    return { rows: [] };
  };

  (db as any).execute = async (query: Query) => execute(query, state, "db");
  (db as any).transaction = async (callback: (tx: any) => unknown) => {
    const before = structuredClone(state);
    const working = structuredClone(state);
    workingKinds.set(working, "approval");
    const tx = {
      execute: (query: Query) => execute(query, working, "tx"),
      select: () => ({
        from: () => ({
          where: () => ({ limit: async () => [structuredClone(working.genericReport)] }),
        }),
      }),
      update: () => ({
        set: (updates: any) => ({
          where: async () => {
            copyExecutors.push("tx");
            if (options.failCopy && workingKinds.get(working) === "approval") throw new Error("synthetic comprehensive copy failure");
            working.genericReport = { ...working.genericReport, ...updates };
            if (barrierArmed && workingKinds.get(working) === "approval") {
              barrierArmed = false;
              copyReachedResolve();
              await copyRelease;
            }
            return [];
          },
        }),
      }),
      insert: () => ({ values: async () => { copyExecutors.push("tx"); return []; } }),
    };
    try {
      const result = await callback(tx);
      Object.assign(state, structuredClone(working));
      if (workingKinds.get(working) === "approval") {
        reportLockHeld = false;
        approvalCommitResolve();
      }
      return result;
    } catch (error) {
      Object.assign(state, before);
      if (workingKinds.get(working) === "approval") reportLockHeld = false;
      throw error;
    }
  };
  (db as any).select = () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) });
  (db as any).update = () => ({ set: () => ({ where: async () => [] }) });
  (db as any).insert = () => ({ values: async () => [] });
  return { state, calls, copyExecutors, copyReached, mutationWriteReached, releaseCopy: releaseCopyResolve };
}

test("v2 comprehensive approval cannot preserve a stale copied section across evidence invalidation", { concurrency: false }, async () => {
  const harness = installV2ComprehensiveConcurrencyHarness({ pauseAfterCopy: true });
  const request = {
    params: { caseId: CASE_ID, reportId: harness.state.report.id },
    body: {
      expected_version: 7, decision: "approve", mode: "comprehensive",
      text: harness.state.report.edited_narrative.comprehensive_text,
      findings: harness.state.report.report_findings,
    },
    userRole: AUTHORITY_ROLE,
  };
  const approvalPromise = callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", request);
  await harness.copyReached;
  const mutationPromise = callRoute("/cases/:caseId/raepa/v2/evidence", "post", {
    params: { caseId: CASE_ID },
    body: { source: "teacher", summary: "Concurrent evidence invalidation." },
    userRole: AUTHORITY_ROLE,
  });
  await harness.mutationWriteReached;
  harness.releaseCopy();
  const [approval, mutation] = await Promise.all([approvalPromise, mutationPromise]);
  assert.equal(approval.statusCode, 200, JSON.stringify(approval.body));
  assert.equal(mutation.statusCode, 201, JSON.stringify(mutation.body));
  assert.equal(harness.state.report.status, "draft");
  assert.equal(harness.state.report.qa_status, "not_run");
  assert.equal(harness.state.report.version, 9);
  assert.equal(harness.state.genericReport.status, "draft");
  assert.doesNotMatch(harness.state.genericReport.domainAnalysis, /Academic English Access & Performance/);
  assert.deepEqual(harness.copyExecutors, ["tx"]);
  const txQaReads = harness.calls.filter(call => call.executor === "tx" && call.text.startsWith("SELECT * FROM raepa_v2_evidence"));
  assert.ok(txQaReads.length > 0, "comprehensive QA must read evidence through approval tx");
});

test("v2 comprehensive copy failure rolls back report approval and copied section", async () => {
  const harness = installV2ComprehensiveConcurrencyHarness({ failCopy: true });
  harness.state.genericReport.domainAnalysis = "Unrelated legacy content.";
  let rejected = false;
  try {
    await callRoute("/cases/:caseId/raepa/v2/reports/:reportId/review", "post", {
      params: { caseId: CASE_ID, reportId: harness.state.report.id },
      body: {
        expected_version: 7, decision: "approve", mode: "comprehensive",
        text: harness.state.report.edited_narrative.comprehensive_text,
        findings: harness.state.report.report_findings,
      },
      userRole: AUTHORITY_ROLE,
    });
  } catch {
    rejected = true;
  }
  assert.ok(rejected, "copy failure should abort the approval request");
  assert.equal(harness.state.report.status, "draft");
  assert.equal(harness.state.report.version, 7);
  assert.equal(harness.state.report.professional_approved_by, null);
  assert.doesNotMatch(harness.state.genericReport.domainAnalysis, /Academic English Access & Performance/);
  assert.deepEqual(harness.copyExecutors, ["tx"]);
});

test("academic history round-trips canonical fields and preserves populated values over blank aliases", async () => {
  const state: any = {
    languages: [{
      id: "history-roundtrip-99", language: "Maren", age_first_exposed: "4",
      years_of_instruction: "8", proficiency: "Advanced", formal_schooling_experience: "Primary school",
      speaking_experience: "Daily", reading_experience: "Weekly", writing_experience: "Monthly",
      subjects: ["science"], source: "parent", original_text: "Original", translated_text: "Translated",
      translation_metadata: { source: "test" },
    }],
    profileData: { parent_voice: "Parent voice", student_voice: "Student voice", teacher_voice: "Teacher voice" },
  };
  let pending: any = null;
  const setup = installAtomicExecute(state, async (query, working) => {
    const text = queryText(query);
    if (text.startsWith("SELECT * FROM raepa_language_academic_history WHERE case_id")) return { rows: working.languages };
    if (text.startsWith("SELECT data FROM raepa_profiles")) return { rows: [{ data: working.profileData }] };
    if (text.startsWith("DELETE FROM raepa_language_academic_history")) { working.languages = []; return { rows: [] }; }
    if (text.startsWith("DELETE FROM raepa_subject_language_history")) return { rows: [] };
    if (text.startsWith("INSERT INTO raepa_language_academic_history")) {
      working.languages.push({ ...pending, id: `history-${working.languages.length + 1}` });
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_profiles SET data = data")) {
      working.profileData = { parent_voice: "Parent voice", student_voice: "Student voice", teacher_voice: "Teacher voice" };
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_reports SET")) return { rows: [] };
    return { rows: [] };
  });
  const canonical = {
    language: "Maren", relationship: "home", age_first_exposed: "4",
    years_of_instruction: "8", proficiency: "Advanced", formal_schooling_experience: "Primary school",
    speaking_experience: "Daily", reading_experience: "Weekly", writing_experience: "Monthly",
    subjects: ["science"], source: "parent", original_text: "Original", translated_text: "Translated",
    translation_metadata: { source: "test" },
  };
  pending = canonical;
  const first = await callRoute("/cases/:caseId/raepa/v2/academic-history", "put", {
    params: { caseId: CASE_ID }, body: { languages: [canonical], subjects: [], parent_voice: "Parent voice", student_voice: "Student voice", teacher_voice: "Teacher voice" },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(first.statusCode, 200, JSON.stringify(first.body));
  const hydrated = await callRoute("/cases/:caseId/raepa/v2/academic-history", "get", {
    params: { caseId: CASE_ID }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(hydrated.statusCode, 200);
  assert.equal(hydrated.body.languages[0].years_of_instruction, "8");
  assert.equal(hydrated.body.languages[0].proficiency, "Advanced");
  assert.equal(hydrated.body.languages[0].formal_schooling_experience, "Primary school");
  assert.equal(hydrated.body.languages[0].speaking_experience, "Daily");
  assert.deepEqual(hydrated.body.languages[0].subjects, ["science"]);
  const blankAliasPayload = {
    ...hydrated.body.languages[0],
    years: "", instruction_years: "", confidence: "", academic_use: "", notes: "",
  };
  pending = canonical;
  const second = await callRoute("/cases/:caseId/raepa/v2/academic-history", "put", {
    params: { caseId: CASE_ID },
    body: { languages: [blankAliasPayload], subjects: [], parent_voice: "", student_voice: "", teacher_voice: "" },
    userRole: AUTHORITY_ROLE,
  });
  assert.equal(second.statusCode, 200, JSON.stringify(second.body));
  assert.equal(state.languages[0].years_of_instruction, "8");
  assert.equal(state.languages[0].proficiency, "Advanced");
  assert.equal(state.languages[0].formal_schooling_experience, "Primary school");
  assert.deepEqual(state.languages[0].subjects, ["science"]);
  assert.deepEqual(state.profileData, { parent_voice: "Parent voice", student_voice: "Student voice", teacher_voice: "Teacher voice" });
  assert.ok(setup.calls.some(call => call.text.includes("years_of_instruction")));

  const uiSource = fs.readFileSync("../raos/src/pages/cases/[id]/raepa.tsx", "utf8");
  assert.match(uiSource, /years_of_instruction:\s*row\.instruction_years/);
  assert.match(uiSource, /formal_schooling_experience:\s*row\.academic_use/);
  assert.match(uiSource, /proficiency:\s*row\.confidence/);
});

test("teacher upload persists the complete sample/profile atomically and replays idempotently", async () => {
  const fields = {
    title: "Quoted sample ' A", subject: "Science", grade_level: "6", teacher: "Teacher",
    task_type: "Explanation", date_completed: "2025-01-02", source: "teacher",
    language_of_instruction: "English and Maren", independent_completion: true,
    completion_setting: "supported", support_provided: "Sentence starters", assignment_instructions: "Explain it",
    expected_outcome: "A reasoned explanation", rubric: "Uses evidence", student_score: "3",
    teacher_comments: "Needs 'support'", student_selected: true, classroom_context: "Whole class",
    classroom_access_profile: JSON.stringify({ explanation: "developing" }),
    support_response_matrix: JSON.stringify({ repeat: "effective" }),
  };
  const state: any = { sample: null, profile: null, fail: false };
  const setup = installAtomicExecute(state, async (query, working) => {
    const text = queryText(query);
    if (text.startsWith("SELECT id, case_id, scope, expires_at FROM raepa_access_tokens")) {
      return { rows: [{ id: "teacher-token-99", case_id: CASE_ID, scope: "teacher", expires_at: "2099-01-01" }] };
    }
    if (text.startsWith("SELECT * FROM raepa_work_samples") && text.includes("idempotency_key")) {
      return { rows: working.sample ? [working.sample] : [] };
    }
    if (text.startsWith("INSERT INTO raepa_work_samples")) {
      working.sample = { id: "teacher-sample-99", ...fields };
      return { rows: [working.sample] };
    }
    if (text.startsWith("INSERT INTO raepa_teacher_profiles")) {
      working.profile = { id: "teacher-profile-99", data: { classroom_access_profile: JSON.parse(fields.classroom_access_profile) } };
      return { rows: [working.profile] };
    }
    if (text.startsWith("UPDATE raepa_reports SET")) {
      if (working.fail) throw new Error("synthetic teacher invalidation failure");
      return { rows: [] };
    }
    if (text.startsWith("UPDATE raepa_access_tokens SET")) return { rows: [] };
    return { rows: [] };
  });
  const request = {
    params: { token: TOKEN }, body: fields, headers: { "Idempotency-Key": "teacher-complete-99" },
  };
  const first = await callRoute("/public/raepa/teacher/:token/upload", "post", request);
  assert.equal(first.statusCode, 200, JSON.stringify(first.body));
  assert.ok(state.sample && state.profile);
  assert.equal(setup.transactions.committed, 1);
  const sampleInsert = setup.calls.find(call => call.text.startsWith("INSERT INTO raepa_work_samples"));
  for (const column of ["source", "language_of_instruction", "completion_setting", "expected_outcome", "rubric", "classroom_context", "student_score", "teacher_comments"]) {
    assert.ok(sampleInsert?.text.includes(column), `sample insert must persist ${column}`);
  }
  const sampleIndex = setup.calls.findIndex(call => call.text.startsWith("INSERT INTO raepa_work_samples"));
  const profileIndex = setup.calls.findIndex(call => call.text.startsWith("INSERT INTO raepa_teacher_profiles"));
  const invalidationIndex = setup.calls.findIndex(call => call.text.startsWith("UPDATE raepa_reports SET"));
  assert.ok(sampleIndex >= 0 && sampleIndex < profileIndex && profileIndex < invalidationIndex);
  const replay = await callRoute("/public/raepa/teacher/:token/upload", "post", request);
  assert.equal(replay.statusCode, 200);
  assert.equal(replay.body.duplicate, true);
  assert.equal(setup.transactions.begun, 1, "idempotent replay must not open a second transaction");

  const failingState: any = { sample: null, profile: null, fail: true };
  const failing = installAtomicExecute(failingState, async (query, working) => {
    const text = queryText(query);
    if (text.startsWith("SELECT id, case_id, scope, expires_at")) return { rows: [{ id: "teacher-token-99", case_id: CASE_ID, scope: "teacher", expires_at: "2099-01-01" }] };
    if (text.startsWith("SELECT * FROM raepa_work_samples") && text.includes("idempotency_key")) return { rows: [] };
    if (text.startsWith("INSERT INTO raepa_work_samples")) { working.sample = { id: "failed-sample" }; return { rows: [working.sample] }; }
    if (text.startsWith("INSERT INTO raepa_teacher_profiles")) { working.profile = { id: "failed-profile" }; return { rows: [working.profile] }; }
    if (text.startsWith("UPDATE raepa_reports SET")) throw new Error("synthetic teacher invalidation failure");
    return { rows: [] };
  });
  const failed = await callRoute("/public/raepa/teacher/:token/upload", "post", { ...request, headers: { "Idempotency-Key": "teacher-fail-99" } });
  assert.equal(failed.statusCode, 500);
  assert.equal(failing.transactions.committed, 0);
  assert.equal(failing.transactions.rolledBack, 1);
  assert.equal(failingState.sample, null);
  assert.equal(failingState.profile, null);

  const teacherUi = fs.readFileSync("../raos/src/pages/raepa-teacher.tsx", "utf8");
  for (const field of ["language_of_instruction", "completion_setting", "assignment_instructions", "expected_outcome", "rubric", "student_score", "teacher_comments", "classroom_access_profile", "support_response_matrix"]) {
    assert.match(teacherUi, new RegExp(`${field}:`), `teacher UI must send ${field} in the multipart upload`);
  }
  assert.doesNotMatch(teacherUi, /\/intake/);
  void failing;
});

test("RAEPA rejects malicious enum/numeric payloads and never interpolates SQL", async () => {
  const source = fs.readFileSync("src/routes/raepa.ts", "utf8");
  assert.doesNotMatch(source, /sql\.raw/);
  const setup = installExecute(async query => {
    const text = queryText(query);
    if (text.startsWith("SELECT id FROM raepa_sessions")) return { rows: [{ id: "session-security-99" }] };
    if (text.startsWith("SELECT id FROM raepa_module_scores")) return { rows: [] };
    if (text.startsWith("INSERT INTO raepa_module_scores")) return { rows: [{ id: "score-security-99", observations: "literal ' quote; DROP TABLE" }] };
    if (text.startsWith("SELECT * FROM raepa_module_scores")) return { rows: [{ id: "score-security-99", observations: "literal ' quote; DROP TABLE" }] };
    if (text.startsWith("INSERT INTO raepa_work_samples")) return { rows: [] };
    if (text.startsWith("SELECT * FROM raepa_work_samples WHERE id")) return { rows: [{ id: "sample-security-99", title: "literal ' quote; DROP TABLE" }] };
    return { rows: [] };
  });
  for (const body of [
    { status: "complete'; DROP TABLE raepa_sessions;--" },
    { pathway: "standalone'; DROP TABLE raepa_sessions;--" },
    { confidence_level: "high'; DROP TABLE raepa_sessions;--" },
  ]) {
    const response = await callRoute("/cases/:caseId/raepa/session", "post", { params: { caseId: CASE_ID }, body, userRole: AUTHORITY_ROLE });
    assert.equal(response.statusCode, 400);
  }
  const invalidScore = await callRoute("/cases/:caseId/raepa/module-scores", "post", {
    params: { caseId: CASE_ID }, body: { module_id: "security", administered: true, score: "3; DROP TABLE" }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(invalidScore.statusCode, 400);
  const invalidDomain = await callRoute("/cases/:caseId/raepa/domain-ratings", "post", {
    params: { caseId: CASE_ID }, body: { ratings: [{ domain: "Reading", score: 99 }] }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(invalidDomain.statusCode, 400);
  const invalidTrial = await callRoute("/cases/:caseId/raepa/dynamic-trials", "post", {
    params: { caseId: CASE_ID }, body: { condition: "mediated'; DROP TABLE", support_level: "3 OR 1=1" }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(invalidTrial.statusCode, 400);
  const invalidSample = await callRoute("/cases/:caseId/raepa/work-samples", "post", {
    params: { caseId: CASE_ID }, body: { title: "sample", student_selected: "3 OR 1=1" }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(invalidSample.statusCode, 400);
  const sampleLiteral = "literal ' quote; DROP TABLE raepa_work_samples;--";
  const sample = await callRoute("/cases/:caseId/raepa/work-samples", "post", {
    params: { caseId: CASE_ID }, body: { title: sampleLiteral, student_score: sampleLiteral, student_selected: true }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(sample.statusCode, 200, JSON.stringify(sample.body));
  assert.equal(sample.body.title, "literal ' quote; DROP TABLE");
  const literal = "literal ' quote; DROP TABLE raepa_module_scores;--";
  const valid = await callRoute("/cases/:caseId/raepa/module-scores", "post", {
    params: { caseId: CASE_ID }, body: { module_id: "security", administered: true, score: 3, observations: literal }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(valid.statusCode, 200, JSON.stringify(valid.body));
  assert.ok(setup.calls.some(call => call.text.startsWith("INSERT INTO raepa_module_scores")));
  assert.equal(valid.body.observations, "literal ' quote; DROP TABLE");
  assert.match(source, /\$\{b\.observations \?\? null\}/);
});

test("deleted work sample analysis cannot satisfy replacement sample QA", async () => {
  const narrative = "Synthetic work sample report narrative with contextual evidence.";
  const state: any = {
    samples: [{ id: "sample-a-lifecycle-99", case_id: CASE_ID, title: "Sample A" }],
    analyses: [{
      id: "analysis-a-lifecycle-99", case_id: CASE_ID, work_sample_id: "sample-a-lifecycle-99",
      review_status: "reviewed",
    }],
    profile: { review_status: "reviewed" },
    report: {
      id: "report-lifecycle-99", version: 3, status: "approved", qa_status: "passed",
      pathway: "standalone",
      generated_narrative: { standalone_text: narrative },
      edited_narrative: { standalone_text: narrative },
      source_evidence_refs: ["work-sample:sample-a-lifecycle-99"],
      report_findings: [{
        id: "finding-lifecycle-99", section_key: "report", narrative_text: narrative,
        evidence_refs: ["work-analysis:analysis-a-lifecycle-99"],
      }],
    },
  };
  const setup = installAtomicExecute(state, async (query, working) => {
    const text = queryText(query);
    if (text.startsWith("DELETE FROM raepa_work_sample_analyses")) {
      working.analyses = working.analyses.filter((analysis: any) => analysis.work_sample_id !== "sample-a-lifecycle-99");
      return { rows: [] };
    }
    if (text.startsWith("DELETE FROM raepa_work_samples")) {
      working.samples = working.samples.filter((sample: any) => sample.id !== "sample-a-lifecycle-99");
      return { rows: [] };
    }
    if (text.startsWith("INSERT INTO raepa_work_samples")) {
      working.samples.push({ id: "sample-b-lifecycle-99", case_id: CASE_ID, title: "Sample B" });
      return { rows: [] };
    }
    if (text.startsWith("SELECT * FROM raepa_work_samples WHERE id")) return { rows: working.samples.filter((sample: any) => sample.id === "sample-b-lifecycle-99") };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_work_samples")) return { rows: [{ count: working.samples.length }] };
    if (text.startsWith("SELECT count(*)::int AS count, count(*) FILTER (WHERE review_status")) {
      return { rows: [{ count: working.analyses.length, reviewed: working.analyses.filter((analysis: any) => ["reviewed", "approved"].includes(analysis.review_status)).length }] };
    }
    if (text.startsWith("SELECT count(a.id)::int AS count")) {
      const reviewed = working.analyses.filter((analysis: any) =>
        working.samples.some((sample: any) => sample.id === analysis.work_sample_id)
        && ["reviewed", "approved"].includes(analysis.review_status)).length;
      return { rows: [{ count: reviewed, reviewed, missing_reviewed: working.samples.length - reviewed }] };
    }
    if (text.startsWith("SELECT * FROM raepa_work_samples WHERE case_id")) return { rows: working.samples };
    if (text.startsWith("SELECT a.* FROM raepa_work_sample_analyses")) {
      return { rows: working.analyses.filter((analysis: any) => working.samples.some((sample: any) => sample.id === analysis.work_sample_id)) };
    }
    if (text.startsWith("SELECT * FROM raepa_work_sample_analyses WHERE case_id")) return { rows: working.analyses };
    if (text.startsWith("SELECT * FROM raepa_profiles")) return { rows: [{ ...working.profile }] };
    if (text.startsWith("SELECT id, language_background, pathway")) return { rows: [{ id: "session-lifecycle-99", pathway: "standalone" }] };
    if (text.startsWith("SELECT * FROM raepa_v2_evidence")) return { rows: [] };
    if (text.startsWith("SELECT consent_obtained FROM cases")) return { rows: [{ consent_obtained: true }] };
    if (text.startsWith("SELECT review_status FROM raepa_profiles")) return { rows: [{ review_status: working.profile.review_status }] };
    if (text.startsWith("SELECT count(*) FILTER (WHERE status = 'approved')::int AS count FROM raepa_assessment_plans")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_module_scores")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT count(*)::int AS count FROM raepa_domain_ratings")) return { rows: [{ count: 0 }] };
    if (text.startsWith("SELECT (")) return { rows: [{ count: 1 }] };
    if (text.startsWith("SELECT version, pathway, generated_narrative")) return { rows: [working.report] };
    if (text.startsWith("SELECT * FROM raepa_reports WHERE id")) return { rows: [working.report] };
    if (text.startsWith("UPDATE raepa_profiles")) { working.profile.review_status = "unreviewed"; return { rows: [] }; }
    if (text.startsWith("UPDATE raepa_reports SET status = 'draft'")) {
      working.report = { ...working.report, status: "draft", qa_status: "not_run", version: Number(working.report.version) + 1 };
      return { rows: [{ id: working.report.id }] };
    }
    if (text.startsWith("UPDATE raepa_reports SET qa_status")) {
      working.report.qa_status = text.includes("passed") ? "passed" : "blocked";
      return { rows: [] };
    }
    if (text.startsWith("INSERT INTO raepa_qa_checks")) return { rows: [] };
    return { rows: [] };
  });

  const deleted = await callRoute("/cases/:caseId/raepa/work-samples/:sampleId", "delete", {
    params: { caseId: CASE_ID, sampleId: "sample-a-lifecycle-99" }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(deleted.statusCode, 200, JSON.stringify(deleted.body));
  assert.equal(setup.transactions.committed, 1);
  assert.equal(setup.transactions.rolledBack, 0);
  assert.equal(state.samples.length, 0);
  assert.equal(state.analyses.length, 0);
  const cleanupIndex = setup.calls.findIndex(call => call.text.startsWith("DELETE FROM raepa_work_sample_analyses"));
  const sampleDeleteIndex = setup.calls.findIndex(call => call.text.startsWith("DELETE FROM raepa_work_samples"));
  assert.ok(cleanupIndex >= 0 && cleanupIndex < sampleDeleteIndex, "analysis cleanup must precede sample deletion in the transaction");

  const added = await callRoute("/cases/:caseId/raepa/work-samples", "post", {
    params: { caseId: CASE_ID }, body: { title: "Sample B", subject: "Synthetic subject" }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(added.statusCode, 200, JSON.stringify(added.body));
  assert.deepEqual(state.samples.map((sample: any) => sample.id), ["sample-b-lifecycle-99"]);
  state.profile.review_status = "reviewed";

  const firstQa = await callRoute("/cases/:caseId/raepa/qa", "post", {
    params: { caseId: CASE_ID }, body: { report_id: state.report.id }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(firstQa.statusCode, 200, JSON.stringify(firstQa.body));
  assert.equal(firstQa.body.checks.find((check: any) => check.key === "work_product_context")?.passed, false, JSON.stringify(firstQa.body.checks));
  assert.equal(firstQa.body.checks.find((check: any) => check.key === "report_findings_evidence_refs")?.passed, false, JSON.stringify(firstQa.body.checks));
  assert.ok(!state.analyses.some((analysis: any) => analysis.id === "analysis-a-lifecycle-99"));

  const blocked = await callRoute("/cases/:caseId/raepa/report/:reportId/professional-approve", "post", {
    params: { caseId: CASE_ID, reportId: state.report.id }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(blocked.statusCode, 422);
  assert.ok(blocked.body.checks.some((check: any) => check.key === "work_product_context" && check.passed === false));

  state.analyses.push({ id: "analysis-b-lifecycle-99", case_id: CASE_ID, work_sample_id: "sample-b-lifecycle-99", review_status: "reviewed" });
  state.report.source_evidence_refs = ["work-sample:sample-b-lifecycle-99"];
  state.report.report_findings = [{
    id: "finding-lifecycle-99", section_key: "report", narrative_text: narrative,
    evidence_refs: ["work-analysis:analysis-b-lifecycle-99"],
  }];
  state.profile.review_status = "reviewed";
  const secondQa = await callRoute("/cases/:caseId/raepa/qa", "post", {
    params: { caseId: CASE_ID }, body: { report_id: state.report.id }, userRole: AUTHORITY_ROLE,
  });
  assert.equal(secondQa.statusCode, 200, JSON.stringify(secondQa.body));
  assert.equal(secondQa.body.checks.find((check: any) => check.key === "work_product_context")?.passed, true);
  assert.equal(secondQa.body.checks.find((check: any) => check.key === "report_findings_evidence_refs")?.passed, true);
});