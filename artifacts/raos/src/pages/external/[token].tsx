import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useGetExternalForm, useSubmitExternalForm } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, ChevronDown, FileText, ClipboardList, ShieldCheck, Lock,
  ArrowLeft, ChevronRight, ClipboardCheck, Clock, Info, Download, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type PortalForm = {
  toolId: string;
  toolName: string;
  status: string;
  uniqueToken: string;
};

type ReportFile = {
  id: string;
  filename: string;
  label: string | null;
  uploadedAt: string;
};

type ReportAccess = {
  tokenId: string;
  role: "parent" | "teacher";
  files: ReportFile[];
  downloadedAt: string | null;
  permissionGranted: boolean | null;
  adminOverride: boolean;
  blocked: boolean;
  hasAccessCode: boolean;
};

type PortalData = {
  studentName: string;
  currentPhase: string;
  progressPercentage: number;
  languagePreference: string;
  respondentLabel: string | null;
  respondentType: string | null;
  assignedToName: string | null;
  forms: PortalForm[];
  reportAccess: ReportAccess | null;
  debriefMeetingUrl?: string | null;
  debriefMeetingDate?: string | null;
};

// ── Phase config ──────────────────────────────────────────────────────────────

const PHASES = [
  { key: "intake",         label: "Intake",     labelZh: "接收",   labelKo: "접수" },
  { key: "assessment",     label: "Assessment", labelZh: "评估",   labelKo: "평가" },
  { key: "scoring",        label: "Scoring",    labelZh: "评分",   labelKo: "채점" },
  { key: "report",         label: "Report",     labelZh: "报告",   labelKo: "보고서" },
  { key: "debrief",        label: "Debrief",    labelZh: "汇报",   labelKo: "결과설명" },
];

function phaseLabel(phase: typeof PHASES[0], language: string) {
  if (language === "mandarin") return phase.labelZh;
  if (language === "korean")   return phase.labelKo;
  return phase.label;
}

// ── Portal translations ────────────────────────────────────────────────────────

type Lang = "english" | "mandarin" | "korean";

