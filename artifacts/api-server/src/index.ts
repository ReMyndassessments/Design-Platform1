import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable, assessmentToolsTable } from "@workspace/db/schema";
import { inArray, notInArray } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "raos-salt-2024").digest("hex");
}

const CANONICAL_TOOLS: (typeof assessmentToolsTable.$inferInsert)[] = [
  {
    id: "RCS-80",
    name: "RCS-80 Core Screener — Observer Rating Checklist",
    category: "ReMynd Core",
    description: "ReMynd Core Screener — comprehensive 80-item broad-band screener across key domains",
    isRemyndOwned: true,
    respondentTypes: ["parent", "teacher1", "teacher2"],
    scoringType: "auto",
    domains: ["attention", "executive_function", "emotional_regulation", "social_communication", "academic_persistence"],
  },
  {
    id: "RASR",
    name: "ReMynd Assessment Self-Report (RASR) — Student Version",
    category: "ReMynd Self-Report",
    description: "ReMynd Attention Self-Report — student self-report of attentional functioning",
    isRemyndOwned: true,
    respondentTypes: ["student"],
    scoringType: "auto",
    domains: ["attention"],
  },
  {
    id: "REFERRAL",
    name: "ReMynd Student Referral Form",
    category: "ReMynd Admin Forms",
    description: "Initial referral form for schools and parents to initiate an assessment request",
    isRemyndOwned: true,
    respondentTypes: ["parent", "school"],
    scoringType: "manual",
    domains: [],
  },
  {
    id: "CONSENT",
    name: "ReMynd Parental Consent Form",
    category: "ReMynd Admin Forms",
    description: "Bilingual parental consent form covering assessment, data privacy, and AI usage",
    isRemyndOwned: true,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: [],
  },
  {
    id: "INTAKE",
    name: "ReMynd Parent Assessment Intake Form",
    category: "ReMynd Admin Forms",
    description: "Comprehensive bilingual parent intake form covering developmental, family, academic, and health history",
    isRemyndOwned: true,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: [],
  },
];

const CANONICAL_IDS = CANONICAL_TOOLS.map(t => t.id as string);

async function syncTools() {
  try {
    for (const tool of CANONICAL_TOOLS) {
      await db.insert(assessmentToolsTable).values(tool).onConflictDoUpdate({
        target: assessmentToolsTable.id,
        set: {
          name: tool.name,
          category: tool.category,
          description: tool.description,
          isRemyndOwned: tool.isRemyndOwned,
          respondentTypes: tool.respondentTypes,
          scoringType: tool.scoringType,
          domains: tool.domains,
        },
      });
    }

    const allTools = await db
      .select({ id: assessmentToolsTable.id, isRemyndOwned: assessmentToolsTable.isRemyndOwned })
      .from(assessmentToolsTable);
    const extraIds = allTools
      .filter(t => t.isRemyndOwned && !CANONICAL_IDS.includes(t.id))
      .map(t => t.id);
    if (extraIds.length > 0) {
      await db.delete(assessmentToolsTable).where(inArray(assessmentToolsTable.id, extraIds));
      logger.info({ removed: extraIds }, "Removed non-canonical Remynd-owned tools");
    }

    logger.info({ count: CANONICAL_TOOLS.length }, "Assessment tools synced");
  } catch (err) {
    logger.error({ err }, "Failed to sync assessment tools");
  }
}

async function seedIfEmpty() {
  try {
    const existingUsers = await db.select().from(usersTable).limit(1);
    if (existingUsers.length > 0) {
      logger.info("Users already seeded, skipping user seed");
      return;
    }

    logger.info("Seeding demo users...");
    await db.insert(usersTable).values([
      { id: "user-admin-001", name: "Noel (Admin)", email: "admin@remynd.com", passwordHash: hashPassword("password"), role: "admin" },
      { id: "user-hayley-002", name: "Hayley (Assessment Lead)", email: "hayley@remynd.com", passwordHash: hashPassword("password"), role: "assessment_lead" },
      { id: "user-abegail-003", name: "Abegail (Psychometrician)", email: "abegail@remynd.com", passwordHash: hashPassword("password"), role: "psychometrician" },
    ]).onConflictDoNothing();
    logger.info("Demo users seeded successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed users");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

Promise.all([seedIfEmpty(), syncTools()]).then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
