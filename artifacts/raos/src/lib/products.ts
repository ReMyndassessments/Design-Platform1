export type AssessmentProduct = {
  id: string;
  name: string;
  market: "schools" | "parents" | "corporate" | "universities" | "specialized";
  toolIds: string[];
};

export const MARKET_LABELS: Record<AssessmentProduct["market"], string> = {
  schools: "Schools",
  parents: "Parents",
  corporate: "Corporate",
  universities: "Universities",
  specialized: "Specialized",
};

export const ASSESSMENT_PRODUCTS: AssessmentProduct[] = [
  // ── Schools ──────────────────────────────────────────────────────────
  {
    id: "comprehensive-psych-profile",
    name: "Comprehensive Psychoeducational Profile & Support Plan",
    market: "schools",
    toolIds: [
      "REFERRAL", "INTAKE", "CONSENT",
      "RCS-80", "BEHAVOBS",
      "BASC3-PRS-A", "BASC3-PRS-C", "BRIEF2-P", "SDQ-P", "SDQ-P11", "RCADS", "SCDQPF",
      "BASC3-TRS-A", "BASC3-TRS-C", "BRIEF2-T", "SDQ-T", "SDQ-T11", "BSPP",
      "BASC3-SRP-A", "BASC3-SRP-C", "BRIEF2-SR", "BYI2", "RSCA",
      "REFI", "RFII", "RSCP", "RARPS", "FASM",
    ],
  },
  {
    id: "school-snapshot",
    name: "School Wellbeing & Learning Snapshot",
    market: "schools",
    toolIds: ["RCS-80", "RASR", "RERMS", "RSSC", "RSCP", "SDQ-P", "SDQ-T", "SDQ-SR", "PSC"],
  },
  {
    id: "focused-support",
    name: "Focused Student Support Assessment",
    market: "schools",
    toolIds: ["RCS-80", "RCEP-CORE", "REFI", "RFII", "RARPS", "RSCP", "BASC3-TRS-A", "BASC3-PRS-A", "BASC3-TRS-C", "BASC3-PRS-C", "BRIEF2-P", "BRIEF2-T", "BRIEF2-SR"],
  },
  {
    id: "sen-learning-support",
    name: "Learning Support Decision System (SEN)",
    market: "schools",
    toolIds: ["RCS-80", "RCEP-CORE", "REFI", "RFII", "RARPS", "RASR", "SCAS", "RCADS", "BYI2", "RSCA", "EFA"],
  },
  {
    id: "boarding-wellbeing",
    name: "Boarding Student Adjustment & Wellbeing",
    market: "schools",
    toolIds: ["BSPP", "RERMS", "RSCP", "RFII", "WHO-5", "PSS-10", "SDQ-SR", "GAD-7"],
  },
  // ── Parents ───────────────────────────────────────────────────────────
  {
    id: "why-struggling",
    name: "Why Is My Child Struggling?",
    market: "parents",
    toolIds: ["RCS-80", "RASR", "RSCP", "RARPS", "RFII", "INTAKE", "RCADS", "BYI2"],
  },
  {
    id: "ef-coaching",
    name: "Executive Function Coaching Assessment",
    market: "parents",
    toolIds: ["REFI", "RASR", "BRIEF2-SR"],
  },
  {
    id: "emotional-wellbeing",
    name: "Emotional Wellbeing Check",
    market: "parents",
    toolIds: ["RERMS", "DASS-21", "GAD-7", "PHQ-9"],
  },
  {
    id: "school-readiness",
    name: "School Readiness / Transition Assessment",
    market: "parents",
    toolIds: ["RSSC", "RERMS", "REFI", "SDQ-SR", "WHO-5"],
  },
  // ── Corporate ─────────────────────────────────────────────────────────
  {
    id: "employee-wellbeing",
    name: "Employee Wellbeing & Burnout Screen",
    market: "corporate",
    toolIds: ["PSS-10", "DASS-21", "RSES", "GHQ-12"],
  },
  {
    id: "leadership-profiling",
    name: "Leadership / High-Performer Profiling",
    market: "corporate",
    toolIds: ["REFI", "RERMS", "RSES"],
  },
  {
    id: "graduate-readiness",
    name: "Graduate / Intern Readiness Assessment",
    market: "corporate",
    toolIds: ["REFI", "RSCA", "RSES", "GHQ-12"],
  },
  // ── Universities ──────────────────────────────────────────────────────
  {
    id: "intl-student",
    name: "International Student Adjustment Assessment",
    market: "universities",
    toolIds: ["RERMS", "PSS-10", "DASS-21", "RSCA", "WHO-5", "RSES"],
  },
  {
    id: "academic-risk",
    name: "Academic Risk Early Warning System",
    market: "universities",
    toolIds: ["RCS-80", "RCEP-CORE", "REFI", "RFII", "RARPS", "RERMS", "RASR"],
  },
  // ── Specialized ───────────────────────────────────────────────────────
  {
    id: "cdp",
    name: "ReMynd Child Development Profile (CDP)",
    market: "specialized",
    toolIds: ["CDP-CL", "CDP-SI", "CDP-SR", "CDP-CI"],
  },
  {
    id: "hidden-struggler",
    name: "Hidden Struggler Assessment",
    market: "specialized",
    toolIds: ["REFI", "RFII", "RSCA", "RERMS", "RCADS", "BYI2"],
  },
  {
    id: "underachievement",
    name: "Underachievement Profile",
    market: "specialized",
    toolIds: ["RCS-80", "RCEP-CORE", "RASR", "RARPS", "REFI", "RFII"],
  },
  {
    id: "digital-distraction",
    name: "Digital Distraction & Focus Assessment",
    market: "specialized",
    toolIds: ["RASR", "REFI", "BYI2"],
  },
];

export const ALL_PRODUCTS_BY_MARKET: { market: string; items: { id: string; name: string }[] }[] = [
  { market: "Schools", items: [
    { id: "comprehensive-psych-profile", name: "Comprehensive Psychoeducational Profile & Support Plan" },
    { id: "school-snapshot",    name: "School Wellbeing & Learning Snapshot" },
    { id: "focused-support",    name: "Focused Student Support Assessment" },
    { id: "sen-learning-support", name: "Learning Support Decision System (SEN)" },
    { id: "boarding-wellbeing", name: "Boarding Student Adjustment & Wellbeing" },
  ]},
  { market: "Parents", items: [
    { id: "why-struggling",     name: "Why Is My Child Struggling?" },
    { id: "ef-coaching",        name: "Executive Function Coaching Assessment" },
    { id: "emotional-wellbeing", name: "Emotional Wellbeing Check" },
    { id: "school-readiness",   name: "School Readiness / Transition Assessment" },
  ]},
  { market: "Corporate", items: [
    { id: "employee-wellbeing", name: "Employee Wellbeing & Burnout Screen" },
    { id: "leadership-profiling", name: "Leadership / High-Performer Profiling" },
    { id: "graduate-readiness", name: "Graduate / Intern Readiness Assessment" },
  ]},
  { market: "Universities", items: [
    { id: "intl-student",       name: "International Student Adjustment Assessment" },
    { id: "academic-risk",      name: "Academic Risk Early Warning System" },
  ]},
  { market: "Specialized", items: [
    { id: "cdp",                name: "ReMynd Child Development Profile (CDP)" },
    { id: "hidden-struggler",   name: "Hidden Struggler Assessment" },
    { id: "underachievement",   name: "Underachievement Profile" },
    { id: "digital-distraction", name: "Digital Distraction & Focus Assessment" },
  ]},
];
