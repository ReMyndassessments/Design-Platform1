import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { QuestionnaireTestStatus } from "@/components/QuestionnaireTestStatus";
import { normalizeTestLanguage, type PreviewCheck, type QuestionnaireTestResult } from "@/lib/form-test-review";

const CHECKLIST = [
  { key: "correctForm", label: "The assigned form, version, respondent type, and expected sections are correct." },
  { key: "contentLanguage", label: "Instructions, questions, options, and the assigned language display correctly." },
  { key: "controls", label: "I exercised the relevant controls, grids, and conditional questions; required-answer validation works." },
  { key: "safeTesting", label: "This was a staff dry run, not a real respondent submission. No live responses or emails were created." },
] as const;

export function QuestionnaireTestResultPanel({
  caseId, assignmentId, fingerprint, assignedLanguage, validation, result, onSaved, onStale,
}: {
  caseId: string;
  assignmentId: string;
  fingerprint: string;
  assignedLanguage: string;
  validation: PreviewCheck | null;
  result?: QuestionnaireTestResult;
  onSaved: (result: QuestionnaireTestResult) => void;
  onStale: () => void;
}) {
  const queryClient = useQueryClient();
  const [checklist, setChecklist] = useState({ correctForm: false, contentLanguage: false, controls: false, safeTesting: false });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState<"passed" | "failed" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedOutcome, setSavedOutcome] = useState<"passed" | "failed" | null>(null);
  const [savedAcrossCases, setSavedAcrossCases] = useState(false);
  const [coveredCount, setCoveredCount] = useState(1);
  const [rechecking, setRechecking] = useState(false);
  const hasPassed = result?.status === "passed";
  const languageMatches = normalizeTestLanguage(validation?.language ?? "") === normalizeTestLanguage(assignedLanguage);
  const canPass = Boolean(validation?.passed && languageMatches && CHECKLIST.every(item => checklist[item.key]));

  const recordResult = async (outcome: "passed" | "failed") => {
    if (saving || (outcome === "passed" && !canPass) || (outcome === "failed" && notes.trim().length < 10)) return;
    setSaving(outcome);
    setError(null);
    setSaved(false);
    setSavedOutcome(null);
    setSavedAcrossCases(false);
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${apiBase}/api/cases/${encodeURIComponent(caseId)}/assignments/${encodeURIComponent(assignmentId)}/staff-test-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
        body: JSON.stringify({
          fingerprint,
          result: outcome,
          language: validation?.language || assignedLanguage,
          notes: notes.trim(),
          checklist,
          ...(outcome === "passed" ? { answers: validation?.answers ?? {} } : {}),
        }),
      });
      const body = await response.json().catch(() => null) as { testResult?: QuestionnaireTestResult; coveredAssignmentCount?: number; message?: string } | null;
      if (!response.ok || !body?.testResult) {
        if (response.status === 409) onStale();
        throw new Error(body?.message ?? "The test result could not be recorded.");
      }
      onSaved(body.testResult);
      setSaved(true);
      setSavedOutcome(outcome);
      setSavedAcrossCases(body.testResult.sharedAcrossCases === true);
      setCoveredCount(body.coveredAssignmentCount ?? 1);
      queryClient.setQueryData(
        [`/api/cases/${caseId}/assignments/${assignmentId}/staff-preview`],
        (previous: Record<string, unknown> | undefined) => previous ? { ...previous, testResult: body.testResult } : previous,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          predicate: query => {
            const key = query.queryKey[0];
            return typeof key === "string" &&
              key.startsWith("/api/cases/") &&
              key.includes("/assignments/") &&
              key.endsWith("/staff-preview");
          },
        }),
        queryClient.invalidateQueries({
          predicate: query => {
            const key = query.queryKey[0];
            return typeof key === "string" &&
              key.startsWith("/api/cases/") &&
              key.endsWith("/battery-review");
          },
        }),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The test result could not be recorded.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <section className="mt-6 space-y-4 rounded-xl border border-violet-200 bg-violet-50/50 p-4" aria-label="Record questionnaire test result">
      <div>
        <h2 className="font-semibold text-slate-900">Record questionnaire test result</h2>
        <p className="mt-1 text-xs text-slate-600">Version {fingerprint.slice(0, 12)} · Assigned language: {normalizeTestLanguage(assignedLanguage)}</p>
        <QuestionnaireTestStatus result={result} />
      </div>
      {hasPassed && !rechecking ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-800">
            {result?.sharedAcrossCases
              ? "An identical form was already checked across cases. You don’t need to fill it out or check it again."
              : "This form has already passed. You don’t need to fill it out or check it again."}
          </p>
          <Button type="button" variant="outline" data-testid="button-recheck-identical-form" onClick={() => setRechecking(true)}>
            Test again
          </Button>
        </div>
      ) : (
      <>
      <p className="text-sm text-slate-600">
        Complete the test answers, select <strong>Check form</strong>, and confirm the checks below before recording a pass.
        This records questionnaire functionality—not scoring accuracy or clinical validation.
      </p>
      <p className="text-sm text-slate-600">
        One recorded pass covers forms with identical content, language, and version across cases.
      </p>
      <div className="space-y-3">
        {CHECKLIST.map(item => (
          <label key={item.key} className="flex cursor-pointer items-start gap-3 text-sm text-slate-800">
            <input type="checkbox" checked={checklist[item.key]} disabled={Boolean(saving)}
              data-testid={`checkbox-test-${item.key}`}
              onChange={event => { setChecklist(previous => ({ ...previous, [item.key]: event.target.checked })); setSaved(false); }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-violet-700" />
            {item.label}
          </label>
        ))}
      </div>
      <p className={`text-xs font-medium ${validation?.passed ? "text-emerald-800" : "text-slate-600"}`}>
        {validation?.passed ? "Required-answer check passed for the current test answers." : "Required-answer check has not passed for the current test answers."}
      </p>
      {!languageMatches && <p role="alert" className="text-sm text-amber-800">Switch back to the assigned language and check the form again before recording a pass.</p>}
      <div className="space-y-2">
        <label htmlFor="questionnaire-test-notes" className="text-sm font-medium text-slate-800">Notes <span className="font-normal text-slate-500">(at least 10 characters for a failed test)</span></label>
        <Textarea id="questionnaire-test-notes" data-testid="input-test-notes" value={notes} maxLength={4000}
          disabled={Boolean(saving)} onChange={event => { setNotes(event.target.value); setSaved(false); }}
          placeholder="Describe any missing content, incorrect language, or form-control problems. Do not enter student details or test answers." />
      </div>
      {error && <p role="alert" data-testid="status-test-save-error" className="text-sm text-red-700">{error}</p>}
      {saved && <p role="status" data-testid="status-test-result-saved" className="text-sm font-medium text-emerald-800">
        {coveredCount > 1
          ? savedOutcome === "passed"
            ? `Pass recorded for ${coveredCount} identical forms ${savedAcrossCases ? "across cases" : "in this case"}. You don’t need to check the other copies.`
            : `Failed result recorded for ${coveredCount} identical forms ${savedAcrossCases ? "across cases" : "in this case"}.`
          : "Test result saved. It will remain visible after leaving this page."}
      </p>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" data-testid="button-record-test-pass" disabled={!canPass || Boolean(saving)} onClick={() => recordResult("passed")}>
          {saving === "passed" ? "Recording…" : "Record questionnaire pass"}
        </Button>
        <Button type="button" variant="outline" data-testid="button-record-test-fail" disabled={notes.trim().length < 10 || Boolean(saving)} onClick={() => recordResult("failed")}>
          {saving === "failed" ? "Recording…" : "Record failed test"}
        </Button>
      </div>
      <p className="text-xs text-slate-500">Only the result, checklist, reviewer, date, language, and notes are stored. On recording a pass, test answers are sent for a transient server check and are not stored.</p>
      </>
      )}
    </section>
  );
}