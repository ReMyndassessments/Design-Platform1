import { db } from "@workspace/db";
import { usersTable, assessmentToolsTable } from "@workspace/db/schema";
import { sql } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "raos-salt-2024").digest("hex");
}

async function seed() {
  console.log("Seeding database...");

  await db.insert(usersTable).values([
    {
      id: "user-admin-001",
      name: "Noel (Admin)",
      email: "admin@remynd.com",
      passwordHash: hashPassword("password"),
      role: "admin",
    },
    {
      id: "user-hayley-002",
      name: "Hayley (Assessment Lead)",
      email: "hayley@remynd.com",
      passwordHash: hashPassword("password"),
      role: "assessment_lead",
    },
    {
      id: "user-abegail-003",
      name: "Abegail (Psychometrician)",
      email: "abegail@remynd.com",
      passwordHash: hashPassword("password"),
      role: "psychometrician",
    },
  ]).onConflictDoNothing();

  await db.insert(assessmentToolsTable).values([
    {
      id: "RCS-80",
      name: "RCS-80 Core Screener",
      category: "ReMynd Core",
      description: "ReMynd Core Screener — comprehensive 80-item broad-band screener across key domains",
      isRemyndOwned: true,
      respondentTypes: ["parent", "teacher1", "teacher2"],
      scoringType: "auto",
      domains: ["attention", "executive_function", "emotional_regulation", "social_communication", "academic_persistence"],
    },
    {
      id: "RASR",
      name: "RASR",
      category: "ReMynd Self-Report",
      description: "ReMynd Attention Self-Report — student self-report of attentional functioning",
      isRemyndOwned: true,
      respondentTypes: ["student"],
      scoringType: "auto",
      domains: ["attention"],
    },
    {
      id: "RARI",
      name: "RARI",
      category: "ReMynd Attention",
      description: "ReMynd Attention Rating Inventory",
      isRemyndOwned: true,
      respondentTypes: ["parent", "teacher1"],
      scoringType: "auto",
      domains: ["attention", "executive_function"],
    },
    {
      id: "REFI",
      name: "REFI",
      category: "ReMynd Executive Function",
      description: "ReMynd Executive Function Inventory",
      isRemyndOwned: true,
      respondentTypes: ["parent", "teacher1", "teacher2"],
      scoringType: "auto",
      domains: ["executive_function"],
    },
    {
      id: "RERMS",
      name: "RERMS",
      category: "ReMynd Emotional Regulation",
      description: "ReMynd Emotional Regulation and Management Scale",
      isRemyndOwned: true,
      respondentTypes: ["parent", "teacher1"],
      scoringType: "auto",
      domains: ["emotional_regulation"],
    },
    {
      id: "RSCP",
      name: "RSCP",
      category: "ReMynd Social Communication",
      description: "ReMynd Social Communication Profile",
      isRemyndOwned: true,
      respondentTypes: ["parent", "teacher1"],
      scoringType: "auto",
      domains: ["social_communication"],
    },
    {
      id: "RARPS",
      name: "RARPS",
      category: "ReMynd Academic",
      description: "ReMynd Academic and Reading Performance Scale",
      isRemyndOwned: true,
      respondentTypes: ["teacher1", "teacher2"],
      scoringType: "auto",
      domains: ["academic_persistence"],
    },
    {
      id: "RFII",
      name: "RFII",
      category: "ReMynd Family",
      description: "ReMynd Family Impact Inventory",
      isRemyndOwned: true,
      respondentTypes: ["parent"],
      scoringType: "auto",
      domains: ["emotional_regulation", "executive_function"],
    },
    {
      id: "Conners",
      name: "Conners Rating Scale",
      category: "External — Standardized",
      description: "Conners-4 standardized rating scale for ADHD assessment",
      isRemyndOwned: false,
      respondentTypes: ["parent", "teacher1", "teacher2", "student"],
      scoringType: "manual",
      domains: ["attention", "executive_function"],
    },
    {
      id: "BRIEF",
      name: "BRIEF-2",
      category: "External — Standardized",
      description: "Behavior Rating Inventory of Executive Function — 2nd Edition",
      isRemyndOwned: false,
      respondentTypes: ["parent", "teacher1"],
      scoringType: "manual",
      domains: ["executive_function"],
    },
    {
      id: "BASC",
      name: "BASC-3",
      category: "External — Standardized",
      description: "Behavior Assessment System for Children — 3rd Edition",
      isRemyndOwned: false,
      respondentTypes: ["parent", "teacher1", "teacher2", "student"],
      scoringType: "manual",
      domains: ["attention", "emotional_regulation", "social_communication", "academic_persistence"],
    },
    {
      id: "REFERRAL",
      name: "ReMynd Referral Form",
      category: "ReMynd Admin Forms",
      description: "Initial referral form for schools and parents to initiate an assessment request",
      isRemyndOwned: true,
      respondentTypes: ["parent", "school"],
      scoringType: "manual",
      domains: [],
    },
    {
      id: "CONSENT",
      name: "Parental Consent Form",
      category: "ReMynd Admin Forms",
      description: "Bilingual parental consent form covering assessment, data privacy, and AI usage",
      isRemyndOwned: true,
      respondentTypes: ["parent"],
      scoringType: "manual",
      domains: [],
    },
    {
      id: "INTAKE",
      name: "Assessment Intake Form — Parent",
      category: "ReMynd Admin Forms",
      description: "Comprehensive bilingual parent intake form covering developmental, family, academic, and health history",
      isRemyndOwned: true,
      respondentTypes: ["parent"],
      scoringType: "manual",
      domains: [],
    },
  ]).onConflictDoNothing();

  console.log("Seed complete!");
}

seed().catch(console.error).finally(() => process.exit(0));
