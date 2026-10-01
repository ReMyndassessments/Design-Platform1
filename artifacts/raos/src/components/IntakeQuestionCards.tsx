import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MessageSquareText } from "lucide-react";
import { readIntakeQuestionAnswers, writeIntakeQuestionAnswers } from "@/lib/intakeQuestionAnswers";

export type PortalQuestionRequest = {
  id: string;
  audience: "teacher" | "parent";
  questions: string[];
  answer: string | null;
  submittedAt: string | null;
  recipientName: string;
  canEdit?: boolean;
};

function QuestionCard({
  request, token, onSubmitted, preview = false, hasAssessmentForms = false, language = "english",
}: {
  request: PortalQuestionRequest;
  token: string;
  onSubmitted: () => void;
  preview?: boolean;
  hasAssessmentForms?: boolean;
  language?: string;
}) {
  const [drafts, setDrafts] = useState<string[]>(
    () => readIntakeQuestionAnswers(request.answer, request.questions.length) ?? request.questions.map(() => ""),
  );
  const [editing, setEditing] = useState(!request.submittedAt);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [serverLocked, setServerLocked] = useState(false);
  const readOnly = !preview && (request.canEdit === false || serverLocked);
  const savedAnswers = readIntakeQuestionAnswers(request.answer, request.questions.length);

  useEffect(() => {
    setDrafts(readIntakeQuestionAnswers(request.answer, request.questions.length) ?? request.questions.map(() => ""));
    setEditing(!request.submittedAt);
  // A portal refresh returns a new questions array even when this invitation
  // has not changed. Do not discard an in-progress reply on that refetch.
  }, [request.answer, request.submittedAt, request.id, request.questions.length]);

  const isMandarin = language === "mandarin";
  const isKorean = language === "korean";
  const copy = {
    heading: request.audience === "teacher"
      ? (isMandarin ? "给教师或学校辅导员的问题" : isKorean ? "교사 또는 학교 상담사를 위한 질문" : "Questions for teachers and school counselors")
      : (isMandarin ? "给家长或监护人的问题" : isKorean ? "부모 또는 보호자에게 드리는 질문" : "Questions for parents and guardians"),
    guidance: isMandarin ? "请在每个问题下方的输入框填写答案，然后统一提交。" : isKorean ? "각 질문 아래의 입력란에 답변을 작성한 뒤 한 번에 제출해 주세요." : "Write your answer in the box below each question, then submit them together.",
    assessmentNote: hasAssessmentForms
      ? (isMandarin ? "这些是初步接收问题，并非评估量表。您已获分配的评估表格也可在此门户查看。" : isKorean ? "이 질문은 초기 접수 질문이며 평가 검사 문항이 아닙니다. 배정된 평가 양식은 이 포털에서 확인할 수 있습니다." : "These are preliminary intake questions, not the assessment battery. Your assigned assessment forms are also available in this portal.")
      : (isMandarin ? "这些是初步接收问题，并非评估量表。评估量表确定后，您将在此门户收到其他评估表格。" : isKorean ? "이 질문은 초기 접수 질문이며 평가 검사 문항이 아닙니다. 평가 도구 구성이 확정되면 추가 양식이 이 포털에 제공됩니다." : "These are preliminary intake questions, not the assessment battery. Additional forms will be sent through this portal once the assessment battery is finalized."),
    response: isMandarin ? "您的回答" : isKorean ? "답변" : "Your answer",
    placeholder: isMandarin ? "在此填写您的回答…" : isKorean ? "여기에 답변을 작성하세요…" : "Write your answer here…",
    submit: isMandarin ? "提交回复" : isKorean ? "답변 제출" : "Submit responses",
    submitting: isMandarin ? "正在提交…" : isKorean ? "제출 중…" : "Submitting…",
    submitted: isMandarin ? "回复已提交" : isKorean ? "답변이 제출되었습니다" : "Responses submitted",
    edit: isMandarin ? "编辑并重新提交" : isKorean ? "수정 후 다시 제출" : "Edit and resubmit",
    failed: isMandarin ? "无法保存您的回复。您的文字仍在此处，请重试。" : isKorean ? "답변을 저장할 수 없습니다. 작성한 내용은 그대로 있으니 다시 시도해 주세요." : "Your response could not be saved. Your text is still here; please try again.",
    missing: isMandarin ? "请在提交前回答每个问题。" : isKorean ? "제출하기 전에 모든 질문에 답변해 주세요." : "Please answer every question before submitting.",
    tooLong: isMandarin ? "回复总长度不能超过 20,000 个字符。请缩短答案后再试。" : isKorean ? "전체 답변은 20,000자를 초과할 수 없습니다. 답변을 줄인 뒤 다시 시도해 주세요." : "Your combined answers are too long (20,000 characters maximum). Please shorten them and try again.",
    preview: isMandarin ? "测试预览：您可以试填输入框，但这些答案不会保存，也无法提交。" : isKorean ? "테스트 미리보기: 입력란을 사용해 볼 수 있지만 답변은 저장되거나 제출되지 않습니다." : "Test preview: you can try the answer boxes, but nothing you type here will be saved or submitted.",
    previewSubmit: isMandarin ? "真实受访者会在此看到提交按钮。测试预览无法提交回复。" : isKorean ? "실제 응답자에게는 여기에 제출 버튼이 표시됩니다. 테스트 미리보기에서는 답변을 제출할 수 없습니다." : "Real respondents can submit their answers here. This button is disabled in the test preview.",
    previous: isMandarin ? "之前提交的统一回复" : isKorean ? "이전에 제출한 통합 답변" : "Previously submitted combined response",
    locked: isMandarin ? "这些初步接收回复已锁定，以保护用于分析的原始资料。如需补充信息，请联系评估团队。" : isKorean ? "분석에 사용된 원본 정보를 보호하기 위해 초기 접수 답변이 잠겼습니다. 추가 정보는 평가팀에 문의해 주세요." : "These intake responses are locked to protect the original information used in the analysis. Contact the assessment team with any additional information.",
  };

  const submit = async () => {
    if (preview || readOnly) return;
    if (drafts.length !== request.questions.length || drafts.some(answer => !answer.trim())) {
      setError(copy.missing);
      return;
    }
    const answer = writeIntakeQuestionAnswers(drafts);
    if (answer.length > 20000) {
      setError(copy.tooLong);
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/external/portal/${encodeURIComponent(token)}/intake-questions/${encodeURIComponent(request.id)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        if (failure?.error === "intake_response_locked") {
          setServerLocked(true);
          setEditing(false);
          onSubmitted();
          return;
        }
        throw new Error("Unable to save response");
      }
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
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{preview ? copy.preview : readOnly ? copy.locked : copy.guidance}</p>
          </div>
        </div>
        {!preview && request.submittedAt && <CheckCircle2 size={20} className="shrink-0 text-emerald-600" aria-label="Submitted" />}
      </div>
      <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-sm leading-relaxed text-indigo-900" role="note">
        {copy.assessmentNote}
      </p>
      <ol className="mt-5 space-y-4">
        {request.questions.map((question, index) => (
          <li key={index} className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-relaxed text-slate-700">
            <div className="flex gap-3">
              <span className="shrink-0 font-bold tabular-nums text-indigo-600">{String(index + 1).padStart(2, "0")}</span>
              <span className="font-medium text-slate-800">{question}</span>
            </div>
            {((editing && !readOnly) || preview) ? (
              <div className="mt-4">
                <label htmlFor={`portal-questions-${request.id}-${index}`} className="mb-1.5 block text-xs font-semibold text-slate-700">{copy.response} {index + 1}</label>
                <textarea
                  id={`portal-questions-${request.id}-${index}`}
                  value={drafts[index] ?? ""}
                  maxLength={5000}
                  rows={3}
                  onChange={event => {
                    setDrafts(previous => previous.map((item, i) => i === index ? event.target.value : item));
                    setError("");
                  }}
                  className="w-full min-h-24 resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder={copy.placeholder}
                  data-testid={`input-intake-answer-${request.id}-${index}`}
                />
              </div>
            ) : savedAnswers ? (
              <p className="mt-3 whitespace-pre-wrap border-t border-slate-200 pt-3 text-slate-700">{savedAnswers[index]}</p>
            ) : null}
          </li>
        ))}
      </ol>
      {!savedAnswers && request.answer && !preview && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold text-slate-700">{copy.previous}</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{request.answer}</p>
        </div>
      )}
      {preview ? (
        <div className="mt-6 flex flex-col items-end gap-2 border-t border-slate-100 pt-5">
          <p className="w-full text-xs leading-relaxed text-slate-600">{copy.previewSubmit}</p>
          <button type="button" disabled className="rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white opacity-50">
            {copy.submit}
          </button>
        </div>
      ) : editing && !readOnly ? (
        <div className="mt-6 space-y-2 border-t border-slate-100 pt-5">
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end">
            <button type="button" disabled={submitting} onClick={submit}
              data-testid={`button-submit-intake-${request.id}`}
              className="rounded-lg bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" />{copy.submitting}</span> : copy.submit}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 size={16} />{copy.submitted}</p>
          {readOnly ? <p className="mt-2 text-sm leading-relaxed text-emerald-900" data-testid={`notice-intake-locked-${request.id}`}>{copy.locked}</p> : <button type="button" className="mt-3 text-sm font-semibold text-indigo-700 underline underline-offset-2 hover:text-indigo-900" onClick={() => setEditing(true)}
            data-testid={`button-edit-intake-${request.id}`}>
            {copy.edit}
          </button>}
        </div>
      )}
      </div>
    </section>
  );
}

export function IntakeQuestionCards({
  requests, token, onSubmitted, preview = false, hasAssessmentForms = false, language = "english",
}: {
  requests: PortalQuestionRequest[] | undefined;
  token: string;
  onSubmitted: () => void;
  preview?: boolean;
  hasAssessmentForms?: boolean;
  language?: string;
}) {
  if (!requests?.length) return null;
  return (
    <div className="space-y-4">
      {requests.map(request => <QuestionCard key={request.id} request={request} token={token} onSubmitted={onSubmitted} preview={preview} hasAssessmentForms={hasAssessmentForms} language={language} />)}
    </div>
  );
}