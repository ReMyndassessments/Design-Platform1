import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle, Save } from "lucide-react";
import { IntakeQuestionDispatch } from "./IntakeQuestionDispatch";

type Audience = "teacher" | "parent";
type Turn = { role: "user" | "assistant"; text: string; at?: string };
type IntakeAnalysis = {
  suggestedQuestions?: Partial<Record<Audience, string[]>>;
  followUpAnswers?: Partial<Record<Audience, Record<string, string>>>;
  groupResponses?: Partial<Record<Audience, string>>;
  intakeDiscussion?: Turn[];
  leadContext?: string;
};

function GroupResponse({
  audience, saved, canEdit, onSave,
}: {
  audience: Audience; saved: string; canEdit: boolean;
  onSave: (audience: Audience, answer: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(saved);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(saved); }, [saved]);
  const label = audience === "teacher" ? "Teacher responses" : "Parent / Guardian responses";
  return (
    <div className="mt-3">
      {canEdit ? (
        <>
          <label htmlFor={`${audience}-group-response`} className="block text-xs font-medium text-slate-600 mb-1">
            {label} (one response for the full question set)
          </label>
          <textarea
            id={`${audience}-group-response`}
            className="w-full min-h-40 rounded-md border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder={`Enter all ${audience === "teacher" ? "teacher" : "parent / guardian"} responses here. You can number them to match the questions above.`}
            value={draft}
            maxLength={20000}
            onChange={e => setDraft(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <Button type="button" size="sm" disabled={saving || draft === saved} onClick={async () => {
              setSaving(true);
              try { await onSave(audience, draft); }
              catch { /* The parent already displays a save error; keep the draft. */ }
              finally { setSaving(false); }
            }}>
              {saving ? <Loader2 className="mr-1 animate-spin" size={14} /> : <Save className="mr-1" size={14} />}
              Save {audience} responses
            </Button>
          </div>
        </>
      ) : saved ? (
        <div className="rounded-md bg-white border border-slate-200 p-3">
          <p className="text-xs font-medium text-slate-600 mb-1">{label}</p>
          <p className="text-sm whitespace-pre-wrap text-slate-700">{saved}</p>
        </div>
      ) : null}
    </div>
  );
}

export function IntakeFollowUp({
  caseId, analysis, canEdit, onUpdated, baseUrl, leadContextDraft, onLeadContextChange, assignments, parentName, parentEmail,
}: {
  caseId: string; analysis: IntakeAnalysis; canEdit: boolean; onUpdated: () => Promise<unknown>;
  baseUrl: string; leadContextDraft: string; onLeadContextChange: (value: string) => void;
  assignments: Array<{ id: string; respondentType: string; respondentLabel?: string | null; assignedToName?: string | null; assignedToEmail?: string | null }>;
  parentName?: string | null; parentEmail?: string | null;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [asking, setAsking] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const token = () => localStorage.getItem("raos_token");
  const saveResponse = async (audience: Audience, answer: string) => {
    try {
      const r = await fetch(`${baseUrl}/api/cases/${encodeURIComponent(caseId)}/intake-group-response`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ audience, answer }),
      });
      if (!r.ok) throw new Error("Unable to save response");
      await onUpdated();
      toast({ title: "Response saved" });
    } catch {
      toast({ title: "Could not save response", variant: "destructive" });
      throw new Error("Response was not saved");
    }
  };
  const ask = async () => {
    if (!message.trim()) return;
    setAsking(true);
    try {
      const r = await fetch(`${baseUrl}/api/cases/${encodeURIComponent(caseId)}/intake-discussion`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ message: message.trim() }),
      });
      if (!r.ok) throw new Error("Unable to get advice");
      setMessage("");
      await onUpdated();
    } catch {
      toast({ title: "Could not get AI advice", description: "Your question was not cleared. Please try again.", variant: "destructive" });
    } finally {
      setAsking(false);
    }
  };
  const saveContext = async () => {
    setSavingContext(true);
    try {
      const r = await fetch(`${baseUrl}/api/cases/${encodeURIComponent(caseId)}/intake-lead-context`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ context: leadContextDraft }),
      });
      if (!r.ok) throw new Error("Unable to save context");
      await onUpdated();
      toast({ title: "Assessment lead clarification saved" });
    } catch {
      toast({ title: "Could not save clarification", variant: "destructive" });
    } finally {
      setSavingContext(false);
    }
  };
  const turns = Array.isArray(analysis.intakeDiscussion) ? analysis.intakeDiscussion : [];
  return (
    <div className="space-y-5">
      <section className="space-y-3" aria-label="Suggested questions and responses">
        <div>
          <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Suggested questions &amp; responses</h3>
          <p className="text-xs text-slate-500 mt-1">One response box per group. Number answers to match the questions if helpful. Saved responses are available to the AI advisor below.</p>
        </div>
        {(["teacher", "parent"] as const).map(audience => {
          const questions = analysis.suggestedQuestions?.[audience];
          const currentQuestions = Array.isArray(questions) ? questions : [];
          const individualAnswers = Object.entries(analysis.followUpAnswers?.[audience] ?? {})
            .filter(([, answer]) => Boolean(answer));
          const savedGroupResponse = analysis.groupResponses?.[audience] ?? "";
          if (!currentQuestions.length && !individualAnswers.length && !savedGroupResponse) return null;
          return (
            <div key={audience} className={`rounded-lg border p-4 ${audience === "teacher" ? "border-indigo-100 bg-indigo-50/50" : "border-teal-100 bg-teal-50/50"}`}>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">{audience === "teacher" ? "Teacher questions" : "Parent / Guardian questions"}</h4>
              <ol className="space-y-2 list-decimal pl-5 text-sm text-slate-700 marker:text-slate-400">
                {currentQuestions.map((question, index) => (
                  <li key={`${audience}:${index}`} className="pl-1">{question}</li>
                ))}
              </ol>
              <GroupResponse audience={audience} saved={savedGroupResponse} canEdit={canEdit} onSave={saveResponse} />
              {canEdit && currentQuestions.length > 0 && (
                <IntakeQuestionDispatch caseId={caseId} audience={audience} assignments={assignments}
                  baseUrl={baseUrl} questionCount={currentQuestions.length} parentName={parentName} parentEmail={parentEmail} />
              )}
              {individualAnswers.length > 0 && (
                <details className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-slate-700">
                  <summary className="cursor-pointer font-semibold">
                    Previously saved individual answers ({individualAnswers.length})
                  </summary>
                  <p className="mt-2">These remain saved and available to the AI advisor.</p>
                  {individualAnswers.map(([question, answer]) => (
                    <div key={question} className="mt-2">
                      <strong>{question}</strong><p className="whitespace-pre-wrap mt-1">{answer}</p>
                    </div>
                  ))}
                </details>
              )}
            </div>
          );
        })}
      </section>
      {(canEdit || analysis.leadContext) && (
        <section className="rounded-lg border border-slate-200 bg-white/90 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">Assessment lead clarification</h3>
          <p className="text-xs text-slate-600">
            Record verified facts or decisions to consider when regenerating the analysis. Hypothetical AI questions are not automatically treated as case facts.
          </p>
          {canEdit ? (
            <>
              <label htmlFor="intake-lead-context" className="sr-only">Verified assessment lead clarification</label>
              <textarea id="intake-lead-context"
                className="w-full min-h-24 rounded-md border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={leadContextDraft} maxLength={20000}
                placeholder="For example: Student has declined direct testing as of [date]; parent and teacher reports are available. Do not infer student self-report findings."
                onChange={e => onLeadContextChange(e.target.value)} />
              <div className="flex justify-end">
                <Button size="sm" type="button" onClick={saveContext}
                  disabled={savingContext || leadContextDraft === (analysis.leadContext ?? "")}>
                  {savingContext ? <Loader2 className="mr-1 animate-spin" size={14} /> : <Save className="mr-1" size={14} />}
                  Save clarification
                </Button>
              </div>
            </>
          ) : <p className="text-sm whitespace-pre-wrap">{analysis.leadContext}</p>}
        </section>
      )}
      {canEdit && (
        <section className="rounded-lg border border-blue-200 bg-white/90 p-4 space-y-3" aria-label="AI intake advisor">
          <div className="flex items-center gap-2 text-blue-900 font-semibold text-sm"><MessageCircle size={17} /> Discuss this intake with AI</div>
          <p className="text-xs text-slate-600">
            Ask about evidence gaps, adaptations, or assessment choices before building the battery.
            Advice is for clinical review only; it does not change assigned assessments or the report.
            Only saved answers and clarifications are included. Do not treat missing student participation as completed testing.
          </p>
          {turns.length > 0 && (
            <div className="max-h-80 overflow-y-auto space-y-2" aria-live="polite">
              {turns.map((turn, index) => (
                <div key={index} className={`rounded-md p-3 text-sm whitespace-pre-wrap ${turn.role === "assistant" ? "bg-blue-50 text-slate-800" : "bg-slate-100 text-slate-800"}`}>
                  <span className="block text-xs font-semibold mb-1">{turn.role === "assistant" ? "AI advisor" : "Assessment lead"}</span>
                  {turn.text}
                </div>
              ))}
            </div>
          )}
          <label htmlFor="intake-advisor-question" className="sr-only">Question for the AI intake advisor</label>
          <textarea id="intake-advisor-question" className="w-full min-h-24 rounded-md border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            placeholder="For example: The student is declining self-report. What evidence can still inform the assessment, and what limitations must the report disclose?"
            value={message} maxLength={4000} onChange={e => setMessage(e.target.value)} />
          <div className="flex justify-end">
            <Button type="button" size="sm" disabled={asking || !message.trim()} onClick={ask}>
              {asking && <Loader2 className="mr-2 animate-spin" size={14} />}
              {asking ? "Thinking…" : "Ask AI advisor"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}