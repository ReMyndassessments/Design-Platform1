import { Link } from "wouter";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";
import { ClipboardList, BarChart2, ShieldCheck, FileCheck, ChevronRight, Lock, ArrowRight } from "lucide-react";

const CAP_ICONS = [ClipboardList, BarChart2, ShieldCheck, FileCheck];

export default function LandingPage() {
  const { t } = useI18n();
  const l = t.landing;

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col md:flex-row"
      style={{ background: "linear-gradient(135deg, #080f1c 0%, #0b1628 40%, #0d1f35 100%)" }}
    >
      {/* ── Background atmosphere ── */}
      <div className="pointer-events-none absolute inset-0">
        {/* Large ambient blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-800/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[55%] h-[55%] bg-indigo-900/12 rounded-full blur-[100px]" />
        <div className="absolute top-[30%] right-[20%] w-[30%] h-[40%] bg-violet-900/8 rounded-full blur-[80px]" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, #7eb0ff 1px, transparent 1px)", backgroundSize: "32px 32px" }}
        />
        {/* Horizontal rule separating columns on md+ */}
        <div className="hidden md:block absolute top-0 bottom-0 left-[42%] w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── Language switcher ── */}
      <div className="fixed top-5 right-5 z-50">
        <LanguageSwitcherLight />
      </div>

      {/* ════════════════════════════════
          LEFT — Brand identity
      ════════════════════════════════ */}
      <div className="md:w-[42%] relative z-10 flex flex-col justify-between px-12 py-14 min-h-[50vh] md:min-h-screen">

        {/* Logo mark */}
        <div className="flex flex-col items-start gap-6">
          <div className="relative">
            <div className="absolute -inset-3 bg-blue-500/10 rounded-[32px] blur-xl" />
            <div className="relative w-[76px] h-[76px] bg-white/[0.06] backdrop-blur-sm rounded-[20px] flex items-center justify-center shadow-2xl ring-1 ring-white/10">
              <img src="/images/remynd-logo.png" alt="ReMynd" className="w-[50px] h-[50px] object-contain" />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-3 mb-1">
              <h1 className="text-4xl font-black text-white tracking-tight leading-none">ReMynd</h1>
              <span className="text-blue-400/70 text-sm font-medium">Student Services</span>
            </div>
            <span className="inline-block text-[9px] font-bold tracking-[0.25em] uppercase text-slate-500 border border-slate-700/60 rounded-full px-3 py-[3px] mt-1">
              {l.subtitle}
            </span>
          </div>
        </div>

        {/* Hero text */}
        <div className="flex flex-col gap-8">
          <div>
            <p className="text-2xl font-light text-slate-200 leading-snug mb-4 max-w-xs">
              End-to-end psychoeducational<br />
              <span className="text-white font-semibold">assessment management.</span>
            </p>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              {l.description}
            </p>
          </div>

          {/* Capability chips */}
          <div className="flex flex-col gap-2">
            {l.caps.map((item, i) => {
              const Icon = CAP_ICONS[i];
              return (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Icon size={11} className="text-blue-400" />
                  </div>
                  <p className="text-[12px] text-slate-400">{item}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-between">
          <a
            href="/login"
            className="group inline-flex items-center gap-2 text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Lock size={10} />
            {l.adminLogin}
          </a>
          <p className="text-[10px] text-slate-700">
            © {new Date().getFullYear()} {l.copyright}
          </p>
        </div>
      </div>

      {/* ════════════════════════════════
          RIGHT — Access pathways
      ════════════════════════════════ */}
      <div className="md:w-[58%] relative z-10 flex flex-col justify-center px-10 py-14">
        <div className="max-w-xl w-full mx-auto">

          <div className="mb-10">
            <h2 className="text-xl font-bold text-white mb-1">{l.welcome}</h2>
            <p className="text-slate-500 text-sm">{l.selectPath}</p>
          </div>

          {/* ── Student Case Portal — top hero card ── */}
          <Link href="/my-portal">
            <div className="group relative mb-4 cursor-pointer">
              {/* Glow */}
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-indigo-500/30 via-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-300" />
              <div className="relative rounded-2xl border border-indigo-500/20 group-hover:border-indigo-400/40 bg-white/[0.03] group-hover:bg-white/[0.06] backdrop-blur-sm transition-all duration-200 overflow-hidden">
                {/* Coloured top strip */}
                <div className="h-0.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-transparent" />
                <div className="px-6 py-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-indigo-400">
                          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-base font-bold text-white">{l.myPortal}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{l.myPortalDesc}</p>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-slate-600 group-hover:text-indigo-400 flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {l.myPortalFeatures.map(f => (
                      <span key={f} className="text-[10px] font-medium text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/15 rounded-full px-2.5 py-0.5">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* ── Three pathway cards in a row ── */}
          <div className="grid grid-cols-3 gap-3 mb-4">

            {/* Schools */}
            <Link href="/portal?tab=school">
              <div className="group relative cursor-pointer">
                <div className="absolute -inset-px rounded-xl bg-indigo-500/20 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-200" />
                <div className="relative rounded-xl border border-white/[0.07] group-hover:border-indigo-500/30 bg-white/[0.03] group-hover:bg-white/[0.05] backdrop-blur-sm transition-all duration-200 p-4 h-full">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mb-3">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-indigo-400">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-200 mb-1">{l.schools}</p>
                  <p className="text-[11px] text-slate-500 leading-snug">{l.schoolsDesc}</p>
                  <ChevronRight size={13} className="text-slate-600 group-hover:text-indigo-400 mt-3 transition-colors" />
                </div>
              </div>
            </Link>

            {/* Parents */}
            <Link href="/portal?tab=parent">
              <div className="group relative cursor-pointer">
                <div className="absolute -inset-px rounded-xl bg-teal-500/20 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-200" />
                <div className="relative rounded-xl border border-white/[0.07] group-hover:border-teal-500/30 bg-white/[0.03] group-hover:bg-white/[0.05] backdrop-blur-sm transition-all duration-200 p-4 h-full">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/15 flex items-center justify-center mb-3">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-teal-400">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-200 mb-1">{l.parents}</p>
                  <p className="text-[11px] text-slate-500 leading-snug">{l.parentsDesc}</p>
                  <ChevronRight size={13} className="text-slate-600 group-hover:text-teal-400 mt-3 transition-colors" />
                </div>
              </div>
            </Link>

            {/* Partner Schools */}
            <Link href="/partner-schools">
              <div className="group relative cursor-pointer">
                <div className="absolute -inset-px rounded-xl bg-violet-500/20 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-200" />
                <div className="relative rounded-xl border border-white/[0.07] group-hover:border-violet-500/30 bg-white/[0.03] group-hover:bg-white/[0.05] backdrop-blur-sm transition-all duration-200 p-4 h-full">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/15 flex items-center justify-center mb-3">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-400">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-slate-200 mb-1">{l.partners}</p>
                  <p className="text-[11px] text-slate-500 leading-snug">{l.partnersDesc}</p>
                  <ChevronRight size={13} className="text-slate-600 group-hover:text-violet-400 mt-3 transition-colors" />
                </div>
              </div>
            </Link>

          </div>

          {/* ── Assessment Services — slim amber strip ── */}
          <Link href="/assessment-services">
            <div className="group relative cursor-pointer">
              <div className="absolute -inset-px rounded-xl bg-amber-500/15 opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-200" />
              <div className="relative flex items-center gap-4 rounded-xl border border-amber-500/15 group-hover:border-amber-400/30 bg-amber-500/[0.04] group-hover:bg-amber-500/[0.08] backdrop-blur-sm transition-all duration-200 px-5 py-3.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-400">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-300">{t.assessmentServices.landingTitle}</p>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">2026–2027</span>
                  <p className="text-xs text-slate-600 truncate hidden sm:block">— {t.assessmentServices.landingDesc}</p>
                </div>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-amber-400 flex-shrink-0 transition-colors" />
              </div>
            </div>
          </Link>

          <p className="mt-8 text-[11px] text-slate-700 text-center">{l.authorised}</p>

        </div>
      </div>

    </div>
  );
}
