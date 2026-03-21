import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "raos-salt-2024").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateToken(userId: string): string {
  return Buffer.from(`${userId}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`).toString("base64");
}

const tokenStore = new Map<string, string>(); // token -> userId

export function storeToken(token: string, userId: string): void {
  tokenStore.set(token, userId);
}

export function getUserIdFromToken(token: string): string | undefined {
  return tokenStore.get(token);
}

export function revokeToken(token: string): void {
  tokenStore.delete(token);
}

export async function getUserById(id: string) {
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return rows[0] ?? null;
}
