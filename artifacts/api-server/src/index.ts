import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable, assessmentToolsTable, batteriesTable, casesTable, assignmentsTable, responsesTable } from "@workspace/db/schema";
import type { ScoringConfig } from "@workspace/db/schema";
import { RCEP_CORE_FORM, BYI2_FORM, RCADS_FORM, SCAS_FORM, SCAS_P_FORM, RSCA_FORM, REFI_FORM, RERMS_FORM, BSPP_FORM, EFA_FORM, SPP_FORM, RSSC_FORM, RSCP_FORM, RARPS_FORM, RFII_FORM, REFERRAL_CORP_FORM, REFERRAL_UNI_FORM, REFERRAL_PARENT_FORM, REFERRAL_BOARDING_FORM, VADPRS_FORM, VADTRS_FORM, ABC_FORM, YBOCS_SC_FORM, BFI_44_FORM, ASRS_ADHD_FORM, TLPI_FORM, CONSENT_FORM } from "./lib/questions.js";
import { CDP_SR_FORM, CDP_CL_FORM, CDP_CI_FORM, CDP_SI_FORM } from "./lib/cdp.js";
import { BASC3_TRS_A_FORM, BASC3_PRS_A_FORM, BASC3_TRS_C_FORM, BASC3_PRS_C_FORM, BASC3_SRP_A_FORM, BASC3_SRP_C_FORM } from "./lib/basc3.js";
import { BRIEF2_PARENT_FORM, BRIEF2_SELF_FORM, BRIEF2_TEACHER_FORM } from "./lib/brief2.js";
import { SDQ_PARENT_FORM, SDQ_TEACHER_FORM, SDQ_SR_FORM, SDQ_P4_FORM, SDQ_P11_FORM, SDQ_T4_FORM, SDQ_T11_FORM, SDQ_SR11_FORM, SDQ_SR18_FORM, GHQ12_FORM, SMFQ_FORM, PSC_FORM, GAD7_FORM, PHQ9_FORM, PHQ9A_FORM, PSS10_FORM, DASS21_FORM, RSES_FORM, WHO5_FORM, AUDIT_FORM, CABS_FORM, FASM_FORM } from "./lib/opentools.js";
import { translateFormItemsWithAI } from "./lib/ai.js";
import { eq, sql, and, ne, or, isNull, isNotNull } from "drizzle-orm";
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
    name: "ReMynd Parental Consent Form",
    category: "ReMynd Admin Forms",
    description: "Bilingual parental consent form covering assessment, data privacy, and AI usage",
    isRemyndOwned: true,
    respondentTypes: ["parent"],
    scoringType: "manual",
    domains: [],
    formItems: CONSENT_FORM,
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
    scoringType: "manual",
    domains: ["boarding_adjustment", "emotional_distress", "social_functioning", "risk_behaviors", "strengths_and_resilience"],
    formItems: BSPP_FORM,
  },
  {
    id: "BEHAVOBS",
    name: "Assessment Behavior Observation",
    category: "behavior",
    description: "A systematic direct observation tool used to measure a student's active and passive engaged time, as well as off-task and disruptive behaviors, in a classroom setting. It is designed for school-aged children and is used by psychologists and educational professionals to assess academic engagement and behavior in the natural environment.",
    isRemyndOwned: true,
    respondentTypes: ["invigilator"],
    scoringType: null,
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
    scoringConfig: null,
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
    scoringConfig: null,
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
    scoringConfig: null,
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
    scoringConfig: null,
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
    scoringConfig: null,
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
    scoringConfig: null,
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
    scoringConfig: null,
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
    scoringConfig: null,
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
    scoringConfig: null,
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
          scoringType: tool.scoringType,
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
    // For every (case_id, respondent_type) that has exactly ONE distinct
    // non-empty respondent_label, copy that label onto any assignments in
    // the same group that were saved with a null or empty label.
    const unlabelled = await db
      .select({
        id: assignmentsTable.id,
        caseId: assignmentsTable.caseId,
        respondentType: assignmentsTable.respondentType,
      })
      .from(assignmentsTable)
      .where(or(isNull(assignmentsTable.respondentLabel), eq(assignmentsTable.respondentLabel, "")));

    for (const row of unlabelled) {
      const labelled = await db
        .selectDistinct({ label: assignmentsTable.respondentLabel })
        .from(assignmentsTable)
        .where(
          and(
            eq(assignmentsTable.caseId, row.caseId),
            eq(assignmentsTable.respondentType, row.respondentType),
            isNotNull(assignmentsTable.respondentLabel),
            ne(assignmentsTable.respondentLabel, ""),
          )
        );
      // Only backfill when there is exactly one distinct label — if there
      // are multiple (e.g. Teacher 1 and Teacher 2 for the same type) we
      // cannot safely guess which group this assignment belongs to.
      if (labelled.length === 1) {
        await db
          .update(assignmentsTable)
          .set({ respondentLabel: labelled[0].label })
          .where(eq(assignmentsTable.id, row.id));
      }
    }
    if (unlabelled.length > 0) {
      logger.info({ count: unlabelled.length }, "Backfilled respondent labels");
    }
  } catch (err) {
    logger.error({ err }, "backfillRespondentLabels failed");
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
  .then(() => repairPendingCasesFromConsent())
  .then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
