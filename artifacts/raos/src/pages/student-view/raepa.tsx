import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "wouter";
import { CheckCircle2, Loader2, Mic, Save, Send, ShieldCheck } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const POLL_MS = 3000;

type InterviewPrompt = {
  id: string;
  prompt: string;
  helper?: string;
};

type Stimulus = {
  text: string;
  images?: { label: string; dataUrl: string }[];
  questions?: string[];
  questionIndex?: number;
  ageBand?: "early" | "middle" | "secondary" | string;
  interview?: { ageBand?: string; prompts?: InterviewPrompt[] };
};

type SavedResponse = {
  id?: string;
  responseType: "interview" | "stimulus";
  promptId: string;
  prompt?: string;
  originalLanguage: string;
  originalResponse: string;
  savedAt?: string;
};

const DEFAULT_INTERVIEW: Record<string, InterviewPrompt[]> = {
  early: [
    { id: "helps", prompt: "What helps when your teacher explains something difficult in English?", helper: "You can tell us about pictures, examples, repeating, or anything else that helps." },
    { id: "words", prompt: "Are there times when you know an answer but cannot find the English words?", helper: "Tell us about what that feels like or what you do next." },
    { id: "mode", prompt: "Is explaining something easier by speaking or by writing? Why?" },
    { id: "subjects", prompt: "Which school subjects have the hardest English for you?" },
    { id: "understand", prompt: "What do you do when you do not understand classroom words?" },
  ],
  middle: [
    { id: "helps", prompt: "What helps when a teacher explains something difficult in English?", helper: "For example, an example, a picture, simpler wording, or time to talk it through." },
    { id: "words", prompt: "Are there times when you know an answer but cannot find the English words? Tell us about one." },
    { id: "mode", prompt: "Is explaining something easier by speaking or by writing? What makes it easier?" },
    { id: "subjects", prompt: "Which subjects have the hardest English, and what makes the language difficult?" },
    { id: "maths", prompt: "Are mathematics questions sometimes difficult because of the words? Please explain." },
    { id: "understand", prompt: "What do you do when you do not understand classroom language?" },
    { id: "planning", prompt: "Do you sometimes think through an answer in another language? What is that like?" },
  ],
  secondary: [
    { id: "helps", prompt: "What helps when a teacher explains a complex idea in English?", helper: "You may describe strategies, examples, visuals, discussion, or extra time." },
    { id: "words", prompt: "Are there times when you know an answer but cannot find the English words? Give an example if you can." },
    { id: "mode", prompt: "Is explaining something easier by speaking or by writing? Why does that mode work better for you?" },
    { id: "subjects", prompt: "Which subjects have the hardest academic English, and which words or tasks are challenging?" },
    { id: "maths", prompt: "Are mathematics questions sometimes difficult because of the language rather than the mathematics? Please explain your experience." },
    { id: "understand", prompt: "What do you do when you do not understand classroom language or an instruction?" },
    { id: "planning", prompt: "Do you sometimes think through an answer in another language? Are some ideas easier to explain in another language?" },
  ],
};

