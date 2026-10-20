import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  BookOpenText,
  Check,
  ChevronDown,
  ClipboardList,
  Download,
  FileText,
  Home,
  Info,
  LoaderCircle,
  Moon,
  Printer,
  RefreshCw,
  School,
  Sparkles,
  Sun,
} from "lucide-react";
import {
  getGetChineseLiteracyDashboardQueryKey,
  useGenerateChineseLiteracyDashboardComparison,
  useGetCase,
  useGetChineseLiteracyDashboard,
  useTranslateChineseLiteracyDashboard,
  type ChineseLiteracyDashboardDomainScore,
} from "@workspace/api-client-react";
import { PrintReportIdentity } from "@/components/PrintReportIdentity";
import {
  CHINESE_LITERACY_DASHBOARD_PRINT_COPY,
  chineseLiteracyStatusLabel,
  type ChineseLiteracyReportLanguage,
} from "@/lib/chinese-literacy-dashboard-print-copy";
import {
  AUTO_REFRESH_OPTIONS,
  canGenerateComparison,
  createComparisonCsv,
  isParentHome,
  isTeacherClassroom,
  sharedDomainPairs,
  snapshotMatchesSelection,
} from "@/lib/chinese-literacy-dashboard-model";
import {
  parseChineseLiteracyReportText,
  splitChineseLiteracyComparisonByDomain,
} from "@/lib/chinese-literacy-report-format";

function renderInlineReportText(text: string) {
  return text.split(/(\*\*.+?\*\*|__.+?__)/g).map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function ReportTextBlocks({ text }: { text: string }) {
  const blocks = parseChineseLiteracyReportText(text);
  return (
    <div className="space-y-3 text-sm leading-relaxed">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <h4 key={`heading-${index}`} className="font-semibold">{renderInlineReportText(block.text)}</h4>;
        }
        if (block.type === "unordered-list") {
          return (
            <ul key={`unordered-${index}`} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => <li key={`item-${itemIndex}`} className="text-justify">{renderInlineReportText(item)}</li>)}
            </ul>
          );
        }
        if (block.type === "ordered-list") {
          return (
            <ol key={`ordered-${index}`} className="list-decimal space-y-1 pl-5">
              {block.items.map((item, itemIndex) => <li key={`item-${itemIndex}`} className="text-justify">{renderInlineReportText(item)}</li>)}
            </ol>
          );
        }
        return <p key={`paragraph-${index}`} className="whitespace-pre-wrap text-justify">{renderInlineReportText(block.text)}</p>;
      })}
    </div>
  );
}

function FormattedReportText({
  text,
  domainLabels = [],
}: {
  text: string;
  domainLabels?: string[];
}) {
  const domainSections = splitChineseLiteracyComparisonByDomain(text, domainLabels);
  if (!domainSections) return <ReportTextBlocks text={text} />;

  return (
    <div className="space-y-4">
      {domainSections.map((section, index) => (
        <section key={`domain-narrative-${index}`} className={section.label ? "space-y-1.5 border-t border-current/10 pt-3 first:border-0 first:pt-0" : ""}>
          {section.label && <h4 className="text-sm font-semibold">{section.label}</h4>}
          {section.text && <ReportTextBlocks text={section.text} />}
        </section>
      ))}
    </div>
  );
}

