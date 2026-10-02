import { useRef, useState } from "react";
import { Link } from "wouter";
import { Eye, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type TeacherReassignmentProps = {
  caseId: string;
  label: string;
  assignmentIds: string[];
  currentName: string;
  currentEmails: string[];
};

export function TeacherReassignmentAction({
  caseId,
  label,
  assignmentIds,
  currentName,
  currentEmails,
}: TeacherReassignmentProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const baseUrl = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const openDialog = () => {
    setName(currentName);
    setEmail(currentEmails[0] ?? "");
    setError(null);
    setOpen(true);
  };

  const handleSubmit = async () => {
    const recipientName = name.trim();
    const recipientEmail = email.trim();
    if (!recipientName) {
      setError("Enter the new teacher’s name.");
      return;
    }
    if (!emailPattern.test(recipientEmail)) {
      setError("Enter a valid email address for the new teacher.");
      return;
    }
    if (submittingRef.current || assignmentIds.length === 0) return;

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${baseUrl}/api/cases/${encodeURIComponent(caseId)}/teacher-reassignment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
        },
        body: JSON.stringify({
          assignmentIds,
          recipientName,
          recipientEmail,
        }),
      });
      const result = await response.json().catch(() => null) as {
        success?: boolean;
        updatedCount?: number;
        message?: string;
        error?: string;
      } | null;
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.message ?? result?.error ?? "The teacher details could not be saved. No changes were made.");
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/assignments`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/battery-review`] }),
        queryClient.invalidateQueries({
          predicate: query => query.queryKey.some(key =>
            typeof key === "string" &&
            key.startsWith(`/api/cases/${caseId}/assignments/`) &&
            key.endsWith("/staff-preview")
          ),
        }),
      ]);
      toast({
        title: "Teacher details saved",
        description: "Name and email updated. Existing forms, answers, links and battery approval are unchanged.",
      });
      setOpen(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "The teacher details could not be saved. Please try again.";
      setError(message);
      toast({ title: "Could not change teacher", description: message, variant: "destructive" });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-amber-200 text-amber-900 hover:bg-amber-50"
        data-testid="button-change-teacher"
        onClick={openDialog}
      >
        <UserRoundCog size={14} /> Change teacher
      </Button>
      <Dialog open={open} onOpenChange={nextOpen => {
        if (submitting) return;
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Change teacher</DialogTitle>
            <DialogDescription>
              Update the teacher’s name and email for the {label.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              Existing forms, answers, links and battery approval stay unchanged. No email is sent automatically.
            </div>
            <div className="space-y-2">
              <Label htmlFor="reassignment-name">Teacher name</Label>
              <Input
                id="reassignment-name"
                autoComplete="name"
                value={name}
                onChange={event => setName(event.target.value)}
                disabled={submitting}
                placeholder="e.g. Jordan Lee"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reassignment-email">Teacher email</Label>
              <Input
                id="reassignment-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                disabled={submitting}
                placeholder="e.g. jordan@school.edu"
                required
              />
            </div>
            {error && (
              <p role="alert" data-testid="status-teacher-reassignment-error" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" disabled={submitting} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={submitting}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type RetiredTeacherAssignment = {
  id: string;
  toolId?: string;
  toolName?: string;
  respondentType?: string;
  respondentLabel?: string | null;
  assignedToName?: string | null;
  assignedToEmail?: string | null;
  status?: string;
  submittedAt?: string | null;
  createdAt?: string;
  metadata?: {
    retiredAt?: string | null;
    retiredReason?: string | null;
    replacedByAssignmentId?: string | null;
    historicalScores?: unknown[] | Record<string, unknown> | null;
  } | null;
};

const teacherTypes = new Set([
  "teacher", "teacher1", "teacher2", "referring_teacher", "special_needs_teacher", "school_counselor", "boarding_staff",
]);
const intakeToolIds = new Set(["REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING", "CONSENT", "INTAKE"]);
const specializedToolIds = new Set(["RPPI", "RDA", "RRCA", "RRFA", "RAEPA", "RAMRI", "RMRA"]);

export function RetiredTeacherHistory({
  caseId,
  assignments,
}: {
  caseId: string;
  assignments: RetiredTeacherAssignment[];
}) {
  const history = assignments.filter(assignment =>
    teacherTypes.has(assignment.respondentType ?? "") &&
    !intakeToolIds.has(assignment.toolId ?? "") &&
    !specializedToolIds.has(assignment.toolId ?? "") &&
    assignment.respondentType !== "examiner"
  );
  if (history.length === 0) return null;

  return (
    <details className="border-t bg-slate-50/70">
      <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
        Previous teacher packages <span className="ml-1 text-xs font-normal text-slate-500">({history.length} retained form{history.length === 1 ? "" : "s"} · staff only)</span>
      </summary>
      <div className="space-y-2 border-t px-5 py-3">
        {history.map(assignment => {
          const hasHistoricalSubmission = assignment.status === "completed" ||
            Boolean(assignment.submittedAt) ||
            (Array.isArray(assignment.metadata?.historicalScores)
              ? assignment.metadata?.historicalScores.length > 0
              : Boolean(assignment.metadata?.historicalScores && Object.keys(assignment.metadata.historicalScores).length > 0));
          const teacher = assignment.assignedToName?.trim() || assignment.assignedToEmail?.trim() || "Unspecified teacher";
          return (
            <div key={assignment.id} className="flex flex-col gap-1 rounded-md border bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-xs">
                <p className="font-semibold text-slate-700">
                  {teacher}
                  {assignment.assignedToName && assignment.assignedToEmail && <span className="ml-1 font-normal text-slate-500">· {assignment.assignedToEmail}</span>}
                </p>
                <p className="text-slate-600">{assignment.toolName ?? assignment.toolId ?? "Assessment"}
                  {assignment.respondentLabel ? ` · ${assignment.respondentLabel}` : ""}
                  {assignment.submittedAt && ` · Submitted ${new Date(assignment.submittedAt).toLocaleDateString()}`}
                  {!assignment.submittedAt && assignment.status === "completed" && " · Submission retained"}
                  {assignment.metadata?.retiredAt && ` · Retired ${new Date(assignment.metadata.retiredAt).toLocaleDateString()}`}
                </p>
              </div>
              {hasHistoricalSubmission && (
                <Link href={`/cases/${caseId}/response/${assignment.id}`}>
                  <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1.5 bg-white text-xs">
                    <Eye size={13} /> View retained response
                  </Button>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}