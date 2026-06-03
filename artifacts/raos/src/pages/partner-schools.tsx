import { Link } from "wouter";
import { useI18n, LanguageSwitcherLight } from "@/lib/i18n";
import {
  ArrowLeft,
  Building2,
  UserCheck,
  CheckCircle,
  GraduationCap,
  HeartHandshake,
  Network,
} from "lucide-react";

export default function PartnerSchoolsPage() {
  const { t } = useI18n();
  const ps = t.partnerSchools;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium">
            <ArrowLeft size={14} />
            {t.back}
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
            {ps.pageTitle}
          </span>
          <h1 className="text-4xl font-extrabold text-white mb-4 leading-tight">
            {ps.heroHeading}
          </h1>
          <p className="text-purple-200/80 text-base leading-relaxed">
            {ps.heroSub}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-16 space-y-20">

        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Building2 size={16} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{ps.programTitle}</h2>
          </div>
          <div className="space-y-4 max-w-3xl">
            <p className="text-slate-600 leading-relaxed text-base">
              {ps.programBody}
            </p>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
              <UserCheck size={16} className="text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{ps.coordinatorTitle}</h2>
          </div>
          <p className="text-slate-600 leading-relaxed text-base max-w-3xl mb-6">
            {ps.coordinatorIntro}
          </p>
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">{ps.responsibilitiesTitle}</h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {ps.responsibilities.map((r, i) => (
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
            <h2 className="text-xl font-bold text-slate-900">{ps.howTitle}</h2>
          </div>
          <div className="space-y-5">
            {ps.joinSteps.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-full bg-purple-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
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
            <h2 className="text-xl font-bold text-slate-900">{ps.trainingTitle}</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {ps.training.map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
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
            <h2 className="text-xl font-bold text-slate-900">{ps.supportTitle}</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {ps.support.map((item, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5">
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
            <h2 className="text-xl font-bold text-slate-900">{ps.ecosystemTitle}</h2>
          </div>
          <p className="text-slate-500 text-sm mb-6 ml-[52px]">
            {ps.ecosystemSub}
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {ps.platforms.map((p, i) => {
              const styles = [
                { bg: "bg-indigo-50", border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-700" },
                { bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
                { bg: "bg-amber-50", border: "border-amber-200", badge: "bg-amber-100 text-amber-700" },
              ][i];
              return (
                <div key={i} className={`rounded-xl border p-5 ${styles.bg} ${styles.border}`}>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold mb-3 ${styles.badge}`}>
                    {p.name}
                  </span>
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">{p.role}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 bg-slate-100 border border-slate-200 rounded-xl px-5 py-4 text-sm text-slate-600 leading-relaxed">
            {ps.ecosystemNote}
          </div>
        </section>

        <section className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl px-8 py-12 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">{ps.ctaTitle}</h2>
          <p className="text-purple-200 mb-8 text-sm leading-relaxed max-w-md mx-auto">
            {ps.ctaNote}
          </p>
          <Link
            href="/portal?tab=school"
            className="inline-flex items-center gap-2 bg-white text-purple-700 font-bold px-7 py-3 rounded-xl hover:bg-purple-50 transition-colors text-sm shadow-lg"
          >
            {ps.ctaBtn}
          </Link>
        </section>

      </div>

      <footer className="border-t border-slate-200 bg-white py-6 text-center">
        <p className="text-xs text-slate-400">© {new Date().getFullYear()} ReMynd Student Services · Confidential</p>
      </footer>
    </div>
  );
}