const PT = {
  portalSubtitle:    { english: "Assessment Portal",         mandarin: "评估门户",         korean: "평가 포털" },
  respondent:        { english: "Respondent",                mandarin: "受访者",           korean: "응답자" },
  completeFirst:     { english: "Complete referral form first", mandarin: "请先完成推荐表格", korean: "추천 양식을 먼저 완료하세요" },
  locked:            { english: "Locked",                    mandarin: "已锁定",           korean: "잠김" },
  assessmentProgress:{ english: "Assessment Progress",       mandarin: "评估进度",         korean: "평가 진행 상황" },
  currentPhase:      { english: "Current Phase",             mandarin: "当前阶段",         korean: "현재 단계" },
  overallProgress:   { english: "Overall Progress",          mandarin: "整体进度",         korean: "전체 진행률" },
  yourForms:         { english: "Your Assigned Forms",       mandarin: "您的指定表格",     korean: "배정된 양식" },
  allDone:           { english: "All forms completed — thank you!", mandarin: "所有表格已完成——谢谢！", korean: "모든 양식 완료 — 감사합니다!" },
  completed:         { english: "Completed",                 mandarin: "已完成",           korean: "완료" },
  pending:           { english: "Pending",                   mandarin: "待完成",           korean: "대기 중" },
  completeNow:       { english: "Complete Now",              mandarin: "立即完成",         korean: "지금 완료" },
  secureTitle:       { english: "Your responses are secure", mandarin: "您的回复是安全的", korean: "귀하의 응답은 안전합니다" },
  secureBody:        {
    english:  "All information submitted through this portal is encrypted and shared only with the authorised assessment team. You can return to this page at any time using your original link.",
    mandarin: "通过此门户提交的所有信息均已加密，仅与授权评估团队共享。您可以随时使用原始链接返回此页面。",
    korean:   "이 포털을 통해 제출된 모든 정보는 암호화되어 승인된 평가팀과만 공유됩니다. 원래 링크를 사용하여 언제든지 이 페이지로 돌아올 수 있습니다.",
  },
  reportReady:       { english: "Your Report is Ready", mandarin: "您的报告已准备好", korean: "보고서가 준비되었습니다" },
  reportReadyBody:   {
    english:  "Your psychoeducational assessment report is available to download. This document is confidential and intended for your personal use.",
    mandarin: "您的心理教育评估报告可供下载。本文件属于保密文件，仅供您个人使用。",
    korean:   "심리교육 평가 보고서를 다운로드할 수 있습니다. 이 문서는 기밀이며 귀하의 개인 사용을 위한 것입니다.",
  },
  downloadReport:    { english: "Download Report", mandarin: "下载报告", korean: "보고서 다운로드" },
  alreadyDownloaded: { english: "Downloaded", mandarin: "已下载", korean: "다운로드됨" },
  awaitingConsent:   { english: "Awaiting Parental Consent", mandarin: "等待家长同意", korean: "부모 동의 대기 중" },
  awaitingConsentBody: {
    english:  "The report will be available once the parent/guardian has reviewed and approved access.",
    mandarin: "报告将在家长/监护人审阅并批准访问后可供下载。",
    korean:   "부모/보호자가 검토하고 접근을 승인한 후 보고서를 이용할 수 있습니다.",
  },
  shareConsentTitle: { english: "Share Report with School?", mandarin: "与学校共享报告？", korean: "학교와 보고서 공유?" },
  shareConsentBody:  {
    english:  "Sharing this report with your child's school is strongly encouraged. It ensures the right support can be put in place promptly, and also invites the school to participate in the debrief meeting.",
    mandarin: "我们强烈建议您与孩子的学校共享此报告。这有助于学校尽快提供适当支持，同时也邀请学校参加汇报会议。",
    korean:   "이 보고서를 자녀의 학교와 공유하시길 강력히 권장합니다. 학교가 신속하게 적절한 지원을 제공할 수 있으며, 디브리핑 미팅에도 참여하게 됩니다.",
  },
  shareYes:          { english: "Yes, share with school", mandarin: "是的，与学校共享", korean: "예, 학교와 공유" },
  shareNotYet:       { english: "Not Yet", mandarin: "暂时不", korean: "아직은 아니에요" },
  consentGranted:    { english: "School access granted", mandarin: "已授予学校访问权限", korean: "학교 접근 허용됨" },
  consentWithheld:   { english: "School access not yet granted", mandarin: "尚未授予学校访问权限", korean: "학교 접근 아직 허용 안 됨" },
  debriefMeeting:    { english: "Debrief Meeting", mandarin: "汇报会议", korean: "디브리핑 미팅" },
  debriefMeetingBody: {
    english:  "Your clinician has set up a virtual meeting to walk you through the assessment results. Click below to join at your scheduled time.",
    mandarin: "您的临床医生已设置了一次虚拟会议，为您详细讲解评估结果。请在预定时间点击下方链接加入。",
    korean:   "담당 임상의가 평가 결과를 안내해 드리기 위해 가상 미팅을 준비했습니다. 예약된 시간에 아래 버튼을 클릭하여 참여하세요.",
  },
  meetingScheduled:  { english: "Scheduled:", mandarin: "预定时间：", korean: "예정 일시:" },
  joinMeeting:       { english: "Join Debrief Meeting", mandarin: "加入汇报会议", korean: "디브리핑 미팅 참여" },
} satisfies Record<string, Record<Lang, string>>;

function t(key: keyof typeof PT, language: string): string {
  const lang = (["english","mandarin","korean"].includes(language) ? language : "english") as Lang;
  return PT[key][lang];
}

function formsRemainingLabel(pending: number, completed: number, language: string): string {
  if (language === "mandarin") return `${pending} 份表格待完成 · ${completed} 已完成`;
  if (language === "korean")   return `${pending}개 양식 남음 · ${completed}개 완료`;
  return `${pending} form${pending !== 1 ? "s" : ""} remaining · ${completed} completed`;
}

function phaseIndex(key: string) {
  return PHASES.findIndex(p => p.key === key);
}

// ── Portal data hook ──────────────────────────────────────────────────────────

