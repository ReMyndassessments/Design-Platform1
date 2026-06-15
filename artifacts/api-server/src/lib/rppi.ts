export const RPPI_FORM_ITEMS = [
  {
    id: "rppi_admin_hdr",
    type: "section_header",
    domain: "admin",
    text: "ReMynd Phonological Processing Index (RPPI)",
    textChinese: "",
    textKorean: "",
    note: "Examiner-administered assessment. Read each prompt aloud exactly as written. Record the student's verbal response and score each item before proceeding.",
    noteChinese: "",
    noteKorean: "",
    options: [],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
  {
    id: "rppi_mode",
    type: "rppi_admin",
    domain: "admin",
    text: "Administration Mode",
    textChinese: "",
    textKorean: "",
    note: "Select the mode used for this session",
    noteChinese: "",
    noteKorean: "",
    options: ["Virtual", "In-Person"],
    optionsChinese: [],
    optionsKorean: [],
    required: true,
  },
  // ── DOMAIN 1: Rhyming Awareness ──────────────────────────────────────────
  {
    id: "rppi_d1_hdr",
    type: "section_header",
    domain: "rhyming",
    text: "Domain 1: Rhyming Awareness",
    textChinese: "",
    textKorean: "",
    note: "Instructions: \"I am going to say some words. Tell me which word rhymes with the first word.\" | Practice item: CAT → Options: HAT / DOG / SUN → Expected: HAT",
    noteChinese: "",
    noteKorean: "",
    options: [],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
  { id: "rppi_d1_1",  type: "rppi_item", domain: "rhyming", text: "BALL — Which word rhymes: WALL, CAR, PEN?",     textChinese: "", textKorean: "", note: "Expected: WALL",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d1_2",  type: "rppi_item", domain: "rhyming", text: "TREE — Which word rhymes: BEE, BOOK, CAT?",     textChinese: "", textKorean: "", note: "Expected: BEE",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d1_3",  type: "rppi_item", domain: "rhyming", text: "CAKE — Which word rhymes: RAKE, DOG, SHOE?",    textChinese: "", textKorean: "", note: "Expected: RAKE",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d1_4",  type: "rppi_item", domain: "rhyming", text: "LIGHT — Which word rhymes: NIGHT, APPLE, RUN?", textChinese: "", textKorean: "", note: "Expected: NIGHT", noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d1_5",  type: "rppi_item", domain: "rhyming", text: "STAR — Which word rhymes: CAR, PEN, TREE?",     textChinese: "", textKorean: "", note: "Expected: CAR",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d1_6",  type: "rppi_item", domain: "rhyming", text: "BOAT — Which word rhymes: GOAT, SOCK, RED?",   textChinese: "", textKorean: "", note: "Expected: GOAT",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d1_7",  type: "rppi_item", domain: "rhyming", text: "FISH — Which word rhymes: DISH, CAT, JUMP?",   textChinese: "", textKorean: "", note: "Expected: DISH",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d1_8",  type: "rppi_item", domain: "rhyming", text: "MOON — Which word rhymes: SPOON, DOG, HAT?",   textChinese: "", textKorean: "", note: "Expected: SPOON", noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d1_9",  type: "rppi_item", domain: "rhyming", text: "HOUSE — Which word rhymes: MOUSE, TREE, RUN?", textChinese: "", textKorean: "", note: "Expected: MOUSE", noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d1_10", type: "rppi_item", domain: "rhyming", text: "TRAIN — Which word rhymes: RAIN, CUP, DOG?",   textChinese: "", textKorean: "", note: "Expected: RAIN",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  // ── DOMAIN 2: Phoneme Blending ───────────────────────────────────────────
  {
    id: "rppi_d2_hdr",
    type: "section_header",
    domain: "blending",
    text: "Domain 2: Phoneme Blending",
    textChinese: "",
    textKorean: "",
    note: "Instructions: \"Listen carefully. Put the sounds together and tell me the word.\" | Practice item: /k/ /a/ /t/ → Expected: CAT",
    noteChinese: "",
    noteKorean: "",
    options: [],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
  { id: "rppi_d2_1",  type: "rppi_item", domain: "blending", text: "/m/ /a/ /p/",           textChinese: "", textKorean: "", note: "Expected: MAP",    noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d2_2",  type: "rppi_item", domain: "blending", text: "/s/ /u/ /n/",           textChinese: "", textKorean: "", note: "Expected: SUN",    noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d2_3",  type: "rppi_item", domain: "blending", text: "/b/ /e/ /d/",           textChinese: "", textKorean: "", note: "Expected: BED",    noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d2_4",  type: "rppi_item", domain: "blending", text: "/f/ /i/ /sh/",          textChinese: "", textKorean: "", note: "Expected: FISH",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d2_5",  type: "rppi_item", domain: "blending", text: "/r/ /o/ /ck/",          textChinese: "", textKorean: "", note: "Expected: ROCK",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d2_6",  type: "rppi_item", domain: "blending", text: "/c/ /a/ /ke/",          textChinese: "", textKorean: "", note: "Expected: CAKE",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d2_7",  type: "rppi_item", domain: "blending", text: "/t/ /r/ /ee/",          textChinese: "", textKorean: "", note: "Expected: TREE",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d2_8",  type: "rppi_item", domain: "blending", text: "/p/ /l/ /a/ /n/",       textChinese: "", textKorean: "", note: "Expected: PLAN",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d2_9",  type: "rppi_item", domain: "blending", text: "/s/ /t/ /a/ /r/",       textChinese: "", textKorean: "", note: "Expected: STAR",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d2_10", type: "rppi_item", domain: "blending", text: "/b/ /r/ /i/ /dge/",     textChinese: "", textKorean: "", note: "Expected: BRIDGE", noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  // ── DOMAIN 3: Phoneme Segmentation ──────────────────────────────────────
  {
    id: "rppi_d3_hdr",
    type: "section_header",
    domain: "segmentation",
    text: "Domain 3: Phoneme Segmentation",
    textChinese: "",
    textKorean: "",
    note: "Instructions: \"Tell me all the sounds you hear in the word.\" | Practice item: CAT → Expected: /k/ /a/ /t/",
    noteChinese: "",
    noteKorean: "",
    options: [],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
  { id: "rppi_d3_1",  type: "rppi_item", domain: "segmentation", text: "DOG",    textChinese: "", textKorean: "", note: "Expected: /d/ /o/ /g/",        noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d3_2",  type: "rppi_item", domain: "segmentation", text: "SUN",    textChinese: "", textKorean: "", note: "Expected: /s/ /u/ /n/",         noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d3_3",  type: "rppi_item", domain: "segmentation", text: "FISH",   textChinese: "", textKorean: "", note: "Expected: /f/ /i/ /sh/",        noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d3_4",  type: "rppi_item", domain: "segmentation", text: "SHIP",   textChinese: "", textKorean: "", note: "Expected: /sh/ /i/ /p/",        noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d3_5",  type: "rppi_item", domain: "segmentation", text: "STAR",   textChinese: "", textKorean: "", note: "Expected: /s/ /t/ /a/ /r/",     noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d3_6",  type: "rppi_item", domain: "segmentation", text: "TRAIN",  textChinese: "", textKorean: "", note: "Expected: /t/ /r/ /ai/ /n/",    noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d3_7",  type: "rppi_item", domain: "segmentation", text: "JUMP",   textChinese: "", textKorean: "", note: "Expected: /j/ /u/ /m/ /p/",     noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d3_8",  type: "rppi_item", domain: "segmentation", text: "BRIDGE", textChinese: "", textKorean: "", note: "Expected: /b/ /r/ /i/ /dge/",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d3_9",  type: "rppi_item", domain: "segmentation", text: "PLANT",  textChinese: "", textKorean: "", note: "Expected: /p/ /l/ /a/ /n/ /t/", noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d3_10", type: "rppi_item", domain: "segmentation", text: "SCHOOL", textChinese: "", textKorean: "", note: "Expected: /s/ /k/ /oo/ /l/",    noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  // ── DOMAIN 4: Phoneme Deletion / Elision ────────────────────────────────
  {
    id: "rppi_d4_hdr",
    type: "section_header",
    domain: "deletion",
    text: "Domain 4: Phoneme Deletion / Elision",
    textChinese: "",
    textKorean: "",
    note: "Instructions: \"I will ask you to say a word, then say it again without one sound.\" | Practice item: Say CAT without /k/ → Expected: AT",
    noteChinese: "",
    noteKorean: "",
    options: [],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
  { id: "rppi_d4_1",  type: "rppi_item", domain: "deletion", text: "Say CAT without /k/",    textChinese: "", textKorean: "", note: "Expected: AT",    noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d4_2",  type: "rppi_item", domain: "deletion", text: "Say DOG without /d/",    textChinese: "", textKorean: "", note: "Expected: OG",    noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d4_3",  type: "rppi_item", domain: "deletion", text: "Say FISH without /f/",   textChinese: "", textKorean: "", note: "Expected: ISH",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d4_4",  type: "rppi_item", domain: "deletion", text: "Say SUN without /s/",    textChinese: "", textKorean: "", note: "Expected: UN",    noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d4_5",  type: "rppi_item", domain: "deletion", text: "Say SMILE without /s/",  textChinese: "", textKorean: "", note: "Expected: MILE",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d4_6",  type: "rppi_item", domain: "deletion", text: "Say TRAIN without /t/",  textChinese: "", textKorean: "", note: "Expected: RAIN",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d4_7",  type: "rppi_item", domain: "deletion", text: "Say PLANE without /p/",  textChinese: "", textKorean: "", note: "Expected: LANE",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d4_8",  type: "rppi_item", domain: "deletion", text: "Say SCHOOL without /s/", textChinese: "", textKorean: "", note: "Expected: COOL",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d4_9",  type: "rppi_item", domain: "deletion", text: "Say BRUSH without /b/",  textChinese: "", textKorean: "", note: "Expected: RUSH",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d4_10", type: "rppi_item", domain: "deletion", text: "Say FRIEND without /f/", textChinese: "", textKorean: "", note: "Expected: RIEND", noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  // ── DOMAIN 5: Phoneme Substitution ──────────────────────────────────────
  {
    id: "rppi_d5_hdr",
    type: "section_header",
    domain: "substitution",
    text: "Domain 5: Phoneme Substitution",
    textChinese: "",
    textKorean: "",
    note: "Instructions: \"I will ask you to change one sound in a word to make a new word.\" | Practice item: Say CAT, change /k/ to /h/ → Expected: HAT",
    noteChinese: "",
    noteKorean: "",
    options: [],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
  { id: "rppi_d5_1",  type: "rppi_item", domain: "substitution", text: "CAT: change /k/ to /h/",   textChinese: "", textKorean: "", note: "Expected: HAT",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d5_2",  type: "rppi_item", domain: "substitution", text: "DOG: change /d/ to /l/",   textChinese: "", textKorean: "", note: "Expected: LOG",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d5_3",  type: "rppi_item", domain: "substitution", text: "FISH: change /f/ to /d/",  textChinese: "", textKorean: "", note: "Expected: DISH",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d5_4",  type: "rppi_item", domain: "substitution", text: "SUN: change /s/ to /r/",   textChinese: "", textKorean: "", note: "Expected: RUN",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d5_5",  type: "rppi_item", domain: "substitution", text: "BAT: change /b/ to /m/",   textChinese: "", textKorean: "", note: "Expected: MAT",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d5_6",  type: "rppi_item", domain: "substitution", text: "CAR: change /k/ to /j/",   textChinese: "", textKorean: "", note: "Expected: JAR",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d5_7",  type: "rppi_item", domain: "substitution", text: "MAP: change /m/ to /t/",   textChinese: "", textKorean: "", note: "Expected: TAP",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d5_8",  type: "rppi_item", domain: "substitution", text: "FAN: change /f/ to /p/",   textChinese: "", textKorean: "", note: "Expected: PAN",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d5_9",  type: "rppi_item", domain: "substitution", text: "RAIN: change /r/ to /p/",  textChinese: "", textKorean: "", note: "Expected: PAIN",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d5_10", type: "rppi_item", domain: "substitution", text: "LIGHT: change /l/ to /n/", textChinese: "", textKorean: "", note: "Expected: NIGHT", noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  // ── DOMAIN 6: Nonword Repetition ─────────────────────────────────────────
  {
    id: "rppi_d6_hdr",
    type: "section_header",
    domain: "nonword",
    text: "Domain 6: Nonword Repetition",
    textChinese: "",
    textKorean: "",
    note: "Instructions: \"Listen carefully and repeat exactly what I say. These are made-up words.\" | Practice item: MIP",
    noteChinese: "",
    noteKorean: "",
    options: [],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
  { id: "rppi_d6_1",  type: "rppi_item", domain: "nonword", text: "MIP",       textChinese: "", textKorean: "", note: "Student repeats: MIP",       noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d6_2",  type: "rppi_item", domain: "nonword", text: "NAF",       textChinese: "", textKorean: "", note: "Student repeats: NAF",       noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d6_3",  type: "rppi_item", domain: "nonword", text: "TEB",       textChinese: "", textKorean: "", note: "Student repeats: TEB",       noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d6_4",  type: "rppi_item", domain: "nonword", text: "BLONTER",   textChinese: "", textKorean: "", note: "Student repeats: BLONTER",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d6_5",  type: "rppi_item", domain: "nonword", text: "STRAVIK",   textChinese: "", textKorean: "", note: "Student repeats: STRAVIK",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d6_6",  type: "rppi_item", domain: "nonword", text: "MOPINAR",   textChinese: "", textKorean: "", note: "Student repeats: MOPINAR",   noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d6_7",  type: "rppi_item", domain: "nonword", text: "GLASTERN",  textChinese: "", textKorean: "", note: "Student repeats: GLASTERN",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d6_8",  type: "rppi_item", domain: "nonword", text: "VONTERIP",  textChinese: "", textKorean: "", note: "Student repeats: VONTERIP",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d6_9",  type: "rppi_item", domain: "nonword", text: "BRALISKO",  textChinese: "", textKorean: "", note: "Student repeats: BRALISKO",  noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  { id: "rppi_d6_10", type: "rppi_item", domain: "nonword", text: "TRAVENICK", textChinese: "", textKorean: "", note: "Student repeats: TRAVENICK", noteChinese: "", noteKorean: "", options: [], optionsChinese: [], optionsKorean: [], required: false },
  // ── DOMAIN 7: Rapid Naming ───────────────────────────────────────────────
  {
    id: "rppi_d7_hdr",
    type: "section_header",
    domain: "rapid_naming",
    text: "Domain 7: Rapid Naming",
    textChinese: "",
    textKorean: "",
    note: "Record total time (seconds), errors, and self-corrections for each task. Select an overall examiner rating.",
    noteChinese: "",
    noteKorean: "",
    options: [],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
  {
    id: "rppi_d7_letters",
    type: "rapid_naming",
    domain: "rapid_naming",
    text: "Task A: Rapid Letter Naming",
    textChinese: "",
    textKorean: "",
    note: "Say: \"Name each letter as quickly and accurately as you can. Start here and go across each row.\" | Grid: A M T R S P N K D L (5 rows of 10)",
    noteChinese: "",
    noteKorean: "",
    options: ["A","M","T","R","S","P","N","K","D","L"],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
  {
    id: "rppi_d7_digits",
    type: "rapid_naming",
    domain: "rapid_naming",
    text: "Task B: Rapid Digit Naming",
    textChinese: "",
    textKorean: "",
    note: "Say: \"Name each number as quickly and accurately as you can. Start here and go across each row.\" | Grid: 2 7 4 8 3 5 9 1 (5 rows of 8 = 40 items)",
    noteChinese: "",
    noteKorean: "",
    options: ["2","7","4","8","3","5","9","1"],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
  // ── General notes ────────────────────────────────────────────────────────
  {
    id: "rppi_general_notes",
    type: "rppi_notes",
    domain: "admin",
    text: "General Examiner Notes",
    textChinese: "",
    textKorean: "",
    note: "Record any observations about the administration, student behaviour, or contextual factors that may have affected performance.",
    noteChinese: "",
    noteKorean: "",
    options: [],
    optionsChinese: [],
    optionsKorean: [],
    required: false,
  },
];

export const RPPI_SCORING_CONFIG = {
  max: 1,
  higherIsBetter: true,
  thresholds: { low: 50, mild: 70, moderate: 85 },
  domains: {
    rhyming: {
      label: "Rhyming Awareness",
      shortLabel: "Rhyming",
      narratives: {
        elevated: "Rhyming awareness is within the expected range. The student demonstrated adequate ability to identify rhyming word pairs.",
        moderate: "Mild concern in rhyming awareness. The student generally recognised rhyming patterns but made some errors that may warrant monitoring.",
        mild: "Moderate concern in rhyming awareness. The student showed inconsistency in recognising rhyming patterns, which may affect early literacy development.",
        low: "Significant concern in rhyming awareness. The student had considerable difficulty identifying rhyming word pairs, which may reflect underlying phonological processing weakness.",
      },
    },
    blending: {
      label: "Phoneme Blending",
      shortLabel: "Blending",
      narratives: {
        elevated: "Phoneme blending is within the expected range. The student demonstrated adequate ability to blend phoneme sequences into words.",
        moderate: "Mild concern in phoneme blending. Blending skills are emerging but some errors noted, particularly on longer sequences.",
        mild: "Moderate concern in phoneme blending. The student showed inconsistency blending sounds, particularly with longer or more complex words.",
        low: "Significant concern in phoneme blending. The student had difficulty blending individual sounds into words, which is a core skill for decoding and reading.",
      },
    },
    segmentation: {
      label: "Phoneme Segmentation",
      shortLabel: "Segmentation",
      narratives: {
        elevated: "Phoneme segmentation is within the expected range. The student demonstrated adequate ability to isolate individual sounds within words.",
        moderate: "Mild concern in phoneme segmentation. Segmentation skills are present but some errors noted with more complex word structures.",
        mild: "Moderate concern in phoneme segmentation. The student demonstrated inconsistency in sound isolation, particularly on multi-syllabic words.",
        low: "Significant concern in phoneme segmentation. The student had considerable difficulty isolating individual sounds within words, which is essential for spelling.",
      },
    },
    deletion: {
      label: "Phoneme Deletion",
      shortLabel: "Deletion",
      narratives: {
        elevated: "Phoneme deletion is within the expected range. The student demonstrated adequate ability to manipulate sounds by removing phonemes.",
        moderate: "Mild concern in phoneme deletion. Phoneme deletion is emerging with some errors noted on more complex items.",
        mild: "Moderate concern in phoneme deletion. The student showed inconsistency in removing phonemes, particularly from consonant clusters.",
        low: "Significant concern in phoneme deletion. The student had marked difficulty manipulating sounds by removing phonemes, reflecting deeper phonological processing challenges.",
      },
    },
    substitution: {
      label: "Phoneme Substitution",
      shortLabel: "Substitution",
      narratives: {
        elevated: "Phoneme substitution is within the expected range. The student demonstrated adequate ability to replace sounds within words.",
        moderate: "Mild concern in phoneme substitution. Substitution skills are present but errors noted, suggesting phonological awareness is still developing.",
        mild: "Moderate concern in phoneme substitution. The student showed inconsistency in sound replacement tasks, particularly on more complex items.",
        low: "Significant concern in phoneme substitution. The student had considerable difficulty replacing phonemes within words, which is a higher-order phonological skill.",
      },
    },
    nonword: {
      label: "Nonword Repetition",
      shortLabel: "Nonword",
      narratives: {
        elevated: "Phonological memory is within the expected range. The student demonstrated adequate ability to hold and repeat novel phonological sequences.",
        moderate: "Mild concern in phonological memory. Nonword repetition is emerging with some errors, particularly on multi-syllabic items.",
        mild: "Moderate concern in phonological memory. The student showed inconsistency in repeating nonwords, particularly longer items.",
        low: "Significant concern in phonological memory. The student had considerable difficulty repeating unfamiliar sound sequences, suggesting weakness in phonological short-term memory.",
      },
    },
    pa_composite: {
      label: "Phonological Awareness Composite",
      shortLabel: "PA Composite",
      narratives: {
        elevated: "Phonological awareness (composite) is within the expected range across rhyming, blending, segmentation, deletion, and substitution tasks.",
        moderate: "Mild concern across phonological awareness domains. Some inconsistency noted but overall phonological skills are emerging.",
        mild: "Moderate concern in phonological awareness. Results suggest emerging weakness in sound-level manipulation that may affect decoding and spelling.",
        low: "Significant concern in phonological awareness. Results suggest pervasive weakness in sound-level manipulation across multiple domains, which is associated with reading and spelling difficulty.",
      },
    },
  },
};

export type RppiItemAnswer = {
  response: string;
  score: number | null;
  excluded: boolean;
  notes: string;
};

export type RapidNamingData = {
  time: string;
  errors: string;
  corrections: string;
  rating: string;
  notes: string;
};

export type RppiAnswers = {
  mode: string;
  items: Record<string, RppiItemAnswer>;
  rapidNaming: {
    letters: RapidNamingData;
    digits: RapidNamingData;
  };
  generalNotes: string;
};

export const RPPI_SCORED_DOMAINS = ["rhyming", "blending", "segmentation", "deletion", "substitution", "nonword"] as const;

export function calculateRppiScores(answers: RppiAnswers, formItems: typeof RPPI_FORM_ITEMS) {
  const rppiItems = formItems.filter(i => i.type === "rppi_item");

  const domainScores: Record<string, number> = {};
  const normalizedScores: Record<string, number> = {};

  for (const domain of RPPI_SCORED_DOMAINS) {
    const items = rppiItems.filter(i => i.domain === domain);
    let total = 0;
    let administered = 0;
    for (const item of items) {
      const ans = answers.items[item.id];
      if (ans && !ans.excluded) {
        total += ans.score ?? 0;
        administered++;
      }
    }
    const rawScore = Math.round(total * 100) / 100;
    const maxAdm = administered > 0 ? administered : 10;
    domainScores[domain] = rawScore;
    normalizedScores[domain] = Math.round((rawScore / maxAdm) * 100);
  }

  const paTotal = (["rhyming", "blending", "segmentation", "deletion", "substitution"] as const)
    .reduce((s, d) => s + (domainScores[d] ?? 0), 0);
  const paMax = 50;
  domainScores["pa_composite"] = Math.round(paTotal * 100) / 100;
  normalizedScores["pa_composite"] = Math.round((paTotal / paMax) * 100);

  const getRisk = (pct: number): string => {
    if (pct >= 85) return "low";
    if (pct >= 70) return "mild";
    if (pct >= 50) return "moderate";
    return "significant";
  };

  const ratingToRisk = (rating: string): string => {
    if (rating === "Typical") return "low";
    if (rating === "Mild Concern") return "mild";
    if (rating === "Moderate Concern") return "moderate";
    if (rating === "Significant Concern") return "significant";
    return "low";
  };

  const paRisk = getRisk(normalizedScores["pa_composite"] ?? 0);
  const nonwordRisk = getRisk(normalizedScores["nonword"] ?? 0);
  const lettersRating = answers.rapidNaming?.letters?.rating ?? "";
  const digitsRating = answers.rapidNaming?.digits?.rating ?? "";
  const rapidRisk = ratingToRisk(
    [lettersRating, digitsRating].find(r => r !== "") ?? "Typical"
  );

  const riskOrder = (r: string) => ({ significant: 3, moderate: 2, mild: 1, low: 0 }[r] ?? 0);
  const risks = [paRisk, nonwordRisk, rapidRisk];
  const concernCount = risks.filter(r => r === "moderate" || r === "significant").length;

  let overallRisk: string;
  if (concernCount >= 2) {
    overallRisk = risks.reduce((worst, r) => riskOrder(r) > riskOrder(worst) ? r : worst, "low");
  } else if (concernCount === 1) {
    overallRisk = risks.reduce((worst, r) => riskOrder(r) > riskOrder(worst) ? r : worst, "low");
  } else {
    const maxRisk = risks.reduce((worst, r) => riskOrder(r) > riskOrder(worst) ? r : worst, "low");
    overallRisk = maxRisk;
  }

  const interpretations: string[] = [];
  if (paRisk === "moderate" || paRisk === "significant") {
    interpretations.push("Results suggest weakness in phonological awareness skills, especially sound-level manipulation. This may affect decoding, spelling, and reading fluency.");
  }
  if (nonwordRisk === "moderate" || nonwordRisk === "significant") {
    interpretations.push("Results suggest difficulty with phonological memory, which may affect the student's ability to hold and repeat unfamiliar sound patterns.");
  }
  if (rapidRisk === "moderate" || rapidRisk === "significant") {
    interpretations.push("Results suggest reduced rapid retrieval efficiency, which may affect reading fluency and automatic word recognition.");
  }
  if (concernCount >= 2) {
    interpretations.push("The overall profile indicates elevated dyslexia risk. Findings should be interpreted alongside academic achievement, classroom performance, developmental history, and other RAOS assessment results.");
  }

  const domainScoresForDb: Record<string, number> = {
    ...domainScores,
    rapid_letters_time: parseFloat(answers.rapidNaming?.letters?.time ?? "0") || 0,
    rapid_letters_errors: parseFloat(answers.rapidNaming?.letters?.errors ?? "0") || 0,
    rapid_digits_time: parseFloat(answers.rapidNaming?.digits?.time ?? "0") || 0,
    rapid_digits_errors: parseFloat(answers.rapidNaming?.digits?.errors ?? "0") || 0,
  };

  return {
    domainScores: domainScoresForDb,
    normalizedScores,
    rawScore: Math.round((paTotal / paMax) * 100) / 100,
    paRisk,
    nonwordRisk,
    rapidRisk,
    overallRisk,
    interpretationText: interpretations.join(" "),
  };
}
