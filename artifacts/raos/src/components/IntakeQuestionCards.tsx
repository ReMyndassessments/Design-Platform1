import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

export type PortalQuestionRequest = {
  id: string;
  audience: "teacher" | "parent";
  questions: string[];
  answer: string | null;
  submittedAt: string | null;
  recipientName: string;
};

function QuestionCard({
  request, token, onSubmitted,
}: {
  request: PortalQuestionRequest;
  token: string;
  onSubmitted: () => void;
}) {
  const [draft, setDraft] = useState(request.answer ?? "");
  const [editing, setEditing] = useState(!request.submittedAt);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(request.answer ?? "");
    setEditing(!request.submittedAt);
  }, [request.answer, request.submittedAt]);

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/external/portal/${encodeURIComponent(token)}/intake-questions/${encodeURIComponent(request.id)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: draft.trim() }),
      });
      if (!response.ok) throw new Error("Your response could not be saved. Please try again.");
      setEditing(false);
      onSubmitted();
    } catch {
      setError("Your response could not be saved. Your text is still here; please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm" aria-label={`${request.audience} questions`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">
            {request.audience === "teacher" ? "Questions for your teacher" : "Questions for your parent or guardian"}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Please answer the questions below in one response. Number your answers to match the questions if helpful.
          </p>
        </div>
        {request.submittedAt && <CheckCircle2 size={20} className="shrink-0 text-emerald-600" aria-label="Submitted" />}
      </div>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
        {request.questions.map((question, index) => <li key={index} className="pl-1">{question}</li>)}
      </ol>
      {editing ? (
        <div className="mt-4 space-y-2">
          <label htmlFor={`portal-questions-${request.id}`} className="text-sm font-medium text-slate-700">Your response</label>
          <textarea
            id={`portal-questions-${request.id}`}
            value={draft}
            maxLength={20000}
            onChange={event => setDraft(event.target.value)}
            className="min-h-40 w-full rounded-lg border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="Write or paste your responses here…"
          />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end">
            <button type="button" disabled={submitting || !draft.trim()} onClick={submit}
              className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-indigo-800">
              {submitting ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />Submitting…</span> : "Submit responses"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-sm font-medium text-emerald-800">Responses submitted</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{request.answer}</p>
          <button type="button" className="mt-3 text-sm font-semibold text-indigo-700 underline" onClick={() => setEditing(true)}>
            Edit and resubmit
          </button>
        </div>
      )}
    </section>
  );
}

export function IntakeQuestionCards({
  requests, token, onSubmitted,
}: {
  requests: PortalQuestionRequest[] | undefined;
  token: string;
  onSubmitted: () => void;
}) {
  if (!requests?.length) return null;
  return (
    <div className="space-y-4">
      {requests.map(request => <QuestionCard key={request.id} request={request} token={token} onSubmitted={onSubmitted} />)}
    </div>
  );
}