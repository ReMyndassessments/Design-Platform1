import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable, assessmentToolsTable } from "@workspace/db/schema";
import type { ScoringConfig } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "raos-salt-2024").digest("hex");
}

const RASR_SCORING_CONFIG: ScoringConfig = {
  max: 4,
  thresholds: { low: 25, mild: 50, moderate: 65 },
  domains: {
    sustained_attention: {
      label: "Sustained Attention",
      shortLabel: "Attention",
      narratives: {
        low: "Demonstrates strong ability to sustain attention across extended tasks with minimal difficulty.",
        mild: "Shows mild challenges with sustaining attention, particularly during longer or repetitive activities.",
        moderate: "Experiences moderate difficulty maintaining focus over time, often requiring redirection and support.",
        elevated: "Significant challenges with sustained attention that substantially impact academic and daily functioning.",
      },
    },
    distractibility: {
      label: "Distractibility",
      shortLabel: "Distractibility",
      narratives: {
        low: "Shows good ability to filter out irrelevant stimuli and maintain focus in varied environments.",
        mild: "Occasionally drawn off-task by environmental factors; generally able to refocus with minimal support.",
        moderate: "Moderately susceptible to environmental distractions, often requiring a structured setting to stay on task.",
        elevated: "Highly distractible; even minor environmental changes significantly disrupt concentration and task completion.",
      },
    },
    impulse_regulation: {
      label: "Impulse Regulation",
      shortLabel: "Impulse",
      narratives: {
        low: "Demonstrates good impulse control; typically thinks before acting and waits appropriately for turn-taking.",
        mild: "Mild impulsivity noted in some situations; generally manageable with reminders or low-level support.",
        moderate: "Moderate impulse control challenges observed; frequently acts or speaks before thinking, impacting social and academic settings.",
        elevated: "Significant impulsivity that is pervasive across settings, creating frequent disruptions and social difficulties.",
      },
    },
    task_initiation: {
      label: "Task Initiation & Completion",
      shortLabel: "Task Init.",
      narratives: {
        low: "Initiates and completes tasks independently with strong follow-through across most settings.",
        mild: "Mild difficulties with starting or completing tasks; may procrastinate occasionally but generally self-corrects.",
        moderate: "Moderate challenges with task initiation and completion; often requires prompting and structured support.",
        elevated: "Substantial difficulties getting started and finishing tasks, often leaving work incomplete without intensive support.",
      },
    },
    behavioral_modulation: {
      label: "Behavioral Modulation",
      shortLabel: "Behavior",
      narratives: {
        low: "Demonstrates appropriate behavioral regulation across settings with ability to match energy to context.",
        mild: "Mild challenges with behavioral regulation; generally manages activity level with occasional reminders.",
        moderate: "Moderate behavioral modulation difficulties; activity level and behavior vary considerably across contexts.",
        elevated: "Significant challenges regulating behavior and activity level, with pronounced hyperactivity or restlessness noted across settings.",
      },
    },
  },
};

const RCS80_SCORING_CONFIG: ScoringConfig = {
  max: 4,
  thresholds: { low: 25, mild: 50, moderate: 65 },
  domains: {
    attention: {
      label: "Attention",
      shortLabel: "Attention",
      narratives: {
        low: "Attention skills appear age-appropriate with minimal signs of difficulty.",
        mild: "Mild attentional concerns noted; generally functioning within expected range.",
        moderate: "Moderate attentional difficulties present; impacts functioning in structured settings.",
        elevated: "Significant attentional difficulties that substantially impact academic and social functioning.",
      },
    },
    executive_function: {
      label: "Executive Function",
      shortLabel: "Exec. Fn.",
      narratives: {
        low: "Executive function skills appear well-developed with strong planning and organization.",
        mild: "Mild executive function challenges noted; generally manageable with minimal support.",
        moderate: "Moderate executive function difficulties; impacts planning, organization, and task management.",
        elevated: "Significant executive function deficits requiring structured intervention and support.",
      },
    },
    emotional_regulation: {
      label: "Emotional Regulation",
      shortLabel: "Emotional",
      narratives: {
        low: "Emotional regulation appears age-appropriate; manages feelings effectively across settings.",
        mild: "Mild emotional regulation difficulties; occasional mood fluctuations noted.",
        moderate: "Moderate emotional regulation challenges; frequent difficulties managing emotional responses.",
        elevated: "Significant emotional dysregulation impacting social and academic functioning substantially.",
      },
    },
    social_communication: {
      label: "Social Communication",
      shortLabel: "Social",
      narratives: {
        low: "Social communication skills are well-developed; interacts appropriately with peers and adults.",
        mild: "Mild social communication difficulties; generally participates appropriately in social interactions.",
        moderate: "Moderate social communication challenges; difficulties with peer relationships and social conventions.",
        elevated: "Significant social communication deficits substantially impacting peer relationships and social participation.",
      },
    },
    academic_persistence: {
      label: "Academic Persistence",
      shortLabel: "Academic",
      narratives: {
        low: "Demonstrates strong academic persistence; engages consistently with academic tasks.",
        mild: "Mild academic persistence difficulties; generally completes work with minimal prompting.",
        moderate: "Moderate academic persistence challenges; frequently requires support to maintain engagement.",
        elevated: "Significant academic persistence deficits; rarely completes tasks without intensive support.",
      },
    },
  },
};

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
    scoringConfig: RCS80_SCORING_CONFIG,
  },
  {
    id: "RASR",
    name: "ReMynd Assessment Self-Report (RASR) — Student Version",
    category: "ReMynd Self-Report",
    description: "ReMynd Attention Self-Report — student self-report of attentional functioning",
    isRemyndOwned: true,
    respondentTypes: ["self"],
    scoringType: "auto",
    domains: ["sustained_attention", "distractibility", "impulse_regulation", "task_initiation", "behavioral_modulation"],
    scoringConfig: RASR_SCORING_CONFIG,
  },
  {
    id: "REFERRAL",
    name: "ReMynd Student Referral Form",
    category: "ReMynd Admin Forms",
    description: "Initial referral form for schools and parents to initiate an assessment request",
    isRemyndOwned: true,
    respondentTypes: ["parent", "referring_teacher"],
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
          scoringConfig: tool.scoringConfig ?? null,
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
