import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";

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
  }, []);

  useEffect(() => () => { cleanup(); }, [cleanup]);

  const startRecording = async () => {
    setError(null);
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Wake lock — keep screen on during recording
      if ("wakeLock" in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
        } catch {}
      }

      // Audio level analyser
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

      const mimeType = getBestMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const finalMime = mr.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
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
        setError("Microphone permission denied. Please allow access and try again.");
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

  const barCount = 20;
  const bars = Array.from({ length: barCount }, (_, i) => {
    const threshold = (i / barCount) * 100;
    return audioLevel > threshold;
  });

  return (
    <div className="space-y-3">
      {state === "recording" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-semibold text-red-700">Recording</span>
            </div>
            <span className="font-mono text-lg font-bold text-red-700 tabular-nums">
              {formatDuration(seconds)}
            </span>
          </div>

          {/* Audio level bars */}
          <div className="flex items-end gap-0.5 h-8">
            {bars.map((active, i) => (
              <div
                key={i}
                className={`flex-1 rounded-sm transition-all duration-75 ${
                  active ? "bg-red-500" : "bg-red-200"
                }`}
                style={{ height: active ? `${40 + Math.random() * 60}%` : "20%" }}
              />
            ))}
          </div>

          <Button
            onClick={stopRecording}
            className="w-full bg-red-600 hover:bg-red-700 text-white h-12 text-base font-semibold rounded-xl"
            size="lg"
          >
            <Square size={18} className="mr-2" />
            Stop & Process
          </Button>
        </div>
      )}

      {state === "stopping" && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
          <Loader2 size={16} className="animate-spin" />
          Stopping recording…
        </div>
      )}

      {state === "requesting" && (
        <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
          <Loader2 size={16} className="animate-spin" />
          Requesting microphone access…
        </div>
      )}

      {state === "idle" && (
        <Button
          onClick={startRecording}
          disabled={disabled}
          className="w-full h-12 text-base font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white"
          size="lg"
        >
          <Mic size={18} className="mr-2" />
          Start Recording
        </Button>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
