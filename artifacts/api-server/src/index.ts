import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable, assessmentToolsTable } from "@workspace/db/schema";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "raos-salt-2024").digest("hex");
}

async function seedIfEmpty() {
  try {
    const existingUsers = await db.select().from(usersTable).limit(1);
    if (existingUsers.length > 0) {
      logger.info("Database already seeded, skipping");
      return;
    }

    logger.info("Seeding database with initial data...");

    await db.insert(usersTable).values([
      { id: "user-admin-001", name: "Noel (Admin)", email: "admin@remynd.com", passwordHash: hashPassword("password"), role: "admin" },
      { id: "user-hayley-002", name: "Hayley (Assessment Lead)", email: "hayley@remynd.com", passwordHash: hashPassword("password"), role: "assessment_lead" },
      { id: "user-abegail-003", name: "Abegail (Psychometrician)", email: "abegail@remynd.com", passwordHash: hashPassword("password"), role: "psychometrician" },
    ]).onConflictDoNothing();

    await db.insert(assessmentToolsTable).values([
      { id: "RCS-80", name: "RCS-80 Core Screener — Observer Rating Checklist", category: "ReMynd Core", description: "ReMynd Core Screener — comprehensive 80-item broad-band screener across key domains", isRemyndOwned: true, respondentTypes: ["parent", "teacher1", "teacher2"], scoringType: "auto", domains: ["attention", "executive_function", "emotional_regulation", "social_communication", "academic_persistence"] },
      { id: "RASR", name: "ReMynd Assessment Self-Report (RASR) — Student Version", category: "ReMynd Self-Report", description: "Student self-report of attentional and behavioural functioning", isRemyndOwned: true, respondentTypes: ["student"], scoringType: "auto", domains: ["attention"] },
      { id: "RARI", name: "ReMynd Attention Rating Inventory", category: "ReMynd Attention", description: "Observer-rated attention and executive function inventory", isRemyndOwned: true, respondentTypes: ["parent", "teacher1"], scoringType: "auto", domains: ["attention", "executive_function"] },
      { id: "REFI", name: "ReMynd Executive Function Inventory", category: "ReMynd Executive Function", description: "Comprehensive executive function rating scale", isRemyndOwned: true, respondentTypes: ["parent", "teacher1", "teacher2"], scoringType: "auto", domains: ["executive_function"] },
      { id: "RERMS", name: "ReMynd Emotional Regulation & Mood Scale", category: "ReMynd Emotional Regulation", description: "Emotional regulation and mood assessment", isRemyndOwned: true, respondentTypes: ["parent", "teacher1"], scoringType: "auto", domains: ["emotional_regulation"] },
      { id: "RSCP", name: "ReMynd Social Communication Profile", category: "ReMynd Social Communication", description: "Social communication and pragmatic language rating scale", isRemyndOwned: true, respondentTypes: ["parent", "teacher1"], scoringType: "auto", domains: ["social_communication"] },
      { id: "RARPS", name: "ReMynd Academic & Reading Performance Scale", category: "ReMynd Academic", description: "Academic performance and reading skills assessment", isRemyndOwned: true, respondentTypes: ["teacher1", "teacher2"], scoringType: "auto", domains: ["academic_persistence"] },
      { id: "RFII", name: "ReMynd Family & Home Influence Inventory", category: "ReMynd Family", description: "Family and home environment impact assessment", isRemyndOwned: true, respondentTypes: ["parent"], scoringType: "auto", domains: ["emotional_regulation", "executive_function"] },
      { id: "Conners", name: "Conners Rating Scale", category: "External — Standardized", description: "Conners-4 standardized rating scale for ADHD assessment", isRemyndOwned: false, respondentTypes: ["parent", "teacher1", "teacher2", "student"], scoringType: "manual", domains: ["attention", "executive_function"] },
      { id: "BRIEF", name: "BRIEF-2", category: "External — Standardized", description: "Behavior Rating Inventory of Executive Function — 2nd Edition", isRemyndOwned: false, respondentTypes: ["parent", "teacher1"], scoringType: "manual", domains: ["executive_function"] },
      { id: "BASC", name: "BASC-3", category: "External — Standardized", description: "Behavior Assessment System for Children — 3rd Edition", isRemyndOwned: false, respondentTypes: ["parent", "teacher1", "teacher2", "student"], scoringType: "manual", domains: ["attention", "emotional_regulation", "social_communication", "academic_persistence"] },
      { id: "REFERRAL", name: "ReMynd Referral Form", category: "ReMynd Admin Forms", description: "Initial referral form for schools and parents to initiate an assessment request", isRemyndOwned: true, respondentTypes: ["parent", "school"], scoringType: "manual", domains: [] },
      { id: "CONSENT", name: "Parental Consent Form", category: "ReMynd Admin Forms", description: "Bilingual parental consent form covering assessment, data privacy, and AI usage", isRemyndOwned: true, respondentTypes: ["parent"], scoringType: "manual", domains: [] },
      { id: "INTAKE", name: "Assessment Intake Form — Parent", category: "ReMynd Admin Forms", description: "Comprehensive bilingual parent intake form covering developmental, family, academic, and health history", isRemyndOwned: true, respondentTypes: ["parent"], scoringType: "manual", domains: [] },
    ]).onConflictDoNothing();

    logger.info("Database seeded successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed database");
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

seedIfEmpty().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
