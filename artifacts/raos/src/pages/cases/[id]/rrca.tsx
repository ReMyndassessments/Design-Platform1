import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetCase } from "@workspace/api-client-react";
const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ExaminerInstructions } from "@/components/examiner-instructions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, Save, Send, Sparkles, Printer, RefreshCw, BookOpen, Eye, Share2, Copy, Mail, MessageCircle, X, Languages } from "lucide-react";
import { PrintReportIdentity } from "@/components/PrintReportIdentity";

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
  responseLanguage: string;
  phaseOutcome: "completed" | "stopped_early";
  questionsReached: number | null;
  phaseNotes: string;
  languageTrials: RrcaLanguageTrial[];
  activeLanguageTrialIndex: number;
}

interface RrcaLanguageTrial {
  passageLanguage: string;
  responseLanguage: string;
  passage: string;
  passageDifficulty: string;
  passageTopic: string;
  passageWordCount: number;
  questions: RrcaQuestion[];
  outcome: "completed" | "stopped_early";
  questionsReached: number | null;
  notes: string;
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
  return level === "low" ? "High passage accuracy" : level === "mild" ? "Some incorrect/partial answers" : level === "moderate" ? "Mixed passage accuracy" : "Low passage accuracy";
}

function riskColor(level: string) {
  return level === "low" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
         level === "mild" ? "bg-amber-50 text-amber-700 border-amber-200" :
         level === "moderate" ? "bg-orange-50 text-orange-700 border-orange-200" :
         "bg-red-50 text-red-700 border-red-200";
}

function computeScores(questions: RrcaQuestion[]) {
  let literal = 0, inferential = 0, vocabulary = 0, max = 0;
  let literalItemsScored = 0, inferentialItemsScored = 0, vocabularyItemsScored = 0;
  for (const q of questions) {
    if (typeof q.score !== "number") continue;
    max++;
    if (q.type === "literal") {
      literal += q.score;
      literalItemsScored++;
    } else if (q.type === "inferential") {
      inferential += q.score;
      inferentialItemsScored++;
    } else if (q.type === "vocabulary") {
      vocabulary += q.score;
      vocabularyItemsScored++;
    }
  }
  const raw = literal + inferential + vocabulary;
  const pct = max > 0 ? Math.round((raw / max) * 100) : 0;
  const risk = pct >= 85 ? "low" : pct >= 70 ? "mild" : pct >= 50 ? "moderate" : "significant";
  return { literal, inferential, vocabulary, literalItemsScored, inferentialItemsScored, vocabularyItemsScored, raw, max, pct, risk };
}

function detectPassageScript(text: string) {
  const hasHan = /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(text);
  const hasHangul = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  if ([hasHan, hasHangul, hasLatin].filter(Boolean).length > 1) return "Mixed scripts";
  if (hasHan) return "Chinese characters";
  if (hasHangul) return "Hangul";
  if (hasLatin) return "Latin script";
  return "Unclear";
}

function scriptMatchesLanguage(language: string, script: string) {
  if (script === "Mixed scripts" || script === "Unclear") return true;
  if (language === "mandarin" || language === "cantonese") return script === "Chinese characters";
  if (language === "korean") return script === "Hangul";
  return script === "Latin script";
}

