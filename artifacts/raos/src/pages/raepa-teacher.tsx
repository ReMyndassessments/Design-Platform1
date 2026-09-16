import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { useParams } from "wouter";
import { AlertTriangle, CheckCircle2, Loader2, Upload } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const SUBJECTS = ["English / Language Arts", "Mathematics", "Science", "Humanities / Social Studies", "History", "Geography", "Literature", "General / Homeroom", "Other"];
const GRADE_LEVELS = ["Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6", "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const PROFILE_OPTIONS = ["Usually", "Sometimes", "Not yet", "Unknown / Unsure / Not Applicable"];
const SUPPORT_OPTIONS = ["Significant Improvement", "Some Improvement", "Little Change", "Not Tried", "Unknown"];

const understandingItems = [
  ["everyday_conversation", "Everyday classroom conversation"],
  ["whole_class_teaching", "Whole-class teaching"],
  ["academic_vocabulary", "Academic vocabulary"],
  ["complex_instructions", "Complex instructions"],
  ["multi_step_instructions", "Multi-step instructions"],
  ["assessment_questions", "Assessment questions"],
  ["academic_command_verbs", "Academic command verbs (for example, compare or justify)"],
  ["information_dense_sentences", "Information-dense sentences"],
] as const;

const expressionItems = [
  ["explain_orally", "Explain answers orally"],
  ["explain_reasoning", "Explain reasoning"],
  ["summarize", "Summarize"],
  ["compare", "Compare"],
  ["cause_effect", "Explain cause and effect"],
  ["justify_conclusions", "Justify conclusions"],
  ["use_evidence", "Use evidence"],
  ["hypothesize", "Hypothesize"],
  ["evaluate", "Evaluate"],
  ["extended_responses", "Produce extended academic responses"],
] as const;

const registerItems = [
  ["conversational_language", "Relies on conversational language for academic explanation"],
  ["ideas_stronger_than_expression", "Appears to have stronger ideas than English expression indicates"],
  ["subject_vocabulary", "Uses appropriate subject vocabulary"],
  ["connected_explanations", "Constructs connected explanations"],
  ["oral_to_writing", "Struggles moving from oral explanation to writing"],
  ["textbook_language", "Struggles with textbook language"],
] as const;

const supportItems = [
  ["repeat", "Repeats"],
  ["clarify", "Clarifies"],
  ["simplify_wording", "Simplifies wording"],
  ["define_vocabulary", "Defines vocabulary"],
  ["visuals", "Uses visuals"],
  ["model", "Models"],
  ["examples", "Provides examples"],
  ["sentence_starters", "Provides sentence starters"],
  ["oral_rehearsal", "Permits oral rehearsal"],
  ["bilingual_planning", "Permits bilingual planning"],
  ["reduced_linguistic_demand", "Reduces linguistic demand while maintaining conceptual demand"],
] as const;

type ProfileKey = typeof understandingItems[number][0] | typeof expressionItems[number][0] | typeof registerItems[number][0];
type SupportKey = typeof supportItems[number][0];

type TeacherForm = {
  title: string;
  subject: string;
  grade_level: string;
  teacher: string;
  task_type: string;
  date_completed: string;
  source: string;
  language_of_instruction: string;
  independent_completion: "independent" | "supported" | "unknown";
  support_provided: string;
  assignment_instructions: string;
  expected_outcome: string;
  rubric: string;
  student_score: string;
  teacher_comments: string;
  student_selected: boolean;
  classroom_context: string;
  profile: Record<ProfileKey, string>;
  support_matrix: Record<SupportKey, string>;
};

const emptyForm = (): TeacherForm => ({
  title: "", subject: "", grade_level: "", teacher: "", task_type: "", date_completed: "",
  source: "", language_of_instruction: "", independent_completion: "independent",
  support_provided: "", assignment_instructions: "", expected_outcome: "", rubric: "",
  student_score: "", teacher_comments: "", student_selected: false, classroom_context: "",
  profile: {} as Record<ProfileKey, string>,
  support_matrix: {} as Record<SupportKey, string>,
});

// Public contract (for API reconciliation):
// GET /api/public/raepa/access/:token -> { case_id, scope, expires_at }; scope must be "teacher".
// POST /api/public/raepa/teacher/:token/upload (multipart) is the atomic submission
// contract. It stores the work sample and the respondent-wide classroom profile fields
// classroom_access_profile and support_response_matrix in the same transaction.
// The scoped token is the sole authorization; no student identity is collected here.

const inputClassName = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">{title}</h2>
        {description && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return <label className="block text-xs text-slate-400 mb-1">{children} {required && <span className="text-red-400">*</span>}</label>;
}

function ProfileRows({
  items,
  values,
  onChange,
}: {
  items: readonly (readonly [string, string])[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-hidden">
      {items.map(([key, label]) => (
        <div key={key} className="grid gap-2 sm:grid-cols-[1fr_220px] items-center px-3 py-3">
          <span className="text-sm text-slate-300">{label}</span>
          <select
            data-testid={`select-profile-${key}`}
            className={inputClassName}
            value={values[key] ?? ""}
            onChange={e => onChange(key, e.target.value)}
          >
            <option value="">— Select —</option>
            {PROFILE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      ))}
    </div>
  );
}

export default function RaepaTeacherUpload() {
  const { token } = useParams<{ token: string }>();
  const [validating, setValidating] = useState(() => Boolean(token));
  const [invalid, setInvalid] = useState(() => !token);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<TeacherForm>(emptyForm);
  const fileRef = useRef<HTMLInputElement>(null);
  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setInvalid(true);
      return;
    }
    setValidating(true);
    setInvalid(false);
    let active = true;
    fetch(`${BASE_URL}/api/public/raepa/access/${encodeURIComponent(token ?? "")}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error("invalid")))
      .then(data => {
        if (!active) return;
        if (data?.scope !== "teacher") throw new Error("wrong scope");
        setValidating(false);
      })
      .catch(() => { if (active) { setValidating(false); setInvalid(true); } });
    return () => { active = false; };
  }, [token]);

  const setValue = <K extends keyof TeacherForm>(key: K, value: TeacherForm[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.[0] && event.target.files[0].size > 30 * 1024 * 1024) {
      setError("That file is larger than 30 MB. Please choose a smaller file.");
      event.target.value = "";
    } else setError("");
  };

  function submissionFingerprint(file: File): string {
    return JSON.stringify({
      token,
      form,
      file: { name: file.name, size: file.size, type: file.type, lastModified: file.lastModified },
    });
  }

  function stableHash(value: string): string {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Please select a work sample to upload."); return; }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const fingerprint = submissionFingerprint(file);
      if (!idempotencyRef.current || idempotencyRef.current.fingerprint !== fingerprint) {
        idempotencyRef.current = {
          fingerprint,
          key: `raepa-teacher-${stableHash(fingerprint)}`,
        };
      }
      const fields: Record<string, string | boolean> = {
        title: form.title, subject: form.subject, grade_level: form.grade_level, teacher: form.teacher,
        task_type: form.task_type, date_completed: form.date_completed,
        independent_completion: form.independent_completion === "independent",
        // Keep the human-readable setting as well as the legacy boolean field.
        completion_setting: form.independent_completion,
        source: form.source,
        language_of_instruction: form.language_of_instruction,
        support_provided: form.support_provided,
        assignment_instructions: form.assignment_instructions,
        original_instructions: form.assignment_instructions,
        expected_outcome: form.expected_outcome,
        rubric: form.rubric,
        student_score: form.student_score,
        teacher_comments: form.teacher_comments,
        classroom_context: form.classroom_context,
        student_selected: form.student_selected,
        classroom_access_profile: JSON.stringify(form.profile),
        support_response_matrix: JSON.stringify(form.support_matrix),
      };
      Object.entries(fields).forEach(([key, value]) => fd.append(key, String(value)));
      const response = await fetch(`${BASE_URL}/api/public/raepa/teacher/${encodeURIComponent(token ?? "")}/upload`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyRef.current.key },
        body: fd,
      });
      const result = await response.json().catch(() => null) as { ok?: boolean } | null;
      if (!response.ok || result?.ok !== true) throw new Error("Upload failed");
      idempotencyRef.current = null;
      setDone(true);
    } catch {
      setError("Upload failed. Please try again or contact the assessor.");
    } finally {
      setUploading(false);
    }
  }

  if (validating) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 data-testid="status-validating" className="w-8 h-8 text-indigo-400 animate-spin" /></div>;
  if (invalid) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Secure link not available</h1>
        <p data-testid="status-invalid-link" className="text-slate-400 text-sm">This upload link is missing, invalid, expired, or not a teacher link. Please ask the assessor for a new secure link.</p>
      </div>
    </div>
  );
  if (done) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Work sample submitted!</h1>
        <p data-testid="status-upload-complete" className="text-slate-400 text-sm mb-6">Thank you. Your classroom observations and sample have been shared with the assessor.</p>
        <button data-testid="button-submit-another" onClick={() => { setDone(false); setForm(emptyForm()); if (fileRef.current) fileRef.current.value = ""; }} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">Submit Another Sample</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">R</div>
            <span className="text-slate-400 text-sm font-medium">ReMynd · RAEPA Classroom Evidence</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Share a classroom access profile</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">Your observations help the assessor understand how the student accesses and expresses academic learning in English. Please describe what you have seen; this is not a test of the student or of your teaching.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Section title="Teacher and classroom context" description="Complete what you know. Unknown or not applicable are valid responses.">
            <div className="grid sm:grid-cols-2 gap-3">
              <div><FieldLabel required>Your name</FieldLabel><input data-testid="input-teacher-name" required className={inputClassName} placeholder="Teacher name" value={form.teacher} onChange={e => setValue("teacher", e.target.value)} /></div>
              <div><FieldLabel>Subject</FieldLabel><select data-testid="select-subject" className={inputClassName} value={form.subject} onChange={e => setValue("subject", e.target.value)}><option value="">— Select —</option>{SUBJECTS.map(subject => <option key={subject} value={subject}>{subject}</option>)}</select></div>
              <div><FieldLabel>Grade / year level</FieldLabel><select data-testid="select-grade-level" className={inputClassName} value={form.grade_level} onChange={e => setValue("grade_level", e.target.value)}><option value="">— Select —</option>{GRADE_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}</select></div>
              <div><FieldLabel>Language(s) used for instruction</FieldLabel><input data-testid="input-language-instruction" className={inputClassName} placeholder="For example, English and Spanish" value={form.language_of_instruction} onChange={e => setValue("language_of_instruction", e.target.value)} /></div>
            </div>
            <div><FieldLabel>Classroom context or observations</FieldLabel><textarea data-testid="textarea-classroom-context" rows={3} className={`${inputClassName} resize-none`} placeholder="Optional context that may help interpret these observations…" value={form.classroom_context} onChange={e => setValue("classroom_context", e.target.value)} /></div>
          </Section>

          <Section title="Understanding" description="How does the student usually understand spoken and written academic language in your classroom?">
            <ProfileRows items={understandingItems} values={form.profile} onChange={(key, value) => setForm(previous => ({ ...previous, profile: { ...previous.profile, [key]: value } }))} />
          </Section>

          <Section title="Academic expression" description="What can the student communicate when demonstrating learning?">
            <ProfileRows items={expressionItems} values={form.profile} onChange={(key, value) => setForm(previous => ({ ...previous, profile: { ...previous.profile, [key]: value } }))} />
          </Section>

          <Section title="Academic register" description="These observations describe language use in learning contexts, not general ability.">
            <ProfileRows items={registerItems} values={form.profile} onChange={(key, value) => setForm(previous => ({ ...previous, profile: { ...previous.profile, [key]: value } }))} />
          </Section>

          <Section title="Response to support" description="Choose what happens after each support is provided. Select Not Tried when there was no opportunity to observe it.">
            <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-hidden">
              {supportItems.map(([key, label]) => (
                <div key={key} className="grid gap-2 sm:grid-cols-[1fr_220px] items-center px-3 py-3">
                  <span className="text-sm text-slate-300">{label}</span>
                  <select data-testid={`select-support-${key}`} className={inputClassName} value={form.support_matrix[key] ?? ""} onChange={e => setForm(previous => ({ ...previous, support_matrix: { ...previous.support_matrix, [key]: e.target.value } }))}>
                    <option value="">— Select —</option>{SUPPORT_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Work sample details" description="The upload remains part of the RAEPA Work Sample Bank. Please share the original sample where possible.">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><FieldLabel required>Title / description</FieldLabel><input data-testid="input-sample-title" required className={inputClassName} placeholder="For example, science explanation on ecosystems" value={form.title} onChange={e => setValue("title", e.target.value)} /></div>
              <div><FieldLabel>Task type</FieldLabel><input data-testid="input-task-type" className={inputClassName} placeholder="Written explanation, worksheet…" value={form.task_type} onChange={e => setValue("task_type", e.target.value)} /></div>
              <div><FieldLabel>Date completed</FieldLabel><input data-testid="input-date-completed" type="date" className={inputClassName} value={form.date_completed} onChange={e => setValue("date_completed", e.target.value)} /></div>
              <div><FieldLabel>Source</FieldLabel><input data-testid="input-source" className={inputClassName} placeholder="Classwork, assessment, homework…" value={form.source} onChange={e => setValue("source", e.target.value)} /></div>
              <div><FieldLabel>Independent or supported?</FieldLabel><select data-testid="select-completion" className={inputClassName} value={form.independent_completion} onChange={e => setValue("independent_completion", e.target.value as TeacherForm["independent_completion"])}><option value="independent">Independent</option><option value="supported">Supported</option><option value="unknown">Unknown / unsure</option></select></div>
              <div className="sm:col-span-2"><FieldLabel>Support provided for this task</FieldLabel><input data-testid="input-support-provided" className={inputClassName} placeholder="Vocabulary list, model, sentence starters…" value={form.support_provided} onChange={e => setValue("support_provided", e.target.value)} /></div>
              <div className="sm:col-span-2"><FieldLabel>Original instructions</FieldLabel><textarea data-testid="textarea-original-instructions" rows={2} className={`${inputClassName} resize-none`} value={form.assignment_instructions} onChange={e => setValue("assignment_instructions", e.target.value)} /></div>
              <div><FieldLabel>Expected outcome</FieldLabel><textarea data-testid="textarea-expected-outcome" rows={2} className={`${inputClassName} resize-none`} value={form.expected_outcome} onChange={e => setValue("expected_outcome", e.target.value)} /></div>
              <div><FieldLabel>Rubric or score (if applicable)</FieldLabel><textarea data-testid="textarea-rubric-score" rows={2} className={`${inputClassName} resize-none`} placeholder="Optional" value={`${form.rubric}${form.student_score ? `\nScore: ${form.student_score}` : ""}`} onChange={e => { const [rubric, ...score] = e.target.value.split("\nScore: "); setForm(previous => ({ ...previous, rubric, student_score: score.join("\nScore: ") })); }} /></div>
              <div className="sm:col-span-2"><FieldLabel>Teacher feedback</FieldLabel><textarea data-testid="textarea-teacher-feedback" rows={3} className={`${inputClassName} resize-none`} placeholder="What did you notice about the student's access, explanation, or independence?" value={form.teacher_comments} onChange={e => setValue("teacher_comments", e.target.value)} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer"><input data-testid="checkbox-student-selected" type="checkbox" checked={form.student_selected} onChange={e => setValue("student_selected", e.target.checked)} className="rounded" />The student selected this sample</label>
          </Section>

          <Section title="Upload the original work sample">
            <input data-testid="input-work-sample-file" ref={fileRef} required type="file" accept=".pdf,.jpg,.jpeg,.png,.docx,.doc,.ppt,.pptx,.txt" onChange={onFileChange} className="w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:text-sm file:cursor-pointer hover:file:bg-indigo-700" />
            <p className="text-xs text-slate-500">PDF, Word document, image, scan, handwritten work, worksheet, assessment, slides, rubric, or typed response · max 30 MB</p>
          </Section>

          {error && <div data-testid="status-upload-error" className="flex items-center gap-2 text-red-400 text-sm bg-red-950/40 border border-red-800/40 rounded-lg px-4 py-3"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
          <button data-testid="button-submit-work-sample" type="submit" disabled={uploading} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">{uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Submitting…</> : <><Upload className="w-4 h-4" />Submit classroom profile and work sample</>}</button>
        </form>
        <p className="text-center text-xs text-slate-600 mt-8">ReMynd Assessment Operating System · RAEPA Classroom Evidence</p>
      </div>
    </div>
  );
}