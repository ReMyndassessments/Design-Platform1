import { useParams, Link } from "wouter";
import { useGetCaseReport, useGenerateReport, useUpdateReport, useApproveReport, useGetCase, useGetCurrentUser, useUpdateCase } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, Check, Save, ExternalLink, FileEdit, Link2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function ReportEditor() {
  const params = useParams();
  const caseId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useGetCurrentUser();
  const isAdmin = currentUser?.role === "admin";
  const canEdit = currentUser?.role === "admin" || currentUser?.role === "psychometrician";

  const { data: caseData } = useGetCase(caseId);
  const { data: report, isLoading } = useGetCaseReport(caseId, { query: { retry: false } });

  const generateMut = useGenerateReport();
  const updateMut = useUpdateReport();
  const approveMut = useApproveReport();
  const updateCaseMut = useUpdateCase();

  const [formData, setFormData] = useState({
    backgroundSummary: "",
    domainAnalysis: "",
    strengths: "",
    areasOfConcern: "",
    crossSettingComparison: "",
    recommendations: ""
  });

  const [editingDocUrl, setEditingDocUrl] = useState(false);
  const [docUrlInput, setDocUrlInput] = useState("");

  useEffect(() => {
    if (report) {
      setFormData({
        backgroundSummary: report.backgroundSummary || "",
        domainAnalysis: report.domainAnalysis || "",
        strengths: report.strengths || "",
        areasOfConcern: report.areasOfConcern || "",
        crossSettingComparison: report.crossSettingComparison || "",
        recommendations: report.recommendations || ""
      });
    }
  }, [report]);

  useEffect(() => {
    if (caseData?.workingDocUrl) {
      setDocUrlInput(caseData.workingDocUrl);
    }
  }, [caseData?.workingDocUrl]);

  const handleGenerate = () => {
    generateMut.mutate({ caseId }, {
      onSuccess: () => {
        toast({ title: "Report Generated", description: "AI has drafted the initial report based on scores and intake." });
        queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId, 'report'] });
      },
      onError: () => toast({ title: "Generation failed", variant: "destructive" })
    });
  };

  const handleSave = () => {
    updateMut.mutate({ caseId, data: formData }, {
      onSuccess: () => toast({ title: "Draft Saved" })
    });
  };

  const handleApprove = () => {
    approveMut.mutate({ caseId }, {
      onSuccess: () => {
        toast({ title: "Report Approved" });
        queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId, 'report'] });
      }
    });
  };

  const handleSaveDocUrl = () => {
    updateCaseMut.mutate({ caseId, data: { workingDocUrl: docUrlInput.trim() } }, {
      onSuccess: () => {
        toast({ title: "Working document saved" });
        queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId] });
        setEditingDocUrl(false);
      },
      onError: () => toast({ title: "Failed to save URL", variant: "destructive" })
    });
  };

  const handleRemoveDocUrl = () => {
    updateCaseMut.mutate({ caseId, data: { workingDocUrl: "" } }, {
      onSuccess: () => {
        toast({ title: "Working document removed" });
        queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId] });
        setDocUrlInput("");
        setEditingDocUrl(false);
      }
    });
  };

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const workingDocUrl = caseData?.workingDocUrl;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sticky top-0 bg-background/80 backdrop-blur-md py-4 z-10 border-b">
        <div className="flex items-center space-x-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-display text-slate-900">Assessment Report</h1>
              {report && <Badge variant={report.status === 'approved' ? 'success' : 'warning'} className="capitalize">{report.status}</Badge>}
            </div>
            <p className="text-slate-500 text-sm">Student: {caseData?.studentName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!report && canEdit && (
            <Button onClick={handleGenerate} disabled={generateMut.isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20">
              <Sparkles size={16} className="mr-2" /> {generateMut.isPending ? "Drafting..." : "AI Generate Draft"}
            </Button>
          )}
          {report && canEdit && (
            <>
              <Button variant="outline" onClick={handleSave} disabled={updateMut.isPending || report.status === 'approved'} className="bg-white">
                <Save size={16} className="mr-2" /> Save Draft
              </Button>
              {isAdmin && (
                <Button onClick={handleApprove} disabled={approveMut.isPending || report.status === 'approved'} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                  <Check size={16} className="mr-2" /> Approve Final
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Collaborative Working Document Panel */}
      <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between border-b border-blue-100">
          <div className="flex items-center gap-2">
            <FileEdit size={17} className="text-blue-600" />
            <h3 className="font-semibold text-slate-800">Collaborative Working Document</h3>
          </div>
          {workingDocUrl && !editingDocUrl && canEdit && (
            <Button variant="ghost" size="sm" className="text-slate-500 h-7 text-xs" onClick={() => { setDocUrlInput(workingDocUrl); setEditingDocUrl(true); }}>
              Change link
            </Button>
          )}
        </div>
        <CardContent className="p-6">
          {!editingDocUrl && workingDocUrl ? (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-slate-600 mb-1">Both you and the psychometrician can edit this document simultaneously in real time.</p>
                <p className="text-xs text-slate-400 truncate">{workingDocUrl}</p>
              </div>
              <a href={workingDocUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow shadow-blue-600/20">
                  <ExternalLink size={15} className="mr-2" /> Open in Google Docs
                </Button>
              </a>
            </div>
          ) : editingDocUrl ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">Paste the shared Google Docs link below. Anyone with the link can collaborate on the draft in real time.</p>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://docs.google.com/document/d/..."
                  value={docUrlInput}
                  onChange={e => setDocUrlInput(e.target.value)}
                  className="bg-white"
                  autoFocus
                />
                <Button onClick={handleSaveDocUrl} disabled={!docUrlInput.trim() || updateCaseMut.isPending} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                  Save
                </Button>
                <Button variant="ghost" size="icon" onClick={() => { setEditingDocUrl(false); setDocUrlInput(caseData?.workingDocUrl || ""); }} className="shrink-0">
                  <X size={16} />
                </Button>
              </div>
              {workingDocUrl && (
                <button onClick={handleRemoveDocUrl} className="text-xs text-red-500 hover:text-red-700 underline">
                  Remove working document
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Link a Google Doc so you and the psychometrician can draft the report together in real time. Once linked, it stays here permanently for this case.
              </p>
              {canEdit ? (
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://docs.google.com/document/d/..."
                    value={docUrlInput}
                    onChange={e => setDocUrlInput(e.target.value)}
                    className="bg-white"
                  />
                  <Button onClick={handleSaveDocUrl} disabled={!docUrlInput.trim() || updateCaseMut.isPending} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                    <Link2 size={15} className="mr-2" /> Link Doc
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No working document linked yet. Ask the admin to add one.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Generate empty state */}
      {!report && !generateMut.isPending && (
        <Card className="p-16 text-center border-dashed border-2 bg-slate-50/50">
          <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No RAOS Report Draft Yet</h3>
          {canEdit ? (
            <>
              <p className="text-slate-500 max-w-md mx-auto mb-6">Once the working document is finalised, use AI Generate to create the official RAOS report draft from scores and intake data.</p>
              <Button onClick={handleGenerate} className="bg-indigo-600 hover:bg-indigo-700 text-white">Generate Now</Button>
            </>
          ) : (
            <p className="text-slate-500 max-w-md mx-auto">The psychometrician will generate this report once scoring is complete.</p>
          )}
        </Card>
      )}

      {/* RAOS Report Sections */}
      {report && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-1">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Official RAOS Report</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          {[
            { key: 'backgroundSummary', label: 'Background & Intake Summary' },
            { key: 'domainAnalysis', label: 'Domain Analysis' },
            { key: 'strengths', label: 'Strengths' },
            { key: 'areasOfConcern', label: 'Areas of Concern' },
            { key: 'crossSettingComparison', label: 'Cross-Setting Comparison' },
            { key: 'recommendations', label: 'Recommendations' },
          ].map(section => (
            <Card key={section.key} className="shadow-sm border-none">
              <div className="px-6 py-4 bg-slate-50/80 border-b rounded-t-xl">
                <h3 className="font-semibold text-slate-800">{section.label}</h3>
              </div>
              <CardContent className="p-0">
                <Textarea
                  className="min-h-[200px] border-0 focus-visible:ring-0 rounded-none rounded-b-xl text-base leading-relaxed p-6 resize-y"
                  value={(formData as any)[section.key]}
                  onChange={e => setFormData({ ...formData, [section.key]: e.target.value })}
                  disabled={report.status === 'approved' || !canEdit}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
