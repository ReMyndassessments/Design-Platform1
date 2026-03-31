import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Mail, Download, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, Shield, ShieldCheck, ShieldAlert, FileText, SendHorizonal,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReportToken {
  id: string;
  role: "parent" | "teacher";
  email: string;
  sentAt: string | null;
  downloadedAt: string | null;
  permissionGranted: boolean | null;
  adminOverride: boolean;
}

interface ReportUpload {
  id: string;
  filename: string;
  uploadedAt: string;
}

interface Props {
  caseId: string;
  parentEmail?: string;
}

const BASE = "/api";

export function ReportAccessPanel({ caseId, parentEmail }: Props) {
  const { toast } = useToast();

  const [upload, setUpload] = useState<ReportUpload | null>(null);
  const [tokens, setTokens] = useState<ReportToken[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload form state
  const [pEmail, setPEmail] = useState(parentEmail ?? "");
  const [tEmail, setTEmail] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Edit email state
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${BASE}/cases/${caseId}/report-access`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!r.ok) return;
      const data = await r.json();
      setUpload(data.upload);
      setTokens(data.tokens ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, [caseId]);

  const handleUpload = async () => {
    if (!selectedFile) { toast({ title: "Please select a PDF file", variant: "destructive" }); return; }
    if (!pEmail && !tEmail) { toast({ title: "Enter at least one email address", variant: "destructive" }); return; }

    setIsUploading(true);
    try {
      // Step 1: get presigned upload URL
      const urlRes = await fetch(`${BASE}/storage/uploads/request-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: selectedFile.name, size: selectedFile.size, contentType: selectedFile.type }),
      });
      const { uploadURL, objectPath } = await urlRes.json();

      // Step 2: upload directly to GCS
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      // Step 3: register upload + generate tokens
      const regRes = await fetch(`${BASE}/cases/${caseId}/report-access/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          fileKey: objectPath,
          filename: selectedFile.name,
          parentEmail: pEmail || undefined,
          teacherEmail: tEmail || undefined,
        }),
      });

      if (!regRes.ok) throw new Error("Registration failed");

      toast({ title: "Report uploaded and emails sent", description: "Both parties have been notified." });
      setSelectedFile(null);
      await fetchStatus();
    } catch (err) {
      console.error(err);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleResend = async (tokenId: string, email: string) => {
    await fetch(`${BASE}/cases/${caseId}/report-access/tokens/${tokenId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ email, resend: true }),
    });
    toast({ title: "Email resent" });
  };

  const handleUpdateEmail = async (tokenId: string) => {
    await fetch(`${BASE}/cases/${caseId}/report-access/tokens/${tokenId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ email: editEmail, resend: false }),
    });
    toast({ title: "Email updated" });
    setEditingToken(null);
    await fetchStatus();
  };

  const handleOverride = async (tokenId: string) => {
    const r = await fetch(`${BASE}/cases/${caseId}/report-access/tokens/${tokenId}/override`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (!r.ok) {
      const d = await r.json();
      toast({ title: d.error ?? "Override failed", variant: "destructive" });
    } else {
      toast({ title: "Override applied — teacher can now download" });
      await fetchStatus();
    }
  };

  const parentToken = tokens.find(t => t.role === "parent");
  const teacherToken = tokens.find(t => t.role === "teacher");

  const TokenCard = ({ token }: { token: ReportToken }) => {
    const isParent = token.role === "parent";
    const downloaded = !!token.downloadedAt;
    const permGranted = token.permissionGranted === true;
    const permDenied = token.permissionGranted === false;
    const canOverride = isParent && downloaded && !permGranted;

    return (
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center",
              isParent ? "bg-teal-50" : "bg-indigo-50")}>
              {isParent
                ? <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-teal-500"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>
                : <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-500"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/></svg>
              }
            </div>
            <span className="font-semibold text-sm text-slate-800 capitalize">{token.role}</span>
            {token.adminOverride && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Admin Override</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {token.sentAt
              ? <Badge variant="outline" className="text-green-700 border-green-200 text-[10px]"><Mail size={9} className="mr-1"/>Sent</Badge>
              : <Badge variant="outline" className="text-slate-500 text-[10px]"><Clock size={9} className="mr-1"/>Not sent</Badge>
            }
            {downloaded
              ? <Badge variant="outline" className="text-blue-700 border-blue-200 text-[10px]"><Download size={9} className="mr-1"/>Downloaded</Badge>
              : null
            }
          </div>
        </div>

        {/* Email row */}
        {editingToken === token.id ? (
          <div className="flex gap-2">
            <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="h-8 text-sm flex-1" />
            <Button size="sm" className="h-8" onClick={() => handleUpdateEmail(token.id)}>Save</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingToken(null)}>Cancel</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500 flex-1 truncate">{token.email}</p>
            <button onClick={() => { setEditingToken(token.id); setEditEmail(token.email); }}
              className="text-[10px] text-slate-400 hover:text-slate-600 underline">Edit</button>
            <button onClick={() => handleResend(token.id, token.email)}
              className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              <RefreshCw size={9}/> Resend
            </button>
          </div>
        )}

        {/* Permission status (parent only) */}
        {isParent && (
          <div className={cn("rounded-lg px-3 py-2 flex items-center justify-between",
            permGranted ? "bg-green-50 border border-green-200" :
            permDenied ? "bg-amber-50 border border-amber-200" :
            downloaded ? "bg-orange-50 border border-orange-200" :
            "bg-slate-50 border border-slate-200"
          )}>
            <div className="flex items-center gap-2">
              {permGranted
                ? <ShieldCheck size={14} className="text-green-600"/>
                : permDenied
                ? <ShieldAlert size={14} className="text-amber-600"/>
                : downloaded
                ? <AlertTriangle size={14} className="text-orange-500"/>
                : <Shield size={14} className="text-slate-400"/>
              }
              <span className={cn("text-xs font-medium",
                permGranted ? "text-green-700" :
                permDenied ? "text-amber-700" :
                downloaded ? "text-orange-700" :
                "text-slate-500"
              )}>
                {permGranted
                  ? token.adminOverride ? "Permission granted (admin override)" : "Permission granted"
                  : permDenied
                  ? "Parent withheld permission"
                  : downloaded
                  ? "Downloaded — awaiting permission decision"
                  : "Awaiting download"}
              </span>
            </div>
            {canOverride && (
              <Button size="sm" variant="outline"
                className="h-6 text-[10px] border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => handleOverride(token.id)}>
                Override
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
          <FileText size={18} className="text-indigo-600"/>
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">Report Access</h3>
          <p className="text-xs text-slate-500">Upload the final PDF and send secure download links</p>
        </div>
        {upload && (
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={13} className="text-green-500"/>
            <span>{upload.filename}</span>
          </div>
        )}
      </div>

      {/* Upload form */}
      <div className="space-y-4 border border-dashed border-slate-300 rounded-xl p-5 bg-slate-50">
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {upload ? "Replace Report & Resend" : "Upload Final Report"}
        </p>

        <div>
          <Label className="text-xs text-slate-600 mb-1 block">Report PDF</Label>
          <label className={cn(
            "flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors",
            selectedFile ? "border-indigo-300 bg-indigo-50" : "border-slate-300 bg-white hover:border-indigo-300"
          )}>
            <Upload size={16} className={selectedFile ? "text-indigo-500" : "text-slate-400"} />
            <span className={cn("text-sm", selectedFile ? "text-indigo-700 font-medium" : "text-slate-400")}>
              {selectedFile ? selectedFile.name : "Choose PDF file…"}
            </span>
            <input type="file" accept="application/pdf" className="hidden"
              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Parent email</Label>
            <Input value={pEmail} onChange={e => setPEmail(e.target.value)}
              placeholder="parent@example.com" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-slate-600 mb-1 block">Teacher email</Label>
            <Input value={tEmail} onChange={e => setTEmail(e.target.value)}
              placeholder="teacher@school.com" className="h-9 text-sm" />
          </div>
        </div>

        <Button onClick={handleUpload} disabled={isUploading || !selectedFile} className="gap-2 w-full sm:w-auto">
          <SendHorizonal size={15}/>
          {isUploading ? "Uploading…" : upload ? "Replace & Resend Links" : "Upload & Send Links"}
        </Button>
      </div>

      {/* Token status */}
      {(parentToken || teacherToken) && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Link Status</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {parentToken && <TokenCard token={parentToken} />}
            {teacherToken && <TokenCard token={teacherToken} />}
          </div>
        </div>
      )}
    </div>
  );
}
