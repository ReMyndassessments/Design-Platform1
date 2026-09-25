type Role = "parent" | "teacher" | "other";

const teacherTypes = new Set(["teacher1", "teacher2", "referring_teacher", "school_counselor", "special_needs_teacher", "boarding_staff"]);
const emailKey = (email: string) => email.trim().toLowerCase();

export function resolveReportRole(respondentType: string | null): "parent" | "teacher" | null {
  if (respondentType === "parent") return "parent";
  if (respondentType && teacherTypes.has(respondentType)) return "teacher";
  return null;
}

export function matchingQuestionPortalToken(
  requests: Array<{ sentAt: Date | null; assignmentId: string | null; questionOnlyToken: string | null; audience: "parent" | "teacher"; recipientEmail: string }>,
  role: "parent" | "teacher",
  email: string,
): string | null {
  return requests.find(request =>
    request.sentAt &&
    request.assignmentId === null &&
    request.questionOnlyToken &&
    request.audience === role &&
    emailKey(request.recipientEmail) === emailKey(email),
  )?.questionOnlyToken ?? null;
}

export function matchingAssignmentPortalToken(
  assignments: Array<{ assignedToEmail: string | null; respondentType: string; uniqueToken: string }>,
  role: "parent" | "teacher",
  email: string,
): string | null {
  return assignments.find(item =>
    item.assignedToEmail &&
    emailKey(item.assignedToEmail) === emailKey(email) &&
    resolveReportRole(item.respondentType) === role,
  )?.uniqueToken ?? null;
}

export function recipientMatchesReportToken(
  token: { caseId: string; role: Role; email: string; recipientName?: string | null },
  recipient: { caseId: string; role: "parent" | "teacher"; email: string | null },
): boolean {
  return token.caseId === recipient.caseId &&
    token.role === recipient.role &&
    !token.recipientName?.startsWith("TEST PREVIEW") &&
    !!recipient.email &&
    emailKey(token.email) === emailKey(recipient.email);
}

export function parentPermissionError(
  token: { accessCode: string | null; downloadedAt: Date | null },
  providedCode: string | undefined,
): "access_code_required" | "report_not_downloaded" | null {
  if (token.accessCode && providedCode?.trim() !== token.accessCode) return "access_code_required";
  if (!token.downloadedAt) return "report_not_downloaded";
  return null;
}