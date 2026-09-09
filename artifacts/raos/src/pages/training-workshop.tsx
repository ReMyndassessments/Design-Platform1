/**
 * Public workshop page — /training/:slug
 * No authentication required.
 * Handles free registration (immediate), paid Airwallex checkout, and the
 * server-controlled workshop manual-sales inquiry flow.
 *
 * Airwallex gotchas (from lsc-checkout.tsx):
 * - SDK global is window.AirwallexComponentsSDK
 * - createElement() is async — must be awaited
 */

import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import {
  Calendar, Clock, MapPin, Monitor, Award, DollarSign,
  Users, Mail, Phone, User, Building2, Globe, Check,
  ChevronRight, AlertCircle, Loader2, Wifi,
} from "lucide-react";

declare global {
  interface Window {
    AirwallexComponentsSDK?: {
      init: (opts: { env: string; origin: string }) => Promise<void>;
      createElement: (type: string, opts: Record<string, unknown>) => Promise<{
        mount: (el: HTMLElement) => void;
      }>;
    };
  }
}

type SessionDate = { date?: string; start_time?: string; end_time?: string };
type Workshop = {
  id: string; slug: string; title: string; subtitle?: string;
  description?: string; additional_info?: string;
  image_object_id?: string; image_alt?: string;
  session_dates: SessionDate[]; timezone: string;
  delivery_method: string; venue_info?: string;
  facilitator_name?: string; pl_hours?: number;
  registration_opens_at?: string; registration_closes_at?: string;
  max_participants?: number; is_free: boolean;
  price?: number; currency: string; contact_email?: string;
  status: string; registration_count: number; manual_sales_mode?: boolean;
};

type RegStep = "form" | "payment" | "verify" | "inquiry-success" | "success" | "error" | "duplicate";

