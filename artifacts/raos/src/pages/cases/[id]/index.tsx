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
  type CreateAssignmentRequestRespondentType 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { 
  ArrowLeft, CheckCircle2, ChevronRight, 
  Copy, ExternalLink, QrCode, FileBarChart, Edit, Play, Trash2, Lock, ShieldAlert, Eye,
  Send, Mail, Link2, LayoutGrid
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { ASSESSMENT_PRODUCTS, ALL_PRODUCTS_BY_MARKET } from "@/lib/products";
import { useQueryClient } from "@tanstack/react-query";

const PHASES = [
  "intake", "forms", "assessment", "scoring", "report", "debrief", "complete"
];
const PHASE_LABELS: Record<string, string> = {
  pre_commitment: "Intake",
  intake: "Intake",
  setup: "Forms",
  forms: "Forms",
  assessment: "Assessment",
  scoring: "Scoring",
  report: "Report",
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
const PSYCH_PHASES = new Set(["setup", "forms", "assessment", "scoring", "report", "debrief"]);
const INTAKE_TOOL_IDS = new Set(["REFERRAL", "REFERRAL-CORP", "REFERRAL-UNI", "REFERRAL-PARENT", "REFERRAL-BOARDING", "CONSENT", "INTAKE"]);


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

function canAdvancePhase(role: string, currentPhase: string): boolean {
  if (role === "admin") return true;
  if (role === "assessment_invigilator") return false;
  if (role === "psychometrician") return PSYCH_PHASES.has(currentPhase);
  return false;
}

function isPhaseVisible(_role: string, _phase: string): boolean {
  return true;
}

export default function CaseDetail() {
  const params = useParams();
  const caseId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [, setLocation] = useLocation();
  const { data: currentUser } = useGetCurrentUser();
  const { data: c, isLoading, isError, error } = useGetCase(caseId);
  const advancePhaseMut = useAdvanceCasePhase();
  const analyzeIntakeMut = useAnalyzeIntake();
  const updateCaseMut = useUpdateCase();
  const { data: tools } = useListAssessmentTools();
  const createAssignmentMut = useCreateAssignment();
  const deleteAssignmentMut = useDeleteAssignment();

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeQr, setActiveQr] = useState<string>("");
  const [addAssignmentModalOpen, setAddAssignmentModalOpen] = useState(false);
  const [isSubmittingAssignments, setIsSubmittingAssignments] = useState(false);
  const [deleteAssignmentTarget, setDeleteAssignmentTarget] = useState<{ id: string; name: string } | null>(null);
  const [editCaseOpen, setEditCaseOpen] = useState(false);
  const [deleteCaseOpen, setDeleteCaseOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editFields, setEditFields] = useState({ studentName: "", school: "", grade: "", languagePreference: "", referralReason: "", parentName: "", parentEmail: "", parentPhone: "", caseStatus: "" });
  
  const [newAssignment, setNewAssignment] = useState({
    toolIds: [] as string[],
    respondentTypes: [] as string[],
    respondentLabel: "",
    assignedToName: "",
    assignedToEmail: ""
  });
  const [distributeFormsOpen, setDistributeFormsOpen] = useState(false);
  const [showAllTools, setShowAllTools] = useState(false);
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
  const canAdvance = canAdvancePhase(role, c.currentPhase) && c.currentPhase !== "complete";

  const filteredTools = tools?.filter(t => {
    if (role === "admin") return true;
    if (role === "assessment_invigilator") return true;
    if (role === "psychometrician") return !INTAKE_TOOL_IDS.has(t.id);
    return true;
  });

  type AssignmentItem = NonNullable<typeof c.assignments>[number];
  type RespondentGroup = {
    key: string;
    assignedToName: string | null | undefined;
    assignedToEmail: string | null | undefined;
    respondentLabel: string;
    assignments: AssignmentItem[];
  };
  const respondentGroups: RespondentGroup[] = (() => {
    if (!c.assignments?.length) return [];
    const map = new Map<string, RespondentGroup>();
    for (const a of c.assignments) {
      const key = a.assignedToEmail ?? `${a.respondentType}::${a.respondentLabel}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          assignedToName: a.assignedToName,
          assignedToEmail: a.assignedToEmail,
          respondentLabel: a.respondentLabel,
          assignments: [],
        });
      }
      map.get(key)!.assignments.push(a);
    }
    return Array.from(map.values()).filter(g => g.assignments.some(a => a.status !== "completed"));
  })();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${label} copied to clipboard` });
    }).catch(() => {
      toast({ title: "Copy failed", description: "Please copy the text manually.", variant: "destructive" });
    });
  };

  const buildEmailTemplate = (group: RespondentGroup): string => {
    const name = group.assignedToName || group.respondentLabel;
    const pending = group.assignments.filter(a => a.status !== "completed");
    const formLines = pending.map((a, i) => `${i + 1}. ${a.toolName}\n   ${a.uniqueLink}`).join("\n\n");
    return [
      `Subject: Assessment Forms for ${c.studentName}`,
      "",
      `Dear ${name},`,
      "",
      `We hope this message finds you well. As part of the psychoeducational assessment for ${c.studentName}, we kindly ask you to complete the following form(s) at your earliest convenience:`,
      "",
      formLines,
      "",
      "Each form can be completed online using the link provided above. If you have any questions, please do not hesitate to reach out.",
      "",
      "Thank you for your time and support.",
      "",
      "ReMynd Assessment Team",
    ].join("\n");
  };

  const buildLinksText = (group: RespondentGroup): string => {
    return group.assignments
      .filter(a => a.status !== "completed")
      .map(a => `${a.toolName}: ${a.uniqueLink}`)
      .join("\n");
  };

  const handleAdvancePhase = () => {
    advancePhaseMut.mutate({ caseId }, {
      onSuccess: () => {
        toast({ title: "Phase advanced" });
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      },
      onError: () => toast({ title: "Cannot advance this phase", description: "Your role does not allow advancing the current phase.", variant: "destructive" })
    });
  };

  const handleAnalyzeIntake = () => {
    analyzeIntakeMut.mutate({ caseId }, {
      onSuccess: () => {
        toast({ title: "Intake Analysis Complete", description: "AI has processed the intake data." });
        queryClient.invalidateQueries({ queryKey: [`/api/cases/${caseId}`] });
      }
    });
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
    });
    setEditCaseOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCaseMut.mutate({ caseId, data: editFields }, {
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
          {['report', 'debrief', 'complete'].includes(c.currentPhase) && (
            <Link href={`/cases/${c.id}/report`}>
              <Button variant="outline" className="bg-white"><Edit size={18} className="mr-2"/> View Report</Button>
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
          <Button 
            onClick={handleAdvancePhase} 
            disabled={advancePhaseMut.isPending || !canAdvance}
            title={!canAdvance && c.currentPhase !== "complete" ? "Your role cannot advance the current phase" : undefined}
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
              <p className="text-2xl font-bold text-primary-foreground">{c.progressPercentage}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Info & AI */}
        <div className="space-y-6 col-span-1">
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3 border-b bg-slate-50/50">
              <CardTitle className="text-lg">Student Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3 text-sm">
              <div className="flex justify-between border-b pb-2"><span className="text-slate-500">DOB</span><span className="font-medium">{formatDate(c.dob)}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-slate-500">School</span><span className="font-medium">{c.school} (Grade {c.grade || 'N/A'})</span></div>
              <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Language</span><span className="font-medium capitalize">{c.languagePreference}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Parent</span><span className="font-medium">{c.parentName || 'N/A'}</span></div>
            </CardContent>
          </Card>

          {isPhaseVisible(role, "intake") && PHASES.indexOf(displayPhase(c.currentPhase)) > PHASES.indexOf("intake") && (
            <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center text-blue-900">
                  <img src="/images/remynd-logo.png" alt="ReMynd" className="w-5 h-5 object-contain mr-2" />
                  AI Intake Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {c.intakeAnalysis ? (
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Risk</span>
                      <div className="mt-1">
                        {c.intakeAnalysis.riskLevel === 'high' ? <Badge variant="destructive" className="px-3 py-1">High Risk</Badge> : 
                         c.intakeAnalysis.riskLevel === 'moderate' ? <Badge variant="warning" className="px-3 py-1">Moderate Risk</Badge> : 
                         <Badge variant="success" className="px-3 py-1">Low Risk</Badge>}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recommended Domains</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {c.intakeAnalysis.recommendedDomains.map((d: string) => (
                          <Badge key={d} variant="outline" className="bg-white">{d}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-slate-700 bg-white/60 p-3 rounded-lg border border-blue-100/50">
                      {c.intakeAnalysis.summary}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-500 mb-4">No AI analysis run yet for this case.</p>
                    <Button onClick={handleAnalyzeIntake} disabled={analyzeIntakeMut.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                      {analyzeIntakeMut.isPending ? "Analyzing..." : "Run AI Intake Analysis"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Col: Assignments */}
        <div className="col-span-1 lg:col-span-2">
          <Card className="border-none shadow-md h-full">
            <CardHeader className="flex flex-row justify-between items-center border-b bg-slate-50/50 pb-4">
              <CardTitle>Assessment Forms & Assignments</CardTitle>
              <div className="flex gap-2">
                {respondentGroups.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setDistributeFormsOpen(true)}>
                    <Send size={13} className="mr-1.5" /> Distribute Forms
                  </Button>
                )}
                {hasCdpBattery && (
                  <Link href={`/cases/${caseId}/cdp`}>
                    <Button size="sm" variant="outline" className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 gap-1.5">
                      <span className="text-[11px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">CDP</span>
                      View Profile
                    </Button>
                  </Link>
                )}
                {role === "admin" && (
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
              {(!c.assignments || c.assignments.length === 0) ? (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <FileBarChart size={32} />
                  </div>
                  <p>No forms or assessments assigned yet.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {c.assignments.map(a => (
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
                            <a href={`/external/${a.uniqueToken}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="bg-white" title="Open Form">
                                <ExternalLink size={16} />
                              </Button>
                            </a>
                          </>
                        )}
                        {a.respondentType === 'self' && a.status !== 'completed' && (
                          <Link href={`/cases/${caseId}/self-report`}>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                              <Play size={14} className="mr-1" /> Launch Guided
                            </Button>
                          </Link>
                        )}
                        {role === "admin" && (
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditCaseOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1" disabled={updateCaseMut.isPending}>
                {updateCaseMut.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Distribute Forms Modal */}
      <Dialog open={distributeFormsOpen} onOpenChange={setDistributeFormsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send size={18} className="text-primary" /> Distribute Forms
            </DialogTitle>
            <DialogDescription>
              Copy links or email templates for each respondent. Groups with all forms completed are not shown.
            </DialogDescription>
          </DialogHeader>

          {respondentGroups.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              No pending assignments to distribute.
            </div>
          ) : (
            <div className="space-y-5 mt-2">
              {respondentGroups.map(group => {
                const pendingCount = group.assignments.filter(a => a.status !== "completed").length;
                const hasEmail = !!group.assignedToEmail;
                return (
                  <div key={group.key} className="border border-slate-200 rounded-xl overflow-hidden">
                    {/* Respondent header */}
                    <div className="bg-slate-50 px-4 py-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">
                          {group.assignedToName || group.respondentLabel}
                        </p>
                        {hasEmail ? (
                          <p className="text-xs text-slate-500 mt-0.5">{group.assignedToEmail}</p>
                        ) : (
                          <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                            <span>⚠</span> No email captured — share link manually
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {hasEmail && (
                          <Button
                            size="sm" variant="outline"
                            className="text-xs gap-1.5"
                            onClick={() => copyToClipboard(buildEmailTemplate(group), "Email template")}
                          >
                            <Mail size={12} /> Copy Email
                          </Button>
                        )}
                        {pendingCount > 0 && (
                          <Button
                            size="sm" variant="outline"
                            className="text-xs gap-1.5"
                            onClick={() => copyToClipboard(buildLinksText(group), "Links")}
                          >
                            <Link2 size={12} /> Copy Links
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Form list */}
                    <div className="divide-y divide-slate-100">
                      {group.assignments.map(a => {
                        const done = a.status === "completed";
                        return (
                          <div key={a.id} className={`px-4 py-2.5 flex items-center justify-between gap-3 ${done ? "opacity-50" : ""}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              {done
                                ? <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 flex-shrink-0" />
                              }
                              <span className="text-sm text-slate-700 font-medium truncate">{a.toolName}</span>
                              {done && <span className="text-xs text-emerald-600 font-medium flex-shrink-0">Completed</span>}
                            </div>
                            {!done && (
                              <Button
                                size="sm" variant="ghost"
                                className="text-xs h-7 gap-1 text-slate-500 hover:text-primary flex-shrink-0"
                                onClick={() => copyToClipboard(a.uniqueLink, `Link for ${a.toolName}`)}
                              >
                                <Copy size={11} /> Copy Link
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Case Confirmation */}
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

    </div>
  );
}
