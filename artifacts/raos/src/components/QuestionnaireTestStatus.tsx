import { TEST_STATUS_LABELS, type QuestionnaireTestResult } from "@/lib/form-test-review";

export function QuestionnaireTestStatus({ result }: { result?: QuestionnaireTestResult }) {
  const status = result?.status ?? "not_tested";
  const color = status === "passed"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : status === "failed"
      ? "border-red-200 bg-red-50 text-red-800"
      : status === "retest_required"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-600";
  return (
    <div className="mt-2 space-y-1">
      <span data-testid={`status-questionnaire-${status}`} className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${color}`}>
        {result?.sharedFromAssignmentId && status === "passed"
          ? "Passed — identical form already checked"
          : TEST_STATUS_LABELS[status]}
      </span>
      {result?.sharedFromAssignmentId && status === "passed" && (
        <p data-testid="status-questionnaire-shared-pass" className="text-xs text-emerald-800">
          Covered by {result.sharedFromLabel || "an identical form"} in this case. No separate check is needed.
        </p>
      )}
      {result?.sharedFromAssignmentId && status === "failed" && (
        <p className="text-xs text-red-700">
          An identical form failed its latest check. Correct the problem and check it again.
        </p>
      )}
      {result?.testedAt && (
        <p className="text-xs text-slate-500">
          {status === "retest_required" ? "Previous test: " : ""}
          {result.testedBy || "Staff reviewer"} · {new Date(result.testedAt).toLocaleString()}
          {result.language ? ` · ${result.language}` : ""}
        </p>
      )}
      {result?.notes && <p className="whitespace-pre-wrap break-words text-xs text-slate-600">{result.notes}</p>}
    </div>
  );
}