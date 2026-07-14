import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiNotetaker, type Recording as InterviewRecording } from "./AiNotetaker";
import { Mic, ChevronDown, Loader2, Calendar, User } from "lucide-react";

interface ActiveCase {
  id: string;
  studentName: string;
  assessmentMeetingDate: string | null;
}

interface InvigilatorNotetakerPanelProps {
  currentCaseId: string;
  baseUrl: string;
  token: string;
}

function formatMeetingDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function InvigilatorNotetakerPanel({ currentCaseId, baseUrl, token }: InvigilatorNotetakerPanelProps) {
  const [activeCases, setActiveCases] = useState<ActiveCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(currentCaseId);
  const [recordings, setRecordings] = useState<InterviewRecording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);

  useEffect(() => {
    setLoadingCases(true);
    fetch(`${baseUrl}/api/invigilator/active-cases`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((cases: ActiveCase[]) => {
        setActiveCases(cases);
        // Keep currentCaseId selected if it's in the list; otherwise pick first
        const ids = cases.map((c: ActiveCase) => c.id);
        if (!ids.includes(currentCaseId) && cases.length > 0) {
          setSelectedCaseId(cases[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCases(false));
  }, [baseUrl, token, currentCaseId]);

  useEffect(() => {
    if (!selectedCaseId) return;
    setLoadingRecordings(true);
    fetch(`${baseUrl}/api/cases/${selectedCaseId}/interview-recordings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: InterviewRecording[]) => {
        const selectedStudent = activeCases.find(c => c.id === selectedCaseId)?.studentName;
        setRecordings(
          data.map(r => ({
            ...r,
            studentName: selectedStudent,
            interviewDate: r.interviewDate ?? null,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoadingRecordings(false));
  }, [selectedCaseId, baseUrl, token, activeCases]);

  const selectedCase = activeCases.find(c => c.id === selectedCaseId);
  const interviewDate = selectedCase?.assessmentMeetingDate ?? undefined;

  return (
    <Card className="border-none shadow-md bg-white">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
          <Mic size={15} className="text-indigo-500" />
          AI Interview Notetaker
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-5">

        {/* Case picker */}
        {loadingCases ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 size={13} className="animate-spin" /> Loading your active cases…
          </div>
        ) : activeCases.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">No active cases in assessment phase.</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Recording for</p>
            <div className="relative">
              <select
                value={selectedCaseId}
                onChange={e => setSelectedCaseId(e.target.value)}
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 pr-8 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent cursor-pointer"
              >
                {activeCases.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.studentName}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            {/* Selected case context */}
            {selectedCase && (
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <User size={11} className="text-indigo-400 shrink-0" />
                  <span className="font-medium text-slate-700">{selectedCase.studentName}</span>
                </div>
                {selectedCase.assessmentMeetingDate && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar size={11} className="text-indigo-400 shrink-0" />
                    <span>Scheduled: {formatMeetingDate(selectedCase.assessmentMeetingDate)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        {!loadingCases && activeCases.length > 0 && (
          <div className="border-t border-slate-100 -mx-4" />
        )}

        {/* Notetaker */}
        {!loadingCases && selectedCaseId && activeCases.length > 0 && (
          loadingRecordings ? (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <Loader2 size={13} className="animate-spin" /> Loading recordings…
            </div>
          ) : (
            <AiNotetaker
              caseId={selectedCaseId}
              baseUrl={baseUrl}
              token={token}
              availableTypes={["student_interview", "classroom_observation"]}
              defaultType="student_interview"
              interviewDate={interviewDate}
              recordings={recordings}
              onRecordingAdded={r => setRecordings(prev => [
                { ...r, studentName: selectedCase?.studentName },
                ...prev,
              ])}
              onRecordingDeleted={id => setRecordings(prev => prev.filter(r => r.id !== id))}
              onNotesUpdated={(id, notes) => setRecordings(prev =>
                prev.map(r => r.id === id ? { ...r, structuredNotes: notes } : r)
              )}
            />
          )
        )}
      </CardContent>
    </Card>
  );
}
