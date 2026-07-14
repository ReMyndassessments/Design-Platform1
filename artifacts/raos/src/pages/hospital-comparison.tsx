import { useState } from "react";
import {
  CheckCircle2, Heart, Lightbulb, GraduationCap, TrendingUp,
  Eye, Users, BookOpen, Home, Brain, Activity, Smile, Layers,
  MessageSquare, ClipboardCheck, FileText, ArrowRight,
  HelpCircle, ChevronDown, ChevronUp, School, Stethoscope, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HospComparison {
  sectionLabel: string;
  title: string;
  intro: string;
  highlight: string;
  hospitalCard: { title: string; desc: string };
  remyndCard: { title: string; desc: string };
  wholeChild: { title: string; body: string; questions: string[] };
  completePicture: { title: string; body: string; sources: string[]; note: string };
  strengths: { title: string; body: string; cards: { title: string; desc: string }[] };
  recommendations: { title: string; body: string; items: string[]; highlight: string };
  schoolSupport: { title: string; body: string; items: string[]; note: string };
  ongoingSupport: { title: string; body: string; cards: { title: string; desc: string }[] };
  table: { title: string; area: string; hospital: string; remynd: string; rows: { area: string; hospital: string; remynd: string }[] };
  whichAssessment: {
    title: string;
    hospital: { title: string; items: string[] };
    remynd: { title: string; items: string[] };
    both: { title: string; items: string[] };
    disclaimer: string;
  };
  cta: { title: string; body: string; primaryBtn: string; secondaryBtn: string; helper: string };
  faqs: { q: string; a: string }[];
}

const WHOLE_CHILD_ICONS = [Brain, Star, HelpCircle, School, ArrowRight];
const SOURCE_ICONS = [Users, GraduationCap, FileText, BookOpen, Activity, Heart, Home, Smile, Brain, Layers, Lightbulb, ClipboardCheck, School, MessageSquare];
const STRENGTH_ICONS = [Heart, Lightbulb, GraduationCap, TrendingUp];
const PORTAL_ICONS = [FileText, MessageSquare, TrendingUp, Eye, Users];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-base font-bold text-slate-900 mb-3">{children}</h4>
  );
}

function BodyText({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm text-slate-600 leading-relaxed", className)}>{children}</p>
  );
}

