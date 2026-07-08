import { useParams, Link } from "wouter";
import { ArrowLeft, BookOpen, ArrowRight } from "lucide-react";
import { RESOURCE_CONTENT } from "@/lib/apprentice-resources-content";

function renderParagraph(text: string, key: number) {
  const lines = text.split("\n");
  return (
    <div key={key} className="text-sm text-slate-700 leading-relaxed space-y-1">
      {lines.map((line, i) => {
        const boldMatch = line.match(/^\*\*(.+?)\*\*(.*)$/);
        if (boldMatch) {
          return (
            <p key={i}>
              <span className="font-semibold text-slate-900">{boldMatch[1]}</span>
              {boldMatch[2]}
            </p>
          );
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default function ApprenticeResourceDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const resource = RESOURCE_CONTENT[slug];

  if (!resource) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <Link href="/apprentice/resources" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to Training Resources
        </Link>
        <p className="text-slate-500 text-sm">This resource could not be found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/apprentice/resources" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} /> Back to Training Resources
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
          <BookOpen size={22} className="text-amber-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">{resource.section}</p>
          <h1 className="text-2xl font-bold text-slate-900">{resource.label}</h1>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        {resource.body.map((paragraph, i) => renderParagraph(paragraph, i))}
      </div>

      {resource.link && (
        <Link
          href={resource.link.href}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-800"
        >
          {resource.link.label} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}