function languageLabel(language?: string) {
  if (!language || language === "not_recorded") return "Not recorded";
  if (language === "other") return "Other language";
  return LANGUAGES.find(item => item.value === language)?.label ?? language;
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
  const { data: caseDemographics } = useGetCase(caseId);
  const { toast } = useToast();

  const [mode, setMode] = useState("In-Person");
  const [passage, setPassage] = useState("");
  const [passageLanguage, setPassageLanguage] = useState("english");
  const [passageDifficulty, setPassageDifficulty] = useState("expected");
  const [passageTopic, setPassageTopic] = useState("General Knowledge");
  const [passageWordCount, setPassageWordCount] = useState(0);
  const [questions, setQuestions] = useState<RrcaQuestion[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [languageTrials, setLanguageTrials] = useState<RrcaLanguageTrial[]>([]);
  const [responseLanguage, setResponseLanguage] = useState("not_recorded");
  const [phaseOutcome, setPhaseOutcome] = useState<"completed" | "stopped_early">("completed");
  const [questionsReached, setQuestionsReached] = useState("");
  const [phaseNotes, setPhaseNotes] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPassage, setGeneratingPassage] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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
      const savedTrials = Array.isArray(source.languageTrials) ? source.languageTrials as RrcaLanguageTrial[] : [];
      const activeIndex = typeof source.activeLanguageTrialIndex === "number"
        ? source.activeLanguageTrialIndex
        : Math.max(0, savedTrials.length - 1);
      const activeTrial = savedTrials[activeIndex];
      setLanguageTrials(savedTrials.filter((_, index) => index !== activeIndex));
      setMode(source.mode ?? "In-Person");
      setPassage(activeTrial?.passage ?? source.passage ?? "");
      setPassageLanguage(activeTrial?.passageLanguage ?? source.passageLanguage ?? "english");
      setPassageDifficulty(activeTrial?.passageDifficulty ?? source.passageDifficulty ?? "expected");
      setPassageTopic(activeTrial?.passageTopic ?? source.passageTopic ?? "General Knowledge");
      setPassageWordCount(activeTrial?.passageWordCount ?? source.passageWordCount ?? 0);
      setQuestions(activeTrial?.questions ?? source.questions ?? []);
      setGeneralNotes(source.generalNotes ?? "");
      setResponseLanguage(activeTrial?.responseLanguage ?? source.responseLanguage ?? "not_recorded");
      setPhaseOutcome(activeTrial?.outcome ?? source.phaseOutcome ?? "completed");
      const reached = activeTrial?.questionsReached ?? source.questionsReached;
      setQuestionsReached(reached == null ? "" : String(reached));
      setPhaseNotes(activeTrial?.notes ?? source.phaseNotes ?? "");
    }
    if (data.summary) setSummary(data.summary);
    setInitialized(true);
  }, [data, initialized]);

  const buildAnswers = useCallback((): RrcaAnswers => {
    const activeTrial: RrcaLanguageTrial = {
      passageLanguage,
      responseLanguage,
      passage,
      passageDifficulty,
      passageTopic,
      passageWordCount,
      questions,
      outcome: phaseOutcome,
      questionsReached: questionsReached === ""
        ? (phaseOutcome === "completed" ? questions.length : null)
        : Number(questionsReached),
      notes: phaseNotes,
    };
    return {
      mode, passage, passageLanguage, passageDifficulty, passageTopic, passageWordCount, questions, generalNotes,
      responseLanguage, phaseOutcome, questionsReached: activeTrial.questionsReached, phaseNotes,
      languageTrials: [...languageTrials, activeTrial],
      activeLanguageTrialIndex: languageTrials.length,
    };
  }, [
    mode, passage, passageLanguage, passageDifficulty, passageTopic, passageWordCount, questions, generalNotes,
    responseLanguage, phaseOutcome, questionsReached, phaseNotes, languageTrials,
  ]);

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
  const studentViewUrl = data?.assignment?.uniqueToken
    ? `${window.location.origin}${import.meta.env.BASE_URL}student-view/rrca/${data.assignment.uniqueToken}`
    : null;

  useEffect(() => {
    if (!initialized || isCompleted) return;
    const t = setTimeout(() => saveDraft(), 2000);
    return () => clearTimeout(t);
  }, [
    passage, passageLanguage, passageDifficulty, passageTopic, passageWordCount, questions, mode, generalNotes,
    responseLanguage, phaseOutcome, questionsReached, phaseNotes, languageTrials, initialized,
  ]);

  const handleGeneratePassage = async () => {
    if (passage && questions.some(question => question.score !== null || question.notes.trim())) {
      toast({
        title: "Save this phase before replacing it",
        description: "Use “Save phase & add another language” first so the current passage, notes, and scores are preserved.",
        variant: "destructive",
      });
      return;
    }
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

  const handleAddLanguageTrial = async () => {
    if (!passage || questions.length === 0) {
      toast({ title: "Generate a passage first", description: "Save the current passage and its scores before starting another language phase.", variant: "destructive" });
      return;
    }
    if (phaseOutcome === "stopped_early" && questionsReached === "") {
      toast({ title: "Record the stopping point", description: "Enter the last question reached, or change the phase outcome to Completed.", variant: "destructive" });
      return;
    }
    const activeTrial = buildAnswers().languageTrials[languageTrials.length];
    const savedTrials = [...languageTrials, activeTrial];
    const nextLanguage = LANGUAGES.find(item => item.value !== passageLanguage)?.value ?? passageLanguage;
    const blankActiveTrial: RrcaLanguageTrial = {
      passageLanguage: nextLanguage,
      responseLanguage: "not_recorded",
      passage: "",
      passageDifficulty,
      passageTopic,
      passageWordCount: 0,
      questions: [],
      outcome: "completed",
      questionsReached: null,
      notes: "",
    };
    const draftAnswers: RrcaAnswers = {
      mode,
      passage: "",
      passageLanguage: nextLanguage,
      passageDifficulty,
      passageTopic,
      passageWordCount: 0,
      questions: [],
      generalNotes,
      responseLanguage: "not_recorded",
      phaseOutcome: "completed",
      questionsReached: null,
      phaseNotes: "",
      languageTrials: [...savedTrials, blankActiveTrial],
      activeLanguageTrialIndex: savedTrials.length,
    };
    setSaving(true);
    try {
      const response = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/rrca/draft`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify(draftAnswers),
      });
      if (!response.ok) throw new Error(await response.text());
    } catch (error) {
      toast({ title: "Could not save this language phase", description: String(error), variant: "destructive" });
      return;
    } finally {
      setSaving(false);
    }
    setLanguageTrials(savedTrials);
    setPassage("");
    setPassageWordCount(0);
    setQuestions([]);
    setResponseLanguage("not_recorded");
    setPhaseOutcome("completed");
    setQuestionsReached("");
    setPhaseNotes("");
    setPassageLanguage(nextLanguage);
    toast({ title: "Language phase saved", description: "Its passage and scores are saved. Choose the next language and generate another passage." });
  };

  const handleSubmit = async () => {
    if (!passage) {
      toast({ title: "No passage", description: "Generate a passage before submitting.", variant: "destructive" });
      return;
    }
    if (phaseOutcome === "stopped_early" && questionsReached === "") {
      toast({ title: "Record the stopping point", description: "Enter the last question reached, or change the phase outcome to Completed.", variant: "destructive" });
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
  const allLanguageTrials = buildAnswers().languageTrials;

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-600 text-sm">Failed to load RRCA session.</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 pt-5">
        <PrintReportIdentity
          reportTitle="ReMynd Reading Comprehension Assessment (RRCA)"
          studentName={caseDemographics?.studentName ?? data?.case?.studentName}
          dob={caseDemographics?.dob ?? data?.case?.dob}
          grade={caseDemographics?.grade ?? data?.case?.grade}
          school={caseDemographics?.school ?? data?.case?.school}
          languagePreference={caseDemographics?.languagePreference ?? data?.case?.languagePreference}
          caseId={caseId}
          assessmentDate={data?.assignment?.submittedAt}
        />
      </div>
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

      <div className="max-w-5xl mx-auto px-4 py-6">
        <ExaminerInstructions assessment="rrca" />
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

        {(isCompleted || languageTrials.length > 0) && (
          <section className="mb-6 rounded-xl border border-indigo-200 bg-white p-5">
            <div className="flex items-start gap-3">
              <Languages size={17} className="mt-0.5 text-indigo-600" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold text-slate-800">Language administration record</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Passage and question scripts are checked automatically; confirm the language used with the student. Response language is recorded separately. Scores from different languages or passages are never combined.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {allLanguageTrials.map((trial, index) => {
                const trialScores = computeScores(trial.questions ?? []);
                const reached = trial.questionsReached ?? (trial.outcome === "completed" ? trial.questions.length : null);
                const passageScript = detectPassageScript(trial.passage ?? "");
                const questionScript = detectPassageScript((trial.questions ?? []).map(question => question.text).join("\n"));
                const stoppedEarly = trial.outcome === "stopped_early";
                const statusText = stoppedEarly
                  ? `Stopped early${reached === null ? "" : ` after question ${reached}`}`
                  : "Completed";
                return (
                  <article key={`${trial.passageLanguage}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">Phase {index + 1}: {languageLabel(trial.passageLanguage)}</span>
                      <Badge variant="outline" className={stoppedEarly ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}>{statusText}</Badge>
                      <span className="ml-auto text-xs font-medium text-slate-700">
                        {trialScores.max > 0 ? `${trialScores.raw}/${trialScores.max} scored (${trialScores.pct}%)` : "No numeric score recorded"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Response language: {trial.responseLanguage === "same_as_passage" ? `${languageLabel(trial.passageLanguage)} (same as passage)` : languageLabel(trial.responseLanguage)}
                      {" · "}Passage script: {passageScript}
                      {" · "}Question script: {questionScript}
                      {" · "}{trialScores.max} item{trialScores.max === 1 ? "" : "s"} scored
                    </p>
                    {trial.notes && <p className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{trial.notes}</p>}
                    {index < allLanguageTrials.length - 1 && (
                      <details className="mt-2 text-xs text-slate-600">
                        <summary className="cursor-pointer font-medium text-indigo-700">Review this phase’s passage and item scores</summary>
                        <p className="mt-2 whitespace-pre-wrap leading-relaxed">{trial.passage || "No passage text was saved for this phase."}</p>
                        <ul className="mt-2 space-y-1">
                          {(trial.questions ?? []).map((question, questionIndex) => (
                            <li key={question.id}>{questionIndex + 1}. {question.text} — {question.score == null ? "not scored" : question.score === 0.5 ? "partial" : question.score === 1 ? "correct" : "incorrect"}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
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
                <label className="text-xs text-slate-500 mb-1.5 block">Passage language</label>
                <Select value={passageLanguage} onValueChange={value => {
                  if (passage && value !== passageLanguage) {
                    toast({
                      title: "Save this phase before changing language",
                      description: "Use “Save phase & add another language” to preserve the current passage and scores.",
                      variant: "destructive",
                    });
                    return;
                  }
                  setPassageLanguage(value);
                }}>
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
              <p className="text-xs text-slate-400 mt-2">Passage generated · {passageWordCount} words · {questions.length} questions · Regenerating will reset scores for this passage</p>
            )}
          </div>
        )}

        {passage && (
          <section className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-5">
            <div className="flex items-center gap-2">
              <Languages size={15} className="text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-800">Language used in this phase</h2>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Passage language: <strong>{languageLabel(passageLanguage)}</strong> · Detected passage script: <strong>{detectPassageScript(passage)}</strong> · Detected question script: <strong>{detectPassageScript(questions.map(question => question.text).join("\n"))}</strong>
            </p>
            {!scriptMatchesLanguage(passageLanguage, detectPassageScript(passage)) && (
              <p role="alert" className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                The detected character script does not match the selected passage language. Confirm the language label before continuing.
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">Character-script detection cannot identify spoken language or distinguish Mandarin from Cantonese. Confirm the language actually used.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs text-slate-600">Student’s response language</label>
                <Select value={responseLanguage} onValueChange={setResponseLanguage} disabled={isCompleted}>
                  <SelectTrigger className="h-9 bg-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="same_as_passage">Same as passage</SelectItem>
                    {LANGUAGES.map(language => <SelectItem key={language.value} value={language.value}>{language.label}</SelectItem>)}
                    <SelectItem value="other">Other language</SelectItem>
                    <SelectItem value="not_recorded">Not recorded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-600">Phase outcome</label>
                <Select value={phaseOutcome} onValueChange={value => setPhaseOutcome(value as "completed" | "stopped_early")} disabled={isCompleted}>
                  <SelectTrigger className="h-9 bg-white text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="completed">Completed this passage</SelectItem>
                    <SelectItem value="stopped_early">Stopped before completion</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {phaseOutcome === "stopped_early" && (
                <div>
                  <label className="mb-1.5 block text-xs text-slate-600">Last question reached (0–{questions.length})</label>
                  <input
                    type="number"
                    min="0"
                    max={questions.length}
                    value={questionsReached}
                    onChange={event => setQuestionsReached(event.target.value)}
                    disabled={isCompleted}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-100"
                  />
                </div>
              )}
              <div className={phaseOutcome === "stopped_early" ? "" : "sm:col-span-2"}>
                <label className="mb-1.5 block text-xs text-slate-600">Notes about this language phase</label>
                <Textarea
                  value={phaseNotes}
                  onChange={event => setPhaseNotes(event.target.value)}
                  disabled={isCompleted}
                  placeholder="For example: unable to proceed past the first question in English."
                  className="min-h-[70px] bg-white text-sm"
                />
              </div>
            </div>
            {!isCompleted && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button variant="outline" onClick={handleAddLanguageTrial} disabled={saving} className="gap-1.5 border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50">
                  <Languages size={14} /> Save phase & add another language
                </Button>
                <span className="text-xs text-slate-500">The current passage and scores are preserved as a separate phase.</span>
              </div>
            )}
          </section>
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
            <h2 className="text-sm font-semibold text-slate-700 mb-2">{languageTrials.length > 0 ? `Score Summary · ${languageLabel(passageLanguage)} phase only` : "Score Summary"}</h2>
            {languageTrials.length > 0 && <p className="mb-4 text-xs text-slate-500">This score applies only to the current passage; scores from separate language phases are not combined.</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-slate-800">{scores.raw}<span className="text-sm font-normal text-slate-400">/{scores.max}</span></div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {scores.max === 0 ? "No scored items" : `${scores.max}/${questions.length} items scored · ${scores.pct}% of scored items`}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-blue-700">{scores.literal}<span className="text-sm font-normal text-blue-400">/{scores.literalItemsScored}</span></div>
                <div className="text-xs text-blue-500 mt-0.5">Literal · {scores.literalItemsScored}/5 scored</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-purple-700">{scores.inferential}<span className="text-sm font-normal text-purple-400">/{scores.inferentialItemsScored}</span></div>
                <div className="text-xs text-purple-500 mt-0.5">Inferential · {scores.inferentialItemsScored}/3 scored</div>
              </div>
              <div className={`rounded-lg p-3 text-center border ${scores.max > 0 ? riskColor(scores.risk) : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                <div className="text-sm font-bold">{scores.max === 0 ? "–" : scores.max < questions.length ? "Partial results" : riskLabel(scores.risk)}</div>
                <div className="text-xs mt-0.5 opacity-70">Passage descriptor</div>
              </div>
            </div>
            <p className="mt-3 text-xs text-slate-500">This descriptive result applies only to the administered passage. It is not age-normed and cannot establish or rule out a reading difficulty.</p>
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

      {shareOpen && studentViewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShareOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Share Reading Passage</h2>
                <p className="text-sm text-slate-500 mt-0.5">Send this link to the student. They open it on their own device and read the passage aloud while you score here.</p>
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
                href={`mailto:?subject=Reading%20Assessment%20Passage&body=Please%20open%20this%20link%20on%20your%20device%20to%20read%20the%20passage%3A%0A%0A${encodeURIComponent(studentViewUrl)}`}
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