export function HospitalComparisonSection({ hc, onInquire }: { hc: HospComparison; onInquire: () => void }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleFaqToggle = (i: number) => {
    setOpenFaq(prev => (prev === i ? null : i));
    try { (window as any).__raos_track?.("parent_hospital_comparison_faq_opened", { index: i }); } catch {}
  };

  const handleCtaPrimary = () => {
    try { (window as any).__raos_track?.("parent_hospital_comparison_cta_clicked"); } catch {}
    onInquire();
  };
  const handleCtaSecondary = () => {
    try { (window as any).__raos_track?.("parent_hospital_comparison_enquiry_clicked"); } catch {}
    onInquire();
  };

  return (
    <div id="hospital-vs-remynd" className="space-y-10">

      {/* ── Header ── */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-full text-teal-700 text-[11px] font-semibold mb-3">
          <Stethoscope size={11} aria-hidden="true" /> {hc.sectionLabel}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{hc.title}</h3>
        <BodyText>{hc.intro}</BodyText>
        <div className="mt-4 p-4 bg-teal-50 border-l-4 border-teal-400 rounded-r-xl">
          <p className="text-sm text-teal-900 leading-relaxed font-medium">{hc.highlight}</p>
        </div>
      </div>

      {/* A. Two-column overview panel */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <Stethoscope size={15} className="text-slate-600" aria-hidden="true" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm">{hc.hospitalCard.title}</h4>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{hc.hospitalCard.desc}</p>
        </div>
        <div className="rounded-xl border border-teal-200 bg-teal-50 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-200 rounded-lg flex items-center justify-center flex-shrink-0">
              <Brain size={15} className="text-teal-700" aria-hidden="true" />
            </div>
            <h4 className="font-semibold text-slate-900 text-sm">{hc.remyndCard.title}</h4>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">{hc.remyndCard.desc}</p>
        </div>
      </div>

      {/* B. We See the Whole Child */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4">
        <SectionHeading>{hc.wholeChild.title}</SectionHeading>
        <BodyText>{hc.wholeChild.body}</BodyText>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          {hc.wholeChild.questions.map((q, i) => {
            const Icon = WHOLE_CHILD_ICONS[i] ?? HelpCircle;
            return (
              <div key={i} className="flex items-start gap-2.5 bg-slate-50 rounded-lg px-3 py-2.5">
                <Icon size={14} className="text-teal-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-slate-700">{q}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* C. A Complete Picture */}
      <div className="space-y-4">
        <SectionHeading>{hc.completePicture.title}</SectionHeading>
        <BodyText>{hc.completePicture.body}</BodyText>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {hc.completePicture.sources.map((src, i) => {
            const Icon = SOURCE_ICONS[i % SOURCE_ICONS.length];
            return (
              <div key={src} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                <Icon size={13} className="text-teal-500 flex-shrink-0" aria-hidden="true" />
                <p className="text-xs text-slate-700 leading-tight">{src}</p>
              </div>
            );
          })}
        </div>
        <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
          <BodyText className="text-teal-900">{hc.completePicture.note}</BodyText>
        </div>
      </div>

      {/* D. Strengths */}
      <div className="space-y-4">
        <SectionHeading>{hc.strengths.title}</SectionHeading>
        <BodyText>{hc.strengths.body}</BodyText>
        <div className="grid sm:grid-cols-2 gap-3">
          {hc.strengths.cards.map(({ title, desc }, i) => {
            const Icon = STRENGTH_ICONS[i] ?? CheckCircle2;
            return (
              <div key={title} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-teal-600" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* E. Practical Recommendations */}
      <div className="bg-slate-50 rounded-xl p-6 space-y-4">
        <SectionHeading>{hc.recommendations.title}</SectionHeading>
        <BodyText>{hc.recommendations.body}</BodyText>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {hc.recommendations.items.map(item => (
            <div key={item} className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-teal-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-slate-700">{item}</p>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-slate-200">
          <p className="text-sm font-semibold text-teal-800 italic">{hc.recommendations.highlight}</p>
        </div>
      </div>

      {/* F. School-Focused Support */}
      <div className="space-y-4">
        <SectionHeading>{hc.schoolSupport.title}</SectionHeading>
        <BodyText>{hc.schoolSupport.body}</BodyText>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {hc.schoolSupport.items.map(item => (
            <div key={item} className="flex items-start gap-2">
              <CheckCircle2 size={13} className="text-teal-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-sm text-slate-700">{item}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-600 italic border-l-4 border-teal-300 pl-3">{hc.schoolSupport.note}</p>
      </div>

      {/* G. Ongoing Support */}
      <div className="space-y-4">
        <SectionHeading>{hc.ongoingSupport.title}</SectionHeading>
        <BodyText>{hc.ongoingSupport.body}</BodyText>
        <div className="grid sm:grid-cols-2 gap-3">
          {hc.ongoingSupport.cards.map(({ title, desc }, i) => {
            const Icon = PORTAL_ICONS[i] ?? CheckCircle2;
            return (
              <div key={title} className="flex items-start gap-3 bg-teal-50 border border-teal-100 rounded-xl p-4">
                <div className="w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={13} className="text-teal-600" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900">{title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* H. Comparison Table */}
      <div className="space-y-4">
        <SectionHeading>{hc.table.title}</SectionHeading>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800 text-white">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide w-[26%]">{hc.table.area}</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide w-[37%] border-l border-slate-600">{hc.table.hospital}</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide w-[37%] border-l border-slate-600 text-teal-300">{hc.table.remynd}</th>
              </tr>
            </thead>
            <tbody>
              {hc.table.rows.map((row, i) => (
                <tr key={row.area} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="px-4 py-3 font-medium text-slate-800 text-xs align-top">{row.area}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs align-top border-l border-slate-100">{row.hospital}</td>
                  <td className="px-4 py-3 text-teal-800 text-xs align-top border-l border-slate-100 bg-teal-50/40">{row.remynd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked cards */}
        <div className="sm:hidden space-y-3">
          {hc.table.rows.map(row => (
            <div key={row.area} className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 text-white px-4 py-2">
                <p className="text-xs font-semibold">{row.area}</p>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide">{hc.table.hospital}</p>
                  <p className="text-xs text-slate-700 leading-snug">{row.hospital}</p>
                </div>
                <div className="bg-teal-50 px-3 py-3">
                  <p className="text-[10px] font-semibold text-teal-600 mb-1 uppercase tracking-wide">{hc.table.remynd}</p>
                  <p className="text-xs text-teal-800 leading-snug">{row.remynd}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* I. Which Assessment? */}
      <div className="space-y-4">
        <SectionHeading>{hc.whichAssessment.title}</SectionHeading>
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Hospital */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Stethoscope size={13} className="text-slate-600" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-slate-800 leading-snug">{hc.whichAssessment.hospital.title}</p>
            </div>
            <ul className="space-y-1.5">
              {hc.whichAssessment.hospital.items.map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-slate-600 leading-snug">{item}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* ReMynd */}
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Brain size={13} className="text-teal-700" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-teal-900 leading-snug">{hc.whichAssessment.remynd.title}</p>
            </div>
            <ul className="space-y-1.5">
              {hc.whichAssessment.remynd.items.map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-teal-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-teal-800 leading-snug">{item}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Both */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-indigo-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Layers size={13} className="text-indigo-700" aria-hidden="true" />
              </div>
              <p className="text-xs font-semibold text-indigo-900 leading-snug">{hc.whichAssessment.both.title}</p>
            </div>
            <ul className="space-y-1.5">
              {hc.whichAssessment.both.items.map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-indigo-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-indigo-800 leading-snug">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
          <p className="text-xs text-amber-900 leading-relaxed">{hc.whichAssessment.disclaimer}</p>
        </div>
      </div>

      {/* J. CTA */}
      <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-6 text-center space-y-3 shadow-md">
        <h4 className="text-lg font-bold text-white">{hc.cta.title}</h4>
        <p className="text-teal-100 text-sm max-w-sm mx-auto leading-relaxed">{hc.cta.body}</p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <Button
            onClick={handleCtaPrimary}
            className="bg-white text-teal-700 hover:bg-teal-50 font-semibold focus-visible:ring-2 focus-visible:ring-white"
            aria-label={hc.cta.primaryBtn}
          >
            {hc.cta.primaryBtn}
          </Button>
          <Button
            variant="outline"
            onClick={handleCtaSecondary}
            className="border-teal-300 text-white hover:bg-teal-600 hover:text-white focus-visible:ring-2 focus-visible:ring-white"
            aria-label={hc.cta.secondaryBtn}
          >
            {hc.cta.secondaryBtn}
          </Button>
        </div>
        <p className="text-teal-200 text-xs">{hc.cta.helper}</p>
      </div>

      {/* Hospital-comparison FAQs */}
      <div className="space-y-2">
        {hc.faqs.map(({ q, a }, i) => (
          <div key={i} className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              onClick={() => handleFaqToggle(i)}
              aria-expanded={openFaq === i}
            >
              <p className="text-sm font-semibold text-slate-800 pr-4">{q}</p>
              {openFaq === i
                ? <ChevronUp size={15} className="text-teal-500 flex-shrink-0" aria-hidden="true" />
                : <ChevronDown size={15} className="text-slate-400 flex-shrink-0" aria-hidden="true" />
              }
            </button>
            {openFaq === i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-slate-600 leading-relaxed">{a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
