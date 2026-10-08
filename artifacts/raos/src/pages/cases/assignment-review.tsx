import { useCallback, useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormView, type StaffPreviewForm } from "@/pages/external/[token]";
import { QuestionnaireTestResultPanel } from "@/components/QuestionnaireTestResultPanel";
import { type PreviewCheck, type QuestionnaireTestResult } from "@/lib/form-test-review";

type StaffPreviewError = Error & { status?: number; examinerWorkflow?: boolean };

export default function AssignmentReviewPreviewPage() {
  const { id: caseId, assignmentId } = useParams<{ id: string; assignmentId: string }>();
  const [, setLocation] = useLocation();
  const { data: currentUser, isLoading: userLoading } = useGetCurrentUser();
  const canReview = currentUser?.role === "admin" || currentUser?.role === "psychometrician";
  const [language, setLanguage] = useState("english");
  const [validation, setValidation] = useState<PreviewCheck | null>(null);
  const [savedResult, setSavedResult] = useState<QuestionnaireTestResult | undefined>();
  const [quickTestRequest, setQuickTestRequest] = useState(0);
  const onPreviewCheck = useCallback((check: PreviewCheck) => setValidation(check), []);
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");

  const previewQuery = useQuery<StaffPreviewForm, StaffPreviewError>({
    queryKey: [`/api/cases/${caseId}/assignments/${assignmentId}/staff-preview`],
    enabled: Boolean(canReview && caseId && assignmentId),
    retry: false,
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const response = await fetch(
        `${apiBase}/api/cases/${encodeURIComponent(caseId)}/assignments/${encodeURIComponent(assignmentId)}/staff-preview`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` } },
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string; error?: string } | null;
        const error = new Error(body?.message ?? "The assigned form preview could not be loaded.") as StaffPreviewError;
        error.status = response.status;
        error.examinerWorkflow = body?.error === "examiner_workflow";
        throw error;
      }
      return response.json() as Promise<StaffPreviewForm>;
    },
  });

  useEffect(() => {
    setLanguage("english");
    setSavedResult(undefined);
    setValidation(null);
    setQuickTestRequest(0);
  }, [assignmentId]);

  useEffect(() => {
    setSavedResult(previewQuery.data?.testResult);
  }, [previewQuery.data]);

  const goBack = () => setLocation(`/cases/${caseId}`);

  if (userLoading || (canReview && previewQuery.isLoading)) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        <p>Loading the assigned form for a safe staff review…</p>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert size={36} className="text-amber-600" />
        <h1 className="text-xl font-semibold text-slate-900">Staff review access required</h1>
        <p className="max-w-md text-sm text-slate-600">Only an admin or psychometrician can open assessment form dry runs.</p>
        <Button variant="outline" onClick={goBack} data-testid="button-review-back">
          <ArrowLeft size={16} className="mr-2" /> Back to case
        </Button>
      </div>
    );
  }

  if (previewQuery.isError && !previewQuery.data) {
    const message = previewQuery.error.status === 403
      ? "Your account does not have permission to preview this assignment."
      : previewQuery.error.message;
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <ShieldAlert size={36} className="text-amber-600" />
        <h1 className="text-xl font-semibold text-slate-900">
          {previewQuery.error.examinerWorkflow ? "Examiner assessment — no questionnaire test needed" : "Assigned form unavailable"}
        </h1>
        <p role="alert" data-testid="status-preview-error" className="max-w-md text-sm text-slate-600">{message}</p>
        <Button variant="outline" onClick={goBack} data-testid="button-review-back">
          <ArrowLeft size={16} className="mr-2" /> Back to case
        </Button>
      </div>
    );
  }

  if (!previewQuery.data) return null;

  return (
    <>
    <div className="mx-auto w-full max-w-3xl px-4 pb-5">
      <Button variant="ghost" onClick={goBack} data-testid="button-quick-test-back">
        <ArrowLeft size={16} className="mr-2" /> Back to case
      </Button>
      {previewQuery.data.testFingerprint && caseId && assignmentId ? (
        <QuestionnaireTestResultPanel
          key={previewQuery.data.testFingerprint}
          caseId={caseId}
          assignmentId={assignmentId}
          fingerprint={previewQuery.data.testFingerprint}
          assignedLanguage={previewQuery.data.language || "english"}
          validation={validation}
          result={savedResult}
          onSaved={setSavedResult}
          onStale={() => { setValidation(null); void previewQuery.refetch(); }}
          onQuickTest={() => { setValidation(null); setQuickTestRequest(value => value + 1); }}
        />
      ) : (
        <p role="alert" className="mt-6 text-sm text-red-700">Test recording is unavailable because the current form version could not be verified. Refresh the page.</p>
      )}
    </div>
    <FormView
      key={`${assignmentId}:${previewQuery.data.testFingerprint ?? ""}`}
      activeToken=""
      language={language || previewQuery.data.language || "english"}
      setLanguage={setLanguage}
      onBack={goBack}
      onSubmitted={goBack}
      previewMode
      previewForm={previewQuery.data}
      previewError={previewQuery.error?.message}
      onPreviewCheck={onPreviewCheck}
      quickTestRequest={quickTestRequest}
    />
    </>
  );
}