import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiNotetaker, type Recording as InterviewRecording } from "./AiNotetaker";
import { Mic, ChevronDown, Loader2, Calendar, User, History, ClipboardList, ArrowRight } from "lucide-react";

interface ActiveCase {
  id: string;
  studentName: string;
  assessmentMeetingDate: string | null;
}

interface RamriSession {
  session_id: string;
  case_id: string;
  assignment_id: string;
  student_name: string;
  item_count: number;
  selection_count: number;
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

function formatRecordingDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
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
  const [perCaseRecordings, setPerCaseRecordings] = useState<InterviewRecording[]>([]);
  const [allRecordings, setAllRecordings] = useState<InterviewRecording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [ramriSessions, setRamriSessions] = useState<RamriSession[]>([]);

  // Fetch RAMRI sessions ready for this invigilator
  useEffect(() => {
    fetch(`${baseUrl}/api/invigilator/ramri-sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((rows: RamriSession[]) => setRamriSessions(rows))
      .catch(() => {});
  }, [baseUrl, token]);

  // Fetch active cases on mount
  useEffect(() => {
    setLoadingCases(true);
    fetch(`${baseUrl}/api/invigilator/active-cases`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((cases: ActiveCase[]) => {
        setActiveCases(cases);
        const ids = cases.map((c: ActiveCase) => c.id);
        if (!ids.includes(currentCaseId) && cases.length > 0) {
          setSelectedCaseId(cases[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCases(false));
  }, [baseUrl, token, currentCaseId]);

  // Fetch recordings for the selected case whenever it changes
  useEffect(() => {
    if (!selectedCaseId) return;
    setLoadingRecordings(true);
    const studentName = activeCases.find(c => c.id === selectedCaseId)?.studentName;
    fetch(`${baseUrl}/api/cases/${selectedCaseId}/interview-recordings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: InterviewRecording[]) => {
        setPerCaseRecordings(data.map(r => ({ ...r, studentName })));
      })
      .catch(() => {})
      .finally(() => setLoadingRecordings(false));
  }, [selectedCaseId, baseUrl, token, activeCases]);

  // Fetch all-case recordings when the user expands the history section
  useEffect(() => {
    if (!showAllHistory) return;
    setLoadingAll(true);
    fetch(`${baseUrl}/api/invigilator/all-recordings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: InterviewRecording[]) => setAllRecordings(data))
      .catch(() => {})
      .finally(() => setLoadingAll(false));
  }, [showAllHistory, baseUrl, token]);

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
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
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

        {/* Per-case notetaker */}
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
              recordings={perCaseRecordings}
              onRecordingAdded={r => {
                const newRec = { ...r, studentName: selectedCase?.studentName };
                setPerCaseRecordings(prev => [newRec, ...prev]);
                setAllRecordings(prev => [newRec, ...prev]);
              }}
              onRecordingDeleted={id => {
                setPerCaseRecordings(prev => prev.filter(r => r.id !== id));
                setAllRecordings(prev => prev.filter(r => r.id !== id));
              }}
              onNotesUpdated={(id, notes) => {
                const update = (prev: InterviewRecording[]) =>
                  prev.map(r => r.id === id ? { ...r, structuredNotes: notes } : r);
                setPerCaseRecordings(update);
                setAllRecordings(update);
              }}
            />
          )
        )}

        {/* RAMRI sessions ready for interview */}
        {ramriSessions.length > 0 && (
          <div className="border-t border-slate-100 -mx-4 pt-4 px-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ClipboardList size={11} className="text-violet-400" />
              RAMRI Interview Ready
            </p>
            {ramriSessions.map(sess => (
              <a
                key={sess.session_id}
                href={`/cases/${sess.case_id}/ramri/${sess.assignment_id}`}
                className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5 hover:bg-violet-100 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-violet-900 truncate">{sess.student_name}</p>
                  <p className="text-[11px] text-violet-500 mt-0.5">
                    {Number(sess.item_count)} choice{Number(sess.item_count) !== 1 ? "s" : ""} prepared
                    {Number(sess.selection_count) > 0 && ` · ${Number(sess.selection_count)} selected`}
                  </p>
                </div>
                <ArrowRight size={13} className="text-violet-400 group-hover:text-violet-600 shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        )}

        {/* Cross-case recording history */}
        {!loadingCases && activeCases.length > 1 && (
          <div className="border-t border-slate-100 -mx-4 pt-4 px-4">
            <button
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors w-full"
              onClick={() => setShowAllHistory(v => !v)}
            >
              <History size={13} className="text-slate-400" />
              All recordings across cases
              <ChevronDown size={13} className={`ml-auto text-slate-400 transition-transform ${showAllHistory ? "rotate-180" : ""}`} />
            </button>

            {showAllHistory && (
              <div className="mt-3 space-y-2">
                {loadingAll ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 size={12} className="animate-spin" /> Loading…
                  </div>
                ) : allRecordings.length === 0 ? (
                  <p className="text-xs text-slate-400">No recordings yet.</p>
                ) : (
                  allRecordings.map(rec => (
                    <div key={rec.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                      {rec.studentName && (
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 shrink-0">
                          {rec.studentName}
                        </span>
                      )}
                      <span className="text-xs text-slate-600 truncate flex-1">
                        {rec.conversationType === "student_interview" ? "Student Interview" : "Classroom Observation"}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {formatRecordingDate(rec.interviewDate ?? rec.createdAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
