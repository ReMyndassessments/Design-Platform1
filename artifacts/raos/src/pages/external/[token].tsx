import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useGetExternalForm, useSubmitExternalForm } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronDown, FileText, ClipboardList, ShieldCheck, Lock } from "lucide-react";
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

function useText(q: { text: string; textChinese?: string; textKorean?: string; note?: string; noteChinese?: string; noteKorean?: string }, language: string) {
  if (language === "korean") return { label: q.textKorean ?? q.text, note: q.noteKorean ?? q.note };
  if (language === "mandarin") return { label: q.textChinese ?? q.text, note: q.noteChinese ?? q.note };
  return { label: q.text, note: q.note };
}

function useOption(opts: string[], optsCn: string[] | undefined, language: string, optsKo?: string[]) {
  if (language === "korean" && optsKo) return optsKo;
  if (language === "mandarin" && optsCn) return optsCn;
  return opts;
}

// ── Field Components ──────────────────────────────────────────────────────────

function FieldLabel({ label, required, note }: { label: string; required?: boolean; note?: string }) {
  return (
    <div className="mb-2.5">
      <p className="text-[15px] font-semibold text-slate-800 leading-snug">
        {label}
        {required && <span className="text-red-500 ml-1 font-normal">*</span>}
      </p>
      {note && (
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{note}</p>
      )}
    </div>
  );
}

function SectionHeader({ q, language }: { q: Question; language: string }) {
  const { label, note } = useText(q, language);
  return (
    <div className="pt-6 pb-1">
      <div className="flex items-stretch gap-3">
        <div className="w-1 rounded-full bg-primary flex-shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">{label}</h2>
          {note && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{note}</p>}
        </div>
      </div>
    </div>
  );
}

function TextField({ q, language, value, onChange, type = "text" }: { q: Question; language: string; value: string; onChange: (v: string) => void; type?: string }) {
  const { label, note } = useText(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-11 border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg text-sm"
      />
    </div>
  );
}

function TextareaField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-lg text-sm min-h-[100px] resize-none"
      />
    </div>
  );
}

