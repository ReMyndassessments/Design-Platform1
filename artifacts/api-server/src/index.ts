import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { usersTable, assessmentToolsTable, batteriesTable } from "@workspace/db/schema";
import type { ScoringConfig } from "@workspace/db/schema";
import { RCEP_CORE_FORM, BYI2_FORM, RCADS_FORM, SCAS_FORM, RSCA_FORM, REFI_FORM, RERMS_FORM, BSPP_FORM, EFA_FORM, SPP_FORM, RSSC_FORM } from "./lib/questions.js";
import { CDP_SR_FORM, CDP_CL_FORM, CDP_CI_FORM, CDP_SI_FORM } from "./lib/cdp.js";
import { BASC3_TRS_A_FORM, BASC3_PRS_A_FORM, BASC3_TRS_C_FORM, BASC3_PRS_C_FORM, BASC3_SRP_A_FORM, BASC3_SRP_C_FORM } from "./lib/basc3.js";
import { translateFormItemsWithAI } from "./lib/ai.js";
import { eq } from "drizzle-orm";
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
  {
    id: "BEHAVOBS",
    name: "Assessment Behavior Observation",
    category: "behavior",
    description: "A systematic direct observation tool used to measure a student's active and passive engaged time, as well as off-task and disruptive behaviors, in a classroom setting. It is designed for school-aged children and is used by psychologists and educational professionals to assess academic engagement and behavior in the natural environment.",
    isRemyndOwned: true,
    respondentTypes: ["invigilator"],
    scoringType: "auto",
    domains: ["academic_engagement", "off_task_behavior", "disruptive_behavior"],
    scoringConfig: { max: 4, domains: {}, thresholds: { low: 25, mild: 50, moderate: 65 } },
    formItems: [
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
];

const CANONICAL_IDS = CANONICAL_TOOLS.map(t => t.id as string);

const CDP_BATTERY_ID = "CDP";

// Silently translate a canonical tool and persist the result to the DB
async function autoTranslateCanonicalTool(toolId: string, formItems: any[]) {
  try {
    logger.info({ toolId }, "Auto-translating canonical tool");
    const translated = await translateFormItemsWithAI(formItems as any, { sequential: true });
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
          formItems: mergedItems ?? null,
        },
      });

      // Queue translation if any items are still missing Chinese/Korean
      if (mergedItems && itemsMissingTranslations(mergedItems)) {
        needsTranslation.push({ id: tool.id as string, items: mergedItems });
      }
    }

    logger.info({ count: CANONICAL_TOOLS.length }, "Assessment tools synced");

    // Run translations in the background — one at a time to avoid rate limits
    if (needsTranslation.length > 0) {
      (async () => {
        for (const { id, items } of needsTranslation) {
          await autoTranslateCanonicalTool(id, items);
        }
      })().catch(() => {/* already logged inside */});
    }
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

Promise.all([seedIfEmpty(), syncTools(), syncBatteries()]).then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
});
