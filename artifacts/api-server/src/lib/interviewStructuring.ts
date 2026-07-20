import { callDeepSeek } from "./ai.js";

export type ConversationType =
  | "parent_intake"
  | "teacher_consultation"
  | "student_interview"
  | "classroom_observation"
  | "report_debrief";

export type InterviewNoteSection = {
  key: string;
  label: string;
  content: string;
};

export type StructuredInterviewNotes = {
  conversationType: ConversationType;
  sections: InterviewNoteSection[];
  rawTranscript: string;
  processedAt: string;
};

const INTERVIEW_SECTION_DEFS: Record<
  Exclude<ConversationType, "report_debrief">,
  { key: string; label: string }[]
> = {
  parent_intake: [
    { key: "presenting_concern", label: "Presenting Concern" },
    { key: "developmental_medical", label: "Developmental & Medical History" },
    { key: "educational_history", label: "Educational History & School Profile" },
    { key: "home_social_behaviour", label: "Home & Social Behaviour" },
    { key: "family_history", label: "Family Background & History" },
    { key: "parent_priorities", label: "Parent's Priorities & Questions" },
    { key: "notable_quotes", label: "Notable Quotes" },
    { key: "agreed_next_steps", label: "Agreed Next Steps" },
  ],
  teacher_consultation: [
    { key: "presenting_concern", label: "Presenting Concern" },
    { key: "classroom_observations", label: "Classroom Observations" },
    { key: "academic_social_profile", label: "Academic & Social Profile" },
    { key: "notable_quotes", label: "Notable Quotes" },
    { key: "recommended_followups", label: "Recommended Follow-ups" },
  ],
  student_interview: [
    { key: "presenting_concern", label: "Student's Presenting Concerns" },
    { key: "self_perception", label: "Self-Perception & Insight" },
    { key: "key_observations", label: "Behavioural Observations" },
    { key: "notable_quotes", label: "Notable Quotes" },
    { key: "recommended_followups", label: "Recommended Follow-ups" },
  ],
  classroom_observation: [
    { key: "context", label: "Observation Context" },
    { key: "behavioural_observations", label: "Behavioural Observations" },
    { key: "peer_interactions", label: "Peer & Teacher Interactions" },
    { key: "notable_incidents", label: "Notable Incidents / Quotes" },
    { key: "recommended_followups", label: "Recommended Follow-ups" },
  ],
};

const DEBRIEF_SECTION_DEFS: { key: string; label: string }[] = [
  { key: "findings_communicated", label: "Key Findings Communicated" },
  { key: "family_questions", label: "Family / Client Questions" },
  { key: "reactions_concerns", label: "Reactions & Concerns" },
  { key: "agreed_next_steps", label: "Agreed Next Steps" },
  { key: "followup_commitments", label: "Follow-up Commitments" },
];

function buildPrompt(
  conversationType: ConversationType,
  transcript: string,
  studentName: string
): string {
  const isDebrief = conversationType === "report_debrief";
  const sectionDefs = isDebrief
    ? DEBRIEF_SECTION_DEFS
    : INTERVIEW_SECTION_DEFS[conversationType] ?? INTERVIEW_SECTION_DEFS.parent_intake;

  const sectionsJson = JSON.stringify(
    Object.fromEntries(sectionDefs.map((s) => [s.key, ""]))
  );

  const contextLabel: Record<ConversationType, string> = {
    parent_intake: "a parent/guardian intake interview",
    teacher_consultation: "a teacher consultation",
    student_interview: "a student clinical interview",
    classroom_observation: "a classroom behavioural observation",
    report_debrief: "a psychoeducational assessment report debrief meeting",
  };

  const sectionDescriptions = sectionDefs
    .map((s) => `- "${s.key}": ${s.label}`)
    .join("\n");

  const typeGuidance: Partial<Record<ConversationType, string>> = {
    parent_intake: `Focus on:
- presenting_concern: Why the parent sought assessment now. What specific behaviours, struggles, or milestones prompted the referral. Duration and severity.
- developmental_medical: Pregnancy/birth history, developmental milestones (walking, talking, toilet training), medical diagnoses, medications, vision/hearing, sleep, appetite, hospitalisation history.
- educational_history: Current school, year level, subjects of strength and difficulty, teacher concerns, any prior assessments, tutoring, learning support, school refusal, attendance issues.
- home_social_behaviour: Behaviour at home, sibling/family relationships, friendships and peer relationships, extracurricular activities, technology use, emotional regulation, anxiety, mood.
- family_history: Family structure, any known learning difficulties, mental health conditions, or neurodevelopmental diagnoses in immediate or extended family.
- parent_priorities: What the parent most wants to understand or achieve from the assessment. Specific questions they want answered. Their hopes and concerns for the child.
- notable_quotes: Exact words the parent used that are clinically striking, emotionally significant, or diagnostic — quote verbatim in "quotation marks".
- agreed_next_steps: Any commitments, referrals, or next actions agreed during this conversation.`,
    teacher_consultation: `Focus on academic performance, classroom behaviour, peer dynamics, learning supports already in place, and teacher hypotheses about underlying causes.`,
    student_interview: `Focus on the student's own words, self-awareness, emotional state, how they describe their difficulties, and their insight into their own learning or social experience.`,
    classroom_observation: `Focus on objective behavioural observations, on-task vs off-task behaviour, peer and teacher interactions, triggers, and how the student responds to instruction and transitions.`,
    report_debrief: `Focus on what findings were communicated, how the family responded, questions they raised, any distress or resistance, and what was agreed as the plan going forward.`,
  };

  const guidance = typeGuidance[conversationType] ?? "";

  return `You are an expert psychoeducational clinician assistant. The following is a verbatim transcript of ${contextLabel[conversationType]} for a student named ${studentName || "the student"}.

Your task is to organise the clinically relevant content from this transcript into structured note sections. Be concise but complete. Preserve important details, direct quotes (in quotation marks), and clinical observations. Do not invent information not present in the transcript.

${guidance}

TRANSCRIPT:
---
${transcript}
---

Return a JSON object with EXACTLY these keys and no others:
${sectionDescriptions}

Rules:
- Each value is a string (plain text, use line breaks with \\n for multiple points)
- For "notable_quotes" or similar: extract verbatim quotes in "quotation marks", one per line
- If a section is not addressed in the transcript, write "Not discussed in this session."
- Do not wrap in markdown code blocks — return raw JSON only

JSON output:
${sectionsJson}`;
}

export async function structureInterviewNotes(params: {
  conversationType: ConversationType;
  transcript: string;
  studentName: string;
}): Promise<StructuredInterviewNotes> {
  const { conversationType, transcript, studentName } = params;
  const isDebrief = conversationType === "report_debrief";
  const sectionDefs = isDebrief
    ? DEBRIEF_SECTION_DEFS
    : INTERVIEW_SECTION_DEFS[conversationType] ?? INTERVIEW_SECTION_DEFS.parent_intake;

  const prompt = buildPrompt(conversationType, transcript, studentName);

  let parsed: Record<string, string> = {};
  try {
    const raw = await callDeepSeek(prompt, 2048);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    parsed = Object.fromEntries(
      sectionDefs.map((s) => [s.key, "AI structuring failed — please edit manually."])
    );
  }

  const sections: InterviewNoteSection[] = sectionDefs.map((s) => ({
    key: s.key,
    label: s.label,
    content: (parsed[s.key] ?? "").trim() || "Not discussed in this session.",
  }));

  return {
    conversationType,
    sections,
    rawTranscript: transcript,
    processedAt: new Date().toISOString(),
  };
}
