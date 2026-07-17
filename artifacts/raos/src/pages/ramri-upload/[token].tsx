import React, { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type Meta = {
  sourceType: string;
  mathTopic: string;
  gradeLevel: string;
  independenceReported: string;
  teacherMarked: string;
  teacherComments: string;
  contributorNotes: string;
};

const DEFAULT_META: Meta = {
  sourceType: "teacher",
  mathTopic: "",
  gradeLevel: "",
  independenceReported: "unknown",
  teacherMarked: "unknown",
  teacherComments: "",
  contributorNotes: "",
};

type SessionInfo = {
  ok: boolean;
  studentName: string;
  caseId: string;
  assignmentId: string;
  sessionId: string | null;
};

export default function RamriUploadPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [meta, setMeta] = useState<Meta>(DEFAULT_META);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${BASE_URL}/api/ramri-upload/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: SessionInfo) => { setInfo(d); setLoading(false); })
      .catch((s) => { setNotFound(s === 404); setLoading(false); });
  }, [token]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const urlRes = await fetch(`${BASE_URL}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Could not get upload URL");
      const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
      const putRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("File upload failed");
      setPendingFile({ url: objectPath, name: file.name, type: file.type });
    } catch (err) {
      setError("File upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!info) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/api/ramri-upload/${token}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: pendingFile?.name ?? null,
          fileUrl: pendingFile?.url ?? null,
          fileType: pendingFile?.type ?? null,
          sourceType: meta.sourceType,
          gradeLevel: meta.gradeLevel,
          mathTopic: meta.mathTopic,
          independenceReported: meta.independenceReported,
          teacherMarked: meta.teacherMarked,
          teacherComments: meta.teacherComments,
          contributorNotes: meta.contributorNotes,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(n => n + 1);
      setMeta(DEFAULT_META);
      setPendingFile(null);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={28} className="animate-spin text-violet-600" />
      </div>
    );
  }

  if (notFound || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm w-full text-center space-y-3">
          <AlertTriangle size={36} className="mx-auto text-amber-500" />
          <h1 className="text-lg font-semibold text-slate-800">Link not found</h1>
          <p className="text-sm text-slate-500">This upload link is invalid or has expired. Please contact the assessment team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">ReMynd — Work Upload</h1>
            <p className="text-xs text-slate-500">Mathematical Reasoning Interview preparation</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-800 space-y-1">
          <p className="font-semibold">Please share a piece of {info.studentName}'s recent mathematics work.</p>
          <p className="text-xs text-violet-700">You can submit multiple documents — one form per piece of work. Photos of worksheets, PDFs, and scanned pages are all accepted.</p>
        </div>

        {/* Success banner */}
        {submitted > 0 && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <CheckCircle size={20} className="text-emerald-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">{submitted} document{submitted > 1 ? "s" : ""} submitted — thank you!</p>
              <p className="text-xs text-emerald-700">You can submit another piece of work using the form below.</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h2 className="font-semibold text-slate-800 text-sm">About this piece of work</h2>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-xs text-slate-600">Who provided this work?</Label>
              <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white" value={meta.sourceType} onChange={e => setMeta(p => ({ ...p, sourceType: e.target.value }))}>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent / Caregiver</option>
                <option value="student">Student</option>
                <option value="school">School</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Mathematics Topic</Label>
              <Input className="mt-1 h-7 text-xs" placeholder="e.g. Addition, Fractions" value={meta.mathTopic} onChange={e => setMeta(p => ({ ...p, mathTopic: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Grade / Year Level</Label>
              <Input className="mt-1 h-7 text-xs" placeholder="e.g. Year 4" value={meta.gradeLevel} onChange={e => setMeta(p => ({ ...p, gradeLevel: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Completed independently?</Label>
              <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white" value={meta.independenceReported} onChange={e => setMeta(p => ({ ...p, independenceReported: e.target.value }))}>
                <option value="yes">Yes — on their own</option>
                <option value="partially">Partially — some help</option>
                <option value="no">No — significant help</option>
                <option value="unknown">Not sure</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Teacher marked / corrected?</Label>
              <select className="w-full mt-1 border border-slate-200 rounded-md px-2 py-1.5 text-xs bg-white" value={meta.teacherMarked} onChange={e => setMeta(p => ({ ...p, teacherMarked: e.target.value }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="partially">Partially</option>
                <option value="unknown">Not sure</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Teacher comments on work</Label>
              <Input className="mt-1 h-7 text-xs" placeholder="Optional" value={meta.teacherComments} onChange={e => setMeta(p => ({ ...p, teacherComments: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-slate-600">Additional context <span className="text-slate-400">(optional)</span></Label>
            <Textarea className="mt-1 text-xs" rows={2} placeholder="Anything else the examiner should know about this work — e.g. it was timed, done during class, the student was unwell..." value={meta.contributorNotes} onChange={e => setMeta(p => ({ ...p, contributorNotes: e.target.value }))} />
          </div>

          {/* File upload */}
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Upload the work <span className="text-slate-400">(optional — you can also describe it above)</span></Label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-5 text-center hover:border-violet-300 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {pendingFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={18} className="text-violet-500" />
                  <span className="text-xs font-medium text-slate-700">{pendingFile.name}</span>
                  <button type="button" className="text-xs text-red-500 underline ml-2" onClick={e => { e.stopPropagation(); setPendingFile(null); }}>Remove</button>
                </div>
              ) : uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-violet-500" />
                  <span className="text-xs text-slate-500">Uploading…</span>
                </div>
              ) : (
                <>
                  <Upload size={22} className="mx-auto mb-2 text-slate-400" />
                  <p className="text-xs text-slate-500">PDF, JPEG, PNG, HEIC — tap to choose file</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.heic,.heif" className="hidden" onChange={handleFileChange} />
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> {error}</p>
          )}

          <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700" disabled={submitting || uploading}>
            {submitting ? <><Loader2 size={14} className="animate-spin mr-1" /> Submitting…</> : "Submit Work Document"}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-400">
          This link was shared by the ReMynd assessment team. Your submission is confidential and will only be used as part of this assessment.
        </p>
      </div>
    </div>
  );
}
