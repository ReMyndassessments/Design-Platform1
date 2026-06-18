import { Link } from "wouter";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";
import {
  Eye, Users, Lightbulb, GitBranch, CheckCircle2, ArrowRight,
  Star, Building2, ChevronRight, Award, Sun, Sparkles, BookOpen, ClipboardCheck,
} from "lucide-react";

const WHY_CARD_ICONS = [
  { icon: Eye,       color: "text-blue-600",   bg: "bg-blue-50 border-blue-100" },
  { icon: Users,     color: "text-violet-600",  bg: "bg-violet-50 border-violet-100" },
  { icon: Lightbulb, color: "text-amber-600",   bg: "bg-amber-50 border-amber-100" },
  { icon: GitBranch, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
];

const SUMMER_USE_CASE_ICONS = [Sun, BookOpen, ClipboardCheck];

const SUMMER_DISCOUNT = 0.20;

function summerPx(priceStr: string): string {
  const n = parseInt(priceStr.replace(/,/g, ""), 10);
  return Math.round(n * (1 - SUMMER_DISCOUNT)).toLocaleString();
}

function PriceTag({ price, summer, summerLabel = "–20% summer" }: { price: string; summer?: boolean; summerLabel?: string }) {
  const discounted = summerPx(price);
  return (
    <div>
      {summer && (
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs text-slate-400 line-through">{price} RMB</span>
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full">
            <Sun size={8} className="flex-shrink-0" /> {summerLabel}
          </span>
        </div>
      )}
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-extrabold text-slate-900">{summer ? discounted : price}</span>
        <span className="text-sm font-semibold text-slate-500">RMB</span>
      </div>
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
  const { t } = useI18n();
  const a = t.assessmentServices;

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
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-7">
            <Award size={12} className="text-amber-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-300 whitespace-nowrap">{a.pricingBadge}</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-5">
            {a.heroTitle1}
            <br />
            <span className="text-blue-300">{a.heroTitle2}</span>
          </h1>
          <p className="text-base md:text-lg text-blue-200 font-medium mb-8 max-w-2xl mx-auto leading-relaxed">
            {a.heroSubtitle}
          </p>

          <div className="max-w-3xl mx-auto bg-white/[0.06] border border-white/10 rounded-2xl px-8 py-7 text-left space-y-3 mb-10">
            <p className="text-xl md:text-2xl font-bold text-white text-center mb-4">
              {a.heroBoxTitle}
            </p>
            <p className="text-slate-300 text-sm leading-relaxed">
              {a.heroBoxBody}
            </p>
            <p className="text-slate-300 text-sm leading-relaxed font-semibold">
              <em>{a.heroChallenge}</em>
            </p>
            <p className="text-slate-400 text-sm leading-relaxed">
              {a.heroBoxDesc}
            </p>
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

      {/* ── SUMMER PROMO BANNER ── */}
      <section className="relative overflow-hidden bg-slate-800 py-12">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-8">

            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-4">
                <Sun size={13} className="text-amber-400" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{a.summerBadge}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2 leading-tight">
                <span className="text-slate-400 text-xl block mb-1 font-semibold">{a.summerSave}</span>
                {a.summerHeadline}
              </h2>
              <p className="text-slate-400 text-sm font-medium mb-5">
                {a.summerDesc}
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3">
                <Link href="/portal?tab=school">
                  <button className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-sm px-7 py-3 rounded-xl transition-colors">
                    <Sparkles size={15} /> {a.summerBookBtn}
                  </button>
                </Link>
                <Link href="/portal?tab=parent">
                  <button className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-slate-300 font-semibold text-sm px-6 py-3 rounded-xl transition-colors">
                    {a.summerParentBtn} <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3 w-full lg:w-auto lg:max-w-sm xl:max-w-none xl:w-80">
              {a.summerUseCases.map((item, i) => {
                const Icon = SUMMER_USE_CASE_ICONS[i];
                return (
                  <div key={item.title} className="bg-white/8 border border-white/10 rounded-2xl p-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-400/20 flex items-center justify-center mb-2">
                      <Icon size={15} className="text-amber-400" />
                    </div>
                    <p className="text-white font-bold text-xs mb-1">{item.title}</p>
                    <p className="text-slate-400 text-[11px] leading-snug">{item.desc}</p>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 1: WHY SCHOOLS ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">{a.sectionLabels[0]}</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">{a.s1Title}</h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">{a.s1Sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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

      {/* ── SECTION 2: ASSESSMENT FRAMEWORK ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">{a.sectionLabels[1]}</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">{a.s2Title}</h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">{a.s2Sub}</p>
          </div>

          {/* Tier 1 */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-2 bg-sky-100 border border-sky-200 rounded-full px-4 py-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-700">Tier 1</span>
              </div>
              <p className="text-sm font-semibold text-slate-700">{a.t1Label}</p>
            </div>
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-2xl p-7">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{a.t1Name}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed mb-4">{a.t1Desc}</p>
                  <BestForList items={a.t1BestFor} />
                </div>
                <div className="md:text-right flex-shrink-0">
                  <PriceTag price="4,500" summer summerLabel={a.summerDiscountLabel} />
                  <p className="text-[10px] text-slate-400 mt-1">{a.t1PerStudent}</p>
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
              <p className="text-sm font-semibold text-slate-700">{a.t2Label}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {a.tier2.map(item => (
                <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <PriceTag price={item.price} summer summerLabel={a.summerDiscountLabel} />
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
              <p className="text-sm font-semibold text-slate-700">{a.t3Label}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {a.tier3.map(item => (
                <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <PriceTag price={item.price} summer summerLabel={a.summerDiscountLabel} />
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
              <p className="text-sm font-semibold text-slate-700">{a.t4Label}</p>
            </div>

            <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-300 shadow-xl shadow-indigo-100"
              style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0e2040 60%, #0a1628 100%)" }}
            >
              <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-blue-600/10 rounded-full blur-[80px]" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[200px] bg-indigo-900/20 rounded-full blur-[60px]" />

              <div className="relative z-10 p-8 md:p-10">
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-amber-400 text-amber-900 px-3 py-1 rounded-full">
                    <Star size={9} className="fill-amber-900" /> {a.flagshipBadge1}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 text-white border border-white/20 px-3 py-1 rounded-full">
                    {a.flagshipBadge2}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full">
                    {a.flagshipBadge3}
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <div className="mb-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm text-blue-300/60 line-through">16,500 RMB</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-400/20 border border-amber-400/30 px-2 py-0.5 rounded-full">
                          <Sun size={8} /> {a.summerDiscountLabel}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-white">13,200</span>
                        <span className="text-base font-semibold text-blue-300">RMB</span>
                      </div>
                    </div>
                    <h3 className="text-xl md:text-2xl font-extrabold text-white mb-3 leading-snug">
                      {a.flagshipName}
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-4">
                      {a.flagshipDesc}
                    </p>
                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">{a.flagshipSourcesLabel}</p>
                      <div className="flex flex-wrap gap-2">
                        {a.flagshipSources.map(s => (
                          <span key={s} className="text-[11px] bg-white/10 border border-white/15 text-slate-300 px-2.5 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">{a.flagshipQuestionsLabel}</p>
                      <ul className="space-y-1.5">
                        {a.flagshipQuestions.map(q => (
                          <li key={q} className="flex items-start gap-2 text-xs text-slate-300">
                            <ChevronRight size={12} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                            {q}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">{a.flagshipDeliverablesLabel}</p>
                      <ul className="space-y-1.5">
                        {a.flagshipDeliverables.map(d => (
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
                      {a.flagshipBtn} <ArrowRight size={16} />
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
            <p className="text-xs font-bold uppercase tracking-widest text-teal-500 mb-3">{a.sectionLabels[2]}</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">{a.s3Title}</h2>
            <p className="text-slate-500 text-sm max-w-xl mx-auto">{a.s3Sub}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {a.parentServices.map(item => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <PriceTag price={item.price} summer summerLabel={a.summerDiscountLabel} />
                <h3 className="font-bold text-slate-800 text-sm mt-3 mb-2">{item.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed flex-1">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/portal?tab=parent">
              <button className="inline-flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm px-7 py-3 rounded-xl transition-colors">
                {a.s3Btn} <ArrowRight size={15} />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: PROCESS ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-500 mb-3">{a.sectionLabels[3]}</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">{a.s4Title}</h2>
            <p className="text-slate-500 text-sm">{a.s4Sub}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {a.processSteps.map((step, idx) => (
              <div key={step.label} className="relative">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 h-full hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors">
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

      {/* ── SECTION 5: PARTNER SCHOOLS ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-4">{a.sectionLabels[4]}</p>
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

      {/* ── SECTION 6: PRICING TRANSPARENCY ── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">{a.sectionLabels[5]}</p>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-4">{a.s6Title}</h2>
            <p className="text-slate-500 text-sm mb-8">{a.s6Sub}</p>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-left">
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
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">{a.ctaTitle}</h2>
          <p className="text-slate-400 text-sm mb-10 max-w-lg mx-auto">{a.ctaDesc}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
        </div>
      </section>

      {/* ── COMPLIANCE NOTE ── */}
      <footer className="bg-slate-900 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-slate-500 text-xs leading-relaxed max-w-2xl mx-auto">
            {a.complianceNote}
          </p>
          <p className="text-slate-700 text-[11px] mt-4">
            © {new Date().getFullYear()} ReMynd Student Services · Confidential
          </p>
        </div>
      </footer>

    </div>
  );
}
