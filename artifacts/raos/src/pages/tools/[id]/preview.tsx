import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Languages } from "lucide-react";
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

function normalizeType(t: string): string {
  if (t === "radio" || t === "multiple_choice") return "radio_group";
  if (t === "checkbox") return "checkbox_group";
  return t;
}

function useText(q: Pick<Question, "text" | "textChinese" | "textKorean" | "note" | "noteChinese" | "noteKorean">, language: string) {
  if (language === "korean")   return { label: q.textKorean  ?? q.text, note: q.noteKorean  ?? q.note };
  if (language === "mandarin") return { label: q.textChinese ?? q.text, note: q.noteChinese ?? q.note };
  return { label: q.text, note: q.note };
}

function useOpts(q: Question, language: string): { display: string; value: string }[] {
  const src = q.options ?? [];
  let display: string[] = src;
  if (language === "korean"   && q.optionsKorean?.length)  display = q.optionsKorean;
  if (language === "mandarin" && q.optionsChinese?.length) display = q.optionsChinese;
  return src.map((v, i) => ({ value: v, display: display[i] ?? v }));
}

function FieldLabel({ label, required, note }: { label: string; required?: boolean; note?: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </p>
      {note && <p className="text-xs text-slate-500 italic leading-relaxed mt-0.5">{note}</p>}
    </div>
  );
}

