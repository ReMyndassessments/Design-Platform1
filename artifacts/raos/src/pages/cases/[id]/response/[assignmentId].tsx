import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, User, Calendar, Globe, FileText } from "lucide-react";

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
  };
  questions: FormQuestion[];
  studentName: string;
  school: string;
  grade: string;
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
    case "checkbox_group": {
      if (Array.isArray(rawAnswer)) return rawAnswer.join(", ") || "—";
      return String(rawAnswer);
    }
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
  } catch {
    return iso;
  }
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

function QuestionRow({ question, answers, language, depth = 0 }: { question: FormQuestion; answers: Record<string, unknown>; language: string; depth?: number }) {
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
        {question.note && (
          <p className="text-xs text-slate-400 italic mb-1">{question.note}</p>
        )}
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
                  <span className="font-medium text-slate-800">{rowAnswer !== undefined && rowAnswer !== null && rowAnswer !== "" ? String(rowAnswer) : "—"}</span>
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

  useEffect(() => {
    if (!data) return;
    const prev = document.title;
    document.title = `${data.assignment.toolName} — ${data.studentName} — ReMynd`;
    return () => { document.title = prev; };
  }, [data]);

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

  const { assignment, response, questions, studentName, school, grade } = data;
  const lang = response.language;

  itemCounter = 0;

  return (
    <>
      <style>{`
        @media print {
          .print-hide { display: none !important; }
          .print-page { box-shadow: none !important; border: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6 pb-16">
        {/* Toolbar — hidden when printing */}
        <div className="flex items-center justify-between print-hide">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="sm" className="gap-2 text-slate-600">
              <ArrowLeft size={16} /> Back to Case
            </Button>
          </Link>
          <Button onClick={() => window.print()} className="gap-2 shadow-md shadow-primary/20">
            <Printer size={16} /> Print / Download PDF
          </Button>
        </div>

        {/* Report Card */}
        <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden print-page">

          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-7 print:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-bold font-display leading-tight mb-1">{assignment.toolName}</h1>
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

          {/* Meta strip */}
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

          {/* Questions & Answers */}
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

          {/* Footer */}
          <div className="border-t border-slate-100 px-8 py-4 bg-slate-50/50 flex items-center justify-between text-xs text-slate-400">
            <span>Response ID: {response.id}</span>
            <span>ReMynd Assessment Operating System</span>
          </div>
        </div>
      </div>
    </>
  );
}
