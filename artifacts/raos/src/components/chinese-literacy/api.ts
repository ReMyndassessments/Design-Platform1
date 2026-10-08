export const INSTRUMENT_ID = "REMYND_CHINESE_LITERACY_TEACHER_OBSERVATION";
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
    headers: { ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}), ...(opts.staff ? staffHeaders() : {}) },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, json);
  return json as T;
}
export const formUrl = (token: string) => `/api/external/form/${encodeURIComponent(token)}/chinese-literacy`;
export const caseUrl = (caseId: string) => `/api/cases/${encodeURIComponent(caseId)}/chinese-literacy`;
export async function downloadExport(caseId: string, assignmentId: string, format: "html" | "doc") {
  const res = await fetch(`${base()}${caseUrl(caseId)}/${encodeURIComponent(assignmentId)}/export?format=${format}`, { headers: staffHeaders() });
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (format === "html") {
    window.open(url, "_blank", "noopener");
  } else {
    const a = document.createElement("a");
    a.href = url; a.download = `chinese-literacy-${assignmentId}.doc`; document.body.appendChild(a); a.click(); a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
