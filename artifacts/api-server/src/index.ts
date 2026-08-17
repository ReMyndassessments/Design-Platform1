import app from "./app";
import { logger } from "./lib/logger";
import { setupWatchAlong } from "./lib/watchAlong.js";
import { db } from "@workspace/db";
import { usersTable, assessmentToolsTable, batteriesTable, casesTable, assignmentsTable, responsesTable } from "@workspace/db/schema";
import type { ScoringConfig } from "@workspace/db/schema";
import { RCEP_CORE_FORM, BYI2_FORM, RCADS_FORM, SCAS_FORM, SCAS_P_FORM, RSCA_FORM, REFI_FORM, RERMS_FORM, BSPP_FORM, EFA_FORM, SPP_FORM, RSSC_FORM, RSCP_FORM, RARPS_FORM, RFII_FORM, REFERRAL_CORP_FORM, REFERRAL_UNI_FORM, REFERRAL_PARENT_FORM, REFERRAL_BOARDING_FORM, VADPRS_FORM, VADTRS_FORM, ABC_FORM, YBOCS_SC_FORM, BFI_44_FORM, ASRS_ADHD_FORM, TLPI_FORM, CONSENT_FORM, CONSENT_FORM_V2 } from "./lib/questions.js";
import { RPPI_FORM_ITEMS, RPPI_SCORING_CONFIG } from "./lib/rppi.js";
import { RDA_SCORING_CONFIG } from "./lib/rda.js";
import { RRFA_SCORING_CONFIG } from "./lib/rrfa.js";
import { RRCA_SCORING_CONFIG } from "./lib/rrca.js";
import { CDP_SR_FORM, CDP_CL_FORM, CDP_CI_FORM, CDP_SI_FORM } from "./lib/cdp.js";
import { BASC3_TRS_A_FORM, BASC3_PRS_A_FORM, BASC3_TRS_C_FORM, BASC3_PRS_C_FORM, BASC3_SRP_A_FORM, BASC3_SRP_C_FORM } from "./lib/basc3.js";
import { BRIEF2_PARENT_FORM, BRIEF2_SELF_FORM, BRIEF2_TEACHER_FORM } from "./lib/brief2.js";
import { SDQ_PARENT_FORM, SDQ_TEACHER_FORM, SDQ_SR_FORM, SDQ_P4_FORM, SDQ_P11_FORM, SDQ_T4_FORM, SDQ_T11_FORM, SDQ_SR11_FORM, SDQ_SR18_FORM, GHQ12_FORM, SMFQ_FORM, PSC_FORM, GAD7_FORM, PHQ9_FORM, PHQ9A_FORM, PSS10_FORM, DASS21_FORM, RSES_FORM, WHO5_FORM, AUDIT_FORM, CABS_FORM, FASM_FORM } from "./lib/opentools.js";
import { translateFormItemsWithAI } from "./lib/ai.js";
import { eq, sql, and, ne, or, isNull, isNotNull, desc } from "drizzle-orm";
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
    id: "REFERRAL-CORP",
    name: "ReMynd Corporate Referral Form",
    category: "ReMynd Admin Forms",
    description: "Referral form for HR managers, line managers, or employees initiating a workplace assessment request",
    isRemyndOwned: true,
    respondentTypes: ["clinician"],
    scoringType: "manual",
    domains: [],
    formItems: REFERRAL_CORP_FORM,
  },
  {
    id: "REFERRAL-UNI",
    name: "ReMynd University Student Referral Form",
    category: "ReMynd Admin Forms",
    description: "Referral form for academic staff, student services, or students initiating a university assessment request",
    isRemyndOwned: true,
    respondentTypes: ["referring_teacher"],
    scoringType: "manual",
    domains: [],
    formItems: REFERRAL_UNI_FORM,
  },
  {
    id: "REFERRAL-PARENT",
    name: "ReMynd Parent Self-Referral Form",
    category: "ReMynd Admin Forms",
    description: "Self-referral form for parents or guardians initiating an assessment for their child outside the school pathway",
    isRemyndOwned: true,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: [],
    formItems: REFERRAL_PARENT_FORM,
  },
  {
    id: "REFERRAL-BOARDING",
    name: "ReMynd Boarding Pastoral Referral Form",
    category: "ReMynd Admin Forms",
    description: "Referral form for boarding house staff to refer a student for pastoral or psychoeducational assessment support",
    isRemyndOwned: true,
    respondentTypes: ["boarding_staff"],
    scoringType: "manual",
    domains: [],
    formItems: REFERRAL_BOARDING_FORM,
  },
  {
    id: "CONSENT",
    // CONSENT-PIPL-CORE-V1: updated form with separated consent fields, PIPL compliance, and guardian identification.
    // Previous form (CONSENT_FORM) is preserved for historical submissions via form_items_snapshot on each assignment.
    name: "ReMynd Student Assessment — Parent/Guardian Consent Form",
    category: "ReMynd Admin Forms",
    description: "Parent/Guardian Consent Form (CONSENT-PIPL-CORE-V1): separates sensitive-information consent, identifies consenting guardian, and supports PIPL compliance programme.",
    isRemyndOwned: true,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: [],
    formItems: CONSENT_FORM_V2,
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
    id: "TLPI",
    name: "Tutoring Learning Profile Inventory (TLPI)",
    category: "ReMynd Admin Forms",
    description: "A brief 5\u20137 minute student self-report questionnaire covering learning preferences, attention and study habits, academic confidence, motivation, and goals. 26 items across 5 domains.",
    isRemyndOwned: true,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["learning_preferences", "attention_habits", "academic_profile", "confidence_motivation", "goals"],
    formItems: TLPI_FORM as any,
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
    id: "SCAS-P",
    name: "Spence Children's Anxiety Scale (Parent Report)",
    category: "social-emotional",
    description: "Parent-report version of the SCAS. Measures anxiety symptoms in children across 6 domains: Generalized Anxiety, Panic/Agoraphobia, Social Phobia, Separation Anxiety, Obsessive-Compulsive, and Physical Injury Fears. 38 rated items plus 1 open-ended item.",
    isRemyndOwned: false,
    respondentTypes: ["parent"],
    scoringType: "auto",
    domains: ["generalized_anxiety", "panic_agoraphobia", "social_phobia", "separation_anxiety", "obsessive_compulsive", "physical_injury_fears"],
    scoringConfig: { max: 4, thresholds: { low: 25, mild: 50, moderate: 65 }, domains: {} },
    formItems: SCAS_P_FORM,
  },
  {
    id: "RSCA",
    name: "Resiliency Scales for Children and Adolescents",
    category: "social-emotional",
    description: "Measures resilience across three domains: Sense of Mastery (20 items), Sense of Relatedness (24 items), and Emotional Reactivity (20 items). 64 items rated on a 5-point frequency scale (Never–Almost Always).",
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
    id: "VADPRS",
    name: "Vanderbilt ADHD Diagnostic Parent Rating Scale (VADPRS)",
    category: "attention",
    description: "Parent rating scale for ADHD diagnosis. 55 items: q1–47 symptom frequency across Inattention, Hyperactivity-Impulsivity, Oppositional Defiant, Conduct, and Anxiety/Depression domains; q48–55 academic and social performance rated on a 5-point scale (Excellent→Problematic).",
    isRemyndOwned: false,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: ["attention", "hyperactivity-impulsivity", "oppositional-defiant", "conduct", "anxiety-depression", "academic-performance", "social-functioning"],
    formItems: VADPRS_FORM,
  },
  {
    id: "VADTRS",
    name: "Vanderbilt ADHD Diagnostic Teacher Rating Scale (VADTRS)",
    category: "attention",
    description: "Teacher rating scale for ADHD diagnosis. 44 items: q1–35 symptom frequency across Inattention, Hyperactivity-Impulsivity, Oppositional Defiant, Conduct, and Anxiety/Depression domains; q36–43 academic and classroom performance rated on a 5-point scale (Problematic→Excellent); q44 teacher name.",
    isRemyndOwned: false,
    respondentTypes: ["teacher1", "teacher2"],
    scoringType: "auto",
    domains: ["attention", "hyperactivity-impulsivity", "oppositional-defiant", "conduct", "anxiety-depression", "academic-performance", "classroom-behaviour"],
    formItems: VADTRS_FORM,
  },
  {
    id: "ABC",
    name: "Autism Behavior Checklist (ABC)",
    category: "autism-spectrum",
    description: "The ABC is a 57-item behavior rating checklist designed to screen for and assess the presence and severity of behaviors associated with autism spectrum disorders. It is intended for individuals aged 3 years and older and is completed by a parent, teacher, or other caregiver familiar with the individual's behavior in daily settings.",
    isRemyndOwned: false,
    respondentTypes: ["parent", "teacher1", "teacher2"],
    scoringType: "auto",
    domains: ["language", "restrictive_repetitive_behaviors", "sensory_processing", "social_interaction", "behavior"],
    formItems: ABC_FORM,
  },
  {
    id: "BSPP",
    name: "REMYND Boarding Pastoral Care and Support Profile",
    category: "social-emotional",
    description: "Boarding staff profile of student wellbeing, adjustment, social functioning, safety, and daily living skills. 54 items across 6 domains.",
    isRemyndOwned: true,
    respondentTypes: ["boarding_staff", "teacher1"],
    scoringType: "auto",
    domains: ["boarding_adjustment", "emotional_distress", "social_functioning", "risk_behaviors", "strengths_and_resilience"],
    formItems: BSPP_FORM,
  },
  {
    id: "BEHAVOBS",
    name: "Assessment Behavior Observation",
    category: "behavior",
    description: "A systematic direct observation tool used to measure a student's active and passive engaged time, as well as off-task and disruptive behaviors, in a classroom setting. It is designed for school-aged children and is used by psychologists and educational professionals to assess academic engagement and behavior in the natural environment.",
    isRemyndOwned: true,
    respondentTypes: ["examiner"],
    scoringType: "manual",
    domains: [],
    scoringConfig: null,
    formItems: [
      { id: "behavobs_instr",
        text: "Assessment Behavior Observation",
        textChinese: "评估行为观察",
        textKorean: "평가 행동 관찰",
        type: "section_header", domain: "admin", required: false,
        options: [], optionsChinese: [], optionsKorean: [],
        note: "This form is completed by the assessing clinician or psychometrist during the assessment session. Record your observations of the student's behaviour, presentation, and engagement throughout the session.",
        noteChinese: "本表格由主评临床医生或心理测量师在评估过程中填写。请记录您在整个评估过程中对学生的行为、表现和参与情况的观察。",
        noteKorean: "이 양식은 평가 세션 동안 평가 임상가 또는 심리측정사가 작성합니다. 세션 전반에 걸쳐 학생의 행동, 발표 및 참여에 대한 관찰을 기록해 주세요.",
      },
      { id: "q1",  text: "Student Name:*",                    textChinese: "学生姓名:*",                    textKorean: "학생 이름:*",              type: "text",     domain: "admin",                  options: [], optionsChinese: [], optionsKorean: [] },
      { id: "q2",  text: "Date*",                             textChinese: "日期*",                         textKorean: "날짜*",                    type: "text",     domain: "admin",                  options: [], optionsChinese: [], optionsKorean: [] },
      { id: "q3",  text: "Observer (Psychometrist):*",        textChinese: "观察者（心理测量师）:*",        textKorean: "관찰자 (심리측정사):*",    type: "text",     domain: "admin",                  options: [], optionsChinese: [], optionsKorean: [] },
      { id: "q4",  text: "Presented:*",                       textChinese: "到场情况:*",                    textKorean: "도착 상태:*",              type: "radio",    domain: "behavioral_observation", options: ["On time", "Late", "Early"],                                                         optionsChinese: ["准时", "迟到", "提前"],                                                                              optionsKorean: ["시간 준수", "지각", "조기 도착"] },
      { id: "q5",  text: "Accompanied by: ___*",             textChinese: "陪同人员: ___*",                textKorean: "동반자: ___*",             type: "text",     domain: "behavioral_observation", options: [], optionsChinese: [], optionsKorean: [] },
      { id: "q6",  text: "Appears:*",                         textChinese: "外表看起来:*",                  textKorean: "외관상 보이는 나이:*",     type: "radio",    domain: "behavioral_observation", options: ["Stated Age", "Older", "Younger"],                                                   optionsChinese: ["与实际年龄相符", "比实际年龄显大", "比实际年龄显小"],                                               optionsKorean: ["실제 나이와 일치", "실제 나이보다 더 나이 들어 보임", "실제 나이보다 어려 보임"] },
      { id: "q7",  text: "Dress/Grooming Acceptable for:  *", textChinese: "着装/仪容对于以下方面是可接受的:  *", textKorean: "복장/단장이 다음에 대해 적절함:  *", type: "checkbox", domain: "behavioral_observation", options: ["Weather", "age", "circumstance", "School Uniform"],                           optionsChinese: ["天气", "年龄", "场合", "校服"],                                                                      optionsKorean: ["날씨", "나이", "상황", "교복"] },
      { id: "q8",  text: "Handedness:  *",                   textChinese: "利手:  *",                      textKorean: "주 손:  *",                type: "radio",    domain: "behavioral_observation", options: ["Left", "Right", "Ambidextrous"],                                                     optionsChinese: ["左利手", "右利手", "双手均利"],                                                                      optionsKorean: ["왼손잡이", "오른손잡이", "양손잡이"] },
      { id: "q9",  text: "Glasses:*",                         textChinese: "眼镜:*",                        textKorean: "안경:*",                   type: "radio",    domain: "behavioral_observation", options: ["Yes", "No"],                                                                        optionsChinese: ["是", "否"],                                                                                          optionsKorean: ["예", "아니오"] },
      { id: "q10", text: "Hearing Aid:*",                     textChinese: "助听器:*",                      textKorean: "보청기:*",                 type: "radio",    domain: "behavioral_observation", options: ["Yes", "No"],                                                                        optionsChinese: ["是", "否"],                                                                                          optionsKorean: ["예", "아니오"] },
      { id: "q11", text: "Psychomotor Speed:*",               textChinese: "精神运动速度:*",                textKorean: "정신 운동 속도:*",         type: "radio",    domain: "behavioral_observation", options: ["Average", "Slow", "Fast"],                                                          optionsChinese: ["一般", "缓慢", "快速"],                                                                              optionsKorean: ["평균", "느림", "빠름"] },
      { id: "q12", text: "Rapport:*",                         textChinese: "建立关系:*",                    textKorean: "라포 형성:*",              type: "radio",    domain: "social_interaction",     options: ["Easy", "Slowly", "Intermittent", "Never"],                                             optionsChinese: ["容易", "缓慢", "断断续续", "从未建立"],                                                              optionsKorean: ["쉬움", "느림", "간헐적", "형성되지 않음"] },
      { id: "q13", text: "Speech:*",                          textChinese: "言语:*",                        textKorean: "언어:*",                   type: "radio",    domain: "behavioral_observation", options: ["Gregarious/ Fluid", "Quiet", "Slow", "Too Rapid", "Other"],                         optionsChinese: ["健谈/流利", "安静", "缓慢", "过快", "其他"],                                                         optionsKorean: ["사교적/ 유창함", "조용함", "느림", "너무 빠름", "기타"] },
      { id: "q14", text: "Attitude:*",                        textChinese: "态度:*",                        textKorean: "태도:*",                   type: "radio",    domain: "social_interaction",     options: ["Comfortable", "Withdrawn/Shy", "Guarded", "Hostile"],                                  optionsChinese: ["舒适", "退缩/害羞", "戒备", "敌意"],                                                                 optionsKorean: ["편안함", "위축/수줍음", "방어적", "적대적"] },
      { id: "q15", text: "Affect:*",                          textChinese: "情感:*",                        textKorean: "정동:*",                   type: "radio",    domain: "affect_mood",            options: ["Appropriate to Mood", "Inappropriate", "Flexible", "Blunted", "Flat", "Other"],       optionsChinese: ["与心境相符", "不协调", "灵活", "迟钝", "平淡", "其他"],                                              optionsKorean: ["기분에 적절함", "부적절함", "유연함", "둔화됨", "평탄함", "기타"] },
      { id: "q16", text: "Attitude toward task:*",            textChinese: "对任务的态度:*",                textKorean: "과제에 대한 태도:*",       type: "radio",    domain: "task_engagement",        options: ["Appropriate", "Anxious", "Indifferent", "Guarded", "Negative", "Cooperative", "Other"], optionsChinese: ["适当", "焦虑", "漠不关心", "戒备", "消极", "合作", "其他"],                                           optionsKorean: ["적절함", "불안함", "무관심함", "방어적", "부정적", "협조적", "기타"] },
      { id: "q17", text: "Understood Purpose of Evaluation:*", textChinese: "理解评估目的:*",               textKorean: "평가 목적 이해:*",         type: "radio",    domain: "task_engagement",        options: ["Yes", "No"],                                                                        optionsChinese: ["是", "否"],                                                                                          optionsKorean: ["예", "아니오"] },
      { id: "q18", text: "Concentration:*",                   textChinese: "注意力:*",                      textKorean: "집중력:*",                 type: "radio",    domain: "task_engagement",        options: ["Adequate", "Distractible", "Unable to focus even briefly"],                            optionsChinese: ["充足", "易分心", "即使短暂也无法集中"],                                                              optionsKorean: ["적절함", "산만함", "짧은 시간도 집중 불가"] },
      { id: "q19", text: "Number of Breaks in Session: *",    textChinese: "评估过程中休息次数: *",          textKorean: "세션 중 휴식 횟수: *",     type: "text",     domain: "task_engagement",        options: [], optionsChinese: [], optionsKorean: [] },
      { id: "q20", text: "Redirected to task:*",              textChinese: "被引导回任务:*",                textKorean: "과제로 재유도:*",          type: "radio",    domain: "task_engagement",        options: ["Never", "Sometimes", "Often", "Constantly"],                                           optionsChinese: ["从未", "有时", "经常", "持续不断"],                                                                  optionsKorean: ["없음", "가끔", "자주", "지속적으로"] },
      { id: "q21", text: "Following Instructions:*",          textChinese: "遵循指令:*",                    textKorean: "지시 따르기:*",            type: "radio",    domain: "task_engagement",        options: ["Adequate", "Difficulty", "Unable"],                                                     optionsChinese: ["充分", "有困难", "无法做到"],                                                                        optionsKorean: ["적절함", "어려움 있음", "불가능함"] },
      { id: "q22", text: "Persistence:*",                     textChinese: "坚持性:*",                      textKorean: "지속성:*",                 type: "radio",    domain: "task_engagement",        options: ["Meticulous", "Acceptable", "Good", "Gave up easily"],                                  optionsChinese: ["一丝不苟", "可接受", "良好", "轻易放弃"],                                                            optionsKorean: ["꼼꼼함", "수용 가능", "좋음", "쉽게 포기함"] },
      { id: "q23", text: "Reactions to Errors:*",             textChinese: "对错误的反应:*",                textKorean: "오류에 대한 반응:*",       type: "radio",    domain: "affect_mood",            options: ["No response to success or failure", "Did not recognize errors", "Embarrassed and apologetic", "Critical self-statements even when correct", "Other"], optionsChinese: ["对成功或失败无反应", "未认识到错误", "尴尬并道歉", "即使正确也进行自我批评", "其他"],                   optionsKorean: ["성공/실패에 반응 없음", "오류 인식 못함", "당황하고 사과함", "정답일 때도 자기 비판적 발언", "기타"] },
      { id: "q24", text: "Unusual/Bizarre Behavior:*",        textChinese: "异常/怪异行为:*",               textKorean: "비정상적/기이한 행동:*",   type: "radio",    domain: "behavioral_observation", options: ["Yes", "No"],                                                                        optionsChinese: ["是", "否"],                                                                                          optionsKorean: ["예", "아니오"] },
      { id: "q25", text: "Tests Valid:*",                     textChinese: "测试结果有效:*",                textKorean: "검사 유효성:*",            type: "radio",    domain: "admin",                  options: ["Yes", "No", "Not sure"],                                                           optionsChinese: ["是", "否", "不确定"],                                                                                optionsKorean: ["예", "아니오", "확실하지 않음"] },

      // ── Section 2: Response to Productive Struggle ───────────────────────
      { id: "s2_header",
        text: "Section 2 — Response to Productive Struggle",
        textChinese: "第2节 — 对有益挑战的回应",
        textKorean: "섹션 2 — 생산적 어려움에 대한 반응",
        type: "section_header", domain: "productive_struggle", required: false,
        options: [], optionsChinese: [], optionsKorean: [],
        note: "This section records how the student responded when assessment tasks became difficult, unfamiliar, uncertain, or required increased effort. Rate only behaviours that were reasonably observable during this assessment session. Do not infer abilities or difficulties that were not directly observed.\n\nSelect \"N/O — Not Observed / Insufficient Opportunity\" when the assessment did not provide an adequate opportunity to observe a particular behaviour.\n\nPurpose: to capture Challenge → Response → Strategy → Support → Recovery, not simply whether the student answered correctly.",
        noteChinese: "本节记录学生在评估任务变得困难、不熟悉、不确定或需要更多努力时的反应。仅对本次评估中可合理观察到的行为进行评分。不要推断未直接观察到的能力或困难。\n\n当评估未提供充分机会观察特定行为时，请选择 N/O — 未观察到/观察机会不足。\n\n目的：记录挑战→反应→策略→支持→恢复过程，而非仅记录学生是否答对。",
        noteKorean: "이 섹션은 평가 과제가 어렵거나 낯설거나 불확실하거나 더 많은 노력을 요구할 때 학생이 어떻게 반응했는지 기록합니다. 합리적으로 관찰 가능한 행동만 평가하십시오. 직접 관찰되지 않은 능력이나 어려움을 추론하지 마십시오.\n\n평가가 특정 행동을 관찰할 충분한 기회를 제공하지 않은 경우 \"N/O — 관찰되지 않음/관찰 기회 부족\"을 선택하십시오.\n\n목적: 단순히 학생이 정답을 맞혔는지 여부가 아닌 도전 → 반응 → 전략 → 지원 → 회복을 기록하는 것입니다.",
      },

      // Domain 1 — Challenge Engagement
      { id: "ps_d1",
        text: "Challenge Engagement: When presented with a task where the solution or response was not immediately apparent, the student:",
        textChinese: "挑战参与度：当面对解决方案或答案不立即明显的任务时，学生：",
        textKorean: "도전 참여도: 해결책이나 답이 즉시 명확하지 않은 과제가 주어졌을 때, 학생은:",
        type: "radio", domain: "productive_struggle", required: true,
        options: [
          "1 — Significant Support Need: Avoided/refused engagement or required substantial support to begin",
          "2 — Emerging: Engaged reluctantly or required repeated prompting",
          "3 — Developing: Engaged after some hesitation",
          "4 — Effective: Engaged willingly and sustained initial effort",
          "5 — Strong / Independent: Approached challenge with curiosity and confidence; independent engagement",
          "N/O — Not Observed / Insufficient Opportunity",
        ],
        optionsChinese: [
          "1 — 需要大量支持：回避/拒绝参与，或需要大量支持才能开始",
          "2 — 初步发展：不情愿地参与，或需要反复提示",
          "3 — 正在发展：在一些犹豫后参与",
          "4 — 有效：愿意参与并维持最初努力",
          "5 — 强/独立：以好奇心和自信心面对挑战，独立参与",
          "N/O — 未观察到/观察机会不足",
        ],
        optionsKorean: [
          "1 — 상당한 지원 필요: 참여를 회피/거부하거나 시작하는 데 상당한 지원이 필요함",
          "2 — 발현 중: 마지못해 참여하거나 반복적인 촉구가 필요함",
          "3 — 발달 중: 약간의 망설임 후 참여함",
          "4 — 효과적: 기꺼이 참여하고 초기 노력을 지속함",
          "5 — 강함/독립적: 호기심과 자신감을 갖고 독립적으로 도전에 임함",
          "N/O — 관찰되지 않음/관찰 기회 부족",
        ],
      },

      // Domain 2 — Frustration Tolerance
      { id: "ps_d2",
        text: "Frustration Tolerance: When experiencing difficulty, the student:",
        textChinese: "挫折承受力：当遇到困难时，学生：",
        textKorean: "좌절 내성: 어려움을 경험했을 때, 학생은:",
        type: "radio", domain: "productive_struggle", required: true,
        options: [
          "1 — Significant Support Need: Became overwhelmed, shut down, or was unable to continue",
          "2 — Emerging: Frustration substantially disrupted thinking and required adult support",
          "3 — Developing: Showed frustration but remained engaged with some support",
          "4 — Effective: Managed frustration while maintaining engagement",
          "5 — Strong / Independent: Tolerated difficulty and uncertainty while remaining independently engaged",
          "N/O — Not Observed / Insufficient Opportunity",
        ],
        optionsChinese: [
          "1 — 需要大量支持：变得不知所措、停止或无法继续",
          "2 — 初步发展：沮丧严重干扰思维，需要成人支持",
          "3 — 正在发展：表现出沮丧，但在一些支持下仍保持参与",
          "4 — 有效：在保持参与的同时管理沮丧情绪",
          "5 — 强/独立：在保持独立参与的同时承受困难和不确定性",
          "N/O — 未观察到/观察机会不足",
        ],
        optionsKorean: [
          "1 — 상당한 지원 필요: 압도되거나 멈추거나 계속하지 못함",
          "2 — 발현 중: 좌절이 사고를 크게 방해하여 성인 지원이 필요함",
          "3 — 발달 중: 좌절을 보였지만 약간의 지원으로 참여를 유지함",
          "4 — 효과적: 참여를 유지하면서 좌절을 관리함",
          "5 — 강함/독립적: 독립적 참여를 유지하면서 어려움과 불확실성을 견뎌냄",
          "N/O — 관찰되지 않음/관찰 기회 부족",
        ],
      },

      // Domain 3 — Productive Persistence
      { id: "ps_d3",
        text: "Productive Persistence: When an initial attempt was unsuccessful, the student:",
        textChinese: "有效坚持性：当初次尝试不成功时，学生：",
        textKorean: "생산적 지속성: 초기 시도가 실패했을 때, 학생은:",
        type: "radio", domain: "productive_struggle", required: true,
        note: "Note: Do not equate elapsed time with productive persistence. A student repeatedly using an ineffective strategy should not automatically receive a high rating.",
        noteChinese: "注意：不要将花费的时间等同于有效坚持性。反复使用无效策略的学生不应自动获得高评分。",
        noteKorean: "참고: 경과 시간을 생산적 지속성과 동일시하지 마십시오. 비효과적인 전략을 반복적으로 사용하는 학생은 자동으로 높은 평점을 받아서는 안 됩니다.",
        options: [
          "1 — Significant Support Need: Disengaged almost immediately",
          "2 — Emerging: Made limited attempts before giving up",
          "3 — Developing: Continued with encouragement, but persistence was inconsistent",
          "4 — Effective: Maintained meaningful effort through difficulty",
          "5 — Strong / Independent: Persisted strategically while monitoring whether the approach was working",
          "N/O — Not Observed / Insufficient Opportunity",
        ],
        optionsChinese: [
          "1 — 需要大量支持：几乎立即失去参与",
          "2 — 初步发展：在放弃前做了有限的尝试",
          "3 — 正在发展：在鼓励下继续，但坚持性不稳定",
          "4 — 有效：在困难中保持有意义的努力",
          "5 — 强/独立：有策略地坚持，同时监控方法是否有效",
          "N/O — 未观察到/观察机会不足",
        ],
        optionsKorean: [
          "1 — 상당한 지원 필요: 거의 즉시 참여를 포기함",
          "2 — 발현 중: 포기하기 전 제한적인 시도만 함",
          "3 — 발달 중: 격려로 계속했지만 지속성이 일관되지 않음",
          "4 — 효과적: 어려움 속에서 의미 있는 노력을 유지함",
          "5 — 강함/독립적: 접근법이 효과적인지 모니터링하면서 전략적으로 지속함",
          "N/O — 관찰되지 않음/관찰 기회 부족",
        ],
      },

      // Domain 4 — Strategy Generation
      { id: "ps_d4",
        text: "Strategy Generation: When faced with an unfamiliar or difficult task, the student:",
        textChinese: "策略生成：当面对不熟悉或困难的任务时，学生：",
        textKorean: "전략 생성: 낯설거나 어려운 과제에 직면했을 때, 학생은:",
        type: "radio", domain: "productive_struggle", required: true,
        options: [
          "1 — Significant Support Need: Could not generate an approach without substantial direction",
          "2 — Emerging: Generated limited or poorly matched approaches",
          "3 — Developing: Generated at least one plausible strategy",
          "4 — Effective: Independently generated an appropriate strategy",
          "5 — Strong / Independent: Generated multiple relevant strategies and selected purposefully among them",
          "N/O — Not Observed / Insufficient Opportunity",
        ],
        optionsChinese: [
          "1 — 需要大量支持：没有大量引导无法生成方法",
          "2 — 初步发展：生成了有限或不太适合的方法",
          "3 — 正在发展：生成了至少一个可行策略",
          "4 — 有效：独立生成了适当的策略",
          "5 — 强/独立：生成了多个相关策略并有目的地从中选择",
          "N/O — 未观察到/观察机会不足",
        ],
        optionsKorean: [
          "1 — 상당한 지원 필요: 상당한 지도 없이 접근법을 생성하지 못함",
          "2 — 발현 중: 제한적이거나 잘 맞지 않는 접근법 생성",
          "3 — 발달 중: 적어도 하나의 타당한 전략 생성",
          "4 — 효과적: 적절한 전략을 독립적으로 생성",
          "5 — 강함/독립적: 여러 관련 전략을 생성하고 목적에 맞게 선택",
          "N/O — 관찰되지 않음/관찰 기회 부족",
        ],
      },

      // Domain 5 — Strategy Flexibility
      { id: "ps_d5",
        text: "Strategy Flexibility: When an initial approach was ineffective, the student:",
        textChinese: "策略灵活性：当最初方法无效时，学生：",
        textKorean: "전략 유연성: 초기 접근법이 비효과적이었을 때, 학생은:",
        type: "radio", domain: "productive_struggle", required: true,
        options: [
          "1 — Significant Support Need: Repeated the ineffective approach or stopped",
          "2 — Emerging: Changed approach only after substantial prompting",
          "3 — Developing: Modified the approach after a general cue",
          "4 — Effective: Recognised when the approach was ineffective and changed strategy",
          "5 — Strong / Independent: Independently compared, adapted, and selected alternative strategies",
          "N/O — Not Observed / Insufficient Opportunity",
        ],
        optionsChinese: [
          "1 — 需要大量支持：重复无效方法或停止",
          "2 — 初步发展：仅在大量提示后才改变方法",
          "3 — 正在发展：在一般提示后修改了方法",
          "4 — 有效：识别到方法无效并改变了策略",
          "5 — 强/独立：独立地比较、调整并选择了替代策略",
          "N/O — 未观察到/观察机会不足",
        ],
        optionsKorean: [
          "1 — 상당한 지원 필요: 비효과적인 접근법을 반복하거나 멈춤",
          "2 — 발현 중: 상당한 촉구 후에만 접근법을 변경함",
          "3 — 발달 중: 일반적인 단서 후 접근법을 수정함",
          "4 — 효과적: 접근법이 비효과적임을 인식하고 전략을 변경함",
          "5 — 강함/독립적: 독립적으로 대안 전략을 비교, 적응, 선택함",
          "N/O — 관찰되지 않음/관찰 기회 부족",
        ],
      },

      // Domain 6 — Response to Errors
      { id: "ps_d6",
        text: "Response to Errors (as a learner): After recognising or being prompted to reconsider an error, the student:",
        textChinese: "对错误的反应（作为学习者）：在认识到或被提示重新考虑一个错误后，学生：",
        textKorean: "오류에 대한 반응 (학습자로서): 오류를 인식하거나 재고하도록 촉구받은 후, 학생은:",
        type: "radio", domain: "productive_struggle", required: true,
        note: "Note: This domain captures what the student does with the error as a learner. Item q23 (Reactions to Errors) captures the immediate behavioural/emotional reaction.",
        noteChinese: "注意：本项捕捉学生作为学习者如何处理错误。第q23题（对错误的反应）捕捉即时行为/情绪反应。",
        noteKorean: "참고: 이 영역은 학생이 학습자로서 오류를 어떻게 처리하는지를 기록합니다. q23번 항목(오류에 대한 반응)은 즉각적인 행동/정서적 반응을 기록합니다.",
        options: [
          "1 — Significant Support Need: Shut down, became defensive, or disengaged",
          "2 — Emerging: Required substantial support to examine the error",
          "3 — Developing: Examined/corrected the error with prompting",
          "4 — Effective: Independently checked and learned from the error",
          "5 — Strong / Independent: Actively used the error to revise understanding or strategy",
          "N/O — Not Observed / Insufficient Opportunity",
        ],
        optionsChinese: [
          "1 — 需要大量支持：停止行动、变得防御或脱离参与",
          "2 — 初步发展：需要大量支持才能检查错误",
          "3 — 正在发展：在提示下检查/纠正了错误",
          "4 — 有效：独立检查并从错误中学习",
          "5 — 强/独立：主动利用错误修正理解或策略",
          "N/O — 未观察到/观察机会不足",
        ],
        optionsKorean: [
          "1 — 상당한 지원 필요: 멈추거나 방어적이 되거나 참여를 철회함",
          "2 — 발현 중: 오류를 검토하는 데 상당한 지원이 필요함",
          "3 — 발달 중: 촉구로 오류를 검토/수정함",
          "4 — 효과적: 독립적으로 오류를 확인하고 배움",
          "5 — 강함/독립적: 오류를 이해나 전략을 수정하는 데 능동적으로 활용함",
          "N/O — 관찰되지 않음/관찰 기회 부족",
        ],
      },

      // Domain 7 — Metacognitive Awareness
      { id: "ps_d7",
        text: "Metacognitive Awareness: When asked to explain or reflect upon their thinking, the student:",
        textChinese: "元认知意识：当被要求解释或反思其思维时，学生：",
        textKorean: "메타인지 인식: 자신의 사고를 설명하거나 반성하도록 요청받았을 때, 학생은:",
        type: "radio", domain: "productive_struggle", required: true,
        note: "Observer prompt guidance (do not include these in reports): \"Tell me what you're thinking.\" / \"What are you trying?\" / \"Is that working?\" / \"How do you know?\" / \"What might you try next?\"",
        noteChinese: "观察者提示指南（不要将这些包含在报告中）：\"告诉我你在想什么。\" / \"你在尝试什么？\" / \"那有效吗？\" / \"你怎么知道？\" / \"你接下来可能会尝试什么？\"",
        noteKorean: "관찰자 촉구 지침 (보고서에 포함하지 마십시오): \"무슨 생각을 하고 있나요?\" / \"무엇을 시도하고 있나요?\" / \"그게 효과가 있나요?\" / \"어떻게 알았나요?\" / \"다음에 무엇을 시도할 것 같나요?\"",
        options: [
          "1 — Significant Support Need: Was unable to describe thinking or approach",
          "2 — Emerging: Demonstrated limited awareness even with prompting",
          "3 — Developing: Described basic thinking with structured prompts",
          "4 — Effective: Explained strategy and monitored progress effectively",
          "5 — Strong / Independent: Demonstrated strong awareness of strategy, uncertainty, effectiveness, and possible next steps",
          "N/O — Not Observed / Insufficient Opportunity",
        ],
        optionsChinese: [
          "1 — 需要大量支持：无法描述思维或方法",
          "2 — 初步发展：即使在提示下也表现出有限的意识",
          "3 — 正在发展：在结构性提示下描述了基本思维",
          "4 — 有效：有效地解释了策略并监控了进展",
          "5 — 强/独立：对策略、不确定性、有效性和可能的下一步表现出强烈的意识",
          "N/O — 未观察到/观察机会不足",
        ],
        optionsKorean: [
          "1 — 상당한 지원 필요: 사고나 접근법을 설명하지 못함",
          "2 — 발현 중: 촉구해도 제한적인 인식만 보임",
          "3 — 발달 중: 구조화된 촉구로 기본 사고를 설명함",
          "4 — 효과적: 전략을 효과적으로 설명하고 진행 상황을 모니터링함",
          "5 — 강함/독립적: 전략, 불확실성, 효과성 및 가능한 다음 단계에 대한 강한 인식을 보임",
          "N/O — 관찰되지 않음/관찰 기회 부족",
        ],
      },

      // Domain 8 — Help-Seeking Behavior
      { id: "ps_d8",
        text: "Help-Seeking Behaviour: When assistance was needed, the student:",
        textChinese: "求助行为：当需要帮助时，学生：",
        textKorean: "도움 구하기 행동: 도움이 필요했을 때, 학생은:",
        type: "radio", domain: "productive_struggle", required: true,
        note: "Note: The important construct is strategic help-seeking while maintaining ownership of thinking. Asking for help frequently is not automatically positive or negative.",
        noteChinese: "注意：重要的是在保持思维所有权的同时进行策略性求助。频繁寻求帮助不会自动被认为是积极或消极的。",
        noteKorean: "참고: 중요한 구성 요소는 사고의 주인의식을 유지하면서 전략적으로 도움을 구하는 것입니다. 자주 도움을 구하는 것이 자동으로 긍정적이거나 부정적인 것은 아닙니다.",
        options: [
          "1 — Significant Support Need: Refused necessary help OR immediately transferred responsibility to the adult",
          "2 — Emerging: Sought help prematurely, repeatedly sought reassurance, or primarily sought answers",
          "3 — Developing: Sought generally appropriate help but required some prompting",
          "4 — Effective: Requested useful clarification/cues while retaining ownership of the task",
          "5 — Strong / Independent: Independently recognised when help was needed and requested the minimum useful assistance",
          "N/O — Not Observed / Insufficient Opportunity",
        ],
        optionsChinese: [
          "1 — 需要大量支持：拒绝必要的帮助，或立即将责任转移给成人",
          "2 — 初步发展：过早寻求帮助、反复寻求安慰或主要寻求答案",
          "3 — 正在发展：寻求了大体适当的帮助，但需要一些提示",
          "4 — 有效：在保持任务所有权的同时寻求有用的澄清/提示",
          "5 — 强/独立：独立识别何时需要帮助，并寻求最少量的有用帮助",
          "N/O — 未观察到/观察机会不足",
        ],
        optionsKorean: [
          "1 — 상당한 지원 필요: 필요한 도움을 거부하거나 즉시 책임을 성인에게 전가함",
          "2 — 발현 중: 너무 일찍 도움을 구하거나 반복적으로 안심을 구하거나 주로 답을 구함",
          "3 — 발달 중: 전반적으로 적절한 도움을 구했지만 일부 촉구가 필요했음",
          "4 — 효과적: 과제의 주인의식을 유지하면서 유용한 설명/단서를 요청함",
          "5 — 강함/독립적: 도움이 필요한 시기를 독립적으로 인식하고 최소한의 유용한 도움을 요청함",
          "N/O — 관찰되지 않음/관찰 기회 부족",
        ],
      },

      // Domain 9 — Response to Scaffolding
      { id: "ps_d9",
        text: "Response to Scaffolding: When support was provided, the student:",
        textChinese: "对脚手架支持的反应：当提供支持时，学生：",
        textKorean: "스캐폴딩에 대한 반응: 지원이 제공되었을 때, 학생은:",
        type: "radio", domain: "productive_struggle", required: true,
        options: [
          "1 — Significant Support Need: Showed little meaningful improvement despite substantial support",
          "2 — Emerging: Required repeated structured support to continue",
          "3 — Developing: Benefited from moderate scaffolding",
          "4 — Effective: Responded well to limited strategic support",
          "5 — Strong / Independent: Used minimal support effectively and quickly returned to independent thinking",
          "N/O — No Scaffolding Required / Insufficient Opportunity",
        ],
        optionsChinese: [
          "1 — 需要大量支持：尽管获得了大量支持，仍几乎没有有意义的改善",
          "2 — 初步发展：需要反复的结构性支持才能继续",
          "3 — 正在发展：从适度的脚手架支持中受益",
          "4 — 有效：对有限的策略性支持反应良好",
          "5 — 强/独立：有效利用最少的支持并迅速恢复独立思考",
          "N/O — 无需脚手架支持/观察机会不足",
        ],
        optionsKorean: [
          "1 — 상당한 지원 필요: 상당한 지원에도 불구하고 의미 있는 향상이 거의 없음",
          "2 — 발현 중: 계속하기 위해 반복적인 구조화된 지원이 필요함",
          "3 — 발달 중: 적당한 스캐폴딩에서 도움을 받음",
          "4 — 효과적: 제한적인 전략적 지원에 잘 반응함",
          "5 — 강함/독립적: 최소한의 지원을 효과적으로 활용하고 빠르게 독립적 사고로 돌아감",
          "N/O — 스캐폴딩 불필요/관찰 기회 부족",
        ],
      },

      // Domain 10 — Recovery & Re-engagement
      { id: "ps_d10",
        text: "Recovery & Re-engagement: Following frustration, error, difficulty, or temporary disengagement, the student:",
        textChinese: "恢复与重新参与：在沮丧、错误、困难或短暂脱离参与后，学生：",
        textKorean: "회복 및 재참여: 좌절, 오류, 어려움 또는 일시적 참여 철회 후, 학생은:",
        type: "radio", domain: "productive_struggle", required: true,
        options: [
          "1 — Significant Support Need: Did not re-engage without substantial intervention",
          "2 — Emerging: Re-engaged only after repeated adult support",
          "3 — Developing: Recovered with structured encouragement",
          "4 — Effective: Recovered relatively quickly with minimal support",
          "5 — Strong / Independent: Independently recovered and resumed purposeful engagement",
          "N/O — Not Observed / Insufficient Opportunity",
        ],
        optionsChinese: [
          "1 — 需要大量支持：没有大量干预不会重新参与",
          "2 — 初步发展：只有在成人反复支持后才重新参与",
          "3 — 正在发展：在结构化鼓励下恢复",
          "4 — 有效：在最少支持下相对较快地恢复",
          "5 — 强/独立：独立恢复并重新有目的地参与",
          "N/O — 未观察到/观察机会不足",
        ],
        optionsKorean: [
          "1 — 상당한 지원 필요: 상당한 개입 없이 재참여하지 못함",
          "2 — 발현 중: 성인의 반복적인 지원 후에만 재참여함",
          "3 — 발달 중: 구조화된 격려로 회복함",
          "4 — 효과적: 최소한의 지원으로 비교적 빠르게 회복함",
          "5 — 강함/독립적: 독립적으로 회복하고 목적 있는 참여를 재개함",
          "N/O — 관찰되지 않음/관찰 기회 부족",
        ],
      },

      // Support Threshold
      { id: "ps_support_threshold",
        text: "Typical Support Threshold: What was the typical minimum level of adult support required to maintain or restore productive engagement?",
        textChinese: "典型支持阈值：维持或恢复有效参与所需的成人支持的典型最低水平是什么？",
        textKorean: "일반적인 지원 임계값: 생산적 참여를 유지하거나 회복하는 데 필요한 성인 지원의 일반적인 최소 수준은 무엇입니까?",
        type: "radio", domain: "productive_struggle", required: true,
        note: "Note: Support Threshold is not a severity score. Do not treat Level 4 as simply '4 points.' It describes the approximate level of support required, not a ranking of the student.",
        noteChinese: "注意：支持阈值不是严重程度评分。不要将Level 4简单地视为'4分'。它描述的是所需支持的大致水平，而非对学生的排名。",
        noteKorean: "참고: 지원 임계값은 심각도 점수가 아닙니다. Level 4를 단순히 '4점'으로 취급하지 마십시오. 이는 학생의 순위가 아니라 필요한 지원의 대략적인 수준을 설명합니다.",
        options: [
          "Level 0 — Independent: Student maintained or restored productive engagement without assistance",
          "Level 1 — Minimal Prompt: General encouragement or a metacognitive question was sufficient",
          "Level 2 — Strategic Cue: A limited hint or direction was required without providing the solution",
          "Level 3 — Structured Scaffolding: Task chunking, structured questioning, clarification, or partial modelling was required",
          "Level 4 — Direct Support: Substantial adult guidance or modelling was required",
          "Not Determined: The session did not provide sufficient opportunity to determine a support threshold",
        ],
        optionsChinese: [
          "Level 0 — 独立：学生在没有帮助的情况下维持或恢复了有效参与",
          "Level 1 — 最小提示：一般性鼓励或一个元认知问题就足够了",
          "Level 2 — 策略性提示：需要有限的提示或方向，但不提供解决方案",
          "Level 3 — 结构性脚手架：需要任务分解、结构性提问、澄清或部分示范",
          "Level 4 — 直接支持：需要大量成人引导或示范",
          "未确定：本次评估未提供足够的机会确定支持阈值",
        ],
        optionsKorean: [
          "Level 0 — 독립적: 학생이 도움 없이 생산적 참여를 유지하거나 회복함",
          "Level 1 — 최소 촉구: 일반적인 격려나 메타인지 질문으로 충분함",
          "Level 2 — 전략적 단서: 해결책 없이 제한적인 힌트나 방향이 필요함",
          "Level 3 — 구조화된 스캐폴딩: 과제 분할, 구조화된 질문, 명확화 또는 부분 모델링이 필요함",
          "Level 4 — 직접 지원: 상당한 성인 지도나 모델링이 필요함",
          "미결정: 세션에서 지원 임계값을 결정하기에 충분한 기회가 제공되지 않음",
        ],
      },

      // Response to Increasing Challenge
      { id: "ps_challenge_response",
        text: "Response to Increasing Challenge: As task difficulty increased, the student's engagement/performance was:",
        textChinese: "对增加挑战的反应：随着任务难度增加，学生的参与度/表现是：",
        textKorean: "도전 증가에 대한 반응: 과제 난이도가 증가함에 따라, 학생의 참여/수행은:",
        type: "radio", domain: "productive_struggle", required: false,
        options: [
          "Stable — maintained approach and engagement",
          "Initially challenged but adapted successfully",
          "Increasingly dependent on prompts",
          "Increasingly frustrated or dysregulated",
          "Increasingly avoidant/disengaged",
          "Highly variable",
          "Not enough opportunity to observe",
        ],
        optionsChinese: [
          "稳定 — 保持方法和参与度",
          "最初面临挑战，但成功适应",
          "越来越依赖提示",
          "越来越沮丧或情绪失调",
          "越来越回避/脱离",
          "高度可变",
          "观察机会不足",
        ],
        optionsKorean: [
          "안정적 — 접근법과 참여를 유지함",
          "처음에는 도전을 받았지만 성공적으로 적응함",
          "점점 더 촉구에 의존함",
          "점점 더 좌절하거나 조절 불능 상태가 됨",
          "점점 더 회피적/참여 철회",
          "매우 가변적",
          "관찰 기회 불충분",
        ],
      },

      // Student Response to Feedback
      { id: "ps_feedback_response",
        text: "Student Response to Feedback: When feedback was provided during the session, the student:",
        textChinese: "学生对反馈的回应：当在评估过程中提供反馈时，学生：",
        textKorean: "피드백에 대한 학생 반응: 세션 중 피드백이 제공되었을 때, 학생은:",
        type: "radio", domain: "productive_struggle", required: false,
        options: [
          "Integrated feedback readily",
          "Integrated feedback with prompting",
          "Acknowledged feedback but did not consistently apply it",
          "Became defensive or uncomfortable",
          "Became dependent on further reassurance",
          "Appeared not to understand the feedback",
          "Other",
          "Not Observed",
        ],
        optionsChinese: [
          "及时整合了反馈",
          "在提示下整合了反馈",
          "接受了反馈但未能持续应用",
          "变得防御或不舒服",
          "对进一步安慰产生依赖",
          "似乎不理解反馈",
          "其他",
          "未观察到",
        ],
        optionsKorean: [
          "피드백을 즉시 통합함",
          "촉구로 피드백을 통합함",
          "피드백을 인정했지만 일관되게 적용하지 않음",
          "방어적이거나 불편해함",
          "추가 안심에 의존함",
          "피드백을 이해하지 못하는 것으로 보임",
          "기타",
          "관찰되지 않음",
        ],
      },

      // Feedback notes (for "Other")
      { id: "ps_feedback_other_notes",
        text: "If \"Other\" selected above — please describe:",
        textChinese: "如选择上方\"其他\" — 请描述：",
        textKorean: "위에서 \"기타\"를 선택한 경우 — 설명해 주십시오:",
        type: "textarea", domain: "productive_struggle", required: false,
        options: [], optionsChinese: [], optionsKorean: [],
      },

      // Observable Productive Struggle Pattern (multi-select)
      { id: "ps_pattern",
        text: "Observable Productive Struggle Pattern: Which pattern(s) best characterised the student's response to challenge during this session? (Select all that apply)",
        textChinese: "可观察到的有益挑战模式：哪些模式最能体现学生在本次评估中对挑战的反应？（选择所有适用项）",
        textKorean: "관찰 가능한 생산적 어려움 패턴: 이 세션에서 학생의 도전 반응을 가장 잘 특징짓는 패턴은 무엇입니까? (해당하는 모두 선택)",
        type: "checkbox_group", domain: "productive_struggle", required: false,
        note: "These are observational descriptors, not diagnoses.",
        noteChinese: "这些是观察性描述，不是诊断。",
        noteKorean: "이것들은 진단이 아닌 관찰적 설명입니다.",
        options: [
          "Persisted and adapted strategies",
          "Persisted but continued ineffective strategies",
          "Disengaged relatively quickly",
          "Became increasingly frustrated",
          "Frequently sought reassurance",
          "Sought adult answers prematurely",
          "Used help appropriately and returned to independent work",
          "Recovered effectively after difficulty/errors",
          "Response varied considerably across tasks",
          "No clear pattern / insufficient opportunity",
        ],
        optionsChinese: [
          "坚持并调整了策略",
          "坚持但继续使用无效策略",
          "相对较快地脱离参与",
          "越来越沮丧",
          "频繁寻求安慰",
          "过早向成人寻求答案",
          "适当地寻求帮助并回归独立工作",
          "在困难/错误后有效恢复",
          "不同任务间的反应差异很大",
          "无明显模式/观察机会不足",
        ],
        optionsKorean: [
          "전략을 지속하고 적응함",
          "지속했지만 비효과적인 전략을 계속 사용함",
          "비교적 빠르게 참여를 포기함",
          "점점 더 좌절함",
          "자주 안심을 구함",
          "너무 일찍 성인에게 답을 구함",
          "도움을 적절히 사용하고 독립 작업으로 돌아감",
          "어려움/오류 후 효과적으로 회복함",
          "과제 간 반응이 상당히 다양함",
          "명확한 패턴 없음/관찰 기회 부족",
        ],
      },

      // Productive Struggle Strengths (multi-select)
      { id: "ps_strengths",
        text: "Productive Struggle Strengths: Which strengths were directly observed? (Select all that apply)",
        textChinese: "有益挑战优势：直接观察到了哪些优势？（选择所有适用项）",
        textKorean: "생산적 어려움 강점: 어떤 강점이 직접 관찰되었습니까? (해당하는 모두 선택)",
        type: "checkbox_group", domain: "productive_struggle", required: false,
        note: "Only directly observed strengths should be selected.",
        noteChinese: "只应选择直接观察到的优势。",
        noteKorean: "직접 관찰된 강점만 선택해야 합니다.",
        options: [
          "Willingness to attempt unfamiliar tasks",
          "Persistence through difficulty",
          "Effective strategy generation",
          "Flexible strategy use",
          "Appropriate help-seeking",
          "Effective use of feedback",
          "Error recognition/self-correction",
          "Emotional regulation during challenge",
          "Metacognitive awareness",
          "Recovery after setbacks",
          "Increasing independence following support",
          "Insufficient opportunity to determine",
        ],
        optionsChinese: [
          "愿意尝试不熟悉的任务",
          "在困难中坚持",
          "有效的策略生成",
          "灵活运用策略",
          "适当的求助行为",
          "有效利用反馈",
          "错误识别/自我纠正",
          "在挑战中的情绪调节",
          "元认知意识",
          "从挫折中恢复",
          "在支持后逐渐独立",
          "观察机会不足，无法判断",
        ],
        optionsKorean: [
          "낯선 과제를 시도하려는 의지",
          "어려움을 통한 지속성",
          "효과적인 전략 생성",
          "유연한 전략 사용",
          "적절한 도움 구하기",
          "피드백의 효과적 활용",
          "오류 인식/자기 교정",
          "도전 중 정서 조절",
          "메타인지 인식",
          "좌절 후 회복",
          "지원 후 독립성 증가",
          "판단하기에 관찰 기회 부족",
        ],
      },

      // Factors That Appeared to Interfere (multi-select)
      { id: "ps_barriers",
        text: "Factors That Appeared to Interfere With Productive Struggle: (Select all that apply)",
        textChinese: "似乎干扰有益挑战的因素：（选择所有适用项）",
        textKorean: "생산적 어려움을 방해하는 것으로 보인 요인: (해당하는 모두 선택)",
        type: "checkbox_group", domain: "productive_struggle", required: false,
        note: "Use observational language in reports: \"appeared to interfere\", \"was observed alongside\", \"may have influenced\" — not causal statements.",
        noteChinese: "在报告中使用观察性语言：\"似乎干扰\"、\"与...同时观察到\"、\"可能影响\" — 而非因果陈述。",
        noteKorean: "보고서에서는 관찰적 언어를 사용하십시오: \"방해하는 것으로 보임\", \"함께 관찰됨\", \"영향을 미쳤을 수 있음\" — 인과적 진술이 아닙니다.",
        options: [
          "Rapid frustration",
          "Anxiety/uncertainty",
          "Fear of making mistakes",
          "Low confidence",
          "Premature disengagement",
          "Limited strategy repertoire",
          "Difficulty changing strategy",
          "Excessive reassurance-seeking",
          "Premature help-seeking",
          "Difficulty recognising errors",
          "Difficulty using feedback",
          "Attention/distractibility",
          "Fatigue",
          "Language demands",
          "Task comprehension",
          "No significant barriers observed",
          "Insufficient evidence",
        ],
        optionsChinese: [
          "快速沮丧",
          "焦虑/不确定性",
          "害怕犯错",
          "自信心不足",
          "过早放弃",
          "策略库有限",
          "难以改变策略",
          "过度寻求安慰",
          "过早寻求帮助",
          "难以识别错误",
          "难以利用反馈",
          "注意力/易分心",
          "疲劳",
          "语言要求",
          "任务理解",
          "未观察到明显障碍",
          "证据不足",
        ],
        optionsKorean: [
          "빠른 좌절",
          "불안/불확실성",
          "실수에 대한 두려움",
          "낮은 자신감",
          "조기 참여 포기",
          "제한된 전략 레퍼토리",
          "전략 변경의 어려움",
          "과도한 안심 추구",
          "조기 도움 요청",
          "오류 인식의 어려움",
          "피드백 활용의 어려움",
          "주의/산만함",
          "피로",
          "언어 요구",
          "과제 이해",
          "중요한 장애물 관찰되지 않음",
          "증거 불충분",
        ],
      },

      // What Appeared to Help (multi-select)
      { id: "ps_what_helped",
        text: "What Appeared to Help This Student Re-engage? (Select all that apply)",
        textChinese: "什么似乎有助于这名学生重新参与？（选择所有适用项）",
        textKorean: "이 학생이 다시 참여하는 데 무엇이 도움이 된 것으로 보입니까? (해당하는 모두 선택)",
        type: "checkbox_group", domain: "productive_struggle", required: false,
        options: [
          "Additional processing time",
          "General encouragement",
          "Metacognitive questioning",
          "Clarification of instructions",
          "Strategic cue/hint",
          "Breaking task into smaller steps",
          "Visual support",
          "Verbal explanation",
          "Modelling an initial step",
          "Reassurance",
          "Brief break",
          "Reduced language complexity",
          "No support required",
          "Unable to determine",
        ],
        optionsChinese: [
          "额外的处理时间",
          "一般性鼓励",
          "元认知提问",
          "澄清说明",
          "策略性提示/暗示",
          "将任务分解为小步骤",
          "视觉支持",
          "口头解释",
          "示范初始步骤",
          "安慰",
          "短暂休息",
          "降低语言复杂性",
          "不需要支持",
          "无法确定",
        ],
        optionsKorean: [
          "추가 처리 시간",
          "일반적인 격려",
          "메타인지 질문",
          "지시 명확화",
          "전략적 단서/힌트",
          "과제를 작은 단계로 나누기",
          "시각적 지원",
          "구두 설명",
          "초기 단계 모델링",
          "안심시키기",
          "짧은 휴식",
          "언어 복잡성 감소",
          "지원 불필요",
          "판단 불가",
        ],
      },

      // Observer Productive Struggle Summary
      { id: "ps_summary",
        text: "Observer's Productive Struggle Summary: Briefly describe how the student responded when tasks became difficult, what appeared to help, and any notable differences across tasks or during the session. Record observations rather than diagnostic conclusions.",
        textChinese: "观察者的有益挑战总结：简要描述学生在任务变困难时的反应、什么似乎有帮助，以及在不同任务或评估过程中的任何显著差异。记录观察结果，而非诊断结论。",
        textKorean: "관찰자의 생산적 어려움 요약: 과제가 어려워졌을 때 학생이 어떻게 반응했는지, 무엇이 도움이 된 것으로 보였는지, 과제 간 또는 세션 중 주목할 만한 차이점을 간략히 설명하십시오. 진단적 결론이 아닌 관찰 내용을 기록하십시오.",
        type: "textarea", domain: "productive_struggle", required: false,
        options: [], optionsChinese: [], optionsKorean: [],
      },

      // Representativeness
      { id: "ps_representativeness",
        text: "Representativeness of Productive Struggle Observations: How confident are you that today's observations represent the student's typical response to academic challenge?",
        textChinese: "有益挑战观察的代表性：您对今天的观察代表学生对学业挑战的典型反应有多大把握？",
        textKorean: "생산적 어려움 관찰의 대표성: 오늘의 관찰이 학생의 학업 도전에 대한 전형적인 반응을 나타내는 데 얼마나 확신합니까?",
        type: "radio", domain: "productive_struggle", required: false,
        options: [
          "Highly representative",
          "Probably representative",
          "Uncertain",
          "Probably not representative",
          "Not enough information to judge",
        ],
        optionsChinese: [
          "高度代表性",
          "可能有代表性",
          "不确定",
          "可能没有代表性",
          "信息不足，无法判断",
        ],
        optionsKorean: [
          "매우 대표적",
          "아마도 대표적",
          "불확실",
          "아마도 대표적이지 않음",
          "판단하기에 정보 부족",
        ],
      },

      // Representativeness — observer explanation
      { id: "ps_rep_notes",
        text: "Observer explanation (optional): Any factors that may have affected the representativeness of today's observations:",
        textChinese: "观察者说明（可选）：可能影响今天观察代表性的任何因素：",
        textKorean: "관찰자 설명 (선택): 오늘 관찰의 대표성에 영향을 미쳤을 수 있는 요인:",
        type: "textarea", domain: "productive_struggle", required: false,
        options: [], optionsChinese: [], optionsKorean: [],
      },

      // ── Section 3: Additional / Test-Specific Observations ───────────────
      { id: "s3_header",
        text: "Section 3 — Additional / Test-Specific Observations",
        textChinese: "第3节 — 附加或测试特定观察",
        textKorean: "섹션 3 — 추가 또는 검사별 관찰",
        type: "section_header", domain: "behavioral_observation", required: false,
        options: [], optionsChinese: [], optionsKorean: [],
      },

      { id: "q26", text: "Additional or test-specific observations:", textChinese: "其他或针对特定测试的观察:", textKorean: "추가 또는 검사별 관찰:", type: "textarea",  domain: "behavioral_observation", options: [], optionsChinese: [], optionsKorean: [] },
    ],
  },
  {
    id: "EFA",
    name: "Executive Functioning Assessment",
    category: "executive-function",
    description: "Self-report measure of executive functioning skills across 11 domains: Planning, Time Management, Task Initiation, Organization, Problem-Solving, Flexibility, Working Memory, Emotional Control, Impulse Control, Attentional Control, and Self-Monitoring. 77 items, 5-point scale (Never–Always). Suitable for pre- and post-assessment of EF coaching programs.",
    isRemyndOwned: true,
    respondentTypes: ["self"],
    scoringType: "auto",
    domains: ["planning", "time_management", "task_initiation", "organization", "problem_solving", "flexibility", "working_memory", "emotional_control", "impulse_control", "attentional_control", "self_monitoring"],
    scoringConfig: { max: 4, thresholds: { low: 40, mild: 60, moderate: 80 }, domains: {}, higherIsBetter: true },
    formItems: EFA_FORM,
  },
  {
    id: "SPP",
    name: "Sensory Processing Profile (SPP)",
    category: "adaptive",
    description: "Screening assessment of sensory processing differences across 20 subscales in 8 sensory domains: Tactile, Vestibular, Proprioceptive, Auditory, Oral-Sensory, Olfactory, Visual, and Regulation & Functional Impact. 72 items rated on a 0–3 frequency scale. Multi-informant (Self / Parent / Teacher). Higher scores indicate greater sensory processing dysfunction.",
    isRemyndOwned: true,
    respondentTypes: ["self", "parent", "teacher1", "teacher2"],
    scoringType: "auto",
    domains: [
      "a1_tactile_hyper", "a2_tactile_hypo", "a3_tactile_discrimination",
      "b1_vestibular_hyper", "b2_vestibular_seeking", "b3_coordination",
      "c1_proprioceptive_seeking", "c2_force_regulation",
      "d1_auditory_hyper", "d2_auditory_hypo",
      "e1_oral_hyper", "e2_oral_hypo",
      "f1_olfactory_hyper", "f2_olfactory_hypo",
      "g1_visual_hyper", "g2_visual_processing",
      "h1_social_functioning", "h2_emotional_regulation", "h3_self_regulation", "h4_interoception",
    ],
    scoringConfig: { max: 3, thresholds: { low: 17, mild: 43, moderate: 67 }, domains: {} },
    formItems: SPP_FORM,
  },
  {
    id: "RSSC",
    name: "ReMynd Student Symptom Checklist (RSSC)",
    category: "observation",
    description: "Teacher-completed checklist for identifying learning, language, social, emotional and cognitive difficulties in students K–12. Covers 20 symptom domains across Social/Emotional and Cognitive/Physical areas, each with an open comments field.",
    isRemyndOwned: true,
    respondentTypes: ["teacher"],
    scoringType: "manual",
    domains: ["social_emotional", "cognitive_physical"],
    formItems: RSSC_FORM,
  },
  {
    id: "RSCP",
    name: "ReMynd Social Competency Profile (RSCP)",
    category: "social-emotional",
    description: "Multi-informant observer rating scale assessing social competency across six domains: Social Awareness, Social Communication, Peer Relationships, Emotional Regulation (Social Context), Empathy & Prosocial Behavior, and Social Confidence. 24 items on a 4-point scale. Parent and teacher versions. Suitable for students K–12.",
    isRemyndOwned: true,
    respondentTypes: ["parent", "teacher1", "teacher2"],
    scoringType: "auto",
    domains: ["social_awareness", "social_communication", "peer_relationships", "emotional_regulation_social", "empathy_prosocial", "social_confidence"],
    scoringConfig: {
      max: 4,
      thresholds: { low: 30, mild: 55, moderate: 75 },
      domains: {
        social_awareness: { label: "Social Awareness", shortLabel: "Awareness", narratives: { low: "Strong awareness of social cues and others' emotional states.", mild: "Generally socially aware with some situational inconsistency.", moderate: "Social awareness difficulties; support with reading social cues recommended.", elevated: "Significant challenges identifying and responding to social and emotional cues." } },
        social_communication: { label: "Social Communication", shortLabel: "Communication", narratives: { low: "Communicates effectively across a range of social contexts.", mild: "Mostly effective social communication with some situational challenges.", moderate: "Social communication difficulties impacting peer interaction and understanding.", elevated: "Significant social communication challenges requiring structured intervention." } },
        peer_relationships: { label: "Peer Relationships", shortLabel: "Peers", narratives: { low: "Demonstrates strong peer relationship skills and social inclusion.", mild: "Generally positive peer relationships with some areas for development.", moderate: "Peer relationship difficulties that benefit from targeted social support.", elevated: "Significant challenges forming and maintaining peer relationships." } },
        emotional_regulation_social: { label: "Emotional Regulation (Social Context)", shortLabel: "Regulation", narratives: { low: "Manages emotions effectively in social situations.", mild: "Generally regulated in social settings with occasional difficulty.", moderate: "Emotional regulation in social contexts requires support.", elevated: "Significant emotional dysregulation in social situations; intervention recommended." } },
        empathy_prosocial: { label: "Empathy & Prosocial Behavior", shortLabel: "Empathy", narratives: { low: "Shows strong empathy and prosocial engagement with peers.", mild: "Generally empathic with some inconsistency in prosocial responding.", moderate: "Limited empathy and prosocial behavior; social cognition support recommended.", elevated: "Significant difficulties recognizing others' feelings and responding prosocially." } },
        social_confidence: { label: "Social Confidence", shortLabel: "Confidence", narratives: { low: "Participates confidently in social situations.", mild: "Generally socially confident with occasional hesitation.", moderate: "Social confidence challenges; social skills support recommended.", elevated: "Significant social anxiety or withdrawal impacting participation." } },
      },
    },
    formItems: RSCP_FORM,
  },
  {
    id: "RARPS",
    name: "ReMynd Academic Resilience and Performance Scale (RARPS)",
    category: "achievement",
    description: "Multi-informant rating scale assessing academic resilience and performance across six domains: Academic Persistence, Motivation & Engagement, Emotional Response to Learning, Executive Function (Academic), Help-Seeking Behavior, and Academic Self-Belief. 24 items on a 4-point scale. Suitable for students age 8–18. Self-report and teacher versions.",
    isRemyndOwned: true,
    respondentTypes: ["self", "teacher1", "teacher2"],
    scoringType: "auto",
    domains: ["academic_persistence", "motivation_engagement", "emotional_response_learning", "executive_function_academic", "help_seeking", "academic_self_belief"],
    scoringConfig: {
      max: 4,
      thresholds: { low: 30, mild: 55, moderate: 75 },
      domains: {
        academic_persistence: { label: "Academic Persistence", shortLabel: "Persistence", narratives: { low: "Demonstrates strong persistence and sustained academic effort.", mild: "Generally persistent with some difficulty on extended or challenging tasks.", moderate: "Academic persistence challenges; structured task support recommended.", elevated: "Significant difficulty sustaining effort on academic tasks; intervention recommended." } },
        motivation_engagement: { label: "Motivation & Engagement", shortLabel: "Motivation", narratives: { low: "Demonstrates strong intrinsic motivation and active academic engagement.", mild: "Generally motivated with occasional disengagement.", moderate: "Motivation and engagement challenges; targeted support recommended.", elevated: "Significant difficulties with academic motivation and engagement." } },
        emotional_response_learning: { label: "Emotional Response to Learning", shortLabel: "Emotional Response", narratives: { low: "Manages learning-related stress and frustration effectively.", mild: "Generally manages emotions in academic contexts with some difficulty.", moderate: "Emotional responses to learning are impacting academic performance.", elevated: "Significant emotional difficulties in academic contexts; support recommended." } },
        executive_function_academic: { label: "Executive Function (Academic)", shortLabel: "Executive Function", narratives: { low: "Strong executive functioning skills applied to academic tasks.", mild: "Generally effective executive functioning with some inconsistency.", moderate: "Executive function challenges impacting academic organization and planning.", elevated: "Significant executive function difficulties requiring structured academic support." } },
        help_seeking: { label: "Help-Seeking Behavior", shortLabel: "Help-Seeking", narratives: { low: "Effectively recognizes need for support and accesses help appropriately.", mild: "Generally seeks help with some inconsistency in support utilization.", moderate: "Help-seeking barriers present; scaffolding for support access recommended.", elevated: "Significant difficulty seeking or accepting academic support." } },
        academic_self_belief: { label: "Academic Self-Belief", shortLabel: "Self-Belief", narratives: { low: "Strong belief in academic capability and effort-outcome connection.", mild: "Generally positive academic self-concept with some self-doubt.", moderate: "Self-belief challenges impacting academic engagement and risk-taking.", elevated: "Significant academic self-doubt requiring targeted confidence-building support." } },
      },
    },
    formItems: RARPS_FORM,
  },
  {
    id: "RFII",
    name: "ReMynd Functional Impact Index (RFII)",
    category: "adaptive",
    description: "Multi-informant rating scale measuring functional impact across six domains: Academic Functioning, Behavioral Functioning, Emotional Functioning, Social Functioning, Daily Functioning, and School Participation. 24 items on a 4-point scale. Parent and self-report versions. Used to quantify severity and guide intervention priority.",
    isRemyndOwned: true,
    respondentTypes: ["parent", "self"],
    scoringType: "auto",
    domains: ["academic_functioning", "behavioral_functioning", "emotional_functioning", "social_functioning", "daily_functioning", "school_participation"],
    scoringConfig: {
      max: 4,
      thresholds: { low: 20, mild: 45, moderate: 70 },
      domains: {
        academic_functioning: { label: "Academic Functioning", shortLabel: "Academic", narratives: { low: "Minimal impact on academic functioning; performing within expectations.", mild: "Mild academic impact; some additional support may benefit performance.", moderate: "Moderate academic impact; targeted accommodations and support are recommended.", elevated: "Significant academic impact requiring formal accommodations and specialist involvement." } },
        behavioral_functioning: { label: "Behavioral Functioning", shortLabel: "Behavioral", narratives: { low: "Behavior is well-regulated across settings.", mild: "Generally appropriate behavior with occasional difficulties.", moderate: "Behavioral challenges impacting daily functioning; support recommended.", elevated: "Significant behavioral difficulties requiring structured intervention." } },
        emotional_functioning: { label: "Emotional Functioning", shortLabel: "Emotional", narratives: { low: "Emotional functioning is stable and well-regulated.", mild: "Mild emotional difficulties; generally coping with some stress or frustration.", moderate: "Moderate emotional difficulties; mental health monitoring and wellbeing support recommended.", elevated: "Significant emotional difficulties; specialist mental health assessment recommended." } },
        social_functioning: { label: "Social Functioning", shortLabel: "Social", narratives: { low: "Difficulties have minimal impact on social relationships and participation.", mild: "Mild social impact; peer relationships generally maintained.", moderate: "Moderate social impact; social support and skills intervention recommended.", elevated: "Significant impact on social functioning; social skills program and monitoring recommended." } },
        daily_functioning: { label: "Daily Functioning", shortLabel: "Daily", narratives: { low: "Difficulties have minimal impact on daily routines and independence.", mild: "Mild daily functioning impact; manages routines with occasional support.", moderate: "Moderate impact on daily functioning; structured routines and support systems recommended.", elevated: "Significant daily functioning difficulties requiring consistent adult supervision and support." } },
        school_participation: { label: "School Participation", shortLabel: "Participation", narratives: { low: "Participates actively and comfortably in the school environment.", mild: "Generally participates with some inconsistency or hesitation.", moderate: "School participation challenges; targeted engagement support recommended.", elevated: "Significant difficulties with school participation; attendance or engagement intervention needed." } },
      },
    },
    formItems: RFII_FORM,
  },
  {
    id: "CDP-SR",
    name: "CDP — Self-Regulation and Executive Function",
    category: "development",
    description: "Parent/teacher-completed profile assessing self-regulation, adaptive behavior, stress management, coping with change, physical wellness, social interaction, executive functioning, and metacognition. Part of the ReMynd Child Development Profile (CDP) battery.",
    isRemyndOwned: true,
    respondentTypes: ["parent", "teacher"],
    scoringType: "manual",
    domains: ["managing_emotions", "adaptive_behavior", "managing_stress", "coping_with_change", "physical_wellness", "social_interaction", "executive_functioning", "metacognition"],
    formItems: CDP_SR_FORM,
    scoringConfig: { max: 3, thresholds: { low: 75, mild: 50, moderate: 25 }, domains: {
      managing_emotions: { label: "Managing Emotions", shortLabel: "Emotions", narratives: { low: "Strong emotional recognition and regulation.", mild: "Generally manages emotions with some support needed.", moderate: "Emerging emotional regulation skills; consistent support recommended.", elevated: "Significant difficulties with emotional recognition and regulation." } },
      adaptive_behavior: { label: "Adaptive Behavior", shortLabel: "Adaptive", narratives: { low: "Demonstrates consistent self-control and positive behavior.", mild: "Generally appropriate behavior with some support needed.", moderate: "Developing behavioral self-regulation; structured support recommended.", elevated: "Significant difficulties with adaptive and self-regulatory behaviors." } },
      managing_stress: { label: "Managing Stress", shortLabel: "Stress", narratives: { low: "Effectively identifies and manages stress.", mild: "Manages stress with occasional adult support.", moderate: "Limited independent stress management; support strategies recommended.", elevated: "Significant difficulties managing stress and anxiety." } },
      coping_with_change: { label: "Coping with Change", shortLabel: "Change", narratives: { low: "Adapts well to transitions and unexpected changes.", mild: "Generally copes with change with some preparation.", moderate: "Transitions challenging; visual supports and advance notice recommended.", elevated: "Significant difficulties with transitions and unexpected changes." } },
      physical_wellness: { label: "Physical and Mental Wellness", shortLabel: "Wellness", narratives: { low: "Strong self-care and physical wellness habits.", mild: "Generally manages wellness needs with some support.", moderate: "Developing self-care independence; routine support recommended.", elevated: "Significant support needed for self-care and physical wellness." } },
      social_interaction: { label: "Social Interaction", shortLabel: "Social", narratives: { low: "Initiates and maintains positive peer interactions.", mild: "Engages socially with some support.", moderate: "Limited social initiation; social skills support recommended.", elevated: "Significant difficulties with peer interaction and social engagement." } },
      executive_functioning: { label: "Executive Functioning", shortLabel: "Executive", narratives: { low: "Strong planning, organization, and working memory skills.", mild: "Generally organized with some executive function support needed.", moderate: "Developing executive function skills; scaffolding recommended.", elevated: "Significant executive function difficulties across planning, memory, and flexibility." } },
      metacognition: { label: "Metacognition", shortLabel: "Metacog", narratives: { low: "Demonstrates strong self-monitoring and reflective skills.", mild: "Can self-evaluate with adult guidance.", moderate: "Limited metacognitive awareness; explicit teaching recommended.", elevated: "Significant difficulties with self-monitoring and goal setting." } },
    } },
  },
  {
    id: "CDP-CL",
    name: "CDP — Cognition & Learning",
    category: "development",
    description: "Parent/teacher-completed profile assessing executive function, working memory, reasoning, applied academic skills, time and measurement concepts, social-cognitive reasoning, and life skills. Part of the ReMynd Child Development Profile (CDP) battery.",
    isRemyndOwned: true,
    respondentTypes: ["parent", "teacher"],
    scoringType: "manual",
    domains: ["organization_planning", "working_memory", "reasoning", "applied_academic", "time_measurement", "social_cognitive", "independence"],
    formItems: CDP_CL_FORM,
    scoringConfig: { max: 3, thresholds: { low: 75, mild: 50, moderate: 25 }, domains: {
      organization_planning: { label: "Organization, Planning & Task Initiation", shortLabel: "Planning", narratives: { low: "Strong organizational and planning skills.", mild: "Generally organized with some support needed.", moderate: "Developing planning skills; structured support recommended.", elevated: "Significant difficulties with organization and task initiation." } },
      working_memory: { label: "Working Memory, Attention & Processing", shortLabel: "Memory", narratives: { low: "Strong working memory and attention.", mild: "Generally attentive with some processing support needed.", moderate: "Developing working memory; scaffolding strategies recommended.", elevated: "Significant working memory and attention difficulties." } },
      reasoning: { label: "Reasoning, Problem Solving & Cognitive Flexibility", shortLabel: "Reasoning", narratives: { low: "Strong reasoning and flexible thinking.", mild: "Generally applies reasoning with some support.", moderate: "Developing problem-solving flexibility; targeted support recommended.", elevated: "Significant difficulties with reasoning and cognitive flexibility." } },
      applied_academic: { label: "Applied Academic & Functional Skills", shortLabel: "Academic", narratives: { low: "Strong functional academic skills.", mild: "Generally applies academic skills with some support.", moderate: "Emerging applied skills; concrete and functional teaching recommended.", elevated: "Significant gaps in applied academic and functional skills." } },
      time_measurement: { label: "Time, Measurement & Quantitative Concepts", shortLabel: "Numeracy", narratives: { low: "Strong numeracy and measurement skills.", mild: "Generally understands time and measurement with some support.", moderate: "Developing quantitative concepts; hands-on teaching recommended.", elevated: "Significant difficulties with time, measurement, and numeracy." } },
      social_cognitive: { label: "Social-Cognitive Reasoning & Decision Making", shortLabel: "Decision Making", narratives: { low: "Strong social reasoning and decision making.", mild: "Generally applies social reasoning with some support.", moderate: "Developing social-cognitive skills; structured guidance recommended.", elevated: "Significant difficulties with social decision making." } },
      independence: { label: "Independence, Responsibility & Life Skills", shortLabel: "Life Skills", narratives: { low: "Strong independence and life skills.", mild: "Generally responsible with some life skills support.", moderate: "Developing independence; structured skill-building recommended.", elevated: "Significant support needed for independence and life skills." } },
    } },
  },
  {
    id: "CDP-CI",
    name: "CDP — Communication and Interaction",
    category: "development",
    description: "Parent/teacher-completed profile assessing attention, comprehension, expressive communication, social skills, social awareness, and social initiation. Includes strength items. Part of the ReMynd Child Development Profile (CDP) battery.",
    isRemyndOwned: true,
    respondentTypes: ["parent", "teacher"],
    scoringType: "manual",
    domains: ["attention_listening", "gestural_cues", "comprehension", "expressive_communication", "social_skills", "social_awareness", "social_initiation", "strengths"],
    formItems: CDP_CI_FORM,
    scoringConfig: { max: 3, thresholds: { low: 75, mild: 50, moderate: 25 }, domains: {
      attention_listening: { label: "Attention and Listening", shortLabel: "Attention", narratives: { low: "Strong attention and listening skills.", mild: "Generally attentive with some support.", moderate: "Developing attention; structured routines recommended.", elevated: "Significant attention and listening difficulties." } },
      gestural_cues: { label: "Contextual and Gestural Cues", shortLabel: "Gestural", narratives: { low: "Strong use and understanding of gestural cues.", mild: "Generally understands context with some support.", moderate: "Developing gestural awareness; explicit teaching recommended.", elevated: "Significant difficulties with gestural and contextual cues." } },
      comprehension: { label: "Comprehension", shortLabel: "Comprehension", narratives: { low: "Strong language comprehension.", mild: "Generally understands language with some support.", moderate: "Developing comprehension; simplified language recommended.", elevated: "Significant comprehension difficulties." } },
      expressive_communication: { label: "Expressive Communication", shortLabel: "Expressive", narratives: { low: "Strong expressive communication.", mild: "Generally communicates with some support.", moderate: "Developing expressive language; AAC supports may help.", elevated: "Significant expressive communication difficulties." } },
      social_skills: { label: "Social Skills", shortLabel: "Social Skills", narratives: { low: "Strong social skills.", mild: "Generally socially skilled with some support.", moderate: "Developing social skills; structured social teaching recommended.", elevated: "Significant social skills difficulties." } },
      social_awareness: { label: "Social Awareness", shortLabel: "Awareness", narratives: { low: "Strong social awareness.", mild: "Generally socially aware with some support.", moderate: "Developing social awareness; explicit instruction recommended.", elevated: "Significant social awareness difficulties." } },
      social_initiation: { label: "Social Initiation", shortLabel: "Initiation", narratives: { low: "Initiates social interactions independently.", mild: "Generally initiates with some prompting.", moderate: "Limited social initiation; supported social opportunities recommended.", elevated: "Significant social initiation difficulties." } },
      strengths: { label: "Strength Items", shortLabel: "Strengths", narratives: { low: "Demonstrates strong social strengths.", mild: "Shows emerging social strengths.", moderate: "Limited social strengths observed.", elevated: "Significant social support needs identified." } },
    } },
  },
  {
    id: "CDP-SI",
    name: "CDP — Social Interaction and Social Awareness",
    category: "development",
    description: "Parent/teacher-completed profile assessing peer relationships, privacy, empathy, friendship, assertiveness, conflict resolution, social norms, independence, and safety awareness. Part of the ReMynd Child Development Profile (CDP) battery.",
    isRemyndOwned: true,
    respondentTypes: ["parent", "teacher"],
    scoringType: "manual",
    domains: ["peer_interaction", "safety_awareness", "empathy_emotions", "social_norms", "self_advocacy", "friendship", "conflict_resolution"],
    formItems: CDP_SI_FORM,
    scoringConfig: { max: 3, thresholds: { low: 75, mild: 50, moderate: 25 }, domains: {
      peer_interaction: { label: "Peer Interaction", shortLabel: "Peers", narratives: { low: "Strong peer interaction skills.", mild: "Generally interacts with peers with some support.", moderate: "Developing peer skills; structured opportunities recommended.", elevated: "Significant difficulties with peer interaction." } },
      safety_awareness: { label: "Safety and Privacy Awareness", shortLabel: "Safety", narratives: { low: "Strong safety and privacy awareness.", mild: "Generally safety aware with some support.", moderate: "Developing safety awareness; explicit teaching recommended.", elevated: "Significant safety awareness difficulties." } },
      empathy_emotions: { label: "Empathy and Emotional Understanding", shortLabel: "Empathy", narratives: { low: "Strong empathy and emotional understanding.", mild: "Generally empathetic with some support.", moderate: "Developing empathy; social stories and role play recommended.", elevated: "Significant difficulties with empathy and emotional understanding." } },
      social_norms: { label: "Social Norms and Behaviors", shortLabel: "Norms", narratives: { low: "Strong understanding of social norms.", mild: "Generally follows norms with some support.", moderate: "Developing social norms; explicit rule teaching recommended.", elevated: "Significant difficulties with social norms and expected behaviors." } },
      self_advocacy: { label: "Self-Advocacy and Assertiveness", shortLabel: "Advocacy", narratives: { low: "Strong self-advocacy skills.", mild: "Generally advocates with some support.", moderate: "Developing self-advocacy; assertiveness coaching recommended.", elevated: "Significant self-advocacy difficulties." } },
      friendship: { label: "Friendship and Relationships", shortLabel: "Friendship", narratives: { low: "Forms and maintains friendships independently.", mild: "Generally makes friends with some support.", moderate: "Developing friendship skills; structured social support recommended.", elevated: "Significant difficulties forming and maintaining friendships." } },
      conflict_resolution: { label: "Conflict Resolution", shortLabel: "Conflict", narratives: { low: "Strong conflict resolution skills.", mild: "Generally resolves conflict with some support.", moderate: "Developing conflict skills; mediation strategies recommended.", elevated: "Significant difficulties with conflict resolution." } },
    } },
  },
  // ─── BASC-3 ────────────────────────────────────────────────────────────────
  {
    id: "BASC3-TRS-A",
    name: "BASC-3 Teacher Rating Scales – Adolescent (Ages 12–21)",
    category: "behavior",
    description: "Teacher-completed behavior rating scale for adolescents aged 12–21. Assesses a broad range of behavioral and emotional dimensions including externalizing problems, internalizing problems, school problems, adaptive skills, and behavioral symptoms. Part of the BASC-3 battery.",
    isRemyndOwned: false,
    respondentTypes: ["teacher1", "teacher2"],
    scoringType: "manual",
    domains: ["behavior"],
    formItems: BASC3_TRS_A_FORM,
    scoringConfig: { max: 3 },
  },
  {
    id: "BASC3-PRS-A",
    name: "BASC-3 Parent Rating Scales – Adolescent (Ages 12–21)",
    category: "behavior",
    description: "Parent-completed behavior rating scale for adolescents aged 12–21. Covers externalizing problems, internalizing problems, adaptive skills, and behavioral symptoms from a home context. Part of the BASC-3 battery.",
    isRemyndOwned: false,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: ["behavior"],
    formItems: BASC3_PRS_A_FORM,
    scoringConfig: { max: 3 },
  },
  {
    id: "BASC3-TRS-C",
    name: "BASC-3 Teacher Rating Scales – Child (Ages 6–11)",
    category: "behavior",
    description: "Teacher-completed behavior rating scale for children aged 6–11. Assesses externalizing problems, internalizing problems, school problems, adaptive skills, and behavioral symptoms in the classroom setting. Part of the BASC-3 battery.",
    isRemyndOwned: false,
    respondentTypes: ["teacher1", "teacher2"],
    scoringType: "manual",
    domains: ["behavior"],
    formItems: BASC3_TRS_C_FORM,
    scoringConfig: { max: 3 },
  },
  {
    id: "BASC3-PRS-C",
    name: "BASC-3 Parent Rating Scales – Child (Ages 6–11)",
    category: "behavior",
    description: "Parent-completed behavior rating scale for children aged 6–11. Covers externalizing problems, internalizing problems, adaptive skills, and behavioral symptoms from a home context. Part of the BASC-3 battery.",
    isRemyndOwned: false,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: ["behavior"],
    formItems: BASC3_PRS_C_FORM,
    scoringConfig: { max: 3 },
  },
  {
    id: "BASC3-SRP-A",
    name: "BASC-3 Self-Report of Personality – Adolescent (Ages 12–21)",
    category: "behavior",
    description: "Self-report scale completed by adolescents aged 12–21. Items 1–59 use True/False format; items 60–189 use a frequency scale (Never–Almost always). Covers school maladjustment, clinical maladjustment, personal adjustment, and an emotional symptoms index. Part of the BASC-3 battery.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["behavior"],
    formItems: BASC3_SRP_A_FORM,
    scoringConfig: { max: 3 },
  },
  {
    id: "BASC3-SRP-C",
    name: "BASC-3 Self-Report of Personality – Child (Ages 8–11)",
    category: "behavior",
    description: "Self-report scale completed by children aged 8–11. Items 1–42 use True/False format; items 43–137 use a frequency scale (Never–Almost always). Covers school maladjustment, clinical maladjustment, personal adjustment, and an emotional symptoms index. Part of the BASC-3 battery.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["behavior"],
    formItems: BASC3_SRP_C_FORM,
    scoringConfig: { max: 3 },
  },
  {
    id: "BRIEF2-P",
    name: "BRIEF-2 Parent Form",
    category: "executive-function",
    description: "Parent-completed rating scale assessing executive function in children and adolescents aged 5–18. Uses a 3-point frequency scale (Never/Sometimes/Often) across 63 items measuring inhibit, shift, emotional control, initiate, working memory, plan/organize, task monitor, and organization of materials. Part of the BRIEF-2 battery.",
    isRemyndOwned: false,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: ["executive-function"],
    formItems: BRIEF2_PARENT_FORM,
    scoringConfig: { max: 2 },
  },
  {
    id: "BRIEF2-SR",
    name: "BRIEF-2 Self-Report Form",
    category: "executive-function",
    description: "Self-report rating scale completed by children and adolescents aged 11–18 assessing their own executive function. Uses a 3-point frequency scale (Never/Sometimes/Often) across 55 items. Part of the BRIEF-2 battery.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["executive-function"],
    formItems: BRIEF2_SELF_FORM,
    scoringConfig: { max: 2 },
  },
  {
    id: "BRIEF2-T",
    name: "BRIEF-2 Teacher Form",
    category: "executive-function",
    description: "Teacher-completed rating scale assessing executive function in children and adolescents aged 5–18. Uses a 3-point frequency scale (Never/Sometimes/Often) across 63 items. Part of the BRIEF-2 battery.",
    isRemyndOwned: false,
    respondentTypes: ["teacher1", "teacher2"],
    scoringType: "manual",
    domains: ["executive-function"],
    formItems: BRIEF2_TEACHER_FORM,
    scoringConfig: { max: 2 },
  },
  // ── Public Domain / Open-Access Screening Tools ──────────────────────────
  {
    id: "SDQ-P",
    name: "Strengths and Difficulties Questionnaire – Parent (Ages 4–10)",
    category: "behavior",
    description: "Parent-completed 25-item screening questionnaire for emotional and behavioural problems in children aged 4–10. Covers five subscales: Emotional Symptoms, Conduct Problems, Hyperactivity/Inattention, Peer Relationship Problems, and Prosocial Behaviour. Includes bilingual English/Chinese content. Free to use from sdqinfo.org.",
    isRemyndOwned: false,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: ["behavior", "social-emotional"],
    formItems: SDQ_P4_FORM,
    scoringConfig: null,
  },
  {
    id: "SDQ-P11",
    name: "Strengths and Difficulties Questionnaire – Parent (Ages 11–18)",
    category: "behavior",
    description: "Parent-completed 25-item screening questionnaire for emotional and behavioural problems in adolescents aged 11–18. Covers five subscales: Emotional Symptoms, Conduct Problems, Hyperactivity/Inattention, Peer Relationship Problems, and Prosocial Behaviour. Free to use from sdqinfo.org.",
    isRemyndOwned: false,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: ["behavior", "social-emotional"],
    formItems: SDQ_P11_FORM,
    scoringConfig: null,
  },
  {
    id: "SDQ-T",
    name: "Strengths and Difficulties Questionnaire – Teacher (Ages 4–10)",
    category: "behavior",
    description: "Teacher-completed 25-item screening questionnaire for emotional and behavioural problems in children aged 4–10. Covers the same five subscales as the parent version. Includes bilingual English/Chinese content. Free to use from sdqinfo.org.",
    isRemyndOwned: false,
    respondentTypes: ["teacher1", "teacher2"],
    scoringType: "manual",
    domains: ["behavior", "social-emotional"],
    formItems: SDQ_T4_FORM,
    scoringConfig: null,
  },
  {
    id: "SDQ-T11",
    name: "Strengths and Difficulties Questionnaire – Teacher (Ages 11–18)",
    category: "behavior",
    description: "Teacher-completed 25-item screening questionnaire for emotional and behavioural problems in adolescents aged 11–18. Item wording is adapted for older youth (e.g. references peers rather than younger children). Free to use from sdqinfo.org.",
    isRemyndOwned: false,
    respondentTypes: ["teacher1", "teacher2"],
    scoringType: "manual",
    domains: ["behavior", "social-emotional"],
    formItems: SDQ_T11_FORM,
    scoringConfig: null,
  },
  {
    id: "SDQ-SR",
    name: "Strengths and Difficulties Questionnaire – Self-Report (Ages 11–18)",
    category: "behavior",
    description: "Self-completed 25-item screening questionnaire for young people aged 11–18. Uses first-person phrasing across the same five subscales. Free to use from sdqinfo.org.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["behavior", "social-emotional"],
    formItems: SDQ_SR11_FORM,
    scoringConfig: null,
  },
  {
    id: "SDQ-SR18",
    name: "Strengths and Difficulties Questionnaire – Self-Report (Ages 18+)",
    category: "behavior",
    description: "Self-completed 25-item screening questionnaire for adults aged 18 and over. Uses the same first-person phrasing as the youth self-report with adult-appropriate impact questions (work/study, partner/family). Free to use from sdqinfo.org.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["behavior", "social-emotional"],
    formItems: SDQ_SR18_FORM,
    scoringConfig: null,
  },
  {
    id: "GHQ-12",
    name: "General Health Questionnaire – 12 Item (GHQ-12)",
    category: "social-emotional",
    description: "A 12-item self-report screening instrument for common mental health problems and general psychological distress. Compares recent experience to the respondent's usual state. Widely used in clinical and epidemiological research. Public domain.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["social-emotional"],
    formItems: GHQ12_FORM,
    scoringConfig: null,
  },
  {
    id: "SMFQ",
    name: "Short Mood and Feelings Questionnaire (SMFQ)",
    category: "social-emotional",
    description: "A 13-item self-report measure of depression symptoms in children and adolescents aged 6–18. Items ask about feelings and behaviours over the past two weeks using a True/Sometimes/Not True scale. Open access.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["social-emotional"],
    formItems: SMFQ_FORM,
    scoringConfig: null,
  },
  {
    id: "PSC",
    name: "Pediatric Symptom Checklist – 35 Item (PSC-35)",
    category: "behavior",
    description: "A 35-item parent-report psychosocial screening tool for children aged 4–16. Covers internalizing, externalizing, and attention problems. Scored Never (0) / Sometimes (1) / Often (2). Available free in the public domain.",
    isRemyndOwned: false,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: ["behavior", "social-emotional"],
    formItems: PSC_FORM,
    scoringConfig: null,
  },
  {
    id: "GAD-7",
    name: "Generalized Anxiety Disorder Scale – 7 Item (GAD-7)",
    category: "social-emotional",
    description: "A 7-item self-report scale measuring the severity of generalized anxiety disorder symptoms over the past two weeks. Uses a 0–3 frequency scale. Developed by Spitzer et al. (2006); free to use.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["social-emotional"],
    formItems: GAD7_FORM,
    scoringConfig: null,
  },
  {
    id: "PHQ-9",
    name: "Patient Health Questionnaire – 9 Item (PHQ-9)",
    category: "social-emotional",
    description: "A 9-item self-report depression screening tool based on DSM criteria. Measures depression severity over the past two weeks on a 0–3 frequency scale. Widely used in clinical and research settings. Free to use.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["social-emotional"],
    formItems: PHQ9_FORM,
    scoringConfig: null,
  },
  {
    id: "PHQ-9A",
    name: "Patient Health Questionnaire for Adolescents (PHQ-9A)",
    category: "social-emotional",
    description: "Adolescent-specific adaptation of the PHQ-9 with modified item wording for younger respondents. Assesses depression symptoms over the past two weeks. Free to use.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["social-emotional"],
    formItems: PHQ9A_FORM,
    scoringConfig: null,
  },
  {
    id: "PSS-10",
    name: "Perceived Stress Scale – 10 Item (PSS-10)",
    category: "social-emotional",
    description: "A 10-item self-report measure assessing the degree to which situations in one's life are appraised as stressful over the past month. Developed by Cohen et al. (1983). Public domain.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["social-emotional"],
    formItems: PSS10_FORM,
    scoringConfig: null,
  },
  {
    id: "DASS-21",
    name: "Depression Anxiety Stress Scale – 21 Item (DASS-21)",
    category: "social-emotional",
    description: "A 21-item self-report measure of depression, anxiety, and stress states over the past week. Each subscale contains 7 items rated on a 0–3 severity scale. Developed by Lovibond & Lovibond (1995). Free to use for non-commercial purposes.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["social-emotional"],
    formItems: DASS21_FORM,
    scoringConfig: null,
  },
  {
    id: "RSES",
    name: "Rosenberg Self-Esteem Scale (RSES)",
    category: "social-emotional",
    description: "A 10-item self-report measure of global self-esteem using a 4-point agree–disagree scale. One of the most widely used measures of self-esteem in research. Developed by Morris Rosenberg (1965). Public domain.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["social-emotional"],
    formItems: RSES_FORM,
    scoringConfig: null,
  },
  {
    id: "WHO-5",
    name: "World Health Organization Well-Being Index (WHO-5)",
    category: "social-emotional",
    description: "A 5-item self-report measure of current mental wellbeing covering the past two weeks. Items are rated on a 6-point frequency scale (0–5). Scores range from 0–100. Free to use; available in over 30 languages.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["social-emotional"],
    formItems: WHO5_FORM,
    scoringConfig: null,
  },
  {
    id: "AUDIT",
    name: "Alcohol Use Disorders Identification Test (AUDIT)",
    category: "behavior",
    description: "A 10-item screening tool developed by the WHO to identify hazardous and harmful alcohol use. Items 1–8 use a 5-point frequency or quantity scale; items 9–10 use a 3-point scale. Suitable for adolescents and adults. Free to use.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["behavior"],
    formItems: AUDIT_FORM,
    scoringConfig: null,
  },
  {
    id: "CABS",
    name: "Child/Adolescent Bullying Scale (CABS)",
    category: "social-emotional",
    description: "A self-report measure assessing both bullying victimization and perpetration in school-age children and adolescents. Covers physical, verbal, relational, and cyber bullying across two subscales. Items rated on a 5-point frequency scale.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["social-emotional", "behavior"],
    formItems: CABS_FORM,
    scoringConfig: null,
  },
  {
    id: "FASM",
    name: "Functional Assessment of Self-Mutilation (FASM)",
    category: "risk",
    description: "A clinician-administered self-report tool assessing non-suicidal self-injury (NSSI). Covers 9 behavior types with frequency ratings over the past 12 months (Section 1), characteristics of self-harm including age of onset, recency, context, and pain tolerance (Section 2), and 15 functional reasons for self-harm across internal/automatic and social/interpersonal domains using a 4-point frequency scale (Section 3).",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "manual",
    domains: ["risk", "mental-health"],
    formItems: FASM_FORM,
    scoringConfig: null,
  },
  {
    id: "BFI-44",
    name: "The Big Five Inventory",
    category: "social-emotional",
    description: "A 44-item self-report personality inventory measuring the five broad domains of personality (the Five-Factor Model) in adolescents and adults.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "auto",
    domains: ["Extraversion", "Agreeableness", "Conscientiousness", "Neuroticism", "Openness to Experience"],
    scoringConfig: null,
    // formItems intentionally omitted — form items were added manually in production and are preserved by the upsert logic
  },
  {
    id: "CHOCHI-RS",
    name: "Children's Obsessional Compulsive Inventory-Revised-Self Report",
    category: "behavior",
    description: "A self-report questionnaire designed to assess the presence and severity of obsessive-compulsive symptoms in children and adolescents. It is intended for individuals aged 7 to 18 years and measures the frequency and distress associated with common OCD thoughts and behaviors.",
    isRemyndOwned: false,
    respondentTypes: ["self"],
    scoringType: "auto",
    domains: ["ocd", "obsessions", "compulsions"],
    scoringConfig: null,
    // formItems intentionally omitted — form items were added manually in production and are preserved by the upsert logic
  },
  {
    id: "RPPI",
    name: "ReMynd Phonological Processing Index (RPPI)",
    category: "Reading / Dyslexia Risk / Phonological Processing",
    description: "The ReMynd Phonological Processing Index (RPPI) is a structured examiner-administered tool for identifying phonological processing weaknesses associated with reading and spelling difficulty. It is not a diagnostic dyslexia test. Results should be interpreted alongside academic achievement, developmental history, classroom performance, and other RAOS assessment findings.",
    isRemyndOwned: true,
    respondentTypes: ["examiner"],
    scoringType: "manual",
    domains: ["rhyming", "blending", "segmentation", "deletion", "substitution", "nonword", "pa_composite"],
    scoringConfig: RPPI_SCORING_CONFIG as unknown as ScoringConfig,
    formItems: RPPI_FORM_ITEMS,
  },
  {
    id: "RDA",
    name: "ReMynd Decoding Assessment (RDA)",
    category: "Reading / Dyslexia Risk / Phonological Processing",
    description: "The ReMynd Decoding Assessment (RDA) is an examiner-administered tool measuring the ability to decode unfamiliar nonwords. It assesses phonics, sound-symbol mapping, and decoding efficiency in students aged 7–18. Administration time: 5–10 minutes.",
    isRemyndOwned: true,
    respondentTypes: ["examiner"],
    scoringType: "manual",
    domains: ["decoding"],
    scoringConfig: RDA_SCORING_CONFIG as unknown as ScoringConfig,
    formItems: [],
  },
  {
    id: "RRFA",
    name: "ReMynd Reading Fluency Assessment (RRFA)",
    category: "Reading / Dyslexia Risk / Phonological Processing",
    description: "The ReMynd Reading Fluency Assessment (RRFA) is an examiner-administered tool measuring reading accuracy, efficiency, and automaticity through timed oral passage reading. It calculates words per minute and accuracy percentage in students aged 7–18. Administration time: 5 minutes.",
    isRemyndOwned: true,
    respondentTypes: ["examiner"],
    scoringType: "manual",
    domains: ["fluency"],
    scoringConfig: RRFA_SCORING_CONFIG as unknown as ScoringConfig,
    formItems: [],
  },
  {
    id: "RRCA",
    name: "ReMynd Reading Comprehension Assessment (RRCA)",
    category: "Reading / Dyslexia Risk / Phonological Processing",
    description: "The ReMynd Reading Comprehension Assessment (RRCA) is an examiner-administered tool using AI-generated age-appropriate passages to measure reading comprehension across literal, inferential, and vocabulary dimensions in students aged 7–18. Administration time: 10–15 minutes.",
    isRemyndOwned: true,
    respondentTypes: ["examiner"],
    scoringType: "manual",
    domains: ["comprehension"],
    scoringConfig: RRCA_SCORING_CONFIG as unknown as ScoringConfig,
    formItems: [],
  },
  {
    id: "RAEPA",
    name: "RAEPA — ReMynd Academic English Performance Assessment",
    category: "Learning & Academic",
    description: "The ReMynd Academic English Performance Assessment (RAEPA) evaluates whether a student can successfully access, process, express, and demonstrate learning through English across the curriculum. Unlike conversational English screening, RAEPA examines academic language demands across reading, writing, listening, speaking, mathematics, science, humanities, and classroom instruction using authentic student work products. Identifies academic-language strengths, barriers, scaffolding response, independence level, and required classroom accommodations. Administration: 90–120 minutes.",
    isRemyndOwned: true,
    respondentTypes: ["examiner"],
    scoringType: "manual",
    domains: [
      "Social Communication English", "Academic Listening", "Academic Speaking",
      "Academic Reading", "Academic Writing", "General Academic Vocabulary",
      "Subject-Specific Vocabulary", "Understanding of Classroom Directions",
      "Explanation and Elaboration", "Sequencing and Organization",
      "Comparison and Classification", "Cause-and-Effect Reasoning",
      "Inference and Prediction", "Justification and Evidence",
      "Evaluation and Hypothesizing", "Mathematics Language",
      "Science Language", "Humanities Language",
      "Academic Independence", "Response to Scaffolding",
    ],
    scoringConfig: {
      max: 4,
      thresholds: { low: 75, mild: 50, moderate: 25 },
      domains: {
        "Social Communication English": { label: "Social Communication English", shortLabel: "Social Comms", narratives: { low: "Communicates effectively and confidently in familiar social English contexts across a range of everyday topics.", mild: "Generally communicates in social English with minor gaps in vocabulary or fluency that do not impede conversation.", moderate: "Social communication is developing; some difficulty with less familiar topics or extended conversation.", elevated: "Social English is limited; significant difficulty communicating even in familiar conversational contexts." } },
        "Academic Listening": { label: "Academic Listening", shortLabel: "Acad. Listening", narratives: { low: "Independently follows complex classroom instruction, multi-step directions, and extended academic explanations.", mild: "Generally follows academic listening tasks with occasional need for repetition or clarification.", moderate: "Significant difficulty following multi-step directions or extended academic explanation without substantial support.", elevated: "Academic listening is severely limited; cannot access classroom instruction without intensive modification." } },
        "Academic Speaking": { label: "Academic Speaking", shortLabel: "Acad. Speaking", narratives: { low: "Explains, justifies, compares, and elaborates ideas in academic English independently across subjects.", mild: "Can express academic ideas with some inconsistency in vocabulary, grammar, or organisation.", moderate: "Academic speaking is developing; relies on simple structures and has difficulty elaborating or justifying answers.", elevated: "Academic oral expression is severely limited; cannot explain or reason through English without intensive support." } },
        "Academic Reading": { label: "Academic Reading", shortLabel: "Acad. Reading", narratives: { low: "Reads and comprehends curriculum-level academic texts independently, including inferential and vocabulary tasks.", mild: "Generally reads academic texts adequately; some difficulty with complex vocabulary or inferential questions.", moderate: "Academic reading is developing; significant difficulty with subject vocabulary, inference, or text structure.", elevated: "Academic reading is severely limited; cannot access curriculum texts even with substantial support." } },
        "Academic Writing": { label: "Academic Writing", shortLabel: "Acad. Writing", narratives: { low: "Produces coherent, organised academic writing with appropriate vocabulary, grammar, and evidence use.", mild: "Academic writing is functional; some inconsistency in structure, vocabulary, or cohesion.", moderate: "Academic writing is developing; significant difficulty organising ideas, using subject vocabulary, or extending responses.", elevated: "Academic writing is severely limited; cannot produce an intelligible academic response without intensive support." } },
        "General Academic Vocabulary": { label: "General Academic Vocabulary", shortLabel: "Gen. Vocab", narratives: { low: "Uses and understands a wide range of general academic vocabulary across subject contexts independently.", mild: "Generally understands academic vocabulary; occasional gaps with less common or abstract terms.", moderate: "Significant gaps in general academic vocabulary that limit comprehension and expression across subjects.", elevated: "Very limited academic vocabulary that prevents access to grade-level academic content." } },
        "Subject-Specific Vocabulary": { label: "Subject-Specific Vocabulary", shortLabel: "Subject Vocab", narratives: { low: "Uses and understands subject-specific vocabulary accurately across assessed curriculum areas.", mild: "Generally understands subject vocabulary; some gaps with less frequently used or highly technical terms.", moderate: "Significant gaps in subject vocabulary that limit performance in assessed curriculum subjects.", elevated: "Very limited subject vocabulary; unable to access or demonstrate knowledge in subject areas through language." } },
        "Understanding of Classroom Directions": { label: "Understanding of Classroom Directions", shortLabel: "Directions", narratives: { low: "Accurately understands and follows multi-step classroom directions independently without clarification.", mild: "Generally follows classroom directions; occasional difficulty with multi-step or complex instructions.", moderate: "Significant difficulty understanding classroom directions; requires regular simplification or repetition.", elevated: "Cannot follow classroom directions without intensive support, visual aids, or extensive simplification." } },
        "Explanation and Elaboration": { label: "Explanation and Elaboration", shortLabel: "Explanation", narratives: { low: "Explains and elaborates ideas clearly and independently in academic English with appropriate detail.", mild: "Can explain ideas adequately; elaboration is sometimes limited or inconsistent.", moderate: "Explanation is developing; tends toward minimal responses and has difficulty extending or supporting ideas.", elevated: "Cannot explain or elaborate ideas through English without intensive scaffolding." } },
        "Sequencing and Organization": { label: "Sequencing and Organization", shortLabel: "Sequencing", narratives: { low: "Accurately sequences information and organises academic responses with clear logical structure.", mild: "Generally organises responses adequately; occasional gaps in sequencing or transitional language.", moderate: "Sequencing and organisation are developing; frequent gaps in logical order or textual cohesion.", elevated: "Cannot sequence or organise academic information through English without intensive support." } },
        "Comparison and Classification": { label: "Comparison and Classification", shortLabel: "Compare/Classify", narratives: { low: "Accurately compares, contrasts, and classifies concepts using appropriate comparative language.", mild: "Can compare and classify with adequate language; some difficulty with complex comparisons.", moderate: "Comparison and classification are developing; relies on simple structures and limited vocabulary.", elevated: "Cannot perform comparison or classification tasks in English without intensive language support." } },
        "Cause-and-Effect Reasoning": { label: "Cause-and-Effect Reasoning", shortLabel: "Cause-Effect", narratives: { low: "Accurately explains cause-and-effect relationships using appropriate academic language independently.", mild: "Can express cause-and-effect with adequate language; some inconsistency in causal structures.", moderate: "Cause-and-effect reasoning is developing; has difficulty expressing causal relationships clearly in English.", elevated: "Cannot articulate cause-and-effect relationships in English without intensive scaffolding." } },
        "Inference and Prediction": { label: "Inference and Prediction", shortLabel: "Inference", narratives: { low: "Makes accurate inferences and predictions from academic texts and spoken information independently.", mild: "Generally makes reasonable inferences; occasional difficulty with less explicit inference tasks.", moderate: "Inference and prediction are developing; significant difficulty moving beyond literal information.", elevated: "Cannot make inferences or predictions from academic language tasks without intensive support." } },
        "Justification and Evidence": { label: "Justification and Evidence", shortLabel: "Justification", narratives: { low: "Justifies positions and supports answers with relevant evidence using academic language independently.", mild: "Can justify answers with some evidence; support is sometimes incomplete or poorly expressed.", moderate: "Justification is developing; tends to assert without evidence or cannot express supporting reasoning.", elevated: "Cannot justify answers or use evidence in English without intensive scaffolding." } },
        "Evaluation and Hypothesizing": { label: "Evaluation and Hypothesizing", shortLabel: "Evaluation", narratives: { low: "Evaluates information and hypothesizes independently using appropriate academic language.", mild: "Can evaluate or hypothesize with adequate language; some inconsistency with complex evaluative tasks.", moderate: "Evaluation and hypothesizing are developing; has difficulty with higher-order language demands.", elevated: "Cannot evaluate or hypothesize through English without intensive language support." } },
        "Mathematics Language": { label: "Mathematics Language", shortLabel: "Maths Language", narratives: { low: "Accurately understands and uses mathematical language, symbols, and command words independently.", mild: "Generally understands mathematical language; occasional difficulty with abstract or multi-step language.", moderate: "Mathematical language is developing; significant gaps in vocabulary limit access to word problems.", elevated: "Cannot access mathematics language tasks without intensive vocabulary and language support." } },
        "Science Language": { label: "Science Language", shortLabel: "Science Language", narratives: { low: "Uses and understands science process vocabulary and academic science language independently.", mild: "Generally understands science language; occasional difficulty with technical or process vocabulary.", moderate: "Science language is developing; significant gaps in vocabulary limit access to science tasks.", elevated: "Cannot access science language tasks without intensive support." } },
        "Humanities Language": { label: "Humanities Language", shortLabel: "Humanities Lang.", narratives: { low: "Uses and understands humanities vocabulary including cause, perspective, evidence, and argument independently.", mild: "Generally understands humanities language; occasional difficulty with evaluative or analytical vocabulary.", moderate: "Humanities language is developing; significant gaps limit access to history, geography, or social studies tasks.", elevated: "Cannot access humanities language tasks without intensive vocabulary support." } },
        "Academic Independence": { label: "Academic Independence", shortLabel: "Independence", narratives: { low: "Initiates, completes, and reviews academic tasks independently without requiring language clarification.", mild: "Generally independent; occasionally requires clarification of instructions or task requirements.", moderate: "Academic independence is developing; frequently requires support to begin, sustain, or complete tasks.", elevated: "Cannot initiate or complete academic tasks independently; requires extensive guidance throughout." } },
        "Response to Scaffolding": { label: "Response to Scaffolding", shortLabel: "Scaffolding", narratives: { low: "Does not require scaffolding; performs at grade level without additional support.", mild: "Responds well to minimal scaffolding (e.g., vocabulary clarification) with clear performance improvement.", moderate: "Responds to structured scaffolding (broken steps, visual support); significant support is required for access.", elevated: "Responds only to intensive mediation; knowledge may become visible only with substantial language simplification." } },
      },
    } as unknown as ScoringConfig,
    formItems: [],
  },
  {
    id: "RAMRI",
    name: "RAMRI — ReMynd Authentic Mathematical Reasoning Interview",
    category: "Learning & Academic",
    description: "The ReMynd Authentic Mathematical Reasoning Interview (RAMRI) is a structured examiner-administered interview that uses authentic student work as the starting point for exploring mathematical reasoning. Using familiar, self-selected mathematics work, students demonstrate conceptual understanding, strategy awareness, procedural reasoning, error awareness, and transfer across 10 reasoning domains. Designed to complement formal assessment where anxiety or performance conditions may underestimate available reasoning. Administration time: 20–40 minutes.",
    isRemyndOwned: true,
    respondentTypes: ["examiner"],
    scoringType: "manual",
    domains: [
      "Conceptual Understanding", "Strategy Awareness", "Procedural Reasoning",
      "Mathematical Communication", "Error Awareness", "Verification and Reasonableness",
      "Strategy Flexibility", "Transfer", "Metacognition", "Independence",
    ],
    scoringConfig: {
      max: 4,
      thresholds: { low: 25, mild: 50, moderate: 75 },
      domains: {
        "Conceptual Understanding": { label: "Conceptual Understanding", shortLabel: "Conceptual", narratives: { low: "Demonstrates clear understanding of mathematical relationships and can explain why methods work.", mild: "Shows developing conceptual understanding with some inconsistency in explaining underlying concepts.", moderate: "Limited conceptual understanding observed; tends to rely on procedural recall rather than conceptual explanation.", elevated: "Insufficient evidence of conceptual understanding across observed samples." } },
        "Strategy Awareness": { label: "Strategy Awareness", shortLabel: "Strategy", narratives: { low: "Can identify, describe, and justify the approach used with clear awareness of available strategies.", mild: "Developing strategy awareness; can describe methods used but has difficulty explaining why they were chosen.", moderate: "Limited strategy awareness; describes steps without connecting to strategic reasoning.", elevated: "Insufficient evidence of strategy awareness observed." } },
        "Procedural Reasoning": { label: "Procedural Reasoning", shortLabel: "Procedural", narratives: { low: "Understands the sequence and purpose of procedural steps and can reconstruct reasoning.", mild: "Developing procedural reasoning; follows steps accurately but has difficulty explaining their purpose.", moderate: "Limited procedural understanding; tends toward mechanical recitation without purposeful reasoning.", elevated: "Insufficient evidence of purposeful procedural reasoning." } },
        "Mathematical Communication": { label: "Mathematical Communication", shortLabel: "Communication", narratives: { low: "Communicates mathematical reasoning clearly through verbal, written, or representational means.", mild: "Developing communication; can convey reasoning but has difficulty with precision or completeness.", moderate: "Limited mathematical communication; struggles to express reasoning clearly in any modality.", elevated: "Insufficient evidence of mathematical communication observed." } },
        "Error Awareness": { label: "Error Awareness", shortLabel: "Error Awareness", narratives: { low: "Can notice, discuss, and reconsider errors with meaningful self-correction.", mild: "Developing error awareness; can identify errors when prompted but rarely self-monitors.", moderate: "Limited error awareness; has difficulty identifying or discussing errors even with support.", elevated: "Insufficient evidence of error awareness observed." } },
        "Verification and Reasonableness": { label: "Verification and Reasonableness", shortLabel: "Verification", narratives: { low: "Uses estimation, checking strategies, and reasonableness judgements to evaluate answers.", mild: "Developing verification skills; sometimes checks work but applies limited reasonableness judgement.", moderate: "Limited verification; rarely checks answers or evaluates reasonableness of outcomes.", elevated: "Insufficient evidence of verification behaviour observed." } },
        "Strategy Flexibility": { label: "Strategy Flexibility", shortLabel: "Flexibility", narratives: { low: "Can consider, compare, and shift strategies demonstrating flexible mathematical thinking.", mild: "Developing flexibility; can acknowledge alternative strategies but has difficulty applying them.", moderate: "Limited strategic flexibility; relies on a single approach with difficulty considering alternatives.", elevated: "Insufficient evidence of strategy flexibility observed." } },
        "Transfer": { label: "Transfer", shortLabel: "Transfer", narratives: { low: "Can apply reasoning to a related but non-identical situation demonstrating transferable understanding.", mild: "Developing transfer; recognises connections to similar problems with some support.", moderate: "Limited transfer observed; difficulty applying reasoning when surface features change.", elevated: "Insufficient evidence of transfer observed." } },
        "Metacognition": { label: "Metacognition", shortLabel: "Metacognition", narratives: { low: "Demonstrates clear awareness of own thinking, describes what helped, and evaluates confidence.", mild: "Developing metacognitive awareness; can reflect on thinking with prompting.", moderate: "Limited metacognition; has difficulty identifying what was easy or hard or how they thought.", elevated: "Insufficient evidence of metacognitive reflection observed." } },
        "Independence": { label: "Independence", shortLabel: "Independence", narratives: { low: "Reasoning clearly belongs to the student; can reconstruct thinking without relying on remembered teacher language.", mild: "Generally independent reasoning with occasional reliance on rehearsed phrases or teacher modelling.", moderate: "Significant reliance on prompting, modelling, or remembered external language to reconstruct reasoning.", elevated: "Insufficient evidence of independent reasoning; extensive support required throughout." } },
      },
    } as unknown as ScoringConfig,
    formItems: [],
  },
  {
    id: "RMRA",
    name: "RMRA — ReMynd Mathematical Reasoning Assessment",
    category: "Learning & Academic",
    description: "The ReMynd Mathematical Reasoning Assessment (RMRA) is a structured examiner-administered tool assessing mathematical reasoning, problem solving, and metacognitive strategy use across 13 domains in students aged 5–16. Supports identification of dyscalculia risk, mathematical learning difficulties, and reasoning strengths. Administration time: 30–60 minutes (full) or 15–25 minutes (brief).",
    isRemyndOwned: true,
    respondentTypes: ["examiner"],
    scoringType: "manual",
    domains: [
      "Number Sense", "Place Value", "Addition Reasoning", "Subtraction Reasoning",
      "Multiplicative Thinking", "Division Thinking", "Fractions", "Measurement",
      "Patterns & Early Algebra", "Geometry & Spatial Reasoning", "Mathematical Language",
      "Problem Solving & Executive Function", "Response to Productive Struggle",
    ],
    scoringConfig: {
      max: 100,
      thresholds: { low: 75, mild: 50, moderate: 25 },
      domains: {
        "Number Sense": { label: "Number Sense", shortLabel: "Num Sense", narratives: { low: "Demonstrates strong number sense with accurate estimation, subitizing, and magnitude reasoning.", mild: "Shows developing number sense; inconsistencies in estimation and magnitude comparison noted.", moderate: "Emerging number sense; requires structured support for quantity reasoning and benchmarking.", elevated: "Significant difficulties with number sense; intensive support recommended." } },
        "Place Value": { label: "Place Value", shortLabel: "Place Value", narratives: { low: "Solid understanding of place value across all digit positions including decimals.", mild: "Developing place value understanding; some confusion with regrouping or multi-digit values.", moderate: "Limited place value concept; difficulties with tens/hundreds and regrouping observed.", elevated: "Very limited place value understanding; foundational re-teaching required." } },
        "Addition Reasoning": { label: "Addition Reasoning", shortLabel: "Addition", narratives: { low: "Uses efficient and flexible addition strategies with strong accuracy.", mild: "Functional addition skills; prefers counting strategies over more efficient methods.", moderate: "Addition reasoning developing; frequent errors and limited strategy variety.", elevated: "Significant difficulties with addition; targeted intervention recommended." } },
        "Subtraction Reasoning": { label: "Subtraction Reasoning", shortLabel: "Subtraction", narratives: { low: "Strong subtraction reasoning across contexts with appropriate strategy selection.", mild: "Developing subtraction skills; may revert to less efficient strategies under pressure.", moderate: "Limited subtraction reasoning; difficulties with regrouping and multi-step problems.", elevated: "Significant subtraction difficulties; foundational intervention warranted." } },
        "Multiplicative Thinking": { label: "Multiplicative Thinking", shortLabel: "Mult. Thinking", narratives: { low: "Demonstrates strong multiplicative thinking with flexible use of arrays, area models, and properties.", mild: "Developing multiplicative reasoning; some reliance on repeated addition rather than multiplicative structures.", moderate: "Limited multiplicative thinking; conceptual gaps in understanding multiplication as scaling.", elevated: "Significant difficulties with multiplicative thinking; intervention recommended." } },
        "Division Thinking": { label: "Division Thinking", shortLabel: "Division", narratives: { low: "Strong division thinking with understanding of both partition and quotition models.", mild: "Developing division skills; prefers repeated subtraction or sharing models.", moderate: "Limited division reasoning; conceptual gaps between sharing and grouping division.", elevated: "Significant difficulties with division thinking; re-teaching of foundational concepts needed." } },
        "Fractions": { label: "Fractions", shortLabel: "Fractions", narratives: { low: "Strong fraction reasoning including operations, equivalence, and comparison.", mild: "Developing fraction understanding; some confusion with unlike denominators or improper fractions.", moderate: "Limited fraction knowledge; significant gaps in part-whole understanding.", elevated: "Very limited fraction understanding; intensive foundational support required." } },
        "Measurement": { label: "Measurement", shortLabel: "Measurement", narratives: { low: "Accurate measurement reasoning including unit conversion and formula application.", mild: "Developing measurement skills; occasional unit confusion or formula errors.", moderate: "Limited measurement reasoning; difficulties with multi-step and conversion tasks.", elevated: "Significant measurement difficulties; requires structured re-teaching." } },
        "Patterns & Early Algebra": { label: "Patterns & Early Algebra", shortLabel: "Patterns/Algebra", narratives: { low: "Strong pattern recognition and algebraic thinking with ability to generalise rules.", mild: "Developing algebraic reasoning; can extend patterns but may struggle to generalise.", moderate: "Limited pattern and algebraic reasoning; difficulties finding and applying rules.", elevated: "Significant difficulties with pattern and algebraic thinking; foundational support needed." } },
        "Geometry & Spatial Reasoning": { label: "Geometry & Spatial Reasoning", shortLabel: "Geometry", narratives: { low: "Strong spatial reasoning and geometric understanding across 2D and 3D contexts.", mild: "Developing geometry skills; some difficulty with transformations or angle classification.", moderate: "Limited geometric reasoning; significant gaps in spatial and shape understanding.", elevated: "Significant spatial reasoning difficulties; targeted geometric intervention recommended." } },
        "Mathematical Language": { label: "Mathematical Language", shortLabel: "Math Language", narratives: { low: "Precise and flexible use of mathematical language to explain and justify reasoning.", mild: "Developing mathematical language; can solve but has difficulty verbalising reasoning.", moderate: "Limited mathematical vocabulary; difficulty expressing mathematical ideas verbally.", elevated: "Significant mathematical language difficulties; language-integrated math support recommended." } },
        "Problem Solving & Executive Function": { label: "Problem Solving & Executive Function", shortLabel: "Problem Solving", narratives: { low: "Strong problem solving with systematic planning, multi-step execution, and self-monitoring.", mild: "Developing problem-solving skills; may struggle with planning or monitoring multi-step problems.", moderate: "Limited problem-solving capacity; difficulties with task initiation and self-regulation in math.", elevated: "Significant problem-solving difficulties linked to executive function; integrated support recommended." } },
        "Response to Productive Struggle": { label: "Response to Productive Struggle", shortLabel: "Productive Struggle", narratives: { low: "Excellent persistence, flexibility, and emotional regulation when faced with challenging tasks.", mild: "Developing tolerance for productive struggle; may disengage after initial difficulty.", moderate: "Limited productive struggle capacity; gives up quickly or becomes anxious with hard tasks.", elevated: "Very low tolerance for mathematical challenge; requires emotional and metacognitive scaffolding." } },
      },
    } as unknown as ScoringConfig,
    formItems: [],
  },
];

