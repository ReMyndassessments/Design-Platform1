import React from "react";
import { Link } from "wouter";
import { LanguageSwitcherLight } from "@/lib/i18n";
import {
  ArrowLeft,
  Building2,
  UserCheck,
  CheckCircle,
  GraduationCap,
  HeartHandshake,
  Network,
} from "lucide-react";

const PLATFORMS = [
  {
    name: "RAOS",
    role: "Assessment Operating System",
    desc: "Your coordinator's primary workspace. All referrals, cases, form assignments, and completed reports are managed here. Reports remain within the student support department at all times.",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-700",
  },
  {
    name: "Bobby Agent OS",
    role: "Student Support & IEP Management",
    desc: "Following assessment and debrief, your coordinator opens a Bobby case for each student. Goals, interventions, notes, and 12-month progress monitoring are managed here — your school's IEP-equivalent system.",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  {
    name: "Concern2Care",
    role: "Teacher Differentiation Support",
    desc: "Teachers log classroom observations. Your coordinator provides an approved, curated summary of relevant findings — not the full clinical report. Concern2Care surfaces evidence-based strategies matched to each student's profile.",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
];

const JOIN_STEPS = [
  { n: "1", title: "Submit an Inquiry", desc: "Complete our school partnership inquiry form. We will arrange an initial consultation with your leadership team within three business days." },
  { n: "2", title: "Consultation & Agreement", desc: "ReMynd meets with your leadership team to understand your school's context and goals, and finalises the partnership agreement." },
  { n: "3", title: "Coordinator Designation", desc: "Your school designates a School Clinical Coordinator. ReMynd activates platform access and configures the system for your context." },
  { n: "4", title: "Training", desc: "Comprehensive training is delivered for your coordinator and faculty before active case management begins." },
  { n: "5", title: "Go Live", desc: "Your in-house student support system is operational. ReMynd support begins immediately and continues throughout your agreement." },
];

const TRAINING = [
  {
    label: "Faculty Professional Development",
    desc: "All teaching staff receive foundational professional development covering neurodiversity frameworks, behaviour as communication, regulation strategies, tiered intervention design, and referral protocols. Delivered as a full-day or multi-session institute.",
  },
  {
    label: "Coordinator Systems Training",
    desc: "Hands-on training in RAOS case management, Bobby Agent OS goal-setting and progress monitoring, Concern2Care teacher mediation protocols, confidentiality frameworks, and assessment interpretation.",
  },
  {
    label: "Implementation Planning",
    desc: "Training concludes with a documented implementation plan specific to your school context, covering procedures, timelines, communication structures, and escalation pathways.",
  },
];

const SUPPORT_ITEMS = [
  {
    label: "Clinical Consultation",
    desc: "ReMynd's clinical team is available throughout your agreement for case consultation, assessment interpretation, support plan review, and complex case support. Structured 30-day and 90-day implementation reviews are built in.",
  },
  {
    label: "Technical Support",
    desc: "Platform access, user management, troubleshooting, and feature guidance throughout your agreement. Your coordinator has a direct point of contact for all technical matters.",
  },
  {
    label: "Annual Program Review",
    desc: "At the conclusion of each school year, ReMynd conducts a full implementation review with your coordinator and school leadership to assess outcomes and plan for the year ahead.",
  },
];

const RESPONSIBILITIES = [
  "Manage referrals, cases, and assessment timelines in RAOS",
  "Coordinate with ReMynd's clinical team and school staff",
  "Receive and safeguard completed assessment reports",
  "Lead debrief conversations with families and school leadership",
  "Govern all decisions about what information classroom teachers receive",
  "Initiate and maintain student support plans in Bobby Agent OS",
  "Monitor student progress through 12-month structured review cycles",
  "Mediate teacher support and differentiation guidance through Concern2Care",
];

export default function PartnerSchoolsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">
            <ArrowLeft size={14} />
            Back
          </Link>
          <LanguageSwitcherLight />
        </div>
      </header>

      <div
        className="relative overflow-hidden px-6 py-20 text-center"
        style={{ background: "linear-gradient(145deg, #1e0a3c 0%, #2d1060 45%, #1a0a2e 100%)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div className="absolute top-[-10%] left-[10%] w-[50%] h-[60%] bg-purple-600/15 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[45%] h-[60%] bg-indigo-800/20 rounded-full blur-[80px]" />

        <div className="relative max-w-2xl mx-auto">
          <span className="inline-block text-[10px] font-bold tracking-[0.2em] uppercase text-purple-300 border border-purple-500/30 rounded-full px-4 py-1.5 mb-6">
            Partner Schools Program
          </span>
          <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            Bring Assessment Excellence In-House
          </h1>
          <p className="text-purple-200/80 text-base leading-relaxed">
            License the ReMynd Assessment Operating System for your school — with comprehensive training and ongoing clinical and technical support from ReMynd.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">

        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">What is the Partner Schools Program?</h2>
          </div>
          <div className="space-y-4 max-w-3xl">
            <p className="text-slate-600 leading-relaxed text-base">
              Schools that sign a partnership agreement with ReMynd gain licensed access to the ReMynd Assessment Operating System (RAOS) — the same platform ReMynd uses internally to deliver its own assessment services. A designated School Clinical Coordinator operates the system in-house, supported by comprehensive training and ongoing consultation from ReMynd's clinical and technical team.
            </p>
            <p className="text-slate-600 leading-relaxed text-base">
              This is not a referral service. It is a full operational model — your school runs its own coordinated student support system, using ReMynd's platform and methodology, with ReMynd as your partner throughout.
            </p>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <UserCheck size={16} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">The School Clinical Coordinator</h2>
          </div>
          <p className="text-slate-600 leading-relaxed text-base max-w-3xl mb-6">
            A senior member of your student support team — typically a counsellor, learning support coordinator, SEN coordinator, or student support leader — trained and authorised to manage the full assessment and student support cycle within RAOS.
          </p>
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Core Responsibilities</h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {RESPONSIBILITIES.map((r, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <CheckCircle size={15} className="text-purple-400 flex-shrink-0 mt-0.5" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={16} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">How Schools Join the Program</h2>
          </div>
          <div className="space-y-5">
            {JOIN_STEPS.map((step) => (
              <div key={step.n} className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-full bg-purple-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {step.n}
                </div>
                <div className="pt-1.5">
                  <p className="font-semibold text-slate-800 text-sm mb-1">{step.title}</p>
                  <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <GraduationCap size={16} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Comprehensive Training</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {TRAINING.map((item) => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="font-semibold text-slate-800 text-sm mb-2">{item.label}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <HeartHandshake size={16} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Ongoing Support</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {SUPPORT_ITEMS.map((item) => (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-5">
                <p className="font-semibold text-slate-800 text-sm mb-2">{item.label}</p>
                <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Network size={16} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">The Three-Platform Ecosystem</h2>
          </div>
          <p className="text-slate-500 text-sm mb-6 ml-[52px]">
            RAOS works alongside two specialist platforms — connected by professional protocols and your coordinator's expertise, not automated data transfer.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {PLATFORMS.map((p) => (
              <div key={p.name} className={`rounded-xl border p-5 ${p.bg} ${p.border}`}>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold mb-3 ${p.badge}`}>
                  {p.name}
                </span>
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{p.role}</p>
                <p className="text-sm text-slate-700 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm text-slate-600 leading-relaxed">
            <strong className="text-slate-800">The coordinator is the professional bridge</strong> between all three systems. Student assessment reports never travel electronically to classroom teachers. Information flows through professional judgment, not automated pipelines.
          </div>
        </section>

        <section className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl px-8 py-12 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Enquire About the Partner Schools Program</h2>
          <p className="text-purple-200 mb-8 text-sm leading-relaxed max-w-md mx-auto">
            We will arrange an initial consultation with your leadership team within three business days.
          </p>
          <Link href="/portal?tab=school">
            <a className="inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-7 py-3 rounded-xl hover:bg-purple-50 transition-colors text-sm shadow-lg">
              Submit a Partnership Inquiry
            </a>
          </Link>
        </section>

      </div>

      <footer className="border-t border-slate-200 bg-white py-6 text-center">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} ReMynd Student Services · Confidential</p>
      </footer>
    </div>
  );
}
