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
  Circle, PackageCheck, Link2, X, FileEdit, Send, Users
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect, useRef, useMemo } from "react";
import { ASSESSMENT_PRODUCTS, ALL_PRODUCTS_BY_MARKET } from "@/lib/products";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { ReportAccessPanel } from "@/components/ReportAccessPanel";

const PHASES = [
  "intake", "forms", "assessment", "scoring", "report", "final_review", "debrief", "complete"
];
const PHASE_PROGRESS: Record<string, number> = {
  pre_commitment: 5, intake: 15, setup: 25, forms: 38,
  assessment: 52, scoring: 66, report: 79, final_review: 90, debrief: 95, complete: 100,
};
const PHASE_LABELS: Record<string, string> = {
  pre_commitment: "Intake",
  intake: "Intake",
  setup: "Forms",
  forms: "Forms",
  assessment: "Assessment",
  scoring: "Scoring",
  report: "Report",
  final_review: "Final Review",
  debrief: "Debrief",
  complete: "Complete",
};
// Map hidden internal phases to their nearest visible display phase
const PHASE_DISPLAY_MAP: Record<string, string> = {
  pre_commitment: "intake",
  setup: "forms",
};
function displayPhase(phase: string): string {
  return PHASE_DISPLAY_MAP[phase] ?? phase;
}

const LEAD_PHASES = new Set(["pre_commitment", "intake"]);
const INTAKE_TOOL_IDS = new Set(["REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING", "CONSENT", "INTAKE"]);
const EXTERNAL_RESPONDENT_TYPES = new Set(["parent", "teacher", "teacher1", "teacher2", "referring_teacher", "boarding_staff", "special_needs_teacher", "school_counselor"]);

const RESPONDENT_LABELS: Record<string, string> = {
  parent: "Parent",
  teacher1: "Teacher 1",
  teacher2: "Teacher 2",
  self: "Student Self-Report",
  school_counselor: "School Counselor",
  special_needs_teacher: "Special Needs Teacher",
  referring_teacher: "Referring Teacher",
  boarding_staff: "Boarding Staff",
  invigilator: "Invigilator",
};


const RESPONDENT_TYPES_IN_MODAL = [
  "parent", "teacher1", "teacher2", "boarding_staff", "referring_teacher", "self", "invigilator",
] as const;

const RESPONDENT_TYPE_LABELS: Record<string, string> = {
  parent:            "Parent",
  teacher:           "Teacher",
  teacher1:          "Teacher 1",
  teacher2:          "Teacher 2",
  referring_teacher: "Referring Teacher",
  boarding_staff:    "Boarding Staff",
  self:              "Self-Report (Guided)",
  invigilator:       "Invigilator",
};