function scopedUrl(path: string, token?: string) {
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${BASE_URL}${path}${query}`;
}

function AccessChecking() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <Loader2 data-testid="status-access-checking" className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Checking your secure link</h1>
        <p className="text-sm text-slate-400">Please wait while we confirm access to this assessment.</p>
      </div>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <ShieldCheck className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Access denied</h1>
        <p data-testid="status-student-access-denied" className="text-sm text-slate-400">This student assessment link is missing, invalid, expired, or not for this session. Please ask your examiner for a new secure link.</p>
      </div>
    </div>
  );
}

// Public contract (for API reconciliation):
// GET /api/public/raepa/access/:token -> { case_id, scope, expires_at }; scope must be "student".
// GET /api/public/raepa/student/:caseId?token=:scopedToken -> { stimulus }; the case id
// is checked against the scoped access response before polling. GET/POST
// /api/public/raepa/student/:caseId/responses?token=:scopedToken use the typed response
// contract { responseType, promptId, prompt, originalLanguage, originalResponse,
// responseMode?, nonScoredEvidence?, supportMetadata?, translationMetadata? }.
// originalResponse is persisted verbatim; translations, summaries, and assessment
// interpretation belong to assessor views.

function WaitingScreen({ caseId, token, onSaved }: { caseId: string; token?: string; onSaved: (response: SavedResponse) => void }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const dots = ["", ".", "..", "..."][tick % 4];

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <div className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center"><span className="text-white text-xs font-bold">R</span></div>
          <span className="text-white font-semibold tracking-tight text-base">ReMynd</span><span className="text-slate-500 text-sm">Assessment</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-teal-400"><span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse inline-block" />Connected{dots}</div>
      </div>
      <div className="flex-1 flex flex-col items-center px-8 py-12 gap-8">
        <div className="relative flex items-center justify-center h-24">
          <div className="absolute w-40 h-40 rounded-full border border-teal-900/60 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <div className="relative w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-xl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-9 h-9 text-teal-400"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573 3.007-9.964-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></div>
        </div>
        <div className="text-center space-y-2 max-w-md"><h1 className="text-3xl font-light text-white tracking-tight">Please wait</h1><p className="text-slate-400 text-lg leading-relaxed">Your examiner will display content here<br />when the assessment begins.</p></div>
        <StudentInterview caseId={caseId} token={token} onSaved={onSaved} dark />
        <p className="text-slate-600 text-sm text-center">Keep this screen visible. Do not navigate away.</p>
      </div>
    </div>
  );
}

function ResponseComposer({
  caseId,
  token,
  responseType,
  promptId,
  prompt,
  helper,
  onSaved,
  dark = false,
}: {
  caseId: string;
  token?: string;
  responseType: "interview" | "stimulus";
  promptId: string;
  prompt: string;
  helper?: string;
  onSaved: (response: SavedResponse) => void;
  dark?: boolean;
}) {
  const [language, setLanguage] = useState("English");
  const [otherLanguage, setOtherLanguage] = useState("");
  const [response, setResponse] = useState("");
  const [mode, setMode] = useState<"typed" | "spoken_note">("typed");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const textClass = dark ? "text-slate-100" : "text-slate-800";
  const mutedClass = dark ? "text-slate-400" : "text-slate-500";
  const fieldClass = dark ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800";

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!response.trim()) { setError("Write or dictate a response before saving."); return; }
    setSaving(true);
    setError("");
    try {
      if (!token) {
        throw new Error("A scoped student access link is required to save responses.");
      }
      const originalLanguage = language === "Another language" ? otherLanguage.trim() || language : language;
      const payload = {
        responseType,
        promptId,
        prompt,
        originalPrompt: prompt,
        originalLanguage,
        originalResponse: response,
        responseMode: mode,
        nonScoredEvidence: true,
        supportMetadata: { source: "student_academic_language_interview" },
        translationMetadata: { preserved: true, translationRequested: false },
      };
      const result = await fetch(scopedUrl(`/api/public/raepa/student/${encodeURIComponent(caseId)}/responses`, token), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!result.ok) throw new Error("Response could not be saved");
      const data = await result.json().catch(() => ({})) as { response?: SavedResponse };
      const savedResponse: SavedResponse = data.response ?? {
        responseType, promptId, prompt, originalLanguage, originalResponse: response,
      };
      onSaved(savedResponse);
      setSaved(true);
    } catch {
      setError("Your response could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className={`rounded-xl border p-4 space-y-3 ${dark ? "bg-slate-900/80 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
      <div className="flex items-start justify-between gap-3"><div><p className={`text-sm font-medium ${textClass}`}>{prompt}</p>{helper && <p className={`text-xs mt-1 ${mutedClass}`}>{helper}</p>}</div><Mic className={`w-4 h-4 shrink-0 ${mutedClass}`} aria-label="Speaking response option" /></div>
      <div className="grid sm:grid-cols-[1fr_180px] gap-2">
        <textarea data-testid={`textarea-response-${promptId}`} rows={3} maxLength={20000} className={`rounded-lg border px-3 py-2 text-sm outline-none focus:border-teal-500 resize-none ${fieldClass}`} placeholder={mode === "typed" ? "Type your answer in your own words…" : "Type a brief note after speaking your answer…"} value={response} onChange={e => { setResponse(e.target.value); setSaved(false); }} />
        <div className="space-y-2">
          <label className={`block text-xs ${mutedClass}`}>Language used</label>
          <select data-testid={`select-response-language-${promptId}`} className={`w-full rounded-lg border px-2 py-2 text-sm outline-none ${fieldClass}`} value={language} onChange={e => setLanguage(e.target.value)}>
            <option>English</option><option>Spanish</option><option>Mandarin</option><option>Cantonese</option><option>Korean</option><option>Arabic</option><option>Vietnamese</option><option>French</option><option>Another language</option><option>Unknown / unsure</option><option>Prefer not to say</option>
          </select>
          {language === "Another language" && <input data-testid={`input-other-language-${promptId}`} maxLength={120} className={`w-full rounded-lg border px-2 py-2 text-xs outline-none ${fieldClass}`} placeholder="Name the language (optional)" value={otherLanguage} onChange={e => setOtherLanguage(e.target.value)} />}
          <select data-testid={`select-response-mode-${promptId}`} className={`w-full rounded-lg border px-2 py-2 text-xs outline-none ${fieldClass}`} value={mode} onChange={e => setMode(e.target.value as "typed" | "spoken_note")}>
            <option value="typed">Typed response</option><option value="spoken_note">Spoken response note</option>
          </select>
        </div>
      </div>
      <p data-testid={`text-non-scored-${promptId}`} className={`text-xs ${mutedClass}`}>This response is evidence for your examiner. It is not scored as right or wrong here.</p>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-xs ${mutedClass}`}>Your original response is kept as evidence in the language you choose.</p>
        <button data-testid={`button-save-response-${promptId}`} type="submit" disabled={saving} className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium disabled:opacity-60">{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}{saved ? "Saved" : "Save response"}</button>
      </div>
      {error && <p data-testid={`status-response-error-${promptId}`} className="text-xs text-red-500">{error}</p>}
    </form>
  );
}

function StudentInterview({ caseId, token, onSaved, dark = false, prompts, ageBand }: { caseId: string; token?: string; onSaved: (response: SavedResponse) => void; dark?: boolean; prompts?: InterviewPrompt[]; ageBand?: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const normalizedAgeBand = ageBand?.toLowerCase().includes("early") || ageBand?.toLowerCase().includes("primary") ? "early" : ageBand?.toLowerCase().includes("secondary") || ageBand?.toLowerCase().includes("teen") ? "secondary" : "middle";
  const questions = prompts?.length ? prompts : DEFAULT_INTERVIEW[normalizedAgeBand];
  const heading = dark ? "A few questions about learning" : "Academic-language interview";
  const intro = dark ? "While you wait, you can share how classroom language works for you. There are no right or wrong answers." : "These questions help your examiner understand your experience of learning through English.";
  return (
    <section data-testid="student-interview" className={`w-full max-w-2xl rounded-2xl border p-5 space-y-4 ${dark ? "bg-slate-900/70 border-slate-700" : "bg-white border-slate-200 shadow-sm"}`}>
      <div className="flex items-start justify-between gap-4"><div><h2 className={`text-lg font-semibold ${dark ? "text-white" : "text-slate-800"}`}>{heading}</h2><p className={`text-sm mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>{intro}</p></div><ShieldCheck className={`w-5 h-5 shrink-0 ${dark ? "text-teal-400" : "text-teal-600"}`} /></div>
      <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${dark ? "bg-teal-950/40 text-teal-200" : "bg-teal-50 text-teal-800"}`}>Your responses are evidence for your examiner. They are not scored as right or wrong, and you can say “I’m not sure” or skip a question.</div>
      {!open ? <button data-testid="button-start-interview" onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium"><Send className="w-4 h-4" />Start interview</button> : <div className="space-y-3"><div className="flex items-center justify-between"><span className={`text-xs font-medium ${dark ? "text-slate-400" : "text-slate-500"}`}>Question {active + 1} of {questions.length}</span><div className="flex gap-1">{questions.map((question, index) => <button data-testid={`button-interview-question-${question.id}`} aria-label={`Go to question ${index + 1}`} key={question.id} onClick={() => setActive(index)} className={`w-2 h-2 rounded-full ${index === active ? "bg-teal-500" : dark ? "bg-slate-700" : "bg-slate-300"}`} />)}</div></div><ResponseComposer caseId={caseId} token={token} responseType="interview" promptId={questions[active].id} prompt={questions[active].prompt} helper={questions[active].helper} onSaved={onSaved} dark={dark} /><div className="flex justify-between"><button data-testid="button-interview-back" disabled={active === 0} onClick={() => setActive(index => Math.max(0, index - 1))} className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"} disabled:opacity-30`}>Back</button><button data-testid="button-interview-next" disabled={active === questions.length - 1} onClick={() => setActive(index => Math.min(questions.length - 1, index + 1))} className={`text-xs font-medium ${dark ? "text-teal-400" : "text-teal-700"} disabled:opacity-30`}>Next question</button></div></div>}
    </section>
  );
}

