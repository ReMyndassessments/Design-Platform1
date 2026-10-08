import { domain, LITERACY_METADATA, LITERACY_STRATEGIES, type LiteracyMetadata } from "./chineseLiteracy.js";

export const CHINESE_LITERACY_PARENT_KEY = "REMYND_CHINESE_LITERACY_PARENT_OBSERVATION";
export const PARENT_LITERACY_DOMAINS = [
  domain("R", "Reading", "core", `P-R1 — Understands similar Chinese content more successfully when someone reads it aloud than when reading it independently.
P-R2 — Has difficulty recognizing Chinese characters or words that they have learned or regularly encounter.
P-R3 — Has difficulty explaining the meaning of a Chinese sentence they have read independently.
P-R4 — Has difficulty explaining the main idea and important details in an appropriate Chinese passage.
P-R5 — Misreads familiar Chinese characters or words when reading aloud at home.
P-R6 — Frequently pauses or stops reading because characters or words are not recognized.
P-R7 — Has difficulty using punctuation or sentence boundaries to support phrasing and meaning when reading aloud.
P-R8 — Confuses familiar similar-sounding Chinese characters or words when reading, after considering the spoken variety used.
P-R9 — Has difficulty reading Chinese materials that have already been taught or practised.
P-R10 — Has difficulty finding reading-related mistakes in their work after being shown how to check.`),
  domain("D", "Dictation and transcription", "core", `P-D1 — Leaves out or incorrectly writes practised Chinese characters or words when they are spoken aloud during ordinary homework.
P-D2 — Makes character or word errors when copying Chinese text from a clear nearby model.
P-D3 — Needs substantial time to copy a short familiar Chinese text accurately.
P-D4 — Loses their place or leaves out parts when copying Chinese text from a screen, book, or another model.
P-D5 — Writes the same practised Chinese character or word differently across similar attempts.`),
  domain("W", "Written expression", "core", `P-W1 — Can say or explain a familiar Chinese word but has difficulty remembering its written characters.
P-W2 — Expresses ideas less fully in Chinese writing than when discussing a similar topic aloud.
P-W3 — Has difficulty using punctuation to make Chinese written meaning clear after it has been taught or practised.
P-W4 — Has difficulty putting familiar Chinese words or phrases together into a meaningful written sentence.
P-W5 — Has difficulty arranging ideas clearly in a Chinese written response.
P-W6 — Uses Chinese sentence structures that make the intended written meaning difficult to understand, after considering language exposure.
P-W7 — Leaves out, adds, or changes the order of Chinese characters or words in ways that change the intended written meaning.`),
  domain("CL", "Chinese literacy patterns", "core", `P-CL1 — Confuses familiar Chinese characters that contain similar-looking parts or arrangements.
P-CL2 — Leaves out, changes, or misplaces parts when writing familiar Chinese characters.
P-CL3 — Has difficulty using a taught meaning-related character part to help explain a character, when this strategy is familiar.
P-CL4 — Has difficulty using a taught sound-related character part as a pronunciation clue when the clue is useful.
P-CL5 — Has difficulty explaining familiar meaningful parts of a compound Chinese word after this has been taught or practised.
P-CL6 — Has difficulty using sentence meaning to distinguish familiar Chinese words that sound the same.
P-CL7 — Has difficulty using familiar word parts and context to suggest the meaning of a new compound Chinese word.
P-CL8 — Takes substantial time to recall the names of familiar Chinese characters or words during ordinary reading.
P-CL9 — Has difficulty recognizing the same learned Chinese characters in familiar print or digital fonts.
P-CL10 — Has difficulty grouping Chinese characters into meaningful words or phrases when reading a passage.
P-CL11 — Has difficulty remembering newly practised Chinese characters across later opportunities at home.
P-CL12 — Needs substantial help to use a practised Chinese character or word in a new sentence or piece of writing.`),
  domain("GP", "General performance", "contextual", `P-GP1 — Repeatedly erases or rewrites during Chinese homework because producing or checking the written response is difficult.
P-GP2 — Shows noticeably different performance across similar Chinese reading or writing activities at home.
P-GP3 — Can discuss a topic more successfully than show the same understanding in a written response at home.
P-GP4 — Has difficulty showing what they have practised when doing a similar written activity at home.
P-GP5 — Has difficulty recalling how to write practised Chinese characters or words when they are spoken aloud.
P-GP6 — Needs substantial time or effort to complete a familiar Chinese reading or writing activity at home.`),
  domain("CN", "Attention and task engagement", "contextual", `P-CN1 — Loses focus on a home learning activity when attention shifts to other things.
P-CN2 — Has difficulty staying engaged long enough to complete an accessible home learning activity.
P-CN3 — Loses recently presented information before using it, despite first showing understanding.`),
  domain("MM", "Memory for learning", "contextual", `P-MM1 — Has difficulty remembering recently practised information during home learning.
P-MM2 — Loses parts of an instruction with several steps after first showing that they understand it.
P-MM3 — Needs an understood home learning instruction or message repeated in order to remember it.
P-MM4 — Has difficulty recalling familiar names or vocabulary when needed.
P-MM5 — Has difficulty remembering a short meaningful spoken sequence after supported practice.
P-MM6 — Has difficulty remembering relevant homework deadlines or a familiar schedule without reminders.
P-MM7 — Has difficulty recalling previously learned information needed for a current home activity.`),
  domain("SQ", "Sequencing and organization", "contextual", `P-SQ1 — Has difficulty forming practised Chinese characters in a workable stroke sequence during handwriting.
P-SQ2 — Has difficulty organizing dates or deadlines in a familiar format that has been explained.
P-SQ3 — Has difficulty understanding time relationships such as before, after, earlier, or later during a relevant activity.
P-SQ4 — Has difficulty recounting events or following a familiar procedure in a coherent order.
P-SQ5 — Has difficulty estimating or planning the time needed for a home learning activity.`),
  domain("L", "Oral language", "contextual", `P-L1 — Needs additional time to understand and respond during conversation in a familiar home language.
P-L2 — Has difficulty giving a clear connected explanation in a familiar home language.
P-L3 — Has difficulty finding words that communicate the intended meaning in a familiar home language.
P-L4 — Produces speech that is difficult to understand after considering accent, dialect, language exposure, and context.`),
  domain("SA", "Learning experience and wellbeing", "contextual", `P-SA1 — Delays or avoids Chinese reading or writing activities that they appear to find difficult.
P-SA2 — Has difficulty participating comfortably in shared reading, writing, or homework activities at home.
P-SA3 — Says negative things about their ability to learn, read, or write.
P-SA4 — Becomes frustrated or stops participating when Chinese literacy difficulty occurs.
P-SA5 — Reports or shows physical discomfort around stressful home learning activities.`),
  domain("M", "Mathematics access", "optional", `P-M1 — Has difficulty choosing or using an effective method for a calculation that has been taught.
P-M2 — Has difficulty understanding the wording of a mathematics problem during homework.
P-M3 — Has difficulty explaining familiar taught number or place-value ideas.
P-M4 — Confuses the meaning or use of familiar mathematical symbols.
P-M5 — Has difficulty recalling practised arithmetic facts when an activity calls for them.`),
  domain("SP", "Spatial and visual task access", "optional", `P-SP1 — Has difficulty using directions such as left, right, above, or below in relevant home activities.
P-SP2 — Has difficulty keeping their place or locating information on an accessible page, screen, diagram, or workspace.`),
  domain("MC", "Motor access", "optional", `P-MC1 — Has difficulty controlling handwriting enough to complete an accessible written activity.
P-MC2 — Has difficulty coordinating movement during familiar everyday activities.
P-MC3 — Shows or reports tiredness or discomfort that limits participation in observed movement or hand-use activities.
P-MC4 — Has difficulty participating in familiar movement activities even when instructions and materials are suitable.
P-MC5 — Has difficulty handling objects needed for everyday activities.
P-MC6 — Has difficulty following a familiar movement sequence or a practised rhythmic pattern.
P-MC7 — Has difficulty managing learning materials or age-relevant everyday tasks because of movement or hand-use demands.`),
].map(d => ({ ...d, items: d.items.map(i => ({ ...i, translationKey: `chineseLiteracyParent.items.${i.id}` })) }));

