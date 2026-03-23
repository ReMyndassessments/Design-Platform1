import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  text: string;
  textChinese?: string;
  textKorean?: string;
  type: string;
  options?: string[];
  optionsChinese?: string[];
  optionsKorean?: string[];
  domain: string;
  required?: boolean;
  conditionalOn?: string;
  conditionalValue?: string;
  note?: string;
  noteChinese?: string;
  noteKorean?: string;
};

function useText(q: Pick<Question, "text" | "textChinese" | "textKorean" | "note" | "noteChinese" | "noteKorean">, language: string) {
  if (language === "korean") return { label: q.textKorean ?? q.text, note: q.noteKorean ?? q.note };
  if (language === "mandarin") return { label: q.textChinese ?? q.text, note: q.noteChinese ?? q.note };
  return { label: q.text, note: q.note };
}

function useOpts(q: Question, language: string) {
  if (language === "korean" && q.optionsKorean) return q.optionsKorean;
  if (language === "mandarin" && q.optionsChinese) return q.optionsChinese;
  return q.options ?? [];
}

function PreviewQuestion({ q, language, itemNumber }: { q: Question; language: string; itemNumber?: number }) {
  const { label, note } = useText(q, language);
  const opts = useOpts(q, language);

  if (q.type === "section_header") {
    return (
      <div className="pt-6 pb-2">
        <div className="h-px bg-slate-200 mb-5" />
        <h2 className="text-base font-bold text-slate-800">{label}</h2>
        {note && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{note}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5 py-3 border-b border-slate-100 last:border-0">
      <p className="text-sm font-medium text-slate-700">
        {itemNumber !== undefined && (
          <span className="text-slate-400 font-normal mr-2">{itemNumber}.</span>
        )}
        {label}
        {q.required && <span className="text-red-400 ml-1">*</span>}
      </p>
      {note && <p className="text-xs text-slate-500 italic leading-relaxed">{note}</p>}

      {(q.type === "radio_group" || q.type === "checkbox_group") && opts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {opts.map((opt, i) => (
            <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200">
              {opt}
            </span>
          ))}
        </div>
      )}

      {q.type === "select" && q.options && (
        <p className="text-xs text-slate-400 italic">{q.options.length} options available</p>
      )}

      {(q.type === "text" || q.type === "number") && (
        <div className="h-8 bg-slate-50 border border-slate-200 rounded-md" />
      )}

      {q.type === "textarea" && (
        <div className="h-16 bg-slate-50 border border-slate-200 rounded-md" />
      )}

      {q.type === "date" && (
        <div className="h-8 w-40 bg-slate-50 border border-slate-200 rounded-md" />
      )}

      {q.type === "signature" && (
        <div className="h-10 bg-slate-50 border border-dashed border-slate-300 rounded-md flex items-center px-3">
          <span className="text-xs text-slate-400 italic">Signature field</span>
        </div>
      )}

      {(q.type === "likert" || q.type === "scale") && opts.length > 0 && (
        <div className="flex gap-1.5 flex-wrap pt-1">
          {opts.map((opt, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg border border-blue-100">
              {opt}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

async function fetchFormPreview(toolId: string) {
  const token = localStorage.getItem("raos_token");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/api/assessment-tools/${encodeURIComponent(toolId)}/form-preview`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load form preview");
  return res.json() as Promise<{ toolId: string; questions: Question[] }>;
}

export default function FormPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [language, setLanguage] = useState("english");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["form-preview", id],
    queryFn: () => fetchFormPreview(id!),
    enabled: !!id,
  });

  const visibleQuestions = (data?.questions ?? []).filter(q => {
    if (!q.conditionalOn) return true;
    return false;
  });

  const totalRequired = visibleQuestions.filter(q => q.required).length;
  const totalFields = visibleQuestions.filter(q => q.type !== "section_header").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/tools")} className="gap-1.5">
            <ArrowLeft size={16} /> Back to Tools
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-600">
            <Eye size={16} />
            <span className="text-sm font-medium">Form Preview</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {[{ id: "english", label: "En" }, { id: "mandarin", label: "中" }, { id: "korean", label: "한" }].map(lang => (
              <button key={lang.id} onClick={() => setLanguage(lang.id)}
                className={cn("px-3 py-1.5 text-xs rounded-md font-medium transition-colors",
                  language === lang.id ? "bg-white shadow-sm text-primary" : "text-slate-500")}>
                {lang.label}
              </button>
            ))}
          </div>
          <div className="flex items-center text-primary">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-5 h-5 object-contain mr-1.5" />
            <span className="font-bold text-sm">ReMynd</span>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6">
        {isLoading && (
          <div className="flex justify-center py-24">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {isError && (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-medium mb-2">No form preview available</p>
            <p className="text-sm">This tool does not have a digital form.</p>
          </div>
        )}

        {data && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-sm text-amber-800">
              <Eye size={15} />
              <span>Preview mode — this form cannot be submitted here. Share a tokenized link to collect responses.</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
              <h1 className="text-xl font-bold text-slate-900">{id}</h1>
              <div className="flex gap-4 mt-2 text-sm text-slate-500">
                <span>{totalFields} fields</span>
                <span>·</span>
                <span>{totalRequired} required</span>
                <span>·</span>
                <span>{visibleQuestions.filter(q => q.type === "section_header").length} sections</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 pb-4">
              {(() => {
                let counter = 0;
                return visibleQuestions.map(q => {
                  if (q.type !== "section_header") counter++;
                  return (
                    <PreviewQuestion
                      key={q.id}
                      q={q}
                      language={language}
                      itemNumber={q.type !== "section_header" ? counter : undefined}
                    />
                  );
                });
              })()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
