import { useState, useEffect, useCallback } from "react";
import { AudioRecorder } from "@/components/AudioRecorder";
import {
  Mic, ChevronDown, ChevronUp, Loader2, Calendar, User,
  LogOut, Clock, Trash2, Play, Pause, Mic2,
} from "lucide-react";

type ConversationType = "parent_intake" | "teacher_consultation" | "student_interview" | "classroom_observation" | "report_debrief";

const TYPE_LABELS: Record<ConversationType, string> = {
  parent_intake: "Parent Intake",
  teacher_consultation: "Teacher Consultation",
  student_interview: "Student Interview",
  classroom_observation: "Classroom Observation",
  report_debrief: "Report Debrief",
};

const AVAILABLE_TYPES: ConversationType[] = ["student_interview", "classroom_observation", "parent_intake", "teacher_consultation"];

type NoteSection = { key: string; label: string; content: string };
type StructuredNotes = { conversationType: ConversationType; sections: NoteSection[]; rawTranscript: string; processedAt: string };
type Recording = {
  id: string; caseId: string; storagePath: string;
  durationSeconds?: number; conversationType: string; mimeType: string;
  transcript?: string; structuredNotes?: StructuredNotes;
  interviewDate?: string | null; studentName?: string; createdAt: string;
};
type ActiveCase = { id: string; studentName: string; assessmentMeetingDate: string | null };

type ProcessingStep = "uploading" | "transcribing" | "structuring";
const STEP_LABELS: Record<ProcessingStep, string> = {
  uploading: "Uploading audio…",
  transcribing: "Transcribing with Whisper…",
  structuring: "Organising clinical notes…",
};

