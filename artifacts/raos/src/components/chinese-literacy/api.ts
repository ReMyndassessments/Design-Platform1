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
export async function downloadExport(caseId: string, assignmentId: string, format: "html" | "doc", scope: "record" | "report" = "record") {
  const res = await fetch(`${base()}${caseUrl(caseId)}/${encodeURIComponent(assignmentId)}/export?format=${format}&scope=${scope}`, { headers: staffHeaders() });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (format === "html" && scope === "record") {
    window.open(url, "_blank", "noopener");
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = scope === "report" ? `chinese-literacy-report.${format}` : `chinese-literacy-${assignmentId}.doc`;
    document.body.appendChild(a); a.click(); a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
