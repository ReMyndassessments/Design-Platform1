import { useState, useRef } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2, Users, Globe, BookOpen,
  ArrowRight, Star, Building2, Calendar,
} from "lucide-react";

// ── Data ─────────────────────────────────────────────────────────────────────

const WORKSHOPS = [
  {
    num: 1,
    title: "Foundations & Philosophy",
    subtitle: "Understanding the Thinking Behind the ReMynd Approach",
    date: "Wednesday, 16 September 2026",
    question: "How can we understand students more clearly before deciding what happens next?",
    colour: "border-indigo-400",
    badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dateBg: "bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
    summary: "Explore the changing educational landscape, inequities in access to specialist services, the Tier 2 assessment and intervention gap, the risks of over-pathologizing student difficulties, the distinction between educational assessment and clinical diagnosis, and ReMynd's principle of Understanding Before Labels.",
  },
  {
    num: 2,
    title: "Understanding the ReMynd Assessment Ecosystem",
    subtitle: "From Concern to Coordinated Support",
    date: "Wednesday, 30 September 2026",
    question: "How do we create a coordinated pathway from student concern to meaningful educational support?",
    colour: "border-teal-400",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    dateBg: "bg-teal-50 text-teal-700",
    dot: "bg-teal-500",
    summary: "Explore how referral, evidence gathering, assessment, professional collaboration, scoring, interpretation, reporting, debriefing, support planning, and progress monitoring can operate as one coordinated student-support journey.",
  },
  {
    num: 3,
    title: "Thinking Like a ReMynd Clinician",
    subtitle: "From Concern to Educational Understanding",
    date: "Wednesday, 14 October 2026",
    question: "What do we need to understand before deciding what happens next?",
    colour: "border-violet-400",
    badge: "bg-violet-50 text-violet-700 border-violet-200",
    dateBg: "bg-violet-50 text-violet-700",
    dot: "bg-violet-500",
    summary: "Learn to separate observation from interpretation, transform concerns into meaningful educational questions, consider multiple possible explanations, identify patterns across evidence sources, reduce confirmation bias, and select appropriate assessment pathways.",
    keyPrinciple: "Curiosity Before Certainty.",
  },
  {
    num: 4,
    title: "The Comprehensive Educational Profile & Support Plan",
    subtitle: "From Evidence to Educational Action",
    date: "Wednesday, 28 October 2026",
    question: "What do we now understand about this student that will help us support them more effectively?",
    colour: "border-amber-400",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dateBg: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    summary: "Explore how parent, teacher, student, school, observation, work-sample, and assessment evidence can be integrated into a coherent whole-learner profile and translated into practical classroom accommodations, intervention priorities, teacher recommendations, parent recommendations, individualized support planning, and progress monitoring.",
  },
];

const WHO_SHOULD_ATTEND = [
  "School Leaders", "Principals", "SENCOs", "Learning Support Coordinators",
  "School Counsellors", "Inclusion Leaders", "Teachers", "Pastoral Leaders",
  "Student Support Professionals",
];

const WHY_PARTICIPATE = [
  "Recognize when a concern requires deeper investigation.",
  "Strengthen Tier 2 assessment and intervention practices.",
  "Avoid prematurely interpreting learning difficulties as disorders.",
  "Ask stronger educational referral questions.",
  "Gather and interpret evidence from multiple sources.",
  "Determine when focused assessment, comprehensive assessment, intervention, monitoring, or specialist referral may be appropriate.",
  "Translate assessment findings into practical educational support.",
];

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
const SCHOOL_SIZES = [
  "Under 250", "250–499", "500–999", "1,000–1,999", "2,000+", "Not sure / Prefer not to say",
];
const AREAS_OF_INTEREST = [
  "Learning Difficulties", "Literacy / Reading", "Mathematics",
  "Academic English / Multilingual Learners", "Executive Function", "Attention",
  "Behaviour", "Social-Emotional Needs", "Mental Health & Wellbeing",
  "Neurodiversity", "School Readiness", "Assessment & Referral",
  "Tier 2 Intervention", "Parent Support", "Teacher Support / Differentiation", "Other",
];
const FUTURE_INTERESTS = [
  { key: "interested_future_learning", label: "Future free ReMynd professional learning events" },
  { key: "interested_school_training", label: "Dedicated professional learning for my school" },
  { key: "interested_assessment_services", label: "Information about ReMynd educational assessment services" },
  { key: "interested_partner_school", label: "Information about becoming a ReMynd Partner School" },
  { key: "training_only", label: "I am only registering for this training series at this time" },
];

