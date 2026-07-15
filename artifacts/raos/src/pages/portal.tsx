import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, School, Users, ClipboardList, ShieldCheck, Clock,
  ChevronRight, ArrowRight, Brain, FileText, MessageSquare, Phone,
  BookOpen, Heart, Star, Zap, Building2, KeyRound, Download, Bot, Video, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";
import { HospitalComparisonSection } from "@/pages/hospital-comparison";

type Tab = "school" | "parent";

const YEAR_GROUPS_EN = [
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
  "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13",
  "Foundation", "Kindergarten", "Reception", "Pre-K", "University / Adult",
];

interface InquiryForm {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  wechatId: string;
  whatsappId: string;
  organisation: string;
  role: string;
  studentName: string;
  studentAge: string;
  yearGroup: string;
  message: string;
}

const emptyForm: InquiryForm = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  wechatId: "",
  whatsappId: "",
  organisation: "",
  role: "",
  studentName: "",
  studentAge: "",
  yearGroup: "",
  message: "",
};

const FEATURE_ICONS: React.ElementType[] = [Download, Bot, TrendingUp, Video];

function PortalAccessBlock({ pa, accentColor }: {
  pa: { title: string; intro: string; howTitle: string; steps: string[]; features: { label: string; desc: string }[]; note: string };
  accentColor: "indigo" | "teal";
}) {
  const accent = accentColor === "indigo"
    ? { bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-600", badge: "bg-indigo-100", num: "bg-indigo-600" }
    : { bg: "bg-teal-50", border: "border-teal-100", text: "text-teal-600", badge: "bg-teal-100", num: "bg-teal-600" };

  return (
    <div className={`rounded-2xl border ${accent.border} ${accent.bg} p-6 space-y-5`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${accent.badge} flex items-center justify-center flex-shrink-0`}>
          <KeyRound size={16} className={accent.text} />
        </div>
        <h4 className="font-bold text-slate-900 text-base">{pa.title}</h4>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">{pa.intro}</p>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{pa.howTitle}</p>
        <ol className="space-y-2">
          {pa.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={`flex-shrink-0 w-5 h-5 rounded-full ${accent.num} text-white text-[10px] font-bold flex items-center justify-center mt-0.5`}>{i + 1}</span>
              <span className="text-sm text-slate-700">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {pa.features.map(({ label, desc }, i) => {
          const Icon = FEATURE_ICONS[i] ?? CheckCircle2;
          return (
            <div key={label} className="flex items-start gap-2.5 bg-white rounded-xl p-3 border border-white/80">
              <div className={`w-7 h-7 rounded-lg ${accent.badge} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <Icon size={13} className={accent.text} />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-slate-500 leading-snug mt-0.5">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-slate-500 italic">{pa.note}</p>
    </div>
  );
}

function Step({ number, title, description, icon: Icon }: { number: number; title: string; description: string; icon: React.ElementType }) {
  const { t } = useI18n();
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
        <Icon size={18} className="text-indigo-600" />
      </div>
      <div>
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">{t.step} {number}</p>
        <h4 className="font-semibold text-slate-900 text-sm">{title}</h4>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function SchoolContent({ onInquire }: { onInquire: () => void }) {
  const { t } = useI18n();
  const s = t.portal.school;
  const stepIcons = [FileText, ClipboardList, Brain, BookOpen];

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{s.heading}</h3>
        <p className="text-slate-600 leading-relaxed">{s.intro}</p>
      </div>

      {s.missingTier && (
        <div className="rounded-2xl bg-slate-50 border border-indigo-100 p-6 space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">{s.missingTier.label}</p>
          <h4 className="text-base font-bold text-slate-900 leading-snug">{s.missingTier.heading}</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{s.missingTier.intro}</p>
          <div className="grid sm:grid-cols-3 gap-3 pt-1">
            {s.missingTier.stages.map((stage: { num: string; title: string; items: string[]; highlight?: boolean }) => (
              <div key={stage.num} className={cn(
                "rounded-xl p-4 border",
                stage.highlight ? "bg-indigo-600 border-indigo-700" : "bg-white border-slate-200"
              )}>
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mb-2.5",
                  stage.highlight ? "bg-white/25 text-white" : "bg-indigo-100 text-indigo-700"
                )}>{stage.num}</div>
                <p className={cn("font-semibold text-sm mb-2", stage.highlight ? "text-white" : "text-slate-900")}>{stage.title}</p>
                <ul className="space-y-1">
                  {stage.items.map((item: string) => (
                    <li key={item} className={cn("text-xs flex items-start gap-1.5", stage.highlight ? "text-indigo-100" : "text-slate-500")}>
                      <span className="mt-0.5 shrink-0 font-bold">·</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 italic border-t border-indigo-100 pt-3">{s.missingTier.note}</p>
        </div>
      )}

      {s.interventionSection && (
        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-slate-900 text-base mb-1">{s.interventionSection.heading}</h4>
            <p className="text-sm text-slate-600 leading-relaxed">{s.interventionSection.body}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {s.interventionSection.cards.map((card: { title: string; desc: string }) => (
              <div key={card.title} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <p className="font-semibold text-slate-900 text-sm mb-1">{card.title}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Brain, ...s.cards[0] },
          { icon: ShieldCheck, ...s.cards[1] },
          { icon: Clock, ...s.cards[2] },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-indigo-50 rounded-xl p-4 text-center">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon size={18} className="text-indigo-600" />
            </div>
            <p className="font-semibold text-slate-900 text-sm">{label}</p>
            <p className="text-slate-500 text-xs mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h4 className="font-semibold text-slate-900 mb-4">{s.processTitle}</h4>
        <div className="space-y-5">
          {s.steps.map((step, i) => (
            <Step key={i} number={i + 1} icon={stepIcons[i]} title={step.title} description={step.desc} />
          ))}
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-5">
        <h4 className="font-semibold text-slate-900 mb-2">{s.assessTitle}</h4>
        <div className="flex flex-wrap gap-2">
          {s.assessAreas.map(a => (
            <span key={a} className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-700">{a}</span>
          ))}
        </div>
      </div>

      <PortalAccessBlock pa={s.portalAccess} accentColor="indigo" />

      {s.tier2Panel && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 space-y-4">
          <h4 className="font-bold text-slate-900">{s.tier2Panel.heading}</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{s.tier2Panel.body}</p>
          <ul className="space-y-2">
            {s.tier2Panel.questions.map((q: string) => (
              <li key={q} className="flex items-start gap-2 text-sm text-slate-700">
                <ChevronRight size={14} className="text-indigo-500 shrink-0 mt-0.5" />
                {q}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 italic border-t border-indigo-100 pt-3">{s.tier2Panel.note}</p>
        </div>
      )}

      {s.prepGuide && (
        <Link href="/assessment-preparation">
          <div className="flex items-start gap-4 bg-indigo-50 border border-indigo-200 rounded-2xl p-5 hover:bg-indigo-100 transition-colors cursor-pointer group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm mb-1">{s.prepGuide.label}</p>
              <p className="text-xs text-slate-600 leading-relaxed">{s.prepGuide.desc}</p>
            </div>
            <ChevronRight size={16} className="text-indigo-500 shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}

      <div className="text-center pt-2">
        <Button onClick={onInquire} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          {s.cta} <ArrowRight size={16} />
        </Button>
        <p className="text-xs text-slate-400 mt-2">{s.ctaNote}</p>
      </div>
    </div>
  );
}

function ParentContent({ onInquire }: { onInquire: () => void }) {
  const { t } = useI18n();
  const p = t.portal.parent;
  const cardIcons = [Heart, Star, Zap];
  const stepIcons = [MessageSquare, ClipboardList, Brain, BookOpen];

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{p.heading}</h3>
        <p className="text-slate-600 leading-relaxed">{p.intro}</p>
      </div>

      {p.highlight && (
        <blockquote className="border-l-4 border-teal-400 bg-teal-50 rounded-r-xl pl-5 pr-4 py-4">
          <p className="text-sm font-medium text-slate-700 italic leading-relaxed">{p.highlight}</p>
        </blockquote>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {p.cards.map(({ label, desc }, i) => {
          const Icon = cardIcons[i];
          return (
            <div key={label} className="bg-teal-50 rounded-xl p-4 text-center">
              <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon size={18} className="text-teal-600" />
              </div>
              <p className="font-semibold text-slate-900 text-sm">{label}</p>
              <p className="text-slate-500 text-xs mt-1">{desc}</p>
            </div>
          );
        })}
      </div>

      <div>
        <h4 className="font-semibold text-slate-900 mb-3">{p.reasonsTitle}</h4>
        <div className="space-y-2">
          {p.reasons.map(r => (
            <div key={r} className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-teal-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">{r}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-900 mb-4">{p.expectTitle}</h4>
        <div className="space-y-5">
          {p.steps.map((step, i) => (
            <Step key={i} number={i + 1} icon={stepIcons[i]} title={step.title} description={step.desc} />
          ))}
        </div>
      </div>

      {p.whatFamiliesReceive && (
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
          <h4 className="font-semibold text-slate-900 mb-3">{p.whatFamiliesReceive.title}</h4>
          <div className="grid sm:grid-cols-2 gap-1.5">
            {p.whatFamiliesReceive.items.map((item: string) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-teal-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 pt-8">
        <HospitalComparisonSection hc={p.hospitalComparison} onInquire={onInquire} />
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
        <h4 className="font-semibold text-slate-900 mb-1">{p.privacyTitle}</h4>
        <p className="text-sm text-slate-600">{p.privacy}</p>
      </div>

      <PortalAccessBlock pa={p.portalAccess} accentColor="teal" />

      {p.accessibleStart && (
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-6 space-y-3">
          <h4 className="font-bold text-slate-900">{p.accessibleStart.heading}</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{p.accessibleStart.body}</p>
          <p className="text-xs text-slate-500 italic">{p.accessibleStart.note}</p>
        </div>
      )}

      {p.prepGuide && (
        <Link href="/assessment-preparation">
          <div className="flex items-start gap-4 bg-teal-50 border border-teal-200 rounded-2xl p-5 hover:bg-teal-100 transition-colors cursor-pointer group">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 text-sm mb-1">{p.prepGuide.label}</p>
              <p className="text-xs text-slate-600 leading-relaxed">{p.prepGuide.desc}</p>
            </div>
            <ChevronRight size={16} className="text-teal-500 shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      )}

      <div className="text-center pt-2">
        <Button onClick={onInquire} size="lg" className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
          {p.cta} <ArrowRight size={16} />
        </Button>
        <p className="text-xs text-slate-400 mt-2">{p.ctaNote}</p>
      </div>
    </div>
  );
}

function InquiryFormPanel({ tab, onBack, onSuccess }: { tab: Tab; onBack: () => void; onSuccess: () => void }) {
  const { t } = useI18n();
  const f = t.portal.form;
  const [form, setForm] = useState<InquiryForm>(emptyForm);
  const isSchool = tab === "school";

  const mutation = useMutation({
    mutationFn: async (data: InquiryForm) => {
      const res = await fetch("/api/portal/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, inquiryType: tab }),
      });
      if (!res.ok) throw new Error("Submission failed");
      return res.json();
    },
    onSuccess,
  });

  const set = (field: keyof InquiryForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(fr => ({ ...fr, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
        {t.back}
      </button>

      <h3 className="text-lg font-bold text-slate-900">
        {isSchool ? f.titleSchool : f.titleParent}
      </h3>
      <p className="text-sm text-slate-500">{f.formDesc}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{f.yourName} <span className="text-slate-400">*</span></Label>
          <Input placeholder={f.namePlaceholder} value={form.contactName} onChange={set("contactName")} required />
        </div>
        <div className="space-y-1.5">
          <Label>{f.email} <span className="text-slate-400">*</span></Label>
          <Input type="email" placeholder="email@example.com" value={form.contactEmail} onChange={set("contactEmail")} required />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>{f.phone}</Label>
          <Input placeholder="+1 (optional)" value={form.contactPhone} onChange={set("contactPhone")} />
        </div>
        {isSchool ? (
          <div className="space-y-1.5">
            <Label>{f.orgSchool}</Label>
            <Input placeholder={f.orgPlaceholderSchool} value={form.organisation} onChange={set("organisation")} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>{f.orgParent}</Label>
            <Input placeholder={f.orgPlaceholderParent} value={form.organisation} onChange={set("organisation")} />
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <span className="text-green-600 font-bold text-xs">WeChat</span> {f.wechatId}
          </Label>
          <Input placeholder={f.wechatPlaceholder} value={form.wechatId} onChange={set("wechatId")} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-bold text-xs">WhatsApp</span> {f.whatsappId}
          </Label>
          <Input placeholder={f.whatsappPlaceholder} value={form.whatsappId} onChange={set("whatsappId")} />
        </div>
      </div>

      {isSchool && (
        <div className="space-y-1.5">
          <Label>{f.role}</Label>
          <Select value={form.role} onValueChange={v => setForm(fr => ({ ...fr, role: v }))}>
            <SelectTrigger><SelectValue placeholder={f.selectRole} /></SelectTrigger>
            <SelectContent>
              {t.portal.roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {isSchool ? f.studentSection : f.parentSection}
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-1">
            <div>
              <Label>{isSchool ? f.studentName : f.childName}</Label>
              <p className="text-[11px] text-slate-400 mt-0.5">{f.studentNameHint}</p>
            </div>
            <Input placeholder="e.g. Alex T." value={form.studentName} onChange={set("studentName")} />
          </div>
          <div className="space-y-1.5">
            <Label>{f.age}</Label>
            <Input placeholder={f.agePlaceholder} value={form.studentAge} onChange={set("studentAge")} />
          </div>
          <div className="space-y-1.5">
            <Label>{f.yearGroup}</Label>
            <Select value={form.yearGroup} onValueChange={v => setForm(fr => ({ ...fr, yearGroup: v }))}>
              <SelectTrigger><SelectValue placeholder={f.selectYear} /></SelectTrigger>
              <SelectContent className="max-h-56 overflow-y-auto">
                {YEAR_GROUPS_EN.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>
          {isSchool ? f.reasonSchool : f.reasonParent} <span className="text-slate-400">*</span>
        </Label>
        <Textarea
          placeholder={isSchool ? f.placeholderSchool : f.placeholderParent}
          rows={5}
          value={form.message}
          onChange={set("message")}
          required
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-amber-700">{f.errorMsg}</p>
      )}

      <Button
        type="submit"
        disabled={mutation.isPending}
        className={cn("w-full", isSchool ? "bg-indigo-600 hover:bg-indigo-700" : "bg-teal-600 hover:bg-teal-700")}
      >
        {mutation.isPending ? f.submitting : f.submit}
      </Button>

      <p className="text-xs text-center text-slate-400">{f.consent}</p>
    </form>
  );
}

function SuccessPanel({ tab, onReset }: { tab: Tab; onReset: () => void }) {
  const { t } = useI18n();
  const s = t.portal.success;
  const isSchool = tab === "school";
  return (
    <div className="text-center py-12 space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 size={32} className="text-green-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-900">{s.title}</h3>
      <p className="text-slate-500 max-w-sm mx-auto">
        {isSchool ? s.school : s.parent}
      </p>
      <Button variant="outline" onClick={onReset} className="mt-4">{s.another}</Button>
    </div>
  );
}

export default function Portal() {
  const { t } = useI18n();
  const p = t.portal;
  const initialTab = (() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("tab");
    return raw === "parent" ? "parent" : "school";
  })() as Tab;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [view, setView] = useState<"info" | "form" | "success">("info");

  const handleTabChange = (newTab: Tab) => {
    setTab(newTab);
    setView("info");
  };

  const isSchool = tab === "school";

  return (
    <div className="min-h-screen bg-white">

      {/* ── Dark brand header — matches landing page ── */}
      <header
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0a1628 45%, #060d1c 100%)" }}
      >
        {/* Background glows */}
        <div className="absolute top-[-40%] left-[-5%] w-[40%] h-[200%] bg-blue-700/10 rounded-full blur-[70px] pointer-events-none" />
        <div className="absolute top-[-40%] right-[-5%] w-[35%] h-[200%] bg-indigo-900/15 rounded-full blur-[70px] pointer-events-none" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px"
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          {/* Logo + wordmark */}
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <div className="absolute -inset-1 bg-blue-400/15 rounded-[14px] blur-md" />
                <div className="relative w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg ring-1 ring-white/10">
                  <img src="/images/remynd-logo.png" alt="ReMynd" className="w-6 h-6 object-contain" />
                </div>
              </div>
              <div className="leading-none">
                <span className="font-extrabold text-white text-[1.1rem] tracking-tight block">ReMynd</span>
                <span className="text-blue-300 text-[10px] font-semibold tracking-wide">Student Services</span>
              </div>
            </div>
          </Link>

          {/* Right controls */}
          <div className="flex items-center gap-5">
            <LanguageSwitcherLight />
            <a
              href="/login"
              className="text-[11px] text-slate-400 hover:text-slate-200 font-medium tracking-wide transition-colors"
            >
              {t.staffLogin}
            </a>
          </div>
        </div>

        {/* Hero text inside the dark band */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-6 pb-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-[11px] font-semibold mb-5">
            <Zap size={11} /> {p.badge}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-3">
            {p.hero}
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm leading-relaxed">
            {p.heroDesc}
          </p>

          {p.heroBadges && (
            <div className="flex flex-wrap gap-2 justify-center mt-5">
              {p.heroBadges.map((badge: { label: string; desc: string }) => (
                <span key={badge.label} className="inline-flex items-center bg-white/10 border border-white/20 rounded-full px-3.5 py-1.5 text-[11px] font-semibold text-white/90 tracking-wide">
                  {badge.label}
                </span>
              ))}
            </div>
          )}

          {/* Tab selector — floats at bottom of hero */}
          <div className="mt-8 flex rounded-xl bg-white/[0.06] border border-white/[0.08] p-1 gap-1 max-w-sm mx-auto">
            <button
              onClick={() => handleTabChange("school")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all",
                tab === "school"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <School size={13} /> {p.tabSchool}
            </button>
            <button
              onClick={() => handleTabChange("parent")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all",
                tab === "parent"
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Users size={13} /> {p.tabParent}
            </button>
            <Link
              href="/partner-schools"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all text-slate-400 hover:bg-white/10 hover:text-purple-300 whitespace-nowrap"
            >
              <Building2 size={13} /> {p.tabPartner}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Light content area ── */}
      <div className="bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-2xl mx-auto px-6 py-12 pb-20">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
            {view === "success" ? (
              <SuccessPanel tab={tab} onReset={() => { setView("info"); }} />
            ) : view === "form" ? (
              <InquiryFormPanel tab={tab} onBack={() => setView("info")} onSuccess={() => setView("success")} />
            ) : tab === "school" ? (
              <SchoolContent onInquire={() => setView("form")} />
            ) : (
              <ParentContent onInquire={() => setView("form")} />
            )}
          </div>

          {/* FAQ */}
          {view === "info" && (
            <div className="mt-10 space-y-4">
              <h4 className="font-semibold text-slate-900">{p.faqTitle}</h4>
              {(isSchool ? p.school.faqs : p.parent.faqs).map(({ q, a }) => (
                <div key={q} className="bg-slate-50 rounded-xl p-4">
                  <p className="font-semibold text-sm text-slate-800 mb-1">{q}</p>
                  <p className="text-sm text-slate-500">{a}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer strip */}
        <div className="border-t border-slate-100 py-5 text-center">
          <p className="text-[11px] text-slate-400 tracking-wide">
            © {new Date().getFullYear()} ReMynd Student Services · Confidential
          </p>
        </div>
      </div>

    </div>
  );
}
