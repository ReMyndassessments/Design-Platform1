import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable, assessmentToolsTable } from "@workspace/db/schema";
import type { ScoringConfig } from "@workspace/db/schema";
import { RCEP_CORE_FORM, BYI2_FORM, RCADS_FORM, SCAS_FORM, RSCA_FORM, REFI_FORM, RERMS_FORM, BSPP_FORM } from "./lib/questions.js";
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

const RCEP_CORE_SCORING_CONFIG: ScoringConfig = {
  max: 4,
  // Bands: 0–25% = Minimal, 26–50% = Mild, 51–75% = Moderate, 76–100% = Elevated
  // Per domain max = 36 (9 items × 4); bands: 0–9 Minimal, 10–18 Mild, 19–27 Moderate, 28–36 Elevated
  thresholds: { low: 25, mild: 50, moderate: 75 },
  domains: {
    attention_regulation: {
      label: "Attention Regulation",
      shortLabel: "Attention",
      narratives: {
        low: "Attention regulation appears within age-expected limits. No significant concerns were endorsed in this domain.",
        mild: "Mild attentional regulation difficulties noted. Student may occasionally require redirection but generally manages adequately across settings.",
        moderate: "Moderate attention regulation challenges present. Difficulties sustaining focus, controlling impulses, and completing tasks without support are impacting functioning.",
        elevated: "Significant attention regulation difficulties observed across settings. Persistent inattention, impulsivity, and restlessness are substantially impacting academic and daily functioning.",
      },
    },
    executive_functioning: {
      label: "Executive Functioning",
      shortLabel: "Executive Fn.",
      narratives: {
        low: "Executive functioning skills appear well-developed. Student demonstrates adequate planning, organization, and cognitive flexibility.",
        mild: "Mild executive functioning challenges noted. Occasional difficulty with planning or task management; generally manageable with minimal support.",
        moderate: "Moderate executive functioning difficulties present. Challenges with organization, task prioritization, flexibility, and self-monitoring are impacting academic performance.",
        elevated: "Significant executive functioning deficits observed. Pervasive difficulties with planning, organization, cognitive flexibility, and error monitoring require structured and intensive support.",
      },
    },
    emotional_regulation: {
      label: "Emotional Regulation",
      shortLabel: "Emotional",
      narratives: {
        low: "Emotional regulation appears within typical limits. Student manages feelings and emotional responses adequately across contexts.",
        mild: "Mild emotional regulation difficulties noted. Occasional mood variability or anxious reactions observed; generally recovers with minimal support.",
        moderate: "Moderate emotional regulation challenges present. Frequent difficulties managing emotional responses, including anxiety, discouragement, and prolonged upset, are impacting daily functioning.",
        elevated: "Significant emotional dysregulation observed. Persistent and intense emotional reactions substantially interfere with academic engagement, peer relationships, and daily functioning.",
      },
    },
    social_communication: {
      label: "Social Communication",
      shortLabel: "Social",
      narratives: {
        low: "Social communication skills are well-developed. Student initiates and sustains interactions appropriately and demonstrates social perspective-taking.",
        mild: "Mild social communication difficulties noted. Occasional challenges with peer interaction or social flexibility; generally participates in social contexts adequately.",
        moderate: "Moderate social communication challenges present. Difficulties initiating interactions, interpreting social cues, and collaborating with peers are impacting social participation.",
        elevated: "Significant social communication deficits observed. Persistent difficulties with peer interaction, social cue interpretation, and group participation substantially limit social engagement.",
      },
    },
    academic_persistence: {
      label: "Academic Persistence",
      shortLabel: "Persistence",
      narratives: {
        low: "Academic persistence appears adequate. Student generally maintains effort during challenging tasks and recovers from setbacks with minimal support.",
        mild: "Mild academic persistence difficulties noted. Occasional avoidance or discouragement observed; student generally re-engages with encouragement.",
        moderate: "Moderate academic persistence challenges present. Frequent avoidance, early disengagement, and reliance on external motivation are impacting academic progress.",
        elevated: "Significant academic persistence deficits observed. Student consistently avoids challenge, disengages rapidly, and requires intensive external support to sustain academic effort.",
      },
    },
    functional_impact: {
      label: "Functional Impact",
      shortLabel: "Impact",
      narratives: {
        low: "Minimal functional impact reported. Difficulties, if present, do not appear to significantly interfere with classroom performance, peer relationships, or daily routines.",
        mild: "Mild functional impact noted. Some areas of daily functioning are affected, but the student generally manages with low-level support.",
        moderate: "Moderate functional impact present. Difficulties are interfering with classroom performance, homework completion, confidence, and participation across multiple areas.",
        elevated: "Significant functional impact observed. Difficulties are substantially interfering with academic functioning, peer relationships, daily routines, and overall confidence. Comprehensive support planning is indicated.",
      },
    },
    protective_factors: {
      label: "Protective Factors",
      shortLabel: "Protective",
      narratives: {
        low: "Limited protective factors identified at this time. Targeted efforts to build supportive adult connections, leverage areas of strength, and foster help-seeking behaviour are recommended.",
        mild: "Some protective factors present. The student demonstrates emerging strengths and connections that can be built upon to support resilience.",
        moderate: "Moderate protective factors observed. The student demonstrates a meaningful range of strengths, positive relationships, and adaptive capacities that can buffer against identified risks.",
        elevated: "Strong protective factors observed. The student demonstrates significant strengths, resilience, and positive connections that provide a solid foundation for intervention and support.",
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
  {
    id: "RASR-OBS",
    name: "ReMynd Attention & Self-Regulation Scale (RASR) — Observer Version",
    category: "ReMynd Self-Report",
    description: "Non-diagnostic functional profiling tool for profiling patterns of attention regulation and behavioral self-control across settings. Observer-rated (third-person) version for parents and teachers. 40 items across 5 subscales.",
    isRemyndOwned: true,
    respondentTypes: ["parent", "teacher1", "teacher2"],
    scoringType: "auto",
    domains: ["sustained_attention", "distractibility", "impulse_regulation", "task_initiation", "behavioral_modulation"],
    scoringConfig: RASR_SCORING_CONFIG,
  },
  {
    id: "RCEP-CORE",
    name: "ReMynd Comprehensive Educational Profile — Tier 2 Core (RCEP-Core)",
    category: "ReMynd Core",
    description: "Whole-child Tier 2 screening tool. 63 items across 7 domains: Attention Regulation, Executive Functioning, Emotional Regulation, Social Communication, Academic Persistence, Functional Impact, and Protective Factors. Multi-informant (Teacher / Parent / Student). Completion time: 8–12 minutes per respondent.",
    isRemyndOwned: true,
    respondentTypes: ["parent", "teacher1", "teacher2", "self"],
    scoringType: "auto",
    domains: ["attention_regulation", "executive_functioning", "emotional_regulation", "social_communication", "academic_persistence", "functional_impact", "protective_factors"],
    scoringConfig: RCEP_CORE_SCORING_CONFIG,
    formItems: RCEP_CORE_FORM,
  },
  {
    id: "BYI2",
    name: "Beck Youth Inventories 2nd Edition",
    category: "social-emotional",
    description: "Self-report measure of emotional and social impairment in children and adolescents. 100 items across 5 scales: Self-Concept, Anxiety, Depression, Anger, and Disruptive Behavior.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["depression", "anxiety", "anger", "disruptive_behavior", "self_concept"],
    formItems: BYI2_FORM,
  },
  {
    id: "RCADS",
    name: "Revised Child Anxiety and Depression Scale",
    category: "social-emotional",
    description: "Measures symptoms of anxiety and depression in children and adolescents. 47 items across 6 subscales: Separation Anxiety, Social Anxiety, Generalized Anxiety, Panic Disorder, Obsessive-Compulsive Disorder, and Major Depressive Disorder.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "auto",
    domains: ["separation_anxiety", "social_anxiety", "generalized_anxiety", "panic_disorder", "obsessive_compulsive", "depression"],
    scoringConfig: { max: 4, thresholds: { low: 25, mild: 50, moderate: 65 }, domains: {} },
    formItems: RCADS_FORM,
  },
  {
    id: "SCAS",
    name: "Spence Children's Anxiety Scale",
    category: "social-emotional",
    description: "Measures the severity of anxiety symptoms in children and adolescents across 6 domains: Generalized Anxiety, Panic/Agoraphobia, Social Phobia, Separation Anxiety, Obsessive-Compulsive, and Physical Injury Fears.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "auto",
    domains: ["generalized_anxiety", "panic_agoraphobia", "social_phobia", "separation_anxiety", "obsessive_compulsive", "physical_injury_fears"],
    scoringConfig: { max: 4, thresholds: { low: 25, mild: 50, moderate: 65 }, domains: {} },
    formItems: SCAS_FORM,
  },
  {
    id: "RSCA",
    name: "Resiliency Scales for Children and Adolescents",
    category: "social-emotional",
    description: "Measures resilience across three domains: Sense of Mastery, Sense of Relatedness, and Emotional Reactivity. 20 items rated on a 5-point frequency scale.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["sense_of_mastery", "sense_of_relatedness", "emotional_reactivity", "resiliency_index"],
    formItems: RSCA_FORM,
  },
  {
    id: "REFI",
    name: "ReMynd Executive Function Inventory (REFI)",
    category: "executive-function",
    description: "Multi-informant measure of executive functioning. 45 items across 6 domains: Working Memory, Planning & Organization, Cognitive Flexibility, Inhibitory Control, Time Management, and Task Monitoring & Self-Correction.",
    isRemyndOwned: true,
    respondentTypes: ["parent", "teacher1", "self", "teacher2"],
    scoringType: "auto",
    domains: ["inhibition", "shifting", "emotional_control", "initiation", "working_memory", "planning_organization", "organization_of_materials", "monitoring"],
    scoringConfig: { max: 4, thresholds: { low: 25, mild: 50, moderate: 65 }, domains: {} },
    formItems: REFI_FORM,
  },
  {
    id: "RERMS",
    name: "ReMynd Emotional Regulation & Mood Scale",
    category: "social-emotional",
    description: "Observer-rated measure of emotional regulation and mood. 42 items across 6 domains: Emotional Intensity, Recovery & Regulation, Anxiety Features, Avoidance Patterns, Mood Variability, and Frustration Tolerance.",
    isRemyndOwned: true,
    respondentTypes: ["parent", "teacher1", "self", "teacher2"],
    scoringType: "auto",
    domains: ["emotional_dysregulation", "depression", "irritability", "anxiety", "mood_lability"],
    scoringConfig: { max: 4, thresholds: { low: 25, mild: 50, moderate: 65 }, domains: {} },
    formItems: RERMS_FORM,
  },
  {
    id: "BSPP",
    name: "REMYND Boarding Pastoral Care and Support Profile",
    category: "social-emotional",
    description: "Boarding staff profile of student wellbeing, adjustment, social functioning, safety, and daily living skills. 54 items across 6 domains.",
    isRemyndOwned: true,
    respondentTypes: ["boarding_staff", "teacher1"],
    scoringType: "manual",
    domains: ["boarding_adjustment", "emotional_distress", "social_functioning", "risk_behaviors", "strengths_and_resilience"],
    formItems: BSPP_FORM,
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
          formItems: tool.formItems ?? null,
        },
      });
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
