import { BookOpen, ChevronDown, AlertTriangle } from "lucide-react";
import { examinerGuides, type ExaminerAssessment } from "./content";

/** Read-only examiner guidance; never reads or writes assessment answers. */
export function ExaminerInstructions({ assessment }: { assessment: ExaminerAssessment }) {
  const guide = examinerGuides[assessment];

  return (
    <details className="group mb-6 overflow-hidden rounded-xl border border-blue-200 bg-white print:hidden">
      <summary className="flex cursor-pointer list-none items-start gap-3 bg-blue-50 px-4 py-4 text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 [&::-webkit-details-marker]:hidden sm:px-5">
        <BookOpen size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{guide.name} Examiner Instructions</span>
          <span className="mt-1 block text-xs leading-relaxed text-blue-800">{guide.description}</span>
          <span className="mt-2 block text-xs font-medium group-open:hidden">Open instructions</span>
          <span className="mt-2 hidden text-xs font-medium group-open:block">Close instructions</span>
        </span>
        <ChevronDown size={18} className="mt-0.5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="space-y-5 border-t border-blue-100 px-4 py-5 text-sm leading-relaxed text-slate-700 sm:px-5">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Examiner-only, implementation-aligned guidance. Use clinical-lead-approved pronunciation,
          practice, and scoring conventions. This is not a validated standardized-test manual;
          concern bands are not diagnoses, percentiles, or established age norms.
        </p>
        {guide.sections.map(section => (
          <section key={section.title}>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">{section.title}</h2>
            {section.script && (
              <blockquote className="mb-3 border-l-2 border-blue-300 bg-blue-50/60 px-3 py-2 text-blue-950">
                <span className="mb-1 block text-xs font-semibold text-blue-700">Say to the student</span>
                “{section.script}”
              </blockquote>
            )}
            <ul className="list-disc space-y-2 pl-5">
              {section.steps.map(step => <li key={step}>{step}</li>)}
            </ul>
            {section.caution && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>{section.caution}</span>
              </p>
            )}
          </section>
        ))}
      </div>
    </details>
  );
}