function RadioGroupField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  const opts = useOption(q.options ?? [], q.optionsChinese, language, q.optionsKorean);
  const srcOpts = q.options ?? [];
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <div className="flex flex-wrap gap-2">
        {opts.map((opt, i) => {
          const srcVal = srcOpts[i] ?? opt;
          const selected = value === srcVal;
          return (
            <button key={srcVal} onClick={() => onChange(srcVal)}
              className={cn(
                "px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                selected
                  ? "border-primary bg-primary text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary/50 hover:bg-primary/5"
              )}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckboxGroupField({ q, language, value, onChange }: { q: Question; language: string; value: string[]; onChange: (v: string[]) => void }) {
  const { label, note } = useText(q, language);
  const opts = useOption(q.options ?? [], q.optionsChinese, language, q.optionsKorean);
  const srcOpts = q.options ?? [];
  const toggle = (srcVal: string) => {
    if (value.includes(srcVal)) onChange(value.filter(v => v !== srcVal));
    else onChange([...value, srcVal]);
  };
  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {opts.map((opt, i) => {
          const srcVal = srcOpts[i] ?? opt;
          const checked = value.includes(srcVal);
          return (
            <button key={srcVal} onClick={() => toggle(srcVal)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-sm text-left transition-all",
                checked
                  ? "border-primary bg-primary/5 text-slate-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-slate-50"
              )}>
              <div className={cn(
                "w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all",
                checked ? "border-primary bg-primary" : "border-slate-300 bg-white"
              )}>
                {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="leading-tight font-medium">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const NOT_NETWORK_VALUE = "Not a Network School";

function SelectField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  const allOptions = q.options ?? [];
  const hasNotNetwork = allOptions[0] === NOT_NETWORK_VALUE;
  const isOther = hasNotNetwork && (value === NOT_NETWORK_VALUE || (value !== "" && !allOptions.includes(value)));
  const selectValue = isOther ? NOT_NETWORK_VALUE : value;

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    onChange(v === NOT_NETWORK_VALUE ? NOT_NETWORK_VALUE : v);
  };

  return (
    <div>
      <FieldLabel label={label} required={q.required} note={note} />
      <div className="relative">
        <select
          value={selectValue}
          onChange={handleSelect}
          className="w-full appearance-none border-2 border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white text-slate-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 pr-10"
        >
          <option value="">Select...</option>
          {allOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
      {isOther && (
        <div className="mt-2 space-y-1.5">
          <p className="text-xs text-slate-500 font-medium">Please enter your school name:</p>
          <input
            type="text"
            autoFocus
            placeholder="Enter your school name..."
            value={value === NOT_NETWORK_VALUE ? "" : value}
            onChange={e => onChange(e.target.value || NOT_NETWORK_VALUE)}
            className="w-full border-2 border-primary/40 rounded-lg px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:border-primary bg-white"
          />
        </div>
      )}
    </div>
  );
}

function SignatureField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  return (
    <div>
      <FieldLabel label={label} required={q.required} />
      {note && (
        <div className="mb-2.5 flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
          {note}
        </div>
      )}
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-12 border-2 border-slate-200 rounded-lg font-serif text-lg italic focus:border-primary focus:ring-1 focus:ring-primary/20"
        placeholder="Type your full legal name..."
      />
    </div>
  );
}

function ConsentItem({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label } = useText(q, language);
  const yesLabel = language === "korean" ? "예" : language === "mandarin" ? "是" : "Yes";
  const noLabel = language === "korean" ? "아니오" : language === "mandarin" ? "否" : "No";
  return (
    <div className={cn(
      "rounded-xl border-2 p-4 space-y-3 transition-colors",
      value === "Yes" ? "border-emerald-200 bg-emerald-50/50" :
      value === "No" ? "border-red-200 bg-red-50/50" :
      "border-slate-200 bg-slate-50/50"
    )}>
      <p className="text-sm text-slate-700 leading-relaxed font-medium">{label}</p>
      <div className="flex gap-2.5">
        {[{ val: "Yes", label: yesLabel }, { val: "No", label: noLabel }].map(opt => (
          <button
            key={opt.val}
            onClick={() => onChange(opt.val)}
            className={cn(
              "flex-1 py-2.5 rounded-lg border-2 text-sm font-bold transition-all",
              value === opt.val
                ? opt.val === "Yes"
                  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                  : "border-red-400 bg-red-400 text-white shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const LIKERT_SCORE_LABELS = ["1", "2", "3", "4", "5"];

function LikertField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label } = useText(q, language);
  const opts = useOption(
    q.options ?? ["Never", "Rarely", "Sometimes", "Often", "Very Often"],
    q.optionsChinese,
    language,
    q.optionsKorean
  );
  const srcOpts = q.options ?? ["Never", "Rarely", "Sometimes", "Often", "Very Often"];

  return (
    <div>
      <p className="text-[15px] font-semibold text-slate-800 leading-snug mb-3">
        {label}
        {q.required && <span className="text-red-500 ml-1 font-normal">*</span>}
      </p>
      <div className="flex gap-1.5">
        {opts.map((opt, i) => {
          const srcVal = srcOpts[i] ?? opt;
          const selected = value === srcVal;
          const score = LIKERT_SCORE_LABELS[i] ?? String(i + 1);
          return (
            <button
              key={srcVal}
              onClick={() => onChange(srcVal)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-center transition-all",
                selected
                  ? "border-primary bg-primary text-white shadow-md shadow-primary/20"
                  : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:bg-primary/5"
              )}>
              <span className={cn("text-base font-bold leading-none", selected ? "text-white" : "text-slate-700")}>
                {score}
              </span>
              <span className={cn("text-[10px] font-medium leading-tight max-w-[52px] text-center", selected ? "text-white/90" : "text-slate-500")}>
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Question Dispatcher ────────────────────────────────────────────────────────

const CONSENT_IDS = ["consent_1", "consent_2", "consent_3", "consent_4"];

function QuestionField({ q, language, answers, setAnswer }: {
  q: Question; language: string;
  answers: Record<string, string | string[]>;
  setAnswer: (id: string, val: string | string[]) => void;
}) {
  if (q.conditionalOn && answers[q.conditionalOn] !== q.conditionalValue) return null;

  const val = answers[q.id];
  const strVal = typeof val === "string" ? val : "";
  const arrVal = Array.isArray(val) ? val : [];

  switch (q.type) {
    case "section_header": return <SectionHeader q={q} language={language} />;
    case "text":           return <TextField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    case "number":         return <TextField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} type="number" />;
    case "date":           return <TextField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} type="date" />;
    case "textarea":       return <TextareaField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    case "radio_group":
      if (CONSENT_IDS.includes(q.id)) return <ConsentItem q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
      return <RadioGroupField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    case "checkbox_group": return <CheckboxGroupField q={q} language={language} value={arrVal} onChange={v => setAnswer(q.id, v)} />;
    case "select":         return <SelectField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    case "signature":      return <SignatureField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    case "likert":
    case "scale":          return <LikertField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    default:               return <TextField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function FormIcon({ formType }: { formType: string }) {
  const cls = "text-primary";
  if (formType === "REFERRAL") return <ClipboardList size={26} className={cls} />;
  if (formType === "CONSENT")  return <ShieldCheck size={26} className={cls} />;
  if (formType === "INTAKE")   return <FileText size={26} className={cls} />;
  return <img src="/images/remynd-logo.png" alt="ReMynd" className="w-9 h-9 object-contain" />;
}

function getFormLabel(formType: string) {
  if (formType === "REFERRAL") return "Student Referral";
  if (formType === "CONSENT")  return "Parental Consent";
  if (formType === "INTAKE")   return "Parent Intake";
  return "Assessment Screener";
}

function getSubtitle(formType: string, studentName: string, language: string) {
  if (language === "korean") {
    if (formType === "REFERRAL") return "학생 의뢰 양식";
    return `대상: ${studentName}`;
  }
  if (language === "mandarin") {
    if (formType === "REFERRAL") return "学生转介表格";
    return `关于: ${studentName}`;
  }
  if (formType === "REFERRAL") return "Student Referral Form";
  return `Regarding: ${studentName}`;
}

function getSubmitLabel(formType: string) {
  if (formType === "REFERRAL") return "Submit Referral";
  if (formType === "CONSENT")  return "Submit Consent Form";
  if (formType === "INTAKE")   return "Submit Intake Form";
  return "Submit Completed Form";
}

function getSuccessMessage(formType: string) {
  if (formType === "REFERRAL") return "Your referral has been submitted successfully. The ReMynd team will be in touch shortly.";
  if (formType === "CONSENT")  return "Your consent has been recorded. The assessment team will proceed accordingly.";
  if (formType === "INTAKE")   return "Your intake information has been securely submitted to the assessment team.";
  return "Your responses have been securely submitted to the assessment team. Thank you for your time.";
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ExternalFormView() {
  const { token } = useParams();
  const { data: form, isLoading, isError } = useGetExternalForm(token as string, { query: { retry: false } });
  const submitMut = useSubmitExternalForm();

  const [language, setLanguage] = useState("english");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const setAnswer = (id: string, val: string | string[]) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
    setValidationError(null);
  };

  const requiredQuestions = useMemo(() => {
    if (!form) return [];
    return (form.questions as Question[]).filter(q => {
      if (q.type === "section_header" || !q.required) return false;
      if (q.conditionalOn && answers[q.conditionalOn] !== q.conditionalValue) return false;
      return true;
    });
  }, [form, answers]);

  const answeredRequired = useMemo(() =>
    requiredQuestions.filter(q => {
      const val = answers[q.id];
      if (Array.isArray(val)) return val.length > 0;
      return val !== undefined && val !== "";
    }),
    [requiredQuestions, answers]
  );

  const progress = requiredQuestions.length > 0
    ? Math.round((answeredRequired.length / requiredQuestions.length) * 100)
    : 0;

  const handleSubmit = () => {
    const missing = requiredQuestions.filter(q => {
      const val = answers[q.id];
      if (Array.isArray(val)) return val.length === 0;
      return !val;
    });
    if (missing.length > 0) {
      setValidationError(`Please complete all required fields — ${missing.length} remaining.`);
      document.getElementById(`q-${missing[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const serialized: Record<string, string> = {};
    Object.entries(answers).forEach(([k, v]) => { serialized[k] = Array.isArray(v) ? v.join(", ") : v; });
    submitMut.mutate({ token: token as string, data: { answers: serialized, language } }, {
      onSuccess: () => setSubmitted(true),
    });
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-slate-500">Loading form...</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError || !form) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl">🔗</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Not Found</h2>
          <p className="text-slate-500 text-sm leading-relaxed">This form link is invalid or has already expired. Please contact the assessment team for assistance.</p>
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-4 h-4 object-contain mix-blend-multiply" /> ReMynd Assessment System
          </div>
        </div>
      </div>
    );
  }

  // ── Already Submitted ──
  if (form.alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-md text-center">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100">
            <CheckCircle2 size={44} />
          </div>
          <h2 className="text-3xl font-display font-bold mb-3 text-slate-900">Thank You</h2>
          <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">{getSuccessMessage(form.formType ?? "screener")}</p>
          <div className="mt-3 text-xs text-slate-400">
            {language === "korean" ? "이 페이지를 닫으셔도 됩니다" : language === "mandarin" ? "您可以关闭此页面" : "You may safely close this page"}
          </div>
          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-4 h-4 object-contain mix-blend-multiply" />
            <span>ReMynd Assessment System</span>
          </div>
        </div>
      </div>
    );
  }

  const formType = form.formType ?? "screener";

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col">

      {/* ── Top Navigation Bar ── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-5 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-slate-900 rounded-md flex items-center justify-center flex-shrink-0">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-5 h-5 object-contain" />
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-primary">ReMynd</span>
        </div>
        <div className="flex items-center gap-3">
          {requiredQuestions.length > 0 && (
            <span className="text-xs text-slate-500 font-medium hidden sm:block">
              {answeredRequired.length} / {requiredQuestions.length} completed
            </span>
          )}
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            {[{ id: "english", label: "En" }, { id: "mandarin", label: "中" }, { id: "korean", label: "한" }].map(lang => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md font-semibold transition-all",
                  language === lang.id ? "bg-white shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
                )}>
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Progress Bar ── */}
      <div className="w-full h-1 bg-slate-200">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Form Body ── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 md:px-6 py-8 pb-32">

        {/* Form Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
            formType === "REFERRAL" || formType === "CONSENT" || formType === "INTAKE"
              ? "bg-primary/10"
              : "bg-slate-900"
          )}>
            <FormIcon formType={formType} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-widest text-primary/70">{getFormLabel(formType)}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5 leading-tight">{form.toolName}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{getSubtitle(formType, form.studentName, language)}</p>
          </div>
          {requiredQuestions.length > 0 && (
            <div className="flex-shrink-0 text-right hidden sm:block">
              <div className="text-2xl font-bold text-primary">{progress}%</div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">complete</div>
            </div>
          )}
        </div>

        {/* Questions */}
        <div className="space-y-5">
          {(form.questions as Question[]).map(q => {
            const isSection = q.type === "section_header";
            return (
              <div key={q.id} id={`q-${q.id}`}>
                {isSection ? (
                  <QuestionField q={q} language={language} answers={answers} setAnswer={setAnswer} />
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <QuestionField q={q} language={language} answers={answers} setAnswer={setAnswer} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="mt-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <span className="font-semibold">⚠</span>
            <span>{validationError}</span>
          </div>
        )}

        {/* Submit */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={submitMut.isPending}
            className="w-full h-13 text-base font-semibold rounded-xl shadow-md shadow-primary/20 py-4"
          >
            {submitMut.isPending ? "Submitting..." : getSubmitLabel(formType)}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-3 font-medium">
            <Lock size={11} /> Responses are encrypted and kept strictly confidential
          </p>
        </div>
      </main>
    </div>
  );
}
