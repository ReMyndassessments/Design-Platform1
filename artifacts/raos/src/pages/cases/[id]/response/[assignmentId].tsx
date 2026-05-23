import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, User, Calendar, Globe, FileText, Sparkles, RefreshCw, BarChart2, TrendingUp, ClipboardList, ChevronDown, ChevronUp, Languages } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis, Cell, CartesianGrid } from "recharts";

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

interface ScoringConfigDomain {
  label: string;
  shortLabel: string;
  narratives: { low: string; mild: string; moderate: string; elevated: string };
}

interface ScoringConfig {
  max: number;
  thresholds: { low: number; mild: number; moderate: number };
  domains: Record<string, ScoringConfigDomain>;
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
  scoringConfig: ScoringConfig | null;
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
    case "signature": {
      const sig = String(rawAnswer).trim();
      if (sig.length > 0) return sig;
      return "—";
    }
    case "date": {
      if (!rawAnswer) return "—";
      const s = String(rawAnswer);
      // Parse YYYY-MM-DD without timezone conversion (avoid off-by-one from UTC parsing)
      const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [, y, m, d] = match;
        return `${parseInt(m)}/${parseInt(d)}/${y}`;
      }
      try { return new Date(s).toLocaleDateString(); } catch { return s; }
    }
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

// ─── Domain Configuration ─────────────────────────────────────────────────────

interface DomainInfo {
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  narratives: { max: number; text: string }[];
}

// Palette for dynamic domain colors (cycles through if more domains than colors)
const DOMAIN_COLORS = [
  "#6366f1", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6",
  "#0ea5e9", "#f97316", "#14b8a6", "#ec4899", "#84cc16",
];

// Map old individual question-ID keys (from legacy scoring bug) → proper domain
const QUESTION_TO_DOMAIN: Record<string, string> = {
  bm1: "behavioral_modulation", bm2: "behavioral_modulation", bm3: "behavioral_modulation",
  bm4: "behavioral_modulation", bm5: "behavioral_modulation", bm6: "behavioral_modulation",
  bm7: "behavioral_modulation", bm8: "behavioral_modulation",
  di1: "distractibility", di2: "distractibility", di3: "distractibility",
  di4: "distractibility", di5: "distractibility", di6: "distractibility",
  di7: "distractibility", di8: "distractibility",
  ir1: "impulse_regulation", ir2: "impulse_regulation", ir3: "impulse_regulation",
  ir4: "impulse_regulation", ir5: "impulse_regulation", ir6: "impulse_regulation",
  ir7: "impulse_regulation", ir8: "impulse_regulation",
  ti1: "task_initiation", ti2: "task_initiation", ti3: "task_initiation",
  ti4: "task_initiation", ti5: "task_initiation", ti6: "task_initiation",
  ti7: "task_initiation", ti8: "task_initiation",
  sa1: "sustained_attention", sa2: "sustained_attention", sa3: "sustained_attention",
  sa4: "sustained_attention", sa5: "sustained_attention", sa6: "sustained_attention",
  sa7: "sustained_attention", sa8: "sustained_attention",
};

/** Re-groups legacy per-question domain scores into proper subscale averages.
 *  If a scoringConfig is provided, uses its domain keys as canonical names. */
