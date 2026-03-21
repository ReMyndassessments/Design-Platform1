export interface FormQuestion {
  id: string;
  text: string;
  textMandarin?: string;
  textCantonese?: string;
  type: "likert" | "yes_no" | "text" | "scale";
  options?: string[];
  domain: string;
}

const LIKERT_OPTIONS = ["Never", "Rarely", "Sometimes", "Often", "Very Often"];
const LIKERT_OPTIONS_ZH = ["從不", "很少", "有時", "經常", "非常頻繁"];

export const SAMPLE_QUESTIONS: Record<string, FormQuestion[]> = {
  default: [
    { id: "q1", text: "Has difficulty sustaining attention in tasks or play activities", textMandarin: "在任務或遊戲活動中難以持續注意力", type: "likert", options: LIKERT_OPTIONS, domain: "attention" },
    { id: "q2", text: "Often loses things necessary for tasks (e.g., toys, school materials)", textMandarin: "經常遺失任務所需的物品", type: "likert", options: LIKERT_OPTIONS, domain: "attention" },
    { id: "q3", text: "Is easily distracted by extraneous stimuli", textMandarin: "容易被無關刺激分心", type: "likert", options: LIKERT_OPTIONS, domain: "attention" },
    { id: "q4", text: "Has difficulty organizing tasks and activities", textMandarin: "難以組織任務和活動", type: "likert", options: LIKERT_OPTIONS, domain: "executive_function" },
    { id: "q5", text: "Has trouble following through on instructions", textMandarin: "難以按指示完成工作", type: "likert", options: LIKERT_OPTIONS, domain: "executive_function" },
    { id: "q6", text: "Has difficulty regulating emotions", textMandarin: "難以調節情緒", type: "likert", options: LIKERT_OPTIONS, domain: "emotional_regulation" },
    { id: "q7", text: "Struggles with transitions between activities", textMandarin: "在活動轉換時有困難", type: "likert", options: LIKERT_OPTIONS, domain: "emotional_regulation" },
    { id: "q8", text: "Has difficulty in social interactions with peers", textMandarin: "與同伴的社交互動有困難", type: "likert", options: LIKERT_OPTIONS, domain: "social_communication" },
    { id: "q9", text: "Shows academic persistence when tasks are challenging", textMandarin: "面對挑戰性任務時表現出學業堅持", type: "likert", options: LIKERT_OPTIONS, domain: "academic_persistence" },
    { id: "q10", text: "Overall, how would you rate this student's functioning at school?", textMandarin: "總體而言，您如何評價這位學生在學校的表現？", type: "scale", domain: "general" },
  ],
  "RCS-80": [
    { id: "r1", text: "Inattentive during lessons", textMandarin: "課堂上注意力不集中", type: "likert", options: LIKERT_OPTIONS, domain: "attention" },
    { id: "r2", text: "Difficulty completing homework independently", textMandarin: "難以獨立完成家庭作業", type: "likert", options: LIKERT_OPTIONS, domain: "executive_function" },
    { id: "r3", text: "Interrupts others frequently", textMandarin: "經常打斷他人", type: "likert", options: LIKERT_OPTIONS, domain: "social_communication" },
    { id: "r4", text: "Loses temper easily", textMandarin: "容易發脾氣", type: "likert", options: LIKERT_OPTIONS, domain: "emotional_regulation" },
    { id: "r5", text: "Has difficulty sitting still", textMandarin: "難以靜坐", type: "likert", options: LIKERT_OPTIONS, domain: "attention" },
    { id: "r6", text: "Makes careless errors in schoolwork", textMandarin: "在學業工作中犯粗心錯誤", type: "likert", options: LIKERT_OPTIONS, domain: "attention" },
    { id: "r7", text: "Struggles to wait for turn", textMandarin: "難以等待輪到自己", type: "likert", options: LIKERT_OPTIONS, domain: "executive_function" },
    { id: "r8", text: "Has problems with reading comprehension", textMandarin: "閱讀理解有問題", type: "likert", options: LIKERT_OPTIONS, domain: "academic_persistence" },
  ],
};