// ── Source from URL params ────────────────────────────────────────────────────
function getSourceFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("source") ?? params.get("utm_source") ?? null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TrainingPage() {
  const [, navigate] = useLocation();
  const registerRef = useRef<HTMLDivElement>(null);
  const bringSeriesRef = useRef<HTMLDivElement>(null);

  const [submitted, setSubmitted] = useState(false);
  const [showBringSeries, setShowBringSeries] = useState(false);
  const [schoolInquirySubmitted, setSchoolInquirySubmitted] = useState(false);

  const scrollToRegister = () => {
    registerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const scrollToBringSeries = () => {
    setShowBringSeries(true);
    // Wait a tick for the section to render before scrolling
    setTimeout(() => {
      bringSeriesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <Hero onRegister={scrollToRegister} onBringSeries={scrollToBringSeries} />
      <AboutSeries />
      <WorkshopCards />
      <WhoShouldAttend />
      <ProgramFormat />
      <WhyParticipate />
      <div ref={registerRef} className="scroll-mt-8">
        {submitted
          ? <SuccessScreen onBack={() => navigate("/")} />
          : <RegistrationForm onSuccess={() => setSubmitted(true)} />
        }
      </div>
      {showBringSeries && (
        <div ref={bringSeriesRef} className="scroll-mt-8">
          {schoolInquirySubmitted
            ? <SchoolInquirySuccess />
            : <BringToMySchool onSuccess={() => setSchoolInquirySubmitted(true)} />
          }
        </div>
      )}
      <Footer onRegister={scrollToRegister} />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero({ onRegister, onBringSeries }: { onRegister: () => void; onBringSeries: () => void }) {
  return (
    <section className="bg-[#0c1a2e] text-white relative overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      {/* Nav bar */}
      <nav className="relative border-b border-white/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-white font-bold text-base tracking-tight">ReMynd</span>
            <span className="text-teal-400 text-[10px] font-semibold tracking-widest uppercase">Student Services</span>
          </div>
          <div className="ml-auto">
            <button
              onClick={onRegister}
              className="inline-flex items-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-white font-bold px-4 py-2 rounded-lg text-xs tracking-wide transition-colors"
            >
              REGISTER FREE <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero body */}
      <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-1.5 text-teal-300 text-xs font-semibold tracking-wide uppercase mb-8">
          <Star size={11} /> Free Professional Learning Series · September–October 2026
        </div>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6 text-white max-w-4xl mx-auto">
          When a Student Is Struggling,<br />
          <span className="text-teal-400">Do We Really Understand Why?</span>
        </h1>
        <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-4">
          Schools are increasingly supporting students with complex combinations of academic, behavioural, emotional, language, executive-function, and social needs.
        </p>
        <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto mb-10">
          Yet between universal classroom support and specialist diagnosis, there is often a critical Tier 2 assessment and intervention gap.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <button
            onClick={onRegister}
            className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-bold px-8 py-3.5 rounded-xl text-sm tracking-wide transition-colors shadow-lg shadow-teal-500/20"
          >
            REGISTER FREE <ArrowRight size={15} />
          </button>
          <button
            onClick={onBringSeries}
            className="inline-flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl text-sm tracking-wide transition-colors hover:bg-white/5"
          >
            BRING THIS SERIES TO MY SCHOOL
          </button>
        </div>
        <p className="text-slate-500 text-xs italic tracking-wide">
          Understand First. See the Whole Learner. Act on Understanding. Support Growth.
        </p>
      </div>
    </section>
  );
}

// ── About ─────────────────────────────────────────────────────────────────────
function AboutSeries() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">About the Series</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">A Different Conversation About Educational Assessment</h2>
        </div>
        <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed space-y-5 text-[15px]">
          <p>
            The ReMynd Assessment System Training Series is a complimentary four-part professional learning programme designed to help school teams strengthen the space between ordinary classroom intervention and formal specialist referral.
          </p>
          <div className="bg-slate-50 border-l-4 border-teal-400 rounded-r-xl p-5 not-prose grid md:grid-cols-2 gap-4">
            <div className="text-center p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Rather than beginning with</p>
              <p className="text-slate-700 font-medium italic text-base">"What is wrong with this student?"</p>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-xl">
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-2">ReMynd begins with</p>
              <p className="text-teal-800 font-semibold italic text-base">"How does this student learn, and what support will help them succeed?"</p>
            </div>
          </div>
          <p>
            The series introduces the philosophy, reasoning, and support framework behind the ReMynd Assessment System and shows how schools can move more systematically from:
          </p>
          <div className="not-prose flex flex-wrap items-center justify-center gap-1.5 py-2">
            {["Concern", "Evidence", "Understanding", "Educational Implications", "Support", "Monitoring", "Growth"].map((s, i, arr) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold px-3 py-1 rounded-full text-xs">{s}</span>
                {i < arr.length - 1 && <ArrowRight size={12} className="text-slate-400" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Workshop Cards ─────────────────────────────────────────────────────────────
function WorkshopCards() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">What You'll Learn</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">Four Professional Learning Workshops</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {WORKSHOPS.map(w => (
            <div key={w.num} className={`bg-white rounded-2xl border-2 ${w.colour} p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-8 h-8 rounded-full ${w.dot} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {w.num}
                </div>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest border rounded-full px-2 py-0.5 inline-block mb-1 ${w.badge}`}>Workshop {w.num}</p>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{w.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{w.subtitle}</p>
                </div>
              </div>
              {/* Date badge */}
              <div className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 mb-4 w-fit ${w.dateBg} border ${w.badge.split(" ").find(c => c.startsWith("border-"))}`}>
                <Calendar size={11} />
                <span className="text-xs font-semibold">{w.date}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">{w.summary}</p>
              {w.keyPrinciple && (
                <p className="text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-1.5 mb-3 italic">
                  Key Principle: {w.keyPrinciple}
                </p>
              )}
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Central Question</p>
                <p className="text-sm text-slate-700 font-medium italic leading-relaxed">{w.question}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Who Should Attend ─────────────────────────────────────────────────────────
function WhoShouldAttend() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Who Should Attend</p>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-10">Built for School Professionals</h2>
        <div className="flex flex-wrap gap-2.5 justify-center mb-8">
          {WHO_SHOULD_ATTEND.map(r => (
            <span key={r} className="bg-slate-100 text-slate-700 font-medium px-4 py-2 rounded-full text-sm border border-slate-200">
              {r}
            </span>
          ))}
        </div>
        <div className="inline-flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-6 py-4 max-w-xl text-left">
          <Users size={18} className="text-indigo-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-800 leading-relaxed">
            Schools are encouraged to register teams so colleagues can develop a <strong>shared language and approach</strong> to student support.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Program Format ────────────────────────────────────────────────────────────
function ProgramFormat() {
  return (
    <section className="py-20 bg-[#0c1a2e] text-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-3">Programme Details</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white">September–October 2026</h2>
          <p className="text-slate-400 text-sm mt-2">Four online workshops, one every two weeks</p>
        </div>

        {/* Format summary tiles */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: BookOpen, label: "4 Workshops", sub: "Professional Learning" },
            { icon: Globe, label: "Online", sub: "Internationally Accessible" },
            { icon: Star, label: "Complimentary", sub: "Free for Schools" },
            { icon: Building2, label: "School Teams", sub: "Register Together" },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
              <Icon size={20} className="text-teal-400 mx-auto mb-2" />
              <p className="font-bold text-white text-sm">{label}</p>
              <p className="text-slate-400 text-xs mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Schedule */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8">
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <Calendar size={14} className="text-teal-400" />
            <p className="text-xs font-bold text-teal-400 uppercase tracking-widest">Workshop Schedule</p>
          </div>
          <div className="divide-y divide-white/5">
            {WORKSHOPS.map((w) => (
              <div key={w.num} className="flex items-center gap-4 px-5 py-4">
                <div className={`w-7 h-7 rounded-full ${w.dot} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                  {w.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight">Workshop {w.num} — {w.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{w.subtitle}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-teal-300 text-xs font-semibold whitespace-nowrap">{w.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-6 text-center">
          <p className="text-teal-300 font-semibold text-base mb-2">
            There is no requirement to purchase ReMynd assessment services in order to participate.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto">
            The series is offered as part of ReMynd Student Services' commitment to strengthening schools' capacity to understand and support students whose needs extend beyond ordinary classroom intervention.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Why Participate ───────────────────────────────────────────────────────────
function WhyParticipate() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Why Participate</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900">What Participants Gain</h2>
          <p className="text-slate-500 text-sm mt-2">Participants will leave with a clearer understanding of how to:</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {WHY_PARTICIPATE.map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
              <CheckCircle2 size={14} className="text-teal-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Registration Form ─────────────────────────────────────────────────────────
function RegistrationForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", job_title: "",
    professional_role: "", professional_role_other: "",
    school_name: "", city: "", country: "",
    school_type: "", school_size: "",
    workshop_1: false, workshop_2: false, workshop_3: false, workshop_4: false, full_series: false,
    areas_of_interest: [] as string[],
    school_support_challenge: "",
    interested_future_learning: false, interested_school_training: false,
    interested_assessment_services: false, interested_partner_school: false, training_only: false,
    marketing_consent: false,
    privacy_consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleFullSeries = (checked: boolean) => {
    setForm(f => ({ ...f, full_series: checked, workshop_1: checked, workshop_2: checked, workshop_3: checked, workshop_4: checked }));
  };
  const handleWorkshop = (num: number, checked: boolean) => {
    const key = `workshop_${num}` as any;
    setForm(f => ({ ...f, [key]: checked, full_series: checked ? f.full_series : false }));
  };
  const toggleInterest = (val: string) => {
    setForm(f => ({
      ...f,
      areas_of_interest: f.areas_of_interest.includes(val)
        ? f.areas_of_interest.filter(x => x !== val)
        : [...f.areas_of_interest, val],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.privacy_consent) { setError("Please accept the privacy consent to register."); return; }
    setLoading(true);
    setError(null);
    try {
      const source = getSourceFromUrl();
      const body = {
        first_name: form.first_name, last_name: form.last_name,
        email: form.email, job_title: form.job_title,
        professional_role: form.professional_role,
        professional_role_other: form.professional_role === "Other" ? form.professional_role_other : undefined,
        school_name: form.school_name, city: form.city, country: form.country,
        school_type: form.school_type, school_size: form.school_size,
        workshop_1_selected: form.workshop_1, workshop_2_selected: form.workshop_2,
        workshop_3_selected: form.workshop_3, workshop_4_selected: form.workshop_4,
        full_series_selected: form.full_series,
        areas_of_interest: form.areas_of_interest,
        school_support_challenge: form.school_support_challenge,
        interested_future_learning: form.interested_future_learning,
        interested_school_training: form.interested_school_training,
        interested_assessment_services: form.interested_assessment_services,
        interested_partner_school: form.interested_partner_school,
        training_only: form.training_only,
        marketing_consent: form.marketing_consent,
        privacy_consent: form.privacy_consent,
        registration_source: source,
      };
      const res = await fetch("/api/training/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Registration failed. Please try again.");
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-3">Registration</p>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">Register Free</h2>
          <p className="text-slate-500 text-sm">Please complete the short form below to reserve your place. Participation is complimentary.</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Personal Information */}
            <fieldset>
              <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Personal Information</legend>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <FormField label="First Name" required>
                  <input className={inputCls} value={form.first_name} onChange={e => set("first_name", e.target.value)} required />
                </FormField>
                <FormField label="Last Name" required>
                  <input className={inputCls} value={form.last_name} onChange={e => set("last_name", e.target.value)} required />
                </FormField>
              </div>
              <FormField label="Professional Email Address" required className="mb-4">
                <input type="email" className={inputCls} value={form.email} onChange={e => set("email", e.target.value)} required />
              </FormField>
              <FormField label="Job Title / Role" required className="mb-4">
                <input className={inputCls} value={form.job_title} onChange={e => set("job_title", e.target.value)} required />
              </FormField>
              <FormField label="School / Organisation" required className="mb-4">
                <input className={inputCls} value={form.school_name} onChange={e => set("school_name", e.target.value)} required />
              </FormField>
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField label="City" required>
                  <input className={inputCls} value={form.city} onChange={e => set("city", e.target.value)} required />
                </FormField>
                <FormField label="Country / Region" required>
                  <input className={inputCls} value={form.country} onChange={e => set("country", e.target.value)} required />
                </FormField>
              </div>
            </fieldset>

            <hr className="border-slate-100" />

            {/* Professional Role */}
            <fieldset>
              <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Professional Role</legend>
              <FormField label="Your Primary Role" required>
                <select className={inputCls} value={form.professional_role} onChange={e => set("professional_role", e.target.value)} required>
                  <option value="">Select your role…</option>
                  {PROFESSIONAL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </FormField>
              {form.professional_role === "Other" && (
                <FormField label="Please specify your role" className="mt-3">
                  <input className={inputCls} value={form.professional_role_other} onChange={e => set("professional_role_other", e.target.value)} />
                </FormField>
              )}
            </fieldset>

            <hr className="border-slate-100" />

            {/* School Information */}
            <fieldset>
              <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">School Information</legend>
              <FormField label="School Type" className="mb-4">
                <select className={inputCls} value={form.school_type} onChange={e => set("school_type", e.target.value)}>
                  <option value="">Select school type…</option>
                  {SCHOOL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Approximate Number of Students">
                <select className={inputCls} value={form.school_size} onChange={e => set("school_size", e.target.value)}>
                  <option value="">Select…</option>
                  {SCHOOL_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            </fieldset>

            <hr className="border-slate-100" />

            {/* Workshop Selection */}
            <fieldset>
              <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Workshop Selection</legend>
              <p className="text-xs text-slate-400 mb-4">Select the workshops you wish to attend. You are welcome to register for all four.</p>
              <div className="space-y-2.5">
                <label className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl cursor-pointer hover:bg-indigo-100/70 transition-colors">
                  <input type="checkbox" className="mt-0.5 accent-indigo-600" checked={form.full_series} onChange={e => handleFullSeries(e.target.checked)} />
                  <div>
                    <p className="text-sm font-semibold text-indigo-800">Register me for the complete 4-part series</p>
                    <p className="text-xs text-indigo-600 mt-0.5">Automatically selects all four workshops below</p>
                  </div>
                </label>
                {WORKSHOPS.map(w => (
                  <label key={w.num} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-slate-700"
                      checked={(form as any)[`workshop_${w.num}`]}
                      onChange={e => handleWorkshop(w.num, e.target.checked)}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">Workshop {w.num} — {w.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{w.subtitle}</p>
                      <p className="text-xs text-teal-600 font-medium mt-1 flex items-center gap-1">
                        <Calendar size={10} /> {w.date}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>

            <hr className="border-slate-100" />

            {/* Areas of Interest */}
            <fieldset>
              <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Areas of Interest</legend>
              <div className="flex flex-wrap gap-2">
                {AREAS_OF_INTEREST.map(a => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleInterest(a)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                      form.areas_of_interest.includes(a)
                        ? "bg-teal-600 border-teal-600 text-white"
                        : "bg-white border-slate-200 text-slate-600 hover:border-teal-400"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </fieldset>

            <hr className="border-slate-100" />

            {/* Open-ended question */}
            <fieldset>
              <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">School Needs</legend>
              <FormField label="What is one of the biggest challenges your school currently faces in supporting students who require more than ordinary classroom intervention?" hint="Optional">
                <textarea
                  rows={4}
                  className={`${inputCls} resize-none`}
                  value={form.school_support_challenge}
                  onChange={e => set("school_support_challenge", e.target.value)}
                />
              </FormField>
            </fieldset>

            <hr className="border-slate-100" />

            {/* Future interest */}
            <fieldset>
              <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Future Interest</legend>
              <div className="space-y-2.5">
                {FUTURE_INTERESTS.map(fi => (
                  <label key={fi.key} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-0.5 accent-teal-600"
                      checked={(form as any)[fi.key]}
                      onChange={e => set(fi.key, e.target.checked)}
                    />
                    <p className="text-sm text-slate-700 leading-relaxed">{fi.label}</p>
                  </label>
                ))}
              </div>
            </fieldset>

            <hr className="border-slate-100" />

            {/* Consent */}
            <fieldset>
              <legend className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Consent</legend>
              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <input type="checkbox" className="mt-0.5 accent-teal-600" checked={form.marketing_consent} onChange={e => set("marketing_consent", e.target.checked)} />
                  <div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Yes, I would like to receive occasional emails from ReMynd Student Services about future professional learning opportunities, educational resources, assessment services, and relevant programmes.
                    </p>
                    <p className="text-xs text-slate-400 mt-1">You can unsubscribe at any time.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" className="mt-0.5 accent-slate-800" checked={form.privacy_consent} onChange={e => set("privacy_consent", e.target.checked)} required />
                  <p className="text-sm text-slate-800 leading-relaxed">
                    <span className="text-red-500 font-bold">*</span>{" "}
                    I agree to the collection and use of my information for registration and administration of this professional learning series, in accordance with ReMynd's Privacy Policy.
                  </p>
                </label>
              </div>
            </fieldset>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0c1a2e] hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl text-sm tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing…</> : "REGISTER FREE"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

// ── Success ───────────────────────────────────────────────────────────────────
function SuccessScreen({ onBack }: { onBack: () => void }) {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-xl mx-auto px-6 text-center">
        <div className="w-16 h-16 bg-teal-100 border border-teal-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={28} className="text-teal-600" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-3">Thank You — You're Registered!</h2>
        <p className="text-slate-600 leading-relaxed mb-5 text-base">
          Thank you for registering for the ReMynd Assessment System Training Series. We're delighted to have you join educators and student-support professionals exploring how schools can move from student concern toward deeper educational understanding and more effective support.
        </p>
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-6 py-4 mb-8 text-sm text-teal-800 leading-relaxed">
          You will receive a confirmation email shortly. Final workshop dates, joining instructions, and programme details will be sent to your registered email address.
        </div>
        <p className="text-xs text-slate-400 italic mb-8">Understand First. See the Whole Learner. Act on Understanding. Support Growth.</p>
        <button onClick={onBack} className="inline-flex items-center gap-2 bg-[#0c1a2e] text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-slate-800 transition-colors">
          BACK TO REMYND
        </button>
      </div>
    </section>
  );
}

// ── Bring to My School ────────────────────────────────────────────────────────
function BringToMySchool({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    contact_name: "", contact_email: "", role: "", school_name: "",
    country: "", school_size: "", preferred_contact: "", message: "", consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.consent) { setError("Please confirm your consent to be contacted."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/training/school-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Submission failed. Please try again.");
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message ?? "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-[#0c1a2e]">
      <div className="max-w-xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-teal-400 uppercase tracking-widest mb-3">School Enquiry</p>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Bring This Series to My School</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Interested in arranging a dedicated session of this professional learning series for your school team? Fill in the form below and a member of the ReMynd team will be in touch.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Name" labelCls="text-slate-300" required>
                <input className={inputDarkCls} value={form.contact_name} onChange={e => set("contact_name", e.target.value)} required />
              </FormField>
              <FormField label="Email" labelCls="text-slate-300" required>
                <input type="email" className={inputDarkCls} value={form.contact_email} onChange={e => set("contact_email", e.target.value)} required />
              </FormField>
            </div>
            <FormField label="Your Role" labelCls="text-slate-300">
              <input className={inputDarkCls} value={form.role} onChange={e => set("role", e.target.value)} />
            </FormField>
            <FormField label="School" labelCls="text-slate-300">
              <input className={inputDarkCls} value={form.school_name} onChange={e => set("school_name", e.target.value)} />
            </FormField>
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField label="Country" labelCls="text-slate-300">
                <input className={inputDarkCls} value={form.country} onChange={e => set("country", e.target.value)} />
              </FormField>
              <FormField label="Approximate School Size" labelCls="text-slate-300">
                <select className={inputDarkCls} value={form.school_size} onChange={e => set("school_size", e.target.value)}>
                  <option value="">Select…</option>
                  {SCHOOL_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </FormField>
            </div>
            <FormField label="Preferred Contact Method" labelCls="text-slate-300">
              <select className={inputDarkCls} value={form.preferred_contact} onChange={e => set("preferred_contact", e.target.value)}>
                <option value="">Select…</option>
                {["Email", "WeChat", "WhatsApp", "Phone"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </FormField>
            <FormField label="Brief Message" labelCls="text-slate-300">
              <textarea rows={3} className={`${inputDarkCls} resize-none`} value={form.message} onChange={e => set("message", e.target.value)} />
            </FormField>
            <label className="flex items-start gap-3 cursor-pointer pt-1">
              <input type="checkbox" className="mt-0.5 accent-teal-400" checked={form.consent} onChange={e => set("consent", e.target.checked)} />
              <p className="text-sm text-slate-300 leading-relaxed">
                I would like ReMynd to contact me about arranging this professional learning series for my school.
              </p>
            </label>
            {error && <p className="text-red-400 text-sm bg-red-900/20 border border-red-900/30 rounded-lg px-4 py-3">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-3.5 rounded-xl text-sm tracking-wide transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending…</> : "SEND ENQUIRY"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function SchoolInquirySuccess() {
  return (
    <section className="py-20 bg-[#0c1a2e] text-center">
      <div className="max-w-md mx-auto px-6">
        <div className="w-14 h-14 bg-teal-500/20 border border-teal-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={24} className="text-teal-400" />
        </div>
        <h3 className="text-xl font-bold text-white mb-3">Thank You — We'll Be in Touch</h3>
        <p className="text-slate-400 text-sm leading-relaxed">
          Your school enquiry has been received. A member of the ReMynd team will contact you shortly to discuss arranging the series for your school.
        </p>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────
function Footer({ onRegister }: { onRegister: () => void }) {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-6 h-6 object-contain" />
          </div>
          <span className="font-bold text-base tracking-tight">ReMynd Student Services</span>
        </div>
        <p className="text-xs text-slate-400 italic mb-6">Understand First. See the Whole Learner. Act on Understanding. Support Growth.</p>
        <button onClick={onRegister} className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-bold px-6 py-3 rounded-xl text-sm tracking-wide transition-colors mb-8">
          REGISTER FREE — September–October 2026
        </button>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} ReMynd Student Services. All rights reserved. ·{" "}
          <a href="/" className="hover:text-slate-300 underline underline-offset-2">remyndassessments.com</a>
        </p>
      </div>
    </footer>
  );
}

// ── Shared UI helpers ─────────────────────────────────────────────────────────
const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-shadow";
const inputDarkCls = "w-full bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition-shadow";

function FormField({ label, children, className = "", required = false, hint, labelCls = "text-slate-600" }: {
  label: string; children: React.ReactNode; className?: string; required?: boolean; hint?: string; labelCls?: string;
}) {
  return (
    <div className={className}>
      <label className={`block text-xs font-semibold mb-1.5 ${labelCls}`}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && <span className="font-normal text-slate-400 ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
