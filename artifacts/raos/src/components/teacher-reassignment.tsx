import { useRef, useState } from "react";
import { Link } from "wouter";
import { Eye, UserRoundCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [acknowledgeRevocation, setAcknowledgeRevocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const baseUrl = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  const openDialog = () => {
    setName(currentName);
    setEmail("");
    setAcknowledgeRevocation(false);
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
    if (currentEmails.some(current => current.trim().toLowerCase() === recipientEmail.toLowerCase())) {
      setError("Enter a different email address from the current teacher.");
      return;
    }
    if (!acknowledgeRevocation) {
      setError("Confirm the link revocation and response-history details before continuing.");
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
          acknowledgeRevocation: true,
        }),
      });
      const result = await response.json().catch(() => null) as {
        success?: boolean;
        reassignedCount?: number;
        message?: string;
        error?: string;
      } | null;
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.message ?? result?.error ?? "The teacher package could not be reassigned. No changes were made.");
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
        title: "Teacher package reassigned",
        description: `${result.reassignedCount ?? assignmentIds.length} form${(result.reassignedCount ?? assignmentIds.length) === 1 ? "" : "s"} assigned to ${recipientName}. Fresh admin review and approval are required before sending.`,
      });
      setOpen(false);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "The teacher package could not be reassigned. Please try again.";
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
              Reassign the {label.toLowerCase()} to a new teacher. The current assessment links will be revoked and the new package will need fresh staff review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="font-semibold">What happens to this package</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-900">
                <li>Previously sent assessment links are revoked.</li>
                <li>Existing submissions are kept as staff-only history.</li>
                <li>The new teacher receives unanswered copies of the selected forms.</li>
                <li>No email is sent automatically. Staff must complete fresh admin review and approval before using Send Email.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reassignment-name">New teacher name</Label>
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
              <Label htmlFor="reassignment-email">New teacher email</Label>
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
            <div className="flex items-start gap-2.5 rounded-md border p-3">
              <Checkbox
                id="acknowledge-revocation"
                checked={acknowledgeRevocation}
                disabled={submitting}
                onCheckedChange={checked => setAcknowledgeRevocation(checked === true)}
              />
              <Label htmlFor="acknowledge-revocation" className="cursor-pointer text-sm leading-5 text-slate-700">
                I confirm that previously sent links will be revoked and existing submissions will remain available only as staff history.
              </Label>
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
                disabled={submitting || !acknowledgeRevocation}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Changing teacher…" : "Change teacher"}
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