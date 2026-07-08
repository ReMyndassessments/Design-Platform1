import { Link } from "wouter";
import { BookOpen, ShieldAlert, FileText, ClipboardList, LifeBuoy, ChevronRight } from "lucide-react";

const RESOURCE_SECTIONS = [
  {
    title: "Getting Started",
    icon: BookOpen,
    items: [
      { slug: "orientation-guide", label: "Orientation Guide for Clinical Apprentices", desc: "Program overview, expectations, and how to navigate RAOS." },
      { slug: "confidentiality-ethics-agreement", label: "Confidentiality & Ethics Agreement", desc: "Required reading before viewing any assigned case." },
    ],
  },
  {
    title: "Clinical Reference",
    icon: FileText,
    items: [
      { slug: "assessment-battery-overview", label: "Assessment Battery Overview", desc: "What each tool measures and how it fits the assessment phase." },
      { slug: "reading-domain-scores", label: "Reading & Interpreting Domain Scores", desc: "A primer on interpreting scoring summaries you will see on cases." },
      { slug: "report-structure-walkthrough", label: "Report Structure Walkthrough", desc: "How background, domain analysis, and recommendations sections are built." },
    ],
  },
  {
    title: "Practice Guides",
    icon: ClipboardList,
    items: [
      { slug: "observing-parent-consultation", label: "Observing a Parent Consultation", desc: "Written walkthrough of what to notice during a consultation session." },
      { slug: "debrief-meeting-best-practices", label: "Debrief Meeting Best Practices", desc: "How mentors run a family debrief session." },
    ],
  },
  {
    title: "Support",
    icon: LifeBuoy,
    items: [
      { slug: "contact-your-mentor", label: "Contact Your Mentor", desc: "Reach out through your program coordinator for questions on a specific case." },
      { slug: "escalation-path", label: "Escalation Path", desc: "If you notice a safeguarding concern, notify your mentor and an admin immediately." },
    ],
  },
];

export default function ApprenticeResourcesPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
          <BookOpen size={22} className="text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Training Resources</h1>
          <p className="text-slate-500 mt-0.5">Reference material to support your clinical training.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <ShieldAlert size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          Everything you view in this program is confidential. Never share case details, student names, or documents outside of your supervised training.
        </p>
      </div>

      <div className="space-y-5">
        {RESOURCE_SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <section.icon size={12} /> {section.title}
            </h2>
            <div className="space-y-2">
              {section.items.map((item) => (
                <Link
                  key={item.slug}
                  href={`/apprentice/resources/${item.slug}`}
                  className="flex items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition-all"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