function canAdvancePhase(role: string): boolean {
  return role === "admin";
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
  const advancePhaseMut = useAdvanceCasePhase();
  const analyzeIntakeMut = useAnalyzeIntake();
  const updateCaseMut = useUpdateCase();
  const { data: tools } = useListAssessmentTools();
  const { data: staffUsers } = useListUsers();
  const createAssignmentMut = useCreateAssignment();
  const deleteAssignmentMut = useDeleteAssignment();

  const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const stepBackMut = useMutation({
    mutationFn: async () => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/step-back`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Phase stepped back" });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setStepBackConfirmOpen(false);
    },
    onError: () => toast({ title: "Could not step back", variant: "destructive" }),
  });

  const dismissToolMut = useMutation({
    mutationFn: async (toolId: string) => {
      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/dismiss-recommended-tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId }),
        credentials: "include",
      });
      if (!r.ok) throw new Error("Failed to dismiss tool");
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
    },
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
  const [editFields, setEditFields] = useState({ studentName: "", school: "", grade: "", languagePreference: "", referralReason: "", parentName: "", parentEmail: "", parentPhone: "", caseStatus: "", workingDocUrl: "", assignedLeadId: "", assignedPsychId: "" });
  
  const [newAssignment, setNewAssignment] = useState({
    toolIds: [] as string[],
    respondentTypes: [] as string[],
    respondentLabel: "",
    assignedToName: "",
    assignedToEmail: ""
  });
  const [sendEmailTarget, setSendEmailTarget] = useState<{
    groupKey: string; label: string; name: string; email: string; link: string; formNames: string[]; respondentRole: string;
  } | null>(null);
  const [sendEmailForm, setSendEmailForm] = useState({ name: "", email: "" });
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [stepBackConfirmOpen, setStepBackConfirmOpen] = useState(false);
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
  const [assessmentDateDraft, setAssessmentDateDraft] = useState("");
  const [assessmentTz, setAssessmentTz] = useState("Asia/Singapore");
  const [savingAssessmentDate, setSavingAssessmentDate] = useState(false);

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

  // ── Product assignment state ─────────────────────────────────────────────────
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productAssigning, setProductAssigning] = useState(false);

  type ProductRespondentSlot = { respondentType: string; label: string; selected: boolean; name: string; email: string };
  const [productRespondentSlots, setProductRespondentSlots] = useState<ProductRespondentSlot[]>([]);

  const RT_ORDER = ["parent", "teacher", "teacher1", "teacher2", "referring_teacher", "boarding_staff", "self", "invigilator"];
  const DEFAULT_SELECTED_RTS = new Set(["parent", "teacher1", "self"]);

  function getProductRTInfo(productId: string, toolsList: typeof tools): Array<{ rt: string; formCount: number }> {
    const product = ASSESSMENT_PRODUCTS.find(p => p.id === productId);
    if (!product || !toolsList) return [];
    const rtMap = new Map<string, number>();
    for (const toolId of product.toolIds) {
      const tool = toolsList.find(t => t.id === toolId);
      if (!tool) continue;
      for (const rt of (tool.respondentTypes ?? [])) {
        rtMap.set(rt, (rtMap.get(rt) ?? 0) + 1);
      }
    }
    return RT_ORDER.filter(rt => rtMap.has(rt)).map(rt => ({ rt, formCount: rtMap.get(rt)! }));
  }

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    if (!productId) { setProductRespondentSlots([]); return; }
    const rtInfos = getProductRTInfo(productId, tools);
    setProductRespondentSlots(rtInfos.map(info => ({
      respondentType: info.rt,
      label: RESPONDENT_TYPE_LABELS[info.rt] ?? info.rt,
      selected: DEFAULT_SELECTED_RTS.has(info.rt),
      name: "",
      email: "",
    })));
  };

  const handleAssignProduct = async () => {
    const product = ASSESSMENT_PRODUCTS.find(p => p.id === selectedProductId);
    if (!product) return;
    const selectedSlots = productRespondentSlots.filter(s => s.selected);
    if (!selectedSlots.length) return;
    setProductAssigning(true);
    try {
      const selectedRTs = new Set(selectedSlots.map(s => s.respondentType));
      let totalCreated = 0;
      for (const toolId of product.toolIds) {
        const toolData = tools?.find(t => t.id === toolId);
        if (!toolData) continue;
        for (const rt of (toolData.respondentTypes ?? [])) {
          if (!selectedRTs.has(rt)) continue;
          const slot = selectedSlots.find(s => s.respondentType === rt)!;
          await createAssignmentMut.mutateAsync({
            caseId,
            data: {
              toolId,
              respondentType: rt as CreateAssignmentRequestRespondentType,
              respondentLabel: slot.name || (RESPONDENT_TYPE_LABELS[rt] ?? rt),
              assignedToName: slot.name || undefined,
              assignedToEmail: slot.email || undefined,
            }
          });
          totalCreated++;
        }
      }
      toast({ title: "Product assigned", description: `${totalCreated} form${totalCreated !== 1 ? "s" : ""} assigned across ${selectedSlots.length} respondent${selectedSlots.length !== 1 ? "s" : ""}.` });
      setProductModalOpen(false);
      setSelectedProductId("");
      setProductRespondentSlots([]);
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
    } catch {
      toast({ title: "Failed to assign product", variant: "destructive" });
    } finally {
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
    for (const a of c.assignments) {
      if (INTAKE_TOOL_IDS.has(a.toolId ?? "")) continue;
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

  const role = currentUser?.role ?? "psychometrician";
  const currentPhaseIndex = PHASES.indexOf(displayPhase(c.currentPhase));
  const canAdvance = !userLoading && canAdvancePhase(role) && c.currentPhase !== "complete";
  const hideAssignments = ['report', 'final_review', 'debrief', 'complete'].includes(c.currentPhase);
  const showAiCard = isPhaseVisible(role, "intake") && PHASES.indexOf(displayPhase(c.currentPhase)) > PHASES.indexOf("intake") && PHASES.indexOf(displayPhase(c.currentPhase)) <= PHASES.indexOf("scoring");
  const showMeetingCard = c.currentPhase === 'assessment' && role !== 'assessment_invigilator';
  const showInvigilatorPanel = role === 'assessment_invigilator' && c.currentPhase === 'assessment';
  const hasLeftContent = showAiCard || showMeetingCard;
  const prevPhaseName = currentPhaseIndex > 0
    ? (PHASE_LABELS[PHASES[currentPhaseIndex - 1]] ?? PHASES[currentPhaseIndex - 1])
    : null;

  const filteredTools = tools?.filter(t => {
    if (role === "admin") return true;
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
    const extras = extraInviteEmails.map(email => ({ email, name: null, type: "teacher" as const }));
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
    analyzeIntakeMut.mutate({ caseId }, {
      onSuccess: () => {
        toast({ title: "Intake Analysis Complete", description: "AI has processed the intake data." });
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      }
    });
  };

  const handleAssignTool = async (rec: { toolId: string; name: string }) => {
    const toolData = (tools ?? []).find(t => t.id === rec.toolId);
    const respondentTypes = toolData?.respondentTypes ?? [];
    if (respondentTypes.length === 0) {
      toast({ title: "No respondent types", description: "This tool has no respondent types configured.", variant: "destructive" });
      return;
    }
    setAssigningToolId(rec.toolId);
    try {
      let count = 0;
      for (const rt of respondentTypes) {
        await createAssignmentMut.mutateAsync({
          caseId,
          data: {
            toolId: rec.toolId,
            respondentType: rt as CreateAssignmentRequestRespondentType,
            respondentLabel: RESPONDENT_LABELS[rt] ?? rt,
          },
        });
        count++;
      }
      toast({ title: `${rec.name} assigned`, description: `Added ${count} assignment${count !== 1 ? "s" : ""} (${respondentTypes.map(rt => RESPONDENT_LABELS[rt] ?? rt).join(", ")}).` });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}/assignments`] });
    } catch {
      toast({ title: "Error assigning tool", variant: "destructive" });
    } finally {
      setAssigningToolId(null);
    }
  };

  const handleOpenEdit = () => {
    setEditFields({
      studentName: c.studentName ?? "",
      school: c.school ?? "",
      grade: c.grade ?? "",
      languagePreference: c.languagePreference ?? "english",
      referralReason: c.referralReason ?? "",
      parentName: c.parentName ?? "",
      parentEmail: c.parentEmail ?? "",
      parentPhone: c.parentPhone ?? "",
      caseStatus: c.caseStatus ?? "active",
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
      assignedLeadId: editFields.assignedLeadId || null,
      assignedPsychId: editFields.assignedPsychId || null,
    };
    updateCaseMut.mutate({ caseId, data }, {
      onSuccess: () => {
        toast({ title: "Case updated" });
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
    setIsSubmittingAssignments(true);
    try {
      let count = 0;
      for (const respondentType of newAssignment.respondentTypes) {
        for (const toolId of newAssignment.toolIds) {
          await createAssignmentMut.mutateAsync({
            caseId,
            data: {
              toolId,
              respondentType: respondentType as CreateAssignmentRequestRespondentType,
              respondentLabel: newAssignment.respondentLabel,
              assignedToName: newAssignment.assignedToName,
              assignedToEmail: newAssignment.assignedToEmail,
            }
          });
          count++;
        }
      }
      toast({ title: count === 1 ? "Assignment added" : `${count} assignments added` });
      setAddAssignmentModalOpen(false);
      setNewAssignment({ toolIds: [], respondentTypes: [], respondentLabel: "", assignedToName: "", assignedToEmail: "" });
      queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
    } catch {
      toast({ title: "Cannot add assignment", description: "Your role may not allow deploying one of the selected form types.", variant: "destructive" });
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
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold font-display text-slate-900">{c.studentName}</h1>
              <Badge variant={c.caseStatus === 'active' ? 'success' : 'secondary'} className="capitalize">{c.caseStatus}</Badge>
            </div>
            <p className="text-slate-500 text-sm">ID: {c.id} • Created {formatDate(c.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {c.currentPhase === 'scoring' && (
            <Link href={`/cases/${c.id}/scoring`}>
              <Button variant="outline" className="bg-white"><FileBarChart size={18} className="mr-2"/> View Scores</Button>
            </Link>
          )}
          {role === "admin" && (
            <>
              <Button variant="outline" className="bg-white gap-2" onClick={handleOpenEdit}>
                <Edit size={16} /> Edit
              </Button>
              <Button variant="outline" className="bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 gap-2" onClick={() => setDeleteCaseOpen(true)}>
                <Trash2 size={16} /> Delete
              </Button>
            </>
          )}
          {role === "admin" && c.currentPhase !== "pre_commitment" && c.currentPhase !== "intake" && (
            <Button
              variant="outline"
              className="bg-white gap-1.5"
              onClick={() => setStepBackConfirmOpen(true)}
              disabled={stepBackMut.isPending}
            >
              <ChevronLeft size={16} /> Step Back
            </Button>
          )}
          <Button 
            onClick={handleAdvancePhase} 
            disabled={advancePhaseMut.isPending || !canAdvance}
            title={!canAdvance && c.currentPhase !== "debrief" ? "Your role cannot advance the current phase" : undefined}
            className="shadow-lg shadow-primary/20"
          >
            {advancePhaseMut.isPending ? "Advancing..." : "Advance Phase"} <ChevronRight size={18} className="ml-1"/>
          </Button>
        </div>
      </div>

      {/* Phase Stepper */}
      <Card className="border-none shadow-md overflow-hidden bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 rounded-full" />
            <div 
              className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 rounded-full transition-all duration-700" 
              style={{ width: `${(currentPhaseIndex / (PHASES.length - 1)) * 100}%` }} 
            />
            
            <div className="relative flex justify-between">
              {PHASES.map((phase, idx) => {
                const isPast = idx < currentPhaseIndex;
                const isActive = idx === currentPhaseIndex;
                const visible = isPhaseVisible(role, phase);
                return (
                  <div key={phase} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors duration-500 ${
                      !visible ? 'bg-slate-600 text-slate-500' :
                      isActive ? 'bg-primary ring-4 ring-primary/30 text-white' : 
                      isPast ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {!visible ? <Lock size={12} /> :
                       isPast ? <CheckCircle2 size={16} /> : 
                       <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-[10px] uppercase font-bold mt-2 tracking-wider absolute top-10 whitespace-nowrap text-center ${
                      !visible ? 'text-slate-600' :
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}>
                      {PHASE_LABELS[phase] ?? phase.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-12 flex justify-between items-end">
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
      {(role === 'admin' || role === 'psychometrician') && (
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
                      {role === "admin" && (
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
                            {psychApproved ? "Approved" : role === "admin" ? "Pending — Abegail hasn't signed off yet" : "Pending approval"}
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
                        {role === "admin" && (
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
                        {role === "admin" && (
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
      {c.currentPhase === 'final_review' && role === 'admin' && (
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
      {role === "admin" && ['scoring', 'report', 'final_review', 'debrief'].includes(c.currentPhase) && (
        <ReportAccessPanel
          caseId={c.id}
          studentName={c.studentName ?? undefined}
          parentEmail={c.parentEmail ?? undefined}
          currentPhase={c.currentPhase}
          workingDocUrl={c.workingDocUrl ?? undefined}
          debriefMeetingUrl={c.debriefMeetingUrl ?? undefined}
          debriefMeetingDate={c.debriefMeetingDate ?? undefined}
          onPhaseAdvanced={() => {
            queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
          }}
          onCaseUpdated={() => {
            queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
          }}
        />
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
          <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
            <CardHeader className="pb-3 border-b border-emerald-100/60">
              <CardTitle className="text-base flex items-center gap-2 text-emerald-900">
                <Video size={16} className="text-emerald-600" />
                Invigilation Meeting Room
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
        );
      })()}

      <div className="space-y-6">

        {/* ── Step 1: Pre-Assessment Intake Forms ─── */}
        {!hideAssignments && (() => {
          const intakeAssignments = (c.assignments ?? []).filter(a => INTAKE_TOOL_IDS.has(a.toolId ?? ""));
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
                {(role === "admin" || role === "psychometrician") && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm">Add Form</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {INTAKE_FORM_OPTIONS.map(opt => {
                        const alreadyAdded = intakeAssignments.some(a => a.toolId === opt.toolId);
                        return (
                          <DropdownMenuItem
                            key={opt.toolId}
                            disabled={alreadyAdded || assigningToolId === opt.toolId}
                            onClick={async () => {
                              setAssigningToolId(opt.toolId);
                              try {
                                await createAssignmentMut.mutateAsync({
                                  caseId,
                                  data: {
                                    toolId: opt.toolId,
                                    respondentType: opt.respondentType as CreateAssignmentRequestRespondentType,
                                    respondentLabel: opt.respondentLabel,
                                  },
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
                    {(role === "admin" || role === "psychometrician") && (
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
                            {c.referralInvite?.formId === a.toolId && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
                                <Link2 size={10} /> Via inquiry portal
                              </span>
                            )}
                          </div>
                          <div className="flex items-center text-sm text-slate-500 gap-4 flex-wrap">
                            <span className="font-medium text-slate-700">{RESPONDENT_TYPE_LABELS[a.respondentType] ?? a.respondentType}{a.respondentLabel ? `: ${a.respondentLabel}` : ""}</span>
                            {c.referralInvite?.formId === a.toolId
                              ? <span>From: {c.referralInvite.toName}{c.referralInvite.schoolName ? ` · ${c.referralInvite.schoolName}` : ""}</span>
                              : <span>Assigned to: {a.assignedToName || 'Unspecified'}</span>
                            }
                            {a.assignedToEmail && <span className="text-slate-400">{a.assignedToEmail}</span>}
                            {c.referralInvite?.formId === a.toolId && c.referralInvite.toEmail && (
                              <span className="text-slate-400">{c.referralInvite.toEmail}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {a.status === 'completed' ? (
                            <Link href={`/cases/${caseId}/response/${a.id}`}>
                              <Button size="sm" variant="outline" className="bg-white gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300">
                                <Eye size={14} /> View Response
                              </Button>
                            </Link>
                          ) : (
                            <>
                              <Button variant="outline" size="sm" className="bg-white" title="Show QR Code" onClick={() => { setActiveQr(a.uniqueLink); setQrModalOpen(true); }}><QrCode size={16} /></Button>
                              <Button variant="outline" size="sm" className="bg-white" title="Copy Link" onClick={() => copyLink(a.uniqueLink)}><Copy size={16} /></Button>
                              <Button variant="outline" size="sm" className="bg-white" title="Open Form" onClick={() => setFormModalUrl(`${BASE_URL}/external/${a.uniqueToken}`)}><ExternalLink size={16} /></Button>
                            </>
                          )}
                          {(role === "admin" || role === "psychometrician") && (
                            <Button variant="outline" size="sm" className="bg-white text-red-500 hover:text-red-700 hover:border-red-300" title="Remove" onClick={() => setDeleteAssignmentTarget({ id: a.id, name: a.toolName })}>
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {intakeRespondentGroups.length > 0 && (role === "admin" || role === "psychometrician") && (
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
                              <Button size="sm" className="gap-1.5" onClick={() => { setSendEmailTarget({ groupKey: group.groupKey, label: group.label, name: group.name ?? "", email: group.email ?? "", link: group.link, formNames: group.forms.map(f => f.name), respondentRole: group.label }); setSendEmailForm({ name: group.name ?? "", email: group.email ?? "" }); }}>
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

        {showAiCard && (() => {
          const allAssignments2 = c.assignments ?? [];
          const INTAKE_TOOL_IDS = [["REFERRAL","REFERRAL-CORP","REFERRAL-UNI","REFERRAL-PARENT","REFERRAL-BOARDING"],["INTAKE"]];
          const intakeFormsComplete = INTAKE_TOOL_IDS.every(ids => allAssignments2.some(a => ids.includes(a.toolId ?? "") && a.status === "completed"));
          return (
            <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg flex items-center text-blue-900 gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-200 text-blue-800 text-xs font-bold shrink-0">2</span>
                    <img src="/images/remynd-logo.png" alt="ReMynd" className="w-5 h-5 object-contain" />
                    AI Intake Analysis
                  </CardTitle>
                  {!intakeFormsComplete && !c.intakeAnalysis && (
                    <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full shrink-0">Complete Step 1 first</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {c.intakeAnalysis ? (
                  <div className="space-y-5">
                    {/* Summary */}
                    <div className="text-sm text-slate-700 bg-white/70 p-3 rounded-lg border border-blue-100">
                      {c.intakeAnalysis.summary}
                    </div>

                    {/* Risk + Domains row */}
                    <div className="flex flex-wrap items-start gap-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Risk Level</span>
                        {c.intakeAnalysis.riskLevel === 'high' ? <Badge variant="destructive">High</Badge> :
                         c.intakeAnalysis.riskLevel === 'moderate' ? <Badge variant="warning">Moderate</Badge> :
                         <Badge variant="success">Low</Badge>}
                      </div>
                      {Array.isArray(c.intakeAnalysis.recommendedDomains) && c.intakeAnalysis.recommendedDomains.length > 0 && (
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Key Domains</span>
                          <div className="flex flex-wrap gap-1">
                            {(c.intakeAnalysis.recommendedDomains as string[]).map((d: string) => (
                              <Badge key={d} variant="outline" className="bg-white text-xs">{d.replace(/_/g, ' ')}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Flags */}
                    {Array.isArray(c.intakeAnalysis.flags) && (c.intakeAnalysis.flags as string[]).length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Clinical Flags</span>
                        <ul className="space-y-1">
                          {(c.intakeAnalysis.flags as string[]).map((f: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                              <span className="mt-0.5 shrink-0">⚠</span><span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommended Tools */}
                    {Array.isArray(c.intakeAnalysis.recommendedTools) && (c.intakeAnalysis.recommendedTools as any[]).length > 0 && (() => {
                      const dismissedIds = new Set<string>(
                        Array.isArray((c.intakeAnalysis as any).dismissedToolIds)
                          ? (c.intakeAnalysis as any).dismissedToolIds
                          : []
                      );
                      const visibleTools = (c.intakeAnalysis.recommendedTools as any[]).filter((t: any) => !dismissedIds.has(t.toolId));
                      if (visibleTools.length === 0) return null;
                      return (
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Recommended Assessment Tools</span>
                          <div className="space-y-2">
                            {visibleTools.map((t: any) => {
                              const alreadyAssigned = (c.assignments ?? []).some((a: any) => a.toolId === t.toolId);
                              const isAssigning = assigningToolId === t.toolId;
                              const toolData = (tools ?? []).find(tool => tool.id === t.toolId);
                              const respondentTypes = toolData?.respondentTypes ?? [];
                              return (
                                <div key={t.toolId} className={`bg-white rounded-lg border p-3 transition-colors ${alreadyAssigned ? 'border-emerald-200 bg-emerald-50/30' : 'border-blue-100'}`}>
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-800">{t.name}</span>
                                        <Badge className={`text-xs shrink-0 ${t.priority === 'essential' ? 'bg-red-100 text-red-700 border-red-200' : t.priority === 'recommended' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`} variant="outline">
                                          {t.priority}
                                        </Badge>
                                        {alreadyAssigned && (
                                          <span className="text-xs text-emerald-600 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium">Assigned</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-500 mt-1">{t.rationale}</p>
                                      {respondentTypes.length > 0 && (
                                        <p className="text-[10px] text-slate-400 mt-1">Respondents: {respondentTypes.map((rt: string) => RESPONDENT_LABELS[rt] ?? rt).join(", ")}</p>
                                      )}
                                    </div>
                                  </div>
                                  {(role === "admin" || role === "psychometrician") && (
                                    <div className="flex gap-2 mt-2 pt-2 border-t border-blue-50">
                                      <Button
                                        size="sm"
                                        className={`h-7 text-xs gap-1.5 flex-1 ${alreadyAssigned ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                        disabled={isAssigning || alreadyAssigned}
                                        onClick={() => handleAssignTool({ toolId: t.toolId, name: t.name })}
                                      >
                                        {isAssigning ? "Assigning…" : alreadyAssigned ? "✓ Assigned" : "Assign"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs text-slate-500 hover:text-red-600 hover:border-red-200"
                                        disabled={dismissToolMut.isPending && dismissToolMut.variables === t.toolId}
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

                    {role === "admin" && (
                      <Button size="sm" variant="outline" onClick={handleAnalyzeIntake} disabled={analyzeIntakeMut.isPending} className="w-full text-blue-700 border-blue-200 hover:bg-blue-50">
                        {analyzeIntakeMut.isPending ? "Re-analyzing..." : "Re-run Analysis"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    {role === "admin" ? (
                      <>
                        <p className="text-sm text-slate-500 mb-4">No AI analysis run yet for this case.</p>
                        <Button onClick={handleAnalyzeIntake} disabled={analyzeIntakeMut.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                          {analyzeIntakeMut.isPending ? "Analyzing..." : "Run AI Intake Analysis"}
                        </Button>
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
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">

                  {role !== "admin" ? (
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
                  {role === "admin" && (
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
          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row justify-between items-center border-b bg-slate-50/50 pb-4">
              <CardTitle className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold shrink-0">3</span>
                Build Assessment Battery
              </CardTitle>
              <div className="flex gap-2">
                {hasCdpBattery && (
                  <Link href={`/cases/${caseId}/cdp`}>
                    <Button size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 gap-1.5">
                      <span className="text-[11px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">CDP</span>
                      View Profile
                    </Button>
                  </Link>
                )}
                {(role === "admin" || role === "psychometrician") && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setProductModalOpen(true)} className="gap-1.5">
                      <LayoutGrid size={13} /> Assign by Product
                    </Button>
                    <Button size="sm" onClick={() => setAddAssignmentModalOpen(true)}>Add Assignment</Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                        invigilator: 9,
                      };
                      const aOrder = ORDER[a.respondentType] ?? 5;
                      const bOrder = ORDER[b.respondentType] ?? 5;
                      return aOrder - bOrder;
                    })
                    .reduce<{ type: string; label: string; items: NonNullable<typeof c.assignments> }[]>((groups, a) => {
                      const last = groups[groups.length - 1];
                      if (last && last.type === a.respondentType) {
                        last.items.push(a);
                      } else {
                        groups.push({ type: a.respondentType, label: RESPONDENT_TYPE_LABELS[a.respondentType] ?? a.respondentType, items: [a] });
                      }
                      return groups;
                    }, [])
                    .flatMap((group, gi) => [
                      <div key={`grp-${gi}`} className="px-4 py-2 bg-slate-50/80 border-b border-t flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{group.label}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{group.items.length} form{group.items.length !== 1 ? "s" : ""}</span>
                      </div>,
                      ...group.items.map(a => (
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
                          {a.respondentType === "invigilator" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200 uppercase tracking-wide">
                              Post-Assessment
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-slate-500 gap-4 flex-wrap">
                          <span className="font-medium text-slate-700">{RESPONDENT_TYPE_LABELS[a.respondentType] ?? a.respondentType}{a.respondentLabel ? `: ${a.respondentLabel}` : ""}</span>
                          <span>Assigned to: {a.assignedToName || 'Unspecified'}</span>
                          {a.assignedToEmail && (
                            <span className="text-slate-400">{a.assignedToEmail}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        {a.status === 'completed' ? (
                          <Link href={`/cases/${caseId}/response/${a.id}`}>
                            <Button size="sm" variant="outline" className="bg-white gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300">
                              <Eye size={14} /> View Response
                            </Button>
                          </Link>
                        ) : (
                          <>
                            <Button variant="outline" size="sm" onClick={() => { setActiveQr(a.uniqueLink); setQrModalOpen(true); }} className="bg-white" title="Show QR Code">
                              <QrCode size={16} />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => copyLink(a.uniqueLink)} className="bg-white" title="Copy Link">
                              <Copy size={16} />
                            </Button>
                            <Button variant="outline" size="sm" className="bg-white" title="Open Form" onClick={() => setFormModalUrl(`${BASE_URL}/external/${a.uniqueToken}`)}>
                              <ExternalLink size={16} />
                            </Button>
                          </>
                        )}
                        {a.respondentType === 'self' && a.status !== 'completed' && (
                          <Link href={`/cases/${caseId}/self-report`}>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                              <Play size={14} className="mr-1" /> Launch Guided
                            </Button>
                          </Link>
                        )}
                        {(role === "admin" || role === "psychometrician") && (
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
                  ))
                    ])}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Respondent Dispatch Panel ── below assignments so battery is finalized first ── */}
      {(role === "admin" || role === "psychometrician") && !hideAssignments && (
        <Card className="border-none shadow-md">
          <div className="px-6 py-4 flex items-center gap-2 border-b bg-slate-50/50">
            <Users size={17} className="text-primary" />
            <h3 className="font-semibold text-slate-800">Send Forms to Respondents</h3>
            {respondentGroups.length > 0 && (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{respondentGroups.length} respondent{respondentGroups.length !== 1 ? "s" : ""}</span>
            )}
          </div>
          <CardContent className="p-0">
            {respondentGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-6 text-center gap-2">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <Users size={22} className="text-slate-400" />
                </div>
                <p className="font-medium text-slate-700">No external respondents assigned yet</p>
                <p className="text-sm text-slate-500">Add a parent, teacher, or other external respondent in the <span className="font-medium text-slate-700">Build Assessment Battery</span> section above — they'll appear here once assigned.</p>
              </div>
            ) : (
              <div className="divide-y">
                {respondentGroups.map(group => {
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
                        <Button variant="outline" size="sm" className="bg-white" title="Show QR Code"
                          onClick={() => { setActiveQr(group.link); setQrModalOpen(true); }}>
                          <QrCode size={15} />
                        </Button>
                        <Button variant="outline" size="sm" className="bg-white" title="Copy link"
                          onClick={() => copyLink(group.link)}>
                          <Copy size={15} />
                        </Button>
                        <Button size="sm" className="gap-1.5" title="Send link by email"
                          onClick={() => {
                            setSendEmailTarget({
                              groupKey: group.groupKey,
                              label: group.label,
                              name: group.name ?? "",
                              email: group.email ?? "",
                              link: group.link,
                              formNames: group.forms.map(f => f.name),
                              respondentRole: group.label,
                            });
                            setSendEmailForm({ name: group.name ?? "", email: group.email ?? "" });
                          }}>
                          <Send size={14} /> Send Email
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      {/* Modals */}
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
      <Dialog open={!!sendEmailTarget} onOpenChange={open => { if (!open) { setSendEmailTarget(null); setIsSendingEmail(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Forms to {sendEmailTarget?.label}</DialogTitle>
            <DialogDescription>
              An email will be sent with a link to all their assigned forms for this case.
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
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setSendEmailTarget(null); setIsSendingEmail(false); }}>
                  Cancel
                </Button>
                <Button className="flex-1 gap-2" disabled={isSendingEmail || !sendEmailForm.name.trim() || !sendEmailForm.email.trim()}
                  onClick={async () => {
                    if (!sendEmailTarget) return;
                    setIsSendingEmail(true);
                    try {
                      const r = await fetch(`${BASE_URL}/api/cases/${caseId}/send-respondent-email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                          toEmail: sendEmailForm.email.trim(),
                          toName: sendEmailForm.name.trim(),
                          formLink: sendEmailTarget.link,
                          formNames: sendEmailTarget.formNames,
                          studentName: c.studentName,
                          respondentRole: sendEmailTarget.respondentRole,
                        }),
                      });
                      if (!r.ok) throw new Error(await r.text());
                      toast({ title: "Email sent", description: `Forms link sent to ${sendEmailForm.email}` });
                      setSendEmailTarget(null);
                    } catch {
                      toast({ title: "Could not send email", description: "Please try again or copy the link manually.", variant: "destructive" });
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

      <Dialog open={addAssignmentModalOpen} onOpenChange={setAddAssignmentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Assignment</DialogTitle>
            {role === "psychometrician" && (
              <DialogDescription>As a psychometrician, you can deploy assessment instruments (not intake forms).</DialogDescription>
            )}
          </DialogHeader>
          <form onSubmit={handleAddAssignment} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Respondent Type <span className="text-slate-400 font-normal">(select all that apply)</span></label>
              <div className="border border-input rounded-md divide-y">
                {RESPONDENT_TYPES_IN_MODAL.map(rt => {
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
                          setNewAssignment({ ...newAssignment, respondentTypes: types, toolIds: [] });
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
                newAssignment.respondentTypes.some(rt => (t.respondentTypes ?? []).includes(rt))
              ) ?? [];
              const availableTools = showAllTools ? (filteredTools ?? []) : matchedTools;
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Assessment Forms <span className="text-slate-400 font-normal">(select all that apply)</span></label>
                    <button
                      type="button"
                      className="text-xs text-primary underline underline-offset-2 hover:opacity-70"
                      onClick={() => setShowAllTools(v => !v)}
                    >
                      {showAllTools ? "Show matched only" : "Show all tools"}
                    </button>
                  </div>
                  <div className="border border-input rounded-md divide-y max-h-48 overflow-y-auto">
                    {availableTools.length === 0 && (
                      <p className="px-3 py-3 text-sm text-slate-400">No forms available for the selected respondent type(s).</p>
                    )}
                    {availableTools.map(t => {
                      const checked = newAssignment.toolIds.includes(t.id);
                      return (
                        <label key={t.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors ${checked ? "bg-primary/5" : ""}`}>
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
                          <span className="text-sm text-slate-800">{t.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  {newAssignment.toolIds.length > 0 && (
                    <p className="text-xs text-primary font-medium">{newAssignment.toolIds.length} form{newAssignment.toolIds.length > 1 ? "s" : ""} selected</p>
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
                <label className="text-sm font-medium">Grade</label>
                <Input value={editFields.grade} onChange={e => setEditFields(f => ({ ...f, grade: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Language</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editFields.languagePreference} onChange={e => setEditFields(f => ({ ...f, languagePreference: e.target.value }))}>
                  <option value="english">English</option>
                  <option value="mandarin">Mandarin</option>
                  <option value="korean">Korean</option>
                </select>
              </div>
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
            <DialogTitle>Step Back to Previous Phase?</DialogTitle>
            <DialogDescription>
              This will move <span className="font-semibold text-slate-900">{c.studentName}</span>'s case back to the{" "}
              {prevPhaseName && <span className="font-semibold text-slate-900">{prevPhaseName}</span>} phase. You can advance again at any time.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setStepBackConfirmOpen(false)} disabled={stepBackMut.isPending}>Cancel</Button>
            <Button variant="default" className="flex-1 bg-amber-600 hover:bg-amber-700" onClick={() => stepBackMut.mutate()} disabled={stepBackMut.isPending}>
              {stepBackMut.isPending ? "Stepping back..." : "Step Back"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteCaseOpen} onOpenChange={open => { if (!open) setDeleteCaseOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Case?</DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-semibold text-slate-900">{c.studentName}</span>'s case along with all assignments and scores. This cannot be undone.
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
              disabled={sendingInvite || (buildInviteRecipients().every(r => !inviteChecked[r.key]) && extraInviteEmails.length === 0)}
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
    </div>
  );
}
