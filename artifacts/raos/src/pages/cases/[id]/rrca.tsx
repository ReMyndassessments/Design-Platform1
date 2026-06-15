import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Save, Send, Sparkles, Printer, RefreshCw, BookOpen, Eye } from "lucide-react";

interface RrcaQuestion {
  id: string;
  text: string;
  type: "literal" | "inferential" | "vocabulary";
  score: number | null;
  notes: string;
}

interface RrcaAnswers {
  mode: string;
  passage: string;
  passageLanguage: string;
  passageDifficulty: string;
  passageTopic: string;
  passageWordCount: number;
  questions: RrcaQuestion[];
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

function computeScores(questions: RrcaQuestion[]) {
  let literal = 0, inferential = 0, vocabulary = 0, max = 0;
  for (const q of questions) {
    if (q.score === null) continue;
    max++;
    if (q.type === "literal") literal += q.score;
    else if (q.type === "inferential") inferential += q.score;
    else if (q.type === "vocabulary") vocabulary += q.score;
  }
  const raw = literal + inferential + vocabulary;
  const pct = max > 0 ? Math.round((raw / max) * 100) : 0;
  const risk = pct >= 85 ? "low" : pct >= 70 ? "mild" : pct >= 50 ? "moderate" : "significant";
  return { literal, inferential, vocabulary, raw, max, pct, risk };
}

const TYPE_BADGE: Record<string, string> = {
  literal: "bg-blue-100 text-blue-700",
  inferential: "bg-purple-100 text-purple-700",
  vocabulary: "bg-amber-100 text-amber-700",
};

const TYPE_LABEL: Record<string, string> = {
  literal: "Literal",
  inferential: "Inferential",
  vocabulary: "Vocabulary",
};

const TOPICS = ["Animals", "Science", "History", "Technology", "Sports", "Travel", "School Life", "General Knowledge"];
const DIFFICULTIES = [
  { value: "below", label: "Below Age Expectation" },
  { value: "expected", label: "Age Expected" },
  { value: "above", label: "Above Age Expectation" },
];
const LANGUAGES = [
  { value: "english", label: "English" },
  { value: "mandarin", label: "Mandarin Chinese" },
  { value: "cantonese", label: "Cantonese" },
  { value: "korean", label: "Korean" },
];

export default function RrcaAdminPage() {
  const { id: caseId, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const { toast } = useToast();

  const [mode, setMode] = useState("In-Person");
  const [passage, setPassage] = useState("");
  const [passageLanguage, setPassageLanguage] = useState("english");
  const [passageDifficulty, setPassageDifficulty] = useState("expected");
  const [passageTopic, setPassageTopic] = useState("General Knowledge");
  const [passageWordCount, setPassageWordCount] = useState(0);
  const [questions, setQuestions] = useState<RrcaQuestion[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPassage, setGeneratingPassage] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["rrca", caseId, assignmentId],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rrca`, {
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
      setPassage(source.passage ?? "");
      setPassageLanguage(source.passageLanguage ?? "english");
      setPassageDifficulty(source.passageDifficulty ?? "expected");
      setPassageTopic(source.passageTopic ?? "General Knowledge");
      setPassageWordCount(source.passageWordCount ?? 0);
      setQuestions(source.questions ?? []);
      setGeneralNotes(source.generalNotes ?? "");
    }
    if (data.summary) setSummary(data.summary);
    setInitialized(true);
  }, [data, initialized]);

  const buildAnswers = useCallback((): RrcaAnswers => ({
    mode, passage, passageLanguage, passageDifficulty, passageTopic, passageWordCount, questions, generalNotes,
  }), [mode, passage, passageLanguage, passageDifficulty, passageTopic, passageWordCount, questions, generalNotes]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rrca/draft`, {
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
  }, [passage, questions, mode, generalNotes, initialized]);

  const handleGeneratePassage = async () => {
    const caseData = data?.case;
    const age = caseData?.dob ? calcAge(caseData.dob) : 12;
    const grade = data?.case?.grade ?? "";
    setGeneratingPassage(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rrca/generate-passage`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify({ age, grade, language: passageLanguage, difficulty: passageDifficulty, topic: passageTopic }),
      });
      if (!r.ok) throw new Error(await r.text());
      const result = await r.json();
      setPassage(result.passage);
      setPassageWordCount(result.wordCount);
      setQuestions(result.questions.map((q: { id: string; text: string; type: "literal" | "inferential" | "vocabulary" }) => ({ ...q, score: null, notes: "" })));
      toast({ title: "Passage generated", description: `${result.wordCount} words · ${result.questions.length} questions` });
    } catch (e) {
      toast({ title: "Generation failed", description: String(e), variant: "destructive" });
    } finally {
      setGeneratingPassage(false);
    }
  };

  const handleSubmit = async () => {
    if (!passage) {
      toast({ title: "No passage", description: "Generate a passage before submitting.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rrca/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify(buildAnswers()),
      });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: "RRCA submitted", description: "Assessment results have been saved." });
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

  const setQuestionScore = (idx: number, score: number | null) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, score } : q));
  };
  const setQuestionNotes = (idx: number, notes: string) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, notes } : q));
  };

  const scores = computeScores(questions);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 text-sm">Failed to load RRCA session.</div>;

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
            <h1 className="text-sm font-semibold text-slate-800 truncate">ReMynd Reading Comprehension Assessment (RRCA)</h1>
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

      <div className="max-w-5xl mx-auto px-4 py-6">
        {isCompleted && (
          <div className="mb-4 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-800 text-sm">
            <CheckCircle2 size={16} />
            <span>This RRCA session has been submitted. Results are saved to the case profile.</span>
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

        {/* Passage Generation */}
        {!isCompleted && (
          <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={15} className="text-violet-600" />
              <h2 className="text-sm font-semibold text-slate-700">Passage Generator</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Difficulty</label>
                <Select value={passageDifficulty} onValueChange={setPassageDifficulty}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Topic</label>
                <Select value={passageTopic} onValueChange={setPassageTopic}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TOPICS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Language</label>
                <Select value={passageLanguage} onValueChange={setPassageLanguage}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleGeneratePassage} disabled={generatingPassage} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              {generatingPassage ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> {passage ? "Regenerate Passage" : "Generate Passage"}</>}
            </Button>
            {passage && (
              <p className="text-xs text-slate-400 mt-2">Passage generated · {passageWordCount} words · {questions.length} questions · Regenerating will reset all scores</p>
            )}
          </div>
        )}

        {/* Passage display */}
        {passage && (
          <div className="mb-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
              <BookOpen size={14} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Reading Passage</span>
              <span className="ml-auto text-xs text-slate-400">{passageWordCount} words · {passageTopic} · {DIFFICULTIES.find(d => d.value === passageDifficulty)?.label}</span>
            </div>
            <div className="p-5">
              <p className="text-base leading-relaxed text-slate-800 whitespace-pre-wrap">{passage}</p>
            </div>
          </div>
        )}

        {/* Questions */}
        {questions.length > 0 && (
          <div className="mb-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
              <span className="text-sm font-semibold text-slate-700">Questions & Scoring</span>
              <span className="ml-2 text-xs text-slate-400">{questions.length} questions (5 Literal · 3 Inferential · 2 Vocabulary)</span>
            </div>
            <div className="divide-y divide-slate-100">
              {questions.map((q, idx) => (
                <div key={q.id} className={`px-5 py-4 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono text-slate-400 mt-0.5 w-5 flex-shrink-0">{idx + 1}.</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[q.type]}`}>{TYPE_LABEL[q.type]}</span>
                      </div>
                      <p className="text-sm text-slate-800 mb-3">{q.text}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 mr-1">Score:</span>
                        {([1, 0.5, 0] as const).map(v => {
                          const sel = q.score === v;
                          const col = v === 1 ? "bg-emerald-100 text-emerald-700 border-emerald-300" : v === 0.5 ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-red-100 text-red-600 border-red-300";
                          return (
                            <button key={v} onClick={() => !isCompleted && setQuestionScore(idx, sel ? null : v)}
                              className={`px-3 py-1 rounded text-xs font-bold border transition-colors ${sel ? col : "bg-white text-slate-400 border-slate-200 hover:border-slate-400"} ${isCompleted ? "cursor-default" : "cursor-pointer"}`}>
                              {v === 1 ? "1" : v === 0.5 ? "½" : "0"}
                            </button>
                          );
                        })}
                        <input
                          value={q.notes}
                          onChange={e => !isCompleted && setQuestionNotes(idx, e.target.value)}
                          placeholder="Notes…"
                          disabled={isCompleted}
                          className="ml-2 flex-1 text-xs border border-slate-200 rounded px-2 py-1 bg-white disabled:bg-slate-50 focus:outline-none focus:border-violet-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Score Summary */}
        {questions.length > 0 && (
          <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Score Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-slate-800">{scores.raw}<span className="text-sm font-normal text-slate-400">/{scores.max}</span></div>
                <div className="text-xs text-slate-500 mt-0.5">Total ({scores.pct}%)</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-700">{scores.literal}<span className="text-sm font-normal text-blue-400">/5</span></div>
                <div className="text-xs text-blue-500 mt-0.5">Literal</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-700">{scores.inferential}<span className="text-sm font-normal text-purple-400">/3</span></div>
                <div className="text-xs text-purple-500 mt-0.5">Inferential</div>
              </div>
              <div className={`rounded-lg p-3 text-center border ${scores.max > 0 ? riskColor(scores.risk) : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                <div className="text-sm font-bold">{scores.max > 0 ? riskLabel(scores.risk) : "–"}</div>
                <div className="text-xs mt-0.5 opacity-70">Risk Level</div>
              </div>
            </div>
          </div>
        )}

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