function RadioField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  const opts = useOpts(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <div className="flex flex-wrap gap-2">
        {opts.map(({ value: v, display }) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
              value === v
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-700 hover:border-primary/50 hover:bg-primary/5"
            )}
          >
            {display}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckboxField({ q, language, value, onChange }: { q: Question; language: string; value: string[]; onChange: (v: string[]) => void }) {
  const { label, note } = useText(q, language);
  const opts = useOpts(q, language);
  const toggle = (v: string) => {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  };
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {opts.map(({ value: v, display }) => {
          const checked = value.includes(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-sm text-left transition-all",
                checked
                  ? "border-primary bg-primary/5 text-slate-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all",
                checked ? "border-primary bg-primary" : "border-slate-300 bg-white"
              )}>
                {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="leading-tight font-medium">{display}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LikertField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  const opts = useOpts(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <div className="flex flex-wrap gap-2">
        {opts.map(({ value: v, display }) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
              value === v
                ? "border-primary bg-primary text-white shadow-sm"
                : "border-slate-100 bg-slate-50 text-slate-600 hover:border-primary/40 hover:bg-primary/5"
            )}
          >
            {display}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextField({ q, language, value, onChange, type = "text" }: { q: Question; language: string; value: string; onChange: (v: string) => void; type?: string }) {
  const { label, note } = useText(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    </div>
  );
}

function TextareaField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      />
    </div>
  );
}

function SelectField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  const opts = useOpts(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
      >
        <option value="">Select…</option>
        {opts.map(({ value: v, display }) => (
          <option key={v} value={v}>{display}</option>
        ))}
      </select>
    </div>
  );
}

function PreviewQuestion({
  q, language, itemNumber, answers, setAnswer,
}: {
  q: Question;
  language: string;
  itemNumber?: number;
  answers: Record<string, string | string[]>;
  setAnswer: (id: string, v: string | string[]) => void;
}) {
  const type = normalizeType(q.type);
  const strVal = (answers[q.id] as string) ?? "";
  const arrVal = (answers[q.id] as string[]) ?? [];

  const { label, note } = useText(q, language);

  if (type === "section_header") {
    return (
      <div className="pt-6 pb-2">
        <div className="h-px bg-slate-200 mb-5" />
        <h2 className="text-base font-bold text-slate-800">{label}</h2>
        {note && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{note}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1 py-4 border-b border-slate-100 last:border-0">
      {itemNumber !== undefined && (
        <p className="text-xs text-slate-400 font-normal mb-0.5">{itemNumber}.</p>
      )}
      {type === "radio_group"    && <RadioField    q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "checkbox_group" && <CheckboxField  q={q} language={language} value={arrVal} onChange={v => setAnswer(q.id, v)} />}
      {(type === "likert" || type === "scale") && <LikertField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "text"           && <TextField     q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "number"         && <TextField     q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} type="number" />}
      {type === "date"           && <TextField     q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} type="date" />}
      {type === "textarea"       && <TextareaField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "select"         && <SelectField   q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "signature"      && (
        <div>
          <FieldLabel label={label} required={q.required} />
          <div className="h-10 bg-slate-50 border border-dashed border-slate-300 rounded-md flex items-center px-3">
            <span className="text-xs text-slate-400 italic">Signature field</span>
          </div>
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
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [retranslating, setRetranslating] = useState(false);
  const [retranslateMsg, setRetranslateMsg] = useState<string | null>(null);
  const qc = useQueryClient();

  const setAnswer = (qid: string, val: string | string[]) =>
    setAnswers(prev => ({ ...prev, [qid]: val }));

  const { data, isLoading, isError } = useQuery({
    queryKey: ["form-preview", id],
    queryFn: () => fetchFormPreview(id!),
    enabled: !!id,
  });

  const handleRetranslate = async () => {
    if (!data?.questions?.length || !id) return;
    setRetranslating(true);
    setRetranslateMsg(null);
    const token = localStorage.getItem("raos_token");
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    try {
      const transRes = await fetch(`${base}/api/assessment-tools/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: data.questions }),
      });
      if (!transRes.ok) { setRetranslateMsg("Translation failed — server error."); return; }
      const translated = await transRes.json() as { items?: Question[] };
      if (!translated.items?.length) { setRetranslateMsg("Translation returned empty — try again."); return; }
      const hasChinese = translated.items.some(q => q.textChinese && q.textChinese !== q.text);
      if (!hasChinese) { setRetranslateMsg("AI did not produce translations this time — try again."); return; }
      const patchRes = await fetch(`${base}/api/assessment-tools/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ formItems: translated.items }),
      });
      if (!patchRes.ok) { setRetranslateMsg("Saved translations but couldn't update tool — try again."); return; }
      await qc.invalidateQueries({ queryKey: ["form-preview", id] });
      setRetranslateMsg("Translations applied successfully.");
    } catch {
      setRetranslateMsg("Translation failed — check your connection and try again.");
    } finally {
      setRetranslating(false);
    }
  };

  const missingTranslations = (data?.questions ?? []).some(
    q => normalizeType(q.type) !== "section_header" && (!q.textChinese || q.textChinese === q.text)
  );

  const visibleQuestions = (data?.questions ?? []).filter(q => {
    if (!q.conditionalOn) return true;
    return false;
  });

  const totalRequired = visibleQuestions.filter(q => q.required).length;
  const totalFields   = visibleQuestions.filter(q => normalizeType(q.type) !== "section_header").length;

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
          {data && missingTranslations && (
            <Button variant="outline" size="sm" onClick={handleRetranslate} disabled={retranslating} className="gap-1.5 text-sky-600 border-sky-300 hover:bg-sky-50">
              {retranslating
                ? <><div className="w-3 h-3 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" /> Translating…</>
                : <><Languages size={14} /> Add Translations</>
              }
            </Button>
          )}
          {retranslateMsg && (
            <span className={cn("text-xs", retranslateMsg.startsWith("Translations applied") ? "text-green-600" : "text-red-500")}>
              {retranslateMsg}
            </span>
          )}
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
              <span>Preview mode — responses cannot be submitted here. Share a tokenized link to collect responses.</span>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
              <h1 className="text-xl font-bold text-slate-900">{id}</h1>
              <div className="flex gap-4 mt-2 text-sm text-slate-500">
                <span>{totalFields} fields</span>
                <span>·</span>
                <span>{totalRequired} required</span>
                <span>·</span>
                <span>{visibleQuestions.filter(q => normalizeType(q.type) === "section_header").length} sections</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 pb-4">
              {(() => {
                let counter = 0;
                return visibleQuestions.map(q => {
                  const type = normalizeType(q.type);
                  if (type !== "section_header") counter++;
                  return (
                    <PreviewQuestion
                      key={q.id}
                      q={q}
                      language={language}
                      itemNumber={type !== "section_header" ? counter : undefined}
                      answers={answers}
                      setAnswer={setAnswer}
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
