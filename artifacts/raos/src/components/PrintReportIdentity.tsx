type PrintLanguage = "en" | "zh";

export type PrintReportIdentityProps = {
  studentName?: string | null;
  dob?: string | null;
  grade?: string | null;
  school?: string | null;
  languagePreference?: string | null;
  caseId?: string | null;
  reportTitle: string;
  respondent?: string | null;
  assessmentDate?: string | null;
  language?: PrintLanguage;
  className?: string;
};

const LABELS: Record<PrintLanguage, Record<string, string>> = {
  en: {
    student: "Student",
    dob: "Date of birth",
    age: "Age at report date",
    grade: "Grade / year",
    school: "School",
    language: "Primary language",
    case: "Case ID",
    respondent: "Respondent",
    assessmentDate: "Assessment date",
    reportDate: "Report date",
    notRecorded: "Not recorded",
  },
  zh: {
    student: "学生",
    dob: "出生日期",
    age: "报告日期时年龄",
    grade: "年级",
    school: "学校",
    language: "主要语言",
    case: "个案编号",
    respondent: "答题者",
    assessmentDate: "评估日期",
    reportDate: "报告日期",
    notRecorded: "未记录",
  },
};

function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: string | null | undefined, language: PrintLanguage): string | null {
  const date = parseLocalDate(value);
  return date
    ? new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", { dateStyle: "medium" }).format(date)
    : null;
}

function ageAtReportDate(value?: string | null): string | null {
  const birthDate = parseLocalDate(value);
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  if (
    today.getMonth() < birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())
  ) age--;
  return age >= 0 && age < 125 ? String(age) : null;
}

function todayAsLocalDate(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function printableStudentName(value: string | null | undefined, missing: string): string {
  const name = value?.trim();
  return name && !/^unnamed$/i.test(name) ? name : missing;
}

function identityRows(props: PrintReportIdentityProps) {
  const language = props.language ?? "en";
  const labels = LABELS[language];
  const missing = labels.notRecorded;
  const age = ageAtReportDate(props.dob);
  const languageNames: Record<string, Record<PrintLanguage, string>> = {
    english: { en: "English", zh: "英语" },
    mandarin: { en: "Mandarin", zh: "普通话" },
    cantonese: { en: "Cantonese", zh: "粤语" },
  };
  const rows: [string, string][] = [
    [labels.dob, formatDate(props.dob, language) ?? missing],
    [labels.age, age ?? missing],
    [labels.grade, props.grade?.trim() || missing],
    [labels.school, props.school?.trim() || missing],
    [labels.language, props.languagePreference ? languageNames[props.languagePreference]?.[language] ?? props.languagePreference : missing],
    [labels.case, props.caseId?.trim() || missing],
  ];
  if (props.respondent) rows.push([labels.respondent, props.respondent]);
  if (props.assessmentDate) rows.push([labels.assessmentDate, formatDate(props.assessmentDate, language) ?? props.assessmentDate]);
  rows.push(
    [labels.reportDate, formatDate(todayAsLocalDate(), language) ?? missing],
  );
  return rows;
}

export function PrintReportIdentity(props: PrintReportIdentityProps) {
  const language = props.language ?? "en";
  const labels = LABELS[language];
  const rows = identityRows(props);
  return (
    <section
      className={`print-only mb-6 border-b-2 border-slate-300 pb-4 text-slate-900 ${props.className ?? ""}`}
      data-testid="print-report-identity"
      lang={language === "zh" ? "zh-CN" : "en"}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">ReMynd · {props.reportTitle}</p>
      <h1 className="mb-3 text-2xl font-bold">{labels.student}: {printableStudentName(props.studentName, labels.notRecorded)}</h1>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="font-semibold">{label}</dt>
            <dd className={`min-w-0 ${label === labels.case ? "break-all" : "break-words"}`}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

/** HTML equivalent for report exports opened in a separate print window. */
export function createPrintReportIdentityHtml(props: PrintReportIdentityProps): string {
  const language = props.language ?? "en";
  const labels = LABELS[language];
  const rows = identityRows(props)
    .map(([label, value]) => {
      const wrapStyle = label === labels.case ? "word-break:break-all" : "overflow-wrap:anywhere";
      return `<div style="min-width:0"><strong style="display:block;margin-bottom:2px">${escapeHtml(label)}</strong><span style="display:block;${wrapStyle}">${escapeHtml(value)}</span></div>`;
    })
    .join("");
  return `<section lang="${language === "zh" ? "zh-CN" : "en"}" style="margin:0 0 24px;padding:0 0 16px;border-bottom:2px solid #cbd5e1;color:#0f172a;font-family:Arial,sans-serif">
    <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#64748b">ReMynd · ${escapeHtml(props.reportTitle)}</p>
    <h1 style="margin:0 0 12px;font-size:22px">${escapeHtml(labels.student)}: ${escapeHtml(printableStudentName(props.studentName, labels.notRecorded))}</h1>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 20px;font-size:11px">${rows}</div>
  </section>`;
}
