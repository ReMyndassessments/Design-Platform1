import { useParams, Link, useLocation } from "wouter";
import { 
  useGetCase, 
  useAdvanceCasePhase, 
  useAnalyzeIntake, 
  useListAssessmentTools,
  useCreateAssignment,
  useDeleteAssignment,
  useUpdateCase,
  useGetCurrentUser,
  useListUsers,
  customFetch,
  getGetCaseQueryKey,
  type CaseDetail as CaseDetailResponse,
  type CreateAssignmentRequestRespondentType 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { 
  ArrowLeft, CheckCircle2, ChevronRight, ChevronLeft,
  Copy, ExternalLink, QrCode, FileBarChart, Edit, Play, Trash2, Lock, ShieldAlert, Eye,
  Mail, LayoutGrid, Video, CopyCheck, ShieldCheck, RefreshCw,
  Circle, PackageCheck, Link2, X, FileEdit, Send, Users, Pencil, Check, UserPlus, Brain, FlaskConical, Radio, Mic, MoreHorizontal, Monitor
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect, useRef, useMemo } from "react";
import { ASSESSMENT_PRODUCTS, ALL_PRODUCTS_BY_MARKET } from "@/lib/products";
import { toolDisplayName, assignmentRespondentTypes, missingTeacherAssignments } from "@/lib/assignment-respondents";
import { assignmentInvitationLink, respondentInvitationGroupKey } from "@/lib/assignment-invitation-links";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { ReportAccessPanel } from "@/components/ReportAccessPanel";
import { ApprenticeAssignmentPanel } from "@/components/apprentice-assignment-panel";
import { AiNotetaker, type Recording as InterviewRecording } from "@/components/AiNotetaker";
import { IntakeFollowUp } from "@/components/IntakeFollowUp";
import { InvigilatorNotetakerPanel } from "@/components/InvigilatorNotetakerPanel";
import { useWatchAlong } from "@/hooks/use-watch-along";
import { GuidedTour } from "@/components/guided-tour";
import { QuestionnaireTestStatus } from "@/components/QuestionnaireTestStatus";
import type { QuestionnaireTestResult } from "@/lib/form-test-review";

const PHASES = [
  "intake", "assessment", "scoring", "report", "final_review", "debrief", "complete"
];
const INTERNAL_PHASES = [
  "pre_commitment", "intake", "setup", "forms", "assessment",
  "scoring", "report", "final_review", "debrief", "complete",
];
const PHASE_PROGRESS: Record<string, number> = {
  pre_commitment: 5, intake: 15, setup: 25, forms: 38,
  assessment: 52, scoring: 66, report: 79, final_review: 90, debrief: 95, complete: 100,
};
const PHASE_LABELS: Record<string, string> = {
  pre_commitment: "Pre-Commitment",
  intake: "Intake",
  setup: "Setup",
  forms: "Forms",
  assessment: "Assessment",
  scoring: "Scoring",
  report: "Report",
  final_review: "Final Review",
  debrief: "Debrief",
  complete: "Complete",
};
type BatteryReviewStatus = {
  approved: boolean;
  approval: { approvedAt: string; approvedBy: string } | null;
  assignmentCount: number;
  missingSnapshots: number;
  issues: string[];
  fingerprint: string;
  questionnaireCount: number;
  passedCount: number;
  testResults: Record<string, QuestionnaireTestResult>;
};
const BATTERY_STALE_APPROVAL_ISSUE_PREFIX = "Assessment assignments changed after approval.";
const hasBlockingBatteryReviewIssues = (issues: string[]) =>
  issues.some(issue => !issue.startsWith(BATTERY_STALE_APPROVAL_ISSUE_PREFIX));
// Map hidden internal phases to their nearest visible display phase
const PHASE_DISPLAY_MAP: Record<string, string> = {
  pre_commitment: "intake",
  setup: "intake",
  forms: "intake",
};
function displayPhase(phase: string): string {
  return PHASE_DISPLAY_MAP[phase] ?? phase;
}

function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [year, month, day] = dob.split("-").map(Number);
  const today = new Date();
  return today.getUTCFullYear() - year -
    (today.getUTCMonth() + 1 < month || (today.getUTCMonth() + 1 === month && today.getUTCDate() < day) ? 1 : 0);
}

const LEAD_PHASES = new Set(["pre_commitment", "intake"]);
const INTAKE_TOOL_IDS = new Set(["REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING", "CONSENT", "SYC-ASSENT", "INTAKE"]);
const SPECIALIZED_EXAMINER_TOOL_IDS = new Set(["RPPI", "RDA", "RRCA", "RRFA", "RAEPA", "RAMRI", "RMRA"]);
const getExaminerWorkflowPath = (toolId: string | null | undefined) =>
  toolId && SPECIALIZED_EXAMINER_TOOL_IDS.has(toolId) ? toolId.toLowerCase() : null;
const isSeparateExaminerWorkflow = (assignment: { toolId?: string | null; respondentType: string }) =>
  assignment.toolId === "RPPI" ||
  (assignment.respondentType === "examiner" && SPECIALIZED_EXAMINER_TOOL_IDS.has(assignment.toolId ?? ""));
const EXTERNAL_RESPONDENT_TYPES = new Set(["parent", "teacher", "teacher1", "teacher2", "referring_teacher", "boarding_staff", "special_needs_teacher", "school_counselor", "self", "invigilator"]);

const RESPONDENT_LABELS: Record<string, string> = {
  parent: "Parent Assessment Package",
  teacher1: "Teacher Assessment Package 1",
  teacher2: "Teacher Assessment Package 2",
  self: "Student Self-Report Package",
  school_counselor: "School Counselor",
  special_needs_teacher: "Special Needs Teacher",
  referring_teacher: "Referring Teacher",
  boarding_staff: "Boarding Staff",
  invigilator: "Assessment Administration Team",
};

const RESPONDENT_TYPES_IN_MODAL = [
  "parent", "teacher1", "teacher2", "boarding_staff", "referring_teacher", "self", "invigilator", "examiner",
] as const;

const RESPONDENT_TYPE_LABELS: Record<string, string> = {
  parent:            "Parent Assessment Package",
  teacher:           "Teacher Assessment Package",
  teacher1:          "Teacher Assessment Package 1",
  teacher2:          "Teacher Assessment Package 2",
  referring_teacher: "Referring Teacher",
  boarding_staff:    "Boarding Staff",
  self:              "Student Self-Report Package",
  examiner:          "Examiner-Administered Battery",
  invigilator:       "Invigilator / Assessment Administration Team",
};

const SYC_CORE_EVIDENCE_TOOLS = [
  { toolId: "RCEP-CORE", label: "ReMynd Comprehensive Educational Profile — Tier 2 Core (RCEP-Core)" },
  { toolId: "REMYND-CLASSROOM-OBS", label: "Structured Classroom Learning Observation" },
  { toolId: "REMYND-WORK-REVIEW", label: "Student Work Sample & Intervention History Review" },
] as const;

function canAdvancePhase(role: string): boolean {
  return role === "admin" || role === "school_clinical_coordinator";
}

function isPhaseVisible(_role: string, _phase: string): boolean {
  return true;
}

