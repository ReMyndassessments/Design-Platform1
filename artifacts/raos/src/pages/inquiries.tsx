import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { School, User, Mail, Phone, Calendar, Building2, Trash2, SendHorizonal, ChevronDown, ChevronUp, CheckCircle2, Copy, Link } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface Inquiry {
  id: string;
  inquiryType: "school" | "parent";
  status: "new" | "contacted" | "converted" | "closed";
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  organisation: string | null;
  role: string | null;
  studentName: string | null;
  studentAge: string | null;
  yearGroup: string | null;
  message: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  contacted: { label: "Contacted", color: "bg-amber-100 text-amber-700 border-amber-200" },
  converted: { label: "Converted", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InquiriesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Inquiry | null>(null);

  // Send Referral Form invite state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [linkCopied, setLinkCopied] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState("REFERRAL");
  const [includeConsent, setIncludeConsent] = useState(false);
  const [inviteForm, setInviteForm] = useState({ toName: "", toEmail: "", schoolName: "", note: "" });

  const FORM_OPTIONS = [
    { id: "REFERRAL",          label: "Referral — School" },
    { id: "REFERRAL-CORP",     label: "Referral — Corporate" },
    { id: "REFERRAL-UNI",      label: "Referral — University" },
    { id: "REFERRAL-PARENT",   label: "Referral — Parent" },
    { id: "REFERRAL-BOARDING", label: "Referral — Boarding" },
  ];

  const referralLink  = `${window.location.origin}/tools/${selectedFormId}/preview`;
  const consentLink   = `${window.location.origin}/tools/CONSENT/preview`;

  function copyLink(url: string, key: string) {
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(key);
      setTimeout(() => setLinkCopied(null), 2000);
    });
  }

  const sendReferralInvite = useMutation({
    mutationFn: (data: typeof inviteForm) =>
      customFetch("/api/portal/send-referral-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, formId: selectedFormId, includeConsent }),
      }),
    onSuccess: () => {
      setInviteSent(true);
      setTimeout(() => {
        setInviteSent(false);
        setShowInviteForm(false);
        setInviteForm({ toName: "", toEmail: "", schoolName: "", note: "" });
      }, 2500);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send", description: err?.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const { data: inquiries = [], isLoading, isError } = useQuery<Inquiry[]>({
    queryKey: ["inquiries"],
    queryFn: () => customFetch<Inquiry[]>("/api/portal/inquiries"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      customFetch(`/api/portal/inquiries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
  });

  const deleteInquiry = useMutation({
    mutationFn: (id: string) =>
      customFetch(`/api/portal/inquiries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
      if (expanded === deleteTarget?.id) setExpanded(null);
      setDeleteTarget(null);
    },
  });

  const filtered = filter === "all" ? inquiries : inquiries.filter((i) => i.status === filter);

  const counts = {
    all: inquiries.length,
    new: inquiries.filter((i) => i.status === "new").length,
    contacted: inquiries.filter((i) => i.status === "contacted").length,
    converted: inquiries.filter((i) => i.status === "converted").length,
    closed: inquiries.filter((i) => i.status === "closed").length,
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  if (isError)
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-xl">
        Failed to load inquiries.
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Inquiries</h1>
          <p className="text-slate-500 mt-1">
            School and parent inquiries submitted via the portal
          </p>
        </div>
        <Button
          onClick={() => { setShowInviteForm(v => !v); setInviteSent(false); }}
          className="shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <SendHorizonal size={15} />
          Send Referral Form
          {showInviteForm ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </Button>
      </div>

      {/* Send Referral Form invite panel */}
      {showInviteForm && (
        <Card className="border-indigo-200 shadow-md bg-gradient-to-br from-indigo-50 to-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-indigo-900 flex items-center gap-2">
              <School size={16} className="text-indigo-600"/>
              Send Referral Form to a School
            </CardTitle>
            <p className="text-xs text-indigo-600 font-normal">
              They'll receive a branded ReMynd email with a direct link to submit a referral — no case file needed first.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Form selector */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">Select referral form</p>
              <div className="flex flex-wrap gap-1.5">
                {FORM_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setSelectedFormId(opt.id); setLinkCopied(null); }}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      selectedFormId === opt.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Consent form add-on toggle */}
            <button
              onClick={() => setIncludeConsent(v => !v)}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all",
                includeConsent
                  ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all",
                includeConsent ? "border-emerald-500 bg-emerald-500" : "border-slate-300 bg-white"
              )}>
                {includeConsent && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              <span>Also include Consent Form</span>
              {includeConsent && <span className="ml-auto text-xs text-emerald-600 font-normal">+ 1 form</span>}
            </button>

            {/* Link rows — always visible */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 bg-white/70 border border-indigo-200 rounded-lg px-3 py-2">
                <Link size={13} className="text-indigo-400 shrink-0"/>
                <span className="text-xs text-slate-500 truncate flex-1 font-mono select-all">{referralLink}</span>
                <button
                  onClick={() => copyLink(referralLink, "referral")}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
                >
                  {linkCopied === "referral" ? <CheckCircle2 size={12} className="text-emerald-600"/> : <Copy size={12}/>}
                  {linkCopied === "referral" ? "Copied!" : "Copy"}
                </button>
              </div>
              {includeConsent && (
                <div className="flex items-center gap-2 bg-white/70 border border-emerald-200 rounded-lg px-3 py-2">
                  <Link size={13} className="text-emerald-400 shrink-0"/>
                  <span className="text-xs text-slate-500 truncate flex-1 font-mono select-all">{consentLink}</span>
                  <button
                    onClick={() => copyLink(consentLink, "consent")}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md transition-colors bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                  >
                    {linkCopied === "consent" ? <CheckCircle2 size={12} className="text-emerald-600"/> : <Copy size={12}/>}
                    {linkCopied === "consent" ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 text-center">— or send a personalised email invite —</p>
            {inviteSent ? (
              <div className="flex items-center gap-3 py-4 justify-center text-emerald-700">
                <CheckCircle2 size={22} className="text-emerald-500"/>
                <span className="font-medium">Referral form sent successfully!</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Contact Name *</label>
                    <Input
                      placeholder="e.g. Ms. Sarah Lee"
                      value={inviteForm.toName}
                      onChange={e => setInviteForm(f => ({ ...f, toName: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Email Address *</label>
                    <Input
                      type="email"
                      placeholder="contact@school.edu"
                      value={inviteForm.toEmail}
                      onChange={e => setInviteForm(f => ({ ...f, toEmail: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">School Name <span className="text-slate-400">(optional)</span></label>
                  <Input
                    placeholder="e.g. Raffles International School"
                    value={inviteForm.schoolName}
                    onChange={e => setInviteForm(f => ({ ...f, schoolName: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">Personal note <span className="text-slate-400">(optional — included in the email)</span></label>
                  <Textarea
                    placeholder="e.g. It was great speaking with you last week…"
                    value={inviteForm.note}
                    onChange={e => setInviteForm(f => ({ ...f, note: e.target.value }))}
                    className="text-sm resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={!inviteForm.toName.trim() || !inviteForm.toEmail.trim() || sendReferralInvite.isPending}
                    onClick={() => sendReferralInvite.mutate(inviteForm)}
                  >
                    <SendHorizonal size={14}/>
                    {sendReferralInvite.isPending ? "Sending…" : "Send Invite"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowInviteForm(false)}>Cancel</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "new", "contacted", "converted", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filter === s
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {s === "all" ? "All" : STATUS_CONFIG[s].label}{" "}
            <span className="ml-1 opacity-60">{counts[s]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="border-none shadow-md">
          <CardContent className="py-16 text-center text-slate-400">
            No inquiries found.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filtered.map((inq) => {
          const isOpen = expanded === inq.id;
          const cfg = STATUS_CONFIG[inq.status];
          return (
            <Card key={inq.id} className="border-none shadow-md overflow-hidden">
              <CardHeader
                className="pb-3 cursor-pointer select-none"
                onClick={() => setExpanded(isOpen ? null : inq.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        inq.inquiryType === "school"
                          ? "bg-indigo-100"
                          : "bg-teal-100"
                      }`}
                    >
                      {inq.inquiryType === "school" ? (
                        <School size={18} className="text-indigo-600" />
                      ) : (
                        <User size={18} className="text-teal-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{inq.contactName}</CardTitle>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                          {inq.inquiryType}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">{inq.contactEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:block">
                      {formatDate(inq.createdAt)}
                    </span>
                    <Select
                      value={inq.status}
                      onValueChange={(val) => {
                        updateStatus.mutate({ id: inq.id, status: val });
                      }}
                    >
                      <SelectTrigger
                        className="h-8 text-xs w-32"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(inq);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isOpen && (
                <CardContent className="pt-0 pb-5 border-t border-slate-100">
                  <div className="grid sm:grid-cols-2 gap-5 mt-4">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        Contact Details
                      </h4>
                      <div className="space-y-2">
                        <InfoRow icon={Mail} label="Email" value={inq.contactEmail} href={`mailto:${inq.contactEmail}`} />
                        {inq.contactPhone && <InfoRow icon={Phone} label="Phone" value={inq.contactPhone} />}
                        {inq.organisation && <InfoRow icon={Building2} label="Organisation" value={inq.organisation} />}
                        {inq.role && <InfoRow icon={User} label="Role" value={inq.role} />}
                        <InfoRow icon={Calendar} label="Submitted" value={formatDate(inq.createdAt)} />
                      </div>
                    </div>

                    {(inq.studentName || inq.studentAge || inq.yearGroup) && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Student Details
                        </h4>
                        <div className="space-y-2">
                          {inq.studentName && <InfoRow icon={User} label="Name" value={inq.studentName} />}
                          {inq.studentAge && <InfoRow icon={User} label="Age" value={inq.studentAge} />}
                          {inq.yearGroup && <InfoRow icon={User} label="Year Group" value={inq.yearGroup} />}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Message / Reason
                    </h4>
                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {inq.message}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this inquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the inquiry from{" "}
              <span className="font-semibold text-slate-700">{deleteTarget?.contactName}</span>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteInquiry.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
      <span className="text-xs text-slate-500 w-20 flex-shrink-0">{label}</span>
      {href ? (
        <a href={href} className="text-xs text-primary hover:underline truncate">
          {value}
        </a>
      ) : (
        <span className="text-xs text-slate-700">{value}</span>
      )}
    </div>
  );
}