function usePortalData(token: string, refreshKey: number) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/external/portal/${token}`)
      .then(r => {
        if (!r.ok) throw new Error("not found");
        return r.json() as Promise<PortalData>;
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [token, refreshKey]);

  return { data, loading, error };
}

// ── Text helpers ──────────────────────────────────────────────────────────────

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
      {note && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{note}</p>}
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

function SingleCheckboxField({ q, language, value, onChange }: { q: Question; language: string; value: string; onChange: (v: string) => void }) {
  const { label } = useText(q, language);
  const checked = value === "1";
  return (
    <button
      type="button"
      onClick={() => onChange(checked ? "" : "1")}
      className={cn(
        "w-full flex items-start gap-3 text-left rounded-lg border px-3.5 py-3 transition-all",
        checked
          ? "border-primary bg-primary/5"
          : "border-slate-200 bg-white hover:border-slate-300"
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
          const numericVal = String(i);
          const selected = value === numericVal || value === srcVal;
          const score = LIKERT_SCORE_LABELS[i] ?? String(i + 1);
          return (
            <button
              key={srcVal}
              onClick={() => onChange(numericVal)}
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

// ── Question Dispatcher ───────────────────────────────────────────────────────

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
    case "checkbox":       return <SingleCheckboxField q={q} language={language} value={strVal} onChange={v => setAnswer(q.id, v)} />;
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
  return <img src="/images/remynd-logo.png" alt="ReMynd" className="w-9 h-9 object-contain mix-blend-multiply" />;
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

// ── Phase Tracker Component ───────────────────────────────────────────────────

function PhaseTracker({ currentPhase, progressPercentage, studentName, language }: {
  currentPhase: string;
  progressPercentage: number;
  studentName: string;
  language: string;
}) {
  const rawIdx = phaseIndex(currentPhase);
  const lastIdx = PHASES.length - 1;
  const currentIdx = rawIdx === -1 ? 0 : Math.min(Math.max(rawIdx, 0), lastIdx);
  const currentLabel = phaseLabel(PHASES[currentIdx] ?? PHASES[0], language);

  return (
    <div className="bg-[#111827] rounded-2xl p-5 md:p-6 text-white shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
        {t("assessmentProgress", language)} — {studentName}
      </p>

      {/* Steps row */}
      <div className="relative flex items-center gap-0">
        {PHASES.map((phase, idx) => {
          const isCompleted = idx < currentIdx;
          const isCurrent = idx === currentIdx;

          return (
            <div key={phase.key} className="flex-1 flex flex-col items-center relative">
              {idx > 0 && (
                <div className={cn(
                  "absolute left-0 right-1/2 top-[15px] h-0.5 -translate-y-1/2",
                  isCompleted || isCurrent ? "bg-primary" : "bg-slate-700"
                )} />
              )}
              {idx < PHASES.length - 1 && (
                <div className={cn(
                  "absolute left-1/2 right-0 top-[15px] h-0.5 -translate-y-1/2",
                  isCompleted ? "bg-primary" : "bg-slate-700"
                )} />
              )}

              <div className={cn(
                "relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all",
                isCompleted ? "bg-primary border-primary text-white" :
                isCurrent   ? "bg-primary border-primary text-white ring-4 ring-primary/20" :
                              "bg-[#1f2937] border-slate-600 text-slate-500"
              )}>
                {isCompleted ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              <span className={cn(
                "mt-2 text-[9px] font-semibold uppercase tracking-wide text-center leading-tight hidden sm:block",
                isCurrent ? "text-primary" :
                isCompleted ? "text-slate-400" :
                "text-slate-600"
              )}>
                {phaseLabel(phase, language)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("currentPhase", language)}</p>
          <p className="text-base font-bold text-white mt-0.5">{currentLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("overallProgress", language)}</p>
          <p className="text-base font-bold text-primary mt-0.5">{progressPercentage}%</p>
        </div>
      </div>
    </div>
  );
}

// ── Portal View ───────────────────────────────────────────────────────────────

const LANG_OPTIONS = [
  { id: "english",  label: "En" },
  { id: "mandarin", label: "中" },
  { id: "korean",   label: "한" },
];

function PortalView({
  portal,
  language,
  setLanguage,
  onStartForm,
}: {
  portal: PortalData;
  language: string;
  setLanguage: (l: string) => void;
  onStartForm: (token: string) => void;
}) {
  const pendingCount = portal.forms.filter(f => f.status !== "completed").length;
  const completedCount = portal.forms.filter(f => f.status === "completed").length;
  const allDone = pendingCount === 0;
  const ADMIN_TOOL_IDS = new Set(["REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING", "CONSENT", "INTAKE"]);
  const adminFormsAllDone = portal.forms.filter(f => ADMIN_TOOL_IDS.has(f.toolId)).every(f => f.status === "completed");

  // Report download state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentSubmitting, setConsentSubmitting] = useState(false);
  const [consentDecision, setConsentDecision] = useState<boolean | null>(
    portal.reportAccess?.permissionGranted ?? null
  );

  // Access code / PIN gate
  const pinKey = portal.reportAccess ? `raos_pin_${portal.reportAccess.tokenId}` : null;
  const [pinVerified, setPinVerified] = useState(() => {
    if (!portal.reportAccess?.hasAccessCode) return true;
    return pinKey ? sessionStorage.getItem(pinKey) === "1" : false;
  });
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinChecking, setPinChecking] = useState(false);

  const handleVerifyPin = async () => {
    if (!portal.reportAccess || !pinInput.trim()) return;
    setPinChecking(true);
    setPinError("");
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const resp = await fetch(`${apiBase}/api/external/report/${portal.reportAccess.tokenId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: pinInput.trim() }),
      });
      if (resp.ok) {
        if (pinKey) sessionStorage.setItem(pinKey, "1");
        sessionStorage.setItem(`raos_code_${portal.reportAccess.tokenId}`, pinInput.trim());
        setPinVerified(true);
      } else {
        setPinError("Incorrect access code. Please check with the person who shared this link.");
      }
    } catch {
      setPinError("Could not verify. Please check your connection and try again.");
    } finally {
      setPinChecking(false);
    }
  };

  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const handleDownloadFile = async (file: ReportFile) => {
    if (!portal.reportAccess) return;
    setDownloadingFileId(file.id);
    const storedCode = portal.reportAccess.hasAccessCode
      ? sessionStorage.getItem(`raos_code_${portal.reportAccess.tokenId}`) ?? ""
      : "";
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const headers: Record<string, string> = {};
      if (storedCode) headers["X-Access-Code"] = storedCode;
      const resp = await fetch(`${apiBase}/api/external/report/${portal.reportAccess.tokenId}/download?uploadId=${file.id}`, { headers });
      if (!resp.ok) throw new Error("Download failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.filename;
      a.click();
      URL.revokeObjectURL(url);
      // After first download, show consent modal for parents
      if (portal.reportAccess.role === "parent" && consentDecision === null) {
        setTimeout(() => setShowConsentModal(true), 800);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleDownloadReport = async () => {
    if (!portal.reportAccess) return;
    const files = portal.reportAccess.files ?? [];
    if (files.length === 1) {
      await handleDownloadFile(files[0]);
    } else if (files.length > 1) {
      await handleDownloadFile(files[files.length - 1]);
    }
  };

  const handleConsent = async (granted: boolean) => {
    if (!portal.reportAccess) return;
    setConsentSubmitting(true);
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      await fetch(`${apiBase}/api/external/report/${portal.reportAccess.tokenId}/permission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ granted }),
      });
      setConsentDecision(granted);
      setShowConsentModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setConsentSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col">
      {/* Header */}
      <header
        className="relative overflow-hidden sticky top-0 z-20"
        style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0a1628 45%, #060d1c 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10 px-5 py-3 flex items-center gap-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
              <img src="/images/remynd-logo.png" alt="ReMynd" className="w-8 h-8 object-contain" />
            </div>
            <div className="leading-none">
              <span className="font-display font-bold text-xl tracking-tight leading-none text-white block">ReMynd</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">{t("portalSubtitle", language)}</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {(portal.assignedToName || portal.respondentLabel) && (
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-white">
                  {portal.assignedToName
                    ? portal.respondentLabel
                      ? `${portal.assignedToName} — ${portal.respondentLabel}`
                      : portal.assignedToName
                    : portal.respondentLabel}
                </p>
                <p className="text-[10px] text-slate-400">{t("respondent", language)}</p>
              </div>
            )}
            <div className="flex bg-white/[0.08] border border-white/[0.10] p-0.5 rounded-lg">
              {LANG_OPTIONS.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md font-semibold transition-all",
                    language === lang.id ? "bg-white shadow-sm text-indigo-700" : "text-slate-400 hover:text-slate-200"
                  )}>
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 md:px-6 py-8 space-y-5">

        {/* Phase Tracker */}
        <PhaseTracker
          currentPhase={portal.currentPhase}
          progressPercentage={portal.progressPercentage}
          studentName={portal.studentName}
          language={language}
        />

        {/* Forms Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{t("yourForms", language)}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {allDone
                  ? t("allDone", language)
                  : formsRemainingLabel(pendingCount, completedCount, language)}
              </p>
            </div>
            {allDone && (
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100">
            {portal.forms.map((f) => {
              const isDone = f.status === "completed";
              const isLocked = !isDone && !ADMIN_TOOL_IDS.has(f.toolId) && !adminFormsAllDone;
              return (
                <div key={f.uniqueToken} className={cn(
                  "flex items-center gap-4 px-5 py-4 transition-colors",
                  !isDone && !isLocked && "hover:bg-slate-50/60"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    isDone ? "bg-emerald-100" : isLocked ? "bg-slate-100" : "bg-primary/10"
                  )}>
                    {isDone
                      ? <ClipboardCheck size={20} className="text-emerald-600" />
                      : isLocked
                      ? <Lock size={20} className="text-slate-400" />
                      : <ClipboardList size={20} className="text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold truncate", isLocked ? "text-slate-400" : "text-slate-800")}>{f.toolName}</p>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide mt-0.5",
                      isDone ? "text-emerald-600" : isLocked ? "text-slate-400" : "text-amber-600"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isDone ? "bg-emerald-500" : isLocked ? "bg-slate-300" : "bg-amber-500")} />
                      {isDone ? t("completed", language) : isLocked ? t("completeFirst", language) : t("pending", language)}
                    </span>
                  </div>
                  {isDone ? (
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                  ) : isLocked ? (
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Lock size={14} className="text-slate-400" />
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onStartForm(f.uniqueToken)}
                      className="text-xs shrink-0 gap-1"
                    >
                      {t("completeNow", language)}
                      <ChevronRight size={13} />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Report Download Card */}
        {portal.reportAccess && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <FileText size={18} className="text-indigo-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {portal.reportAccess.blocked ? t("awaitingConsent", language) : t("reportReady", language)}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {portal.reportAccess.blocked
                    ? t("awaitingConsentBody", language)
                    : portal.reportAccess.files?.length > 1
                    ? `${portal.reportAccess.files.length} documents available`
                    : (portal.reportAccess.files?.[0]?.label ?? portal.reportAccess.files?.[0]?.filename ?? "")}
                </p>
              </div>
            </div>
            <div className="px-5 py-4">
              {/* Access code gate */}
              {portal.reportAccess.hasAccessCode && !pinVerified ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    This report is protected. Please enter the access code provided to you to continue.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="6-digit code"
                      value={pinInput}
                      onChange={e => { setPinInput(e.target.value.replace(/\D/g, "")); setPinError(""); }}
                      onKeyDown={e => { if (e.key === "Enter") handleVerifyPin(); }}
                      className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-lg tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      onClick={handleVerifyPin}
                      disabled={pinChecking || pinInput.length < 6}
                      className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                    >
                      {pinChecking ? "Checking…" : "Confirm"}
                    </button>
                  </div>
                  {pinError && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <Lock size={11} /> {pinError}
                    </p>
                  )}
                </div>
              ) : portal.reportAccess.blocked ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
                  <Clock size={14} className="text-amber-500 shrink-0" />
                  <span>{t("awaitingConsentBody", language)}</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 leading-relaxed">{t("reportReadyBody", language)}</p>

                  {/* Multi-file download list */}
                  {(portal.reportAccess.files?.length ?? 0) > 1 ? (
                    <div className="space-y-2">
                      {portal.reportAccess.files.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => handleDownloadFile(file)}
                          disabled={downloadingFileId === file.id}
                          className="w-full flex items-center gap-3 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 border border-indigo-100 text-indigo-800 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors text-left"
                        >
                          {downloadingFileId === file.id
                            ? <Loader2 size={14} className="animate-spin shrink-0"/>
                            : <Download size={14} className="shrink-0"/>}
                          <span className="flex-1 truncate">{file.label ?? file.filename}</span>
                          <span className="text-[10px] text-indigo-500 shrink-0">
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={handleDownloadReport}
                      disabled={!!downloadingFileId}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
                    >
                      {downloadingFileId ? (
                        <><Loader2 size={15} className="animate-spin" /> Downloading…</>
                      ) : portal.reportAccess.downloadedAt ? (
                        <><Download size={15} /> {t("alreadyDownloaded", language)} — {t("downloadReport", language)}</>
                      ) : (
                        <><Download size={15} /> {t("downloadReport", language)}</>
                      )}
                    </button>
                  )}

                  {/* Consent status indicator for parents */}
                  {portal.reportAccess.role === "parent" && (
                    <div className="flex items-center gap-2 text-xs">
                      {consentDecision === true ? (
                        <span className="flex items-center gap-1.5 text-emerald-700"><CheckCircle2 size={13} className="text-emerald-500" />{t("consentGranted", language)}</span>
                      ) : consentDecision === false ? (
                        <button onClick={() => setShowConsentModal(true)} className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors">
                          <Info size={13} />{t("consentWithheld", language)} — change?
                        </button>
                      ) : portal.reportAccess.downloadedAt ? (
                        <button onClick={() => setShowConsentModal(true)} className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 transition-colors">
                          <Info size={13} />{t("shareConsentTitle", language)}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Debrief Meeting Card */}
        {portal.debriefMeetingUrl && (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                  <path d="m22 8-6 4 6 4V8z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-sm font-bold text-slate-900">{t("debriefMeeting", language)}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t("debriefMeetingBody", language)}</p>
              </div>
            </div>
            {portal.debriefMeetingDate && (
              <div className="mx-5 mb-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>
                </svg>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">{t("meetingScheduled", language)}</p>
                  <p className="text-xs font-medium text-slate-800 mt-0.5">{portal.debriefMeetingDate}</p>
                </div>
              </div>
            )}
            <div className="px-5 pb-5">
              <a
                href={`/join/debrief?type=debrief&student=${encodeURIComponent(portal.studentName)}&redirectUrl=${encodeURIComponent(portal.debriefMeetingUrl!)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m22 8-6 4 6 4V8z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
                </svg>
                {t("joinMeeting", language)} ↗
              </a>
            </div>
          </div>
        )}

        {/* Parental Consent Modal */}
        {showConsentModal && portal.reportAccess && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 mx-auto">
                <FileText size={22} className="text-indigo-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900 text-center mb-2">{t("shareConsentTitle", language)}</h3>
              <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">{t("shareConsentBody", language)}</p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleConsent(true)}
                  disabled={consentSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {consentSubmitting ? <Loader2 size={15} className="animate-spin mx-auto" /> : t("shareYes", language)}
                </button>
                <button
                  onClick={() => handleConsent(false)}
                  disabled={consentSubmitting}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  {t("shareNotYet", language)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info notice */}
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 flex gap-3 items-start">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lock size={14} className="text-blue-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700">{t("secureTitle", language)}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {t("secureBody", language)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 pb-8 flex items-center justify-center">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-4 h-4 object-contain mix-blend-multiply" />
            <span>ReMynd Assessment System</span>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Form View (inline) ────────────────────────────────────────────────────────

function FormView({
  activeToken,
  language,
  setLanguage,
  onBack,
  onSubmitted,
}: {
  activeToken: string;
  language: string;
  setLanguage: (l: string) => void;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const { data: form, isLoading, isError } = useGetExternalForm(activeToken, { query: { retry: false } });
  const submitMut = useSubmitExternalForm();

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
    submitMut.mutate({ token: activeToken, data: { answers: serialized, language } }, {
      onSuccess: () => {
        setSubmitted(true);
      },
    });
  };

  const ReMyndFooter = () => (
    <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-center">
      <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
        <img src="/images/remynd-logo.png" alt="ReMynd" className="w-4 h-4 object-contain mix-blend-multiply" />
        <span>ReMynd Assessment System</span>
      </div>
    </div>
  );

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

  if (isError || !form) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5 text-2xl">🔗</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Not Found</h2>
          <p className="text-slate-500 text-sm leading-relaxed">This form link is invalid or has already expired.</p>
          <button onClick={onBack} className="mt-6 text-sm text-primary underline">← Back to portal</button>
          <ReMyndFooter />
        </div>
      </div>
    );
  }

  // Locked — referral form must be completed first
  if ((form as any).lockedPendingReferral) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-md text-center">
          <div className="w-24 h-24 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Lock size={44} />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-slate-900">Complete Referral Form First</h2>
          <p className="text-slate-500 leading-relaxed max-w-xs mx-auto">
            The referral form must be submitted before the consent form can be accessed. Please go back to your portal and complete the referral form first.
          </p>
          <button
            onClick={onBack}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
          >
            ← Back to My Forms
          </button>
          <ReMyndFooter />
        </div>
      </div>
    );
  }

  // RPPI is examiner-administered — cannot be filled via external link
  const isRppiForm = (form.questions as Question[]).some(q => q.type === "rppi_item" || q.type === "rppi_admin");
  if (isRppiForm) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-violet-100 text-violet-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm text-4xl">
            🎙️
          </div>
          <h2 className="text-2xl font-bold mb-3 text-slate-900">Examiner-Administered Assessment</h2>
          <p className="text-slate-500 leading-relaxed max-w-xs mx-auto mb-2">
            The <strong>ReMynd Phonological Processing Index (RPPI)</strong> must be administered directly by a trained examiner — it cannot be completed through this link.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
            If you are an examiner, please use the <strong>Administer RPPI</strong> button from the student's case profile.
          </p>
          <button
            onClick={onBack}
            className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm font-semibold rounded-xl shadow-md hover:bg-slate-700 transition-colors"
          >
            ← Back to Portal
          </button>
          <ReMyndFooter />
        </div>
      </div>
    );
  }

  // Already submitted — show thank you and back button
  if (form.alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="w-full max-w-md text-center">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100">
            <CheckCircle2 size={44} />
          </div>
          <h2 className="text-3xl font-display font-bold mb-3 text-slate-900">
            {submitted ? "Submitted!" : "Thank You"}
          </h2>
          <p className="text-slate-600 leading-relaxed max-w-xs mx-auto">
            {getSuccessMessage(form.formType ?? "screener")}
          </p>
          <button
            onClick={onSubmitted}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors"
          >
            ← Back to My Forms
          </button>
          <ReMyndFooter />
        </div>
      </div>
    );
  }

  const formType = form.formType ?? "screener";

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col">
      {/* Nav */}
      <header
        className="relative overflow-hidden sticky top-0 z-20"
        style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0a1628 45%, #060d1c 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-medium transition-colors"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">My Forms</span>
            </button>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <img src="/images/remynd-logo.png" alt="ReMynd" className="w-8 h-8 object-contain" />
              </div>
              <div className="leading-none">
                <span className="font-display font-bold text-xl tracking-tight leading-none text-white block">ReMynd</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Student Services</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {requiredQuestions.length > 0 && (
              <span className="text-xs text-slate-400 font-medium hidden sm:block">
                {answeredRequired.length} / {requiredQuestions.length} completed
              </span>
            )}
            <div className="flex bg-white/[0.08] border border-white/[0.10] p-0.5 rounded-lg">
              {[{ id: "english", label: "En" }, { id: "mandarin", label: "中" }, { id: "korean", label: "한" }].map(lang => (
                <button
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-md font-semibold transition-all",
                    language === lang.id ? "bg-white shadow-sm text-indigo-700" : "text-slate-400 hover:text-slate-200"
                  )}>
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Progress bar inside header bottom */}
        <div className="w-full h-0.5 bg-white/10">
          <div
            className="h-full bg-blue-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Form body */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 md:px-6 py-8 pb-32">
        {/* Form Header Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
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
        {(() => {
          // Pre-compute per-section display numbers: resets to 1 after every section_header
          const questionNums = new Map<string, number>();
          let n = 0;
          for (const q of (form.questions as Question[])) {
            if (q.type === "section_header") { n = 0; }
            else { n += 1; questionNums.set(q.id, n); }
          }
          return (
            <div className="space-y-5">
              {(form.questions as Question[]).map(q => {
                const isSection = q.type === "section_header";
                const num = questionNums.get(q.id);
                return (
                  <div key={q.id} id={`q-${q.id}`}>
                    {isSection ? (
                      <QuestionField q={q} language={language} answers={answers} setAnswer={setAnswer} />
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <div className="flex gap-3">
                          <span className="text-sm font-bold text-slate-400 font-mono w-7 flex-shrink-0 mt-0.5 select-none">
                            {num}.
                          </span>
                          <div className="flex-1 min-w-0">
                            <QuestionField q={q} language={language} answers={answers} setAnswer={setAnswer} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {validationError && (
          <div className="mt-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <span className="font-semibold">⚠</span>
            <span>{validationError}</span>
          </div>
        )}

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

// ── Main Controller ───────────────────────────────────────────────────────────

export default function ExternalFormView() {
  const { token } = useParams();
  const portalToken = token as string;
  const [, setLocation] = useLocation();

  // Detect if accessed from a case page (for staff)
  const searchParams = new URLSearchParams(window.location.search);
  const fromCase = searchParams.get("from") === "case";
  const fromCaseId = searchParams.get("caseId") ?? "";

  const [mode, setMode] = useState<"portal" | "form">("portal");
  const [activeFormToken, setActiveFormToken] = useState<string>(portalToken);
  const [language, setLanguage] = useState("english");
  const [portalRefreshKey, setPortalRefreshKey] = useState(0);

  const { data: portal, loading: portalLoading, error: portalError } = usePortalData(portalToken, portalRefreshKey);

  // Auto-set language from case preference when portal data first loads
  useEffect(() => {
    if (portal?.languagePreference && portal.languagePreference !== "english") {
      setLanguage(portal.languagePreference);
    }
  }, [portal?.languagePreference]);

  const handleStartForm = useCallback((formToken: string) => {
    setActiveFormToken(formToken);
    setMode("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleBack = useCallback(() => {
    setMode("portal");
    setPortalRefreshKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleSubmitted = useCallback(() => {
    setMode("portal");
    setPortalRefreshKey(k => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const BrandHeader = () => (
    <>
      {fromCase && (
        <div style={{ background: '#1e40af', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setLocation(`/cases/${fromCaseId}`)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fff', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <ArrowLeft size={14} /> Back to Case
          </button>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Staff view — filling form on behalf of invigilator</span>
        </div>
      )}
      <header
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0a1628 45%, #060d1c 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10 px-5 py-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-8 h-8 object-contain" />
          </div>
          <div className="leading-none">
            <span className="font-display font-bold text-xl tracking-tight leading-none text-white block">ReMynd</span>
            <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Student Services</span>
          </div>
        </div>
      </header>
    </>
  );

  // Portal loading state
  if (portalLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <BrandHeader />
        <div className="flex-1 flex justify-center items-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-slate-500">Loading your portal...</p>
          </div>
        </div>
      </div>
    );
  }

  // Portal error state
  if (portalError || !portal) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <BrandHeader />
        <div className="flex-1 flex justify-center items-center p-6">
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center border border-slate-100">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Link Not Found</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              This link is invalid or has expired. Please contact the assessment team for a new link.
            </p>
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
              <img src="/images/remynd-logo.png" alt="ReMynd" className="w-4 h-4 object-contain mix-blend-multiply" />
              <span>ReMynd Assessment System</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "form") {
    return (
      <FormView
        key={activeFormToken}
        activeToken={activeFormToken}
        language={language}
        setLanguage={setLanguage}
        onBack={handleBack}
        onSubmitted={handleSubmitted}
      />
    );
  }

  return (
    <PortalView
      portal={portal}
      language={language}
      setLanguage={setLanguage}
      onStartForm={handleStartForm}
    />
  );
}
