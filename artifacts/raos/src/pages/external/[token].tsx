import { useState, useMemo } from "react";
import { useParams } from "wouter";
import { useGetExternalForm, useSubmitExternalForm } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BrainCircuit, CheckCircle2, ChevronDown, FileText, ClipboardList, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Question = {
  id: string;
  text: string;
  textChinese?: string;
  type: string;
  options?: string[];
  optionsChinese?: string[];
  domain: string;
  required?: boolean;
  conditionalOn?: string;
  conditionalValue?: string;
  note?: string;
  noteChinese?: string;
};

function useText(q: { text: string; textChinese?: string; note?: string; noteChinese?: string }, language: string) {
  const isChinese = language === "mandarin" || language === "cantonese";
  return {
    label: isChinese && q.textChinese ? q.textChinese : q.text,
    note: isChinese && q.noteChinese ? q.noteChinese : q.note,
  };
}

function useOption(opts: string[], optsCn: string[] | undefined, language: string) {
  const isChinese = language === "mandarin" || language === "cantonese";
  return isChinese && optsCn ? optsCn : opts;
}

function SectionHeader({ q, language }: { q: Question; language: string }) {
  const { label, note } = useText(q, language);
  return (
    <div className="pt-8 pb-2">
      <div className="h-px bg-slate-200 mb-6" />
      <h2 className="text-lg font-bold text-slate-800 tracking-tight">{label}</h2>
      {note && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{note}</p>}
    </div>
  );
}

function TextField({ q, language, value, onChange, type = "text" }: { q: Question; language: string; value: string; onChange: (v: string) => void; type?: string }) {
  const { label } = useText(q, language);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}{q.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} className="border-slate-200 focus:border-primary" />
    </div>
  );
}

function TextareaField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label } = useText(q, language);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}{q.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Textarea value={value} onChange={e => onChange(e.target.value)} className="border-slate-200 focus:border-primary min-h-[100px]" />
    </div>
  );
}

