import type { FormQuestion } from "./questions.js";

const CDP_SCALE    = ["Always", "Often", "Rarely", "Never"];
const CDP_SCALE_ZH = ["经常", "有时", "很少", "从不"];
const CDP_SCALE_KO = ["항상", "자주", "드물게", "전혀"];

const q = (id: string, text: string, zh: string, ko: string, domain: string, reversed = false): FormQuestion => ({
  id, text, textChinese: zh, textKorean: ko,
  type: "likert", options: CDP_SCALE, optionsChinese: CDP_SCALE_ZH, optionsKorean: CDP_SCALE_KO,
  domain, required: true, ...(reversed ? { reversed: true } : {}),
});

const hdr = (id: string, text: string, zh: string, ko: string, domain: string): FormQuestion => ({
  id, text, textChinese: zh, textKorean: ko,
  type: "section_header", domain, options: [], optionsChinese: [], optionsKorean: [],
});

const sub = (id: string, text: string, zh: string, ko: string, domain: string): FormQuestion => ({
  id, text, textChinese: zh, textKorean: ko,
  type: "section_header", domain, options: [], optionsChinese: [], optionsKorean: [], note: "subsection",
});

const ta = (id: string, text: string, zh: string, ko: string, domain: string): FormQuestion => ({
  id, text, textChinese: zh, textKorean: ko,
  type: "textarea", domain, options: [], optionsChinese: [], optionsKorean: [],
});

const instr = (
  id: string,
  text: string, textChinese: string, textKorean: string,
  note: string, noteChinese: string, noteKorean: string,
): FormQuestion => ({
  id, text, textChinese, textKorean,
  type: "section_header", domain: "admin",
  options: [], optionsChinese: [], optionsKorean: [],
  required: false, note, noteChinese, noteKorean,
});

// ─── CDP-SR: Self-Regulation and Executive Function Profile ──────────────────

export const CDP_SR_FORM: FormQuestion[] = [
  instr(
    "cdp_sr_instr",
    "CDP — Self-Regulation and Executive Function",
    "CDP — 自我调节与执行功能",
    "CDP — 자기 조절 및 실행 기능",
    "This assessment is completed by an educator or therapist who knows the learner well. For each item, rate how frequently the learner demonstrates the described behaviour in their typical learning and social environment.\n\nResponse scale: Always · Often · Rarely · Never",
    "本量表由了解学习者的教育者或治疗师填写。请根据学习者在典型学习和社交环境中的表现，评估每项行为出现的频率。\n\n回应选项：经常 · 有时 · 很少 · 从不",
    "이 평가는 학습자를 잘 아는 교육자 또는 치료사가 작성합니다. 학습자의 전형적인 학습 및 사회적 환경에서 각 행동이 얼마나 자주 나타나는지 평가해 주세요.\n\n응답 척도: 항상 · 자주 · 드물게 · 전혀",
  ),

  hdr("cdp_sr_s1_hdr", "Section 1: Managing Emotions", "第一节：情绪管理", "제1절: 감정 관리", "managing_emotions"),
  sub("cdp_sr_s1a_hdr", "Recognizing Emotions", "识别情绪", "감정 인식", "managing_emotions"),
  q("cdp_sr_s1_1", "Can the learner recognize and name their feelings and emotions?", "学习者能否识别并说出自己的感受和情绪？", "학습자는 자신의 감정과 정서를 인식하고 이름 붙일 수 있습니까?", "managing_emotions"),
  q("cdp_sr_s1_2", "Can the learner identify basic emotions (happiness, sadness, anger, fear, loneliness) in others?", "学习者能否识别他人的基本情绪（快乐、悲伤、愤怒、恐惧、孤独）？", "학습자는 타인의 기본 감정(행복, 슬픔, 분노, 두려움, 외로움)을 식별할 수 있습니까?", "managing_emotions"),
  q("cdp_sr_s1_3", "Can the learner express how they are feeling in given situations?", "学习者能否在特定情境中表达自己的感受？", "학습자는 주어진 상황에서 자신의 감정을 표현할 수 있습니까?", "managing_emotions"),
  sub("cdp_sr_s1b_hdr", "Emotional Appropriateness", "情绪适切性", "감정 적절성", "managing_emotions"),
  q("cdp_sr_s1_4", "Can the learner adjust their emotional responses to different environments (e.g., classroom vs playground)?", "学习者能否根据不同环境调整情绪反应（如课堂与操场）？", "학습자는 다양한 환경(예: 교실 vs 운동장)에 따라 감정 반응을 조절할 수 있습니까?", "managing_emotions"),
  q("cdp_sr_s1_5", "Can the learner recognize excessive emotional reactions in others?", "学习者能否识别他人过激的情绪反应？", "학습자는 타인의 과도한 감정 반응을 인식할 수 있습니까?", "managing_emotions"),
  q("cdp_sr_s1_6", "Can the learner identify how they should respond appropriately in a given scenario?", "学习者能否在特定情境中判断如何做出适切的回应？", "학습자는 주어진 상황에서 적절하게 반응하는 방법을 파악할 수 있습니까?", "managing_emotions"),
  sub("cdp_sr_s1r_hdr", "Strength Items", "优势项目", "강점 항목", "managing_emotions"),
  q("cdp_sr_s1_r1", "The learner generally remains calm even in challenging situations.", "即使在具有挑战性的情况下，学习者通常也能保持冷静。", "학습자는 어려운 상황에서도 일반적으로 침착함을 유지합니다.", "managing_emotions", true),
  q("cdp_sr_s1_r2", "The learner can independently calm themselves when upset.", "学习者在情绪激动时能独立使自己平静下来。", "학습자는 화가 날 때 스스로 진정할 수 있습니다.", "managing_emotions", true),

  hdr("cdp_sr_s2_hdr", "Section 2: Adaptive Behavior", "第二节：适应性行为", "제2절: 적응 행동", "adaptive_behavior"),
  sub("cdp_sr_s2a_hdr", "Recognizing Good and Bad Behavior", "识别良好与不良行为", "좋은 행동과 나쁜 행동 인식", "adaptive_behavior"),
  q("cdp_sr_s2_1", "Does the learner respond appropriately to praise?", "学习者能否对表扬做出适切回应？", "학습자는 칭찬에 적절하게 반응합니까?", "adaptive_behavior"),
  q("cdp_sr_s2_2", "Does the learner respond appropriately to guidance from familiar adults?", "学习者能否对熟悉的成人的引导做出适切回应？", "학습자는 친숙한 어른의 안내에 적절하게 반응합니까?", "adaptive_behavior"),
  q("cdp_sr_s2_3", "Can the learner recognize good or bad behavior in peers?", "学习者能否识别同伴的良好或不良行为？", "학습자는 또래의 좋은 행동이나 나쁜 행동을 인식할 수 있습니까?", "adaptive_behavior"),
  sub("cdp_sr_s2b_hdr", "Thinking About Own Behavior", "反思自身行为", "자신의 행동에 대한 사고", "adaptive_behavior"),
  q("cdp_sr_s2_4", "Can the learner follow appropriate classroom behavior (listening, following instructions, remaining seated)?", "学习者能否遵守适当的课堂行为规范（倾听、遵从指令、保持就座）？", "학습자는 적절한 수업 행동(듣기, 지시 따르기, 앉아 있기)을 따를 수 있습니까?", "adaptive_behavior"),
  q("cdp_sr_s2_5", "Can the learner self-monitor and reflect on their own behavior?", "学习者能否自我监控并反思自己的行为？", "학습자는 자신의 행동을 스스로 모니터링하고 반성할 수 있습니까?", "adaptive_behavior"),
  sub("cdp_sr_s2r_hdr", "Strength Items", "优势项目", "강점 항목", "adaptive_behavior"),
  q("cdp_sr_s2_r1", "The learner demonstrates consistent self-control across different settings.", "学习者在不同环境中表现出一贯的自我控制能力。", "학습자는 다양한 환경에서 일관된 자기 통제력을 보여줍니다.", "adaptive_behavior", true),
  q("cdp_sr_s2_r2", "The learner proactively corrects inappropriate behavior without adult prompting.", "学习者无需成人提示便能主动纠正不当行为。", "학습자는 어른의 촉구 없이 스스로 부적절한 행동을 교정합니다.", "adaptive_behavior", true),

  hdr("cdp_sr_s3_hdr", "Section 3: Managing Stress", "第三节：管理压力", "제3절: 스트레스 관리", "managing_stress"),
  sub("cdp_sr_s3a_hdr", "Recognizing Stress Triggers", "识别压力触发因素", "스트레스 유발 요인 인식", "managing_stress"),
  q("cdp_sr_s3_1", "Can the learner identify situations that make them anxious or stressed?", "学习者能否识别令自己感到焦虑或有压力的情境？", "학습자는 불안하거나 스트레스를 받는 상황을 파악할 수 있습니까?", "managing_stress"),
  q("cdp_sr_s3_2", "Can the learner articulate feelings of anxiety or worry to a familiar adult?", "学习者能否向熟悉的成人表达焦虑或担忧的感受？", "학습자는 친숙한 어른에게 불안이나 걱정의 감정을 표현할 수 있습니까?", "managing_stress"),
  sub("cdp_sr_s3b_hdr", "Coping Strategies", "应对策略", "대처 전략", "managing_stress"),
  q("cdp_sr_s3_3", "Can the learner use learned coping strategies when stressed (e.g., deep breaths, happy thoughts)?", "学习者在压力下能否运用所学的应对策略（如深呼吸、积极思考）？", "학습자는 스트레스를 받을 때 배운 대처 전략(예: 심호흡, 긍정적 생각)을 사용할 수 있습니까?", "managing_stress"),
  q("cdp_sr_s3_4", "Can the learner seek comfort from a familiar adult when feeling anxious?", "学习者在焦虑时能否向熟悉的成人寻求安慰？", "학습자는 불안할 때 친숙한 어른에게 위안을 구할 수 있습니까?", "managing_stress"),
  q("cdp_sr_s3_5", "Can the learner use visual prompts or reminders to manage stress?", "学习者能否利用视觉提示或提醒来管理压力？", "학습자는 스트레스를 관리하기 위해 시각적 단서나 알림을 활용할 수 있습니까?", "managing_stress"),
  sub("cdp_sr_s3r_hdr", "Strength Items", "优势项目", "강점 항목", "managing_stress"),
  q("cdp_sr_s3_r1", "The learner can independently manage mild stressors without adult intervention.", "学习者能够在没有成人介入的情况下独立处理轻度压力。", "학습자는 어른의 개입 없이 경미한 스트레스 요인을 스스로 관리할 수 있습니다.", "managing_stress", true),
  q("cdp_sr_s3_r2", "The learner maintains focus on tasks even when slightly anxious.", "即使有些焦虑，学习者仍能保持对任务的专注。", "학습자는 약간 불안할 때도 과제에 집중력을 유지합니다.", "managing_stress", true),

  hdr("cdp_sr_s4_hdr", "Section 4: Coping with Change", "第四节：应对变化", "제4절: 변화에 대처하기", "coping_with_change"),
  sub("cdp_sr_s4a_hdr", "Home to School Transitions", "从家庭到学校的过渡", "가정-학교 전환", "coping_with_change"),
  q("cdp_sr_s4_1", "Can the learner manage transport independently without excessive anxiety?", "学习者能否在没有过度焦虑的情况下独立乘坐交通工具？", "학습자는 과도한 불안 없이 교통수단을 스스로 이용할 수 있습니까?", "coping_with_change"),
  q("cdp_sr_s4_2", "Can the learner transition between home and school routines smoothly?", "学习者能否顺利完成家庭与学校日常之间的过渡？", "학습자는 가정과 학교 일과 사이를 원활하게 전환할 수 있습니까?", "coping_with_change"),
  sub("cdp_sr_s4b_hdr", "Lesson or Activity Changes", "课程或活动变化", "수업 또는 활동 변경", "coping_with_change"),
  q("cdp_sr_s4_3", "Can the learner transition between lessons or activities without distress?", "学习者能否在课程或活动之间顺利过渡而不感到困扰？", "학습자는 수업이나 활동 간에 불편함 없이 전환할 수 있습니까?", "coping_with_change"),
  q("cdp_sr_s4_4", "Can the learner anticipate upcoming changes with visual or verbal prompts?", "学习者能否借助视觉或言语提示来预期即将到来的变化？", "학습자는 시각적 또는 언어적 단서를 통해 다가오는 변화를 예상할 수 있습니까?", "coping_with_change"),
  sub("cdp_sr_s4c_hdr", "Understanding Worries", "理解担忧", "걱정 이해하기", "coping_with_change"),
  q("cdp_sr_s4_5", "Can the learner understand the concepts of \"worried\" and \"scared\" for themselves?", "学习者能否理解自身所感受的\"担忧\"和\"害怕\"的概念？", "학습자는 자신이 느끼는 '걱정'과 '무서움'의 개념을 이해할 수 있습니까?", "coping_with_change"),
  q("cdp_sr_s4_6", "Can the learner identify \"worried\" or \"scared\" feelings in others?", "学习者能否识别他人\"担忧\"或\"害怕\"的感受？", "학습자는 타인의 '걱정'하거나 '무서워하는' 감정을 식별할 수 있습니까?", "coping_with_change"),
  q("cdp_sr_s4_7", "Can the learner recognize these feelings in fictional or cartoon characters?", "学习者能否在虚构或卡通人物中识别这些感受？", "학습자는 허구 또는 만화 캐릭터에서 이러한 감정을 인식할 수 있습니까?", "coping_with_change"),
  sub("cdp_sr_s4r_hdr", "Strength Items", "优势项目", "강점 항목", "coping_with_change"),
  q("cdp_sr_s4_r1", "The learner adjusts quickly to unexpected changes in routine.", "学习者能够快速适应日常规律中的意外变化。", "학습자는 일상 루틴의 예상치 못한 변화에 빠르게 적응합니다.", "coping_with_change", true),
  q("cdp_sr_s4_r2", "The learner remains calm and focused when transitions are sudden.", "当过渡突然发生时，学习者仍能保持冷静和专注。", "갑작스러운 전환이 일어날 때도 학습자는 침착하고 집중된 상태를 유지합니다.", "coping_with_change", true),

  hdr("cdp_sr_s5_hdr", "Section 5: Physical and Mental Wellness", "第五节：身心健康", "제5절: 신체 및 정신 건강", "physical_wellness"),
  sub("cdp_sr_s5a_hdr", "Self-Care and Health Awareness", "自我照护与健康意识", "자기 관리 및 건강 인식", "physical_wellness"),
  q("cdp_sr_s5_1", "Does the learner seek attention for basic needs (food, drink, toilet)?", "学习者是否会寻求满足基本需求（食物、饮水、如厕）的帮助？", "학습자는 기본적인 필요(음식, 음료, 화장실)를 위해 도움을 구합니까?", "physical_wellness"),
  q("cdp_sr_s5_2", "Can the learner indicate the source of discomfort or pain?", "学习者能否指出不适或疼痛的来源？", "학습자는 불편함이나 통증의 원인을 나타낼 수 있습니까?", "physical_wellness"),
  sub("cdp_sr_s5b_hdr", "Nutrition and Food Acceptance", "营养与食物接受度", "영양 및 음식 수용도", "physical_wellness"),
  q("cdp_sr_s5_3", "Can the learner eat preferred foods in unfamiliar settings?", "学习者能否在不熟悉的环境中进食偏好的食物？", "학습자는 낯선 환경에서 선호하는 음식을 먹을 수 있습니까?", "physical_wellness"),
  q("cdp_sr_s5_4", "Can the learner try familiar foods prepared differently (boiled, fried, steamed)?", "学习者能否尝试以不同方式烹饪的熟悉食物（水煮、油炸、清蒸）？", "학습자는 다양한 방식(삶기, 튀기기, 찌기)으로 조리된 익숙한 음식을 시도할 수 있습니까?", "physical_wellness"),
  q("cdp_sr_s5_5", "Is the learner willing to try new foods?", "学习者是否愿意尝试新食物？", "학습자는 새로운 음식을 시도하려는 의지가 있습니까?", "physical_wellness"),
  q("cdp_sr_s5_6", "Does the learner recognize when they are full and have eaten enough?", "学习者是否能意识到自己已经吃饱？", "학습자는 자신이 배부르고 충분히 먹었을 때를 인식합니까?", "physical_wellness"),
  sub("cdp_sr_s5c_hdr", "Physical Activity", "体育活动", "신체 활동", "physical_wellness"),
  q("cdp_sr_s5_7", "Does the learner engage in physical activity at least 3 times a week?", "学习者是否每周至少参与三次体育活动？", "학습자는 주 3회 이상 신체 활동에 참여합니까?", "physical_wellness"),
  q("cdp_sr_s5_8", "Can the learner participate in noisy play or group physical activities?", "学习者能否参与嘈杂的游戏或集体体育活动？", "학습자는 소란스러운 놀이나 집단 신체 활동에 참여할 수 있습니까?", "physical_wellness"),
  q("cdp_sr_s5_9", "Can the learner replicate a sequence of movements (throw, catch, jump)?", "学习者能否重复一系列动作（投掷、接球、跳跃）？", "학습자는 일련의 동작(던지기, 받기, 점프)을 모방할 수 있습니까?", "physical_wellness"),
  sub("cdp_sr_s5r_hdr", "Strength Items", "优势项目", "강점 항목", "physical_wellness"),
  q("cdp_sr_s5_r1", "The learner independently maintains personal hygiene and self-care routines.", "学习者能独立保持个人卫生和自我照护习惯。", "학습자는 개인 위생과 자기 관리 루틴을 스스로 유지합니다.", "physical_wellness", true),
  q("cdp_sr_s5_r2", "The learner demonstrates awareness of physical wellness needs without prompts.", "学习者无需提示便能表现出对身体健康需求的意识。", "학습자는 촉구 없이 신체 건강 필요에 대한 인식을 보여줍니다.", "physical_wellness", true),

  hdr("cdp_sr_s6_hdr", "Section 6: Social Interaction and Social Awareness", "第六节：社交互动与社会意识", "제6절: 사회적 상호작용 및 사회적 인식", "social_interaction"),
  sub("cdp_sr_s6a_hdr", "Peer Interaction", "同伴互动", "또래 상호작용", "social_interaction"),
  q("cdp_sr_s6_1", "Does the learner initiate interaction with peers appropriately?", "学习者是否能适切地主动与同伴互动？", "학습자는 또래와의 상호작용을 적절하게 시작합니까?", "social_interaction"),
  q("cdp_sr_s6_2", "Can the learner respond to peers' social cues?", "学习者能否回应同伴的社交信号？", "학습자는 또래의 사회적 신호에 반응할 수 있습니까?", "social_interaction"),
  q("cdp_sr_s6_3", "Can the learner resolve minor peer conflicts with minimal adult support?", "学习者能否在极少成人协助下解决轻微的同伴冲突？", "학습자는 최소한의 어른 지원으로 경미한 또래 갈등을 해결할 수 있습니까?", "social_interaction"),
  sub("cdp_sr_s6b_hdr", "Social Presence", "社交表现", "사회적 존재감", "social_interaction"),
  q("cdp_sr_s6_4", "Does the learner maintain appropriate eye contact in social situations?", "学习者在社交情境中是否能保持适当的眼神接触？", "학습자는 사회적 상황에서 적절한 눈 맞춤을 유지합니까?", "social_interaction"),
  q("cdp_sr_s6_5", "Can the learner adapt communication style depending on the social context?", "学习者能否根据社交情境调整沟通方式？", "학습자는 사회적 맥락에 따라 의사소통 방식을 조절할 수 있습니까?", "social_interaction"),
  sub("cdp_sr_s6r_hdr", "Strength Items", "优势项目", "강점 항목", "social_interaction"),
  q("cdp_sr_s6_r1", "The learner shows empathy and consideration for peers without adult prompting.", "学习者无需成人提示便能表现出对同伴的共情和体贴。", "학습자는 어른의 촉구 없이 또래에 대한 공감과 배려를 보여줍니다.", "social_interaction", true),
  q("cdp_sr_s6_r2", "The learner participates positively in group activities consistently.", "学习者能持续积极地参与集体活动。", "학습자는 집단 활동에 지속적으로 긍정적으로 참여합니다.", "social_interaction", true),

  hdr("cdp_sr_s7_hdr", "Section 7: Executive Functioning", "第七节：执行功能", "제7절: 실행 기능", "executive_functioning"),
  sub("cdp_sr_s7a_hdr", "Planning and Organization", "计划与组织", "계획 및 조직화", "executive_functioning"),
  q("cdp_sr_s7_1", "Can the learner organize tasks and materials independently?", "学习者能否独立整理任务和材料？", "학습자는 과제와 자료를 스스로 정리할 수 있습니까?", "executive_functioning"),
  q("cdp_sr_s7_2", "Can the learner follow multi-step instructions accurately?", "学习者能否准确执行多步骤指令？", "학습자는 여러 단계의 지시를 정확하게 따를 수 있습니까?", "executive_functioning"),
  q("cdp_sr_s7_3", "Can the learner anticipate challenges and plan ahead?", "学习者能否预见挑战并提前计划？", "학습자는 어려움을 예상하고 미리 계획할 수 있습니까?", "executive_functioning"),
  sub("cdp_sr_s7b_hdr", "Working Memory", "工作记忆", "작업 기억", "executive_functioning"),
  q("cdp_sr_s7_4", "Can the learner remember information necessary for tasks or instructions?", "学习者能否记住完成任务或指令所需的信息？", "학습자는 과제나 지시에 필요한 정보를 기억할 수 있습니까?", "executive_functioning"),
  q("cdp_sr_s7_5", "Can the learner recall previously learned strategies to complete new tasks?", "学习者能否调用以前学过的策略来完成新任务？", "학습자는 이전에 배운 전략을 떠올려 새로운 과제를 완수할 수 있습니까?", "executive_functioning"),
  sub("cdp_sr_s7c_hdr", "Flexibility", "灵活性", "유연성", "executive_functioning"),
  q("cdp_sr_s7_6", "Can the learner shift strategies if the initial approach is unsuccessful?", "如果初始方法不奏效，学习者能否转换策略？", "초기 접근 방법이 효과가 없을 때 학습자는 전략을 바꿀 수 있습니까?", "executive_functioning"),
  q("cdp_sr_s7_7", "Can the learner adapt to new rules or routines without frustration?", "学习者能否在不感到沮丧的情况下适应新规则或日常规律？", "학습자는 좌절감 없이 새로운 규칙이나 일과에 적응할 수 있습니까?", "executive_functioning"),
  sub("cdp_sr_s7r_hdr", "Strength Items", "优势项目", "강점 항목", "executive_functioning"),
  q("cdp_sr_s7_r1", "The learner independently sets achievable goals and monitors progress.", "学习者能独立设定可实现的目标并监控进度。", "학습자는 달성 가능한 목표를 스스로 설정하고 진행 상황을 모니터링합니다.", "executive_functioning", true),
  q("cdp_sr_s7_r2", "The learner completes tasks efficiently without external prompts.", "学习者无需外部提示便能高效完成任务。", "학습자는 외부 촉구 없이 효율적으로 과제를 완수합니다.", "executive_functioning", true),

  hdr("cdp_sr_s8_hdr", "Section 8: Metacognition and Self-Monitoring", "第八节：元认知与自我监控", "제8절: 메타인지 및 자기 모니터링", "metacognition"),
  q("cdp_sr_s8_1", "Can the learner evaluate the success of their own work?", "学习者能否评估自己工作的成效？", "학습자는 자신의 작업 성과를 평가할 수 있습니까?", "metacognition"),
  q("cdp_sr_s8_2", "Can the learner recognize errors and self-correct?", "学习者能否识别错误并自我纠正？", "학습자는 오류를 인식하고 스스로 수정할 수 있습니까?", "metacognition"),
  q("cdp_sr_s8_3", "Can the learner set personal goals for behavior or learning?", "学习者能否为自己的行为或学习设定个人目标？", "학습자는 행동이나 학습을 위한 개인 목표를 설정할 수 있습니까?", "metacognition"),
  q("cdp_sr_s8_4", "Can the learner reflect on strengths and weaknesses?", "学习者能否反思自身的优势与不足？", "학습자는 자신의 강점과 약점을 되돌아볼 수 있습니까?", "metacognition"),
  sub("cdp_sr_s8r_hdr", "Strength Items", "优势项目", "강점 항목", "metacognition"),
  q("cdp_sr_s8_r1", "The learner independently reflects on personal progress and adjusts strategies.", "学习者能独立反思个人进步并调整策略。", "학습자는 개인적 진전을 스스로 되돌아보고 전략을 조정합니다.", "metacognition", true),
  q("cdp_sr_s8_r2", "The learner demonstrates awareness of their own learning style and preferences.", "学习者表现出对自身学习方式和偏好的了解。", "학습자는 자신의 학습 방식과 선호도에 대한 인식을 보여줍니다.", "metacognition", true),

  hdr("cdp_sr_s9_hdr", "Section 9: Open-Ended Observations", "第九节：开放式观察", "제9절: 개방형 관찰", "observations"),
  ta("cdp_sr_s9_notes", "Teacher/Assessor Notes: Please provide brief notes on strengths, areas of concern, and strategies that work well with the learner.", "教师/评估者备注：请简要记录学习者的优势、关注领域及有效策略。", "교사/평가자 메모: 학습자의 강점, 우려 사항 및 효과적인 전략에 대한 간략한 메모를 제공해 주세요.", "observations"),
];

