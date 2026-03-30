// Form item definitions for externally-sourced assessment tools
// Imported by index.ts and merged into CANONICAL_TOOLS

type FormItem = {
  id: string;
  text: string;
  textChinese: string;
  textKorean: string;
  type: string;
  domain: string;
  options: string[];
  optionsChinese: string[];
  optionsKorean: string[];
};

// ─── Shared option sets ────────────────────────────────────────────────────────

const LIKERT_0_3_EN  = ["Not at All", "Just a Little", "Quite a Bit", "Very Much"];
const LIKERT_0_4_EN  = ["Never", "Rarely", "Occasionally", "Frequently", "Very Frequently"];
const NEVER_3_EN     = ["Never True", "Sometimes True", "Often True", "Always True"];
const FREQ_4_EN      = ["Never", "Rarely", "Sometimes", "Frequently", "Always"];
const NEVER_ALWAYS_EN = ["Never", "Sometimes", "Often", "Always"];
const NEVER_ALWAYS_ZH = ["从不", "有时", "常常", "总是"];
const YES_NO_EN      = ["Yes", "No"];
const DST_A_EN       = ["Yes", "Sometimes", "No", "Unknown"];
const DST_BH_EN      = ["Absolutely", "Somewhat", "Rarely or Never"];

function r(id: string, text: string, domain: string, opts: string[], optsChinese: string[] = [], optsKorean: string[] = []): FormItem {
  return { id, text, textChinese: text, textKorean: text, type: "radio", domain, options: opts, optionsChinese: optsChinese.length ? optsChinese : opts, optionsKorean: optsKorean.length ? optsKorean : opts };
}
function rZh(id: string, text: string, textChinese: string, domain: string, opts: string[], optsChinese: string[]): FormItem {
  return { id, text, textChinese, textKorean: text, type: "radio", domain, options: opts, optionsChinese: optsChinese, optionsKorean: opts };
}
function cb(id: string, text: string, domain: string): FormItem {
  return { id, text, textChinese: text, textKorean: text, type: "checkbox", domain, options: [], optionsChinese: [], optionsKorean: [] };
}
function tx(id: string, text: string, domain: string): FormItem {
  return { id, text, textChinese: text, textKorean: text, type: "text", domain, options: [], optionsChinese: [], optionsKorean: [] };
}

// ─── SNAP-IV 26 ───────────────────────────────────────────────────────────────
export const SNAP_IV_FORM: FormItem[] = [
  r("q1",  "Often fails to give close attention to details or makes careless mistakes in schoolwork or tasks.", "inattention", LIKERT_0_3_EN),
  r("q2",  "Often has difficulty sustaining attention in tasks or play activities.", "inattention", LIKERT_0_3_EN),
  r("q3",  "Often does not seem to listen when spoken to directly.", "inattention", LIKERT_0_3_EN),
  r("q4",  "Often does not follow through on instructions and fails to finish schoolwork, chores, or duties.", "inattention", LIKERT_0_3_EN),
  r("q5",  "Often has difficulty organizing tasks and activities.", "inattention", LIKERT_0_3_EN),
  r("q6",  "Often avoids, dislikes, or is reluctant to engage in tasks requiring sustained mental effort.", "inattention", LIKERT_0_3_EN),
  r("q7",  "Often loses things necessary for activities (e.g., toys, school assignments, pencils, or books).", "inattention", LIKERT_0_3_EN),
  r("q8",  "Often is easily distracted by extraneous stimuli.", "inattention", LIKERT_0_3_EN),
  r("q9",  "Often is forgetful in daily activities.", "inattention", LIKERT_0_3_EN),
  r("q10", "Often fidgets with hands or feet or squirms in seat.", "hyperactivity_impulsivity", LIKERT_0_3_EN),
  r("q11", "Often leaves seat in situations when remaining seated is expected.", "hyperactivity_impulsivity", LIKERT_0_3_EN),
  r("q12", "Often runs about or climbs excessively in inappropriate situations.", "hyperactivity_impulsivity", LIKERT_0_3_EN),
  r("q13", "Often has difficulty playing or engaging in leisure activities quietly.", "hyperactivity_impulsivity", LIKERT_0_3_EN),
  r("q14", "Often is 'on the go' or acts as if 'driven by a motor.'", "hyperactivity_impulsivity", LIKERT_0_3_EN),
  r("q15", "Often talks excessively.", "hyperactivity_impulsivity", LIKERT_0_3_EN),
  r("q16", "Often blurts out answers before questions have been completed.", "hyperactivity_impulsivity", LIKERT_0_3_EN),
  r("q17", "Often has difficulty waiting for their turn.", "hyperactivity_impulsivity", LIKERT_0_3_EN),
  r("q18", "Often interrupts or intrudes on others (e.g., interrupts conversations or games).", "hyperactivity_impulsivity", LIKERT_0_3_EN),
  r("q19", "Often loses temper.", "odd", LIKERT_0_3_EN),
  r("q20", "Often argues with adults.", "odd", LIKERT_0_3_EN),
  r("q21", "Often actively defies or refuses to comply with adult requests or rules.", "odd", LIKERT_0_3_EN),
  r("q22", "Often deliberately does things that annoy other people.", "odd", LIKERT_0_3_EN),
  r("q23", "Often blames others for their mistakes or misbehavior.", "odd", LIKERT_0_3_EN),
  r("q24", "Often is touchy or easily annoyed by others.", "odd", LIKERT_0_3_EN),
  r("q25", "Often is angry and resentful.", "odd", LIKERT_0_3_EN),
  r("q26", "Often is spiteful or vindictive.", "odd", LIKERT_0_3_EN),
];

