import { useParams, Link } from "wouter";
import { useGetCase, useGetCurrentUser, useUpdateCase } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ExternalLink, FileEdit, Link2, X, PackageCheck, CheckCircle2, Circle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const BASE = "/api";

export default function ReportEditor() {
  const params = useParams();
  const caseId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: currentUser } = useGetCurrentUser();
  const canEdit = currentUser?.role === "admin" || currentUser?.role === "psychometrician";

  const { data: caseData } = useGetCase(caseId);
  const updateCaseMut = useUpdateCase();

  const [editingDocUrl, setEditingDocUrl] = useState(false);
  const [docUrlInput, setDocUrlInput] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const handleToggleApproval = async (approve: boolean) => {
    setIsApproving(true);
    try {
      const r = await fetch(`${BASE}/cases/${caseId}/report-approval`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approved: approve }),
      });
      if (!r.ok) {
        const d = await r.json();
        toast({ title: d.message ?? "Failed to save approval", variant: "destructive" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId] });
    } catch {
      toast({ title: "Failed to save approval. Please try again.", variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  const handleImportGoogleDoc = async () => {
    setIsImporting(true);
    try {
      const r = await fetch(`${BASE}/cases/${caseId}/report-access/import-google-doc`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      const data = await r.json();
      if (!r.ok) {
        toast({ title: data.message ?? "Import failed", variant: "destructive" });
        return;
      }
      toast({ title: "Report attached", description: "The Google Doc has been exported as PDF and is ready to send from the case page." });
    } catch {
      toast({ title: "Import failed. Please try again.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  useEffect(() => {
    if (caseData?.workingDocUrl) {
      setDocUrlInput(caseData.workingDocUrl);
    }
  }, [caseData?.workingDocUrl]);

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
            <h1 className="text-2xl font-bold font-display text-slate-900">Report Workspace</h1>
            <p className="text-slate-500 text-sm">Student: {caseData?.studentName}</p>
          </div>
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
              <p className="text-sm text-slate-600">Paste the shared Google Docs link below.</p>
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

      {/* Finalise & Attach */}
      {workingDocUrl && (() => {
        const adminApproved = caseData?.adminApprovedReport ?? false;
        const psychApproved = caseData?.psychApprovedReport ?? false;
        const bothApproved = adminApproved && psychApproved;
        const myRole = currentUser?.role;
        const canApprove = myRole === "admin" || myRole === "psychometrician";

        return (
          <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm">
            <div className="px-6 py-4 border-b border-emerald-100 flex items-center gap-2">
              <PackageCheck size={17} className="text-emerald-600" />
              <h3 className="font-semibold text-slate-800">Finalise &amp; Attach</h3>
            </div>
            <CardContent className="p-6 space-y-5">
              <p className="text-sm text-slate-600">
                Both the admin and psychometrician must mark this report as final before it can be attached and sent.
              </p>

              {/* Approval status rows */}
              <div className="space-y-2">
                {/* Admin row */}
                <div className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-emerald-100">
                  <div className="flex items-center gap-3">
                    {adminApproved
                      ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                      : <Circle size={18} className="text-slate-300 shrink-0" />}
                    <div>
                      <p className="text-sm font-medium text-slate-800">Admin (Noel)</p>
                      <p className="text-xs text-slate-400">{adminApproved ? "Marked as final" : "Pending approval"}</p>
                    </div>
                  </div>
                  {myRole === "admin" && (
                    <Button
                      size="sm"
                      variant={adminApproved ? "outline" : "default"}
                      disabled={isApproving}
                      onClick={() => handleToggleApproval(!adminApproved)}
                      className={adminApproved
                        ? "text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                    >
                      {adminApproved ? "Undo" : "Approve"}
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
                      <p className="text-xs text-slate-400">{psychApproved ? "Marked as final" : "Pending approval"}</p>
                    </div>
                  </div>
                  {myRole === "psychometrician" && (
                    <Button
                      size="sm"
                      variant={psychApproved ? "outline" : "default"}
                      disabled={isApproving}
                      onClick={() => handleToggleApproval(!psychApproved)}
                      className={psychApproved
                        ? "text-slate-500 border-slate-200 hover:text-red-600 hover:border-red-200"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"}
                    >
                      {psychApproved ? "Unmark" : "Mark as Final"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Attach button — only admin can trigger, only when both approved */}
              {myRole === "admin" && (
                <div className="flex items-center justify-between pt-1">
                  {!bothApproved && (
                    <p className="text-xs text-amber-600">
                      {!adminApproved && !psychApproved
                        ? "Waiting for both approvals"
                        : !adminApproved
                        ? "Your approval is still needed"
                        : "Waiting for psychometrician to approve"}
                    </p>
                  )}
                  <Button
                    onClick={handleImportGoogleDoc}
                    disabled={isImporting || !bothApproved}
                    className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow shadow-emerald-600/20 disabled:opacity-50"
                  >
                    {isImporting ? "Attaching…" : "Attach Report"}
                  </Button>
                </div>
              )}

              {!canApprove && (
                <p className="text-xs text-slate-400 italic">Only the admin and psychometrician can approve and attach this report.</p>
              )}
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