const CANONICAL_IDS = CANONICAL_TOOLS.map(t => t.id as string);

// Product → tool membership map (mirrors ASSESSMENT_PRODUCTS in the frontend)
const PRODUCT_TOOL_MAP: Record<string, string[]> = {
  "comprehensive-psych-profile": [
    "REFERRAL", "INTAKE", "CONSENT",
    "RCS-80", "BEHAVOBS",
    "BASC3-PRS-A", "BASC3-PRS-C", "BRIEF2-P", "SDQ-P", "SDQ-P11", "RCADS", "SCDQPF",
    "BASC3-TRS-A", "BASC3-TRS-C", "BRIEF2-T", "SDQ-T", "SDQ-T11", "BSPP",
    "BASC3-SRP-A", "BASC3-SRP-C", "BRIEF2-SR", "BYI2", "RSCA",
    "REFI", "RFII", "RSCP", "RARPS", "FASM",
  ],
  "school-snapshot":   ["RCS-80", "RASR", "RERMS", "RSSC", "RSCP", "SDQ-P", "SDQ-P11", "SDQ-T", "SDQ-T11", "SDQ-SR", "SDQ-SR18", "PSC"],
  "focused-support":   ["RCS-80", "RCEP-CORE", "REFI", "RFII", "RARPS", "RSCP", "BASC3-TRS-A", "BASC3-PRS-A", "BASC3-TRS-C", "BASC3-PRS-C", "BRIEF2-P", "BRIEF2-T", "BRIEF2-SR"],
  "sen-learning-support": ["RCS-80", "RCEP-CORE", "REFI", "RFII", "RARPS", "RASR", "SCAS", "RCADS", "BYI2", "RSCA", "EFA"],
  "boarding-wellbeing":   ["BSPP", "RERMS", "RSCP", "RFII", "WHO-5", "PSS-10", "SDQ-SR", "SDQ-SR18", "GAD-7"],
  "why-struggling":    ["RCS-80", "RASR", "RSCP", "RARPS", "RFII", "INTAKE", "RCADS", "BYI2"],
  "ef-coaching":       ["REFI", "RASR", "BRIEF2-SR"],
  "emotional-wellbeing": ["RERMS", "DASS-21", "GAD-7", "PHQ-9"],
  "school-readiness":  ["RSSC", "RERMS", "REFI", "SDQ-SR", "SDQ-SR18", "WHO-5"],
  "employee-wellbeing": ["PSS-10", "DASS-21", "RSES", "GHQ-12"],
  "leadership-profiling": ["REFI", "RERMS", "RSES"],
  "graduate-readiness": ["REFI", "RSCA", "RSES", "GHQ-12"],
  "intl-student":      ["RERMS", "PSS-10", "DASS-21", "RSCA", "WHO-5", "RSES"],
  "academic-risk":     ["RCS-80", "RCEP-CORE", "REFI", "RFII", "RARPS", "RERMS", "RASR"],
  "hidden-struggler":  ["REFI", "RFII", "RSCA", "RERMS", "RCADS", "BYI2"],
  "underachievement":  ["RCS-80", "RCEP-CORE", "RASR", "RARPS", "REFI", "RFII"],
  "digital-distraction": ["RASR", "REFI", "BYI2"],
};

