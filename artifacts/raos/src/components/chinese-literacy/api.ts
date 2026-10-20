import { createPrintReportIdentityHtml } from "@/components/PrintReportIdentity";

export const INSTRUMENT_ID = "REMYND_CHINESE_LITERACY_TEACHER_OBSERVATION";
export const PARENT_INSTRUMENT_ID = "REMYND_CHINESE_LITERACY_PARENT_OBSERVATION";
export const isParentKey = (k?: string | null) => k === PARENT_INSTRUMENT_ID;
let optionalAuth = false;
/** Parent saves send the staff header when a signed-in staff member enters a paper form. */
export const setOptionalStaffAuth = (b: boolean) => { optionalAuth = b; };
export const hasStaffToken = () => !!localStorage.getItem("raos_token");
const base = () => (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
export class ApiError extends Error {
  status: number; issues: string[]; body: any;
  constructor(status: number, body: any) {
    super(body?.message ?? body?.error ?? `Request failed (${status})`);
    this.status = status; this.body = body; this.issues = Array.isArray(body?.issues) ? body.issues : [];
  }
}
function staffHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${localStorage.getItem("raos_token")}` };
}
export async function clRequest<T>(path: string, opts: { method?: string; body?: unknown; staff?: boolean } = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: opts.method ?? "GET",
    headers: { ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(opts.staff || (optionalAuth && hasStaffToken()) ? staffHeaders() : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json);
  return json as T;
}
export const formUrl = (token: string) => `/api/external/form/${encodeURIComponent(token)}/chinese-literacy`;
export const metadataUrl = (instrument: string) => `/api/chinese-literacy/metadata?instrument=${encodeURIComponent(instrument)}`;
export const caseUrl = (caseId: string) => `/api/cases/${encodeURIComponent(caseId)}/chinese-literacy`;
export async function downloadExport(caseId: string, assignmentId: string, scope: "record" | "report" = "record") {
  const printWindow = window.open("about:blank", "_blank");
  if (!printWindow) throw new Error("The print window was blocked. Allow pop-ups for RAOS, then try again.");
  printWindow.document.write("<!doctype html><html><head><title>Preparing English report…</title></head><body style='font:16px Arial,sans-serif;padding:2rem;color:#334155'>Preparing the English report for printing…</body></html>");
  printWindow.document.close();
  let res: Response;
  try {
    res = await fetch(`${base()}${caseUrl(caseId)}/${encodeURIComponent(assignmentId)}/export?format=html&scope=${scope}`, { headers: staffHeaders(), credentials: "include" });
  } catch (error) {
    printWindow.close();
    throw error;
  }
  if (!res.ok) {
    printWindow.close();
    throw new ApiError(res.status, await res.json().catch(() => null));
  }
  const html = await res.text();
  let caseData: Record<string, unknown>;
  try {
    const caseResponse = await fetch(`${base()}/api/cases/${encodeURIComponent(caseId)}`, {
      headers: staffHeaders(),
      credentials: "include",
    });
    if (!caseResponse.ok) throw new ApiError(caseResponse.status, await caseResponse.json().catch(() => null));
    caseData = await caseResponse.json();
  } catch (error) {
    printWindow.close();
    throw error;
  }
  const toolbar = `<style>.raos-print-toolbar{position:sticky;top:0;z-index:99;display:flex;align-items:center;gap:12px;padding:12px 20px;background:#f1f5f9;border-bottom:1px solid #cbd5e1;font:14px Arial,sans-serif;color:#334155}.raos-print-toolbar button{border:0;border-radius:7px;background:#0879a8;color:#fff;padding:10px 16px;font-weight:700;cursor:pointer}.raos-print-toolbar span{font-size:12px}@media print{.raos-print-toolbar{display:none!important}}</style>`;
  const printAction = `<div class="raos-print-toolbar"><button type="button" onclick="window.print()">Print / Save as PDF</button><span>Choose “Save as PDF” in the print dialog. This export is in English; saved responses remain unchanged.</span></div>`;
  const identity = createPrintReportIdentityHtml({
    reportTitle: scope === "report" ? "Chinese Literacy Assessment Report" : "Chinese Literacy Final Report",
    studentName: typeof caseData.studentName === "string" ? caseData.studentName : "",
    dob: typeof caseData.dob === "string" ? caseData.dob : "",
    grade: typeof caseData.grade === "string" ? caseData.grade : "",
    school: typeof caseData.school === "string" ? caseData.school : "",
    languagePreference: typeof caseData.languagePreference === "string" ? caseData.languagePreference : "",
    caseId,
  });
  const printHtml = html
    .replace(/<head>/i, `<head>${toolbar}`)
    .replace(/<body([^>]*)>/i, `<body$1>${printAction}${identity}`);
  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    if (!printWindow.closed) printWindow.print();
  }, 400);
}
