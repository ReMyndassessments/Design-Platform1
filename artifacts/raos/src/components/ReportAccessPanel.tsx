import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Upload, Mail, Download, CheckCircle2, Clock, AlertTriangle,
  RefreshCw, Shield, ShieldCheck, ShieldAlert, FileText, SendHorizonal,
  UserPlus, X, Bell, Archive, FilePlus2, Lock, ExternalLink, FlaskConical,
  Video, Copy, Pencil, Trash2, UserCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReportToken {
  id: string;
  role: "parent" | "teacher" | "other";
  email: string;
  recipientName?: string | null;
  sentAt: string | null;
  downloadedAt: string | null;
  permissionGranted: boolean | null;
  adminOverride: boolean;
  accessCode: string | null;
  markedReceivedAt: string | null;
  markedReceivedBy: string | null;
}

interface ReportUpload {
  id: string;
  filename: string;
  label: string | null;
  uploadedAt: string;
}

interface Props {
  caseId: string;
  parentEmail?: string;
  currentPhase?: string;
  workingDocUrl?: string;
  debriefMeetingUrl?: string;
  debriefMeetingDate?: string;
  onPhaseAdvanced?: () => void;
  onCaseUpdated?: () => void;
}

interface AdditionalRecipient {
  name: string;
  email: string;
}

const BASE = "/api";

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