// ─── CDP-CL: Cognition & Learning Domain ────────────────────────────────────

export const CDP_CL_FORM: FormQuestion[] = [
  instr(
    "cdp_cl_instr",
    "CDP — Cognition & Learning",
    "CDP — 认知与学习",
    "CDP — 인지 및 학습",
    "This assessment is completed by an educator or therapist who knows the learner well. For each item, rate how frequently the learner demonstrates the described behaviour in their typical learning and social environment.\n\nResponse scale: Always · Often · Rarely · Never",
    "本量表由了解学习者的教育者或治疗师填写。请根据学习者在典型学习和社交环境中的表现，评估每项行为出现的频率。\n\n回应选项：经常 · 有时 · 很少 · 从不",
    "이 평가는 학습자를 잘 아는 교육자 또는 치료사가 작성합니다. 학습자의 전형적인 학습 및 사회적 환경에서 각 행동이 얼마나 자주 나타나는지 평가해 주세요.\n\n응답 척도: 항상 · 자주 · 드물게 · 전혀",
  ),

  hdr("cdp_cl_d1_hdr", "Domain 1: Organization, Planning & Task Initiation", "领域一：组织、计划与任务启动", "영역 1: 조직, 계획 및 과제 시작", "organization_planning"),
  q("cdp_cl_d1_1", "Can the learner prepare appropriately by collecting required items for an activity?", "学习者能否通过收集所需物品为活动做好准备？", "학습자는 활동에 필요한 물품을 수집하여 적절히 준비할 수 있습니까?", "organization_planning"),
  q("cdp_cl_d1_2", "Does the learner respond appropriately to a warning call to transition to a new activity?", "学习者是否能对转换至新活动的提示做出适切反应？", "학습자는 새로운 활동으로 전환하라는 예고에 적절하게 반응합니까?", "organization_planning"),
  q("cdp_cl_d1_3", "Can the learner sequence their activities according to the timetable (e.g., Math, then Science, then lunch)?", "学习者能否按照时间表安排活动顺序（如数学、科学、午餐）？", "학습자는 시간표에 따라 활동 순서를 정할 수 있습니까(예: 수학, 과학, 점심)?", "organization_planning"),
  q("cdp_cl_d1_4", "Is the learner able to carry out an activity in the correct sequence without prompting (e.g., turn on tap, wet hands, add soap)?", "学习者是否能在没有提示的情况下按正确顺序完成活动（如开水龙头、湿润双手、涂肥皂）？", "학습자는 촉구 없이 올바른 순서로 활동을 수행할 수 있습니까(예: 수도꼭지 켜기, 손 적시기, 비누 바르기)?", "organization_planning"),
  q("cdp_cl_d1_5", "Can the learner entertain themselves whilst waiting?", "学习者在等待时能否自行娱乐？", "학습자는 기다리는 동안 스스로 즐길 수 있습니까?", "organization_planning"),
  q("cdp_cl_d1_6", "Does the learner understand that they can independently make simple choices relevant to activities of daily living (e.g., what to wear today)?", "学习者是否理解自己可以独立做出与日常生活相关的简单选择（如今天穿什么）？", "학습자는 일상생활과 관련된 간단한 선택(예: 오늘 무엇을 입을지)을 스스로 할 수 있다는 것을 이해합니까?", "organization_planning"),
  q("cdp_cl_d1_7", "Does the learner understand the concept of making 'a choice' (e.g., choosing which flavor ice cream)?", "学习者是否理解\"做选择\"的概念（如选择冰淇淋口味）？", "학습자는 '선택을 하는' 개념을 이해합니까(예: 아이스크림 맛 선택)?", "organization_planning"),
  q("cdp_cl_d1_8", "If the learner makes a choice, can they give one reason?", "如果学习者做出选择，他们能否给出一个理由？", "학습자가 선택을 할 때, 한 가지 이유를 제시할 수 있습니까?", "organization_planning"),
  q("cdp_cl_d1_9", "Can the learner identify steps to solve a simple problem with adult support?", "学习者能否在成人支持下找出解决简单问题的步骤？", "학습자는 어른의 지원을 받아 간단한 문제를 해결하는 단계를 파악할 수 있습니까?", "organization_planning"),
  q("cdp_cl_d1_10", "Can the learner explain the problem to an adult (e.g., 'I need to move a box and it is too heavy')?", "学习者能否向成人解释问题（如\"我需要搬一个箱子，但它太重了\"）？", "학습자는 어른에게 문제를 설명할 수 있습니까(예: '상자를 옮겨야 하는데 너무 무거워요')?", "organization_planning"),
  q("cdp_cl_d1_11", "Can the learner use time wisely and plan important tasks (e.g., homework before TV)?", "学习者能否合理利用时间并规划重要任务（如先做作业再看电视）？", "학습자는 시간을 현명하게 사용하고 중요한 과제를 계획할 수 있습니까(예: TV 시청 전 숙제)?", "organization_planning"),
  q("cdp_cl_d1_12", "Does the learner use break time appropriately (e.g., going to the toilet or getting a drink during break, not after the bell)?", "学习者是否能合理利用休息时间（如在课间上厕所或取水，而非铃响后）？", "학습자는 휴식 시간을 적절하게 활용합니까(예: 종이 울린 후가 아닌 쉬는 시간에 화장실 가기 또는 음료 마시기)?", "organization_planning"),
  q("cdp_cl_d1_13", "Can the learner make a decision in a reasonable length of time (e.g., what to have for lunch or what they want for their birthday)?", "学习者能否在合理的时间内做出决定（如午餐吃什么或生日礼物想要什么）？", "학습자는 적절한 시간 내에 결정을 내릴 수 있습니까(예: 점심 메뉴 또는 생일 선물 선택)?", "organization_planning"),
  q("cdp_cl_d1_14", "Will the learner independently start a task and decide independently what they want to do?", "学习者是否会独立开始一项任务并自主决定想做什么？", "학습자는 과제를 스스로 시작하고 하고 싶은 것을 독립적으로 결정합니까?", "organization_planning"),
  q("cdp_cl_d1_15", "Can the learner sequence information in order of importance?", "学习者能否按重要性顺序排列信息？", "학습자는 중요도 순서에 따라 정보를 정리할 수 있습니까?", "organization_planning"),
  q("cdp_cl_d1_16", "Does the learner recognize that it is their responsibility to manage homework and seek support where necessary?", "学习者是否认识到管理家庭作业并在必要时寻求支持是自己的责任？", "학습자는 숙제를 관리하고 필요한 경우 도움을 구하는 것이 자신의 책임임을 인식합니까?", "organization_planning"),
  q("cdp_cl_d1_17", "Can the learner prioritize which homework to do in order to meet deadlines?", "学习者能否优先安排作业，以便按时完成？", "학습자는 기한을 맞추기 위해 어떤 숙제를 먼저 할지 우선순위를 정할 수 있습니까?", "organization_planning"),
  q("cdp_cl_d1_18", "Does the learner have a framework for setting short-term goals (e.g., finishing a homework task)?", "学习者是否具有设定短期目标的框架（如完成一项家庭作业）？", "학습자는 단기 목표(예: 숙제 완료)를 설정하는 체계가 있습니까?", "organization_planning"),
  q("cdp_cl_d1_19", "Does the learner have a framework for setting long-term goals (e.g., choosing a career)?", "学习者是否具有设定长期目标的框架（如选择职业）？", "학습자는 장기 목표(예: 직업 선택)를 설정하는 체계가 있습니까?", "organization_planning"),
  q("cdp_cl_d1_20", "Can the learner plan an activity and carry it out to completion?", "学习者能否规划一项活动并将其完成？", "학습자는 활동을 계획하고 완수할 수 있습니까?", "organization_planning"),
  q("cdp_cl_d1_21", "Can the learner create and complete a plan effectively without procrastinating?", "学习者能否有效制定并完成计划而不拖延？", "학습자는 미루지 않고 효과적으로 계획을 수립하고 완수할 수 있습니까?", "organization_planning"),
  q("cdp_cl_d1_22", "Can the learner identify what resources they need to reach their goal (e.g., people, money, and time)?", "学习者能否找出实现目标所需的资源（如人力、金钱、时间）？", "학습자는 목표를 달성하는 데 필요한 자원(예: 사람, 돈, 시간)을 파악할 수 있습니까?", "organization_planning"),

  hdr("cdp_cl_d2_hdr", "Domain 2: Working Memory, Attention & Processing", "领域二：工作记忆、注意力与信息处理", "영역 2: 작업 기억, 주의력 및 처리", "working_memory"),
  q("cdp_cl_d2_1", "Can the learner recall details from a short story in at least 5 sentences?", "学习者能否用至少五句话回忆短故事中的细节？", "학습자는 짧은 이야기의 세부 내용을 최소 5문장으로 회상할 수 있습니까?", "working_memory"),
  q("cdp_cl_d2_2", "Does the learner understand what they have been asked to do without prompting?", "学习者是否能在没有提示的情况下理解被要求做什么？", "학습자는 촉구 없이 자신이 무엇을 해야 하는지 이해합니까?", "working_memory"),
  q("cdp_cl_d2_3", "Can the learner predict what might happen next in a story or activity?", "学习者能否预测故事或活动中接下来会发生什么？", "학습자는 이야기나 활동에서 다음에 일어날 일을 예측할 수 있습니까?", "working_memory"),
  q("cdp_cl_d2_4", "Does the learner attempt to fill in missing information from a known task (e.g., flour is missing from a pancake recipe)?", "学习者是否会尝试补全已知任务中缺失的信息（如煎饼食谱中缺少面粉）？", "학습자는 알려진 과제에서 누락된 정보를 채우려고 시도합니까(예: 팬케이크 레시피에서 밀가루 누락)?", "working_memory"),
  q("cdp_cl_d2_5", "Does the learner understand terms such as 'later', 'before', 'after', 'next' and 'then'?", "学习者是否理解\"之后\"、\"之前\"、\"以后\"、\"接下来\"和\"然后\"等词语？", "학습자는 '나중에', '전에', '후에', '다음에', '그 다음'과 같은 용어를 이해합니까?", "working_memory"),
  q("cdp_cl_d2_6", "Does the learner understand that some events take longer than others (e.g., making dinner takes longer than getting a snack)?", "学习者是否理解某些事情比其他事情花费更多时间（如做晚餐比取零食耗时更长）？", "학습자는 어떤 일이 다른 것보다 더 오래 걸린다는 것을 이해합니까(예: 저녁 만들기가 간식 가져오기보다 오래 걸림)?", "working_memory"),
  q("cdp_cl_d2_7", "Can the learner recognize that there is a problem?", "学习者能否认识到存在问题？", "학습자는 문제가 있다는 것을 인식할 수 있습니까?", "working_memory"),
  q("cdp_cl_d2_8", "Does the learner recognize when they can't do something?", "学习者是否能意识到自己无法做某件事？", "학습자는 자신이 어떤 것을 할 수 없을 때를 인식합니까?", "working_memory"),
  q("cdp_cl_d2_9", "Can the learner use new information to adjust their understanding of a concept or story?", "学习者能否利用新信息调整对某个概念或故事的理解？", "학습자는 새로운 정보를 활용하여 개념이나 이야기에 대한 이해를 조정할 수 있습니까?", "working_memory"),
  q("cdp_cl_d2_10", "Does the learner use strategies for memorizing (e.g., repeating, chunking, associating)?", "学习者是否使用记忆策略（如复述、组块、联想）？", "학습자는 암기 전략(예: 반복, 묶음, 연상)을 사용합니까?", "working_memory"),
  q("cdp_cl_d2_11", "Can the learner use visualization as a strategy (e.g., mentally build a picture of a story and then describe it)?", "学习者能否将可视化作为策略（如在脑中构建故事画面然后描述）？", "학습자는 시각화를 전략으로 활용할 수 있습니까(예: 이야기의 장면을 머릿속으로 구성하고 설명하기)?", "working_memory"),
  q("cdp_cl_d2_12", "Can the learner ignore unimportant or irrelevant information in written and spoken narratives?", "学习者能否在书面或口头叙述中忽略不重要或无关的信息？", "학습자는 글이나 말로 된 이야기에서 중요하지 않거나 관련 없는 정보를 무시할 수 있습니까?", "working_memory"),
  q("cdp_cl_d2_13", "Can the learner inform an adult or peer if they do not understand instructions and ask for clarification?", "如果学习者不理解指令，能否向成人或同伴说明并寻求澄清？", "학습자는 지시를 이해하지 못할 때 어른이나 또래에게 알리고 확인을 요청할 수 있습니까?", "working_memory"),

  hdr("cdp_cl_d3_hdr", "Domain 3: Reasoning, Problem Solving & Cognitive Flexibility", "领域三：推理、问题解决与认知灵活性", "영역 3: 추론, 문제 해결 및 인지 유연성", "reasoning"),
  q("cdp_cl_d3_1", "Can the learner sequence numbers up to 100?", "学习者能否对100以内的数字进行排序？", "학습자는 100까지 숫자를 순서대로 나열할 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_2", "Can the learner order items by size and quantities?", "学习者能否按大小和数量排列物品？", "학습자는 크기와 수량에 따라 물건을 정렬할 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_3", "Can the learner compare two numbers and work out which number is larger?", "学习者能否比较两个数字并判断哪个更大？", "학습자는 두 숫자를 비교하여 어느 것이 더 큰지 알아낼 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_4", "Can the learner divide things in groups, in half, or a quarter in order to share (e.g., pizza)?", "学习者能否将物品分成若干组、分成一半或四分之一以便分享（如披萨）？", "학습자는 물건을 나누기 위해 여러 그룹, 반, 또는 4분의 1로 나눌 수 있습니까(예: 피자)?", "reasoning"),
  q("cdp_cl_d3_5", "Can the learner complete addition and subtraction?", "学习者能否完成加减法运算？", "학습자는 덧셈과 뺄셈을 수행할 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_6", "Can the learner recognize coins by face value?", "学习者能否按面值识别硬币？", "학습자는 액면가로 동전을 식별할 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_7", "Can the learner apply their knowledge and test it (e.g., watering one plant and not another, or testing torches to find the brightest)?", "学习者能否应用并验证自己的知识（如给一株植物浇水而另一株不浇，或测试手电筒找出最亮的）？", "학습자는 지식을 적용하고 검증할 수 있습니까(예: 한 식물에만 물 주기, 또는 손전등을 테스트하여 가장 밝은 것 찾기)?", "reasoning"),
  q("cdp_cl_d3_8", "Does the learner make choices based on their previous experience?", "学习者是否根据以往经验做出选择？", "학습자는 이전 경험을 바탕으로 선택을 합니까?", "reasoning"),
  q("cdp_cl_d3_9", "If the learner makes a poor decision, can they accept guidance to rectify the situation?", "如果学习者做出了不当决定，他们能否接受指导来纠正情况？", "학습자가 잘못된 결정을 내렸을 때, 상황을 바로잡기 위한 안내를 받아들일 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_10", "Can the learner adapt their intention in response to ideas offered by others?", "学习者能否根据他人提出的想法调整自己的意图？", "학습자는 다른 사람이 제시한 아이디어에 따라 자신의 의도를 조정할 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_11", "Does the learner understand when to use a skill in a new situation?", "学习者是否理解何时在新情境中应用某项技能？", "학습자는 새로운 상황에서 언제 특정 기술을 사용해야 하는지 이해합니까?", "reasoning"),
  q("cdp_cl_d3_12", "Can the learner use alternative strategies when they face difficulties (e.g., asking for clarification or trying a different approach)?", "学习者在遇到困难时能否使用替代策略（如寻求澄清或尝试不同方法）？", "학습자는 어려움에 직면했을 때 대안적 전략을 사용할 수 있습니까(예: 설명 요청하기 또는 다른 방법 시도하기)?", "reasoning"),
  q("cdp_cl_d3_13", "Can the learner persist at solving a problem when it gets more difficult?", "当问题变得更困难时，学习者能否坚持解决？", "학습자는 문제가 더 어려워질 때 계속 해결하려고 노력합니까?", "reasoning"),
  q("cdp_cl_d3_14", "Can the learner identify the main idea or problem?", "学习者能否找出主要想法或问题？", "학습자는 주요 아이디어나 문제를 파악할 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_15", "Can the learner consider a number of possibilities to solve a problem?", "学习者能否考虑多种可能性来解决问题？", "학습자는 문제를 해결하기 위해 여러 가능성을 고려할 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_16", "Can the learner break down the information about the problem?", "学习者能否分析问题的相关信息？", "학습자는 문제에 관한 정보를 분석할 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_17", "Can the learner critically evaluate their approach to solving a problem and identify what they could have done better?", "学习者能否批判性地评估自己解决问题的方法，并找出可以改进之处？", "학습자는 문제 해결 방법을 비판적으로 평가하고 더 잘할 수 있었던 점을 파악할 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_18", "Is the learner able to anticipate the pitfalls of their decisions?", "学习者是否能预见自己决策的潜在陷阱？", "학습자는 자신의 결정에 따른 함정을 예상할 수 있습니까?", "reasoning"),
  q("cdp_cl_d3_19", "Can the learner explain the overall implications of something they heard or read?", "学习者能否解释所听到或读到内容的整体含义？", "학습자는 듣거나 읽은 내용의 전반적인 의미를 설명할 수 있습니까?", "reasoning"),

  hdr("cdp_cl_d4_hdr", "Domain 4: Applied Academic & Functional Skills", "领域四：应用学术与生活技能", "영역 4: 응용 학습 및 기능적 기술", "applied_academic"),
  q("cdp_cl_d4_1", "Does the learner understand that a written number represents a number of objects?", "学习者是否理解书写的数字代表一定数量的物体？", "학습자는 쓰여진 숫자가 물체의 수를 나타낸다는 것을 이해합니까?", "applied_academic"),
  q("cdp_cl_d4_2", "Can the learner use a ruler to measure the length of a shape?", "学习者能否使用直尺测量图形的长度？", "학습자는 자를 사용하여 도형의 길이를 측정할 수 있습니까?", "applied_academic"),
  q("cdp_cl_d4_3", "Can the learner use a container to measure volume (e.g., measure 250ml of water)?", "学习者能否使用容器测量容积（如量取250毫升水）？", "학습자는 용기를 사용하여 부피를 측정할 수 있습니까(예: 물 250ml 측정)?", "applied_academic"),
  q("cdp_cl_d4_4", "Can the learner use a scale to measure weight?", "学习者能否使用秤来测量重量？", "학습자는 저울을 사용하여 무게를 측정할 수 있습니까?", "applied_academic"),
  q("cdp_cl_d4_5", "Can the learner add coins up to a value of one Yuan?", "学习者能否将硬币加起来达到一元的价值？", "학습자는 1위안에 해당하는 동전을 더할 수 있습니까?", "applied_academic"),
  q("cdp_cl_d4_6", "Can the learner add coins up to 5 Yuan, 10 Yuan, and 20 Yuan?", "学习者能否将硬币加起来达到5元、10元和20元？", "학습자는 5위안, 10위안, 20위안에 해당하는 동전을 더할 수 있습니까?", "applied_academic"),
  q("cdp_cl_d4_7", "Does the learner understand when they need change in a transaction?", "学习者是否理解在交易中何时需要找零？", "학습자는 거래에서 언제 거스름돈이 필요한지 이해합니까?", "applied_academic"),
  q("cdp_cl_d4_8", "Does the learner understand when they don't have enough money to buy something?", "学习者是否理解何时钱不够买东西？", "학습자는 무언가를 살 돈이 부족할 때를 이해합니까?", "applied_academic"),
  q("cdp_cl_d4_9", "Can the learner use money vocabulary in real-life situations?", "学习者能否在现实生活中运用货币相关词汇？", "학습자는 실생활에서 돈 관련 어휘를 사용할 수 있습니까?", "applied_academic"),
  q("cdp_cl_d4_10", "Does the learner understand what 'reasonable price' means?", "学习者是否理解\"合理价格\"的含义？", "학습자는 '합리적인 가격'의 의미를 이해합니까?", "applied_academic"),
  q("cdp_cl_d4_11", "Is the learner able to work out how they could save money?", "学习者是否能想出节省钱的方法？", "학습자는 돈을 절약하는 방법을 생각해낼 수 있습니까?", "applied_academic"),
  q("cdp_cl_d4_12", "Does the learner understand that people get paid for working?", "学习者是否理解人们因工作而获得报酬？", "학습자는 사람들이 일을 하면 급여를 받는다는 것을 이해합니까?", "applied_academic"),
  q("cdp_cl_d4_13", "Can the learner apply a general rule to a specific situation?", "学习者能否将一般规则应用到特定情境中？", "학습자는 일반적인 규칙을 특정 상황에 적용할 수 있습니까?", "applied_academic"),

  hdr("cdp_cl_d5_hdr", "Domain 5: Time, Measurement & Quantitative Concepts", "领域五：时间、测量与量化概念", "영역 5: 시간, 측정 및 정량적 개념", "time_measurement"),
  q("cdp_cl_d5_1", "Does the learner know the vocabulary and sequence for months of the year, seasons, and special times?", "学习者是否了解月份、季节和特殊时节的词汇和顺序？", "학습자는 한 해의 달, 계절, 특별한 시기에 대한 어휘와 순서를 알고 있습니까?", "time_measurement"),
  q("cdp_cl_d5_2", "Can the learner recognize the age of a child, teenager, adult, and senior?", "学习者能否识别儿童、青少年、成人和老年人的年龄特征？", "학습자는 어린이, 청소년, 어른, 노인의 나이를 구별할 수 있습니까?", "time_measurement"),
  q("cdp_cl_d5_3", "Does the learner know how many hours are in a day, minutes in an hour, and days in a year?", "学习者是否知道一天有多少小时、一小时有多少分钟、一年有多少天？", "학습자는 하루의 시간 수, 한 시간의 분 수, 1년의 일 수를 알고 있습니까?", "time_measurement"),
  q("cdp_cl_d5_4", "Can the learner read an analogue clock and understand the time?", "学习者能否读懂模拟时钟并理解时间？", "학습자는 아날로그 시계를 읽고 시간을 이해할 수 있습니까?", "time_measurement"),
  q("cdp_cl_d5_5", "Can the learner read a digital clock and understand time?", "学习者能否读懂数字时钟并理解时间？", "학습자는 디지털 시계를 읽고 시간을 이해할 수 있습니까?", "time_measurement"),
  q("cdp_cl_d5_6", "Can the learner round numbers up to the nearest 10 and 100?", "学习者能否将数字四舍五入到最近的10和100？", "학습자는 수를 가장 가까운 10과 100으로 반올림할 수 있습니까?", "time_measurement"),
  q("cdp_cl_d5_7", "Does the learner understand percentages as fractions?", "学习者是否理解百分比与分数的关系？", "학습자는 백분율을 분수로 이해합니까?", "time_measurement"),
  q("cdp_cl_d5_8", "Can the learner recognize proportions of a whole number using fractions?", "学习者能否用分数表示整数的比例？", "학습자는 분수를 사용하여 전체 수의 비율을 인식할 수 있습니까?", "time_measurement"),
  q("cdp_cl_d5_9", "Can the learner accurately measure items using the correct tool?", "学习者能否使用正确的工具准确测量物品？", "학습자는 올바른 도구를 사용하여 물건을 정확하게 측정할 수 있습니까?", "time_measurement"),
  q("cdp_cl_d5_10", "Can the learner estimate a measurement (length, time, weight, or volume)?", "学习者能否估算测量值（长度、时间、重量或体积）？", "학습자는 측정값(길이, 시간, 무게 또는 부피)을 추정할 수 있습니까?", "time_measurement"),

  hdr("cdp_cl_d6_hdr", "Domain 6: Social-Cognitive Reasoning & Decision Making", "领域六：社会认知推理与决策", "영역 6: 사회 인지적 추론 및 의사 결정", "social_cognitive"),
  q("cdp_cl_d6_1", "Can the learner recognize when a peer has greater knowledge in a particular subject?", "学习者能否认识到同伴在某一特定领域具有更多知识？", "학습자는 또래가 특정 분야에서 더 많은 지식을 가지고 있음을 인식할 수 있습니까?", "social_cognitive"),
  q("cdp_cl_d6_2", "Can the learner explain what they may do differently next time?", "学习者能否解释下次可能会做哪些不同的事情？", "학습자는 다음 번에는 어떻게 다르게 할 수 있는지 설명할 수 있습니까?", "social_cognitive"),
  q("cdp_cl_d6_3", "Can the learner recognize that their choices affect others?", "学习者能否认识到自己的选择会影响他人？", "학습자는 자신의 선택이 타인에게 영향을 미친다는 것을 인식할 수 있습니까?", "social_cognitive"),
  q("cdp_cl_d6_4", "Can the learner take other people's opinions and knowledge into account when making a group decision?", "学习者在做集体决策时能否考虑他人的意见和知识？", "학습자는 집단 결정을 내릴 때 다른 사람들의 의견과 지식을 고려할 수 있습니까?", "social_cognitive"),
  q("cdp_cl_d6_5", "Is the learner able to give a rationale and justification for the group's decision?", "学习者是否能为集体决定提供理由和依据？", "학습자는 집단 결정에 대한 근거와 정당성을 제시할 수 있습니까?", "social_cognitive"),
  q("cdp_cl_d6_6", "If the learner does not find the items they need, will they accept a similar item?", "如果学习者找不到所需物品，他们是否会接受类似的替代品？", "학습자가 필요한 물건을 찾지 못할 때, 비슷한 물건을 받아들입니까?", "social_cognitive"),
  q("cdp_cl_d6_7", "Can the learner prioritize spending (needs vs wants)?", "学习者能否区分优先支出（需求与欲望）？", "학습자는 지출의 우선순위를 정할 수 있습니까(필요 대 욕구)?", "social_cognitive"),
  q("cdp_cl_d6_8", "Does the learner recognize that an item may be offered at a variety of prices?", "学习者是否认识到同一物品可能以不同价格出售？", "학습자는 물건이 다양한 가격으로 제공될 수 있다는 것을 인식합니까?", "social_cognitive"),
  q("cdp_cl_d6_9", "Can the learner understand the far-reaching consequences of their actions on others?", "学习者能否理解自己行为对他人产生的深远影响？", "학습자는 자신의 행동이 타인에게 미치는 광범위한 결과를 이해할 수 있습니까?", "social_cognitive"),
  q("cdp_cl_d6_10", "Is the learner able to recognize whether a decision is being made based on emotions or logic?", "学习者是否能识别决定是基于情感还是逻辑做出的？", "학습자는 결정이 감정에 근거한 것인지 논리에 근거한 것인지 인식할 수 있습니까?", "social_cognitive"),

  hdr("cdp_cl_d7_hdr", "Domain 7: Independence, Responsibility & Life Skills", "领域七：独立性、责任感与生活技能", "영역 7: 독립성, 책임감 및 생활 기술", "independence"),
  q("cdp_cl_d7_1", "Does the learner manage their own responsibilities in a school, home, or work setting at an age-appropriate level?", "学习者是否能在学校、家庭或工作环境中以适合年龄的水平管理自己的责任？", "학습자는 학교, 가정 또는 직장 환경에서 연령에 맞는 수준으로 자신의 책임을 관리합니까?", "independence"),
  q("cdp_cl_d7_2", "Is the learner able to look after their own belongings in a school, home, or workplace?", "学习者是否能在学校、家庭或工作场所照管好自己的物品？", "학습자는 학교, 가정 또는 직장에서 자신의 물건을 잘 관리할 수 있습니까?", "independence"),
  q("cdp_cl_d7_3", "Can the learner identify different words or phrases to type in a search engine related to their research?", "学习者能否找出与研究相关的不同词语或短语输入搜索引擎？", "학습자는 자신의 연구와 관련하여 검색 엔진에 입력할 다양한 단어나 구문을 찾을 수 있습니까?", "independence"),
  q("cdp_cl_d7_4", "Can the learner use at least three different tools to find information?", "学习者能否使用至少三种不同的工具查找信息？", "학습자는 정보를 찾기 위해 최소 3가지 다른 도구를 사용할 수 있습니까?", "independence"),
  q("cdp_cl_d7_5", "Can the learner work out how much disposable income they have?", "学习者能否计算出自己有多少可支配收入？", "학습자는 자신의 가처분 소득이 얼마인지 계산할 수 있습니까?", "independence"),
  q("cdp_cl_d7_6", "Can the learner estimate how much they need for shopping?", "学习者能否估算购物所需的金额？", "학습자는 쇼핑에 필요한 금액을 예상할 수 있습니까?", "independence"),
  q("cdp_cl_d7_7", "Does the learner know the advantages of saving money?", "学习者是否了解储蓄的好处？", "학습자는 돈을 저축하는 것의 장점을 알고 있습니까?", "independence"),
  q("cdp_cl_d7_8", "Does the learner understand that they need to pay bills and taxes?", "学习者是否理解他们需要支付账单和税款？", "학습자는 청구서와 세금을 납부해야 한다는 것을 이해합니까?", "independence"),
  q("cdp_cl_d7_9", "Does the learner understand the concept of credit and interest?", "学习者是否理解信用和利息的概念？", "학습자는 신용과 이자의 개념을 이해합니까?", "independence"),
  q("cdp_cl_d7_10", "Does the learner know that there are different types of bank accounts or building societies?", "学习者是否知道有不同类型的银行账户或储蓄机构？", "학습자는 다양한 종류의 은행 계좌나 저축 기관이 있다는 것을 알고 있습니까?", "independence"),
  q("cdp_cl_d7_11", "Does the learner understand what they need to learn in order to work on a problem?", "学习者是否理解需要学习哪些内容才能解决某个问题？", "학습자는 문제를 해결하기 위해 무엇을 배워야 하는지 이해합니까?", "independence"),
];

