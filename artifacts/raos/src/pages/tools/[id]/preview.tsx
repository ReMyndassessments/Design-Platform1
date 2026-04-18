import { useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Languages, Pencil, Save, X, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  rows?: Question[];
};

function normalizeType(t: string): string {
  if (t === "radio" || t === "multiple_choice") return "radio_group";
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
          <button key={v} type="button" onClick={() => onChange(v)}
            className={cn("px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
              value === v ? "border-primary bg-primary text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-primary/50 hover:bg-primary/5")}>
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
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {opts.map(({ value: v, display }) => {
          const checked = value.includes(v);
          return (
            <button key={v} type="button" onClick={() => toggle(v)}
              className={cn("flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-sm text-left transition-all",
                checked ? "border-primary bg-primary/5 text-slate-800" : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-slate-50")}>
              <div className={cn("w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center", checked ? "border-primary bg-primary" : "border-slate-300 bg-white")}>
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
          <button key={v} type="button" onClick={() => onChange(v)}
            className={cn("px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
              value === v ? "border-primary bg-primary text-white shadow-sm" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-primary/40 hover:bg-primary/5")}>
            {display}
          </button>
        ))}
      </div>
    </div>
  );
}

function GridRow({ row, language, opts, rowVal, setAnswer }: {
  row: Question; language: string;
  opts: { value: string; display: string }[];
  rowVal: string;
  setAnswer: (id: string, v: string) => void;
}) {
  const { label } = useText(row, language);
  return (
    <div className="space-y-1">
      <p className="text-sm text-slate-700">{label}{row.required && <span className="text-red-400 ml-1">*</span>}</p>
      <div className="flex flex-wrap gap-2">
        {opts.map(({ value: v, display }) => (
          <button key={v} type="button" onClick={() => setAnswer(row.id, v)}
            className={cn("px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
              rowVal === v ? "border-primary bg-primary text-white shadow-sm" : "border-slate-100 bg-slate-50 text-slate-600 hover:border-primary/40 hover:bg-primary/5")}>
            {display}
          </button>
        ))}
      </div>
    </div>
  );
}

function FrequencyGridField({ q, language, answers, setAnswer }: {
  q: Question; language: string;
  answers: Record<string, string | string[]>;
  setAnswer: (id: string, v: string | string[]) => void;
}) {
  const { label, note } = useText(q, language);
  const opts = useOpts(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <div className="space-y-3 mt-1">
        {(q.rows ?? []).map(row => (
          <GridRow
            key={row.id}
            row={row}
            language={language}
            opts={opts}
            rowVal={(answers[row.id] as string) ?? ""}
            setAnswer={setAnswer}
          />
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
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
    </div>
  );
}

function TextareaField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
    </div>
  );
}

function SelectField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  const opts = useOpts(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
        <option value="">Select…</option>
        {opts.map(({ value: v, display }) => <option key={v} value={v}>{display}</option>)}
      </select>
    </div>
  );
}

function SingleCheckboxField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label } = useText(q, language);
  const checked = value === "1";
  return (
    <button
      type="button"
      onClick={() => onChange(checked ? "" : "1")}
      className={cn(
        "w-full flex items-start gap-3 text-left rounded-lg border px-3.5 py-3 transition-all",
        checked ? "border-primary bg-primary/5" : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className={cn(
        "mt-0.5 w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-colors",
        checked ? "border-primary bg-primary" : "border-slate-300 bg-white"
      )}>
        {checked && (
          <svg viewBox="0 0 12 10" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,5 4.5,9 11,1" />
          </svg>
        )}
      </div>
      <span className={cn("text-sm leading-relaxed", checked ? "text-primary font-medium" : "text-slate-700")}>{label}</span>
    </button>
  );
}

const HAS_OPTIONS = new Set(["radio_group", "checkbox_group", "likert", "scale", "select", "multiple_choice"]);

function EditableQuestion({
  q, index, total,
  onChange, onDelete, onMoveUp, onMoveDown,
}: {
  q: Question;
  index: number;
  total: number;
  onChange: (updated: Question) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const type = normalizeType(q.type);
  const isHeader = type === "section_header";

  const updateOpt = (i: number, val: string) => {
    const opts = [...(q.options ?? [])];
    opts[i] = val;
    onChange({ ...q, options: opts });
  };
  const removeOpt = (i: number) => {
    const opts = (q.options ?? []).filter((_, idx) => idx !== i);
    onChange({ ...q, options: opts });
  };
  const addOpt = () => onChange({ ...q, options: [...(q.options ?? []), "New option"] });

  return (
    <div className={cn("group relative rounded-xl border-2 p-4 transition-colors", isHeader ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-white hover:border-primary/30")}>
      {/* Controls row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex flex-col gap-0.5 text-slate-300">
          <button onClick={onMoveUp} disabled={index === 0}
            className="hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1}
            className="hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
        <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">{q.type}</span>
        {!isHeader && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer ml-1">
            <input type="checkbox" checked={!!q.required} onChange={e => onChange({ ...q, required: e.target.checked })}
              className="w-3.5 h-3.5 rounded accent-primary" />
            Required
          </label>
        )}
        <button onClick={onDelete} className="ml-auto text-slate-300 hover:text-red-500 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {/* Label */}
      <div className="mb-2">
        <label className="block text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">
          {isHeader ? "Section Title" : "Question Text"}
        </label>
        <input
          value={q.text}
          onChange={e => onChange({ ...q, text: e.target.value })}
          className={cn("w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
            isHeader ? "font-bold text-slate-800 border-indigo-200" : "border-slate-200")}
          placeholder="Question text…"
        />
      </div>

      {/* Note */}
      {!isHeader && (
        <div className="mb-3">
          <label className="block text-xs text-slate-400 mb-1">Helper note (optional)</label>
          <input
            value={q.note ?? ""}
            onChange={e => onChange({ ...q, note: e.target.value || undefined })}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-slate-600"
            placeholder="Add a helper note shown below the question…"
          />
        </div>
      )}

      {/* Options editor */}
      {HAS_OPTIONS.has(type) && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wide">Options</label>
          <div className="space-y-1.5">
            {(q.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical size={12} className="text-slate-300 shrink-0" />
                <input
                  value={opt}
                  onChange={e => updateOpt(i, e.target.value)}
                  className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button onClick={() => removeOpt(i)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                  <X size={13} />
                </button>
              </div>
            ))}
            <button onClick={addOpt}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors mt-1">
              <Plus size={12} /> Add option
            </button>
          </div>
        </div>
      )}
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
      {itemNumber !== undefined && <p className="text-xs text-slate-400 font-normal mb-0.5">{itemNumber}.</p>}
      {type === "radio_group"    && <RadioField          q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "checkbox_group" && <CheckboxField       q={q} language={language} value={arrVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "checkbox"       && <SingleCheckboxField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {(type === "likert" || type === "scale") && <LikertField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "text"      && <TextField     q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "number"    && <TextField     q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} type="number" />}
      {type === "date"      && <TextField     q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} type="date" />}
      {type === "textarea"  && <TextareaField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "select"         && <SelectField        q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />}
      {type === "frequency_grid" && <FrequencyGridField q={q} language={language} answers={answers} setAnswer={setAnswer} />}
      {type === "signature" && (
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
  const [editMode, setEditMode] = useState(false);
  const [editedQuestions, setEditedQuestions] = useState<Question[] | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const setAnswer = (qid: string, val: string | string[]) =>
    setAnswers(prev => ({ ...prev, [qid]: val }));

  const { data, isLoading, isError } = useQuery({
    queryKey: ["form-preview", id],
    queryFn: () => fetchFormPreview(id!),
    enabled: !!id,
  });

  const enterEditMode = () => {
    setEditedQuestions(data?.questions ? JSON.parse(JSON.stringify(data.questions)) : []);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditedQuestions(null);
  };

  const updateQuestion = useCallback((index: number, updated: Question) => {
    setEditedQuestions(prev => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }, []);

  const deleteQuestion = useCallback((index: number) => {
    setEditedQuestions(prev => prev ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const moveQuestion = useCallback((index: number, direction: "up" | "down") => {
    setEditedQuestions(prev => {
      if (!prev) return prev;
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const saveChanges = async () => {
    if (!editedQuestions || !id) return;
    setSaving(true);
    const token = localStorage.getItem("raos_token");
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/api/assessment-tools/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ formItems: editedQuestions }),
      });
      if (!res.ok) throw new Error("Save failed");
      await qc.invalidateQueries({ queryKey: ["form-preview", id] });
      await qc.invalidateQueries({ queryKey: ["/api/assessment-tools"] });
      toast({ title: "Form saved", description: "All changes have been saved successfully." });
      setEditMode(false);
      setEditedQuestions(null);
    } catch {
      toast({ title: "Save failed", description: "Could not save changes. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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

  const activeQuestions = editMode ? (editedQuestions ?? []) : (data?.questions ?? []);

  const missingTranslations = !editMode && (data?.questions ?? []).some(
    q => normalizeType(q.type) !== "section_header" && (!q.textChinese || q.textChinese === q.text)
  );

  const visibleQuestions = activeQuestions.filter(q => !q.conditionalOn);
  const totalRequired = visibleQuestions.filter(q => q.required).length;
  const totalFields   = visibleQuestions.filter(q => normalizeType(q.type) !== "section_header").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => { if (editMode) cancelEdit(); setLocation("/tools"); }} className="gap-1.5">
            <ArrowLeft size={16} /> Back to Tools
          </Button>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-600">
            {editMode ? <Pencil size={16} className="text-primary" /> : <Eye size={16} />}
            <span className="text-sm font-medium">{editMode ? "Editing Form" : "Form Preview"}</span>
          </div>

          {!editMode && data && missingTranslations && (
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
          {!editMode && (
            <>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                {[{ id: "english", label: "En" }, { id: "mandarin", label: "中" }, { id: "korean", label: "한" }].map(lang => (
                  <button key={lang.id} onClick={() => setLanguage(lang.id)}
                    className={cn("px-3 py-1.5 text-xs rounded-md font-medium transition-colors",
                      language === lang.id ? "bg-white shadow-sm text-primary" : "text-slate-500")}>
                    {lang.label}
                  </button>
                ))}
              </div>
              {data && (
                <Button size="sm" onClick={enterEditMode} variant="outline" className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5">
                  <Pencil size={14} /> Edit Form
                </Button>
              )}
            </>
          )}

          {editMode && (
            <>
              <Button size="sm" variant="ghost" onClick={cancelEdit} className="gap-1.5 text-slate-500">
                <X size={14} /> Cancel
              </Button>
              <Button size="sm" onClick={saveChanges} disabled={saving} className="gap-1.5 bg-primary text-white hover:bg-primary/90">
                {saving
                  ? <><div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving…</>
                  : <><Save size={14} /> Save Changes</>
                }
              </Button>
            </>
          )}

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

        {(data || editMode) && (
          <>
            {editMode ? (
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-sm text-primary">
                <Pencil size={15} />
                <span>Edit mode — click any field to edit it. Drag arrows to reorder. Press <strong>Save Changes</strong> when done.</span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-sm text-amber-800">
                <Eye size={15} />
                <span>Preview mode — responses cannot be submitted here. Share a tokenized link to collect responses.</span>
              </div>
            )}

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

            {editMode ? (
              <div className="space-y-3">
                {(editedQuestions ?? []).map((q, i) => (
                  <EditableQuestion
                    key={q.id + i}
                    q={q}
                    index={i}
                    total={(editedQuestions ?? []).length}
                    onChange={updated => updateQuestion(i, updated)}
                    onDelete={() => deleteQuestion(i)}
                    onMoveUp={() => moveQuestion(i, "up")}
                    onMoveDown={() => moveQuestion(i, "down")}
                  />
                ))}
                <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                  <Button variant="ghost" onClick={cancelEdit} className="text-slate-500">Cancel</Button>
                  <Button onClick={saveChanges} disabled={saving} className="gap-1.5">
                    {saving ? "Saving…" : <><Save size={14} /> Save Changes</>}
                  </Button>
                </div>
              </div>
            ) : (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