export const PARENT_LITERACY_METADATA: LiteracyMetadata = {
  ...LITERACY_METADATA,
  key: CHINESE_LITERACY_PARENT_KEY,
  formName: "Parent Observation Form for Grades 3–12",
  respondent: "parent",
  setting: "Home observations",
  scoringVersion: "parent-descriptive-domain-v0.1.0",
  strategyVersion: "parent-home-support-v0.1.0",
  introduction: "This form helps you describe your child’s Chinese reading, writing, and learning experiences at home. One parent or caregiver can complete it from ordinary activities. You do not need to give a test, create difficult tasks, or ask your child to prove what they can do. Tell us what your child does well and what support helps. Use Not observed when you have not seen an activity or cannot reliably judge it.",
  limitation: "This developmental educational profile is not a validated dyslexia screener. It does not diagnose or rule out dyslexia or another condition. Parent responses describe the home setting and are reviewed separately from teacher responses.",
  reportLimitation: "This developmental parent observation profile describes Chinese literacy and learning experiences reported in the home setting. It supports educational planning. It does not establish or exclude dyslexia or another diagnosis, and its scores are not compared with population norms. Parent and teacher versions have not been established as equivalent measures.",
  anchors: [
    "1 Never or almost never — difficulty is absent or exceptional in relevant activities.",
    "2 Occasionally — appears on some occasions but is not a recurring pattern.",
    "3 Sometimes — recurs, although successful performance also occurs regularly.",
    "4 Often — occurs in many relevant opportunities.",
    "5 Almost always — occurs in nearly every relevant observed opportunity.",
    "NO Not observed — insufficient direct observations or unable to judge reliably.",
    "NA Not applicable — activity or skill not relevant; reason required.",
  ],
  domains: PARENT_LITERACY_DOMAINS,
  gradeExamples: {},
  strategies: LITERACY_STRATEGIES.map(s => ({ ...s, options: s.options.map(o => o.replace(/classroom/gi, "home learning").replace(/teacher/gi, "responsible adult")) })),
  guidance: [
    "Observe ordinary homework, shared reading and everyday writing. Do not administer dictation, timed reading, character-component tests or new practice activities solely to fill missing items.",
    "Rate direct home observations, not school marks, second-hand opinions or comparisons with siblings. Record school feedback separately with its source.",
    "Keep usual helpful supports in place and describe difficulty under that help.",
    "Limited parental Chinese literacy means Not observed, not Not applicable. Use NO when you cannot reliably judge characters, pronunciation, vocabulary or grammar.",
    "Finger counting, dialect or accent, code-switching, different stroke sequences and second-language learning are not themselves diagnoses.",
  ],
};
export const PARENT_LITERACY_FORM_ITEMS = PARENT_LITERACY_DOMAINS.flatMap(d => d.items.map(i => ({ ...i, domain: d.id, type: "likert" as const, required: true, options: PARENT_LITERACY_METADATA.anchors })));
