import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, RefreshCw } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, durationSeconds: number, mimeType: string) => void;
  disabled?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getBestMimeType(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function AudioRecorder({ onRecordingComplete, disabled }: AudioRecorderProps) {
  const [state, setState] = useState<"idle" | "requesting" | "recording" | "stopping">("idle");
  const [seconds, setSeconds] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const durationRef = useRef(0);
  const abortedRef = useRef(false);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
  };

  const cleanup = useCallback(() => {
    stopTimer();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
    setAudioLevel(0);
    analyserRef.current = null;
  }, []);

  useEffect(() => () => { cleanup(); }, [cleanup]);

  const handleFatalError = useCallback((msg: string) => {
    abortedRef.current = true;
    cleanup();
    setState("idle");
    setSeconds(0);
    setError(msg);
  }, [cleanup]);

  const startRecording = async () => {
    setError(null);
    abortedRef.current = false;
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      if ("wakeLock" in navigator) {
        try { wakeLockRef.current = await (navigator as any).wakeLock.request("screen"); } catch {}
      }

      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const levelData = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(levelData);
        const avg = levelData.reduce((a, b) => a + b, 0) / levelData.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      animFrameRef.current = requestAnimationFrame(updateLevel);

      stream.getAudioTracks().forEach(track => {
        track.addEventListener("ended", () => {
          if (mediaRecorderRef.current?.state !== "inactive") {
            handleFatalError("Microphone disconnected. Please try again.");
          }
        });
      });

      const mimeType = getBestMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onerror = (e: Event) => {
        handleFatalError(`Recording failed: ${(e as any)?.error?.message ?? "unknown error"}. Please try again.`);
        try { mr.stop(); } catch {}
      };

      mr.onstop = () => {
        if (abortedRef.current) return;
        const finalMime = mr.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        if (blob.size < 512) {
          cleanup();
          setState("idle");
          setSeconds(0);
          setError("Recording too short or empty. Please try again.");
          return;
        }
        cleanup();
        setState("idle");
        setSeconds(0);
        onRecordingComplete(blob, durationRef.current, finalMime);
      };

      mr.start(1000);
      durationRef.current = 0;
      setSeconds(0);
      setState("recording");

      timerRef.current = setInterval(() => {
        durationRef.current += 1;
        setSeconds(s => s + 1);
      }, 1000);
    } catch (err: any) {
      cleanup();
      setState("idle");
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Microphone permission denied. Allow microphone access and try again.");
      } else if (err.name === "NotFoundError") {
        setError("No microphone found. Connect a microphone and try again.");
      } else if (err.name === "NotReadableError") {
        setError("Microphone in use by another app. Close other apps and try again.");
      } else {
        setError("Could not start recording: " + (err.message || err.name));
      }
    }
  };

  const stopRecording = () => {
    setState("stopping");
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const barCount = 24;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const threshold = (i / barCount) * 100;
    return audioLevel > threshold;
  });

  return (
    <div className="space-y-3">
      {state === "recording" && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-semibold text-red-700">Recording</span>
            </div>
            <span className="font-mono text-2xl font-bold text-red-700 tabular-nums">
              {formatDuration(seconds)}
            </span>
          </div>
          <div className="flex items-end gap-0.5 h-10">
            {bars.map((active, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-all duration-75 ${active ? "bg-red-500" : "bg-red-200"}`}
                style={{ height: active ? `${35 + Math.random() * 65}%` : "15%" }}
              />
            ))}
          </div>
          <button
            onClick={stopRecording}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white h-14 text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Square size={18} />
            Stop & Process
          </button>
        </div>
      )}

      {(state === "stopping" || state === "requesting") && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
          <Loader2 size={18} className="animate-spin" />
          {state === "requesting" ? "Requesting microphone…" : "Stopping recording…"}
        </div>
      )}

      {state === "idle" && (
        <button
          onClick={startRecording}
          disabled={disabled}
          className="w-full h-16 text-base font-semibold rounded-xl bg-primary hover:opacity-90 active:opacity-80 text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-40"
        >
          <Mic size={20} />
          Start Recording
        </button>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="flex-1">{error}</p>
          <button onClick={() => setError(null)} className="shrink-0 mt-0.5">
            <RefreshCw size={14} className="text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}
    </div>
  );
}