// ─── ABC — Autism Behavior Checklist ─────────────────────────────────────────
export const ABC_AUT_FORM: FormItem[] = [
  // Domain 1: Language Behaviors
  cb("q1",  "Does not follow simple commands given once.", "language"),
  cb("q2",  "Has pronoun reversal.", "language"),
  cb("q3",  "Speech is atonal.", "language"),
  cb("q4",  "Does not respond to own name among others.", "language"),
  cb("q5",  "Seldom says 'yes' or 'I'.", "language"),
  cb("q6",  "Does not follow simple commands involving prepositions.", "language"),
  cb("q7",  "Gets desired objects by gesturing.", "language"),
  cb("q8",  "Repeats phrases or sounds over and over.", "language"),
  cb("q9",  "Cannot point to more than five named objects.", "language"),
  cb("q10", "Uses 0–5 spontaneous words per day to communicate wants/needs.", "language"),
  cb("q11", "Echoes questions/statements made by others.", "language"),
  cb("q12", "Uses 15–30 spontaneous phrases daily to communicate.", "language"),
  cb("q13", "Learns a simple task but quickly 'forgets'.", "language"),
  cb("q14", "Strong reactions to changes in routine/environment.", "language"),
  cb("q15", "Shows 'special abilities' in one area of development.", "language"),
  cb("q16", "Severe or frequent minor temper tantrums.", "language"),
  // Domain 2: Body and Object Use Behaviors
  cb("q17", "Whirls self for long periods.", "body_object_use"),
  cb("q18", "Does not use toys appropriately.", "body_object_use"),
  cb("q19", "Insists on keeping certain objects with self.", "body_object_use"),
  cb("q20", "Rocks self for long periods.", "body_object_use"),
  cb("q21", "Lunges or darts frequently.", "body_object_use"),
  cb("q22", "Flaps hands.", "body_object_use"),
  cb("q23", "Walks on toes.", "body_object_use"),
  cb("q24", "Self-injury (head banging, biting hands, etc.).", "body_object_use"),
  cb("q25", "Twirls, spins, or bangs objects frequently.", "body_object_use"),
  cb("q26", "Explores objects through touch, smell, or taste.", "body_object_use"),
  cb("q27", "Engages in complex rituals (lining up objects, etc.).", "body_object_use"),
  cb("q28", "Highly destructive behavior.", "body_object_use"),
  // Domain 3: Sensory Behaviors
  cb("q29", "Poor visual discrimination when learning.", "sensory"),
  cb("q30", "Appears not to hear; possible hearing concern.", "sensory"),
  cb("q31", "No startle response to loud noises.", "sensory"),
  cb("q32", "Painful stimuli (cuts, injections) evoke no reaction.", "sensory"),
  cb("q33", "Often does not blink in bright light.", "sensory"),
  cb("q34", "Covers ears in response to certain sounds.", "sensory"),
  cb("q35", "Squints, frowns, or covers eyes in natural light.", "sensory"),
  cb("q36", "No visual reaction to new people.", "sensory"),
  cb("q37", "Stares into space for long periods.", "sensory"),
  // Domain 4: Relating Behaviors
  cb("q38", "Frequently inattentive to social/environmental stimuli.", "relating"),
  cb("q39", "No social smile.", "relating"),
  cb("q40", "Does not reach out when approached.", "relating"),
  cb("q41", "Unresponsive to others' facial expressions or feelings.", "relating"),
  cb("q42", "Actively avoids eye contact.", "relating"),
  cb("q43", "Resists being touched or held.", "relating"),
  cb("q44", "Appears flaccid when held.", "relating"),
  cb("q45", "Stiff and difficult to hold.", "relating"),
  cb("q46", "Does not imitate peers during play.", "relating"),
  cb("q47", "Has not developed friendships.", "relating"),
  cb("q48", "Often frightened or anxious.", "relating"),
  cb("q49", "Looks through people as if they are not there.", "relating"),
  // Additional Observations
  tx("q50", "Additional observations (note any other relevant behaviors not captured above):", "additional"),
];