export function ReportAccessPanel({ caseId, parentEmail, currentPhase, workingDocUrl, debriefMeetingUrl, debriefMeetingDate, onPhaseAdvanced, onCaseUpdated }: Props) {
  const { toast } = useToast();

  const [uploads, setUploads] = useState<ReportUpload[]>([]);
  const [tokens, setTokens] = useState<ReportToken[]>([]);
  const [loading, setLoading] = useState(true);

  const [debriefUrlDraft, setDebriefUrlDraft] = useState(debriefMeetingUrl ?? "");
  const [editingDebriefUrl, setEditingDebriefUrl] = useState(false);
  const [savingDebriefUrl, setSavingDebriefUrl] = useState(false);
  const [generatingDebriefRoom, setGeneratingDebriefRoom] = useState(false);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [sendingDebriefInvite, setSendingDebriefInvite] = useState(false);
  const [debriefExtraEmail, setDebriefExtraEmail] = useState("");
  const [debriefExtraEmails, setDebriefExtraEmails] = useState<string[]>([]);

  const [debriefDateDraft, setDebriefDateDraft] = useState("");
  const [debriefTz, setDebriefTz] = useState("Asia/Singapore");
  const [savingDebriefDate, setSavingDebriefDate] = useState(false);

  const isDebrief = currentPhase === "debrief";
  const isLocked = currentPhase !== "final_review" && currentPhase !== "debrief";
  const hasUploads = uploads.length > 0;

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileLabel, setFileLabel] = useState("");
  const [pEmail, setPEmail] = useState(parentEmail ?? "");
  const [tEmail, setTEmail] = useState("");
  const [notifyTeam, setNotifyTeam] = useState(false);
  const [sendInternalCopy, setSendInternalCopy] = useState(false);
  const [notifyRecipients, setNotifyRecipients] = useState(false);
  const [additionalRecipients, setAdditionalRecipients] = useState<AdditionalRecipient[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deletingUploadId, setDeletingUploadId] = useState<string | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Edit email state
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");

  const fetchStatus = async () => {
    try {
      const r = await fetch(`${BASE}/cases/${caseId}/report-access`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      if (!r.ok) return;
      const data = await r.json();
      setUploads(data.uploads ?? []);
      setTokens(data.tokens ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStatus(); }, [caseId]);

  const addRecipient = () =>
    setAdditionalRecipients(r => [...r, { name: "", email: "" }]);
  const removeRecipient = (i: number) =>
    setAdditionalRecipients(r => r.filter((_, idx) => idx !== i));
  const updateRecipient = (i: number, field: keyof AdditionalRecipient, value: string) =>
    setAdditionalRecipients(r => r.map((rec, idx) => idx === i ? { ...rec, [field]: value } : rec));

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "Please select a file", variant: "destructive" }); return;
    }
    if (!isDebrief && !pEmail && !tEmail && additionalRecipients.length === 0) {
      toast({ title: "Enter at least one recipient email", variant: "destructive" }); return;
    }

    setIsUploading(true);
    try {
      const urlRes = await fetch(`${BASE}/storage/uploads/request-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
        },
        body: JSON.stringify({ name: selectedFile.name, size: selectedFile.size, contentType: selectedFile.type }),
      });
      const { uploadURL, objectPath } = await urlRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      const regRes = await fetch(`${BASE}/cases/${caseId}/report-access/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
        },
        body: JSON.stringify({
          fileKey: objectPath,
          filename: selectedFile.name,
          label: fileLabel || undefined,
          parentEmail: pEmail || undefined,
          teacherEmail: tEmail || undefined,
          notifyTeam,
          sendInternalCopy,
          notifyRecipients,
          additionalRecipients: additionalRecipients.filter(r => r.email.trim()),
        }),
      });

      if (!regRes.ok) throw new Error("Upload failed");
      const result = await regRes.json();

      if (result.isFirstUpload) {
        toast({ title: "Report sent", description: "Secure links delivered. Case advanced to Debrief." });
        onPhaseAdvanced?.();
      } else {
        toast({ title: "Document added", description: notifyRecipients ? "Recipients have been notified." : "File added to the case." });
      }

      setSelectedFile(null);
      setFileLabel("");
      setAdditionalRecipients([]);
      setNotifyTeam(false);
      setSendInternalCopy(false);
      setNotifyRecipients(false);
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
        Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
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
        Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
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
      headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
    });
    if (!r.ok) {
      const d = await r.json();
      toast({ title: d.error ?? "Override failed", variant: "destructive" });
    } else {
      toast({ title: "Override applied — teacher can now download" });
      await fetchStatus();
    }
  };

  const handleMarkReceived = async (tokenId: string) => {
    const r = await fetch(`${BASE}/cases/${caseId}/report-access/tokens/${tokenId}/mark-received`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
    });
    if (!r.ok) {
      toast({ title: "Could not mark as received", variant: "destructive" });
    } else {
      toast({ title: "Marked as received out of system" });
      await fetchStatus();
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
      toast({ title: "Report imported", description: "The Google Doc has been exported as PDF and is ready to send." });
      await fetchStatus();
    } catch {
      toast({ title: "Import failed. Please try again.", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveDebriefUrl = async (url: string | null) => {
    setSavingDebriefUrl(true);
    try {
      const r = await fetch(`${BASE}/cases/${caseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
        },
        body: JSON.stringify({ debriefMeetingUrl: url }),
      });
      if (!r.ok) throw new Error("Failed to save");
      toast({ title: url ? "Debrief meeting link saved" : "Debrief meeting link cleared" });
      setEditingDebriefUrl(false);
      onCaseUpdated?.();
    } catch {
      toast({ title: "Could not save meeting link", variant: "destructive" });
    } finally {
      setSavingDebriefUrl(false);
    }
  };

  const handleSendDebriefInvitation = async () => {
    setSendingDebriefInvite(true);
    try {
      const r = await fetch(`${BASE}/cases/${caseId}/report-access/send-debrief`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
        },
        body: JSON.stringify({ extraEmails: debriefExtraEmails.map(email => ({ email })) }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message ?? "Failed");
      toast({ title: `Debrief invitation sent`, description: `${data.sent} recipient${data.sent !== 1 ? "s" : ""} notified with the meeting link and report access.` });
      setDebriefExtraEmails([]);
      setDebriefExtraEmail("");
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to send invitation", variant: "destructive" });
    } finally {
      setSendingDebriefInvite(false);
    }
  };

  const handleGenerateDebriefRoom = async () => {
    setGeneratingDebriefRoom(true);
    const slug = `raos-${caseId.slice(0, 8)}-debrief`;
    const url = `https://meet.ffmuc.net/${slug}`;
    await handleSaveDebriefUrl(url);
    setShowManualPaste(false);
    setGeneratingDebriefRoom(false);
  };

  const handleSaveDebriefDate = async (value: string | null) => {
    setSavingDebriefDate(true);
    try {
      const r = await fetch(`${BASE}/cases/${caseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("raos_token")}`,
        },
        body: JSON.stringify({ debriefMeetingDate: value }),
      });
      if (!r.ok) throw new Error("Failed to save");
      toast({ title: value ? "Debrief date saved" : "Debrief date cleared" });
      setDebriefDateDraft("");
      onCaseUpdated?.();
    } catch {
      toast({ title: "Could not save debrief date", variant: "destructive" });
    } finally {
      setSavingDebriefDate(false);
    }
  };

  const handleResetTestPreview = async () => {
    try {
      await fetch(`${BASE}/cases/${caseId}/report-access/test-preview`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      toast({ title: "Test preview cleared" });
      await fetchStatus();
    } catch {
      toast({ title: "Failed to reset test preview", variant: "destructive" });
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTest(true);
    try {
      const r = await fetch(`${BASE}/cases/${caseId}/report-access/send-test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
      });
      const data = await r.json();
      if (!r.ok) {
        toast({ title: data.error ?? "Failed to send test email", variant: "destructive" });
        return;
      }
      toast({ title: "Test email sent — step 1 of 2", description: `Check your inbox at ${data.sentTo}. Click through, download the report, then grant consent for the school. The school email will arrive automatically as step 2.` });
    } catch {
      toast({ title: "Failed to send test email. Please try again.", variant: "destructive" });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleArchiveDownload = () => {
    const url = `${BASE}/cases/${caseId}/archive`;
    const a = document.createElement("a");
    a.href = url;
    const headers = new Headers({ Authorization: `Bearer ${localStorage.getItem("raos_token")}` });
    // Use fetch to trigger the download with auth
    fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` } })
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        a.href = blobUrl;
        a.download = "case-archive.zip";
        a.click();
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => toast({ title: "Archive download failed", variant: "destructive" }));
  };

  const testPreviewToken = tokens.find(t => t.recipientName === "TEST PREVIEW (admin)");
  const parentToken = tokens.find(t => t.role === "parent" && t.recipientName !== "TEST PREVIEW (admin)");
  const teacherToken = tokens.find(t => t.role === "teacher");
  const otherTokens = tokens.filter(t => t.role === "other" && t.recipientName !== "TEST PREVIEW (admin)");

  const TokenCard = ({ token }: { token: ReportToken }) => {
    const isParent = token.role === "parent";
    const isOther = token.role === "other";
    const isTestPreview = token.recipientName === "TEST PREVIEW (admin)";
    const downloaded = !!token.downloadedAt;
    const permGranted = token.permissionGranted === true;
    const permDenied = token.permissionGranted === false;
    const canOverride = isParent && !isTestPreview && downloaded && !permGranted;

    const roleLabel = isParent && !isTestPreview ? "Parent / Guardian"
      : token.role === "teacher" ? "Teacher"
      : token.recipientName || "Additional Recipient";

    const iconBg = isTestPreview ? "bg-amber-50" : isParent ? "bg-teal-50" : isOther ? "bg-purple-50" : "bg-indigo-50";
    const iconColor = isTestPreview ? "text-amber-500" : isParent ? "text-teal-500" : isOther ? "text-purple-500" : "text-indigo-500";

    if (isTestPreview) {
      return (
        <div className="sm:col-span-2 border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-xl px-4 py-3 flex items-center gap-4 flex-wrap">
          {/* Icon + label */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <FlaskConical size={14} className="text-amber-600" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-amber-800 whitespace-nowrap">Test Preview</span>
              <Badge className="bg-amber-200 text-amber-800 border-0 text-[9px] px-1.5 py-0 h-4 shrink-0">Admin only</Badge>
            </div>
          </div>

          {/* Email */}
          <span className="text-[11px] text-amber-600 shrink-0">{token.email}</span>

          {/* Access code pill */}
          {token.accessCode && (
            <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-2.5 py-1 shrink-0">
              <Lock size={11} className="text-amber-400" />
              <span className="text-[11px] text-amber-700">Code:</span>
              <span className="font-mono font-bold text-sm tracking-widest text-amber-900">{token.accessCode}</span>
            </div>
          )}

          {/* Status badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {token.sentAt && <Badge variant="outline" className="text-green-700 border-green-200 text-[10px]"><Mail size={9} className="mr-1"/>Sent</Badge>}
            {downloaded && <Badge variant="outline" className="text-blue-700 border-blue-200 text-[10px]"><Download size={9} className="mr-1"/>Downloaded</Badge>}
            {permGranted && <Badge variant="outline" className="text-green-700 border-green-200 text-[10px]"><ShieldCheck size={9} className="mr-1"/>Consented</Badge>}
          </div>

          {/* Spacer + clear */}
          <div className="flex-1 flex justify-end">
            <button onClick={handleResetTestPreview}
              className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-1 font-medium whitespace-nowrap">
              <X size={10}/> Clear test
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", iconBg)}>
              {isParent
                ? <svg viewBox="0 0 20 20" fill="currentColor" className={cn("w-4 h-4", iconColor)}><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>
                : isOther
                ? <UserPlus size={14} className={iconColor} />
                : <svg viewBox="0 0 20 20" fill="currentColor" className={cn("w-4 h-4", iconColor)}><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/></svg>
              }
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-800">{roleLabel}</span>
              {isOther && token.recipientName && (
                <p className="text-[10px] text-slate-400 leading-none">{token.email}</p>
              )}
            </div>
            {token.adminOverride && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">Admin Override</Badge>
            )}
            {isOther && (
              <Badge variant="outline" className="text-purple-600 border-purple-200 text-[10px]">Consented</Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {token.sentAt
              ? <Badge variant="outline" className="text-green-700 border-green-200 text-[10px]"><Mail size={9} className="mr-1"/>Sent</Badge>
              : <Badge variant="outline" className="text-slate-500 text-[10px]"><Clock size={9} className="mr-1"/>Not sent</Badge>
            }
            {downloaded && (
              <Badge variant="outline" className="text-blue-700 border-blue-200 text-[10px]"><Download size={9} className="mr-1"/>Downloaded</Badge>
            )}
            {token.markedReceivedAt && !downloaded && (
              <Badge variant="outline" className="text-emerald-700 border-emerald-200 text-[10px]"><CheckCircle2 size={9} className="mr-1"/>Received (out of system)</Badge>
            )}
          </div>
        </div>

        {/* Access code display */}
        {token.accessCode && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Lock size={12} className="text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500">Access code:</span>
            <span className="font-mono font-bold text-sm tracking-widest text-slate-800">{token.accessCode}</span>
            <span className="text-[10px] text-slate-400 ml-1">— included in their email</span>
          </div>
        )}

        {!isOther && (
          editingToken === token.id ? (
            <div className="flex gap-2">
              <Input value={editEmail} onChange={e => setEditEmail(e.target.value)} className="h-8 text-sm flex-1" />
              <Button size="sm" className="h-8" onClick={() => handleUpdateEmail(token.id)}>Save</Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingToken(null)}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs text-slate-500 flex-1 truncate">{token.email}</p>
              <button onClick={() => { setEditingToken(token.id); setEditEmail(token.email); }}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline">Edit</button>
              <button onClick={() => handleResend(token.id, token.email)}
                className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                <RefreshCw size={9}/> Resend
              </button>
              {!downloaded && !token.markedReceivedAt && (
                <button onClick={() => handleMarkReceived(token.id)}
                  className="text-[10px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 size={9}/> Mark received
                </button>
              )}
            </div>
          )
        )}

        {isOther && (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs text-slate-500 flex-1 truncate">{token.email}</p>
            <button onClick={() => handleResend(token.id, token.email)}
              className="text-[10px] text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
              <RefreshCw size={9}/> Resend
            </button>
            {!downloaded && !token.markedReceivedAt && (
              <button onClick={() => handleMarkReceived(token.id)}
                className="text-[10px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1">
                <CheckCircle2 size={9}/> Mark received
              </button>
            )}
          </div>
        )}

        {isParent && (
          <div className={cn("rounded-lg px-3 py-2 flex items-center justify-between",
            permGranted ? "bg-green-50 border border-green-200" :
            permDenied ? "bg-amber-50 border border-amber-200" :
            downloaded ? "bg-orange-50 border border-orange-200" :
            "bg-slate-50 border border-slate-200"
          )}>
            <div className="flex items-center gap-2">
              {permGranted ? <ShieldCheck size={14} className="text-green-600"/>
                : permDenied ? <ShieldAlert size={14} className="text-amber-600"/>
                : downloaded ? <AlertTriangle size={14} className="text-orange-500"/>
                : <Shield size={14} className="text-slate-400"/>}
              <span className={cn("text-xs font-medium",
                permGranted ? "text-green-700" :
                permDenied ? "text-amber-700" :
                downloaded ? "text-orange-700" : "text-slate-500"
              )}>
                {permGranted ? (token.adminOverride ? "Permission granted (admin override)" : "Permission granted")
                  : permDenied ? "Parent withheld permission"
                  : downloaded ? "Downloaded — awaiting permission decision"
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
          <FileText size={18} className="text-indigo-600"/>
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-base">Report Access</h3>
          <p className="text-xs text-slate-500">
            {isDebrief ? "Add documents or upload a revised report" : "Upload the final PDF and send secure download links"}
          </p>
        </div>
        {hasUploads && (
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <CheckCircle2 size={13} className="text-green-500"/>
            <span>{uploads.length} document{uploads.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Debrief Meeting Room */}
      <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Video size={15} className="text-green-700 shrink-0"/>
          <p className="text-sm font-semibold text-green-900">Debrief Meeting Room</p>
          {debriefMeetingUrl && !editingDebriefUrl && (
            <Badge className="ml-auto text-[10px] bg-green-100 text-green-800 border-green-300 font-medium">Link saved</Badge>
          )}
        </div>
        <p className="text-xs text-green-700">
          {debriefMeetingUrl
            ? "A virtual meeting link is saved and will be included in the report delivery email."
            : "Generate a meeting room instantly, or paste a Zoom or Teams link. Families will receive a branded join link in the report email."}
        </p>

        {debriefMeetingUrl && !editingDebriefUrl ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-white rounded-lg border border-green-200 px-3 py-2">
              <span className="text-xs text-slate-600 truncate flex-1">{debriefMeetingUrl}</span>
              <button
                className="shrink-0 text-slate-400 hover:text-slate-700"
                onClick={() => { navigator.clipboard.writeText(debriefMeetingUrl); toast({ title: "Link copied" }); }}>
                <Copy size={13}/>
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {debriefMeetingUrl && (
                <Button size="sm"
                  className="h-7 text-xs bg-green-700 hover:bg-green-800 text-white gap-1"
                  onClick={() => window.open(debriefMeetingUrl, "_blank")}>
                  <Video size={11}/> Join as Host
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs border-green-300 text-green-800 hover:bg-green-100"
                onClick={() => { setDebriefUrlDraft(debriefMeetingUrl); setEditingDebriefUrl(true); }}>
                <Pencil size={11} className="mr-1"/> Edit
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleSaveDebriefUrl(null)} disabled={savingDebriefUrl}>
                <Trash2 size={11} className="mr-1"/> Clear
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {!showManualPaste ? (
              <>
                <Button
                  size="sm"
                  className="w-full bg-green-700 hover:bg-green-800 text-white gap-2"
                  onClick={handleGenerateDebriefRoom}
                  disabled={generatingDebriefRoom || savingDebriefUrl}
                >
                  {generatingDebriefRoom ? <RefreshCw size={14} className="animate-spin"/> : <Video size={14}/>}
                  {generatingDebriefRoom ? "Creating room…" : "Generate Debrief Room"}
                </Button>
                <button
                  className="text-[10px] text-green-700 underline underline-offset-2 hover:text-green-900 w-full text-center"
                  onClick={() => setShowManualPaste(true)}
                >
                  Paste a Zoom or Teams link instead
                </button>
              </>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700">Paste meeting link</p>
                <Input
                  placeholder="https://zoom.us/j/... or Teams link"
                  value={debriefUrlDraft}
                  onChange={e => setDebriefUrlDraft(e.target.value)}
                  className="h-8 text-sm bg-white border-green-200 focus:border-green-400"
                />
                <div className="flex gap-2">
                  <Button size="sm"
                    className="h-7 text-xs bg-green-700 hover:bg-green-800 text-white"
                    onClick={() => handleSaveDebriefUrl(debriefUrlDraft.trim() || null)}
                    disabled={savingDebriefUrl || !debriefUrlDraft.trim()}>
                    {savingDebriefUrl ? <RefreshCw size={11} className="mr-1 animate-spin"/> : null}
                    Save Link
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs"
                    onClick={() => { setShowManualPaste(false); setEditingDebriefUrl(false); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {editingDebriefUrl && !showManualPaste && (
              <Button size="sm" variant="ghost" className="h-7 text-xs w-full"
                onClick={() => setEditingDebriefUrl(false)}>Cancel</Button>
            )}
          </div>
        )}

        {/* Debrief date / time */}
        <div className="pt-2 border-t border-green-100 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700">Debrief Date &amp; Time</p>
          {debriefMeetingDate && debriefDateDraft === "" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-700 flex-1">{debriefMeetingDate}</span>
              <button
                onClick={() => setDebriefDateDraft("edit")}
                className="text-[10px] text-green-700 underline underline-offset-2 hover:text-green-900"
              >Edit</button>
              <button
                onClick={() => handleSaveDebriefDate(null)}
                disabled={savingDebriefDate}
                className="text-[10px] text-red-500 underline underline-offset-2 hover:text-red-700"
              >Clear</button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <input
                type="datetime-local"
                value={debriefDateDraft === "edit" ? "" : debriefDateDraft}
                onChange={e => setDebriefDateDraft(e.target.value)}
                className="w-full rounded-md border border-green-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-400 h-8"
              />
              <select
                value={debriefTz}
                onChange={e => setDebriefTz(e.target.value)}
                className="w-full rounded-md border border-green-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-400 h-8"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-green-700 hover:bg-green-800 text-white px-3"
                  onClick={() => {
                    if (!debriefDateDraft || debriefDateDraft === "edit") return;
                    const [datePart, timePart] = debriefDateDraft.split("T");
                    const [y, mo, d] = datePart.split("-").map(Number);
                    const [h, mi] = (timePart || "00:00").split(":").map(Number);
                    const date = new Date(y, mo - 1, d, h, mi);
                    const tzAbbr = getTzAbbr(debriefTz, date);
                    const formatted = date.toLocaleString("en-SG", {
                      weekday: "long", year: "numeric", month: "long", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    }) + " " + tzAbbr;
                    handleSaveDebriefDate(formatted);
                  }}
                  disabled={savingDebriefDate || !debriefDateDraft || debriefDateDraft === "edit"}
                >
                  {savingDebriefDate ? "Saving…" : "Save"}
                </Button>
                {debriefMeetingDate && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDebriefDateDraft("")}>Cancel</Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Debrief Invitation — available in final_review and debrief phases */}
      {!isLocked && (
        <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail size={15} className="text-green-700 shrink-0"/>
            <p className="text-sm font-semibold text-green-900">Send Debrief Invitation</p>
          </div>
          <p className="text-xs text-green-700">
            Sends each recipient the debrief meeting details and their report access link (if they have one).
          </p>

          {/* Saved token recipients */}
          {(parentToken || teacherToken) && (
            <div className="space-y-1.5">
              {parentToken && (
                <div className="flex items-center gap-2 bg-white/70 rounded-lg border border-green-100 px-3 py-1.5">
                  <UserPlus size={11} className="text-green-600 shrink-0"/>
                  <span className="text-[11px] text-slate-600 font-medium">Parent —</span>
                  <span className="text-[11px] text-slate-500 truncate">{parentToken.email}</span>
                </div>
              )}
              {teacherToken && (
                <div className="flex items-center gap-2 bg-white/70 rounded-lg border border-green-100 px-3 py-1.5">
                  <UserPlus size={11} className="text-green-600 shrink-0"/>
                  <span className="text-[11px] text-slate-600 font-medium">School —</span>
                  <span className="text-[11px] text-slate-500 truncate">{teacherToken.email}</span>
                </div>
              )}
            </div>
          )}

          {/* Extra recipients — always available */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-green-700">
              {parentToken || teacherToken ? "Additional recipients" : "Recipients"}
            </p>
            {debriefExtraEmails.map(email => (
              <div key={email} className="flex items-center gap-2 bg-white/70 rounded-lg border border-green-100 px-3 py-1.5">
                <UserPlus size={11} className="text-green-600 shrink-0"/>
                <span className="text-[11px] text-slate-500 truncate flex-1">{email}</span>
                <button onClick={() => setDebriefExtraEmails(prev => prev.filter(e => e !== email))} className="text-slate-400 hover:text-red-500">
                  <X size={11}/>
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="email"
                value={debriefExtraEmail}
                onChange={e => setDebriefExtraEmail(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const em = debriefExtraEmail.trim().toLowerCase();
                    if (em && em.includes("@") && !debriefExtraEmails.includes(em)) {
                      setDebriefExtraEmails(prev => [...prev, em]);
                      setDebriefExtraEmail("");
                    }
                  }
                }}
                placeholder="Add email address…"
                className="flex-1 rounded-md border border-green-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-400 h-7"
              />
              <button
                onClick={() => {
                  const em = debriefExtraEmail.trim().toLowerCase();
                  if (em && em.includes("@") && !debriefExtraEmails.includes(em)) {
                    setDebriefExtraEmails(prev => [...prev, em]);
                    setDebriefExtraEmail("");
                  }
                }}
                className="text-xs text-green-700 font-medium px-2 border border-green-300 rounded-md bg-white hover:bg-green-50 h-7"
              >Add</button>
            </div>
          </div>

          {!debriefMeetingUrl && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={12} className="shrink-0"/>
              Save a debrief meeting link above before sending.
            </div>
          )}

          <Button
            size="sm"
            className="w-full bg-green-700 hover:bg-green-800 text-white gap-2"
            onClick={handleSendDebriefInvitation}
            disabled={sendingDebriefInvite || !debriefMeetingUrl || (!parentToken && !teacherToken && debriefExtraEmails.length === 0)}
          >
            {sendingDebriefInvite
              ? <><RefreshCw size={14} className="animate-spin"/> Sending…</>
              : <><SendHorizonal size={14}/> Send Debrief Invitation</>
            }
          </Button>
        </div>
      )}

      {/* Uploaded files list */}
      {hasUploads && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Uploaded Documents</p>
          <div className="space-y-1.5">
            {uploads.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                <FileText size={14} className="text-indigo-400 shrink-0"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{u.label || u.filename}</p>
                  {u.label && <p className="text-[10px] text-slate-400 truncate">{u.filename}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {i === uploads.length - 1 && (
                    <Badge variant="outline" className="text-indigo-600 border-indigo-200 text-[10px]">Latest</Badge>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {new Date(u.uploadedAt).toLocaleDateString()}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-slate-500 hover:text-indigo-600"
                    onClick={async () => {
                      const r = await fetch(`${BASE}/cases/${caseId}/report-access/uploads/${u.id}/view`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
                      });
                      if (!r.ok) return;
                      const blob = await r.blob();
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    }}
                  >
                    <ExternalLink size={12} className="mr-1" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-slate-400 hover:text-red-600"
                    disabled={deletingUploadId === u.id}
                    onClick={async () => {
                      if (!confirm(`Delete "${u.label || u.filename}"? This cannot be undone.`)) return;
                      setDeletingUploadId(u.id);
                      try {
                        await fetch(`${BASE}/cases/${caseId}/report-access/uploads/${u.id}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${localStorage.getItem("raos_token")}` },
                        });
                        await fetchStatus();
                      } finally {
                        setDeletingUploadId(null);
                      }
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phase gate — locked before final_review */}
      {isLocked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <Clock size={16} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Not available yet</p>
            <p className="text-xs text-amber-700 mt-0.5">
              The report can only be sent once the case reaches <strong>Final Review</strong>. Advance the case through the remaining phases to unlock this section.
            </p>
          </div>
        </div>
      )}

      {/* Upload form */}
      <div className={cn(
        "space-y-4 border border-dashed rounded-xl p-5",
        isLocked
          ? "border-slate-200 bg-slate-50 opacity-40 pointer-events-none select-none"
          : "border-slate-300 bg-slate-50"
      )}>
        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
          <FilePlus2 size={13}/>
          {hasUploads ? "Add Supplementary Documents" : "Upload Final Report"}
        </p>

        {/* Google Doc auto-import — only show when no report attached yet */}
        {workingDocUrl && !hasUploads && (
          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <ExternalLink size={14} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-blue-800 mb-0.5">Import directly from your working document</p>
              <p className="text-xs text-blue-700">Click below to automatically export the Google Doc as PDF and attach it here, ready to send.</p>
            </div>
            <Button
              size="sm"
              disabled={isImporting}
              onClick={handleImportGoogleDoc}
              className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white shrink-0"
            >
              {isImporting ? "Importing…" : "Auto-import"}
            </Button>
          </div>
        )}

        {/* File picker */}
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">File (PDF or other document)</Label>
          <label className={cn(
            "flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors",
            selectedFile ? "border-indigo-300 bg-indigo-50" : "border-slate-300 bg-white hover:border-indigo-300"
          )}>
            <Upload size={16} className={selectedFile ? "text-indigo-500" : "text-slate-400"} />
            <span className={cn("text-sm", selectedFile ? "text-indigo-700 font-medium" : "text-slate-400")}>
              {selectedFile ? selectedFile.name : "Choose file…"}
            </span>
            <input type="file" accept=".pdf,.doc,.docx,.xlsx,.xls" className="hidden"
              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        {/* Document label */}
        <div>
          <Label className="text-xs text-slate-600 mb-1 block">
            Document label <span className="text-slate-400">(optional)</span>
          </Label>
          <Input
            value={fileLabel}
            onChange={e => setFileLabel(e.target.value)}
            placeholder="e.g. Assessment Report, Behavior Plan, IEP…"
            className="h-9 text-sm"
          />
        </div>

        {/* First-upload fields (only shown in final_review) */}
        {!isDebrief && (
          <>
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

            <div className={cn("flex items-start gap-3 rounded-xl border p-3 transition-colors",
              notifyTeam ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"
            )}>
              <Checkbox id="notifyTeam" checked={notifyTeam}
                onCheckedChange={v => setNotifyTeam(!!v)} className="mt-0.5" />
              <div className="space-y-0.5">
                <label htmlFor="notifyTeam" className="text-sm font-medium text-slate-800 cursor-pointer flex items-center gap-1.5">
                  <Bell size={13} className={notifyTeam ? "text-blue-500" : "text-slate-400"} />
                  Notify assigned team
                </label>
                <p className="text-xs text-slate-500">
                  The assigned invigilator and psychometrician will receive a link to open this case in RAOS.
                </p>
              </div>
            </div>

            <div className={cn("flex items-start gap-3 rounded-xl border p-3 transition-colors",
              sendInternalCopy ? "bg-violet-50 border-violet-200" : "bg-white border-slate-200"
            )}>
              <Checkbox id="sendInternalCopy" checked={sendInternalCopy}
                onCheckedChange={v => setSendInternalCopy(!!v)} className="mt-0.5" />
              <div className="space-y-0.5">
                <label htmlFor="sendInternalCopy" className="text-sm font-medium text-slate-800 cursor-pointer">
                  Send report copy to Assessment Invigilator &amp; Psychometrician
                </label>
                <p className="text-xs text-slate-500">
                  Each will receive their own secure download link — the same as the parent and school receive.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-600">Additional recipients (parent-consented)</Label>
                <button type="button" onClick={addRecipient}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium">
                  <UserPlus size={12}/> Add recipient
                </button>
              </div>
              {additionalRecipients.length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  Add anyone the parent has consented to share with. They will receive a direct download link immediately.
                </p>
              )}
              {additionalRecipients.map((rec, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <Input placeholder="Name (optional)" value={rec.name}
                    onChange={e => updateRecipient(i, "name", e.target.value)}
                    className="h-8 text-sm w-36 shrink-0" />
                  <Input placeholder="email@example.com" type="email" value={rec.email}
                    onChange={e => updateRecipient(i, "email", e.target.value)}
                    className="h-8 text-sm flex-1" />
                  <button type="button" onClick={() => removeRecipient(i)}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                    <X size={13}/>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Re-upload in debrief: notify existing recipients */}
        {isDebrief && (
          <div className={cn("flex items-start gap-3 rounded-xl border p-3 transition-colors",
            notifyRecipients ? "bg-blue-50 border-blue-200" : "bg-white border-slate-200"
          )}>
            <Checkbox id="notifyRecipients" checked={notifyRecipients}
              onCheckedChange={v => setNotifyRecipients(!!v)} className="mt-0.5" />
            <div className="space-y-0.5">
              <label htmlFor="notifyRecipients" className="text-sm font-medium text-slate-800 cursor-pointer flex items-center gap-1.5">
                <Bell size={13} className={notifyRecipients ? "text-blue-500" : "text-slate-400"} />
                Notify all recipients of this new document
              </label>
              <p className="text-xs text-slate-500">
                All existing recipients will receive an email letting them know a new document is available. Their existing download links still work.
              </p>
            </div>
          </div>
        )}

        {/* Meeting link gate warning */}
        {!isDebrief && !debriefMeetingUrl && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
            <AlertTriangle size={13} className="text-amber-500 shrink-0"/>
            <span>A debrief meeting link must be saved before sending or previewing the report email.</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={handleUpload} disabled={isUploading || !selectedFile || (!isDebrief && !!pEmail && !debriefMeetingUrl)} className="gap-2">
            <SendHorizonal size={15}/>
            {isUploading ? "Sending…"
              : isDebrief ? "Add Document"
              : "Send Links"}
          </Button>
          {!isDebrief && (
            <Button
              variant="outline"
              onClick={handleSendTestEmail}
              disabled={isSendingTest || !debriefMeetingUrl}
              className="gap-2 text-slate-600 border-slate-300 hover:bg-slate-50 disabled:opacity-40"
            >
              <Mail size={14}/>
              {isSendingTest ? "Sending…" : "Preview Email"}
            </Button>
          )}
        </div>
      </div>

      {/* Token (link) status */}
      {(parentToken || teacherToken || otherTokens.length > 0 || testPreviewToken) && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Link Status</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {parentToken && <TokenCard token={parentToken} />}
            {teacherToken && <TokenCard token={teacherToken} />}
            {otherTokens.map(t => <TokenCard key={t.id} token={t} />)}
            {testPreviewToken && <TokenCard token={testPreviewToken} />}
          </div>
        </div>
      )}

      {/* ZIP archive download (admin, debrief only) */}
      {isDebrief && hasUploads && (
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Download Full Case Archive</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Downloads a ZIP containing all uploaded documents, form responses, scores, and case data for offline storage.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleArchiveDownload} className="gap-2 shrink-0">
              <Archive size={14}/>
              Download ZIP
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