// Reverse map: tool → [productId, ...]
const TOOL_INITIAL_PRODUCT_IDS: Record<string, string[]> = {};
for (const [productId, toolIds] of Object.entries(PRODUCT_TOOL_MAP)) {
  for (const toolId of toolIds) {
    if (!TOOL_INITIAL_PRODUCT_IDS[toolId]) TOOL_INITIAL_PRODUCT_IDS[toolId] = [];
    TOOL_INITIAL_PRODUCT_IDS[toolId].push(productId);
  }
}

const CDP_BATTERY_ID = "CDP";
const BRIEF2_BATTERY_ID = "BRIEF2";

// Silently translate a canonical tool and persist the result to the DB
async function autoTranslateCanonicalTool(toolId: string, formItems: any[]) {
  try {
    logger.info({ toolId }, "Auto-translating canonical tool");
    const translated = await translateFormItemsWithAI(formItems as any);
    if (!translated?.length) return;
    await db.update(assessmentToolsTable)
      .set({ formItems: translated as any })
      .where(eq(assessmentToolsTable.id, toolId));
    logger.info({ toolId }, "Canonical tool translations applied");
  } catch (err) {
    logger.error({ err, toolId }, "Auto-translation failed for canonical tool");
  }
}

// Merge translations stored in the DB into the canonical English definition so
// they are not lost when the server restarts with updated code.
function mergeTranslations(canonical: any[], stored: any[]): any[] {
  const byId = new Map(stored.map((item: any) => [item.id, item]));
  return canonical.map(item => {
    const s = byId.get(item.id) as any;
    if (!s) return item;
    return {
      ...item,
      textChinese:    s.textChinese    || item.textChinese    || "",
      textKorean:     s.textKorean     || item.textKorean     || "",
      optionsChinese: s.optionsChinese?.length ? s.optionsChinese : (item.optionsChinese ?? []),
      optionsKorean:  s.optionsKorean?.length  ? s.optionsKorean  : (item.optionsKorean  ?? []),
    };
  });
}

