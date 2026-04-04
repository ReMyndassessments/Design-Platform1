import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

/**
 * Returns email addresses for all admin users seeded in the database.
 * Used for internal system notifications (report downloads, consent alerts, etc.).
 * Falls back to the ADMIN_NOTIFY_EMAILS env var if set.
 */
export async function getAdminEmails(): Promise<string[]> {
  const envOverride = process.env.ADMIN_NOTIFY_EMAILS;
  if (envOverride) {
    return envOverride.split(",").map(e => e.trim()).filter(Boolean);
  }
  const admins = await db
    .select({ email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));
  return admins.map(a => a.email).filter(Boolean) as string[];
}
