import type { FormQuestion } from "./questions.js";

// ─── Shared option sets ───────────────────────────────────────────────────────

const SDQ_EN  = ["Not True", "Somewhat True", "Certainly True"];
const SDQ_ZH  = ["不对", "有点对", "完全对"];
const SDQ_KO  = ["그렇지 않다", "다소 그렇다", "확실히 그렇다"];

const FREQ4_EN = ["Not at all", "Several days", "More than half the days", "Nearly every day"];
const FREQ4_ZH = ["完全不会", "几天", "超过一半的天数", "几乎每天"];
const FREQ4_KO = ["전혀 없었다", "며칠 동안", "절반 이상의 날", "거의 매일"];

const DASS_EN = ["Did not apply to me at all", "Applied to me to some degree, or some of the time", "Applied to me to a considerable degree, or a good part of time", "Applied to me very much, or most of the time"];
const DASS_ZH = ["完全不符合", "有时符合，程度较轻", "经常符合，程度较重", "总是符合，非常符合"];
const DASS_KO = ["전혀 해당되지 않는다", "어느 정도 또는 가끔 해당된다", "상당히 또는 자주 해당된다", "매우 많이 또는 대부분 해당된다"];

const PSC_EN  = ["Never", "Sometimes", "Often"];
const PSC_ZH  = ["从不", "有时", "经常"];
const PSC_KO  = ["전혀 없다", "때때로", "자주"];

const SA4_EN  = ["Strongly Agree", "Agree", "Disagree", "Strongly Disagree"];
const SA4_ZH  = ["非常同意", "同意", "不同意", "非常不同意"];
const SA4_KO  = ["매우 동의한다", "동의한다", "동의하지 않는다", "매우 동의하지 않는다"];

const PSS_EN  = ["Never", "Almost Never", "Sometimes", "Fairly Often", "Very Often"];
const PSS_ZH  = ["从不", "几乎从不", "有时", "相当频繁", "非常频繁"];
const PSS_KO  = ["전혀 없다", "거의 없다", "때때로", "자주", "매우 자주"];

const WHO5_EN = ["All of the time", "Most of the time", "More than half of the time", "Less than half of the time", "Some of the time", "At no time"];
const WHO5_ZH = ["一直如此", "大部分时间", "超过一半时间", "不到一半时间", "一部分时间", "完全没有"];
const WHO5_KO = ["항상", "대부분의 시간", "절반 이상의 시간", "절반 미만의 시간", "일부 시간", "전혀 없다"];

const SMFQ_EN = ["True", "Sometimes", "Not True"];
const SMFQ_ZH = ["是", "有时", "不是"];
const SMFQ_KO = ["그렇다", "때때로", "그렇지 않다"];

const GHQ_POS_EN = ["Better than usual", "Same as usual", "Less than usual", "Much less than usual"];
const GHQ_POS_ZH = ["比平时好", "与平时相同", "比平时差", "比平时差得多"];
const GHQ_POS_KO = ["평소보다 좋다", "평소와 같다", "평소보다 나쁘다", "평소보다 훨씬 나쁘다"];

const GHQ_NEG_EN = ["Not at all", "No more than usual", "Rather more than usual", "Much more than usual"];
const GHQ_NEG_ZH = ["完全没有", "与平时相同", "比平时稍多", "比平时多得多"];
const GHQ_NEG_KO = ["전혀 없다", "평소와 같다", "평소보다 약간 많다", "평소보다 훨씬 많다"];

const AUDIT_FREQ_EN = ["Never", "Monthly or less", "2 to 4 times a month", "2 to 3 times a week", "4 or more times a week"];
const AUDIT_FREQ_ZH = ["从不", "每月一次或更少", "每月2-4次", "每周2-3次", "每周4次或以上"];
const AUDIT_FREQ_KO = ["전혀 없다", "한 달에 한 번 이하", "한 달에 2-4번", "일주일에 2-3번", "일주일에 4번 이상"];

const AUDIT_QTY_EN = ["1 or 2", "3 or 4", "5 or 6", "7, 8, or 9", "10 or more"];
const AUDIT_QTY_ZH = ["1或2杯", "3或4杯", "5或6杯", "7、8或9杯", "10杯或以上"];
const AUDIT_QTY_KO = ["1~2잔", "3~4잔", "5~6잔", "7~9잔", "10잔 이상"];

const AUDIT_YN_EN = ["No", "Yes, but not in the last year", "Yes, during the last year"];
const AUDIT_YN_ZH = ["否", "是，但不是在过去一年内", "是，在过去一年内"];
const AUDIT_YN_KO = ["아니다", "그렇다, 하지만 지난 1년 이내는 아니다", "그렇다, 지난 1년 이내에"];