function formatDate(value: string | null | undefined, language: ChineseLiteracyReportLanguage = "en") {
  if (!value) return CHINESE_LITERACY_DASHBOARD_PRINT_COPY[language].notSubmitted;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusLabel(status: string, language: ChineseLiteracyReportLanguage = "en") {
  return chineseLiteracyStatusLabel(status, language);
}

export default function ChineseLiteracyDashboardPage() {
  const { id: routeCaseId = "" } = useParams<{ id: string }>();
  const caseId = routeCaseId;
  const queryClient = useQueryClient();
  const { data: caseData } = useGetCase(caseId);
  const queryKey = getGetChineseLiteracyDashboardQueryKey(caseId);
  const { data, isLoading, isError, error, refetch, isFetching } = useGetChineseLiteracyDashboard(caseId, {
    query: { queryKey, enabled: Boolean(caseId), staleTime: 5 * 60 * 1000, refetchOnWindowFocus: false },
  });
  const comparisonMutation = useGenerateChineseLiteracyDashboardComparison();
  const translationMutation = useTranslateChineseLiteracyDashboard();
  const [parentId, setParentId] = useState(() => new URLSearchParams(window.location.search).get("parentAssignmentId") ?? "");
  const [teacherId, setTeacherId] = useState(() => new URLSearchParams(window.location.search).get("teacherAssignmentId") ?? "");
  const [reportLanguage, setReportLanguage] = useState<ChineseLiteracyReportLanguage>("en");
  const [translationCache, setTranslationCache] = useState<{
    key: string;
    byLanguage: Partial<Record<ChineseLiteracyReportLanguage, Record<string, string>>>;
  }>({ key: "", byLanguage: {} });
  const [preparingLanguage, setPreparingLanguage] = useState<ChineseLiteracyReportLanguage | null>(null);
  const [requestedPrintLanguage, setRequestedPrintLanguage] = useState<ChineseLiteracyReportLanguage | null>(null);
  const [translationError, setTranslationError] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [autoRefreshMs, setAutoRefreshMs] = useState<number | null>(null);
  const [refreshMenuOpen, setRefreshMenuOpen] = useState(false);
  const refreshMenuRef = useRef<HTMLDivElement>(null);

  const administrations = data?.administrations ?? [];
  const parentRecords = useMemo(() => administrations.filter(isParentHome), [administrations]);
  const teacherRecords = useMemo(() => administrations.filter(isTeacherClassroom), [administrations]);

  useEffect(() => {
    if (!data) return;
    if (!parentRecords.some((record) => record.assignmentId === parentId)) {
      setParentId(parentRecords[0]?.assignmentId ?? "");
    }
    if (!teacherRecords.some((record) => record.assignmentId === teacherId)) {
      setTeacherId(teacherRecords[0]?.assignmentId ?? "");
    }
  }, [data, parentRecords, teacherRecords, parentId, teacherId]);

  const parent = parentRecords.find((record) => record.assignmentId === parentId);
  const teacher = teacherRecords.find((record) => record.assignmentId === teacherId);
  const copy = CHINESE_LITERACY_DASHBOARD_PRINT_COPY[reportLanguage];
  const sharedDomains = useMemo(() => {
    return sharedDomainPairs(parent, teacher);
  }, [parent, teacher]);

  useEffect(() => {
    if (!autoRefreshMs) return;
    const timer = window.setInterval(() => { void refetch(); }, autoRefreshMs);
    return () => window.clearInterval(timer);
  }, [autoRefreshMs, refetch]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (refreshMenuRef.current && !refreshMenuRef.current.contains(event.target as Node)) setRefreshMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);

  const savedComparison = data?.comparison ?? null;
  const snapshotMatchesCurrent = snapshotMatchesSelection(savedComparison, parent, teacher);
  const translationKey = parent && teacher && savedComparison && snapshotMatchesCurrent && !savedComparison.stale
    ? `${parent.assignmentId}:${parent.revision}|${teacher.assignmentId}:${teacher.revision}|${savedComparison.generatedAt}`
    : "";
  const currentTranslations = translationCache.key === translationKey
    ? translationCache.byLanguage[reportLanguage] ?? {}
    : {};
  const reportText = (path: string, original: string) => (currentTranslations[path] ?? original)
    .replaceAll("[REDACTED]", reportLanguage === "en" ? "[withheld]" : "[已隐去]");
  useEffect(() => {
    if (!requestedPrintLanguage) return;
    const previousTitle = document.title;
    const restoreTitle = () => { document.title = previousTitle; };
    const timer = window.setTimeout(() => {
      document.title = CHINESE_LITERACY_DASHBOARD_PRINT_COPY[reportLanguage].reportTitle;
      window.addEventListener("afterprint", restoreTitle, { once: true });
      window.print();
      setRequestedPrintLanguage(null);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", restoreTitle);
      restoreTitle();
    };
  }, [requestedPrintLanguage, reportLanguage, currentTranslations]);
  const comparisonIsStale = Boolean(savedComparison && (savedComparison.stale || !snapshotMatchesCurrent));
  const comparisonNeedsRefresh = Boolean(savedComparison && !savedComparison.content.overallSummary?.trim() && !comparisonIsStale);
  const canGenerate = canGenerateComparison(parent, teacher, sharedDomains.length, comparisonMutation.isPending);

  const handleGenerate = () => {
    if (!parent || !teacher || !canGenerate) return;
    comparisonMutation.mutate(
      { caseId, data: { parentAssignmentId: parent.assignmentId, teacherAssignmentId: teacher.assignmentId } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey }),
        // A response can fail after the server has saved the generated snapshot.
        // Refresh it before offering another paid generation attempt.
        onError: () => queryClient.invalidateQueries({ queryKey }),
      },
    );
  };

  const exportCsv = () => {
    if (!sharedDomains.length) return;
    const csv = createComparisonCsv(sharedDomains);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `chinese-literacy-${caseId}-comparison.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const pageClass = darkMode
    ? "min-h-[100dvh] bg-[#142321] text-[#e7eee8]"
    : "min-h-[100dvh] bg-[#f3f6f2] text-[#20312e]";
  const panelClass = darkMode
    ? "border border-[#304743] bg-[#1d302c] shadow-[0_10px_30px_rgba(4,15,13,.18)]"
    : "border border-[#dce5df] bg-[#fffefa] shadow-[0_10px_30px_rgba(25,57,47,.045)]";
  const softText = darkMode ? "text-[#aabbb4]" : "text-[#687b73]";
  const subtlePanel = darkMode ? "bg-[#243934] border-[#38524b]" : "bg-[#f4f7f2] border-[#e1e8e1]";
  const parentInk = darkMode ? "#79b5a3" : "#286e60";
  const teacherInk = darkMode ? "#e0b76f" : "#a46b19";

  const renderSourceDetails = (
    domain: ChineseLiteracyDashboardDomainScore,
    source: "parent" | "teacher",
  ) => {
    const sourceLabel = source === "parent" ? copy.parentHome : copy.teacherClassroom;
    const domainPath = `${source === "parent" ? "parentDomains" : "teacherDomains"}.${domain.id}`;
    return (
      <div className={`rounded-xl border p-4 ${subtlePanel}`} data-testid={`source-detail-${source}-${domain.id}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {source === "parent" ? <Home size={15} /> : <School size={15} />}
            <h4 className="text-sm font-semibold">{sourceLabel}</h4>
          </div>
          <span className="font-mono text-sm font-semibold" style={{ color: source === "parent" ? parentInk : teacherInk }}>
            {domain.mean === null ? "—" : domain.mean.toFixed(2)}
          </span>
        </div>
        <p className={`mt-1 text-xs ${softText}`}>{source === "parent" ? copy.parentObservation : copy.teacherObservation} · {copy.instrumentName}</p>
        <div className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4 ${softText}`}>
          <span>{copy.valid} <b className="font-mono">{domain.validCount}</b></span>
          <span>{copy.notObserved} <b className="font-mono">{domain.notObservedCount}</b></span>
          <span>{copy.notApplicable} <b className="font-mono">{domain.notApplicableCount}</b></span>
          <span>{copy.unanswered} <b className="font-mono">{domain.unansweredCount}</b></span>
        </div>
        {(domain.evidence.strengths || domain.evidence.supports || domain.evidence.examples.length > 0) && (
          <div className="mt-4 space-y-3 border-t border-current/10 pt-3">
            {domain.evidence.strengths && <p className="text-sm leading-relaxed"><strong>{copy.strengths}</strong> {reportText(`${domainPath}.strengths`, domain.evidence.strengths)}</p>}
            {domain.evidence.supports && <p className="text-sm leading-relaxed"><strong>{copy.supportsNoted}</strong> {reportText(`${domainPath}.supports`, domain.evidence.supports)}</p>}
            {domain.evidence.examples.length > 0 && (
              <div>
                <p className={`mb-1 text-[10px] font-bold uppercase tracking-[.14em] ${softText}`}>{copy.examples}</p>
                <ul className="space-y-1.5 text-sm leading-relaxed">
                  {domain.evidence.examples.map((example, index) => <li key={`${domain.id}-${source}-example-${index}`} className="flex gap-2"><span aria-hidden="true">—</span><span>{reportText(`${domainPath}.examples.${index}`, example)}</span></li>)}
                </ul>
              </div>
            )}
          </div>
        )}
        <div className="mt-4 border-t border-current/10 pt-3">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <ClipboardList size={14} /> {copy.itemResponses(domain.itemResponses.length)}
          </div>
          <div className="mt-3 space-y-2">
            {domain.itemResponses.length === 0 ? (
              <p className={`text-xs ${softText}`}>{copy.noItemResponses}</p>
            ) : domain.itemResponses.map((item, itemIndex) => (
              <div key={`${source}-${item.itemId}`} className={`rounded-lg border p-3 ${darkMode ? "border-[#3b554e] bg-[#1b2b28]" : "border-[#e3e9e3] bg-white"}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm leading-relaxed">{reportText(`${domainPath}.items.${itemIndex}.wording`, item.wording)}</p>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${item.status === "rated" ? "bg-[#e1efe9] text-[#286e60]" : darkMode ? "bg-[#344943] text-[#c0cec8]" : "bg-[#edf0ec] text-[#63716a]"}`}>
                    {statusLabel(item.status, reportLanguage)}
                  </span>
                </div>
                <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${softText}`}>
                  <span>{copy.response} <b className="font-mono">{item.value === null ? "—" : item.value}</b></span>
                  {item.reason && <span>{copy.reason} {reportText(`${domainPath}.items.${itemIndex}.reason`, item.reason)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-4 py-8 sm:p-8" aria-label="Loading Chinese literacy dashboard">
        <div className="h-7 w-48 animate-pulse rounded bg-[#dfe8e1]" />
        <div className="h-32 animate-pulse rounded-2xl bg-[#e7eee8]" />
        <div className="h-72 animate-pulse rounded-2xl bg-[#e7eee8]" />
        <div className="grid gap-4 md:grid-cols-2"><div className="h-36 animate-pulse rounded-xl bg-[#e7eee8]" /><div className="h-36 animate-pulse rounded-xl bg-[#e7eee8]" /></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20">
        <div className="rounded-2xl border border-[#e7c6b9] bg-[#fff8f3] p-7 text-[#603b30]">
          <AlertCircle size={22} />
          <h1 className="mt-3 font-semibold">Dashboard could not be loaded</h1>
          <p className="mt-1 text-sm">{error instanceof Error ? error.message : "Check your connection, then try again."}</p>
          <button type="button" onClick={() => refetch()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#286e60] px-4 py-2 text-sm font-semibold text-white" data-testid="button-retry-dashboard">
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      </div>
    );
  }

  const comparison = savedComparison && !comparisonIsStale ? savedComparison : null;
  const maxMean = Math.max(1, ...sharedDomains.flatMap(({ parentDomain, teacherDomain }) => [parentDomain.mean ?? 0, teacherDomain.mean ?? 0]));
  const comparisonDomainLabels = sharedDomains.flatMap(({ name, parentDomain }) => [
    name,
    reportText(`domainNames.${parentDomain.id}`, name),
  ]);
  comparisonDomainLabels.push(
    ...comparisonDomainLabels.flatMap((label) => {
      const firstPhrase = label.split(/\s+(?:and|&)\s+/i)[0];
      return firstPhrase.length >= 10 && firstPhrase !== label ? [firstPhrase] : [];
    }),
  );
  if (
    sharedDomains.some(({ name }) => /attention/i.test(name))
    && sharedDomains.some(({ name }) => /memory/i.test(name))
  ) {
    comparisonDomainLabels.push(reportLanguage === "zh" ? "注意力与记忆" : "Attention and memory");
  }

  const canPrintReport = Boolean(comparison && comparison.content.overallSummary?.trim() && parent && teacher && translationKey);
  const handlePrintReport = (targetLanguage: ChineseLiteracyReportLanguage) => {
    if (!parent || !teacher || !comparison || !translationKey) return;
    setTranslationError("");
    const cached = translationCache.key === translationKey ? translationCache.byLanguage[targetLanguage] : undefined;
    if (cached) {
      setPreparingLanguage(null);
      setReportLanguage(targetLanguage);
      setRequestedPrintLanguage(targetLanguage);
      return;
    }
    setRequestedPrintLanguage(null);
    setPreparingLanguage(targetLanguage);
    translationMutation.mutate(
      {
        caseId,
        data: {
          parentAssignmentId: parent.assignmentId,
          teacherAssignmentId: teacher.assignmentId,
          targetLanguage,
        },
      },
      {
        onSuccess: ({ translations }) => {
          setPreparingLanguage(null);
          setTranslationCache(current => ({
            key: translationKey,
            byLanguage: {
              ...(current.key === translationKey ? current.byLanguage : {}),
              [targetLanguage]: translations,
            },
          }));
          setReportLanguage(targetLanguage);
          setRequestedPrintLanguage(targetLanguage);
        },
        onError: () => {
          setPreparingLanguage(null);
          setRequestedPrintLanguage(null);
          setTranslationError(`Could not prepare the ${targetLanguage === "en" ? "English" : "Chinese"} report. No print was started; the saved report and responses are unchanged.`);
        },
      },
    );
  };

  return (
    <div
      lang={reportLanguage === "zh" ? "zh-CN" : "en"}
      className={`${pageClass} chinese-literacy-dashboard-print transition-colors duration-200`}
    >
      <main className="mx-auto max-w-[1440px] px-4 pb-16 pt-5 sm:px-7 lg:px-10">
        <PrintReportIdentity
          reportTitle={copy.title}
          studentName={caseData?.studentName}
          dob={caseData?.dob}
          grade={caseData?.grade}
          school={caseData?.school}
          languagePreference={caseData?.languagePreference}
          caseId={caseId}
          language={reportLanguage}
        />
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 no-print">
          <Link href={`/cases/${caseId}/dashboards`} className={`inline-flex items-center gap-2 text-sm font-semibold ${softText}`} data-testid="link-back-dashboards">
            <ArrowLeft size={16} /> Case dashboards
          </Link>
          <div className="flex items-center gap-2">
            <div ref={refreshMenuRef} className="relative inline-flex">
              <button type="button" onClick={() => refetch()} disabled={isFetching} className={`inline-flex items-center gap-2 rounded-l-lg border px-3 py-2 text-xs font-semibold ${darkMode ? "border-[#3a514c] bg-[#20332f] hover:bg-[#29413b]" : "border-[#d7e1da] bg-white hover:bg-[#f5f8f4]"}`} data-testid="button-refresh-dashboard">
                <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
              </button>
              <button type="button" aria-label="Automatic refresh settings" aria-expanded={refreshMenuOpen} onClick={() => setRefreshMenuOpen((open) => !open)} className={`inline-flex items-center rounded-r-lg border border-l-0 px-2 ${darkMode ? "border-[#3a514c] bg-[#20332f] hover:bg-[#29413b]" : "border-[#d7e1da] bg-white hover:bg-[#f5f8f4]"}`}>
                <ChevronDown size={14} />
              </button>
              {refreshMenuOpen && (
                <div role="menu" className={`absolute right-0 top-full z-30 mt-2 w-44 rounded-xl border p-2 shadow-xl ${darkMode ? "border-[#3a514c] bg-[#1d302c]" : "border-[#d7e1da] bg-white"}`}>
                  <p className={`px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[.12em] ${softText}`}>Auto refresh</p>
                  {AUTO_REFRESH_OPTIONS.map((option) => {
                    const selected = autoRefreshMs === option.value;
                    return (
                      <button key={option.label} type="button" role="menuitemradio" aria-checked={selected} onClick={() => { setAutoRefreshMs(option.value); setRefreshMenuOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-xs ${darkMode ? "hover:bg-white/5" : "hover:bg-[#f3f6f2]"}`}>
                        {option.label}{selected && <Check size={14} className={softText} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => handlePrintReport("en")} disabled={!canPrintReport || translationMutation.isPending} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${darkMode ? "border-[#3a514c] bg-[#20332f] hover:bg-[#29413b]" : "border-[#d7e1da] bg-white hover:bg-[#f5f8f4]"}`} data-testid="button-print-dashboard-en">
                {translationMutation.isPending && preparingLanguage === "en" ? <LoaderCircle size={14} className="animate-spin" /> : <Printer size={14} />}
                {translationMutation.isPending && preparingLanguage === "en" ? "Preparing English…" : "Print English report"}
              </button>
              <button type="button" onClick={() => handlePrintReport("zh")} disabled={!canPrintReport || translationMutation.isPending} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${darkMode ? "border-[#3a514c] bg-[#20332f] hover:bg-[#29413b]" : "border-[#d7e1da] bg-white hover:bg-[#f5f8f4]"}`} data-testid="button-print-dashboard-zh">
                {translationMutation.isPending && preparingLanguage === "zh" ? <LoaderCircle size={14} className="animate-spin" /> : <Printer size={14} />}
                {translationMutation.isPending && preparingLanguage === "zh" ? "Preparing Chinese…" : "Print Chinese report"}
              </button>
            </div>
            <button type="button" onClick={() => setDarkMode((value) => !value)} aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"} className={`flex h-9 w-9 items-center justify-center rounded-lg border ${darkMode ? "border-[#3a514c] bg-[#20332f]" : "border-[#d7e1da] bg-white"}`} data-testid="button-toggle-theme">
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>
        <div className="no-print mb-4 text-right">
          <p className={`text-[11px] ${softText}`}>Each print is one language only. DeepSeek translates any needed text on demand; saved responses are not changed.</p>
          {translationError && <p role="alert" className="mt-1 text-xs text-[#a34f3c]">{translationError}</p>}
          {!canPrintReport && !translationMutation.isPending && (
            <p role="status" className={`mt-1 text-xs ${softText}`}>
              {!parent || !teacher
                ? "Select one parent/home and one teacher/classroom record below."
                : !comparison
                  ? "Generate or regenerate the combined report below. Printing becomes available when it matches these selected records."
                  : "Regenerate the combined report below so it includes an overall summary before printing."}
            </p>
          )}
        </div>

        <section className={`${panelClass} overflow-hidden rounded-2xl`}>
          <div className={`border-b px-5 py-6 sm:px-8 sm:py-8 ${darkMode ? "border-[#304743] bg-[linear-gradient(110deg,#203832,#1d302c_54%,#26352d)]" : "border-[#e0e8df] bg-[linear-gradient(110deg,#e8f1e9,#fffefa_58%,#f4edda)]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[.16em] ${darkMode ? "border-[#47655d] bg-[#233c35] text-[#b9d4c9]" : "border-[#cfded1] bg-[#f8fbf6] text-[#477264]"}`}>
                  <BookOpenText size={13} /> {copy.staffReview}
                </div>
                <h1 className={`font-display text-3xl font-bold tracking-tight sm:text-[38px] ${darkMode ? "text-[#eef4ee]" : "text-[#1c332d]"}`}>{copy.title}</h1>
                <p className="print-only mt-1 text-xs font-semibold uppercase tracking-wide">{copy.finalReport}</p>
                <p className={`mt-2 max-w-2xl text-sm leading-relaxed sm:text-base ${softText}`}>
                  {copy.reportScope}
                </p>
              </div>
              <div className={`rounded-xl border px-4 py-3 ${darkMode ? "border-[#405951] bg-[#20352f]" : "border-[#d7e2d8] bg-[#fffefa]/80"}`}>
                <p className={`text-[10px] font-bold uppercase tracking-[.14em] ${softText}`}>{copy.caseReference}</p>
                <p className="mt-1 font-mono text-sm font-semibold" data-testid="text-case-reference">{caseId || "—"}</p>
                <p className={`mt-1 text-xs ${softText}`}>{copy.sourceCount(administrations.length)}</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className={`flex items-center gap-3 rounded-xl border p-3 ${darkMode ? "border-[#41635a] bg-[#1e352f]" : "border-[#cddfd6] bg-[#f7fbf7]"}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#dcece4] text-[#286e60]"><Home size={17} /></span>
                <div><p className="text-[10px] font-bold uppercase tracking-[.13em]" style={{ color: parentInk }}>{copy.parentSource}</p><p className={`mt-0.5 text-xs ${softText}`}>{copy.parentObservation}</p></div>
              </div>
              <div className={`flex items-center gap-3 rounded-xl border p-3 ${darkMode ? "border-[#6b5940] bg-[#393428]" : "border-[#e9dcc1] bg-[#fdf9ef]"}`}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f4e8cb] text-[#95651e]"><School size={17} /></span>
                <div><p className="text-[10px] font-bold uppercase tracking-[.13em]" style={{ color: teacherInk }}>{copy.teacherSource}</p><p className={`mt-0.5 text-xs ${softText}`}>{copy.teacherObservation}</p></div>
              </div>
            </div>
            <div className="print-only mt-5 rounded-lg border border-[#d8e0d8] bg-white p-3 text-xs text-[#364a42]">
              <p><strong>{copy.parentSource}:</strong> {copy.revision} {parent?.revision ?? "—"} · {copy.submitted} {formatDate(parent?.submittedAt, reportLanguage)}</p>
              <p className="mt-1"><strong>{copy.teacherSource}:</strong> {copy.revision} {teacher?.revision ?? "—"} · {copy.submitted} {formatDate(teacher?.submittedAt, reportLanguage)}</p>
            </div>
          </div>

          <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(250px,.72fr)_minmax(0,1.5fr)] lg:p-7">
            <section className="no-print space-y-4">
              <div>
                <p className={`mb-2 text-[10px] font-bold uppercase tracking-[.16em] ${softText}`}>Select source records</p>
                <div className="space-y-3">
                  <label className="block">
                    <span className={`mb-1.5 flex items-center gap-2 text-xs font-semibold ${darkMode ? "text-[#c7d5ce]" : "text-[#3c5149]"}`}><Home size={14} style={{ color: parentInk }} /> Parent / home observation</span>
                    <select value={parentId} onChange={(event) => setParentId(event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#78aa98] ${darkMode ? "border-[#405851] bg-[#192a26] text-[#edf3ed]" : "border-[#d6e0d8] bg-white text-[#263b34]"}`} data-testid="select-parent-record">
                      {parentRecords.length === 0 && <option value="">No parent/home record</option>}
                      {parentRecords.map((record) => <option key={record.assignmentId} value={record.assignmentId}>{record.respondentLabel} · {record.formName} · rev {record.revision}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className={`mb-1.5 flex items-center gap-2 text-xs font-semibold ${darkMode ? "text-[#c7d5ce]" : "text-[#3c5149]"}`}><School size={14} style={{ color: teacherInk }} /> Teacher / classroom observation</span>
                    <select value={teacherId} onChange={(event) => setTeacherId(event.target.value)} className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#d2ac65] ${darkMode ? "border-[#514b3b] bg-[#2b2922] text-[#edf3ed]" : "border-[#e4dbc7] bg-white text-[#263b34]"}`} data-testid="select-teacher-record">
                      {teacherRecords.length === 0 && <option value="">No teacher/classroom record</option>}
                      {teacherRecords.map((record) => <option key={record.assignmentId} value={record.assignmentId}>{record.respondentLabel} · {record.formName} · rev {record.revision}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              <div className={`rounded-xl border p-4 ${subtlePanel}`}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-[.14em] ${softText}`}>Source record status</p>
                    <p className="mt-1 text-sm font-semibold">Two separate perspectives</p>
                  </div>
                  <Info size={16} className={softText} />
                </div>
                <div className="mt-4 space-y-3">
                  {[{ label: "Parent / home", record: parent, color: parentInk }, { label: "Teacher / classroom", record: teacher, color: teacherInk }].map(({ label, record, color }) => (
                    <div key={label} className="flex items-start justify-between gap-3 border-t border-current/10 pt-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold" style={{ color }}>{label}</p>
                        <p className={`mt-1 truncate text-xs ${softText}`}>{record?.respondentLabel || "No matching record"}</p>
                        <p className={`mt-1 text-[10px] ${softText}`}>{record ? `Revision ${record.revision} · submitted ${formatDate(record.submittedAt)}` : "A source record is required to compare."}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${record?.status.toLowerCase() === "submitted" ? "bg-[#e2eee6] text-[#286e60]" : darkMode ? "bg-[#3b4035] text-[#d2c7a5]" : "bg-[#f4ead0] text-[#805d20]"}`}>
                        {record ? statusLabel(record.status) : "missing"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl border p-4 ${darkMode ? "border-[#496257] bg-[#20352f]" : "border-[#cdded2] bg-[#f5faf5]"}`}>
                <div className="flex items-start gap-3">
                  <Sparkles size={17} className="mt-0.5 shrink-0 text-[#6d9d82]" />
                  <div>
                    <p className="text-sm font-semibold">Generate the combined report</p>
                    <p className={`mt-1 text-xs leading-relaxed ${softText}`}>Uses the full set of responses to create separate home and classroom summaries, a clear comparison interpretation, and student-focused recommendations. Source-specific scores remain separate.</p>
                  </div>
                </div>
                <button type="button" onClick={handleGenerate} disabled={!canGenerate} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#286e60] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#205b50] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-generate-comparison">
                  {comparisonMutation.isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={15} />}
                  {comparisonMutation.isPending ? "Generating report…" : "Generate combined report"}
                </button>
                {!canGenerate && (
                  <p className={`mt-2 text-[11px] leading-relaxed ${softText}`}>
                    {!parent || !teacher ? "Select one parent/home and one teacher/classroom record." :
                      !["submitted", "under_review", "approved"].includes(parent.status.toLowerCase()) || !["submitted", "under_review", "approved"].includes(teacher.status.toLowerCase()) || !parent.submittedAt || !teacher.submittedAt ? "Both selected records must be submitted, under review, or approved, with a submission date." :
                        "No shared domain labels are available for this selection."}
                  </p>
                )}
                {comparisonMutation.isError && !comparison && <p className="mt-2 text-xs text-[#a34f3c]">The response failed after generation. Refresh the dashboard before retrying; a saved comparison may already exist, and another generation may use DeepSeek again.</p>}
              </div>
            </section>

            <section className="min-w-0 space-y-5">
              <div className={`rounded-xl border p-4 sm:p-5 ${darkMode ? "border-[#3c554e] bg-[#1a2c28]" : "border-[#dce5dd] bg-[#fffefa]"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                  <div className={`text-[10px] font-bold uppercase tracking-[.16em] ${softText}`}>{copy.sharedDomains}</div>
                    <h2 className="mt-1 text-lg font-semibold">{copy.domainsSideBySide}</h2>
                    <p className={`mt-1 text-xs ${softText}`}>{copy.sharedDomainCount(sharedDomains.length)}</p>
                  </div>
                  <button type="button" onClick={exportCsv} disabled={sharedDomains.length === 0} className={`no-print inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${darkMode ? "border-[#3a514b] bg-[#223631]" : "border-[#d9e3da] bg-white hover:bg-[#f5f8f4]"}`} data-testid="button-export-chart-csv">
                    <Download size={14} /> Export chart CSV
                  </button>
                </div>
                <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px]">
                  <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#5b9d87]" /> {copy.parentMean}</span>
                  <span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-[#c99442]" /> {copy.teacherMean}</span>
                  <span className={`${softText}`}>{copy.descriptiveScale}</span>
                </div>
                {sharedDomains.length > 0 ? (
                  <div className="mt-5 space-y-4">
                    {sharedDomains.map(({ name, parentDomain, teacherDomain }) => (
                      <div key={name} className="grid gap-2 sm:grid-cols-[minmax(130px,.75fr)_minmax(0,2fr)] sm:items-center" data-testid={`chart-domain-${parentDomain.id}`}>
                        <span className="text-xs font-semibold leading-snug">{reportText(`domainNames.${parentDomain.id}`, name)}</span>
                        <div className="space-y-1.5">
                          {[{ source: copy.parentHome, domain: parentDomain, color: "#5b9d87" }, { source: copy.teacherClassroom, domain: teacherDomain, color: "#c99442" }].map(({ source, domain, color }) => (
                            <div key={`${name}-${source}`} className="flex items-center gap-2">
                              <span className={`w-[92px] shrink-0 text-[10px] ${softText}`}>{source}</span>
                              <div className={`h-3 flex-1 overflow-hidden rounded-sm ${darkMode ? "bg-[#2b413b]" : "bg-[#e9eee9]"}`}>
                                {domain.mean !== null && <div className="h-full rounded-sm transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, (domain.mean / maxMean) * 100))}%`, backgroundColor: color }} />}
                              </div>
                              <span className="w-10 text-right font-mono text-xs font-semibold">{domain.mean === null ? "—" : domain.mean.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className={`flex justify-between border-t border-current/10 pt-3 text-[10px] ${softText}`}><span>{copy.scaledBars}</span><span>{copy.missingMeans}</span></div>
                  </div>
                ) : (
                  <div className={`mt-5 rounded-xl border border-dashed p-8 text-center ${darkMode ? "border-[#42574f]" : "border-[#d9e2da]"}`}>
                    <BookOpenText size={21} className={`mx-auto ${softText}`} />
                    <p className="mt-2 text-sm font-semibold">{copy.noSharedDomains}</p>
                    <p className={`mx-auto mt-1 max-w-md text-xs leading-relaxed ${softText}`}>{copy.chooseMatchingRecords}</p>
                  </div>
                )}
              </div>

              {comparisonIsStale && savedComparison && (
                  <div className={`no-print rounded-xl border p-4 ${darkMode ? "border-[#765f3d] bg-[#393327]" : "border-[#e7d7b5] bg-[#fcf7e9]"}`} data-testid="status-stale-snapshot">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={17} className="mt-0.5 shrink-0 text-[#a77827]" />
                    <div>
                      <p className="text-sm font-semibold">Saved comparison is stale</p>
                      <p className={`mt-1 text-xs leading-relaxed ${softText}`}>The saved snapshot does not match the selected record IDs or revisions, so it is not shown as current. Generate a new snapshot when both selected records are submitted.</p>
                    </div>
                  </div>
                </div>
              )}

              {comparisonNeedsRefresh && (
                <div className={`no-print rounded-xl border p-4 ${darkMode ? "border-[#765f3d] bg-[#393327]" : "border-[#e7d7b5] bg-[#fcf7e9]"}`} data-testid="status-comparison-needs-refresh">
                  <p className="text-sm font-semibold">Regenerate this comparison for the complete report</p>
                  <p className={`mt-1 text-xs leading-relaxed ${softText}`}>This saved snapshot predates the overall student summary. Generate a new comparison to include a whole-response summary and recommendations based on both respondents.</p>
                </div>
              )}

              {comparison && (
                <div className={`${panelClass} rounded-xl p-5`} data-testid="card-generated-comparison">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-current/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-[#3d826e]"><Check size={15} /><span className="text-[10px] font-bold uppercase tracking-[.15em]">{copy.currentReport}</span></div>
                      <h2 className="mt-1 text-lg font-semibold">{copy.reportTitle}</h2>
                    </div>
                    <span className={`text-xs ${softText}`}>{copy.generated} {formatDate(comparison.generatedAt, reportLanguage)}</span>
                  </div>
                  <p className={`mt-3 text-xs leading-relaxed ${softText}`}>
                    {copy.aiDisclosure}
                  </p>
                  <article className={`mt-4 rounded-lg border p-4 ${subtlePanel}`} data-testid="report-overall-summary">
                    <h3 className="text-xs font-bold uppercase tracking-[.12em]">{copy.overallSummary}</h3>
                    <div className="mt-2">
                      <FormattedReportText text={reportText("comparison.overallSummary", comparison.content.overallSummary?.trim() || copy.regenerateSummary)} />
                    </div>
                  </article>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <article className={`rounded-lg border-l-[3px] p-4 ${subtlePanel}`} style={{ borderLeftColor: parentInk }}>
                      <h3 className="text-xs font-bold uppercase tracking-[.12em]" style={{ color: parentInk }}>{copy.parentHome}</h3>
                      <div className="mt-2"><FormattedReportText text={reportText("comparison.parentHome", comparison.content.parentHome)} domainLabels={comparisonDomainLabels} /></div>
                    </article>
                    <article className={`rounded-lg border-l-[3px] p-4 ${subtlePanel}`} style={{ borderLeftColor: teacherInk }}>
                      <h3 className="text-xs font-bold uppercase tracking-[.12em]" style={{ color: teacherInk }}>{copy.teacherClassroom}</h3>
                      <div className="mt-2"><FormattedReportText text={reportText("comparison.teacherClassroom", comparison.content.teacherClassroom)} domainLabels={comparisonDomainLabels} /></div>
                    </article>
                    <article className={`rounded-lg border p-4 md:col-span-2 ${subtlePanel}`}>
                      <h3 className={`text-xs font-bold uppercase tracking-[.12em] ${softText}`}>{copy.comparisonInterpretation}</h3>
                      <div className="mt-2">
                        <FormattedReportText
                          text={reportText("comparison.crossSetting", comparison.content.crossSetting)}
                          domainLabels={comparisonDomainLabels}
                        />
                      </div>
                    </article>
                  </div>
                  {comparison.content.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em]"><FileText size={14} /> {copy.recommendations}</h3>
                      <ol className="mt-2 space-y-2">
                        {comparison.content.recommendations.map((recommendation, index) => <li key={`recommendation-${index}`} className={`flex gap-3 rounded-lg border p-3 text-sm leading-relaxed ${subtlePanel}`}><span className="font-mono text-xs font-bold text-[#4e8b76]">{String(index + 1).padStart(2, "0")}</span><span>{reportText(`comparison.recommendations.${index}`, recommendation)}</span></li>)}
                      </ol>
                    </div>
                  )}
                  {comparison.content.limitations && (
                    <div className={`mt-4 border-t border-current/10 pt-3 text-xs leading-relaxed ${softText}`}>
                      <strong>{copy.limitations}</strong>
                      <div className="mt-1">
                        <FormattedReportText text={reportText("comparison.limitations", comparison.content.limitations)} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-[.16em] ${softText}`}>{copy.inspectSource}</p>
              <h2 className="mt-1 text-xl font-semibold">{copy.evidenceByDomain}</h2>
            </div>
            <p className={`hidden text-xs sm:block ${softText}`}>{copy.expandItems}</p>
          </div>
          {sharedDomains.length ? (
            <div className="space-y-3">
              {sharedDomains.map(({ name, parentDomain, teacherDomain }) => (
                <section key={`evidence-${name}`} className={`${panelClass} rounded-xl`} data-testid={`section-domain-${parentDomain.id}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${darkMode ? "bg-[#29443b] text-[#b8d6c8]" : "bg-[#e6f0e8] text-[#42735d]"}`}>{reportLanguage === "zh" ? "域" : String(parentDomain.id).slice(0, 1).toUpperCase()}</span>
                      <div><h3 className="text-sm font-semibold">{reportText(`domainNames.${parentDomain.id}`, name)}</h3><p className={`mt-0.5 text-[10px] ${softText}`}>{copy.parentItems(parentDomain.itemResponses.length)} · {copy.teacherItems(teacherDomain.itemResponses.length)}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex gap-3 font-mono text-xs">
                        <span style={{ color: parentInk }}>{copy.parentShort} {parentDomain.mean === null ? "—" : parentDomain.mean.toFixed(2)}</span>
                        <span style={{ color: teacherInk }}>{copy.teacherShort} {teacherDomain.mean === null ? "—" : teacherDomain.mean.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 border-t border-current/10 p-3 sm:p-4 lg:grid-cols-2">
                    {renderSourceDetails(parentDomain, "parent")}
                    {renderSourceDetails(teacherDomain, "teacher")}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className={`${panelClass} rounded-xl p-6 text-center`}>
              <p className="text-sm font-semibold">{copy.noSourceDetails}</p>
              <p className={`mt-1 text-xs ${softText}`}>{copy.separateSources}</p>
            </div>
          )}
        </section>

        <footer className={`mt-6 rounded-xl border p-4 ${darkMode ? "border-[#3e554d] bg-[#1c302b]" : "border-[#dbe4db] bg-[#edf3ed]"}`}>
          <div className="flex items-start gap-3">
            <Info size={16} className={`mt-0.5 shrink-0 ${softText}`} />
            <div>
              <p className="text-xs font-semibold">{copy.accountingTitle}</p>
              <p className={`mt-1 text-xs leading-relaxed ${softText}`}>
                {copy.accounting}
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
