import { createHmac, timingSafeEqual } from "node:crypto";

const BATTERY_TEST_TOKEN_DOMAIN = "remynd:raos:battery-test:v1";
export const BATTERY_TEST_TOKEN_TTL_SECONDS = 48 * 60 * 60;

export type BatteryTestTokenClaims = {
  caseId: string;
  assignmentIds: string[];
  fingerprint: string;
  exp: number;
};

export type BatteryTestAssignment = {
  id: string;
  toolId: string;
  toolName?: string;
  respondentType: string;
  respondentLabel: string;
  assignedToEmail?: string | null;
  formItemsSnapshot?: string | null;
};

export type BatteryTestPackageCategory = "parent" | "teacher";

const TEACHER_RESPONDENT_TYPES = new Set([
  "teacher",
  "teacher1",
  "teacher2",
  "referring_teacher",
  "boarding_staff",
  "special_needs_teacher",
  "school_counselor",
]);

const INTAKE_TOOL_IDS = new Set([
  "REFERRAL",
  "REFERRAL-CORP",
  "REFERRAL-UNI",
  "REFERRAL-PARENT",
  "REFERRAL-BOARDING",
  "CONSENT",
  "INTAKE",
]);

function signingKey(secret: string): Buffer {
  if (typeof secret !== "string" || !secret.trim()) {
    throw new Error("SESSION_SECRET environment variable must be set to create or verify assessment test links");
  }
  return createHmac("sha256", secret)
    .update(BATTERY_TEST_TOKEN_DOMAIN)
    .digest();
}

function isValidClaims(value: unknown): value is BatteryTestTokenClaims {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const claims = value as Partial<BatteryTestTokenClaims>;
  return typeof claims.caseId === "string" &&
    claims.caseId.length > 0 &&
    claims.caseId.length <= 256 &&
    Array.isArray(claims.assignmentIds) &&
    claims.assignmentIds.length > 0 &&
    claims.assignmentIds.length <= 100 &&
    claims.assignmentIds.every(id => typeof id === "string" && id.length > 0 && id.length <= 256) &&
    new Set(claims.assignmentIds).size === claims.assignmentIds.length &&
    typeof claims.fingerprint === "string" &&
    /^[a-f0-9]{64}$/i.test(claims.fingerprint) &&
    typeof claims.exp === "number" &&
    Number.isSafeInteger(claims.exp);
}

export function createBatteryTestToken(claims: BatteryTestTokenClaims, secret: string): string {
  if (!isValidClaims(claims)) {
    throw new Error("Invalid assessment test token claims");
  }
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", signingKey(secret))
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyBatteryTestToken(
  token: string | null | undefined,
  secret: string,
  nowMs = Date.now(),
): BatteryTestTokenClaims | null {
  const key = signingKey(secret);
  if (!token || token.length > 16_384) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const expected = createHmac("sha256", key).update(parts[0]).digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(parts[1], "base64url");
  } catch {
    return null;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!isValidClaims(decoded)) return null;

  const nowSeconds = Math.floor(nowMs / 1000);
  if (decoded.exp <= nowSeconds || decoded.exp > nowSeconds + BATTERY_TEST_TOKEN_TTL_SECONDS + 60) {
    return null;
  }
  return decoded;
}

export function batteryTestPackageCategory(
  respondentType: string,
  toolId: string,
): BatteryTestPackageCategory | null {
  if (toolId === "RPPI" || INTAKE_TOOL_IDS.has(toolId)) return null;
  if (respondentType === "parent") return "parent";
  if (TEACHER_RESPONDENT_TYPES.has(respondentType)) return "teacher";
  return null;
}

function packageGroupKey(assignment: BatteryTestAssignment): string | null {
  const category = batteryTestPackageCategory(assignment.respondentType, assignment.toolId);
  if (!category) return null;
  const email = assignment.assignedToEmail;
  return email
    ? `${category}\u0000email:${email}`
    : `${category}\u0000type:${assignment.respondentType}\u0000label:${assignment.respondentLabel}`;
}

export type ValidatedBatteryTestPackage = {
  category: BatteryTestPackageCategory;
  assignments: BatteryTestAssignment[];
};

export function validateBatteryTestPackage(
  allCaseAssignments: readonly BatteryTestAssignment[],
  requestedIds: readonly string[],
): ValidatedBatteryTestPackage | null {
  if (
    requestedIds.length === 0 ||
    requestedIds.length > 100 ||
    new Set(requestedIds).size !== requestedIds.length
  ) {
    return null;
  }

  const byId = new Map(allCaseAssignments.map(assignment => [assignment.id, assignment]));
  const selected = requestedIds.map(id => byId.get(id));
  if (selected.some((assignment): assignment is undefined => assignment === undefined)) return null;
  const rows = selected as BatteryTestAssignment[];
  const keys = new Set(rows.map(packageGroupKey));
  if (keys.size !== 1 || keys.has(null)) return null;

  const key = [...keys][0];
  const category = batteryTestPackageCategory(rows[0].respondentType, rows[0].toolId);
  if (!category) return null;

  const completePackageIds = allCaseAssignments
    .filter(assignment => packageGroupKey(assignment) === key)
    .map(assignment => assignment.id)
    .sort();
  const selectedIds = requestedIds.slice().sort();
  if (
    completePackageIds.length !== selectedIds.length ||
    completePackageIds.some((id, index) => id !== selectedIds[index])
  ) {
    return null;
  }

  return { category, assignments: rows };
}