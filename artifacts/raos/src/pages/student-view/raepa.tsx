import { useState, useEffect } from "react";
import { useParams } from "wouter";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_MS = 3000;

type Stimulus = {
  text: string;
  images?: { label: string; dataUrl: string }[];
};

function WaitingScreen() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const dots = ["", ".", "..", "..."][tick % 4];

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="white" className="w-4 h-4">
              <path d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 14a6 6 0 110-12 6 6 0 010 12z" opacity=".3"/>
              <circle cx="10" cy="10" r="3"/>
            </svg>
          </div>
          <span className="text-white font-semibold tracking-tight text-base">ReMynd</span>
          <span className="text-slate-500 text-sm">Assessment</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-teal-400">
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse inline-block" />
          Connected{dots}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 gap-12">

        {/* Animated waiting graphic */}
        <div className="relative flex items-center justify-center">
          {/* Outer rings */}
          <div className="absolute w-48 h-48 rounded-full border border-teal-900/60 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="absolute w-36 h-36 rounded-full border border-teal-800/50 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
          <div className="absolute w-24 h-24 rounded-full border border-teal-700/40 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1s]" />
          {/* Centre icon */}
          <div className="relative w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-9 h-9 text-teal-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-3 max-w-md">
          <h1 className="text-3xl font-light text-white tracking-tight">
            Please wait
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Your examiner will display content here<br />when the assessment begins.
          </p>
        </div>

        {/* What to expect cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-teal-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              ),
              title: "Images",
              desc: "Pictures may appear on this screen for you to describe or respond to.",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-teal-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
              ),
              title: "Text prompts",
              desc: "Reading passages or written prompts will appear here for you to respond to.",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-teal-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              ),
              title: "Speaking tasks",
              desc: "Your examiner may ask you to speak about what you see on this screen.",
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm font-medium text-slate-200">{title}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Instruction */}
        <p className="text-slate-600 text-sm text-center">
          Keep this screen visible. Do not navigate away.
        </p>
      </div>
    </div>
  );
}

export default function RaepaStudentView() {
  const { caseId } = useParams<{ caseId: string }>();
  const [stimulus, setStimulus] = useState<Stimulus | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const r = await fetch(`${BASE_URL}/api/public/raepa/student/${caseId}`);
        if (r.status === 404) { if (!cancelled) setNotFound(true); return; }
        if (!r.ok) return;
        const data = await r.json() as { stimulus: Stimulus | null };
        if (!cancelled) setStimulus(data.stimulus);
      } catch { /* network hiccup — keep polling */ }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [caseId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <p className="text-slate-500 text-lg">Session not found.</p>
      </div>
    );
  }

  if (!stimulus) return <WaitingScreen />;

  const hasImages = stimulus.images && stimulus.images.length > 0;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 py-12">
      {hasImages && (
        <div className="flex flex-wrap justify-center gap-10 mb-12">
          {stimulus.images!.map(img => (
            <div key={img.label} className="flex flex-col items-center gap-3">
              <img
                src={img.dataUrl}
                alt={img.label}
                className="max-h-64 max-w-xs object-contain rounded-xl shadow-md border border-slate-100"
              />
              <span className="text-base font-medium text-slate-500 tracking-wide">{img.label}</span>
            </div>
          ))}
        </div>
      )}
      <p className="text-2xl text-slate-800 font-medium text-center leading-relaxed max-w-2xl whitespace-pre-wrap">
        {stimulus.text}
      </p>
    </div>
  );
}