const TIMEZONES = [
  { value: "Asia/Singapore",    label: "Singapore (SGT, UTC+8)" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (MYT, UTC+8)" },
  { value: "Asia/Hong_Kong",    label: "Hong Kong (HKT, UTC+8)" },
  { value: "Asia/Shanghai",     label: "China (CST, UTC+8)" },
  { value: "Asia/Tokyo",        label: "Japan (JST, UTC+9)" },
  { value: "Asia/Seoul",        label: "Korea (KST, UTC+9)" },
  { value: "Asia/Bangkok",      label: "Bangkok / Jakarta (ICT/WIB, UTC+7)" },
  { value: "Asia/Kolkata",      label: "India (IST, UTC+5:30)" },
  { value: "Asia/Dubai",        label: "Dubai (GST, UTC+4)" },
  { value: "Europe/London",     label: "London (GMT/BST)" },
  { value: "Europe/Paris",      label: "Paris / Berlin (CET/CEST)" },
  { value: "America/New_York",  label: "New York (EST/EDT)" },
  { value: "America/Chicago",   label: "Chicago (CST/CDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "Australia/Sydney",  label: "Sydney (AEDT/AEST)" },
  { value: "Pacific/Auckland",  label: "Auckland (NZST/NZDT)" },
];

function getTzAbbr(tz: string, date: Date): string {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(date)
      .find(p => p.type === "timeZoneName")?.value ?? tz;
  } catch { return tz; }
}

export default function CaseDetail() {
  const params = useParams();
  const caseId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [, setLocation] = useLocation();
  const { data: currentUser, isLoading: userLoading } = useGetCurrentUser();
  const { data: c, isLoading, isError, error } = useGetCase(caseId);
  const watchAlong = useWatchAlong();
  const advancePhaseMut = useAdvanceCasePhase();
  const analyzeIntakeMut = useAnalyzeIntake();
  const updateCaseMut = useUpdateCase();
  const { data: tools } = useListAssessmentTools();
  const { data: staffUsers } = useListUsers();
  const createAssignmentMut = useCreateAssignment();
  const deleteAssignmentMut = useDeleteAssignment();

  const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const batteryReviewQueryKey = [`/api/cases/${caseId}/battery-review`];
  const batteryReviewQuery = useQuery<BatteryReviewStatus>({
    queryKey: batteryReviewQueryKey,
    enabled: Boolean(caseId && currentUser),
    staleTime: 0,
    refetchOnMount: "always",
    refetchInterval: 30000,
    queryFn: async () => {
      const response = await fetch(`${BASE_URL}/api/cases/${encodeURIComponent(caseId)}/battery-review`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? "Unable to load staff battery review status.");
      }
      return response.json() as Promise<BatteryReviewStatus>;
    },
  });
  const [approvingBattery, setApprovingBattery] = useState(false);
  const [batteryReviewActionError, setBatteryReviewActionError] = useState<string | null>(null);
  const [sendEmailError, setSendEmailError] = useState<string | null>(null);

  const queryParams = new URLSearchParams(window.location.search);
  const [tourVisible, setTourVisible] = useState(queryParams.get("tour") === "true");

  const internalTourSteps = [
    {
      target: "#tour-header",
      title: "Clinical Dashboard",
      content: "Welcome to the ReMynd staff interface. This dashboard centralizes all assessment data, communications, and forms, giving clinical teams high information density at a glance."
    },
    {
      target: "#tour-ai-synthesis",
      title: "AI Intake Synthesis",
      content: "ReMynd uses AI to read lengthy referral forms and generate concise recommendations. This removes administrative burden while keeping the human expert firmly in the driver's seat."
    },
    {
      target: "#tour-assignments",
      title: "Smart Assignments",
      content: "Build and dispatch specialized assessment packages to parents, teachers, students, and examiners, then track completion from the case workspace."
    },
    {
      target: "#tour-report-access",
      title: "Drafting & Privacy Controls",
      content: "Final reports require a dual-approval process (Psychologist & Admin). Once approved, families retain control over who gets to view the report via their own portal."
    }
  ];

  const stepBackMut = useMutation({
    mutationFn: async ({ targetPhase }: { targetPhase?: string }) => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/step-back`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(targetPhase ? { targetPhase } : {}),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: (_result, variables) => {
      toast({ title: variables.targetPhase ? `Returned to ${PHASE_LABELS[variables.targetPhase]}` : "Phase stepped back" });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setStepBackConfirmOpen(false);
      setStepBackTarget(null);
    },
    onError: () => toast({ title: "Could not step back", variant: "destructive" }),
  });

  const dismissToolMut = useMutation({
    mutationFn: (toolId: string) =>
      customFetch<CaseDetailResponse>(`${BASE_URL}/api/cases/${caseId}/dismiss-recommended-tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId }),
        credentials: "include",
      }),
    onMutate: () => queryClient.cancelQueries({ queryKey: getGetCaseQueryKey(caseId) }),
    onSuccess: (updatedCase) => {
      // This endpoint returns the case row, not its assignments. Keep the battery
      // intact while applying the saved dismissal immediately.
      queryClient.setQueryData<CaseDetailResponse>(getGetCaseQueryKey(caseId), current =>
        current ? { ...current, intakeAnalysis: updatedCase.intakeAnalysis } : current);
      queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) });
    },
    onError: () => toast({
      title: "Could not dismiss assessment",
      description: "The recommendation has been kept. Please try again.",
      variant: "destructive",
    }),
  });

  const unassignToolMut = useMutation({
    mutationFn: async (toolId: string) => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/assignments/by-tool/${toolId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (r.status === 409) throw new Error("Cannot unassign a completed assessment");
      if (!r.ok) throw new Error("Failed to unassign tool");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      toast({ title: "Assessment unassigned" });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeQr, setActiveQr] = useState<string>("");
  const [addAssignmentModalOpen, setAddAssignmentModalOpen] = useState(false);
  const [isSubmittingAssignments, setIsSubmittingAssignments] = useState(false);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState<{ id: string; name: string } | null>(null);
  const [editCaseOpen, setEditCaseOpen] = useState(false);
  const [deleteCaseOpen, setDeleteCaseOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [assigningToolId, setAssigningToolId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ studentName: "", dob: "", school: "", grade: "", languagePreference: "", referralReason: "", parentName: "", parentEmail: "", parentPhone: "", caseStatus: "", caseMode: "live", workingDocUrl: "", assignedLeadId: "", assignedPsychId: "" });
  
  const [newAssignment, setNewAssignment] = useState({
    toolIds: [] as string[],
    respondentTypes: [] as string[],
    respondentLabel: "",
    assignedToName: "",
    assignedToEmail: ""
  });
  const [editingNameKey, setEditingNameKey] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [consolidatingParent, setConsolidatingParent] = useState(false);

  const handleSaveRespondentName = async (group: { groupKey: string; forms: { id: string }[] }) => {
    if (!editingNameValue.trim()) return;
    setSavingName(true);
    try {
      const responses = await Promise.all(group.forms.map(f =>
        fetch(`${BASE_URL}/api/cases/${caseId}/assignments/${f.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
          body: JSON.stringify({ assignedToName: editingNameValue.trim() }),
        })
      ));
      if (responses.some(r => !r.ok)) throw new Error("patch failed");
      await queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      setEditingNameKey(null);
      toast({ title: "Name saved — portal header updated" });
    } catch {
      toast({ title: "Could not save name", variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  const handleConsolidateParent = async () => {
    if (!window.confirm("These two unnamed parent rows belong to the same person. Combine their assessment forms under one link? The other parent assessment entry links will stop opening the portal. Completed intake links and responses are kept; duplicate forms are NOT deleted.")) return;
    setConsolidatingParent(true);
    try {
      const response = await fetch(`${BASE_URL}/api/cases/${encodeURIComponent(caseId)}/assignments/consolidate-parent`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token") ?? ""}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(data.message ?? "Could not combine the parent packages.");
      }
      const result = await response.json() as { updated: number; expected: number };
      if (result.updated !== result.expected) throw new Error("Only some forms were combined. Refresh and try again.");
      toast({ title: "One parent link ready to share", description: `${result.updated} forms joined the parent package; the other assessment links were retired. Review the duplicate CDP form before sending.` });
    } catch (error) {
      toast({ title: "Could not combine parent forms", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/assignments`] });
      setConsolidatingParent(false);
    }
  };

  const [sendEmailTarget, setSendEmailTarget] = useState<{
    groupKey: string; label: string; name: string; email: string; link: string; formNames: string[]; respondentRole: string; assignmentIds: string[]; requiresFormTest: boolean;
  } | null>(null);
  const [sendEmailForm, setSendEmailForm] = useState({ name: "", email: "" });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [testPackageTarget, setTestPackageTarget] = useState<{ label: string; assignmentIds: string[] } | null>(null);
  const [testPackageEmail, setTestPackageEmail] = useState("");
  const [testPackageError, setTestPackageError] = useState<string | null>(null);
  const [testPackageExpiresAt, setTestPackageExpiresAt] = useState<string | null>(null);
  const [isSendingTestPackage, setIsSendingTestPackage] = useState(false);
  const [stepBackConfirmOpen, setStepBackConfirmOpen] = useState(false);
  const [stepBackTarget, setStepBackTarget] = useState<string | null>(null);
  const [openingDemoPortal, setOpeningDemoPortal] = useState(false);
  const separateExaminerCount = (c?.assignments ?? []).filter(isSeparateExaminerWorkflow).length;

  const handleApproveBattery = async () => {
    const review = batteryReviewQuery.data;
    if (currentUser?.role !== "admin" || batteryReviewQuery.isFetching || !review?.fingerprint || hasBlockingBatteryReviewIssues(review.issues) || review.missingSnapshots > 0 || review.assignmentCount === 0) return;
    setApprovingBattery(true);
    setBatteryReviewActionError(null);
    try {
      const response = await fetch(`${BASE_URL}/api/cases/${encodeURIComponent(caseId)}/battery-review/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
        },
        body: JSON.stringify({ fingerprint: review.fingerprint }),
      });
      const body = await response.json().catch(() => null) as BatteryReviewStatus & { message?: string; error?: string } | null;
      if (!response.ok || !body) throw new Error(body?.message ?? "The battery could not be approved. Refresh and review the listed issues.");
      queryClient.setQueryData(batteryReviewQueryKey, body);
      await queryClient.invalidateQueries({ queryKey: batteryReviewQueryKey });
      toast({ title: "Questionnaire links approved for sending", description: "Recipient links are now available to authorized staff. Examiner workflows are separate." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Review status changed. Refresh and try again.";
      setBatteryReviewActionError(message);
      await queryClient.invalidateQueries({ queryKey: batteryReviewQueryKey });
    } finally {
      setApprovingBattery(false);
    }
  };

  const handleOpenDemoPortal = async () => {
    setOpeningDemoPortal(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${base}/api/cases/${caseId}/report-access/portal-preview`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) { toast({ title: "Could not open demo portal", variant: "destructive" }); return; }
      const { portalUrl } = await r.json() as { portalUrl: string };
      window.open(portalUrl, "_blank");
    } catch {
      toast({ title: "Could not open demo portal", variant: "destructive" });
    } finally {
      setOpeningDemoPortal(false);
    }
  };

  const handleSendTestPackage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!testPackageTarget || !testPackageEmail.trim() || isSendingTestPackage) return;
    setIsSendingTestPackage(true);
    setTestPackageError(null);
    setTestPackageExpiresAt(null);
    try {
      const response = await fetch(`${BASE_URL}/api/cases/${encodeURIComponent(caseId)}/battery-test-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("raos_token") ?? ""}`,
        },
        body: JSON.stringify({
          toEmail: testPackageEmail.trim(),
          assignmentIds: testPackageTarget.assignmentIds,
        }),
      });
      const body = await response.json().catch(() => null) as { success?: boolean; expiresAt?: string; message?: string; error?: string } | null;
      if (!response.ok || !body?.success || !body.expiresAt) {
        throw new Error(body?.message ?? body?.error ?? "The test package email could not be sent.");
      }
      setTestPackageExpiresAt(body.expiresAt);
      toast({
        title: "Test package link sent",
        description: `Sent to ${testPackageEmail.trim()}. This does not change the respondent's real link or email.`,
      });
    } catch (error) {
      setTestPackageError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSendingTestPackage(false);
    }
  };
  const [showAllTools, setShowAllTools] = useState(false);
  const [meetingLinkCopied, setMeetingLinkCopied] = useState(false);
  const [creatingModeratedMeeting, setCreatingModeratedMeeting] = useState(false);
  const [sendInviteOpen, setSendInviteOpen] = useState(false);
  const [inviteChecked, setInviteChecked] = useState<Record<string, boolean>>({});
  const [sendingInvite, setSendingInvite] = useState(false);
  const [extraInviteEmail, setExtraInviteEmail] = useState("");
  const [extraInviteEmails, setExtraInviteEmails] = useState<string[]>([]);
  const [editingMeetingUrl, setEditingMeetingUrl] = useState(false);
  const [meetingUrlDraft, setMeetingUrlDraft] = useState("");
  const [savingMeetingUrl, setSavingMeetingUrl] = useState(false);
  const [generatingAssessmentRoom, setGeneratingAssessmentRoom] = useState(false);
  const [showAssessmentManualPaste, setShowAssessmentManualPaste] = useState(false);
  const [formModalUrl, setFormModalUrl] = useState<string | null>(null);
  const [addSecondParentOpen, setAddSecondParentOpen] = useState(false);
  const [secondParentForm, setSecondParentForm] = useState({ name: "", email: "" });
  const [isAddingSecondParent, setIsAddingSecondParent] = useState(false);
  const [assessmentDateDraft, setAssessmentDateDraft] = useState("");
  const [assessmentTz, setAssessmentTz] = useState("Asia/Singapore");
  const [savingAssessmentDate, setSavingAssessmentDate] = useState(false);

  // ── Parent Interview Notes state ───────────────────────────────────────────
  const [interviewNotesDraft, setInterviewNotesDraft] = useState<string>("");
  const [interviewNotesSaved, setInterviewNotesSaved] = useState(false);
  const [savingInterviewNotes, setSavingInterviewNotes] = useState(false);
  const [leadContextDraft, setLeadContextDraft] = useState("");

  // ── AI Notetaker state ─────────────────────────────────────────────────────
  const [interviewRecordings, setInterviewRecordings] = useState<InterviewRecording[]>([]);
  const [interviewTab, setInterviewTab] = useState<"notes" | "notetaker">("notes");

  // ── Report Workspace state ─────────────────────────────────────────────────
  const [reportDocInput, setReportDocInput] = useState("");
  const [editingReportDoc, setEditingReportDoc] = useState(false);
  const [isAttachingReport, setIsAttachingReport] = useState(false);
  const [isTogglingApproval, setIsTogglingApproval] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const autoAttachFiredRef = useRef(false);

  useEffect(() => {
    if (c?.workingDocUrl) setReportDocInput(c.workingDocUrl);
  }, [c?.workingDocUrl]);

  useEffect(() => {
    setInterviewNotesDraft((c as any)?.parentInterviewNotes ?? "");
  }, [(c as any)?.parentInterviewNotes]);

  useEffect(() => {
    setLeadContextDraft(((c?.intakeAnalysis as any)?.leadContext as string) ?? "");
  }, [(c?.intakeAnalysis as any)?.leadContext]);

  useEffect(() => {
    if (!caseId) return;
    fetch(`${BASE_URL}/api/cases/${caseId}/interview-recordings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: InterviewRecording[]) => setInterviewRecordings(data))
      .catch(() => {});
  }, [caseId]);

  const handleSaveInterviewNotes = async () => {
    setSavingInterviewNotes(true);
    setInterviewNotesSaved(false);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
        },
        body: JSON.stringify({ parentInterviewNotes: interviewNotesDraft }),
      });
      if (!r.ok) throw new Error("save failed");
      await queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      setInterviewNotesSaved(true);
      setTimeout(() => setInterviewNotesSaved(false), 3000);
    } catch {
      toast({ title: "Could not save notes", variant: "destructive" });
    } finally {
      setSavingInterviewNotes(false);
    }
  };

  const handleSaveReportDocUrl = () => {
    updateCaseMut.mutate({ caseId, data: { workingDocUrl: reportDocInput.trim() } }, {
      onSuccess: () => {
        toast({ title: "Working document saved" });
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
        setEditingReportDoc(false);
      },
      onError: () => toast({ title: "Failed to save URL", variant: "destructive" })
    });
  };

  const handleRemoveReportDocUrl = () => {
    updateCaseMut.mutate({ caseId, data: { workingDocUrl: "" } }, {
      onSuccess: () => {
        toast({ title: "Working document removed" });
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
        setReportDocInput("");
        setEditingReportDoc(false);
      }
    });
  };

  const handleToggleReportApproval = async (approve: boolean, overridePsych = false) => {
    setIsTogglingApproval(true);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/report-approval`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approved: approve, overridePsych }),
      });
      if (!r.ok) {
        const d = await r.json();
        toast({ title: d.message ?? "Failed to save approval", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
    } catch {
      toast({ title: "Failed to save approval. Please try again.", variant: "destructive" });
    } finally {
      setIsTogglingApproval(false);
    }
  };

  const handleAttachReport = async () => {
    setIsAttachingReport(true);
    setAttachError(null);
    try {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/report-access/import-google-doc`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      const data = await r.json();
      if (!r.ok) {
        const msg = data.message ?? "Could not import the Google Doc. Please try again.";
        setAttachError(msg);
        toast({ title: msg, variant: "destructive" });
        autoAttachFiredRef.current = false;
        return;
      }
      toast({ title: "Report attached", description: "The working document has been added to the report access section below." });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
    } catch {
      const msg = "Import failed. Please try again.";
      setAttachError(msg);
      toast({ title: msg, variant: "destructive" });
      autoAttachFiredRef.current = false;
    } finally {
      setIsAttachingReport(false);
    }
  };

  // Auto-attach when both approvals are in and phase hasn't advanced yet
  useEffect(() => {
    if (
      c?.adminApprovedReport &&
      c?.psychApprovedReport &&
      ['scoring', 'report'].includes(c?.currentPhase ?? '') &&
      !isAttachingReport &&
      !autoAttachFiredRef.current
    ) {
      autoAttachFiredRef.current = true;
      handleAttachReport();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c?.adminApprovedReport, c?.psychApprovedReport, c?.currentPhase]);

  const CDP_TOOL_IDS = new Set(["CDP-CL", "CDP-SI", "CDP-SR", "CDP-CI"]);
  const hasCdpBattery = c?.assignments?.some(a => CDP_TOOL_IDS.has(a.toolId ?? ""));

  const LITERACY_TOOL_IDS = new Set(["RPPI", "RDA", "RRFA", "RRCA"]);
  const hasLiteracyBattery = c?.assignments?.some(a => LITERACY_TOOL_IDS.has(a.toolId ?? ""));

  const REMYND_AUTO_TOOL_IDS = new Set(["RCS-80", "RASR", "RASR-OBS", "RARI", "REFI", "RERMS", "RSCP", "RARPS", "RFII", "RCEP", "RCEP-CORE", "BSPP", "RDA"]);
  const isAtOrPastScoring = ["scoring", "report", "final_review", "debrief", "complete"].includes(c?.currentPhase ?? "");
  const hasRemyndBattery = isAtOrPastScoring && c?.assignments?.some(
    a => REMYND_AUTO_TOOL_IDS.has(a.toolId ?? "") && a.status === "completed"
  );

  // ── Product assignment state ─────────────────────────────────────────────────
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productAssigning, setProductAssigning] = useState(false);
  const [completingTeacherForms, setCompletingTeacherForms] = useState(false);

  type ProductRespondentSlot = { respondentType: string; label: string; selected: boolean; name: string; email: string };
  const [productRespondentSlots, setProductRespondentSlots] = useState<ProductRespondentSlot[]>([]);

  const RT_ORDER = ["parent", "teacher1", "teacher2", "referring_teacher", "boarding_staff", "self", "invigilator"];
  const DEFAULT_SELECTED_RTS = new Set(["parent", "teacher1", "teacher2", "self"]);
  const missingTeacherForms = missingTeacherAssignments(
    new Set((c?.assignments ?? []).map(a => `${a.toolId}\0${a.respondentType}`)),
    tools ?? [],
  );

  const loadExistingAssignmentKeys = async (): Promise<Set<string>> => {
    const response = await fetch(`${BASE_URL}/api/cases/${encodeURIComponent(caseId)}/assignments`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("raos_token") ?? ""}` },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Could not check existing assignments");
    const assignments = await response.json() as Array<{ toolId: string; respondentType: string }>;
    if (!Array.isArray(assignments)) throw new Error("Invalid assignment list");
    return new Set(assignments.map(a => `${a.toolId}\0${a.respondentType}`));
  };

  function getProductRTInfo(productId: string, toolsList: typeof tools): Array<{ rt: string; formCount: number }> {
    const product = ASSESSMENT_PRODUCTS.find(p => p.id === productId);
    if (!product || !toolsList) return [];
    const rtMap = new Map<string, number>();
    for (const toolId of product.toolIds) {
      const tool = toolsList.find(t => t.id === toolId);
      if (!tool) continue;
      for (const rt of assignmentRespondentTypes(tool.respondentTypes ?? [], toolId)) {
        rtMap.set(rt, (rtMap.get(rt) ?? 0) + 1);
      }
    }
    return RT_ORDER.filter(rt => rtMap.has(rt)).map(rt => ({ rt, formCount: rtMap.get(rt)! }));
  }

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) { setProductRespondentSlots([]); return; }

    // Pre-fill name/email from existing case contacts (first match per respondent type)
    const contactsByRT = new Map<string, { name: string; email: string }>();
    for (const a of (c?.assignments ?? [])) {
      if (!contactsByRT.has(a.respondentType) && (a.assignedToName || a.assignedToEmail)) {
        contactsByRT.set(a.respondentType, {
          name: a.assignedToName ?? "",
          email: a.assignedToEmail ?? "",
        });
      }
    }

    const rtInfos = getProductRTInfo(productId, tools);
    setProductRespondentSlots(rtInfos.map(info => {
      const contact = contactsByRT.get(info.rt);
      return {
        respondentType: info.rt,
        label: RESPONDENT_TYPE_LABELS[info.rt] ?? info.rt,
        selected: DEFAULT_SELECTED_RTS.has(info.rt),
        name: contact?.name ?? "",
        email: contact?.email ?? "",
      };
    }));
  };

  const handleAssignProduct = async () => {
    const product = ASSESSMENT_PRODUCTS.find(p => p.id === selectedProductId);
    if (!product) return;
    const selectedSlots = productRespondentSlots.filter(s => s.selected);
    if (!selectedSlots.length) return;
    setProductAssigning(true);
    try {
      const existingKeys = await loadExistingAssignmentKeys();
      const selectedRTs = new Set(selectedSlots.map(s => s.respondentType));
      let totalCreated = 0;
      for (const toolId of product.toolIds) {
        const toolData = tools?.find(t => t.id === toolId);
        if (!toolData) continue;
        for (const rt of assignmentRespondentTypes(toolData.respondentTypes ?? [], toolId)) {
          if (!selectedRTs.has(rt)) continue;
          const key = `${toolId}\0${rt}`;
          if (existingKeys.has(key)) continue;
          const slot = selectedSlots.find(s => s.respondentType === rt)!;
          await createAssignmentMut.mutateAsync({
            caseId,
            data: {
              toolId,
              toolName: toolData.name ?? toolId,
              respondentType: rt as CreateAssignmentRequestRespondentType,
              respondentLabel: slot.name || (RESPONDENT_TYPE_LABELS[rt] ?? rt),
              assignedToName: slot.name || undefined,
              assignedToEmail: slot.email || undefined,
            } as any
          });
          existingKeys.add(key);
          totalCreated++;
        }
      }
      // Also register this product in the case's productIds array
      const currentProductIds: string[] = (c as any).productIds ?? [];
      if (!currentProductIds.includes(selectedProductId)) {
        try {
          await fetch(`${BASE_URL}/api/cases/${caseId}/product-ids`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token") ?? ""}` },
            body: JSON.stringify({ productIds: [...currentProductIds, selectedProductId] }),
          });
        } catch { /* non-fatal */ }
      }
      toast({ title: totalCreated ? "Product assigned" : "Product already assigned", description: totalCreated ? `${totalCreated} new form${totalCreated !== 1 ? "s" : ""} assigned. Existing assignments were kept.` : "No duplicate forms were created." });
      setProductModalOpen(false);
      setSelectedProductId("");
      setProductRespondentSlots([]);
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
    } catch {
      toast({ title: "Failed to assign product", variant: "destructive" });
    } finally {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      setProductAssigning(false);
    }
  };

  // Must be before early returns to satisfy React hooks rules
  const respondentGroups = useMemo(() => {
    if (!c?.assignments) return [];
    const groups = new Map<string, {
      groupKey: string; label: string; respondentType: string;
      name: string | null; email: string | null; link: string;
      forms: { id: string; name: string; status: string }[];
    }>();
    // Pick the oldest assignment as the stable, single invitation link for each
    // group; newly added forms must not silently change the link already shared.
    for (const a of [...c.assignments].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.uniqueToken.localeCompare(right.uniqueToken))) {
      if (INTAKE_TOOL_IDS.has(a.toolId ?? "")) continue;
      if (!EXTERNAL_RESPONDENT_TYPES.has(a.respondentType)) continue;
      // RASR is psychometrician-administered internally — skip it here
      if (a.respondentType === "self" && a.respondentLabel === "Psychometrician") continue;
      // Keep the invigilator's observation invitation separate from student forms.
      const key = respondentInvitationGroupKey(a);
      if (!groups.has(key)) {
        const isSelf = a.respondentType === "self";
        groups.set(key, {
          groupKey: key,
          label: isSelf ? "Student Self-Report" : (RESPONDENT_TYPE_LABELS[a.respondentType] ?? a.respondentType),
          respondentType: a.respondentType,
          name: a.assignedToName?.trim() || null,
          email: a.assignedToEmail?.trim() || null,
          link: a.uniqueLink,
          forms: [],
        });
      } else {
        // Promote name/email from any assignment in the group that carries them,
        // in case the first assignment processed happened to have neither.
        const g = groups.get(key)!;
        if (!g.name && a.assignedToName) g.name = a.assignedToName;
        if (!g.email && a.assignedToEmail) g.email = a.assignedToEmail;
      }
      groups.get(key)!.forms.push({ id: a.id, name: a.toolName, status: a.status });
    }
    return [...groups.values()];
  }, [c?.assignments]);
  const parentAssessmentRows = (c?.assignments ?? []).filter(a =>
    a.respondentType === "parent" &&
    !INTAKE_TOOL_IDS.has(a.toolId ?? "") &&
    (a.respondentLabel === "Parent" || a.respondentLabel === "Parent Assessment Package")
  );
  const hasSplitUnnamedParentPackages =
    parentAssessmentRows.some(a => a.respondentLabel === "Parent") &&
    parentAssessmentRows.some(a => a.respondentLabel === "Parent Assessment Package") &&
    parentAssessmentRows.every(a => !a.assignedToName?.trim() && !a.assignedToEmail?.trim());
  // Do not offer two incomplete parent links while these rows await consolidation.
  const dispatchGroups = hasSplitUnnamedParentPackages
    ? respondentGroups.filter(group =>
        group.groupKey !== "type:parent:Parent" &&
        group.groupKey !== "type:parent:Parent Assessment Package")
    : respondentGroups;
  const parentToolCounts = new Map<string, number>();
  for (const assignment of parentAssessmentRows) {
    const toolId = assignment.toolId ?? "";
    parentToolCounts.set(toolId, (parentToolCounts.get(toolId) ?? 0) + 1);
  }
  const duplicateParentToolNames = [...new Set(parentAssessmentRows
    .filter(a => (parentToolCounts.get(a.toolId ?? "") ?? 0) > 1)
    .map(a => a.toolName ?? a.toolId ?? "Unknown form"))];
  const assessmentAssignmentStructureKey = (c?.assignments ?? [])
    .filter(a => !INTAKE_TOOL_IDS.has(a.toolId ?? ""))
    .map(a => `${a.id}:${a.toolId}:${a.respondentType}:${a.respondentLabel ?? ""}`)
    .sort()
    .join("|");

  useEffect(() => {
    if (c) {
      void queryClient.invalidateQueries({ queryKey: batteryReviewQueryKey });
    }
  }, [caseId, assessmentAssignmentStructureKey, queryClient]);

  const intakeRespondentGroups = useMemo(() => {
    if (!c?.assignments) return [];
    const groups = new Map<string, {
      groupKey: string; label: string; respondentType: string;
      name: string | null; email: string | null; link: string;
      forms: { id: string; name: string; status: string }[];
    }>();
    for (const a of c.assignments) {
      if (!INTAKE_TOOL_IDS.has(a.toolId ?? "")) continue;
      if (!EXTERNAL_RESPONDENT_TYPES.has(a.respondentType)) continue;
      const key = a.assignedToEmail
        ? `email:${a.assignedToEmail}`
        : `type:${a.respondentType}:${a.respondentLabel ?? ""}`;
      if (!groups.has(key)) {
        groups.set(key, {
          groupKey: key,
          label: RESPONDENT_TYPE_LABELS[a.respondentType] ?? a.respondentType,
          respondentType: a.respondentType,
          name: a.assignedToName ?? null,
          email: a.assignedToEmail ?? null,
          link: a.uniqueLink,
          forms: [],
        });
      }
      groups.get(key)!.forms.push({ id: a.id, name: a.toolName, status: a.status });
    }
    return [...groups.values()];
  }, [c?.assignments]);

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const isForbidden = isError && (error as { status?: number })?.status === 403;
  if (isForbidden) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <ShieldAlert size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 max-w-sm">You are not assigned to this case and cannot view its details.</p>
        <Link href="/cases">
          <Button variant="outline"><ArrowLeft size={16} className="mr-2" /> Back to Cases</Button>
        </Link>
      </div>
    );
  }

  if (!c) return <div>Case not found</div>;

  // On test/training cases, apprentices get full admin-equivalent access so a
  // mentor can coach them hands-on (no real student data is at risk). On live
  // cases, apprentices keep their real role and stay read-only.
  const role = (currentUser?.role === "clinical_apprentice" && c.caseMode === "test")
    ? "admin"
    : (currentUser?.role ?? "psychometrician");
  const currentPhaseIndex = PHASES.indexOf(displayPhase(c.currentPhase));
  const canAdvance = !userLoading && canAdvancePhase(role) && c.currentPhase !== "complete";
  const canReturnToPhase = !userLoading && canAdvancePhase(role) && c.id !== "raos-promotional-demo-v2";
  const hideAssignments = ['report', 'final_review', 'debrief', 'complete'].includes(c.currentPhase);
  const showAiCard = isPhaseVisible(role, "intake") && (
    Boolean(c.intakeAnalysis) ||
    (PHASES.indexOf(displayPhase(c.currentPhase)) > PHASES.indexOf("intake") && PHASES.indexOf(displayPhase(c.currentPhase)) <= PHASES.indexOf("scoring"))
  );
  const showMeetingCard = c.currentPhase === 'assessment' && role !== 'assessment_invigilator';
  const showInvigilatorPanel = role === 'assessment_invigilator' && c.currentPhase === 'assessment';
  const hasLeftContent = showAiCard || showMeetingCard;
  const previousInternalPhase = INTERNAL_PHASES[INTERNAL_PHASES.indexOf(c.currentPhase) - 1];
  const prevPhaseName = previousInternalPhase
    ? (PHASE_LABELS[previousInternalPhase] ?? previousInternalPhase.replace("_", " "))
    : null;

  const assignmentCaseAnalysis = (c.intakeAnalysis ?? {}) as Record<string, unknown>;
  const assignmentSycWorkflow = assignmentCaseAnalysis.sycWorkflow && typeof assignmentCaseAnalysis.sycWorkflow === "object"
    ? assignmentCaseAnalysis.sycWorkflow as Record<string, unknown>
    : {};
  const assignmentIsSycCase = ((c.productIds as string[] | null) ?? []).includes("STRENGTHEN_CORE");
  const assignmentSycConsentComplete = !assignmentIsSycCase ||
    c.consentObtained === true ||
    (c.assignments ?? []).some(a => a.toolId === "CONSENT" && a.status === "completed");
  const assignmentSycAllowedTools = new Set([
    "CONSENT", "INTAKE", "REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING",
    "RCEP-CORE", "REMYND-CLASSROOM-OBS", "REMYND-WORK-REVIEW",
  ]);
  if (typeof assignmentSycWorkflow.approvedExtension === "string") {
    assignmentSycAllowedTools.add(assignmentSycWorkflow.approvedExtension);
  }
  const assignmentRespondentTypeOptions = assignmentIsSycCase && !assignmentSycConsentComplete
    ? ["parent"] as const
    : RESPONDENT_TYPES_IN_MODAL;
  const filteredTools = tools?.filter(t => {
    if (assignmentIsSycCase) {
      if (!assignmentSycConsentComplete) return t.id === "CONSENT";
      return assignmentSycAllowedTools.has(t.id);
    }
    if (role === "admin" || String(role) === "school_clinical_coordinator") return true;
    if (role === "assessment_invigilator") return true;
    if (role === "psychometrician") return !INTAKE_TOOL_IDS.has(t.id);
    return true;
  });

  type AssignmentItem = NonNullable<typeof c.assignments>[number];

  const handleAdvancePhase = () => {
    advancePhaseMut.mutate({ caseId }, {
      onSuccess: (updatedCase) => {
        toast({ title: "Phase advanced" });
        queryClient.setQueryData([`/api/cases/${caseId}`], updatedCase);
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      },
      onError: () => toast({ title: "Cannot advance this phase", description: "Your role does not allow advancing the current phase.", variant: "destructive" })
    });
  };

  const TEACHER_TYPES = new Set(["teacher1", "teacher2", "referring_teacher", "special_needs_teacher", "school_counselor"]);

  const buildInviteRecipients = () => {
    type Recipient = { key: string; email: string; name: string | null; type: "parent" | "teacher" | "staff"; lang?: "en" | "zh" | "ko"; defaultChecked: boolean };
    const list: Recipient[] = [];

    // Parent
    if (c?.parentEmail) {
      const lang = (c.languagePreference ?? "english").toLowerCase();
      list.push({
        key: `parent:${c.parentEmail}`,
        email: c.parentEmail,
        name: c.parentName ?? null,
        type: "parent",
        lang: lang.includes("mandarin") || lang.includes("chinese") ? "zh" : lang.includes("korean") ? "ko" : "en",
        defaultChecked: true,
      });
    }

    // Teachers from assignments
    const seen = new Set<string>();
    for (const a of c?.assignments ?? []) {
      if (!TEACHER_TYPES.has(a.respondentType ?? "")) continue;
      const email = a.assignedToEmail?.trim();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      list.push({ key: `teacher:${email}`, email, name: a.assignedToName ?? null, type: "teacher", defaultChecked: true });
    }

    // Team / staff — checked by default so invigilator gets the link
    for (const u of staffUsers ?? []) {
      if (!u.email) continue;
      if (seen.has(u.email) || u.email === c?.parentEmail) continue;
      seen.add(u.email);
      list.push({ key: `staff:${u.email}`, email: u.email, name: u.name, type: "staff", defaultChecked: true });
    }

    return list;
  };

  const handleCreateModeratedMeeting = async (): Promise<string | null> => {
    setCreatingModeratedMeeting(true);
    try {
      const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
      const token = localStorage.getItem("raos_token");
      const resp = await fetch(`${apiBase}/api/cases/${caseId}/create-moderated-meeting`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const d = await resp.json();
        toast({ title: d.message ?? "Failed to create moderated meeting", variant: "destructive" });
        return null;
      }
      const d = await resp.json();
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      return d.moderatorUrl as string;
    } catch {
      toast({ title: "Network error — please try again", variant: "destructive" });
      return null;
    } finally {
      setCreatingModeratedMeeting(false);
    }
  };

  const handleOpenSendInvite = () => {
    const recipients = buildInviteRecipients();
    const checked: Record<string, boolean> = {};
    for (const r of recipients) checked[r.key] = r.defaultChecked;
    setInviteChecked(checked);
    setExtraInviteEmails([]);
    setExtraInviteEmail("");
    setSendInviteOpen(true);
  };

  const handleAddExtraEmail = () => {
    const email = extraInviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) return;
    if (extraInviteEmails.includes(email)) { setExtraInviteEmail(""); return; }
    setExtraInviteEmails(prev => [...prev, email]);
    setExtraInviteEmail("");
  };

  const handleSendInvite = async () => {
    const allRecipients = buildInviteRecipients();
    const selected = allRecipients.filter(r => inviteChecked[r.key]);
    // Auto-include any email typed in the input but not yet clicked "Add"
    const pendingEmail = extraInviteEmail.trim().toLowerCase();
    const allExtras = [...extraInviteEmails];
    if (pendingEmail && pendingEmail.includes("@") && !allExtras.includes(pendingEmail)) {
      allExtras.push(pendingEmail);
      setExtraInviteEmails(allExtras);
      setExtraInviteEmail("");
    }
    const extras = allExtras.map(email => ({ email, name: null, type: "teacher" as const }));
    const combined = [
      ...selected.map(r => ({ email: r.email, name: r.name, type: r.type === "staff" ? "teacher" as const : r.type as "parent" | "teacher", lang: r.lang })),
      ...extras,
    ];
    if (combined.length === 0) { toast({ title: "No recipients selected", variant: "destructive" }); return; }
    setSendingInvite(true);
    try {
      const token = localStorage.getItem("raos_token");
      const basePath = import.meta.env.BASE_URL?.replace(/\/$/, '') ?? '';
      const res = await fetch(`${basePath}/api/cases/${caseId}/debrief-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ recipients: combined }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendInviteOpen(false);
        toast({ title: `Invite sent to ${data.sent?.length ?? combined.length} recipient${combined.length !== 1 ? "s" : ""}` });
      } else {
        toast({ title: "Failed to send invite", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setSendingInvite(false);
    }
  };

  const handleSaveMeetingUrl = () => {
    setSavingMeetingUrl(true);
    updateCaseMut.mutate(
      { caseId, data: { customMeetingUrl: meetingUrlDraft.trim() || null, moderatorMeetingUrl: null } as any },
      {
        onSuccess: () => {
          setEditingMeetingUrl(false);
          setSavingMeetingUrl(false);
          toast({ title: "Meeting link updated" });
          queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
        },
        onError: () => {
          setSavingMeetingUrl(false);
          toast({ title: "Failed to save", variant: "destructive" });
        },
      }
    );
  };

  const handleGenerateAssessmentRoom = () => {
    setGeneratingAssessmentRoom(true);
    const slug = `raos-${caseId.slice(0, 8)}-assessment`;
    const url = `https://meet.ffmuc.net/${slug}`;
    updateCaseMut.mutate(
      { caseId, data: { customMeetingUrl: url, moderatorMeetingUrl: null } as any },
      {
        onSuccess: () => {
          setGeneratingAssessmentRoom(false);
          setShowAssessmentManualPaste(false);
          toast({ title: "Assessment room created" });
          queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
        },
        onError: () => {
          setGeneratingAssessmentRoom(false);
          toast({ title: "Failed to create room", variant: "destructive" });
        },
      }
    );
  };

  const handleSaveAssessmentDate = (value: string | null) => {
    setSavingAssessmentDate(true);
    updateCaseMut.mutate(
      { caseId, data: { assessmentMeetingDate: value } as any },
      {
        onSuccess: () => {
          setSavingAssessmentDate(false);
          toast({ title: value ? "Assessment date saved" : "Assessment date cleared" });
          queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
        },
        onError: () => {
          setSavingAssessmentDate(false);
          toast({ title: "Failed to save date", variant: "destructive" });
        },
      }
    );
  };

  const handleAnalyzeIntake = () => {
    const currentAnalysis = (c?.intakeAnalysis ?? {}) as Record<string, any>;
    const isSycCase = ((c?.productIds as string[] | null) ?? []).includes("STRENGTHEN_CORE");
    if (interviewNotesDraft !== ((c as any)?.parentInterviewNotes ?? "")) {
      toast({ title: "Save the parent interview first", description: "Save your edited notes before regenerating the analysis.", variant: "destructive" });
      return;
    }
    if (leadContextDraft !== (((c?.intakeAnalysis as any)?.leadContext as string) ?? "")) {
      toast({ title: "Save your assessment lead notes first", description: "Save your clarification before regenerating the analysis.", variant: "destructive" });
      return;
    }
    const hasExistingReview = Boolean(currentAnalysis.summary || (isSycCase && currentAnalysis.sycInitialReview));
    const confirmation = isSycCase
      ? "Generate the non-diagnostic Strengthen Your Core review and tool suggestions using the original school application and information received so far, including any submitted referral, parent intake, interview, follow-up, classroom observation, or work-sample responses?\n\nDo not wait for outstanding school responses; you can regenerate after they arrive. This replaces the previous AI draft but does not approve or assign an assessment."
      : `Regenerate the intake analysis using the saved case details (Grade ${c?.grade || "not specified"}, age ${ageFromDob(c?.dob) ?? "unknown"} from the saved birth date), forms, interviews, the latest submitted parent/teacher question responses, and any submitted classroom observation or work-sample review forms?\n\nIf the grade or birth date has changed, update it in More → Edit Case first. This replaces the AI summary and recommendations, but keeps assigned tools and saved responses.`;
    if (hasExistingReview && !window.confirm(confirmation)) return;
    analyzeIntakeMut.mutate({ caseId }, {
      onSuccess: () => {
        toast({
          title: isSycCase ? "Educational review updated" : "Intake Analysis Complete",
          description: isSycCase
            ? "Available responses were included. Regenerate later if additional school forms are returned."
            : "Saved parent and teacher question responses were included in the regenerated analysis.",
        });
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      },
      onError: () => toast({ title: "Could not regenerate intake analysis", description: "The existing analysis has been kept. Please try again.", variant: "destructive" }),
    });
  };

  const handleAssignTool = async (rec: { toolId: string; name: string }) => {
    const toolData = (tools ?? []).find(t => t.id === rec.toolId);
    const respondentTypes = assignmentRespondentTypes(toolData?.respondentTypes ?? [], rec.toolId);
    if (respondentTypes.length === 0) {
      toast({ title: "No respondent types", description: "This tool has no respondent types configured.", variant: "destructive" });
      return;
    }
    setAssigningToolId(rec.toolId);
    let count = 0;
    try {
      const existingKeys = await loadExistingAssignmentKeys();
      for (const rt of respondentTypes) {
        const key = `${rec.toolId}\0${rt}`;
        if (existingKeys.has(key)) continue;
        await createAssignmentMut.mutateAsync({
          caseId,
          data: {
            toolId: rec.toolId,
            toolName: rec.name,
            respondentType: rt as CreateAssignmentRequestRespondentType,
            respondentLabel: RESPONDENT_LABELS[rt] ?? rt,
          } as any,
        });
        existingKeys.add(key);
        count++;
      }
      toast({ title: count ? `${rec.name} assigned` : `${rec.name} already assigned`, description: count ? `Added ${count} assignment${count !== 1 ? "s" : ""}. Existing respondent assignments were kept.` : "No duplicate assignments were created." });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/assignments`] });
    } catch {
      toast({ title: "Error assigning tool", description: count ? "Some respondents were assigned. Retry to add any missing respondents without duplicating existing ones." : "No new assignments could be added. Please try again.", variant: "destructive" });
    } finally {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/assignments`] });
      setAssigningToolId(null);
    }
  };

  const handleCompleteTeacherForms = async () => {
    setCompletingTeacherForms(true);
    let added = 0;
    try {
      const existingKeys = await loadExistingAssignmentKeys();
      const missing = missingTeacherAssignments(existingKeys, tools ?? []);
      for (const { toolId, respondentType } of missing) {
        await createAssignmentMut.mutateAsync({
          caseId,
          data: {
            toolId,
            toolName: tools?.find(t => t.id === toolId)?.name ?? toolId,
            respondentType,
            respondentLabel: RESPONDENT_LABELS[respondentType],
          } as any,
        });
        existingKeys.add(`${toolId}\0${respondentType}`);
        added++;
      }
      toast({
        title: added ? "Teacher forms completed" : "Teacher forms already complete",
        description: added ? `${added} missing form${added === 1 ? "" : "s"} added with separate links. Existing forms and responses were kept.` : "No duplicate forms were created.",
      });
    } catch {
      toast({
        title: "Could not complete teacher forms",
        description: added ? "Some forms were added. Retry to add only the remaining forms." : "No forms were added. Please try again.",
        variant: "destructive",
      });
    } finally {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/assignments`] });
      setCompletingTeacherForms(false);
    }
  };

  const handleAddSecondParent = async () => {
    const parentAssignments = (c?.assignments ?? []).filter(a =>
      a.respondentType === "parent" &&
      a.respondentLabel !== "Second Parent / Guardian" &&
      !INTAKE_TOOL_IDS.has(a.toolId ?? "")
    );
    const seen = new Set<string>();
    const toolsToAdd = parentAssignments.filter(a => {
      if (seen.has(a.toolId ?? "")) return false;
      seen.add(a.toolId ?? "");
      return true;
    });
    if (toolsToAdd.length === 0) {
      toast({ title: "No parent forms to duplicate", variant: "destructive" });
      return;
    }
    setIsAddingSecondParent(true);
    try {
      for (const a of toolsToAdd) {
        await createAssignmentMut.mutateAsync({
          caseId,
          data: {
            toolId: a.toolId ?? "",
            toolName: a.toolName ?? a.toolId ?? "",
            respondentType: "parent" as CreateAssignmentRequestRespondentType,
            respondentLabel: "Second Parent / Guardian",
            assignedToName: secondParentForm.name.trim() || undefined,
            assignedToEmail: secondParentForm.email.trim() || undefined,
          } as any,
        });
      }
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/assignments`] });
      toast({ title: "Second parent / guardian added", description: `${toolsToAdd.length} form${toolsToAdd.length !== 1 ? "s" : ""} created with a separate portal link.` });
      setAddSecondParentOpen(false);
      setSecondParentForm({ name: "", email: "" });
    } catch {
      toast({ title: "Failed to add second parent", variant: "destructive" });
    } finally {
      setIsAddingSecondParent(false);
    }
  };

  const handleOpenEdit = () => {
    setEditFields({
      studentName: c.studentName ?? "",
      dob: c.dob?.slice(0, 10) ?? "",
      school: c.school ?? "",
      grade: c.grade ?? "",
      languagePreference: c.languagePreference ?? "english",
      referralReason: c.referralReason ?? "",
      parentName: c.parentName ?? "",
      parentEmail: c.parentEmail ?? "",
      parentPhone: c.parentPhone ?? "",
      caseStatus: c.caseStatus ?? "active",
      caseMode: c.caseMode ?? "live",
      workingDocUrl: c.workingDocUrl ?? "",
      assignedLeadId: c.assignedLeadId ?? "",
      assignedPsychId: c.assignedPsychId ?? "",
    });
    setEditCaseOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...editFields,
      languagePreference: editFields.languagePreference as "english" | "mandarin" | "cantonese",
      caseStatus: editFields.caseStatus as "active" | "on_hold" | "completed" | "archived",
      caseMode: editFields.caseMode as "live" | "test",
      assignedLeadId: editFields.assignedLeadId || null,
      assignedPsychId: editFields.assignedPsychId || null,
    };
    const demographicsChanged = data.grade !== c.grade || data.dob !== c.dob;
    updateCaseMut.mutate({ caseId, data }, {
      onSuccess: () => {
        toast({ title: "Case updated", description: demographicsChanged ? "Regenerate the intake analysis to refresh the age and grade in its summary." : undefined });
        setEditCaseOpen(false);
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      },
      onError: () => toast({ title: "Failed to update case", variant: "destructive" }),
    });
  };

  const handleDeleteCase = async () => {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem("raos_token");
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/cases/${caseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Case deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setLocation("/cases");
    } catch {
      toast({ title: "Failed to delete case", variant: "destructive" });
      setDeleteLoading(false);
      setDeleteCaseOpen(false);
    }
  };

  const handleDeleteAssignment = () => {
    if (!deleteAssignmentTarget) return;
    deleteAssignmentMut.mutate({ caseId, assignmentId: deleteAssignmentTarget.id }, {
      onSuccess: () => {
        toast({ title: "Assignment removed" });
        setDeleteAssignmentTarget(null);
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/assignments`] });
      },
      onError: () => toast({ title: "Failed to remove assignment", variant: "destructive" })
    });
  };

  const handleAddAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAssignment.respondentTypes.length === 0) {
      toast({ title: "Select at least one respondent type.", variant: "destructive" });
      return;
    }
    if (newAssignment.toolIds.length === 0) {
      toast({ title: "Select at least one form to assign.", variant: "destructive" });
      return;
    }
    const assignmentPairs = newAssignment.toolIds.flatMap(toolId => {
      const tool = tools?.find(item => item.id === toolId);
      const supportedRespondents = new Set(assignmentRespondentTypes(tool?.respondentTypes ?? [], toolId));
      return newAssignment.respondentTypes
        .filter(respondentType => supportedRespondents.has(respondentType))
        .map(respondentType => ({ toolId, respondentType }));
    });
    const selectedPairCount = newAssignment.toolIds.length * newAssignment.respondentTypes.length;
    if (assignmentPairs.length === 0) {
      toast({
        title: "No compatible forms and respondents selected",
        description: "Choose a respondent type supported by at least one selected form.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmittingAssignments(true);
    let createdCount = 0;
    try {
      for (const { respondentType, toolId } of assignmentPairs) {
        await createAssignmentMut.mutateAsync({
          caseId,
          data: {
            toolId,
            toolName: tools?.find(t => t.id === toolId)?.name ?? toolId,
            respondentType: respondentType as CreateAssignmentRequestRespondentType,
            respondentLabel: newAssignment.respondentLabel,
            assignedToName: newAssignment.assignedToName,
            assignedToEmail: newAssignment.assignedToEmail,
          } as any
        });
        createdCount++;
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) }),
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/assignments`] }),
      ]);
      const skipped = selectedPairCount - assignmentPairs.length;
      toast({
        title: createdCount === 1 ? "Assignment added" : `${createdCount} assignments added`,
        description: [
          "The Respondent Forms list is refreshed; forms are ready to send through the matching parent, teacher, or student portal.",
          skipped > 0 ? `${skipped} unsupported form/respondent combinations were skipped.` : "",
        ].filter(Boolean).join(" "),
      });
      setAddAssignmentModalOpen(false);
      setNewAssignment({ toolIds: [], respondentTypes: [], respondentLabel: "", assignedToName: "", assignedToEmail: "" });
    } catch (error) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetCaseQueryKey(caseId) }),
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/assignments`] }),
      ]);
      toast({
        title: createdCount > 0 ? "Some assignments were added" : "Cannot add assignment",
        description: createdCount > 0
          ? `${createdCount} assignment${createdCount === 1 ? " was" : "s were"} saved, and the Respondent Forms list was refreshed. ${error instanceof Error ? error.message : "Retry the remaining forms."}`
          : error instanceof Error ? error.message : "The assignment could not be saved. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingAssignments(false);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied to clipboard" });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed': return <Badge variant="success">Completed</Badge>;
      case 'in_progress': return <Badge variant="warning">In Progress</Badge>;
      case 'overdue': return <Badge variant="destructive">Overdue</Badge>;
      default: return <Badge variant="secondary">Not Started</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Link href="/cases">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div id="tour-header">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-display text-slate-900">{c.studentName}</h1>
              <Badge variant={c.caseStatus === 'active' ? 'success' : 'secondary'} className="capitalize">{c.caseStatus}</Badge>
              {c.caseMode === "test" && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 gap-1">
                  <FlaskConical size={12} /> Test / Training Case
                </Badge>
              )}
            </div>
            <p className="text-slate-500 text-sm">ID: {c.id} • Created {formatDate(c.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {watchAlong.isMentor && (
            <Button
              variant={watchAlong.broadcasting ? "default" : "outline"}
              size="sm"
              className={watchAlong.broadcasting ? "bg-indigo-600 hover:bg-indigo-700 gap-2" : "bg-white gap-2"}
              onClick={() => watchAlong.setBroadcasting(!watchAlong.broadcasting)}
            >
              <Radio size={15} className={watchAlong.broadcasting ? "animate-pulse" : ""} />
              {watchAlong.broadcasting ? "Watch Along: Live" : "Start Watch Along"}
              {watchAlong.broadcasting && watchAlong.watcherCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-white/20 text-white border-0">
                  {watchAlong.watcherCount} watching
                </Badge>
              )}
            </Button>
          )}
          {currentUser?.role === "admin" && c.parentEmail && (
            <Link href={`/communications/compose?email=${encodeURIComponent(c.parentEmail)}&name=${encodeURIComponent(c.parentName || "")}&sourceType=case&sourceId=${c.id}`}>
              <Button variant="outline" size="sm" className="gap-2 bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900">
                <Mail size={15} />
                Message Parent
              </Button>
            </Link>
          )}
          {c.currentPhase === 'scoring' && (
            <Link href={`/cases/${c.id}/scoring`}>
              <Button variant="outline" size="sm" className="bg-white gap-1.5">
                <FileBarChart size={15}/> View Scores
              </Button>
            </Link>
          )}
          {role === "admin" && (
            <Button variant="outline" size="sm" className="bg-white gap-1.5"
              onClick={handleOpenDemoPortal} disabled={openingDemoPortal}>
              <Monitor size={15} />
              {openingDemoPortal ? "Opening…" : "Demo Portal"}
            </Button>
          )}
          {(role === "admin" || role === "school_clinical_coordinator") && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white gap-1.5">
                  <MoreHorizontal size={15} /> More
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={handleOpenEdit} className="gap-2">
                  <Edit size={14} /> Edit Case
                </DropdownMenuItem>
                {c.currentPhase !== "pre_commitment" && c.currentPhase !== "intake" && (
                  <DropdownMenuItem
                    onClick={() => { setStepBackTarget(null); setStepBackConfirmOpen(true); }}
                    disabled={stepBackMut.isPending}
                    className="gap-2"
                  >
                    <ChevronLeft size={14} /> Step Back
                  </DropdownMenuItem>
                )}
                {(c.id !== "raos-promotional-demo-v2" || currentUser?.role === "admin") && (
                  <DropdownMenuItem
                    onClick={() => setDeleteCaseOpen(true)}
                    className="gap-2 text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 size={14} /> Delete Case
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            size="sm"
            onClick={handleAdvancePhase}
            disabled={advancePhaseMut.isPending || !canAdvance}
            title={!canAdvance && c.currentPhase !== "debrief" ? "Your role cannot advance the current phase" : undefined}
            className="shadow-lg shadow-primary/20"
          >
            {advancePhaseMut.isPending ? "Advancing..." : "Advance Phase"} <ChevronRight size={16} className="ml-1"/>
          </Button>
        </div>
      </div>

      {/* Phase Stepper */}
      <Card className="border-none shadow-md overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 text-white" data-testid="case-phase-progress">
        <CardContent className="p-6">
          <div className="overflow-x-auto" role="group" aria-label="Case phases">
            <div className="relative min-w-[740px] md:min-w-0 h-[72px]">
            <div className="absolute top-4 left-0 w-full h-1 bg-white/10 -translate-y-1/2 rounded-full" />
            <div 
              className="absolute top-4 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-700"
              style={{ width: `${(currentPhaseIndex / (PHASES.length - 1)) * 100}%` }} 
            />
            
            <div className="relative flex justify-between">
              {PHASES.map((phase, idx) => {
                const isPast = idx < currentPhaseIndex;
                const isActive = idx === currentPhaseIndex;
                const visible = isPhaseVisible(role, phase);
                const isEarlierInternalPhase = phase === "intake" && (c.currentPhase === "setup" || c.currentPhase === "forms");
                const canSelect = canReturnToPhase && visible && (isPast || isEarlierInternalPhase);
                return (
                  <div key={phase} className="flex flex-col items-center">
                    <button type="button"
                      disabled={!canSelect || stepBackMut.isPending}
                      aria-label={canSelect ? `Return to ${PHASE_LABELS[phase]} phase` : `${PHASE_LABELS[phase]} phase`}
                      title={canSelect ? `Return to ${PHASE_LABELS[phase]}` : undefined}
                      onClick={() => { setStepBackTarget(phase); setStepBackConfirmOpen(true); }}
                      className={`relative flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full ${canSelect ? "cursor-pointer group" : "cursor-default"}`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-200 ${
                        !visible ? 'bg-slate-600 text-slate-500' :
                        isActive ? 'bg-primary ring-4 ring-primary/30 text-white' :
                        isPast ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'
                      } ${canSelect ? "group-hover:scale-110 group-hover:ring-4 group-hover:ring-white/30" : ""}`}>
                        {!visible ? <Lock size={12} /> :
                         isPast ? <CheckCircle2 size={16} /> :
                         <span className="text-xs font-bold">{idx + 1}</span>}
                      </span>
                      <span className={`text-[10px] uppercase font-bold tracking-wider absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-center ${
                        !visible ? 'text-slate-600' :
                        isActive ? 'text-white' : 'text-slate-400'
                      } ${canSelect ? "group-hover:text-white" : ""}`}>
                        {PHASE_LABELS[phase] ?? phase.replace('_', ' ')}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
            </div>
          </div>
          <div className="mt-2 flex justify-between items-end">
            <div>
              <p className="text-sm text-slate-400">Current Phase</p>
              <h3 className="text-xl font-bold font-display capitalize text-white">{PHASE_LABELS[c.currentPhase] ?? c.currentPhase.replace('_', ' ')}</h3>
              {role === "psychometrician" && !isPhaseVisible(role, c.currentPhase) && (
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Lock size={10}/> This phase is managed by the Invigilator</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400">Progress</p>
              <p className="text-2xl font-bold text-primary-foreground">{PHASE_PROGRESS[c.currentPhase] ?? c.progressPercentage}%</p>
            </div>
          </div>
          {canReturnToPhase && (currentPhaseIndex > 0 || c.currentPhase === "setup" || c.currentPhase === "forms") && (
            <p className="mt-3 text-xs text-slate-400">Select an earlier phase above to return to it. Existing forms and results will not be deleted.</p>
          )}
        </CardContent>
      </Card>

      {/* Student Details — always at top */}
      <Card className="border-none shadow-md">
        <CardContent className="px-5 py-3">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Student Details</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs">DOB</span>
              <span className="font-medium">{formatDate(c.dob)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs">School</span>
              <span className="font-medium">{c.school} (Grade {c.grade || 'N/A'})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs">Language</span>
              <span className="font-medium capitalize">{c.languagePreference}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-xs">Parent</span>
              <span className="font-medium">{c.parentName || 'N/A'}</span>
            </div>
            {c.workingDocUrl ? (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-xs">Working Doc</span>
                <a href={c.workingDocUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
                  Open in Google Docs <ExternalLink size={12} />
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 text-xs">Working Doc</span>
                <span className="text-slate-400 text-xs italic">Not linked</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Report Workspace ── Collaborative doc (all phases) + approvals (scoring → final_review) */}
      {((role === 'admin' || role === 'school_clinical_coordinator') || role === 'psychometrician') && (
        <>
          {/* Collaborative Working Document */}
          <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
            <div className="px-6 py-4 flex items-center justify-between border-b border-blue-100">
              <div className="flex items-center gap-2">
                <FileEdit size={17} className="text-blue-600" />
                <h3 className="font-semibold text-slate-800">Report Working Document</h3>
              </div>
              {c.workingDocUrl && !editingReportDoc && (
                <Button variant="ghost" size="sm" className="text-slate-500 h-7 text-xs" onClick={() => { setReportDocInput(c.workingDocUrl ?? ""); setEditingReportDoc(true); }}>
                  Change link
                </Button>
              )}
            </div>
            <CardContent className="p-6">
              {!editingReportDoc && c.workingDocUrl ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-600 mb-1">Both you and the psychometrician can build sections of the report in real time as forms and AI analysis come in.</p>
                    <p className="text-xs text-slate-400 truncate">{c.workingDocUrl}</p>
                  </div>
                  <a href={c.workingDocUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow shadow-blue-600/20">
                      <ExternalLink size={15} className="mr-2" /> Open in Google Docs
                    </Button>
                  </a>
                </div>
              ) : editingReportDoc ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Paste the shared Google Docs link below.</p>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://docs.google.com/document/d/..."
                      value={reportDocInput}
                      onChange={e => setReportDocInput(e.target.value)}
                      className="bg-white"
                      autoFocus
                    />
                    <Button onClick={handleSaveReportDocUrl} disabled={!reportDocInput.trim() || updateCaseMut.isPending} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                      Save
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setEditingReportDoc(false); setReportDocInput(c.workingDocUrl ?? ""); }} className="shrink-0">
                      <X size={16} />
                    </Button>
                  </div>
                  {c.workingDocUrl && (
                    <button onClick={handleRemoveReportDocUrl} className="text-xs text-red-500 hover:text-red-700 underline">
                      Remove working document
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Link the report template Google Doc now so sections can be drafted as soon as forms and AI analysis arrive. Once linked, it stays here for the full lifetime of this case.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://docs.google.com/document/d/..."
                      value={reportDocInput}
                      onChange={e => setReportDocInput(e.target.value)}
                      className="bg-white"
                    />
                    <Button onClick={handleSaveReportDocUrl} disabled={!reportDocInput.trim() || updateCaseMut.isPending} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                      <Link2 size={15} className="mr-2" /> Link Doc
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Final Approvals & Attach — only relevant once scoring begins */}
          {c.workingDocUrl && ['scoring', 'report', 'final_review'].includes(c.currentPhase) && (() => {
            const adminApproved = c.adminApprovedReport ?? false;
            const psychApproved = c.psychApprovedReport ?? false;
            const bothApproved = adminApproved && psychApproved;
            return (
              <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm">
                <div className="px-6 py-4 border-b border-emerald-100 flex items-center gap-2">
                  <PackageCheck size={17} className="text-emerald-600" />
                  <h3 className="font-semibold text-slate-800">Final Approvals &amp; Attach Report</h3>
                </div>
                <CardContent className="p-6 space-y-5">
                  <p className="text-sm text-slate-600">
                    Both the admin and psychometrician must approve before the report can be attached and sent to recipients.
                  </p>
                  <div className="space-y-2">
                    {/* Admin row */}
                    <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-emerald-100">
                      <div className="flex items-center gap-3">
                        {adminApproved
                          ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                          : <Circle size={18} className="text-slate-300 shrink-0" />}
                        <div>
                          <p className="text-sm font-medium text-slate-800">Admin (Noel)</p>
                          <p className="text-xs text-slate-400">{adminApproved ? "Approved" : "Pending approval"}</p>
                        </div>
                      </div>
                      {(role === "admin" || role === "school_clinical_coordinator") && (
                        <Button
                          size="sm"
                          variant={adminApproved ? "outline" : "default"}
                          disabled={isTogglingApproval}
                          onClick={() => handleToggleReportApproval(!adminApproved)}
                          className={adminApproved
                            ? "text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                        >
                          {adminApproved ? "Request Revision" : "Approve"}
                        </Button>
                      )}
                    </div>
                    {/* Psych row */}
                    <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-emerald-100">
                      <div className="flex items-center gap-3">
                        {psychApproved
                          ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                          : <Circle size={18} className="text-slate-300 shrink-0" />}
                        <div>
                          <p className="text-sm font-medium text-slate-800">Psychometrician (Abegail)</p>
                          <p className="text-xs text-slate-400">
                            {psychApproved ? "Approved" : (role === "admin" || role === "school_clinical_coordinator") ? "Pending — Abegail hasn't signed off yet" : "Pending approval"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {role === "psychometrician" && (
                          <Button
                            size="sm"
                            variant={psychApproved ? "outline" : "default"}
                            disabled={isTogglingApproval}
                            onClick={() => handleToggleReportApproval(!psychApproved)}
                            className={psychApproved
                              ? "text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                          >
                            {psychApproved ? "Unmark" : "Mark as Final"}
                          </Button>
                        )}
                        {(role === "admin" || role === "school_clinical_coordinator") && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isTogglingApproval}
                            onClick={() => handleToggleReportApproval(!psychApproved, true)}
                            className={psychApproved
                              ? "text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200 text-xs"
                              : "text-slate-500 border-dashed border-slate-300 hover:border-slate-400 text-xs"}
                          >
                            {psychApproved ? "Remove override" : "Override"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Attach status */}
                  <div className="pt-1">
                    {!bothApproved ? (
                      <p className="text-xs text-amber-600">
                        {!adminApproved && !psychApproved
                          ? "Waiting for both approvals before the report is automatically attached."
                          : !adminApproved
                          ? "Your approval is still needed."
                          : "Waiting for the psychometrician to approve."}
                      </p>
                    ) : isAttachingReport ? (
                      <div className="flex items-center gap-2 text-xs text-emerald-700">
                        <RefreshCw size={13} className="animate-spin" />
                        Attaching report automatically…
                      </div>
                    ) : attachError ? (
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-red-600 flex-1">{attachError}</p>
                        {(role === "admin" || role === "school_clinical_coordinator") && (
                          <Button
                            size="sm"
                            onClick={() => { autoAttachFiredRef.current = false; handleAttachReport(); }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 size={13} />
                        Both approved — report being attached automatically.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </>
      )}

      {/* Final Review Banner */}
      {c.currentPhase === 'final_review' && (role === 'admin' || role === 'school_clinical_coordinator') && (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Eye size={20} className="text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800 text-base mb-1">Final Review — Before You Send</h3>
                <p className="text-sm text-slate-600">
                  The report has been attached to the delivery package. Review everything below — the attached PDF, any additional documents, and recipient details — then send it out when you're satisfied. Sending will advance the case to the Debrief stage.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Access Panel — visible to admin from scoring phase onwards */}
      {(role === "admin" || role === "school_clinical_coordinator") && ['scoring', 'report', 'final_review', 'debrief', 'complete'].includes(c.currentPhase) && (
        <div id="tour-report-access">
          <ReportAccessPanel
            caseId={c.id}
            studentName={c.studentName ?? undefined}
            parentEmail={c.parentEmail ?? undefined}
            currentPhase={c.currentPhase}
            workingDocUrl={c.workingDocUrl ?? undefined}
            debriefMeetingUrl={c.debriefMeetingUrl ?? undefined}
            debriefMeetingDate={c.debriefMeetingDate ?? undefined}
            bobbyAiPortalCredentials={c.bobbyAiPortalCredentials ?? null}
            userRole={role}
            onPhaseAdvanced={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
              queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
            }}
            onCaseUpdated={() => {
              queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
            }}
          />
        </div>
      )}

      {/* Invigilator full-width panel — assessment phase only */}
      {showInvigilatorPanel && (() => {
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        const isCustom = !!c.customMeetingUrl;
        const rawUrl = c.customMeetingUrl ?? "";
        const isJitsiModerated = rawUrl.includes('meet.jit.si/moderated/');
        const guestId = rawUrl.split('/').pop();
        const joinUrl = isJitsiModerated && guestId
          ? `${window.location.origin}${base}/join/${guestId}?jitsiRoom=moderated/${guestId}`
          : rawUrl;
        return (
          <>
            <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
              <CardHeader className="pb-3 border-b border-emerald-100/60">
                <CardTitle className="text-base flex items-center gap-2 text-emerald-900">
                  <Video size={16} className="text-emerald-600" />
                  Invigilation Meeting Room
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Optional</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {isCustom ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {c.assessmentMeetingDate && (
                      <div className="bg-white/70 border border-emerald-200 rounded-lg px-4 py-2.5 space-y-0.5 flex-1 min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Assessment Date &amp; Time</p>
                        <p className="text-sm text-slate-700 font-medium">{c.assessmentMeetingDate}</p>
                      </div>
                    )}
                    <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6">
                        <Video size={15} /> Join Assessment Meeting ↗
                      </Button>
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-1">
                    No meeting room has been set up yet. The admin will configure this and notify you.
                  </p>
                )}
              </CardContent>
            </Card>

            <InvigilatorNotetakerPanel
              currentCaseId={c.id}
              baseUrl={BASE_URL}
              token={localStorage.getItem("raos_token") ?? ""}
            />
          </>
        );
      })()}

      <div className="space-y-6">

        {/* ── Step 1: Pre-Assessment Intake Forms ─── */}
        {!hideAssignments && (() => {
          const intakeAssignments = (c.assignments ?? []).filter(a => INTAKE_TOOL_IDS.has(a.toolId ?? "") && a.toolId !== "SYC-ASSENT");
          const INTAKE_FORM_OPTIONS = [
            { label: "Referral Form — School / Teacher", toolId: "REFERRAL", respondentType: "referring_teacher", respondentLabel: "Referring Teacher" },
            { label: "Referral Form — Parent", toolId: "REFERRAL", respondentType: "parent", respondentLabel: "Parent" },
            { label: "Parent Intake Form", toolId: "INTAKE", respondentType: "parent", respondentLabel: "Parent" },
            { label: "Consent Form", toolId: "CONSENT", respondentType: "parent", respondentLabel: "Parent" },
          ];
          return (
            <Card className="border-none shadow-md">
              <CardHeader className="flex flex-row justify-between items-center border-b bg-slate-50/50 pb-4">
                <CardTitle className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold shrink-0">1</span>
                  Pre-Assessment Intake Forms
                </CardTitle>
                {((role === "admin" || role === "school_clinical_coordinator") || role === "psychometrician" || role === "clinical_apprentice") && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm">Add Form</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {INTAKE_FORM_OPTIONS.map(opt => {
                        const alreadyAdded = intakeAssignments.some(a => a.toolId === opt.toolId && a.respondentType === opt.respondentType);
                        return (
                          <DropdownMenuItem
                            key={`${opt.toolId}-${opt.respondentType}`}
                            disabled={alreadyAdded || assigningToolId === opt.toolId}
                            onClick={async () => {
                              setAssigningToolId(opt.toolId);
                              try {
                                await createAssignmentMut.mutateAsync({
                                  caseId,
                                  data: {
                                    toolId: opt.toolId,
                                    toolName: tools?.find(t => t.id === opt.toolId)?.name ?? opt.label,
                                    respondentType: opt.respondentType as CreateAssignmentRequestRespondentType,
                                    respondentLabel: opt.respondentLabel,
                                  } as any,
                                });
                                toast({ title: `${opt.label} added` });
                                queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
                              } catch {
                                toast({ title: "Failed to add form", variant: "destructive" });
                              } finally {
                                setAssigningToolId(null);
                              }
                            }}
                          >
                            {alreadyAdded ? `✓ ${opt.label}` : opt.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {intakeAssignments.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 flex flex-col items-center gap-2">
                    <FileBarChart size={28} className="text-slate-300" />
                    <p className="text-sm">No intake forms added yet.</p>
                    {((role === "admin" || role === "school_clinical_coordinator") || role === "psychometrician" || role === "clinical_apprentice") && (
                      <p className="text-xs text-slate-400">Use "Add Form" above to add the Referral, Intake, and Consent forms.</p>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {intakeAssignments.map(a => (
                      <div key={a.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h4 className="font-semibold text-slate-900">{a.toolName}</h4>
                            {getStatusBadge(a.status)}
                            {c.referralInvite?.formId === a.toolId &&
                             c.referralInvite?.toEmail && a.assignedToEmail &&
                             c.referralInvite.toEmail.toLowerCase() === a.assignedToEmail.toLowerCase() && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
                                <Link2 size={10} /> Via inquiry portal
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-slate-500 gap-4 flex-wrap">
                            <span className="font-medium text-slate-700">{RESPONDENT_TYPE_LABELS[a.respondentType] ?? a.respondentType}{a.respondentLabel ? `: ${a.respondentLabel}` : ""}</span>
                            {c.referralInvite?.formId === a.toolId &&
                             c.referralInvite?.toEmail && a.assignedToEmail &&
                             c.referralInvite.toEmail.toLowerCase() === a.assignedToEmail.toLowerCase()
                              ? <span>From: {c.referralInvite.toName}{c.referralInvite.schoolName ? ` · ${c.referralInvite.schoolName}` : ""}</span>
                              : <span>Assigned to: {a.assignedToName || 'Unspecified'}</span>
                            }
                            {a.assignedToEmail && <span className="text-slate-400">{a.assignedToEmail}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {a.status === 'completed' ? (
                            (() => {
                              const ep2 = a.toolId === 'RPPI' ? 'rppi' : a.toolId === 'RDA' ? 'rda' : a.toolId === 'RRFA' ? 'rrfa' : a.toolId === 'RRCA' ? 'rrca' : a.toolId === 'RMRA' ? 'rmra' : a.toolId === 'RAMRI' ? 'ramri' : a.toolId === 'RAEPA' ? 'raepa' : null;
                              return ep2 ? (
                                <Link href={`/cases/${caseId}/${ep2}/${a.id}`}>
                                  <Button size="sm" variant="outline" className="bg-white gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300">
                                    <Eye size={14} /> View {a.toolId}
                                  </Button>
                                </Link>
                              ) : (
                                <Link href={["REMYND_CHINESE_LITERACY_TEACHER_OBSERVATION", "REMYND_CHINESE_LITERACY_PARENT_OBSERVATION"].includes(a.toolId) ? `/cases/${caseId}/chinese-literacy` : `/cases/${caseId}/response/${a.id}`}>
                                  <Button size="sm" variant="outline" className="bg-white gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300">
                                    <Eye size={14} /> View Response
                                  </Button>
                                </Link>
                              );
                            })()
                          ) : (() => {
                            const ep2 = a.toolId === 'RPPI' ? 'rppi' : a.toolId === 'RDA' ? 'rda' : a.toolId === 'RRFA' ? 'rrfa' : a.toolId === 'RRCA' ? 'rrca' : a.toolId === 'RMRA' ? 'rmra' : a.toolId === 'RAMRI' ? 'ramri' : a.toolId === 'RAEPA' ? 'raepa' : null;
                            return ep2 ? (
                              <Link href={`/cases/${caseId}/${ep2}/${a.id}`}>
                                <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                                  <Play size={14} /> Administer {a.toolId}
                                </Button>
                              </Link>
                            ) : (
                              <>
                                <Button variant="outline" size="sm" className="bg-white" title="Show QR Code" onClick={() => { setActiveQr(a.uniqueLink); setQrModalOpen(true); }}><QrCode size={16} /></Button>
                                <Button variant="outline" size="sm" className="bg-white" title="Copy Link" onClick={() => copyLink(a.uniqueLink)}><Copy size={16} /></Button>
                                <Button variant="outline" size="sm" className="bg-white" title="Open Form" onClick={() => setFormModalUrl(`${BASE_URL}/external/${a.uniqueToken}`)}><ExternalLink size={16} /></Button>
                              </>
                            );
                          })()}
                          {((role === "admin" || role === "school_clinical_coordinator") || role === "psychometrician" || role === "clinical_apprentice") && (
                            <Button variant="outline" size="sm" className="bg-white text-red-500 hover:text-red-700 hover:border-red-300" title="Remove" onClick={() => setDeleteAssignmentTarget({ id: a.id, name: a.toolName })}>
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {intakeRespondentGroups.length > 0 && ((role === "admin" || role === "school_clinical_coordinator") || role === "psychometrician" || role === "clinical_apprentice") && (
                  <div className="border-t">
                    <div className="px-6 py-3 flex items-center gap-2 bg-slate-50/70">
                      <Send size={14} className="text-primary" />
                      <span className="text-sm font-semibold text-slate-700">Send to Respondents</span>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{intakeRespondentGroups.length} respondent{intakeRespondentGroups.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="divide-y">
                      {intakeRespondentGroups.map(group => {
                        const completedCount = group.forms.filter(f => f.status === "completed").length;
                        const allDone = completedCount === group.forms.length;
                        return (
                          <div key={group.groupKey} className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-slate-800 text-sm">{group.name ?? group.label}</span>
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{group.label}</span>
                                {allDone
                                  ? <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">All Complete</span>
                                  : <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{completedCount}/{group.forms.length} done</span>
                                }
                              </div>
                              <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                                {group.email && <span className="text-slate-400">{group.email}</span>}
                                <span>{group.forms.map(f => f.name).join(" · ")}</span>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0 flex-wrap">
                              <Button variant="outline" size="sm" className="bg-white" title="Show QR Code" onClick={() => { setActiveQr(group.link); setQrModalOpen(true); }}><QrCode size={15} /></Button>
                              <Button variant="outline" size="sm" className="bg-white" title="Copy link" onClick={() => copyLink(group.link)}><Copy size={15} /></Button>
                              <Button size="sm" className="gap-1.5" onClick={() => { setSendEmailError(null); setSendEmailTarget({ groupKey: group.groupKey, label: group.label, name: group.name ?? "", email: group.email ?? "", link: group.link, formNames: group.forms.map(f => f.name), respondentRole: group.label, assignmentIds: group.forms.map(f => f.id), requiresFormTest: false }); setSendEmailForm({ name: group.name ?? "", email: group.email ?? "" }); }}>
                                <Send size={14} /> Send Email
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );


        })()}

        {/* ── Clinical Apprentice Assignment ── mentors & admins only ── */}
        {(role === "admin" || role === "school_clinical_coordinator" || role === "psychometrician" || role === "clinical_apprentice") && (
          <ApprenticeAssignmentPanel caseId={c.id} />
        )}

        {/* ── Interview Notes & AI Notetaker ── visible from intake phase onward ── */}
        {(role === "admin" || role === "school_clinical_coordinator" || role === "psychometrician" || role === "clinical_apprentice") && (
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold shrink-0">
                  <Pencil size={12} />
                </span>
                Clinical Interview Notes
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Record a live interview and let AI organise the notes, or type notes manually. These feed into the AI intake analysis.
              </p>
              {/* Tab switcher — full-width on mobile, auto-width on larger screens */}
              <div className="flex gap-1 mt-3 bg-slate-100 rounded-lg p-0.5 w-full sm:w-fit">
                <button
                  onClick={() => setInterviewTab("notes")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium transition-all ${
                    interviewTab === "notes"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Pencil size={11} className="shrink-0" />
                  <span>Manual Notes</span>
                </button>
                <button
                  onClick={() => setInterviewTab("notetaker")}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 rounded-md text-xs font-medium transition-all ${
                    interviewTab === "notetaker"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Mic size={11} className="shrink-0" />
                  <span>AI Notetaker</span>
                  {interviewRecordings.length > 0 && (
                    <span className="bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-[10px] font-bold shrink-0">
                      {interviewRecordings.length}
                    </span>
                  )}
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {interviewTab === "notes" ? (
                <>
                  <textarea
                    className="w-full min-h-[120px] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-y transition"
                    placeholder="e.g. Parent mentioned the child has night terrors 3–4× per week and has been refusing school on Mondays. Father is currently being treated for anxiety…"
                    value={interviewNotesDraft}
                    onChange={e => { setInterviewNotesDraft(e.target.value); setInterviewNotesSaved(false); }}
                    disabled={savingInterviewNotes}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400">{interviewNotesDraft.length} chars</span>
                    <div className="flex items-center gap-2">
                      {interviewNotesSaved && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                          <Check size={12} /> Saved
                        </span>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSaveInterviewNotes}
                        disabled={savingInterviewNotes || interviewNotesDraft === ((c as any)?.parentInterviewNotes ?? "")}
                        className="bg-slate-800 hover:bg-slate-700 text-white"
                      >
                        {savingInterviewNotes ? "Saving…" : "Save Notes"}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <AiNotetaker
                  caseId={c.id}
                  baseUrl={BASE_URL}
                  token={localStorage.getItem("raos_token") ?? ""}
                  availableTypes={["parent_intake", "teacher_consultation", "student_interview", "classroom_observation"]}
                  defaultType="parent_intake"
                  recordings={interviewRecordings}
                  onRecordingAdded={r => setInterviewRecordings(prev => [r, ...prev])}
                  onRecordingDeleted={id => setInterviewRecordings(prev => prev.filter(r => r.id !== id))}
                />
              )}
            </CardContent>
          </Card>
        )}

        {showAiCard && (() => {
          const allAssignments2 = c.assignments ?? [];
          const INTAKE_FORM_GROUPS = [["REFERRAL","REFERRAL-CORP","REFERRAL-UNI","REFERRAL-PARENT","REFERRAL-BOARDING"],["INTAKE"]];
          const caseAnalysis = (c.intakeAnalysis ?? {}) as Record<string, any>;
          const isSycCase = ((c.productIds as string[] | null) ?? []).includes("STRENGTHEN_CORE");
          const applicationData = c.intakeData && typeof c.intakeData === "object" && !Array.isArray(c.intakeData)
            ? c.intakeData as Record<string, unknown>
            : {};
          const applicationEntries = Object.entries(applicationData).filter(([key, value]) =>
            !key.startsWith("_") && value !== null && value !== undefined && value !== ""
          );
          const initialReview = caseAnalysis.sycInitialReview && typeof caseAnalysis.sycInitialReview === "object"
            ? caseAnalysis.sycInitialReview as Record<string, unknown>
            : null;
          const interventionPlanDraft = initialReview?.interventionPlanDraft && typeof initialReview.interventionPlanDraft === "object"
            ? initialReview.interventionPlanDraft as Record<string, unknown>
            : null;
          const isCurrentSycFrameworkReview = initialReview?.frameworkVersion === "syc-tier2-intervention-v1";
          const sycWorkflow = caseAnalysis.sycWorkflow && typeof caseAnalysis.sycWorkflow === "object"
            ? caseAnalysis.sycWorkflow as Record<string, unknown>
            : {};
          const sycConsentComplete = !isSycCase ||
            c.consentObtained === true ||
            allAssignments2.some(a => a.toolId === "CONSENT" && a.status === "completed");
          const hasRaosAnalysis = !isSycCase && typeof caseAnalysis.summary === "string" && caseAnalysis.summary.trim().length > 0;
          const schoolReferralComplete = allAssignments2.some(a =>
            a.toolId === "REFERRAL" && a.respondentType === "referring_teacher" && a.status === "completed"
          );
          const parentIntakeComplete = allAssignments2.some(a =>
            a.toolId === "INTAKE" && a.respondentType === "parent" && a.status === "completed"
          );
          const intakeFormsComplete = isSycCase
            ? schoolReferralComplete && parentIntakeComplete
            : INTAKE_FORM_GROUPS.every(ids => allAssignments2.some(a => ids.includes(a.toolId ?? "") && a.status === "completed"));
          const recommendedExtension = initialReview && typeof initialReview.recommendedExtension === "string"
            ? initialReview.recommendedExtension
            : null;
          const recommendedExtensionName = recommendedExtension
            ? tools?.find(tool => tool.id === recommendedExtension)?.name ?? recommendedExtension
            : null;
          const coreInstrumentName = tools?.find(tool => tool.id === "RCEP-CORE")?.name ?? "Strengthen Your Core Core Assessment";
          const approvedExtension = typeof sycWorkflow.approvedExtension === "string" ? sycWorkflow.approvedExtension : null;
          return (
            <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100" id="tour-ai-synthesis">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg flex items-center text-blue-900 gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-800 text-xs font-bold shrink-0">2</span>
                    <img src="/images/remynd-logo-new.png" alt="ReMynd" className="w-5 h-5 object-contain" />
                    {isSycCase ? "Strengthen Your Core Educational Intake Review" : "AI Intake Analysis"}
                  </CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isSycCase && !intakeFormsComplete && !hasRaosAnalysis && (
                      <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                        Complete Step 1 first
                      </span>
                    )}
                    {hasRaosAnalysis && (role === "admin" || role === "school_clinical_coordinator") && (
                      <Button size="sm" variant="outline" onClick={handleAnalyzeIntake} disabled={analyzeIntakeMut.isPending || savingInterviewNotes} className="text-blue-700 border-blue-200 hover:bg-blue-50">
                        <RefreshCw size={14} className={`mr-1.5 ${analyzeIntakeMut.isPending ? "animate-spin" : ""}`} />
                        {analyzeIntakeMut.isPending ? "Regenerating..." : "Regenerate Analysis"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isSycCase && applicationEntries.length > 0 && (
                  <details open className="mb-5 rounded-xl border border-emerald-200 bg-white/80 p-4">
                    <summary className="cursor-pointer font-semibold text-emerald-950">
                      Original Strengthen Your Core school application
                      <span className="ml-2 text-xs font-normal text-emerald-800">Saved in this RAOS case · {applicationEntries.length} responses</span>
                    </summary>
                    <p className="mt-2 text-xs text-slate-600">
                      This is the school-submitted intake, not a record of parent/guardian consent. Consent is managed through the standard RAOS form below.
                    </p>
                    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                      {applicationEntries.map(([key, value]) => {
                        const specialLabels: Record<string, string> = {
                          consentAcknowledgement: "School acknowledged parent/guardian consent requirement (not consent itself)",
                          nonDiagnosticAcknowledgement: "Non-diagnostic scope acknowledged",
                          deidentificationAcknowledgement: "De-identification guidance acknowledged",
                          oneStudent: "One student for this referral",
                        };
                        const label = specialLabels[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, first => first.toUpperCase());
                        const displayValue = typeof value === "boolean"
                          ? value ? "Yes" : "No"
                          : Array.isArray(value)
                            ? value.map(item => typeof item === "string" ? item : JSON.stringify(item)).join(", ")
                            : typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value);
                        return (
                          <div key={key} className="rounded-lg border border-slate-100 bg-white p-3">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                            <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{displayValue || "—"}</dd>
                          </div>
                        );
                      })}
                    </dl>
                  </details>
                )}
                {isSycCase && initialReview && (
                  <details open className="mb-5 rounded-xl border border-blue-200 bg-white/80 p-4">
                    <summary className="cursor-pointer font-semibold text-blue-950">
                      Strengthen Your Core educational intake analysis
                      <span className="ml-2 text-xs font-normal text-blue-800">Assessment suggestions · human review required</span>
                    </summary>
                    {typeof initialReview.referralSummary === "string" && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{initialReview.referralSummary}</p>
                    )}
                    {typeof initialReview.primaryEducationalQuestion === "string" && (
                      <p className="mt-3 text-sm text-slate-700"><strong>Primary educational question:</strong> {initialReview.primaryEducationalQuestion}</p>
                    )}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {([
                        ["Student strengths", initialReview.studentStrengths],
                        ["Reported concerns", initialReview.observedConcerns],
                        ["Tentative interpretations", initialReview.interpretations],
                        ["Alternative explanations", initialReview.alternativeExplanations],
                        ["Information to request", initialReview.missingInformation],
                        ["Safety flags for human review", initialReview.safetyFlags],
                      ] as [string, unknown][]).map(([label, items]) => Array.isArray(items) && items.length > 0 && (
                        <div key={label} className="rounded-lg border border-slate-100 bg-white p-3">
                          <h4 className="text-xs font-semibold text-slate-600">{label}</h4>
                          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
                            {items.map((item, index) => <li key={index}>{String(item)}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-violet-900">Strengthen Your Core assessment framework</h4>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-800">
                        <li><strong>RCEP-CORE:</strong> required whole-learner profile; the assessment lead selects respondents through the normal RAOS workflow.</li>
                        <li><strong>Structured classroom learning observation:</strong> required descriptive record of learning behavior, response to challenge, and scaffolding.</li>
                        <li><strong>Student work sample and prior-intervention review:</strong> required descriptive review of work, prior supports, and response to intervention.</li>
                      </ol>
                      <p className="mt-2 text-sm text-slate-700">
                        These are the three required Strengthen Your Core components. A delayed or missing school response does not stop the case: continue assessment work, review generation, and phase advancement using information already available. Add school responses later and regenerate the review; reports should identify evidence that was not yet available.
                      </p>
                      <p className="mt-2 text-xs text-slate-600">The observation and work-history review are evidence activities, not additional standardized tests. Parent/guardian consent remains the only consent requirement; this does not add a student-assent form.</p>
                      <p className="mt-2 text-sm text-slate-800">
                        <strong>RAOS core form:</strong> {coreInstrumentName}
                      </p>
                      <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
                        <h5 className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Required Strengthen Your Core forms</h5>
                        <p className="mt-1 text-xs text-slate-600">
                          Use the normal RAOS assignment flow to choose respondents and assign these three required components. School responses can arrive later; pending forms do not block other case work.
                        </p>
                        {(role === "admin" || role === "school_clinical_coordinator" || role === "psychometrician") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            onClick={() => {
                              setNewAssignment({ toolIds: [], respondentTypes: [], respondentLabel: "", assignedToName: "", assignedToEmail: "" });
                              setShowAllTools(false);
                              setAddAssignmentModalOpen(true);
                            }}
                            disabled={!sycConsentComplete}
                          >
                            Choose respondents and forms
                          </Button>
                        )}
                        <div className="mt-3 space-y-2">
                          {SYC_CORE_EVIDENCE_TOOLS.map(evidenceTool => {
                            const relatedAssignments = allAssignments2.filter(a => a.toolId === evidenceTool.toolId);
                            const completedCount = relatedAssignments.filter(a => a.status === "completed").length;
                            const assignedCount = relatedAssignments.length;
                            return (
                              <div key={evidenceTool.toolId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-100 px-3 py-2">
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{evidenceTool.label}</p>
                                  <p className="text-xs text-slate-500">
                                    {completedCount > 0
                                      ? `${completedCount} submitted${assignedCount > completedCount ? ` · ${assignedCount - completedCount} awaiting response` : ""}`
                                      : assignedCount > 0 ? `${assignedCount} assigned · awaiting response; continue case` : "Not assigned yet"}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {recommendedExtension ? (
                        <p className="mt-1 text-sm text-slate-800">
                          <strong>Optional extension suggested by the review:</strong> {recommendedExtensionName}
                          <span className="ml-1 text-xs text-slate-600">
                            ({recommendedExtension}; {approvedExtension === recommendedExtension ? "administrator approved" : "requires administrator approval"})
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-slate-700">No optional extension was suggested from the currently enabled options.</p>
                      )}
                      {typeof initialReview.assessmentJustification === "string" && initialReview.assessmentJustification.trim() && (
                        <p className="mt-2 text-sm leading-6 text-slate-700"><strong>Why:</strong> {initialReview.assessmentJustification}</p>
                      )}
                      <p className="mt-2 text-xs text-slate-600">
                        These are suggestions, not assignments. An administrator must review the recommendation before any assessment form is sent.
                      </p>
                      {role === "admin" && recommendedExtension && approvedExtension !== recommendedExtension && (
                        <Link href={`/cases/${caseId}/product-dashboard`}>
                          <Button size="sm" variant="outline" className="mt-3 border-violet-300 text-violet-800">
                            Review tool selection
                          </Button>
                        </Link>
                      )}
                    </div>
                    {interventionPlanDraft && (
                      <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Provisional intervention planning</h4>
                        <p className="mt-1 text-xs text-slate-600">
                          {interventionPlanDraft.readiness === "professional_review_required"
                            ? "Professional review is needed before using this plan."
                            : interventionPlanDraft.readiness === "more_information_required"
                              ? "This is a preliminary plan from the information available now. Continue the case; add classroom or work-sample evidence when it arrives and regenerate before finalizing."
                              : "Draft starting points only; confirm them after the core assessment and classroom evidence are reviewed."}
                        </p>
                        {([
                          ["Priority targets", interventionPlanDraft.priorityTargets],
                          ["Practical support strategies", interventionPlanDraft.supportStrategies],
                          ["Observable goals", interventionPlanDraft.observableGoals],
                          ["Progress monitoring", interventionPlanDraft.progressMonitoring],
                        ] as [string, unknown][]).map(([label, items]) => Array.isArray(items) && items.length > 0 && (
                          <div key={label} className="mt-3">
                            <h5 className="text-xs font-semibold text-slate-700">{label}</h5>
                            <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-slate-700">
                              {items.map((item, index) => <li key={index}>{String(item)}</li>)}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    {initialReview && !isCurrentSycFrameworkReview && (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                        This saved review predates the current Strengthen Your Core intervention framework. Regenerate it now using information already available; later school or parent responses can be included in another review.
                      </p>
                    )}
                    <p className="mt-3 text-xs text-slate-600">
                      Suitability: {String(initialReview.suitability ?? "not recorded")}
                    </p>
                  </details>
                )}
                {isSycCase && sycConsentComplete && initialReview !== null && Boolean(initialReview.suggestedQuestions) && (
                  <IntakeFollowUp
                    caseId={caseId}
                    analysis={{ ...caseAnalysis, suggestedQuestions: initialReview.suggestedQuestions } as any}
                    canEdit={role === "admin" || role === "school_clinical_coordinator"}
                    assignments={c.assignments ?? []}
                    parentName={c.parentName}
                    parentEmail={c.parentEmail}
                    baseUrl={BASE_URL}
                    leadContextDraft={leadContextDraft}
                    onLeadContextChange={setLeadContextDraft}
                    onUpdated={() => queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] })}
                  />
                )}
                {isSycCase && !sycConsentComplete && (
                  <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    Send the standard RAOS Parent/Guardian Consent Form from this case to unlock assessment assignments. School/Teacher Referral and Parent Intake forms are optional; generate suggestions now from available information, and regenerate later if you choose to add either response.
                  </div>
                )}
                {hasRaosAnalysis ? (
                  <div className="space-y-5">
                    {(role === "admin" || role === "school_clinical_coordinator") && (
                      <p className="text-xs text-blue-700">
                        The standard RAOS analysis combines the original school application with available RAOS referral and intake responses, interview notes, and follow-up replies. Save new information first, then regenerate.
                      </p>
                    )}
                    {/* Summary */}
                    <div className="text-sm text-slate-700 bg-white/70 p-3 rounded-lg border border-blue-100">
                      {caseAnalysis.summary}
                    </div>

                    {/* Risk + Domains row */}
                    <div className="flex flex-wrap items-start gap-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Risk Level</span>
                      {caseAnalysis.riskLevel === 'high' ? <Badge variant="destructive">High</Badge> :
                       caseAnalysis.riskLevel === 'moderate' ? <Badge variant="warning">Moderate</Badge> :
                         <Badge variant="success">Low</Badge>}
                      </div>
                    {Array.isArray(caseAnalysis.recommendedDomains) && caseAnalysis.recommendedDomains.length > 0 && (
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Key Domains</span>
                          <div className="flex flex-wrap gap-1">
                          {(caseAnalysis.recommendedDomains as string[]).map((d: string) => (
                              <Badge key={d} variant="outline" className="bg-white text-xs">{d.replace(/_/g, ' ')}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Flags */}
                    {Array.isArray(caseAnalysis.flags) && (caseAnalysis.flags as string[]).length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Clinical Flags</span>
                        <ul className="space-y-1">
                          {(caseAnalysis.flags as string[]).map((f: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                              <span className="mt-0.5 shrink-0">⚠</span><span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <IntakeFollowUp
                      caseId={caseId}
                      analysis={c.intakeAnalysis as any}
                      canEdit={role === "admin" || role === "school_clinical_coordinator"}
                      assignments={c.assignments ?? []}
                      parentName={c.parentName}
                      parentEmail={c.parentEmail}
                      baseUrl={BASE_URL}
                      leadContextDraft={leadContextDraft}
                      onLeadContextChange={setLeadContextDraft}
                      onUpdated={() => queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] })}
                    />

                    {/* Recommended Tools */}
                    {Array.isArray(caseAnalysis.recommendedTools) && (caseAnalysis.recommendedTools as any[]).length > 0 && (() => {
                      const dismissedIds = new Set<string>(
                        Array.isArray(caseAnalysis.dismissedToolIds)
                          ? caseAnalysis.dismissedToolIds
                          : []
                      );
                      const visibleTools = (caseAnalysis.recommendedTools as any[]).filter((t: any) => !dismissedIds.has(t.toolId));
                      if (visibleTools.length === 0) return null;
                      return (
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Recommended Assessment Tools</span>
                          <div className="space-y-2">
                            {visibleTools.map((t: any) => {
                              const assignedTypes = new Set((c.assignments ?? []).filter((a: any) => a.toolId === t.toolId).map((a: any) => a.respondentType));
                              const isAssigning = assigningToolId === t.toolId;
                              const toolData = (tools ?? []).find(tool => tool.id === t.toolId);
                              const respondentTypes = toolData?.respondentTypes ?? [];
                              const missingTypes = assignmentRespondentTypes(respondentTypes, t.toolId).filter(rt => !assignedTypes.has(rt));
                              const alreadyAssigned = assignedTypes.size > 0;
                              const fullyAssigned = alreadyAssigned && missingTypes.length === 0;
                              return (
                                <div key={t.toolId} className={`bg-white rounded-lg border p-3 transition-colors ${alreadyAssigned ? 'border-emerald-200 bg-emerald-50/30' : 'border-blue-100'}`}>
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-800">{toolDisplayName(t.toolId, t.name)}</span>
                                        <Badge className={`text-xs shrink-0 ${t.priority === 'essential' ? 'bg-red-100 text-red-700 border-red-200' : t.priority === 'recommended' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`} variant="outline">
                                          {t.priority}
                                        </Badge>
                                        {alreadyAssigned && (
                                          <span className={`text-xs border px-1.5 py-0.5 rounded-full font-medium ${fullyAssigned ? "text-emerald-600 bg-emerald-100 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200"}`}>{fullyAssigned ? "Assigned" : "Missing respondent forms"}</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">{t.rationale}</p>
                                      {respondentTypes.length > 0 && (
                                        <p className="text-[10px] text-slate-400 mt-1">Respondents: {assignmentRespondentTypes(respondentTypes, t.toolId).map(rt => RESPONDENT_LABELS[rt] ?? rt).join(", ")}</p>
                                      )}
                                    </div>
                                  </div>
                                  {((role === "admin" || role === "school_clinical_coordinator") || role === "psychometrician" || role === "clinical_apprentice") && (
                                    <div className="flex gap-2 mt-2 pt-2 border-t border-blue-50">
                                      {fullyAssigned ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-7 text-xs gap-1.5 flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                          disabled={unassignToolMut.isPending && unassignToolMut.variables === t.toolId}
                                          onClick={() => unassignToolMut.mutate(t.toolId)}
                                        >
                                          {unassignToolMut.isPending && unassignToolMut.variables === t.toolId ? "Removing…" : "Unassign"}
                                        </Button>
                                      ) : (
                                        <Button
                                          size="sm"
                                          className="h-7 text-xs gap-1.5 flex-1"
                                          disabled={isAssigning}
                                          onClick={() => handleAssignTool({ toolId: t.toolId, name: t.name })}
                                        >
                                          {isAssigning ? "Assigning…" : alreadyAssigned ? `Add ${missingTypes.length} missing form${missingTypes.length === 1 ? "" : "s"}` : "Assign"}
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs text-slate-500 hover:text-red-600 hover:border-red-200"
                                        disabled={dismissToolMut.isPending}
                                        data-testid={`button-dismiss-recommendation-${t.toolId}`}
                                        onClick={() => dismissToolMut.mutate(t.toolId)}
                                      >
                                        Dismiss
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                ) : (
                  <div className="text-center py-6">
                    {(role === "admin" || role === "school_clinical_coordinator") ? (
                      <>
                        <p className="text-sm text-slate-500 mb-4">
                          {isSycCase
                            ? sycConsentComplete
                              ? initialReview
                                ? "This non-diagnostic review uses the information currently available, including the original school application and any submitted RAOS forms, interviews, follow-up, classroom observation, or work-sample evidence. Regenerate it whenever you choose; later responses can be added without pausing the case."
                                : "Generate the non-diagnostic review and assessment suggestions now from the original school application and information collected so far. School/Teacher Referral, Parent Intake, classroom observation, and work-sample responses can be included later."
                              : "Complete the standard parent/guardian Consent Form to unlock assessment assignments. You can generate or regenerate this review after consent, using the information currently available."
                            : "No AI analysis run yet for this case."}
                        </p>
                        {isSycCase && sycConsentComplete && (
                          <div className="mb-4 flex flex-wrap gap-2 text-xs">
                            <span className={`rounded-full border px-2.5 py-1 ${schoolReferralComplete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                              School/Teacher Referral: {schoolReferralComplete ? "submitted" : "not submitted · optional"}
                            </span>
                            <span className={`rounded-full border px-2.5 py-1 ${parentIntakeComplete ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                              Parent Intake: {parentIntakeComplete ? "submitted" : "not submitted · optional"}
                            </span>
                          </div>
                        )}
                        {(!isSycCase || sycConsentComplete) && (
                          <Button onClick={handleAnalyzeIntake} disabled={analyzeIntakeMut.isPending || (!isSycCase && !intakeFormsComplete) || !sycConsentComplete} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {analyzeIntakeMut.isPending
                              ? isSycCase ? "Generating suggestions..." : "Analyzing..."
                              : isSycCase ? initialReview ? "Regenerate Review & Tool Suggestions" : "Generate Review & Tool Suggestions" : "Run AI Intake Analysis"}
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">No AI analysis has been run for this case yet. The admin will initiate this.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })()}

          {/* Invigilation Meeting Room — assessment phase only */}
          {c.currentPhase === 'assessment' && (() => {
            // Any saved URL (new ffmuc rooms, old moderated rooms, or Zoom/Teams) shows the room card
            const isCustom = !!c.customMeetingUrl;

            const rawMeetingUrl = c.customMeetingUrl ?? "";
            const isFfmuc = rawMeetingUrl.includes('meet.ffmuc.net');
            const isJitsiModerated = rawMeetingUrl.includes('meet.jit.si/moderated/');
            const roomSlug = rawMeetingUrl.split('/').pop() ?? '';
            const base = import.meta.env.BASE_URL.replace(/\/$/, "");
            const studentParam = c.studentName ? `&student=${encodeURIComponent(c.studentName)}` : '';

            // Build branded client join URL — handles old moderated format and new ffmuc format
            const clientJoinUrl = roomSlug
              ? isJitsiModerated
                ? `${window.location.origin}${base}/join/${roomSlug}?jitsiRoom=moderated/${roomSlug}&type=assessment${studentParam}`
                : isFfmuc
                  ? `${window.location.origin}${base}/join/${roomSlug}?type=assessment${studentParam}`
                  : rawMeetingUrl
              : null;

            const handleStartEdit = () => {
              setMeetingUrlDraft(c.customMeetingUrl ?? "");
              setEditingMeetingUrl(true);
            };
            return (
              <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                <CardHeader className="pb-2 border-b border-emerald-100/60">
                  <CardTitle className="text-base flex items-center gap-2 text-emerald-900">
                    <Video size={16} className="text-emerald-600" />
                    Invigilation Meeting Room
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Optional</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">

                  {(role !== "admin" && role !== "school_clinical_coordinator") ? (
                    /* ── Invigilator / read-only view ── */
                    <div className="space-y-3">
                      {isCustom ? (
                        <>
                          {c.assessmentMeetingDate && (
                            <div className="bg-white/70 border border-emerald-200 rounded-lg px-3 py-2 space-y-0.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Assessment Date &amp; Time</p>
                              <p className="text-xs text-slate-700">{c.assessmentMeetingDate}</p>
                            </div>
                          )}
                          <a href={clientJoinUrl ?? rawMeetingUrl} target="_blank" rel="noopener noreferrer" className="block">
                            <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                              <Video size={14} /> Join Assessment Meeting ↗
                            </Button>
                          </a>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 bg-white/60 border border-emerald-100 rounded-lg px-3 py-2.5 text-center">
                          No meeting room has been set up yet. The admin will configure this and notify you.
                        </p>
                      )}
                    </div>
                  ) : !isCustom ? (
                    /* ── Admin: No room yet ── */
                    <div className="space-y-3">
                      {!showAssessmentManualPaste ? (
                        <>
                          <Button
                            size="sm"
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            onClick={handleGenerateAssessmentRoom}
                            disabled={generatingAssessmentRoom || savingMeetingUrl}
                          >
                            {generatingAssessmentRoom ? <RefreshCw size={14} className="animate-spin"/> : <Video size={14}/>}
                            {generatingAssessmentRoom ? "Creating room…" : "Generate Assessment Room"}
                          </Button>
                          <button
                            className="text-[10px] text-emerald-600 underline underline-offset-2 hover:text-emerald-900 w-full text-center"
                            onClick={() => setShowAssessmentManualPaste(true)}
                          >
                            Paste a Zoom or Teams link instead
                          </button>
                          {/* Send invite — available even before room is set */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full border-emerald-300 text-emerald-800 hover:bg-emerald-100 gap-2"
                            onClick={handleOpenSendInvite}
                          >
                            <Mail size={13} /> Send Meeting Link via Email
                          </Button>
                        </>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Paste meeting link</p>
                          <Input
                            placeholder="https://zoom.us/j/... or Teams link"
                            value={meetingUrlDraft}
                            onChange={e => setMeetingUrlDraft(e.target.value)}
                            className="text-xs h-8"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={handleSaveMeetingUrl}
                              disabled={savingMeetingUrl || !meetingUrlDraft.trim()}
                            >
                              {savingMeetingUrl ? "Saving…" : "Save Link"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs"
                              onClick={() => setShowAssessmentManualPaste(false)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ── Admin: Guest link saved ── */
                    <>
                      {/* Branded client join link */}
                      {clientJoinUrl && (
                        <div className="bg-white/70 border border-emerald-200 rounded-lg px-3 py-2.5 space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Client join link — share with teachers & parents</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-mono text-slate-700 truncate flex-1">{clientJoinUrl}</p>
                            <Button
                              size="sm" variant="ghost"
                              className="h-6 px-2 shrink-0 text-emerald-600 hover:text-emerald-800"
                              onClick={() => {
                                navigator.clipboard.writeText(clientJoinUrl);
                                setMeetingLinkCopied(true);
                                setTimeout(() => setMeetingLinkCopied(false), 2000);
                              }}
                            >
                              {meetingLinkCopied ? <CopyCheck size={12}/> : <Copy size={12}/>}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Join as Host button */}
                      {c.customMeetingUrl && (
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                          onClick={() => window.open(c.customMeetingUrl!, "_blank")}
                        >
                          <Video size={12}/> Join as Host
                        </Button>
                      )}

                      {/* Change / Remove */}
                      <div className="flex gap-2 pt-1 border-t border-emerald-100">
                        <button
                          onClick={() => { setMeetingUrlDraft(c.customMeetingUrl ?? ""); setEditingMeetingUrl(true); }}
                          className="text-[10px] text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                        >
                          Change link
                        </button>
                        <span className="text-[10px] text-emerald-300">|</span>
                        <button
                          onClick={() => updateCaseMut.mutate(
                            { caseId, data: { customMeetingUrl: null, moderatorMeetingUrl: null } as any },
                            { onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] }) }
                          )}
                          className="text-[10px] text-red-500 underline underline-offset-2 hover:text-red-700"
                        >
                          Remove room
                        </button>
                      </div>

                      {/* Change link editor */}
                      {editingMeetingUrl && (
                        <div className="space-y-2 pt-1 border-t border-emerald-200">
                          <Input
                            placeholder="https://zoom.us/j/... or Teams link"
                            value={meetingUrlDraft}
                            onChange={e => setMeetingUrlDraft(e.target.value)}
                            className="text-xs h-8"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveMeetingUrl} disabled={savingMeetingUrl}>
                              {savingMeetingUrl ? "Saving…" : "Save"}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingMeetingUrl(false)}>Cancel</Button>
                          </div>
                        </div>
                      )}

                      {/* Send invite — admin only */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-emerald-300 text-emerald-800 hover:bg-emerald-100 gap-2"
                        onClick={handleOpenSendInvite}
                      >
                        <Mail size={13} /> Send Meeting Link via Email
                      </Button>
                    </>
                  )}

                  {/* Assessment date / time — admin only */}
                  {(role === "admin" || role === "school_clinical_coordinator") && (
                  <div className="pt-2 border-t border-emerald-100 space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Assessment Date &amp; Time</p>
                    {c.assessmentMeetingDate && assessmentDateDraft === "" ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-700 flex-1">{c.assessmentMeetingDate}</span>
                        <button
                          onClick={() => setAssessmentDateDraft("edit")}
                          className="text-[10px] text-emerald-700 underline underline-offset-2 hover:text-emerald-900"
                        >Edit</button>
                        <button
                          onClick={() => handleSaveAssessmentDate(null)}
                          disabled={savingAssessmentDate}
                          className="text-[10px] text-red-500 underline underline-offset-2 hover:text-red-700"
                        >Clear</button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <input
                          type="datetime-local"
                          value={assessmentDateDraft === "edit" ? "" : assessmentDateDraft}
                          onChange={e => setAssessmentDateDraft(e.target.value)}
                          className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 h-8"
                        />
                        <select
                          value={assessmentTz}
                          onChange={e => setAssessmentTz(e.target.value)}
                          className="w-full rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 h-8"
                        >
                          {TIMEZONES.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                            onClick={() => {
                              if (!assessmentDateDraft || assessmentDateDraft === "edit") return;
                              const [datePart, timePart] = assessmentDateDraft.split("T");
                              const [y, mo, d] = datePart.split("-").map(Number);
                              const [h, mi] = (timePart || "00:00").split(":").map(Number);
                              const date = new Date(y, mo - 1, d, h, mi);
                              const tzAbbr = getTzAbbr(assessmentTz, date);
                              const formatted = date.toLocaleString("en-SG", {
                                weekday: "long", year: "numeric", month: "long", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              }) + " " + tzAbbr;
                              handleSaveAssessmentDate(formatted);
                              setAssessmentDateDraft("");
                            }}
                            disabled={savingAssessmentDate || !assessmentDateDraft || assessmentDateDraft === "edit"}
                          >
                            {savingAssessmentDate ? "Saving…" : "Save"}
                          </Button>
                          {c.assessmentMeetingDate && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAssessmentDateDraft("")}>Cancel</Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

        {/* Assignments — hidden from report stage onwards */}
        {!hideAssignments && (
          <Card className="border-none shadow-md" id="tour-assignments">
            <CardHeader className="flex flex-row justify-between items-center border-b bg-slate-50/50 pb-4">
              <CardTitle className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold shrink-0">3</span>
                Build Assessment Battery
              </CardTitle>
              <div className="flex gap-2">
                {(c.assignments ?? []).some((a: any) => ["REMYND_CHINESE_LITERACY_TEACHER_OBSERVATION", "REMYND_CHINESE_LITERACY_PARENT_OBSERVATION"].includes(a.toolId)) && ["admin", "psychometrician", "school_clinical_coordinator"].includes(role as string) && (
                  <Link href={`/cases/${caseId}/chinese-literacy`}>
                    <Button size="sm" variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50 gap-1.5" data-testid="link-chinese-literacy-review">Chinese literacy review</Button>
                  </Link>
                )}
                <Link href={`/cases/${caseId}/dashboards`}>
                  <Button size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 gap-1.5">
                    <LayoutGrid size={13} /> Dashboards
                  </Button>
                </Link>
                {((role === "admin" || role === "school_clinical_coordinator") || role === "psychometrician" || role === "clinical_apprentice") && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setProductModalOpen(true)} className="gap-1.5">
                      <LayoutGrid size={13} /> Assign by Product
                    </Button>
                    <Button size="sm" onClick={() => { setNewAssignment({ toolIds: [], respondentTypes: [], respondentLabel: "", assignedToName: "", assignedToEmail: "" }); setAddAssignmentModalOpen(true); }}>Add Assignment</Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {missingTeacherForms.length > 0 && (role === "admin" || role === "psychometrician" || role === "school_clinical_coordinator") && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3">
                  <p className="text-xs text-amber-900">
                    {missingTeacherForms.length} teacher form{missingTeacherForms.length === 1 ? "" : "s"} missing a matching copy for the other teacher. Existing responses will be kept.
                  </p>
                  <Button size="sm" variant="outline" className="bg-white border-amber-300 text-amber-900" disabled={completingTeacherForms} onClick={handleCompleteTeacherForms}>
                    {completingTeacherForms ? "Adding…" : "Add missing teacher forms"}
                  </Button>
                </div>
              )}
              {(!c.assignments || c.assignments.filter(a => !INTAKE_TOOL_IDS.has(a.toolId ?? "")).length === 0) ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <FileBarChart size={32} />
                  </div>
                  <p>No forms or assessments assigned yet.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {c.assignments
                    .filter(a => !INTAKE_TOOL_IDS.has(a.toolId ?? ""))
                    .sort((a, b) => {
                      const ORDER: Record<string, number> = {
                        parent: 0,
                        teacher: 1,
                        teacher1: 2,
                        teacher2: 3,
                        referring_teacher: 4,
                        boarding_staff: 5,
                        special_needs_teacher: 6,
                        school_counselor: 7,
                        self: 8,
                        examiner: 9,
                        invigilator: 10,
                      };
                      // Examiner-administered tools always sort as "examiner" regardless of stored respondentType
                      const EXAMINER_TOOLS = new Set(["RPPI", "RDA", "RRFA", "RRCA", "RMRA", "RAMRI", "RAEPA"]);
                      const aType = EXAMINER_TOOLS.has(a.toolId ?? "") ? "examiner" : a.respondentType;
                      const bType = EXAMINER_TOOLS.has(b.toolId ?? "") ? "examiner" : b.respondentType;
                      const aOrder = ORDER[aType] ?? 5;
                      const bOrder = ORDER[bType] ?? 5;
                      return aOrder - bOrder;
                    })
                    .reduce<{ type: string; label: string; items: NonNullable<typeof c.assignments> }[]>((groups, a) => {
                      // Examiner-administered tools always group as "examiner" regardless of stored respondentType
                      const EXAMINER_TOOLS_G = new Set(["RPPI", "RDA", "RRFA", "RRCA", "RMRA", "RAMRI", "RAEPA"]);
                      const groupType = EXAMINER_TOOLS_G.has(a.toolId ?? "") ? "examiner" : a.respondentType;
                      const last = groups[groups.length - 1];
                      if (last && last.type === groupType) {
                        last.items.push(a);
                      } else {
                        groups.push({ type: groupType, label: RESPONDENT_TYPE_LABELS[groupType] ?? groupType, items: [a] });
                      }
                      return groups;
                    }, [])
                    .flatMap((group, gi) => [
                      <div key={`grp-${gi}`} className="px-4 py-2 bg-slate-50/80 border-b border-t flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{group.label}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{group.items.length} form{group.items.length !== 1 ? "s" : ""}</span>
                      </div>,
                      ...group.items.map(a => {
                        const invitationLink = assignmentInvitationLink(a, dispatchGroups);
                        const ambiguousParent = hasSplitUnnamedParentPackages && a.respondentType === "parent" && (a.respondentLabel === "Parent" || a.respondentLabel === "Parent Assessment Package");
                        return (
                    <div key={a.id} className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="font-semibold text-slate-900">{a.toolName}</h4>
                          {getStatusBadge(a.status)}
                          {CDP_TOOL_IDS.has(a.toolId ?? "") && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700 border border-violet-200 uppercase tracking-wide">
                              CDP
                            </span>
                          )}
                          {LITERACY_TOOL_IDS.has(a.toolId ?? "") && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wide">
                              Literacy
                            </span>
                          )}
                          {a.respondentType === "invigilator" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wide">
                              Post-Assessment
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-slate-500 gap-4 flex-wrap">
                          <span className="font-medium text-slate-700">{RESPONDENT_TYPE_LABELS[a.respondentType] ?? a.respondentType}{a.respondentLabel ? `: ${a.respondentLabel}` : ""}</span>
                          {(() => {
                            const group = dispatchGroups.find(group => group.forms.some(form => form.id === a.id));
                            const recipient = group ?? { groupKey: `assignment:${a.id}`, forms: [{ id: a.id }] };
                            const mayEdit = ["admin", "psychometrician", "school_clinical_coordinator", "clinical_apprentice"].includes(role);
                            return editingNameKey === recipient.groupKey && mayEdit ? (
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                <Input aria-label="Respondent name" value={editingNameValue} autoFocus className="h-8 w-44" onChange={e => setEditingNameValue(e.target.value)}
                                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void handleSaveRespondentName(recipient); } if (e.key === "Escape") setEditingNameKey(null); }} />
                                <Button type="button" size="sm" className="h-8" disabled={savingName || !editingNameValue.trim()} onClick={() => void handleSaveRespondentName(recipient)}>Save name</Button>
                                <Button type="button" size="sm" variant="ghost" className="h-8" disabled={savingName} onClick={() => setEditingNameKey(null)}>Cancel</Button>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5">
                                Assigned to: {a.assignedToName || 'Unspecified'}
                                {mayEdit && <button type="button" className="text-slate-400 hover:text-primary" aria-label={`Edit recipient for ${a.toolName}`} title="Edit respondent name"
                                  onClick={() => { setEditingNameKey(recipient.groupKey); setEditingNameValue(group?.name ?? a.assignedToName ?? ""); }}>
                                  <Pencil size={13} />
                                </button>}
                              </span>
                            );
                          })()}
                          {a.assignedToEmail && (
                            <span className="text-slate-400">{a.assignedToEmail}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        {a.status === 'completed' ? (
                          (() => {
                            const examinerPath = a.toolId === 'RPPI' ? 'rppi' : a.toolId === 'RDA' ? 'rda' : a.toolId === 'RRFA' ? 'rrfa' : a.toolId === 'RRCA' ? 'rrca' : a.toolId === 'RMRA' ? 'rmra' : a.toolId === 'RAMRI' ? 'ramri' : a.toolId === 'RAEPA' ? 'raepa' : null;
                            return examinerPath ? (
                              <Link href={`/cases/${caseId}/${examinerPath}/${a.id}`}>
                                <Button size="sm" variant="outline" className="bg-white gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300">
                                  <Eye size={14} /> View {a.toolId}
                                </Button>
                              </Link>
                            ) : (
                              <Link href={["REMYND_CHINESE_LITERACY_TEACHER_OBSERVATION", "REMYND_CHINESE_LITERACY_PARENT_OBSERVATION"].includes(a.toolId) ? `/cases/${caseId}/chinese-literacy` : `/cases/${caseId}/response/${a.id}`}>
                                <Button size="sm" variant="outline" className="bg-white gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300">
                                  <Eye size={14} /> View Response
                                </Button>
                              </Link>
                            );
                          })()
                        ) : (() => {
                          const examinerPath = a.toolId === 'RPPI' ? 'rppi' : a.toolId === 'RDA' ? 'rda' : a.toolId === 'RRFA' ? 'rrfa' : a.toolId === 'RRCA' ? 'rrca' : a.toolId === 'RMRA' ? 'rmra' : a.toolId === 'RAMRI' ? 'ramri' : a.toolId === 'RAEPA' ? 'raepa' : null;
                          return examinerPath ? (
                              <Link href={`/cases/${caseId}/${examinerPath}/${a.id}`}>
                                <Button size="sm" data-testid={`button-administer-${a.id}`} className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                                  <Play size={14} /> Administer {a.toolId}
                                </Button>
                              </Link>
                          ) : null;
                        })() ?? (
                          <>
                                <Button variant="outline" size="sm" onClick={() => { setActiveQr(invitationLink); setQrModalOpen(true); }} className="bg-white" disabled={!invitationLink || ambiguousParent} data-testid={`button-assignment-qr-${a.id}`} aria-label={a.respondentType === "parent" ? "Show parent portal QR code" : "Show form QR code"} title={a.respondentType === "parent" ? "Show existing parent portal QR code" : "Show existing form QR code"}>
                                  <QrCode size={16} />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => copyLink(invitationLink)} className="bg-white" disabled={!invitationLink || ambiguousParent} data-testid={`button-assignment-copy-${a.id}`} aria-label={a.respondentType === "parent" ? "Copy parent portal link" : "Copy form link"} title={a.respondentType === "parent" ? "Copy existing parent portal link" : "Copy existing form link"}>
                                  <Copy size={16} />
                                </Button>
                            <Button variant="outline" size="sm" className="bg-white"
                              disabled={!invitationLink || ambiguousParent}
                              data-testid={`button-assignment-open-${a.id}`}
                              title={a.respondentType === "parent" ? "Open Parent Portal" : "Open Form"}
                              onClick={() => setFormModalUrl(a.respondentType === "parent" ? invitationLink : `${BASE_URL}/external/${a.uniqueToken}`)}>
                              <ExternalLink size={16} />
                            </Button>
                          </>
                        )}
                        {a.respondentType === 'parent' && a.status !== 'completed' && (
                          <Button
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={!invitationLink || ambiguousParent}
                            title="Open the parent's self-completion portal"
                            data-testid={`button-parent-portal-${a.id}`}
                            onClick={() => setFormModalUrl(invitationLink)}
                          >
                            <ExternalLink size={14} className="mr-1" /> Open Parent Portal
                          </Button>
                        )}
                        {a.respondentType === 'self' && a.status !== 'completed' && (
                            <Link href={`/cases/${caseId}/self-report`}>
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                                <Play size={14} className="mr-1" /> Launch Guided
                              </Button>
                            </Link>
                        )}
                        {["admin", "psychometrician"].includes(role) && !isSeparateExaminerWorkflow(a) && (
                          <Button size="sm" className="gap-1.5" data-testid={`button-send-form-${a.id}`}
                            disabled={(a.toolId !== "CONSENT" && batteryReviewQuery.data?.testResults?.[a.id]?.status !== "passed") || hasSplitUnnamedParentPackages && a.respondentType === "parent" && (a.respondentLabel === "Parent" || a.respondentLabel === "Parent Assessment Package")}
                            title={a.toolId === "CONSENT" ? "Send the parent/guardian consent form through the standard RAOS email flow" : batteryReviewQuery.data?.testResults?.[a.id]?.status === "passed" ? "Send this tested form now — no battery approval required" : "Complete this form's staff test to send it"}
                            onClick={() => {
                              setSendEmailError(null);
                              setSendEmailTarget({ groupKey: `assignment:${a.id}`, label: a.toolName, name: a.assignedToName ?? "", email: a.assignedToEmail ?? "", link: invitationLink, formNames: [a.toolName], respondentRole: RESPONDENT_TYPE_LABELS[a.respondentType] ?? a.respondentType, assignmentIds: [a.id], requiresFormTest: a.toolId !== "CONSENT" });
                              setSendEmailForm({ name: a.assignedToName ?? "", email: a.assignedToEmail ?? "" });
                            }}>
                            <Send size={14} /> Send form
                          </Button>
                        )}
                        {((role === "admin" || role === "school_clinical_coordinator") || role === "psychometrician" || role === "clinical_apprentice") && (
                          <Button
                            variant="outline" size="sm"
                            className="bg-white text-red-500 hover:text-red-700 hover:border-red-300"
                            title="Remove assignment"
                            onClick={() => setDeleteAssignmentTarget({ id: a.id, name: a.toolName })}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                        );
                      })
                    ])}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(currentUser?.role === "admin" || currentUser?.role === "psychometrician") && (
          <Card className="border border-violet-200 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-violet-950">
                <ShieldCheck size={18} className="text-violet-700" />
                Staff review before sending
                {batteryReviewQuery.data?.approved && (
                  <Badge className="ml-auto bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Approved</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-slate-600">
                Check each distinct questionnaire once; forms with identical content, language, and version share a pass across cases. Test answers are not stored. Examiner-administered assessments, including RPPI, use their own sessions and do not require a questionnaire test.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {batteryReviewQuery.isLoading ? (
                <p className="text-sm text-slate-500">Checking the assigned battery…</p>
              ) : batteryReviewQuery.isError ? (
                <p role="alert" data-testid="status-battery-review-load-error" className="text-sm text-red-700">
                  {batteryReviewQuery.error.message}
                </p>
              ) : batteryReviewQuery.data ? (
                <>
                  <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Each form with a current successful staff test is ready to send. Untested forms do not hold up tested forms.
                  </div>
                  {batteryReviewQuery.data.issues.filter(issue => !issue.startsWith(BATTERY_STALE_APPROVAL_ISSUE_PREFIX)).map((issue, index) => {
                    const staleApprovalNotice = issue.startsWith(BATTERY_STALE_APPROVAL_ISSUE_PREFIX);
                    return (
                    <div key={`${issue}-${index}`} role={staleApprovalNotice ? "status" : "alert"} data-testid={`status-battery-review-issue-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      {issue}
                    </div>
                    );
                  })}
                  {batteryReviewQuery.data.missingSnapshots > 0 && (
                    <p role="alert" data-testid="status-missing-form-snapshots" className="text-sm font-medium text-red-700">
                      {batteryReviewQuery.data.missingSnapshots} assigned form{batteryReviewQuery.data.missingSnapshots === 1 ? "" : "s"} lack a frozen questionnaire and need correction before testing. Other tested forms remain ready to send.
                    </p>
                  )}
                  <div className="max-h-[360px] overflow-y-auto rounded-lg border bg-white">
                    {(c.assignments ?? []).filter(a => !INTAKE_TOOL_IDS.has(a.toolId ?? "")).length === 0 ? (
                      <p className="p-4 text-sm text-slate-500">No assessment forms are assigned yet.</p>
                    ) : (
                      <>
                        <p className="border-b bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-950">Questionnaires to check before sending</p>
                        {(c.assignments ?? [])
                          .filter(a => !INTAKE_TOOL_IDS.has(a.toolId ?? "") && !isSeparateExaminerWorkflow(a))
                          .map(assignment => (
                        <div key={assignment.id} data-testid={`row-review-form-${assignment.id}`} className="flex flex-col gap-2 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-800">{assignment.toolName}</p>
                            <p className="text-xs text-slate-500">
                              {(RESPONDENT_TYPE_LABELS[assignment.respondentType] ?? assignment.respondentType)}
                              {assignment.respondentLabel ? ` · ${assignment.respondentLabel}` : ""}
                            </p>
                            <QuestionnaireTestStatus result={batteryReviewQuery.data?.testResults?.[assignment.id]} />
                          </div>
                          <Link href={`/cases/${caseId}/assignments/${assignment.id}/review`}>
                            <Button size="sm" variant="outline" className="shrink-0 gap-1.5 border-violet-300 text-violet-800 hover:bg-violet-50" data-testid={`button-test-form-${assignment.id}`}>
                              <Eye size={14} /> {batteryReviewQuery.data?.testResults?.[assignment.id]?.status === "passed" ? "Test again" : "Test form"}
                            </Button>
                          </Link>
                        </div>
                      ))}
                        {separateExaminerCount > 0 && (
                          <>
                            <p className="border-b bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                              Examiner assessments · internal workflows, available independently of questionnaire testing
                            </p>
                            {(c.assignments ?? []).filter(isSeparateExaminerWorkflow).map(assignment => (
                              <div key={assignment.id} data-testid={`row-review-examiner-${assignment.id}`} className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-3 text-sm text-slate-700">
                                <span>{assignment.toolName}</span>
                                <Link href={`/cases/${caseId}/${getExaminerWorkflowPath(assignment.toolId)}/${assignment.id}`}>
                                  <Button size="sm" variant="outline" data-testid={`button-open-examiner-review-${assignment.id}`} className="gap-1.5">
                                    {assignment.status === "completed" ? <Eye size={14} /> : <Play size={14} />}
                                    {assignment.status === "completed" ? "View assessment" : "Administer"}
                                  </Button>
                                </Link>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                  {batteryReviewActionError && (
                    <p role="alert" data-testid="status-battery-approval-error" className="text-sm text-red-700">{batteryReviewActionError}</p>
                  )}
                  {currentUser?.role === "admin" && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-slate-500">
                          {batteryReviewQuery.data.passedCount ?? 0} / {batteryReviewQuery.data.questionnaireCount ?? batteryReviewQuery.data.assignmentCount - separateExaminerCount} questionnaires have a current test pass. {separateExaminerCount} examiner assessment{separateExaminerCount === 1 ? "" : "s"} shown separately and not tested here.
                      </p>
                      <p className="text-xs font-semibold text-emerald-700">Each passed form is ready to send immediately. No separate battery approval is needed.</p>
                    </div>
                  )}
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* ── Respondent Dispatch Panel ── below assignments so battery is finalized first ── */}
      {((role === "admin" || role === "school_clinical_coordinator") || role === "psychometrician" || role === "clinical_apprentice") && !hideAssignments && (
        <Card className="border-none shadow-md">
          <div className="px-6 py-4 flex items-center gap-2 border-b bg-slate-50/50">
            <Users size={17} className="text-primary" />
            <h3 className="font-semibold text-slate-800">Send Forms to Respondents</h3>
            {(dispatchGroups.length > 0 || hasSplitUnnamedParentPackages) && (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{dispatchGroups.length + (hasSplitUnnamedParentPackages ? 1 : 0)} respondent{dispatchGroups.length + (hasSplitUnnamedParentPackages ? 1 : 0) !== 1 ? "s" : ""}</span>
            )}
          </div>
          <CardContent className="p-0">
              <div role="status" data-testid="status-per-form-readiness" className="px-5 py-3 border-b border-emerald-200 bg-emerald-50 text-sm text-emerald-950">
                Test each form once. A successful current test makes that form ready to send immediately, even if other forms are not tested yet. Existing links and QR codes remain available. Intake/referral links are unchanged.
              </div>
            {hasSplitUnnamedParentPackages && (role === "admin" || role === "psychometrician" || role === "school_clinical_coordinator") && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-amber-900">Parent forms are in two incomplete groups. Confirm they belong to one person, then combine them before sharing one link. Existing forms and responses are kept.</p>
                <Button size="sm" variant="outline" className="bg-white border-amber-300 text-amber-900" disabled={consolidatingParent} onClick={handleConsolidateParent}>
                  {consolidatingParent ? "Combining…" : "Combine parent packages"}
                </Button>
              </div>
            )}
            {duplicateParentToolNames.length > 0 && (
              <p className="px-5 py-2 text-xs text-amber-900 bg-amber-50 border-b border-amber-100">
                Duplicate parent form{duplicateParentToolNames.length === 1 ? "" : "s"}: {duplicateParentToolNames.join(", ")}. Review before sending; combining packages does not remove duplicates.
              </p>
            )}
            {dispatchGroups.length === 0 && !hasSplitUnnamedParentPackages ? (
              <div className="flex flex-col items-center justify-center py-8 px-6 text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Users size={22} className="text-slate-400" />
                </div>
                <p className="font-medium text-slate-700">No external respondents assigned yet</p>
                <p className="text-sm text-slate-500">Add a parent, teacher, or other external respondent in the <span className="font-medium text-slate-700">Build Assessment Battery</span> section above — they'll appear here once assigned.</p>
              </div>
            ) : (
              <div className="divide-y">
                {hasSplitUnnamedParentPackages && (
                  <div className="px-5 py-4 bg-amber-50/40">
                    <p className="font-semibold text-slate-800 text-sm">Parent assessment package</p>
                    <p className="text-xs text-slate-600 mt-1">{parentAssessmentRows.length} forms pending consolidation. A shareable parent link will be available after the packages are combined.</p>
                  </div>
                )}
                {dispatchGroups.map(group => {
                  const readyForms = group.forms.filter(form => batteryReviewQuery.data?.testResults?.[form.id]?.status === "passed");
                  const completedCount = group.forms.filter(f => f.status === "completed").length;
                  const allDone = completedCount === group.forms.length;
                  return (
                    <div key={group.groupKey} className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {editingNameKey === group.groupKey ? (
                            <div className="flex items-center gap-1.5">
                              <Input
                                autoFocus
                                value={editingNameValue}
                                onChange={e => setEditingNameValue(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleSaveRespondentName(group); if (e.key === "Escape") setEditingNameKey(null); }}
                                placeholder="Enter name..."
                                className="h-7 text-sm w-44"
                              />
                              <Button size="sm" className="h-7 px-2" disabled={savingName} onClick={() => handleSaveRespondentName(group)}>
                                <Check size={13} />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingNameKey(null)}>
                                <X size={13} />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-800 text-sm">{group.name ?? group.label}</span>
                              <button
                                title="Edit name shown on portal header"
                                className="text-slate-300 hover:text-slate-600 transition-colors"
                                onClick={() => { setEditingNameKey(group.groupKey); setEditingNameValue(group.name ?? ""); }}
                              >
                                <Pencil size={11} />
                              </button>
                            </div>
                          )}
                          {group.respondentType !== "self" && (
                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{group.label}</span>
                          )}
                          {allDone
                            ? <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">All Complete</span>
                            : <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">{completedCount}/{group.forms.length} done</span>
                          }
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                          {group.email && <span className="text-slate-400">{group.email}</span>}
                          <span>{group.forms.map(f => f.name).join(" · ")}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        {currentUser?.role === "admin" && ["parent", "teacher", "teacher1", "teacher2", "referring_teacher", "boarding_staff", "special_needs_teacher", "school_counselor"].includes(group.respondentType) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 border-violet-200 text-violet-800 hover:bg-violet-50"
                            data-testid={`button-send-test-package-${group.groupKey.replace(/[^a-z0-9-]/gi, "-")}`}
                            onClick={() => {
                              setTestPackageTarget({ label: group.label, assignmentIds: group.forms.map(form => form.id) });
                              setTestPackageEmail("");
                              setTestPackageError(null);
                              setTestPackageExpiresAt(null);
                            }}
                          >
                            <FlaskConical size={14} /> Send test package
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="bg-white" title="Show QR Code for existing respondent link" aria-label={`Show QR code for ${group.name ?? group.label}`}
                          onClick={() => { setActiveQr(group.link); setQrModalOpen(true); }}>
                          <QrCode size={15} />
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white" title="Copy existing respondent link" aria-label={`Copy link for ${group.name ?? group.label}`}
                          onClick={() => copyLink(group.link)}>
                          <Copy size={15} />
                        </Button>
                        <Button size="sm" className="gap-1.5" disabled={readyForms.length === 0} title={readyForms.length === 0 ? "Test at least one form in this package to send it" : `Send ${readyForms.length} tested form(s) now`}
                          onClick={() => {
                            if (readyForms.length === 0) return;
                            setSendEmailError(null);
                            setSendEmailTarget({
                              groupKey: group.groupKey,
                              label: group.label,
                              name: group.name ?? "",
                              email: group.email ?? "",
                              link: group.link,
                              formNames: readyForms.map(f => f.name),
                              respondentRole: group.respondentType === "self" ? "Invigilator" : group.label,
                              assignmentIds: readyForms.map(f => f.id),
                              requiresFormTest: true,
                            });
                            setSendEmailForm({ name: group.name ?? "", email: group.email ?? "" });
                          }}>
                          <Send size={14} /> {group.respondentType === "self" ? "Send to Invigilator" : readyForms.length < group.forms.length && readyForms.length > 0 ? `Send tested (${readyForms.length})` : "Send Email"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {(() => {
              const hasParentPackage = (c?.assignments ?? []).some(a =>
                a.respondentType === "parent" &&
                a.respondentLabel !== "Second Parent / Guardian" &&
                !INTAKE_TOOL_IDS.has(a.toolId ?? "")
              );
              const hasSecondParent = (c?.assignments ?? []).some(a =>
                a.respondentType === "parent" &&
                a.respondentLabel === "Second Parent / Guardian"
              );
              if (!hasParentPackage || hasSecondParent) return null;
              return (
                <div className="px-5 py-3 border-t border-slate-100">
                  <button
                    className="text-xs text-slate-400 hover:text-primary flex items-center gap-1.5 transition-colors"
                    onClick={() => setAddSecondParentOpen(true)}
                  >
                    <UserPlus size={12} /> Add second parent / guardian
                  </button>
                </div>
              );
            })()}
          </CardContent>
        </Card>
        )}
      </div>

      {/* Modals */}

      {/* Add Second Parent / Guardian */}
      <Dialog open={addSecondParentOpen} onOpenChange={open => { if (!open) { setAddSecondParentOpen(false); setSecondParentForm({ name: "", email: "" }); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Second Parent / Guardian</DialogTitle>
            <DialogDescription>
              This creates a separate portal link with the same assessment forms, for a second parent or guardian. Name and email are optional — you can send or share the link manually later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">Name <span className="text-slate-400">(optional)</span></Label>
              <Input
                placeholder="e.g. Jane Smith"
                value={secondParentForm.name}
                onChange={e => setSecondParentForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600 mb-1 block">Email <span className="text-slate-400">(optional)</span></Label>
              <Input
                type="email"
                placeholder="e.g. jane@email.com"
                value={secondParentForm.email}
                onChange={e => setSecondParentForm(f => ({ ...f, email: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") handleAddSecondParent(); }}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => { setAddSecondParentOpen(false); setSecondParentForm({ name: "", email: "" }); }}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={isAddingSecondParent} onClick={handleAddSecondParent}>
              {isAddingSecondParent ? "Adding…" : "Add & Create Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAssignmentTarget} onOpenChange={open => { if (!open) setDeleteAssignmentTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Assignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold text-slate-900">{deleteAssignmentTarget?.name}</span>? The link will stop working and any responses already collected will be lost.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteAssignmentTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive" className="flex-1"
              disabled={deleteAssignmentMut.isPending}
              onClick={handleDeleteAssignment}
            >
              {deleteAssignmentMut.isPending ? "Removing..." : "Remove"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md text-center flex flex-col items-center">
          <DialogHeader>
            <DialogTitle>Scan to complete form</DialogTitle>
            <DialogDescription>Have the respondent scan this with their phone camera.</DialogDescription>
          </DialogHeader>
          <div className="bg-white p-6 rounded-2xl shadow-inner border inline-block my-6">
            <QRCodeSVG value={activeQr || "https://remynd.com"} size={200} level="H" />
          </div>
          <p className="text-xs text-slate-500 break-all w-full bg-slate-50 p-2 rounded">{activeQr}</p>
        </DialogContent>
      </Dialog>

      {/* Send Email to Respondent */}
      <Dialog open={!!sendEmailTarget} onOpenChange={open => { if (!open) { setSendEmailTarget(null); setIsSendingEmail(false); setSendEmailError(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {sendEmailTarget?.respondentRole === "Invigilator"
                ? "Send Self-Report Forms to Invigilator"
                : `Send Forms to ${sendEmailTarget?.label}`}
            </DialogTitle>
            <DialogDescription>
              {sendEmailTarget?.respondentRole === "Invigilator"
                ? "The invigilator will receive a link to the student's self-report portal and can administer each form with the student."
                : "An email will be sent with a link to all their assigned forms for this case."}
            </DialogDescription>
          </DialogHeader>
          {sendEmailTarget && (
            <div className="space-y-4 mt-1">
              <div className="bg-slate-50 rounded-lg p-3 border text-sm space-y-1">
                <p className="font-medium text-slate-700 text-xs uppercase tracking-wide mb-2">Forms included</p>
                {sendEmailTarget.formNames.map(f => (
                  <div key={f} className="flex items-center gap-2 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-name">Recipient Name</Label>
                <Input id="send-name" placeholder="e.g. Sarah Tan"
                  value={sendEmailForm.name}
                  onChange={e => setSendEmailForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-email">Recipient Email</Label>
                <Input id="send-email" type="email" placeholder="e.g. sarah@school.edu"
                  value={sendEmailForm.email}
                  onChange={e => setSendEmailForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              {sendEmailError && (
                <p role="alert" data-testid="status-send-email-error" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {sendEmailError}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setSendEmailTarget(null); setIsSendingEmail(false); setSendEmailError(null); }}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-2" disabled={!!sendEmailTarget.requiresFormTest && sendEmailTarget.assignmentIds.some(id => batteryReviewQuery.data?.testResults?.[id]?.status !== "passed") || isSendingEmail || !sendEmailForm.name.trim() || !sendEmailForm.email.trim()}
                  onClick={async () => {
                    if (!sendEmailTarget) return;
                    setIsSendingEmail(true);
                    setSendEmailError(null);
                    try {
                      if (sendEmailTarget.requiresFormTest) {
                        const reviewResponse = await fetch(`${BASE_URL}/api/cases/${encodeURIComponent(caseId)}/battery-review`, {
                          headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
                        });
                        const latestReview = reviewResponse.ok
                          ? await reviewResponse.json() as BatteryReviewStatus
                          : null;
                        if (!latestReview || sendEmailTarget.assignmentIds.some(id => latestReview.testResults?.[id]?.status !== "passed")) {
                          if (latestReview) queryClient.setQueryData(batteryReviewQueryKey, latestReview);
                          throw new Error("One of the selected forms needs a successful current staff test before sending. Other forms do not need to be tested first.");
                        }
                      }
                      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/send-respondent-email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
                        body: JSON.stringify({
                          toEmail: sendEmailForm.email.trim(),
                          toName: sendEmailForm.name.trim(),
                          formLink: sendEmailTarget.link,
                          formNames: sendEmailTarget.formNames,
                            assignmentIds: sendEmailTarget.assignmentIds,
                          studentName: c.studentName,
                          respondentRole: sendEmailTarget.respondentRole,
                        }),
                      });
                      if (!r.ok) {
                        const body = await r.json().catch(() => null) as { message?: string; error?: string } | null;
                        throw new Error(body?.message ?? body?.error ?? "The server rejected the send. No email was sent.");
                      }
                      toast({ title: "Email sent", description: `Forms link sent to ${sendEmailForm.email}` });
                      setSendEmailTarget(null);
                      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
                    } catch (error) {
                      const message = error instanceof Error ? error.message : "Please refresh the review and try again.";
                      setSendEmailError(message);
                      toast({ title: "Could not send email", description: message, variant: "destructive" });
                    } finally {
                      setIsSendingEmail(false);
                    }
                  }}>
                  <Send size={15} /> {isSendingEmail ? "Sending..." : "Send Email"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!testPackageTarget} onOpenChange={open => {
        if (!open && !isSendingTestPackage) {
          setTestPackageTarget(null);
          setTestPackageError(null);
          setTestPackageExpiresAt(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FlaskConical size={18} className="text-violet-700" />
              Send test package
            </DialogTitle>
            <DialogDescription>
              Send a temporary, test-only copy of this package to any email address. This is separate from the respondent’s real forms link.
            </DialogDescription>
          </DialogHeader>
          {testPackageTarget && (
            <form onSubmit={handleSendTestPackage} className="space-y-4">
              <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3">
                <p className="text-sm font-semibold text-violet-950" data-testid="text-test-package-label">{testPackageTarget.label}</p>
                <p className="text-xs text-violet-800 mt-1">{testPackageTarget.assignmentIds.length} form{testPackageTarget.assignmentIds.length === 1 ? "" : "s"} in this test package</p>
                <p className="text-xs font-bold text-violet-950 mt-2">[TEST ONLY] No responses are saved.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-package-email">Email address</Label>
                <Input
                  id="test-package-email"
                  data-testid="input-test-package-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={testPackageEmail}
                  onChange={event => setTestPackageEmail(event.target.value)}
                  required
                  disabled={isSendingTestPackage || !!testPackageExpiresAt}
                />
              </div>
              {testPackageError && (
                <p role="alert" data-testid="status-test-package-error" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {testPackageError}
                </p>
              )}
              {testPackageExpiresAt && (
                <p role="status" data-testid="status-test-package-sent" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Test link sent to {testPackageEmail.trim()}. It expires {new Date(testPackageExpiresAt).toLocaleString()}. No respondent details or real response link were changed.
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isSendingTestPackage}
                  onClick={() => {
                    setTestPackageTarget(null);
                    setTestPackageError(null);
                    setTestPackageExpiresAt(null);
                  }}
                >
                  {testPackageExpiresAt ? "Done" : "Cancel"}
                </Button>
                {!testPackageExpiresAt && (
                  <Button
                    type="submit"
                    className="flex-1 gap-2"
                    disabled={isSendingTestPackage || !testPackageEmail.trim() || currentUser?.role !== "admin"}
                    data-testid="button-confirm-send-test-package"
                  >
                    <Send size={14} /> {isSendingTestPackage ? "Sending…" : "Send test link"}
                  </Button>
                )}
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addAssignmentModalOpen} onOpenChange={setAddAssignmentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
            {role === "psychometrician" && (
              <DialogDescription>As a psychometrician, you can deploy assessment instruments (not intake forms).</DialogDescription>
            )}
          </DialogHeader>
          {assignmentIsSycCase && (
            <div className={`rounded-md border px-3 py-2.5 text-sm ${assignmentSycConsentComplete ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
              {assignmentSycConsentComplete
                ? "RCEP-CORE, classroom observation, and work-sample/prior-intervention review are required components. Choose respondents and assign them through RAOS. Delayed school responses do not block other case work and can be added later."
                : "Only the Parent/Guardian Consent Form is available until the parent submits it. Approved assessment forms then unlock automatically; refresh this case if needed."}
            </div>
          )}
          {assignmentIsSycCase && (
            <section aria-labelledby="syc-required-forms-heading" className="mt-3 rounded-lg border-2 border-emerald-300 bg-emerald-50/70 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="syc-required-forms-heading" className="text-xs font-bold uppercase tracking-wide text-emerald-950">
                  Strengthen Your Core · Required Core Forms
                </h3>
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                  {SYC_CORE_EVIDENCE_TOOLS.length} required
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-700">
                Select the forms here first, then choose the respondent(s) below. Your selections stay checked when you choose respondents.
              </p>
              <div className="mt-2 divide-y rounded-md border border-emerald-200 bg-white">
                {SYC_CORE_EVIDENCE_TOOLS.map(form => {
                  const catalogueTool = tools?.find(tool => tool.id === form.toolId);
                  const supportedRespondents = assignmentRespondentTypes(
                    catalogueTool?.respondentTypes ?? [],
                    form.toolId,
                  );
                  const checked = newAssignment.toolIds.includes(form.toolId);
                  return (
                    <label
                      key={form.toolId}
                      className={`flex items-start gap-3 px-3 py-2.5 ${assignmentSycConsentComplete ? "cursor-pointer hover:bg-emerald-50/60" : "cursor-not-allowed opacity-60"} ${checked ? "bg-emerald-50" : ""}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-700"
                        checked={checked}
                        disabled={!assignmentSycConsentComplete}
                        data-testid={`checkbox-syc-required-${form.toolId}`}
                        onChange={event => {
                          const toolIds = event.target.checked
                            ? [...newAssignment.toolIds, form.toolId]
                            : newAssignment.toolIds.filter(id => id !== form.toolId);
                          setNewAssignment({ ...newAssignment, toolIds });
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{form.label}</span>
                        {supportedRespondents.length > 0 && (
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            Available for: {supportedRespondents.map(type => RESPONDENT_TYPE_LABELS[type] ?? type).join(", ")}
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
              {!assignmentSycConsentComplete && (
                <p className="mt-2 text-xs text-amber-900">Complete the standard parent/guardian consent first to select and assign these forms.</p>
              )}
              {newAssignment.toolIds.some(id => SYC_CORE_EVIDENCE_TOOLS.some(form => form.toolId === id)) && (
                <p className="mt-2 text-xs font-semibold text-emerald-900">
                  {newAssignment.toolIds.filter(id => SYC_CORE_EVIDENCE_TOOLS.some(form => form.toolId === id)).length} required core form(s) selected
                </p>
              )}
            </section>
          )}
          <form onSubmit={handleAddAssignment} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Respondent Type <span className="text-slate-400 font-normal">(select all that apply)</span></label>
              <div className="border border-input rounded-md divide-y">
                {assignmentRespondentTypeOptions.map(rt => {
                  const checked = newAssignment.respondentTypes.includes(rt);
                  return (
                    <label key={rt} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${checked ? "bg-primary/5" : ""}`}>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 accent-primary cursor-pointer"
                        checked={checked}
                        onChange={e => {
                          const types = e.target.checked
                            ? [...newAssignment.respondentTypes, rt]
                            : newAssignment.respondentTypes.filter(t => t !== rt);
                          const retainedCoreForms = assignmentIsSycCase
                            ? newAssignment.toolIds.filter(id => SYC_CORE_EVIDENCE_TOOLS.some(form => form.toolId === id))
                            : [];
                          setNewAssignment({ ...newAssignment, respondentTypes: types, toolIds: retainedCoreForms });
                          setShowAllTools(false);
                        }}
                      />
                      <span className="text-sm text-slate-800">{RESPONDENT_TYPE_LABELS[rt]}</span>
                    </label>
                  );
                })}
              </div>
              {newAssignment.respondentTypes.length > 0 && (
                <p className="text-xs text-primary font-medium">{newAssignment.respondentTypes.length} respondent type{newAssignment.respondentTypes.length > 1 ? "s" : ""} selected</p>
              )}
            </div>
            {newAssignment.respondentTypes.length > 0 && (() => {
              const matchedTools = filteredTools?.filter(t =>
                newAssignment.respondentTypes.some(rt =>
                  assignmentRespondentTypes(t.respondentTypes ?? [], t.id).includes(rt)
                )
              ) ?? [];
              const sycCoreToolIds = new Set<string>(SYC_CORE_EVIDENCE_TOOLS.map(form => form.toolId));
              const availableTools = showAllTools ? (filteredTools ?? []) : matchedTools;
              const approvedSycExtension = typeof assignmentSycWorkflow.approvedExtension === "string"
                ? assignmentSycWorkflow.approvedExtension
                : null;
              const formSections = assignmentIsSycCase
                ? [
                    {
                      key: "syc-extension",
                      title: "Strengthen Your Core · Approved Extension",
                      tools: availableTools.filter(tool => tool.id === approvedSycExtension),
                    },
                    {
                      key: "raos-standard",
                      title: "Standard RAOS Forms",
                      tools: availableTools.filter(tool =>
                        !sycCoreToolIds.has(tool.id) && tool.id !== approvedSycExtension
                      ),
                    },
                  ].filter(section => section.tools.length > 0)
                : [{ key: "all", title: "", tools: availableTools }];
              const additionalTools = formSections.flatMap(section => section.tools);
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      {assignmentIsSycCase ? "Other Assessment Forms" : "Assessment Forms"}{" "}
                      <span className="text-slate-400 font-normal">(select all that apply)</span>
                    </label>
                    <button
                      type="button"
                      className="text-xs text-primary underline underline-offset-2 hover:opacity-70"
                      onClick={() => setShowAllTools(v => !v)}
                    >
                      {showAllTools ? "Show matched only" : "Show all tools"}
                    </button>
                  </div>
                  <div className="border border-input rounded-md max-h-64 overflow-y-auto">
                    {additionalTools.length === 0 && (
                      <p className="px-3 py-3 text-sm text-slate-500">
                        {assignmentIsSycCase
                          ? "The required Strengthen Your Core forms are listed above. No other forms match the selected respondents."
                          : "No forms available for the selected respondent type(s)."}
                      </p>
                    )}
                    {formSections.map(section => (
                      <div key={section.key}>
                        {section.title && (
                          <div className="border-y bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600 first:border-t-0">
                            {section.title}
                          </div>
                        )}
                        {section.tools.map(t => {
                          const checked = newAssignment.toolIds.includes(t.id);
                          return (
                            <label key={t.id} className={`flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 cursor-pointer hover:bg-slate-50 transition-colors ${checked ? "bg-primary/5" : ""}`}>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 accent-primary cursor-pointer"
                                checked={checked}
                                onChange={e => {
                                  const ids = e.target.checked
                                    ? [...newAssignment.toolIds, t.id]
                                    : newAssignment.toolIds.filter(id => id !== t.id);
                                  setNewAssignment({ ...newAssignment, toolIds: ids });
                                }}
                              />
                              <span className="text-sm text-slate-800">{toolDisplayName(t.id, t.name)}</span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  {newAssignment.toolIds.length > 0 && (
                    <p className="text-xs text-primary font-medium">{newAssignment.toolIds.length} total form{newAssignment.toolIds.length > 1 ? "s" : ""} selected</p>
                  )}
                </div>
              );
            })()}
            <div className="space-y-2">
              <label className="text-sm font-medium">Respondent Label <span className="text-slate-400 font-normal">(optional — e.g., 'Mom', 'Math Teacher')</span></label>
              <Input placeholder="e.g. Mom, Mr. Santos" value={newAssignment.respondentLabel} onChange={e => setNewAssignment({...newAssignment, respondentLabel: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned To Name</label>
              <Input value={newAssignment.assignedToName} onChange={e => setNewAssignment({...newAssignment, assignedToName: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address <span className="text-slate-400 font-normal">(optional)</span></label>
              <Input type="email" placeholder="respondent@example.com" value={newAssignment.assignedToEmail} onChange={e => setNewAssignment({...newAssignment, assignedToEmail: e.target.value})} />
            </div>
            <Button type="submit" className="w-full mt-4" disabled={isSubmittingAssignments}>
              {isSubmittingAssignments
                ? "Adding…"
                : newAssignment.respondentTypes.length > 1 || newAssignment.toolIds.length > 1
                  ? "Add Assignments"
                  : "Add Assignment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Case Dialog */}
      <Dialog open={editCaseOpen} onOpenChange={setEditCaseOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Case</DialogTitle>
            <DialogDescription>Update the case details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 mt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Student Name</label>
              <Input value={editFields.studentName} onChange={e => setEditFields(f => ({ ...f, studentName: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">School</label>
              <Input value={editFields.school} onChange={e => setEditFields(f => ({ ...f, school: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="edit-case-dob" className="text-sm font-medium">Date of Birth</label>
                <Input id="edit-case-dob" type="date" value={editFields.dob} onChange={e => setEditFields(f => ({ ...f, dob: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <label htmlFor="edit-case-grade" className="text-sm font-medium">Current Grade</label>
                <Input id="edit-case-grade" value={editFields.grade} onChange={e => setEditFields(f => ({ ...f, grade: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-slate-500">The birth date determines the age shown in the intake analysis. Save changes, then regenerate the analysis.</p>
            <div className="space-y-1">
              <label className="text-sm font-medium">Language</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editFields.languagePreference} onChange={e => setEditFields(f => ({ ...f, languagePreference: e.target.value }))}>
                <option value="english">English</option>
                <option value="mandarin">Mandarin</option>
                <option value="korean">Korean</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Referral Reason</label>
              <Input value={editFields.referralReason} onChange={e => setEditFields(f => ({ ...f, referralReason: e.target.value }))} />
            </div>
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent / Guardian</p>
              <div className="space-y-1">
                <label className="text-sm font-medium">Name</label>
                <Input value={editFields.parentName} onChange={e => setEditFields(f => ({ ...f, parentName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={editFields.parentEmail} onChange={e => setEditFields(f => ({ ...f, parentEmail: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Phone</label>
                  <Input value={editFields.parentPhone} onChange={e => setEditFields(f => ({ ...f, parentPhone: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Case Status</label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editFields.caseStatus} onChange={e => setEditFields(f => ({ ...f, caseStatus: e.target.value }))}>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="closed">Closed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {currentUser?.role === "admin" && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Case Type</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editFields.caseMode} onChange={e => setEditFields(f => ({ ...f, caseMode: e.target.value }))}>
                  <option value="live">Live case (real student)</option>
                  <option value="test">Test / training case</option>
                </select>
                <p className="text-xs text-slate-400">Only admins can change case type — not editable by school coordinators or apprentices, even in a coaching session.</p>
              </div>
            )}
            <div className="border-t pt-3 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Team</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Invigilator</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editFields.assignedLeadId}
                    onChange={e => setEditFields(f => ({ ...f, assignedLeadId: e.target.value }))}
                  >
                    <option value="">— Unassigned —</option>
                    {(staffUsers ?? []).filter((u: any) => u.role === "assessment_invigilator").map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Psychometrician</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editFields.assignedPsychId}
                    onChange={e => setEditFields(f => ({ ...f, assignedPsychId: e.target.value }))}
                  >
                    <option value="">— Unassigned —</option>
                    {(staffUsers ?? []).filter((u: any) => u.role === "psychometrician").map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="border-t pt-3 space-y-1">
              <label className="text-sm font-medium">Working Document (Google Docs URL)</label>
              <Input
                type="url"
                placeholder="https://docs.google.com/document/d/..."
                value={editFields.workingDocUrl}
                onChange={e => setEditFields(f => ({ ...f, workingDocUrl: e.target.value }))}
              />
              <p className="text-xs text-slate-500">Paste the shared Google Docs link here so both you and Abegail can access the working report.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditCaseOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={updateCaseMut.isPending}>
                {updateCaseMut.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Step Back Confirmation */}
      <Dialog open={stepBackConfirmOpen} onOpenChange={open => { if (!open) setStepBackConfirmOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{stepBackTarget ? `Return to ${PHASE_LABELS[stepBackTarget]}?` : "Step Back to Previous Phase?"}</DialogTitle>
            <DialogDescription>
              This will move <span className="font-semibold text-slate-900">{c.studentName}</span>'s case back to the{" "}
              <span className="font-semibold text-slate-900">{stepBackTarget ? PHASE_LABELS[stepBackTarget] : prevPhaseName}</span> phase.
              Existing forms, responses, and assessment results will not be deleted. You can advance again later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setStepBackConfirmOpen(false)} disabled={stepBackMut.isPending}>Cancel</Button>
            <Button variant="default" className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => stepBackMut.mutate(stepBackTarget ? { targetPhase: stepBackTarget } : {})} disabled={stepBackMut.isPending}>
              {stepBackMut.isPending ? "Moving phase..." : stepBackTarget ? "Return to phase" : "Step Back"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteCaseOpen} onOpenChange={open => { if (!open) setDeleteCaseOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Case?</DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-semibold text-slate-900">{c.studentName}</span>'s case and its associated case data. This cannot be undone.
              {c.id === "raos-promotional-demo-v2" && " The fictional demo can be recreated later using the administrator Guided Demo action."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteCaseOpen(false)} disabled={deleteLoading}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={handleDeleteCase} disabled={deleteLoading}>
              {deleteLoading ? "Deleting..." : "Delete Case"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Meeting Invite Dialog */}
      <Dialog open={sendInviteOpen} onOpenChange={open => { if (!open) setSendInviteOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail size={18} className="text-emerald-600" /> Send Assessment Meeting Link
            </DialogTitle>
            <DialogDescription>
              Choose who should receive the assessment meeting link for <span className="font-semibold text-slate-900">{c?.studentName}</span>.
            </DialogDescription>
          </DialogHeader>
          {(() => {
            const all = buildInviteRecipients();
            const parents = all.filter(r => r.type === "parent");
            const teachers = all.filter(r => r.type === "teacher");
            const staff = all.filter(r => r.type === "staff");

            const groupState = (group: typeof all): boolean | "indeterminate" => {
              if (group.length === 0) return false;
              const checkedCount = group.filter(r => inviteChecked[r.key]).length;
              if (checkedCount === 0) return false;
              if (checkedCount === group.length) return true;
              return "indeterminate";
            };

            const toggleGroup = (group: typeof all, forceValue?: boolean) => {
              const allChecked = group.every(r => inviteChecked[r.key]);
              const newVal = forceValue !== undefined ? forceValue : !allChecked;
              setInviteChecked(prev => {
                const next = { ...prev };
                for (const r of group) next[r.key] = newVal;
                return next;
              });
            };

            const GroupHeader = ({ label, group, optional }: { label: string; group: typeof all; optional?: boolean }) => {
              const state = groupState(group);
              return (
                <div
                  className="flex items-center gap-2 cursor-pointer select-none"
                  onClick={() => toggleGroup(group)}
                >
                  <Checkbox
                    checked={state}
                    onCheckedChange={v => toggleGroup(group, v === true)}
                    onClick={e => e.stopPropagation()}
                  />
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {label}
                    {optional && <span className="normal-case font-normal tracking-normal text-slate-400 ml-1">(optional)</span>}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-400 font-normal normal-case tracking-normal">
                    {group.filter(r => inviteChecked[r.key]).length}/{group.length} selected
                  </span>
                </div>
              );
            };

            const RecipientRow = ({ r }: { r: typeof all[0] }) => (
              <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-slate-50 ml-4">
                <Checkbox
                  id={r.key}
                  checked={!!inviteChecked[r.key]}
                  onCheckedChange={v => setInviteChecked(prev => ({ ...prev, [r.key]: !!v }))}
                />
                <div className="flex-1 min-w-0">
                  <Label htmlFor={r.key} className="text-sm font-medium cursor-pointer">
                    {r.name ?? r.email}
                  </Label>
                  {r.name && <p className="text-xs text-slate-400 truncate">{r.email}</p>}
                </div>
              </div>
            );

            return (
              <div className="py-2 space-y-4">
                {all.length === 0 && (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No email addresses found on this case.
                  </p>
                )}

                {parents.length > 0 && (
                  <div className="space-y-1.5">
                    <GroupHeader label="Parents / Guardians" group={parents} />
                    {parents.map(r => <RecipientRow key={r.key} r={r} />)}
                  </div>
                )}

                {teachers.length > 0 && (
                  <div className="space-y-1.5">
                    <GroupHeader label="School" group={teachers} />
                    {teachers.map(r => <RecipientRow key={r.key} r={r} />)}
                  </div>
                )}

                {staff.length > 0 && (
                  <div className="space-y-1.5">
                    <GroupHeader label="ReMynd Team" group={staff} optional />
                    {staff.map(r => <RecipientRow key={r.key} r={r} />)}
                  </div>
                )}

                {/* Other — add any email manually */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Other</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="any.email@example.com"
                      value={extraInviteEmail}
                      onChange={e => setExtraInviteEmail(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddExtraEmail(); } }}
                      className="h-8 text-sm flex-1"
                    />
                    <Button size="sm" variant="outline" className="h-8 px-3 shrink-0" onClick={handleAddExtraEmail}>Add</Button>
                  </div>
                  {extraInviteEmails.map(email => (
                    <div key={email} className="flex items-center gap-3 p-2.5 rounded-lg border bg-slate-50 ml-4">
                      <div className="flex-1 text-sm text-slate-700 truncate">{email}</div>
                      <button
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        onClick={() => setExtraInviteEmails(prev => prev.filter(e => e !== email))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
          <div className="flex gap-3 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setSendInviteOpen(false)} disabled={sendingInvite}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSendInvite}
              disabled={sendingInvite || (buildInviteRecipients().every(r => !inviteChecked[r.key]) && extraInviteEmails.length === 0 && !extraInviteEmail.trim().includes("@"))}
            >
              {sendingInvite ? "Sending…" : "Send Invite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Assignment Modal */}
      <Dialog open={productModalOpen} onOpenChange={open => { if (!open) { setSelectedProductId(""); setProductRespondentSlots([]); } setProductModalOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-primary" />
              Assign by Product
            </DialogTitle>
            <DialogDescription>
              Select a product. Forms will be automatically routed to the correct respondent type.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {/* Product selector */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Product</p>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={selectedProductId}
                onChange={e => handleProductChange(e.target.value)}
              >
                <option value="">— Select a product —</option>
                {ALL_PRODUCTS_BY_MARKET.map(group => (
                  <optgroup key={group.market} label={group.market}>
                    {group.items.map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Respondent slots — shown once a product is selected */}
            {selectedProductId && productRespondentSlots.length > 0 && (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Configure Respondents</p>
                  {productRespondentSlots.map(slot => {
                    const rtInfo = getProductRTInfo(selectedProductId, tools).find(r => r.rt === slot.respondentType);
                    const formCount = rtInfo?.formCount ?? 0;
                    return (
                      <div key={slot.respondentType} className={`rounded-lg border transition-colors ${slot.selected ? "border-primary/30 bg-primary/5" : "border-slate-100 bg-white"}`}>
                        <div
                          role="button"
                          tabIndex={0}
                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
                          onClick={() => setProductRespondentSlots(prev => prev.map(s => s.respondentType === slot.respondentType ? { ...s, selected: !s.selected } : s))}
                          onKeyDown={e => e.key === "Enter" && setProductRespondentSlots(prev => prev.map(s => s.respondentType === slot.respondentType ? { ...s, selected: !s.selected } : s))}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${slot.selected ? "bg-primary border-primary" : "border-slate-300 bg-white"}`}>
                            {slot.selected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </div>
                          <span className={`text-sm font-medium ${slot.selected ? "text-slate-900" : "text-slate-600"}`}>{slot.label}</span>
                          <span className="ml-auto text-[11px] text-slate-400">{formCount} form{formCount !== 1 ? "s" : ""}</span>
                        </div>
                        {slot.selected && slot.respondentType !== "self" && (
                          <div className="px-3 pb-3 grid grid-cols-2 gap-2" onClick={e => e.stopPropagation()}>
                            <div>
                              <label className="text-[11px] text-slate-500 block mb-1">Name <span className="text-slate-400">(optional)</span></label>
                              <Input
                                className="h-7 text-xs"
                                placeholder="e.g., Ms. Chen"
                                value={slot.name}
                                onChange={e => setProductRespondentSlots(prev => prev.map(s => s.respondentType === slot.respondentType ? { ...s, name: e.target.value } : s))}
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-slate-500 block mb-1">Email <span className="text-slate-400">(optional)</span></label>
                              <Input
                                className="h-7 text-xs"
                                type="email"
                                placeholder="e.g., chen@school.edu"
                                value={slot.email}
                                onChange={e => setProductRespondentSlots(prev => prev.map(s => s.respondentType === slot.respondentType ? { ...s, email: e.target.value } : s))}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Summary */}
                {productRespondentSlots.some(s => s.selected) && (() => {
                  const selectedSlots = productRespondentSlots.filter(s => s.selected);
                  const rtDetails = getProductRTInfo(selectedProductId, tools);
                  const totalForms = selectedSlots.reduce((sum, slot) => {
                    const info = rtDetails.find(r => r.rt === slot.respondentType);
                    return sum + (info?.formCount ?? 0);
                  }, 0);
                  return (
                    <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 space-y-1">
                      <p className="text-[12px] font-semibold text-primary">
                        {totalForms} form{totalForms !== 1 ? "s" : ""} will be created
                        <span className="font-normal text-primary/70"> ({selectedSlots.length} respondent{selectedSlots.length !== 1 ? "s" : ""})</span>
                      </p>
                      {selectedSlots.map(slot => {
                        const info = rtDetails.find(r => r.rt === slot.respondentType);
                        if (!info) return null;
                        return (
                          <p key={slot.respondentType} className="text-[11px] text-primary/60">
                            • {slot.label}: {info.formCount} form{info.formCount !== 1 ? "s" : ""}
                          </p>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setProductModalOpen(false)} disabled={productAssigning}>Cancel</Button>
            <Button
              onClick={handleAssignProduct}
              disabled={productAssigning || !selectedProductId || !productRespondentSlots.some(s => s.selected)}
            >
              {productAssigning ? "Assigning..." : (() => {
                const selectedSlots = productRespondentSlots.filter(s => s.selected);
                if (!selectedSlots.length) return "Assign Forms";
                const rtDetails = getProductRTInfo(selectedProductId, tools);
                const totalForms = selectedSlots.reduce((sum, slot) => {
                  const info = rtDetails.find(r => r.rt === slot.respondentType);
                  return sum + (info?.formCount ?? 0);
                }, 0);
                return `Assign ${totalForms} Form${totalForms !== 1 ? "s" : ""}`;
              })()}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


      {/* Full-screen form modal */}
      <Dialog
        fullScreen
        open={!!formModalUrl}
        onOpenChange={open => {
          if (!open) {
            setFormModalUrl(null);
            queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
          }
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50 shrink-0">
          <span className="text-sm font-semibold text-slate-700">Assessment Form</span>
        </div>
        {formModalUrl && (
          <iframe
            key={formModalUrl}
            src={formModalUrl}
            className="flex-1 w-full border-0 min-h-0"
            style={{ height: '100%' }}
            allow="camera; microphone"
          />
        )}
      </Dialog>
      <GuidedTour steps={internalTourSteps} isActive={tourVisible} onDismiss={() => setTourVisible(false)} />
    </div>
  );
}
