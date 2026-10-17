export type ChineseLiteracyReportTextBlock =
  | { type: "paragraph" | "heading"; text: string }
  | { type: "unordered-list" | "ordered-list"; items: string[] };

export interface ChineseLiteracyDomainNarrative {
  label: string | null;
  text: string;
}

export function parseChineseLiteracyReportText(value: string): ChineseLiteracyReportTextBlock[] {
  const blocks: ChineseLiteracyReportTextBlock[] = [];
  let paragraphLines: string[] = [];
  let activeListType: "unordered-list" | "ordered-list" | null = null;
  let listItems: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join(" ").trim();
    if (text) blocks.push({ type: "paragraph", text });
    paragraphLines = [];
  };
  const flushList = () => {
    if (activeListType && listItems.length) blocks.push({ type: activeListType, items: listItems });
    activeListType = null;
    listItems = [];
  };
  const startList = (type: "unordered-list" | "ordered-list", item: string) => {
    flushParagraph();
    if (activeListType !== type) flushList();
    activeListType = type;
    listItems.push(item.trim());
  };

  for (const line of value.replace(/\r\n?/g, "\n").split("\n")) {
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^\s{0,3}#{1,4}\s+(.+?)\s*#*\s*$/)
      ?? line.match(/^\s*\*\*(.+?)\*\*\s*$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", text: heading[1].trim() });
      continue;
    }

    const unordered = line.match(/^\s*[-*+•]\s+(.+)$/u);
    if (unordered) {
      startList("unordered-list", unordered[1]);
      continue;
    }

    const ordered = line.match(/^\s*\d+\s*[.)、．]\s+(.+)$/u);
    if (ordered) {
      startList("ordered-list", ordered[1]);
      continue;
    }

    if (activeListType && /^\s{2,}\S/.test(line) && listItems.length) {
      listItems[listItems.length - 1] += ` ${line.trim()}`;
      continue;
    }

    flushList();
    paragraphLines.push(line.trim());
  }

  flushParagraph();
  flushList();
  return blocks;
}

export function splitChineseLiteracyComparisonByDomain(
  value: string,
  domainLabels: string[],
): ChineseLiteracyDomainNarrative[] | null {
  const labels = [...new Set(domainLabels.map((label) => label.trim()).filter(Boolean))]
    .sort((left, right) => right.length - left.length);
  if (!labels.length || !value.trim()) return null;

  const escapedLabels = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const labelPattern = escapedLabels.join("|");
  const headingPattern = new RegExp(
    `(^|[.!?]\\s+|[。！？]\\s*|\\n\\s*)(${labelPattern})\\s*[:：]\\s*`,
    "giu",
  );
  const matches = [...value.matchAll(headingPattern)];
  if (!matches.length) return null;

  const sections: ChineseLiteracyDomainNarrative[] = [];
  const firstMatch = matches[0];
  const firstHeadingStart = (firstMatch.index ?? 0) + (firstMatch[1]?.length ?? 0);
  const introduction = value.slice(0, firstHeadingStart).trim();
  if (introduction) sections.push({ label: null, text: introduction });

  matches.forEach((match, index) => {
    const matchStart = match.index ?? 0;
    const headingLabel = match[2]?.trim();
    const bodyStart = matchStart + match[0].length;
    const nextMatch = matches[index + 1];
    const bodyEnd = nextMatch
      ? (nextMatch.index ?? value.length) + (nextMatch[1]?.length ?? 0)
      : value.length;
    const body = value.slice(bodyStart, bodyEnd).trim();
    if (headingLabel) sections.push({ label: headingLabel, text: body });
  });

  return sections.some((section) => section.label) ? sections : null;
}
