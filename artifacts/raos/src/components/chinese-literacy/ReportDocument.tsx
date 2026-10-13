import { createElement, type ReactNode } from "react";

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

function markdownBlocks(markdown: string): ReactNode[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i += 1; continue; }

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

export function ReportDocument({ content, source, formName, approved }: {
  content: string;
  source: string;
  formName: string;
  approved: boolean;
}) {
  const hasTitle = /^#\s+.+/m.test(content);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" data-testid="report-document">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">ReMynd · Assessment Report</p>
          <p className="mt-1 text-xs text-slate-500">{formName} <span className="mx-1.5 text-slate-300">|</span> {source}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${approved ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {approved ? "Approved report" : "Draft · staff review"}
        </span>
      </header>
      <article className="mx-auto max-w-4xl px-6 py-7 sm:px-9 sm:py-9" aria-label="Formatted assessment report">
        {!hasTitle && <h1 className="mb-5 border-b border-slate-200 pb-4 text-2xl font-bold tracking-tight text-slate-950">Educational Observation Report</h1>}
        <div className="break-words text-sm leading-7 [&_a]:break-all [&_li]:leading-7">{markdownBlocks(content)}</div>
      </article>
    </div>
  );
}
