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
  BookOpen, Heart, Star, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";

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

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
        <h4 className="font-semibold text-slate-900 mb-1">{p.privacyTitle}</h4>
        <p className="text-sm text-slate-600">{p.privacy}</p>
      </div>

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
              <SelectContent>
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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer group">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                <img src="/images/remynd-logo.png" alt="ReMynd" className="w-7 h-7 object-contain" />
              </div>
              <span className="font-bold text-slate-900 text-lg">ReMynd</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcherLight />
            <a href="/login" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">{t.staffLogin}</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full text-indigo-600 text-xs font-semibold mb-6">
          <Zap size={12} /> {p.badge}
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-4">
          {p.hero}
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          {p.heroDesc}
        </p>
      </section>

      {/* Tab selector */}
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1 max-w-sm mx-auto">
          <button
            onClick={() => handleTabChange("school")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all",
              tab === "school"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <School size={15} /> {p.tabSchool}
          </button>
          <button
            onClick={() => handleTabChange("parent")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all",
              tab === "parent"
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Users size={15} /> {p.tabParent}
          </button>
        </div>
      </div>

      {/* Content panel */}
      <div className="max-w-2xl mx-auto px-6 pb-20">
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
    </div>
  );
}
