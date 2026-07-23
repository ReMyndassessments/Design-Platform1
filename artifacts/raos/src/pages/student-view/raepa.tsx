import { useState, useEffect } from "react";
import { useParams } from "wouter";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_MS = 3000;

type Stimulus = {
  text: string;
  images?: { label: string; dataUrl: string }[];
};

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-slate-400 text-lg">Session not found.</p>
      </div>
    );
  }

  if (!stimulus) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-500 animate-spin" />
        <p className="text-slate-400 text-xl font-light tracking-wide">Waiting for examiner…</p>
      </div>
    );
  }

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