function resolveDomainScores(
  domainScores: Record<string, number | null>,
  normalizedScores: Record<string, number | null>,
  scoringConfig?: ScoringConfig | null,
): { domains: Record<string, number>; normalized: Record<string, number> } {
  const canonicalDomains = scoringConfig ? Object.keys(scoringConfig.domains) : [];
  const resolved: Record<string, number[]> = {};
  const resolvedNorm: Record<string, number[]> = {};

  for (const [key, val] of Object.entries(domainScores)) {
    const norm = normalizedScores[key];
    if (canonicalDomains.includes(key) || (!scoringConfig && !QUESTION_TO_DOMAIN[key.toLowerCase()])) {
      if (!resolved[key]) { resolved[key] = []; resolvedNorm[key] = []; }
      if (typeof val === "number" && isFinite(val)) resolved[key].push(val);
      if (typeof norm === "number" && isFinite(norm)) resolvedNorm[key].push(norm);
    } else {
      const lowerKey = key.toLowerCase();
      const mapped = QUESTION_TO_DOMAIN[lowerKey];
      if (mapped) {
        if (!resolved[mapped]) { resolved[mapped] = []; resolvedNorm[mapped] = []; }
        if (typeof val === "number" && isFinite(val)) resolved[mapped].push(val);
        if (typeof norm === "number" && isFinite(norm)) resolvedNorm[mapped].push(norm);
      } else {
        if (!resolved[key]) { resolved[key] = []; resolvedNorm[key] = []; }
        if (typeof val === "number" && isFinite(val)) resolved[key].push(val);
        if (typeof norm === "number" && isFinite(norm)) resolvedNorm[key].push(norm);
      }
    }
  }

  const domains: Record<string, number> = {};
  const normalized: Record<string, number> = {};
  for (const [d, vals] of Object.entries(resolved)) {
    if (vals.length > 0) {
      domains[d] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    }
  }
  for (const [d, vals] of Object.entries(resolvedNorm)) {
    if (vals.length > 0) {
      normalized[d] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
  }
  return { domains, normalized };
}

function getDomainInfo(key: string, scoringConfig?: ScoringConfig | null, colorIndex?: number): DomainInfo {
  const cfgDomain = scoringConfig?.domains[key];
  if (cfgDomain) {
    const thresholds = scoringConfig!.thresholds;
    const color = DOMAIN_COLORS[(colorIndex ?? 0) % DOMAIN_COLORS.length];
    return {
      label: cfgDomain.label,
      shortLabel: cfgDomain.shortLabel,
      description: "",
      color,
      narratives: [
        { max: thresholds.low, text: cfgDomain.narratives.low },
        { max: thresholds.mild, text: cfgDomain.narratives.mild },
        { max: thresholds.moderate, text: cfgDomain.narratives.moderate },
        { max: 100, text: cfgDomain.narratives.elevated },
      ],
    };
  }
  // Fallback: convert snake_case to Title Case
  const label = key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const color = DOMAIN_COLORS[(colorIndex ?? 0) % DOMAIN_COLORS.length];
  return {
    label,
    shortLabel: label,
    description: "",
    color,
    narratives: [
      { max: 25, text: "Scores in the low range suggest minimal difficulty in this area." },
      { max: 50, text: "Scores in the low-moderate range suggest some difficulty; monitoring recommended." },
      { max: 65, text: "Scores in the moderate range indicate notable difficulty in this area." },
      { max: 100, text: "Scores in the elevated range indicate significant difficulty warranting clinical attention." },
    ],
  };
}

function getSeverity(
  normalized: number,
  thresholds?: { low: number; mild: number; moderate: number },
): { label: string; color: string; bg: string; border: string } {
  const low = thresholds?.low ?? 25;
  const mild = thresholds?.mild ?? 50;
  const moderate = thresholds?.moderate ?? 65;
  if (normalized <= low) return { label: "Low", color: "text-emerald-700", bg: "bg-emerald-500", border: "border-emerald-200" };
  if (normalized <= mild) return { label: "Mild", color: "text-sky-700", bg: "bg-sky-500", border: "border-sky-200" };
  if (normalized <= moderate) return { label: "Moderate", color: "text-amber-700", bg: "bg-amber-500", border: "border-amber-200" };
  return { label: "Elevated", color: "text-red-700", bg: "bg-red-500", border: "border-red-200" };
}

function getNarrative(info: DomainInfo, normalized: number): string {
  for (const n of info.narratives) {
    if (normalized <= n.max) return n.text;
  }
  return info.narratives[info.narratives.length - 1]?.text ?? "";
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

function QuestionRow({ question, answers, language, depth = 0, itemNumber }: {
  question: FormQuestion;
  answers: Record<string, unknown>;
  language: string;
  depth?: number;
  itemNumber?: number;
}) {
  if (question.type === "section_header") {
    return (
      <div className={`mt-6 mb-2 pb-1 border-b border-slate-200 print:mt-4 ${depth > 0 ? "ml-4" : ""}`}>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{getQuestionText(question, language)}</p>
      </div>
    );
  }
  const num = itemNumber;
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

  // Translation state
  const [viewInEnglish, setViewInEnglish] = useState(false);
  const [translatedAnswers, setTranslatedAnswers] = useState<Record<string, string> | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (translatedAnswers) { setViewInEnglish(v => !v); return; }
    setIsTranslating(true);
    setTranslateError(null);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${assignmentId}/response/translate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) throw new Error("Translation failed");
      const { translatedAnswers: ta } = await r.json() as { translatedAnswers: Record<string, string> };
      setTranslatedAnswers(ta);
      setViewInEnglish(true);
    } catch {
      setTranslateError("Could not translate — please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

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
    // Use the score ID (a stable primitive) as the dependency so this only
    // runs when a genuinely different score record arrives, not on every
    // background refetch that creates a new object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.existingScore?.id]);

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

  function handlePrintRawOnly() {
    document.body.classList.add("print-raw-only");
    window.print();
    document.body.classList.remove("print-raw-only");
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

  const { assignment, response, questions, studentName, school, grade, scoringType, toolDomains, scoringConfig } = data;
  const lang = response.language;

  // When viewing in English, override language + merge translated free-text answers
  const effectiveLang = viewInEnglish ? "english" : lang;
  const effectiveAnswers: Record<string, unknown> = viewInEnglish && translatedAnswers
    ? { ...response.answers, ...translatedAnswers }
    : response.answers;
  const isAutoScored = scoringType === "auto";
  const isManuallyScored = scoringType === "manual";

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
        @media print {
          body.print-raw-only .print-score-card { display: none !important; }
          body.print-raw-only .print-summary-card { display: none !important; }
          body.print-raw-only .print-hide { display: none !important; }
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
            {/* AI Summary — INTAKE and BEHAVOBS */}
            {(assignment.toolId === "INTAKE" || assignment.toolId === "BEHAVOBS") && summary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="gap-2 text-violet-600 hover:text-violet-700"
              >
                <Sparkles size={14} /> View Summary
              </Button>
            )}
            {(assignment.toolId === "INTAKE" || assignment.toolId === "BEHAVOBS") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={isGenerating}
                className="gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
              >
                {isGenerating
                  ? <><RefreshCw size={14} className="animate-spin" /> Generating…</>
                  : <><Sparkles size={14} /> {summary
                      ? (assignment.toolId === "BEHAVOBS" ? "Regenerate Observation Summary" : "Regenerate")
                      : (assignment.toolId === "BEHAVOBS" ? "Generate Observation Summary" : "Generate Summary")
                    }</>}
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

            {/* Translate to English — shown only for non-English responses */}
            {lang !== "english" && (
              <Button
                variant={viewInEnglish ? "default" : "outline"}
                size="sm"
                onClick={handleTranslate}
                disabled={isTranslating}
                className={viewInEnglish
                  ? "gap-2 bg-amber-600 hover:bg-amber-700 text-white border-0"
                  : "gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"}
              >
                {isTranslating
                  ? <><RefreshCw size={14} className="animate-spin" /> Translating…</>
                  : <><Languages size={14} /> {viewInEnglish ? "Viewing in English" : "View in English"}</>}
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
                {(() => {
                  let n = 0;
                  return questions.map(q => {
                    const isHeader = q.type === "section_header";
                    if (!isHeader) n++;
                    return (
                      <QuestionRow
                        key={q.id}
                        question={q}
                        answers={effectiveAnswers}
                        language={effectiveLang}
                        itemNumber={isHeader ? undefined : n}
                      />
                    );
                  });
                })()}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-8 py-4 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400">
            <span>Response ID: {response.id}</span>
            <div className="flex items-center gap-2">
              {score && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrintRawOnly}
                  className="print-hide gap-2 text-xs h-8 border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  <Printer size={13} /> Download Raw Responses PDF
                </Button>
              )}
              <span>ReMynd Assessment Operating System</span>
            </div>
          </div>
        </div>

        {/* Error states */}
        {translateError && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-5 py-3 rounded-xl print-hide">
            {translateError}
          </div>
        )}
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

        {/* Score Card — rich report with charts and narratives (not shown for BEHAVOBS which uses narrative summary instead) */}
        {score && assignment.toolId !== "BEHAVOBS" && (() => {
          const { domains: resolvedDomains, normalized: resolvedNorm } = resolveDomainScores(
            score.domainScores as Record<string, number | null>,
            score.normalizedScores as Record<string, number | null>,
            scoringConfig,
          );
          const domainEntries = Object.entries(resolvedDomains);
          const hasDomains = domainEntries.length > 0;

          // Radar chart data
          const radarData = domainEntries.map(([key], idx) => ({
            domain: getDomainInfo(key, scoringConfig, idx).shortLabel || capitalize(key.replace(/_/g, " ")),
            score: resolvedNorm[key] ?? 0,
            fullMark: 100,
          }));

          // Bar chart data
          const barData = domainEntries.map(([key, val], idx) => ({
            key,
            label: getDomainInfo(key, scoringConfig, idx).label || capitalize(key.replace(/_/g, " ")),
            short: getDomainInfo(key, scoringConfig, idx).shortLabel || capitalize(key.replace(/_/g, " ")),
            score: resolvedNorm[key] ?? 0,
            raw: val,
            color: getDomainInfo(key, scoringConfig, idx).color,
          }));

          // Overall interpretation
          const avgNorm = hasDomains
            ? Math.round(Object.values(resolvedNorm).reduce((a, b) => a + b, 0) / Object.values(resolvedNorm).length)
            : null;
          const thresholds = scoringConfig?.thresholds;
          const overallSeverity = avgNorm !== null ? getSeverity(avgNorm, thresholds) : null;

          return (
            <div ref={scoreRef} className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden print-page print-score-card">
              {/* Header */}
              <div className="bg-gradient-to-br from-indigo-950 via-indigo-900 to-indigo-800 px-8 py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <BarChart2 size={20} className="text-indigo-300 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-white">Score Report</h2>
                        {score.isManual && (
                          <span className="text-xs bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2 py-0.5 rounded-full font-medium">
                            Manual Entry
                          </span>
                        )}
                      </div>
                      <p className="text-indigo-300 text-sm mt-0.5">
                        {assignment.toolName} — {studentName} · {getRespondentTypeLabel(assignment.respondentType)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-indigo-400 text-xs uppercase tracking-wider mb-1">Overall Average</p>
                    <p className="text-white text-4xl font-bold leading-none">
                      {avgNorm !== null ? avgNorm : score.rawScore != null ? score.rawScore.toFixed(1) : "—"}
                    </p>
                    {avgNorm !== null && (
                      <p className="text-indigo-300 text-xs mt-1">/ 100</p>
                    )}
                    {overallSeverity && (
                      <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded-full ${
                        avgNorm! <= (thresholds?.low ?? 25) ? "bg-emerald-500/20 text-emerald-300" :
                        avgNorm! <= (thresholds?.mild ?? 50) ? "bg-sky-500/20 text-sky-300" :
                        avgNorm! <= (thresholds?.moderate ?? 65) ? "bg-amber-500/20 text-amber-300" :
                        "bg-red-500/20 text-red-300"
                      }`}>
                        {overallSeverity.label} Range
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {!hasDomains ? (
                  <p className="text-slate-400 text-sm italic text-center py-4">
                    No domain scores recorded. {score.isManual ? "Edit scores to add domain data." : "Resubmit the form to generate scores."}
                  </p>
                ) : (
                  <>
                    {/* Severity Legend */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="text-slate-500 font-medium mr-1">Severity:</span>
                      {(() => {
                        const t = scoringConfig?.thresholds ?? { low: 25, mild: 50, moderate: 65 };
                        return [
                          { label: `Low (0–${t.low})`, bg: "bg-emerald-500" },
                          { label: `Mild (${t.low + 1}–${t.mild})`, bg: "bg-sky-500" },
                          { label: `Moderate (${t.mild + 1}–${t.moderate})`, bg: "bg-amber-500" },
                          { label: `Elevated (${t.moderate + 1}+)`, bg: "bg-red-500" },
                        ].map(({ label, bg }) => (
                          <span key={label} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5">
                            <span className={`w-2 h-2 rounded-full ${bg}`} />
                            {label}
                          </span>
                        ));
                      })()}
                    </div>

                    {/* Charts row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Radar chart */}
                      {radarData.length >= 3 && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Profile Overview</p>
                          <ResponsiveContainer width="100%" height={280}>
                            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis
                                dataKey="domain"
                                tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
                              />
                              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                              <Radar
                                name="Score"
                                dataKey="score"
                                stroke="#6366f1"
                                fill="#6366f1"
                                fillOpacity={0.2}
                                strokeWidth={2}
                              />
                              <ReTooltip
                                formatter={(value: number) => [`${value}/100`, "Score"]}
                                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Bar chart */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Domain Scores</p>
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart
                            data={barData}
                            layout="vertical"
                            margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                            <YAxis
                              type="category"
                              dataKey="short"
                              width={90}
                              tick={{ fontSize: 11, fill: "#475569", fontWeight: 500 }}
                            />
                            <ReTooltip
                              formatter={(value: number, _name: string, props: { payload?: { label: string; raw: number } }) => [
                                `${value}/100 (avg ${props.payload?.raw?.toFixed(1) ?? "—"})`,
                                props.payload?.label ?? "",
                              ]}
                              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                            />
                            <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={20}>
                              {barData.map((entry) => {
                                const t = scoringConfig?.thresholds ?? { low: 25, mild: 50, moderate: 65 };
                                return (
                                  <Cell
                                    key={entry.key}
                                    fill={
                                      entry.score <= t.low ? "#10b981" :
                                      entry.score <= t.mild ? "#0ea5e9" :
                                      entry.score <= t.moderate ? "#f59e0b" :
                                      "#ef4444"
                                    }
                                  />
                                );
                              })}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Domain detail rows */}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Domain Breakdown & Interpretation</p>
                      <div className="space-y-5">
                        {domainEntries.map(([key, rawVal], idx) => {
                          const norm = resolvedNorm[key] ?? 0;
                          const info = getDomainInfo(key, scoringConfig, idx);
                          const sev = getSeverity(norm, thresholds);
                          const narrative = getNarrative(info, norm);
                          return (
                            <div key={key} className={`rounded-xl border p-4 ${sev.border} bg-white`}>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-slate-800">{info.label || capitalize(key.replace(/_/g, " "))}</span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sev.border} ${sev.color} bg-white`}>
                                      {sev.label}
                                    </span>
                                  </div>
                                  {info.description && (
                                    <p className="text-xs text-slate-400 mt-0.5">{info.description}</p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className={`text-2xl font-bold ${sev.color}`}>{norm}</span>
                                  <span className="text-xs text-slate-400 ml-0.5">/100</span>
                                  <p className="text-xs text-slate-400 mt-0.5">avg {rawVal.toFixed(1)}</p>
                                </div>
                              </div>
                              {/* Progress bar */}
                              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                                <div
                                  className={`h-full rounded-full transition-all ${sev.bg}`}
                                  style={{ width: `${Math.min(norm, 100)}%` }}
                                />
                              </div>
                              {/* Narrative */}
                              {narrative && (
                                <p className="text-xs text-slate-600 leading-relaxed">{narrative}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Interpretive Report */}
                    {avgNorm !== null && overallSeverity && (() => {
                      const low = thresholds?.low ?? 25;
                      const mild = thresholds?.mild ?? 50;
                      const moderate = thresholds?.moderate ?? 65;

                      const overallNarrative = avgNorm <= low
                        ? `Overall, ${studentName}'s profile reflects scores in the Low range across most domains assessed. The pattern of responses does not indicate widespread areas of concern at this time. While continued monitoring is always appropriate, these results suggest the student is generally meeting developmental and behavioral expectations as rated by this informant.`
                        : avgNorm <= mild
                        ? `Overall, ${studentName}'s profile reflects scores primarily in the Mild range. The pattern of results suggests some areas of emerging concern that may benefit from additional attention, targeted skill-building, or classroom accommodations. A follow-up conversation with the educational team is recommended to determine whether a more formal evaluation or tiered support plan is warranted.`
                        : avgNorm <= moderate
                        ? `Overall, ${studentName}'s profile reflects scores in the Moderate range across multiple domains. This pattern of results suggests that the student is experiencing meaningful challenges that are likely impacting their daily functioning in school. A comprehensive evaluation and the development of a structured support plan are strongly recommended. Results should be interpreted in the context of additional data sources, including direct observation, academic records, and family input.`
                        : `Overall, ${studentName}'s profile reflects scores in the Elevated range, indicating significant concerns across multiple functional domains. This pattern suggests the student may be experiencing substantial difficulties that require immediate attention, comprehensive evaluation, and the implementation of intensive, individualized supports. Results should be reviewed by a multidisciplinary team and integrated with all available data before conclusions are drawn or recommendations are finalized.`;

                      const elevatedDomains = domainEntries
                        .filter(([key]) => (resolvedNorm[key] ?? 0) > moderate)
                        .map(([key], idx) => getDomainInfo(key, scoringConfig, idx).label || capitalize(key.replace(/_/g, " ")));
                      const moderateDomains = domainEntries
                        .filter(([key]) => { const n = resolvedNorm[key] ?? 0; return n > mild && n <= moderate; })
                        .map(([key], idx) => getDomainInfo(key, scoringConfig, idx).label || capitalize(key.replace(/_/g, " ")));

                      const recommendationLines: string[] = [];
                      if (elevatedDomains.length > 0) {
                        recommendationLines.push(`Priority areas for evaluation and intervention include: ${elevatedDomains.join(", ")}. These domains show Elevated scores and may require the most immediate attention in planning.`);
                      }
                      if (moderateDomains.length > 0) {
                        recommendationLines.push(`Areas showing Moderate concern — including ${moderateDomains.join(", ")} — should also be addressed through targeted monitoring and structured supports.`);
                      }
                      recommendationLines.push("All findings should be interpreted within the broader context of the student's educational history, developmental background, and existing supports. This screening profile is not a diagnostic instrument and should be used as one component of a comprehensive evaluation process.");
                      recommendationLines.push("Next steps may include sharing these results with the student's educational team, obtaining consent for additional formal evaluation if warranted, and scheduling a collaborative debriefing to review findings and determine appropriate next steps.");

                      return (
                        <div className="space-y-4 border-t border-slate-100 pt-6 mt-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Interpretive Report</p>

                          {/* Overall Profile Summary */}
                          <div className={`rounded-xl border p-5 ${
                            avgNorm <= low ? "bg-emerald-50 border-emerald-200" :
                            avgNorm <= mild ? "bg-sky-50 border-sky-200" :
                            avgNorm <= moderate ? "bg-amber-50 border-amber-200" :
                            "bg-red-50 border-red-200"
                          }`}>
                            <div className="flex items-center justify-between mb-3">
                              <p className={`text-xs font-bold uppercase tracking-widest ${
                                avgNorm <= low ? "text-emerald-600" :
                                avgNorm <= mild ? "text-sky-600" :
                                avgNorm <= moderate ? "text-amber-600" :
                                "text-red-600"
                              }`}>Overall Profile Summary</p>
                              <span className={`text-xs font-semibold px-3 py-0.5 rounded-full border ${
                                avgNorm <= low ? "text-emerald-700 border-emerald-300 bg-white" :
                                avgNorm <= mild ? "text-sky-700 border-sky-300 bg-white" :
                                avgNorm <= moderate ? "text-amber-700 border-amber-300 bg-white" :
                                "text-red-700 border-red-300 bg-white"
                              }`}>
                                {overallSeverity.label} Concern · {avgNorm}/100
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-700">{overallNarrative}</p>
                          </div>

                          {/* Domain Priority Summary */}
                          {(elevatedDomains.length > 0 || moderateDomains.length > 0) && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Clinical Considerations & Priority Areas</p>
                              <div className="space-y-3">
                                {elevatedDomains.length > 0 && (
                                  <div className="flex gap-3">
                                    <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                      <strong>Elevated concern:</strong> {elevatedDomains.join(", ")}. These domains show the highest scores in this profile and are recommended priority areas for evaluation and intervention planning.
                                    </p>
                                  </div>
                                )}
                                {moderateDomains.length > 0 && (
                                  <div className="flex gap-3">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                      <strong>Moderate concern:</strong> {moderateDomains.join(", ")}. These domains warrant targeted monitoring and structured supports, even if not requiring the most intensive level of intervention at this time.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Recommended Next Steps */}
                          <div className="rounded-xl border border-slate-200 bg-white p-5">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Recommended Next Steps</p>
                            <div className="space-y-2">
                              {recommendationLines.map((line, i) => (
                                <p key={i} className="text-sm text-slate-700 leading-relaxed">{line}</p>
                              ))}
                            </div>
                            <p className="text-xs text-slate-400 mt-4 italic border-t border-slate-100 pt-3">
                              This interpretive report was generated automatically based on scored assessment data and is intended to support — not replace — clinical judgment. All findings should be interpreted by a qualified professional in the context of a comprehensive evaluation.
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}

                {score.notes && (
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Clinician Notes</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{score.notes}</p>
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
          );
        })()}
      </div>
    </>
  );
}
