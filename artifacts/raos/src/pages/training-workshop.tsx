/**
 * Public workshop page — /training/:slug
 * No authentication required.
 * Handles free registration (immediate) and paid (Airwallex dropIn embedded inline).
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
  status: string; registration_count: number;
};

type RegStep = "form" | "payment" | "success" | "error" | "duplicate";

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
  const [submitting, setSubmitting] = useState(false);

  const paymentContainerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "",
    professional_role: "", school_name: "", country: "", phone: "",
    privacy_consent: false,
  });

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

  const imageUrl = workshop.image_object_id
    ? `${getBaseUrl()}/api/training/workshops/public/${slug}/image`
    : null;

  const priceStr = workshop.is_free
    ? "Free"
    : `${CURRENCIES[workshop.currency] ?? ""}${workshop.price} ${workshop.currency}`;

  return (
    <div className="min-h-screen bg-[#fdf8f0]">
      {/* Nav */}
      <nav className="bg-[#0c1a2e] px-6 py-3.5 flex items-center gap-3">
        <a href="/training" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
            <img src="/images/logo-icon.png" alt="ReMynd" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">ReMynd</span>
        </a>
        <ChevronRight size={14} className="text-slate-500" />
        <span className="text-slate-400 text-sm truncate">Training & Workshops</span>
      </nav>

      {/* Hero */}
      {/* Flyer image — shown prominently when present */}
      {imageUrl && (
        <div className="w-full bg-[#0c1a2e]">
          <img
            src={imageUrl}
            alt={workshop.image_alt ?? workshop.title}
            className="w-full max-h-[520px] object-contain object-top"
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
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: info + description */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key details */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-2 divide-y divide-slate-100">
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
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
              <h2 className="text-base font-bold text-slate-800 mb-3">About This Workshop</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{workshop.description}</p>
            </div>
          )}

          {/* Additional info (markdown) */}
          {workshop.additional_info && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
              <div
                className="text-sm text-slate-700 leading-relaxed"
                style={{ lineHeight: "1.75" }}
                dangerouslySetInnerHTML={{ __html: `<p style="margin-bottom:.8rem">${renderMarkdown(workshop.additional_info)}</p>` }}
              />
            </div>
          )}

          {/* Contact */}
          {workshop.contact_email && (
            <p className="text-sm text-slate-500 flex items-center gap-1.5">
              <Mail size={13} />
              Questions? <a href={`mailto:${workshop.contact_email}`} className="text-teal-600 hover:text-teal-700 underline">{workshop.contact_email}</a>
            </p>
          )}
        </div>

        {/* Right: registration card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg sticky top-6 overflow-hidden">
            {step === "form" && (
              <>
                <div className="bg-[#0c1a2e] px-5 py-4">
                  <h3 className="text-white font-bold text-base">
                    {canRegister ? "Register for This Workshop" : isFull ? "Workshop Full" : "Registration Closed"}
                  </h3>
                  {canRegister && (
                    <p className="text-slate-400 text-xs mt-1">
                      {workshop.is_free ? "Free admission — reserve your spot" : `${priceStr} per person`}
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
                  <form onSubmit={handleRegister} className="px-5 py-4 space-y-3">
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
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email *</label>
                      <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Professional Role</label>
                      <select value={form.professional_role} onChange={e => setForm(f => ({ ...f, professional_role: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400">
                        <option value="">Select role…</option>
                        {["Teacher / Educator","School Psychologist / Educational Therapist","School Counsellor","School Administrator / Principal","University / College Staff","Researcher / Academic","Parent / Guardian","Other"].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">School / Organisation</label>
                      <input value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Country</label>
                        <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
                      </div>
                    </div>
                    <label className="flex items-start gap-2.5 cursor-pointer group mt-1">
                      <input type="checkbox" required checked={form.privacy_consent} onChange={e => setForm(f => ({ ...f, privacy_consent: e.target.checked }))}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400 cursor-pointer flex-shrink-0" />
                      <span className="text-xs text-slate-500 leading-relaxed">
                        I agree to the <a href="/privacy" target="_blank" className="text-teal-600 underline">Privacy Policy</a> and consent to my information being used for workshop administration purposes.*
                      </span>
                    </label>
                    {regError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                        <AlertCircle size={12} /> {regError}
                      </p>
                    )}
                    <button type="submit" disabled={submitting}
                      className="w-full mt-1 bg-[#0c1a2e] hover:bg-slate-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl py-3 transition-colors flex items-center justify-center gap-2">
                      {submitting ? <><Loader2 size={14} className="animate-spin" /> Registering…</> : workshop.is_free ? "Register — Free" : `Register & Pay ${priceStr}`}
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
