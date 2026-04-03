import { useParams, Link } from "wouter";
import { useGetCase, useGetCurrentUser, useUpdateCase } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ExternalLink, FileEdit, Link2, X, PackageCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

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

      {/* Ready for Delivery */}
      <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-sm">
        <div className="px-6 py-4 border-b border-emerald-100 flex items-center gap-2">
          <PackageCheck size={17} className="text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Ready for Delivery?</h3>
        </div>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Once the report is finalised in Google Docs:
            </p>
            <ol className="space-y-1.5 text-sm text-slate-600 list-none">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <span>Open the Google Doc and go to <strong>File → Download → PDF</strong> to export it</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <span>Go to the case page and use the <strong>Report Access</strong> panel to upload the PDF and send secure links to the parent and school</span>
              </li>
            </ol>
          </div>
          <div className="flex gap-3">
            {workingDocUrl && (
              <a href={workingDocUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <ExternalLink size={14} className="mr-2" /> Open Google Doc
                </Button>
              </a>
            )}
            <Link href={`/cases/${caseId}`}>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow shadow-emerald-600/20">
                Go to Report Access
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
