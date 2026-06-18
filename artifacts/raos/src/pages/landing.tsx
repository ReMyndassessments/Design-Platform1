import { Link } from "wouter";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";
import {
  ClipboardList, BarChart2, ShieldCheck, FileCheck, ChevronRight, Lock
} from "lucide-react";

const CAP_ICONS = [ClipboardList, BarChart2, ShieldCheck, FileCheck];

export default function LandingPage() {
  const { t } = useI18n();
  const l = t.landing;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── LEFT — Brand panel ── */}
      <div className="md:w-[48%] relative overflow-hidden flex flex-col justify-between px-10 py-12 min-h-[50vh] md:min-h-screen"
        style={{ background: "linear-gradient(145deg, #0d1b2e 0%, #0a1628 45%, #060d1c 100%)" }}
      >
        {/* Layered background glows */}
        <div className="absolute top-[-8%] left-[-8%] w-[55%] h-[45%] bg-blue-700/12 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-5%] right-[-8%] w-[55%] h-[50%] bg-indigo-900/18 rounded-full blur-[80px]" />
        <div className="absolute top-[38%] left-[15%] w-[70%] h-[30%] bg-slate-700/20 rounded-full blur-[60px]" />

        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px"
          }}
        />

        {/* TOP: Logo + name */}
        <div className="z-10 flex flex-col items-center text-center gap-5">
          {/* Logo with outer glow ring */}
          <div className="relative mt-2">
            <div className="absolute -inset-2 bg-blue-400/15 rounded-[28px] blur-lg" />
            <div className="relative w-[88px] h-[88px] bg-white rounded-[22px] flex items-center justify-center shadow-2xl ring-1 ring-white/10">
              <img src="/images/remynd-logo.png" alt="ReMynd" className="w-[60px] h-[60px] object-contain" />
            </div>
          </div>

          {/* Name hierarchy */}
          <div className="space-y-1">
            <h1 className="text-[2rem] font-extrabold text-white tracking-tight leading-none">ReMynd</h1>
            <p className="text-blue-300 text-base font-semibold tracking-wide">Student Services</p>
            <div className="pt-1">
              <span className="inline-block text-[9px] font-bold tracking-[0.22em] uppercase text-slate-500 border border-slate-700/70 rounded-full px-3 py-[3px]">
                {l.subtitle}
              </span>
            </div>
          </div>
        </div>

        {/* MIDDLE: Description + Capability grid */}
        <div className="z-10 flex flex-col gap-6 max-w-md mx-auto w-full">
          <p className="text-slate-400 text-sm leading-relaxed text-center px-2">
            {l.description}
          </p>

          {/* 2×2 icon grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {l.caps.map((item, i) => {
              const Icon = CAP_ICONS[i];
              return (
                <div
                  key={item}
                  className="flex flex-col gap-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] px-3.5 py-3 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center">
                    <Icon size={13} className="text-blue-300" />
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug font-medium">{item}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* BOTTOM: Discrete admin login + copyright */}
        <div className="z-10 flex flex-col items-center gap-3">
          <div className="w-full max-w-[220px] border-t border-white/[0.06] mb-1" />
          <a
            href="/login"
            className="group inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-[11px] text-slate-500 hover:text-slate-300 transition-all duration-200"
          >
            <Lock size={10} className="opacity-50 group-hover:opacity-80 transition-opacity" />
            {l.adminLogin}
          </a>
          <p className="text-[10px] text-slate-700 tracking-wide">
            © {new Date().getFullYear()} {l.copyright}
          </p>
        </div>
      </div>

      {/* ── RIGHT — Access panel ── */}
      <div className="md:w-[52%] flex flex-col justify-center px-10 py-16 bg-white">
        <div className="max-w-sm mx-auto w-full">

          {/* Language switcher */}
          <div className="flex justify-end mb-10">
            <LanguageSwitcherLight />
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-1">{l.welcome}</h2>
          <p className="text-gray-400 text-sm mb-8">{l.selectPath}</p>

          <div className="space-y-3">
            {/* Schools card */}
            <Link href="/portal?tab=school">
              <div className="group border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors border border-indigo-100 flex-shrink-0">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-500">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 mb-0.5">{l.schools}</p>
                      <p className="text-xs text-gray-400">{l.schoolsDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
                </div>
              </div>
            </Link>

            {/* Parents card */}
            <Link href="/portal?tab=parent">
              <div className="group border border-gray-200 hover:border-teal-300 hover:bg-teal-50/40 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 group-hover:bg-teal-100 flex items-center justify-center transition-colors border border-teal-100 flex-shrink-0">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-teal-500">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 mb-0.5">{l.parents}</p>
                      <p className="text-xs text-gray-400">{l.parentsDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
                </div>
              </div>
            </Link>

            {/* Partner Schools card */}
            <Link href="/partner-schools">
              <div className="group border border-gray-200 hover:border-purple-300 hover:bg-purple-50/40 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 group-hover:bg-purple-100 flex items-center justify-center transition-colors border border-purple-100 flex-shrink-0">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-purple-500">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 mb-0.5">{l.partners}</p>
                      <p className="text-xs text-gray-400">{l.partnersDesc}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                </div>
              </div>
            </Link>

            {/* Assessment Services card */}
            <Link href="/assessment-services">
              <div className="group border border-amber-200 hover:border-amber-400 hover:bg-amber-50/40 rounded-xl p-5 cursor-pointer transition-all duration-200 hover:shadow-md bg-amber-50/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center transition-colors border border-amber-200 flex-shrink-0">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-800">Explore Assessment Services</p>
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">2026–2027</span>
                      </div>
                      <p className="text-xs text-gray-400">View school-facing assessment options, pricing, and referral pathways.</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                </div>
              </div>
            </Link>
          </div>

          <p className="mt-10 text-xs text-gray-300 text-center">
            {l.authorised}
          </p>
        </div>
      </div>

    </div>
  );
}
