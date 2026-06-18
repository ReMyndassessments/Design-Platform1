import { Link } from "wouter";
import { LanguageSwitcherLight } from "@/lib/i18n";
import {
  Eye, Users, Lightbulb, GitBranch, CheckCircle2, ArrowRight,
  Star, Building2, ChevronRight, Award,
} from "lucide-react";

const WHY_CARDS = [
  {
    icon: Eye,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-100",
    title: "Early Identification",
    desc: "Identify concerns before they become significant barriers to learning, wellbeing, or school success.",
  },
  {
    icon: Users,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-100",
    title: "Multi-Informant Insight",
    desc: "Combine information from parents, teachers, students, school records, and behavioural observations.",
  },
  {
    icon: Lightbulb,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-100",
    title: "Practical Support Planning",
    desc: "Transform assessment findings into actionable recommendations educators can implement immediately.",
  },
  {
    icon: GitBranch,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-100",
    title: "Clear Referral Decisions",
    desc: "Help schools determine whether students require monitoring, intervention, learning support, or comprehensive assessment.",
  },
];

const TIER2 = [
  {
    title: "Digital Distraction & Focus Assessment",
    price: "4,800",
    desc: "Examines attention regulation, executive functioning, focus management, emotional wellbeing, and the impact of digital habits on learning.",
    bestFor: ["Screen overuse concerns", "Attention difficulties", "Homework struggles", "Focus and productivity issues"],
  },
  {
    title: "Boarding Student Adjustment & Wellbeing Assessment",
    price: "5,500",
    desc: "Evaluates emotional wellbeing, resilience, stress, homesickness, social connectedness, and adaptation to boarding life.",
    bestFor: ["Boarding schools", "International students", "Welfare reviews", "New boarders"],
  },
  {
    title: "Focused Student Support Assessment",
    price: "6,500",
    desc: "A targeted assessment examining behavioural, emotional, executive functioning, and school adjustment concerns. Provides practical recommendations without requiring a full psychoeducational evaluation.",
    bestFor: ["Teacher concerns", "Behaviour referrals", "Student support meetings", "MTSS Tier 2 decisions"],
  },
];

const TIER3 = [
  {
    title: "Underachievement Profile",
    price: "7,000",
    desc: "Investigates why capable students perform below expectations by examining executive functioning, motivation, emotional wellbeing, attention, and academic persistence.",
    bestFor: ["Bright underperformers", "Motivation concerns", "Unexpected academic decline"],
  },
  {
    title: "Hidden Struggler Assessment",
    price: "8,000",
    desc: "Designed for students whose difficulties are frequently overlooked because they are academically capable, compliant, or masking significant challenges.",
    bestFor: ["High-achieving students", "Twice-exceptional learners", "Masked ADHD", "Masked Autism", "Internalising difficulties"],
  },
  {
    title: "Learning Support Decision System",
    price: "9,000",
    desc: "A specialised learning support assessment designed to identify learning differences, literacy risks, executive functioning difficulties, and academic barriers requiring SEN intervention.",
    bestFor: ["Dyslexia concerns", "Reading difficulties", "SEN referrals", "Learning support planning"],
  },
];

const PARENT_SERVICES = [
  {
    title: "Why Is My Child Struggling?",
    price: "5,500",
    desc: "A parent-friendly assessment designed to identify the most likely reasons a child is struggling academically, behaviourally, emotionally, or socially.",
  },
  {
    title: "Executive Function Coaching Assessment",
    price: "4,800",
    desc: "Examines planning, organisation, working memory, task initiation, self-monitoring, and emotional self-regulation.",
  },
  {
    title: "Emotional Wellbeing Check",
    price: "3,800",
    desc: "Screens for anxiety, mood, stress, self-esteem, emotional regulation, and psychological wellbeing.",
  },
  {
    title: "School Readiness & Transition Assessment",
    price: "4,500",
    desc: "Evaluates developmental readiness, self-regulation, independence, social skills, emotional preparedness, and school transition factors.",
  },
];

