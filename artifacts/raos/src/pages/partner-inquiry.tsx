import { useState } from "react";
import { Link } from "wouter";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";
import { customFetch } from "@workspace/api-client-react";
import { CheckCircle2, Building2, ChevronDown } from "lucide-react";

interface FormState {
  // School
  schoolName: string;
  schoolType: string;
  schoolLocation: string;
  enrollment: string;
  // Contact
  contactName: string;
  contactRole: string;
  contactEmail: string;
  contactPhone: string;
  wechatId: string;
  whatsappId: string;
  // Interest
  currentSupport: string;
  reason: string;
  howHeard: string;
  timeline: string;
  // Consent
  consent: boolean;
}

const EMPTY: FormState = {
  schoolName: "",
  schoolType: "",
  schoolLocation: "",
  enrollment: "",
  contactName: "",
  contactRole: "",
  contactEmail: "",
  contactPhone: "",
  wechatId: "",
  whatsappId: "",
  currentSupport: "",
  reason: "",
  howHeard: "",
  timeline: "",
  consent: false,
};

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-bold uppercase tracking-widest text-purple-600">{label}</span>
      <div className="flex-1 h-px bg-purple-100" />
    </div>
  );
}

function FieldLabel({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-slate-700 mb-1.5">
      {text}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function NativeSelect({
  value,
  onChange,
  placeholder,
  options,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: string[];
  required?: boolean;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent pr-10 transition-shadow"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

export default function PartnerInquiryPage() {
  const { t } = useI18n();
  const f = t.partnerInquiry;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await customFetch("/api/portal/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inquiryType: "partner_school",
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone || undefined,
          wechatId: form.wechatId || undefined,
          whatsappId: form.whatsappId || undefined,
          organisation: form.schoolName,
          role: form.contactRole,
          message: form.reason,
          schoolType: form.schoolType || undefined,
          schoolLocation: form.schoolLocation,
          enrollment: form.enrollment || undefined,
          currentSupport: form.currentSupport || undefined,
          howHeard: form.howHeard || undefined,
          timeline: form.timeline,
        }),
      });
      setSubmitted(true);
    } catch {
      setError(f.errorMsg);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-white/80 backdrop-blur-sm">
          <Link href="/partner-schools" className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors">
            {t.partnerSchools.back}
          </Link>
          <LanguageSwitcherLight />
        </header>
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">{f.successTitle}</h1>
            <p className="text-slate-600 leading-relaxed mb-8">{f.successBody}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/partner-schools"
                className="inline-flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors text-sm"
              >
                {f.successBack}
              </Link>
              <button
                onClick={() => { setSubmitted(false); setForm(EMPTY); }}
                className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-600 font-medium px-6 py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                {f.another}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-purple-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/partner-schools" className="text-sm text-purple-600 hover:text-purple-800 font-medium transition-colors">
          {t.partnerSchools.back}
        </Link>
        <LanguageSwitcherLight />
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white px-6 py-12 text-center">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Building2 size={24} className="text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{f.pageTitle}</h1>
        <p className="text-purple-200 text-sm leading-relaxed max-w-xl mx-auto">{f.pageDesc}</p>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <form onSubmit={handleSubmit} className="space-y-10">

          {/* Section 1: School */}
          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 sm:p-8">
            <SectionHeader label={f.schoolSection} />
            <div className="space-y-5">

              <div>
                <FieldLabel text={f.schoolName} required />
                <input
                  type="text"
                  required
                  value={form.schoolName}
                  onChange={(e) => set("schoolName", e.target.value)}
                  placeholder={f.schoolNamePlaceholder}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <FieldLabel text={f.schoolType} required />
                  <NativeSelect
                    value={form.schoolType}
                    onChange={(v) => set("schoolType", v)}
                    placeholder={f.schoolType}
                    options={f.schoolTypes}
                    required
                  />
                </div>
                <div>
                  <FieldLabel text={f.schoolLocation} required />
                  <input
                    type="text"
                    required
                    value={form.schoolLocation}
                    onChange={(e) => set("schoolLocation", e.target.value)}
                    placeholder={f.schoolLocationPlaceholder}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <div>
                <FieldLabel text={f.enrollment} />
                <NativeSelect
                  value={form.enrollment}
                  onChange={(v) => set("enrollment", v)}
                  placeholder={f.enrollmentPlaceholder}
                  options={f.enrollmentOptions}
                />
              </div>

            </div>
          </div>

          {/* Section 2: Contact */}
          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 sm:p-8">
            <SectionHeader label={f.contactSection} />
            <div className="space-y-5">

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <FieldLabel text={f.contactName} required />
                  <input
                    type="text"
                    required
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                    placeholder={f.contactNamePlaceholder}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <FieldLabel text={f.contactRole} required />
                  <input
                    type="text"
                    required
                    value={form.contactRole}
                    onChange={(e) => set("contactRole", e.target.value)}
                    placeholder={f.contactRolePlaceholder}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <div>
                <FieldLabel text={f.contactEmail} required />
                <input
                  type="email"
                  required
                  value={form.contactEmail}
                  onChange={(e) => set("contactEmail", e.target.value)}
                  placeholder={f.contactEmailPlaceholder}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <FieldLabel text={f.contactPhone} />
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) => set("contactPhone", e.target.value)}
                  placeholder={f.contactPhonePlaceholder}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <FieldLabel text={f.wechatId} />
                  <input
                    type="text"
                    value={form.wechatId}
                    onChange={(e) => set("wechatId", e.target.value)}
                    placeholder={f.wechatPlaceholder}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <FieldLabel text={f.whatsappId} />
                  <input
                    type="text"
                    value={form.whatsappId}
                    onChange={(e) => set("whatsappId", e.target.value)}
                    placeholder={f.whatsappPlaceholder}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: Interest */}
          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-6 sm:p-8">
            <SectionHeader label={f.interestSection} />
            <div className="space-y-5">

              <div>
                <FieldLabel text={f.currentSupport} />
                <textarea
                  value={form.currentSupport}
                  onChange={(e) => set("currentSupport", e.target.value)}
                  placeholder={f.currentSupportPlaceholder}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">{f.currentSupportHint}</p>
              </div>

              <div>
                <FieldLabel text={f.reason} required />
                <textarea
                  required
                  value={form.reason}
                  onChange={(e) => set("reason", e.target.value)}
                  placeholder={f.reasonPlaceholder}
                  rows={4}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-shadow resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <FieldLabel text={f.howHeard} />
                  <NativeSelect
                    value={form.howHeard}
                    onChange={(v) => set("howHeard", v)}
                    placeholder={f.howHeardPlaceholder}
                    options={f.howHeardOptions}
                  />
                </div>
                <div>
                  <FieldLabel text={f.timeline} required />
                  <NativeSelect
                    value={form.timeline}
                    onChange={(v) => set("timeline", v)}
                    placeholder={f.timelinePlaceholder}
                    options={f.timelineOptions}
                    required
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Consent + Submit */}
          <div className="space-y-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5 flex-shrink-0">
                <input
                  type="checkbox"
                  required
                  checked={form.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 rounded-md border-2 border-slate-300 bg-white peer-checked:bg-purple-600 peer-checked:border-purple-600 transition-all group-hover:border-purple-400 flex items-center justify-center">
                  {form.consent && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-xs text-slate-500 leading-relaxed pt-0.5">{f.consent}</span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !form.consent}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm tracking-wide"
            >
              {submitting ? f.submitting : f.submit}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