function StimulusResponse({ caseId, token, prompt, onSaved }: { caseId: string; token?: string; prompt: string; onSaved: (response: SavedResponse) => void }) {
  return <div className="w-full max-w-2xl mt-8"><ResponseComposer caseId={caseId} token={token} responseType="stimulus" promptId="current-stimulus" prompt="Your response" helper="Respond in the way your examiner has asked. You may use your own words." onSaved={onSaved} /><p className="mt-2 text-center text-xs text-slate-400">Prompt: {prompt}</p></div>;
}

export default function RaepaStudentView() {
  const { caseId } = useParams<{ caseId: string }>();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? undefined, []);
  const [stimulus, setStimulus] = useState<Stimulus | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [responses, setResponses] = useState<SavedResponse[]>([]);
  const [accessState, setAccessState] = useState<"checking" | "allowed" | "denied">(token ? "checking" : "denied");

  useEffect(() => {
    if (!token) {
      setAccessState("denied");
      return;
    }
    let cancelled = false;
    fetch(`${BASE_URL}/api/public/raepa/access/${encodeURIComponent(token)}`)
      .then(result => result.ok ? result.json() : Promise.reject(new Error("invalid access link")))
      .then((data: { case_id?: string; scope?: string }) => {
        if (cancelled) return;
        if (data.scope !== "student" || data.case_id !== caseId) {
          setAccessState("denied");
          setNotFound(true);
          return;
        }
        setAccessState("allowed");
      })
      .catch(() => {
        if (!cancelled) {
          setAccessState("denied");
          setNotFound(true);
        }
      });
    return () => { cancelled = true; };
  }, [caseId, token]);

  useEffect(() => {
    if (accessState !== "allowed") return;
    let cancelled = false;
    async function poll() {
      try {
        const result = await fetch(scopedUrl(`/api/public/raepa/student/${encodeURIComponent(caseId ?? "")}`, token));
        if (result.status === 404) { if (!cancelled) setNotFound(true); return; }
        if (!result.ok) return;
        const data = await result.json() as { stimulus: Stimulus | null };
        if (!cancelled) setStimulus(data.stimulus);
      } catch { /* Keep polling through a temporary network interruption. */ }
    }
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [accessState, caseId, token]);

  useEffect(() => {
    if (!token || !caseId) return;
    let cancelled = false;
    fetch(scopedUrl(`/api/public/raepa/student/${encodeURIComponent(caseId)}/responses`, token))
      .then(result => result.ok ? result.json() : Promise.reject(new Error("Unable to load responses")))
      .then((data: { responses?: SavedResponse[] }) => {
        if (!cancelled && Array.isArray(data.responses)) setResponses(data.responses);
      })
      .catch(() => {
        // Keep an in-progress response visible if the network is temporarily unavailable.
        try {
          const saved = sessionStorage.getItem(`raepa-student-responses:${caseId}:${token}`);
          if (!cancelled && saved) {
            const parsed = JSON.parse(saved) as SavedResponse[];
            if (Array.isArray(parsed)) setResponses(parsed);
          }
        } catch { /* A private browsing context may not provide session storage. */ }
      });
    return () => { cancelled = true; };
  }, [caseId, token]);

  useEffect(() => {
    if (!token || !caseId) return;
    try {
      const saved = sessionStorage.getItem(`raepa-student-responses:${caseId}:${token}`);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedResponse[];
        if (Array.isArray(parsed)) setResponses(parsed);
      }
    } catch { /* A private browsing context may not provide session storage. */ }
  }, [caseId, token]);

  const onSaved = (response: SavedResponse) => {
    setResponses(previous => {
      const next = [...previous.filter(item => item.promptId !== response.promptId), response];
      if (token && caseId) {
        try { sessionStorage.setItem(`raepa-student-responses:${caseId}:${token}`, JSON.stringify(next)); } catch { /* Keep the live response visible if storage is unavailable. */ }
      }
      return next;
    });
  };
  if (accessState === "checking") return <AccessChecking />;
  if (accessState === "denied") return <AccessDenied />;
  if (notFound) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><p data-testid="status-session-not-found" className="text-slate-500 text-lg">Session not found.</p></div>;
  if (!stimulus) return <WaitingScreen caseId={caseId ?? ""} token={token} onSaved={onSaved} />;

  const hasImages = Boolean(stimulus.images?.length);
  const hasQuestions = Boolean(stimulus.questions?.length);
  const questionIndex = stimulus.questionIndex ?? -1;
  const questions = stimulus.questions ?? [];
  const currentQuestion = questions[questionIndex];

  if (hasQuestions && questionIndex === -1) {
    return <div className="min-h-screen bg-white flex flex-col items-center px-8 py-12"><div className="w-full max-w-2xl"><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">Reading passage</p>{hasImages && <div className="flex flex-wrap justify-center gap-8 mb-8">{stimulus.images!.map(image => <div key={image.label} className="flex flex-col items-center gap-2"><img data-testid={`img-stimulus-${image.label}`} src={image.dataUrl} alt={image.label} className="max-h-56 max-w-xs object-contain rounded-xl shadow-sm border border-slate-100" /><span className="text-sm font-medium text-slate-400">{image.label}</span></div>)}</div>}<p data-testid="text-reading-passage" className="text-xl text-slate-800 leading-relaxed whitespace-pre-wrap">{stimulus.text}</p><p className="mt-10 text-sm text-slate-400 text-center">Read carefully — your examiner will ask you questions when you are ready.</p></div><StudentInterview caseId={caseId ?? ""} token={token} ageBand={stimulus.interview?.ageBand ?? stimulus.ageBand} prompts={stimulus.interview?.prompts} onSaved={onSaved} /></div>;
  }

  if (hasQuestions) {
    return <div className="min-h-screen bg-white flex flex-col items-center px-8 py-10"><div className="w-full max-w-2xl"><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Reading passage</p>{hasImages && <div className="flex flex-wrap justify-center gap-6 mb-6">{stimulus.images!.map(image => <img key={image.label} data-testid={`img-question-${image.label}`} src={image.dataUrl} alt={image.label} className="max-h-40 max-w-xs object-contain rounded-xl shadow-sm border border-slate-100" />)}</div>}<p className="text-base text-slate-600 leading-relaxed whitespace-pre-wrap mb-8 pb-8 border-b border-slate-200">{stimulus.text}</p><p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Question {questionIndex + 1} of {questions.length}</p><p data-testid="text-current-question" className="text-2xl text-slate-800 font-medium leading-relaxed">{currentQuestion ?? "Your examiner will continue shortly."}</p><StimulusResponse caseId={caseId ?? ""} token={token} prompt={currentQuestion ?? ""} onSaved={onSaved} /><StudentInterview caseId={caseId ?? ""} token={token} ageBand={stimulus.interview?.ageBand ?? stimulus.ageBand} prompts={stimulus.interview?.prompts} onSaved={onSaved} /></div></div>;
  }

  return <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 py-12">{hasImages && <div className="flex flex-wrap justify-center gap-10 mb-12">{stimulus.images!.map(image => <div key={image.label} className="flex flex-col items-center gap-3"><img data-testid={`img-standard-${image.label}`} src={image.dataUrl} alt={image.label} className="max-h-64 max-w-xs object-contain rounded-xl shadow-md border border-slate-100" /><span className="text-base font-medium text-slate-500 tracking-wide">{image.label}</span></div>)}</div>}<p data-testid="text-stimulus" className="text-2xl text-slate-800 font-medium text-center leading-relaxed max-w-2xl whitespace-pre-wrap">{stimulus.text}</p><StimulusResponse caseId={caseId ?? ""} token={token} prompt={stimulus.text} onSaved={onSaved} /><StudentInterview caseId={caseId ?? ""} token={token} ageBand={stimulus.interview?.ageBand ?? stimulus.ageBand} prompts={stimulus.interview?.prompts} onSaved={onSaved} /><p data-testid="status-response-count" className="mt-5 text-xs text-slate-400">{responses.length ? `${responses.length} response${responses.length === 1 ? "" : "s"} saved` : "Responses are saved as evidence for your examiner."}</p></div>;
}