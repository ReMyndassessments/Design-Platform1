import { db } from "@workspace/db";
import { assignmentsTable, intakeQuestionRequestsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { matchingAssignmentPortalToken, matchingQuestionPortalToken } from "./recipientPortalIdentity.js";
export { recipientMatchesReportToken } from "./recipientPortalIdentity.js";

type Role = "parent" | "teacher" | "other";

/** Keep the first question link when possible; otherwise use the recipient's form link. */
export async function reportRecipientPortalUrl(
  base: string, caseId: string, email: string, role: Role, fallbackToken: string,
): Promise<string> {
  if (role === "parent" || role === "teacher") {
    const requests = await db.select().from(intakeQuestionRequestsTable)
      .where(eq(intakeQuestionRequestsTable.caseId, caseId));
    const questionLink = matchingQuestionPortalToken(requests, role, email);
    if (questionLink) return `${base}/external/${questionLink}`;

    const assignments = await db.select().from(assignmentsTable)
      .where(eq(assignmentsTable.caseId, caseId));
    const assignmentToken = matchingAssignmentPortalToken(assignments, role, email);
    if (assignmentToken) return `${base}/external/${assignmentToken}`;
  }
  // New recipients still get a branded portal, scoped to their report token.
  return `${base}/external/${fallbackToken}`;
}