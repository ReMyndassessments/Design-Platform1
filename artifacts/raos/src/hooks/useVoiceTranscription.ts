import { useState, useRef, useCallback } from "react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

type TranscriptionState = "idle" | "recording" | "transcribing" | "done" | "error";

export interface UseVoiceTranscriptionResult {
  state: TranscriptionState;
  transcript: string;
  error: string;
  isRecording: boolean;
  isTranscribing: boolean;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useVoiceTranscription(sessionToken: string): UseVoiceTranscriptionResult {
  const [state, setState] = useState<TranscriptionState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const start = useCallback(async () => {
    setError("");
    setTranscript("");
    setState("recording");
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      setState("error");
      setError("Microphone access denied. Please allow the mic and try again.");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size < 1000) {
        setState("error");
        setError("Recording too short — please try again.");
        return;
      }

      setState("transcribing");
      try {
        const res = await fetch(`${BASE_URL}/api/public/rmra/student/${sessionToken}/transcribe`, {
          method: "POST",
          headers: { "Content-Type": mimeType },
          body: blob,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any).message || `Error ${res.status}`);
        }
        const { transcript: text } = await res.json() as { transcript: string };
        setTranscript(text);
        setState("done");
      } catch (err: any) {
        setState("error");
        setError(err.message || "Transcription failed — please type your answer instead.");
      }
    };

    recorder.start();
  }, [sessionToken]);

  const reset = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setState("idle");
    setTranscript("");
    setError("");
  }, []);

  return {
    state,
    transcript,
    error,
    isRecording: state === "recording",
    isTranscribing: state === "transcribing",
    start,
    stop,
    reset,
  };
}
