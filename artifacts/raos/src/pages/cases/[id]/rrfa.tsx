import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Save, Send, Sparkles, Printer, RefreshCw, Play, Square, RotateCcw, Eye, Share2, Copy, Mail, MessageCircle, X, BookOpen } from "lucide-react";

interface RrfaAnswers {
  mode: string;
  passageType: "60-second" | "full-passage";
  passage?: string;
  passageLanguage?: string;
  passageTopic?: string;
  passageWordCount?: number;
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
const PASSAGE_LANGUAGES = [
  { value: "english", label: "English" },
  { value: "mandarin", label: "Mandarin" },
  { value: "cantonese", label: "Cantonese" },
  { value: "korean", label: "Korean" },
];
const PASSAGE_TOPICS = ["General Knowledge", "Animals", "Nature & Environment", "Science & Technology", "History & Culture", "Sports & Recreation", "Food & Nutrition", "Community & Society"];

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
  const [passage, setPassage] = useState("");
  const [passageLanguage, setPassageLanguage] = useState("english");
  const [passageTopic, setPassageTopic] = useState("General Knowledge");
  const [passageWordCount, setPassageWordCount] = useState(0);
  const [generatingPassage, setGeneratingPassage] = useState(false);
  const [hoveredWordIdx, setHoveredWordIdx] = useState<number | null>(null);
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(null);
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
  const [shareOpen, setShareOpen] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = async () => {
    if (timerRunning) return;
    setTimerRunning(true);
    timerRef.current = setInterval(() => setTimerElapsed(e => e + 1), 1000);
    if (passage && passageType === "60-second") {
      try {
        await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rrfa/start-student`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        });
      } catch {
        // non-critical — timer still runs locally
      }
    }
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
      setPassage(source.passage ?? "");
      setPassageLanguage(source.passageLanguage ?? "english");
      setPassageTopic(source.passageTopic ?? "General Knowledge");
      setPassageWordCount(source.passageWordCount ?? 0);
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
    passage,
    passageLanguage,
    passageTopic,
    passageWordCount,
    wordsRead: wordsRead !== "" ? Number(wordsRead) : null,
    errors: errors !== "" ? Number(errors) : null,
    selfCorrections: selfCorrections !== "" ? Number(selfCorrections) : null,
    hesitations: hesitations !== "" ? Number(hesitations) : null,
    readingTimeSeconds,
    examinerRating,
    generalNotes,
  }), [mode, passageType, passage, passageLanguage, passageTopic, passageWordCount, wordsRead, errors, selfCorrections, hesitations, readingTimeSeconds, examinerRating, generalNotes]);

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
  const studentViewUrl = data?.assignment?.uniqueToken
    ? `${window.location.origin}${import.meta.env.BASE_URL}student-view/rrfa/${data.assignment.uniqueToken}`
    : null;

  useEffect(() => {
    if (!initialized || isCompleted) return;
    const t = setTimeout(() => saveDraft(), 2000);
    return () => clearTimeout(t);
  }, [mode, passageType, passage, passageLanguage, passageTopic, passageWordCount, wordsRead, errors, selfCorrections, hesitations, readingTimeSeconds, examinerRating, generalNotes, initialized]);

  const handleGeneratePassage = async () => {
    const caseData = data?.case;
    if (!caseData?.dob) {
      toast({ title: "Student DOB required", description: "Date of birth must be set on the case to generate a passage.", variant: "destructive" });
      return;
    }
    setGeneratingPassage(true);
    try {
      const age = calcAge(caseData.dob);
      const grade = caseData.grade ?? "";
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rrfa/generate-passage`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify({ age, grade, language: passageLanguage, topic: passageTopic, passageType }),
      });
      if (!r.ok) throw new Error(await r.text());
      const { passage: p, wordCount } = await r.json();
      setPassage(p);
      setPassageWordCount(wordCount);
      toast({ title: "Passage generated", description: `${wordCount} words · ready to share with student.` });
    } catch {
      toast({ title: "Generation failed", description: "Could not generate passage. Please try again.", variant: "destructive" });
    } finally {
      setGeneratingPassage(false);
    }
  };

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
                {passage && studentViewUrl && (
                  <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50">
                    <Share2 size={13} /> Share Passage
                  </Button>
                )}
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

        {/* Passage Generation */}
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-700">Reading Passage</h2>
            </div>
            {!isCompleted && (
              <Button size="sm" onClick={handleGeneratePassage} disabled={generatingPassage} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                {generatingPassage ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> {passage ? "Regenerate" : "Generate Passage"}</>}
              </Button>
            )}
          </div>

          {!isCompleted && (
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Language</label>
                <Select value={passageLanguage} onValueChange={setPassageLanguage} disabled={isCompleted}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PASSAGE_LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Topic</label>
                <Select value={passageTopic} onValueChange={setPassageTopic} disabled={isCompleted}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PASSAGE_TOPICS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {passage ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">{passageWordCount} words · {passageLanguage} · {passageTopic}</span>
                {studentViewUrl && !isCompleted && (
                  <button onClick={() => setShareOpen(true)} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                    <Share2 size={12} /> Share with student
                  </button>
                )}
              </div>
              {isCompleted ? (
                <p className="text-sm leading-7 text-slate-800 font-serif whitespace-pre-wrap">{passage}</p>
              ) : (
                <>
                  <p className="text-sm leading-7 text-slate-800 font-serif select-none">
                    {passage.trim().split(/\s+/).map((word, i) => (
                      <span key={i}>
                        <span
                          onMouseEnter={() => setHoveredWordIdx(i)}
                          onMouseLeave={() => setHoveredWordIdx(null)}
                          onClick={() => {
                            setSelectedWordIdx(i);
                            setWordsRead(String(i + 1));
                          }}
                          className={`cursor-pointer rounded px-0.5 transition-colors relative ${
                            selectedWordIdx !== null && i <= selectedWordIdx
                              ? i === selectedWordIdx
                                ? "bg-violet-300 text-violet-900"
                                : "bg-violet-100 text-violet-800"
                              : hoveredWordIdx !== null && i <= hoveredWordIdx
                              ? i === hoveredWordIdx
                                ? "bg-blue-200 text-blue-900"
                                : "bg-blue-50 text-blue-800"
                              : ""
                          }`}
                        >
                          {word}
                          {hoveredWordIdx === i && (
                            <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-mono rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none z-10">
                              {i + 1}
                            </span>
                          )}
                        </span>
                        {i < passage.trim().split(/\s+/).length - 1 ? " " : ""}
                      </span>
                    ))}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-3">
                    {selectedWordIdx !== null
                      ? `Words read set to ${selectedWordIdx + 1} — click a different word to change`
                      : "Click the last word the student read to auto-fill the word count"}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-lg">
              {generatingPassage
                ? "Generating a reading passage tailored to the student…"
                : "No passage yet. Click Generate Passage to create one for the student to read aloud."}
            </div>
          )}
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
              const riskVal = ratingToRisk(r);
              const selected = examinerRating === r;
              return (
                <button key={r} onClick={() => !isCompleted && setExaminerRating(r)}
                  className={`p-3 rounded-lg text-sm font-medium border text-left transition-colors ${selected ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-700 border-slate-200 hover:border-violet-300"} ${isCompleted ? "opacity-70 cursor-default" : "cursor-pointer"}`}>
                  {r}
                  {selected && riskVal && (
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-normal ${selected ? "bg-white/20 text-white" : ""}`}>
                      → {riskLabel(riskVal)}
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

      {shareOpen && studentViewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShareOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Share Reading Passage</h2>
                <p className="text-sm text-slate-500 mt-0.5">Send this link to the student. They open it on their device and read aloud while you time and score here.</p>
              </div>
              <button onClick={() => setShareOpen(false)} className="ml-4 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="flex items-center gap-2 mb-5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="flex-1 text-xs text-slate-600 font-mono truncate">{studentViewUrl}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(studentViewUrl); toast({ title: "Link copied!" }); }}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 shrink-0"
              >
                <Copy size={13} /> Copy
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <a
                href={`mailto:?subject=Reading%20Fluency%20Passage&body=Please%20open%20this%20link%20on%20your%20device%20to%20read%20the%20passage%3A%0A%0A${encodeURIComponent(studentViewUrl)}`}
                className="flex flex-col items-center gap-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl py-4 transition-colors"
              >
                <Mail size={22} className="text-blue-600" />
                <span className="text-xs font-medium text-slate-700">Email</span>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent("Please open this link on your device to read the passage:\n\n" + studentViewUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 bg-slate-50 hover:bg-green-50 border border-slate-200 hover:border-green-200 rounded-xl py-4 transition-colors"
              >
                <MessageCircle size={22} className="text-green-600" />
                <span className="text-xs font-medium text-slate-700">WhatsApp</span>
              </a>
              <a
                href={`sms:?body=${encodeURIComponent("Reading passage link: " + studentViewUrl)}`}
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