const PROCESS_STEPS = [
  { n: 1, label: "Referral", desc: "School or parent submits a structured referral" },
  { n: 2, label: "Intake Review", desc: "Background history and presenting concerns gathered" },
  { n: 3, label: "Assessment Setup", desc: "Forms dispatched to parents, teachers, and student" },
  { n: 4, label: "Multi-Informant Data Collection", desc: "Digital rating scales completed by all informants" },
  { n: 5, label: "Scoring & Interpretation", desc: "Standardised scoring across all instruments" },
  { n: 6, label: "Educational Profile & Support Plan", desc: "Comprehensive written profile produced" },
  { n: 7, label: "Debrief Meeting", desc: "Findings shared with school and family" },
  { n: 8, label: "Support & Next Steps", desc: "Intervention priorities and monitoring plan agreed" },
];

const PARTNER_BENEFITS = [
  "Streamlined referral pathways",
  "Priority assessment scheduling",
  "Consultation services",
  "Staff training",
  "School Clinical Coordinator certification",
  "Ongoing student monitoring",
  "Support planning tools",
  "Access to the ReMynd Assessment Operating System",
];

const FLAGSHIP_DELIVERABLES = [
  "Comprehensive Educational Profile",
  "Individualised Support Plan",
  "Teacher Recommendations",
  "Parent Recommendations",
  "Classroom Accommodations",
  "Intervention Priorities",
  "Debrief Meeting",
];

const FLAGSHIP_QUESTIONS = [
  "Why is the student struggling?",
  "Does the student require learning support?",
  "Are executive functioning difficulties present?",
  "Are attention concerns affecting performance?",
  "Are emotional factors contributing?",
  "What accommodations should be considered?",
  "What interventions should be prioritised?",
];

function PriceTag({ price }: { price: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-extrabold text-slate-900">{price}</span>
      <span className="text-sm font-semibold text-slate-500">RMB</span>
    </div>
  );
}

function BestForList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-3">
      {items.map(item => (
        <span key={item} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
          {item}
        </span>
      ))}
    </div>
  );
}