const BULLY_EN = ["Never", "Once or twice", "2 or 3 times a month", "About once a week", "Several times a week"];
const BULLY_ZH = ["从不", "一两次", "每月2-3次", "每周约一次", "每周几次"];
const BULLY_KO = ["전혀 없다", "한두 번", "한 달에 2~3번", "약 일주일에 한 번", "일주일에 여러 번"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const q = (
  id: string, en: string, zh: string, ko: string,
  opts: string[], optsZh: string[], optsKo: string[],
  domain: string,
  type: FormQuestion["type"] = "likert",
): FormQuestion => ({
  id, text: en, textChinese: zh, textKorean: ko,
  type, options: opts, optionsChinese: optsZh, optionsKorean: optsKo,
  domain, required: true,
});

const h = (id: string, en: string, zh: string, ko: string, domain: string): FormQuestion => ({
  id, text: en, textChinese: zh, textKorean: ko,
  type: "section_header", options: [], optionsChinese: [], optionsKorean: [],
  domain, required: false,
});

// ═══════════════════════════════════════════════════════════════════════════════
// SDQ – Strengths and Difficulties Questionnaire
// 6 variants: P4-10, P11-18, T4-10, T11-18, SR11-18, SR18+
// ═══════════════════════════════════════════════════════════════════════════════

const SDQ_IMPACT4_EN = ["Not at all", "Only a little", "A medium amount", "A great deal"];
const SDQ_IMPACT4_ZH = ["一点也不", "只有一点点", "适量", "很多"];
const SDQ_IMPACT4_KO = ["전혀 없다", "조금", "중간 정도", "매우 많다"];

const SDQ_IMPACT_YN_EN = ["No", "Yes - minor difficulties", "Yes - definite difficulties", "Yes - severe difficulties"];
const SDQ_IMPACT_YN_ZH = ["否", "是 - 轻微困难", "是 - 明确困难", "是 - 严重困难"];
const SDQ_IMPACT_YN_KO = ["아니오", "예 - 경미한 어려움", "예 - 명확한 어려움", "예 - 심각한 어려움"];

const SDQ_DURATION_EN = ["Less than a month", "1-5 months", "6-12 months", "Over a year"];
const SDQ_DURATION_ZH = ["不到一个月", "1-5个月", "6-12个月", "超过一年"];
const SDQ_DURATION_KO = ["한 달 미만", "1~5개월", "6~12개월", "1년 이상"];

const ta = (id: string, en: string, zh: string, ko: string): FormQuestion => ({
  id, text: en, textChinese: zh, textKorean: ko,
  type: "textarea", options: [], optionsChinese: [], optionsKorean: [],
  domain: "impact", required: false,
});
const rg = (id: string, en: string, zh: string, ko: string, opts: string[], optsZh: string[], optsKo: string[]): FormQuestion => ({
  id, text: en, textChinese: zh, textKorean: ko,
  type: "radio_group", options: opts, optionsChinese: optsZh, optionsKorean: optsKo,
  domain: "impact", required: true,
});
const gr = (id: string, en: string, zh: string, ko: string): FormQuestion => ({
  id, text: en, textChinese: zh, textKorean: ko,
  type: "likert", options: SDQ_IMPACT4_EN, optionsChinese: SDQ_IMPACT4_ZH, optionsKorean: SDQ_IMPACT4_KO,
  domain: "impact", required: true,
});
const gq = (id: string, en: string, zh: string, ko: string, rows: FormQuestion[]): FormQuestion => ({
  id, text: en, textChinese: zh, textKorean: ko,
  type: "frequency_grid", options: SDQ_IMPACT4_EN, optionsChinese: SDQ_IMPACT4_ZH, optionsKorean: SDQ_IMPACT4_KO,
  domain: "impact", required: true, rows,
});
const txt = (id: string, en: string, zh: string, ko: string): FormQuestion => ({
  id, text: en, textChinese: zh, textKorean: ko,
  type: "text", options: [], optionsChinese: [], optionsKorean: [],
  domain: "admin", required: true,
});
const rdg = (id: string, en: string, zh: string, ko: string, opts: string[], optsZh: string[], optsKo: string[], req = true): FormQuestion => ({
  id, text: en, textChinese: zh, textKorean: ko,
  type: "radio_group", options: opts, optionsChinese: optsZh, optionsKorean: optsKo,
  domain: "admin", required: req,
});

// ─── P4-10: Parent form, Ages 4-10 (English + Chinese from document) ──────────
export const SDQ_P4_FORM: FormQuestion[] = [
  txt("sdqp4_name",      "Student's name",                    "学生姓名",      "학생 이름"),
  txt("sdqp4_dob",       "Date of Birth",                     "出生日期",      "생년월일"),
  rdg("sdqp4_gender",    "Gender",                            "性别",          "성별",   ["Male","Female"], ["男","女"], ["남","여"]),
  { id:"sdqp4_respondent", text:"Name of person filling out this form", textChinese:"填写此表格者的姓名", textKorean:"이 양식을 작성하는 분의 이름", type:"text", options:[], optionsChinese:[], optionsKorean:[], domain:"admin", required:false },

  q("sdqp4_1",  "Considerate of other people's feelings",                                  "能体谅到别人的感受",                              "다른 사람의 감정을 배려한다",                          SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqp4_2",  "Restless, overactive, cannot stay still for long",                        "不安定、过分活跃、不能长久静止",                  "안절부절못하고 과잉활동적이며 오래 가만히 있지 못한다", SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqp4_3",  "Often complains of headaches, stomach-aches or sickness",                 "经常抱怨头痛、肚子痛或恶心",                      "자주 두통, 복통 또는 아프다고 불평한다",               SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqp4_4",  "Shares readily with other children, for example toys, treats, pencils",   "很乐意与别的小孩分享东西（糖果、玩具、笔等等）",  "다른 아이들과 기꺼이 나눈다 (장난감, 간식, 연필 등)", SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqp4_5",  "Often loses temper",                                                      "经常发脾气，易怒",                                "자주 성질을 부리거나 화를 잘 낸다",                    SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqp4_6",  "Rather solitary, prefers to play alone",                                  "颇孤独，比较多自己玩",                            "혼자 있으려 하고 혼자 노는 것을 좋아한다",             SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqp4_7",  "Generally well behaved, usually does what adults request",                "一般来说比较顺从，通常是成年人要求要做的都肯做",  "일반적으로 행동이 바르고 어른의 요청대로 한다",        SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqp4_8",  "Many worries or often seems worried",                                     "有很多担忧，经常表现出忧虑",                      "걱정이 많거나 자주 걱정하는 것처럼 보인다",            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqp4_9",  "Helpful if someone is hurt, upset or feeling ill",                        "如果有人受伤、沮丧或是生病，都很乐意提供帮助",    "누군가 다치거나 속상하거나 아프면 도와준다",           SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqp4_10", "Constantly fidgeting or squirming",                                       "当坐着时，会持续不断地摆弄手脚或扭动身子",        "끊임없이 몸을 꼼지락거리거나 뒤척인다",               SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqp4_11", "Has at least one good friend",                                            "至少有一个好朋友",                                "적어도 한 명의 좋은 친구가 있다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqp4_12", "Often fights with others or bullies them",                                "经常与别的小孩吵架或欺负他们",                    "자주 다른 아이들과 싸우거나 괴롭힌다",                SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqp4_13", "Often unhappy, depressed or tearful",                                     "经常不高兴、情绪低落或哭泣",                      "자주 불행하거나 우울하거나 눈물을 흘린다",            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqp4_14", "Generally liked by others",                                               "一般来说，受别的小孩所喜欢",                      "일반적으로 다른 아이들에게 인기가 있다",              SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqp4_15", "Easily distracted, concentration wanders",                                "容易分心，不能全神贯注",                          "쉽게 산만해지고 집중력이 흐트러진다",                 SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqp4_16", "Nervous or clingy in new situations, easily loses confidence",            "在新的情况下，会紧张或爱粘人，容易失去信心",      "새로운 상황에서 불안해하거나 매달리고 자신감을 쉽게 잃는다", SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqp4_17", "Kind to younger children",                                                "对年纪小的小孩和善",                              "어린 아이들에게 친절하다",                             SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqp4_18", "Often lies or cheats",                                                    "经常撒谎或欺骗",                                  "자주 거짓말하거나 속인다",                             SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqp4_19", "Picked on or bullied by others",                                          "受别的小孩作弄或欺负",                            "다른 아이들에게 괴롭힘을 당한다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqp4_20", "Often offers to help others (parents, teachers, children)",               "经常自愿地帮助别人（父母、老师或其他小孩）",      "자주 다른 사람(부모, 교사, 아이들)을 자발적으로 돕는다", SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqp4_21", "Thinks things out before acting",                                         "做事前会思考",                                    "행동하기 전에 생각한다",                               SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqp4_22", "Steals from home, school or elsewhere",                                   "从家里、学校或其他地方偷东西",                    "집, 학교 또는 다른 곳에서 물건을 훔친다",              SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqp4_23", "Gets along better with older people than with people of his/her age",     "跟成年人相处比跟小孩相处融洽",                    "또래보다 어른들과 더 잘 어울린다",                    SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqp4_24", "Many fears, easily scared",                                               "对很多事物感到害怕，容易受惊吓",                  "두려움이 많고 쉽게 놀란다",                            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqp4_25", "Good attention span, sees work through to the end",                       "做事情能做到底，注意力持久",                      "끝까지 과제를 완수하며 주의 집중 시간이 길다",         SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),

  ta("sdqp4_comments", "Do you have any other comments or concerns?", "您还有其他意见或疑虑吗？", "다른 의견이나 우려 사항이 있으십니까?"),
  h("sdqp4_s_impact", "Impact Supplement", "影响补充", "영향 보완", "impact"),
  rg("sdqp4_change",   "Over the past 3-6 months are this person's problems:",
    "在过去的3-6个月里，这个人的问题：", "지난 3~6개월 동안 이 사람의 문제는:",
    ["Much worse","A bit worse","About the same","A bit better","Much better"],
    ["更糟糕的是","更糟一点","大致相同","好一点","好多了"],
    ["훨씬 나빠졌다","약간 나빠졌다","비슷하다","약간 나아졌다","훨씬 나아졌다"]),
  rg("sdqp4_strategy", "Has any strategy been helpful in other ways, e.g. providing information?",
    "是否有任何策略在其他方面有所帮助，例如提供信息？", "다른 방면에서 도움이 된 전략이 있었습니까? (예: 정보 제공)",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
  rg("sdqp4_overall",  "Over the last month, has your child had difficulties in one or more of the following areas: emotions, concentration, behaviour or being able to get on with other people?",
    "在过去的一个月里，您的孩子在以下一个或多个方面是否有困难：情绪、注意力、行为或能够与他人相处？",
    "지난 한 달 동안 자녀가 다음 중 하나 이상의 영역에서 어려움을 겪었습니까: 감정, 집중력, 행동 또는 다른 사람과 어울리는 것?",
    SDQ_IMPACT_YN_EN, SDQ_IMPACT_YN_ZH, SDQ_IMPACT_YN_KO),
  rg("sdqp4_distress", "Do the difficulties upset or distress your child?",
    "这些困难是否让您的孩子感到不安或痛苦？", "이 어려움이 자녀를 속상하게 하거나 괴롭힙니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
  gq("sdqp4_interfere", "Do the difficulties interfere with your child's everyday life in the following areas?",
    "这些困难是否在以下方面干扰了您孩子的日常生活？", "이 어려움이 다음 영역에서 자녀의 일상생활을 방해합니까?",
    [
      gr("sdqp4_if_home",    "HOME LIFE",          "家居生活", "가정 생활"),
      gr("sdqp4_if_friends", "FRIENDSHIPS",        "友谊",     "우정"),
      gr("sdqp4_if_class",   "CLASSROOM LEARNING", "课堂学习", "수업 학습"),
      gr("sdqp4_if_leisure", "LEISURE ACTIVITIES", "休闲活动", "여가 활동"),
    ]),
  rg("sdqp4_burden",   "Do the difficulties put a burden on you or the family as a whole?",
    "这些困难会给您或整个家庭带来负担吗？", "이 어려움이 귀하나 가족 전체에 부담이 됩니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
];

// ─── P11-18: Parent form, Ages 11-18 ─────────────────────────────────────────
export const SDQ_P11_FORM: FormQuestion[] = [
  txt("sdqp11_name",      "Student's name", "学生姓名", "학생 이름"),
  txt("sdqp11_dob",       "Date of Birth",  "出生日期", "생년월일"),
  rdg("sdqp11_gender",    "Gender",         "性别",     "성별", ["Male","Female"], ["男","女"], ["남","여"]),
  { id:"sdqp11_respondent", text:"Name of person filling out this form", textChinese:"填写此表格者的姓名", textKorean:"이 양식을 작성하는 분의 이름", type:"text", options:[], optionsChinese:[], optionsKorean:[], domain:"admin", required:false },

  q("sdqp11_1",  "Considerate of other people's feelings",                                  "能体谅到别人的感受",                              "다른 사람의 감정을 배려한다",                          SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqp11_2",  "Restless, overactive, cannot stay still for long",                        "不安定、过分活跃、不能长久静止",                  "안절부절못하고 과잉활동적이며 오래 가만히 있지 못한다", SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqp11_3",  "Often complains of headaches, stomach-aches or sickness",                 "经常抱怨头痛、肚子痛或恶心",                      "자주 두통, 복통 또는 아프다고 불평한다",               SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqp11_4",  "Shares readily with other children, for example toys, treats, pencils",   "很乐意与别的小孩分享东西（糖果、玩具、笔等等）",  "다른 아이들과 기꺼이 나눈다 (장난감, 간식, 연필 등)", SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqp11_5",  "Often loses temper",                                                      "经常发脾气，易怒",                                "자주 성질을 부리거나 화를 잘 낸다",                    SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqp11_6",  "Rather solitary, prefers to play alone",                                  "颇孤独，比较多自己玩",                            "혼자 있으려 하고 혼자 노는 것을 좋아한다",             SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqp11_7",  "Generally well behaved, usually does what adults request",                "一般来说比较顺从，通常是成年人要求要做的都肯做",  "일반적으로 행동이 바르고 어른의 요청대로 한다",        SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqp11_8",  "Many worries or often seems worried",                                     "有很多担忧，经常表现出忧虑",                      "걱정이 많거나 자주 걱정하는 것처럼 보인다",            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqp11_9",  "Helpful if someone is hurt, upset or feeling ill",                        "如果有人受伤、沮丧或是生病，都很乐意提供帮助",    "누군가 다치거나 속상하거나 아프면 도와준다",           SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqp11_10", "Constantly fidgeting or squirming",                                       "当坐着时，会持续不断地摆弄手脚或扭动身子",        "끊임없이 몸을 꼼지락거리거나 뒤척인다",               SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqp11_11", "Has at least one good friend",                                            "至少有一个好朋友",                                "적어도 한 명의 좋은 친구가 있다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqp11_12", "Often fights with others or bullies them",                                "经常与别的小孩吵架或欺负他们",                    "자주 다른 아이들과 싸우거나 괴롭힌다",                SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqp11_13", "Often unhappy, depressed or tearful",                                     "经常不高兴、情绪低落或哭泣",                      "자주 불행하거나 우울하거나 눈물을 흘린다",            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqp11_14", "Generally liked by others",                                               "一般来说，受别的小孩所喜欢",                      "일반적으로 다른 아이들에게 인기가 있다",              SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqp11_15", "Easily distracted, concentration wanders",                                "容易分心，不能全神贯注",                          "쉽게 산만해지고 집중력이 흐트러진다",                 SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqp11_16", "Nervous or clingy in new situations, easily loses confidence",            "在新的情况下，会紧张或爱粘人，容易失去信心",      "새로운 상황에서 불안해하거나 매달리고 자신감을 쉽게 잃는다", SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqp11_17", "Kind to younger children",                                                "对年纪小的小孩和善",                              "어린 아이들에게 친절하다",                             SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqp11_18", "Often lies or cheats",                                                    "经常撒谎或欺骗",                                  "자주 거짓말하거나 속인다",                             SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqp11_19", "Picked on or bullied by others",                                          "受别的小孩作弄或欺负",                            "다른 아이들에게 괴롭힘을 당한다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqp11_20", "Often offers to help others (parents, teachers, children)",               "经常自愿地帮助别人（父母、老师或其他小孩）",      "자주 다른 사람(부모, 교사, 아이들)을 자발적으로 돕는다", SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqp11_21", "Thinks things out before acting",                                         "做事前会思考",                                    "행동하기 전에 생각한다",                               SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqp11_22", "Steals from home, school or elsewhere",                                   "从家里、学校或其他地方偷东西",                    "집, 학교 또는 다른 곳에서 물건을 훔친다",              SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqp11_23", "Gets along better with older people than with people of his/her age",     "跟成年人相处比跟小孩相处融洽",                    "또래보다 어른들과 더 잘 어울린다",                    SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqp11_24", "Many fears, easily scared",                                               "对很多事物感到害怕，容易受惊吓",                  "두려움이 많고 쉽게 놀란다",                            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqp11_25", "Good attention span, sees work through to the end",                       "做事情能做到底，注意力持久",                      "끝까지 과제를 완수하며 주의 집중 시간이 길다",         SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),

  ta("sdqp11_comments", "Do you have any other comments or concerns?", "您还有其他意见或疑虑吗？", "다른 의견이나 우려 사항이 있으십니까?"),
  h("sdqp11_s_impact", "Impact Supplement", "影响补充", "영향 보완", "impact"),
  rg("sdqp11_change",   "Over the past 3-6 months are this person's problems:",
    "在过去的3-6个月里，这个人的问题：", "지난 3~6개월 동안 이 사람의 문제는:",
    ["Much worse","A bit worse","About the same","A bit better","Much better"],
    ["更糟糕","更糟一点","大致相同","好一点","好多了"],
    ["훨씬 나빠졌다","약간 나빠졌다","비슷하다","약간 나아졌다","훨씬 나아졌다"]),
  rg("sdqp11_strategy", "Has any strategy been helpful in other ways, e.g. providing information?",
    "是否有任何策略在其他方面有所帮助，例如提供信息？", "다른 방면에서 도움이 된 전략이 있었습니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
  rg("sdqp11_overall",  "Over the last month, has your child had difficulties in one or more of the following areas: emotions, concentration, behaviour or being able to get on with other people?",
    "在过去的一个月里，您的孩子在以下一个或多个方面是否有困难：情绪、注意力、行为或能够与他人相处？",
    "지난 한 달 동안 자녀가 다음 중 하나 이상의 영역에서 어려움을 겪었습니까?",
    SDQ_IMPACT_YN_EN, SDQ_IMPACT_YN_ZH, SDQ_IMPACT_YN_KO),
  rg("sdqp11_distress", "Do the difficulties upset or distress your child?",
    "这些困难是否让您的孩子感到不安或痛苦？", "이 어려움이 자녀를 속상하게 하거나 괴롭힙니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
  gq("sdqp11_interfere", "Do the difficulties interfere with your child's everyday life in the following areas?",
    "这些困难是否在以下方面干扰了您孩子的日常生活？", "이 어려움이 다음 영역에서 자녀의 일상생활을 방해합니까?",
    [
      gr("sdqp11_if_home",    "HOME LIFE",          "家居生活", "가정 생활"),
      gr("sdqp11_if_friends", "FRIENDSHIPS",        "友谊",     "우정"),
      gr("sdqp11_if_learn",   "LEARNING",           "学习",     "학습"),
      gr("sdqp11_if_leisure", "LEISURE ACTIVITIES", "休闲活动", "여가 활동"),
    ]),
  rg("sdqp11_burden",   "Do the difficulties put a burden on you or the family as a whole?",
    "这些困难会给您或整个家庭带来负担吗？", "이 어려움이 귀하나 가족 전체에 부담이 됩니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
];

// ─── T4-10: Teacher form, Ages 4-10 (English + Chinese from document) ────────
export const SDQ_T4_FORM: FormQuestion[] = [
  txt("sdqt4_name",      "Student's name", "学生姓名", "학생 이름"),
  txt("sdqt4_dob",       "Date of Birth",  "出生日期", "생년월일"),
  rdg("sdqt4_gender",    "Gender",         "性别",     "성별", ["Male","Female"], ["男","女"], ["남","여"]),
  { id:"sdqt4_respondent", text:"Name of person filling out this form", textChinese:"填写此表格者的姓名", textKorean:"이 양식을 작성하는 분의 이름", type:"text", options:[], optionsChinese:[], optionsKorean:[], domain:"admin", required:false },

  q("sdqt4_1",  "Considerate of other people's feelings",                                  "能体谅到别人的感受",                              "다른 사람의 감정을 배려한다",                          SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqt4_2",  "Restless, overactive, cannot stay still for long",                        "不安定、过分活跃、不能长久静止",                  "안절부절못하고 과잉활동적이며 오래 가만히 있지 못한다", SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqt4_3",  "Often complains of headaches, stomach-aches or sickness",                 "经常抱怨头痛、肚子痛或恶心",                      "자주 두통, 복통 또는 아프다고 불평한다",               SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqt4_4",  "Shares readily with other children, for example toys, treats, pencils",   "很乐意与别的小孩分享东西（糖果、玩具、笔等等）",  "다른 아이들과 기꺼이 나눈다 (장난감, 간식, 연필 등)", SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqt4_5",  "Often loses temper",                                                      "经常发脾气，易怒",                                "자주 성질을 부리거나 화를 잘 낸다",                    SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqt4_6",  "Rather solitary, prefers to play alone",                                  "颇孤独，比较多自己玩",                            "혼자 있으려 하고 혼자 노는 것을 좋아한다",             SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqt4_7",  "Generally well behaved, usually does what adults request",                "一般来说比较顺从，通常是成年人要求要做的都肯做",  "일반적으로 행동이 바르고 어른의 요청대로 한다",        SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqt4_8",  "Many worries or often seems worried",                                     "有很多担忧，经常表现出忧虑",                      "걱정이 많거나 자주 걱정하는 것처럼 보인다",            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqt4_9",  "Helpful if someone is hurt, upset or feeling ill",                        "如果有人受伤、沮丧或是生病，都很乐意提供帮助",    "누군가 다치거나 속상하거나 아프면 도와준다",           SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqt4_10", "Constantly fidgeting or squirming",                                       "当坐着时，会持续不断地摆弄手脚或扭动身子",        "끊임없이 몸을 꼼지락거리거나 뒤척인다",               SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqt4_11", "Has at least one good friend",                                            "至少有一个好朋友",                                "적어도 한 명의 좋은 친구가 있다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqt4_12", "Often fights with others or bullies them",                                "经常与别的小孩吵架或欺负他们",                    "자주 다른 아이들과 싸우거나 괴롭힌다",                SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqt4_13", "Often unhappy, depressed or tearful",                                     "经常不高兴、情绪低落或哭泣",                      "자주 불행하거나 우울하거나 눈물을 흘린다",            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqt4_14", "Generally liked by others",                                               "一般来说，受别的小孩所喜欢",                      "일반적으로 다른 아이들에게 인기가 있다",              SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqt4_15", "Easily distracted, concentration wanders",                                "容易分心，不能全神贯注",                          "쉽게 산만해지고 집중력이 흐트러진다",                 SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqt4_16", "Nervous or clingy in new situations, easily loses confidence",            "在新的情况下，会紧张或爱粘人，容易失去信心",      "새로운 상황에서 불안해하거나 매달리고 자신감을 쉽게 잃는다", SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqt4_17", "Kind to younger children",                                                "对年纪小的小孩和善",                              "어린 아이들에게 친절하다",                             SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqt4_18", "Often lies or cheats",                                                    "经常撒谎或欺骗",                                  "자주 거짓말하거나 속인다",                             SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqt4_19", "Picked on or bullied by others",                                          "受别的小孩作弄或欺负",                            "다른 아이들에게 괴롭힘을 당한다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqt4_20", "Often offers to help others (parents, teachers, children)",               "经常自愿地帮助别人（父母、老师或其他小孩）",      "자주 다른 사람(부모, 교사, 아이들)을 자발적으로 돕는다", SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqt4_21", "Thinks things out before acting",                                         "做事前会思考",                                    "행동하기 전에 생각한다",                               SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqt4_22", "Steals from home, school or elsewhere",                                   "从家里、学校或其他地方偷东西",                    "집, 학교 또는 다른 곳에서 물건을 훔친다",              SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqt4_23", "Gets along better with older people than with people of his/her age",     "跟成年人相处比跟小孩相处融洽",                    "또래보다 어른들과 더 잘 어울린다",                    SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqt4_24", "Many fears, easily scared",                                               "对很多事物感到害怕，容易受惊吓",                  "두려움이 많고 쉽게 놀란다",                            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqt4_25", "Good attention span, sees work through to the end",                       "做事情能做到底，注意力持久",                      "끝까지 과제를 완수하며 주의 집중 시간이 길다",         SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),

  ta("sdqt4_comments", "Do you have any other comments or concerns?", "您还有其他意见或疑虑吗？", "다른 의견이나 우려 사항이 있으십니까?"),
  h("sdqt4_s_impact", "Impact Supplement", "影响补充", "영향 보완", "impact"),
  rg("sdqt4_overall",  "Overall, do you think that this child has difficulties in any of the following areas: emotions, concentration, behavior or being able to get on with other people?",
    "总的来说，你认为这个孩子在以下任何方面都有困难吗：情绪、注意力、行为或能够与他人相处？",
    "전반적으로 이 아동이 다음 중 어느 영역에서 어려움을 겪고 있다고 생각합니까?",
    SDQ_IMPACT_YN_EN, SDQ_IMPACT_YN_ZH, SDQ_IMPACT_YN_KO),
  rg("sdqt4_strategy", "Has any strategy been helpful in other ways, e.g. providing information?",
    "是否有任何策略在其他方面有所帮助，例如提供信息？", "다른 방면에서 도움이 된 전략이 있었습니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
  rg("sdqt4_monthly",  "Over the last month, has your child had difficulties in one or more of the following areas: emotions, concentration, behaviour or being able to get on with other people?",
    "在过去的一个月里，您的孩子在以下一个或多个方面是否有困难：情绪、注意力、行为或能够与他人相处？",
    "지난 한 달 동안 이 아동이 다음 중 하나 이상의 영역에서 어려움을 겪었습니까?",
    SDQ_IMPACT_YN_EN, SDQ_IMPACT_YN_ZH, SDQ_IMPACT_YN_KO),
  rg("sdqt4_duration", "How long have these difficulties been present?",
    "这些困难存在多久了？", "이 어려움이 얼마나 지속되었습니까?",
    SDQ_DURATION_EN, SDQ_DURATION_ZH, SDQ_DURATION_KO),
  rg("sdqt4_distress", "Do the difficulties upset or distress your child?",
    "这些困难是否让您的孩子感到不安或痛苦？", "이 어려움이 학생을 속상하게 하거나 괴롭힙니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
  gq("sdqt4_interfere", "Do the difficulties interfere with your child's everyday life in the following areas?",
    "这些困难是否在以下方面干扰了您孩子的日常生活？", "이 어려움이 다음 영역에서 학생의 일상생활을 방해합니까?",
    [
      gr("sdqt4_if_friends", "FRIENDSHIPS",        "友谊",     "우정"),
      gr("sdqt4_if_class",   "CLASSROOM LEARNING", "课堂学习", "수업 학습"),
    ]),
  rg("sdqt4_burden",   "Do the difficulties put a burden on you or the class as a whole?",
    "这些困难会给你或整个班级带来负担吗？", "이 어려움이 귀하나 학급 전체에 부담이 됩니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
];

// ─── T11-18: Teacher form, Ages 11-18 ────────────────────────────────────────
export const SDQ_T11_FORM: FormQuestion[] = [
  txt("sdqt11_name",      "Student's name", "学生姓名", "학생 이름"),
  txt("sdqt11_dob",       "Date of Birth",  "出生日期", "생년월일"),
  rdg("sdqt11_gender",    "Gender",         "性别",     "성별", ["Male","Female"], ["男","女"], ["남","여"]),
  { id:"sdqt11_respondent", text:"Name of person filling out this form", textChinese:"填写此表格者的姓名", textKorean:"이 양식을 작성하는 분의 이름", type:"text", options:[], optionsChinese:[], optionsKorean:[], domain:"admin", required:false },

  q("sdqt11_1",  "Considerate of other people's feelings",                              "能体谅到别人的感受",                              "다른 사람의 감정을 배려한다",                          SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqt11_2",  "Restless, overactive, cannot stay still for long",                   "不安定、过分活跃、不能长久静止",                  "안절부절못하고 과잉활동적이며 오래 가만히 있지 못한다", SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqt11_3",  "Often complains of headaches, stomach-aches or sickness",            "经常抱怨头痛、肚子痛或恶心",                      "자주 두통, 복통 또는 아프다고 불평한다",               SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqt11_4",  "Shares readily with other youth, for example pencils, books, food",  "很乐意与别的青少年分享东西（铅笔、书籍、食物等）", "다른 청소년들과 기꺼이 나눈다 (연필, 책, 음식 등)",   SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqt11_5",  "Often loses temper",                                                  "经常发脾气，易怒",                                "자주 성질을 부리거나 화를 잘 낸다",                    SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqt11_6",  "Would rather be alone than with other youth",                         "宁愿独处，不愿与其他青少年在一起",                "다른 또래와 함께하는 것보다 혼자 있으려 한다",         SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqt11_7",  "Generally well behaved, usually does what adults request",            "一般来说比较顺从，通常是成年人要求要做的都肯做",  "일반적으로 행동이 바르고 어른의 요청대로 한다",        SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqt11_8",  "Many worries or often seems worried",                                 "有很多担忧，经常表现出忧虑",                      "걱정이 많거나 자주 걱정하는 것처럼 보인다",            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqt11_9",  "Helpful if someone is hurt, upset or feeling ill",                   "如果有人受伤、沮丧或是生病，都很乐意提供帮助",    "누군가 다치거나 속상하거나 아프면 도와준다",           SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqt11_10", "Constantly fidgeting or squirming",                                   "当坐着时，会持续不断地摆弄手脚或扭动身子",        "끊임없이 몸을 꼼지락거리거나 뒤척인다",               SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqt11_11", "Has at least one good friend",                                        "至少有一个好朋友",                                "적어도 한 명의 좋은 친구가 있다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqt11_12", "Often fights with others or bullies them",                            "经常与别的小孩吵架或欺负他们",                    "자주 다른 아이들과 싸우거나 괴롭힌다",                SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqt11_13", "Often unhappy, depressed or tearful",                                 "经常不高兴、情绪低落或哭泣",                      "자주 불행하거나 우울하거나 눈물을 흘린다",            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqt11_14", "Generally liked by others",                                           "一般来说，受别的小孩所喜欢",                      "일반적으로 다른 아이들에게 인기가 있다",              SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqt11_15", "Easily distracted, concentration wanders",                            "容易分心，不能全神贯注",                          "쉽게 산만해지고 집중력이 흐트러진다",                 SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqt11_16", "Nervous in new situations, easily loses confidence",                  "在新情况下感到紧张，容易失去信心",                "새로운 상황에서 불안해하고 자신감을 쉽게 잃는다",     SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqt11_17", "Kind to younger children",                                            "对年纪小的小孩和善",                              "어린 아이들에게 친절하다",                             SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqt11_18", "Often lies or cheats",                                                "经常撒谎或欺骗",                                  "자주 거짓말하거나 속인다",                             SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqt11_19", "Picked on or bullied by others",                                      "受别的小孩作弄或欺负",                            "다른 아이들에게 괴롭힘을 당한다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqt11_20", "Often offers to help others (parents, teachers, children)",           "经常自愿地帮助别人（父母、老师或其他小孩）",      "자주 다른 사람(부모, 교사, 아이들)을 자발적으로 돕는다", SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqt11_21", "Thinks things out before acting",                                     "做事前会思考",                                    "행동하기 전에 생각한다",                               SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqt11_22", "Steals from home, work or elsewhere",                                 "从家里、工作场所或其他地方偷东西",                "집, 직장 또는 다른 곳에서 물건을 훔친다",              SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqt11_23", "Gets along better with older people than with people of his/her age", "跟成年人相处比跟小孩相处融洽",                    "또래보다 어른들과 더 잘 어울린다",                    SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqt11_24", "Many fears, easily scared",                                           "对很多事物感到害怕，容易受惊吓",                  "두려움이 많고 쉽게 놀란다",                            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqt11_25", "Good attention span, sees work through to the end",                   "做事情能做到底，注意力持久",                      "끝까지 과제를 완수하며 주의 집중 시간이 길다",         SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),

  { id:"sdqt11_comments", text:"Do you have any other comments or concerns?", textChinese:"您还有其他意见或疑虑吗？", textKorean:"다른 의견이나 우려 사항이 있으십니까?", type:"textarea", options:[], optionsChinese:[], optionsKorean:[], domain:"impact", required:false },
  h("sdqt11_s_impact", "Impact Supplement", "影响补充", "영향 보완", "impact"),
  rg("sdqt11_overall",  "Overall, do you think that this student has difficulties in any of the following areas: emotions, concentration, behavior or being able to get on with other people?",
    "总的来说，你认为这位学生在以下任何方面有困难吗？", "전반적으로 이 학생이 다음 중 어느 영역에서 어려움을 겪고 있다고 생각합니까?",
    SDQ_IMPACT_YN_EN, SDQ_IMPACT_YN_ZH, SDQ_IMPACT_YN_KO),
  rg("sdqt11_duration", "How long have these difficulties been present?",
    "这些困难存在多久了？", "이 어려움이 얼마나 지속되었습니까?",
    SDQ_DURATION_EN, SDQ_DURATION_ZH, SDQ_DURATION_KO),
  rg("sdqt11_distress", "Do the difficulties upset or distress the student?",
    "这些困难是否让这位学生感到不安或痛苦？", "이 어려움이 학생을 속상하게 하거나 괴롭힙니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
  gq("sdqt11_interfere", "Do the difficulties interfere with this student's everyday life in the following areas?",
    "这些困难是否干扰了该学生以下方面的日常生活？", "이 어려움이 다음 영역에서 학생의 일상생활을 방해합니까?",
    [
      gr("sdqt11_if_peers", "PEER RELATIONSHIPS",  "同伴关系", "또래 관계"),
      gr("sdqt11_if_class", "CLASSROOM LEARNING",  "课堂学习", "수업 학습"),
    ]),
  rg("sdqt11_burden",   "Do the difficulties put a burden on you?",
    "这些困难会给您带来负担吗？", "이 어려움이 귀하에게 부담이 됩니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
];

// ─── SR11-18: Self-Report form, Ages 11-18 ───────────────────────────────────
export const SDQ_SR11_FORM: FormQuestion[] = [
  txt("sdqsr11_name",   "Your name",     "您的姓名", "귀하의 이름"),
  txt("sdqsr11_dob",    "Date of Birth", "出生日期", "생년월일"),
  rdg("sdqsr11_gender", "Gender",        "性别",     "성별", ["Male","Female"], ["男","女"], ["남","여"]),

  q("sdqsr11_1",  "I try to be nice to other people. I care about their feelings",                "我尽量对他人友善，我关心他人的感受",             "나는 다른 사람들에게 친절하려 하고 그들의 감정을 배려한다",  SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqsr11_2",  "I am restless, I cannot stay still for long",                                  "我坐立不安，无法长时间保持静止",                "나는 안절부절못하고 오래 가만히 있지 못한다",               SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqsr11_3",  "I get a lot of headaches, stomach-aches or sickness",                          "我常常头痛、肚子痛或感到不舒服",                "나는 자주 두통, 복통 또는 몸이 아프다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqsr11_4",  "I usually share with others, for example CD's, games, food",                   "我通常会与他人分享，例如CD、游戏和食物",         "나는 보통 CD, 게임, 음식 등을 다른 사람과 나눈다",          SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqsr11_5",  "I get very angry and often lose my temper",                                    "我很容易生气，经常发脾气",                      "나는 매우 화를 잘 내고 자주 폭발한다",                      SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqsr11_6",  "I would rather be alone than with people of my age",                           "我宁愿独处，也不愿与同龄人在一起",              "나는 또래와 함께하는 것보다 혼자 있는 것을 더 좋아한다",    SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqsr11_7",  "I usually do as I am told",                                                    "我通常按照别人说的去做",                        "나는 보통 말한 대로 한다",                                  SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqsr11_8",  "I worry a lot",                                                                "我有很多烦恼",                                  "나는 걱정이 많다",                                          SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqsr11_9",  "I am helpful if someone is hurt, upset or feeling ill",                        "当有人受伤、难过或生病时，我会给予帮助",         "누군가 다치거나 속상하거나 아프면 나는 도움을 준다",         SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqsr11_10", "I am constantly fidgeting or squirming",                                       "我不停地扭动身体或坐立不安",                    "나는 끊임없이 몸을 꼼지락거리거나 뒤척인다",                SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqsr11_11", "I have one good friend or more",                                               "我有至少一个好朋友",                            "나는 좋은 친구가 한 명 이상 있다",                          SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqsr11_12", "I fight a lot. I can make other people do what I want",                        "我经常打架，能让他人按我的意愿行事",            "나는 자주 싸우고 다른 사람이 내 뜻대로 하게 만들 수 있다",  SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqsr11_13", "I am often unhappy, depressed or tearful",                                     "我常常不快乐、沮丧或哭泣",                      "나는 자주 불행하거나 우울하거나 눈물을 흘린다",             SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqsr11_14", "Other people my age generally like me",                                        "同龄人通常喜欢我",                              "나와 비슷한 또래들은 대체로 나를 좋아한다",                 SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqsr11_15", "I am easily distracted, I find it difficult to concentrate",                   "我很容易分心，难以集中注意力",                  "나는 쉽게 산만해지고 집중하기 어렵다",                      SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqsr11_16", "I am nervous in new situations. I easily lose confidence",                     "在新环境中我会感到紧张，容易丧失信心",          "나는 새로운 상황에서 불안해지고 자신감을 쉽게 잃는다",      SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqsr11_17", "I am kind to younger children",                                                "我对年幼的儿童很友善",                          "나는 어린 아이들에게 친절하다",                              SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqsr11_18", "I am often accused of lying or cheating",                                      "我常常被指责说谎或作弊",                        "나는 자주 거짓말하거나 속인다는 비난을 받는다",             SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqsr11_19", "Other children or young people pick on me or bully me",                        "其他儿童或青少年捉弄我或欺负我",                "다른 아이들이나 청소년이 나를 괴롭히거나 따돌린다",          SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqsr11_20", "I often offer to help others (parents, teachers, children)",                   "我经常主动帮助他人（父母、老师、儿童）",         "나는 자주 다른 사람(부모, 교사, 아이들)을 돕겠다고 나선다", SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqsr11_21", "I think before I do things",                                                   "我在做事之前会先思考",                          "나는 무언가를 하기 전에 생각한다",                          SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqsr11_22", "I take things that are not mine from home, school or elsewhere",               "我会在家里、学校或其他地方拿不属于我的东西",    "나는 집, 학교 또는 다른 곳에서 내 것이 아닌 것을 가져간다", SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqsr11_23", "I get along better with adults than with people my own age",                   "我与大人相处比与同龄人相处更融洽",              "나는 또래보다 어른들과 더 잘 어울린다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqsr11_24", "I have many fears, I am easily scared",                                        "我有很多恐惧，容易受惊",                        "나는 두려움이 많고 쉽게 놀란다",                            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqsr11_25", "I finish the work I'm doing. My attention is good",                            "我能完成我正在做的工作，我的注意力很好",         "나는 하던 일을 마무리하며 주의력이 좋다",                   SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),

  ta("sdqsr11_comments", "Do you have any other comments or concerns?", "您还有其他意见或疑虑吗？", "다른 의견이나 우려 사항이 있으십니까?"),
  h("sdqsr11_s_impact", "Impact Supplement", "影响补充", "영향 보완", "impact"),
  rg("sdqsr11_overall",  "Overall, do you think that you have difficulties in any of the following areas: emotions, concentration, behavior or being able to get on with other people?",
    "总体而言，你认为自己在以下任何方面都有困难吗：情绪、注意力、行为或能够与他人相处？",
    "전반적으로 귀하가 다음 중 어느 영역에서 어려움을 겪고 있다고 생각합니까?",
    SDQ_IMPACT_YN_EN, SDQ_IMPACT_YN_ZH, SDQ_IMPACT_YN_KO),
  rg("sdqsr11_duration", "How long have these difficulties been present?",
    "这些困难存在多久了？", "이 어려움이 얼마나 지속되었습니까?",
    SDQ_DURATION_EN, SDQ_DURATION_ZH, SDQ_DURATION_KO),
  rg("sdqsr11_distress", "Do the difficulties upset or distress you?",
    "这些困难是否让您感到不安或痛苦？", "이 어려움이 귀하를 속상하게 하거나 괴롭힙니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
  gq("sdqsr11_interfere", "Do the difficulties interfere with this student's everyday life in the following areas?",
    "这些困难是否干扰了日常生活的以下方面？", "이 어려움이 다음 영역에서 일상생활을 방해합니까?",
    [
      gr("sdqsr11_if_home",    "HOME LIFE",          "家居生活", "가정 생활"),
      gr("sdqsr11_if_friends", "FRIENDSHIPS",        "友谊",     "우정"),
      gr("sdqsr11_if_class",   "CLASSROOM LEARNING", "课堂学习", "수업 학습"),
      gr("sdqsr11_if_leisure", "LEISURE ACTIVITIES", "休闲活动", "여가 활동"),
    ]),
  rg("sdqsr11_burden",   "Do the difficulties make it harder for those around you (family, friends, teachers, etc.)?",
    "这些困难是否让您周围的人（家人、朋友、老师等）更难相处？",
    "이 어려움이 주변 사람들(가족, 친구, 교사 등)에게 더 힘들게 합니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
];

// ─── SR18+: Self-Report form, Ages 18+ ───────────────────────────────────────
export const SDQ_SR18_FORM: FormQuestion[] = [
  txt("sdqsr18_name",   "Your name",     "您的姓名", "귀하의 이름"),
  txt("sdqsr18_dob",    "Date of Birth", "出生日期", "생년월일"),
  rdg("sdqsr18_gender", "Gender",        "性别",     "성별", ["Male","Female"], ["男","女"], ["남","여"]),

  q("sdqsr18_1",  "I try to be nice to other people. I care about their feelings",                "我尽量对他人友善，我关心他人的感受",             "나는 다른 사람들에게 친절하려 하고 그들의 감정을 배려한다",  SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqsr18_2",  "I am restless, I cannot stay still for long",                                  "我坐立不安，无法长时间保持静止",                "나는 안절부절못하고 오래 가만히 있지 못한다",               SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqsr18_3",  "I get a lot of headaches, stomach-aches or sickness",                          "我常常头痛、肚子痛或感到不舒服",                "나는 자주 두통, 복통 또는 몸이 아프다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqsr18_4",  "I usually share with others, for example CD's, games, food",                   "我通常会与他人分享，例如CD、游戏和食物",         "나는 보통 CD, 게임, 음식 등을 다른 사람과 나눈다",          SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqsr18_5",  "I get very angry and often lose my temper",                                    "我很容易生气，经常发脾气",                      "나는 매우 화를 잘 내고 자주 폭발한다",                      SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqsr18_6",  "I would rather be alone than with people of my age",                           "我宁愿独处，也不愿与同龄人在一起",              "나는 또래와 함께하는 것보다 혼자 있는 것을 더 좋아한다",    SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqsr18_7",  "I usually do as I am told",                                                    "我通常按照别人说的去做",                        "나는 보통 말한 대로 한다",                                  SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqsr18_8",  "I worry a lot",                                                                "我有很多烦恼",                                  "나는 걱정이 많다",                                          SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqsr18_9",  "I am helpful if someone is hurt, upset or feeling ill",                        "当有人受伤、难过或生病时，我会给予帮助",         "누군가 다치거나 속상하거나 아프면 나는 도움을 준다",         SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqsr18_10", "I am constantly fidgeting or squirming",                                       "我不停地扭动身体或坐立不安",                    "나는 끊임없이 몸을 꼼지락거리거나 뒤척인다",                SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqsr18_11", "I have one good friend or more",                                               "我有至少一个好朋友",                            "나는 좋은 친구가 한 명 이상 있다",                          SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqsr18_12", "I fight a lot. I can make other people do what I want",                        "我经常打架，能让他人按我的意愿行事",            "나는 자주 싸우고 다른 사람이 내 뜻대로 하게 만들 수 있다",  SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqsr18_13", "I am often unhappy, depressed or tearful",                                     "我常常不快乐、沮丧或哭泣",                      "나는 자주 불행하거나 우울하거나 눈물을 흘린다",             SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqsr18_14", "Other people my age generally like me",                                        "同龄人通常喜欢我",                              "나와 비슷한 또래들은 대체로 나를 좋아한다",                 SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqsr18_15", "I am easily distracted, I find it difficult to concentrate",                   "我很容易分心，难以集中注意力",                  "나는 쉽게 산만해지고 집중하기 어렵다",                      SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqsr18_16", "I am nervous in new situations. I easily lose confidence",                     "在新环境中我会感到紧张，容易丧失信心",          "나는 새로운 상황에서 불안해지고 자신감을 쉽게 잃는다",      SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqsr18_17", "I am kind to younger children",                                                "我对年幼的儿童很友善",                          "나는 어린 아이들에게 친절하다",                              SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqsr18_18", "I am often accused of lying or cheating",                                      "我常常被指责说谎或作弊",                        "나는 자주 거짓말하거나 속인다는 비난을 받는다",             SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqsr18_19", "Other children or young people pick on me or bully me",                        "其他儿童或青少年捉弄我或欺负我",                "다른 아이들이나 청소년이 나를 괴롭히거나 따돌린다",          SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqsr18_20", "I often offer to help others (parents, teachers, children)",                   "我经常主动帮助他人（父母、老师、儿童）",         "나는 자주 다른 사람(부모, 교사, 아이들)을 돕겠다고 나선다", SDQ_EN, SDQ_ZH, SDQ_KO, "prosocial"),
  q("sdqsr18_21", "I think before I do things",                                                   "我在做事之前会先思考",                          "나는 무언가를 하기 전에 생각한다",                          SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),
  q("sdqsr18_22", "I take things that are not mine from home, school or elsewhere",               "我会在家里、学校或其他地方拿不属于我的东西",    "나는 집, 학교 또는 다른 곳에서 내 것이 아닌 것을 가져간다", SDQ_EN, SDQ_ZH, SDQ_KO, "conduct"),
  q("sdqsr18_23", "I get along better with adults than with people my own age",                   "我与大人相处比与同龄人相处更融洽",              "나는 또래보다 어른들과 더 잘 어울린다",                     SDQ_EN, SDQ_ZH, SDQ_KO, "peer"),
  q("sdqsr18_24", "I have many fears, I am easily scared",                                        "我有很多恐惧，容易受惊",                        "나는 두려움이 많고 쉽게 놀란다",                            SDQ_EN, SDQ_ZH, SDQ_KO, "emotional"),
  q("sdqsr18_25", "I finish the work I'm doing. My attention is good",                            "我能完成我正在做的工作，我的注意力很好",         "나는 하던 일을 마무리하며 주의력이 좋다",                   SDQ_EN, SDQ_ZH, SDQ_KO, "hyperactivity"),

  ta("sdqsr18_comments", "Do you have any other comments or concerns?", "您还有其他意见或疑虑吗？", "다른 의견이나 우려 사항이 있으십니까?"),
  h("sdqsr18_s_impact", "Impact Supplement", "影响补充", "영향 보완", "impact"),
  rg("sdqsr18_change",   "Over the past 3-6 months, are your problems:",
    "在过去的3-6个月里，您的问题：", "지난 3~6개월 동안 귀하의 문제는:",
    ["Much worse","A bit worse","About the same","A bit better"],
    ["更糟糕","稍微糟糕","大致相同","稍微好一些"],
    ["훨씬 나빠졌다","약간 나빠졌다","비슷하다","약간 나아졌다"]),
  rg("sdqsr18_strategy", "Has any strategy been helpful e.g. providing information?",
    "是否有任何策略有所帮助，例如提供信息？", "예를 들어 정보 제공 등의 전략이 도움이 되었습니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
  rg("sdqsr18_overall",  "Over the last month, have you had difficulties in one or more of the following areas: emotions, concentration, behaviour or being able to get on with other people?",
    "在过去的一个月里，您在以下一个或多个方面是否有困难：情绪、注意力、行为或能够与他人相处？",
    "지난 한 달 동안 귀하가 다음 중 하나 이상의 영역에서 어려움을 겪었습니까?",
    SDQ_IMPACT_YN_EN, SDQ_IMPACT_YN_ZH, SDQ_IMPACT_YN_KO),
  rg("sdqsr18_distress", "Do the difficulties upset or distress you?",
    "这些困难是否让您感到不安或痛苦？", "이 어려움이 귀하를 속상하게 하거나 괴롭힙니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
  gq("sdqsr18_interfere", "Do the difficulties interfere with your everyday life in the following areas?",
    "这些困难是否干扰了您日常生活的以下方面？", "이 어려움이 다음 영역에서 귀하의 일상생활을 방해합니까?",
    [
      gr("sdqsr18_if_close",   "Getting along with the people you are closest to (e.g. family, partner)", "与最亲近的人相处（如家人、伴侣）", "가장 가까운 사람들(예: 가족, 파트너)과 어울리기"),
      gr("sdqsr18_if_friends", "Making and keeping friends",                                               "结交和维持朋友关系",              "친구 사귀기 및 유지하기"),
      gr("sdqsr18_if_work",    "Work or study",                                                            "工作或学习",                      "일 또는 공부"),
      gr("sdqsr18_if_leisure", "Hobbies, sports or other leisure activities",                              "爱好、运动或其他休闲活动",        "취미, 스포츠 또는 기타 여가 활동"),
    ]),
  rg("sdqsr18_burden",   "Do the difficulties make it harder for those around you (family, friends, etc.)?",
    "这些困难是否让您周围的人（家人、朋友等）更难相处？",
    "이 어려움이 주변 사람들(가족, 친구 등)에게 더 힘들게 합니까?",
    SDQ_IMPACT4_EN, SDQ_IMPACT4_ZH, SDQ_IMPACT4_KO),
];

// Legacy aliases (kept for backward compatibility — existing assignments still work)
export const SDQ_PARENT_FORM  = SDQ_P4_FORM;
export const SDQ_TEACHER_FORM = SDQ_T4_FORM;
export const SDQ_SR_FORM      = SDQ_SR11_FORM;

// ═══════════════════════════════════════════════════════════════════════════════
// GHQ-12 – General Health Questionnaire
// ═══════════════════════════════════════════════════════════════════════════════

export const GHQ12_FORM: FormQuestion[] = [
  h("ghq_instr", "Over the past few weeks, have you been able to…", "在过去几周内，您是否能够……", "지난 몇 주 동안, 당신은 다음을 할 수 있었습니까?", "general_health"),
  q("ghq_1",  "Able to concentrate on whatever you're doing?",                        "能够集中注意力做您正在做的事情？",         "하고 있는 일에 집중할 수 있었습니까?",             GHQ_POS_EN, GHQ_POS_ZH, GHQ_POS_KO, "general_health"),
  q("ghq_2",  "Lost much sleep over worry?",                                          "因担忧而失眠？",                           "걱정 때문에 잠을 많이 잃었습니까?",               GHQ_NEG_EN, GHQ_NEG_ZH, GHQ_NEG_KO, "general_health"),
  q("ghq_3",  "Felt that you are playing a useful part in things?",                   "感觉自己在事情中发挥着有用的作用？",       "일에서 유용한 역할을 하고 있다고 느꼈습니까?",     GHQ_POS_EN, GHQ_POS_ZH, GHQ_POS_KO, "general_health"),
  q("ghq_4",  "Felt capable of making decisions about things?",                       "感觉自己有能力做出决定？",                 "결정을 내릴 수 있다고 느꼈습니까?",               GHQ_POS_EN, GHQ_POS_ZH, GHQ_POS_KO, "general_health"),
  q("ghq_5",  "Felt constantly under strain?",                                        "感到持续处于压力之下？",                   "지속적으로 긴장감 아래 있다고 느꼈습니까?",       GHQ_NEG_EN, GHQ_NEG_ZH, GHQ_NEG_KO, "general_health"),
  q("ghq_6",  "Felt you couldn't overcome your difficulties?",                        "感觉自己无法克服困难？",                   "어려움을 극복할 수 없다고 느꼈습니까?",           GHQ_NEG_EN, GHQ_NEG_ZH, GHQ_NEG_KO, "general_health"),
  q("ghq_7",  "Able to enjoy your normal day-to-day activities?",                     "能够享受日常活动？",                       "일상적인 활동을 즐길 수 있었습니까?",             GHQ_POS_EN, GHQ_POS_ZH, GHQ_POS_KO, "general_health"),
  q("ghq_8",  "Able to face up to your problems?",                                    "能够正视自己的问题？",                     "자신의 문제를 직면할 수 있었습니까?",             GHQ_POS_EN, GHQ_POS_ZH, GHQ_POS_KO, "general_health"),
  q("ghq_9",  "Been feeling unhappy and depressed?",                                  "感到不快乐和沮丧？",                       "불행하고 우울하다고 느꼈습니까?",                 GHQ_NEG_EN, GHQ_NEG_ZH, GHQ_NEG_KO, "general_health"),
  q("ghq_10", "Been losing confidence in yourself?",                                  "对自己失去信心？",                         "자신감을 잃어가고 있었습니까?",                   GHQ_NEG_EN, GHQ_NEG_ZH, GHQ_NEG_KO, "general_health"),
  q("ghq_11", "Been thinking of yourself as a worthless person?",                     "认为自己是一个毫无价值的人？",             "자신을 가치 없는 사람이라고 생각했습니까?",       GHQ_NEG_EN, GHQ_NEG_ZH, GHQ_NEG_KO, "general_health"),
  q("ghq_12", "Been feeling reasonably happy, all things considered?",                "总体而言，感到相当快乐？",                 "전반적으로 상당히 행복하다고 느꼈습니까?",         GHQ_POS_EN, GHQ_POS_ZH, GHQ_POS_KO, "general_health"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// SMFQ – Short Mood and Feelings Questionnaire
// ═══════════════════════════════════════════════════════════════════════════════

export const SMFQ_FORM: FormQuestion[] = [
  h("smfq_instr", "This questionnaire is about how you have been feeling or acting recently. For each question, please check the response that is closest to how you have been feeling or acting in the past two weeks.", "这份问卷是关于您最近的感受或行为。对于每个问题，请勾选在过去两周内最接近您感受或行为的答案。", "이 설문지는 최근 기분이나 행동에 관한 것입니다. 각 질문에 대해 지난 2주 동안 느끼거나 행동한 것과 가장 가까운 답변을 선택하십시오.", "mood"),
  q("smfq_1",  "I felt miserable or unhappy.",                               "我感到痛苦或不快乐。",           "나는 비참하거나 불행하다고 느꼈다.",             SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_2",  "I didn't enjoy anything at all.",                            "我完全没有享受任何事情。",       "나는 아무것도 즐기지 못했다.",                   SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_3",  "I felt so tired I just sat around and did nothing.",         "我感到非常疲倦，只是坐着什么也不做。", "나는 너무 피곤해서 그냥 앉아서 아무것도 하지 않았다.", SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_4",  "I was very restless.",                                       "我非常焦躁不安。",               "나는 매우 불안하고 초조했다.",                   SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_5",  "I felt I was no good any more.",                             "我感觉自己不再有任何价值。",     "나는 더 이상 쓸모없다고 느꼈다.",               SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_6",  "I cried a lot.",                                             "我哭了很多次。",                 "나는 많이 울었다.",                             SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_7",  "I found it hard to think properly or concentrate.",          "我发现很难正确思考或集中注意力。", "나는 제대로 생각하거나 집중하기 어려웠다.",       SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_8",  "I hated myself.",                                            "我恨自己。",                     "나는 자신이 싫었다.",                           SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_9",  "I was a bad person.",                                        "我是个坏人。",                   "나는 나쁜 사람이었다.",                         SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_10", "I felt lonely.",                                             "我感到孤独。",                   "나는 외로웠다.",                               SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_11", "I thought nobody really loved me.",                          "我认为没有人真正爱我。",         "나는 아무도 나를 진정으로 사랑하지 않는다고 생각했다.", SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_12", "I thought I could never be as good as other kids.",          "我认为自己永远无法像其他孩子一样好。", "나는 다른 아이들만큼 잘할 수 없다고 생각했다.", SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
  q("smfq_13", "I did everything wrong.",                                    "我做什么事都是错的。",           "나는 모든 것을 잘못했다.",                       SMFQ_EN, SMFQ_ZH, SMFQ_KO, "mood"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// PSC-35 – Pediatric Symptom Checklist
// ═══════════════════════════════════════════════════════════════════════════════

export const PSC_FORM: FormQuestion[] = [
  h("psc_instr", "Please mark under the heading that best fits your child.", "请在最符合您孩子情况的选项下打勾。", "자녀에게 가장 잘 맞는 항목에 표시하십시오.", "behavior"),
  q("psc_1",  "Complains of aches and pains",                                    "抱怨疼痛",                           "통증을 호소한다",                             PSC_EN, PSC_ZH, PSC_KO, "somatic"),
  q("psc_2",  "Spends more time alone",                                          "花更多时间独处",                     "혼자 있는 시간이 더 많아졌다",               PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_3",  "Tires easily, has little energy",                                 "容易疲倦，缺乏精力",                 "쉽게 피로해지고 에너지가 없다",               PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_4",  "Fidgety, unable to sit still",                                    "坐立不安，无法静坐",                 "안절부절못하고 가만히 앉아 있지 못한다",     PSC_EN, PSC_ZH, PSC_KO, "attention"),
  q("psc_5",  "Has trouble with teacher",                                        "与老师相处有困难",                   "선생님과 문제가 있다",                       PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_6",  "Less interested in school",                                       "对学校兴趣减少",                     "학교에 대한 흥미가 줄었다",                   PSC_EN, PSC_ZH, PSC_KO, "attention"),
  q("psc_7",  "Acts as if driven by a motor",                                    "行动如同被发动机驱使",               "마치 엔진에 의해 움직이는 것처럼 행동한다",   PSC_EN, PSC_ZH, PSC_KO, "attention"),
  q("psc_8",  "Daydreams too much",                                              "白日梦太多",                         "공상을 너무 많이 한다",                       PSC_EN, PSC_ZH, PSC_KO, "attention"),
  q("psc_9",  "Distracted easily",                                               "很容易分心",                         "쉽게 산만해진다",                             PSC_EN, PSC_ZH, PSC_KO, "attention"),
  q("psc_10", "Is afraid of new situations",                                     "害怕新情况",                         "새로운 상황을 두려워한다",                   PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_11", "Feels sad, unhappy",                                              "感到悲伤，不快乐",                   "슬프거나 불행하다고 느낀다",                 PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_12", "Is irritable, angry",                                             "易怒、生气",                         "짜증스럽거나 화가 나 있다",                   PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_13", "Feels hopeless",                                                  "感到绝望",                           "희망이 없다고 느낀다",                       PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_14", "Has trouble concentrating",                                       "难以集中注意力",                     "집중하는 데 어려움이 있다",                   PSC_EN, PSC_ZH, PSC_KO, "attention"),
  q("psc_15", "Less interested in friends",                                      "对朋友兴趣减少",                     "친구에 대한 흥미가 줄었다",                   PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_16", "Fights with other children",                                      "与其他儿童打架",                     "다른 아이들과 싸운다",                       PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_17", "Absent from school",                                              "缺课",                               "학교를 결석한다",                             PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_18", "School grades dropping",                                          "学校成绩下降",                       "학교 성적이 떨어지고 있다",                   PSC_EN, PSC_ZH, PSC_KO, "attention"),
  q("psc_19", "Is down on him or herself",                                       "对自己感到沮丧",                     "자신에 대해 비관적이다",                     PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_20", "Visits the doctor with doctor finding nothing wrong",             "看医生但医生发现没有问题",           "의사를 방문하지만 이상이 없다고 한다",       PSC_EN, PSC_ZH, PSC_KO, "somatic"),
  q("psc_21", "Has trouble with sleeping",                                       "睡眠有困难",                         "수면에 어려움이 있다",                       PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_22", "Worries a lot",                                                   "经常担忧",                           "걱정이 많다",                                 PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_23", "Wants to be with you more than before",                           "比以前更想和您在一起",               "이전보다 더 함께 있으려 한다",               PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_24", "Feels he or she is bad",                                          "觉得自己很坏",                       "자신이 나쁘다고 느낀다",                     PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_25", "Takes unnecessary risks",                                         "冒不必要的风险",                     "불필요한 위험을 감수한다",                   PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_26", "Gets hurt frequently",                                            "经常受伤",                           "자주 다친다",                                 PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_27", "Seems to be having less fun",                                     "似乎乐趣减少",                       "즐거움이 줄어든 것 같다",                     PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_28", "Acts younger than children his or her age",                       "行为比同龄儿童幼稚",                 "또래보다 어리게 행동한다",                   PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_29", "Does not listen to rules",                                        "不遵守规则",                         "규칙을 듣지 않는다",                         PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_30", "Does not show feelings",                                          "不表达感情",                         "감정을 표현하지 않는다",                     PSC_EN, PSC_ZH, PSC_KO, "internalizing"),
  q("psc_31", "Does not understand other people's feelings",                     "不理解他人的感受",                   "다른 사람의 감정을 이해하지 못한다",         PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_32", "Teases others",                                                   "取笑他人",                           "다른 사람을 놀린다",                         PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_33", "Blames others for his or her troubles",                           "把自己的问题归咎于他人",             "자신의 문제를 다른 사람 탓으로 돌린다",     PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_34", "Takes things that do not belong to him or her",                   "拿取不属于自己的东西",               "자신의 것이 아닌 물건을 가져간다",           PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
  q("psc_35", "Refuses to share",                                                "拒绝分享",                           "나누기를 거부한다",                           PSC_EN, PSC_ZH, PSC_KO, "externalizing"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// GAD-7 – Generalized Anxiety Disorder Scale
// ═══════════════════════════════════════════════════════════════════════════════

export const GAD7_FORM: FormQuestion[] = [
  h("gad7_instr", "Over the last 2 weeks, how often have you been bothered by the following problems?", "在过去两周内，您受到以下问题困扰的频率如何？", "지난 2주 동안 다음과 같은 문제들로 얼마나 자주 괴로움을 겪었습니까?", "anxiety"),
  q("gad7_1", "Feeling nervous, anxious, or on edge",                              "感到紧张、焦虑或不安",                     "초조하거나 불안하거나 긴장된 느낌",             FREQ4_EN, FREQ4_ZH, FREQ4_KO, "anxiety"),
  q("gad7_2", "Not being able to stop or control worrying",                        "无法停止或控制担忧",                       "걱정을 멈추거나 조절할 수 없음",               FREQ4_EN, FREQ4_ZH, FREQ4_KO, "anxiety"),
  q("gad7_3", "Worrying too much about different things",                          "对不同的事情担忧过多",                     "여러 가지 일들에 대해 너무 많이 걱정함",       FREQ4_EN, FREQ4_ZH, FREQ4_KO, "anxiety"),
  q("gad7_4", "Trouble relaxing",                                                  "难以放松",                                 "긴장을 풀기가 어려움",                         FREQ4_EN, FREQ4_ZH, FREQ4_KO, "anxiety"),
  q("gad7_5", "Being so restless that it is hard to sit still",                   "坐立不安，难以静坐",                       "너무 안절부절못하여 가만히 앉아 있기 어려움", FREQ4_EN, FREQ4_ZH, FREQ4_KO, "anxiety"),
  q("gad7_6", "Becoming easily annoyed or irritable",                              "容易感到烦恼或易怒",                       "쉽게 짜증이 나거나 신경질적이 됨",             FREQ4_EN, FREQ4_ZH, FREQ4_KO, "anxiety"),
  q("gad7_7", "Feeling afraid, as if something awful might happen",                "感到恐惧，好像会有什么可怕的事情发生",     "두려움을 느끼거나 끔찍한 일이 일어날 것 같은 느낌", FREQ4_EN, FREQ4_ZH, FREQ4_KO, "anxiety"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// PHQ-9 – Patient Health Questionnaire (Adult)
// ═══════════════════════════════════════════════════════════════════════════════

export const PHQ9_FORM: FormQuestion[] = [
  h("phq9_instr", "Over the last 2 weeks, how often have you been bothered by any of the following problems?", "在过去两周内，您受到以下任何问题困扰的频率如何？", "지난 2주 동안 다음과 같은 문제들로 얼마나 자주 괴로움을 겪었습니까?", "depression"),
  q("phq9_1", "Little interest or pleasure in doing things",                        "对做事情几乎没有兴趣或乐趣",             "일을 하는 것에 대한 흥미나 즐거움이 거의 없음",         FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9_2", "Feeling down, depressed, or hopeless",                               "感到沮丧、抑郁或绝望",                   "기분이 가라앉거나 우울하거나 절망적인 느낌",           FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9_3", "Trouble falling or staying asleep, or sleeping too much",            "难以入睡或保持睡眠，或睡眠过多",         "잠들기 어렵거나 잠을 유지하기 어렵거나 너무 많이 잠",   FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9_4", "Feeling tired or having little energy",                              "感到疲倦或精力不足",                     "피곤함을 느끼거나 에너지가 거의 없음",               FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9_5", "Poor appetite or overeating",                                        "食欲不振或暴饮暴食",                     "식욕 부진 또는 과식",                               FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9_6", "Feeling bad about yourself — or that you are a failure or have let yourself or your family down", "对自己感觉很差——或觉得自己是个失败者，或让自己或家人失望", "자신에 대해 나쁘게 느끼거나 실패자라고 느끼거나 자신 또는 가족을 실망시켰다고 느낌", FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9_7", "Trouble concentrating on things, such as reading the newspaper or watching television", "难以集中注意力做事，例如阅读报纸或看电视", "신문 읽기나 TV 시청 같은 일에 집중하는 데 어려움",     FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9_8", "Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual", "行动或说话慢到他人注意，或相反——焦躁不安，比平时多动", "행동이나 말이 너무 느려서 다른 사람이 알아챌 정도이거나, 반대로 너무 초조하거나 안절부절못해 평소보다 많이 돌아다님", FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9_9", "Thoughts that you would be better off dead, or of hurting yourself in some way", "想到自己死了会更好，或想以某种方式伤害自己", "죽는 것이 낫겠다거나 어떤 방식으로든 자해하겠다는 생각", FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// PHQ-9A – Patient Health Questionnaire for Adolescents
// ═══════════════════════════════════════════════════════════════════════════════

export const PHQ9A_FORM: FormQuestion[] = [
  h("phq9a_instr", "Over the last 2 weeks, how often have you been bothered by any of the following problems?", "在过去两周内，您受到以下任何问题困扰的频率如何？", "지난 2주 동안 다음과 같은 문제들로 얼마나 자주 괴로움을 겪었습니까?", "depression"),
  q("phq9a_1", "Little interest or pleasure in doing things",                       "对做事情几乎没有兴趣或乐趣",             "일을 하는 것에 대한 흥미나 즐거움이 거의 없음",                 FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9a_2", "Feeling down, depressed, irritable, or hopeless? Having little interest or pleasure in doing things? Feeling that life is not worth living?", "感到情绪低落、抑郁、易怒或绝望？对事情几乎没有兴趣或乐趣？觉得生活没有意义？", "기분이 가라앉거나 우울하거나 짜증스럽거나 절망적인 느낌? 하는 일에 흥미나 즐거움이 거의 없음? 삶이 살 가치가 없다는 느낌?", FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9a_3", "Trouble falling or staying asleep, or sleeping too much",           "难以入睡或保持睡眠，或睡眠过多",         "잠들기 어렵거나 잠을 유지하기 어렵거나 너무 많이 잠",           FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9a_4", "Feeling tired or having little energy",                             "感到疲倦或精力不足",                     "피곤함을 느끼거나 에너지가 거의 없음",                         FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9a_5", "Poor appetite or overeating",                                       "食欲不振或暴饮暴食",                     "식욕 부진 또는 과식",                                         FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9a_6", "Feeling bad about yourself — or that you are a failure or that you have let yourself or your family down", "对自己感觉很差——或觉得自己是个失败者，或让自己或家人失望", "자신에 대해 나쁘게 느끼거나 실패자라고 느끼거나 자신이나 가족을 실망시켰다는 느낌", FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9a_7", "Trouble concentrating on things, such as reading, school work, or watching TV", "难以集中注意力做事，例如阅读、学校作业或看电视", "독서, 학교 과제, TV 시청 같은 일에 집중하는 데 어려움",         FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9a_8", "Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual", "行动或说话慢到他人注意，或相反——焦躁不安，比平时多动", "행동이나 말이 너무 느려 다른 사람이 알아챌 정도이거나, 반대로 너무 초조하거나 안절부절못해 평소보다 많이 돌아다님", FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
  q("phq9a_9", "Thoughts that you would be better off dead, or of hurting yourself or suicide", "想到自己死了会更好，或想伤害自己或自杀", "죽는 것이 낫겠다거나 자해 또는 자살에 대한 생각", FREQ4_EN, FREQ4_ZH, FREQ4_KO, "depression"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// PSS-10 – Perceived Stress Scale
// ═══════════════════════════════════════════════════════════════════════════════

export const PSS10_FORM: FormQuestion[] = [
  h("pss_instr", "The questions in this scale ask you about your feelings and thoughts during the last month. In each case, please indicate how often you felt or thought a certain way.", "本量表中的问题询问您上个月的感受和想法。对于每个问题，请指出您有某种感受或想法的频率。", "이 척도의 질문은 지난 한 달 동안의 감정과 생각에 관한 것입니다. 각 항목에 대해 얼마나 자주 그런 감정이나 생각이 들었는지 표시하십시오.", "stress"),
  q("pss_1",  "In the last month, how often have you been upset because of something that happened unexpectedly?",                                        "上个月，您因意外发生的事情而感到不安的频率如何？",                 "지난 한 달 동안 예상치 못한 일이 발생하여 얼마나 자주 속상했습니까?",                 PSS_EN, PSS_ZH, PSS_KO, "stress"),
  q("pss_2",  "In the last month, how often have you felt that you were unable to control the important things in your life?",                            "上个月，您感到无法控制生活中重要事情的频率如何？",                 "지난 한 달 동안 삶의 중요한 일들을 통제할 수 없다고 얼마나 자주 느꼈습니까?",         PSS_EN, PSS_ZH, PSS_KO, "stress"),
  q("pss_3",  "In the last month, how often have you felt nervous and stressed?",                                                                          "上个月，您感到紧张和有压力的频率如何？",                           "지난 한 달 동안 얼마나 자주 긴장하고 스트레스를 받았습니까?",                         PSS_EN, PSS_ZH, PSS_KO, "stress"),
  q("pss_4",  "In the last month, how often have you felt confident about your ability to handle your personal problems?",                                 "上个月，您对处理个人问题的能力感到自信的频率如何？",               "지난 한 달 동안 개인적인 문제를 처리하는 능력에 자신감을 얼마나 자주 느꼈습니까?",   PSS_EN, PSS_ZH, PSS_KO, "stress"),
  q("pss_5",  "In the last month, how often have you felt that things were going your way?",                                                               "上个月，您感到事情按您的意愿进行的频率如何？",                     "지난 한 달 동안 일이 뜻대로 되고 있다고 얼마나 자주 느꼈습니까?",                     PSS_EN, PSS_ZH, PSS_KO, "stress"),
  q("pss_6",  "In the last month, how often have you found that you could not cope with all the things that you had to do?",                               "上个月，您发现自己无法应对所有必须做的事情的频率如何？",           "지난 한 달 동안 해야 할 모든 일들을 감당할 수 없다는 것을 얼마나 자주 느꼈습니까?", PSS_EN, PSS_ZH, PSS_KO, "stress"),
  q("pss_7",  "In the last month, how often have you been able to control irritations in your life?",                                                      "上个月，您能够控制生活中烦恼的频率如何？",                         "지난 한 달 동안 삶에서 짜증스러운 일들을 얼마나 자주 통제할 수 있었습니까?",         PSS_EN, PSS_ZH, PSS_KO, "stress"),
  q("pss_8",  "In the last month, how often have you felt that you were on top of things?",                                                                "上个月，您感到掌控一切的频率如何？",                               "지난 한 달 동안 모든 것을 잘 처리하고 있다고 얼마나 자주 느꼈습니까?",               PSS_EN, PSS_ZH, PSS_KO, "stress"),
  q("pss_9",  "In the last month, how often have you been angered because of things that were outside of your control?",                                   "上个月，您因无法控制的事情而感到愤怒的频率如何？",                 "지난 한 달 동안 통제할 수 없는 일들 때문에 얼마나 자주 화가 났습니까?",               PSS_EN, PSS_ZH, PSS_KO, "stress"),
  q("pss_10", "In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?",                           "上个月，您感到困难堆积如山，无法克服的频率如何？",                 "지난 한 달 동안 어려움이 너무 쌓여서 극복할 수 없다고 얼마나 자주 느꼈습니까?",     PSS_EN, PSS_ZH, PSS_KO, "stress"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// DASS-21 – Depression Anxiety Stress Scale
// ═══════════════════════════════════════════════════════════════════════════════

export const DASS21_FORM: FormQuestion[] = [
  h("dass_instr", "Please read each statement and circle a number 0, 1, 2 or 3 which indicates how much the statement applied to you over the past week.", "请阅读每一陈述，并圈出0、1、2或3中一个数字，表示该陈述在过去一周内适用于您的程度。", "각 항목을 읽고 지난 일주일 동안 그 내용이 자신에게 얼마나 해당되었는지 0, 1, 2, 3 중 하나를 선택하십시오.", "general"),
  h("dass_s_hdr", "STRESS", "压力", "스트레스", "stress"),
  q("dass_s1",  "I found it hard to wind down",                                                                             "我发现很难放松下来",                         "나는 긴장을 풀기가 어려웠다",                                         DASS_EN, DASS_ZH, DASS_KO, "stress"),
  q("dass_s2",  "I tended to over-react to situations",                                                                     "我倾向于对情况反应过度",                     "나는 상황에 과잉 반응하는 경향이 있었다",                             DASS_EN, DASS_ZH, DASS_KO, "stress"),
  q("dass_s3",  "I felt that I was using a lot of nervous energy",                                                          "我感到消耗了大量神经能量",                   "나는 많은 신경 에너지를 소모하고 있다고 느꼈다",                     DASS_EN, DASS_ZH, DASS_KO, "stress"),
  q("dass_s4",  "I found myself getting agitated",                                                                          "我发现自己变得激动",                         "나는 자신이 흥분하고 있음을 알아챘다",                               DASS_EN, DASS_ZH, DASS_KO, "stress"),
  q("dass_s5",  "I found it difficult to relax",                                                                            "我发现很难放松",                             "나는 긴장을 풀기가 어렵다는 것을 알았다",                           DASS_EN, DASS_ZH, DASS_KO, "stress"),
  q("dass_s6",  "I was intolerant of anything that kept me from getting on with what I was doing",                          "我对任何阻止我做正在做的事情的事情感到不耐烦", "나는 하던 일을 방해하는 것에 대해 참을 수 없었다",                   DASS_EN, DASS_ZH, DASS_KO, "stress"),
  q("dass_s7",  "I felt that I was rather touchy",                                                                          "我感到自己很容易被激怒",                     "나는 다소 신경질적이라고 느꼈다",                                   DASS_EN, DASS_ZH, DASS_KO, "stress"),
  h("dass_a_hdr", "ANXIETY", "焦虑", "불안", "anxiety"),
  q("dass_a1",  "I was aware of dryness of my mouth",                                                                       "我注意到口腔干燥",                           "나는 입이 마르는 것을 느꼈다",                                       DASS_EN, DASS_ZH, DASS_KO, "anxiety"),
  q("dass_a2",  "I experienced breathing difficulty (e.g. excessively rapid breathing, breathlessness in the absence of physical exertion)", "我经历了呼吸困难（如呼吸急促、在没有体力活动的情况下喘不过气）", "나는 호흡 곤란을 경험했다 (예: 신체 활동 없이 빠른 호흡, 숨 가쁨)", DASS_EN, DASS_ZH, DASS_KO, "anxiety"),
  q("dass_a3",  "I experienced trembling (e.g. in the hands)",                                                              "我经历了颤抖（如手部颤抖）",                 "나는 떨림을 경험했다 (예: 손 떨림)",                                 DASS_EN, DASS_ZH, DASS_KO, "anxiety"),
  q("dass_a4",  "I was worried about situations in which I might panic and make a fool of myself",                          "我担心自己可能会恐慌并出丑的情况",           "나는 당황하여 체면을 잃을 수 있는 상황에 대해 걱정했다",             DASS_EN, DASS_ZH, DASS_KO, "anxiety"),
  q("dass_a5",  "I felt I was close to panic",                                                                              "我感到自己快要恐慌了",                       "나는 공황에 가까운 느낌이 들었다",                                   DASS_EN, DASS_ZH, DASS_KO, "anxiety"),
  q("dass_a6",  "I was aware of the action of my heart in the absence of physical exertion (e.g. sense of heart rate increase, heart missing a beat)", "我在没有体力活动的情况下感到心跳异常（如心率加快、心跳漏拍）", "나는 신체 활동 없이 심장의 움직임을 인식했다 (예: 심박수 증가, 심장 박동 빠짐)", DASS_EN, DASS_ZH, DASS_KO, "anxiety"),
  q("dass_a7",  "I felt scared without any good reason",                                                                    "我无缘无故地感到害怕",                       "나는 특별한 이유 없이 두려움을 느꼈다",                             DASS_EN, DASS_ZH, DASS_KO, "anxiety"),
  h("dass_d_hdr", "DEPRESSION", "抑郁", "우울", "depression"),
  q("dass_d1",  "I couldn't seem to experience any positive feeling at all",                                                "我似乎完全无法体验任何积极的感受",           "나는 어떤 긍정적인 감정도 경험할 수 없는 것 같았다",               DASS_EN, DASS_ZH, DASS_KO, "depression"),
  q("dass_d2",  "I found it difficult to work up the initiative to do things",                                              "我发现很难鼓起动力去做事",                   "나는 일을 시작할 의욕을 내기가 어려웠다",                           DASS_EN, DASS_ZH, DASS_KO, "depression"),
  q("dass_d3",  "I felt that I had nothing to look forward to",                                                             "我感到没有什么值得期待的事情",               "나는 기대할 것이 아무것도 없다고 느꼈다",                           DASS_EN, DASS_ZH, DASS_KO, "depression"),
  q("dass_d4",  "I felt down-hearted and blue",                                                                             "我感到沮丧和忧郁",                           "나는 낙담하고 우울한 기분이 들었다",                               DASS_EN, DASS_ZH, DASS_KO, "depression"),
  q("dass_d5",  "I was unable to become enthusiastic about anything",                                                       "我对任何事情都无法感到热情",                 "나는 어떤 것에도 열정을 느낄 수 없었다",                           DASS_EN, DASS_ZH, DASS_KO, "depression"),
  q("dass_d6",  "I felt that I wasn't worth much as a person",                                                              "我觉得自己作为一个人没有什么价值",           "나는 사람으로서 별 가치가 없다고 느꼈다",                           DASS_EN, DASS_ZH, DASS_KO, "depression"),
  q("dass_d7",  "I felt that life was meaningless",                                                                         "我感到生活毫无意义",                         "나는 삶이 의미 없다고 느꼈다",                                     DASS_EN, DASS_ZH, DASS_KO, "depression"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// RSES – Rosenberg Self-Esteem Scale
// ═══════════════════════════════════════════════════════════════════════════════

export const RSES_FORM: FormQuestion[] = [
  h("rses_instr", "Below is a list of statements dealing with your general feelings about yourself. Please indicate how strongly you agree or disagree with each statement.", "以下是一些关于您对自己总体感受的陈述。请说明您对每个陈述的同意程度。", "아래는 자신에 대한 일반적인 감정에 관한 진술들입니다. 각 진술에 얼마나 동의하는지 표시하십시오.", "self_esteem"),
  q("rses_1",  "On the whole, I am satisfied with myself.",                          "总体而言，我对自己感到满意。",               "전반적으로 나는 자신에 대해 만족한다.",                     SA4_EN, SA4_ZH, SA4_KO, "self_esteem"),
  q("rses_2",  "At times I think I am no good at all.",                              "有时我觉得自己一无是处。",                   "때때로 나는 내가 전혀 쓸모없다고 생각한다.",               SA4_EN, SA4_ZH, SA4_KO, "self_esteem"),
  q("rses_3",  "I feel that I have a number of good qualities.",                     "我觉得自己有许多优点。",                     "나는 여러 가지 좋은 자질을 가지고 있다고 느낀다.",         SA4_EN, SA4_ZH, SA4_KO, "self_esteem"),
  q("rses_4",  "I am able to do things as well as most other people.",               "我能像大多数人一样把事情做好。",             "나는 대부분의 다른 사람들만큼 일을 잘할 수 있다.",         SA4_EN, SA4_ZH, SA4_KO, "self_esteem"),
  q("rses_5",  "I feel I do not have much to be proud of.",                          "我觉得自己没有什么值得骄傲的事情。",         "나는 자랑스러워할 것이 별로 없다고 느낀다.",               SA4_EN, SA4_ZH, SA4_KO, "self_esteem"),
  q("rses_6",  "I certainly feel useless at times.",                                 "有时我确实感到无用。",                       "때때로 나는 분명히 쓸모없다고 느낀다.",                   SA4_EN, SA4_ZH, SA4_KO, "self_esteem"),
  q("rses_7",  "I feel that I'm a person of worth, at least on an equal plane with others.", "我觉得自己是一个有价值的人，至少与他人平等。", "나는 적어도 다른 사람들과 동등한 수준에서 가치 있는 사람이라고 느낀다.", SA4_EN, SA4_ZH, SA4_KO, "self_esteem"),
  q("rses_8",  "I wish I could have more respect for myself.",                       "我希望自己能更加自尊。",                     "나는 자신을 더 존중할 수 있었으면 한다.",                 SA4_EN, SA4_ZH, SA4_KO, "self_esteem"),
  q("rses_9",  "All in all, I am inclined to feel that I am a failure.",             "总的来说，我倾向于认为自己是个失败者。",     "전반적으로 나는 자신이 실패자라고 느끼는 경향이 있다.",   SA4_EN, SA4_ZH, SA4_KO, "self_esteem"),
  q("rses_10", "I take a positive attitude toward myself.",                           "我对自己持积极的态度。",                     "나는 자신에 대해 긍정적인 태도를 취한다.",               SA4_EN, SA4_ZH, SA4_KO, "self_esteem"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// WHO-5 – World Health Organization Well-Being Index
// ═══════════════════════════════════════════════════════════════════════════════

export const WHO5_FORM: FormQuestion[] = [
  h("who5_instr", "Please indicate for each of the following statements which is closest to how you have been feeling over the last two weeks.", "对于以下每一项陈述，请选出最接近您过去两周感受的选项。", "다음 각 진술에 대해 지난 2주 동안의 기분과 가장 가까운 항목을 선택하십시오.", "wellbeing"),
  q("who5_1", "I have felt cheerful and in good spirits",          "我感到愉快，精神状态良好",     "나는 명랑하고 기분이 좋았다",         WHO5_EN, WHO5_ZH, WHO5_KO, "wellbeing"),
  q("who5_2", "I have felt calm and relaxed",                      "我感到平静和放松",             "나는 차분하고 편안함을 느꼈다",       WHO5_EN, WHO5_ZH, WHO5_KO, "wellbeing"),
  q("who5_3", "I have felt active and vigorous",                   "我感到精力充沛",               "나는 활기차고 생기가 넘쳤다",         WHO5_EN, WHO5_ZH, WHO5_KO, "wellbeing"),
  q("who5_4", "I woke up feeling fresh and rested",                "我醒来时感到精神焕发、休息充足", "나는 상쾌하고 충분히 쉰 기분으로 잠에서 깼다", WHO5_EN, WHO5_ZH, WHO5_KO, "wellbeing"),
  q("who5_5", "My daily life has been filled with things that interest me", "我的日常生活充满了让我感兴趣的事情", "나의 일상생활은 흥미로운 것들로 가득 차 있었다", WHO5_EN, WHO5_ZH, WHO5_KO, "wellbeing"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT – Alcohol Use Disorders Identification Test
// ═══════════════════════════════════════════════════════════════════════════════

export const AUDIT_FORM: FormQuestion[] = [
  h("audit_instr", "Because alcohol use can affect your health and can interfere with certain medications and treatments, it is important that we ask some questions about your use of alcohol. Your answers will remain confidential. Please place an X in one box that best describes your answer to each question.", "由于饮酒会影响您的健康并干扰某些药物和治疗，因此询问您的饮酒情况非常重要。您的回答将保密。请在最能描述您对每个问题答案的方框中划X。", "음주는 건강에 영향을 미치고 특정 약물 및 치료를 방해할 수 있으므로 음주에 관한 몇 가지 질문을 드리는 것이 중요합니다. 귀하의 답변은 기밀로 유지됩니다. 각 질문에 대한 답변을 가장 잘 설명하는 상자에 X를 표시하십시오.", "alcohol"),
  q("audit_1", "How often do you have a drink containing alcohol?",                                                                                                  "您多久喝一次含酒精的饮料？",                           "얼마나 자주 알코올이 들어간 음료를 마십니까?",               AUDIT_FREQ_EN, AUDIT_FREQ_ZH, AUDIT_FREQ_KO, "alcohol"),
  q("audit_2", "How many drinks containing alcohol do you have on a typical day when you are drinking?",                                                              "在饮酒的典型一天中，您会喝多少杯含酒精的饮料？",       "음주하는 날 보통 몇 잔의 알코올 음료를 마십니까?",           AUDIT_QTY_EN, AUDIT_QTY_ZH, AUDIT_QTY_KO, "alcohol"),
  q("audit_3", "How often do you have six or more drinks on one occasion?",                                                                                           "您多久在一次饮酒场合喝六杯或以上？",                   "한 번에 6잔 이상을 마시는 경우가 얼마나 자주 있습니까?",     AUDIT_FREQ_EN, AUDIT_FREQ_ZH, AUDIT_FREQ_KO, "alcohol"),
  q("audit_4", "How often during the last year have you found that you were not able to stop drinking once you had started?",                                          "在过去一年中，您多久发现一旦开始喝酒就无法停止？",     "지난 1년 동안 한번 마시기 시작하면 멈출 수 없었던 경우가 얼마나 자주 있었습니까?", AUDIT_FREQ_EN, AUDIT_FREQ_ZH, AUDIT_FREQ_KO, "alcohol"),
  q("audit_5", "How often during the last year have you failed to do what was normally expected from you because of drinking?",                                        "在过去一年中，您多久因饮酒而未能履行正常职责？",       "지난 1년 동안 음주로 인해 평소에 기대되는 일을 하지 못한 경우가 얼마나 자주 있었습니까?", AUDIT_FREQ_EN, AUDIT_FREQ_ZH, AUDIT_FREQ_KO, "alcohol"),
  q("audit_6", "How often during the last year have you needed a first drink in the morning to get yourself going after a heavy drinking session?",                    "在过去一年中，您多久需要在早上喝第一杯酒来在大量饮酒后让自己振作起来？", "지난 1년 동안 폭음 후 아침에 첫 잔이 필요했던 경우가 얼마나 자주 있었습니까?", AUDIT_FREQ_EN, AUDIT_FREQ_ZH, AUDIT_FREQ_KO, "alcohol"),
  q("audit_7", "How often during the last year have you had a feeling of guilt or remorse after drinking?",                                                            "在过去一年中，您多久在饮酒后感到内疚或后悔？",         "지난 1년 동안 음주 후 죄책감이나 후회를 얼마나 자주 느꼈습니까?", AUDIT_FREQ_EN, AUDIT_FREQ_ZH, AUDIT_FREQ_KO, "alcohol"),
  q("audit_8", "How often during the last year have you been unable to remember what happened the night before because you had been drinking?",                        "在过去一年中，您多久因饮酒而无法记住前一晚发生的事情？", "지난 1년 동안 음주로 인해 전날 밤 있었던 일을 기억할 수 없었던 경우가 얼마나 자주 있었습니까?", AUDIT_FREQ_EN, AUDIT_FREQ_ZH, AUDIT_FREQ_KO, "alcohol"),
  q("audit_9",  "Have you or someone else been injured as a result of your drinking?",                                                                                "您或其他人是否因您饮酒而受伤？",                       "귀하의 음주로 인해 귀하 또는 다른 사람이 다친 적이 있습니까?", AUDIT_YN_EN, AUDIT_YN_ZH, AUDIT_YN_KO, "alcohol", "radio_group"),
  q("audit_10", "Has a relative, friend, or doctor or another health worker been concerned about your drinking or suggested you cut down?",                            "是否有亲属、朋友或医生或其他医疗工作者对您的饮酒感到担忧或建议您减少饮酒？", "친척, 친구 또는 의사나 다른 의료 종사자가 귀하의 음주에 대해 우려를 표하거나 줄이도록 권고한 적이 있습니까?", AUDIT_YN_EN, AUDIT_YN_ZH, AUDIT_YN_KO, "alcohol", "radio_group"),
];

// ═══════════════════════════════════════════════════════════════════════════════
// CABS – Child/Adolescent Bullying Scale
// ═══════════════════════════════════════════════════════════════════════════════

export const CABS_FORM: FormQuestion[] = [
  h("cabs_instr", "The following questions ask about things that may have happened to you or things you may have done at school or online during the past month. Please answer honestly.", "以下问题询问过去一个月内可能在学校或网络上发生在您身上的事情，或您可能做过的事情。请诚实作答。", "다음 질문은 지난 한 달 동안 학교나 온라인에서 귀하에게 일어났거나 귀하가 했을 수 있는 일들에 관한 것입니다. 솔직하게 답해 주십시오.", "bullying"),
  h("cabs_v_hdr", "VICTIMIZATION – Things that happened to ME", "受害情况 — 发生在我身上的事", "피해 경험 – 나에게 일어난 일", "bullying"),
  q("cabs_v1",  "Other students hit, kicked, or pushed me",                          "其他同学打、踢或推我",               "다른 학생들이 나를 때리거나 발로 차거나 밀었다",             BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_v2",  "Other students called me names or insulted me",                     "其他同学给我起绰号或侮辱我",         "다른 학생들이 나에게 별명을 부르거나 모욕했다",               BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_v3",  "Other students left me out of activities on purpose",               "其他同学故意不让我参与活动",         "다른 학생들이 고의로 나를 활동에서 배제했다",                 BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_v4",  "Other students spread rumors about me",                             "其他同学散布关于我的谣言",           "다른 학생들이 나에 대한 소문을 퍼뜨렸다",                   BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_v5",  "Other students threatened me",                                      "其他同学威胁我",                     "다른 학생들이 나를 협박했다",                                 BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_v6",  "Other students made fun of me in a hurtful way",                   "其他同学以伤害性的方式取笑我",       "다른 학생들이 나를 상처 주는 방식으로 놀렸다",               BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_v7",  "Other students tried to make me do things I didn't want to do",    "其他同学试图让我做我不想做的事",     "다른 학생들이 나를 원하지 않는 일을 하도록 강요하려 했다",   BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_v8",  "I was ignored or not talked to by other students on purpose",       "其他同学故意忽视我或不和我说话",     "다른 학생들이 고의로 나를 무시하거나 말을 걸지 않았다",       BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_v9",  "Someone sent me mean or hurtful messages online or by text",        "有人通过网络或短信向我发送恶意或伤害性消息", "누군가 온라인이나 문자로 나쁘거나 상처 주는 메시지를 보냈다", BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_v10", "Photos or videos of me were shared without my permission",          "有人未经我同意分享了我的照片或视频", "내 사진이나 영상이 허락 없이 공유되었다",                     BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  h("cabs_p_hdr", "PERPETRATION – Things I did to OTHERS", "加害情况 — 我对他人做的事", "가해 경험 – 내가 타인에게 한 일", "bullying"),
  q("cabs_p1",  "I hit, kicked, or pushed other students",                           "我打、踢或推其他同学",               "나는 다른 학생들을 때리거나 발로 차거나 밀었다",             BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_p2",  "I called other students names or insulted them",                    "我给其他同学起绰号或侮辱他们",       "나는 다른 학생들에게 별명을 부르거나 모욕했다",               BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_p3",  "I left other students out of activities on purpose",                "我故意不让其他同学参与活动",         "나는 고의로 다른 학생들을 활동에서 배제했다",                 BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_p4",  "I spread rumors about other students",                              "我散布关于其他同学的谣言",           "나는 다른 학생들에 대한 소문을 퍼뜨렸다",                   BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_p5",  "I threatened other students",                                       "我威胁其他同学",                     "나는 다른 학생들을 협박했다",                                 BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_p6",  "I made fun of other students in a hurtful way",                    "我以伤害性的方式取笑其他同学",       "나는 다른 학생들을 상처 주는 방식으로 놀렸다",               BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_p7",  "I tried to make other students do things they didn't want to do",  "我试图让其他同学做他们不想做的事",   "나는 다른 학생들이 원하지 않는 일을 하도록 강요하려 했다",   BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_p8",  "I ignored other students or refused to talk to them on purpose",    "我故意忽视其他同学或拒绝与他们说话", "나는 고의로 다른 학생들을 무시하거나 말하기를 거부했다",     BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_p9",  "I sent mean or hurtful messages to others online or by text",       "我通过网络或短信向他人发送恶意或伤害性消息", "나는 온라인이나 문자로 다른 사람에게 나쁘거나 상처 주는 메시지를 보냈다", BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
  q("cabs_p10", "I shared photos or videos of someone without their permission",     "我未经许可分享了他人的照片或视频", "나는 허락 없이 다른 사람의 사진이나 영상을 공유했다",         BULLY_EN, BULLY_ZH, BULLY_KO, "bullying"),
];