// ─── CDP-CI: Communication and Interaction ───────────────────────────────────

export const CDP_CI_FORM: FormQuestion[] = [
  instr(
    "cdp_ci_instr",
    "CDP — Communication and Interaction",
    "CDP — 沟通与互动",
    "CDP — 의사소통 및 상호작용",
    "This assessment is completed by an educator or therapist who knows the learner well. For each item, rate how frequently the learner demonstrates the described behaviour in their typical learning and social environment.\n\nResponse scale: Always · Often · Rarely · Never",
    "本量表由了解学习者的教育者或治疗师填写。请根据学习者在典型学习和社交环境中的表现，评估每项行为出现的频率。\n\n回应选项：经常 · 有时 · 很少 · 从不",
    "이 평가는 학습자를 잘 아는 교육자 또는 치료사가 작성합니다. 학습자의 전형적인 학습 및 사회적 환경에서 각 행동이 얼마나 자주 나타나는지 평가해 주세요.\n\n응답 척도: 항상 · 자주 · 드물게 · 전혀",
  ),

  hdr("cdp_ci_s1_hdr", "Attention and Listening", "注意力与倾听", "주의력과 듣기", "attention_listening"),
  q("cdp_ci_s1_1", "Does the learner respond to prompts to listen?", "学习者是否回应要求倾听的提示？", "학습자는 듣기를 요청하는 단서에 반응합니까?", "attention_listening"),
  q("cdp_ci_s1_2", "Can the learner concentrate in small groups?", "学习者能否在小组中专注？", "학습자는 소그룹에서 집중할 수 있습니까?", "attention_listening"),
  q("cdp_ci_s1_3", "Can the learner concentrate in noisy or busy environments?", "学习者能否在嘈杂或忙碌的环境中专注？", "학습자는 시끄럽거나 바쁜 환경에서 집중할 수 있습니까?", "attention_listening"),
  q("cdp_ci_s1_4", "Can the learner concentrate during a one-to-one interaction?", "学习者能否在一对一互动中专注？", "학습자는 일대일 상호작용 중에 집중할 수 있습니까?", "attention_listening"),

  hdr("cdp_ci_s2_hdr", "Contextual and Gestural Cues", "情境与手势线索", "맥락 및 몸짓 단서", "gestural_cues"),
  q("cdp_ci_s2_1", "Can the learner imitate simple signs or gestures fairly accurately?", "学习者能否相当准确地模仿简单的手势或肢体动作？", "학습자는 간단한 손짓이나 몸짓을 꽤 정확하게 모방할 수 있습니까?", "gestural_cues"),
  q("cdp_ci_s2_2", "Does the learner understand gestural communication such as pointing or head shaking?", "学习者是否理解如指点或摇头等肢体语言沟通？", "학습자는 가리키기나 고개 젓기와 같은 몸짓 의사소통을 이해합니까?", "gestural_cues"),

  hdr("cdp_ci_s3_hdr", "Attention and Listening (Continued)", "注意力与倾听（续）", "주의력과 듣기 (계속)", "attention_listening"),
  q("cdp_ci_s3_1", "Can the learner remain on task in order to finish a piece of work?", "学习者能否保持专注以完成一项作业？", "학습자는 작업을 완료하기 위해 과제에 집중할 수 있습니까?", "attention_listening"),
  q("cdp_ci_s3_2", "Will the learner join in activities in order to get a reward?", "学习者是否会为了获得奖励而参与活动？", "학습자는 보상을 받기 위해 활동에 참여합니까?", "attention_listening"),
  q("cdp_ci_s3_3", "If engaged in an activity, will the learner stop if prompted?", "如果学习者正在进行活动，被提示时会停下来吗？", "활동에 참여하고 있을 때, 촉구를 받으면 학습자가 멈춥니까?", "attention_listening"),
  q("cdp_ci_s3_4", "Can the learner transition from a preferred activity with support (e.g., leaving a Lego construction to go to lunch)?", "学习者能否在支持下从喜好活动转换（如离开乐高积木去吃午饭）？", "학습자는 지원을 받아 선호 활동에서 전환할 수 있습니까(예: 레고 조립을 떠나 점심 먹기)?", "attention_listening"),

  hdr("cdp_ci_s4_hdr", "Comprehension — Understanding Words, Symbols, and Signs", "理解——理解词语、符号和标志", "이해 — 단어, 기호 및 표지 이해", "comprehension"),
  q("cdp_ci_s4_1", "Does the learner understand position concepts (e.g., over, under, next to)?", "学习者是否理解位置概念（如上方、下方、旁边）？", "학습자는 위치 개념(예: 위, 아래, 옆)을 이해합니까?", "comprehension"),
  q("cdp_ci_s4_2", "Does the learner understand comparatives and superlatives (e.g., bigger, biggest)?", "学习者是否理解比较级和最高级（如更大、最大）？", "학습자는 비교급과 최상급(예: 더 크다, 가장 크다)을 이해합니까?", "comprehension"),
  q("cdp_ci_s4_3", "Does the learner understand the size concept (e.g., little, tall)?", "学习者是否理解大小概念（如小、高）？", "학습자는 크기 개념(예: 작은, 키 큰)을 이해합니까?", "comprehension"),
  q("cdp_ci_s4_4", "Does the learner understand a basic vocabulary including everyday nouns, verbs, adjectives, and adverbs?", "学习者是否理解包括日常名词、动词、形容词和副词在内的基本词汇？", "학습자는 일상적인 명사, 동사, 형용사, 부사를 포함한 기본 어휘를 이해합니까?", "comprehension"),

  hdr("cdp_ci_s5_hdr", "Contextual Cues — Environmental", "情境线索——环境", "맥락적 단서 — 환경", "gestural_cues"),
  q("cdp_ci_s5_1", "Does the learner understand the activity based on location (e.g., a PE lesson in the gym, packing a suitcase to go on holiday)?", "学习者是否能根据地点理解活动（如体育馆里的体育课、整理行李准备度假）？", "학습자는 장소에 따라 활동을 이해합니까(예: 체육관에서의 체육 수업, 휴가를 위한 짐 싸기)?", "gestural_cues"),

  hdr("cdp_ci_s6_hdr", "Expressive Communication — Basic Vocabulary", "表达性沟通——基础词汇", "표현적 의사소통 — 기본 어휘", "expressive_communication"),
  q("cdp_ci_s6_1", "Does the learner use vocabulary to express their immediate needs (e.g., 'I need a pencil sharpener!')?", "学习者是否使用词汇来表达即时需求（如\"我需要一个削笔器！\"）？", "학습자는 즉각적인 필요를 표현하기 위해 어휘를 사용합니까(예: '연필깎이가 필요해요!')?", "expressive_communication"),
  q("cdp_ci_s6_2", "Does the learner have an expressive vocabulary that includes all relevant parts of speech?", "学习者是否拥有包含所有相关词类的表达词汇？", "학습자는 모든 관련 품사를 포함하는 표현 어휘를 가지고 있습니까?", "expressive_communication"),
  q("cdp_ci_s6_3", "Does the learner comment on activities, objects, or events as they are happening?", "学习者是否在活动、物品或事件发生时对其进行评论？", "학습자는 활동, 물건 또는 사건이 일어나는 동안 그에 대해 언급합니까?", "expressive_communication"),

  hdr("cdp_ci_s7_hdr", "Comprehension — Understanding Sentences and Instructions", "理解——理解句子和指令", "이해 — 문장 및 지시 이해", "comprehension"),
  q("cdp_ci_s7_1", "Can the learner follow instructions that involve negatives (e.g., 'Don't put the cup in the sink')?", "学习者能否遵循含有否定词的指令（如\"不要把杯子放在水槽里\"）？", "학습자는 부정어가 포함된 지시를 따를 수 있습니까(예: '컵을 싱크대에 넣지 마세요')?", "comprehension"),
  q("cdp_ci_s7_2", "Does the learner understand sentences with at least 3 information-carrying words out of context (e.g., 'put the cup in the cupboard')?", "学习者是否理解包含至少3个信息词的脱离语境的句子（如\"把杯子放进碗橱\"）？", "학습자는 맥락 밖에서 최소 3개의 정보 단어가 포함된 문장을 이해합니까(예: '컵을 찬장에 넣어요')?", "comprehension"),
  q("cdp_ci_s7_3", "Does the learner understand sentences using the simple past and future tense (e.g., 'We went swimming last week'; 'We're going to the park tomorrow')?", "学习者是否理解使用简单过去式和将来式的句子（如\"我们上周去游泳了\"；\"我们明天要去公园\"）？", "학습자는 단순 과거 및 미래 시제를 사용한 문장을 이해합니까(예: '우리는 지난주에 수영하러 갔어요'; '우리는 내일 공원에 갈 거예요')?", "comprehension"),
  q("cdp_ci_s7_4", "Can the learner recognize errors in English grammar (e.g., 'The singer were awful')?", "学习者能否识别英语语法错误（如\"The singer were awful\"）？", "학습자는 영어 문법 오류를 인식할 수 있습니까(예: 'The singer were awful')?", "comprehension"),

  hdr("cdp_ci_s8_hdr", "Comprehension — Complex Instructions", "理解——复杂指令", "이해 — 복잡한 지시", "comprehension"),
  q("cdp_ci_s8_1", "Can the learner respond to instructions that have no natural connection (e.g., 'Put the spoons in the drawer and then get me a pen')?", "学习者能否响应没有自然关联的指令（如\"把汤匙放进抽屉，然后给我一支笔\"）？", "학습자는 자연스러운 연관성이 없는 지시에 반응할 수 있습니까(예: '숟가락을 서랍에 넣고 펜을 가져다 주세요')?", "comprehension"),

  hdr("cdp_ci_s9_hdr", "Social Skills — Recognizing and Using Non-Verbal Communication", "社交技能——识别和使用非语言沟通", "사회적 기술 — 비언어적 의사소통 인식 및 활용", "social_skills"),
  q("cdp_ci_s9_1", "Does the learner initiate interactions spontaneously with others during an activity (e.g., use an adult's name to get their attention)?", "学习者是否在活动中主动与他人自发互动（如叫出成人的名字引起注意）？", "학습자는 활동 중에 다른 사람과 자발적으로 상호작용을 시작합니까(예: 어른의 이름을 불러 주의를 끌기)?", "social_skills"),
  q("cdp_ci_s9_2", "Does the learner use facial expression and body language?", "学习者是否使用面部表情和肢体语言？", "학습자는 표정과 몸짓 언어를 사용합니까?", "social_skills"),
  q("cdp_ci_s9_3", "Does the learner recognize and respond to facial expressions and body language?", "学习者是否能识别并回应面部表情和肢体语言？", "학습자는 표정과 몸짓 언어를 인식하고 반응합니까?", "social_skills"),

  hdr("cdp_ci_s10_hdr", "Comprehension — Understanding Questions", "理解——理解疑问句", "이해 — 질문 이해", "comprehension"),
  q("cdp_ci_s10_1", "Does the learner answer questions such as why, how, and what if?", "学习者是否回答\"为什么\"、\"怎么\"和\"如果……会怎样\"等问题？", "학습자는 왜, 어떻게, 만약이라면 등의 질문에 대답합니까?", "comprehension"),
  q("cdp_ci_s10_2", "Does the learner understand and answer questions such as what, where, when, and who?", "学习者是否理解并回答\"什么\"、\"在哪里\"、\"什么时候\"和\"谁\"等问题？", "학습자는 무엇, 어디서, 언제, 누구와 같은 질문을 이해하고 대답합니까?", "comprehension"),

  hdr("cdp_ci_s11_hdr", "Expressive Communication — Expressing Sentences", "表达性沟通——表达句子", "표현적 의사소통 — 문장으로 표현하기", "expressive_communication"),
  q("cdp_ci_s11_1", "Does the learner communicate with peers using sentences (using words, signs, or pictures)?", "学习者是否使用句子（语言、手势或图片）与同伴沟通？", "학습자는 문장(단어, 기호 또는 그림 사용)을 사용하여 또래와 의사소통합니까?", "expressive_communication"),
  q("cdp_ci_s11_2", "Does the learner communicate using sentences with 5 or more words and engage with familiar adults?", "学习者是否使用含5个或更多单词的句子与熟悉的成人进行交流？", "학습자는 5개 이상의 단어가 포함된 문장을 사용하여 친숙한 어른과 의사소통합니까?", "expressive_communication"),
  q("cdp_ci_s11_3", "Does the learner combine words, pictures, or signs as relevant to communicating meaning?", "学习者是否将词语、图片或手势组合起来表达意思？", "학습자는 의미를 전달하기 위해 단어, 그림 또는 기호를 적절히 조합합니까?", "expressive_communication"),

  hdr("cdp_ci_s12_hdr", "Social Skills — Social Greetings", "社交技能——社交问候", "사회적 기술 — 사회적 인사", "social_skills"),
  q("cdp_ci_s12_1", "Does the learner recognize and use appropriate social greeting protocols (e.g., when and how to say hello, goodbye, or introduce themselves)?", "学习者是否认识并使用适当的社交问候礼节（如何时以及如何说你好、再见或自我介绍）？", "학습자는 적절한 사회적 인사 방법을 인식하고 사용합니까(예: 안녕이라고 말하는 시기와 방법, 작별 인사, 자기소개)?", "social_skills"),
  q("cdp_ci_s12_2", "Does the learner greet unfamiliar people appropriately?", "学习者是否能恰当地与陌生人打招呼？", "학습자는 낯선 사람에게 적절하게 인사합니까?", "social_skills"),

  hdr("cdp_ci_s13_hdr", "Social Skills — Social Interactions", "社交技能——社交互动", "사회적 기술 — 사회적 상호작용", "social_skills"),
  q("cdp_ci_s13_1", "Does the learner take turns during an activity or conversation?", "学习者在活动或对话中是否轮流参与？", "학습자는 활동이나 대화 중에 순서를 지킵니까?", "social_skills"),
  q("cdp_ci_s13_2", "Does the learner join group activities appropriately?", "学习者是否能适当地参加集体活动？", "학습자는 집단 활동에 적절하게 참여합니까?", "social_skills"),
  q("cdp_ci_s13_3", "Does the learner respond appropriately to peers' questions or requests?", "学习者是否对同伴的问题或请求做出适当的回应？", "학습자는 또래의 질문이나 요청에 적절하게 반응합니까?", "social_skills"),
  q("cdp_ci_s13_4", "Can the learner initiate social interactions with peers without adult prompting?", "学习者能否在无需成人提示的情况下主动与同伴进行社交互动？", "학습자는 어른의 촉구 없이 또래와의 사회적 상호작용을 시작할 수 있습니까?", "social_skills"),
  q("cdp_ci_s13_5", "Does the learner maintain eye contact during social interactions?", "学习者在社交互动中是否保持目光接触？", "학습자는 사회적 상호작용 중에 눈 맞춤을 유지합니까?", "social_skills"),
  q("cdp_ci_s13_6", "Does the learner use appropriate gestures or facial expressions during interaction?", "学习者在互动中是否使用适当的手势或面部表情？", "학습자는 상호작용 중에 적절한 몸짓이나 표정을 사용합니까?", "social_skills"),
  q("cdp_ci_s13_7", "Can the learner recognize when a peer is upset or needs help?", "学习者能否识别同伴何时感到沮丧或需要帮助？", "학습자는 또래가 화가 났거나 도움이 필요할 때를 인식할 수 있습니까?", "social_skills"),
  q("cdp_ci_s13_8", "Can the learner respond to others' emotions appropriately?", "学习者能否对他人的情绪做出适当回应？", "학습자는 타인의 감정에 적절하게 반응할 수 있습니까?", "social_skills"),
  q("cdp_ci_s13_9", "Does the learner show empathy towards peers?", "学习者是否对同伴表现出同理心？", "학습자는 또래에게 공감을 보여줍니까?", "social_skills"),
  q("cdp_ci_s13_10", "Can the learner engage in cooperative play or collaborative tasks with peers?", "学习者能否与同伴进行合作游戏或协作任务？", "학습자는 또래와 협동 놀이나 협력 과제에 참여할 수 있습니까?", "social_skills"),
  q("cdp_ci_s13_11", "Does the learner understand group rules and follow them during activities?", "学习者是否理解并在活动中遵守集体规则？", "학습자는 활동 중에 집단 규칙을 이해하고 따릅니까?", "social_skills"),
  q("cdp_ci_s13_12", "Can the learner negotiate or compromise in social situations?", "学习者能否在社交场合进行协商或妥协？", "학습자는 사회적 상황에서 협상하거나 타협할 수 있습니까?", "social_skills"),
  q("cdp_ci_s13_13", "Can the learner express personal opinions or preferences appropriately within a group?", "学习者能否在集体中适当表达个人意见或偏好？", "학습자는 집단 내에서 개인적인 의견이나 선호를 적절하게 표현할 수 있습니까?", "social_skills"),
  q("cdp_ci_s13_14", "Can the learner manage conflict with peers appropriately?", "学习者能否适当处理与同伴的冲突？", "학습자는 또래와의 갈등을 적절하게 처리할 수 있습니까?", "social_skills"),
  q("cdp_ci_s13_15", "Does the learner accept guidance or correction from adults appropriately in social situations?", "学习者在社交场合中是否能适当接受成人的引导或纠正？", "학습자는 사회적 상황에서 어른의 안내나 교정을 적절하게 받아들입니까?", "social_skills"),

  hdr("cdp_ci_s14_hdr", "Social Awareness", "社会意识", "사회적 인식", "social_awareness"),
  q("cdp_ci_s14_1", "Does the learner notice when others are talking to them?", "学习者是否注意到他人在与自己说话？", "학습자는 다른 사람이 자신에게 말하고 있을 때 알아차립니까?", "social_awareness"),
  q("cdp_ci_s14_2", "Does the learner understand social cues such as tone of voice or facial expression?", "学习者是否理解语调或面部表情等社交信号？", "학습자는 목소리 톤이나 표정과 같은 사회적 단서를 이해합니까?", "social_awareness"),
  q("cdp_ci_s14_3", "Can the learner recognize personal space boundaries in social situations?", "学习者能否在社交场合识别个人空间边界？", "학습자는 사회적 상황에서 개인 공간의 경계를 인식할 수 있습니까?", "social_awareness"),
  q("cdp_ci_s14_4", "Can the learner adjust behavior according to the social context?", "学习者能否根据社交情境调整行为？", "학습자는 사회적 맥락에 따라 행동을 조절할 수 있습니까?", "social_awareness"),
  q("cdp_ci_s14_5", "Does the learner show awareness of others' perspectives or feelings?", "学习者是否表现出对他人观点或感受的意识？", "학습자는 타인의 관점이나 감정에 대한 인식을 보여줍니까?", "social_awareness"),
  q("cdp_ci_s14_6", "Does the learner respond appropriately to peers' social signals?", "学习者是否对同伴的社交信号做出适当回应？", "학습자는 또래의 사회적 신호에 적절하게 반응합니까?", "social_awareness"),
  q("cdp_ci_s14_7", "Can the learner detect when a social interaction is over or needs to end?", "学习者能否察觉到社交互动何时结束或需要结束？", "학습자는 사회적 상호작용이 끝났거나 끝내야 할 때를 감지할 수 있습니까?", "social_awareness"),

  hdr("cdp_ci_s15_hdr", "Social Initiation", "社交主动性", "사회적 시작", "social_initiation"),
  q("cdp_ci_s15_1", "Does the learner start conversations or activities with peers spontaneously?", "学习者是否自发地与同伴开始对话或活动？", "학습자는 또래와 자발적으로 대화나 활동을 시작합니까?", "social_initiation"),
  q("cdp_ci_s15_2", "Can the learner introduce new topics into a conversation?", "学习者能否在对话中引入新话题？", "학습자는 대화에 새로운 주제를 도입할 수 있습니까?", "social_initiation"),
  q("cdp_ci_s15_3", "Does the learner ask for help when needed in social or learning contexts?", "学习者在社交或学习情境中需要帮助时是否会主动寻求？", "학습자는 사회적 또는 학습 맥락에서 필요할 때 도움을 요청합니까?", "social_initiation"),
  q("cdp_ci_s15_4", "Does the learner invite peers to join in activities appropriately?", "学习者是否能适当地邀请同伴参与活动？", "학습자는 또래를 활동에 적절하게 초대합니까?", "social_initiation"),
  q("cdp_ci_s15_5", "Can the learner initiate a game or structured activity independently?", "学习者能否独立发起游戏或有组织的活动？", "학습자는 게임이나 구조화된 활동을 독립적으로 시작할 수 있습니까?", "social_initiation"),

  hdr("cdp_ci_str_hdr", "Strength Items", "优势项目", "강점 항목", "strengths"),
  q("cdp_ci_str_1", "The learner can make friends easily.", "学习者能够轻松结交朋友。", "학습자는 쉽게 친구를 사귈 수 있습니다.", "strengths", true),
  q("cdp_ci_str_2", "The learner is comfortable participating in group activities.", "学习者乐于参与集体活动。", "학습자는 집단 활동에 편안하게 참여합니다.", "strengths", true),
  q("cdp_ci_str_3", "The learner can express emotions appropriately.", "学习者能够适当地表达情绪。", "학습자는 감정을 적절하게 표현할 수 있습니다.", "strengths", true),
  q("cdp_ci_str_4", "The learner can adapt to changes in social situations.", "学习者能够适应社交情境中的变化。", "학습자는 사회적 상황의 변화에 적응할 수 있습니다.", "strengths", true),
  q("cdp_ci_str_5", "The learner shows confidence when interacting with peers.", "学习者在与同伴互动时表现出自信。", "학습자는 또래와 상호작용할 때 자신감을 보여줍니다.", "strengths", true),
  q("cdp_ci_str_6", "The learner can resolve conflicts independently.", "学习者能够独立解决冲突。", "학습자는 갈등을 독립적으로 해결할 수 있습니다.", "strengths", true),
  q("cdp_ci_str_7", "The learner demonstrates leadership during group activities.", "学习者在集体活动中展现出领导力。", "학습자는 집단 활동 중에 리더십을 보여줍니다.", "strengths", true),
  q("cdp_ci_str_8", "The learner can maintain friendships over time.", "学习者能够长时间维持友谊。", "학습자는 오랫동안 우정을 유지할 수 있습니다.", "strengths", true),

  hdr("cdp_ci_oe_hdr", "Open-Ended Reflection", "开放式反思", "개방형 성찰", "open_ended"),
  ta("cdp_ci_oe_1", "Describe situations where the learner interacts positively with peers.", "描述学习者与同伴积极互动的情境。", "학습자가 또래와 긍정적으로 상호작용하는 상황을 설명하세요.", "open_ended"),
  ta("cdp_ci_oe_2", "Describe situations where the learner struggles to engage socially.", "描述学习者难以进行社交参与的情境。", "학습자가 사회적으로 참여하기 어려운 상황을 설명하세요.", "open_ended"),
  ta("cdp_ci_oe_3", "Are there particular environments or activities where the learner shows stronger social skills?", "学习者在特定环境或活动中是否表现出更强的社交技能？", "학습자가 더 강한 사회적 기술을 보이는 특정 환경이나 활동이 있습니까?", "open_ended"),
  ta("cdp_ci_oe_4", "Are there any supports or strategies that help the learner succeed socially?", "是否有任何支持或策略帮助学习者在社交方面取得成功？", "학습자의 사회적 성공을 돕는 지원이나 전략이 있습니까?", "open_ended"),
];

