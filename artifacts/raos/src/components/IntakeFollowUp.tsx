import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle, Save } from "lucide-react";

type Audience = "teacher" | "parent";
type Turn = { role: "user" | "assistant"; text: string; at?: string };
type IntakeAnalysis = {
  suggestedQuestions?: Partial<Record<Audience, string[]>>;
  followUpAnswers?: Partial<Record<Audience, Record<string, string>>>;
  intakeDiscussion?: Turn[];
  leadContext?: string;
};

function QuestionResponse({
  audience, question, index, saved, canEdit, onSave,
}: {
  audience: Audience; question: string; index: number; saved: string;
  canEdit: boolean; onSave: (audience: Audience, question: string, answer: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(saved);
  const [open, setOpen] = useState(Boolean(saved));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setDraft(saved); }, [saved]);
  const color = audience === "teacher" ? "indigo" : "teal";
  return (
    <li className={`rounded-md border p-3 text-sm bg-white ${color === "indigo" ? "border-indigo-100" : "border-teal-100"}`}>
      <div className="flex items-start gap-2">
        <span className="font-semibold text-slate-400 shrink-0">{index + 1}.</span>
        <span className="text-slate-700">{question}</span>
      </div>
      {!open && canEdit && (
        <button type="button" className="text-xs text-blue-700 mt-2 hover:underline" onClick={() => setOpen(true)}>
          {saved ? "View response" : "Add response (optional)"}
        </button>
      )}
      {(open || (!canEdit && saved)) && (
        <div className="mt-3 pl-5">
          {canEdit ? (
            <>
              <label htmlFor={`${audience}-answer-${index}`} className="text-xs font-medium text-slate-600">Response received</label>
              <textarea
                id={`${audience}-answer-${index}`}
                className="mt-1 w-full min-h-24 rounded-md border border-slate-200 bg-white p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder={`Enter the ${audience === "teacher" ? "teacher's" : "parent's"} response here, if received…`}
                value={draft}
                maxLength={20000}
                onChange={e => setDraft(e.target.value)}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Close</Button>
                <Button type="button" size="sm" disabled={saving || draft === saved} onClick={async () => {
                  setSaving(true);
                  try { await onSave(audience, question, draft); }
                  catch { /* The parent already displays a save error; keep the draft. */ }
                  finally { setSaving(false); }
                }}>
                  {saving ? <Loader2 className="mr-1 animate-spin" size={14} /> : <Save className="mr-1" size={14} />}
                  Save response
                </Button>
              </div>
            </>
          ) : <p className="whitespace-pre-wrap text-slate-700"><strong>Response:</strong> {saved}</p>}
        </div>
      )}
    </li>
  );
}

export function IntakeFollowUp({
  caseId, analysis, canEdit, onUpdated, baseUrl, leadContextDraft, onLeadContextChange,
}: {
  caseId: string; analysis: IntakeAnalysis; canEdit: boolean; onUpdated: () => Promise<unknown>;
  baseUrl: string; leadContextDraft: string; onLeadContextChange: (value: string) => void;
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [asking, setAsking] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const token = () => localStorage.getItem("raos_token");
  const saveResponse = async (audience: Audience, question: string, answer: string) => {
    try {
      const r = await fetch(`${baseUrl}/api/cases/${encodeURIComponent(caseId)}/intake-follow-up`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ audience, question, answer }),
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
          <p className="text-xs text-slate-500 mt-1">Optional: record answers as they arrive. Saved responses are available to the AI advisor below.</p>
        </div>
        {(["teacher", "parent"] as const).map(audience => {
          const questions = analysis.suggestedQuestions?.[audience];
          const currentQuestions = Array.isArray(questions) ? questions : [];
          const earlierAnswers = Object.entries(analysis.followUpAnswers?.[audience] ?? {})
            .filter(([question, answer]) => Boolean(answer) && !currentQuestions.includes(question));
          if (!currentQuestions.length && !earlierAnswers.length) return null;
          return (
            <div key={audience}>
              <h4 className="text-xs font-semibold text-slate-600 mb-2">{audience === "teacher" ? "Teacher" : "Parent / Guardian"}</h4>
              <ol className="space-y-2">
                {currentQuestions.map((question, index) => (
                  <QuestionResponse key={`${audience}:${question}`} audience={audience} question={question} index={index}
                    saved={analysis.followUpAnswers?.[audience]?.[question] ?? ""}
                    canEdit={canEdit} onSave={saveResponse} />
                ))}
              </ol>
              {earlierAnswers.length > 0 && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-slate-700">
                  <p className="font-semibold mb-2">Saved responses to questions from an earlier analysis</p>
                  <p className="mb-2">These remain available to the AI advisor, even though the regenerated questions changed.</p>
                  {earlierAnswers.map(([question, answer]) => (
                    <div key={question} className="mb-2 last:mb-0">
                      <strong>{question}</strong><p className="whitespace-pre-wrap mt-1">{answer}</p>
                    </div>
                  ))}
                </div>
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