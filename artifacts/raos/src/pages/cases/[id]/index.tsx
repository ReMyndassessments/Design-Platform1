import { useParams, Link } from "wouter";
import { 
  useGetCase, 
  useAdvanceCasePhase, 
  useAnalyzeIntake, 
  useListAssessmentTools,
  useCreateAssignment,
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
  ArrowLeft, BrainCircuit, CheckCircle2, ChevronRight, 
  Copy, ExternalLink, QrCode, FileBarChart, Edit, Play
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const PHASES = [
  "pre_commitment", "intake", "setup", "forms", "assessment", "scoring", "report", "debrief", "complete"
];

export default function CaseDetail() {
  const params = useParams();
  const caseId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: c, isLoading } = useGetCase(caseId);
  const advancePhaseMut = useAdvanceCasePhase();
  const analyzeIntakeMut = useAnalyzeIntake();
  const { data: tools } = useListAssessmentTools();
  const createAssignmentMut = useCreateAssignment();

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeQr, setActiveQr] = useState<string>("");
  const [addAssignmentModalOpen, setAddAssignmentModalOpen] = useState(false);
  
  const [newAssignment, setNewAssignment] = useState({
    toolId: "",
    respondentType: "parent" as CreateAssignmentRequestRespondentType,
    respondentLabel: "",
    assignedToName: "",
    assignedToEmail: ""
  });

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!c) return <div>Case not found</div>;

  const currentPhaseIndex = PHASES.indexOf(c.currentPhase);

  const handleAdvancePhase = () => {
    advancePhaseMut.mutate({ caseId }, {
      onSuccess: () => {
        toast({ title: "Phase advanced" });
        queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId] });
      }
    });
  };

  const handleAnalyzeIntake = () => {
    analyzeIntakeMut.mutate({ caseId }, {
      onSuccess: () => {
        toast({ title: "Intake Analysis Complete", description: "AI has processed the intake data." });
        queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId] });
      }
    });
  };

  const handleAddAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    createAssignmentMut.mutate({ caseId, data: newAssignment }, {
      onSuccess: () => {
        toast({ title: "Assignment added" });
        setAddAssignmentModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId] });
      }
    });
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
          <Button onClick={handleAdvancePhase} disabled={advancePhaseMut.isPending || c.currentPhase === 'complete'} className="shadow-lg shadow-primary/20">
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
                return (
                  <div key={phase} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors duration-500 ${
                      isActive ? 'bg-primary ring-4 ring-primary/30 text-white' : 
                      isPast ? 'bg-primary text-white' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {isPast ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-[10px] uppercase font-bold mt-2 tracking-wider absolute top-10 whitespace-nowrap text-center ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}>
                      {phase.replace('_', ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-12 flex justify-between items-end">
            <div>
              <p className="text-sm text-slate-400">Current Phase</p>
              <h3 className="text-xl font-bold font-display capitalize text-white">{c.currentPhase.replace('_', ' ')}</h3>
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

          <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center text-blue-900">
                <BrainCircuit className="text-primary mr-2" size={20} />
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
                      {c.intakeAnalysis.recommendedDomains.map(d => (
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
        </div>

        {/* Right Col: Assignments */}
        <div className="col-span-1 lg:col-span-2">
          <Card className="border-none shadow-md h-full">
            <CardHeader className="flex flex-row justify-between items-center border-b bg-slate-50/50 pb-4">
              <CardTitle>Assessment Forms & Assignments</CardTitle>
              <Button size="sm" onClick={() => setAddAssignmentModalOpen(true)}>Add Assignment</Button>
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
                        </div>
                        <div className="flex items-center text-sm text-slate-500 gap-4">
                          <span className="capitalize font-medium text-slate-700">{a.respondentType}: {a.respondentLabel}</span>
                          <span>Assigned to: {a.assignedToName || 'Unspecified'}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {a.status !== 'completed' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => { setActiveQr(a.uniqueLink); setQrModalOpen(true); }} className="bg-white" title="Show QR Code">
                              <QrCode size={16} />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => copyLink(a.uniqueLink)} className="bg-white" title="Copy Link">
                              <Copy size={16} />
                            </Button>
                            <Link href={`/external/${a.uniqueToken}`} target="_blank">
                              <Button variant="outline" size="sm" className="bg-white" title="Open Form">
                                <ExternalLink size={16} />
                              </Button>
                            </Link>
                          </>
                        )}
                        {a.respondentType === 'self' && a.status !== 'completed' && (
                          <Link href={`/cases/${caseId}/self-report`}>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                              <Play size={14} className="mr-1" /> Launch Guided
                            </Button>
                          </Link>
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
          </DialogHeader>
          <form onSubmit={handleAddAssignment} className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Assessment Tool</label>
              <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newAssignment.toolId} onChange={e => setNewAssignment({...newAssignment, toolId: e.target.value})}>
                <option value="">Select tool...</option>
                {tools?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Respondent Type</label>
              <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newAssignment.respondentType} onChange={e => setNewAssignment({...newAssignment, respondentType: e.target.value as any})}>
                <option value="parent">Parent</option>
                <option value="teacher1">Teacher 1</option>
                <option value="teacher2">Teacher 2</option>
                <option value="student">Student (Independent)</option>
                <option value="self">Self-Report (Guided)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Respondent Label (e.g., 'Mom', 'Math Teacher')</label>
              <Input required value={newAssignment.respondentLabel} onChange={e => setNewAssignment({...newAssignment, respondentLabel: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Assigned To Name</label>
              <Input value={newAssignment.assignedToName} onChange={e => setNewAssignment({...newAssignment, assignedToName: e.target.value})} />
            </div>
            <Button type="submit" className="w-full mt-4" disabled={createAssignmentMut.isPending}>
              {createAssignmentMut.isPending ? "Adding..." : "Add Assignment"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
