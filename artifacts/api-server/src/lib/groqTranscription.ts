import { createReadStream } from "fs";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

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
