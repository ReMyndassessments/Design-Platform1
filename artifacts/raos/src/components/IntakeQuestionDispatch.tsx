import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { readIntakeQuestionAnswers } from "@/lib/intakeQuestionAnswers";

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

const teacherTypes = new Set(["teacher1", "teacher2", "referring_teacher", "special_needs_teacher", "school_counselor", "boarding_staff"]);

type EnglishTranslation = {
  sourceAnswer: string;
  translatedAnswers: string[] | null;
  translatedText: string | null;
};

function SubmittedResponse({ request, endpoint }: { request: Invitation; endpoint: string }) {
  const originalAnswers = readIntakeQuestionAnswers(request.answer, request.questions.length);
  const [translation, setTranslation] = useState<EnglishTranslation | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");
  const usableTranslation = translation?.sourceAnswer === request.answer &&
    (originalAnswers
      ? Array.isArray(translation?.translatedAnswers) &&
        translation.translatedAnswers.length === originalAnswers.length &&
        translation.translatedAnswers.every(answer => typeof answer === "string")
      : typeof translation?.translatedText === "string" && !!translation.translatedText.trim());
  const inEnglish = showEnglish && usableTranslation;
  const answers = inEnglish && originalAnswers ? translation!.translatedAnswers : originalAnswers;

  const toggleTranslation = async () => {
    if (usableTranslation) {
      setShowEnglish(value => !value);
      return;
    }
    setTranslating(true);
    setError("");
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(request.id)}/translate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!response.ok) throw new Error("Translation could not be generated");
      const result = await response.json() as EnglishTranslation;
      if (result.sourceAnswer !== request.answer ||
        (originalAnswers
          ? !Array.isArray(result.translatedAnswers) || result.translatedAnswers.length !== originalAnswers.length ||
            !result.translatedAnswers.every(answer => typeof answer === "string")
          : typeof result.translatedText !== "string" || !result.translatedText.trim())) {
        throw new Error("Response changed. Refresh the responses and try again.");
      }
      setTranslation(result);
      setShowEnglish(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Translation could not be generated");
    } finally {
      setTranslating(false);
    }
  };

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-medium text-indigo-700">View submitted response</summary>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" type="button" variant="outline" disabled={translating} onClick={() => void toggleTranslation()}>
          {translating && <Loader2 size={13} className="mr-1 animate-spin" />}
          {inEnglish ? "Show original response" : "View in English"}
        </Button>
        {inEnglish && <span className="text-xs text-slate-500">AI translation for review; the original response is unchanged.</span>}
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
      {answers
        ? <ol className="mt-3 space-y-3">
            {request.questions.map((question, index) => (
              <li key={index} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-700">{index + 1}. {question}</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-800">{answers[index]}</p>
              </li>
            ))}
          </ol>
        : <p className="mt-2 whitespace-pre-wrap text-slate-700">{inEnglish ? translation!.translatedText : request.answer}</p>}
    </details>
  );
}

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
  const [testing, setTesting] = useState(false);
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
    if (!window.confirm(`Invite ${name} (${email}) to answer the ${audience} questions in their ReMynd portal? The email contains a private portal link, not the questions themselves.`)) return;
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
    if (!window.confirm(`Resend the same questions and private portal link to ${request.recipientName} (${request.recipientEmail})?`)) return;
    setRetryingId(request.id);
    try {
      const response = await fetch(`${endpoint}/${encodeURIComponent(request.id)}/send`, {
        method: "POST",
        headers: authHeaders(),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || "Could not resend the questions. Please try again.");
      await refresh();
      toast({ title: "Questions resent", description: request.recipientEmail });
    } catch (error) {
      toast({ title: "Could not resend the questions", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  const sendTest = async () => {
    if (!window.confirm(`Email a test preview of the ${audience} portal to your signed-in account? You can try the answer boxes, but nothing can be saved or submitted; no invitation or response is created.`)) return;
    setTesting(true);
    try {
      const response = await fetch(`${endpoint}/test-email`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ audience }),
      });
      const result = await response.json().catch(() => ({})) as { recipientEmail?: string; message?: string };
      if (!response.ok) throw new Error(result.message || "Could not send the test email.");
      toast({ title: "Portal preview sent", description: `Sent to your account email: ${result.recipientEmail}. No invitation was created.` });
    } catch (error) {
      toast({ title: "Test email not sent", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const audienceRequests = requests.filter(item => item.audience === audience);
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-white/90 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h5 className="text-sm font-semibold text-slate-800">Send these questions</h5>
          <p className="text-xs text-slate-600">Send to one recipient at a time; repeat for as many people as needed. Each person opens their ReMynd portal; a new recipient's link will also show their forms when assigned later. You can resend any invitation below.</p>
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
        <Button size="sm" type="button" disabled={!selection || busy || testing || !questionCount} onClick={() => void send()}>
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
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={testing || busy || !questionCount} onClick={() => void sendTest()}>
          {testing ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Mail size={14} className="mr-2" />}
          Email me a portal preview
        </Button>
        <span className="text-xs text-slate-500">Opens a non-submitting ReMynd portal preview; the email contains no questions or student details.</span>
      </div>
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
              {request.answer && <SubmittedResponse request={request} endpoint={endpoint} />}
              <Button size="sm" variant="link" type="button" className="mt-1 h-auto p-0 text-xs"
                disabled={retryingId === request.id} onClick={() => void resend(request)}>
                {retryingId === request.id ? "Sending…" : request.sentAt ? "Resend questions and link" : "Retry sending"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}