import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, X, MessageSquareQuote } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function authHeaders() {
  const token = localStorage.getItem("raos_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

interface ApprenticeAssignment {
  id: string;
  caseId: string;
  apprenticeUserId: string;
  status: string;
  notes: string | null;
  apprentice: { id: string; name: string; email: string } | null;
}

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function ApprenticeAssignmentPanel({ caseId }: { caseId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedApprenticeId, setSelectedApprenticeId] = useState("");
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [feedbackTargetId, setFeedbackTargetId] = useState<string | null>(null);

  const { data: assignments, isLoading } = useQuery<ApprenticeAssignment[]>({
    queryKey: ["case-apprentices", caseId],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/apprentices`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: users } = useQuery<StaffUser[]>({
    queryKey: ["team-users-for-apprentice-panel"],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL}/api/users/assignable`, { headers: authHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const allApprentices = (users ?? []).filter(u => u.role === "clinical_apprentice");
  const activeAssignments = (assignments ?? []).filter(a => a.status === "active");
  const assignedIds = new Set(activeAssignments.map(a => a.apprenticeUserId));
  const availableApprentices = allApprentices.filter(u => !assignedIds.has(u.id));

  const assignMut = useMutation({
    mutationFn: async (apprenticeUserId: string) => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/apprentices`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ apprenticeUserId }),
      });
      if (!res.ok) throw new Error((await res.json()).message ?? "Failed to assign apprentice");
      return res.json();
    },
    onSuccess: () => {
      setSelectedApprenticeId("");
      qc.invalidateQueries({ queryKey: ["case-apprentices", caseId] });
      toast({ title: "Apprentice assigned to case" });
    },
    onError: (e: Error) => toast({ title: e.message, variant: "destructive" }),
  });

  const removeMut = useMutation({
    mutationFn: async (assignmentId: string) => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/apprentices/${assignmentId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to remove apprentice");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["case-apprentices", caseId] });
      toast({ title: "Apprentice access removed" });
    },
  });

  const feedbackMut = useMutation({
    mutationFn: async ({ apprenticeUserId, feedbackText }: { apprenticeUserId: string; feedbackText: string }) => {
      const res = await fetch(`${BASE_URL}/api/cases/${caseId}/apprentice-feedback`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ apprenticeUserId, feedbackText }),
      });
      if (!res.ok) throw new Error("Failed to send feedback");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      setFeedbackDrafts(prev => ({ ...prev, [vars.apprenticeUserId]: "" }));
      setFeedbackTargetId(null);
      toast({ title: "Feedback sent to apprentice" });
    },
    onError: () => toast({ title: "Could not send feedback", variant: "destructive" }),
  });

  return (
    <Card className="border-none shadow-md bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 text-slate-800">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 shrink-0">
            <GraduationCap size={13} />
          </span>
          Clinical Apprentices on this Case
        </CardTitle>
        <p className="text-xs text-slate-500 mt-0.5">
          Apprentices get read-only access to this case for learning purposes — no scoring, editing, or report release.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isLoading && activeAssignments.length === 0 && (
          <p className="text-sm text-slate-400">No apprentices assigned to this case yet.</p>
        )}
        {activeAssignments.map(a => (
          <div key={a.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-slate-800">{a.apprentice?.name ?? "Unknown apprentice"}</p>
                <p className="text-xs text-slate-400">{a.apprentice?.email}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                  onClick={() => setFeedbackTargetId(feedbackTargetId === a.apprenticeUserId ? null : a.apprenticeUserId)}
                >
                  <MessageSquareQuote size={12} /> Feedback
                </Button>
                <button
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                  onClick={() => removeMut.mutate(a.id)}
                  title="Remove apprentice access"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
            {feedbackTargetId === a.apprenticeUserId && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <Textarea
                  rows={3}
                  placeholder="Share feedback on this apprentice's engagement with this case…"
                  value={feedbackDrafts[a.apprenticeUserId] ?? ""}
                  onChange={e => setFeedbackDrafts(prev => ({ ...prev, [a.apprenticeUserId]: e.target.value }))}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!feedbackDrafts[a.apprenticeUserId]?.trim() || feedbackMut.isPending}
                    onClick={() => feedbackMut.mutate({ apprenticeUserId: a.apprenticeUserId, feedbackText: feedbackDrafts[a.apprenticeUserId]!.trim() })}
                  >
                    {feedbackMut.isPending ? "Sending…" : "Send Feedback"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}

        {availableApprentices.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <Select value={selectedApprenticeId} onValueChange={setSelectedApprenticeId}>
              <SelectTrigger className="h-9 text-sm flex-1">
                <SelectValue placeholder="Assign an apprentice…" />
              </SelectTrigger>
              <SelectContent>
                {availableApprentices.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.email})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={!selectedApprenticeId || assignMut.isPending}
              onClick={() => assignMut.mutate(selectedApprenticeId)}
            >
              {assignMut.isPending ? "Adding…" : "Add"}
            </Button>
          </div>
        )}
        {allApprentices.length === 0 && (
          <p className="text-xs text-slate-400">No Clinical Apprentice accounts exist yet — add one from the Team page.</p>
        )}
      </CardContent>
    </Card>
  );
}