function getBaseUrl() {
  const prefix = window.location.pathname.startsWith("/raos") ? "/raos" : "";
  return prefix;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:1.05rem;font-weight:700;margin:1.2rem 0 .4rem">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:1.2rem;font-weight:700;margin:1.4rem 0 .5rem">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:1.5rem;font-weight:800;margin:1.5rem 0 .6rem">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\s*[-*•]\s+(.+)$/gm, '<li style="margin-left:1.2rem;margin-bottom:.3rem">$1</li>')
    .replace(/^\s*\d+\.\s+(.+)$/gm, '<li style="margin-left:1.2rem;margin-bottom:.3rem;list-style-type:decimal">$1</li>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#0d9488;text-decoration:underline" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n\n/g, '</p><p style="margin-bottom:.8rem">')
    .replace(/\n/g, '<br>');
}

const TIMEZONES = [
  "Asia/Hong_Kong","Asia/Singapore","Asia/Tokyo","Asia/Seoul",
  "Asia/Shanghai","Asia/Taipei","Australia/Sydney","Europe/London",
  "America/New_York","America/Los_Angeles","Pacific/Auckland",
];
const CURRENCIES: Record<string, string> = { USD: "$", HKD: "HK$", SGD: "S$", AUD: "A$", CNY: "¥", JPY: "¥", KRW: "₩", GBP: "£", EUR: "€" };
const PROFESSIONAL_ROLES = [
  "Principal / Head of School", "Senior School Leader", "SENCO / Inclusion Leader",
  "Learning Support Coordinator", "School Counsellor", "School Psychologist",
  "Student Support Professional", "Teacher", "Pastoral / Wellbeing Leader",
  "School Administrator", "Education Consultant", "Other",
];
const SCHOOL_TYPES = [
  "International School", "Private / Independent School", "Public / Government School",
  "Bilingual School", "Early Years / Kindergarten", "Learning Centre",
  "University / Higher Education", "Other",
];
const SCHOOL_SIZES = ["Under 250", "250–499", "500–999", "1,000–1,999", "2,000+", "Not sure / Prefer not to say"];
const INTEREST_AREAS = [
  "Learning Difficulties", "Literacy / Reading", "Mathematics",
  "Academic English / Multilingual Learners", "Executive Function", "Attention",
  "Behaviour", "Social-Emotional Needs", "Mental Health & Wellbeing",
  "Neurodiversity", "School Readiness", "Assessment & Referral",
  "Tier 2 Intervention", "Parent Support", "Teacher Support / Differentiation", "Other",
];

function formatSessions(sessions: SessionDate[], timezone: string): string {
  if (!sessions.length) return "";
  return sessions
    .filter(s => s.date)
    .map(s => {
      const parts = [s.date];
      if (s.start_time) parts.push(`${s.start_time}${s.end_time ? `–${s.end_time}` : ""}`);
      return parts.join(" ");
    })
    .join(" · ");
}

function InfoChip({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-teal-600" />
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-slate-800 leading-snug mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function WorkshopPublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [otherWorkshops, setOtherWorkshops] = useState<Workshop[]>([]);

  const [step, setStep] = useState<RegStep>("form");
  const [regId, setRegId] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [regError, setRegError] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [manualInquiryId, setManualInquiryId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qrOptions, setQrOptions] = useState<{ wechatPayQr: string | null; alipayQr: string | null }>({ wechatPayQr: null, alipayQr: null });
  const [usdCnyRate, setUsdCnyRate] = useState<{ rate: number; date: string } | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);

  const paymentContainerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    professional_role: "", professional_role_other: "",
    school_name: "", city: "", country: "", phone: "",
    school_type: "", school_size: "", areas_of_interest: [] as string[],
    school_support_challenge: "",
    interested_future_learning: false, interested_school_training: false,
    interested_assessment_services: false, interested_partner_school: false,
    training_only: false, marketing_consent: false, privacy_consent: false,
    manual_sales_message: "",
    payment_method: "", other_payment_options: [] as string[], payment_reference: "",
  });

  const toggleInterestArea = (area: string) => {
    setForm(f => ({
      ...f,
      areas_of_interest: f.areas_of_interest.includes(area)
        ? f.areas_of_interest.filter(item => item !== area)
        : [...f.areas_of_interest, area],
    }));
  };

  useEffect(() => {
    const base = getBaseUrl();
    fetch(`${base}/api/training/workshops/public/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => setWorkshop(d.workshop))
      .catch(() => setLoadError("Workshop not found or not available."))
      .finally(() => setLoading(false));
    // Fetch other published workshops for the "More Workshops" section
    fetch(`${base}/api/training/workshops/public/list`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setOtherWorkshops((d.workshops ?? []).filter((w: Workshop) => w.slug !== slug)))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!workshop?.manual_sales_mode) return;
    fetch(`${getBaseUrl()}/api/training/workshops/public/${slug}/manual-sales/payment-options`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setQrOptions)
      .catch(() => setRegError("Payment QR codes are temporarily unavailable. Please choose other payment options."));
  }, [slug, workshop?.manual_sales_mode]);

  useEffect(() => {
    if (!workshop || workshop.is_free || workshop.currency !== "USD") return;
    fetch(`${getBaseUrl()}/api/training/exchange-rate/usd-cny`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setUsdCnyRate(data))
      .catch(() => setUsdCnyRate(null));
  }, [workshop]);

  // After step becomes "payment", init Airwallex
  const paymentData = useRef<{ intentId: string; clientSecret: string; env: string } | null>(null);

  useEffect(() => {
    if (step !== "payment" || !paymentData.current || !paymentContainerRef.current) return;
    const { intentId, clientSecret, env } = paymentData.current;
    let cancelled = false;

    async function initPayment() {
      try {
        if (!document.querySelector('script[data-airwallex-sdk]')) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://static.airwallex.com/components/sdk/v1/index.js";
            s.dataset.airwallexSdk = "1";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load Airwallex SDK"));
            document.head.appendChild(s);
          });
        }

        const end = Date.now() + 15000;
        while (!window.AirwallexComponentsSDK && Date.now() < end) {
          await new Promise(r => setTimeout(r, 150));
        }
        if (!window.AirwallexComponentsSDK) throw new Error("Airwallex SDK timed out");
        if (cancelled) return;

        const AW = window.AirwallexComponentsSDK;
        await AW.init({ env: env === "prod" ? "prod" : "demo", origin: window.location.origin });
        if (cancelled) return;

        const element = await AW.createElement("dropIn", {
          intent_id: intentId,
          client_secret: clientSecret,
        });
        if (cancelled || !paymentContainerRef.current) return;

        element.mount(paymentContainerRef.current);

        paymentContainerRef.current.addEventListener("onSuccess", () => {
          setStep("success");
        });
        paymentContainerRef.current.addEventListener("onError", (e: Event) => {
          const detail = (e as CustomEvent).detail;
          setPaymentError(detail?.message ?? "Payment failed. Please try again.");
        });
      } catch (err) {
        if (!cancelled) setPaymentError(err instanceof Error ? err.message : "Failed to initialize payment.");
      }
    }

    initPayment();
    return () => { cancelled = true; };
  }, [step]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!workshop) return;
    setRegError("");
    setSubmitting(true);
    try {
      const base = getBaseUrl();
      if (!workshop.is_free && workshop.manual_sales_mode) {
        const vr = await fetch(`${base}/api/training/workshops/public/${slug}/manual-sales/request-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, message: form.manual_sales_message }),
        });
        const vdata = await vr.json();
        if (!vr.ok) throw new Error(vdata.error ?? "Unable to send verification code");
        setManualInquiryId(vdata.inquiryId);
        setStep("verify");
        return;
      }
      const res = await fetch(`${base}/api/training/workshops/public/${slug}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) { setStep("duplicate"); return; }
        throw new Error(data.error ?? "Registration failed");
      }
      setRegId(data.id);
      if (!data.requiresPayment) {
        setStep("success");
      } else {
        // Create payment intent
        const pr = await fetch(`${base}/api/training/workshops/public/${slug}/payment/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registration_id: data.id }),
        });
        const pdata = await pr.json();
        if (!pr.ok) throw new Error(pdata.error ?? "Payment setup failed");
        if (pdata.alreadyPaid) { setStep("success"); return; }
        paymentData.current = { intentId: pdata.intentId, clientSecret: pdata.clientSecret, env: pdata.env };
        setStep("payment");
      }
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleManualSalesVerification(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    setSubmitting(true);
    try {
      let receiptObjectPath: string | undefined;
      if (form.payment_method === "wechat_pay" || form.payment_method === "alipay") {
        if (!paymentReceipt) throw new Error("Upload your payment receipt screenshot before submitting.");
        if (!["image/jpeg", "image/png", "image/webp"].includes(paymentReceipt.type) || paymentReceipt.size > 10 * 1024 * 1024) {
          throw new Error("Use a PNG, JPEG, or WebP receipt under 10 MB.");
        }
        const upload = await fetch(`${getBaseUrl()}/api/training/workshops/public/${slug}/manual-sales/${manualInquiryId}/receipt-upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ size: paymentReceipt.size, contentType: paymentReceipt.type }),
        });
        const uploadData = await upload.json();
        if (!upload.ok) throw new Error(uploadData.error ?? "Unable to prepare receipt upload.");
        const put = await fetch(uploadData.uploadURL, { method: "PUT", headers: { "Content-Type": paymentReceipt.type }, body: paymentReceipt });
        if (!put.ok) throw new Error("Receipt upload failed. Please try again.");
        receiptObjectPath = uploadData.objectPath;
      }
      const res = await fetch(`${getBaseUrl()}/api/training/workshops/public/${slug}/manual-sales/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiry_id: manualInquiryId, verification_code: verificationCode, receipt_object_path: receiptObjectPath }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unable to submit inquiry");
      setStep("inquiry-success");
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Unable to submit inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
    </div>
  );

  if (loadError || !workshop) return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white gap-4 px-6 text-center">
      <AlertCircle size={40} className="text-slate-400" />
      <h1 className="text-xl font-bold">Workshop Not Found</h1>
      <p className="text-slate-400 text-sm">{loadError || "This workshop is not available."}</p>
      <a href="/training" className="mt-2 text-teal-400 hover:text-teal-300 text-sm underline">← Back to Training</a>
    </div>
  );

  const sessions = Array.isArray(workshop.session_dates) ? workshop.session_dates : [];
  const dateStr = formatSessions(sessions, workshop.timezone);
  const isClosed = workshop.status === "closed";
  const isFull = workshop.status === "full";
  const regClosed = !!(workshop.registration_closes_at && new Date(workshop.registration_closes_at) < new Date());
  const canRegister = !isClosed && !regClosed && !(isFull && workshop.max_participants && workshop.registration_count >= workshop.max_participants);
  const usesExpandedRegistration = true;

  const imageUrl = workshop.image_object_id
    ? `${getBaseUrl()}/api/training/workshops/public/${slug}/image`
    : slug === "nice-try"
      ? `${getBaseUrl()}/images/nice-try-workshop.png`
      : null;

  const priceStr = workshop.is_free
    ? "Free"
    : `${CURRENCIES[workshop.currency] ?? ""}${workshop.price} ${workshop.currency}`;
  const rmbEstimate = usdCnyRate && workshop.currency === "USD"
    ? Math.round(Number(workshop.price) * usdCnyRate.rate)
    : null;
  const manualSalesMode = !workshop.is_free && !!workshop.manual_sales_mode;

  return (
    <div className="min-h-screen bg-[#fdf8f0]">
      {/* Nav */}
      <nav className="bg-[#0c1a2e] px-6 py-3.5 flex items-center gap-3">
        <a href="/training" className="flex items-center gap-2.5 group" aria-label="ReMynd Training and Workshops">
          <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
            <img src="/images/remynd-logo.png" alt="" className="w-7 h-7 object-contain" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">ReMynd</span>
        </a>
        <ChevronRight size={14} className="text-slate-500" />
        <span className="text-slate-400 text-sm truncate">Training & Workshops</span>
      </nav>

      {/* Hero */}
      {/* Flyer image — shown prominently when present */}
      {imageUrl && (
        <div className={`w-full bg-[#0c1a2e] ${slug === "nice-try" ? "px-4 py-6 md:py-10" : ""}`}>
          <img
            src={imageUrl}
            alt={workshop.image_alt ?? workshop.title}
            className={`w-full object-contain object-top ${slug === "nice-try" ? "max-w-3xl max-h-[780px] mx-auto rounded-2xl shadow-2xl shadow-black/30" : "max-h-[520px]"}`}
          />
        </div>
      )}

      {/* Title bar */}
      <div className="bg-[#0c1a2e]">
        <div className="max-w-5xl mx-auto px-6 py-8 md:py-10">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {workshop.status === "published" && (
              <span className="text-[10px] font-bold uppercase tracking-widest bg-teal-500 text-white px-2.5 py-1 rounded-full">Open for Registration</span>
            )}
            {isFull && <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500 text-white px-2.5 py-1 rounded-full">Workshop Full</span>}
            {isClosed && <span className="text-[10px] font-bold uppercase tracking-widest bg-slate-500 text-white px-2.5 py-1 rounded-full">Closed</span>}
            {workshop.is_free
              ? <span className="text-[10px] font-bold uppercase tracking-widest bg-emerald-600 text-white px-2.5 py-1 rounded-full">Free</span>
              : <span className="text-[10px] font-bold uppercase tracking-widest bg-violet-600 text-white px-2.5 py-1 rounded-full">{priceStr}</span>
            }
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">{workshop.title}</h1>
          {workshop.subtitle && <p className="text-lg md:text-xl text-slate-300 mt-3 max-w-2xl">{workshop.subtitle}</p>}
          {workshop.facilitator_name && (
            <div className="flex items-center gap-1.5 mt-4 text-slate-400 text-sm">
              <User size={13} />
              <span>Facilitated by <span className="text-slate-200 font-semibold">{workshop.facilitator_name}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 flex flex-col gap-6">
        {/* Workshop information */}
        <div className="contents">
          {/* Key details */}
          <div className="order-1 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-2 divide-y divide-slate-100">
            {dateStr && <InfoChip icon={Calendar} label="Date(s)" value={dateStr} />}
            {workshop.timezone && <InfoChip icon={Clock} label="Time Zone" value={workshop.timezone} />}
            <InfoChip icon={workshop.delivery_method === "in_person" ? MapPin : workshop.delivery_method === "hybrid" ? Globe : Monitor} label="Delivery"
              value={workshop.delivery_method === "in_person" ? "In Person" : workshop.delivery_method === "hybrid" ? "Hybrid" : "Online"} />
            {workshop.venue_info && <InfoChip icon={MapPin} label="Location" value={workshop.venue_info} />}
            {workshop.pl_hours != null && <InfoChip icon={Award} label="PL Hours" value={`${workshop.pl_hours} hours`} />}
            <InfoChip icon={DollarSign} label="Cost" value={priceStr} />
            {workshop.max_participants != null && (
              <InfoChip icon={Users} label="Capacity" value={`${workshop.registration_count} registered${workshop.max_participants ? ` / ${workshop.max_participants} max` : ''}`} />
            )}
          </div>

          {/* Description */}
          {workshop.description && (
            <div className="order-2 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
              <h2 className="text-base font-bold text-slate-800 mb-3">About This Workshop</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{workshop.description}</p>
            </div>
          )}

          {/* Additional info (markdown) */}
          {workshop.additional_info && (
            <div className="order-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
              <div
                className="text-sm text-slate-700 leading-relaxed"
                style={{ lineHeight: "1.75" }}
                dangerouslySetInnerHTML={{ __html: `<p style="margin-bottom:.8rem">${renderMarkdown(workshop.additional_info)}</p>` }}
              />
            </div>
          )}

          {/* Contact */}
          {workshop.contact_email && (
            <p className="order-5 text-sm text-slate-500 flex items-center gap-1.5">
              <Mail size={13} />
              Questions? <a href={`mailto:${workshop.contact_email}`} className="text-teal-600 hover:text-teal-700 underline">{workshop.contact_email}</a>
            </p>
          )}
        </div>

        {/* Full-width registration section */}
        <div className="order-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
            {step === "form" && (
              <>
                <div className="bg-[#0c1a2e] px-5 py-4">
                  <h3 className="text-white font-bold text-base">
                    {canRegister ? "Register for This Workshop" : isFull ? "Workshop Full" : "Registration Closed"}
                  </h3>
                  {canRegister && (
                    <p className="text-slate-400 text-xs mt-1">
                      {workshop.is_free ? "Free admission — reserve your spot" : manualSalesMode ? "Request registration and payment arrangements directly from ReMynd" : `${priceStr} per person`}
                    </p>
                  )}
                </div>

                {!canRegister ? (
                  <div className="p-6 text-center">
                    <AlertCircle size={32} className="mx-auto mb-3 text-slate-300" />
                    <p className="text-sm text-slate-500">
                      {isFull ? "This workshop has reached capacity." : "Registration for this workshop is closed."}
                    </p>
                    {workshop.contact_email && (
                      <p className="text-xs text-slate-400 mt-2">
                        Contact <a href={`mailto:${workshop.contact_email}`} className="text-teal-600 underline">{workshop.contact_email}</a> to join the waitlist.
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="max-w-4xl mx-auto px-5 md:px-8 py-6 md:py-8 space-y-5">
                    <div>
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-3">Personal Information</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">First Name *</label>
                        <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Last Name *</label>
                        <input required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">School / Organisation{usesExpandedRegistration ? " *" : ""}</label>
                      <input required={usesExpandedRegistration} value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {usesExpandedRegistration && <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">City *</label>
                        <input required value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      </div>}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Country / Region{usesExpandedRegistration ? " *" : ""}</label>
                        <input required={usesExpandedRegistration} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                      <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    </div>

                    <div className="border-t border-slate-100 pt-5 space-y-3">
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">Professional Role</p>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Your Primary Role{usesExpandedRegistration ? " *" : ""}</label>
                      <select value={form.professional_role} onChange={e => setForm(f => ({ ...f, professional_role: e.target.value }))}
                        required={usesExpandedRegistration} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                        <option value="">Select role…</option>
                        {PROFESSIONAL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {form.professional_role === "Other" && (
                        <input required aria-label="Specify professional role" placeholder="Please specify your role"
                          value={form.professional_role_other}
                          onChange={e => setForm(f => ({ ...f, professional_role_other: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      )}
                    </div>

                    {usesExpandedRegistration && <div className="border-t border-slate-100 pt-5 space-y-3">
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">School Information</p>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">School Type</label>
                        <select value={form.school_type} onChange={e => setForm(f => ({ ...f, school_type: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                          <option value="">Select school type…</option>
                          {SCHOOL_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Approximate Number of Students</label>
                        <select value={form.school_size} onChange={e => setForm(f => ({ ...f, school_size: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                          <option value="">Select…</option>
                          {SCHOOL_SIZES.map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                      </div>
                    </div>}

                    {usesExpandedRegistration && <fieldset className="border-t border-slate-100 pt-5">
                      <legend className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-3">Areas of Interest</legend>
                      <div className="grid grid-cols-1 gap-2">
                        {INTEREST_AREAS.map(area => (
                          <label key={area} className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                            <input type="checkbox" checked={form.areas_of_interest.includes(area)}
                              onChange={() => toggleInterestArea(area)}
                              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
                            <span>{area}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>}

                    {usesExpandedRegistration && <div className="border-t border-slate-100 pt-5">
                      <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2">School Needs</label>
                      <p className="text-xs text-slate-500 leading-relaxed mb-2">
                        What is one of the biggest challenges your school currently faces in supporting students who require more than ordinary classroom intervention? <span className="text-slate-400">(Optional)</span>
                      </p>
                      <textarea rows={4} value={form.school_support_challenge}
                        onChange={e => setForm(f => ({ ...f, school_support_challenge: e.target.value }))}
                        className="w-full resize-y border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>}

                    {manualSalesMode && <fieldset className="border-t border-slate-100 pt-5 space-y-4">
                      <legend className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-3">Payment preference *</legend>
                      <p className="text-xs text-slate-500">Choose how you would like to pay. QR payments require a screenshot of the completed payment. For credit cards, ReMynd will send you a secure payment link separately.</p>
                      {rmbEstimate !== null && usdCnyRate && (
                        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
                          <p className="text-sm font-semibold text-teal-900">
                            {priceStr} is approximately ¥{rmbEstimate.toLocaleString("en-US")} RMB
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-teal-800">
                            Based on the latest daily reference rate of 1 USD = {usdCnyRate.rate.toFixed(4)} RMB ({usdCnyRate.date}). Your payment provider may use a slightly different rate.
                          </p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          ["wechat_pay", "WeChat Pay", qrOptions.wechatPayQr],
                          ["alipay", "Alipay", qrOptions.alipayQr],
                          ["credit_card", "Credit Card", null],
                        ].map(([value, label, qr]) => (
                          <label key={value} className={`rounded-xl border p-3 cursor-pointer transition-colors ${form.payment_method === value ? "border-teal-500 bg-teal-50" : "border-slate-200 bg-white"}`}>
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                              <input type="radio" name="payment_method" required value={value ?? ""} checked={form.payment_method === value}
                                onChange={() => {
                                  setForm(f => ({ ...f, payment_method: value ?? "", other_payment_options: [] }));
                                  setPaymentReceipt(null);
                                }} />
                              {label}
                            </span>
                            {qr && form.payment_method === value && <img src={qr} alt={`${label} payment QR code`} className="mt-3 mx-auto w-full max-w-48 max-h-48 object-contain rounded-lg bg-white" />}
                          </label>
                        ))}
                      </div>
                      {(form.payment_method === "wechat_pay" || form.payment_method === "alipay") && (
                        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-xs text-amber-900">Scan the QR code, complete the payment, then upload a screenshot of the confirmation. Your place is confirmed only after administrator verification.</p>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Payment reference <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                            <input maxLength={200} value={form.payment_reference} onChange={e => setForm(f => ({ ...f, payment_reference: e.target.value }))}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wide mb-1">Payment confirmation screenshot *</label>
                            <input required type="file" accept="image/png,image/jpeg,image/webp"
                              onChange={e => setPaymentReceipt(e.target.files?.[0] ?? null)}
                              className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-teal-700" />
                            <p className="mt-1 text-[10px] text-slate-500">PNG, JPEG, or WebP; maximum 10 MB.</p>
                          </div>
                        </div>
                      )}
                      {form.payment_method === "credit_card" && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs text-slate-600">ReMynd will contact you separately with a secure credit-card payment link. Your place will not be registered until payment is confirmed.</p>
                        </div>
                      )}
                    </fieldset>}

                    {manualSalesMode && <div className="border-t border-slate-100 pt-5">
                      <label className="block text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-2">Inquiry details</label>
                      <p className="text-xs text-slate-500 mb-2">Tell us about any registration, invoicing, or workshop requirements. We will confirm arrangements before your place is registered.</p>
                      <textarea rows={3} value={form.manual_sales_message}
                        onChange={e => setForm(f => ({ ...f, manual_sales_message: e.target.value }))}
                        className="w-full resize-y border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>}

                    {usesExpandedRegistration && <fieldset className="border-t border-slate-100 pt-5">
                      <legend className="text-[10px] font-bold text-teal-700 uppercase tracking-widest mb-3">Future Interest</legend>
                      <div className="space-y-2.5">
                        {[
                          ["interested_future_learning", "Future free ReMynd professional learning events"],
                          ["interested_school_training", "Dedicated professional learning for my school"],
                          ["interested_assessment_services", "Information about ReMynd educational assessment services"],
                          ["interested_partner_school", "Information about becoming a ReMynd Partner School"],
                          ["training_only", "I am only registering for this workshop at this time"],
                        ].map(([field, label]) => (
                          <label key={field} className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                            <input type="checkbox"
                              checked={form[field as keyof typeof form] as boolean}
                              onChange={e => setForm(f => ({ ...f, [field]: e.target.checked }))}
                              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400" />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>}

                    <div className="border-t border-slate-100 pt-5 space-y-4">
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">Consent</p>
                      {usesExpandedRegistration && <label className="flex items-start gap-2.5 cursor-pointer bg-slate-50 border border-slate-100 rounded-xl p-3">
                        <input type="checkbox" checked={form.marketing_consent}
                          onChange={e => setForm(f => ({ ...f, marketing_consent: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400 flex-shrink-0" />
                        <span className="text-xs text-slate-600 leading-relaxed">
                          Yes, I would like to receive occasional emails from ReMynd Student Services about future professional learning opportunities, educational resources, assessment services, and relevant programmes.
                          <span className="block text-[10px] text-slate-400 mt-1">You can unsubscribe at any time.</span>
                        </span>
                      </label>}
                    <label className="flex items-start gap-2.5 cursor-pointer group mt-1">
                      <input type="checkbox" required checked={form.privacy_consent} onChange={e => setForm(f => ({ ...f, privacy_consent: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400 cursor-pointer flex-shrink-0" />
                      <span className="text-xs text-slate-500 leading-relaxed">
                        I agree to the <a href="/privacy" target="_blank" className="text-teal-600 underline">Privacy Policy</a> and consent to my information being used for workshop administration purposes.*
                      </span>
                    </label>
                    </div>
                    {regError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                        <AlertCircle size={12} /> {regError}
                      </p>
                    )}
                    <button type="submit" disabled={submitting}
                      className="w-full mt-1 bg-[#0c1a2e] hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2">
                      {submitting ? <><Loader2 size={14} className="animate-spin" /> {manualSalesMode ? "Sending code…" : "Registering…"}</> : workshop.is_free ? "Register — Free" : manualSalesMode ? (form.payment_method === "credit_card" ? "Request Registration & Credit Card Link" : "Submit Payment & Registration Request") : `Register & Pay ${priceStr}`}
                    </button>
                  </form>
                )}
              </>
            )}

            {step === "payment" && (
              <>
                <div className="bg-[#0c1a2e] px-5 py-4">
                  <h3 className="text-white font-bold text-base">Complete Payment</h3>
                  <p className="text-slate-400 text-xs mt-1">{priceStr} — {workshop.title}</p>
                </div>
                <div className="px-5 py-4">
                  {paymentError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
                      <AlertCircle size={12} /> {paymentError}
                    </p>
                  )}
                  <div ref={paymentContainerRef} className="min-h-[300px]" />
                  <p className="text-[10px] text-slate-400 text-center mt-3">Payments processed securely by Airwallex</p>
                </div>
              </>
            )}

            {step === "verify" && (
              <form onSubmit={handleManualSalesVerification} className="max-w-lg mx-auto px-5 py-8 space-y-5">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-teal-100 flex items-center justify-center"><Mail size={22} className="text-teal-700" /></div>
                  <h3 className="font-bold text-slate-900 text-lg">Verify your email</h3>
                  <p className="text-sm text-slate-500 mt-2">We sent a six-digit verification code to <strong>{form.email}</strong>. Enter it to submit your ReMynd workshop inquiry.</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Verification code *</label>
                  <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-3 text-center text-lg tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-teal-400" />
                </div>
                {regError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2"><AlertCircle size={12} /> {regError}</p>}
                <button type="submit" disabled={submitting || verificationCode.length !== 6}
                  className="w-full bg-[#0c1a2e] hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : "Verify & Submit Inquiry"}
                </button>
                <button type="button" onClick={() => { setStep("form"); setVerificationCode(""); setRegError(""); }} className="w-full text-sm text-teal-600 underline">Use a different email or resend code</button>
              </form>
            )}

            {step === "inquiry-success" && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center"><Check size={28} className="text-teal-700" strokeWidth={2.5} /></div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">Your inquiry has been received</p>
                  <p className="text-sm text-slate-500 mt-1">A ReMynd team member will contact <strong>{form.email}</strong> about registration and payment arrangements.</p>
                  <p className="text-xs text-slate-400 mt-3">This is not a registration or payment confirmation. Workshop access is not activated until ReMynd confirms arrangements.</p>
                </div>
                <a href="/training" className="text-sm text-teal-600 hover:text-teal-700 font-medium underline mt-2">← Back to Training</a>
              </div>
            )}

            {step === "success" && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Check size={28} className="text-emerald-600" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">You're registered!</p>
                  <p className="text-sm text-slate-500 mt-1">
                    A confirmation email has been sent to <strong>{form.email}</strong>.
                  </p>
                  {workshop.contact_email && (
                    <p className="text-xs text-slate-400 mt-3">
                      Questions? <a href={`mailto:${workshop.contact_email}`} className="text-teal-600 underline">{workshop.contact_email}</a>
                    </p>
                  )}
                </div>
                <a href="/training" className="text-sm text-teal-600 hover:text-teal-700 font-medium underline mt-2">← Back to Training</a>
              </div>
            )}

            {step === "duplicate" && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                  <Check size={28} className="text-amber-600" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Already registered</p>
                  <p className="text-sm text-slate-500 mt-1">Your email is already registered for this workshop.</p>
                  {workshop.contact_email && (
                    <p className="text-xs text-slate-400 mt-3">
                      Questions? <a href={`mailto:${workshop.contact_email}`} className="text-teal-600 underline">{workshop.contact_email}</a>
                    </p>
                  )}
                </div>
              </div>
            )}

            {step === "error" && (
              <div className="p-8 flex flex-col items-center gap-4 text-center">
                <AlertCircle size={36} className="text-red-400" />
                <p className="font-bold text-slate-900">Something went wrong</p>
                <button onClick={() => setStep("form")} className="text-sm text-teal-600 underline">Try again</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* More Workshops */}
      {otherWorkshops.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 pb-12">
          <h2 className="text-xl font-bold text-slate-900 mb-5">More Workshops</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherWorkshops.map(w => {
              const wImageUrl = w.image_object_id
                ? `${getBaseUrl()}/api/training/workshops/public/${w.slug}/image`
                : null;
              const wPrice = w.is_free ? "Free" : `${CURRENCIES[w.currency] ?? ""}${w.price} ${w.currency}`;
              return (
                <a
                  key={w.id}
                  href={`/training/${w.slug}`}
                  className="block bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
                >
                  {wImageUrl ? (
                    <img src={wImageUrl} alt={w.title} className="w-full h-36 object-cover object-top group-hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-br from-[#0c1a2e] to-teal-900 flex items-center justify-center">
                      <Calendar size={32} className="text-white/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-teal-700 transition-colors">{w.title}</p>
                    {w.subtitle && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{w.subtitle}</p>}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-semibold text-teal-600">{wPrice}</span>
                      {w.status === "published" && (
                        <span className="text-[10px] font-bold uppercase tracking-widest bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">Open</span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0c1a2e] mt-4 px-6 py-8 text-center">
        <p className="text-slate-400 text-xs">
          © {new Date().getFullYear()} ReMynd Student Services · <a href="/privacy" className="hover:text-slate-300 underline">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
}