function itemsMissingTranslations(items: any[]): boolean {
  return items.some(item =>
    (!item.textChinese || !item.textKorean) ||
    (item.options?.length > 0 && (!item.optionsChinese?.length || !item.optionsKorean?.length))
  );
}

async function syncTools() {
  // Fetch all existing records once so we can preserve translations
  const existing = await db.select().from(assessmentToolsTable);
  const existingById = new Map(existing.map(r => [r.id, r]));

  try {
    const needsTranslation: Array<{ id: string; items: any[] }> = [];

    for (const tool of CANONICAL_TOOLS) {
      const stored = existingById.get(tool.id as string);
      const storedItems = stored?.formItems as any[] | null;

      // Merge DB translations back into the canonical definition
      const mergedItems = tool.formItems
        ? storedItems?.length
          ? mergeTranslations(tool.formItems as any[], storedItems)
          : tool.formItems
        : null;

      const initialProductIds = TOOL_INITIAL_PRODUCT_IDS[tool.id as string] ?? [];
      await db.insert(assessmentToolsTable).values({ ...tool, productIds: initialProductIds }).onConflictDoUpdate({
        target: assessmentToolsTable.id,
        set: {
          name: tool.name,
          category: tool.category,
          description: tool.description,
          isRemyndOwned: tool.isRemyndOwned,
          respondentTypes: tool.respondentTypes,
          // scoringType intentionally omitted — user edits must persist across restarts
          domains: tool.domains,
          scoringConfig: tool.scoringConfig ?? null,
          // Only overwrite formItems when the canonical definition includes them —
          // tools added manually in production have their items preserved this way
          ...(tool.formItems != null ? { formItems: mergedItems ?? null } : {}),
          // productIds intentionally omitted — user edits must persist across restarts
        },
      });

      // Only auto-translate BRIEF-2 forms
      if (
        (tool.id as string).startsWith("BRIEF2") &&
        mergedItems &&
        itemsMissingTranslations(mergedItems)
      ) {
        needsTranslation.push({ id: tool.id as string, items: mergedItems });
      }
    }

    logger.info({ count: CANONICAL_TOOLS.length }, "Assessment tools synced");

    // Run translations in the background — all 3 BRIEF-2 forms at once
    if (needsTranslation.length > 0) {
      (async () => {
        for (let i = 0; i < needsTranslation.length; i += 3) {
          const chunk = needsTranslation.slice(i, i + 3);
          await Promise.all(chunk.map(({ id, items }) => autoTranslateCanonicalTool(id, items)));
        }
      })().catch(() => {/* already logged inside */});
    }
  } catch (err) {
    logger.error({ err }, "Failed to sync assessment tools");
  }
}

const CANONICAL_USERS = [
  { id: "user-admin-001", name: "Noel (Admin)", email: "noelroberts43@gmail.com", role: "admin" as const },
  { id: "user-hayley-002", name: "Hayley (Assessment Invigilator)", email: "hayleyxu13@gmail.com", role: "assessment_invigilator" as const },
  { id: "user-abegail-003", name: "Abegail (Psychometrician)", email: "cioconabegail@gmail.com", role: "psychometrician" as const },
];

async function seedIfEmpty() {
  try {
    const existingUsers = await db.select().from(usersTable).limit(1);
    if (existingUsers.length > 0) {
      logger.info("Users already seeded, skipping user seed");
      return;
    }

    logger.info("Seeding demo users...");
    await db.insert(usersTable).values(
      CANONICAL_USERS.map(u => ({ ...u, passwordHash: hashPassword("password") }))
    ).onConflictDoNothing();
    logger.info("Demo users seeded successfully");
  } catch (err) {
    logger.error({ err }, "Failed to seed users");
  }
}

async function syncUserEmails() {
  try {
    for (const u of CANONICAL_USERS) {
      await db.update(usersTable)
        .set({ email: u.email, name: u.name })
        .where(eq(usersTable.id, u.id));
    }
    logger.info("User emails synced from canonical list");
  } catch (err) {
    logger.error({ err }, "Failed to sync user emails");
  }
}

const BASC3_BATTERY_ID = "BASC3";

