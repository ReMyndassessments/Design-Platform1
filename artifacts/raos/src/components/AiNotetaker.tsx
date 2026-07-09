import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioRecorder } from "./AudioRecorder";
import { Loader2, ChevronDown, ChevronUp, Trash2, Clock, Mic2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export type ConversationType =
  | "parent_intake"
  | "teacher_consultation"
  | "student_interview"
  | "classroom_observation"
  | "report_debrief";

const CONVERSATION_TYPE_LABELS: Record<ConversationType, string> = {
  parent_intake: "Parent / Guardian Intake",
  teacher_consultation: "Teacher Consultation",
  student_interview: "Student Interview",
  classroom_observation: "Classroom Observation",
  report_debrief: "Report Debrief",
};

export type NoteSection = {
  key: string;
  label: string;
  content: string;
};

export type StructuredNotes = {
  conversationType: ConversationType;
  sections: NoteSection[];
  rawTranscript: string;
  processedAt: string;
};

export type Recording = {
  id: string;
  caseId: string;
  storagePath: string;
  durationSeconds?: number;
  conversationType: string;
  mimeType: string;
  transcript?: string;
  structuredNotes?: StructuredNotes;
  createdAt: string;
};

type ProcessingStep = "uploading" | "transcribing" | "structuring" | "done";

const STEP_LABELS: Record<ProcessingStep, string> = {
  uploading: "Uploading audio…",
  transcribing: "Transcribing with Whisper…",
  structuring: "Organising clinical notes…",
  done: "Done",
};

function formatDuration(s?: number): string {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

interface AiNotetakerProps {
  caseId: string;
  baseUrl: string;
  token: string;
  availableTypes?: ConversationType[];
  defaultType?: ConversationType;
  recordings: Recording[];
  onRecordingAdded: (r: Recording) => void;
  onRecordingDeleted: (id: string) => void;
  onNotesUpdated?: (id: string, notes: StructuredNotes) => void;
}

export function AiNotetaker({
  caseId,
  baseUrl,
  token,
  availableTypes = ["parent_intake", "teacher_consultation", "student_interview", "classroom_observation"],
  defaultType = "parent_intake",
  recordings,
  onRecordingAdded,
  onRecordingDeleted,
  onNotesUpdated,
}: AiNotetakerProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<ConversationType>(defaultType);
  const [processingStep, setProcessingStep] = useState<ProcessingStep | null>(null);
  const [result, setResult] = useState<{ id: string; structuredNotes: StructuredNotes; transcript: string } | null>(null);
  const [editedSections, setEditedSections] = useState<NoteSection[] | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [expandedTranscript, setExpandedTranscript] = useState(false);
  const [expandedPastId, setExpandedPastId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleRecordingComplete = useCallback(async (blob: Blob, durationSeconds: number, mimeType: string) => {
    setResult(null);
    setEditedSections(null);
    setExpandedTranscript(false);

    setProcessingStep("uploading");
    try {
      const url = `${baseUrl}/api/cases/${caseId}/interview-recordings?type=${selectedType}&duration=${durationSeconds}`;
      setProcessingStep("transcribing");

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": mimeType,
          Authorization: `Bearer ${token}`,
        },
        body: blob,
      });

      setProcessingStep("structuring");

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${res.status}`);
      }

      const data = await res.json() as { id: string; transcript: string; structuredNotes: StructuredNotes };
      setProcessingStep("done");
      setResult({ id: data.id, structuredNotes: data.structuredNotes, transcript: data.transcript });
      setEditedSections(data.structuredNotes?.sections ?? null);

      onRecordingAdded({
        id: data.id,
        caseId,
        storagePath: "",
        durationSeconds,
        conversationType: selectedType,
        mimeType,
        transcript: data.transcript,
        structuredNotes: data.structuredNotes,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      toast({ title: "Processing failed", description: err.message || "Unknown error", variant: "destructive" });
    } finally {
      setProcessingStep(null);
    }
  }, [baseUrl, caseId, selectedType, token, onRecordingAdded, toast]);

  const handleSaveNotes = async () => {
    if (!result || !editedSections) return;
    setSavingNotes(true);
    try {
      const updatedNotes: StructuredNotes = { ...result.structuredNotes, sections: editedSections };
      const res = await fetch(`${baseUrl}/api/cases/${caseId}/interview-recordings/${result.id}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ structuredNotes: updatedNotes }),
      });
      if (!res.ok) throw new Error("Save failed");
      onNotesUpdated?.(result.id, updatedNotes);
      toast({ title: "Notes saved" });
    } catch {
      toast({ title: "Could not save notes", variant: "destructive" });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`${baseUrl}/api/cases/${caseId}/interview-recordings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      onRecordingDeleted(id);
      if (result?.id === id) { setResult(null); setEditedSections(null); }
    } catch {
      toast({ title: "Could not delete recording", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const isProcessing = processingStep !== null && processingStep !== "done";

  return (
    <div className="space-y-5">
      {/* Session type selector */}
      {!result && !isProcessing && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">Session type</p>
          <div className="flex flex-wrap gap-2">
            {availableTypes.map(t => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  selectedType === t
                    ? "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                {CONVERSATION_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recorder */}
      {!result && (
        <AudioRecorder
          onRecordingComplete={handleRecordingComplete}
          disabled={isProcessing}
        />
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
            <Loader2 size={16} className="animate-spin" />
            {STEP_LABELS[processingStep!]}
          </div>
          <div className="flex gap-1">
            {(["uploading", "transcribing", "structuring"] as ProcessingStep[]).map((step, i) => {
              const steps: ProcessingStep[] = ["uploading", "transcribing", "structuring"];
              const currentIdx = steps.indexOf(processingStep!);
              const stepIdx = steps.indexOf(step);
              return (
                <div
                  key={step}
                  className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                    stepIdx <= currentIdx ? "bg-blue-500" : "bg-blue-200"
                  }`}
                />
              );
            })}
          </div>
          <p className="text-xs text-blue-600">This usually takes 30–60 seconds…</p>
        </div>
      )}

      {/* Results */}
      {result && editedSections && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-0">
                {CONVERSATION_TYPE_LABELS[result.structuredNotes?.conversationType ?? selectedType]}
              </Badge>
              <span className="text-xs text-slate-500">
                {new Date(result.structuredNotes?.processedAt ?? Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-slate-400 hover:text-slate-600"
              onClick={() => { setResult(null); setEditedSections(null); setExpandedTranscript(false); }}
            >
              Record another
            </Button>
          </div>

          {/* Editable sections */}
          <div className="space-y-3">
            {editedSections.map((section, i) => (
              <div key={section.key} className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  {section.label}
                </label>
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-y"
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

          {/* Raw transcript (collapsible) */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
              onClick={() => setExpandedTranscript(v => !v)}
            >
              Raw transcript
              {expandedTranscript ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {expandedTranscript && (
              <div className="px-3 py-3 text-xs text-slate-600 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed bg-white">
                {result.transcript || "No transcript available."}
              </div>
            )}
          </div>

          <Button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white"
          >
            {savingNotes ? <><Loader2 size={14} className="mr-2 animate-spin" />Saving…</> : "Save Notes to Case"}
          </Button>
        </div>
      )}

      {/* Past recordings */}
      {recordings.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Past recordings</p>
          {recordings.map(rec => (
            <div key={rec.id} className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50">
                <button
                  className="flex items-center gap-2 text-left flex-1 min-w-0"
                  onClick={() => setExpandedPastId(expandedPastId === rec.id ? null : rec.id)}
                >
                  <Mic2 size={13} className="text-slate-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {CONVERSATION_TYPE_LABELS[rec.conversationType as ConversationType] ?? rec.conversationType}
                  </span>
                  {rec.durationSeconds && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                      <Clock size={10} /> {formatDuration(rec.durationSeconds)}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(rec.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                  {expandedPastId === rec.id ? <ChevronUp size={13} className="text-slate-400 shrink-0" /> : <ChevronDown size={13} className="text-slate-400 shrink-0" />}
                </button>
                <button
                  onClick={() => handleDelete(rec.id)}
                  disabled={deletingId === rec.id}
                  className="ml-2 text-slate-300 hover:text-red-400 transition-colors shrink-0"
                >
                  {deletingId === rec.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>

              {expandedPastId === rec.id && (
                <div className="px-3 py-3 space-y-3 bg-white">
                  {rec.structuredNotes?.sections?.map(s => (
                    <div key={s.key}>
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">{s.label}</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{s.content}</p>
                    </div>
                  ))}
                  {rec.transcript && (
                    <details className="text-xs text-slate-500">
                      <summary className="cursor-pointer font-medium text-slate-400 hover:text-slate-600">Raw transcript</summary>
                      <p className="mt-2 whitespace-pre-wrap leading-relaxed">{rec.transcript}</p>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
