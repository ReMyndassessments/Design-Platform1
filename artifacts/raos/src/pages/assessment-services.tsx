import { useState } from "react";
import { Link } from "wouter";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";
import {
  Eye, Users, Award, Lightbulb, GitBranch, TrendingUp,
  ArrowRight, ChevronRight, CheckCircle2, X, Clock,
  UserCheck, Target, Zap, DollarSign, Package, Info,
  Sun, Building2, Star, Sparkles, BookOpen, Brain,
  BarChart3, AlertCircle, GraduationCap, Briefcase, Baby,
} from "lucide-react";
import { ASSESSMENT_OVERVIEWS, type AssessmentOverview } from "@/data/assessment-overviews";
import type { Lang } from "@/lib/i18n";

// ─── Product catalogue (local, English-first) ──────────────────────────────

type ProductEntry = {
  title: string;
  badge?: string;
  desc: string;
  eduQuestion?: string;
  bestFor: string[];
  price?: string;        // passed to drawer only — never shown on card
  cta: "school" | "parent" | "enquiry";
};

type Category = {
  id: string;
  label: string;
  icon: React.ElementType;
  accentClass: string;   // border/bg accent classes
  dotClass: string;      // coloured dot
  products: ProductEntry[];
};

const CATEGORIES: Category[] = [
  {
    id: "comprehensive",
    label: "Comprehensive & School Pathways",
    icon: BarChart3,
    accentClass: "border-indigo-200 bg-indigo-50",
    dotClass: "bg-indigo-600",
    products: [
      {
        title: "Comprehensive Psychoeducational Profile & Support Plan",
        badge: "Flagship Assessment",
        desc: "ReMynd's most comprehensive educational assessment. Examines academic, behavioural, emotional, executive-functioning, social, and learning factors affecting student performance and wellbeing.",
        eduQuestion: "Why is this student struggling, and what comprehensive support does this require?",
        bestFor: ["Multi-domain concerns", "Complex or unclear difficulties", "Significant educational decisions", "Previous inconclusive assessments", "Comprehensive support planning"],
        price: "16,500",
        cta: "school",
      },
      {
        title: "School Wellbeing & Learning Snapshot",
        desc: "Provides a broad initial picture of student wellbeing, resilience, emotional health, school engagement, and learning readiness. Suitable for whole year-group screening or individual review.",
        eduQuestion: "Is there sufficient concern to warrant additional support or investigation?",
        bestFor: ["Early identification", "Student reviews", "School transitions", "Tier 1 / MTSS screening", "Emerging concerns"],
        price: "4,500",
        cta: "school",
      },
      {
        title: "Focused Student Support Assessment",
        desc: "A targeted assessment examining behavioural, emotional, executive-functioning, and school-adjustment concerns without automatically requiring a full comprehensive assessment.",
        eduQuestion: "What focused support does this student need now?",
        bestFor: ["Teacher concerns", "Behaviour referrals", "Student-support meetings", "Tier 2 decisions", "Defined areas of concern"],
        price: "6,500",
        cta: "school",
      },
      {
        title: "Learning Support Decision System",
        desc: "A specialised learning-support assessment designed to identify learning differences, literacy risks, executive-functioning difficulties, and academic barriers requiring SEN or additional learning-support intervention.",
        eduQuestion: "Does this student require additional learning support, and what should that support address?",
        bestFor: ["SEN referrals", "Literacy concerns", "Reading difficulty", "Learning-support decisions", "Intervention planning"],
        price: "9,000",
        cta: "school",
      },
      {
        title: "Boarding Student Adjustment & Wellbeing Assessment",
        desc: "Evaluates emotional wellbeing, resilience, stress, homesickness, social connectedness, adaptation, and functioning within boarding-school life.",
        bestFor: ["New boarders", "International students", "Welfare reviews", "Adjustment concerns", "Boarding pastoral support"],
        price: "5,500",
        cta: "school",
      },
    ],
  },
  {
    id: "underachievement",
    label: "Underachievement, Executive Function & Hidden Difficulty",
    icon: Brain,
    accentClass: "border-violet-200 bg-violet-50",
    dotClass: "bg-violet-600",
    products: [
      {
        title: "Underachievement Profile",
        badge: "When Ability and Performance Don't Match",
        desc: "Investigates why capable students may perform below expectations by examining executive functioning, motivation, emotional wellbeing, attention, and academic persistence.",
        eduQuestion: "Why is this capable student performing below their potential?",
        bestFor: ["Bright underperformers", "Unexpected grade decline", "Strong verbal ability with weak written output", "Pre-GCSE / IB / A Level review"],
        price: "7,000",
        cta: "school",
      },
      {
        title: "Executive Function Coaching Assessment",
        desc: "A targeted assessment examining planning, organisation, working memory, task initiation, time management, self-monitoring, and emotional self-regulation. Produces practical strategies for student, parent, and teacher.",
        eduQuestion: "Which executive-function difficulties are interfering with successful independent learning, and what practical support will help?",
        bestFor: ["Organisation difficulties", "Task initiation", "Working memory concerns", "Time management", "Self-regulation challenges"],
        price: "4,800",
        cta: "school",
      },
      {
        title: "Hidden Struggler Assessment",
        badge: "When a Student Appears Fine — But Isn't",
        desc: "Designed for students whose difficulties are frequently overlooked because they are academically capable, compliant, high-achieving, or masking significant hidden support needs.",
        eduQuestion: "Is this student's apparent success concealing significant difficulty, and what support does that require?",
        bestFor: ["High-achieving students", "Twice-exceptional learners", "Masked attention difficulties", "Internalising difficulties", "Students whose success requires disproportionate effort"],
        price: "8,000",
        cta: "school",
      },
      {
        title: "Digital Distraction & Focus Assessment",
        desc: "Examines attention regulation, executive functioning, focus management, emotional wellbeing, and the impact of digital habits on learning and productivity.",
        bestFor: ["Screen-use concerns", "Focus difficulties", "Homework struggles", "Productivity concerns", "Task switching / self-management issues"],
        price: "4,800",
        cta: "school",
      },
    ],
  },
  {
    id: "academic",
    label: "Academic & Learning Assessments",
    icon: BookOpen,
    accentClass: "border-sky-200 bg-sky-50",
    dotClass: "bg-sky-600",
    products: [
      {
        title: "ReMynd Academic English Performance Assessment",
        desc: "A curriculum-connected academic-language assessment evaluating whether a student can access, process, express, and demonstrate learning through English across the curriculum. Conversational English is not the same as Academic English.",
        eduQuestion: "Is an academic-language barrier preventing this student from demonstrating their actual ability?",
        bestFor: ["EAL / ESL students", "Academic-language concerns", "English-medium international schools", "Distinguishing language-access barriers from broader learning difficulty"],
        price: "5,800",
        cta: "school",
      },
      {
        title: "ReMynd Authentic Mathematical Reasoning Interview",
        desc: "A structured mathematical reasoning interview using authentic student work as the starting point. Explores conceptual understanding, strategy awareness, procedural reasoning, error awareness, mathematical language, and transfer. Provides natural opportunities to observe productive-struggle responses.",
        eduQuestion: "What does this student actually understand about mathematics, beneath the surface of their formal performance?",
        bestFor: ["Mathematical reasoning difficulty", "Work-sample analysis", "Learning-support planning", "Mathematics IEP goals", "Assessment anxiety"],
        price: "8,500",
        cta: "school",
      },
    ],
  },
  {
    id: "parent",
    label: "Parent Assessment Services",
    icon: Users,
    accentClass: "border-teal-200 bg-teal-50",
    dotClass: "bg-teal-600",
    products: [
      {
        title: "Why Is My Child Struggling?",
        desc: "A parent-friendly educational assessment designed to identify the most likely factors contributing to a child's academic, behavioural, emotional, organisational, or social difficulties.",
        eduQuestion: "Something isn't right — what may be happening, and what should we do next?",
        bestFor: ["General academic concern", "Behavioural change", "Emotional difficulties", "Social challenges", "Parent-initiated assessment"],
        price: "5,500",
        cta: "parent",
      },
      {
        title: "Executive Function Coaching Assessment",
        desc: "Examines planning, organisation, working memory, task initiation, time management, self-monitoring, and emotional self-regulation — producing practical strategies for student, parent, and teacher.",
        bestFor: ["Organisation difficulties", "Homework management", "Time management", "Self-regulation at home and school"],
        price: "4,800",
        cta: "parent",
      },
      {
        title: "Emotional Wellbeing Check",
        desc: "Screens educationally relevant patterns involving anxiety, mood, stress, self-esteem, emotional regulation, and psychological wellbeing. This is an educational wellbeing assessment and does not diagnose a mental-health condition.",
        bestFor: ["Anxiety concerns", "Mood changes", "Stress and self-esteem", "Emotional regulation difficulties"],
        price: "3,800",
        cta: "parent",
      },
      {
        title: "School Readiness & Transition Assessment",
        desc: "Evaluates developmental readiness, self-regulation, independence, social skills, emotional preparedness, and transition factors relevant to successful school participation.",
        bestFor: ["School entry", "Significant school transitions", "Readiness concerns", "Changes in educational environment"],
        price: "4,500",
        cta: "parent",
      },
    ],
  },
  {
    id: "developmental",
    label: "Developmental Assessment",
    icon: Baby,
    accentClass: "border-emerald-200 bg-emerald-50",
    dotClass: "bg-emerald-600",
    products: [
      {
        title: "ReMynd Child Development Profile (CDP)",
        desc: "A whole-child developmental educational profile examining cognition and learning, self-regulation and executive function, social interaction and social awareness, and communication and interaction. Identifies developmental strengths, emerging capabilities, support needs, and functional educational priorities.",
        eduQuestion: "How is this child developing across the areas most important for learning, independence, communication, and participation?",
        bestFor: ["Early developmental concerns", "Social communication development", "Self-regulation readiness", "Whole-child educational planning"],
        cta: "school",
      },
    ],
  },
  {
    id: "university",
    label: "University Student Assessment Services",
    icon: GraduationCap,
    accentClass: "border-blue-200 bg-blue-50",
    dotClass: "bg-blue-700",
    products: [
      {
        title: "International Student Adjustment Assessment",
        desc: "Designed to understand how students are adapting to the academic, linguistic, social, emotional, cultural, and independent-living demands of university study in a new environment.",
        bestFor: ["International university students", "Transition difficulties", "Academic adjustment", "Social connectedness concerns", "Wellbeing and support planning"],
        cta: "enquiry",
      },
      {
        title: "Academic Risk Early Warning System",
        desc: "Designed to identify patterns that may place a university student at increased risk of academic difficulty before significant failure occurs. Emphasises early identification before crisis.",
        eduQuestion: "Are there identifiable early-warning patterns that indicate this student may need academic or wellbeing support?",
        bestFor: ["Early academic concern", "Engagement patterns", "Self-management difficulty", "Wellbeing and functioning", "Proactive support planning"],
        cta: "enquiry",
      },
    ],
  },
  {
    id: "corporate",
    label: "Corporate & Early-Career Assessment",
    icon: Briefcase,
    accentClass: "border-slate-200 bg-slate-50",
    dotClass: "bg-slate-700",
    products: [
      {
        title: "Employee Wellbeing & Burnout Screen",
        desc: "A structured workplace screening service designed to identify patterns of wellbeing concern and potential burnout risk and support appropriate organisational response. Uses appropriate adult and workplace language.",
        bestFor: ["Workplace wellbeing programmes", "Burnout risk identification", "Organisational support planning", "Staff welfare review"],
        cta: "enquiry",
      },
      {
        title: "Leadership / High-Performer Profiling",
        desc: "Designed to help understand strengths, performance characteristics, working patterns, and development and support needs among leaders and high-performing professionals.",
        bestFor: ["Leadership development", "High-performer support", "Strengths-based profiling", "Executive coaching context"],
        cta: "enquiry",
      },
      {
        title: "Graduate / Intern Readiness Assessment",
        desc: "Designed to support the transition from education into professional environments by examining readiness factors relevant to early-career functioning.",
        bestFor: ["Graduate programmes", "Intern onboarding", "Early-career development", "Transition readiness"],
        cta: "enquiry",
      },
    ],
  },
];

