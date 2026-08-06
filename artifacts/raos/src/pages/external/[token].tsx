import { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useGetExternalForm, useSubmitExternalForm } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2, ChevronDown, FileText, ClipboardList, ShieldCheck, Lock,
  ArrowLeft, ChevronRight, ClipboardCheck, Clock, Info, Download, Loader2, BookOpen, Printer, X,
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
  bobbyAiPortalCredentials?: string | null;
};

// ── Phase config ──────────────────────────────────────────────────────────────

const PHASES = [
  { key: "intake",         label: "Intake",     labelZh: "接收",   labelKo: "접수" },
  { key: "assessment",     label: "Assessment", labelZh: "评估",   labelKo: "평가" },
  { key: "scoring",        label: "Scoring",    labelZh: "评分",   labelKo: "채점" },
  { key: "report",         label: "Report",     labelZh: "报告",   labelKo: "보고서" },
  { key: "debrief",        label: "Debrief",    labelZh: "汇报",   labelKo: "결과설명" },
];

function renderChatMarkdown(text: string): React.ReactNode {
  const paragraphs = text.split(/\n{2,}/);
  const nodes: React.ReactNode[] = [];

  paragraphs.forEach((para, pi) => {
    const lines = para.split("\n").filter(l => l.trim() !== "");
    if (!lines.length) return;

    // ### Heading
    if (/^#{1,3}\s/.test(lines[0])) {
      nodes.push(
        <p key={`h${pi}`} className="text-[11px] font-bold text-slate-800 mt-3 mb-0.5 uppercase tracking-wide">
          {renderInline(lines[0].replace(/^#{1,3}\s/, ""))}
        </p>
      );
      lines.slice(1).forEach((l, li) =>
        nodes.push(<p key={`h${pi}x${li}`} className="text-xs leading-relaxed text-slate-700">{renderInline(l)}</p>)
      );
      return;
    }

    // Bullet list (- or * or •)
    if (lines.every(l => /^[\-\*•]\s/.test(l.trim()))) {
      nodes.push(
        <ul key={`u${pi}`} className={`list-disc pl-4 space-y-1 ${pi > 0 ? "mt-2" : ""}`}>
          {lines.map((l, li) => (
            <li key={li} className="text-xs leading-relaxed text-slate-700">
              {renderInline(l.replace(/^[\-\*•]\s+/, ""))}
            </li>
          ))}
        </ul>
      );
      return;
    }

    // Numbered list (1. 2. etc.)
    if (lines.every(l => /^\d+\.\s/.test(l.trim()))) {
      nodes.push(
        <ol key={`o${pi}`} className={`list-decimal pl-4 space-y-1.5 ${pi > 0 ? "mt-2" : ""}`}>
          {lines.map((l, li) => (
            <li key={li} className="text-xs leading-relaxed text-slate-700">
              {renderInline(l.replace(/^\d+\.\s+/, ""))}
            </li>
          ))}
        </ol>
      );
      return;
    }

    // Plain paragraph
    nodes.push(
      <p key={`p${pi}`} className={`text-xs leading-relaxed text-slate-700 ${pi > 0 ? "mt-2" : ""}`}>
        {lines.map((l, li) => (
          <span key={li}>{renderInline(l)}{li < lines.length - 1 && <br />}</span>
        ))}
      </p>
    );
  });

  return <div className="space-y-0.5">{nodes}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-slate-800">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

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
  supportJourney:    { english: "Support Journey — Next 12 Months", mandarin: "支持旅程 — 未来12个月", korean: "지원 여정 — 향후 12개월" },
  currentPhase:      { english: "Current Phase",             mandarin: "当前阶段",         korean: "현재 단계" },
  overallProgress:   { english: "Overall Progress",          mandarin: "整体进度",         korean: "전체 진행률" },
  assessmentComplete:{ english: "Assessment Complete",       mandarin: "评估完成",         korean: "평가 완료" },
  monitoringActive:  { english: "12-Month Monitoring Active",mandarin: "12个月监测进行中", korean: "12개월 모니터링 활성" },
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
  accessCodeProtected: {
    english:  "This report is protected. Please enter the access code provided to you to continue.",
    mandarin: "此报告受保护。请输入提供给您的访问码以继续。",
    korean:   "이 보고서는 보호되어 있습니다. 계속하려면 제공된 접근 코드를 입력하세요.",
  },
  accessCodePlaceholder: { english: "6-digit code", mandarin: "6位数字码", korean: "6자리 코드" },
  accessCodeConfirm:     { english: "Confirm",      mandarin: "确认",       korean: "확인" },
  accessCodeChecking:    { english: "Checking…",    mandarin: "验证中…",    korean: "확인 중…" },
  accessCodeIncorrect: {
    english:  "Incorrect access code. Please check with the person who shared this link.",
    mandarin: "访问码不正确。请与分享此链接的人确认。",
    korean:   "잘못된 접근 코드입니다. 링크를 공유한 담당자에게 확인하세요.",
  },
  accessCodeNetworkError: {
    english:  "Could not verify. Please check your connection and try again.",
    mandarin: "无法验证。请检查您的网络连接后重试。",
    korean:   "확인할 수 없습니다. 인터넷 연결을 확인하고 다시 시도하세요.",
  },
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

const SUPPORT_MILESTONES = [
  { key: "debrief",    label: "Debrief",       labelZh: "汇报",      labelKo: "결과설명",  sub: "Complete",    subZh: "已完成",    subKo: "완료" },
  { key: "plan",       label: "Plan",          labelZh: "计划",      labelKo: "계획",      sub: "Month 1",     subZh: "第1个月",   subKo: "1개월" },
  { key: "checkin",    label: "Check-in",      labelZh: "检查",      labelKo: "점검",      sub: "Month 3",     subZh: "第3个月",   subKo: "3개월" },
  { key: "midreview",  label: "Mid-Review",    labelZh: "中期回顾",  labelKo: "중간점검",  sub: "Month 6",     subZh: "第6个月",   subKo: "6개월" },
  { key: "annual",     label: "Annual",        labelZh: "年度",      labelKo: "연간",      sub: "Month 12",    subZh: "第12个月",  subKo: "12개월" },
];

function supportMilestoneLabel(m: typeof SUPPORT_MILESTONES[0], language: string) {
  if (language === "mandarin") return { label: m.labelZh, sub: m.subZh };
  if (language === "korean")   return { label: m.labelKo, sub: m.subKo };
  return { label: m.label, sub: m.sub };
}

function PhaseTracker({ currentPhase, progressPercentage, studentName, language }: {
  currentPhase: string;
  progressPercentage: number;
  studentName: string;
  language: string;
}) {
  const isPostAssessment = currentPhase === "debrief";

  if (isPostAssessment) {
    return (
      <div className="bg-[#111827] rounded-2xl p-5 md:p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
          {t("supportJourney", language)} — {studentName}
        </p>

        <div className="relative flex items-center gap-0">
          {SUPPORT_MILESTONES.map((milestone, idx) => {
            const isCompleted = idx === 0;
            const isCurrent = idx === 1;
            const isUpcoming = idx > 1;

            return (
              <div key={milestone.key} className="flex-1 flex flex-col items-center relative">
                {idx > 0 && (
                  <div className={cn(
                    "absolute left-0 right-1/2 top-[15px] h-0.5 -translate-y-1/2",
                    isCompleted || isCurrent ? "bg-emerald-500" : "bg-slate-700"
                  )} />
                )}
                {idx < SUPPORT_MILESTONES.length - 1 && (
                  <div className={cn(
                    "absolute left-1/2 right-0 top-[15px] h-0.5 -translate-y-1/2",
                    isCompleted ? "bg-emerald-500" : "bg-slate-700"
                  )} />
                )}

                <div className={cn(
                  "relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all",
                  isCompleted ? "bg-emerald-500 border-emerald-500 text-white" :
                  isCurrent   ? "bg-[#1f2937] border-emerald-500 text-emerald-400 ring-4 ring-emerald-500/20" :
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
                  isCompleted ? "text-emerald-400" :
                  isCurrent   ? "text-emerald-400" :
                                "text-slate-600"
                )}>
                  {supportMilestoneLabel(milestone, language).label}
                </span>
                <span className={cn(
                  "text-[8px] text-center leading-tight hidden sm:block mt-0.5",
                  isCompleted ? "text-slate-400" :
                  isCurrent   ? "text-slate-400" :
                                "text-slate-700"
                )}>
                  {supportMilestoneLabel(milestone, language).sub}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("assessmentComplete", language)}</p>
            <p className="text-base font-bold text-emerald-400 mt-0.5">✓</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("monitoringActive", language)}</p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-base font-bold text-emerald-400">Active</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

  // AI chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "ai"; content: string }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);
  const [promptsLoaded, setPromptsLoaded] = useState(false);

  // Lesson differentiator state
  type DiffResult = { overview: string; challenges: string; strategies: string; stepByStep: string; language: string };
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffContent, setDiffContent] = useState("");
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);

  const portalToken = window.location.pathname.split("/").pop() ?? "";
  const role = portal.respondentType ?? "parent";
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  // ── Learning Support Coach™ state ──────────────────────────────────────────
  type LscDemandProfile = { overview: string; reading: string; writing: string; mathematics: string; executiveFunction: string; memory: string; attention: string };
  type LscGuide = { demandProfile: LscDemandProfile; strengths: string; overview: string; challenges: string; strategies: string; stepByStep: string; language: string; observationPoints: string; safetyNote?: string };
  type LscAnalysisRecord = { id: string; userRole: string; language: string; lessonContent: string; guide: LscGuide; demandProfile: LscDemandProfile; outputVersions: Record<string, LscGuide>; followUpMessages: Array<{ role: string; content: string }>; createdAt: string };
  type LscStatus = { productName: string; productSubtitle: string; subscriptionStatus: string; monthlyPrice: number; annualPrice: number; monthlyLimit: number; trialLimit: number; monthlyUsage: number; monthlyAllowance: number; expiresAt?: string | null; isAdminPreview?: boolean };

  const [lscOpen, setLscOpen] = useState(false);
  const [lscMonths, setLscMonths] = useState(3);
  const [lscInquiryOpen, setLscInquiryOpen] = useState(false);
  const [lscInquiryName, setLscInquiryName] = useState("");
  const [lscInquiryEmail, setLscInquiryEmail] = useState("");
  const [lscInquiryMonths, setLscInquiryMonths] = useState(1);
  const [lscInquirySending, setLscInquirySending] = useState(false);
  const [lscInquirySent, setLscInquirySent] = useState(false);
  const [lscStatus, setLscStatus] = useState<LscStatus | null>(null);
  const [lscStatusLoading, setLscStatusLoading] = useState(false);
  const lscAckKey = `lsc_ack_${portalToken}`;
  const [lscAcknowledged, setLscAcknowledged] = useState(() => { try { return sessionStorage.getItem(`lsc_ack_${portalToken}`) === "1"; } catch { return false; } });
  const [lscContent, setLscContent] = useState("");
  const [lscLoading, setLscLoading] = useState(false);
  const [lscAnalysis, setLscAnalysis] = useState<LscAnalysisRecord | null>(null);
  const [lscDisplayGuide, setLscDisplayGuide] = useState<LscGuide | null>(null);
  const [lscActiveRole, setLscActiveRole] = useState(role);
  const [lscVersionLoading, setLscVersionLoading] = useState(false);
  const [lscFollowUpInput, setLscFollowUpInput] = useState("");
  const [lscFollowUpLoading, setLscFollowUpLoading] = useState(false);
  const [lscFollowUpMessages, setLscFollowUpMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [lscHistoryLoaded, setLscHistoryLoaded] = useState(false);
  const [lscError, setLscError] = useState<string | null>(null);

  // Banner state: shown when language changes while a conversation is in progress
  const [showLangBanner, setShowLangBanner] = useState(false);

  // Effect 1: reset prompts whenever language changes; show banner if mid-conversation
  useEffect(() => {
    setSuggestedPrompts([]);
    setPromptsLoaded(false);
    if (chatMessages.length > 0) setShowLangBanner(true);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: fetch prompts whenever chat is open and prompts not yet loaded
  // (chains from Effect 1 — language change resets promptsLoaded → this re-fires)
  useEffect(() => {
    if (!chatOpen || promptsLoaded || promptsLoading) return;
    setPromptsLoading(true);
    fetch(`${apiBase}/api/external/portal/${portalToken}/prompts?role=${role}&language=${language}`)
      .then(r => r.ok ? r.json() : { prompts: [] })
      .then((data: { prompts?: string[] }) => setSuggestedPrompts(data.prompts ?? []))
      .catch(() => {})
      .finally(() => { setPromptsLoading(false); setPromptsLoaded(true); });
  }, [chatOpen, promptsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPrompts = async () => {
    if (promptsLoaded || promptsLoading) return;
    setPromptsLoading(true);
    try {
      const resp = await fetch(`${apiBase}/api/external/portal/${portalToken}/prompts?role=${role}&language=${language}`);
      if (resp.ok) {
        const data = await resp.json() as { prompts: string[] };
        setSuggestedPrompts(data.prompts ?? []);
      }
    } catch { /* ignore */ }
    finally { setPromptsLoading(false); setPromptsLoaded(true); }
  };

  const handleOpenChat = () => {
    setChatOpen(true);
    loadPrompts();
  };

  const handleSendChat = async (msg?: string) => {
    const text = (msg ?? chatInput).trim();
    if (!text || chatLoading) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: text }]);
    setChatLoading(true);
    try {
      const resp = await fetch(`${apiBase}/api/external/portal/${portalToken}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatMessages.map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.content })),
          role,
          language,
        }),
      });
      const data = await resp.json() as { reply?: string };
      setChatMessages(prev => [...prev, { role: "ai", content: data.reply ?? "Sorry, I could not respond right now." }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "ai", content: "Sorry, there was a network error. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDifferentiate = async () => {
    if (!diffContent.trim() || diffLoading) return;
    setDiffLoading(true);
    setDiffResult(null);
    try {
      const resp = await fetch(`${apiBase}/api/external/portal/${portalToken}/differentiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: diffContent, language, role }),
      });
      if (!resp.ok) throw new Error();
      const data = await resp.json() as { sections: DiffResult };
      setDiffResult(data.sections);
    } catch {
      alert(language === "mandarin" ? "无法生成支持方案，请重试。" : language === "korean" ? "지원 계획을 생성할 수 없습니다. 다시 시도해 주세요." : "Could not generate support plan. Please try again.");
    } finally {
      setDiffLoading(false);
    }
  };

  // ── Learning Support Coach™ handlers ───────────────────────────────────────
  const loadLscStatus = async (force = false) => {
    if (lscStatus && !force) return;
    setLscStatusLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/external/portal/${portalToken}/lsc/status`);
      if (r.ok) setLscStatus(await r.json() as LscStatus);
    } catch { /* ignore */ }
    finally { setLscStatusLoading(false); }
  };

  const loadLscHistory = async () => {
    if (lscHistoryLoaded) return;
    try {
      const r = await fetch(`${apiBase}/api/external/portal/${portalToken}/lsc/analyses`);
      if (r.ok) {
        const data = await r.json() as { analyses: Array<Record<string, unknown>> };
        const mapped: LscAnalysisRecord[] = (data.analyses ?? []).map(a => ({
          id: a["id"] as string,
          userRole: a["user_role"] as string ?? "parent",
          language: a["language"] as string ?? "english",
          lessonContent: a["lesson_content"] as string ?? "",
          guide: (a["guide"] ?? {}) as LscGuide,
          demandProfile: (a["demand_profile"] ?? {}) as LscDemandProfile,
          outputVersions: (a["output_versions"] ?? {}) as Record<string, LscGuide>,
          followUpMessages: (a["follow_up_messages"] ?? []) as Array<{ role: string; content: string }>,
          createdAt: a["created_at"] as string ?? "",
        }));
        if (mapped.length > 0) {
          setLscAnalysis(prev => prev ?? mapped[0]);
          setLscDisplayGuide(prev => prev ?? mapped[0].guide);
          setLscFollowUpMessages(prev => prev.length > 0 ? prev : (mapped[0].followUpMessages ?? []));
          setLscActiveRole(prev => prev ?? mapped[0].userRole ?? role);
        }
      }
    } catch { /* ignore */ }
    finally { setLscHistoryLoaded(true); }
  };

  const handleOpenLsc = () => {
    setLscOpen(true);
    loadLscStatus();
    loadLscHistory();
  };

  const handleLscAcknowledge = () => {
    try { sessionStorage.setItem(lscAckKey, "1"); } catch { /* ignore */ }
    setLscAcknowledged(true);
  };

  const handleLscAnalyze = async () => {
    if (!lscContent.trim() || lscLoading) return;
    setLscLoading(true);
    setLscError(null);
    try {
      const r = await fetch(`${apiBase}/api/external/portal/${portalToken}/lsc/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: lscContent, role: lscActiveRole, language, acknowledged: true }),
      });
      if (!r.ok) {
        const err = await r.json() as { error: string };
        setLscError(err.error === "subscription_required" ? "subscription_required" : "failed");
        if (err.error === "subscription_required") { setLscStatus(null); loadLscStatus(true); }
        return;
      }
      const data = await r.json() as { analysisId: string; guide: LscGuide; demandProfile: LscDemandProfile };
      const newAnalysis: LscAnalysisRecord = {
        id: data.analysisId, userRole: lscActiveRole, language,
        lessonContent: lscContent, guide: data.guide, demandProfile: data.demandProfile,
        outputVersions: {}, followUpMessages: [], createdAt: new Date().toISOString(),
      };
      setLscAnalysis(newAnalysis);
      setLscDisplayGuide(data.guide);
      setLscFollowUpMessages([]);
      // Immediately mark trial as used in local state so the payment section
      // shows without waiting for a server round-trip.
      setLscStatus(prev =>
        prev && ["trial_available", "trial_active"].includes(prev.subscriptionStatus)
          ? { ...prev, subscriptionStatus: "trial_used" }
          : prev
      );
      loadLscStatus(true);
    } catch {
      setLscError("failed");
    } finally {
      setLscLoading(false);
    }
  };

  const handleLscFollowUp = async () => {
    if (!lscFollowUpInput.trim() || lscFollowUpLoading || !lscAnalysis) return;
    const q = lscFollowUpInput.trim();
    setLscFollowUpInput("");
    const optimistic = [...lscFollowUpMessages, { role: "user", content: q }];
    setLscFollowUpMessages(optimistic);
    setLscFollowUpLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/external/portal/${portalToken}/lsc/analyses/${lscAnalysis.id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, language }),
      });
      const data = await r.json() as { reply?: string };
      setLscFollowUpMessages([...optimistic, { role: "assistant", content: data.reply ?? "" }]);
    } catch {
      setLscFollowUpMessages([...optimistic, { role: "assistant", content: language === "mandarin" ? "抱歉，出现了错误。" : language === "korean" ? "죄송합니다. 오류가 발생했습니다." : "Sorry, an error occurred. Please try again." }]);
    } finally {
      setLscFollowUpLoading(false); }
  };

  const handleLscRoleVersion = async (newRole: string) => {
    if (!lscAnalysis || newRole === lscActiveRole || lscVersionLoading) return;
    setLscActiveRole(newRole);
    if (newRole === lscAnalysis.userRole) { setLscDisplayGuide(lscAnalysis.guide); return; }
    if (lscAnalysis.outputVersions[newRole]) { setLscDisplayGuide(lscAnalysis.outputVersions[newRole]); return; }
    setLscVersionLoading(true);
    try {
      const r = await fetch(`${apiBase}/api/external/portal/${portalToken}/lsc/analyses/${lscAnalysis.id}/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole, language }),
      });
      if (r.ok) {
        const data = await r.json() as { guide: LscGuide };
        setLscDisplayGuide(data.guide);
        setLscAnalysis(prev => prev ? { ...prev, outputVersions: { ...prev.outputVersions, [newRole]: data.guide } } : prev);
      }
    } catch { /* ignore */ }
    finally { setLscVersionLoading(false); }
  };

  const handleLscInquirySubmit = async () => {
    if (!lscInquiryName.trim() || !lscInquiryEmail.trim()) return;
    setLscInquirySending(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/external/portal/${portalToken}/lsc/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: lscInquiryName.trim(), email: lscInquiryEmail.trim(), months: lscInquiryMonths }),
      });
      if (r.ok) { setLscInquirySent(true); }
    } catch { /* ignore */ }
    finally { setLscInquirySending(false); }
  };

  const handleLscCheckout = async (months: number) => {
    // Open blank tab synchronously BEFORE any await — prevents popup blocker
    const tab = window.open("", "_blank");
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/external/portal/${portalToken}/lsc/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months }),
      });
      const data = await r.json() as { intent_id?: string; client_secret?: string; env?: string; months?: number; amount?: number; error?: string };
      if (r.ok && data.intent_id && data.client_secret) {
        const params = new URLSearchParams({
          intent_id: data.intent_id,
          client_secret: data.client_secret,
          env: data.env ?? "prod",
          portal_token: portalToken,
          months: String(data.months ?? months),
          amount: String(data.amount ?? ""),
        });
        tab!.location.href = `${base}/lsc-checkout?${params.toString()}`;
      } else {
        tab?.close();
        alert(language === "mandarin" ? "无法启动支付，请重试。" : language === "korean" ? "결제를 시작할 수 없습니다. 다시 시도해주세요." : "Could not start checkout. Please try again.");
      }
    } catch {
      tab?.close();
      alert(language === "mandarin" ? "网络错误，请重试。" : language === "korean" ? "네트워크 오류입니다. 다시 시도해주세요." : "Network error. Please try again.");
    }
  };

  const handleLscPrint = () => {
    const guide = lscDisplayGuide ?? lscAnalysis?.guide;
    if (!guide) return;
    const roleLabel = lscActiveRole.charAt(0).toUpperCase() + lscActiveRole.slice(1);
    const demandRows = [
      ["Reading", "reading"], ["Writing", "writing"], ["Maths", "mathematics"],
      ["Exec Fn", "executiveFunction"], ["Memory", "memory"], ["Attention", "attention"],
    ] as [string, string][];
    const levelColor = (raw: string) =>
      raw.toLowerCase().startsWith("high") ? "#dc2626" :
      raw.toLowerCase().startsWith("low")  ? "#16a34a" : "#d97706";
    const levelBg = (raw: string) =>
      raw.toLowerCase().startsWith("high") ? "#fef2f2" :
      raw.toLowerCase().startsWith("low")  ? "#f0fdf4" : "#fffbeb";
    const levelBorder = (raw: string) =>
      raw.toLowerCase().startsWith("high") ? "#fecaca" :
      raw.toLowerCase().startsWith("low")  ? "#bbf7d0" : "#fde68a";
    const demandBadges = demandRows.map(([label, key]) => {
      const raw = guide.demandProfile?.[key as keyof LscDemandProfile] ?? "";
      const lvl = raw.toLowerCase().startsWith("high") ? "High" : raw.toLowerCase().startsWith("low") ? "Low" : "Medium";
      return `<div style="border:1px solid ${levelBorder(raw)};background:${levelBg(raw)};border-radius:8px;padding:6px 8px;text-align:center;">
        <div style="font-size:10px;color:#64748b;font-weight:500;">${label}</div>
        <div style="font-size:11px;font-weight:700;color:${levelColor(raw)};">${lvl}</div>
      </div>`;
    }).join("");
    const sections = [
      { key: "strengths",         label: "✨ Strengths",          color: "#059669" },
      { key: "overview",          label: "Overview",               color: "#334155" },
      { key: "challenges",        label: "Likely Challenges",      color: "#ea580c" },
      { key: "strategies",        label: "Support Strategies",     color: "#2563eb" },
      { key: "stepByStep",        label: "Step-by-Step Guide",     color: "#7c3aed" },
      { key: "language",          label: "Language Tips",          color: "#64748b" },
      { key: "observationPoints", label: "Observation Points",     color: "#0d9488" },
    ] as { key: keyof LscGuide; label: string; color: string }[];
    const sectionHtml = sections.map(({ key, label, color }) => {
      const text = (guide[key] as string) ?? "";
      if (!text) return "";
      return `<div style="margin-bottom:16px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${color};margin-bottom:6px;">${label}</div>
        <div style="font-size:11px;color:#1e293b;line-height:1.6;white-space:pre-line;">${text}</div>
      </div>`;
    }).join("");
    const safetyHtml = guide.safetyNote
      ? `<div style="margin-top:16px;padding:10px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:10px;color:#92400e;font-style:italic;">${guide.safetyNote}</div>`
      : "";
    const html = `<!DOCTYPE html><html><head><title>LSC Guide – ${portal?.studentName ?? "Student"}</title>
      <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:24px 32px;color:#1e293b;}
      @media print{body{padding:12px 16px;}}</style></head><body>
      <div style="border-bottom:2px solid #10b981;padding-bottom:12px;margin-bottom:20px;">
        <div style="font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:.08em;">ReMynd Learning Support Coach™</div>
        <div style="font-size:16px;font-weight:800;color:#0f172a;margin-top:2px;">${portal?.studentName ?? "Student"} — ${roleLabel} Guide</div>
        <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
      <div style="margin-bottom:16px;">
        <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:6px;">Demand Profile</div>
        <div style="font-size:11px;color:#475569;line-height:1.6;margin-bottom:10px;">${guide.demandProfile?.overview ?? ""}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;">${demandBadges}</div>
      </div>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;" />
      ${sectionHtml}${safetyHtml}
      <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center;">
        Generated by ReMynd Assessment Operating System · remyndassessments.com · All recommendations must be reviewed by an authorized adult before use with the student.
      </div>
    </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

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
        setPinError(t("accessCodeIncorrect", language));
      }
    } catch {
      setPinError(t("accessCodeNetworkError", language));
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
          <a href="https://remyndassessments.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow">
              <img src="/images/remynd-logo.png" alt="ReMynd" className="w-8 h-8 object-contain" />
            </div>
            <div className="leading-none">
              <span className="font-display font-bold text-xl tracking-tight leading-none text-white block group-hover:text-slate-200 transition-colors">ReMynd</span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">{t("portalSubtitle", language)}</span>
            </div>
          </a>
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

        {/* Primary portal notice */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500 shrink-0"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <p className="text-[11px] text-indigo-700 leading-snug">
            {language === "mandarin"
              ? `这是 ${portal.studentName} 的主要家长/教师门户。您可以在此提交表格、访问报告并跟踪干预进度。`
              : language === "korean"
              ? `이 포털은 ${portal.studentName}의 주요 학부모/교사 포털입니다. 양식 제출, 보고서 열람, 중재 진행 추적을 여기서 모두 하실 수 있습니다.`
              : `This is your primary ReMynd portal for ${portal.studentName}. Submit forms, access reports, and track intervention progress — all from here.`}
          </p>
        </div>

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
              const isExaminerOnly = f.toolId === "RPPI";
              const isLocked = !isDone && !isExaminerOnly && !ADMIN_TOOL_IDS.has(f.toolId) && !adminFormsAllDone;
              return (
                <div key={f.uniqueToken} className={cn(
                  "flex items-center gap-4 px-5 py-4 transition-colors",
                  !isDone && !isLocked && !isExaminerOnly && "hover:bg-slate-50/60"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    isDone ? "bg-emerald-100" : isExaminerOnly ? "bg-violet-100" : isLocked ? "bg-slate-100" : "bg-primary/10"
                  )}>
                    {isDone
                      ? <ClipboardCheck size={20} className="text-emerald-600" />
                      : isExaminerOnly
                      ? <ClipboardList size={20} className="text-violet-500" />
                      : isLocked
                      ? <Lock size={20} className="text-slate-400" />
                      : <ClipboardList size={20} className="text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold truncate", isLocked ? "text-slate-400" : "text-slate-800")}>{f.toolName}</p>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide mt-0.5",
                      isDone ? "text-emerald-600" : isExaminerOnly ? "text-violet-600" : isLocked ? "text-slate-400" : "text-amber-600"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isDone ? "bg-emerald-500" : isExaminerOnly ? "bg-violet-500" : isLocked ? "bg-slate-300" : "bg-amber-500")} />
                      {isDone ? t("completed", language) : isExaminerOnly ? "Examiner administered" : isLocked ? t("completeFirst", language) : t("pending", language)}
                    </span>
                  </div>
                  {isDone ? (
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                    </div>
                  ) : isExaminerOnly ? (
                    <span className="text-xs text-violet-500 font-semibold shrink-0 bg-violet-50 border border-violet-200 rounded-full px-3 py-1">
                      In-person only
                    </span>
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
                    {t("accessCodeProtected", language)}
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder={t("accessCodePlaceholder", language)}
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
                      {pinChecking ? t("accessCodeChecking", language) : t("accessCodeConfirm", language)}
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

        {/* Intervention Progress Tracker Card */}
        {portal.bobbyAiPortalCredentials && (() => {
          const creds = portal.bobbyAiPortalCredentials ?? "";
          const caseIdMatch = creds.match(/Case\s*ID\s*[:\-]\s*([^\n\r]+)/i);
          const codeMatch = creds.match(/Access\s*Code\s*[:\-]\s*([^\n\r]+)/i);
          const deepLink = "https://remyndassessments.com/my-portal";
          return (
            <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-fuchsia-50 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shrink-0">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-purple-900">
                        {language === "mandarin" ? "干预进度追踪" : language === "korean" ? "중재 진행 추적" : "Intervention Progress Tracker"}
                      </p>
                      <p className="text-[11px] text-purple-600">
                        {language === "mandarin" ? "12个月监测 · 通过本门户访问" : language === "korean" ? "12개월 모니터링 · 이 포털에서 바로 이용" : "12-month monitoring · accessible from this portal"}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-purple-400 border border-purple-200 rounded-full px-2 py-0.5 shrink-0">
                    Bobby AI
                  </span>
                </div>

                <p className="text-xs text-purple-700 leading-relaxed">
                  {language === "mandarin"
                    ? `无需前往 Bobby AI 网站——直接在此处点击下方按钮，即可进入 ${portal.studentName} 的进度仪表板。`
                    : language === "korean"
                    ? `Bobby AI 사이트에 별도로 방문하실 필요가 없습니다. 아래 버튼을 클릭하면 바로 ${portal.studentName}의 진행 대시보드로 이동합니다.`
                    : `No need to visit the Bobby AI site separately — click below to go straight to ${portal.studentName}'s progress dashboard.`}
                </p>

                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  {language === "mandarin" ? "查看进度仪表板" : language === "korean" ? "진행 대시보드 보기" : "View Progress Dashboard"}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>

                <p className="text-[10px] text-purple-400 text-center">
                  {language === "mandarin"
                    ? <>您也可以直接访问 <a href="https://remyndassessments.com/my-portal" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600">remyndassessments.com/my-portal</a></>
                    : language === "korean"
                    ? <>또는 <a href="https://remyndassessments.com/my-portal" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600">remyndassessments.com/my-portal</a>에서 직접 접속할 수도 있습니다</>
                    : <>You can also access directly at <a href="https://remyndassessments.com/my-portal" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-600">remyndassessments.com/my-portal</a></>}
                </p>
              </div>
            </div>
          );
        })()}

        {/* AI Chat Panel */}
        <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 shadow-sm overflow-hidden">
            {!chatOpen ? (
              <button
                className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-indigo-100/50 transition-colors"
                onClick={handleOpenChat}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-indigo-900">
                    {language === "mandarin" ? "家长支持" : language === "korean" ? "학부모 지원" : "Parent Support"}
                  </p>
                  <p className="text-[11px] text-indigo-600">
                    {language === "mandarin" ? "关于评估结果的家庭支持与指导" : language === "korean" ? "평가 결과에 관한 가정 지원 및 안내" : "Home support & guidance around the assessment"}
                  </p>
                </div>
                <ChevronRight size={16} className="text-indigo-400 shrink-0"/>
              </button>
            ) : (
              <div className="flex flex-col" style={{ maxHeight: "520px" }}>
                {/* Header */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-indigo-200 bg-indigo-600">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">
                      {language === "mandarin" ? "家长支持" : language === "korean" ? "학부모 지원" : "Parent Support"}
                    </p>
                    <p className="text-[10px] text-indigo-200">
                      {language === "mandarin" ? `基于 ${portal.studentName} 的评估档案` : language === "korean" ? `${portal.studentName}의 평가 프로필 기반` : `Based on ${portal.studentName}'s assessment`}
                    </p>
                  </div>
                  <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0" style={{ maxHeight: "280px" }}>
                  {showLangBanner && chatMessages.length > 0 && (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 flex items-start gap-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500 shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          {language === "mandarin"
                            ? "语言已切换。开始新对话以用中文接收回复。"
                            : language === "korean"
                            ? "언어가 변경되었습니다. 새 대화를 시작하면 한국어로 응답을 받을 수 있습니다."
                            : "Language changed. Start a new conversation to get responses in English."}
                        </p>
                        <button
                          className="mt-1.5 text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
                          onClick={() => { setChatMessages([]); setShowLangBanner(false); setPromptsLoaded(false); setSuggestedPrompts([]); }}
                        >
                          {language === "mandarin" ? "开始新对话 →" : language === "korean" ? "새 대화 시작 →" : "Start new conversation →"}
                        </button>
                      </div>
                      <button onClick={() => setShowLangBanner(false)} className="text-amber-400 hover:text-amber-600 shrink-0">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  )}
                  {chatMessages.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-indigo-600 font-medium">
                        {language === "mandarin" ? "为您推荐的问题：" : language === "korean" ? "추천 질문:" : "Suggested questions for you:"}
                      </p>
                      {promptsLoading && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Loader2 size={11} className="animate-spin"/>
                          {language === "mandarin" ? "正在生成个性化问题…" : language === "korean" ? "맞춤 질문 생성 중…" : "Loading personalised questions…"}
                        </div>
                      )}
                      {suggestedPrompts.map((p, i) => (
                        <button
                          key={i}
                          className="w-full text-left text-[11px] rounded-lg border border-indigo-200 bg-white/80 hover:bg-white hover:border-indigo-400 px-3 py-2 text-slate-700 transition-colors"
                          onClick={() => handleSendChat(p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  )}
                  {chatMessages.map((m, i) => (
                    <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                        m.role === "user"
                          ? "bg-indigo-600 text-white rounded-br-sm"
                          : "bg-white border border-indigo-100 text-slate-700 rounded-bl-sm shadow-sm"
                      )}>
                        {m.role === "ai" ? renderChatMarkdown(m.content) : m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-indigo-100 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                        <div className="flex gap-1 items-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }}/>
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }}/>
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }}/>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="px-3 py-3 border-t border-indigo-200 bg-white/70">
                  <div className="flex gap-2 items-end">
                    <textarea
                      rows={2}
                      placeholder={
                        language === "mandarin"
                          ? "询问如何在家支持您的孩子…"
                          : language === "korean"
                          ? "집에서 자녀를 지원하는 방법을 질문하세요…"
                          : "Ask about supporting your child at home…"
                      }
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendChat(); }
                      }}
                      className="flex-1 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <button
                      onClick={() => handleSendChat()}
                      disabled={!chatInput.trim() || chatLoading}
                      className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/>
                      </svg>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      className="text-[10px] text-indigo-400 hover:text-indigo-600 underline underline-offset-2"
                      onClick={() => { setChatMessages([]); setPromptsLoaded(false); setSuggestedPrompts([]); loadPrompts(); }}
                    >
                      {language === "mandarin" ? "开始新对话" : language === "korean" ? "새 대화 시작" : "Start new conversation"}
                    </button>
                    <button
                      onClick={() => setChatOpen(false)}
                      title={language === "mandarin" ? "关闭" : language === "korean" ? "닫기" : "Close"}
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-indigo-300 hover:text-indigo-600 hover:bg-indigo-100 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

        {/* Learning Support Coach™ */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm overflow-hidden">
            {!lscOpen ? (
              <button
                className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-emerald-100/50 transition-colors"
                onClick={handleOpenLsc}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-emerald-600 flex items-center justify-center shrink-0">
                  <BookOpen size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-emerald-900">
                      {lscStatus?.productName ?? (language === "mandarin" ? "学习支持教练™" : language === "korean" ? "학습 지원 코치™" : "Learning Support Coach™")}
                    </p>
                    <span className="text-[9px] font-bold text-violet-600 bg-violet-100 rounded-full px-1.5 py-0.5 uppercase tracking-wide">
                      {language === "mandarin" ? "高级" : language === "korean" ? "프리미엄" : "Premium"}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-600">
                    {language === "mandarin"
                      ? `基于评估的个性化课程支持，专为 ${portal.studentName} 定制`
                      : language === "korean"
                      ? `${portal.studentName}의 평가 결과 기반 맞춤형 수업 지원`
                      : `Assessment-grounded lesson support for ${portal.studentName}`}
                  </p>
                </div>
                <ChevronRight size={16} className="text-emerald-400 shrink-0" />
              </button>
            ) : (
              <div className="flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-emerald-200 bg-gradient-to-r from-violet-600 to-emerald-600">
                  <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                    <BookOpen size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {lscStatus?.productName ?? "Learning Support Coach™"}
                    </p>
                    <p className="text-[10px] text-white/80">
                      {language === "mandarin" ? `专为 ${portal.studentName} 定制` : language === "korean" ? `${portal.studentName} 맞춤` : `Grounded in ${portal.studentName}'s assessment`}
                    </p>
                  </div>
                  <button onClick={() => { setLscOpen(false); setLscError(null); }} className="text-white/70 hover:text-white transition-colors shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>

                {/* Body */}
                <div className="bg-white">
                  {lscStatusLoading && (
                    <div className="flex items-center justify-center py-8 gap-2 text-emerald-600">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-xs">{language === "mandarin" ? "加载中…" : language === "korean" ? "로딩 중…" : "Loading…"}</span>
                    </div>
                  )}

                  {!lscStatusLoading && lscStatus && (() => {
                    const st = lscStatus.subscriptionStatus;
                    const isActive = ["active_monthly", "active_annual", "complimentary", "administrator_override"].includes(st);
                    const isTrial = ["trial_available", "trial_active"].includes(st);
                    // In admin preview, once an analysis exists show the payment section so
                    // admins can see exactly what a parent sees after using their trial.
                    const canAnalyze = lscStatus.isAdminPreview && lscAnalysis
                      ? false
                      : (isTrial || isActive);

                    // SAFETY ACKNOWLEDGMENT
                    if (canAnalyze && !lscAcknowledged && !lscAnalysis) {
                      return (
                        <div className="p-5 space-y-4">
                          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
                            <ShieldCheck size={20} className="text-amber-600" />
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-sm font-bold text-slate-900">
                              {language === "mandarin" ? "开始前请阅读" : language === "korean" ? "시작하기 전에" : "Before You Begin"}
                            </p>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {language === "mandarin"
                                ? "ReMynd学习支持教练™提供基于评估的教育决策支持。所有生成的建议和改编材料在用于学生之前，必须由授权成人进行审查。"
                                : language === "korean"
                                ? "ReMynd 학습 지원 코치™는 평가 기반 교육 의사결정 지원을 제공합니다. 생성된 모든 권고사항은 학생에게 사용하기 전에 권한 있는 성인이 검토해야 합니다."
                                : "The ReMynd Learning Support Coach™ provides assessment-grounded educational decision support. All generated recommendations must be reviewed by an authorized adult before use with the student."}
                            </p>
                          </div>
                          {isTrial && (
                            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-center">
                              <p className="text-[10px] text-amber-700 font-medium">
                                {language === "mandarin" ? "✦ 免费试用 · 含1次完整分析" : language === "korean" ? "✦ 무료 체험 · 전체 분석 1회 포함" : "✦ Free trial · 1 full analysis included"}
                              </p>
                            </div>
                          )}
                          <button
                            onClick={handleLscAcknowledge}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors"
                          >
                            {language === "mandarin" ? "我明白，继续" : language === "korean" ? "확인했습니다, 계속" : "I understand — continue"}
                          </button>
                        </div>
                      );
                    }

                    // SUBSCRIBE SCREEN (no prior results)
                    if (!canAnalyze && !lscAnalysis) {
                      return (
                        <div className="p-5 space-y-4">
                          <div className="text-center space-y-2">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center mx-auto">
                              <BookOpen size={16} className="text-white" />
                            </div>
                            <p className="text-sm font-bold text-slate-900">
                              {language === "mandarin" ? "订阅以继续" : language === "korean" ? "계속하려면 구독하세요" : "Subscribe to Continue"}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {language === "mandarin"
                                ? `每月最多 ${lscStatus.monthlyLimit} 次基于评估档案的个性化课程分析`
                                : language === "korean"
                                ? `월 최대 ${lscStatus.monthlyLimit}회 평가 기반 개별 수업 분석`
                                : `Up to ${lscStatus.monthlyLimit} assessment-grounded lesson analyses per month`}
                            </p>
                          </div>
                          {/* Month picker */}
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-500">{language === "mandarin" ? "选择月数" : language === "korean" ? "개월 수 선택" : "Months"}</span>
                              <div className="flex items-center gap-2">
                                <button onClick={() => setLscMonths(m => Math.max(1, m - 1))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors">−</button>
                                <span className="text-sm font-bold text-slate-900 w-6 text-center">{lscMonths}</span>
                                <button onClick={() => setLscMonths(m => Math.min(12, m + 1))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors">+</button>
                              </div>
                            </div>
                            <div className="flex items-baseline justify-between">
                              <span className="text-[10px] text-slate-400">¥{lscStatus.monthlyPrice} × {lscMonths}</span>
                              <span className="text-lg font-black text-violet-700">¥{lscStatus.monthlyPrice * lscMonths}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleLscCheckout(lscMonths)}
                            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-emerald-600 hover:opacity-90 px-4 py-3 transition-opacity text-center"
                          >
                            <p className="text-xs font-semibold text-white">
                              {language === "mandarin" ? `支付 ¥${lscStatus.monthlyPrice * lscMonths} →` : language === "korean" ? `¥${lscStatus.monthlyPrice * lscMonths} 결제 →` : `Pay ¥${lscStatus.monthlyPrice * lscMonths} →`}
                            </p>
                            <p className="text-[10px] text-white/70 mt-0.5">
                              {language === "mandarin" ? `${lscMonths}个月访问权限` : language === "korean" ? `${lscMonths}개월 이용권` : `${lscMonths}-month access, one-time payment`}
                            </p>
                          </button>
                        </div>
                      );
                    }

                    // MAIN WORKSPACE
                    const currentGuide = lscDisplayGuide ?? lscAnalysis?.guide ?? null;
                    return (
                      <div>
                         {/* Status bar */}
                         <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                           <div className="flex-1 flex items-center gap-2">
                          {isTrial
                            ? <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" /><span className="text-[10px] text-amber-700 font-medium">{language === "mandarin" ? "免费试用 · 1次完整分析" : language === "korean" ? "무료 체험 · 1회 전체 분석" : "Free trial · 1 full analysis included"}</span></>
                            : st === "trial_used"
                            ? <><span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" /><span className="text-[10px] text-slate-500 font-medium">{language === "mandarin" ? "试用已用完 · 订阅以继续" : language === "korean" ? "체험 완료 · 계속하려면 구독하세요" : "Trial complete · subscribe to continue"}</span></>
                            : <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" /><span className="text-[10px] text-emerald-700 font-medium">{language === "mandarin" ? `${lscStatus.monthlyUsage} / ${lscStatus.monthlyAllowance} 次已用` : language === "korean" ? `${lscStatus.monthlyUsage} / ${lscStatus.monthlyAllowance} 회 사용됨` : `${lscStatus.monthlyUsage} / ${lscStatus.monthlyAllowance} analyses used`}</span></>
                             }
                           </div>
                           {lscAnalysis && (
                             <div className="flex items-center gap-1">
                               <button
                                 onClick={handleLscPrint}
                                 title={language === "mandarin" ? "打印支持方案" : language === "korean" ? "지원 계획 인쇄" : "Print guide"}
                                 className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                               >
                                 <Printer size={11} />
                                 <span>{language === "mandarin" ? "打印" : language === "korean" ? "인쇄" : "Print"}</span>
                               </button>
                               <button
                                 onClick={() => { setLscAnalysis(null); setLscDisplayGuide(null); setLscContent(""); setLscError(null); setLscFollowUpMessages([]); setLscActiveRole(role); }}
                                 title={language === "mandarin" ? "清除结果" : language === "korean" ? "결과 지우기" : "Clear results"}
                                 className="flex items-center justify-center w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                               >
                                 <X size={12} />
                               </button>
                             </div>
                           )}
                         </div>

                        {!lscAnalysis ? (
                          // INPUT FORM
                          <div className="p-4 space-y-3">
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {language === "mandarin"
                                ? `粘贴课程、作业说明或工作表内容，获取基于 ${portal.studentName} 评估档案的个性化支持方案。`
                                : language === "korean"
                                ? `수업, 숙제 또는 워크시트 내용을 붙여넣으세요. ${portal.studentName}의 평가 프로필 기반 맞춤형 지원 계획을 생성합니다.`
                                : `Paste the lesson, assignment, or worksheet content below. The Coach will generate a support guide grounded in ${portal.studentName}'s assessment profile.`}
                            </p>
                            <textarea
                              value={lscContent}
                              onChange={e => setLscContent(e.target.value)}
                              placeholder={language === "mandarin" ? "在此粘贴课程或作业内容…" : language === "korean" ? "수업 또는 과제 내용을 여기에 붙여넣으세요…" : "Paste the lesson or assignment content here…"}
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none min-h-[120px]"
                              rows={6}
                            />
                            {lscError === "failed" && (
                              <p className="text-xs text-red-500">{language === "mandarin" ? "分析失败，请重试。" : language === "korean" ? "분석에 실패했습니다. 다시 시도해 주세요." : "Analysis failed. Please try again."}</p>
                            )}
                            <button
                              onClick={handleLscAnalyze}
                              disabled={!lscContent.trim() || lscLoading}
                              className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-emerald-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-opacity"
                            >
                              {lscLoading
                                ? <><Loader2 size={13} className="animate-spin" />{language === "mandarin" ? "分析中，请稍候…" : language === "korean" ? "분석 중입니다…" : "Generating support guide…"}</>
                                : language === "mandarin" ? "生成学习支持方案" : language === "korean" ? "지원 계획 생성" : "Generate Support Guide"
                              }
                            </button>
                          </div>
                        ) : currentGuide ? (
                          // RESULTS
                          <div className="divide-y divide-slate-100">
                            {/* Demand Profile */}
                            <div className="p-4 space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{language === "mandarin" ? "学习需求分析" : language === "korean" ? "학습 요구 분석" : "Demand Profile"}</p>
                              <p className="text-xs text-slate-600 leading-relaxed">{currentGuide.demandProfile?.overview ?? ""}</p>
                              <div className="grid grid-cols-3 gap-1.5 mt-2">
                                {([
                                  ["reading",           language === "mandarin" ? "阅读"    : language === "korean" ? "읽기"    : "Reading"],
                                  ["writing",           language === "mandarin" ? "写作"    : language === "korean" ? "쓰기"    : "Writing"],
                                  ["mathematics",       language === "mandarin" ? "数学"    : language === "korean" ? "수학"    : "Maths"],
                                  ["executiveFunction", language === "mandarin" ? "执行功能" : language === "korean" ? "실행기능" : "Exec Fn"],
                                  ["memory",            language === "mandarin" ? "记忆"    : language === "korean" ? "기억"    : "Memory"],
                                  ["attention",         language === "mandarin" ? "注意力"  : language === "korean" ? "주의력"  : "Attention"],
                                ] as [string, string][]).map(([key, label]) => {
                                  const raw = (currentGuide.demandProfile?.[key as keyof LscDemandProfile] ?? "").toLowerCase();
                                  const lvl = raw.startsWith("high") ? "high" : raw.startsWith("low") ? "low" : "medium";
                                  return (
                                    <div key={key} className={`rounded-lg px-2 py-1.5 text-center border ${lvl === "high" ? "bg-red-50 border-red-200" : lvl === "low" ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                                      <p className="text-[9px] text-slate-500 font-medium">{label}</p>
                                      <p className={`text-[10px] font-bold capitalize ${lvl === "high" ? "text-red-600" : lvl === "low" ? "text-green-600" : "text-amber-600"}`}>{lvl}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Role switcher */}
                            <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
                              <p className="text-[9px] text-slate-400 shrink-0">{language === "mandarin" ? "版本：" : language === "korean" ? "버전:" : "For:"}</p>
                              {([
                                ["parent",  language === "mandarin" ? "家长"   : language === "korean" ? "학부모" : "Parent"],
                                ["teacher", language === "mandarin" ? "教师"   : language === "korean" ? "교사"   : "Teacher"],
                                ["tutor",   language === "mandarin" ? "辅导"   : language === "korean" ? "튜터"   : "Tutor"],
                                ["student", language === "mandarin" ? "支持专员" : language === "korean" ? "지원"  : "Support"],
                              ] as [string, string][]).map(([r, label]) => (
                                <button key={r} onClick={() => handleLscRoleVersion(r)} disabled={lscVersionLoading}
                                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${lscActiveRole === r ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"}`}>
                                  {lscVersionLoading && lscActiveRole === r ? <Loader2 size={10} className="animate-spin" /> : label}
                                </button>
                              ))}
                            </div>

                            {/* Guide sections */}
                            {([
                              { key: "strengths",        label: language === "mandarin" ? "✨ 学生优势"  : language === "korean" ? "✨ 학생 강점"  : "✨ Strengths",         color: "text-emerald-700", bg: "bg-emerald-50" },
                              { key: "overview",         label: language === "mandarin" ? "概述"        : language === "korean" ? "개요"         : "Overview",             color: "text-slate-700",   bg: "" },
                              { key: "challenges",       label: language === "mandarin" ? "可能的困难"  : language === "korean" ? "예상 어려움"   : "Likely Challenges",    color: "text-orange-600",  bg: "" },
                              { key: "strategies",       label: language === "mandarin" ? "支持策略"    : language === "korean" ? "지원 전략"     : "Support Strategies",   color: "text-blue-600",    bg: "" },
                              { key: "stepByStep",       label: language === "mandarin" ? "逐步指导"    : language === "korean" ? "단계별 안내"   : "Step-by-Step Guide",   color: "text-purple-600",  bg: "" },
                              { key: "language",         label: language === "mandarin" ? "沟通技巧"    : language === "korean" ? "언어 사용 팁"  : "Language Tips",        color: "text-slate-500",   bg: "" },
                              { key: "observationPoints",label: language === "mandarin" ? "观察指标"    : language === "korean" ? "관찰 지표"     : "Observation Points",   color: "text-teal-600",    bg: "" },
                            ]).map(({ key, label, color, bg }) => (
                              <div key={key} className={`p-4 ${bg}`}>
                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${color}`}>{label}</p>
                                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{currentGuide[key as keyof LscGuide] as string ?? ""}</p>
                              </div>
                            ))}

                            {/* Safety note */}
                            {currentGuide.safetyNote && (
                              <div className="p-4 bg-amber-50">
                                <p className="text-[10px] text-amber-700 leading-relaxed italic">{currentGuide.safetyNote}</p>
                              </div>
                            )}

                            {/* Follow-up chat */}
                            <div className="p-4 space-y-3">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{language === "mandarin" ? "追问" : language === "korean" ? "추가 질문" : "Follow-up Questions"}</p>
                              {lscFollowUpMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                  <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.role === "user" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700"}`}>{msg.content}</div>
                                </div>
                              ))}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={lscFollowUpInput}
                                  onChange={e => setLscFollowUpInput(e.target.value)}
                                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleLscFollowUp()}
                                  placeholder={language === "mandarin" ? "提出追问…" : language === "korean" ? "추가 질문하기…" : "Ask a follow-up question…"}
                                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                />
                                <button onClick={handleLscFollowUp} disabled={!lscFollowUpInput.trim() || lscFollowUpLoading}
                                  className="w-8 h-8 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl text-white transition-colors shrink-0">
                                  {lscFollowUpLoading ? <Loader2 size={13} className="animate-spin" /> : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/></svg>}
                                </button>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="px-4 pb-4 pt-2 space-y-2">
                              {canAnalyze && (
                                <button
                                  onClick={() => { setLscAnalysis(null); setLscDisplayGuide(null); setLscContent(""); setLscError(null); setLscFollowUpMessages([]); setLscActiveRole(role); }}
                                  className="w-full py-2 text-xs text-emerald-600 hover:text-emerald-800 border border-emerald-200 rounded-xl hover:bg-emerald-50 transition-colors font-medium"
                                >
                                  {language === "mandarin" ? "分析另一个课程或作业 →" : language === "korean" ? "다른 수업/과제 분석하기 →" : "Analyse another lesson or assignment →"}
                                </button>
                              )}
                              {!canAnalyze && (
                                <div className="space-y-2">
                                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between gap-3">
                                    <span className="text-[10px] text-slate-500 shrink-0">{language === "mandarin" ? "月数" : language === "korean" ? "개월" : "Months"}</span>
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => setLscMonths(m => Math.max(1, m - 1))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors">−</button>
                                      <span className="text-sm font-bold text-slate-900 w-5 text-center">{lscMonths}</span>
                                      <button onClick={() => setLscMonths(m => Math.min(12, m + 1))} className="w-6 h-6 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-bold transition-colors">+</button>
                                    </div>
                                    <span className="text-sm font-black text-violet-700 shrink-0">¥{(lscStatus?.monthlyPrice ?? 388) * lscMonths}</span>
                                  </div>
                                  <button
                                    onClick={() => handleLscCheckout(lscMonths)}
                                    className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-emerald-500 hover:opacity-90 p-3.5 text-center transition-opacity shadow-md"
                                  >
                                    <p className="text-xs font-bold text-white">{language === "mandarin" ? `支付 ¥${(lscStatus?.monthlyPrice ?? 388) * lscMonths}` : language === "korean" ? `¥${(lscStatus?.monthlyPrice ?? 388) * lscMonths} 결제` : `Pay ¥${(lscStatus?.monthlyPrice ?? 388) * lscMonths}`}</p>
                                    <p className="text-[10px] text-white/75 mt-0.5">{language === "mandarin" ? `${lscMonths}个月一次性付款` : language === "korean" ? `${lscMonths}개월 일회성 결제` : `${lscMonths}-month access`}</p>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

        {/* LSC Inquiry Modal */}
        {lscInquiryOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0" onClick={() => setLscInquiryOpen(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setLscInquiryOpen(false)}
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={15} />
              </button>
              {lscInquirySent ? (
                <div className="text-center space-y-3 py-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 size={24} className="text-emerald-600" />
                  </div>
                  <p className="text-base font-bold text-slate-900">{language === "mandarin" ? "申请已发送！" : language === "korean" ? "신청이 완료되었습니다!" : "Request sent!"}</p>
                  <p className="text-xs text-slate-500">{language === "mandarin" ? "我们会尽快与您联系。" : language === "korean" ? "곳 연락드리겠습니다." : "We'll be in touch soon."}</p>
                  <button onClick={() => setLscInquiryOpen(false)} className="mt-2 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors">
                    {language === "mandarin" ? "关闭" : language === "korean" ? "닫기" : "Close"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-base font-bold text-slate-900">{language === "mandarin" ? "申请学习支持教练™" : language === "korean" ? "학습 지원 코치™ 신청" : "Request Learning Support Coach™"}</p>
                    <p className="text-xs text-slate-500 mt-1">{language === "mandarin" ? "填写以下信息，我们会尽快联系您。" : language === "korean" ? "아래 정보를 입력하시면 연락드리겠습니다." : "Fill in your details and we'll get back to you."}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-1">{language === "mandarin" ? "姓名" : language === "korean" ? "이름" : "Name"}</label>
                      <input
                        type="text"
                        value={lscInquiryName}
                        onChange={e => setLscInquiryName(e.target.value)}
                        placeholder={language === "mandarin" ? "您的姓名" : language === "korean" ? "이름 입력" : "Your name"}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-1">{language === "mandarin" ? "电子邮件" : language === "korean" ? "이메일" : "Email"}</label>
                      <input
                        type="email"
                        value={lscInquiryEmail}
                        onChange={e => setLscInquiryEmail(e.target.value)}
                        placeholder={language === "mandarin" ? "您的邮筱地址" : language === "korean" ? "이메일 주소 입력" : "Your email address"}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-600 uppercase tracking-wide mb-1">{language === "mandarin" ? "订阅时长" : language === "korean" ? "구독 기간" : "Duration"}</label>
                      <select
                        value={lscInquiryMonths}
                        onChange={e => setLscInquiryMonths(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>{m} {language === "mandarin" ? `个月` : language === "korean" ? `개월` : m === 1 ? "month" : "months"}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleLscInquirySubmit}
                    disabled={lscInquirySending || !lscInquiryName.trim() || !lscInquiryEmail.trim()}
                    className="w-full py-3 bg-gradient-to-r from-violet-600 to-emerald-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-opacity"
                  >
                    {lscInquirySending
                      ? <><Loader2 size={13} className="animate-spin" />{language === "mandarin" ? "发送中…" : language === "korean" ? "전송 중…" : "Sending…"}</>
                      : language === "mandarin" ? "发送申请" : language === "korean" ? "신청 보내기" : "Send"}
                  </button>
                </div>
              )}
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
  const isRppiForm = form.toolName.toLowerCase().includes("rppi")
    || (form as any).isExaminerAdministered === true
    || (form as any).toolId === "RPPI";
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

