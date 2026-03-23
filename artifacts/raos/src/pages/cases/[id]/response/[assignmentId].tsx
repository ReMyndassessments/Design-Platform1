import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, User, Calendar, Globe, FileText, Sparkles, RefreshCw, BarChart2, TrendingUp, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";

interface FormQuestion {
  id: string;
  text: string;
  textChinese?: string;
  textKorean?: string;
  type: string;
  options?: string[];
  optionsChinese?: string[];
  optionsKorean?: string[];
  rows?: FormQuestion[];
  domain: string;
  required?: boolean;
  note?: string;
}

interface ScoreRecord {
  id: string;
  caseId: string;
  toolId: string;
  toolName: string;
  respondentType: string;
  rawScore: number | null;
  domainScores: Record<string, number>;
  normalizedScores: Record<string, number>;
  isManual: boolean;
  notes: string | null;
  generatedAt: string;
}

interface ResponseData {
  assignment: {
    id: string;
    toolId: string;
    toolName: string;
    respondentType: string;
    respondentLabel: string;
    assignedToName: string | null;
  };
  response: {
    id: string;
    answers: Record<string, unknown>;
    language: string;
    submittedAt: string;
    summary: string | null;
  };
  questions: FormQuestion[];
  studentName: string;
  school: string;
  grade: string;
  scoringType: "auto" | "manual" | null;
  toolDomains: string[];
  existingScore: ScoreRecord | null;
}

const LIKERT_LABELS: Record<number, string> = {
  0: "Never",
  1: "Rarely",
  2: "Sometimes",
  3: "Often",
  4: "Very Often",
};

const LIKERT_LABELS_ZH: Record<number, string> = {
  0: "从不",
  1: "很少",
  2: "有时",
  3: "经常",
  4: "非常频繁",
};

const LIKERT_LABELS_KO: Record<number, string> = {
  0: "전혀 없음",
  1: "거의 없음",
  2: "때때로",
  3: "자주",
  4: "매우 자주",
};

function formatAnswer(question: FormQuestion, rawAnswer: unknown, language: string): string {
  if (rawAnswer === undefined || rawAnswer === null || rawAnswer === "") return "—";
  const isZh = language === "mandarin" || language === "cantonese";
  const isKo = language === "korean";
  switch (question.type) {
    case "likert": {
      const val = Number(rawAnswer);
      if (isNaN(val)) return String(rawAnswer);
      const label = isZh ? LIKERT_LABELS_ZH[val] : isKo ? LIKERT_LABELS_KO[val] : LIKERT_LABELS[val];
      return label ? `${val} — ${label}` : String(val);
    }
    case "yes_no":
      return rawAnswer === true || rawAnswer === "true" || rawAnswer === 1 ? "Yes" : "No";
    case "checkbox_group":
      if (Array.isArray(rawAnswer)) return rawAnswer.join(", ") || "—";
      return String(rawAnswer);
    case "frequency_grid": {
      if (typeof rawAnswer === "object" && rawAnswer !== null) {
        return Object.entries(rawAnswer as Record<string, unknown>)
          .map(([row, val]) => {
            const rowQ = question.rows?.find(r => r.id === row);
            const label = rowQ ? (isZh ? (rowQ.textChinese ?? rowQ.text) : isKo ? (rowQ.textKorean ?? rowQ.text) : rowQ.text) : row;
            return `${label}: ${val}`;
          })
          .join(" | ");
      }
      return String(rawAnswer);
    }
    case "signature":
      if (rawAnswer && String(rawAnswer).length > 10) return "Signature provided";
      return "—";
    case "date":
      if (!rawAnswer) return "—";
      try { return new Date(String(rawAnswer)).toLocaleDateString(); } catch { return String(rawAnswer); }
    default:
      return String(rawAnswer);
  }
}