// ─── ASRS — Autism Spectrum Rating Scale (6–18) ───────────────────────────────
export const ASRS_AUT_FORM: FormItem[] = [
  // Social Communication & Interaction (28 items)
  r("q1",  "Appears disorganized.", "social_communication", LIKERT_0_4_EN),
  r("q2",  "Seeks the company of other children. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q3",  "Shows limited emotional expression.", "social_communication", LIKERT_0_4_EN),
  r("q4",  "Follows understood instructions. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q5",  "Shares enjoyable activities with others. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q6",  "Looks at others during conversation. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q7",  "Avoids eye contact.", "social_communication", LIKERT_0_4_EN),
  r("q8",  "Has difficulty talking with peers.", "social_communication", LIKERT_0_4_EN),
  r("q9",  "Understands others' perspectives. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q10", "Has social difficulties with same-age peers.", "social_communication", LIKERT_0_4_EN),
  r("q11", "Maintains conversations. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q12", "Understands others' feelings. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q13", "Plays with others. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q14", "Notices social cues. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q15", "Responds when spoken to by adults. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q16", "Cares about others' thoughts and feelings. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q17", "Does not understand why others dislike them.", "social_communication", LIKERT_0_4_EN),
  r("q18", "Shares enjoyment with others. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q19", "Shows interest in others' ideas. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q20", "Understands humor. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q21", "Smiles appropriately. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q22", "Initiates conversations. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q23", "Has difficulty talking with adults.", "social_communication", LIKERT_0_4_EN),
  r("q24", "Makes eye contact during interaction. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q25", "Chooses to play alone.", "social_communication", LIKERT_0_4_EN),
  r("q26", "Has social problems with adults.", "social_communication", LIKERT_0_4_EN),
  r("q27", "Shows good peer interaction. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  r("q28", "Responds to other children. (Reverse scored)", "social_communication", LIKERT_0_4_EN),
  // Restricted & Repetitive Behaviors (12 items)
  r("q29", "Has a strong reaction to changes in routine.", "rrb", LIKERT_0_4_EN),
  r("q30", "Becomes overly focused on details.", "rrb", LIKERT_0_4_EN),
  r("q31", "Insists on doing things the same way.", "rrb", LIKERT_0_4_EN),
  r("q32", "Focuses excessively on details.", "rrb", LIKERT_0_4_EN),
  r("q33", "Focuses on one subject for too long.", "rrb", LIKERT_0_4_EN),
  r("q34", "Needs things to happen exactly as expected.", "rrb", LIKERT_0_4_EN),
  r("q35", "Insists on routines.", "rrb", LIKERT_0_4_EN),
  r("q36", "Fascinated with parts of objects rather than the whole.", "rrb", LIKERT_0_4_EN),
  r("q37", "Lines up objects.", "rrb", LIKERT_0_4_EN),
  r("q38", "Becomes upset when routines change.", "rrb", LIKERT_0_4_EN),
  r("q39", "Needs to carry specific objects.", "rrb", LIKERT_0_4_EN),
  r("q40", "Spins or manipulates objects repetitively.", "rrb", LIKERT_0_4_EN),
  // Sensory Sensitivity (6 items)
  r("q41", "Sensitive to clothing textures or tags.", "sensory", LIKERT_0_4_EN),
  r("q42", "Overreacts to touch.", "sensory", LIKERT_0_4_EN),
  r("q43", "Smells, tastes, or chews non-food items.", "sensory", LIKERT_0_4_EN),
  r("q44", "Overreacts to smells.", "sensory", LIKERT_0_4_EN),
  r("q45", "Avoids being touched.", "sensory", LIKERT_0_4_EN),
  r("q46", "Overreacts to loud noises.", "sensory", LIKERT_0_4_EN),
  // Language & Communication Differences (8 items)
  r("q47", "Uses immature language for their age.", "language", LIKERT_0_4_EN),
  r("q48", "Uses unusual speech patterns.", "language", LIKERT_0_4_EN),
  r("q49", "Repeats words or phrases out of context.", "language", LIKERT_0_4_EN),
  r("q50", "Echoes others' speech (echolalia).", "language", LIKERT_0_4_EN),
  r("q51", "Talks excessively about narrow interests.", "language", LIKERT_0_4_EN),
  r("q52", "Talks excessively about topics others don't care about.", "language", LIKERT_0_4_EN),
  r("q53", "Asks questions that are off-topic or irrelevant.", "language", LIKERT_0_4_EN),
  r("q54", "Reverses pronouns (e.g., says 'you' instead of 'I').", "language", LIKERT_0_4_EN),
  // Attention & Executive Function (11 items)
  r("q55", "Avoids tasks that require sustained effort.", "attention_ef", LIKERT_0_4_EN),
  r("q56", "Learns tasks but forgets them quickly.", "attention_ef", LIKERT_0_4_EN),
  r("q57", "Easily distracted.", "attention_ef", LIKERT_0_4_EN),
  r("q58", "Has difficulty sustaining attention.", "attention_ef", LIKERT_0_4_EN),
  r("q59", "Makes careless mistakes.", "attention_ef", LIKERT_0_4_EN),
  r("q60", "Leaves tasks unfinished.", "attention_ef", LIKERT_0_4_EN),
  r("q61", "Does not listen when spoken to directly.", "attention_ef", LIKERT_0_4_EN),
  r("q62", "Cannot focus even on enjoyable tasks.", "attention_ef", LIKERT_0_4_EN),
  r("q63", "Fails to complete tasks.", "attention_ef", LIKERT_0_4_EN),
  r("q64", "Interrupts others.", "attention_ef", LIKERT_0_4_EN),
  r("q65", "Appears fidgety or restless.", "attention_ef", LIKERT_0_4_EN),
  // Behavioral Regulation (3 items)
  r("q66", "Argues or fights with others.", "behavioral_regulation", LIKERT_0_4_EN),
  r("q67", "Has difficulty waiting their turn.", "behavioral_regulation", LIKERT_0_4_EN),
  r("q68", "Gets into trouble with adults.", "behavioral_regulation", LIKERT_0_4_EN),
];

// ─── SEDQ — Social-Emotional Development Questionnaire ───────────────────────
export const SEDQ_FORM: FormItem[] = [
  // Social Interaction & Relationships
  r("q1",  "Does the child join in playing games with other children easily? (Reverse scored: No = concern)", "social_interaction", YES_NO_EN),
  r("q2",  "Does the child spontaneously approach others to talk? (Reverse scored: No = concern)", "social_interaction", YES_NO_EN),
  r("q3",  "Is it important to the child to fit in with peers? (Reverse scored: No = concern)", "social_interaction", YES_NO_EN),
  r("q4",  "Does the child find it easy to interact with other children? (Reverse scored: No = concern)", "social_interaction", YES_NO_EN),
  r("q5",  "Does the child have similar interests to peers? (Reverse scored: No = concern)", "social_interaction", YES_NO_EN),
  r("q6",  "Does the child have close friends, not just acquaintances? (Reverse scored: No = concern)", "social_interaction", YES_NO_EN),
  r("q7",  "Are other people important to the child? (Reverse scored: No = concern)", "social_interaction", YES_NO_EN),
  r("q8",  "Does the child care how they are perceived by others? (Reverse scored: No = concern)", "social_interaction", YES_NO_EN),
  // Communication & Conversation
  r("q9",  "Can the child maintain a two-way conversation? (Reverse scored: No = concern)", "communication", YES_NO_EN),
  r("q10", "Does the child share interests with others (e.g., shows objects)? (Reverse scored: No = concern)", "communication", YES_NO_EN),
  r("q11", "Does the child enjoy joking or playful interaction? (Reverse scored: No = concern)", "communication", YES_NO_EN),
  r("q12", "Is the child good at turn-taking in conversation? (Reverse scored: No = concern)", "communication", YES_NO_EN),
  r("q13", "Does the child say or do socially inappropriate things? (Yes = concern)", "communication", YES_NO_EN),
  r("q14", "Does the child lose the listener by not explaining clearly? (Yes = concern)", "communication", YES_NO_EN),
  r("q15", "Does the child shift conversations to their own interests? (Yes = concern)", "communication", YES_NO_EN),
  r("q16", "Does the child use unusual or odd phrases? (Yes = concern)", "communication", YES_NO_EN),
  // Language & Development
  r("q17", "Was the child speaking by age 2? (Reverse scored: No = concern)", "language_development", YES_NO_EN),
  r("q18", "Is the child's tone of voice unusual (flat, overly adult, or monotone)? (Yes = concern)", "language_development", YES_NO_EN),
  r("q19", "Does the child confuse pronouns (e.g., says 'you' instead of 'I')? (Yes = concern)", "language_development", YES_NO_EN),
  // Imagination & Play
  r("q20", "Did the child engage in pretend play at age 3? (Reverse scored: No = concern)", "imagination_play", YES_NO_EN),
  r("q21", "Does the child engage in imaginative play with others? (Reverse scored: No = concern)", "imagination_play", YES_NO_EN),
  r("q22", "Does the child prefer imaginative play over factual or numeric activities? (Reverse scored: No = concern)", "imagination_play", YES_NO_EN),
  // Behavioral Patterns & Flexibility
  r("q23", "Does the child repeat behaviors in the same way over and over? (Yes = concern)", "behavioral_rigidity", YES_NO_EN),
  r("q24", "Does the child have highly restricted interests? (Yes = concern)", "behavioral_rigidity", YES_NO_EN),
  r("q25", "Does the child impose routines on self or others in a problematic way? (Yes = concern)", "behavioral_rigidity", YES_NO_EN),
  // Social Understanding & Awareness
  r("q26", "Does the child notice small details that others miss? (Yes = concern)", "social_understanding", YES_NO_EN),
  r("q27", "Does the child take things literally? (Yes = concern)", "social_understanding", YES_NO_EN),
  r("q28", "Does the child have difficulty understanding social rules? (Yes = concern)", "social_understanding", YES_NO_EN),
  r("q29", "Does the child have an unusually strong memory for details? (Yes = concern)", "social_understanding", YES_NO_EN),
  r("q30", "Is the child's social behavior one-sided or self-directed? (Yes = concern)", "social_understanding", YES_NO_EN),
  // Nonverbal Communication & Motor
  r("q31", "Does the child make appropriate eye contact? (Reverse scored: No = concern)", "nonverbal_motor", YES_NO_EN),
  r("q32", "Does the child have repetitive or unusual movements? (Yes = concern)", "nonverbal_motor", YES_NO_EN),
  r("q33", "Can the child ride a bicycle (with or without support)? (Reverse scored: No = concern)", "nonverbal_motor", YES_NO_EN),
  // Adaptive & Academic Skills
  r("q34", "Does the child enjoy sports? (Reverse scored: No = concern)", "adaptive_skills", YES_NO_EN),
  r("q35", "Is the child reading at an age-appropriate level? (Reverse scored: No = concern)", "adaptive_skills", YES_NO_EN),
  r("q36", "Can the child dress independently? (Reverse scored: No = concern)", "adaptive_skills", YES_NO_EN),
  r("q37", "Can the child count to 50 accurately? (Reverse scored: No = concern)", "adaptive_skills", YES_NO_EN),
];

// ─── SCAS-P — Spence Children's Anxiety Scale (Parent Version) ───────────────
// Chinese translations from official Wei Wang (2005) version
export const SCAS_P_FORM: FormItem[] = [
  rZh("q1",  "My child worries about things.", "我的孩子担心各种事情", "generalized_anxiety", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q2",  "My child is afraid of the dark.", "我的孩子怕黑", "physical_injury_fears", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q3",  "When my child has a problem, he/she says he/she has a stomach ache.", "我的孩子遇到问题时，他/她就说胃部有点不舒服", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q4",  "My child feels afraid.", "我的孩子诉说他/她感到害怕", "generalized_anxiety", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q5",  "My child would be scared if left home alone.", "要是我的孩子一个人呆在家里的话，他会害怕的", "separation_anxiety", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q6",  "My child panics when he/she has tests.", "我的孩子要考试时会感到恐慌", "social_phobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q7",  "My child is afraid to use public toilets or bathrooms.", "我的孩子害怕用公共厕所或公共浴室", "social_phobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q8",  "My child worries about being away from me/us.", "我的孩子担心离开我（们）", "separation_anxiety", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q9",  "My child is scared of looking silly in front of people.", "我的孩子生怕自己会在别人面前出丑", "social_phobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q10", "My child worries about how well he/she does at school.", "我的孩子担心在学校里学习不好", "social_phobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q11", "My child worries that something bad will happen to someone in the family.", "我的孩子担心家里有人会碰到倒霉的事情", "separation_anxiety", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q12", "My child says he/she has a racing heart or difficulty breathing for no apparent reason.", "我的孩子诉说他/她会无缘无故地突然觉得自己好像透不过气来", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q13", "My child has to keep checking that he/she has done things right (e.g., switches off, doors locked).", "我的孩子必须不断检查自己有没有把事情做好（比如开关关好了没有，门锁上了没有）", "ocd", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q14", "My child would feel scared if he/she had to sleep alone.", "如果我的孩子必需自己一个人睡觉，他/她就会觉得恐慌", "separation_anxiety", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q15", "My child feels nervous or scared about going to school in the morning.", "早晨上学去对我的孩子来说是很苦恼的，因为他感到紧张或害怕", "separation_anxiety", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q16", "My child is afraid of dogs.", "我的孩子怕狗", "physical_injury_fears", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q17", "My child can't seem to get bad or silly thoughts out of his/her head.", "我的孩子似乎不能摆脱头脑里一些不好的或愚蠢的想法", "ocd", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q18", "When my child has a problem, he/she says his/her heart beats fast.", "我的孩子遇到问题时，他会诉说心跳得很快", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q19", "My child shakes or trembles for no apparent reason.", "我的孩子会无缘无故地突然开始颤抖或发抖", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q20", "My child worries that something bad is going to happen to him/her.", "我的孩子担心有什么不好的事情会在他/她自己身上发生", "generalized_anxiety", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q21", "My child is afraid of going to the doctor or dentist.", "我的孩子对去看医生或牙医很恐慌", "physical_injury_fears", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q22", "When my child has a problem, he/she feels shaky.", "当我的孩子遇到问题时，他就感到紧张发抖", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q23", "My child is afraid of heights (e.g., cliffs).", "我的孩子对高度很恐慌（比如，在悬崖上）", "physical_injury_fears", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q24", "My child has to think special thoughts (e.g., numbers or words) to stop bad things happening.", "我的孩子必需去想一些特殊的想法（比如数字或词语）以阻止坏事的发生", "ocd", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q25", "My child would panic if he/she had to travel by car, bus, or train.", "如果我的孩子必需坐车，或乘大巴或火车旅行，他/她就感到恐慌", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q26", "My child worries about what other people think of him/her.", "我的孩子担心别人对他/她是怎么想的", "social_phobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q27", "My child is afraid of being in crowded places (e.g., shopping centres, movies, buses, busy playgrounds).", "我的孩子害怕呆在拥挤的地方（如购物中心、电影院、公共汽车、热闹的游乐场）", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q28", "Out of nowhere, my child suddenly feels really scared.", "根本没有什么原因，突然间我的孩子会觉得非常恐慌", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q29", "My child is afraid of insects or spiders.", "我的孩子怕小虫子或蜘蛛", "physical_injury_fears", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q30", "My child says he/she feels dizzy or faint for no apparent reason.", "我的孩子诉说无缘无故地会突然间头晕或象要昏倒了", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q31", "My child would be scared if he/she had to speak in front of the class.", "如果我的孩子必需在全班同学面前讲话他/她就感到害怕", "social_phobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q32", "My child's heart races or beats fast for no apparent reason.", "我的孩子诉说没有什么原因他/她的心突然跳得太快了", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q33", "My child worries he/she will suddenly feel panic when there's nothing to worry about.", "即使没有什么可怕的东西，我的孩子还是担心他/她会突然产生恐慌的感觉", "panic_agoraphobia", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q34", "My child is scared of being in small closed-in places (e.g., tunnels, small rooms).", "我的孩子害怕呆在狭小封闭的地方，比如隧道或小房间里", "physical_injury_fears", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q35", "My child has to do things a certain number of times over and over again (e.g., washing hands, cleaning, or putting things in a specific order).", "有些事情我的孩子必须一遍遍地反复做（比如洗手，打扫卫生，或把东西按照固定的次序放好）", "ocd", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q36", "My child has bad or silly thoughts or images that keep coming into his/her head and bother him/her.", "我的孩子头脑里有些不好的或愚蠢的想法和形象让他/她感到困惑不安", "ocd", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q37", "My child has to do things in a certain way or else something bad will happen.", "我的孩子必需以特定的恰当方式去做某些事情来阻止坏事的发生", "ocd", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  rZh("q38", "My child would feel scared if he/she had to sleep away from home overnight.", "如果我的孩子必需离家在外过夜他/她会觉得很恐慌", "separation_anxiety", NEVER_ALWAYS_EN, NEVER_ALWAYS_ZH),
  tx("q39", "Are there any other things your child is really afraid of? If yes, please describe what they are and how often they occur:", "additional"),
];

// ─── HIQ — Hyperacusis Impact Questionnaire ───────────────────────────────────
export const HIQ_FORM: FormItem[] = [
  // A. Emotional Response to Sound
  r("q1",  "Sounds that did not bother me before now feel frightening.", "emotional_response", NEVER_3_EN),
  r("q2",  "I worry that I will never get used to loud or uncomfortable sounds.", "emotional_response", NEVER_3_EN),
  r("q3",  "I feel very afraid of noise.", "behavioral_avoidance", NEVER_3_EN),
  r("q4",  "I feel I will not be able to cope if this sensitivity continues.", "social_impact", NEVER_3_EN),
  r("q5",  "I am afraid that loud sounds may damage my hearing.", "behavioral_avoidance", NEVER_3_EN),
  // B. Behavioral Avoidance
  r("q6",  "I cannot tolerate being around loud sounds for long periods.", "emotional_response", NEVER_3_EN),
  r("q7",  "I avoid certain sounds or environments.", "cognitive_burden", NEVER_3_EN),
  r("q8",  "I withdraw immediately when exposed to loud sounds.", "functional_impact", NEVER_3_EN),
  // C. Functional Impact
  r("q9",  "When there are many sounds, I struggle to understand what is being said.", "social_impact", NEVER_3_EN),
  r("q10", "I am easily annoyed by sounds that feel too loud or uncomfortable.", "functional_impact", NEVER_3_EN),
  r("q11", "Loud sounds cause physical discomfort or pain in my ears.", "functional_impact", NEVER_3_EN),
  r("q12", "I no longer enjoy music due to sound sensitivity.", "emotional_response", NEVER_3_EN),
  // D. Social Impact
  r("q13", "My sensitivity to sound creates tension in my relationships.", "behavioral_avoidance", NEVER_3_EN),
  r("q14", "Others distance themselves from me because of my sensitivity to sound.", "emotional_response", NEVER_3_EN),
  // E. Cognitive & Emotional Burden
  r("q15", "I feel that sound sensitivity has significantly disrupted my life.", "functional_impact", NEVER_3_EN),
];

// ─── LASA — Learning Ability Screening Assessment ─────────────────────────────
export const LASA_FORM: FormItem[] = [
  // A. Reading
  r("q1",  "How often does the child mispronounce or incorrectly use certain words?", "reading", FREQ_4_EN),
  r("q2",  "How often does the child have difficulty reading unfamiliar words or rely on guessing?", "reading", FREQ_4_EN),
  r("q3",  "How often does the child pause, repeat, or make errors when reading aloud?", "reading", FREQ_4_EN),
  r("q4",  "How often does the child struggle to understand what they have read?", "reading", FREQ_4_EN),
  r("q5",  "How often does the child avoid reading for pleasure?", "reading", FREQ_4_EN),
  // B. Spelling & Writing
  r("q6",  "How often does the child make spelling errors in schoolwork?", "spelling_writing", FREQ_4_EN),
  r("q7",  "How often does the child have messy or unclear handwriting?", "spelling_writing", FREQ_4_EN),
  r("q8",  "How often does the child struggle with punctuation and capitalization?", "spelling_writing", FREQ_4_EN),
  r("q9",  "How often does the child resist writing tasks?", "spelling_writing", FREQ_4_EN),
  r("q10", "How often does the child have difficulty expressing thoughts in writing?", "spelling_writing", FREQ_4_EN),
  // C. Math & Logic
  r("q11", "How often does the child confuse math symbols or operations (e.g., +, −, ×, ÷)?", "math_logic", FREQ_4_EN),
  r("q12", "How often does the child have difficulty comparing numbers or fractions?", "math_logic", FREQ_4_EN),
  r("q13", "How often does the child reverse numbers (e.g., writing 81 instead of 18)?", "math_logic", FREQ_4_EN),
  r("q14", "How often does the child struggle with time-related concepts (days, weeks, hours)?", "math_logic", FREQ_4_EN),
  r("q15", "How often does the child have difficulty distinguishing facts from fantasy?", "math_logic", FREQ_4_EN),
  // D. Emotional Regulation & Self-Control
  r("q16", "How often does the child show anxiety or frustration related to school tasks?", "emotional_regulation", FREQ_4_EN),
  r("q17", "How often does the child tire easily during academic work?", "emotional_regulation", FREQ_4_EN),
  r("q18", "How often does the child complain of physical discomfort (e.g., headaches, stomachaches) during school tasks?", "emotional_regulation", FREQ_4_EN),
  r("q19", "How often does the child express low self-confidence about learning (e.g., 'I'm not smart')?", "emotional_regulation", FREQ_4_EN),
  r("q20", "How often does the child resist authority (e.g., argue or refuse instructions)?", "emotional_regulation", FREQ_4_EN),
  // E. Listening & Language Processing
  r("q21", "How often does the child struggle to follow verbal instructions (especially without visuals)?", "listening_language", FREQ_4_EN),
  r("q22", "How often does the child have difficulty understanding speech in noisy environments?", "listening_language", FREQ_4_EN),
  r("q23", "How often does the child struggle to understand jokes or stories told aloud?", "listening_language", FREQ_4_EN),
  r("q24", "How often does the child have difficulty maintaining or following conversations?", "listening_language", FREQ_4_EN),
  r("q25", "How often does the child struggle with academic vocabulary (e.g., science or history terms)?", "listening_language", FREQ_4_EN),
  // F. Attention & Executive Function
  r("q26", "How often does the child have difficulty maintaining attention for more than 15 minutes?", "attention_ef", FREQ_4_EN),
  r("q27", "How often does the child take a long time to complete tasks?", "attention_ef", FREQ_4_EN),
  r("q28", "How often does the child have difficulty planning or organizing tasks?", "attention_ef", FREQ_4_EN),
  r("q29", "How often does the child frequently lose items or forget important things?", "attention_ef", FREQ_4_EN),
  r("q30", "How often does the child struggle to tolerate boredom or repetitive tasks?", "attention_ef", FREQ_4_EN),
];

// ─── DST — Dyslexia Screening Tool ───────────────────────────────────────────
export const DST_FORM: FormItem[] = [
  // Section A: Developmental Risk Screener (Yes=2, Sometimes=1, No=0, Unknown=0)
  r("q1",  "A1. Family history of reading or learning difficulties.", "developmental_risk", DST_A_EN),
  r("q2",  "A2. Delayed language development (e.g., late speech, persistent baby talk).", "developmental_risk", DST_A_EN),
  r("q3",  "A3. History of frequent ear infections (otitis media).", "developmental_risk", DST_A_EN),
  r("q4",  "A4. Difficulty with rhyming awareness in early childhood.", "developmental_risk", DST_A_EN),
  r("q5",  "A5. Confusion with directions (right/left, spatial orientation).", "developmental_risk", DST_A_EN),
  r("q6",  "A6. Difficulty learning letter names.", "developmental_risk", DST_A_EN),
  r("q7",  "A7. Difficulty producing letter sounds.", "developmental_risk", DST_A_EN),
  r("q8",  "A8. Difficulty decoding simple words.", "developmental_risk", DST_A_EN),
  r("q9",  "A9. Difficulty remembering sight words.", "developmental_risk", DST_A_EN),
  r("q10", "A10. Avoidance or dislike of reading.", "developmental_risk", DST_A_EN),
  // Section B: General Learning Characteristics (Absolutely=2, Somewhat=1, Rarely or Never=0)
  r("q11", "B1. Appears bright but underperforms in reading, writing, or spelling.", "learning", DST_BH_EN),
  r("q12", "B2. Misidentified as lazy, careless, or unmotivated.", "learning", DST_BH_EN),
  r("q13", "B3. Strong oral ability but weaker written performance.", "learning", DST_BH_EN),
  r("q14", "B4. Low self-esteem related to learning.", "learning", DST_BH_EN),
  r("q15", "B5. Easily frustrated with school tasks.", "learning", DST_BH_EN),
  { id: "q16", text: "B6. Talents (check all that apply):", textChinese: "B6. Talents (check all that apply):", textKorean: "B6. Talents (check all that apply):", type: "checkbox_multi", domain: "learning", options: ["Art", "Drama", "Music", "Sports", "Dance", "Mechanics", "Storytelling", "Business", "Strategy", "Design", "Building", "Engineering"], optionsChinese: ["Art", "Drama", "Music", "Sports", "Dance", "Mechanics", "Storytelling", "Business", "Strategy", "Design", "Building", "Engineering"], optionsKorean: ["Art", "Drama", "Music", "Sports", "Dance", "Mechanics", "Storytelling", "Business", "Strategy", "Design", "Building", "Engineering"] },
  r("q17", "B7. Frequent daydreaming or 'zoning out'.", "learning", DST_BH_EN),
  r("q18", "B8. Difficulty sustaining attention.", "learning", DST_BH_EN),
  r("q19", "B9. Learns best through hands-on or visual methods.", "learning", DST_BH_EN),
  // Section C: Vision, Reading, and Spelling
  r("q20", "C1. Physical discomfort when reading (headaches, dizziness).", "vision_reading", DST_BH_EN),
  r("q21", "C2. Confusion with letters, numbers, or sequences.", "vision_reading", DST_BH_EN),
  r("q22", "C3. Reading/writing errors (reversals, omissions, substitutions).", "vision_reading", DST_BH_EN),
  r("q23", "C4. Perception of movement while reading.", "vision_reading", DST_BH_EN),
  r("q24", "C5. Vision difficulties not explained by eye exams.", "vision_reading", DST_BH_EN),
  r("q25", "C6. Strong visual observation but weak spatial awareness.", "vision_reading", DST_BH_EN),
  r("q26", "C7. Poor reading comprehension despite repetition.", "vision_reading", DST_BH_EN),
  r("q27", "C8. Inconsistent or phonetic spelling.", "vision_reading", DST_BH_EN),
  // Section D: Hearing and Speech
  r("q28", "D1. Overly sensitive to sounds or easily distracted by them.", "hearing_speech", DST_BH_EN),
  r("q29", "D2. Difficulty expressing thoughts clearly.", "hearing_speech", DST_BH_EN),
  r("q30", "D3. Speech disruptions under stress (e.g., stuttering, mispronunciation).", "hearing_speech", DST_BH_EN),
  // Section E: Writing and Motor Skills
  r("q31", "E1. Difficulty with writing or copying.", "writing_motor", DST_BH_EN),
  r("q32", "E2. Poor or inconsistent handwriting.", "writing_motor", DST_BH_EN),
  r("q33", "E3. Clumsiness or coordination difficulties.", "writing_motor", DST_BH_EN),
  r("q34", "E4. Motion sickness.", "writing_motor", DST_BH_EN),
  r("q35", "E5. Mixed dominance (ambidexterity).", "writing_motor", DST_BH_EN),
  r("q36", "E6. Confusion with spatial directions.", "writing_motor", DST_BH_EN),
  // Section F: Math and Time Management
  r("q37", "F1. Difficulty telling or managing time.", "math_time", DST_BH_EN),
  r("q38", "F2. Relies on counting aids (e.g., fingers).", "math_time", DST_BH_EN),
  r("q39", "F3. Difficulty handling money or counting objects.", "math_time", DST_BH_EN),
  r("q40", "F4. Difficulty solving word problems.", "math_time", DST_BH_EN),
  // Section G: Memory and Cognition
  r("q41", "G1. Strong long-term memory (experiences, faces, places).", "memory_cognition", DST_BH_EN),
  r("q42", "G2. Weak memory for sequences or abstract information.", "memory_cognition", DST_BH_EN),
  r("q43", "G3. Thinks primarily in images rather than words.", "memory_cognition", DST_BH_EN),
  // Section H: Behavior, Health, and Development
  r("q44", "H1. Extremely disorganized or overly rigid in behavior.", "behavior_health", DST_BH_EN),
  r("q45", "H2. Behavioral extremes (class clown, withdrawn, etc.).", "behavior_health", DST_BH_EN),
  r("q46", "H3. Early or delayed developmental milestones.", "behavior_health", DST_BH_EN),
  r("q47", "H4. Sensitivities (food, chemicals, or environment).", "behavior_health", DST_BH_EN),
  r("q48", "H5. Sleep irregularities.", "behavior_health", DST_BH_EN),
  r("q49", "H6. Bedwetting beyond expected age.", "behavior_health", DST_BH_EN),
  r("q50", "H7. Unusual pain tolerance.", "behavior_health", DST_BH_EN),
  r("q51", "H8. Highly sensitive, perfectionistic, or strong sense of fairness.", "behavior_health", DST_BH_EN),
  r("q52", "H9. Performance worsens under stress or time pressure.", "behavior_health", DST_BH_EN),
  // Summary
  tx("q53", "Key observations / clinical notes:", "summary"),
  { id: "q54", text: "Recommended actions (check all that apply):", textChinese: "Recommended actions (check all that apply):", textKorean: "Recommended actions (check all that apply):", type: "checkbox_multi", domain: "summary", options: ["Monitor progress", "Provide targeted literacy intervention", "Refer for psychoeducational assessment", "Other"], optionsChinese: ["Monitor progress", "Provide targeted literacy intervention", "Refer for psychoeducational assessment", "Other"], optionsKorean: ["Monitor progress", "Provide targeted literacy intervention", "Refer for psychoeducational assessment", "Other"] },
];