const CANONICAL_BATTERIES: (typeof batteriesTable.$inferInsert)[] = [
  {
    id: CDP_BATTERY_ID,
    name: "ReMynd Child Development Profile (CDP)",
    description: "A comprehensive parent/teacher-completed battery covering four developmental domains: Cognition & Learning, Social Interaction, Self-Regulation, and Communication & Interaction. Designed for children aged 5–18 to identify developmental profiles and intervention priorities.",
    toolIds: ["CDP-CL", "CDP-SI", "CDP-SR", "CDP-CI"],
    isRemyndOwned: true,
    domains: ["cognition_learning", "social_interaction", "self_regulation", "communication_interaction"],
    scoringNotes: "Each domain is scored on a 0–3 scale (Never=0, Rarely=1, Often=2, Always=3). Domain scores are expressed as a percentage of maximum possible score. Higher scores indicate stronger functioning. Thresholds: Typical ≥75%, Mild Concern 50–74%, Moderate Concern 25–49%, Significant Concern <25%.",
  },
  {
    id: BASC3_BATTERY_ID,
    name: "Behavior Assessment System for Children, Third Edition (BASC-3)",
    description: "A comprehensive, multi-method assessment system for evaluating the behavior and self-perceptions of children and adolescents aged 6–21. Includes Teacher Rating Scales (TRS), Parent Rating Scales (PRS), and Self-Report of Personality (SRP) forms for child (6–11) and adolescent (12–21) age bands. Scoring is completed externally using the BASC-3 ASSIST software.",
    toolIds: ["BASC3-TRS-A", "BASC3-PRS-A", "BASC3-TRS-C", "BASC3-PRS-C", "BASC3-SRP-A", "BASC3-SRP-C"],
    isRemyndOwned: false,
    domains: ["behavior"],
    scoringNotes: "BASC-3 scoring is performed externally using the BASC-3 ASSIST scoring software. Raw scores, T-scores, and percentile ranks are generated by ASSIST and entered into the case record manually. Rating scale forms (TRS/PRS) use a 4-point frequency scale: Never (N), Sometimes (S), Often (O), Almost Always (A). Self-Report forms (SRP) use True/False for the first set of items and the same 4-point frequency scale for the remainder.",
  },
  {
    id: BRIEF2_BATTERY_ID,
    name: "Behavior Rating Inventory of Executive Function – Second Edition (BRIEF-2)",
    description: "A multi-informant assessment battery measuring executive function in children and adolescents aged 5–18. Includes Parent, Teacher, and Self-Report forms. Items use a 3-point frequency scale (Never/Sometimes/Often). Scoring is completed externally using the BRIEF-2 scoring software to generate clinical scales (Inhibit, Shift, Emotional Control, Initiate, Working Memory, Plan/Organize, Task Monitor, Organization of Materials) and composite indices (BRI, ERI, CRI, GEC).",
    toolIds: ["BRIEF2-P", "BRIEF2-SR", "BRIEF2-T"],
    isRemyndOwned: false,
    domains: ["executive-function"],
    scoringNotes: "BRIEF-2 scoring is performed externally. All forms use Never (N) / Sometimes (S) / Often (O) frequency ratings. Raw scores convert to T-scores and percentile ranks via the BRIEF-2 normative software. Clinical scales group into three composite indices: Behavioral Regulation Index (BRI), Emotion Regulation Index (ERI), and Cognitive Regulation Index (CRI), which together form the Global Executive Composite (GEC).",
  },
  {
    id: "RMRA",
    name: "ReMynd Mathematical Reasoning Assessment (RMRA)",
    description: "A structured examiner-administered assessment of mathematical reasoning, problem solving, and metacognitive strategy use across 13 domains in students aged 5–16. Supports identification of dyscalculia risk and mathematical learning difficulties. Administration time: 30–60 minutes (full) or 15–25 minutes (brief).",
    toolIds: ["RMRA"],
    isRemyndOwned: true,
    domains: [
      "Number Sense", "Place Value", "Addition Reasoning", "Subtraction Reasoning",
      "Multiplicative Thinking", "Division Thinking", "Fractions", "Measurement",
      "Patterns & Early Algebra", "Geometry & Spatial Reasoning", "Mathematical Language",
      "Problem Solving & Executive Function", "Response to Productive Struggle",
    ],
    scoringNotes: "RMRA scoring is performed live by the examiner during administration. Domain scores are computed as a percentage across accuracy, reasoning, strategy level, hint dependency, productive struggle, and confidence. A composite score determines domain level: Strength ≥75%, Developing 50–74%, Vulnerable 25–49%, High Concern <25%.",
  },
  {
    id: "SCREENING",
    name: "Public Domain / Open-Access Screening Measures",
    description: "A curated collection of freely available, validated screening and wellbeing instruments covering emotional health, behaviour, anxiety, depression, stress, self-esteem, and wellbeing. Suitable for initial screening and progress monitoring across child, adolescent, and adult populations.",
    toolIds: ["SDQ-P", "SDQ-P11", "SDQ-T", "SDQ-T11", "SDQ-SR", "SDQ-SR18", "GHQ-12", "SMFQ", "PSC", "GAD-7", "PHQ-9", "PHQ-9A", "PSS-10", "DASS-21", "RSES", "WHO-5", "AUDIT", "CABS"],
    isRemyndOwned: false,
    domains: ["behavior", "social-emotional"],
    scoringNotes: "Each tool uses its own published scoring key. Refer to the original instrument manual or open-access scoring guide for cut-off scores and interpretation. All tools in this battery are in the public domain or freely available for clinical and research use.",
  },
];

