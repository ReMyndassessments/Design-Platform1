import { db } from "@workspace/db";
import { assessmentToolsTable, responsesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { SAMPLE_QUESTIONS } from "./questions.js";

/** Build a questionId → domain lookup from the tool's DB-stored or canonical question list. */
export async function buildDomainMap(toolId: string): Promise<Record<string, string>> {
  const toolRows = await db.select({ formItems: assessmentToolsTable.formItems })
    .from(assessmentToolsTable)
    .where(eq(assessmentToolsTable.id, toolId))
    .limit(1);
  const stored = toolRows[0]?.formItems;
  const questions = (stored && Array.isArray(stored) && stored.length > 0)
    ? (stored as { id: string; domain?: string }[])
    : (SAMPLE_QUESTIONS[toolId] ?? SAMPLE_QUESTIONS["default"] ?? []);
  const map: Record<string, string> = {};
  for (const q of questions) {
    if (q.id && q.domain) map[q.id] = q.domain;
  }
  return map;
}

/** Fetch scale max from the tool's scoringConfig (fallback 5). */
export async function getScaleMax(toolId: string): Promise<number> {
  const toolRows = await db.select({ scoringConfig: assessmentToolsTable.scoringConfig })
    .from(assessmentToolsTable)
    .where(eq(assessmentToolsTable.id, toolId))
    .limit(1);
  const cfg = toolRows[0]?.scoringConfig as { max?: number } | null | undefined;
  return cfg?.max ?? 5;
}

/** Average answers by domain. */
export function computeDomainScores(answers: Record<string, unknown>, domainMap: Record<string, string>): Record<string, number> {
  const domains: Record<string, number[]> = {};
  for (const [key, value] of Object.entries(answers)) {
    const domain = domainMap[key] ?? "general";
    if (!domains[domain]) domains[domain] = [];
    const numVal = typeof value === "number" ? value : parseFloat(String(value));
    if (!isNaN(numVal)) domains[domain].push(numVal);
  }
  const result: Record<string, number> = {};
  for (const [domain, vals] of Object.entries(domains)) {
    if (vals.length === 0) continue;
    result[domain] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }
  return result;
}

/** Normalize raw domain scores to 0–100 percentages. */
export function normalizeScores(scores: Record<string, number>, max = 5): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(scores)) {
    result[k] = Math.round((v / max) * 100);
  }
  return result;
}

/** Fetch the latest raw answers for an assignment. */
export async function getLatestAnswers(assignmentId: string): Promise<Record<string, unknown> | null> {
  const rows = await db.select({ answers: responsesTable.answers })
    .from(responsesTable)
    .where(eq(responsesTable.assignmentId, assignmentId))
    .orderBy(desc(responsesTable.submittedAt))
    .limit(1);
  return rows[0]?.answers as Record<string, unknown> ?? null;
}
