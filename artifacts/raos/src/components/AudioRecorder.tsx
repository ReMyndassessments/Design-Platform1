import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
  // Guard against calling onstop after an error-triggered abort
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

      // Detect if the audio track is killed mid-recording (e.g. Bluetooth disconnects)
      stream.getAudioTracks().forEach(track => {
        track.addEventListener("ended", () => {
          if (mediaRecorderRef.current?.state !== "inactive") {
            handleFatalError("Microphone disconnected during recording. Please check your audio device and try again.");
          }
        });
      });

      const mimeType = getBestMimeType();
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      // Handle MediaRecorder-level errors (e.g. hardware failure mid-recording)
      mr.onerror = (e: Event) => {
        const msg = (e as any)?.error?.message ?? "Recording error";
        handleFatalError(`Recording failed: ${msg}. Please try again.`);
        // Try to stop cleanly even after error
        try { mr.stop(); } catch {}
      };

      mr.onstop = () => {
        if (abortedRef.current) return; // error already handled
        const finalMime = mr.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });

        // Reject suspiciously small blobs — likely empty/corrupt audio
        if (blob.size < 512) {
          cleanup();
          setState("idle");
          setSeconds(0);
          setError("Recording was too short or contained no audio. Please try again.");
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
        setError("Microphone permission denied. Please allow microphone access in your browser settings and try again.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("No microphone found. Please connect a microphone and try again.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setError("Microphone is in use by another app. Please close other apps and try again.");
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
            className="w-full bg-red-600 hover:bg-red-700 text-white h-11 text-sm font-semibold rounded-xl sm:h-12 sm:text-base"
          >
            <Square size={16} className="mr-2 shrink-0" />
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
          className="w-full h-11 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-white sm:h-12 sm:text-base"
        >
          <Mic size={16} className="mr-2 shrink-0" />
          Start Recording
        </Button>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <RefreshCw size={12} className="text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}
    </div>
  );
}
