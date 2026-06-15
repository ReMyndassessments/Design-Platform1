import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Save, Send, Sparkles, Printer, RefreshCw, Eye, EyeOff, Monitor, Share2, Copy, Mail, MessageCircle, X } from "lucide-react";

const RDA_ITEMS = [
  { id: "rda_1",  word: "mip" },
  { id: "rda_2",  word: "tave" },
  { id: "rda_3",  word: "blon" },
  { id: "rda_4",  word: "strav" },
  { id: "rda_5",  word: "nake" },
  { id: "rda_6",  word: "fim" },
  { id: "rda_7",  word: "lape" },
  { id: "rda_8",  word: "plinder" },
  { id: "rda_9",  word: "glost" },
  { id: "rda_10", word: "drant" },
  { id: "rda_11", word: "skeep" },
  { id: "rda_12", word: "brinter" },
  { id: "rda_13", word: "chab" },
  { id: "rda_14", word: "flape" },
  { id: "rda_15", word: "snorp" },
  { id: "rda_16", word: "tralip" },
  { id: "rda_17", word: "voster" },
  { id: "rda_18", word: "splent" },
  { id: "rda_19", word: "crund" },
  { id: "rda_20", word: "bralisko" },
];

interface ItemResponse {
  studentResponse: string;
  score: number | null;
  notes: string;
}

interface RdaAnswers {
  mode: string;
  generalNotes: string;
  items: Record<string, ItemResponse>;
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

function rdaRiskLevel(pct: number) {
  if (pct >= 85) return "low";
  if (pct >= 70) return "mild";
  if (pct >= 50) return "moderate";
  return "significant";
}

function computeScores(items: Record<string, ItemResponse>) {
  let raw = 0, max = 0, correct = 0, partial = 0, incorrect = 0;
  for (const item of RDA_ITEMS) {
    const r = items[item.id];
    if (!r || r.score === null) continue;
    max++;
    if (r.score === 1) { correct++; raw += 1; }
    else if (r.score === 0.5) { partial++; raw += 0.5; }
    else { incorrect++; }
  }
  const pct = max > 0 ? Math.round((raw / max) * 100) : 0;
  return { raw, max, pct, correct, partial, incorrect, risk: max > 0 ? rdaRiskLevel(pct) : null };
}

export default function RdaAdminPage() {
  const { id: caseId, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const { toast } = useToast();

  const [items, setItems] = useState<Record<string, ItemResponse>>({});
  const [mode, setMode] = useState("In-Person");
  const [generalNotes, setGeneralNotes] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [studentView, setStudentView] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const studentViewUrl = `${window.location.origin}${import.meta.env.BASE_URL}student-view/rda`;

  const { data, isLoading, error } = useQuery({
    queryKey: ["rda", caseId, assignmentId],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rda`, {
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
      setItems(source.items ?? {});
      setMode(source.mode ?? "In-Person");
      setGeneralNotes(source.generalNotes ?? "");
    }
    if (data.summary) setSummary(data.summary);
    setInitialized(true);
  }, [data, initialized]);

  const buildAnswers = useCallback((): RdaAnswers => ({ mode, generalNotes, items }), [mode, generalNotes, items]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rda/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify(buildAnswers()),
      });
    } finally {
      setSaving(false);
    }
  }, [caseId, assignmentId, buildAnswers]);

  useEffect(() => {
    if (!initialized || isCompleted) return;
    const t = setTimeout(() => saveDraft(), 2000);
    return () => clearTimeout(t);
  }, [items, mode, generalNotes, initialized]);

  const handleSubmit = async () => {
    const s = computeScores(items);
    if (s.max === 0) {
      toast({ title: "No items scored", description: "Score at least one item before submitting.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rda/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify(buildAnswers()),
      });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: "RDA submitted", description: "Assessment results have been saved." });
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

  const setItemField = (id: string, field: keyof ItemResponse, value: string | number | null) => {
    setItems(prev => ({
      ...prev,
      [id]: { studentResponse: "", score: null, notes: "", ...prev[id], [field]: value },
    }));
  };

  const isCompleted = data?.assignment?.status === "completed";
  const scores = computeScores(items);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 text-sm">Failed to load RDA session.</div>;

  if (studentView) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <span className="text-sm text-slate-400 font-medium tracking-wide uppercase">ReMynd Decoding Assessment</span>
          <Button onClick={() => setStudentView(false)} className="gap-2 bg-slate-800 hover:bg-slate-900 text-white">
            <EyeOff size={14} /> Return to Scoring
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-8 py-10">
          <p className="text-center text-slate-400 text-sm mb-10">Read each word aloud. Take your time.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {RDA_ITEMS.map((item, idx) => (
              <div key={item.id} className="flex flex-col items-center gap-2 bg-slate-50 rounded-2xl py-6 px-4 border border-slate-100">
                <span className="text-xs text-slate-400 font-medium">{idx + 1}</span>
                <span className="text-4xl font-bold text-slate-800 tracking-wide font-mono">{item.word}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500">
              <ArrowLeft size={14} /> Back to Case
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-slate-800 truncate">ReMynd Decoding Assessment (RDA)</h1>
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
                <Button variant="outline" size="sm" onClick={() => setStudentView(true)} className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Monitor size={13} /> Student View
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Share2 size={13} /> Share
                </Button>
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

      <div className="max-w-5xl mx-auto px-4 py-6">
        {isCompleted && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-800 text-sm">
            <CheckCircle2 size={16} />
            <span>This RDA session has been submitted. Results are saved to the case profile.</span>
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

        {/* Disclaimer */}
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-900 text-xs">
          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
          <span>These assessments are non-diagnostic educational decision-support tools. They do not diagnose dyslexia, ADHD, language disorder, or any other condition. Results should be interpreted alongside developmental history, academic achievement, classroom performance, and other assessment findings.</span>
        </div>

        {/* Mode */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
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

        {/* Score summary card */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Score Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{scores.raw}<span className="text-sm font-normal text-slate-400">/{scores.max}</span></div>
              <div className="text-xs text-slate-500 mt-0.5">Total Score</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{scores.pct}%</div>
              <div className="text-xs text-slate-500 mt-0.5">Percentage</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 text-center">
              <div className="text-sm font-semibold text-slate-600">{scores.correct}✓ {scores.partial}½ {scores.incorrect}✗</div>
              <div className="text-xs text-slate-500 mt-0.5">Correct / Partial / Incorrect</div>
            </div>
            <div className={`rounded-lg p-3 text-center border ${scores.risk ? riskColor(scores.risk) : "bg-slate-50 text-slate-400 border-slate-200"}`}>
              <div className="text-sm font-bold">{scores.risk ? riskLabel(scores.risk) : "—"}</div>
              <div className="text-xs mt-0.5 opacity-70">Risk Level</div>
            </div>
          </div>
        </div>

        {/* Examiner Instructions */}
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-blue-800 text-xs">
          <strong>Examiner Instructions:</strong> Ask the student to read each nonword aloud. Do not assist. Record the student's response verbatim. Score each item: <strong>1 = Correct</strong>, <strong>½ = Partially Correct or Self-Corrected</strong>, <strong>0 = Incorrect / No Response</strong>. Leave blank (–) if not administered.
        </div>

        {/* Items table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-6">
          <div className="grid grid-cols-[2rem_1fr_1fr_1fr_auto] text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 px-4 py-2 gap-3">
            <span>#</span>
            <span>Prompt</span>
            <span>Student Response</span>
            <span>Score</span>
            <span className="w-28">Notes</span>
          </div>
          {RDA_ITEMS.map((item, idx) => {
            const resp = items[item.id] ?? { studentResponse: "", score: null, notes: "" };
            const scoreColor = resp.score === 1 ? "bg-emerald-100 text-emerald-700" : resp.score === 0.5 ? "bg-amber-100 text-amber-700" : resp.score === 0 ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500";
            return (
              <div key={item.id} className={`grid grid-cols-[2rem_1fr_1fr_1fr_auto] gap-3 items-center px-4 py-2.5 border-b border-slate-100 last:border-b-0 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                <span className="text-xs text-slate-400 font-mono">{idx + 1}</span>
                <span className="font-mono text-base font-bold text-slate-800 tracking-wide">{item.word}</span>
                <Input
                  value={resp.studentResponse}
                  onChange={e => !isCompleted && setItemField(item.id, "studentResponse", e.target.value)}
                  placeholder="Student said…"
                  disabled={isCompleted}
                  className="h-8 text-sm"
                />
                <div className="flex gap-1">
                  {([1, 0.5, 0] as const).map(v => (
                    <button key={v} onClick={() => !isCompleted && setItemField(item.id, "score", resp.score === v ? null : v)}
                      className={`px-2 py-1 rounded text-xs font-bold border transition-colors ${resp.score === v ? scoreColor + " border-transparent" : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"} ${isCompleted ? "cursor-default" : "cursor-pointer"}`}>
                      {v === 1 ? "1" : v === 0.5 ? "½" : "0"}
                    </button>
                  ))}
                  {resp.score !== null && !isCompleted && (
                    <button onClick={() => setItemField(item.id, "score", null)} className="px-2 py-1 rounded text-xs text-slate-400 border border-dashed border-slate-200 hover:border-slate-400">–</button>
                  )}
                </div>
                <Input
                  value={resp.notes}
                  onChange={e => !isCompleted && setItemField(item.id, "notes", e.target.value)}
                  placeholder="Notes"
                  disabled={isCompleted}
                  className="h-8 text-xs w-28"
                />
              </div>
            );
          })}
        </div>

