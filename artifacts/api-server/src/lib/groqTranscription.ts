import { createReadStream } from "fs";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Transcribe an audio buffer using Groq's Whisper API.
 * Writes a temp file, submits multipart form to Groq, deletes temp file.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = "audio/webm"
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const ext = mimeType.includes("mp4") ? "mp4"
    : mimeType.includes("ogg") ? "ogg"
    : mimeType.includes("wav") ? "wav"
    : mimeType.includes("mp3") ? "mp3"
    : "webm";

  const tmpPath = join(tmpdir(), `raos-recording-${randomUUID()}.${ext}`);
  try {
    await writeFile(tmpPath, audioBuffer);

    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: mimeType });
    formData.append("file", blob, `recording.${ext}`);
    formData.append("model", "whisper-large-v3");
    formData.append("response_format", "text");

    const response = await fetch(GROQ_WHISPER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq Whisper error: ${response.status} — ${text}`);
    }

    const transcript = await response.text();
    return transcript.trim();
  } finally {
    unlink(tmpPath).catch(() => {});
  }
}

export type SpeakerTurn = { speaker: "Examiner" | "Student"; text: string };

/**
 * Use Groq LLM to split a flat Whisper transcript into labelled Examiner / Student turns.
 * The interview question is used as context so the model can anchor who said what.
 */
export async function separateSpeakers(
  transcript: string,
  interviewQuestion: string
): Promise<SpeakerTurn[]> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

  const systemPrompt = `You are an assistant helping to analyse a recorded maths interview between an examiner and a shy student.
The examiner asked the student this interview question:
"${interviewQuestion}"

Below is a verbatim transcript of the conversation that followed. The student is shy and required intermittent prompting from the examiner throughout.

Your task: split the transcript into turns, labelling each turn as either "Examiner" or "Student".
Rules:
- Short encouraging phrases ("Mm-hmm", "Good", "Can you tell me more?", "Take your time", "That's okay") are always the Examiner.
- Answers, explanations, or attempts to explain maths reasoning are always the Student.
- If a turn is ambiguous, assign it to the most likely speaker given the context.
- Return ONLY a JSON array, no other text. Format: [{"speaker":"Examiner","text":"..."},{"speaker":"Student","text":"..."}]`;

  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `TRANSCRIPT:\n${transcript}` },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq chat error: ${response.status} — ${text}`);
  }

  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = data.choices[0]?.message?.content?.trim() ?? "[]";

  // Extract JSON array even if the model adds surrounding text
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return [{ speaker: "Student", text: transcript }];

  try {
    return JSON.parse(match[0]) as SpeakerTurn[];
  } catch {
    return [{ speaker: "Student", text: transcript }];
  }
}