export default function AssessmentServicesPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── NAV ── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <img src="/images/remynd-logo.png" alt="ReMynd" className="h-9 w-9 object-contain" />
              <div className="leading-none">
                <p className="text-sm font-extrabold text-slate-900 tracking-tight">ReMynd</p>
                <p className="text-[10px] font-medium text-slate-500 tracking-wide">Student Services</p>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcherLight />
            <Link href="/portal?tab=school">
              <button className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors">
                Refer a Student
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0a1628 55%, #0e2040 100%)" }}
      >
        <div className="absolute top-0 left-0 w-[600px] h-[400px] bg-blue-700/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-indigo-900/15 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-7">
            <Award size={12} className="text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300">2026–2027 School Year Pricing</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-5">
            ReMynd Student Support<br />
            <span className="text-blue-300">Assessment Services</span>
          </h1>
          <p className="text-base md:text-lg text-blue-200 font-medium mb-8 max-w-2xl mx-auto leading-relaxed">
            Comprehensive Assessment, Early Identification & Practical Support Planning<br className="hidden md:block" /> for International Schools
          </p>

          <div className="max-w-3xl mx-auto bg-white/[0.06] border border-white/10 rounded-2xl px-8 py-7 text-left space-y-3 mb-10">
            <p className="text-xl md:text-2xl font-bold text-white text-center mb-4">
              Helping Schools Move From Concern to Coordinated Support
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              Every school has students who struggle academically, emotionally, socially, behaviourally, or organisationally.
              The challenge is not simply recognising that a student is struggling.
            </p>
            <p className="text-slate-300 text-sm leading-relaxed font-semibold">
              The challenge is understanding <em>why</em>.
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              ReMynd Student Services provides structured assessment and decision-support services that help schools identify underlying barriers to learning, wellbeing, behaviour, and school success — then translate findings into practical support plans educators can implement immediately.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/portal?tab=school">
              <button className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-900/40">
                Refer a Student <ArrowRight size={16} />
              </button>
            </Link>
            <Link href="/portal?tab=parent">
              <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors">
                Parent Enquiry <ChevronRight size={16} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: WHY SCHOOLS ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Section 1</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Why Schools Use ReMynd Assessments</h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">Four pillars that make ReMynd assessments the choice for international schools.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {WHY_CARDS.map(card => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${card.bg}`}>
                    <Icon size={20} className={card.color} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-2">{card.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: ASSESSMENT FRAMEWORK ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Section 2</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">ReMynd Assessment Framework</h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">A four-tier structure designed to match the level of assessment to the level of concern.</p>
          </div>

          {/* Tier 1 */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2 bg-sky-100 border border-sky-200 rounded-full px-4 py-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-700">Tier 1</span>
              </div>
              <p className="text-sm font-semibold text-slate-700">Screening & Early Identification</p>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-7">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">School Wellbeing & Learning Snapshot</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">
                    Provides a broad picture of student wellbeing, resilience, emotional health, school engagement, and learning readiness.
                  </p>
                  <BestForList items={["Wellbeing screening", "Student reviews", "School transitions", "MTSS Tier 1", "Early identification"]} />
                </div>
                <div className="md:text-right flex-shrink-0">
                  <PriceTag price="4,500" />
                  <p className="text-[10px] text-slate-400 mt-1">per student</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tier 2 */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2 bg-violet-100 border border-violet-200 rounded-full px-4 py-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-700">Tier 2</span>
              </div>
              <p className="text-sm font-semibold text-slate-700">Focused Assessment & Intervention Planning</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TIER2.map(item => (
                <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <PriceTag price={item.price} />
                  <h3 className="font-bold text-slate-800 text-sm mt-3 mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed flex-1">{item.desc}</p>
                  <BestForList items={item.bestFor} />
                </div>
              ))}
            </div>
          </div>

          {/* Tier 3 */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2 bg-amber-100 border border-amber-200 rounded-full px-4 py-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Tier 3</span>
              </div>
              <p className="text-sm font-semibold text-slate-700">Learning & Specialised Student Profiles</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {TIER3.map(item => (
                <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <PriceTag price={item.price} />
                  <h3 className="font-bold text-slate-800 text-sm mt-3 mb-2">{item.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed flex-1">{item.desc}</p>
                  <BestForList items={item.bestFor} />
                </div>
              ))}
            </div>
          </div>

          {/* Tier 4 — Flagship */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full px-4 py-1">
                <Star size={10} className="text-amber-400 fill-amber-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white">Tier 4</span>
              </div>
              <p className="text-sm font-semibold text-slate-700">Flagship Comprehensive Assessment</p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-300 shadow-xl shadow-indigo-100"
              style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0e2040 60%, #0a1628 100%)" }}
            >
              <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[200px] bg-indigo-900/20 rounded-full blur-[60px]" />

              <div className="relative z-10 p-8 md:p-10">
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-amber-400 text-amber-900 px-3 py-1 rounded-full">
                    <Star size={9} className="fill-amber-900" /> Most Comprehensive
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white border border-white/20 px-3 py-1 rounded-full">
                    Most Popular School Referral
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full">
                    2026–2027 Flagship Assessment
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-3xl font-extrabold text-white">16,500</span>
                      <span className="text-base font-semibold text-blue-300">RMB</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-white mb-3 leading-snug">
                      Comprehensive Psychoeducational Profile & Support Plan
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                      ReMynd's flagship assessment service. A comprehensive educational evaluation examining academic, behavioural, emotional, executive functioning, social, and learning factors affecting student performance and wellbeing.
                    </p>
                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Information Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {["Parents", "Teachers", "Students", "School Records", "Behaviour Observations", "Standardised Tools"].map(s => (
                          <span key={s} className="text-[11px] bg-white/10 border border-white/15 text-slate-300 px-2.5 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Key Questions Answered</p>
                      <ul className="space-y-1.5">
                        {FLAGSHIP_QUESTIONS.map(q => (
                          <li key={q} className="flex items-start gap-2 text-xs text-slate-300">
                            <ChevronRight size={12} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Deliverables</p>
                      <ul className="space-y-1.5">
                        {FLAGSHIP_DELIVERABLES.map(d => (
                          <li key={d} className="flex items-center gap-2 text-xs text-white">
                            <CheckCircle2 size={12} className="text-emerald-400 flex-shrink-0" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                  <Link href="/portal?tab=school">
                    <button className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm px-8 py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-900/50">
                      Refer a Student for Comprehensive Assessment <ArrowRight size={16} />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: PARENT SERVICES ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-teal-500 mb-3">Section 3</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Parent Assessment Services</h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Schools may also refer families directly to ReMynd for independent parent-requested assessment services.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PARENT_SERVICES.map(item => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <PriceTag price={item.price} />
                <h3 className="font-bold text-slate-800 text-sm mt-3 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed flex-1">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/portal?tab=parent">
              <button className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-7 py-3 rounded-xl transition-colors">
                Make a Parent Enquiry <ArrowRight size={15} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: PROCESS ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Section 4</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Assessment Process</h2>
            <p className="text-slate-500 text-sm">A structured, transparent process from first contact to ongoing support.</p>
          </div>

          {/* Mobile: vertical list / Desktop: two-row timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PROCESS_STEPS.map((step, idx) => (
              <div key={step.n} className="relative">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 h-full hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{step.n}</span>
                    </div>
                    {idx < PROCESS_STEPS.length - 1 && (
                      <div className="hidden lg:block absolute top-9 right-0 w-4 h-0.5 bg-slate-200 translate-x-full z-10" />
                    )}
                  </div>
                  <p className="font-bold text-slate-800 text-sm mb-1">{step.label}</p>
                  <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: PARTNER SCHOOLS ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-4">Section 5</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Bring Assessment Excellence In-House</h2>
              <p className="text-slate-500 text-sm mb-7">
                Schools seeking a long-term assessment and student support solution may apply to become a ReMynd Partner School.
              </p>
              <p className="text-sm font-semibold text-slate-700 mb-4">Partner Schools may access:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 mb-8">
                {PARTNER_BENEFITS.map(b => (
                  <li key={b} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={14} className="text-purple-500 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href="/partner-schools">
                <button className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-7 py-3 rounded-xl transition-colors">
                  <Building2 size={15} /> Learn About Partner Schools
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: PRICING TRANSPARENCY ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Section 6</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">2026–2027 Assessment Pricing</h2>
            <p className="text-slate-500 text-sm mb-8">All pricing shown reflects the 2026–2027 academic year.</p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-left">
              <p className="text-sm font-semibold text-slate-700 mb-4">Assessment pricing includes:</p>
              <ul className="space-y-3">
                {[
                  "Assessment administration",
                  "Multi-informant data collection",
                  "Professional scoring and interpretation",
                  "Educational profile generation",
                  "Support recommendations",
                  "Debrief meeting",
                  "Practical intervention guidance",
                ].map(item => (
                  <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section
        className="py-20 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0a1628 55%, #0e2040 100%)" }}
      >
        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-blue-700/10 rounded-full blur-[100px]" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">Ready to Discuss Assessment Support for Your School?</h2>
          <p className="text-slate-400 text-sm mb-10 max-w-lg mx-auto">Connect with our team to explore the right assessment pathway for your students.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/portal?tab=school">
              <button className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors">
                Submit a School Referral <ArrowRight size={15} />
              </button>
            </Link>
            <Link href="/portal?tab=parent">
              <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors">
                Make a Parent Enquiry <ChevronRight size={15} />
              </button>
            </Link>
            <Link href="/partner-schools">
              <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors">
                Explore Partner Schools <ChevronRight size={15} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE NOTE ── */}
      <footer className="bg-slate-900 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-slate-500 text-xs leading-relaxed max-w-2xl mx-auto">
            ReMynd assessments are designed to support educational planning, intervention decision-making, and school-based support services.
            These assessments are not medical or clinical diagnostic evaluations. Where diagnosis is required, families may be advised to seek assessment
            from an appropriately licensed medical or clinical professional.
          </p>
          <p className="text-slate-700 text-[11px] mt-4">
            © {new Date().getFullYear()} ReMynd Student Services · Confidential
          </p>
        </div>
      </footer>

    </div>
  );
}