function RadioGroupField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label } = useText(q, language);
  const opts = useOption(q.options ?? [], q.optionsChinese, language);
  const srcOpts = q.options ?? [];
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        {label}{q.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {opts.map((opt, i) => {
          const srcVal = srcOpts[i] ?? opt;
          return (
            <button key={srcVal} onClick={() => onChange(srcVal)}
              className={cn("px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                value === srcVal ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-700 hover:border-primary/40")}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CheckboxGroupField({ q, language, value, onChange }: { q: Question; language: string; value: string[]; onChange: (v: string[]) => void }) {
  const { label } = useText(q, language);
  const opts = useOption(q.options ?? [], q.optionsChinese, language);
  const srcOpts = q.options ?? [];
  const toggle = (srcVal: string) => {
    if (value.includes(srcVal)) onChange(value.filter(v => v !== srcVal));
    else onChange([...value, srcVal]);
  };
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        {label}{q.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {opts.map((opt, i) => {
          const srcVal = srcOpts[i] ?? opt;
          const checked = value.includes(srcVal);
          return (
            <button key={srcVal} onClick={() => toggle(srcVal)}
              className={cn("flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-sm text-left transition-all",
                checked ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-white text-slate-700 hover:border-primary/30")}>
              <div className={cn("w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center", checked ? "border-primary bg-primary" : "border-slate-300")}>
                {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span className="leading-tight">{opt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label } = useText(q, language);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}{q.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)}
          className="w-full appearance-none border-2 border-slate-200 rounded-lg px-4 py-2.5 text-sm bg-white text-slate-700 focus:outline-none focus:border-primary pr-10">
          <option value="">Select...</option>
          {(q.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

function SignatureField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label, note } = useText(q, language);
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700">
        {label}{q.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {note && <p className="text-xs text-slate-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">{note}</p>}
      <Input value={value} onChange={e => onChange(e.target.value)}
        className="border-2 border-slate-300 font-serif text-lg italic focus:border-primary"
        placeholder="Type your full name as signature..." />
    </div>
  );
}

function ConsentItem({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label } = useText(q, language);
  return (
    <div className="border-2 border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50">
      <p className="text-sm text-slate-700 leading-relaxed">{label}</p>
      <div className="flex gap-3">
        {["Yes", "No"].map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            className={cn("flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all",
              value === opt
                ? opt === "Yes" ? "border-emerald-500 bg-emerald-500 text-white" : "border-red-400 bg-red-400 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function LikertField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label } = useText(q, language);
  const opts = useOption(q.options ?? ["Never", "Rarely", "Sometimes", "Often", "Very Often"], q.optionsChinese, language);
  const srcOpts = q.options ?? ["Never", "Rarely", "Sometimes", "Often", "Very Often"];
  return (
    <div className="space-y-3">
      <p className="text-base font-medium text-slate-800">{label}{q.required && <span className="text-red-500 ml-1">*</span>}</p>
      <div className="flex gap-2 flex-wrap">
        {opts.map((opt, i) => {
          const srcVal = srcOpts[i] ?? opt;
          return (
            <button key={srcVal} onClick={() => onChange(srcVal)}
              className={cn("flex-1 min-w-[70px] py-3 rounded-xl border-2 text-xs md:text-sm font-semibold transition-all",
                value === srcVal ? "border-primary bg-primary text-white" : "border-slate-200 text-slate-600 hover:border-primary/40")}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
    case "text": return <TextField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    case "number": return <TextField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} type="number" />;
    case "date": return <TextField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} type="date" />;
    case "textarea": return <TextareaField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    case "radio_group":
      if (CONSENT_IDS.includes(q.id)) return <ConsentItem q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
      return <RadioGroupField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    case "checkbox_group": return <CheckboxGroupField q={q} language={language} value={arrVal} onChange={v => setAnswer(q.id, v)} />;
    case "select": return <SelectField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    case "signature": return <SignatureField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    case "likert":
    case "scale":
      return <LikertField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
    default: return <TextField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
  }
}

function FormIcon({ formType }: { formType: string }) {
  if (formType === "REFERRAL") return <ClipboardList size={28} className="text-primary" />;
  if (formType === "CONSENT") return <ShieldCheck size={28} className="text-primary" />;
  if (formType === "INTAKE") return <FileText size={28} className="text-primary" />;
  return <BrainCircuit size={28} className="text-primary" />;
}

function getSubtitle(formType: string, studentName: string, language: string) {
  const zh = language === "mandarin" || language === "cantonese";
  if (formType === "REFERRAL") return zh ? "学生转介表格" : "Student Referral Form";
  if (formType === "CONSENT") return zh ? `关于: ${studentName}` : `Regarding: ${studentName}`;
  if (formType === "INTAKE") return zh ? `关于: ${studentName}` : `Regarding: ${studentName}`;
  return zh ? `关于: ${studentName}` : `Regarding: ${studentName}`;
}

function getSubmitLabel(formType: string) {
  if (formType === "REFERRAL") return "Submit Referral";
  if (formType === "CONSENT") return "Submit Consent";
  if (formType === "INTAKE") return "Submit Intake Form";
  return "Submit Form";
}

function getSuccessMessage(formType: string) {
  if (formType === "REFERRAL") return "Your referral has been submitted. The ReMynd team will be in touch shortly.";
  if (formType === "CONSENT") return "Your consent has been recorded. The assessment team will proceed accordingly.";
  if (formType === "INTAKE") return "Your intake information has been securely submitted to the assessment team.";
  return "Your responses have been securely submitted to the assessment team.";
}

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
      if (q.type === "section_header") return false;
      if (!q.required) return false;
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

  const progress = requiredQuestions.length > 0 ? (answeredRequired.length / requiredQuestions.length) * 100 : 0;

  const handleSubmit = () => {
    const missing = requiredQuestions.filter(q => {
      const val = answers[q.id];
      if (Array.isArray(val)) return val.length === 0;
      return !val;
    });
    if (missing.length > 0) {
      setValidationError(`Please complete all required fields (${missing.length} remaining).`);
      document.getElementById(`q-${missing[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const serialized: Record<string, string> = {};
    Object.entries(answers).forEach(([k, v]) => { serialized[k] = Array.isArray(v) ? v.join(", ") : v; });
    submitMut.mutate({ token: token as string, data: { answers: serialized, language } }, { onSuccess: () => setSubmitted(true) });
  };

  if (isLoading) {
    return <div className="min-h-screen flex justify-center items-center bg-slate-50"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (isError || !form) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50 p-6">
        <Card className="p-8 max-w-md text-center border-none shadow-lg">
          <div className="text-5xl mb-4">🔗</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Not Found</h2>
          <p className="text-slate-500">This form link is invalid or has expired. Please contact the assessment team.</p>
        </Card>
      </div>
    );
  }

  if (form.alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md text-center p-10 border-none shadow-xl">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-display font-bold mb-3 text-slate-900">Thank You!</h2>
          <p className="text-slate-500 text-lg">{getSuccessMessage(form.formType ?? "screener")}</p>
          <p className="text-slate-400 mt-4 text-sm">你可以关闭此页面 · You may close this page</p>
          <div className="mt-10 text-slate-400 flex items-center justify-center text-sm font-medium">
            <BrainCircuit size={16} className="mr-2" /> ReMynd Assessment
          </div>
        </Card>
      </div>
    );
  }

  const formType = form.formType ?? "screener";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center text-primary">
          <BrainCircuit size={22} className="mr-2" />
          <span className="font-display font-bold tracking-tight text-base">ReMynd</span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {["english", "mandarin", "cantonese"].map(lang => (
            <button key={lang} onClick={() => setLanguage(lang)}
              className={cn("px-3 py-1.5 text-xs rounded-md font-medium transition-colors",
                language === lang ? "bg-white shadow-sm text-primary" : "text-slate-500")}>
              {lang === "english" ? "En" : lang === "mandarin" ? "普" : "粤"}
            </button>
          ))}
        </div>
      </header>

      <div className="w-full bg-slate-200 h-1.5">
        <div className="bg-primary h-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-8 pb-32">
        <div className="mb-8 flex items-start gap-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1">
            <FormIcon formType={formType} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">{form.toolName}</h1>
            <p className="text-slate-500 mt-1">{getSubtitle(formType, form.studentName, language)}</p>
            {requiredQuestions.length > 0 && (
              <p className="text-xs text-slate-400 mt-2">
                {answeredRequired.length} of {requiredQuestions.length} required fields completed
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {(form.questions as Question[]).map(q => (
            <div key={q.id} id={`q-${q.id}`}>
              <QuestionField q={q} language={language} answers={answers} setAnswer={setAnswer} />
            </div>
          ))}
        </div>

        {validationError && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {validationError}
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-slate-200">
          <Button size="lg" onClick={handleSubmit} disabled={submitMut.isPending}
            className="w-full h-14 text-base rounded-2xl shadow-lg shadow-primary/20">
            {submitMut.isPending ? "Submitting securely..." : getSubmitLabel(formType)}
          </Button>
          <p className="text-center text-xs text-slate-400 mt-3">
            🔒 Your data is transmitted securely and kept confidential
          </p>
        </div>
      </main>
    </div>
  );
}