// ─── PS Domains ────────────────────────────────────────────────────────────

const PS_FLOW = [
  "Challenge", "Engagement", "Strategy", "Persistence",
  "Support", "Recovery", "Growth",
];

const PS_DOMAINS = [
  "Challenge Engagement", "Frustration Tolerance", "Productive Persistence",
  "Strategy Generation", "Strategy Flexibility", "Response to Errors",
  "Metacognitive Awareness", "Help-Seeking", "Response to Scaffolding",
  "Recovery & Re-engagement",
];

const SUPPORT_LEVELS = [
  "Independent", "Minimal Prompt", "Strategic Cue",
  "Structured Scaffolding", "Direct Support",
];

// ─── Shared helpers ─────────────────────────────────────────────────────────

const WHY_CARD_ICONS = [
  { icon: Eye,        color: "text-blue-600",   bg: "bg-blue-50 border-blue-100" },
  { icon: Users,      color: "text-violet-600",  bg: "bg-violet-50 border-violet-100" },
  { icon: Award,      color: "text-teal-600",    bg: "bg-teal-50 border-teal-100" },
  { icon: Lightbulb,  color: "text-amber-600",   bg: "bg-amber-50 border-amber-100" },
  { icon: GitBranch,  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
  { icon: TrendingUp, color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-100" },
];

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

function OverviewBtn({ title, enKey, btnLabel, badge, onOpen }: {
  title: string; enKey: string; btnLabel: string; badge?: string;
  onOpen: (enKey: string, displayTitle: string, badge?: string) => void;
}) {
  if (!ASSESSMENT_OVERVIEWS["en"][enKey]) return null;
  return (
    <button
      onClick={() => onOpen(enKey, title, badge)}
      className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 rounded-xl py-2.5 px-3 transition-colors"
    >
      <Info size={12} />
      {btnLabel}
    </button>
  );
}

function Section({ icon: Icon, color, title, children }: {
  icon: React.ElementType; color: string; title: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={14} className="text-white" />
        </div>
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function summerPx(priceStr: string): string {
  const n = parseInt(priceStr.replace(/,/g, ""), 10);
  return Math.round(n * 0.8).toLocaleString();
}

type DrawerLabels = {
  headerLabel: string; sectionAbout: string; sectionWhen: string;
  sectionInitiatedBy: string; sectionProfile: string; sectionBenefits: string;
  sectionDeliverables: string; sectionTimeline: string; sectionCost: string;
  standardPrice: string; summerRate: string; referBtn: string; parentBtn: string;
};

function AssessmentOverviewDrawer({
  title, overview, price, badge, labels, onClose,
}: {
  title: string; overview: AssessmentOverview; price?: string; badge?: string;
  labels: DrawerLabels; onClose: () => void;
}) {
  const isFlagship = !!badge && badge.toLowerCase().includes("flagship");

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 md:p-10 pointer-events-none">
        <div
          className="w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
          style={{ maxHeight: "90vh", background: isFlagship ? "linear-gradient(180deg,#1e1b4b 0%,#ffffff 220px)" : "#ffffff" }}
        >

          {/* ── Header ── */}
          {isFlagship ? (
            <div className="flex-shrink-0 px-7 pt-7 pb-6 relative overflow-hidden">
              {/* decorative rings */}
              <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

              {/* close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
              >
                <X size={15} />
              </button>

              {/* flagship badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-400/20 border border-amber-400/30 px-3 py-1.5 rounded-full">
                  <Star size={9} className="fill-amber-300" />
                  {badge}
                </span>
              </div>

              <h2 className="text-xl font-bold text-white leading-snug mb-2">{title}</h2>

              {price && (
                <div className="flex items-center gap-3 mt-3">
                  <div className="bg-white/10 border border-white/15 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">{labels.standardPrice}</span>
                    <span className="text-sm font-bold text-white">{price} RMB</span>
                  </div>
                  <div className="bg-amber-400/20 border border-amber-400/30 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <Sun size={11} className="text-amber-300 flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80">{labels.summerRate}</span>
                    <span className="text-sm font-bold text-amber-200">{summerPx(price)} RMB</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100 flex-shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 mb-1">{labels.headerLabel}</p>
                <h2 className="text-base font-bold text-slate-900 leading-snug">{title}</h2>
                {price && (
                  <p className="text-xs text-slate-400 mt-1">
                    {labels.standardPrice} {price} RMB &nbsp;·&nbsp; {labels.summerRate} {summerPx(price)} RMB
                  </p>
                )}
              </div>
              <button onClick={onClose} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700">
                <X size={15} />
              </button>
            </div>
          )}

          {/* ── Body ── */}
          <div className={`flex-1 overflow-y-auto px-6 py-6 space-y-7 bg-white ${isFlagship ? "rounded-t-2xl -mt-2 pt-8" : ""}`}>
            <Section icon={Info} color={isFlagship ? "bg-indigo-600" : "bg-slate-500"} title={labels.sectionAbout}>
              <p className="text-sm text-slate-600 leading-relaxed">{overview.fullDesc}</p>
            </Section>
            <Section icon={Clock} color="bg-blue-500" title={labels.sectionWhen}>
              <ul className="space-y-1.5">
                {overview.whenToUse.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <ChevronRight size={13} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
            <Section icon={UserCheck} color="bg-violet-500" title={labels.sectionInitiatedBy}>
              <div className="flex flex-wrap gap-2">
                {overview.initiatedBy.map((who, i) => (
                  <span key={i} className="text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100 px-3 py-1 rounded-full">{who}</span>
                ))}
              </div>
            </Section>
            <Section icon={Target} color="bg-amber-500" title={labels.sectionProfile}>
              <p className="text-sm text-slate-600 leading-relaxed">{overview.studentProfile}</p>
            </Section>
            <Section icon={Zap} color="bg-emerald-500" title={labels.sectionBenefits}>
              <ul className="space-y-1.5">
                {overview.benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </Section>
            {overview.deliverables && (
              <Section icon={Package} color="bg-indigo-500" title={labels.sectionDeliverables}>
                <ul className="space-y-1.5">
                  {overview.deliverables.map((d, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={13} className="text-indigo-400 flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {overview.typicalTimeline && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <Clock size={15} className="text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{labels.sectionTimeline}</p>
                  <p className="text-sm font-semibold text-slate-700">{overview.typicalTimeline}</p>
                </div>
              </div>
            )}
            <Section icon={DollarSign} color="bg-rose-500" title={labels.sectionCost}>
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                <p className="text-sm text-slate-600 leading-relaxed">{overview.costContext}</p>
              </div>
            </Section>
          </div>

          {/* ── Footer ── */}
          <div className={`border-t px-6 py-4 flex-shrink-0 flex gap-3 bg-white ${isFlagship ? "border-indigo-100" : "border-slate-100"}`}>
            <Link href="/portal?tab=school" className="flex-1">
              <button className={`w-full flex items-center justify-center gap-2 font-semibold text-sm px-4 py-3 rounded-xl transition-colors ${isFlagship ? "bg-indigo-900 hover:bg-indigo-800 text-white shadow-lg shadow-indigo-900/20" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}>
                {isFlagship && <Star size={13} className="fill-amber-300 text-amber-300" />}
                {labels.referBtn} <ArrowRight size={14} />
              </button>
            </Link>
            <Link href="/portal?tab=parent" className="flex-1">
              <button className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm px-4 py-3 rounded-xl transition-colors">
                {labels.parentBtn} <ChevronRight size={14} />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Product card ───────────────────────────────────────────────────────────

function ProductCard({
  product, overviewBtnLabel, onOpen,
}: {
  product: ProductEntry;
  overviewBtnLabel: string;
  onOpen: (enKey: string, displayTitle: string, price?: string, badge?: string) => void;
}) {
  const isFlagship = !!product.badge?.toLowerCase().includes("flagship");

  if (isFlagship) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden flex flex-col shadow-xl"
        style={{ background: "linear-gradient(145deg,#1e1b4b 0%,#312e81 55%,#1e1b4b 100%)" }}
      >
        {/* decorative glow rings */}
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-indigo-400/10 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-400/10 -translate-y-1/4 translate-x-1/4 pointer-events-none" />

        <div className="relative p-6 flex flex-col flex-1">
          {/* badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300 bg-amber-400/20 border border-amber-400/35 px-3 py-1.5 rounded-full">
              <Star size={9} className="fill-amber-300" />
              {product.badge}
            </span>
          </div>

          <h3 className="font-bold text-white text-base mb-2.5 leading-snug">{product.title}</h3>
          <p className="text-indigo-200 text-xs leading-relaxed flex-1">{product.desc}</p>

          {product.eduQuestion && (
            <p className="mt-3 text-[11px] italic text-amber-200/80 leading-snug border-l-2 border-amber-400/40 pl-2.5">
              {product.eduQuestion}
            </p>
          )}

          {/* best-for tags in flagship style */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {product.bestFor.map(item => (
              <span key={item} className="text-[10px] font-medium text-indigo-200 bg-white/10 border border-white/15 px-2 py-0.5 rounded-full">
                {item}
              </span>
            ))}
          </div>

          {/* overview button */}
          {ASSESSMENT_OVERVIEWS["en"][product.title] && (
            <button
              onClick={() => onOpen(product.title, product.title, product.price, product.badge)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/30 rounded-xl py-2.5 px-3 transition-colors"
            >
              <Info size={12} />
              {overviewBtnLabel}
            </button>
          )}

          {/* CTA */}
          <div className="mt-3">
            <Link href="/portal?tab=school">
              <button className="w-full flex items-center justify-center gap-2 text-xs font-bold text-indigo-900 bg-amber-300 hover:bg-amber-200 rounded-xl py-3 px-3 transition-colors shadow-lg shadow-amber-900/20">
                <Star size={11} className="fill-indigo-900" />
                Refer a Student <ArrowRight size={11} />
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      {product.badge && (
        <div className="flex items-center gap-1.5 mb-3">
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <Star size={9} className="fill-amber-700" />
            {product.badge}
          </span>
        </div>
      )}
      <h3 className="font-bold text-slate-800 text-sm mb-2 leading-snug">{product.title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed flex-1">{product.desc}</p>
      {product.eduQuestion && (
        <p className="mt-3 text-[11px] italic text-indigo-600 leading-snug border-l-2 border-indigo-200 pl-2">
          {product.eduQuestion}
        </p>
      )}
      <BestForList items={product.bestFor} />
      <OverviewBtn
        title={product.title}
        enKey={product.title}
        btnLabel={overviewBtnLabel}
        badge={product.badge}
        onOpen={(enKey, displayTitle, badge) => onOpen(enKey, displayTitle, product.price, badge)}
      />
      <div className="mt-3">
        {product.cta === "school" && (
          <Link href="/portal?tab=school">
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl py-2.5 px-3 transition-colors">
              Refer a Student <ArrowRight size={11} />
            </button>
          </Link>
        )}
        {product.cta === "parent" && (
          <Link href="/portal?tab=parent">
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl py-2.5 px-3 transition-colors">
              Parent Enquiry <ChevronRight size={11} />
            </button>
          </Link>
        )}
        {product.cta === "enquiry" && (
          <Link href="/portal?tab=school">
            <button className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl py-2.5 px-3 transition-colors">
              Make an Enquiry <ChevronRight size={11} />
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function AssessmentServicesPage() {
  const { t, lang } = useI18n();
  const a = t.assessmentServices;

  const [activeOverview, setActiveOverview] = useState<{
    enKey: string; displayTitle: string; price?: string; badge?: string;
  } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("comprehensive");

  const openOverview = (enKey: string, displayTitle: string, price?: string, badge?: string) =>
    setActiveOverview({ enKey, displayTitle, price, badge });
  const closeOverview = () => setActiveOverview(null);

  const overviewMap = ASSESSMENT_OVERVIEWS[lang as Lang] ?? ASSESSMENT_OVERVIEWS["en"];
  const activeData = activeOverview
    ? (overviewMap[activeOverview.enKey] ?? ASSESSMENT_OVERVIEWS["en"][activeOverview.enKey])
    : null;

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* Drawer */}
      {activeData && activeOverview && (
        <AssessmentOverviewDrawer
          title={activeOverview.displayTitle}
          overview={activeData}
          price={activeOverview.price}
          badge={activeOverview.badge}
          labels={a.overviewDrawer}
          onClose={closeOverview}
        />
      )}

      {/* ── NAV ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <img src="/images/remynd-logo.png" alt="ReMynd" className="h-9 w-9 object-contain" />
              <div className="leading-none">
                <p className="text-sm font-extrabold text-slate-900 tracking-tight">ReMynd</p>
                <p className="text-[10px] font-medium text-slate-500 tracking-wide">{a.navBrandSub}</p>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageSwitcherLight />
            <Link href="/portal?tab=school">
              <button className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors">
                {a.referStudent}
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
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            {a.heroTitle1}<br />
            <span className="text-blue-300">{a.heroTitle2}</span>
          </h1>
          <p className="text-lg md:text-xl font-semibold text-blue-200 mb-3">
            {a.heroSubtitle}
          </p>
          <div className="max-w-3xl mx-auto bg-white/[0.06] border border-white/10 rounded-2xl px-8 py-7 text-left space-y-3 mb-10">
            <p className="text-slate-300 text-sm leading-relaxed">{a.heroBoxBody}</p>
            <p className="text-slate-200 text-sm leading-relaxed font-semibold"><em>{a.heroChallenge}</em></p>
            <p className="text-slate-400 text-sm leading-relaxed">{a.heroBoxDesc}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/portal?tab=school">
              <button className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-900/40">
                {a.heroReferBtn} <ArrowRight size={16} />
              </button>
            </Link>
            <Link href="/portal?tab=parent">
              <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors">
                {a.heroParentBtn} <ChevronRight size={16} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SUMMER CALLOUT ── */}
      <section className="relative overflow-hidden bg-slate-800 py-10">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10">
            <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
              <Sun size={22} className="text-amber-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{a.summerBadge}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white mb-1">{a.summerHeadline}</h2>
              <p className="text-slate-400 text-sm">{a.summerDesc}</p>
              <p className="text-amber-300/80 text-xs font-semibold mt-1">{a.summerEnds}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <Link href="/portal?tab=school">
                <button className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-sm px-6 py-3 rounded-xl transition-colors">
                  <Sparkles size={14} /> {a.summerBookBtn}
                </button>
              </Link>
              <Link href="/portal?tab=parent">
                <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-slate-300 font-semibold text-sm px-5 py-3 rounded-xl transition-colors">
                  {a.summerParentBtn} <ChevronRight size={14} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── NON-DIAGNOSTIC STATEMENT ── */}
      <section className="py-14 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-8 md:p-10 flex gap-6">
            <div className="w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Award size={22} className="text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-2">Non-Diagnostic by Design</p>
              <p className="text-slate-700 text-sm leading-relaxed mb-3">
                ReMynd is non-diagnostic by design. We do not diagnose or label students. Our assessments are designed to understand educational functioning, strengths, barriers, support needs, and appropriate next steps.
              </p>
              <p className="text-slate-500 text-xs leading-relaxed">
                Where a medical, psychiatric, psychological, or neurodevelopmental evaluation may be necessary, families may be advised to seek assessment from an appropriately licensed professional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SIX PILLARS ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Why Schools Use ReMynd Assessments</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">{a.s1Title}</h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">{a.s1Sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {a.whyCards.map((card, i) => {
              const { icon: Icon, color, bg } = WHY_CARD_ICONS[i];
              return (
                <div key={card.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>
                    <Icon size={20} className={color} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm mb-2">{card.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── RESPONSE TO PRODUCTIVE STRUGGLE ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">A Key Feature of ReMynd Student Assessment Reporting</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">Response to Productive Struggle</h2>
            <p className="text-slate-600 text-sm max-w-2xl mx-auto leading-relaxed">
              Academic performance tells us what a student can demonstrate.<br />
              ReMynd also wants to understand <em>what happens when learning becomes difficult.</em>
            </p>
          </div>

          {/* Flow diagram */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {PS_FLOW.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-sm shadow-indigo-200">
                  {step}
                </div>
                {i < PS_FLOW.length - 1 && (
                  <ArrowRight size={14} className="text-indigo-300 hidden sm:block" />
                )}
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {/* Domains */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Ten Observed Domains</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PS_DOMAINS.map((d) => (
                  <div key={d} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                    <span className="text-xs text-slate-600">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Support threshold */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">Support Threshold</p>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Where sufficient opportunity exists, ReMynd considers the approximate level of adult support required to maintain or restore productive engagement:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUPPORT_LEVELS.map((l, i) => (
                    <div key={l} className="flex items-center gap-1.5">
                      <span className="text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-700 px-2.5 py-1 rounded-full">
                        {i === 0 ? "Independent" : l}
                      </span>
                      {i < SUPPORT_LEVELS.length - 1 && <ChevronRight size={11} className="text-indigo-300" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-indigo-100 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  "What happens when this learner gets stuck, and what kind of support helps them re-engage while preserving ownership of the thinking?"
                </p>
              </div>
            </div>
          </div>

          {/* Visual motif strip */}
          <div
            className="relative overflow-hidden rounded-2xl p-8 text-center"
            style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0e2040 100%)" }}
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-4">
              We Don't Only Ask What the Student Knows
            </p>
            <p className="text-white font-bold text-base md:text-lg mb-6">
              We Also Observe What Happens When They Don't Yet Know.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {["Engage", "Persist", "Strategize", "Adapt", "Seek Help", "Recover"].map((step, i, arr) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-200 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full">{step}</span>
                  {i < arr.length - 1 && <ArrowRight size={12} className="text-indigo-500" />}
                </div>
              ))}
            </div>
            <div className="mt-6 inline-flex items-center gap-2 bg-indigo-500/30 border border-indigo-400/40 rounded-full px-4 py-1.5">
              <CheckCircle2 size={12} className="text-indigo-300" />
              <span className="text-[11px] font-bold text-indigo-200">Included in ReMynd Student Assessment Reporting</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT CATALOGUE ── */}
      <section className="py-20 bg-slate-50" id="assessments">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">Assessment Portfolio</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">Explore Assessment Pathways</h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">
              Select an assessment pathway below. Pricing, timeline, and full details are available inside each assessment overview.
            </p>
          </div>

          {/* Category tab nav */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    const el = document.getElementById(`cat-${cat.id}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-600"
                  }`}
                >
                  <Icon size={11} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Categories */}
          <div className="space-y-14">
            {CATEGORIES.map(cat => (
              <div key={cat.id} id={`cat-${cat.id}`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-2.5 h-2.5 rounded-full ${cat.dotClass}`} />
                  <h3 className="text-lg font-extrabold text-slate-900">{cat.label}</h3>
                  <div className="flex-1 h-px bg-slate-200" />
                  <span className="text-xs text-slate-400 font-medium">{cat.products.length} assessment{cat.products.length > 1 ? "s" : ""}</span>
                </div>
                {cat.id === "university" && (
                  <div className="flex items-start gap-2 mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5">
                    <AlertCircle size={13} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">University assessment services are available for higher-education institutions and their enrolled students. Contact ReMynd to discuss requirements.</p>
                  </div>
                )}
                {cat.id === "corporate" && (
                  <div className="flex items-start gap-2 mb-4 bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5">
                    <AlertCircle size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-600">Corporate assessments use adult and workplace language. They do not involve educational or clinical diagnosis.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {cat.products.map(product => (
                    <ProductCard
                      key={product.title}
                      product={product}
                      overviewBtnLabel={a.overviewDrawer.btnLabel}
                      onOpen={openOverview}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOT SURE WHICH ASSESSMENT? ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-10 items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3">Not Sure Where to Start?</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">
                You Do Not Need to Know Which Assessment to Choose
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                A parent may simply know: <em>"My child is struggling."</em><br />
                A teacher may observe: <em>"Something has changed."</em><br />
                A SENCO may ask: <em>"Does this student require learning support?"</em><br />
                A school leader may wonder: <em>"Do we have enough evidence to make this decision?"</em>
              </p>
              <p className="text-slate-600 text-sm font-semibold mb-6">
                That is enough to begin. ReMynd can help determine the appropriate next step.
              </p>
              <Link href="/portal?tab=school">
                <button className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors">
                  Discuss a Student <ArrowRight size={15} />
                </button>
              </Link>
            </div>

            {/* Journey flow */}
            <div className="space-y-2">
              {[
                { label: "Concern", desc: "Something isn't right" },
                { label: "Evidence", desc: "What teachers, parents, and students have observed" },
                { label: "Educational Question", desc: "What we're trying to understand" },
                { label: "Appropriate Assessment Pathway", desc: "Selected with you, not by you" },
                { label: "Understanding", desc: "What the assessment found — in plain language" },
                { label: "Support", desc: "Practical strategies, priorities, and planning" },
                { label: "Monitoring", desc: "Ongoing tracking through the ReMynd Case Portal" },
                { label: "Growth", desc: "Documented progress and adjusted support as needed" },
              ].map((step, i, arr) => (
                <div key={step.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 text-white text-[10px] font-bold">{i + 1}</div>
                    {i < arr.length - 1 && <div className="w-0.5 h-full bg-indigo-100 mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="font-bold text-slate-800 text-xs">{step.label}</p>
                    <p className="text-slate-500 text-[11px] leading-snug">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">How It Works</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">{a.s4Title}</h2>
            <p className="text-slate-500 text-sm">{a.s4Sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {a.processSteps.map((step, idx) => (
              <div key={step.label} className="relative">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 h-full hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{idx + 1}</span>
                    </div>
                    {idx < a.processSteps.length - 1 && (
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

      {/* ── PARTNER SCHOOLS ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-4">Partner Schools Programme</p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">{a.s5Title}</h2>
              <p className="text-slate-500 text-sm mb-7">{a.s5Body}</p>
              <p className="text-sm font-semibold text-slate-700 mb-4">{a.s5AccessTitle}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 mb-8">
                {a.partnerBenefits.map(b => (
                  <li key={b} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={14} className="text-purple-500 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href="/partner-schools">
                <button className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm px-7 py-3 rounded-xl transition-colors">
                  <Building2 size={15} /> {a.s5Btn}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── ASSESSMENT SCOPE & PRICING ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Assessment Scope & Pricing</p>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">{a.s6Title}</h2>
          <p className="text-slate-500 text-sm mb-8 max-w-xl mx-auto leading-relaxed">{a.s6Sub}</p>
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-left mb-6">
            <p className="text-sm font-semibold text-slate-700 mb-4">{a.pricingIncludes}</p>
            <ul className="space-y-3">
              {a.pricingItems.map(item => (
                <li key={item} className="flex items-center gap-3 text-sm text-slate-700">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Not sure which pathway is appropriate? You do not need to select the assessment yourself. Tell us what you are seeing, and ReMynd can help determine the appropriate next step.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/portal?tab=school">
              <button className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors">
                Help Me Choose an Assessment <ArrowRight size={14} />
              </button>
            </Link>
            <Link href="/portal?tab=parent">
              <button className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-6 py-3 rounded-xl transition-colors">
                Parent Enquiry <ChevronRight size={14} />
              </button>
            </Link>
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
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">{a.ctaTitle}</h2>
          <p className="text-slate-400 text-sm mb-3 max-w-lg mx-auto">{a.ctaDesc}</p>
          <p className="text-indigo-300 text-xs font-semibold mb-10 tracking-wide">Concern → Understanding → Support</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Link href="/portal?tab=school">
              <button className="inline-flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors">
                {a.ctaSchool} <ArrowRight size={15} />
              </button>
            </Link>
            <Link href="/portal?tab=parent">
              <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors">
                {a.ctaParent} <ChevronRight size={15} />
              </button>
            </Link>
            <Link href="/partner-schools">
              <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm px-7 py-3.5 rounded-xl transition-colors">
                {a.ctaPartner} <ChevronRight size={15} />
              </button>
            </Link>
          </div>
          <p className="mt-14 text-slate-600 text-xs font-medium tracking-wide">
            Understand First. &nbsp;·&nbsp; See the Whole Learner. &nbsp;·&nbsp; Act on Understanding. &nbsp;·&nbsp; Support Growth.
          </p>
          <p className="text-slate-700 text-[11px] mt-1">ReMynd Student Services</p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-slate-900 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-slate-500 text-xs leading-relaxed max-w-2xl mx-auto">{a.complianceNote}</p>
          <p className="text-slate-700 text-[11px] mt-4">
            © {new Date().getFullYear()} ReMynd Student Services · Confidential · <a href="/privacy-policy" className="hover:text-slate-500 transition-colors underline underline-offset-2">Privacy Policy</a>
          </p>
        </div>
      </footer>

    </div>
  );
}