function getQuestionText(q: FormQuestion, language: string): string {
  if (language === "mandarin" || language === "cantonese") return q.textChinese ?? q.text;
  if (language === "korean") return q.textKorean ?? q.text;
  return q.text;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function getLangLabel(lang: string) {
  if (lang === "mandarin") return "Mandarin";
  if (lang === "cantonese") return "Cantonese";
  if (lang === "korean") return "Korean";
  return "English";
}

function getRespondentTypeLabel(type: string) {
  const map: Record<string, string> = {
    parent: "Parent / Guardian",
    teacher: "Teacher",
    self: "Student Self-Report",
    clinician: "Clinician",
  };
  return map[type] ?? type;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

async function fetchResponse(caseId: string, assignmentId: string): Promise<ResponseData> {
  const token = localStorage.getItem("raos_token");
  const res = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/response`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Failed to load response");
  }
  return res.json();
}

let itemCounter = 0;

function QuestionRow({ question, answers, language, depth = 0 }: {
  question: FormQuestion;
  answers: Record<string, unknown>;
  language: string;
  depth?: number;
}) {
  if (question.type === "section_header") {
    return (
      <div className={`mt-6 mb-2 pb-1 border-b border-slate-200 print:mt-4 ${depth > 0 ? "ml-4" : ""}`}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{getQuestionText(question, language)}</p>
      </div>
    );
  }
  itemCounter += 1;
  const num = itemCounter;
  const answer = answers[question.id];
  const displayAnswer = formatAnswer(question, answer, language);
  const unanswered = !answer && answer !== 0 && answer !== false;
  return (
    <div className={`py-3 border-b border-slate-100 last:border-0 flex gap-4 ${depth > 0 ? "ml-4" : ""}`}>
      <span className="text-slate-400 text-sm font-mono w-6 flex-shrink-0 pt-0.5">{num}.</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 font-medium mb-1">{getQuestionText(question, language)}</p>
        {question.note && <p className="text-xs text-slate-400 italic mb-1">{question.note}</p>}
        <p className={`text-sm font-semibold ${unanswered ? "text-slate-300 italic" : "text-slate-900"}`}>
          {displayAnswer}
        </p>
        {question.type === "frequency_grid" && question.rows && (
          <div className="mt-2 space-y-1">
            {question.rows.map(row => {
              const rowAnswer = (answer as Record<string, unknown> | undefined)?.[row.id];
              return (
                <div key={row.id} className="flex gap-2 text-xs">
                  <span className="text-slate-500 flex-1">{getQuestionText(row, language)}</span>
                  <span className="font-medium text-slate-800">
                    {rowAnswer !== undefined && rowAnswer !== null && rowAnswer !== "" ? String(rowAnswer) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResponseViewer() {
  const params = useParams();
  const caseId = params.id as string;
  const assignmentId = params.assignmentId as string;

  const { data, isLoading, isError, error } = useQuery<ResponseData, Error>({
    queryKey: ["assignment-response", caseId, assignmentId],
    queryFn: () => fetchResponse(caseId, assignmentId),
  });

  // AI Summary state
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Scoring state
  const [score, setScore] = useState<ScoreRecord | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const scoreRef = useRef<HTMLDivElement>(null);

  // Manual scoring form state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualRawScore, setManualRawScore] = useState("");
  const [manualDomainScores, setManualDomainScores] = useState<Record<string, string>>({});
  const [manualNotes, setManualNotes] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.response.summary) setSummary(data.response.summary);
  }, [data?.response.summary]);

  useEffect(() => {
    if (data?.existingScore) {
      setScore(data.existingScore);
      if (data.existingScore.isManual) {
        setManualRawScore(String(data.existingScore.rawScore ?? ""));
        const domainStrings: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.existingScore.domainScores)) {
          domainStrings[k] = String(v);
        }
        setManualDomainScores(domainStrings);
        setManualNotes(data.existingScore.notes ?? "");
      }
    }
  }, [data?.existingScore]);

  useEffect(() => {
    if (!data) return;
    const prev = document.title;
    document.title = `${data.assignment.toolName} — ${data.studentName} — ReMynd`;
    return () => { document.title = prev; };
  }, [data]);

  async function handleGenerateSummary() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const token = localStorage.getItem("raos_token");
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/response/summary`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Failed to generate summary");
      }
      const json = await res.json() as { summary: string };
      setSummary(json.summary);
      setTimeout(() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCalculateScore() {
    setIsScoring(true);
    setScoreError(null);
    try {
      const token = localStorage.getItem("raos_token");
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/score`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Failed to calculate score");
      }
      const json = await res.json() as ScoreRecord;
      setScore(json);
      setTimeout(() => scoreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setScoreError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsScoring(false);
    }
  }

  async function handleSaveManualScore() {
    if (!data) return;
    setIsSavingManual(true);
    setManualError(null);
    try {
      const token = localStorage.getItem("raos_token");
      const domainScores: Record<string, number> = {};
      for (const [k, v] of Object.entries(manualDomainScores)) {
        const n = parseFloat(v);
        if (!isNaN(n)) domainScores[k] = n;
      }
      const rawScore = parseFloat(manualRawScore);
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/scores/manual`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          toolId: data.assignment.toolId,
          toolName: data.assignment.toolName,
          respondentType: data.assignment.respondentType,
          rawScore: isNaN(rawScore) ? null : rawScore,
          domainScores,
          notes: manualNotes || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Failed to save scores");
      }
      const json = await res.json() as ScoreRecord;
      setScore(json);
      setShowManualForm(false);
      setTimeout(() => scoreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setIsSavingManual(false);
    }
  }

  function handlePrintSummaryOnly() {
    document.body.classList.add("print-summary-only");
    window.print();
    document.body.classList.remove("print-summary-only");
  }

  function handlePrintScoreOnly() {
    document.body.classList.add("print-score-only");
    window.print();
    document.body.classList.remove("print-score-only");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-6 bg-red-50 rounded-xl text-red-700 text-sm">
        {error?.message ?? "Could not load response."}
      </div>
    );
  }

  const { assignment, response, questions, studentName, school, grade, scoringType, toolDomains } = data;
  const lang = response.language;
  const isAutoScored = scoringType === "auto";
  const isManuallyScored = scoringType === "manual";

  itemCounter = 0;

  return (
    <>
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          .print-page { box-shadow: none !important; border: none !important; }
          body { background: white !important; }
        }
        @media print {
          body.print-summary-only .print-qa-card { display: none !important; }
          body.print-summary-only .print-score-card { display: none !important; }
          body.print-summary-only .print-hide { display: none !important; }
        }
        @media print {
          body.print-score-only .print-qa-card { display: none !important; }
          body.print-score-only .print-summary-card { display: none !important; }
          body.print-score-only .print-hide { display: none !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* Toolbar */}
        <div className="flex items-center justify-between print-hide">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
              <ArrowLeft size={16} /> Back to Case
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* AI Summary — INTAKE only */}
            {assignment.toolId === "INTAKE" && summary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="gap-2 text-violet-600 hover:text-violet-700"
              >
                <Sparkles size={14} /> View Summary
              </Button>
            )}
            {assignment.toolId === "INTAKE" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={isGenerating}
                className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                {isGenerating
                  ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
                  : <><Sparkles size={14} /> {summary ? "Regenerate" : "Generate Summary"}</>}
              </Button>
            )}

            {/* System Scored tools */}
            {isAutoScored && score && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scoreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="gap-2 text-indigo-600 hover:text-indigo-700"
              >
                <TrendingUp size={14} /> View Score
              </Button>
            )}
            {isAutoScored && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCalculateScore}
                disabled={isScoring}
                className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                {isScoring
                  ? <><RefreshCw size={14} className="animate-spin" /> Calculating…</>
                  : <><BarChart2 size={14} /> {score ? "Recalculate" : "Calculate Score"}</>}
              </Button>
            )}

            {/* Externally Scored tools */}
            {isManuallyScored && score && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => scoreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="gap-2 text-indigo-600 hover:text-indigo-700"
              >
                <TrendingUp size={14} /> View Score
              </Button>
            )}
            {isManuallyScored && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowManualForm(v => !v)}
                className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <ClipboardList size={14} />
                {score ? "Update Scores" : "Enter Scores"}
                {showManualForm ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </Button>
            )}

            <Button onClick={() => window.print()} className="gap-2 shadow-md shadow-primary/20">
              <Printer size={16} /> Print / Download PDF
            </Button>
          </div>
        </div>

        {/* Report Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden print-page print-qa-card">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-7 print:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold leading-tight mb-1 text-white">{assignment.toolName}</h1>
                <p className="text-slate-300 text-base mb-4">
                  {getRespondentTypeLabel(assignment.respondentType)} — {studentName}
                </p>
                <div className="flex items-center gap-2">
                  <img src="/images/remynd-logo.png" alt="ReMynd" className="w-5 h-5 object-contain opacity-70" />
                  <span className="text-slate-400 text-xs font-medium tracking-wide">ReMynd Assessment System · Completed Response</span>
                </div>
              </div>
              <Badge className="bg-emerald-500 text-white border-0 text-xs px-3 py-1 flex-shrink-0">Submitted</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-b border-slate-100 bg-slate-50/60">
            <div className="px-5 py-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><User size={10} /> Student</p>
              <p className="text-sm font-semibold text-slate-800">{studentName}</p>
              {(school || grade) && (
                <p className="text-xs text-slate-500 mt-0.5">{[school, grade ? `Grade ${grade}` : ""].filter(Boolean).join(" · ")}</p>
              )}
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><FileText size={10} /> Respondent</p>
              <p className="text-sm font-semibold text-slate-800">{getRespondentTypeLabel(assignment.respondentType)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{assignment.respondentLabel}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={10} /> Submitted</p>
              <p className="text-sm font-semibold text-slate-800">{formatDate(response.submittedAt)}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Globe size={10} /> Language</p>
              <p className="text-sm font-semibold text-slate-800">{getLangLabel(lang)}</p>
            </div>
          </div>

          <div className="px-8 py-6">
            {questions.length === 0 ? (
              <p className="text-slate-400 text-sm italic py-8 text-center">No question data available for this tool.</p>
            ) : (
              <div>
                {questions.map(q => (
                  <QuestionRow key={q.id} question={q} answers={response.answers} language={lang} />
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-8 py-4 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400">
            <span>Response ID: {response.id}</span>
            <span>ReMynd Assessment Operating System</span>
          </div>
        </div>

        {/* Error states */}
        {generateError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-5 py-3 rounded-xl print-hide">
            {generateError}
          </div>
        )}
        {scoreError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-5 py-3 rounded-xl print-hide">
            {scoreError}
          </div>
        )}

        {/* Manual Score Entry Form */}
        {isManuallyScored && showManualForm && (
          <div className="bg-white rounded-2xl shadow-md border border-indigo-100 overflow-hidden print-hide">
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex items-center gap-3">
              <ClipboardList size={16} className="text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-indigo-900">{score ? "Update Recorded Scores" : "Enter Recorded Scores"}</h3>
                <p className="text-xs text-indigo-600 mt-0.5">Enter the scores calculated externally by the psychometrician.</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">Overall Raw Score</label>
                  <input
                    type="number"
                    step="0.1"
                    value={manualRawScore}
                    onChange={e => setManualRawScore(e.target.value)}
                    placeholder="e.g. 3.5"
                    className="w-full h-9 border border-input rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  />
                </div>
              </div>

              {toolDomains.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Domain Scores</label>
                  <div className="grid grid-cols-2 gap-3">
                    {toolDomains.map(domain => (
                      <div key={domain}>
                        <label className="text-xs text-slate-500 block mb-1">{capitalize(domain)}</label>
                        <input
                          type="number"
                          step="0.1"
                          value={manualDomainScores[domain] ?? ""}
                          onChange={e => setManualDomainScores(prev => ({ ...prev, [domain]: e.target.value }))}
                          placeholder="0.0"
                          className="w-full h-9 border border-input rounded-md px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">Notes (optional)</label>
                <textarea
                  value={manualNotes}
                  onChange={e => setManualNotes(e.target.value)}
                  rows={2}
                  placeholder="Clinician notes or scoring context…"
                  className="w-full border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                />
              </div>

              {manualError && (
                <p className="text-red-600 text-xs">{manualError}</p>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowManualForm(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveManualScore}
                  disabled={isSavingManual}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                  {isSavingManual ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : "Save Scores"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AI-Generated Summary */}
        {summary && (
          <div ref={summaryRef} className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden print-page print-summary-card">
            <div className="bg-gradient-to-r from-violet-900 to-violet-800 px-8 py-5">
              <div className="flex items-center gap-3">
                <Sparkles size={18} className="text-violet-300" />
                <div>
                  <h2 className="text-lg font-bold text-white">AI-Generated Summary</h2>
                  <p className="text-violet-300 text-xs mt-0.5">Parent Intake — {studentName} · Generated by ReMynd AI</p>
                </div>
              </div>
            </div>
            <div className="px-8 py-7">
              <div className="space-y-0">
                {summary.split("\n").map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return <div key={i} className="h-3" />;
                  if (trimmed === trimmed.toUpperCase() && trimmed.length > 4 && !trimmed.endsWith(".")) {
                    return <h2 key={i} className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-6 mb-1 border-b border-slate-200 pb-1">{trimmed}</h2>;
                  }
                  if (/^[A-Z][a-z].{0,50}:$/.test(trimmed)) {
                    return <h3 key={i} className="text-sm font-semibold text-slate-800 mt-4 mb-1">{trimmed}</h3>;
                  }
                  return <p key={i} className="text-sm text-slate-700 leading-relaxed">{trimmed}</p>;
                })}
              </div>
            </div>
            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">AI-assisted narrative — for clinical use only</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintSummaryOnly}
                className="print-hide gap-2 text-xs h-8 border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                <Printer size={13} /> Download Summary PDF
              </Button>
            </div>
          </div>
        )}

        {/* Score Card — shown for both auto and manual scored tools */}
        {score && (
          <div ref={scoreRef} className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden print-page print-score-card">
            <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 px-8 py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <BarChart2 size={18} className="text-indigo-300" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-white">Score Report</h2>
                      {score.isManual && (
                        <span className="text-xs bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                          Manual Entry
                        </span>
                      )}
                    </div>
                    <p className="text-indigo-300 text-xs mt-0.5">
                      {assignment.toolName} — {studentName} · {getRespondentTypeLabel(assignment.respondentType)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-indigo-300 text-xs uppercase tracking-wider mb-0.5">Raw Score</p>
                  <p className="text-white text-3xl font-bold leading-none">
                    {score.rawScore != null ? score.rawScore.toFixed(1) : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-8 py-6">
              {Object.keys(score.domainScores).length === 0 ? (
                <p className="text-slate-400 text-sm italic text-center py-4">
                  No domain scores recorded. {score.isManual ? "Edit scores to add domain data." : "Ensure the form contains scored items."}
                </p>
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Domain Breakdown</p>
                  <div className="space-y-3">
                    {Object.entries(score.domainScores).map(([domain, val]) => {
                      const normalized = score.normalizedScores[domain] ?? 0;
                      return (
                        <div key={domain}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-700">{capitalize(domain)}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400">{val.toFixed(1)} avg</span>
                              <span className="text-sm font-bold text-indigo-700 w-10 text-right">{normalized}</span>
                            </div>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full transition-all"
                              style={{ width: `${Math.min(normalized, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-400 mt-4">
                    Scores shown as domain average (left) and normalized 0–100 scale (right).
                  </p>
                </>
              )}

              {score.notes && (
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Clinician Notes</p>
                  <p className="text-sm text-slate-700">{score.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-6 py-3 bg-slate-50/50 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {score.isManual ? "Manually recorded" : "Scored"} {formatDate(score.generatedAt)} · ReMynd Assessment Operating System
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePrintScoreOnly}
                className="print-hide gap-2 text-xs h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <Printer size={13} /> Download Score PDF
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
