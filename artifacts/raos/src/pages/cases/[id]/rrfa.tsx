import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Save, Send, Sparkles, Printer, RefreshCw, Play, Square, RotateCcw, Eye } from "lucide-react";

interface RrfaAnswers {
  mode: string;
  passageType: "60-second" | "full-passage";
  wordsRead: number | null;
  errors: number | null;
  selfCorrections: number | null;
  hesitations: number | null;
  readingTimeSeconds: number | null;
  examinerRating: string;
  generalNotes: string;
}

function calcAge(dob: string) {
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

function riskLabel(level: string) {
  return level === "low" ? "Low Concern" : level === "mild" ? "Mild Concern" : level === "moderate" ? "Moderate Concern" : "Significant Concern";
}

function riskColor(level: string) {
  return level === "low" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
         level === "mild" ? "bg-amber-50 text-amber-700 border-amber-200" :
         level === "moderate" ? "bg-orange-50 text-orange-700 border-orange-200" :
         "bg-red-50 text-red-700 border-red-200";
}

function ratingToRisk(r: string) {
  if (r === "Fluent and Expressive") return "low";
  if (r === "Mildly Slow") return "mild";
  if (r === "Moderately Slow") return "moderate";
  if (r === "Significantly Slow") return "significant";
  return "";
}

const EXAMINER_RATINGS = ["Fluent and Expressive", "Mildly Slow", "Moderately Slow", "Significantly Slow"];

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function RrfaAdminPage() {
  const { id: caseId, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const { toast } = useToast();

  const [mode, setMode] = useState("In-Person");
  const [passageType, setPassageType] = useState<"60-second" | "full-passage">("60-second");
  const [wordsRead, setWordsRead] = useState<string>("");
  const [errors, setErrors] = useState<string>("");
  const [selfCorrections, setSelfCorrections] = useState<string>("");
  const [hesitations, setHesitations] = useState<string>("");
  const [readingTimeSeconds, setReadingTimeSeconds] = useState<number | null>(null);
  const [examinerRating, setExaminerRating] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (timerRunning) return;
    setTimerRunning(true);
    timerRef.current = setInterval(() => setTimerElapsed(e => e + 1), 1000);
  };
  const stopTimer = () => {
    if (!timerRunning) return;
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setReadingTimeSeconds(timerElapsed);
  };
  const resetTimer = () => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerElapsed(0);
    setReadingTimeSeconds(null);
  };
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rrfa", caseId, assignmentId],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rrfa`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  });

  useEffect(() => {
    if (!data || initialized) return;
    const source = data.existingAnswers ?? data.draft;
    if (source) {
      setMode(source.mode ?? "In-Person");
      setPassageType(source.passageType ?? "60-second");
      setWordsRead(source.wordsRead != null ? String(source.wordsRead) : "");
      setErrors(source.errors != null ? String(source.errors) : "");
      setSelfCorrections(source.selfCorrections != null ? String(source.selfCorrections) : "");
      setHesitations(source.hesitations != null ? String(source.hesitations) : "");
      setReadingTimeSeconds(source.readingTimeSeconds ?? null);
      if (source.readingTimeSeconds) setTimerElapsed(source.readingTimeSeconds);
      setExaminerRating(source.examinerRating ?? "");
      setGeneralNotes(source.generalNotes ?? "");
    }
    if (data.summary) setSummary(data.summary);
    setInitialized(true);
  }, [data, initialized]);

  const buildAnswers = useCallback((): RrfaAnswers => ({
    mode,
    passageType,
    wordsRead: wordsRead !== "" ? Number(wordsRead) : null,
    errors: errors !== "" ? Number(errors) : null,
    selfCorrections: selfCorrections !== "" ? Number(selfCorrections) : null,
    hesitations: hesitations !== "" ? Number(hesitations) : null,
    readingTimeSeconds,
    examinerRating,
    generalNotes,
  }), [mode, passageType, wordsRead, errors, selfCorrections, hesitations, readingTimeSeconds, examinerRating, generalNotes]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rrfa/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify(buildAnswers()),
      });
    } finally {
      setSaving(false);
    }
  }, [caseId, assignmentId, buildAnswers]);

  const isCompleted = data?.assignment?.status === "completed";

  useEffect(() => {
    if (!initialized || isCompleted) return;
    const t = setTimeout(() => saveDraft(), 2000);
    return () => clearTimeout(t);
  }, [mode, passageType, wordsRead, errors, selfCorrections, hesitations, readingTimeSeconds, examinerRating, generalNotes, initialized]);

  const handleSubmit = async () => {
    if (!examinerRating) {
      toast({ title: "Examiner rating required", description: "Please select an examiner rating before submitting.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rrfa/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify(buildAnswers()),
      });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: "RRFA submitted", description: "Assessment results have been saved." });
      window.location.reload();
    } catch (e) {
      toast({ title: "Submission failed", description: String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/response/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) throw new Error(await r.text());
      const { summary: s } = await r.json();
      setSummary(s);
      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      toast({ title: "Summary generated", description: "AI clinical summary is ready." });
    } catch {
      toast({ title: "Summary failed", description: "Could not generate summary.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // Computed
  const wr = wordsRead !== "" ? Number(wordsRead) : null;
  const er = errors !== "" ? Number(errors) : null;
  const wpm = wr != null && readingTimeSeconds != null && readingTimeSeconds > 0 ? Math.round((wr / readingTimeSeconds) * 60) : null;
  const acc = wr != null && er != null && wr > 0 ? Math.round(((wr - er) / wr) * 100) : null;
  const risk = ratingToRisk(examinerRating);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 text-sm">Failed to load RRFA session.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500">
              <ArrowLeft size={14} /> Back to Case
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-slate-800 truncate">ReMynd Reading Fluency Assessment (RRFA)</h1>
            {data?.case && (
              <p className="text-xs text-slate-500 truncate">
                {data.case.studentName}{data.case.dob ? ` · Age ${calcAge(data.case.dob)}` : ""} · Case {caseId.slice(0, 8)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <>
                {summary && (
                  <Button variant="ghost" size="sm" onClick={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="gap-1.5 text-violet-600 hover:text-violet-700 hidden sm:flex">
                    <Sparkles size={14} /> View Summary
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={isGenerating} className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50">
                  {isGenerating ? <><RefreshCw size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> {summary ? "Regenerate" : "Generate Summary"}</>}
                </Button>
                <Button size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer size={13} /> Print / Download PDF
                </Button>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 hidden sm:flex">
                  <CheckCircle2 size={12} /> Submitted
                </Badge>
              </>
            ) : (
              <>
                <span className="text-xs text-slate-400 hidden sm:block">
                  {saving ? <span className="flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> Saving…</span> : "Auto-saving"}
                </span>
                <Button variant="outline" size="sm" onClick={saveDraft} disabled={saving} className="gap-1.5">
                  <Save size={13} /> Save Draft
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                  {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Submit
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {isCompleted && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-800 text-sm">
            <CheckCircle2 size={16} />
            <span>This RRFA session has been submitted. Results are saved to the case profile.</span>
          </div>
        )}

        {isCompleted && summary && (
          <div ref={summaryRef} className="mb-6 bg-white border border-violet-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-violet-50 border-b border-violet-100">
              <Sparkles size={14} className="text-violet-600" />
              <span className="text-sm font-semibold text-violet-800">AI Clinical Summary</span>
              <span className="ml-auto text-[10px] text-violet-400 bg-violet-100 rounded-full px-2 py-0.5">AI-generated · Review before use</span>
            </div>
            <div className="p-5 prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed text-sm">{summary}</div>
          </div>
        )}

        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-900 text-xs">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>These assessments are non-diagnostic educational decision-support tools. Results should be interpreted alongside developmental history, academic achievement, classroom performance, and other assessment findings.</span>
        </div>

        {/* Mode & Passage Type */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5 grid sm:grid-cols-2 gap-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Administration Mode</h2>
            <div className="flex gap-3">
              {["In-Person", "Virtual"].map(m => (
                <button key={m} onClick={() => !isCompleted && setMode(m)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${mode === m ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"} ${isCompleted ? "opacity-60 cursor-default" : "cursor-pointer"}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Passage Type</h2>
            <div className="flex gap-3">
              {[["60-second", "60-Second Reading"], ["full-passage", "Full Passage Reading"]].map(([val, label]) => (
                <button key={val} onClick={() => !isCompleted && setPassageType(val as "60-second" | "full-passage")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${passageType === val ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"} ${isCompleted ? "opacity-60 cursor-default" : "cursor-pointer"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Reading Timer</h2>
          <div className="flex items-center gap-4">
            <div className={`font-mono text-4xl font-bold tabular-nums min-w-[6rem] ${timerRunning ? "text-violet-600" : "text-slate-800"}`}>
              {fmtTime(timerElapsed)}
            </div>
            {!isCompleted && (
              <div className="flex gap-2">
                {!timerRunning ? (
                  <Button size="sm" onClick={startTimer} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                    <Play size={13} /> Start
                  </Button>
                ) : (
                  <Button size="sm" onClick={stopTimer} className="gap-1.5 bg-red-600 hover:bg-red-700">
                    <Square size={13} /> Stop
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={resetTimer} disabled={timerRunning}>
                  <RotateCcw size={13} />
                </Button>
              </div>
            )}
            {readingTimeSeconds != null && (
              <span className="text-sm text-slate-500">Recorded: <strong>{readingTimeSeconds}s</strong></span>
            )}
          </div>
          {passageType === "60-second" && !isCompleted && (
            <p className="text-xs text-slate-400 mt-3">For 60-Second Reading, stop the student at exactly 60 seconds. Mark the last word read.</p>
          )}
        </div>

        {/* Metrics */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Reading Metrics</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Words Read", val: wordsRead, setter: setWordsRead },
              { label: "Errors", val: errors, setter: setErrors },
              { label: "Self-Corrections", val: selfCorrections, setter: setSelfCorrections },
              { label: "Hesitations", val: hesitations, setter: setHesitations },
            ].map(({ label, val, setter }) => (
              <div key={label}>
                <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                <Input
                  type="number"
                  min={0}
                  value={val}
                  onChange={e => !isCompleted && setter(e.target.value)}
                  disabled={isCompleted}
                  className="h-9 text-center font-mono text-base"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Reading Time (seconds) — auto-fills from timer</label>
            <Input
              type="number"
              min={0}
              value={readingTimeSeconds ?? ""}
              onChange={e => !isCompleted && setReadingTimeSeconds(e.target.value !== "" ? Number(e.target.value) : null)}
              disabled={isCompleted}
              className="h-9 w-40 font-mono"
            />
          </div>
        </div>

        {/* Examiner Rating */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Examiner Rating</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {EXAMINER_RATINGS.map(r => {
              const risk = ratingToRisk(r);
              const selected = examinerRating === r;
              return (
                <button key={r} onClick={() => !isCompleted && setExaminerRating(r)}
                  className={`p-3 rounded-lg text-sm font-medium border text-left transition-colors ${selected ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"} ${isCompleted ? "opacity-70 cursor-default" : "cursor-pointer"}`}>
                  {r}
                  {selected && risk && (
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-normal ${selected ? "bg-white/20 text-white" : ""}`}>
                      → {riskLabel(risk)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Calculated Results</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{wpm ?? "–"}</div>
              <div className="text-xs text-slate-500 mt-0.5">Words Per Minute</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{acc != null ? `${acc}%` : "–"}</div>
              <div className="text-xs text-slate-500 mt-0.5">Accuracy</div>
            </div>
            <div className={`rounded-lg p-3 text-center border ${risk ? riskColor(risk) : "bg-slate-50 text-slate-400 border-slate-200"}`}>
              <div className="text-sm font-bold">{risk ? riskLabel(risk) : "–"}</div>
              <div className="text-xs mt-0.5 opacity-70">Fluency Risk</div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Examiner Notes</h2>
          <Textarea
            value={generalNotes}
            onChange={e => !isCompleted && setGeneralNotes(e.target.value)}
            placeholder="Observations, behavioural notes, testing conditions…"
            disabled={isCompleted}
            className="min-h-[80px] text-sm"
          />
        </div>

        {!isCompleted && (
          <div className="flex justify-end gap-3 print:hidden">
            <Button variant="outline" onClick={saveDraft} disabled={saving} className="gap-1.5">
              <Save size={14} /> Save Draft
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Submit Assessment
            </Button>
          </div>
        )}

        {isCompleted && (
          <div className="flex justify-center print:hidden">
            <Link href={`/cases/${caseId}/literacy-dashboard`}>
              <Button variant="outline" className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50">
                <Eye size={14} /> View Literacy Dashboard
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
