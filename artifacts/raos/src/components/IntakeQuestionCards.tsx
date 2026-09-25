import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText } from "lucide-react";

export type PortalQuestionRequest = {
  id: string;
  audience: "teacher" | "parent";
  questions: string[];
  answer: string | null;
  submittedAt: string | null;
  recipientName: string;
};

function QuestionCard({
  request, token, onSubmitted, preview = false, language = "english",
}: {
  request: PortalQuestionRequest;
  token: string;
  onSubmitted: () => void;
  preview?: boolean;
  language?: string;
}) {
  const [draft, setDraft] = useState(request.answer ?? "");
  const [editing, setEditing] = useState(!request.submittedAt);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(request.answer ?? "");
    setEditing(!request.submittedAt);
  }, [request.answer, request.submittedAt]);

  const isMandarin = language === "mandarin";
  const isKorean = language === "korean";
  const copy = {
    heading: request.audience === "teacher"
      ? (isMandarin ? "给老师的问题" : isKorean ? "교사에게 드리는 질문" : "Questions for your teacher")
      : (isMandarin ? "给家长或监护人的问题" : isKorean ? "부모 또는 보호자에게 드리는 질문" : "Questions for your parent or guardian"),
    guidance: isMandarin ? "请在下方统一回复这些问题。您可以按问题编号作答。" : isKorean ? "아래 질문에 하나의 답변으로 응답해 주세요. 번호를 맞춰 작성하셔도 됩니다." : "Please answer the questions below in one response. Number your answers to match the questions if helpful.",
    response: isMandarin ? "您的回复" : isKorean ? "답변" : "Your response",
    placeholder: isMandarin ? "在此填写或粘贴您的回复…" : isKorean ? "여기에 답변을 작성하거나 붙여넣으세요…" : "Write or paste your responses here…",
    submit: isMandarin ? "提交回复" : isKorean ? "답변 제출" : "Submit responses",
    submitting: isMandarin ? "正在提交…" : isKorean ? "제출 중…" : "Submitting…",
    submitted: isMandarin ? "回复已提交" : isKorean ? "답변이 제출되었습니다" : "Responses submitted",
    edit: isMandarin ? "编辑并重新提交" : isKorean ? "수정 후 다시 제출" : "Edit and resubmit",
    failed: isMandarin ? "无法保存您的回复。您的文字仍在此处，请重试。" : isKorean ? "답변을 저장할 수 없습니다. 작성한 내용은 그대로 있으니 다시 시도해 주세요." : "Your response could not be saved. Your text is still here; please try again.",
  };

  const submit = async () => {
    if (preview) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/external/portal/${encodeURIComponent(token)}/intake-questions/${encodeURIComponent(request.id)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: draft.trim() }),
      });
      if (!response.ok) throw new Error("Unable to save response");
      setEditing(false);
      onSubmitted();
    } catch {
      setError(copy.failed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label={`${request.audience} questions`} data-testid={`card-intake-questions-${request.id}`}>
      <div className="h-1 bg-indigo-600" />
      <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <MessageSquareText size={19} />
          </div>
          <div>
          <h2 className="text-base font-bold text-slate-900">
            {copy.heading}
          </h2>
          {!preview && <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy.guidance}</p>}
          </div>
        </div>
        {!preview && request.submittedAt && <CheckCircle2 size={20} className="shrink-0 text-emerald-600" aria-label="Submitted" />}
      </div>
      <ol className="mt-5 space-y-3">
        {request.questions.map((question, index) => (
          <li key={index} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700">
            <span className="shrink-0 font-bold tabular-nums text-indigo-600">{String(index + 1).padStart(2, "0")}</span>
            <span>{question}</span>
          </li>
        ))}
      </ol>
      {preview ? null : editing ? (
        <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
          <label htmlFor={`portal-questions-${request.id}`} className="text-sm font-semibold text-slate-800">{copy.response}</label>
          <textarea
            id={`portal-questions-${request.id}`}
            value={draft}
            maxLength={20000}
            onChange={event => setDraft(event.target.value)}
            className="min-h-40 w-full rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            placeholder={copy.placeholder}
            data-testid={`input-intake-answer-${request.id}`}
          />
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end">
            <button type="button" disabled={submitting || !draft.trim()} onClick={submit}
              data-testid={`button-submit-intake-${request.id}`}
              className="rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />{copy.submitting}</span> : copy.submit}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 size={16} />{copy.submitted}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{request.answer}</p>
          <button type="button" className="mt-3 text-sm font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900" onClick={() => setEditing(true)}
            data-testid={`button-edit-intake-${request.id}`}>
            {copy.edit}
          </button>
        </div>
      )}
      </div>
    </section>
  );
}

export function IntakeQuestionCards({
  requests, token, onSubmitted, preview = false, language = "english",
}: {
  requests: PortalQuestionRequest[] | undefined;
  token: string;
  onSubmitted: () => void;
  preview?: boolean;
  language?: string;
}) {
  if (!requests?.length) return null;
  return (
    <div className="space-y-4">
      {requests.map(request => <QuestionCard key={request.id} request={request} token={token} onSubmitted={onSubmitted} preview={preview} language={language} />)}
    </div>
  );
}