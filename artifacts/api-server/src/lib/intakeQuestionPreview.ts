import crypto from "node:crypto";

type Preview = { caseId: string; audience: "teacher" | "parent"; expiresAt: number };
const TTL_MS = 24 * 60 * 60 * 1000;

/** A short-lived, read-only portal link. No question text or answers are encoded in it. */
export function createIntakeQuestionPreviewToken(
  caseId: string, audience: Preview["audience"], secret: string, now = Date.now(),
): string {
  if (!secret) throw new Error("Preview signing secret is unavailable");
  const payload = Buffer.from(JSON.stringify({
    caseId, audience, expiresAt: now + TTL_MS, nonce: crypto.randomBytes(16).toString("base64url"),
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `preview.${payload}.${signature}`;
}

export function readIntakeQuestionPreviewToken(
  token: string, secret: string, now = Date.now(),
): Preview | null {
  if (!secret || token.length > 1024) return null;
  const [prefix, payload, signature, extra] = token.split(".");
  if (prefix !== "preview" || !payload || !signature || extra) return null;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(signature, "base64url"); } catch { return null; }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof parsed.caseId !== "string" || !parsed.caseId ||
      (parsed.audience !== "teacher" && parsed.audience !== "parent") ||
      typeof parsed.expiresAt !== "number" || parsed.expiresAt <= now ||
      parsed.expiresAt > now + TTL_MS) return null;
    return { caseId: parsed.caseId, audience: parsed.audience, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}