function fmt(s?: number): string {
  if (!s) return "";
  const m = Math.floor(s / 60), sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function fmtDate(raw?: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "" : d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtMeetingDate(raw?: string | null): string {
  if (!raw) return "";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "" : d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function AudioPlayer({ recordingId, caseId, token, mimeType }: { recordingId: string; caseId: string; token: string; mimeType?: string }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const toggle = async () => {
    if (audioEl) {
      playing ? audioEl.pause() : audioEl.play().catch(() => {});
      setPlaying(p => !p);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/interview-recordings/${recordingId}/audio-url`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json() as { url: string };
      const audioRes = await fetch(url);
      const blob = await audioRes.blob();
      const objUrl = URL.createObjectURL(blob);
      const el = new Audio(objUrl);
      el.onended = () => setPlaying(false);
      setAudioEl(el);
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-1 text-xs text-primary hover:opacity-70 font-medium transition-opacity disabled:opacity-40"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : playing ? <Pause size={13} /> : <Play size={13} />}
      {loading ? "…" : playing ? "Pause" : "Play"}
    </button>
  );
}

interface HomeProps { token: string; onSignOut: () => void; }

export default function Home({ token, onSignOut }: HomeProps) {
  const [cases, setCases] = useState<ActiveCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [selectedType, setSelectedType] = useState<ConversationType>("student_interview");
  const [processingStep, setProcessingStep] = useState<ProcessingStep | null>(null);
  const [result, setResult] = useState<{ id: string; structuredNotes: StructuredNotes; transcript: string } | null>(null);
  const [editedSections, setEditedSections] = useState<NoteSection[] | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [expandedTranscript, setExpandedTranscript] = useState(false);
  const [expandedPastId, setExpandedPastId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setLoadingCases(true);
    fetch("/api/invigilator/active-cases", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((data: ActiveCase[]) => {
        setCases(data);
        if (data.length > 0) setSelectedCaseId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingCases(false));
  }, [token]);

  useEffect(() => {
    if (!selectedCaseId) return;
    setLoadingRecordings(true);
    setRecordings([]);
    fetch(`/api/cases/${selectedCaseId}/interview-recordings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((data: Recording[]) => setRecordings(data))
      .catch(() => {})
      .finally(() => setLoadingRecordings(false));
  }, [selectedCaseId, token]);

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  const handleRecordingComplete = useCallback(async (blob: Blob, durationSeconds: number, mimeType: string) => {
    setResult(null);
    setEditedSections(null);
    setNotesSaved(false);
    setExpandedTranscript(false);

    setProcessingStep("uploading");
    try {
      const interviewDate = selectedCase?.assessmentMeetingDate;
      let url = `/api/cases/${selectedCaseId}/interview-recordings?type=${selectedType}&duration=${durationSeconds}`;
      if (interviewDate) url += `&interview_date=${encodeURIComponent(interviewDate)}`;

      setProcessingStep("transcribing");
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": mimeType, Authorization: `Bearer ${token}` },
        body: blob,
      });
      setProcessingStep("structuring");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message || `Server error ${res.status}`);
      }
      const data = await res.json() as { id: string; transcript: string; structuredNotes: StructuredNotes | null };
      const structuredNotes: StructuredNotes = data.structuredNotes ?? {
        conversationType: selectedType,
        sections: [{ key: "raw_transcript", label: "Raw Transcript", content: data.transcript }],
        rawTranscript: data.transcript,
        processedAt: new Date().toISOString(),
      };
      setResult({ id: data.id, structuredNotes, transcript: data.transcript });
      setEditedSections(structuredNotes.sections);
      setRecordings(prev => [{
        id: data.id, caseId: selectedCaseId, storagePath: "",
        durationSeconds, conversationType: selectedType, mimeType,
        transcript: data.transcript, structuredNotes,
        interviewDate: interviewDate ?? null, studentName: selectedCase?.studentName,
        createdAt: new Date().toISOString(),
      }, ...prev]);
    } catch (err: any) {
      alert("Processing failed: " + (err.message || "Unknown error"));
    } finally {
      setProcessingStep(null);
    }
  }, [selectedCaseId, selectedCase, selectedType, token]);

  const handleSaveNotes = async () => {
    if (!result || !editedSections) return;
    setSavingNotes(true);
    try {
      const updatedNotes: StructuredNotes = { ...result.structuredNotes, sections: editedSections };
      const res = await fetch(`/api/cases/${selectedCaseId}/interview-recordings/${result.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ structuredNotes: updatedNotes }),
      });
      if (!res.ok) throw new Error();
      setNotesSaved(true);
      setRecordings(prev => prev.map(r => r.id === result.id ? { ...r, structuredNotes: updatedNotes } : r));
    } catch {
      alert("Could not save notes. Try again.");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/cases/${selectedCaseId}/interview-recordings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 404) throw new Error();
      setRecordings(prev => prev.filter(r => r.id !== id));
      if (result?.id === id) { setResult(null); setEditedSections(null); }
    } catch {
      alert("Could not delete recording.");
    } finally {
      setDeletingId(null);
    }
  };

  const isProcessing = processingStep !== null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-sidebar text-white px-5 pt-safe-top pb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mic size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs text-white/60 leading-none">ReMynd</p>
            <p className="text-sm font-semibold leading-tight">Notetaker</p>
          </div>
        </div>
        <button onClick={onSignOut} className="text-white/60 hover:text-white transition-colors p-1" title="Sign out">
          <LogOut size={18} />
        </button>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

          {/* Case picker */}
          <div className="bg-card border border-card-border rounded-2xl p-4 space-y-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recording for</p>
            {loadingCases ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                <Loader2 size={15} className="animate-spin" /> Loading cases…
              </div>
            ) : cases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active cases in assessment phase.</p>
            ) : (
              <>
                <div className="relative">
                  <select
                    value={selectedCaseId}
                    onChange={e => { setSelectedCaseId(e.target.value); setResult(null); setEditedSections(null); }}
                    className="w-full appearance-none bg-background border border-input rounded-xl px-4 py-3 pr-9 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.studentName}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                {selectedCase && (
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User size={12} className="text-primary shrink-0" />
                      <span className="font-medium text-foreground">{selectedCase.studentName}</span>
                    </div>
                    {selectedCase.assessmentMeetingDate && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar size={12} className="text-primary shrink-0" />
                        <span>{fmtMeetingDate(selectedCase.assessmentMeetingDate)}</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Recorder section */}
          {!loadingCases && selectedCaseId && (
            <div className="bg-card border border-card-border rounded-2xl p-4 space-y-4 shadow-sm">
              {/* Session type */}
              {!result && !isProcessing && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session type</p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TYPES.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedType(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          selectedType === t
                            ? "bg-primary text-white border-primary"
                            : "bg-background text-muted-foreground border-input hover:border-primary hover:text-primary"
                        }`}
                      >
                        {TYPE_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recorder */}
              {!result && (
                <AudioRecorder onRecordingComplete={handleRecordingComplete} disabled={isProcessing} />
              )}

              {/* Processing */}
              {isProcessing && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                    <Loader2 size={16} className="animate-spin" />
                    {STEP_LABELS[processingStep!]}
                  </div>
                  <div className="flex gap-1">
                    {(["uploading", "transcribing", "structuring"] as ProcessingStep[]).map(step => {
                      const steps: ProcessingStep[] = ["uploading", "transcribing", "structuring"];
                      const current = steps.indexOf(processingStep!);
                      const idx = steps.indexOf(step);
                      return (
                        <div key={step} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${idx <= current ? "bg-blue-500" : "bg-blue-200"}`} />
                      );
                    })}
                  </div>
                  <p className="text-xs text-blue-600">Usually takes 30–60 seconds…</p>
                </div>
              )}

              {/* Results */}
              {result && editedSections && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                      {TYPE_LABELS[result.structuredNotes?.conversationType ?? selectedType]}
                    </span>
                    <button
                      onClick={() => { setResult(null); setEditedSections(null); setNotesSaved(false); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Record another
                    </button>
                  </div>

                  <div className="space-y-3">
                    {editedSections.map((section, i) => (
                      <div key={section.key} className="space-y-1">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                          {section.label}
                        </label>
                        <textarea
                          className="w-full min-h-[80px] rounded-xl border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                          value={section.content}
                          onChange={e => {
                            const updated = [...editedSections];
                            updated[i] = { ...section, content: e.target.value };
                            setEditedSections(updated);
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {result.structuredNotes?.sections?.some(s => s.key !== "raw_transcript") && (
                    <div className="border border-input rounded-xl overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium text-muted-foreground bg-muted hover:bg-muted/80 transition-colors"
                        onClick={() => setExpandedTranscript(v => !v)}
                      >
                        Raw transcript
                        {expandedTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {expandedTranscript && (
                        <div className="px-3 py-3 text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed bg-card">
                          {result.transcript || "No transcript available."}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes || notesSaved}
                    className="w-full h-12 bg-primary hover:opacity-90 active:opacity-80 disabled:opacity-60 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-opacity"
                  >
                    {savingNotes
                      ? <><Loader2 size={15} className="animate-spin" />Saving…</>
                      : notesSaved ? "✓ Saved to Case" : "Save Notes to Case"
                    }
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Past recordings */}
          {!loadingCases && selectedCaseId && (
            <div className="space-y-2">
              {loadingRecordings ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 size={15} className="animate-spin" /> Loading recordings…
                </div>
              ) : recordings.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">Past recordings</p>
                  {recordings.map(rec => {
                    const hasSections = rec.structuredNotes?.sections && rec.structuredNotes.sections.length > 0;
                    const isRawOnly = hasSections && rec.structuredNotes!.sections.every(s => s.key === "raw_transcript");
                    const expanded = expandedPastId === rec.id;

                    return (
                      <div key={rec.id} className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
                        <div className="flex items-center justify-between px-4 py-3">
                          <button
                            className="flex items-center gap-2 text-left flex-1 min-w-0"
                            onClick={() => setExpandedPastId(expanded ? null : rec.id)}
                          >
                            <Mic2 size={14} className="text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {TYPE_LABELS[rec.conversationType as ConversationType] ?? rec.conversationType}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {rec.durationSeconds && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock size={10} />{fmt(rec.durationSeconds)}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {fmtDate(rec.interviewDate ?? rec.createdAt)}
                                </span>
                              </div>
                            </div>
                            {expanded ? <ChevronUp size={15} className="text-muted-foreground shrink-0" /> : <ChevronDown size={15} className="text-muted-foreground shrink-0" />}
                          </button>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            <AudioPlayer recordingId={rec.id} caseId={selectedCaseId} token={token} mimeType={rec.mimeType} />
                            <button
                              onClick={() => handleDelete(rec.id)}
                              disabled={deletingId === rec.id}
                              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
                            >
                              {deletingId === rec.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                          </div>
                        </div>

                        {expanded && (
                          <div className="border-t border-card-border px-4 py-3 space-y-3 bg-background/50">
                            {isRawOnly && (
                              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                AI structuring unavailable — raw transcript shown.
                              </p>
                            )}
                            {hasSections
                              ? rec.structuredNotes!.sections.map(s => (
                                  <div key={s.key}>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
                                    <p className="text-sm text-foreground whitespace-pre-wrap">{s.content}</p>
                                  </div>
                                ))
                              : rec.transcript
                                ? <p className="text-sm text-foreground whitespace-pre-wrap">{rec.transcript}</p>
                                : <p className="text-xs text-muted-foreground">No notes available.</p>
                            }
                            {hasSections && !isRawOnly && rec.transcript && (
                              <details className="text-xs text-muted-foreground">
                                <summary className="cursor-pointer font-medium hover:text-foreground">Raw transcript</summary>
                                <p className="mt-2 whitespace-pre-wrap leading-relaxed">{rec.transcript}</p>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
