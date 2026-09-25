import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Audience = "teacher" | "parent";
type AssignmentRecipient = {
  id: string;
  respondentType: string;
  respondentLabel?: string | null;
  assignedToName?: string | null;
  assignedToEmail?: string | null;
};
type Invitation = {
  id: string;
  audience: Audience;
  recipientName: string;
  recipientEmail: string;
  assignmentId: string | null;
  questions: string[];
  answer: string | null;
  sentAt: string | null;
  submittedAt: string | null;
};

const teacherTypes = new Set(["teacher1", "teacher2", "referring_teacher", "special_needs_teacher"]);

export function IntakeQuestionDispatch({
  caseId, audience, assignments, baseUrl, questionCount, parentName, parentEmail,
}: {
  caseId: string;
  audience: Audience;
  assignments: AssignmentRecipient[];
  baseUrl: string;
  questionCount: number;
  parentName?: string | null;
  parentEmail?: string | null;
}) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selection, setSelection] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const endpoint = `${baseUrl}/api/cases/${encodeURIComponent(caseId)}/intake-question-requests`;
  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
  });

  const recipients = useMemo(() => {
    const seen = new Set<string>();
    return assignments.filter(item => {
      const email = item.assignedToEmail?.trim().toLowerCase();
      if (!email || (audience === "parent" ? item.respondentType !== "parent" : !teacherTypes.has(item.respondentType))) return false;
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
  }, [assignments, audience]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { headers: authHeaders() });
      if (!response.ok) throw new Error("Unable to load invitations");
      const list = await response.json() as Invitation[];
      if (!Array.isArray(list)) throw new Error("Unexpected invitations response");
      setRequests(list);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const send = async () => {
    if (!selection || (selection === "new" && (!newName.trim() || !newEmail.trim()))) return;
    const selected = recipients.find(item => item.id === selection);
    const name = selected?.assignedToName || selected?.respondentLabel || newName.trim();
    const email = selected?.assignedToEmail || newEmail.trim();
    if (!window.confirm(`Send the ${audience} questions to ${name} (${email})? This will email a private portal link to this recipient only.`)) return;
    setBusy(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(selection === "new"
          ? { audience, recipientName: newName.trim(), recipientEmail: newEmail.trim() }
          : { audience, assignmentId: selection }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.message || result.error || "Invitation could not be sent");
      await refresh();
      toast({ title: "Questions sent", description: `A private link was sent to ${email}.` });
      setSelection("");
      setNewName("");
      setNewEmail("");
    } catch (error) {
      await refresh();
      toast({ title: "Questions not sent", description: error instanceof Error ? error.message : "Please retry the invitation below.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const resend = async (request: Invitation) => {
    if (!window.confirm(`Send the question link to ${request.recipientName} (${request.recipientEmail})?`)) return;
    setRetryingId(request.id);
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(request.id)}/send`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("Could not send the link. Please try again.");
      await refresh();
      toast({ title: "Question link sent", description: request.recipientEmail });
    } catch {
      toast({ title: "Could not send the link", variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  const audienceRequests = requests.filter(item => item.audience === audience);
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white/90 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h5 className="text-sm font-semibold text-slate-800">Send these questions</h5>
          <p className="text-xs text-slate-600">Choose one recipient. Existing portal recipients use their current link; others receive a question-only link.</p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => void refresh()} aria-label="Refresh recipient responses">
          <RefreshCw size={14} />
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`question-recipient-${audience}`} className="sr-only">Recipient for {audience} questions</label>
        <select id={`question-recipient-${audience}`} value={selection} onChange={event => {
          setSelection(event.target.value);
          if (event.target.value === "new" && audience === "parent") {
            setNewName(parentName ?? "");
            setNewEmail(parentEmail ?? "");
          }
        }} className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 text-sm">
          <option value="">Choose a {audience === "teacher" ? "teacher" : "parent / guardian"}…</option>
          {recipients.map(item => <option key={item.id} value={item.id}>
            {item.assignedToName || item.respondentLabel || "Existing recipient"} · {item.assignedToEmail}
          </option>)}
          <option value="new">{audience === "teacher" ? "Another teacher" : "Another parent / guardian"} (new link)</option>
        </select>
        <Button size="sm" type="button" disabled={!selection || busy || !questionCount} onClick={() => void send()}>
          {busy ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Mail size={14} className="mr-2" />}
          Send questions
        </Button>
      </div>
      {selection === "new" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <input aria-label="Recipient name" placeholder="Name" value={newName} onChange={event => setNewName(event.target.value)}
            maxLength={120} className="h-9 rounded-md border border-slate-300 px-2 text-sm" />
          <input aria-label="Recipient email" placeholder="Email address" type="email" value={newEmail}
            onChange={event => setNewEmail(event.target.value)} maxLength={254}
            className="h-9 rounded-md border border-slate-300 px-2 text-sm" />
        </div>
      )}
      {loadError && <p role="alert" className="text-xs text-red-700">Could not load question invitations. Use Refresh to try again.</p>}
      {!loading && audienceRequests.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          <h6 className="text-xs font-semibold text-slate-700">Recipient responses</h6>
          {audienceRequests.map(request => (
            <div key={request.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-800">{request.recipientName} · {request.recipientEmail}</span>
                <span className={`text-xs font-medium ${request.submittedAt ? "text-emerald-700" : request.sentAt ? "text-amber-700" : "text-red-700"}`}>
                  {request.submittedAt ? "Response received" : request.sentAt ? "Awaiting response" : "Not sent"}
                </span>
              </div>
              {request.answer && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-indigo-700">View submitted response</summary>
                  <p className="mt-2 whitespace-pre-wrap text-slate-700">{request.answer}</p>
                </details>
              )}
              <Button size="sm" variant="link" type="button" className="mt-1 h-auto p-0 text-xs"
                disabled={retryingId === request.id} onClick={() => void resend(request)}>
                {retryingId === request.id ? "Sending…" : request.sentAt ? "Resend link" : "Retry sending"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}