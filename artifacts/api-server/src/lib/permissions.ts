import { db } from "@workspace/db";
import { casesTable, caseApprenticeAssignmentsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

export interface PermissionUser {
  id: string;
  role: string;
  school?: string;
}

async function isApprenticeAssignedToCase(userId: string, caseId: string): Promise<boolean> {
  const rows = await db.select({ id: caseApprenticeAssignmentsTable.id })
    .from(caseApprenticeAssignmentsTable)
    .where(and(
      eq(caseApprenticeAssignmentsTable.caseId, caseId),
      eq(caseApprenticeAssignmentsTable.apprenticeUserId, userId),
      eq(caseApprenticeAssignmentsTable.status, "active"),
    ))
    .limit(1);
  return rows.length > 0;
}

// "test" cases are training/practice cases (no real student). Apprentices get
// full admin-equivalent access on them so a mentor can coach hands-on.
// "live" cases are real students — apprentices stay strictly read-only there.
export async function isTestCase(caseId: string): Promise<boolean> {
  const rows = await db.select({ caseMode: casesTable.caseMode }).from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
  return rows[0]?.caseMode === "test";
}

export async function canUserAccessCase(user: PermissionUser, caseId: string): Promise<boolean> {
  if (user.role === "clinical_apprentice") {
    return isApprenticeAssignedToCase(user.id, caseId);
  }
  if (user.role === "school_clinical_coordinator") {
    const rows = await db.select({ school: casesTable.school }).from(casesTable).where(eq(casesTable.id, caseId)).limit(1);
    return !!rows[0] && !!user.school && rows[0].school === user.school;
  }
  return true;
}

export function canUserEditCase(user: PermissionUser): boolean {
  return user.role !== "clinical_apprentice";
}

export async function canUserViewReport(user: PermissionUser, caseId: string): Promise<boolean> {
  if (user.role === "clinical_apprentice") {
    return isApprenticeAssignedToCase(user.id, caseId);
  }
  return canUserAccessCase(user, caseId);
}

export function canUserReleaseReport(user: PermissionUser): boolean {
  return user.role !== "clinical_apprentice";
}