async function syncBatteries() {
  try {
    for (const battery of CANONICAL_BATTERIES) {
      await db.insert(batteriesTable).values(battery).onConflictDoUpdate({
        target: batteriesTable.id,
        set: {
          name: battery.name,
          description: battery.description,
          toolIds: battery.toolIds,
          isRemyndOwned: battery.isRemyndOwned,
          domains: battery.domains,
          scoringNotes: battery.scoringNotes ?? null,
        },
      });
    }
    logger.info({ count: CANONICAL_BATTERIES.length }, "Batteries synced");
  } catch (err) {
    logger.error({ err }, "Failed to sync batteries");
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

async function runMigrations() {
  try {
    // Ensure referral_invites table exists (added 2026-04)
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS referral_invites (
        token            text PRIMARY KEY,
        form_id          text NOT NULL,
        include_consent  boolean NOT NULL DEFAULT false,
        to_email         text NOT NULL,
        to_name          text NOT NULL,
        school_name      text,
        created_at       timestamp NOT NULL DEFAULT now(),
        used_at          timestamp,
        resulting_case_id text
      )
    `);
    logger.info("Migrations applied");
  } catch (err) {
    logger.error({ err }, "Migration failed");
  }
}

async function reviseHIQForm() {
  try {
    const rows = await db
      .select({ formItems: assessmentToolsTable.formItems })
      .from(assessmentToolsTable)
      .where(eq(assessmentToolsTable.id, "HIQ"))
      .limit(1);

    if (!rows.length || !rows[0].formItems) return;
    const items = rows[0].formItems as any[];

    // Idempotency: already revised if options are labeled
    const sampleQ = items.find((it: any) => it.type === "likert");
    if (sampleQ?.options?.[0] === "0 (Never True)") return;

    const OPT_EN = ["0 (Never True)", "1 (Sometimes True)", "2 (Often True)", "3 (Always True)"];
    const OPT_ZH = ["0 (\u4ece\u4e0d\u771f\u5b9e)", "1 (\u6709\u65f6\u771f\u5b9e)", "2 (\u7ecf\u5e38\u771f\u5b9e)", "3 (\u603b\u662f\u771f\u5b9e)"];
    const OPT_KO = ["0 (\uc804\ud600 \uc5c6\uc74c)", "1 (\uac00\ub053 \uadf8\ub807\ub2e4)", "2 (\uc790\uc8fc \uadf8\ub587\ub2e4)", "3 (\ud56d\uc0c1 \uadf8\ub387\ub2e4)"];

    const newItems = items.map((it: any) => {
      // Fix the instruction header note
      if (it.id === "hiq_instr") {
        return {
          ...it,
          note: "This questionnaire assesses sensitivity to sound (hyperacusis) and its impact on daily functioning, emotional well-being, and social participation. Please rate each statement based on how true it has been over the past 2\u20134 weeks. Select the response that best reflects your experience.\n\nResponse scale: 0 (Never True) \u00b7 1 (Sometimes True) \u00b7 2 (Often True) \u00b7 3 (Always True)",
          noteChinese: "\u672c\u95ee\u5377\u8bc4\u4f30\u5bf9\u58f0\u97f3\u7684\u654f\u611f\u6027\uff08\u542c\u89c9\u8fc7\u654f\uff09\u53ca\u5176\u5bf9\u65e5\u5e38\u529f\u80fd\u3001\u60c5\u7eea\u5065\u5eb7\u548c\u793e\u4ea4\u53c2\u4e0e\u7684\u5f71\u54cd\u3002\u8bf7\u6839\u636e\u8fc7\u53bb2\u20134\u5468\u5185\u6bcf\u9879\u8868\u8ff0\u7684\u771f\u5b9e\u7a0b\u5ea6\u8fdb\u884c\u8bc4\u5206\uff0c\u9009\u62e9\u6700\u80fd\u53cd\u6620\u60a8\u4f53\u9a8c\u7684\u9009\u9879\u3002\n\n\u56de\u5e94\u9009\u9879\uff1a0 (\u4ece\u4e0d\u771f\u5b9e) \u00b7 1 (\u6709\u65f6\u771f\u5b9e) \u00b7 2 (\u7ecf\u5e38\u771f\u5b9e) \u00b7 3 (\u603b\u662f\u771f\u5b9e)",
          noteKorean: "\uc774 \uc124\ubb38\uc9c0\ub294 \uc18c\ub9ac\uc5d0 \ub300\ud55c \ubbfc\uac10\uc131(\uccad\uac01 \uacfc\ubbfc\uc99d)\uacfc \uadf8\uac83\uc774 \uc77c\uc0c1 \uae30\ub2a5, \uc815\uc11c\uc801 \uc6d0\uc2dc\ub9ac, \uc0ac\ud68c\uc801 \ucc38\uc5ec\uc5d0 \ubbf8\uce58\ub294 \uc601\ud5a5\uc744 \ud3c9\uac00\ud569\ub2c8\ub2e4. \uc9c0\ub09c 2\u20134\uc8fc \ub3d9\uc548 \uac01 \ud56d\ubaa9\uc774 \uc5bc\ub9c8\ub098 \uc0ac\uc2e4\uc774\uc5c8\ub294\uc9c0\ub97c \ud3c9\uac00\ud558\uc2dc\uace0, \ud558\uc2e0 \uacbd\ud5d8\uc744 \uac00\uc7a5 \uc798 \ub098\ud0c0\ub0b4\ub294 \uc751\ub2f5\uc744 \uc120\ud0dd\ud574 \uc8fc\uc138\uc694.\n\n\uc751\ub2f5 \ucca0\ub3c4: 0 (\uc804\ud600 \uc5c6\uc74c) \u00b7 1 (\uac00\ub053 \uadf8\ub807\ub2e4) \u00b7 2 (\uc790\uc8fc \uadf8\ub387\ub2e4) \u00b7 3 (\ud56d\uc0c1 \uadf8\ub387\ub2e4)",
        };
      }
      // Label the likert options on every question item
      if (it.type === "likert") {
        return {
          ...it,
          required: true,
          options: OPT_EN,
          optionsChinese: OPT_ZH,
          optionsKorean: OPT_KO,
        };
      }
      return it;
    });

    await db
      .update(assessmentToolsTable)
      .set({ formItems: newItems })
      .where(eq(assessmentToolsTable.id, "HIQ"));

    logger.info("Revised HIQ form options and instructions");
  } catch (err) {
    logger.error({ err }, "Failed to revise HIQ form");
  }
}

async function reviseDYSRISKTalents() {
  try {
    const rows = await db
      .select({ formItems: assessmentToolsTable.formItems })
      .from(assessmentToolsTable)
      .where(eq(assessmentToolsTable.id, "DYSRISK"))
      .limit(1);

    if (!rows.length || !rows[0].formItems) return;
    const items = rows[0].formItems as any[];

    // Idempotency: already revised if the talents section header has our ID
    if (items.some((it: any) => it.id === "dys_b_talents_hdr")) return;

    const talentsStart = items.findIndex((it: any) => it.id === "q25");
    if (talentsStart === -1) return;

    const o0 = (): string[] => [];
    const ABS_EN = ["Absolutely", "Somewhat", "Rarely or Never"];
    const ABS_ZH = ["\u7edd\u5bf9\u662f", "\u6709\u4e9b\u662f", "\u5f88\u5c11\u6216\u4ece\u4e0d"];
    const ABS_KO = ["\uc808\ub300\uc801\uc73c\ub85c \uadf8\ub807\ub2e4", "\uc5b4\ub290 \uc815\ub3c4 \uadf8\ub807\ub2e4", "\uac70\uc758 \ub610\ub294 \uc804\ud600 \uc544\ub2c8\ub2e4"];

    const behaviors = [
      {
        suffix: "dream",
        en: "Frequent daydreaming or \u201czoning out\u201d",
        zh: "\u9891\u7e41\u505a\u767d\u65e5\u68a6\u6216\u300c\u53d1\u5446\u300d",
        ko: "\uc790\uc8fc \uba4d\ud558\ub2c8 \uc788\uac70\ub098 \u201c\uc0b4\uc8fc\u201d\uac00 \ub9d1\ud558\ub294\ub2e4",
      },
      {
        suffix: "attn",
        en: "Difficulty sustaining attention",
        zh: "\u96be\u4ee5\u6301\u7eed\u96c6\u4e2d\u6ce8\u610f\u529b",
        ko: "\uc8fc\uc758\ub97c \uc9c0\uc18d\ud558\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      },
      {
        suffix: "handson",
        en: "Learns best through hands-on or visual methods",
        zh: "\u901a\u8fc7\u52a8\u624b\u6216\u89c6\u89c9\u65b9\u5f0f\u5b66\u4e60\u6548\u679c\u6700\u597d",
        ko: "\uc2e4\uc2b5\uc774\ub098 \uc2dc\uac01\uc801 \ubc29\ubc95\uc73c\ub85c \uac00\uc7a5 \uc798 \ubc30\uc6b4\ub2e4",
      },
    ];

    const talents = [
      { id: "art",         en: "Art",          zh: "\u827a\u672f",     ko: "\uc608\uc220" },
      { id: "drama",       en: "Drama",        zh: "\u621f\u5267",     ko: "\uc5f0\uadf9" },
      { id: "music",       en: "Music",        zh: "\u97f3\u4e50",     ko: "\uc74c\uc545" },
      { id: "sports",      en: "Sports",       zh: "\u4f53\u80b2",     ko: "\uc2a4\ud3ec\uce20" },
      { id: "dance",       en: "Dance",        zh: "\u821e\u8e48",     ko: "\ub310\uc2a4" },
      { id: "mechanics",   en: "Mechanics",    zh: "\u673a\u68b0",     ko: "\uae30\uacc4" },
      { id: "story",       en: "Storytelling", zh: "\u6545\u4e8b\u8bb2\u8ff0", ko: "\uc2a4\ud1a0\ub9ac\ud154\ub9c1" },
      { id: "business",    en: "Business",     zh: "\u5546\u4e1a",     ko: "\ube44\uc988\ub2c8\uc2a4" },
      { id: "strategy",    en: "Strategy",     zh: "\u6218\u7565",     ko: "\uc804\ub7b5" },
      { id: "design",      en: "Design",       zh: "\u8bbe\u8ba1",     ko: "\ub514\uc790\uc778" },
      { id: "building",    en: "Building",     zh: "\u5efa\u9020",     ko: "\uac74\ucd95/\ub9cc\ub4e4\uae30" },
      { id: "engineering", en: "Engineering",  zh: "\u5de5\u7a0b",     ko: "\uacf5\ud559" },
    ];

    const talentItems: any[] = [
      {
        id: "dys_b_talents_hdr",
        type: "section_header", domain: "behavior", required: false,
        text: "Talents",
        textChinese: "\u624d\u80fd",
        textKorean: "\uc7ac\ub2a5",
        note: "For each talent area, rate how often the student demonstrates the three learning behaviours below. This helps identify where the student is most and least engaged.",
        noteChinese: "\u5bf9\u4e8e\u4ee5\u4e0b\u6bcf\u4e2a\u624d\u80fd\u9886\u57df\uff0c\u8bc4\u5b9a\u5b66\u751f\u5c55\u793a\u4ee5\u4e0b\u4e09\u79cd\u5b66\u4e60\u884c\u4e3a\u7684\u9891\u7387\u3002\u8fd9\u6709\u52a9\u4e8e\u786e\u5b9a\u5b66\u751f\u53c2\u4e0e\u5ea6\u6700\u9ad8\u548c\u6700\u4f4e\u7684\u9886\u57df\u3002",
        noteKorean: "\uc544\ub798\uc758 \uac01 \uc7ac\ub2a5 \uc601\uc5ed\uc5d0 \ub300\ud574 \ud559\uc0dd\uc774 \uc138 \uac00\uc9c0 \ud559\uc2b5 \ud589\ub3d9\uc744 \uc5bc\ub9c8\ub098 \uc790\uc8fc \ubcf4\uc774\ub294\uc9c0 \ud3c9\uac00\ud558\uc138\uc694. \uc774\ub97c \ud1b5\ud574 \ud559\uc0dd\uc774 \uac00\uc7a5 \ub9ce\uc774 \ucc38\uc5ec\ud558\uace0 \uac00\uc7a5 \uc801\uac8c \ucc38\uc5ec\ud558\ub294 \uc601\uc5ed\uc744 \ud30c\uc545\ud560 \uc218 \uc788\uc2b5\ub2c8\ub2e4.",
        options: o0(), optionsChinese: o0(), optionsKorean: o0(),
      },
      ...talents.flatMap(t => [
        {
          id: `dys_b_${t.id}_hdr`,
          type: "section_header", domain: "behavior", required: false,
          text: t.en, textChinese: t.zh, textKorean: t.ko,
          options: o0(), optionsChinese: o0(), optionsKorean: o0(),
        },
        ...behaviors.map(b => ({
          id: `dys_b_${t.id}_${b.suffix}`,
          type: "likert", domain: "behavior", required: false,
          text: b.en, textChinese: b.zh, textKorean: b.ko,
          options: ABS_EN, optionsChinese: ABS_ZH, optionsKorean: ABS_KO,
        })),
      ]),
    ];

    // Replace the 4 old items (q25 section header + q26/q27/q28 behavior questions)
    const newItems = [
      ...items.slice(0, talentsStart),
      ...talentItems,
      ...items.slice(talentsStart + 4),
    ];

    await db
      .update(assessmentToolsTable)
      .set({ formItems: newItems })
      .where(eq(assessmentToolsTable.id, "DYSRISK"));

    logger.info("Revised DYSRISK Talents section");
  } catch (err) {
    logger.error({ err }, "Failed to revise DYSRISK Talents section");
  }
}

async function reviseLASAForm() {
  try {
    const rows = await db
      .select({ formItems: assessmentToolsTable.formItems })
      .from(assessmentToolsTable)
      .where(eq(assessmentToolsTable.id, "LASA"))
      .limit(1);

    if (!rows.length || !rows[0].formItems) return;
    const items = rows[0].formItems as any[];
    // Idempotency: already revised if second item has descriptive ID AND options are labeled
    if (items[1]?.id === "lasa_child_info" && (items[11] as any)?.options?.[0] === "0 (Never)") return;

    const opts0 = (o: string[]) => o;
    const lk = (id: string, domain: string, en: string, zh: string, ko: string) => ({
      id, type: "likert", domain, required: false,
      text: en, textChinese: zh, textKorean: ko,
      options: ["0 (Never)", "1 (Rarely)", "2 (Sometimes)", "3 (Frequently)", "4 (Always)"],
      optionsChinese: ["0 (\u4ece\u4e0d)", "1 (\u5f88\u5c11)", "2 (\u6709\u65f6)", "3 (\u7ecf\u5e38)", "4 (\u603b\u662f)"],
      optionsKorean: ["0 (\uc804\ud600)", "1 (\ub4dc\ubb3c\uac8c)", "2 (\uac00\ub07c)", "3 (\uc790\uc8fc)", "4 (\ud56d\uc0c1)"],
    });
    const sh = (id: string, domain: string, en: string, zh: string, ko: string, noteEn?: string, noteZh?: string, noteKo?: string) => ({
      id, type: "section_header", domain, required: false,
      text: en, textChinese: zh, textKorean: ko,
      ...(noteEn ? { note: noteEn, noteChinese: noteZh, noteKorean: noteKo } : {}),
      options: opts0([]), optionsChinese: opts0([]), optionsKorean: opts0([]),
    });
    const tf = (id: string, domain: string, en: string, zh: string, ko: string) => ({
      id, type: "text", domain, required: false,
      text: en, textChinese: zh, textKorean: ko,
      options: opts0([]), optionsChinese: opts0([]), optionsKorean: opts0([]),
    });

    const HOW_EN = "How often does the child:";
    const HOW_ZH = "\u8be5\u513f\u7ae5\u591a\u4e45\u51fa\u73b0\u4ee5\u4e0b\u60c5\u51b5\uff1a";
    const HOW_KO = "\uc544\ub3d9\uc774 \ub2e4\uc74c\uc744 \uc5bc\ub9c8\ub098 \uc790\uc8fc \ubcf4\uc785\ub2c8\uae4c:";

    const newItems = [
      sh("lasa_instr", "admin",
        "Learning Ability Screening Assessment (LASA)",
        "\u5b66\u4e60\u80fd\u529b\u7b5b\u67e5\u8bc4\u4f30 (LASA)",
        "\ud559\uc2b5 \ub2a5\ub825 \uc120\ubcc4 \ud3c9\uac00 (LASA)",
        "This assessment screens for potential learning difficulties across six key developmental and academic domains: Reading, Spelling & Writing, Math & Logic, Emotional Regulation, Listening & Language Processing, and Attention & Executive Function. It is completed by a teacher, parent, or professional who knows the child well. This is a screening tool only and does not diagnose a learning disability.\n\nFor each item, rate how often the behaviour has been observed over the past 3\u20136 months.\n\nResponse scale: 0 (Never) \u00b7 1 (Rarely) \u00b7 2 (Sometimes) \u00b7 3 (Frequently) \u00b7 4 (Always)",
        "\u672c\u91cf\u8868\u7528\u4e8e\u7b5b\u67e5\u513f\u7ae5\u5728\u516d\u4e2a\u5173\u952e\u53d1\u5c55\u548c\u5b66\u672f\u9886\u57df\u4e2d\u53ef\u80fd\u5b58\u5728\u7684\u5b66\u4e60\u56f0\u96be\uff1a\u9605\u8bfb\u3001\u62fc\u5199\u4e0e\u4e66\u5199\u3001\u6570\u5b66\u4e0e\u903b\u8f91\u3001\u60c5\u7eea\u8c03\u8282\u3001\u542c\u89c9\u4e0e\u8bed\u8a00\u5904\u7406\uff0c\u4ee5\u53ca\u6ce8\u610f\u529b\u4e0e\u6267\u884c\u529f\u80fd\u3002\u7531\u4e86\u89e3\u8be5\u513f\u7ae5\u7684\u6559\u5e08\u3001\u5bb6\u957f\u6216\u4e13\u4e1a\u4eba\u5458\u586b\u5199\u3002\u672c\u5de5\u5177\u4ec5\u4e3a\u7b5b\u67e5\u5de5\u5177\uff0c\u4e0d\u80fd\u7528\u4e8e\u8bca\u65ad\u5b66\u4e60\u969c\u788d\u3002\n\n\u8bf7\u6839\u636e\u8fc7\u53bb3\u20136\u4e2a\u6708\u5185\u89c2\u5bdf\u5230\u7684\u884c\u4e3a\u9891\u7387\u8fdb\u884c\u8bc4\u5206\u3002\n\n\u56de\u5e94\u9009\u9879\uff1a0\uff08\u4ece\u4e0d\uff09\u00b7 1\uff08\u5f88\u5c11\uff09\u00b7 2\uff08\u6709\u65f6\uff09\u00b7 3\uff08\u7ecf\u5e38\uff09\u00b7 4\uff08\u603b\u662f\uff09",
        "\uc774 \ud3c9\uac00\ub294 6\uac00\uc9c0 \uc8fc\uc694 \ubc1c\ub2ec \ubc0f \ud559\uc2b5 \uc601\uc5ed\uc5d0\uc11c \uc7a0\uc7ac\uc801\uc778 \ud559\uc2b5 \uc5b4\ub824\uc6c0\uc744 \uc120\ubcc4\ud569\ub2c8\ub2e4\uff1a \uc77d\uae30, \uccca\uc790 \ubc0f \uc4f0\uae30, \uc218\ud559 \ubc0f \ub17c\ub9ac, \uc815\uc11c \uc870\uc808, \ub4e3\uae30 \ubc0f \uc5b8\uc5b4 \ucc98\ub9ac, \uc8fc\uc758\ub825 \ubc0f \uc2e4\ud589 \uae30\ub2a5. \uc544\ub3d9\uc744 \uc798 \uc544\ub294 \uad50\uc0ac, \ubd80\ubaa8 \ub610\ub294 \uc804\ubb38\uac00\uac00 \uc791\uc131\ud569\ub2c8\ub2e4. \uc774 \ub3c4\uad6c\ub294 \uc120\ubcc4 \ub3c4\uad6c\ub85c\ub9cc \uc0ac\uc6a9\ub418\uba70 \ud559\uc2b5 \uc7a5\uc560\ub97c \uc9c4\ub2e8\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.\n\n\uac01 \ud56d\ubaa9\uc5d0 \ub300\ud574 \uc9c0\ub09c 3\ub2936\uac1c\uc6d4 \ub3d9\uc548 \uad00\ucc30\ub41c \ud589\ub3d9\uc758 \ube48\ub3c4\ub97c \ud3c9\uac00\ud574 \uc8fc\uc138\uc694.\n\n\uc751\ub2f5 \ucca0\ub3c4: 0 (\uc804\ud600) \u00b7 1 (\ub4dc\ubb3c\uac8c) \u00b7 2 (\uac00\ub07c) \u00b7 3 (\uc790\uc8fc) \u00b7 4 (\ud56d\uc0c1)",
      ),

      sh("lasa_child_info", "admin",
        "Child Information", "\u513f\u7ae5\u4fe1\u606f", "\uc544\ub3d9 \uc815\ubcf4",
      ),
      tf("lasa_child_name", "admin", "Child's Full Name", "\u513f\u7ae5\u59d3\u540d", "\uc544\ub3d9 \uc131\uba85"),
      tf("lasa_child_age", "admin", "Age", "\u5e74\u9f84", "\ub098\uc774"),
      tf("lasa_child_gender", "admin", "Gender", "\u6027\u522b", "\uc131\ubcc4"),
      tf("lasa_child_grade", "admin", "Grade / Year", "\u5e74\u7ea7", "\ud559\ub144"),

      sh("lasa_resp_info", "admin",
        "Respondent Information", "\u53d7\u8bbf\u8005\u4fe1\u606f", "\uc751\ub2f5\uc790 \uc815\ubcf4",
      ),
      tf("lasa_resp_name", "admin", "Your Name", "\u60a8\u7684\u59d3\u540d", "\uc751\ub2f5\uc790 \uc131\uba85"),
      tf("lasa_resp_email", "admin", "Email", "\u7535\u5b50\u90ae\u4ef6", "\uc774\uba54\uc77c"),
      tf("lasa_resp_rel", "admin", "Relationship to Child", "\u4e0e\u513f\u7ae5\u7684\u5173\u7cfb", "\uc544\ub3d9\uacfc\uc758 \uad00\uacc4"),

      sh("lasa_reading_hdr", "reading",
        "Domain A: Reading",
        "\u9886\u57dfA\uff1a\u9605\u8bfb",
        "\uc601\uc5ed A: \uc77d\uae30",
        HOW_EN, HOW_ZH, HOW_KO,
      ),
      lk("lasa_r1", "reading",
        "Mispronounce or incorrectly use certain words",
        "\u9519\u8bef\u53d1\u97f3\u6216\u8bef\u7528\u67d0\u4e9b\u8bcd\u8bed",
        "\ud2b9\uc815 \ub2e8\uc5b4\ub97c \uc798\ubabb \ubc1c\uc74c\ud558\uac70\ub098 \ubd80\uc801\uc808\ud558\uac8c \uc0ac\uc6a9\ud55c\ub2e4",
      ),
      lk("lasa_r2", "reading",
        "Have difficulty reading unfamiliar words or rely on guessing",
        "\u9605\u8bfb\u751f\u8bcd\u65f6\u6709\u56f0\u96be\u6216\u4f9d\u8d56\u731c\u6d4b",
        "\ub099\uc120 \ub2e8\uc5b4\ub97c \uc77d\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\uac70\ub098 \ucd94\uce21\uc5d0 \uc758\uc874\ud55c\ub2e4",
      ),
      lk("lasa_r3", "reading",
        "Pause, repeat, or make errors when reading aloud",
        "\u6717\u8bfb\u65f6\u505c\u987f\u3001\u91cd\u590d\u6216\u51fa\u9519",
        "\uc18c\ub9ac \ub0b4\uc5b4 \uc77d\uc744 \ub54c \uba48\uc8fc\uac70\ub098 \ubc18\ubcf5\ud558\uac70\ub098 \uc2e4\uc218\ud55c\ub2e4",
      ),
      lk("lasa_r4", "reading",
        "Struggle to understand what they have read",
        "\u96be\u4ee5\u7406\u89e3\u6240\u8bfb\u5185\u5bb9",
        "\uc77d\uc740 \ub0b4\uc6a9\uc744 \uc774\ud574\ud558\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),
      lk("lasa_r5", "reading",
        "Avoid reading for pleasure",
        "\u56de\u907f\u4e3a\u4e50\u8da3\u800c\u9605\u8bfb",
        "\uc990\uac70\uc6c0\uc744 \uc704\ud55c \ub3c5\uc11c\ub97c \ud53c\ud55c\ub2e4",
      ),

      sh("lasa_writing_hdr", "writing",
        "Domain B: Spelling & Writing",
        "\u9886\u57dfB\uff1a\u62fc\u5199\u4e0e\u4e66\u5199",
        "\uc601\uc5ed B: \ucca0\uc790 \ubc0f \uc4f0\uae30",
        HOW_EN, HOW_ZH, HOW_KO,
      ),
      lk("lasa_w1", "writing",
        "Make spelling errors in schoolwork",
        "\u5728\u5b66\u6821\u4f5c\u4e1a\u4e2d\u51fa\u73b0\u62fc\u5199\u9519\u8bef",
        "\ud559\uad50 \uacfc\uc81c\uc5d0\uc11c \ucca0\uc790 \uc624\ub958\ub97c \ubc94\ud55c\ub2e4",
      ),
      lk("lasa_w2", "writing",
        "Have messy or unclear handwriting",
        "\u5b57\u8ff9\u6f66\u8349\u6216\u4e0d\u6e05\u6670",
        "\uc9c0\uc800\ubd84\ud558\uac70\ub098 \ubd88\ubd84\uba85\ud55c \ud544\uccb4\ub97c \ubcf4\uc778\ub2e4",
      ),
      lk("lasa_w3", "writing",
        "Struggle with punctuation and capitalization",
        "\u5728\u6807\u70b9\u7b26\u53f7\u548c\u5927\u5c0f\u5199\u4f7f\u7528\u4e0a\u6709\u56f0\u96be",
        "\uad6c\ub450\uc810\uacfc \ub300\ubb38\uc790 \uc0ac\uc6a9\uc5d0 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),
      lk("lasa_w4", "writing",
        "Resist writing tasks",
        "\u6297\u5236\u5199\u4f5c\u4efb\u52a1",
        "\uc4f0\uae30 \uacfc\uc81c\ub97c \uac70\ubd80\ud55c\ub2e4",
      ),
      lk("lasa_w5", "writing",
        "Have difficulty expressing thoughts in writing",
        "\u96be\u4ee5\u7528\u4e66\u9762\u8868\u8fbe\u601d\u60f3",
        "\uc0dd\uac01\uc744 \uae00\ub85c \ud45c\ud604\ud558\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),

      sh("lasa_math_hdr", "math",
        "Domain C: Math & Logic",
        "\u9886\u57dfC\uff1a\u6570\u5b66\u4e0e\u903b\u8f91",
        "\uc601\uc5ed C: \uc218\ud559 \ubc0f \ub17c\ub9ac",
        HOW_EN, HOW_ZH, HOW_KO,
      ),
      lk("lasa_m1", "math",
        "Confuse math symbols or operations (e.g., +, \u2212, \u00d7, \u00f7)",
        "\u6df7\u6de4\u6570\u5b66\u7b26\u53f7\u6216\u8fd0\u7b97\uff08\u5982 +\u3001-\u3001\u00d7\u3001\u00f7\uff09",
        "\uc218\ud559 \uae30\ud638\ub098 \uc5f0\uc0b0\uc744 \ud63c\ub3d9\ud55c\ub2e4 (\uc608: +, -, \u00d7, \u00f7)",
      ),
      lk("lasa_m2", "math",
        "Have difficulty comparing numbers or fractions",
        "\u96be\u4ee5\u6bd4\u8f83\u6570\u5b57\u6216\u5206\u6570",
        "\uc218\ub098 \ubd84\uc218\ub97c \ube44\uad50\ud558\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),
      lk("lasa_m3", "math",
        "Reverse numbers (e.g., 18 \u2192 81)",
        "\u6570\u5b57\u989c\u5012\uff08\u5982 18\u219281\uff09",
        "\uc22b\uc790\ub97c \ubc18\uc804\uc2dc\ud0a8\ub2e4 (\uc608: 18 \u2192 81)",
      ),
      lk("lasa_m4", "math",
        "Struggle with time-related concepts (days, weeks, hours)",
        "\u5728\u65f6\u95f4\u76f8\u5173\u6982\u5ff5\u4e0a\u6709\u56f0\u96be\uff08\u5929\u3001\u5468\u3001\u5c0f\u65f6\uff09",
        "\uc2dc\uac04 \uad00\ub828 \uac1c\ub150\uc744 \uc774\ud574\ud558\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4 (\ub0a0, \uc8fc, \uc2dc\uac04)",
      ),
      lk("lasa_m5", "math",
        "Have difficulty distinguishing facts from fantasy",
        "\u96be\u4ee5\u533a\u5206\u4e8b\u5b9e\u4e0e\u5e7b\u60f3",
        "\uc0ac\uc2e4\uacfc \ud5c8\uad6c\ub97c \uad6c\ubcc4\ud558\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),

      sh("lasa_emotional_hdr", "emotional",
        "Domain D: Emotional Regulation & Self-Control",
        "\u9886\u57dfD\uff1a\u60c5\u7eea\u8c03\u8282\u4e0e\u81ea\u6211\u63a7\u5236",
        "\uc601\uc5ed D: \uc815\uc11c \uc870\uc808 \ubc0f \uc790\uae30 \ud1b5\uc81c",
        HOW_EN, HOW_ZH, HOW_KO,
      ),
      lk("lasa_e1", "emotional",
        "Show anxiety or frustration related to school tasks",
        "\u8868\u73b0\u51fa\u4e0e\u5b66\u6821\u4efb\u52a1\u76f8\u5173\u7684\u7126\u8651\u6216\u632b\u6298\u611f",
        "\ud559\uad50 \uacfc\uc81c\uc640 \uad00\ub828\ub41c \ubd88\uc548\uc774\ub098 \uc88c\uc808\uac10\uc744 \ubcf4\uc778\ub2e4",
      ),
      lk("lasa_e2", "emotional",
        "Tire easily during academic work",
        "\u5728\u5b66\u4e60\u4efb\u52a1\u4e2d\u5bb9\u6613\u75b2\u52b3",
        "\ud559\uc2b5 \ud65c\ub3d9 \uc911 \uc27d\uac8c \ud53c\ub85c\ud574\ud55c\ub2e4",
      ),
      lk("lasa_e3", "emotional",
        "Complain of physical discomfort (e.g., headaches, stomachaches)",
        "\u6291\u6028\u8eab\u4f53\u4e0d\u9002\uff08\u5982\u5934\u75db\u3001\u80c3\u75db\uff09",
        "\uc2e0\uccb4\uc801 \ubd88\ud3b8\ud568\uc744 \ud638\uc18c\ud55c\ub2e4 (\uc608: \ub450\ud1b5, \ubcf5\ud1b5)",
      ),
      lk("lasa_e4", "emotional",
        "Express low self-confidence (e.g., \"I'm not smart\")",
        "\u8868\u8fbe\u4f4e\u81ea\u4fe1\uff08\u4f8b\u5982\uff1a\u300c\u6211\u4e0d\u806a\u660e\u300d\uff09",
        "\ub099\uc740 \uc790\uc2e0\uac10\uc744 \ud45c\ud604\ud55c\ub2e4 (\uc608: \"\ub098\ub294 \ub610\ub98d\ud558\uc9c0 \uc54a\uc544\")",
      ),
      lk("lasa_e5", "emotional",
        "Resist authority (argue or refuse instructions)",
        "\u6297\u5236\u6743\u5a01\uff08\u4e89\u8fa9\u6216\u62d2\u7edd\u6307\ub838\uff09",
        "\uad8c\uc704\uc5d0 \uc800\ud56d\ud55c\ub2e4 (\uc9c0\uc2dc\uc5d0 \ubc18\ubc15\ud558\uac70\ub098 \uac70\ubd80\ud55c\ub2e4)",
      ),

      sh("lasa_listening_hdr", "listening",
        "Domain E: Listening & Language Processing",
        "\u9886\u57dfE\uff1a\u542c\u89c9\u4e0e\u8bed\u8a00\u5904\u7406",
        "\uc601\uc5ed E: \ub4e3\uae30 \ubc0f \uc5b8\uc5b4 \ucc98\ub9ac",
        HOW_EN, HOW_ZH, HOW_KO,
      ),
      lk("lasa_l1", "listening",
        "Struggle to follow verbal instructions (especially without visuals)",
        "\u96be\u4ee5\u9075\u5faa\u53e3\u5934\u6307\u4ee4\uff08\u5c24\u5176\u662f\u6ca1\u6709\u89c6\u89c9\u8f85\u52a9\u65f6\uff09",
        "\uc2dc\uac01 \uc790\ub8cc \uc5c6\uc774 \uad6c\ub450 \uc9c0\uc2dc\ub97c \ub530\ub974\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),
      lk("lasa_l2", "listening",
        "Have difficulty understanding speech in noisy environments",
        "\u5728\u566a\u6742\u73af\u5883\u4e2d\u96be\u4ee5\u7406\u89e3\u8bed\u8a00",
        "\uc2dc\ub044\ub7ec\uc6b4 \ud658\uacbd\uc5d0\uc11c \ub9d0\uc744 \uc774\ud574\ud558\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),
      lk("lasa_l3", "listening",
        "Struggle to understand jokes or stories told aloud",
        "\u96be\u4ee5\u7406\u89e3\u53e3\u5934\u8bb2\u8ff0\u7684\u7b11\u8bdd\u6216\u6545\u4e8b",
        "\uad6c\ub450\ub85c \uc804\ub2ec\ub418\ub294 \ub18d\ub2f4\uc774\ub098 \uc774\uc57c\uae30\ub97c \uc774\ud574\ud558\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),
      lk("lasa_l4", "listening",
        "Have difficulty maintaining or following conversations",
        "\u96be\u4ee5\u7ef4\u6301\u6216\u8ddf\u968f\u5bf9\u8bdd",
        "\ub300\ud654\ub97c \uc774\uc5b4\uac00\uac70\ub098 \ub530\ub77c\uac00\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),
      lk("lasa_l5", "listening",
        "Struggle with academic vocabulary (e.g., science or history terms)",
        "\u5728\u5b66\u672f\u8bcd\u6c47\u65b9\u9762\u6709\u56f0\u96be\uff08\u5982\u79d1\u5b66\u6216\u5386\u53f2\u672f\u8bed\uff09",
        "\ud559\ubb38\uc801 \uc5b4\ud718\uc5d0 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4 (\uc608: \uacfc\ud559 \ub610\ub294 \uc5ed\uc0ac \uc6a9\uc5b4)",
      ),

      sh("lasa_attention_hdr", "attention",
        "Domain F: Attention & Executive Function",
        "\u9886\u57dfF\uff1a\u6ce8\u610f\u529b\u4e0e\u6267\u884c\u529f\u80fd",
        "\uc601\uc5ed F: \uc8fc\uc758\ub825 \ubc0f \uc2e4\ud589 \uae30\ub2a5",
        HOW_EN, HOW_ZH, HOW_KO,
      ),
      lk("lasa_a1", "attention",
        "Have difficulty maintaining attention for more than 15 minutes",
        "\u96be\u4ee5\u4fdd\u615515\u5206\u949f\u4ee5\u4e0a\u7684\u6ce8\u610f\u529b",
        "15\ubd84 \uc774\uc0c1 \uc8fc\uc758\ub97c \uc720\uc9c0\ud558\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),
      lk("lasa_a2", "attention",
        "Take a long time to complete tasks",
        "\u5b8c\u6210\u4efb\u52a1\u9700\u8981\u5f88\u957f\u65f6\u95f4",
        "\uacfc\uc81c\ub97c \uc644\uc131\ud558\ub294 \ub370 \uc624\ub79c \uc2dc\uac04\uc774 \uac78\ub9b0\ub2e4",
      ),
      lk("lasa_a3", "attention",
        "Have difficulty planning or organizing tasks",
        "\u96be\u4ee5\u8ba1\u5212\u6216\u7ec4\u7ec7\u4efb\u52a1",
        "\uacfc\uc81c\ub97c \uacc4\ud68d\ud558\uac70\ub098 \uc815\ub9ac\ud558\ub294 \ub370 \uc5b4\ub824\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),
      lk("lasa_a4", "attention",
        "Frequently lose items or forget important things",
        "\u7ecf\u5e38\u4e22\u5931\u7269\u54c1\u6216\u5fd8\u8bb0\u91cd\u8981\u4e8b\u9879",
        "\uc790\uc8fc \ubb3c\uac74\uc744 \uc78a\uc5b4\ubc84\ub9ac\uac70\ub098 \uc911\uc694\ud55c \uac83\uc744 \uc78a\uc5b4\ubc84\ub9b0\ub2e4",
      ),
      lk("lasa_a5", "attention",
        "Struggle to tolerate boredom or repetitive tasks",
        "\u96be\u4ee5\u5fcd\u53d7\u65e0\u804a\u6216\u91cd\u590d\u6027\u4efb\u52a1",
        "\uc9c0\ub8e8\ud568\uc774\ub098 \ubc18\ubcf5\uc801\uc778 \uacfc\uc81c\ub97c \ucc38\ub294 \ub370 \uc5b4\ub839\uc6c0\uc744 \uacaa\ub294\ub2e4",
      ),

      {
        id: "lasa_comments",
        type: "text",
        domain: "admin",
        required: false,
        text: "Additional Comments",
        textChinese: "\u8865\u5145\u610f\u89c1",
        textKorean: "\ucd94\uac00 \uc758\uacac",
        note: "Please add any additional observations or concerns about this child's learning.",
        noteChinese: "\u8bf7\u8865\u5145\u60a8\u5bf9\u8be5\u513f\u7ae5\u5b66\u4e60\u65b9\u9762\u7684\u5176\u4ed6\u89c2\u5bdf\u6216\u62c5\u5fe7\u3002",
        noteKorean: "\uc774 \uc544\ub3d9\uc758 \ud559\uc2b5\uc5d0 \uad00\ud55c \ucd94\uac00\uc801\uc778 \uad00\ucc30\uc774\ub098 \uc6b0\ub824 \uc0ac\ud56d\uc744 \uae30\uc7ac\ud574 \uc8fc\uc138\uc694.",
        options: opts0([]), optionsChinese: opts0([]), optionsKorean: opts0([]),
      },
    ];

    await db
      .update(assessmentToolsTable)
      .set({ formItems: newItems })
      .where(eq(assessmentToolsTable.id, "LASA"));

    logger.info("Revised LASA form items");
  } catch (err) {
    logger.error({ err }, "Failed to revise LASA form items");
  }
}

async function patchInstructionHeaders() {
  type H = { id: string; text: string; textChinese: string; textKorean: string; note: string; noteChinese: string; noteKorean: string };
  const patches: Record<string, H> = {
    "DASS-Y": {
      id: "dassy_instr",
      text: "Depression Anxiety and Stress Scales – Youth Version (DASS-Y)",
      textChinese: "抑郁焦虑压力量表 — 青少年版 (DASS-Y)",
      textKorean: "우울 불안 스트레스 척도 — 청소년판 (DASS-Y)",
      note: "Below are some statements. Read each one and indicate how often it is true for you during the past 2 weeks.\n\nResponse scale: Not true (0) · A little true (1) · Fairly true (2) · Very true (3)",
      noteChinese: "以下是一些陈述。请阅读每一项，并指出在过去两周内对您来说是否属实。\n\n回应选项：不符合 (0) · 有一点符合 (1) · 相当符合 (2) · 非常符合 (3)",
      noteKorean: "아래는 몇 가지 진술입니다. 지난 2주 동안 자신에게 얼마나 해당하는지 각 항목을 읽고 선택해 주세요.\n\n응답 척도: 해당 없음 (0) · 약간 해당 (1) · 꽤 해당 (2) · 매우 해당 (3)",
    },
    "DASS42": {
      id: "dass42_instr",
      text: "Depression Anxiety Stress Scales – Long Form (DASS-42)",
      textChinese: "抑郁焦虑压力量表 — 完整版 (DASS-42)",
      textKorean: "우울 불안 스트레스 척도 — 전체판 (DASS-42)",
      note: "Please read each statement and indicate how often it applied to you over the past week.\n\nResponse scale: Never (0) · Sometimes (1) · Often (2) · Almost Always (3)",
      noteChinese: "请阅读每项陈述，并指出在过去一周内该陈述对您的适用程度。\n\n回应选项：从不 (0) · 有时 (1) · 经常 (2) · 几乎总是 (3)",
      noteKorean: "지난 일주일 동안 각 항목이 자신에게 얼마나 해당했는지 읽고 선택해 주세요.\n\n응답 척도: 전혀 없음 (0) · 가끔 (1) · 자주 (2) · 거의 항상 (3)",
    },
    "AAQ2": {
      id: "aaq2_instr",
      text: "Acceptance and Action Questionnaire – Version 2 (AAQ-2)",
      textChinese: "接受与行动问卷 — 第二版 (AAQ-2)",
      textKorean: "수용 및 행동 질문지 제2판 (AAQ-2)",
      note: "Below is a list of statements. Please rate how true each statement is for you, from 'Never true' to 'Always true'.\n\nResponse scale: Never true (1) · Very seldom true (2) · Seldom true (3) · Sometimes true (4) · Frequently true (5) · Almost always true (6) · Always true (7)",
      noteChinese: "以下是一组陈述。请评定每项陈述对您的适用程度，从「从不符合」到「总是符合」。\n\n回应选项：从不符合 (1) · 极少符合 (2) · 很少符合 (3) · 有时符合 (4) · 经常符合 (5) · 几乎总是符合 (6) · 总是符合 (7)",
      noteKorean: "아래 항목들이 자신에게 얼마나 해당하는지 '전혀 해당 없음'부터 '항상 해당'까지 평가해 주세요.\n\n응답 척도: 전혀 해당 없음 (1) · 거의 해당 없음 (2) · 드물게 해당 (3) · 때때로 해당 (4) · 자주 해당 (5) · 거의 항상 해당 (6) · 항상 해당 (7)",
    },
    "AQ": {
      id: "aq_instr",
      text: "Autism Spectrum Quotient (AQ)",
      textChinese: "自闭症谱系商数 (AQ)",
      textKorean: "자폐 스펙트럼 지수 (AQ)",
      note: "For each statement below, please indicate how strongly you agree or disagree. There are no right or wrong answers.\n\nResponse scale: Definitely Agree · Slightly Agree · Slightly Disagree · Definitely Disagree",
      noteChinese: "请对以下每项陈述表明您的同意或不同意程度。没有正确或错误的答案。\n\n回应选项：非常同意 · 稍微同意 · 稍微不同意 · 非常不同意",
      noteKorean: "아래 각 항목에 대해 얼마나 동의하거나 동의하지 않는지 표시해 주세요. 정답이나 오답은 없습니다.\n\n응답 척도: 매우 동의 · 약간 동의 · 약간 불동의 · 매우 불동의",
    },
    "ASSQ": {
      id: "assq_instr",
      text: "Autism Spectrum Screening Questionnaire (ASSQ)",
      textChinese: "自闭症谱系筛查问卷 (ASSQ)",
      textKorean: "자폐 스펙트럼 선별 질문지 (ASSQ)",
      note: "This form is completed by a parent or teacher who knows the child well. For each item, rate the child's behaviour based on your observations.\n\nResponse scale: No (0) · Somewhat (1) · Yes (2)",
      noteChinese: "本量表由了解该儿童的家长或教师填写。请根据您的观察，对每项内容评定该儿童的行为表现。\n\n回应选项：否 (0) · 有一些 (1) · 是 (2)",
      noteKorean: "이 양식은 아동을 잘 아는 부모 또는 교사가 작성합니다. 관찰을 바탕으로 각 항목에 대해 아동의 행동을 평가해 주세요.\n\n응답 척도: 아니오 (0) · 다소 (1) · 예 (2)",
    },
    "BRIEFCOPE": {
      id: "briefcope_instr",
      text: "Brief Coping Orientation to Problems Experienced (Brief COPE)",
      textChinese: "简易应对方式问卷 (Brief COPE)",
      textKorean: "스트레스 대처 방식 간이 척도 (Brief COPE)",
      note: "The following questions ask about how you have been dealing with stress or a difficult situation. For each item, indicate to what extent you have been doing it.\n\nResponse scale: 1 – I haven't been doing this at all · 2 – A little bit · 3 – A medium amount · 4 – I've been doing this a lot",
      noteChinese: "以下问题询问您如何应对压力或困难情况。请指出您在多大程度上采取了以下行为。\n\n回应选项：1 — 完全没有这样做 · 2 — 做了一点 · 3 — 做了适度的量 · 4 — 经常这样做",
      noteKorean: "아래 항목들은 스트레스나 어려운 상황에 어떻게 대처하는지에 관한 것입니다. 각 항목을 어느 정도 하고 있는지 표시해 주세요.\n\n응답 척도: 1 — 전혀 하지 않음 · 2 — 조금 함 · 3 — 중간 정도 함 · 4 — 많이 함",
    },
    "CAT-Q": {
      id: "catq_instr",
      text: "Camouflaging Autistic Traits Questionnaire (CAT-Q)",
      textChinese: "自闭症特质掩饰问卷 (CAT-Q)",
      textKorean: "자폐적 특성 위장 질문지 (CAT-Q)",
      note: "Below are statements about behaviours and strategies that some people use in social situations. Please rate how true each statement is for you.\n\nResponse scale: Strongly Disagree (1) · Disagree (2) · Somewhat Disagree (3) · Neither Agree nor Disagree (4) · Somewhat Agree (5) · Agree (6) · Strongly Agree (7)",
      noteChinese: "以下是关于一些人在社交情境中使用的行为和策略的陈述。请评定每项陈述对您的适用程度。\n\n回应选项：强烈不同意 (1) · 不同意 (2) · 有些不同意 (3) · 中立 (4) · 有些同意 (5) · 同意 (6) · 强烈同意 (7)",
      noteKorean: "아래는 일부 사람들이 사회적 상황에서 사용하는 행동과 전략에 관한 진술입니다. 각 진술이 자신에게 얼마나 해당하는지 평가해 주세요.\n\n응답 척도: 매우 불동의 (1) · 불동의 (2) · 약간 불동의 (3) · 중립 (4) · 약간 동의 (5) · 동의 (6) · 매우 동의 (7)",
    },
    "CFI": {
      id: "cfi_instr",
      text: "Cognitive Flexibility Inventory (CFI)",
      textChinese: "认知灵活性量表 (CFI)",
      textKorean: "인지 유연성 척도 (CFI)",
      note: "Below are a series of statements about how you think and feel. Please indicate how much you agree or disagree with each statement.\n\nResponse scale: Strongly disagree (1) · Disagree (2) · Somewhat disagree (3) · Neutral (4) · Somewhat agree (5) · Agree (6) · Strongly agree (7)",
      noteChinese: "以下是关于您思考和感受方式的一组陈述。请表明您对每项陈述的同意或不同意程度。\n\n回应选项：强烈不同意 (1) · 不同意 (2) · 有些不同意 (3) · 中立 (4) · 有些同意 (5) · 同意 (6) · 强烈同意 (7)",
      noteKorean: "아래는 자신이 생각하고 느끼는 방식에 관한 일련의 진술입니다. 각 진술에 얼마나 동의하거나 불동의하는지 표시해 주세요.\n\n응답 척도: 매우 불동의 (1) · 불동의 (2) · 약간 불동의 (3) · 중립 (4) · 약간 동의 (5) · 동의 (6) · 매우 동의 (7)",
    },
    "DERS": {
      id: "ders_instr",
      text: "Difficulties in Emotion Regulation Scale (DERS)",
      textChinese: "情绪调节困难量表 (DERS)",
      textKorean: "정서 조절 곤란 척도 (DERS)",
      note: "Please indicate how often the following statements apply to you.\n\nResponse scale: Almost Never (1) · Sometimes (2) · About half the time (3) · Most of the time (4) · Almost always (5)",
      noteChinese: "请指出以下陈述在多大程度上适用于您。\n\n回应选项：几乎从不 (1) · 有时 (2) · 约半数时间 (3) · 大多数时间 (4) · 几乎总是 (5)",
      noteKorean: "아래 진술이 자신에게 얼마나 자주 해당하는지 표시해 주세요.\n\n응답 척도: 거의 없음 (1) · 가끔 (2) · 절반 정도 (3) · 대부분의 경우 (4) · 거의 항상 (5)",
    },
    "PSWQ": {
      id: "pswq_instr",
      text: "Penn State Worry Questionnaire (PSWQ)",
      textChinese: "宾夕法尼亚州担忧问卷 (PSWQ)",
      textKorean: "걱정 질문지 (PSWQ)",
      note: "Please indicate to what degree each of the following statements is typical for you.\n\nResponse scale: Not at all typical (1) · Rarely typical of me (2) · Somewhat typical of me (3) · Often typical of me (4) · Very typical of me (5)",
      noteChinese: "请指出以下每项陈述在多大程度上是您的典型表现。\n\n回应选项：完全不是 (1) · 很少如此 (2) · 有时如此 (3) · 经常如此 (4) · 非常符合 (5)",
      noteKorean: "아래 각 진술이 자신에게 어느 정도 해당하는지 표시해 주세요.\n\n응답 척도: 전혀 해당 없음 (1) · 거의 해당 없음 (2) · 약간 해당 (3) · 자주 해당 (4) · 매우 해당 (5)",
    },
    "ZUNG": {
      id: "zung_instr",
      text: "Zung Self-Rating Depression Scale",
      textChinese: "抑郁自评量表 (Zung SDS)",
      textKorean: "Zung 우울 자기평가 척도",
      note: "Below are statements about how you have been feeling recently. Please rate how often each statement applies to you.\n\nResponse scale: A little of the time (1) · Some of the time (2) · Good part of the time (3) · Most of the time (4)",
      noteChinese: "以下是关于您近期感受的陈述。请评定每项陈述对您的适用频率。\n\n回应选项：偶尔 (1) · 有时 (2) · 大部分时间 (3) · 绝大部分时间 (4)",
      noteKorean: "아래는 최근의 기분에 관한 진술입니다. 각 진술이 자신에게 얼마나 자주 해당하는지 평가해 주세요.\n\n응답 척도: 가끔 (1) · 어느 정도 (2) · 상당 부분 (3) · 대부분의 경우 (4)",
    },
    "EAT26": {
      id: "eat26_instr",
      text: "Eating Attitudes Test-26 (EAT-26)",
      textChinese: "饮食态度测验 (EAT-26)",
      textKorean: "식이 태도 검사 (EAT-26)",
      note: "Below are statements about eating, food, and your body. Please indicate how often each statement applies to you over the past month.\n\nResponse scale: Always · Usually · Often · Sometimes · Rarely · Never",
      noteChinese: "以下是关于饮食、食物和身体的陈述。请指出在过去一个月内，每项陈述对您的适用频率。\n\n回应选项：总是 · 通常 · 经常 · 有时 · 很少 · 从不",
      noteKorean: "아래는 식사, 음식, 신체에 관한 진술입니다. 지난 한 달 동안 각 진술이 자신에게 얼마나 자주 해당하는지 표시해 주세요.\n\n응답 척도: 항상 · 보통 · 자주 · 가끔 · 드물게 · 전혀",
    },
    "ASRS": {
      id: "asrs_instr",
      text: "Adult ADHD Self-Report Scale v1.1 (ASRS-v1.1)",
      textChinese: "成人注意缺陷多动障碍自评量表 v1.1 (ASRS-v1.1)",
      textKorean: "성인 ADHD 자기보고 척도 v1.1 (ASRS-v1.1)",
      note: "For each item, please indicate how often you have experienced each symptom over the past 6 months.\n\nResponse scale: Never · Rarely · Sometimes · Often · Very Often",
      noteChinese: "请指出在过去6个月内，您经历以下每种症状的频率。\n\n回应选项：从不 · 很少 · 有时 · 经常 · 非常频繁",
      noteKorean: "지난 6개월 동안 각 증상을 얼마나 자주 경험했는지 표시해 주세요.\n\n응답 척도: 전혀 없음 · 드물게 · 가끔 · 자주 · 매우 자주",
    },
    "SESQ": {
      id: "sesq_instr",
      text: "Social-Emotional Screening Questionnaire (SESQ)",
      textChinese: "社会情感筛查问卷 (SESQ)",
      textKorean: "사회정서 선별 질문지 (SESQ)",
      note: "This questionnaire is used to identify early signs of delays in social-emotional development. For each item, indicate whether the described behaviour is typical of this child.\n\nResponse scale: Yes · No",
      noteChinese: "本问卷用于识别社会情感发展迟缓的早期迹象。请对每个项目指出所描述的行为是否是该儿童的典型表现。\n\n回应选项：是 · 否",
      noteKorean: "이 질문지는 사회정서 발달 지연의 초기 징후를 파악하기 위한 것입니다. 각 항목에 대해 설명된 행동이 이 아동에게 전형적인지 표시해 주세요.\n\n응답 척도: 예 · 아니오",
    },
    "SNAPIV26": {
      id: "snapiv26_instr",
      text: "SNAP-IV 26 – Teacher & Parent Rating Scale",
      textChinese: "SNAP-IV 26 — 教师和家长评定量表",
      textKorean: "SNAP-IV 26 — 교사 및 부모 평정 척도",
      note: "This scale is completed by a parent or teacher. For each item, rate how often the described behaviour has been present over the past month.\n\nResponse scale: Not at all (0) · Just a little (1) · Pretty much (2) · Very much (3)",
      noteChinese: "本量表由家长或教师填写。请评定在过去一个月内所描述的行为出现的频率。\n\n回应选项：完全没有 (0) · 有一点 (1) · 相当多 (2) · 非常多 (3)",
      noteKorean: "이 척도는 부모 또는 교사가 작성합니다. 지난 한 달 동안 설명된 행동이 얼마나 자주 나타났는지 평가해 주세요.\n\n응답 척도: 전혀 없음 (0) · 약간 (1) · 꽤 많이 (2) · 매우 많이 (3)",
    },
    "SEDQ": {
      id: "sedq_instr",
      text: "Social-Emotional Development Questionnaire (SEDQ)",
      textChinese: "社会情感发展问卷 (SEDQ)",
      textKorean: "사회정서 발달 질문지 (SEDQ)",
      note: "This questionnaire assesses social and emotional development milestones. For each item, indicate whether the described behaviour is currently typical of this child.\n\nResponse scale: Yes · No",
      noteChinese: "本问卷评估社会情感发展里程碑。请对每个项目指出所描述的行为目前是否是该儿童的典型表现。\n\n回应选项：是 · 否",
      noteKorean: "이 질문지는 사회정서 발달 이정표를 평가합니다. 각 항목에 대해 설명된 행동이 현재 이 아동에게 전형적인지 표시해 주세요.\n\n응답 척도: 예 · 아니오",
    },
    "LASA": {
      id: "lasa_instr",
      text: "Learning Ability Screening Assessment (LASA)",
      textChinese: "学习能力筛查评估 (LASA)",
      textKorean: "학습 능력 선별 평가 (LASA)",
      note: "This screening tool is completed by a teacher or school professional who knows the child well. For each item, rate how often the described behaviour or difficulty is observed.\n\nResponse scale: 0 (Never) · 1 (Rarely) · 2 (Sometimes) · 3 (Often) · 4 (Very Often)",
      noteChinese: "本筛查工具由了解该儿童的教师或学校专业人员填写。请评定每项所描述的行为或困难被观察到的频率。\n\n回应选项：0（从不）· 1（很少）· 2（有时）· 3（经常）· 4（非常频繁）",
      noteKorean: "이 선별 도구는 아동을 잘 아는 교사 또는 학교 전문가가 작성합니다. 각 항목에 설명된 행동이나 어려움이 관찰되는 빈도를 평가해 주세요.\n\n응답 척도: 0 (전혀) · 1 (드물게) · 2 (가끔) · 3 (자주) · 4 (매우 자주)",
    },
    "ASRS-SE": {
      id: "asrsse_instr",
      text: "Autism Spectrum Rating Scale (ASRS – 6–18) Structured Screening Edition",
      textChinese: "自闭症谱系评定量表 (ASRS – 6–18) 结构化筛查版",
      textKorean: "자폐 스펙트럼 평정 척도 (ASRS – 6–18) 구조화 선별판",
      note: "This structured screening is completed by a parent or teacher who knows the child well. For each item, rate how frequently the described behaviour is observed in this child.\n\nResponse options vary by section — please follow the specific instructions provided for each part of the form.",
      noteChinese: "本结构化筛查由了解该儿童的家长或教师填写。请评定每项所描述行为被观察到的频率。\n\n各部分回应选项有所不同，请遵循表格每个部分的具体说明。",
      noteKorean: "이 구조화 선별 검사는 아동을 잘 아는 부모 또는 교사가 작성합니다. 각 항목에 설명된 행동이 이 아동에게 얼마나 자주 관찰되는지 평가해 주세요.\n\n섹션마다 응답 방식이 다를 수 있으니 각 파트의 안내를 따라 주세요.",
    },
    "HIQ": {
      id: "hiq_instr",
      text: "Hyperacusis Impact Questionnaire (HIQ)",
      textChinese: "听觉过敏影响问卷 (HIQ)",
      textKorean: "청각 과민증 영향 질문지 (HIQ)",
      note: "This questionnaire assesses sensitivity to sound (hyperacusis) and its impact on daily functioning, emotional well-being, and social participation. It may be completed by the individual, a parent, or a clinician.",
      noteChinese: "本问卷评估对声音的敏感性（听觉过敏）及其对日常功能、情绪健康和社会参与的影响。可由个人、家长或临床医生填写。",
      noteKorean: "이 질문지는 소리에 대한 민감성(청각 과민증)과 그것이 일상 기능, 정서적 건강, 사회적 참여에 미치는 영향을 평가합니다. 개인, 부모 또는 임상가가 작성할 수 있습니다.",
    },
    "DYSRISK": {
      id: "dysrisk_instr",
      text: "Dyslexia Screening Tool",
      textChinese: "阅读障碍筛查工具",
      textKorean: "난독증 선별 도구",
      note: "This screening tool is completed by a teacher or professional who knows the student well. For each item, indicate whether the described characteristic applies to this student.\n\nResponse scale: Yes · Sometimes · No · Unknown",
      noteChinese: "本筛查工具由了解该学生的教师或专业人员填写。请对每个项目指出所描述的特征是否适用于该学生。\n\n回应选项：是 · 有时 · 否 · 未知",
      noteKorean: "이 선별 도구는 학생을 잘 아는 교사 또는 전문가가 작성합니다. 각 항목에 설명된 특성이 이 학생에게 해당하는지 표시해 주세요.\n\n응답 척도: 예 · 가끔 · 아니오 · 알 수 없음",
    },
    "Y-BOCS-SC": {
      id: "ybocs_instr",
      text: "Y-BOCS Symptom Checklist (Y-BOCS-SC)",
      textChinese: "耶鲁-布朗强迫症量表症状清单 (Y-BOCS-SC)",
      textKorean: "예일-브라운 강박 척도 증상 체크리스트 (Y-BOCS-SC)",
      note: "This is a clinician-rated checklist of obsessive-compulsive symptoms. Ensure the patient understands the difference between obsessions and compulsions. For each symptom, indicate whether it has been experienced in the current week or in the past.\n\nResponse scale: Current (experienced in the past 7 days) · Past (experienced previously but not currently)",
      noteChinese: "这是一份由临床医生评定的强迫症症状清单。请确保患者了解强迫思维与强迫行为的区别。对于每种症状，请指出其是否在当前一周内出现或曾经出现。\n\n回应选项：当前（过去7天内经历）· 过去（以前经历过但目前没有）",
      noteKorean: "이것은 임상가가 평가하는 강박 증상 체크리스트입니다. 환자가 강박 사고와 강박 행동의 차이를 이해하는지 확인하세요. 각 증상에 대해 현재 경험하고 있는지 또는 과거에 경험한 적이 있는지 표시해 주세요.\n\n응답 척도: 현재 (지난 7일 이내 경험) · 과거 (이전에 경험했으나 현재는 없음)",
    },
    "PSITER": {
      id: "psiter_instr",
      text: "Primary Screening Instrument for Targeting Educational Risk (PSITER)",
      textChinese: "教育风险初级筛查工具 (PSITER)",
      textKorean: "교육 위험 1차 선별 도구 (PSITER)",
      note: "This instrument is completed by the class teacher based on their observations of the student. For each item, select the response that best describes the student's typical performance or behaviour.",
      noteChinese: "本工具由班级教师根据对学生的观察填写。对于每个项目，请选择最能描述学生典型表现或行为的回应。",
      noteKorean: "이 도구는 학생에 대한 관찰을 바탕으로 담임 교사가 작성합니다. 각 항목에 대해 학생의 전형적인 수행이나 행동을 가장 잘 설명하는 응답을 선택해 주세요.",
    },
    "SSTIER": {
      id: "sstier_instr",
      text: "Secondary Screening Instrument for Targeting Educational Risk (SSTIER)",
      textChinese: "教育风险二级筛查工具 (SSTIER)",
      textKorean: "교육 위험 2차 선별 도구 (SSTIER)",
      note: "This instrument is completed by the class teacher based on their observations of the student. For each item, select the response that best describes the student's typical performance or behaviour.",
      noteChinese: "本工具由班级教师根据对学生的观察填写。对于每个项目，请选择最能描述学生典型表现或行为的回应。",
      noteKorean: "이 도구는 학생에 대한 관찰을 바탕으로 담임 교사가 작성합니다. 각 항목에 대해 학생의 전형적인 수행이나 행동을 가장 잘 설명하는 응답을 선택해 주세요.",
    },
    "FASM": {
      id: "fasm_instr",
      text: "Functional Assessment of Self-Mutilation (FASM)",
      textChinese: "自伤行为功能评估 (FASM)",
      textKorean: "자해 행동 기능 평가 (FASM)",
      note: "This questionnaire asks about experiences of self-harm. All responses are confidential. Please answer honestly based on your own experiences.\n\nResponse scale: Never · 1 time · 2–4 times · 5–10 times · 11+ times",
      noteChinese: "本问卷询问有关自伤经历的问题。所有回答均保密。请根据您自己的经历如实回答。\n\n回应选项：从未 · 1次 · 2-4次 · 5-10次 · 11次以上",
      noteKorean: "이 질문지는 자해 경험에 관한 내용입니다. 모든 응답은 기밀로 유지됩니다. 자신의 경험을 바탕으로 솔직하게 답변해 주세요.\n\n응답 척도: 전혀 없음 · 1번 · 2-4번 · 5-10번 · 11번 이상",
    },
    "REFERRAL": {
      id: "referral_instr",
      text: "ReMynd Student Referral Form",
      textChinese: "ReMynd 学生转介表",
      textKorean: "ReMynd 학생 의뢰서",
      note: "Please complete all sections of this form to refer a student for a ReMynd psychoeducational assessment. All information provided will be kept strictly confidential.",
      noteChinese: "请填写本表格的所有部分，以转介学生进行 ReMynd 心理教育评估。所提供的所有信息将严格保密。",
      noteKorean: "이 양식의 모든 항목을 작성하여 학생을 ReMynd 심리교육 평가에 의뢰해 주세요. 제공된 모든 정보는 엄격히 기밀로 유지됩니다.",
    },
  };

  for (const [toolId, h] of Object.entries(patches)) {
    try {
      const rows = await db
        .select({ formItems: assessmentToolsTable.formItems })
        .from(assessmentToolsTable)
        .where(eq(assessmentToolsTable.id, toolId))
        .limit(1);

      if (!rows.length || !rows[0].formItems) continue;

      const items = rows[0].formItems as any[];
      if (items[0]?.id === h.id) continue; // already patched

      const instrItem = {
        id: h.id, text: h.text, textChinese: h.textChinese, textKorean: h.textKorean,
        type: "section_header", domain: "admin", required: false,
        options: [], optionsChinese: [], optionsKorean: [],
        note: h.note, noteChinese: h.noteChinese, noteKorean: h.noteKorean,
      };

      await db
        .update(assessmentToolsTable)
        .set({ formItems: [instrItem, ...items] })
        .where(eq(assessmentToolsTable.id, toolId));

      logger.info({ toolId }, "Patched instruction header");
    } catch (err) {
      logger.error({ err, toolId }, "Failed to patch instruction header");
    }
  }

  // Upgrade legacy section_headers that have instructions in `text` only (no `note`, no form name)
  const upgrades: Record<string, {
    id: string;
    text: string; textChinese: string; textKorean: string;
    note: string; noteChinese: string; noteKorean: string;
  }> = {
    "AUDIT": {
      id: "audit_instr",
      text: "Alcohol Use Disorders Identification Test (AUDIT)",
      textChinese: "酒精使用障碍识别测试 (AUDIT)",
      textKorean: "알코올 사용 장애 식별 검사 (AUDIT)",
      note: "Because alcohol use can affect your health and can interfere with certain medications and treatments, it is important that we ask some questions about your use of alcohol. Your answers will remain confidential. Please select the response that best describes your answer to each question.\n\nResponse scale: 0 · 1 · 2 · 3 · 4 (varies by question)",
      noteChinese: "由于饮酒会影响您的健康并干扰某些药物和治疗，因此询问您的饮酒情况非常重要。您的回答将保密。请选择最能描述您对每个问题答案的选项。\n\n回应选项：0 · 1 · 2 · 3 · 4（因题而异）",
      noteKorean: "음주는 건강에 영향을 미치고 특정 약물 및 치료를 방해할 수 있으므로 음주에 관한 몇 가지 질문을 드리는 것이 중요합니다. 귀하의 답변은 기밀로 유지됩니다. 각 질문에 대한 답변을 가장 잘 설명하는 항목을 선택하십시오.\n\n응답 척도: 0 · 1 · 2 · 3 · 4 (질문마다 다름)",
    },
    "CABS": {
      id: "cabs_instr",
      text: "Child/Adolescent Bullying Scale (CABS)",
      textChinese: "儿童/青少年欺凌量表 (CABS)",
      textKorean: "아동/청소년 괴롭힘 척도 (CABS)",
      note: "The following questions ask about things that may have happened to you or things you may have done at school or online during the past month. Please answer honestly.\n\nResponse scale: Never · Once or Twice · 2–3 Times a Month · About Once a Week · Several Times a Week",
      noteChinese: "以下问题询问过去一个月内可能在学校或网络上发生在您身上的事情，或您可能做过的事情。请诚实作答。\n\n回应选项：从未 · 一两次 · 每月2-3次 · 大约每周一次 · 每周几次",
      noteKorean: "다음 질문은 지난 한 달 동안 학교나 온라인에서 귀하에게 일어났거나 귀하가 했을 수 있는 일들에 관한 것입니다. 솔직하게 답해 주십시오.\n\n응답 척도: 전혀 없음 · 1-2번 · 한 달에 2-3번 · 약 주 1회 · 주 여러 번",
    },
    "DASS-21": {
      id: "dass_instr",
      text: "Depression Anxiety Stress Scale – 21 Item (DASS-21)",
      textChinese: "抑郁焦虑压力量表 — 21项版本 (DASS-21)",
      textKorean: "우울 불안 스트레스 척도 – 21문항 (DASS-21)",
      note: "Please read each statement and select a number 0, 1, 2 or 3 which indicates how much the statement applied to you over the past week.\n\nResponse scale: 0 (Did not apply to me at all) · 1 (Applied to me to some degree) · 2 (Applied to me to a considerable degree) · 3 (Applied to me very much or most of the time)",
      noteChinese: "请阅读每一陈述，并选择0、1、2或3中的一个数字，表示该陈述在过去一周内适用于您的程度。\n\n回应选项：0（完全不适用）· 1（有时适用）· 2（相当适用）· 3（非常适用或大部分时间适用）",
      noteKorean: "각 항목을 읽고 지난 일주일 동안 그 내용이 자신에게 얼마나 해당되었는지 0, 1, 2, 3 중 하나를 선택하십시오.\n\n응답 척도: 0 (전혀 해당 없음) · 1 (어느 정도 해당) · 2 (상당히 해당) · 3 (매우 많이 또는 대부분의 시간 해당)",
    },
    "GAD-7": {
      id: "gad7_instr",
      text: "Generalized Anxiety Disorder Scale – 7 Item (GAD-7)",
      textChinese: "广泛性焦虑障碍量表 — 7项版本 (GAD-7)",
      textKorean: "범불안 장애 척도 – 7문항 (GAD-7)",
      note: "Over the last 2 weeks, how often have you been bothered by the following problems?\n\nResponse scale: Not at all · Several days · More than half the days · Nearly every day",
      noteChinese: "在过去两周内，您受到以下问题困扰的频率如何？\n\n回应选项：从不 · 几天 · 超过一半的天数 · 几乎每天",
      noteKorean: "지난 2주 동안 다음과 같은 문제들로 얼마나 자주 괴로움을 겪었습니까?\n\n응답 척도: 전혀 없음 · 며칠 · 절반 이상의 날 · 거의 매일",
    },
    "GHQ-12": {
      id: "ghq_instr",
      text: "General Health Questionnaire – 12 Item (GHQ-12)",
      textChinese: "一般健康问卷 — 12项版本 (GHQ-12)",
      textKorean: "일반 건강 질문지 – 12문항 (GHQ-12)",
      note: "Over the past few weeks, have you been able to…\n\nResponse scale: Better than usual · Same as usual · Less than usual · Much less than usual (or similar 4-point scale varying by item)",
      noteChinese: "在过去几周内，您是否能够……\n\n回应选项：比平时更好 · 和平时一样 · 比平时差 · 比平时差很多（各题选项有所不同）",
      noteKorean: "지난 몇 주 동안, 당신은 다음을 할 수 있었습니까?\n\n응답 척도: 평소보다 더 잘됨 · 평소와 같음 · 평소보다 못함 · 평소보다 훨씬 못함 (항목에 따라 다름)",
    },
    "PHQ-9": {
      id: "phq9_instr",
      text: "Patient Health Questionnaire – 9 Item (PHQ-9)",
      textChinese: "患者健康问卷 — 9项版本 (PHQ-9)",
      textKorean: "환자 건강 설문지 – 9문항 (PHQ-9)",
      note: "Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\nResponse scale: Not at all · Several days · More than half the days · Nearly every day",
      noteChinese: "在过去两周内，您受到以下任何问题困扰的频率如何？\n\n回应选项：从不 · 几天 · 超过一半的天数 · 几乎每天",
      noteKorean: "지난 2주 동안 다음과 같은 문제들로 얼마나 자주 괴로움을 겪었습니까?\n\n응답 척도: 전혀 없음 · 며칠 · 절반 이상의 날 · 거의 매일",
    },
    "PHQ-9A": {
      id: "phq9a_instr",
      text: "Patient Health Questionnaire for Adolescents (PHQ-9A)",
      textChinese: "青少年患者健康问卷 (PHQ-9A)",
      textKorean: "청소년용 환자 건강 설문지 (PHQ-9A)",
      note: "Over the last 2 weeks, how often have you been bothered by any of the following problems?\n\nResponse scale: Not at all · Several days · More than half the days · Nearly every day",
      noteChinese: "在过去两周内，您受到以下任何问题困扰的频率如何？\n\n回应选项：从不 · 几天 · 超过一半的天数 · 几乎每天",
      noteKorean: "지난 2주 동안 다음과 같은 문제들로 얼마나 자주 괴로움을 겪었습니까?\n\n응답 척도: 전혀 없음 · 며칠 · 절반 이상의 날 · 거의 매일",
    },
    "PSC": {
      id: "psc_instr",
      text: "Pediatric Symptom Checklist – 35 Item (PSC-35)",
      textChinese: "儿科症状清单 — 35项版本 (PSC-35)",
      textKorean: "소아 증상 체크리스트 – 35문항 (PSC-35)",
      note: "Please mark under the heading that best fits your child.\n\nResponse scale: Never · Sometimes · Often",
      noteChinese: "请在最符合您孩子情况的选项下打勾。\n\n回应选项：从不 · 有时 · 经常",
      noteKorean: "자녀에게 가장 잘 맞는 항목에 표시하십시오.\n\n응답 척도: 전혀 없음 · 가끔 · 자주",
    },
    "PSS-10": {
      id: "pss_instr",
      text: "Perceived Stress Scale – 10 Item (PSS-10)",
      textChinese: "感知压力量表 — 10项版本 (PSS-10)",
      textKorean: "지각된 스트레스 척도 – 10문항 (PSS-10)",
      note: "The questions in this scale ask you about your feelings and thoughts during the last month. In each case, please indicate how often you felt or thought a certain way.\n\nResponse scale: Never · Almost Never · Sometimes · Fairly Often · Very Often",
      noteChinese: "本量表中的问题询问您上个月的感受和想法。对于每个问题，请指出您有某种感受或想法的频率。\n\n回应选项：从不 · 几乎从不 · 有时 · 相当频繁 · 非常频繁",
      noteKorean: "이 척도의 질문은 지난 한 달 동안의 감정과 생각에 관한 것입니다. 각 항목에 대해 얼마나 자주 그런 감정이나 생각이 들었는지 표시하십시오.\n\n응답 척도: 전혀 없음 · 거의 없음 · 가끔 · 꽤 자주 · 매우 자주",
    },
    "RSES": {
      id: "rses_instr",
      text: "Rosenberg Self-Esteem Scale (RSES)",
      textChinese: "罗森伯格自尊量表 (RSES)",
      textKorean: "로젠버그 자아존중감 척도 (RSES)",
      note: "Below is a list of statements dealing with your general feelings about yourself. Please indicate how strongly you agree or disagree with each statement.\n\nResponse scale: Strongly Agree · Agree · Disagree · Strongly Disagree",
      noteChinese: "以下是一些关于您对自己总体感受的陈述。请说明您对每个陈述的同意程度。\n\n回应选项：非常同意 · 同意 · 不同意 · 非常不同意",
      noteKorean: "아래는 자신에 대한 일반적인 감정에 관한 진술들입니다. 각 진술에 얼마나 동의하는지 표시하십시오.\n\n응답 척도: 매우 동의 · 동의 · 동의하지 않음 · 매우 동의하지 않음",
    },
    "SMFQ": {
      id: "smfq_instr",
      text: "Short Mood and Feelings Questionnaire (SMFQ)",
      textChinese: "简短情绪与感受问卷 (SMFQ)",
      textKorean: "간편 기분 및 감정 질문지 (SMFQ)",
      note: "This questionnaire is about how you have been feeling or acting recently. For each question, please check the response that is closest to how you have been feeling or acting in the past two weeks.\n\nResponse scale: True · Sometimes · Not True",
      noteChinese: "这份问卷是关于您最近的感受或行为。对于每个问题，请勾选在过去两周内最接近您感受或行为的答案。\n\n回应选项：符合 · 有时符合 · 不符合",
      noteKorean: "이 설문지는 최근 기분이나 행동에 관한 것입니다. 각 질문에 대해 지난 2주 동안 느끼거나 행동한 것과 가장 가까운 답변을 선택하십시오.\n\n응답 척도: 그렇다 · 가끔 그렇다 · 그렇지 않다",
    },
    "WHO-5": {
      id: "who5_instr",
      text: "World Health Organization Well-Being Index (WHO-5)",
      textChinese: "世界卫生组织幸福感指数 (WHO-5)",
      textKorean: "세계보건기구 웰빙 지수 (WHO-5)",
      note: "Please indicate for each of the following statements which is closest to how you have been feeling over the last two weeks.\n\nResponse scale: All of the time · Most of the time · More than half the time · Less than half the time · Some of the time · At no time",
      noteChinese: "对于以下每一项陈述，请选出最接近您过去两周感受的选项。\n\n回应选项：所有时间 · 大部分时间 · 超过一半的时间 · 不到一半的时间 · 有时 · 从未",
      noteKorean: "다음 각 진술에 대해 지난 2주 동안의 기분과 가장 가까운 항목을 선택하십시오.\n\n응답 척도: 항상 · 대부분 · 절반 이상 · 절반 미만 · 가끔 · 전혀",
    },
  };

  for (const [toolId, r] of Object.entries(upgrades)) {
    try {
      const rows = await db
        .select({ formItems: assessmentToolsTable.formItems })
        .from(assessmentToolsTable)
        .where(eq(assessmentToolsTable.id, toolId))
        .limit(1);

      if (!rows.length || !rows[0].formItems) continue;

      const items = rows[0].formItems as any[];
      const idx = items.findIndex((item: any) => item.id === r.id);
      if (idx === -1) continue;
      if (items[idx].note) continue; // already upgraded

      const updatedItems = items.map((item: any, i: number) =>
        i === idx
          ? {
              ...item,
              text: r.text, textChinese: r.textChinese, textKorean: r.textKorean,
              note: r.note, noteChinese: r.noteChinese, noteKorean: r.noteKorean,
              domain: "admin",
            }
          : item
      );

      await db
        .update(assessmentToolsTable)
        .set({ formItems: updatedItems })
        .where(eq(assessmentToolsTable.id, toolId));

      logger.info({ toolId }, "Upgraded legacy instruction header");
    } catch (err) {
      logger.error({ err, toolId }, "Failed to upgrade legacy instruction header");
    }
  }
}

async function reviseASRSForm() {
  try {
    const rows = await db
      .select({ formItems: assessmentToolsTable.formItems })
      .from(assessmentToolsTable)
      .where(eq(assessmentToolsTable.id, "ASRS-ADHD"))
      .limit(1);

    if (!rows.length) return;

    const items = (rows[0].formItems ?? []) as any[];
    // Idempotency: 21 items (3 headers + 18 questions) with instruction header
    if (items.length === 21 && items[0]?.id === "asrs_instr") return;

    await db
      .update(assessmentToolsTable)
      .set({ formItems: ASRS_ADHD_FORM as any })
      .where(eq(assessmentToolsTable.id, "ASRS-ADHD"));

    logger.info({ toolId: "ASRS-ADHD" }, "Wrote full ASRS-ADHD form to DB");
  } catch (err) {
    logger.error({ err, toolId: "ASRS-ADHD" }, "Failed to write ASRS-ADHD form");
  }
}

async function reviseBFI44Form() {
  try {
    const rows = await db
      .select({ formItems: assessmentToolsTable.formItems })
      .from(assessmentToolsTable)
      .where(eq(assessmentToolsTable.id, "BFI-44"))
      .limit(1);

    if (!rows.length) return;

    const items = (rows[0].formItems ?? []) as any[];
    // Idempotency: already up-to-date if header is present and 45 items total
    if (items.length === 45 && items[0]?.id === "bfi44_instr") return;

    await db
      .update(assessmentToolsTable)
      .set({ formItems: BFI_44_FORM as any })
      .where(eq(assessmentToolsTable.id, "BFI-44"));

    logger.info({ toolId: "BFI-44" }, "Wrote full BFI-44 form to DB");
  } catch (err) {
    logger.error({ err, toolId: "BFI-44" }, "Failed to write BFI-44 form");
  }
}

async function reviseYBOCSSCForm() {
  try {
    const rows = await db
      .select({ formItems: assessmentToolsTable.formItems })
      .from(assessmentToolsTable)
      .where(eq(assessmentToolsTable.id, "Y-BOCS-SC"))
      .limit(1);

    if (!rows.length) return;

    const items = (rows[0].formItems ?? []) as any[];
    // Idempotency: already up-to-date if first likert item has 3 options (Never/Past/Current)
    const firstLikert = items.find((it: any) => it.type === "likert");
    if (firstLikert?.options?.length === 3) return;

    await db
      .update(assessmentToolsTable)
      .set({ formItems: YBOCS_SC_FORM as any })
      .where(eq(assessmentToolsTable.id, "Y-BOCS-SC"));

    logger.info({ toolId: "Y-BOCS-SC" }, "Wrote full Y-BOCS-SC form to DB");
  } catch (err) {
    logger.error({ err, toolId: "Y-BOCS-SC" }, "Failed to write Y-BOCS-SC form");
  }
}

async function repairPendingCasesFromConsent() {
  try {
    const pending = await db.select({ id: casesTable.id })
      .from(casesTable)
      .where(eq(casesTable.studentName, "Referral Pending"));
    for (const c of pending) {
      const [consentAssignment] = await db.select({ id: assignmentsTable.id })
        .from(assignmentsTable)
        .where(and(eq(assignmentsTable.caseId, c.id), eq(assignmentsTable.toolId, "CONSENT")))
        .limit(1);
      if (!consentAssignment) continue;
      const [response] = await db.select({ answers: responsesTable.answers })
        .from(responsesTable)
        .where(eq(responsesTable.assignmentId, consentAssignment.id))
        .limit(1);
      if (!response?.answers) continue;
      const a = response.answers as Record<string, string>;
      const firstName = (a.student_first_name ?? "").trim();
      const lastName  = (a.student_last_name  ?? "").trim();
      const studentName = [firstName, lastName].filter(Boolean).join(" ");
      if (!studentName) continue;
      await db.update(casesTable).set({
        studentName,
        ...(a.student_dob  && a.student_dob  !== "TBD" ? { dob:         a.student_dob  } : {}),
        ...(a.guardian_name                             ? { parentName:  a.guardian_name } : {}),
        ...(a.student_email                             ? { parentEmail: a.student_email } : {}),
      }).where(eq(casesTable.id, c.id));
      logger.info({ caseId: c.id, studentName }, "Repaired pending case from consent data");
    }
  } catch (err) {
    logger.error({ err }, "repairPendingCasesFromConsent failed");
  }
}

async function backfillRespondentLabels() {
  try {
    // For every (case_id, respondent_type) that has an unlabelled assignment,
    // determine the correct label from labelled siblings and copy it over.
    //
    // Strategy:
    //   1. If there is exactly ONE distinct non-empty label → use it.
    //   2. If there are MULTIPLE distinct labels (e.g. "Parent" for intake forms
    //      and "Parent Assessment Package" for assessment forms), pick the label
    //      that appears on the MOST sibling assignments (modal label).  The modal
    //      label is the one the respondent uses to open the portal, so it is the
    //      correct bucket for any late-added assessment tools that arrived without
    //      a label.
    //   3. If there are no labelled siblings → skip (cannot determine).
    const unlabelled = await db
      .select({
        id: assignmentsTable.id,
        caseId: assignmentsTable.caseId,
        respondentType: assignmentsTable.respondentType,
      })
      .from(assignmentsTable)
      .where(or(isNull(assignmentsTable.respondentLabel), eq(assignmentsTable.respondentLabel, "")));

    for (const row of unlabelled) {
      // Count occurrences of each distinct label for this (case, respondentType) group
      const labelCounts = await db
        .select({
          label: assignmentsTable.respondentLabel,
          count: sql<number>`count(*)::int`,
        })
        .from(assignmentsTable)
        .where(
          and(
            eq(assignmentsTable.caseId, row.caseId),
            eq(assignmentsTable.respondentType, row.respondentType),
            isNotNull(assignmentsTable.respondentLabel),
            ne(assignmentsTable.respondentLabel, ""),
          )
        )
        .groupBy(assignmentsTable.respondentLabel)
        .orderBy(desc(sql`count(*)`));

      if (labelCounts.length === 0) continue; // no labelled siblings — skip

      // Pick the most-common label (modal label)
      const chosenLabel = labelCounts[0].label!;
      await db
        .update(assignmentsTable)
        .set({ respondentLabel: chosenLabel })
        .where(eq(assignmentsTable.id, row.id));
    }
    if (unlabelled.length > 0) {
      logger.info({ count: unlabelled.length }, "Backfilled respondent labels");
    }
  } catch (err) {
    logger.error({ err }, "backfillRespondentLabels failed");
  }
}

async function addAssignmentToolVersionId() {
  try {
    await db.execute(sql`
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS tool_version_id TEXT
    `);
  } catch (err) {
    logger.error({ err }, "addAssignmentToolVersionId failed");
  }
}

async function addFormItemsSnapshotColumn() {
  try {
    await db.execute(sql`
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS form_items_snapshot TEXT
    `);
    logger.info("form_items_snapshot column ensured on assignments");
  } catch (err) {
    logger.error({ err }, "addFormItemsSnapshotColumn failed");
  }
}

async function addAssignmentMetadataColumn() {
  try {
    await db.execute(sql`
      ALTER TABLE assignments ADD COLUMN IF NOT EXISTS metadata JSONB
    `);
    logger.info("metadata column ensured on assignments");
  } catch (err) {
    logger.error({ err }, "addAssignmentMetadataColumn failed");
  }
}

async function addVersionColumns() {
  try {
    await db.execute(sql`
      ALTER TABLE assessment_tools ADD COLUMN IF NOT EXISTS version_id   TEXT
    `);
    await db.execute(sql`
      ALTER TABLE assessment_tools ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ
    `);
    await db.execute(sql`
      ALTER TABLE assessment_tools ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMPTZ
    `);
  } catch (err) {
    logger.error({ err }, "addVersionColumns failed");
  }
}

async function patchToolVersions() {
  try {
    const rows = await db.execute(sql`
      SELECT id, form_items, version_id, published_at FROM assessment_tools
    `);
    const now = new Date();
    let patched = 0;
    for (const row of rows.rows as { id: string; form_items: unknown; version_id: string | null; published_at: Date | null }[]) {
      const hash = row.form_items
        ? crypto.createHash("sha1").update(JSON.stringify(row.form_items)).digest("hex").slice(0, 12)
        : "no-items";
      if (!row.version_id || row.version_id !== hash) {
        await db.execute(sql`
          UPDATE assessment_tools
          SET version_id   = ${hash},
              updated_at   = ${now},
              published_at = COALESCE(published_at, ${now})
          WHERE id = ${row.id}
        `);
        patched++;
      } else if (!row.published_at) {
        await db.execute(sql`
          UPDATE assessment_tools SET published_at = ${now} WHERE id = ${row.id}
        `);
        patched++;
      }
    }
    if (patched > 0) logger.info({ patched }, "Tool versions patched");
  } catch (err) {
    logger.error({ err }, "patchToolVersions failed");
  }
}

async function applyBascHistoricalCorrection() {
  try {
    await db.execute(sql`
      ALTER TABLE responses
      ADD COLUMN IF NOT EXISTS basc_correction_applied BOOLEAN NOT NULL DEFAULT FALSE
    `);
    const result = await db.execute(sql`
      UPDATE responses
      SET    basc_correction_applied = TRUE
      WHERE  basc_correction_applied = FALSE
        AND  assignment_id IN (
               SELECT id FROM assignments WHERE tool_id LIKE 'BASC3-%'
             )
    `);
    if ((result.rowCount ?? 0) > 0) {
      logger.info({ count: result.rowCount }, "Applied BASC historical response correction flag");
    }
  } catch (err) {
    logger.error({ err }, "applyBascHistoricalCorrection failed");
  }
}

async function migrateBehavObsToInvigilator() {
  try {
    // ABO is completed by the invigilator, not the student — ensure respondentType is correct
    const result = await db
      .update(assignmentsTable)
      .set({ respondentType: "invigilator" })
      .where(and(eq(assignmentsTable.toolId, "BEHAVOBS"), eq(assignmentsTable.respondentType, "self")));
    if ((result.rowCount ?? 0) > 0) {
      logger.info({ count: result.rowCount }, "Migrated BEHAVOBS assignments from self → invigilator");
    }
  } catch (err) {
    logger.error({ err }, "migrateBehavObsToInvigilator failed");
  }
}

async function syncAssignmentToolNames() {
  try {
    const result = await db.execute(sql`
      UPDATE assignments a
      SET tool_name = at.name
      FROM assessment_tools at
      WHERE a.tool_id = at.id
        AND (a.tool_name IS NULL OR a.tool_name != at.name)
    `);
    if ((result.rowCount ?? 0) > 0) {
      logger.info({ count: result.rowCount }, "Synced assignment tool_name values to full names from assessment_tools");
    }
  } catch (err) {
    logger.error({ err }, "syncAssignmentToolNames failed");
  }
}

async function addCaseProductIds() {
  try {
    await db.execute(sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS product_ids JSONB NOT NULL DEFAULT '[]'`);
    logger.info("product_ids column ensured on cases");
    await db.execute(sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS parent_interview_notes TEXT`);
    logger.info("parent_interview_notes column ensured on cases");
    await db.execute(sql`ALTER TABLE cases ADD COLUMN IF NOT EXISTS debrief_notes TEXT`);
    logger.info("debrief_notes column ensured on cases");
  } catch (err) {
    logger.error({ err }, "addCaseProductIds failed");
  }
}

async function addCoordinatorSupport() {
  try {
    await db.execute(sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'school_clinical_coordinator'`);
    logger.info("school_clinical_coordinator enum value ensured");
  } catch (err) {
    logger.warn({ err }, "addCoordinatorSupport enum step skipped");
  }
  try {
    await db.execute(sql`ALTER TYPE respondent_type ADD VALUE IF NOT EXISTS 'examiner'`);
    logger.info("examiner respondent_type enum value ensured");
  } catch (err) {
    logger.warn({ err }, "addCoordinatorSupport enum step skipped");
  }
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS school_name TEXT`);
    logger.info("school_name column ensured on users");
  } catch (err) {
    logger.error({ err }, "addCoordinatorSupport column failed");
  }
}

async function backfillRscaSnapshots() {
  try {
    // Old RSCA assignments (completed before the 44-item REL/REA additions) have no snapshot.
    // Backfill them with the original MAS-only 21-item slice (rsca_instr + rsca1-rsca20)
    // so the admin response view shows only the questions that were actually presented.
    const masResult = await db.execute(sql`
      UPDATE assignments
      SET form_items_snapshot = (
        SELECT jsonb_agg(elem ORDER BY idx)::text
        FROM (
          SELECT elem, (row_number() OVER ()) - 1 AS idx
          FROM assessment_tools, jsonb_array_elements(form_items::jsonb) AS elem
          WHERE id = 'RSCA'
        ) t
        WHERE idx < 21
      )
      WHERE tool_id = 'RSCA'
        AND form_items_snapshot IS NULL
    `);
    if ((masResult.rowCount ?? 0) > 0) {
      logger.info({ count: masResult.rowCount }, "Backfilled old RSCA assignments with MAS-only snapshot");
    }

    // Not-started RSCA assignments that have only 21 items in snapshot (old version)
    // should be upgraded to the full 67-item snapshot so respondents see all 64 questions.
    const fullResult = await db.execute(sql`
      UPDATE assignments
      SET form_items_snapshot = (
        SELECT form_items::text FROM assessment_tools WHERE id = 'RSCA'
      )
      WHERE tool_id = 'RSCA'
        AND status = 'not_started'
        AND form_items_snapshot IS NOT NULL
        AND jsonb_array_length(form_items_snapshot::jsonb) < 67
    `);
    if ((fullResult.rowCount ?? 0) > 0) {
      logger.info({ count: fullResult.rowCount }, "Upgraded not-started RSCA assignments to full 67-item snapshot");
    }

    // Universal backfill: any remaining assignment with no snapshot gets the current live
    // form_items frozen in. This covers all other forms (BASC3, BRIEF2, SDQ, etc.) that
    // pre-date the snapshot feature. Because the RSCA-specific step above already ran,
    // old RSCA completed assignments already have the correct 21-item MAS snapshot and
    // won't be overwritten here.
    const universalResult = await db.execute(sql`
      UPDATE assignments a
      SET form_items_snapshot = at.form_items::text
      FROM assessment_tools at
      WHERE a.tool_id = at.id
        AND a.form_items_snapshot IS NULL
        AND at.form_items IS NOT NULL
    `);
    if ((universalResult.rowCount ?? 0) > 0) {
      logger.info({ count: universalResult.rowCount }, "Universal snapshot backfill: froze live form_items into old assignments");
    }
  } catch (err) {
    logger.error({ err }, "backfillRscaSnapshots failed");
  }
}

async function addRmraReportColumn() {
  try {
    await db.execute(sql`
      ALTER TABLE rmra_sessions ADD COLUMN IF NOT EXISTS report_data JSONB
    `);
    logger.info("report_data column ensured on rmra_sessions");
  } catch (err) {
    logger.error({ err }, "addRmraReportColumn failed");
  }
}

async function ensureCaseModeColumn() {
  try {
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE case_mode AS ENUM ('live', 'test');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    await db.execute(sql`
      ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_mode case_mode NOT NULL DEFAULT 'live'
    `);
    logger.info("case_mode column ensured on cases");
  } catch (err) {
    logger.error({ err }, "ensureCaseModeColumn failed");
  }
}

async function ensureRmraExaminerTokenColumn() {
  try {
    await db.execute(sql`
      ALTER TABLE rmra_sessions ADD COLUMN IF NOT EXISTS examiner_token TEXT
    `);
    logger.info("examiner_token column ensured on rmra_sessions");
  } catch (err) {
    logger.error({ err }, "ensureRmraExaminerTokenColumn failed");
  }
}

async function ensureRmraTimerStartedAtColumn() {
  try {
    await db.execute(sql`
      ALTER TABLE rmra_sessions ADD COLUMN IF NOT EXISTS timer_started_at TIMESTAMPTZ
    `);
    logger.info("timer_started_at column ensured on rmra_sessions");
  } catch (err) {
    logger.error({ err }, "ensureRmraTimerStartedAtColumn failed");
  }
}

async function ensureStudentAnswerColumn() {
  try {
    await db.execute(sql`ALTER TABLE rmra_task_responses ADD COLUMN IF NOT EXISTS student_answer TEXT`);
    logger.info("student_answer column ensured on rmra_task_responses");
  } catch (err) {
    logger.error({ err }, "ensureStudentAnswerColumn failed");
  }
}

async function ensureRmraTaskResponseUniqueIndex() {
  try {
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS rmra_task_responses_session_task_idx
      ON rmra_task_responses (session_id, task_id)
    `);
    logger.info("rmra_task_responses unique index ensured");
  } catch (err) {
    logger.error({ err }, "ensureRmraTaskResponseUniqueIndex failed");
  }
}