// ─── CDP-SI: Social Interaction and Social Awareness ─────────────────────────

export const CDP_SI_FORM: FormQuestion[] = [
  instr(
    "cdp_si_instr",
    "CDP — Social Interaction and Social Awareness",
    "CDP — 社会互动与社会意识",
    "CDP — 사회적 상호작용 및 사회적 인식",
    "This assessment is completed by an educator or therapist who knows the learner well. For each item, rate how frequently the learner demonstrates the described behaviour in their typical learning and social environment.\n\nResponse scale: Always · Often · Rarely · Never",
    "本量表由了解学习者的教育者或治疗师填写。请根据学习者在典型学习和社交环境中的表现，评估每项行为出现的频率。\n\n回应选项：经常 · 有时 · 很少 · 从不",
    "이 평가는 학습자를 잘 아는 교육자 또는 치료사가 작성합니다. 학습자의 전형적인 학습 및 사회적 환경에서 각 행동이 얼마나 자주 나타나는지 평가해 주세요.\n\n응답 척도: 항상 · 자주 · 드물게 · 전혀",
  ),

  hdr("cdp_si_s1_hdr", "Peer Interaction", "同伴互动", "또래 상호작용", "peer_interaction"),
  q("cdp_si_s1_1", "Does the learner interact with a peer during an activity (e.g., playing football)?", "学习者在活动中（如踢足球）是否与同伴互动？", "학습자는 활동 중에(예: 축구) 또래와 상호작용합니까?", "peer_interaction"),

  hdr("cdp_si_s2_hdr", "Approval and Rejection of Others", "他人的认可与拒绝", "타인의 승인과 거부", "peer_interaction"),
  q("cdp_si_s2_1", "Can the learner perceive a positive or negative reaction (approval, disapproval, acceptance, or rejection) towards their own behavior?", "学习者能否察觉到他人对自身行为的正面或负面反应（认可、不认可、接受或拒绝）？", "학습자는 자신의 행동에 대한 긍정적이거나 부정적인 반응(승인, 불승인, 수용 또는 거부)을 인식할 수 있습니까?", "peer_interaction"),
  q("cdp_si_s2_2", "Does the learner show like and dislike of other people?", "学习者是否表现出对他人的喜欢与不喜欢？", "학습자는 다른 사람에 대한 좋아함과 싫어함을 표현합니까?", "peer_interaction"),

  hdr("cdp_si_s3_hdr", "Privacy", "隐私", "프라이버시", "safety_awareness"),
  q("cdp_si_s3_1", "Does the learner follow rules when using technology (e.g., asking permission to use a computer or tablet before downloading)?", "学习者在使用科技设备时是否遵守规则（如下载前先请求许可使用电脑或平板电脑）？", "학습자는 기술 사용 시 규칙을 따릅니까(예: 다운로드 전 컴퓨터나 태블릿 사용 허락 구하기)?", "safety_awareness"),
  q("cdp_si_s3_2", "Does the learner understand basic rules for safe behavior?", "学习者是否理解安全行为的基本规则？", "학습자는 안전한 행동에 대한 기본 규칙을 이해합니까?", "safety_awareness"),
  q("cdp_si_s3_3", "Does the learner understand social conventions of privacy (e.g., closing the toilet door, changing inside a cubicle)?", "学习者是否理解隐私的社会习俗（如关上厕所门、在隔间内更衣）？", "학습자는 프라이버시의 사회적 관습을 이해합니까(예: 화장실 문 닫기, 탈의실 안에서 옷 갈아입기)?", "safety_awareness"),

  hdr("cdp_si_s4_hdr", "Gender Awareness", "性别意识", "성별 인식", "social_norms"),
  q("cdp_si_s4_1", "Does the learner recognize other genders amongst their peer group?", "学习者是否能识别同伴群体中的不同性别？", "학습자는 또래 집단 내에서 다른 성별을 인식합니까?", "social_norms"),
  q("cdp_si_s4_2", "Does the learner understand social norms for males and females (e.g., clothing)?", "学习者是否理解男性和女性的社会规范（如着装）？", "학습자는 남성과 여성에 대한 사회적 규범을 이해합니까(예: 의복)?", "social_norms"),
  q("cdp_si_s4_3", "Is the learner able to identify their own gender?", "学习者是否能识别自己的性别？", "학습자는 자신의 성별을 파악할 수 있습니까?", "social_norms"),

  hdr("cdp_si_s5_hdr", "Bullying Awareness", "欺凌意识", "괴롭힘 인식", "safety_awareness"),
  q("cdp_si_s5_1", "Does the learner engage with direction and correct their own bullying behavior? (If not applicable — learner does not exhibit bullying — give full score.)", "学习者是否能接受引导并纠正自身的欺凌行为？（如不适用——学习者无欺凌行为——请给满分。）", "학습자는 안내에 따라 자신의 괴롭힘 행동을 교정합니까? (해당 없는 경우 — 학습자가 괴롭힘을 보이지 않는 경우 — 만점 부여.)", "safety_awareness"),
  q("cdp_si_s5_2", "Can the learner identify bullying scenarios with supportive visual materials?", "学习者能否借助辅助视觉材料识别欺凌情境？", "학습자는 지원 시각 자료를 활용하여 괴롭힘 상황을 식별할 수 있습니까?", "safety_awareness"),
  q("cdp_si_s5_3", "Does the learner show signs of distress when mistreated by peers?", "学习者在受到同伴虐待时是否表现出困扰的迹象？", "학습자는 또래에게 부당한 대우를 받을 때 고통의 징후를 보입니까?", "safety_awareness"),

  hdr("cdp_si_s6_hdr", "Empathy — Identifying Others' Emotions", "共情——识别他人情绪", "공감 — 타인의 감정 식별", "empathy_emotions"),
  q("cdp_si_s6_1", "Can the learner understand how to help others in need (e.g., when a friend falls, I help them; when a friend is crying, I call a teacher)?", "学习者是否理解如何帮助有需要的他人（如朋友摔倒时帮助他们；朋友哭泣时叫老师）？", "학습자는 도움이 필요한 타인을 어떻게 도와야 하는지 이해합니까(예: 친구가 넘어지면 도와주기; 친구가 울면 선생님 부르기)?", "empathy_emotions"),
  q("cdp_si_s6_2", "Does the learner identify emotions in others (e.g., seeing a friend crying)?", "学习者是否能识别他人的情绪（如看到朋友哭泣）？", "학습자는 타인의 감정을 식별합니까(예: 친구가 우는 것을 보기)?", "empathy_emotions"),

  hdr("cdp_si_s7_hdr", "Important People", "重要的人", "중요한 사람들", "social_norms"),
  q("cdp_si_s7_1", "Can the learner name special people in their life (e.g., parents, carer, teacher, social worker)?", "学习者能否说出生活中重要的人（如父母、照护者、老师、社会工作者）？", "학습자는 자신의 삶에서 특별한 사람들의 이름을 말할 수 있습니까(예: 부모, 돌봄 제공자, 교사, 사회복지사)?", "social_norms"),
  q("cdp_si_s7_2", "Can the learner recognize hierarchy (e.g., head teacher, teacher, teaching assistant)?", "学习者能否识别层级关系（如校长、教师、教学助理）？", "학습자는 위계를 인식할 수 있습니까(예: 교장, 교사, 교육 보조원)?", "social_norms"),

  hdr("cdp_si_s8_hdr", "Recognizing How Others Are Feeling", "识别他人的情感状态", "타인의 감정 인식", "empathy_emotions"),
  q("cdp_si_s8_1", "Can the learner recognize how people are feeling through their tone of voice?", "学习者能否通过语调识别他人的情感状态？", "학습자는 목소리 톤을 통해 사람들의 감정 상태를 인식할 수 있습니까?", "empathy_emotions"),

  hdr("cdp_si_s9_hdr", "Recognize My Needs", "认识自身需求", "나의 필요 인식", "self_advocacy"),
  q("cdp_si_s9_1", "Is the learner aware of the difference between urgent and non-urgent needs (e.g., asking for a toilet pass in good time)?", "学习者是否意识到紧急与非紧急需求的区别（如及时申请如厕许可）？", "학습자는 긴급한 필요와 비긴급한 필요의 차이를 인식합니까(예: 적시에 화장실 허가 요청)?", "self_advocacy"),
  q("cdp_si_s9_2", "Does the learner recognize when it is ok to refuse an adult (e.g., 'no thanks')?", "学习者是否知道何时可以拒绝成人（如\"不用了，谢谢\"）？", "학습자는 어른을 거절해도 될 때를 인식합니까(예: '괜찮아요, 감사합니다')?", "self_advocacy"),
  q("cdp_si_s9_3", "Does the learner recognize when it is ok to refuse a peer (e.g., when asked to join a game)?", "学习者是否知道何时可以拒绝同伴（如被邀请参加游戏时）？", "학습자는 또래를 거절해도 될 때를 인식합니까(예: 게임 참여 요청을 받았을 때)?", "self_advocacy"),

  hdr("cdp_si_s10_hdr", "Sincerity", "真诚", "진실성", "social_norms"),
  q("cdp_si_s10_1", "Is the learner able to show their appreciation for something (e.g., thanking somebody for offering help)?", "学习者是否能表达对某事的感激之情（如感谢他人提供帮助）？", "학습자는 무언가에 대한 감사를 표현할 수 있습니까(예: 도움을 제공해 준 사람에게 감사하기)?", "social_norms"),
  q("cdp_si_s10_2", "Does the learner show sincerity when apologizing?", "学习者道歉时是否表现出真诚？", "학습자는 사과할 때 진심을 보여줍니까?", "social_norms"),

  hdr("cdp_si_s11_hdr", "Being Assertive", "自信表达", "자기 주장", "self_advocacy"),
  q("cdp_si_s11_1", "Can the learner recognize the difference between being assertive and aggressive?", "学习者能否区分自信表达与攻击性行为的区别？", "학습자는 자기 주장과 공격적 행동의 차이를 인식할 수 있습니까?", "self_advocacy"),
  q("cdp_si_s11_2", "Is the learner able to demonstrate assertive body language in a role-play activity or drama class?", "学习者是否能在角色扮演或戏剧课上展示自信的肢体语言？", "학습자는 역할극이나 연극 수업에서 자기 주장적인 몸짓 언어를 보여줄 수 있습니까?", "self_advocacy"),

  hdr("cdp_si_s12_hdr", "Meaning \"No\"", "表达\"不\"的含义", "'아니오'라는 의미", "self_advocacy"),
  q("cdp_si_s12_1", "Does the learner understand that saying 'no' means 'no'?", "学习者是否理解说\"不\"就意味着\"不\"？", "학습자는 '아니오'라고 말하는 것이 '아니오'를 의미한다는 것을 이해합니까?", "self_advocacy"),
  q("cdp_si_s12_2", "Is the learner able to demonstrate body language associated with saying no (e.g., walking away, telling others to stop, refusing to join in)?", "学习者是否能展示与说不相关的肢体语言（如走开、叫他人停止、拒绝参与）？", "학습자는 거절과 관련된 몸짓 언어를 보여줄 수 있습니까(예: 자리 피하기, 멈추라고 말하기, 참여 거부)?", "self_advocacy"),

  hdr("cdp_si_s13_hdr", "Managing Personal Success", "管理个人成就", "개인적 성취 관리", "social_norms"),
  q("cdp_si_s13_1", "Does the learner celebrate their own success in making progress at school (e.g., enjoying visual rewards or special interest time)?", "学习者是否庆祝自己在学校取得的进步（如享受视觉奖励或特别兴趣时间）？", "학습자는 학교에서의 발전에 대한 자신의 성공을 축하합니까(예: 시각적 보상이나 특별 관심 시간 즐기기)?", "social_norms"),

  hdr("cdp_si_s14_hdr", "Guessing What Another Person Will Do", "猜测他人将要做什么", "타인의 행동 예측", "empathy_emotions"),
  q("cdp_si_s14_1", "Can the learner predict what someone is going to do by watching their actions?", "学习者能否通过观察他人的行为来预测他们将要做什么？", "학습자는 타인의 행동을 관찰하여 그들이 무엇을 할 것인지 예측할 수 있습니까?", "empathy_emotions"),

  hdr("cdp_si_s15_hdr", "Friendship", "友谊", "우정", "friendship"),
  q("cdp_si_s15_1", "Does the learner form friendships (e.g., gravitate towards known friends, or participate in a group activity)?", "学习者是否能建立友谊（如向已认识的朋友靠拢，或参与集体活动）？", "학습자는 우정을 형성합니까(예: 알고 있는 친구에게 다가가거나 집단 활동에 참여하기)?", "friendship"),
  q("cdp_si_s15_2", "Is the learner able to engage with more than one friend at the same time?", "学习者是否能同时与超过一个朋友互动？", "학습자는 동시에 한 명 이상의 친구와 교류할 수 있습니까?", "friendship"),
  q("cdp_si_s15_3", "Can the learner receive compliments appropriately?", "学习者能否适当地接受赞美？", "학습자는 칭찬을 적절하게 받아들일 수 있습니까?", "friendship"),

  hdr("cdp_si_s16_hdr", "Trusting Me", "信任我", "나를 신뢰하기", "friendship"),
  q("cdp_si_s16_1", "Is the learner able to discuss a problem with a familiar adult or peer in order to get help to repair a situation or solve a problem?", "学习者是否能与熟悉的成人或同伴讨论问题，以寻求帮助解决情况或问题？", "학습자는 상황을 개선하거나 문제를 해결하기 위해 친숙한 어른이나 또래와 문제를 논의할 수 있습니까?", "friendship"),
  q("cdp_si_s16_2", "Does the learner know when to share information or when it is ok to keep it secret (e.g., Peter bought a surprise gift for John's birthday)?", "学习者是否知道何时分享信息，或何时可以保守秘密（如彼得为约翰的生日买了惊喜礼物）？", "학습자는 언제 정보를 공유해야 하는지, 또는 언제 비밀을 지켜도 되는지 알고 있습니까(예: 피터가 존의 생일을 위해 깜짝 선물을 샀을 때)?", "friendship"),

  hdr("cdp_si_s17_hdr", "My Personal Safety Rules", "我的个人安全规则", "나의 개인 안전 규칙", "safety_awareness"),
  q("cdp_si_s17_1", "Does the learner recognize that generic safety rules apply across different environments (e.g., don't touch a hot oven, wear safety goggles in science, use a bicycle helmet)?", "学习者是否认识到通用安全规则适用于不同环境（如不触摸热烤箱、科学课戴护目镜、骑车戴头盔）？", "학습자는 일반적인 안전 규칙이 다양한 환경에 적용됨을 인식합니까(예: 뜨거운 오븐 만지지 않기, 과학 시간에 보호 안경 착용, 자전거 헬멧 착용)?", "safety_awareness"),
  q("cdp_si_s17_2", "Will the learner seek help using known strategies when they feel unsafe or threatened (e.g., 'I'm scared of dogs — can you help me?')?", "当学习者感到不安全或受到威胁时，是否会使用已知策略寻求帮助（如\"我害怕狗——你能帮我吗？\"）？", "학습자는 안전하지 않거나 위협을 느낄 때 알려진 전략을 사용하여 도움을 구합니까(예: '저는 개가 무서워요 — 도와주실 수 있나요?')?", "safety_awareness"),

  hdr("cdp_si_s18_hdr", "Dealing with Conflict", "处理冲突", "갈등 처리", "conflict_resolution"),
  q("cdp_si_s18_1", "Is the learner able to engage in a compromise?", "学习者是否能参与妥协？", "학습자는 타협에 참여할 수 있습니까?", "conflict_resolution"),
  q("cdp_si_s18_2", "Can the learner identify reasons for a breakdown with another person (e.g., 'He has been nasty to me')?", "学习者能否找出与他人关系破裂的原因（如\"他一直对我很粗鲁\"）？", "학습자는 다른 사람과의 관계 붕괴 이유를 파악할 수 있습니까(예: '그는 나에게 계속 못되게 굴었어요')?", "conflict_resolution"),

  hdr("cdp_si_s19_hdr", "Safety in My Community", "社区安全", "지역사회에서의 안전", "safety_awareness"),
  q("cdp_si_s19_1", "Is the learner able to convey an emergency message?", "学习者是否能传达紧急信息？", "학습자는 긴급 메시지를 전달할 수 있습니까?", "safety_awareness"),
  q("cdp_si_s19_2", "Does the learner understand why they have to follow instructions from an unfamiliar adult in a community support role (e.g., a police officer, social worker)?", "学习者是否理解为何需要遵从担任社区支持角色的陌生成人的指令（如警察、社会工作者）？", "학습자는 지역사회 지원 역할을 맡은 낯선 어른(예: 경찰관, 사회복지사)의 지시를 따라야 하는 이유를 이해합니까?", "safety_awareness"),

  hdr("cdp_si_s20_hdr", "Emotional Understanding", "情感理解", "감정 이해", "empathy_emotions"),
  q("cdp_si_s20_1", "Can the learner recognize that different people have different emotional responses to the same stimulus or activity (e.g., one person likes Harry Potter, the other shows no interest)?", "学习者能否认识到不同的人对相同的刺激或活动有不同的情感反应（如一人喜欢哈利波特，另一人毫无兴趣）？", "학습자는 다른 사람들이 같은 자극이나 활동에 대해 다른 감정 반응을 가질 수 있음을 인식합니까(예: 한 사람은 해리포터를 좋아하고 다른 사람은 관심이 없음)?", "empathy_emotions"),

  hdr("cdp_si_s21_hdr", "Intent", "意图", "의도", "conflict_resolution"),
  q("cdp_si_s21_1", "Does the learner understand why they need to explain their actions so that others understand their intent (e.g., 'I didn't mean to ignore you, I was running for the bus')?", "学习者是否理解为何需要解释自己的行为让他人理解其意图（如\"我不是有意忽视你，我在赶公车\"）？", "학습자는 다른 사람들이 자신의 의도를 이해할 수 있도록 행동을 설명해야 하는 이유를 이해합니까(예: '당신을 무시하려던 게 아니라, 버스를 타러 뛰고 있었어요')?", "conflict_resolution"),
  q("cdp_si_s21_2", "Is the learner able to repair the situation by explaining their actions?", "学习者是否能通过解释自己的行为来修复情况？", "학습자는 자신의 행동을 설명하여 상황을 회복할 수 있습니까?", "conflict_resolution"),
  q("cdp_si_s21_3", "Does the learner understand the need to sometimes explain their actions or behaviors (e.g., in the case of an accident or wrongdoing)?", "学习者是否理解有时需要解释自己行为（如在意外事故或不当行为的情况下）的必要性？", "학습자는 때로는 자신의 행동을 설명해야 할 필요성을 이해합니까(예: 사고나 잘못된 행동의 경우)?", "conflict_resolution"),

  hdr("cdp_si_s22_hdr", "Coping with Negative Behaviors", "应对负面行为", "부정적 행동에 대처하기", "conflict_resolution"),
  q("cdp_si_s22_1", "Does the learner cope appropriately with their emotional state when faced with negative situations?", "学习者在面对负面情境时是否能适当处理自己的情绪状态？", "학습자는 부정적인 상황에 직면했을 때 자신의 감정 상태를 적절하게 처리합니까?", "conflict_resolution"),
  q("cdp_si_s22_2", "Does the learner accept help from an adult in resolving issues?", "学习者是否接受成人的帮助来解决问题？", "학습자는 문제 해결을 위해 어른의 도움을 받아들입니까?", "conflict_resolution"),

  hdr("cdp_si_s23_hdr", "Social Behaviors", "社会行为", "사회적 행동", "social_norms"),
  q("cdp_si_s23_1", "Is the learner able to express when a situation or decision is fair or unfair?", "学习者是否能表达某个情境或决定是否公平？", "학습자는 상황이나 결정이 공평한지 불공평한지 표현할 수 있습니까?", "social_norms"),
  q("cdp_si_s23_2", "Is the learner able to apologize for inappropriate behavior (e.g., 'I am sorry I called you names, I did not mean to hurt you')?", "学习者是否能为不当行为道歉（如\"对不起我骂了你，我不是有意要伤害你\"）？", "학습자는 부적절한 행동에 대해 사과할 수 있습니까(예: '당신에게 욕설을 해서 미안해요, 상처 줄 의도가 없었어요')?", "social_norms"),
  q("cdp_si_s23_3", "Does the learner use appropriate communication style to express disagreement in different settings (e.g., the difference between disagreeing with a sibling and disagreeing with an authority figure)?", "学习者是否在不同场合使用适当的沟通方式表达不同意见（如与兄弟姐妹意见不同与对权威人物表达不同意见的区别）？", "학습자는 다양한 상황에서 적절한 의사소통 방식을 사용하여 이견을 표현합니까(예: 형제자매와의 이견과 권위 있는 인물과의 이견 표현의 차이)?", "social_norms"),

  hdr("cdp_si_s24_hdr", "Influence", "影响力", "영향력", "self_advocacy"),
  q("cdp_si_s24_1", "Can the learner identify people who can help them to make choices (e.g., teacher, parent, doctor, friend)?", "学习者能否找出能帮助他们做出选择的人（如教师、家长、医生、朋友）？", "학습자는 선택을 하는 데 도움을 줄 수 있는 사람들을 파악할 수 있습니까(예: 교사, 부모, 의사, 친구)?", "self_advocacy"),

  hdr("cdp_si_s25_hdr", "Disagreeing", "表达不同意见", "이견 표현", "self_advocacy"),
  q("cdp_si_s25_1", "Is the learner able to calmly speak to strengthen their argument?", "学习者是否能冷静地表达以强化自己的论点？", "학습자는 자신의 주장을 강화하기 위해 침착하게 말할 수 있습니까?", "self_advocacy"),
  q("cdp_si_s25_2", "Does the learner understand that they shouldn't always say what they are thinking (e.g., 'You are fat')?", "学习者是否理解不应该总是说出自己所想（如\"你很胖\"）？", "학습자는 자신이 생각하는 것을 항상 말해서는 안 된다는 것을 이해합니까(예: '당신은 뚱뚱해요')?", "self_advocacy"),

  hdr("cdp_si_s26_hdr", "Company of Others", "与他人相处", "타인과의 교류", "social_norms"),
  q("cdp_si_s26_1", "Can the learner describe ways of showing respect?", "学习者能否描述表示尊重的方式？", "학습자는 존중을 표현하는 방법을 설명할 수 있습니까?", "social_norms"),
  q("cdp_si_s26_2", "Can the learner explain why they make people happy?", "学习者能否解释为什么自己会让别人感到快乐？", "학습자는 자신이 사람들을 행복하게 만드는 이유를 설명할 수 있습니까?", "social_norms"),

  hdr("cdp_si_s27_hdr", "Honesty", "诚实", "정직", "social_norms"),
  q("cdp_si_s27_1", "Can the learner recognize a lie?", "学习者能否识别谎言？", "학습자는 거짓말을 인식할 수 있습니까?", "social_norms"),
  q("cdp_si_s27_2", "Is the learner able to recognize there are times when it is acceptable not to tell the truth (e.g., a white lie)?", "学习者是否能认识到有时不说实话是可以接受的（如善意的谎言）？", "학습자는 때로는 진실을 말하지 않아도 되는 경우가 있음을 인식할 수 있습니까(예: 선의의 거짓말)?", "social_norms"),

  hdr("cdp_si_s28_hdr", "Sustaining a Consistent Peer Relationship", "维持稳定的同伴关系", "일관된 또래 관계 유지", "friendship"),
  q("cdp_si_s28_1", "Will the learner defend their friend in a confrontation?", "在对抗中，学习者是否会为朋友辩护？", "학습자는 대립 상황에서 친구를 변호합니까?", "friendship"),
  q("cdp_si_s28_2", "Does the learner spend time with friends (e.g., break times, lunch time)?", "学习者是否与朋友共度时光（如课间和午休时间）？", "학습자는 친구와 시간을 보냅니까(예: 쉬는 시간, 점심 시간)?", "friendship"),
  q("cdp_si_s28_3", "Will the learner respond appropriately to a friend's request for support?", "学习者是否会对朋友的支持请求做出适当回应？", "학습자는 친구의 지원 요청에 적절하게 반응합니까?", "friendship"),
  q("cdp_si_s28_4", "Can the learner remain focused on a friend's conversation without diverting focus back to themselves?", "学习者能否专注于朋友的谈话而不将焦点转回自己身上？", "학습자는 주의를 자신에게 돌리지 않고 친구의 대화에 집중할 수 있습니까?", "friendship"),

  hdr("cdp_si_s29_hdr", "Approaching Social Relationships", "建立社交关系", "사회적 관계 접근", "friendship"),
  q("cdp_si_s29_1", "Can the learner use appropriate communication (verbal, signs, pictures) to ask another person out on a date?", "学习者能否使用适当的沟通方式（言语、手势、图片）邀请另一个人约会？", "학습자는 적절한 의사소통(구두, 기호, 그림)을 사용하여 다른 사람에게 데이트 신청을 할 수 있습니까?", "friendship"),
  q("cdp_si_s29_2", "Does the learner show appropriate complimentary behavior towards a potential companion (e.g., 'Your hair looks nice today')?", "学习者是否对潜在伴侣展示适当的赞美行为（如\"你今天的头发很好看\"）？", "학습자는 잠재적인 동반자에게 적절한 칭찬 행동을 보입니까(예: '오늘 머리 예쁘네요')?", "friendship"),
  q("cdp_si_s29_3", "Does the learner understand the appropriate choice of companion (e.g., of the same generation, has some interests in common)?", "学习者是否理解适当选择伴侣的标准（如同年龄段、有共同兴趣）？", "학습자는 적절한 동반자 선택을 이해합니까(예: 같은 세대, 공통 관심사)?", "friendship"),

  hdr("cdp_si_s30_hdr", "Drugs, Alcohol, and Sex", "毒品、酒精与性", "마약, 알코올, 성", "safety_awareness"),
  q("cdp_si_s30_1", "Does the learner understand the meaning of consent and associated age limits?", "学习者是否理解同意的含义及相关年龄限制？", "학습자는 동의의 의미와 관련 연령 제한을 이해합니까?", "safety_awareness"),
  q("cdp_si_s30_2", "Can the learner identify signs of an abusive or exploitative relationship (e.g., a social media friend request asking for a photo)?", "学习者能否识别虐待或剥削性关系的迹象（如社交媒体上要求发照片的好友请求）？", "학습자는 착취적이거나 학대적인 관계의 신호를 식별할 수 있습니까(예: 사진을 요청하는 소셜 미디어 친구 요청)?", "safety_awareness"),
  q("cdp_si_s30_3", "Does the learner know that alcohol and drugs may affect sexual choices and behavior?", "学习者是否知道酒精和毒品可能影响性行为选择？", "학습자는 알코올과 마약이 성적 선택과 행동에 영향을 미칠 수 있다는 것을 알고 있습니까?", "safety_awareness"),

  hdr("cdp_si_s31_hdr", "Reflective", "反思性", "성찰적 사고", "self_advocacy"),
  q("cdp_si_s31_1", "Is the learner able to independently analyze a situation on media clips?", "学习者是否能独立分析媒体视频中的情境？", "학습자는 미디어 클립에서 상황을 독립적으로 분석할 수 있습니까?", "self_advocacy"),
  q("cdp_si_s31_2", "Does the learner reflect on their social conversations (e.g., what went well, what would you do differently next time)?", "学习者是否反思自己的社交对话（如什么做得好，下次会有哪些不同）？", "학습자는 자신의 사회적 대화를 되돌아봅니까(예: 잘 된 점, 다음에는 어떻게 다르게 할지)?", "self_advocacy"),
  q("cdp_si_s31_3", "After independently analyzing a situation on media, is the learner able to discuss it within a group?", "在独立分析媒体中的情境后，学习者是否能在小组内讨论？", "미디어에서 상황을 독립적으로 분석한 후, 학습자는 그룹 내에서 그것을 논의할 수 있습니까?", "self_advocacy"),

  hdr("cdp_si_s32_hdr", "Morals", "道德", "도덕", "social_norms"),
  q("cdp_si_s32_1", "Can the learner understand why people break rules (e.g., stealing, trespassing, property destruction)?", "学习者能否理解人们违反规则的原因（如偷盗、擅闯、破坏财物）？", "학습자는 사람들이 규칙을 어기는 이유를 이해할 수 있습니까(예: 절도, 무단침입, 재산 파괴)?", "social_norms"),
  q("cdp_si_s32_2", "Does the learner recognize the difference between legality and morality?", "学习者是否能区分合法性与道德性的差异？", "학습자는 합법성과 도덕성의 차이를 인식합니까?", "social_norms"),

  hdr("cdp_si_s33_hdr", "Complaining Effectively", "有效投诉", "효과적인 불평 표현", "self_advocacy"),
  q("cdp_si_s33_1", "Can the learner make a complaint supported by appropriate facial expression and body language?", "学习者能否配合适当的面部表情和肢体语言提出投诉？", "학습자는 적절한 표정과 몸짓 언어를 동반하여 불평을 할 수 있습니까?", "self_advocacy"),
  q("cdp_si_s33_2", "Is the learner able to associate complaints with different scenarios (e.g., speaking to the manager or writing an email)?", "学习者是否能将投诉与不同场景联系起来（如向经理反映或写电子邮件）？", "학습자는 불평을 다양한 시나리오와 연관 지을 수 있습니까(예: 관리자에게 말하기 또는 이메일 쓰기)?", "self_advocacy"),

  hdr("cdp_si_s34_hdr", "Dealing with Peer Pressure", "应对同伴压力", "또래 압박 대처", "conflict_resolution"),
  q("cdp_si_s34_1", "Can the learner identify two ways in which peer pressure can positively affect someone?", "学习者能否找出同伴压力对人产生积极影响的两种方式？", "학습자는 또래 압박이 긍정적으로 영향을 미칠 수 있는 두 가지 방법을 파악할 수 있습니까?", "conflict_resolution"),
  q("cdp_si_s34_2", "Can the learner identify two ways in which peer pressure can negatively affect someone?", "学习者能否找出同伴压力对人产生负面影响的两种方式？", "학습자는 또래 압박이 부정적으로 영향을 미칠 수 있는 두 가지 방법을 파악할 수 있습니까?", "conflict_resolution"),

  hdr("cdp_si_s35_hdr", "My Independence", "我的独立性", "나의 독립성", "self_advocacy"),
  q("cdp_si_s35_1", "Can the learner suggest ways to help at home (e.g., chores, sorting laundry, shopping)?", "学习者能否建议在家里帮忙的方式（如做家务、整理衣物、购物）？", "학습자는 집에서 도울 수 있는 방법을 제안할 수 있습니까(예: 집안일, 세탁물 정리, 쇼핑)?", "self_advocacy"),
  q("cdp_si_s35_2", "Does the learner know how to use household appliances (e.g., microwave, vacuum cleaner, lawn mower)?", "学习者是否知道如何使用家用电器（如微波炉、吸尘器、割草机）？", "학습자는 가전제품 사용 방법을 알고 있습니까(예: 전자레인지, 진공청소기, 잔디 깎는 기계)?", "self_advocacy"),

  hdr("cdp_si_s36_hdr", "Using Assertiveness", "运用自信表达", "자기 주장 활용", "self_advocacy"),
  q("cdp_si_s36_1", "Is the learner able to assert themselves by asking appropriate questions in a confrontational situation?", "学习者在对抗性情境中是否能通过提出适当问题来表达自我？", "학습자는 대립적인 상황에서 적절한 질문을 하여 자신을 주장할 수 있습니까?", "self_advocacy"),

  hdr("cdp_si_s37_hdr", "My Plans", "我的计划", "나의 계획", "self_advocacy"),
  q("cdp_si_s37_1", "Can the learner understand why they need to inform relevant adults of their plans?", "学习者是否理解为何需要将自己的计划告知相关成人？", "학습자는 자신의 계획을 관련 어른에게 알려야 하는 이유를 이해할 수 있습니까?", "self_advocacy"),

  hdr("cdp_si_s38_hdr", "Consequences of What I Say", "我言论的后果", "내 말의 결과", "social_norms"),
  q("cdp_si_s38_1", "Does the learner follow group rules in order to work cooperatively (e.g., listen to others, wait for a gap to speak, don't interrupt)?", "学习者是否遵守集体规则以进行合作（如倾听他人、等待间歇再发言、不打断别人）？", "학습자는 협력하여 작업하기 위해 집단 규칙을 따릅니까(예: 타인의 말 듣기, 발언 기회 기다리기, 끼어들지 않기)?", "social_norms"),
  q("cdp_si_s38_2", "Is the learner able to explain what behaviors give a good impression (e.g., good manners, appropriate behavior, complimenting others, being helpful)?", "学习者是否能解释哪些行为能给人留下好印象（如礼貌待人、行为得体、赞美他人、乐于助人）？", "학습자는 좋은 인상을 주는 행동을 설명할 수 있습니까(예: 예의 바른 행동, 적절한 행동, 다른 사람 칭찬하기, 도움이 되기)?", "social_norms"),
];
