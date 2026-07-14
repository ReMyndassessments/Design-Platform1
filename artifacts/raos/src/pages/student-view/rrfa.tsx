import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Loader2, BookOpen, Clock } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const COUNTDOWN_SECONDS = 60;

export default function RrfaStudentView() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["rrfa-student-view", token],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/public/rrfa-passage/${token}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{
        passage: string;
        passageTopic: string;
        passageWordCount: number;
        passageType: "60-second" | "full-passage";
      }>;
    },
    retry: false,
  });

  const is60 = data?.passageType === "60-second";

  const [started, setStarted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [timeUp, setTimeUp] = useState(false);
  const [finishedEarly, setFinishedEarly] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const beginCountdown = () => {
    setStarted(true);
    countdownRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(countdownRef.current!);
          setTimeUp(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (!is60 || started || !token) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/public/rrfa-status/${token}`);
        if (!r.ok) return;
        const { studentStarted } = await r.json() as { studentStarted: boolean };
        if (studentStarted) {
          clearInterval(pollRef.current!);
          beginCountdown();
        }
      } catch {
        // keep polling
      }
    }, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [is60, started, token]);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-300" size={36} />
      </div>
    );
  }

  if (error || !data?.passage) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-400 text-sm">
        This reading passage could not be found or has not been generated yet.
      </div>
    );
  }

  const passageReady = !is60 || (started && !timeUp && !finishedEarly);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-passage { font-size: 16pt !important; line-height: 2 !important; color: #000 !important; font-family: Georgia, serif !important; max-width: 100% !important; }
          .print-header-label { font-size: 10pt !important; color: #475569 !important; text-transform: uppercase !important; letter-spacing: 0.08em !important; font-weight: 600 !important; }
          .print-meta { font-size: 9pt !important; color: #94a3b8 !important; }
        }
      `}</style>

      <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
        <BookOpen size={16} className="text-slate-400 no-print" />
        <span className="text-sm font-semibold text-slate-500 tracking-wide uppercase print-header-label">
          ReMynd Reading Fluency Assessment
        </span>
        {is60 && started && !timeUp && !finishedEarly && (
          <div className={`ml-auto flex items-center gap-2 text-sm font-mono font-bold tabular-nums px-3 py-1 rounded-full no-print ${secondsLeft <= 10 ? "bg-red-50 text-red-600" : secondsLeft <= 20 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"}`}>
            <Clock size={13} />
            {secondsLeft}s
          </div>
        )}
        {(!is60 || (!started && !timeUp && !finishedEarly)) && (
          <span className="ml-auto text-xs text-slate-400 no-print">
            {is60 ? "Waiting for your examiner to start…" : "Read the passage aloud. Take your time."}
          </span>
        )}
        {passageReady && (
          <button
            onClick={() => window.print()}
            className="no-print ml-auto flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 rounded-lg px-4 py-2 transition-colors"
          >
            🖨️ Print
          </button>
        )}
      </div>

      <div className="flex-1 flex justify-center px-6 py-10">
        <div className="w-full max-w-2xl">

          {is60 && !started && !timeUp && (
            <div className="flex flex-col items-center gap-4 py-16 text-center no-print">
              <Loader2 size={28} className="animate-spin text-slate-300" />
              <p className="text-sm text-slate-400">Your examiner will start your timer shortly.<br />Get ready to read when the passage appears.</p>
            </div>
          )}

          {is60 && timeUp && (
            <div className="flex flex-col items-center gap-3 py-16 text-center no-print">
              <div className="text-5xl mb-2">⏱️</div>
              <p className="text-lg font-semibold text-slate-800">Time's up!</p>
              <p className="text-sm text-slate-500">Well done. Please wait for your examiner.</p>
            </div>
          )}

          {is60 && finishedEarly && !timeUp && (
            <div className="flex flex-col items-center gap-3 py-16 text-center no-print">
              <div className="text-5xl mb-2">✅</div>
              <p className="text-lg font-semibold text-slate-800">Well done!</p>
              <p className="text-sm text-slate-500">Please wait for your examiner.</p>
            </div>
          )}

          {passageReady && (
            <p className="text-lg leading-8 text-slate-800 whitespace-pre-wrap font-serif print-passage">
              {data.passage}
            </p>
          )}

          {is60 && started && !timeUp && !finishedEarly && (
            <div className="mt-10 flex justify-center no-print">
              <button
                onClick={() => setFinishedEarly(true)}
                className="text-sm text-slate-400 hover:text-slate-600 border border-slate-200 hover:border-slate-300 rounded-xl px-6 py-3 transition-colors"
              >
                I've finished reading
              </button>
            </div>
          )}

          {!is60 && (
            <p className="mt-10 text-center text-sm text-slate-400 no-print">
              Please wait for your examiner.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
