import { createElement, type ReactNode } from "react";
import type { ClDomainObservation } from "./types";

const DOMAIN_MARKER = "[[REMYND_DOMAIN_OBSERVATIONS]]";
type Translate = (path: string, value: unknown) => string;

function reportWithDomainMarker(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const output: string[] = [];
  let inserted = false;
  let skippingDomainSection = false;
  let domainSectionLevel = 0;

  for (const line of lines) {
    const heading = line.trim().match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (skippingDomainSection) {
      if (heading && heading[1].length <= domainSectionLevel) {
        skippingDomainSection = false;
      } else {
        continue;
      }
    }
    if (heading) {
      if (/^observations\s+by\s+domain$/i.test(heading[2].trim())) {
        if (!inserted) output.push(DOMAIN_MARKER);
        inserted = true;
        skippingDomainSection = true;
        domainSectionLevel = heading[1].length;
        continue;
      }
      if (!inserted && /^(strengths and current supports|limitations and points for review)$/i.test(heading[2].trim())) {
        output.push(DOMAIN_MARKER);
        inserted = true;
      }
    }
    output.push(line);
  }

  if (!inserted) output.push(DOMAIN_MARKER);
  return output.join("\n");
}

function inline(text: string): ReactNode[] {
  const tokenPattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  return text.split(tokenPattern).filter(Boolean).map((token, index) => {
    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
      return <strong key={index} className="font-semibold text-slate-900">{token.slice(2, -2)}</strong>;
    }
    if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
      return <em key={index}>{token.slice(1, -1)}</em>;
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return <code key={index} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em]">{token.slice(1, -1)}</code>;
    }
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const safeUrl = /^https?:\/\//i.test(link[2]) ? link[2] : null;
      return safeUrl
        ? <a key={index} href={safeUrl} target="_blank" rel="noreferrer" className="text-primary underline">{link[1]}</a>
        : <span key={index}>{link[1]}</span>;
    }
    return token;
  });
}

function isBlockStart(line: string) {
  return /^(#{1,4})\s+/.test(line)
    || /^\s*[-*+]\s+/.test(line)
    || /^\s*\d+[.)]\s+/.test(line)
    || /^\s*>/.test(line)
    || /^(-{3,}|_{3,}|\*{3,})$/.test(line.trim());
}

function DomainObservationSection({ observations, translate }: {
  observations: ClDomainObservation[];
  translate: Translate;
}) {
  const cards = observations.map(observation => {
    const maxCount = Math.max(1, ...observation.distribution.map(row => row.count));
    const chartLabel = observation.distribution.map(row => `${row.value} ${row.label}: ${row.count}`).join("; ");
    return (
      <section key={observation.id} className="cl-domain-observation rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="mb-3 text-base font-semibold text-slate-900">{observation.label}</h3>
        <figure className="rounded-lg border border-slate-100 bg-slate-50 p-3 sm:p-4" role="img" aria-label={`${observation.label} item rating distribution. ${chartLabel}`}>
          <figcaption className="mb-3 text-xs font-semibold text-slate-700">Distribution of observed-frequency ratings · number of items</figcaption>
          <div className="space-y-2.5">
            {observation.distribution.map(row => (
              <div key={row.value} className="grid grid-cols-[minmax(118px,1fr)_minmax(70px,2fr)_24px] items-center gap-2 text-[11px] leading-4 sm:grid-cols-[180px_minmax(100px,2fr)_28px]">
                <span className="text-slate-600">{row.value} · {row.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <span className="block h-full rounded-full bg-[#1F74AD]" style={{ width: `${row.count / maxCount * 100}%` }} />
                </span>
                <span className="text-right font-semibold tabular-nums text-slate-700">{row.count}</span>
              </div>
            ))}
          </div>
          {!observation.validCount && <p className="mt-2 text-[11px] text-slate-500">No numeric ratings are available for this domain.</p>}
        </figure>
        <p className="mt-4 text-sm leading-6 text-slate-700">{observation.narrative}</p>
        <div className="mt-4 rounded-lg border-l-4 border-[#1F74AD] bg-sky-50 px-4 py-3">
          <h4 className="text-xs font-bold uppercase tracking-wide text-slate-800">Interpretation</h4>
          <p className="mt-1 text-sm leading-6 text-slate-700">{observation.interpretation}</p>
        </div>
        {observation.itemsForDiscussion.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-slate-800">Items to review in support planning</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">
              {observation.itemsForDiscussion.map(item => <li key={item.id}><span className="font-mono text-slate-500">{item.id}</span> · {item.text} <span className="font-semibold">({item.value}/5 · {observation.distribution.find(row => row.value === item.value)?.label})</span></li>)}
            </ul>
          </div>
        )}
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h4 className="text-xs font-bold text-slate-800">Recommendation for support planning</h4>
          <p className="mt-1 text-sm leading-6 text-slate-700">{observation.planningRecommendation}</p>
        </div>
        {observation.itemsWithFrequentRatings.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-slate-800">Items rated often or almost always</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">
              {observation.itemsWithFrequentRatings.map(item => <li key={item.id}><span className="font-mono text-slate-500">{item.id}</span> · {item.text} <span className="font-semibold">({item.value}/5)</span></li>)}
            </ul>
          </div>
        )}
        {(observation.strengths || observation.supports) && (
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {observation.strengths && <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Reported strengths</dt><dd className="mt-1 text-xs leading-5 text-slate-700">{translate(`input.evidence.${observation.id}.strengths`, observation.strengths)}</dd></div>}
            {observation.supports && <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Current supports</dt><dd className="mt-1 text-xs leading-5 text-slate-700">{translate(`input.evidence.${observation.id}.supports`, observation.supports)}</dd></div>}
          </dl>
        )}
        {observation.examples.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-semibold text-slate-800">Respondent examples</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">
              {observation.examples.map((example, exampleIndex) => (
                <li key={exampleIndex}>{translate(`input.evidence.${observation.id}.examples.${exampleIndex}.text`, example.text)} <span className="font-mono text-[10px] text-slate-400">({example.itemIds.join(", ")})</span></li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-3 text-[10px] text-slate-500">Rating counts include numeric responses only. NO, NA, and unanswered responses are reported separately above; no norm or diagnostic cutoff is applied.</p>
      </section>
    );
  });
  return (
    <section className="my-6 space-y-4" aria-label="Observations by domain">
      <h2 className="border-b border-slate-100 pb-2 text-lg font-bold text-slate-900">Observations by Domain</h2>
      {cards}
    </section>
  );
}

function markdownBlocks(markdown: string, observations: ClDomainObservation[], translate: Translate): ReactNode[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i += 1; continue; }
    if (line === DOMAIN_MARKER) {
      blocks.push(<DomainObservationSection key={`domain-observations-${i}`} observations={observations} translate={translate} />);
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const className = level === 1
        ? "mb-5 border-b border-slate-200 pb-4 text-2xl font-bold tracking-tight text-slate-950"
        : level === 2
          ? "mb-2 mt-7 border-b border-slate-100 pb-2 text-lg font-bold text-slate-900"
          : level === 3
            ? "mb-2 mt-5 text-base font-semibold text-slate-900"
            : "mb-1 mt-4 text-sm font-semibold text-slate-800";
      blocks.push(createElement(`h${level}`, { key: `heading-${i}`, className }, inline(text)));
      i += 1;
      continue;
    }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) {
      blocks.push(<hr key={`rule-${i}`} className="my-5 border-slate-200" />);
      i += 1;
      continue;
    }

    if (/^\s*>/.test(lines[i])) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push(<blockquote key={`quote-${i}`} className="my-4 border-l-2 border-primary/40 pl-4 text-slate-600">{inline(quote.join(" "))}</blockquote>);
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const entries: string[] = [];
      while (i < lines.length) {
        const item = lines[i].match(ordered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/);
        if (!item) break;
        entries.push(item[1]);
        i += 1;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={`list-${i}`} className={`my-3 space-y-1.5 pl-6 text-slate-700 ${ordered ? "list-decimal" : "list-disc"}`}>
          {entries.map((entry, index) => <li key={index} className="pl-1 leading-7">{inline(entry)}</li>)}
        </List>,
      );
      continue;
    }

    const paragraph = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i].trim())) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    blocks.push(<p key={`paragraph-${i}`} className="my-3 leading-7 text-slate-700">{inline(paragraph.join(" "))}</p>);
  }

  return blocks;
}

