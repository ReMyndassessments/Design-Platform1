import { db } from "@workspace/db";
import { assessmentToolsTable, assignmentsTable, casesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { CHINESE_LITERACY_KEY, CHINESE_LITERACY_VERSION, CHINESE_LITERACY_SCORING_VERSION, LITERACY_METADATA, LITERACY_FORM_ITEMS, LITERACY_DOMAINS, emptyLiteracyInput, compareLiteracy } from "./chineseLiteracy.js";
import { CHINESE_LITERACY_PARENT_KEY, PARENT_LITERACY_METADATA, PARENT_LITERACY_FORM_ITEMS } from "./chineseLiteracyParent.js";
import { literacyMetadata } from "./chineseLiteracyInstruments.js";
import type { LiteracyMetadata } from "./chineseLiteracy.js";
import { buildChineseLiteracyDomainObservations } from "./chineseLiteracyDomainReport.js";

export type LiteracyDocument = {
  assignmentId: string; caseId: string; revision: number; status: string;
  instrumentVersion: string; scoringVersion: string; languageVersion: string;
  input: ReturnType<typeof emptyLiteracyInput>; selectedDomains: string[]; scores: any[];
  baselineId: string | null; metadata: LiteracyMetadata;
  contextSnapshot: { caseId: string; studentId: string; grade: string | null; recordedAt: string; age: number | null };
  teacherName: string; teacherEmail: string; respondentIdentity: string;
  report: any; plan: any; monitoring: { entries: any[]; comparison: any[] };
  history: any[]; evidenceStatus?: string; submittedAt?: string; submittedBy?: string;
  submissionBaseRevision?: number; submissionInputHash?: string;
  enteredBy?: string; sourceConfirmation?: { confirmed: boolean; date: string; relationship: string };
};
export const LITERACY_INTEGRATION = { portal: "not_configured", ai: "on_demand_draft", message: "AI-assisted editable report drafts are available on demand. Staff review and approval are required. No external Bobby Case Portal connection has been verified; nothing is automatically released or synchronized." };

export async function seedChineseLiteracy() {
  await db.insert(assessmentToolsTable).values({
    id: CHINESE_LITERACY_KEY, name: LITERACY_METADATA.name,
    category: "ReMynd Tools", description: `${LITERACY_METADATA.formName}. Developmental, non-diagnostic teacher profile: 78 items, 13 independent domains, one teacher sufficient; second teacher optional. ${LITERACY_METADATA.limitation}`,
    isRemyndOwned: true, respondentTypes: ["teacher1"], scoringType: "auto",
    domains: LITERACY_DOMAINS.map(d => d.label), formItems: LITERACY_FORM_ITEMS,
    scoringConfig: { max: 5, scoringVersion: CHINESE_LITERACY_SCORING_VERSION, descriptiveOnly: true, minimumRespondents: 1 } as any,
    productIds: [],
  }).onConflictDoUpdate({ target: assessmentToolsTable.id, set: {
    name: LITERACY_METADATA.name, formItems: LITERACY_FORM_ITEMS,
    respondentTypes: ["teacher1"], description: `${LITERACY_METADATA.formName}. ${LITERACY_METADATA.limitation}`,
    scoringConfig: { max: 5, scoringVersion: CHINESE_LITERACY_SCORING_VERSION, descriptiveOnly: true, minimumRespondents: 1 } as any,
  } });
  await db.execute(sql`UPDATE assessment_tools SET version_id=${CHINESE_LITERACY_VERSION} WHERE id=${CHINESE_LITERACY_KEY}`);
  await db.insert(assessmentToolsTable).values({
    id: CHINESE_LITERACY_PARENT_KEY, name: PARENT_LITERACY_METADATA.name, category: "ReMynd Tools",
    description: `${PARENT_LITERACY_METADATA.formName}. Home observations; one parent or caregiver sufficient. Separate from teacher results. ${PARENT_LITERACY_METADATA.limitation}`,
    isRemyndOwned: true, respondentTypes: ["parent"], scoringType: "auto",
    domains: PARENT_LITERACY_METADATA.domains.map(d => d.label), formItems: PARENT_LITERACY_FORM_ITEMS,
    scoringConfig: { max: 5, scoringVersion: PARENT_LITERACY_METADATA.scoringVersion, descriptiveOnly: true, minimumRespondents: 1 } as any,
    productIds: [],
  }).onConflictDoUpdate({ target: assessmentToolsTable.id, set: {
    name: PARENT_LITERACY_METADATA.name, category: "ReMynd Tools", respondentTypes: ["parent"],
    description: `${PARENT_LITERACY_METADATA.formName}. Home observations; one parent or caregiver sufficient. ${PARENT_LITERACY_METADATA.limitation}`,
    domains: PARENT_LITERACY_METADATA.domains.map(d => d.label), formItems: PARENT_LITERACY_FORM_ITEMS,
    scoringConfig: { max: 5, scoringVersion: PARENT_LITERACY_METADATA.scoringVersion, descriptiveOnly: true, minimumRespondents: 1 } as any,
  } });
  await db.execute(sql`UPDATE assessment_tools SET version_id=${PARENT_LITERACY_METADATA.version} WHERE id=${CHINESE_LITERACY_PARENT_KEY}`);
}
function ageFromDob(dob: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const date = new Date(dob); if (!Number.isFinite(date.getTime())) return null;
  const now = new Date(); let age = now.getUTCFullYear() - date.getUTCFullYear();
  if (now.getUTCMonth() < date.getUTCMonth() || (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate())) age--;
  return age >= 0 && age < 100 ? age : null;
}
export async function loadLiteracy(assignment: typeof assignmentsTable.$inferSelect, reader: any = db, lock = false): Promise<LiteracyDocument> {
  const [c] = await reader.select().from(casesTable).where(eq(casesTable.id, assignment.caseId)).limit(1);
  if (!c) throw new Error("Case not found.");
  const grade = c.grade?.match(/(?:^|\D)(\d{1,2})(?:\D|$)/)?.[1] ?? null;
  const now = new Date().toISOString();
  const metadata = literacyMetadata(assignment.toolId);
  const initial: LiteracyDocument = {
    assignmentId: assignment.id, caseId: assignment.caseId, revision: 0, status: "not_started",
    instrumentVersion: metadata.version, scoringVersion: metadata.scoringVersion,
    languageVersion: "en-0.1.0", metadata,
    input: emptyLiteracyInput(grade), selectedDomains: metadata.domains.map(d => d.id), scores: [],
    baselineId: null, contextSnapshot: { caseId: c.id, studentId: c.id, grade: c.grade, age: ageFromDob(c.dob), recordedAt: now },
    teacherName: assignment.assignedToName ?? (metadata.respondent === "parent" ? "Assigned parent or caregiver" : "Assigned teacher"), teacherEmail: assignment.assignedToEmail ?? "",
    respondentIdentity: assignment.assignedToEmail?.trim().toLowerCase() || assignment.assignedToName?.trim().toLowerCase() || assignment.respondentType,
    report: null, plan: null, monitoring: { entries: [], comparison: [] }, history: [],
  };
  await reader.execute(sql`INSERT INTO chinese_literacy_administrations (assignment_id,case_id,revision,document)
    VALUES (${assignment.id},${assignment.caseId},0,${JSON.stringify(initial)}::jsonb) ON CONFLICT (assignment_id) DO NOTHING`);
  const result = lock
    ? await reader.execute(sql`SELECT document FROM chinese_literacy_administrations WHERE assignment_id=${assignment.id} AND case_id=${assignment.caseId} FOR UPDATE`)
    : await reader.execute(sql`SELECT document FROM chinese_literacy_administrations WHERE assignment_id=${assignment.id} AND case_id=${assignment.caseId}`);
  return result.rows[0].document as LiteracyDocument;
}
export async function persistLiteracy(tx: any, current: LiteracyDocument, changes: Partial<LiteracyDocument>): Promise<LiteracyDocument> {
  // Archive the old complete state before advancing. Approved snapshots are never updated.
  await tx.execute(sql`INSERT INTO chinese_literacy_revisions (assignment_id,revision,document)
    VALUES (${current.assignmentId},${current.revision},${JSON.stringify(current)}::jsonb)
    ON CONFLICT (assignment_id,revision) DO NOTHING`);
  const next = { ...current, ...changes, revision: current.revision + 1 };
  await tx.execute(sql`UPDATE chinese_literacy_administrations SET revision=${next.revision},
    document=${JSON.stringify(next)}::jsonb,updated_at=NOW() WHERE assignment_id=${current.assignmentId} AND revision=${current.revision}`);
  return next;
}
export async function literacyEnvelope(doc: LiteracyDocument) {
  let comparison: any[] = [];
  if (doc.baselineId && doc.scores.length) {
    const result = await db.execute(sql`SELECT document FROM chinese_literacy_administrations WHERE assignment_id=${doc.baselineId} AND case_id=${doc.caseId}`);
    const baseline = (doc as any).baselineSnapshot ?? result.rows[0]?.document as LiteracyDocument | undefined;
    if (baseline?.scores.length) comparison = compareLiteracy(baseline, doc);
  }
  const report = doc.report
    ? { ...doc.report, domainObservations: buildChineseLiteracyDomainObservations(doc) }
    : doc.report;
  return { administration: { ...doc, report, monitoring: { ...doc.monitoring, comparison } },
    metadata: doc.metadata, student: { identifier: doc.contextSnapshot.studentId, age: doc.contextSnapshot.age, grade: doc.contextSnapshot.grade },
    teacher: { name: doc.teacherName, email: doc.teacherEmail }, integration: LITERACY_INTEGRATION };
}
