import { Link } from "wouter";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";
import { ClipboardList, BarChart2, ShieldCheck, FileCheck, ChevronRight, Lock, ArrowRight } from "lucide-react";

const CAP_ICONS = [ClipboardList, BarChart2, ShieldCheck, FileCheck];
const CAP_ACCENTS = [
  { strip: "from-indigo-500", iconBg: "bg-indigo-500/15", iconBorder: "border-indigo-500/25", iconColor: "text-indigo-400", glow: "hover:border-indigo-500/30 hover:shadow-[0_0_20px_rgba(99,102,241,0.08)]" },
  { strip: "from-teal-500",   iconBg: "bg-teal-500/15",   iconBorder: "border-teal-500/25",   iconColor: "text-teal-400",   glow: "hover:border-teal-500/30 hover:shadow-[0_0_20px_rgba(20,184,166,0.08)]" },
  { strip: "from-violet-500", iconBg: "bg-violet-500/15", iconBorder: "border-violet-500/25", iconColor: "text-violet-400", glow: "hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.08)]" },
  { strip: "from-amber-500",  iconBg: "bg-amber-500/15",  iconBorder: "border-amber-500/25",  iconColor: "text-amber-400",  glow: "hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]" },
];

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
        <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent via-white/[0.06] to-transparent" />
      </div>

      {/* ── Language switcher ── */}
      <div className="fixed top-5 right-5 z-50">
        <LanguageSwitcherLight />
      </div>

      {/* ════════════════════════════════
          LEFT — Brand identity
      ════════════════════════════════ */}
      <div className="md:w-1/2 relative z-10 flex flex-col items-center justify-center px-10 py-14 min-h-[50vh] md:min-h-screen gap-8">

        {/* App icon */}
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-500/15 rounded-[40px] blur-2xl" />
            <div className="relative w-[112px] h-[112px] bg-white rounded-[28px] flex items-center justify-center shadow-2xl">
              <img src="/images/remynd-logo.png" alt="ReMynd" className="w-[76px] h-[76px] object-contain" />
            </div>
          </div>

          {/* Brand name + tagline */}
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-5xl font-black text-white tracking-tight leading-none">ReMynd</h1>
            <p className="text-[22px] font-semibold text-blue-400 leading-tight">Student Services</p>
          </div>

          {/* Badge */}
          <span className="inline-block text-[10px] font-semibold tracking-[0.22em] uppercase text-slate-400 border border-slate-600/60 rounded-full px-4 py-1.5">
            {l.subtitle}
          </span>
        </div>

        {/* Description */}
        <p className="text-slate-400 text-sm leading-relaxed text-center max-w-[360px]">
          {l.description}
        </p>

        {/* 2×2 capability cards */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-[400px]">
          {l.caps.map((item, i) => {
            const Icon = CAP_ICONS[i];
            const a = CAP_ACCENTS[i];
            return (
              <div
                key={item}
                className={`relative flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm overflow-hidden transition-all duration-300 p-4 ${a.glow}`}
              >
                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${a.strip} to-transparent`} />
                <div className={`w-9 h-9 rounded-xl ${a.iconBg} border ${a.iconBorder} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={16} className={a.iconColor} />
                </div>
                <p className="text-[13px] font-medium text-slate-300 leading-snug">{item}</p>
              </div>
            );
          })}
        </div>

        {/* Bottom links */}
        <div className="flex items-center gap-4 mt-2">
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Lock size={10} />
            {l.adminLogin}
          </a>
          <span className="text-slate-700 text-[10px]">·</span>
          <p className="text-[10px] text-slate-700">
            © {new Date().getFullYear()} {l.copyright}
          </p>
          <span className="text-slate-700 text-[10px]">·</span>
          <a href="/privacy-policy" className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors">
            Privacy Policy
          </a>
        </div>
      </div>

      {/* ════════════════════════════════
          RIGHT — Access pathways
      ════════════════════════════════ */}
      <div className="md:w-1/2 relative z-10 flex flex-col justify-center px-10 py-14" style={{ background: "#d6dff0" }}>
        <div className="max-w-md w-full mx-auto">

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-1">{l.welcome}</h2>
            <p className="text-slate-500 text-sm">{l.selectPath}</p>
          </div>

          <div className="flex flex-col gap-3">

            {/* Student Case Portal */}
            <Link href="/my-portal">
              <div className="group flex flex-col rounded-2xl border border-sky-500/30 bg-[#1a2744] hover:shadow-[inset_0_0_0_2px_rgb(56,189,248)] transition-all duration-200 overflow-hidden cursor-pointer">
                <div className="h-0.5 bg-gradient-to-r from-sky-400 via-cyan-400 to-transparent" />
                <div className="px-5 py-4">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-sky-400">
                        <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200">{l.myPortal}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{l.myPortalDesc}</p>
                    </div>
                    <ArrowRight size={15} className="text-slate-600 group-hover:text-sky-400 flex-shrink-0 transition-all group-hover:translate-x-0.5" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {l.myPortalFeatures.map(f => (
                      <span key={f} className="text-[10px] font-medium text-sky-300/80 bg-sky-500/10 border border-sky-500/15 rounded-full px-2.5 py-0.5">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>

            {/* Divider space */}
            <div className="mt-2" />

            {/* Schools */}
            <Link href="/portal?tab=school">
              <div className="group relative flex items-center gap-4 rounded-2xl border border-[#243a5e] bg-[#1a2744] hover:shadow-[inset_0_0_0_2px_rgb(99,102,241)] transition-all duration-200 overflow-hidden px-5 py-4 cursor-pointer">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-transparent" />
                <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-indigo-400">
                    <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{l.schools}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{l.schoolsDesc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
              </div>
            </Link>

            {/* Parents */}
            <Link href="/portal?tab=parent">
              <div className="group relative flex items-center gap-4 rounded-2xl border border-[#243a5e] bg-[#1a2744] hover:shadow-[inset_0_0_0_2px_rgb(20,184,166)] transition-all duration-200 overflow-hidden px-5 py-4 cursor-pointer">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500 to-transparent" />
                <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-teal-400">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{l.parents}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{l.parentsDesc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-teal-400 flex-shrink-0 transition-colors" />
              </div>
            </Link>

            {/* Partner Schools */}
            <Link href="/partner-schools">
              <div className="group relative flex items-center gap-4 rounded-2xl border border-[#243a5e] bg-[#1a2744] hover:shadow-[inset_0_0_0_2px_rgb(139,92,246)] transition-all duration-200 overflow-hidden px-5 py-4 cursor-pointer">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-transparent" />
                <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-400">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{l.partners}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{l.partnersDesc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-violet-400 flex-shrink-0 transition-colors" />
              </div>
            </Link>

            {/* Assessment Services */}
            <Link href="/assessment-services">
              <div className="group relative flex items-center gap-4 rounded-2xl border border-amber-500/30 bg-[#1a2744] hover:shadow-[inset_0_0_0_2px_rgb(245,158,11)] transition-all duration-200 overflow-hidden px-5 py-4 cursor-pointer">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-transparent" />
                <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-slate-200">{t.assessmentServices.landingTitle}</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">2026–2027</span>
                  </div>
                  <p className="text-xs text-slate-500">{t.assessmentServices.landingDesc}</p>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover:text-amber-400 flex-shrink-0 transition-colors" />
              </div>
            </Link>

          </div>

          <p className="mt-6 text-[11px] text-slate-400 text-center">{l.authorised}</p>

        </div>
      </div>

    </div>
  );
}