export function ReportDocument({ content, source, formName, approved, domainObservations = [], translate = (_path, value) => String(value ?? "") }: {
  content: string;
  source: string;
  formName: string;
  approved: boolean;
  domainObservations?: ClDomainObservation[];
  translate?: Translate;
}) {
  const hasTitle = /^#\s+.+/m.test(content);
  return (
    <>
      <style>{`
        @media print {
          @page { margin: 16mm; }
          body * { visibility: hidden !important; }
          #cl-report-print-target, #cl-report-print-target * { visibility: visible !important; }
          #cl-report-print-target {
            position: absolute !important; inset: 0 auto auto 0 !important;
            width: 100% !important; max-width: none !important; margin: 0 !important;
            overflow: visible !important; border: 0 !important; box-shadow: none !important;
            background: white !important;
          }
          #cl-report-print-target article { max-width: none !important; padding: 0 !important; }
          #cl-report-print-target .cl-domain-observation { break-inside: auto; box-shadow: none !important; }
          #cl-report-print-target figure { break-inside: avoid; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          #cl-report-print-target .no-print { display: none !important; }
        }
      `}</style>
    <div id="cl-report-print-target" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="report-document">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">ReMynd · Assessment Report</p>
          <p className="mt-1 text-xs text-slate-500">{formName} <span className="mx-1.5 text-slate-300">|</span> {source}</p>
          <p className="mt-2 max-w-2xl text-[11px] leading-5 text-slate-500">Scope: This report uses the selected {source.toLowerCase()} record only. Parent and teacher observations are reviewed separately, not combined.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${approved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {approved ? "Approved report" : "Draft · staff review"}
        </span>
      </header>
      <article className="mx-auto max-w-4xl px-6 py-7 sm:px-9 sm:py-9" aria-label="Formatted assessment report">
        {!hasTitle && <h1 className="mb-5 border-b border-slate-200 pb-4 text-2xl font-bold tracking-tight text-slate-950">Educational Observation Report</h1>}
        <div className="break-words text-sm leading-7 [&_a]:break-all [&_li]:leading-7">{markdownBlocks(reportWithDomainMarker(content), domainObservations, translate)}</div>
        <section className="mt-8 border-t border-slate-200 pt-5" aria-labelledby="report-next-steps-heading">
          <h2 id="report-next-steps-heading" className="text-lg font-bold text-slate-900">Recommendations and next steps</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">These observations inform a separate, staff-reviewed support plan. After this report is approved, the plan is developed and approved separately before it is included in the final combined report. Parent and teacher evidence remains separate.</p>
        </section>
      </article>
    </div>
    </>
  );
}