        {/* General Notes */}
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

      {/* Share Student View dialog */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShareOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Share Student View</h2>
                <p className="text-sm text-slate-500 mt-0.5">Send this link to the student. They open it on their own device and read the words aloud while you score here.</p>
              </div>
              <button onClick={() => setShareOpen(false)} className="ml-4 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            {/* URL box */}
            <div className="flex items-center gap-2 mb-5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="flex-1 text-xs text-slate-600 font-mono truncate">{studentViewUrl}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(studentViewUrl); toast({ title: "Link copied!" }); }}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0"
              >
                <Copy size={13} /> Copy
              </button>
            </div>

            {/* Share options */}
            <div className="grid grid-cols-3 gap-3">
              <a
                href={`mailto:?subject=Reading%20Assessment%20Link&body=Please%20open%20this%20link%20on%20your%20device%20to%20begin%20the%20reading%20assessment%3A%0A%0A${encodeURIComponent(studentViewUrl)}`}
                className="flex flex-col items-center gap-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl py-4 transition-colors"
              >
                <Mail size={22} className="text-blue-600" />
                <span className="text-xs font-medium text-slate-700">Email</span>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent("Please open this link on your device to begin the reading assessment:\n\n" + studentViewUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-green-200 rounded-xl py-4 transition-colors"
              >
                <MessageCircle size={22} className="text-green-600" />
                <span className="text-xs font-medium text-slate-700">WhatsApp</span>
              </a>
              <a
                href={`sms:?body=${encodeURIComponent("Reading assessment link: " + studentViewUrl)}`}
                className="flex flex-col items-center gap-2 bg-slate-50 hover:bg-violet-50 border border-slate-200 hover:border-violet-200 rounded-xl py-4 transition-colors"
              >
                <Share2 size={22} className="text-violet-600" />
                <span className="text-xs font-medium text-slate-700">SMS</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