async function createRmraAccessCodesTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rmra_access_codes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        description TEXT,
        usage_limit INTEGER NOT NULL DEFAULT 1,
        usage_count INTEGER NOT NULL DEFAULT 0,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS rmra_access_codes_code_idx ON rmra_access_codes (code)
    `);
    logger.info("rmra_access_codes table ensured");
  } catch (err) {
    logger.error({ err }, "createRmraAccessCodesTable failed");
  }
}

async function createRmraTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rmra_sessions (
        id TEXT PRIMARY KEY,
        case_id TEXT,
        assignment_id TEXT,
        examiner_id TEXT,
        age_band TEXT NOT NULL DEFAULT 'upper_primary',
        version TEXT NOT NULL DEFAULT 'full',
        theme TEXT NOT NULL DEFAULT 'space_mission',
        status TEXT NOT NULL DEFAULT 'not_started',
        current_task_id TEXT,
        general_notes TEXT,
        domain_scores JSONB,
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rmra_task_responses (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        task_id TEXT NOT NULL,
        age_band TEXT NOT NULL,
        accuracy INTEGER,
        reasoning INTEGER,
        strategy_level INTEGER,
        strategy_label TEXT,
        hint_level INTEGER NOT NULL DEFAULT 0,
        attempts INTEGER NOT NULL DEFAULT 1,
        self_correction BOOLEAN NOT NULL DEFAULT FALSE,
        confidence_rating INTEGER,
        response_time_seconds REAL,
        first_response TEXT,
        final_response TEXT,
        productive_struggle_persistence INTEGER,
        productive_struggle_flexibility INTEGER,
        productive_struggle_emotional_regulation INTEGER,
        productive_struggle_error_recovery INTEGER,
        productive_struggle_help_utilization INTEGER,
        discontinued BOOLEAN NOT NULL DEFAULT FALSE,
        discontinuation_reason TEXT,
        examiner_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("RMRA tables ensured");
  } catch (err) {
    logger.error({ err }, "createRmraTables failed");
  }
}

async function createInterviewRecordingsTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS interview_recordings (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        duration_seconds INTEGER,
        conversation_type TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'audio/webm',
        transcript TEXT,
        structured_notes JSONB,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS interview_recordings_case_id_idx ON interview_recordings (case_id)
    `);
    await db.execute(sql`
      ALTER TABLE interview_recordings
        ADD COLUMN IF NOT EXISTS interview_date TIMESTAMPTZ
    `);
    logger.info("interview_recordings table ensured");
  } catch (err) {
    logger.error({ err }, "createInterviewRecordingsTable failed");
  }
}

