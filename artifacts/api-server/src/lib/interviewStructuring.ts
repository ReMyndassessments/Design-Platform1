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
    { key: "background_history", label: "Background & History" },
    { key: "key_observations", label: "Key Observations" },
    { key: "notable_quotes", label: "Notable Quotes" },
    { key: "recommended_followups", label: "Recommended Follow-ups" },
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

  return `You are an expert psychoeducational clinician assistant. The following is a verbatim transcript of ${contextLabel[conversationType]} for a student named ${studentName || "the student"}.

Your task is to organise the clinically relevant content from this transcript into structured note sections. Be concise but complete. Preserve important details, direct quotes (in quotation marks), and clinical observations. Do not invent information not present in the transcript.

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
