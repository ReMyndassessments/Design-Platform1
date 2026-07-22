import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const SUBJECTS = ["English / Language Arts","Mathematics","Science","Humanities / Social Studies","History","Geography","Literature","General / Homeroom","Other"];
const GRADE_LEVELS = ["Year 1","Year 2","Year 3","Year 4","Year 5","Year 6","Year 7","Year 8","Year 9","Year 10","Year 11","Year 12","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];

export default function RaepaTeacherUpload() {
  const { token } = useParams<{ token: string }>();
  const [validating, setValidating] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", subject: "", grade_level: "", teacher: "",
    task_type: "", date_completed: "", independent_completion: true,
    support_provided: "", teacher_comments: "", student_selected: false,
  });

  useEffect(() => {
    fetch(`${BASE_URL}/api/public/raepa/teacher/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(() => setValidating(false))
      .catch(() => { setValidating(false); setInvalid(true); });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Please select a file to upload."); return; }
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      const r = await fetch(`${BASE_URL}/api/public/raepa/teacher/${token}/upload`, {
        method: "POST", body: fd,
      });
      if (!r.ok) throw new Error("Upload failed");
      setDone(true);
    } catch {
      setError("Upload failed. Please try again or contact the assessor.");
    } finally {
      setUploading(false);
    }
  }

  if (validating) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
    </div>
  );

  if (invalid) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Link not valid</h1>
        <p className="text-slate-400 text-sm">This upload link is invalid or has expired. Please ask the assessor for a new link.</p>
      </div>
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Work sample submitted!</h1>
        <p className="text-slate-400 text-sm mb-6">Thank you. The assessor will review this sample as part of the student's academic English performance assessment.</p>
        <button
          onClick={() => { setDone(false); setForm({ title:"",subject:"",grade_level:"",teacher:"",task_type:"",date_completed:"",independent_completion:true,support_provided:"",teacher_comments:"",student_selected:false }); if(fileRef.current) fileRef.current.value=""; }}
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          Submit Another Sample
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">R</div>
            <span className="text-slate-400 text-sm font-medium">ReMynd · RAEPA Work Sample Collection</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Submit a Work Sample</h1>
          <p className="text-slate-400 text-sm mt-1">
            Please upload a piece of the student's work from your subject area. The assessor will use it to evaluate the student's academic English performance.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">About the Work</h2>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Title / Description <span className="text-red-400">*</span></label>
              <input
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                placeholder="e.g. Science lab report on ecosystems"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Subject <span className="text-red-400">*</span></label>
                <select
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                >
                  <option value="">— Select —</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Grade / Year Level</label>
                <select
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                  value={form.grade_level}
                  onChange={e => setForm(p => ({ ...p, grade_level: e.target.value }))}
                >
                  <option value="">— Select —</option>
                  {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Your Name <span className="text-red-400">*</span></label>
                <input
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                  placeholder="Teacher name"
                  value={form.teacher}
                  onChange={e => setForm(p => ({ ...p, teacher: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Task Type</label>
                <input
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                  placeholder="e.g. written explanation"
                  value={form.task_type}
                  onChange={e => setForm(p => ({ ...p, task_type: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Date Work Was Completed</label>
              <input
                type="date"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                value={form.date_completed}
                onChange={e => setForm(p => ({ ...p, date_completed: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.independent_completion} onChange={e => setForm(p => ({ ...p, independent_completion: e.target.checked }))} className="rounded" />
                Completed independently
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={form.student_selected} onChange={e => setForm(p => ({ ...p, student_selected: e.target.checked }))} className="rounded" />
                Student self-selected
              </label>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Teacher Notes</h2>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Marking / Comments</label>
              <textarea
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none resize-none"
                placeholder="Any marking notes, score achieved, or observations about the student's performance on this task…"
                value={form.teacher_comments}
                onChange={e => setForm(p => ({ ...p, teacher_comments: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Support Provided</label>
              <input
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 outline-none"
                placeholder="e.g. vocabulary list provided, sentence starters given"
                value={form.support_provided}
                onChange={e => setForm(p => ({ ...p, support_provided: e.target.value }))}
              />
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">File Upload <span className="text-red-400">*</span></h2>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.docx,.doc"
              className="w-full text-sm text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white file:text-sm file:cursor-pointer hover:file:bg-indigo-700"
            />
            <p className="text-xs text-slate-500 mt-2">Accepts PDF, JPEG, PNG, DOCX — max 30 MB</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-950/40 border border-red-800/40 rounded-lg px-4 py-3">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Submit Work Sample</>}
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-8">ReMynd Assessment Operating System · RAEPA Work Sample Collection</p>
      </div>
    </div>
  );
}