async function createLscTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lsc_settings (
        id SERIAL PRIMARY KEY,
        product_name TEXT NOT NULL DEFAULT 'ReMynd Learning Support Coach',
        product_subtitle TEXT NOT NULL DEFAULT 'Assessment-Based Educational Decision Support',
        monthly_price_rmb INTEGER NOT NULL DEFAULT 388,
        annual_price_rmb INTEGER NOT NULL DEFAULT 3880,
        monthly_analysis_limit INTEGER NOT NULL DEFAULT 25,
        trial_analysis_limit INTEGER NOT NULL DEFAULT 1,
        allow_trial BOOLEAN NOT NULL DEFAULT TRUE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      INSERT INTO lsc_settings (product_name, product_subtitle, monthly_price_rmb, annual_price_rmb, monthly_analysis_limit, trial_analysis_limit)
      SELECT 'ReMynd Learning Support Coach', 'Assessment-Based Educational Decision Support', 388, 3880, 25, 1
      WHERE NOT EXISTS (SELECT 1 FROM lsc_settings LIMIT 1)
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lsc_subscriptions (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL UNIQUE,
        subscription_status TEXT NOT NULL DEFAULT 'trial_available',
        monthly_allowance INTEGER NOT NULL DEFAULT 25,
        monthly_usage INTEGER NOT NULL DEFAULT 0,
        monthly_reset_date TIMESTAMPTZ,
        trial_used_at TIMESTAMPTZ,
        complimentary BOOLEAN NOT NULL DEFAULT FALSE,
        complimentary_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lsc_analyses (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        portal_token TEXT,
        user_role TEXT NOT NULL DEFAULT 'parent',
        language TEXT NOT NULL DEFAULT 'english',
        lesson_content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'completed',
        slp_snapshot JSONB,
        demand_profile JSONB,
        guide JSONB,
        output_versions JSONB NOT NULL DEFAULT '{}',
        follow_up_messages JSONB NOT NULL DEFAULT '[]',
        review_status TEXT NOT NULL DEFAULT 'ai_generated',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS lsc_payment_intents (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        portal_token TEXT NOT NULL,
        plan TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'CNY',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`ALTER TABLE lsc_subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`);
    logger.info("LSC tables ready");
  } catch (err) {
    logger.error({ err }, "createLscTables failed");
  }
}

async function createComplianceTables() {
  try {
    // Compliance tables — additive only, no existing tables modified
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS compliance_data_inventory (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        example_fields TEXT,
        data_subject TEXT,
        purpose TEXT,
        source TEXT,
        system_location TEXT,
        is_sensitive BOOLEAN NOT NULL DEFAULT false,
        involves_minor BOOLEAN NOT NULL DEFAULT false,
        involves_under_14 BOOLEAN NOT NULL DEFAULT false,
        authorized_roles TEXT,
        external_recipients TEXT,
        storage_region TEXT,
        overseas_access TEXT,
        retention_practice TEXT,
        deletion_method TEXT,
        security_controls TEXT,
        risk_level TEXT NOT NULL DEFAULT 'unknown',
        compliance_notes TEXT,
        review_status TEXT NOT NULL DEFAULT 'pending',
        last_reviewed_at TIMESTAMPTZ,
        reviewer TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS compliance_vendors (
        id TEXT PRIMARY KEY,
        vendor_name TEXT NOT NULL,
        service_purpose TEXT,
        data_categories TEXT,
        student_info_possible BOOLEAN NOT NULL DEFAULT true,
        sensitive_info_possible BOOLEAN NOT NULL DEFAULT false,
        minors_possible BOOLEAN NOT NULL DEFAULT false,
        hosting_region TEXT,
        leaves_mainland BOOLEAN,
        contract_reviewed TEXT NOT NULL DEFAULT 'unknown',
        training_use TEXT NOT NULL DEFAULT 'unknown',
        retention_terms_known BOOLEAN NOT NULL DEFAULT false,
        deletion_capable BOOLEAN NOT NULL DEFAULT false,
        security_review_status TEXT NOT NULL DEFAULT 'not_started',
        risk_level TEXT NOT NULL DEFAULT 'unknown',
        required_followup TEXT,
        notes TEXT,
        last_reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS compliance_policy_register (
        id TEXT PRIMARY KEY,
        policy_name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'not_started',
        effective_date DATE,
        version TEXT,
        document_owner TEXT,
        review_date DATE,
        internal_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Add content + visibility columns (idempotent — safe to run on existing table)
    for (const col of ["content_en", "content_zh", "content_ko"]) {
      await db.execute(sql.raw(`ALTER TABLE compliance_policy_register ADD COLUMN IF NOT EXISTS ${col} TEXT`));
    }
    await db.execute(sql.raw(`ALTER TABLE compliance_policy_register ADD COLUMN IF NOT EXISTS public_visible BOOLEAN NOT NULL DEFAULT false`));

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS compliance_access_reviews (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        review_label TEXT,
        reviewed_by TEXT,
        reviewed_at TIMESTAMPTZ,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS security_audit_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actor_id TEXT,
        actor_role TEXT,
        resource_id TEXT,
        resource_type TEXT,
        outcome TEXT,
        ip_address TEXT,
        request_id TEXT,
        vendor_name TEXT,
        description TEXT
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS sec_audit_events_occurred_idx ON security_audit_events (occurred_at DESC)`);

    // Seed data inventory if empty
    const invCount = await db.execute(sql`SELECT COUNT(*) FROM compliance_data_inventory`);
    if (Number((invCount.rows[0] as any).count) === 0) {
      const { nanoid: nid } = await import("nanoid");
      const inv = [
        { cat: "Student identity", subj: "Student", sens: false, minor: true, u14: true, loc: "cases table (PostgreSQL)", purpose: "Case management and assessment", roles: "admin, psychometrician, assessment_invigilator, school_clinical_coordinator", risk: "high", region: "Replit-hosted (Singapore/US)" },
        { cat: "Parent and guardian information", subj: "Parent/Guardian", sens: false, minor: false, u14: false, loc: "cases, responses tables", purpose: "Consent, intake, communication", roles: "admin, psychometrician", risk: "medium", region: "Replit-hosted (Singapore/US)" },
        { cat: "School information", subj: "Student/Institution", sens: false, minor: false, u14: false, loc: "cases, users tables", purpose: "Assessment context", roles: "admin, psychometrician, school_clinical_coordinator", risk: "low", region: "Replit-hosted (Singapore/US)" },
        { cat: "Referral concerns", subj: "Student", sens: true, minor: true, u14: true, loc: "cases, responses tables", purpose: "Assessment planning", roles: "admin, psychometrician", risk: "high", region: "Replit-hosted (Singapore/US)" },
        { cat: "Teacher questionnaire responses", subj: "Student (rated by teacher)", sens: true, minor: true, u14: true, loc: "responses table", purpose: "Assessment data collection", roles: "admin, psychometrician, assessment_invigilator", risk: "high", region: "Replit-hosted (Singapore/US)" },
        { cat: "Parent/student questionnaire responses", subj: "Student", sens: true, minor: true, u14: true, loc: "responses table", purpose: "Assessment data collection", roles: "admin, psychometrician", risk: "high", region: "Replit-hosted (Singapore/US)" },
        { cat: "Psychological assessment scores", subj: "Student", sens: true, minor: true, u14: true, loc: "scores table", purpose: "Clinical interpretation", roles: "admin, psychometrician", risk: "critical", region: "Replit-hosted (Singapore/US)" },
        { cat: "Assessment reports and recommendations", subj: "Student", sens: true, minor: true, u14: true, loc: "reports table, Google Cloud Storage", purpose: "Reporting and debrief", roles: "admin, psychometrician", risk: "critical", region: "Replit/Google Cloud (possible cross-border)" },
        { cat: "Audio/video interview recordings", subj: "Student/Clinician", sens: true, minor: true, u14: true, loc: "interview_recordings, object storage", purpose: "RAMRI/RMRA assessment", roles: "admin, psychometrician", risk: "critical", region: "Replit object storage (Singapore/US)" },
        { cat: "AI-generated analysis", subj: "Student", sens: true, minor: true, u14: true, loc: "cases.intake_analysis, ramri_reports, raepa_reports, lsc_analyses", purpose: "AI-assisted assessment and support", roles: "admin, psychometrician", risk: "high", region: "DeepSeek/Groq/Gemini (cross-border)" },
        { cat: "User account information", subj: "Staff", sens: false, minor: false, u14: false, loc: "users table", purpose: "Authentication and access control", roles: "admin", risk: "medium", region: "Replit-hosted" },
        { cat: "Billing records", subj: "Parent/Guardian", sens: false, minor: false, u14: false, loc: "lsc_subscriptions, lsc_payment_intents", purpose: "LSC subscription management", roles: "admin", risk: "medium", region: "Airwallex (China/Hong Kong)" },
        { cat: "Progress monitoring records", subj: "Student", sens: true, minor: true, u14: true, loc: "Bobby AI external system", purpose: "Intervention progress tracking", roles: "admin, psychometrician", risk: "high", region: "Bobby AI servers (unknown)" },
        { cat: "Case Portal access logs", subj: "Parent/Guardian", sens: false, minor: false, u14: false, loc: "audit_log table, portal_tokens", purpose: "Secure parent access to assessment portal", roles: "admin", risk: "low", region: "Replit-hosted" },
      ];
      for (const item of inv) {
        await db.execute(sql`INSERT INTO compliance_data_inventory
          (id, category, data_subject, purpose, system_location, is_sensitive, involves_minor, involves_under_14, authorized_roles, risk_level, storage_region, review_status, compliance_notes)
          VALUES (${nid()}, ${item.cat}, ${item.subj}, ${item.purpose}, ${item.loc}, ${item.sens}, ${item.minor}, ${item.u14}, ${item.roles}, ${item.risk}, ${item.region}, 'pending', 'System-identified draft — requires human review')`);
      }
      logger.info("Compliance data inventory seeded");
    }

    // Seed vendors if empty
    const vendorCount = await db.execute(sql`SELECT COUNT(*) FROM compliance_vendors`);
    if (Number((vendorCount.rows[0] as any).count) === 0) {
      const { nanoid: nid } = await import("nanoid");
      const vendors = [
        { name: "DeepSeek", purpose: "AI text analysis — intake, report generation, LSC", cats: "Student assessment data, referral information, scores", student: true, sens: true, minor: true, region: "Unknown — likely mainland China or overseas", leaves: true, training: "unknown", risk: "critical", followup: "Confirm data retention terms, training-use opt-out, and data processing agreement." },
        { name: "Groq", purpose: "AI text (RAMRI/RAEPA) and audio transcription (Whisper)", cats: "Session transcripts, audio recordings, assessment observations", student: true, sens: true, minor: true, region: "USA (Groq Cloud)", leaves: true, training: "unknown", risk: "critical", followup: "Confirm training-use prohibition, data retention policy, and DPA. Audio recordings are highest risk." },
        { name: "Google Gemini (Replit integration)", purpose: "Vision AI for RAMRI work samples and RAEPA", cats: "Work sample images, assessment observations", student: true, sens: true, minor: true, region: "Google Cloud (USA/EU)", leaves: true, training: "unknown", risk: "high", followup: "Confirm Replit integration data processing terms." },
        { name: "Airwallex", purpose: "LSC subscription payments", cats: "Billing information, payment intent data", student: false, sens: false, minor: false, region: "Hong Kong/Australia", leaves: true, training: "no", risk: "medium", followup: "Review data processing agreement for payment data." },
        { name: "Replit Object Storage", purpose: "Audio recordings, work samples, report PDFs", cats: "Assessment recordings, report documents, uploaded materials", student: true, sens: true, minor: true, region: "Singapore/USA (Google Cloud)", leaves: true, training: "no", risk: "high", followup: "Confirm data residency SLA and deletion capability." },
        { name: "Bobby AI", purpose: "Intervention progress monitoring (external)", cats: "Case ID, access credentials, progress data", student: true, sens: true, minor: true, region: "Unknown", leaves: null, training: "unknown", risk: "high", followup: "Obtain data processing agreement and confirm hosting region." },
        { name: "Nodemailer / SMTP", purpose: "Transactional email notifications", cats: "User email addresses, notification content", student: false, sens: false, minor: false, region: "Depends on SMTP provider configured", leaves: null, training: "no", risk: "low", followup: "Confirm SMTP provider and region." },
        { name: "Google Docs", purpose: "Report PDF export via Google Docs API", cats: "Report content exported to PDF", student: true, sens: true, minor: true, region: "Google Cloud (USA/EU)", leaves: true, training: "unknown", risk: "high", followup: "Review Google Workspace DPA for this use case." },
      ];
      for (const v of vendors) {
        await db.execute(sql`INSERT INTO compliance_vendors
          (id, vendor_name, service_purpose, data_categories, student_info_possible, sensitive_info_possible, minors_possible, hosting_region, leaves_mainland, training_use, risk_level, required_followup)
          VALUES (${nid()}, ${v.name}, ${v.purpose}, ${v.cats}, ${v.student}, ${v.sens}, ${v.minor}, ${v.region}, ${v.leaves}, ${v.training}, ${v.risk}, ${v.followup})`);
      }
      logger.info("Compliance vendors seeded");
    }

    // Seed / update policy register with full content
    const { POLICY_CONTENT } = await import("./lib/policy-content.js");
    const { nanoid: nid } = await import("nanoid");
    for (const p of POLICY_CONTENT) {
      const existing = await db.execute(
        sql`SELECT id FROM compliance_policy_register WHERE policy_name = ${p.name}`
      );
      if (existing.rows.length === 0) {
        await db.execute(sql`INSERT INTO compliance_policy_register
          (id, policy_name, status, internal_notes, content_en, content_zh, content_ko, public_visible)
          VALUES (${nid()}, ${p.name}, 'drafting',
            'Draft — generated by system. Requires legal review before use.',
            ${p.content_en}, ${p.content_zh}, ${p.content_ko}, true)`);
      } else {
        // Always refresh content so updates to policy-content.ts are picked up
        const rowId = (existing.rows[0] as any).id;
        await db.execute(sql`UPDATE compliance_policy_register SET
          content_en = ${p.content_en},
          content_zh = ${p.content_zh},
          content_ko = ${p.content_ko},
          status = CASE WHEN status = 'not_started' THEN 'drafting' ELSE status END,
          internal_notes = CASE WHEN internal_notes LIKE 'Placeholder%'
            THEN 'Draft — generated by system. Requires legal review before use.'
            ELSE internal_notes END,
          updated_at = NOW()
          WHERE id = ${rowId}`);
      }
    }
    logger.info("Compliance policy content seeded/updated");

    logger.info("Compliance tables ready");
  } catch (err) {
    logger.error({ err }, "createComplianceTables failed (non-fatal)");
  }
}

async function ensureAirwallexWebhook() {
  try {
    const { getAccessToken, isConfigured } = await import("./lib/airwallex.js");
    if (!isConfigured()) return;
    const token = await getAccessToken();
    if (!token) return;
    const clientId = process.env.AIRWALLEX_CLIENT_ID!;
    const base = process.env.AIRWALLEX_ENV === "demo"
      ? "https://api-demo.airwallex.com/api/v1"
      : "https://api.airwallex.com/api/v1";
    const webhookUrl = "https://remyndassessments.com/api/external/payments/webhook";
    const listRes = await fetch(`${base}/webhooks`, {
      headers: { Authorization: `Bearer ${token}`, "x-client-id": clientId },
    });
    if (!listRes.ok) { logger.warn({ status: listRes.status }, "Airwallex webhook list failed"); return; }
    const listData = await listRes.json() as { items?: Array<{ id: string; url: string }> };
    const items = listData.items ?? [];
    if (items.find(w => w.url === webhookUrl)) {
      logger.info("Airwallex webhook already registered");
      return;
    }
    const createRes = await fetch(`${base}/webhooks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "x-client-id": clientId },
      body: JSON.stringify({
        url: webhookUrl,
        event_types: ["payment_intent.succeeded", "payment_intent.payment_failed", "payment_intent.cancelled"],
      }),
    });
    const created = await createRes.json() as { id?: string };
    if (createRes.ok) logger.info({ id: created.id }, "Airwallex webhook registered");
    else logger.warn({ status: createRes.status, body: created }, "Airwallex webhook registration failed");
  } catch (err) {
    logger.warn({ err }, "ensureAirwallexWebhook failed (non-fatal)");
  }
}

async function backfillBobbyAiCaseIds() {
  try {
    // Extract Case ID from bobby_ai_portal_credentials for any case where bobby_ai_case_id is null.
    // Uses regexp_match with 'i' flag (case-insensitive) — more reliable than substring...FROM in PG.
    const result = await db.execute(sql`
      UPDATE cases
      SET bobby_ai_case_id = trim((regexp_match(bobby_ai_portal_credentials, 'Case[[:space:]]*ID[[:space:]]*[:\\-][[:space:]]*([^\\n\\r]+)', 'i'))[1])
      WHERE bobby_ai_portal_credentials IS NOT NULL
        AND bobby_ai_portal_credentials != ''
        AND (bobby_ai_case_id IS NULL OR bobby_ai_case_id = '')
        AND bobby_ai_portal_credentials ~* 'Case[[:space:]]*ID[[:space:]]*[:\\-]'
    `);
    if ((result.rowCount ?? 0) > 0) {
      logger.info({ count: result.rowCount }, "Backfilled bobby_ai_case_id from credentials");
    }
  } catch (err) {
    logger.error({ err }, "backfillBobbyAiCaseIds failed");
  }
}

async function createRamriTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_sessions (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        assignment_id TEXT NOT NULL,
        examiner_id TEXT,
        status TEXT NOT NULL DEFAULT 'upload',
        opening_script_delivered TEXT,
        opening_notes TEXT,
        general_notes TEXT,
        stop_reason TEXT,
        session_reflection_examiner JSONB,
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ramri_sessions_case_id_idx ON ramri_sessions (case_id)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS ramri_sessions_assignment_idx ON ramri_sessions (case_id, assignment_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_work_documents (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        file_name TEXT,
        file_url TEXT,
        file_type TEXT,
        source_type TEXT,
        contributor_name TEXT,
        completion_date DATE,
        grade_level TEXT,
        math_topic TEXT,
        independence_reported TEXT,
        teacher_assistance TEXT,
        parent_assistance TEXT,
        example_shown TEXT,
        manipulatives_used TEXT,
        calculator_used TEXT,
        completion_setting TEXT,
        timed TEXT,
        teacher_marked TEXT,
        teacher_comments TEXT,
        contributor_notes TEXT,
        extraction_status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ramri_work_docs_session_idx ON ramri_work_documents (session_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_work_samples (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        case_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        image_url TEXT,
        extracted_problem TEXT,
        student_answer TEXT,
        visible_working TEXT,
        teacher_correction TEXT,
        teacher_comments TEXT,
        domain TEXT,
        skill TEXT,
        reasoning_focus JSONB,
        difficulty TEXT,
        estimated_grade TEXT,
        answer_status TEXT,
        language_demand TEXT,
        suitability TEXT NOT NULL DEFAULT 'suitable',
        approved BOOLEAN NOT NULL DEFAULT FALSE,
        examiner_notes TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ramri_work_samples_session_idx ON ramri_work_samples (session_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_choice_sets (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        title TEXT,
        choice_type TEXT NOT NULL DEFAULT 'open',
        target_domain TEXT,
        student_prompt TEXT,
        display_order INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ramri_choice_sets_session_idx ON ramri_choice_sets (session_id)`);
    await db.execute(sql`ALTER TABLE ramri_choice_sets ADD COLUMN IF NOT EXISTS control_problem JSONB`);
    await db.execute(sql`ALTER TABLE ramri_work_samples ADD COLUMN IF NOT EXISTS sample_role TEXT NOT NULL DEFAULT 'interview'`);
    await db.execute(sql`ALTER TABLE ramri_work_samples ADD COLUMN IF NOT EXISTS suggested_for_interview BOOLEAN NOT NULL DEFAULT false`);
    // Backfill: any pre-existing sample with suitability=excluded should be evidence, not interview
    await db.execute(sql`UPDATE ramri_work_samples SET sample_role = 'evidence' WHERE suitability = 'excluded' AND sample_role = 'interview'`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_choice_set_items (
        id TEXT PRIMARY KEY,
        choice_set_id TEXT NOT NULL,
        work_sample_id TEXT NOT NULL,
        display_order INTEGER NOT NULL DEFAULT 0
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_sample_selections (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        choice_set_id TEXT,
        work_sample_id TEXT NOT NULL,
        offered_sample_ids JSONB,
        selection_latency_label TEXT,
        selection_behavior TEXT,
        recognition BOOLEAN,
        remembered_completion BOOLEAN,
        familiarity_notes TEXT,
        sequence_number INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ramri_selections_session_idx ON ramri_sample_selections (session_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_ownership_context (
        id TEXT PRIMARY KEY,
        sample_selection_id TEXT NOT NULL UNIQUE,
        remembers_problem TEXT,
        reported_independence INTEGER,
        assistance_source TEXT,
        example_shown TEXT,
        supports_used JSONB,
        completion_setting TEXT,
        direct_quote TEXT,
        examiner_notes TEXT
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_interview_responses (
        id TEXT PRIMARY KEY,
        sample_selection_id TEXT NOT NULL,
        question_type TEXT,
        generated_question TEXT,
        approved_question TEXT,
        response_mode TEXT,
        direct_quote TEXT,
        examiner_paraphrase TEXT,
        examiner_interpretation TEXT,
        skipped BOOLEAN NOT NULL DEFAULT FALSE,
        not_observed BOOLEAN NOT NULL DEFAULT FALSE,
        sequence_number INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ramri_responses_sel_idx ON ramri_interview_responses (sample_selection_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_transfer_prompts (
        id TEXT PRIMARY KEY,
        sample_selection_id TEXT NOT NULL UNIQUE,
        transfer_level TEXT,
        generated_prompt TEXT,
        approved_prompt TEXT,
        student_response TEXT,
        support_level TEXT,
        transfer_rating INTEGER,
        notes TEXT
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_domain_ratings (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        rating INTEGER,
        evidence_strength TEXT,
        supporting_evidence TEXT,
        examiner_override BOOLEAN NOT NULL DEFAULT FALSE,
        override_reason TEXT
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS ramri_ratings_session_domain_idx ON ramri_domain_ratings (session_id, domain)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_behavioral_obs (
        id TEXT PRIMARY KEY,
        sample_selection_id TEXT NOT NULL UNIQUE,
        anxiety_rating INTEGER,
        confidence_rating INTEGER,
        engagement_rating INTEGER,
        reassurance_required BOOLEAN,
        communication_mode JSONB,
        notes TEXT
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_reports (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        session_id TEXT NOT NULL UNIQUE,
        generated_narrative JSONB,
        edited_narrative JSONB,
        status TEXT NOT NULL DEFAULT 'draft',
        approved_by TEXT,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`ALTER TABLE ramri_sessions ADD COLUMN IF NOT EXISTS invigilator_id TEXT`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ramri_question_recordings (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES ramri_sessions(id) ON DELETE CASCADE,
        selection_id TEXT REFERENCES ramri_sample_selections(id) ON DELETE CASCADE,
        question_text TEXT,
        storage_path TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'audio/webm',
        full_transcript TEXT,
        turns JSONB,
        report_mode TEXT NOT NULL DEFAULT 'student_only',
        duration_seconds INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ramri_qrec_session_idx ON ramri_question_recordings (session_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS ramri_qrec_sel_idx ON ramri_question_recordings (selection_id)`);

    logger.info("RAMRI tables ensured");
  } catch (err) {
    logger.error({ err }, "createRamriTables failed");
  }
}

async function createRaepaTables() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS raepa_sessions (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        examiner_id TEXT,
        status TEXT NOT NULL DEFAULT 'setup',
        pathway TEXT NOT NULL DEFAULT 'standalone',
        language_background JSONB NOT NULL DEFAULT '{}',
        modules_selected JSONB NOT NULL DEFAULT '[]',
        overall_summary TEXT,
        interpretive_profiles JSONB,
        confidence_level TEXT,
        general_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS raepa_sessions_case_id_idx ON raepa_sessions (case_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS raepa_work_samples (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        file_name TEXT,
        file_url TEXT,
        file_type TEXT,
        title TEXT,
        subject TEXT,
        task_type TEXT,
        date_completed DATE,
        teacher TEXT,
        grade_level TEXT,
        independent_completion BOOLEAN NOT NULL DEFAULT TRUE,
        support_provided TEXT,
        assignment_instructions TEXT,
        student_score TEXT,
        teacher_comments TEXT,
        student_selected BOOLEAN NOT NULL DEFAULT FALSE,
        ai_analysis_status TEXT NOT NULL DEFAULT 'pending',
        ai_analysis JSONB,
        assessor_approved BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS raepa_work_samples_case_id_idx ON raepa_work_samples (case_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS raepa_domain_ratings (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        domain TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        confidence TEXT,
        evidence TEXT,
        support_level_required TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS raepa_domain_ratings_session_domain_idx ON raepa_domain_ratings (session_id, domain)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS raepa_language_functions (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        function_name TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'not_assessed',
        evidence TEXT,
        subject_context TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS raepa_language_functions_session_fn_idx ON raepa_language_functions (session_id, function_name)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS raepa_module_scores (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        case_id TEXT NOT NULL,
        module_id TEXT NOT NULL,
        administered BOOLEAN NOT NULL DEFAULT FALSE,
        score INTEGER NOT NULL DEFAULT 0,
        support_level TEXT,
        observations TEXT,
        task_notes JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS raepa_module_scores_session_module_idx ON raepa_module_scores (session_id, module_id)`);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS raepa_reports (
        id TEXT PRIMARY KEY,
        case_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        report_type TEXT NOT NULL DEFAULT 'standalone',
        generated_narrative JSONB,
        edited_narrative JSONB,
        status TEXT NOT NULL DEFAULT 'draft',
        approved_by TEXT,
        approved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS raepa_reports_case_id_idx ON raepa_reports (case_id)`);

    await db.execute(sql`ALTER TABLE raepa_sessions ADD COLUMN IF NOT EXISTS current_stimulus JSONB`);

    logger.info("RAEPA tables ensured");
  } catch (err) {
    logger.error({ err }, "createRaepaTables failed");
  }
}

async function createTrainingTables() {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS training_registrations (
      id                          TEXT PRIMARY KEY,
      first_name                  TEXT NOT NULL,
      last_name                   TEXT NOT NULL,
      email                       TEXT NOT NULL,
      job_title                   TEXT,
      professional_role           TEXT,
      professional_role_other     TEXT,
      school_name                 TEXT,
      city                        TEXT,
      country                     TEXT,
      school_type                 TEXT,
      school_size                 TEXT,
      workshop_1_selected         BOOLEAN NOT NULL DEFAULT FALSE,
      workshop_2_selected         BOOLEAN NOT NULL DEFAULT FALSE,
      workshop_3_selected         BOOLEAN NOT NULL DEFAULT FALSE,
      workshop_4_selected         BOOLEAN NOT NULL DEFAULT FALSE,
      full_series_selected        BOOLEAN NOT NULL DEFAULT FALSE,
      areas_of_interest           JSONB,
      school_support_challenge    TEXT,
      interested_future_learning  BOOLEAN NOT NULL DEFAULT FALSE,
      interested_school_training  BOOLEAN NOT NULL DEFAULT FALSE,
      interested_assessment_services BOOLEAN NOT NULL DEFAULT FALSE,
      interested_partner_school   BOOLEAN NOT NULL DEFAULT FALSE,
      training_only               BOOLEAN NOT NULL DEFAULT FALSE,
      marketing_consent           BOOLEAN NOT NULL DEFAULT FALSE,
      marketing_consent_timestamp TIMESTAMPTZ,
      privacy_consent             BOOLEAN NOT NULL DEFAULT FALSE,
      privacy_consent_timestamp   TIMESTAMPTZ,
      registration_source         TEXT,
      status                      TEXT NOT NULL DEFAULT 'registered',
      confirmation_email_sent_at  TIMESTAMPTZ,
      confirmation_email_status   TEXT,
      admin_notification_sent_at  TIMESTAMPTZ,
      admin_notification_status   TEXT,
      internal_notes              TEXT,
      created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS training_registrations_email_idx ON training_registrations (email)`);

    await db.execute(sql`CREATE TABLE IF NOT EXISTS training_school_inquiries (
      id                TEXT PRIMARY KEY,
      contact_name      TEXT NOT NULL,
      contact_email     TEXT NOT NULL,
      role              TEXT,
      school_name       TEXT,
      country           TEXT,
      school_size       TEXT,
      preferred_contact TEXT,
      message           TEXT,
      consent           BOOLEAN NOT NULL DEFAULT TRUE,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    logger.info("Training tables ready");
  } catch (err) {
    logger.error({ err }, "createTrainingTables failed");
  }
}

async function createWorkshopTables() {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS workshops (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT,
      description TEXT,
      additional_info TEXT,
      image_object_id TEXT,
      image_alt TEXT,
      session_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
      timezone TEXT NOT NULL DEFAULT 'Asia/Hong_Kong',
      delivery_method TEXT NOT NULL DEFAULT 'online',
      venue_info TEXT,
      facilitator_name TEXT,
      pl_hours NUMERIC(4,1),
      registration_opens_at TIMESTAMPTZ,
      registration_closes_at TIMESTAMPTZ,
      max_participants INTEGER,
      is_free BOOLEAN NOT NULL DEFAULT TRUE,
      price NUMERIC(10,2),
      currency TEXT NOT NULL DEFAULT 'USD',
      contact_email TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await db.execute(sql`CREATE TABLE IF NOT EXISTS workshop_registrations (
      id TEXT PRIMARY KEY,
      workshop_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      professional_role TEXT,
      school_name TEXT,
      country TEXT,
      phone TEXT,
      privacy_consent BOOLEAN NOT NULL DEFAULT FALSE,
      privacy_consent_timestamp TIMESTAMPTZ,
      payment_status TEXT NOT NULL DEFAULT 'free',
      payment_intent_id TEXT,
      status TEXT NOT NULL DEFAULT 'registered',
      confirmation_email_status TEXT,
      confirmation_email_sent_at TIMESTAMPTZ,
      internal_notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    await db.execute(sql`CREATE TABLE IF NOT EXISTS workshop_payment_intents (
      id TEXT PRIMARY KEY,
      workshop_id TEXT NOT NULL,
      registration_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);

    logger.info("Workshop tables ready");
  } catch (err) {
    logger.error({ err }, "createWorkshopTables failed");
  }
}

async function purgeInvalidScores() {
  try {
    const result = await db.execute(sql`
      DELETE FROM scores
      WHERE EXISTS (
        SELECT 1 FROM jsonb_each_text(normalized_scores) AS kv(k, v)
        WHERE v ~ '^-?[0-9]+(\.[0-9]+)?$' AND v::numeric > 100
      )
    `);
    if ((result.rowCount ?? 0) > 0) {
      logger.info({ count: result.rowCount }, "Purged scores with out-of-range normalized values (>100)");
    }
  } catch (err) {
    logger.error({ err }, "purgeInvalidScores failed");
  }
}

Promise.all([runMigrations(), seedIfEmpty(), syncUserEmails(), syncTools(), syncBatteries()])
  .then(() => backfillRespondentLabels())
  .then(() => migrateBehavObsToInvigilator())
  .then(() => reviseHIQForm())
  .then(() => reviseDYSRISKTalents())
  .then(() => reviseLASAForm())
  .then(() => reviseASRSForm())
  .then(() => reviseBFI44Form())
  .then(() => reviseYBOCSSCForm())
  .then(() => patchInstructionHeaders())
  .then(() => addVersionColumns())
  .then(() => addAssignmentToolVersionId())
  .then(() => addFormItemsSnapshotColumn())
  .then(() => addAssignmentMetadataColumn())
  .then(() => patchToolVersions())
  .then(() => applyBascHistoricalCorrection())
  .then(() => repairPendingCasesFromConsent())
  .then(() => addCoordinatorSupport())
  .then(() => syncAssignmentToolNames())
  .then(() => backfillRscaSnapshots())
  .then(() => addCaseProductIds())
  .then(() => purgeInvalidScores())
  .then(() => createRmraTables())
  .then(() => addRmraReportColumn())
  .then(() => createRmraAccessCodesTable())
  .then(() => ensureCaseModeColumn())
  .then(() => ensureRmraExaminerTokenColumn())
  .then(() => ensureRmraTimerStartedAtColumn())
  .then(() => ensureStudentAnswerColumn())
  .then(() => ensureRmraTaskResponseUniqueIndex())
  .then(() => createRamriTables())
  .then(() => createRaepaTables())
  .then(() => db.execute(sql`ALTER TABLE raepa_sessions ADD COLUMN IF NOT EXISTS teacher_upload_token TEXT`))
  .then(() => createInterviewRecordingsTable())
  .then(() => backfillBobbyAiCaseIds())
  .then(() => createLscTables())
  .then(() => createComplianceTables())
  .then(() => createTrainingTables())
  .then(() => createWorkshopTables())
  .then(() => ensureAirwallexWebhook())
  .then(() => {
  const server = app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
  setupWatchAlong(server);
});
