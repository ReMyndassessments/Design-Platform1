export interface ResourceContent {
  slug: string;
  label: string;
  section: string;
  body: string[];
  link?: { href: string; label: string };
}

export const RESOURCE_CONTENT: Record<string, ResourceContent> = {
  "orientation-guide": {
    slug: "orientation-guide",
    label: "Orientation Guide for Clinical Apprentices",
    section: "Getting Started",
    body: [
      "Welcome to the ReMynd Clinical Apprentice program. This guide covers what to expect during your training and how to navigate the RAOS platform.",
      "**What is RAOS?**\nRAOS (ReMynd Assessment Operating System) is the platform your mentors use to manage the full lifecycle of a psychoeducational assessment case — from referral through report delivery. As an apprentice, you use the same interface staff use, scoped to the cases assigned to you.",
      "**Your role**\nYou will be assigned specific cases by a mentor or program coordinator. Some cases are 'live' (a real student) and some are 'test/training' cases (no real student data). On live cases you have read-only access so you can observe how a real case is run. On test cases you have full edit access so you can practice hands-on without any risk.",
      "**Navigating RAOS**\n- Your dashboard (\"My Learning Cases\") lists every case a mentor has assigned to you.\n- The Cases link in the sidebar shows the same assigned cases in the full case list view.\n- Each case has phases: Pre-commitment, Assessment, Scoring, Report, Debrief, and Closed. Watch how a case moves through each phase.\n- If a mentor starts a live \"watch along\" session on a case you're viewing, you'll see a banner — you can follow their screen in real time.",
      "**Expectations**\n- Be an active observer: take notes on decisions your mentor makes and why.\n- Ask questions during check-ins rather than mid-session.\n- Complete the Confidentiality & Ethics Agreement before viewing any assigned case.\n- Track your progress on the My Competencies page as your mentor logs feedback.",
      "If anything is unclear, reach out to your mentor or program coordinator — see the Support section of this Training Resources page.",
    ],
  },
  "confidentiality-ethics-agreement": {
    slug: "confidentiality-ethics-agreement",
    label: "Confidentiality & Ethics Agreement",
    section: "Getting Started",
    body: [
      "This agreement outlines your obligations as a Clinical Apprentice with access to student assessment data. Read it carefully before viewing any assigned case.",
      "**1. Confidentiality**\nEverything you view in RAOS — student names, dates of birth, referral reasons, scores, working documents, and reports — is confidential. You must not share, discuss, screenshot, print, download, or forward any of this material outside your supervised training relationship with your mentor.",
      "**2. Scope of access**\nYou may only access cases explicitly assigned to you by a mentor or admin. Do not attempt to view, search for, or request access to cases outside your assignment list. Access is logged and audited.",
      "**3. Live vs. test cases**\n- Live cases involve a real student and family. You have read-only access: you may observe but must never edit case data, upload documents, or communicate with the family directly.\n- Test/training cases contain no real student data. You have full edit access here so you can practice the workflow (data entry, scoring review, report drafting) without any risk to a real family.",
      "**4. Professional conduct**\nTreat every case — live or test — as if it were a real clinical encounter. Use professional language in any notes you leave. Do not make independent clinical judgments; your role is to observe, learn, and practice under supervision.",
      "**5. Reporting concerns**\nIf you notice anything that looks like a safeguarding concern (e.g., disclosure of harm, risk indicators in a case), notify your mentor and a program admin immediately — see the Escalation Path resource.",
      "**6. Data retention**\nDo not copy or store any case information outside RAOS (no personal notes with identifying details, no exported files). Your competency notes and feedback stay within the platform.",
      "By continuing to use your apprentice account, you acknowledge that you have read and agree to these terms.",
    ],
  },
  "assessment-battery-overview": {
    slug: "assessment-battery-overview",
    label: "Assessment Battery Overview",
    section: "Clinical Reference",
    body: [
      "A \"battery\" is the set of assessment tools administered for a case. RAOS supports 94 assessment tools across cognitive, academic, behavioral, and social-emotional domains. This overview explains what each category measures and where it fits in the assessment phase.",
      "**Cognitive tools**\nMeasure general intellectual functioning — verbal reasoning, visual-spatial reasoning, working memory, and processing speed. These are typically administered first since they establish a baseline for interpreting other results.",
      "**Academic achievement tools**\nMeasure reading, writing, and math skills relative to grade-level expectations. Used to identify specific learning disabilities by comparing achievement to cognitive ability and age/grade peers.",
      "**Behavioral & social-emotional tools**\nRating scales (completed by parents, teachers, and sometimes the student) that screen for attention, mood, anxiety, social skills, and adaptive functioning. Multiple raters help identify whether a pattern shows up across settings (home vs. school) or is context-specific.",
      "**Batteries with many domains (e.g., BASC-3)**\nSome tools bundle dozens of subdomains into one rating scale. When reviewing results, focus on domains flagged as clinically significant or at-risk rather than trying to review every subdomain individually.",
      "**How it fits the assessment phase**\nDuring the Assessment phase of a case, the assigned psychometrician selects a battery based on the referral reason, administers it (often via the Bobby AI portal or in-person), and results flow into the Scoring phase for review. As an apprentice, you'll see which tools were selected and can review the rationale with your mentor.",
      "**Browsing the full tool library**\nThis page covers the categories conceptually. To see the actual 94 tools currently configured in RAOS (names, descriptions, domains, and respondent types), use the link below. It's a live, read-only view — apprentices cannot add, edit, or delete tools there.",
    ],
    link: { href: "/apprentice/tools", label: "Browse the Assessment Tools Library" },
  },
  "reading-domain-scores": {
    slug: "reading-domain-scores",
    label: "Reading & Interpreting Domain Scores",
    section: "Clinical Reference",
    body: [
      "This primer explains how to read the scoring summaries you'll see on assigned cases.",
      "**Score types you'll encounter**\n- Standard scores: normed to a mean of 100 and standard deviation of 15. A score of 100 is exactly average; 85-115 is the average range.\n- Percentile ranks: show what percentage of same-age peers scored at or below this result. A percentile of 50 means average.\n- T-scores (common on rating scales like BASC-3): normed to a mean of 50, standard deviation of 10. Scores above 60 are typically flagged \"at-risk,\" above 70 \"clinically significant.\"",
      "**Reading a domain summary**\nEach domain shows a score, a qualitative descriptor (e.g., \"Average,\" \"Below Average,\" \"At-Risk\"), and sometimes a confidence interval. Always look at the descriptor alongside the number — a single low score without corroborating evidence from other domains or raters is treated cautiously, not as a standalone diagnosis.",
      "**Cross-referencing multiple raters**\nWhen a behavioral scale has been completed by both a parent and a teacher, compare the two. Agreement across raters strengthens confidence in a finding; disagreement is itself clinically meaningful (e.g., a behavior may be situational).",
      "**Red flags vs. context**\nA single elevated domain isn't automatically a diagnosis. Your mentor will weigh domain scores against developmental history, referral reason, and classroom observations before drawing conclusions. Use this as a model for how quantitative and qualitative information are integrated in a real report.",
      "**Where you'll see this in RAOS**\nOpen the Scoring phase of any assigned case to see the domain-by-domain breakdown, including bar chart visualizations for batteries with many domains (only the most relevant domains are shown, to avoid overcrowding).",
    ],
  },
  "report-structure-walkthrough": {
    slug: "report-structure-walkthrough",
    label: "Report Structure Walkthrough",
    section: "Clinical Reference",
    body: [
      "Every psychoeducational report produced in RAOS follows a consistent structure. Understanding this structure will help you follow along on live cases and draft reports confidently on your test cases.",
      "**1. Background & Referral Information**\nWhy the assessment was requested, by whom, and relevant developmental, medical, and educational history. This section frames everything that follows.",
      "**2. Assessment Procedures**\nLists every tool administered (the battery), the dates, and who administered them. This is a factual record, not an interpretation.",
      "**3. Behavioral Observations**\nNotes on the student's presentation during testing — engagement, attention, mood, rapport. These observations help contextualize whether scores reflect true ability or situational factors (e.g., fatigue, anxiety).",
      "**4. Domain Analysis**\nThe core of the report. Each assessed domain (cognitive, academic, behavioral, social-emotional) is presented with scores and a written interpretation connecting the numbers to real-world functioning.",
      "**5. Summary & Diagnostic Impressions**\nSynthesizes the domain analysis into an overall clinical picture, including any diagnostic conclusions supported by the data.",
      "**6. Recommendations**\nConcrete, actionable next steps for the school and family — accommodations, interventions, referrals to other specialists, or follow-up timelines.",
      "**Approval workflow**\nA report moves from draft to admin-approved to psychologist-approved before it's released to a family. On a test case, you can practice drafting each section; on a live case, watch how your mentor edits and approves each stage in the Report tab.",
    ],
  },
  "observing-parent-consultation": {
    slug: "observing-parent-consultation",
    label: "Observing a Parent Consultation",
    section: "Practice Guides",
    body: [
      "A parent consultation typically happens early in a case, often during the Pre-commitment or early Assessment phase. This guide walks through what to pay attention to when you observe one (in person, via watch-along, or in meeting notes).",
      "**Purpose of the consultation**\nTo gather developmental history, understand the family's primary concerns, and set expectations for the assessment process — what will happen, how long it takes, and what a report will look like.",
      "**What good rapport-building looks like**\nNotice how the clinician opens the conversation: normalizing the process, acknowledging any anxiety the parent may have, and using plain language instead of clinical jargon.",
      "**Information gathering technique**\nListen for open-ended questions (\"Tell me about a typical day at school for your child\") rather than yes/no questions. Good clinicians let the parent's narrative surface details that a checklist might miss.",
      "**Setting expectations**\nA clinician should clearly explain: what tools will be used and why, the estimated timeline, who will be involved (teachers, other specialists), and how results will be shared.",
      "**What to record afterward**\nIf you're permitted to take structured notes (per your mentor's instruction), summarize: presenting concerns, relevant history mentioned, and any specific questions the family wants answered by the assessment. This becomes part of the case's referral reason and background section in the eventual report.",
      "**Practicing on your test case**\nOn your assigned test case, try drafting a mock referral reason and background section as if you had just observed this consultation — then compare it with your mentor's feedback.",
    ],
  },
  "debrief-meeting-best-practices": {
    slug: "debrief-meeting-best-practices",
    label: "Debrief Meeting Best Practices",
    section: "Practice Guides",
    body: [
      "The debrief meeting is where the assessment results are shared with the family, usually after the report has been approved. This is one of the most sensitive interactions in the assessment lifecycle.",
      "**Structure of a good debrief**\n1. Reconnect briefly on the original concerns that prompted the assessment.\n2. Walk through findings domain by domain, starting with strengths before areas of concern.\n3. Explain any diagnostic conclusions in plain language, avoiding unexplained jargon.\n4. Present recommendations clearly, with a sense of what's actionable now vs. longer-term.\n5. Leave space for questions and, if needed, follow-up.",
      "**Delivering difficult news with care**\nWhen findings identify a disability or significant concern, effective clinicians pause, check in with how the family is receiving the information, and avoid overwhelming them with all details in the first few minutes. Watch for how your mentor paces this.",
      "**Leading with strengths**\nEven in cases with significant findings, a well-run debrief always identifies genuine strengths first. This isn't just tone management — it gives the family a fuller, more accurate picture of their child.",
      "**Handling parent reactions**\nParents may respond with relief, grief, denial, or frustration. Good practice is to acknowledge the emotion without rushing past it (\"That sounds like a lot to take in\") before continuing.",
      "**Closing the meeting**\nEnd with concrete next steps: who will implement recommendations (school, outside providers), how progress will be monitored, and how the family can reach out with follow-up questions.",
      "**As an apprentice**\nOn live cases, you observe debrief meetings read-only via watch-along — never speak or intervene. On your test case, you can practice writing a debrief talking-point outline from a mock report and get feedback from your mentor.",
    ],
  },
  "contact-your-mentor": {
    slug: "contact-your-mentor",
    label: "Contact Your Mentor",
    section: "Support",
    body: [
      "Your mentor is your primary point of contact for questions about any case assigned to you, feedback on your practice work, and general program guidance.",
      "**How to reach your mentor**\nUse the contact details your program coordinator shared with you during onboarding. If you don't have them, ask your coordinator directly — do not attempt to contact a case's family or school staff yourself.",
      "**What to bring to a check-in**\n- Specific questions tied to a case phase (e.g., \"Why was this particular tool chosen over an alternative?\")\n- Notes from anything you observed that you want clarified.\n- Progress or blockers on your assigned test case.",
      "**Response times**\nMentors are practicing clinicians with their own caseloads — allow reasonable time for a response, and flag anything urgent (see Escalation Path) rather than waiting for a routine check-in.",
      "**Competency feedback**\nYour mentor periodically logs feedback and competency ratings visible on your My Competencies page. Use check-ins to discuss that feedback and set goals for the next case.",
    ],
  },
  "escalation-path": {
    slug: "escalation-path",
    label: "Escalation Path",
    section: "Support",
    body: [
      "If you observe something during your training that raises a safeguarding concern, follow this escalation path immediately — do not wait for a scheduled check-in.",
      "**What counts as a safeguarding concern**\nDisclosures or indicators of abuse, neglect, self-harm risk, harm to others, or any situation where a student's immediate safety may be at risk.",
      "**Step 1: Notify your mentor immediately**\nContact your assigned mentor as soon as possible using the fastest channel available. Clearly state what you observed, when, and on which case.",
      "**Step 2: Notify a program admin**\nIf your mentor is unavailable or the concern is urgent, escalate directly to a program admin via the Team page contacts or your coordinator's emergency contact.",
      "**Step 3: Do not act independently**\nAs an apprentice, you are not authorized to contact the family, school, or authorities directly. Your role is to escalate promptly and accurately — a mentor or admin will determine and take the appropriate next step.",
      "**Step 4: Document factually**\nIf asked to provide a written account, stick to what you directly observed or heard, without interpretation or speculation.",
      "**Why this matters**\nEven though most of what you'll observe as an apprentice is routine, a fast and correct escalation in the rare case that matters can make a real difference for a student's safety.",
    ],
  },
};
