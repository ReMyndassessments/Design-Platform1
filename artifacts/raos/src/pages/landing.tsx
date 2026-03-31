import { Link } from "wouter";
import { useI18n, LanguageSwitcher, LanguageSwitcherLight } from "@/lib/i18n";

export default function LandingPage() {
  const { t } = useI18n();
  const l = t.landing;

  return (
    <div className="min-h-screen text-white flex flex-col lg:flex-row">

      {/* Left — Brand panel */}
      <div className="lg:w-1/2 bg-slate-900 text-white relative overflow-hidden flex flex-col justify-center items-center px-12 py-16 text-center gap-10">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/20 blur-3xl" />

        {/* Language switcher */}
        <div className="z-10 absolute top-5 right-6">
          <LanguageSwitcher />
        </div>

        {/* Logo + name */}
        <div className="z-10 flex flex-col items-center gap-4">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-16 h-16 object-contain" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">ReMynd</h1>
            <p className="text-slate-400 text-base mt-1 tracking-widest uppercase text-sm">{l.subtitle}</p>
          </div>
        </div>

        {/* Description */}
        <div className="z-10 max-w-md">
          <p className="text-slate-300 text-base leading-relaxed">
            {l.description}
          </p>
        </div>

        {/* Capabilities */}
        <div className="z-10 flex flex-col gap-3 w-full max-w-md">
          {l.caps.map((item) => (
            <div key={item} className="flex items-center gap-3 text-slate-300 text-sm bg-white/5 rounded-lg px-4 py-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
              {item}
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="z-10 text-xs text-slate-600">
          © {new Date().getFullYear()} {l.copyright}
        </p>
      </div>

      {/* Right — Access panel */}
      <div className="lg:w-1/2 flex flex-col justify-center px-10 py-16 bg-white">
        <div className="max-w-sm mx-auto w-full">

          {/* Language switcher for light panel */}
          <div className="flex justify-end mb-6">
            <LanguageSwitcherLight />
          </div>

          <h2 className="text-xl font-bold text-gray-800 mb-1">{l.welcome}</h2>
          <p className="text-gray-400 text-sm mb-10">{l.selectPath}</p>

          <div className="space-y-4">
            <Link href="/portal">
              <div className="group border border-gray-200 hover:border-slate-400 rounded-xl p-5 cursor-pointer transition-all hover:shadow-md bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-0.5">{l.schoolsParents}</p>
                    <p className="text-xs text-gray-400">{l.schoolsParentsDesc}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-slate-100 flex items-center justify-center transition-colors border border-gray-100">
                    <span className="text-gray-400 group-hover:text-slate-700 text-sm transition-colors">→</span>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/login">
              <div className="group border border-gray-200 hover:border-slate-400 rounded-xl p-5 cursor-pointer transition-all hover:shadow-md bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-0.5">{l.assessmentStaff}</p>
                    <p className="text-xs text-gray-400">{l.assessmentStaffDesc}</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-slate-100 flex items-center justify-center transition-colors border border-gray-100">
                    <span className="text-gray-400 group-hover:text-slate-700 text-sm transition-colors">→</span>
                  </div>
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
