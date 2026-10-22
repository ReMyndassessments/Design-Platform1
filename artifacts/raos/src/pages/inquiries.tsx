import { useState } from "react";
import { useLocation } from "wouter";
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
import { School, User, Mail, Phone, Calendar, Building2, Trash2, SendHorizonal, ChevronDown, ChevronUp, CheckCircle2, Copy, Link, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

interface Inquiry {
  id: string;
  inquiryType: "school" | "parent" | "partner_school" | "workshop_sales";
  status: "new" | "contacted" | "converted" | "closed";
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  wechatId: string | null;
  whatsappId: string | null;
  organisation: string | null;
  role: string | null;
  studentName: string | null;
  studentAge: string | null;
  yearGroup: string | null;
  message: string;
  // Partner school specific
  schoolType: string | null;
  schoolLocation: string | null;
  enrollment: string | null;
  currentSupport: string | null;
  howHeard: string | null;
  timeline: string | null;
  createdAt: string;
  workshopTitle?: string;
  paymentMethod?: "wechat_pay" | "alipay" | "credit_card";
  otherPaymentOptions?: string[];
  paymentReference?: string | null;
  paymentStatus?: string;
  receiptUploaded?: boolean;
  schoolSize?: string | null;
  areasOfInterest?: string[];
  schoolSupportChallenge?: string | null;
  interestedFutureLearning?: boolean;
  interestedSchoolTraining?: boolean;
  interestedAssessmentServices?: boolean;
  interestedPartnerSchool?: boolean;
  trainingOnly?: boolean;
  marketingConsent?: boolean;
  metadata?: Record<string, unknown> | null;
}

interface SycProgramSettings {
  open: boolean;
  maxSchools: number | null;
  closesAt: string | null;
  portalDurationDays: number;
  coreInstrumentEnabled: boolean;
  allowedExtensions: string[];
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

function SycAnalysisSummary({ value }: { value: unknown }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  const renderList = (title: string, items: unknown) => Array.isArray(items) && items.length > 0 ? (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-500">{title}</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{items.map((item, index) => <li key={`${title}-${index}`}>{String(item)}</li>)}</ul>
    </div>
  ) : null;
  return (
    <div className="space-y-3 text-sm">
      {typeof data.referralSummary === "string" && <p className="leading-6 text-slate-700">{data.referralSummary}</p>}
      {typeof data.primaryEducationalQuestion === "string" && <p><strong>Question for review:</strong> {data.primaryEducationalQuestion}</p>}
      {renderList("Reported strengths", data.studentStrengths)}
      {renderList("Reported concerns", data.observedConcerns)}
      {renderList("Possible interpretations to consider", data.interpretations)}
      {renderList("Other explanations to rule out", data.alternativeExplanations)}
      {typeof data.assessmentJustification === "string" && <p><strong>Form-selection rationale:</strong> {data.assessmentJustification}</p>}
      {renderList("Information still needed", data.missingInformation)}
      {renderList("Safety flags for human review", data.safetyFlags)}
      <p className="rounded-md bg-slate-50 p-2 text-xs text-slate-600">
        Suitability: {String(data.suitability ?? "not stated")} · Suggested extension: {String(data.recommendedExtension ?? "none")}
        {" · "}Administrator review required
      </p>
    </div>
  );
}

export default function InquiriesPage() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Inquiry | null>(null);

  // Send Referral Form invite state
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showSycSharePanel, setShowSycSharePanel] = useState(false);
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

  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [generatedInviteToken, setGeneratedInviteToken] = useState<string | null>(null);
  const sycApplicationLink = `${window.location.origin}/strengthen-your-core/apply`;
  const sycSettings = useQuery({
    queryKey: ["strengthen-core-program-admin"],
    queryFn: () => customFetch<SycProgramSettings>("/api/strengthen-core/program/admin"),
    enabled: showSycSharePanel,
  });
  const saveSycSettings = useMutation({
    mutationFn: (patch: Partial<SycProgramSettings>) => {
      const current = sycSettings.data;
      if (!current) throw new Error("Programme settings have not loaded.");
      return customFetch<SycProgramSettings>("/api/strengthen-core/program", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, ...patch }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["strengthen-core-program-admin"] }),
    onError: (error: Error) => toast({ title: "Could not update programme settings", description: error.message, variant: "destructive" }),
  });

  function callInviteApi(sendEmail: boolean) {
    return customFetch<{ success: boolean; link: string; inviteToken: string }>("/api/portal/send-referral-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...inviteForm,
        formId: selectedFormId,
        includeConsent,
        sendEmail,
        // Reuse the same invite token so we never create a duplicate
        ...(generatedInviteToken ? { existingToken: generatedInviteToken } : {}),
      }),
    });
  }

  const sendReferralInvite = useMutation({
    mutationFn: () => callInviteApi(true),
    onSuccess: (data) => {
      setGeneratedLink(data.link);
      setGeneratedInviteToken(data.inviteToken);
      setInviteSent(true);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send", description: err?.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const copyLinkOnly = useMutation({
    mutationFn: () => callInviteApi(false),
    onSuccess: (data) => {
      setGeneratedLink(data.link);
      setGeneratedInviteToken(data.inviteToken);
      navigator.clipboard.writeText(data.link).then(() => {
        setLinkCopied("generated");
        setTimeout(() => setLinkCopied(null), 2000);
      });
    },
    onError: (err: any) => {
      toast({ title: "Failed to generate link", description: err?.message ?? "Please try again.", variant: "destructive" });
    },
  });

  const { data: inquiries = [], isLoading, isError } = useQuery<Inquiry[]>({
    queryKey: ["inquiries"],
    queryFn: () => customFetch<Inquiry[]>("/api/portal/inquiries"),
  });
  const allInquiries = inquiries.filter((inquiry) => inquiry.inquiryType !== "workshop_sales").sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const updateStatus = useMutation({
    mutationFn: ({ id, status, paymentConfirmed }: { id: string; status: string; paymentConfirmed?: boolean }) =>
      customFetch(`/api/portal/inquiries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(paymentConfirmed ? { paymentConfirmed: true } : {}) }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
    },
    onError: (err: any) => {
      toast({
        title: "Could not update inquiry",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
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

  const analyzeSycInquiry = useMutation({
    mutationFn: (id: string) => customFetch<{ analysis: Record<string, unknown> }>(`/api/strengthen-core/inquiries/${encodeURIComponent(id)}/analyze`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
    onError: (error: Error) => toast({ title: "AI analysis failed", description: error.message, variant: "destructive" }),
  });

  const startSycCase = useMutation({
    mutationFn: (id: string) => customFetch<{ caseId: string }>(`/api/portal/inquiries/${encodeURIComponent(id)}/start-syc-case`, { method: "POST" }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
      setLocation(`/cases/${encodeURIComponent(data.caseId)}`);
    },
      onError: (error: Error) => toast({ title: "Could not open the RAOS case", description: error.message, variant: "destructive" }),
  });

  const statusFiltered = filter === "all" ? allInquiries : allInquiries.filter((i) => i.status === filter);
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase();
  const filtered = normalizedSearchTerm
    ? statusFiltered.filter((inquiry) => {
        const searchableText = [
          inquiry.contactName,
          inquiry.contactEmail,
          inquiry.contactPhone,
          inquiry.organisation,
          inquiry.role,
          inquiry.message,
          inquiry.workshopTitle,
          inquiry.metadata?.sourceLabel,
          inquiry.metadata?.intakeData ? JSON.stringify(inquiry.metadata.intakeData) : "",
        ].filter(Boolean).join(" ").toLocaleLowerCase();
        return searchableText.includes(normalizedSearchTerm);
      })
    : statusFiltered;

  const counts = {
    all: allInquiries.length,
    new: allInquiries.filter((i) => i.status === "new").length,
    contacted: allInquiries.filter((i) => i.status === "contacted").length,
    converted: allInquiries.filter((i) => i.status === "converted").length,
    closed: allInquiries.filter((i) => i.status === "closed").length,
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
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Inquiries</h1>
          <p className="text-slate-500 mt-1">
            RAOS assessment inquiries, including Strengthen Your Core
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setShowSycSharePanel((value) => !value)}
            className="shrink-0 gap-2"
          >
            Strengthen Your Core link / QR
            {showSycSharePanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </Button>
          <Button
            onClick={() => { setShowInviteForm(v => !v); setInviteSent(false); }}
            className="shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <SendHorizonal size={15} />
            Send Referral Form
            {showInviteForm ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </Button>
        </div>
      </div>

      {showSycSharePanel && (
        <Card className="border-teal-200 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Strengthen Your Core · promotional intake link</CardTitle>
            <p className="text-sm text-slate-500">This public link submits to the same RAOS Inquiries queue. It does not create a separate application queue.</p>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {sycSettings.isLoading ? (
                  <span className="text-sm text-slate-500">Checking programme availability…</span>
                ) : sycSettings.isError ? (
                  <span className="text-sm text-red-600">Could not load programme settings.</span>
                ) : (
                  <>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sycSettings.data?.open ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                      Applications {sycSettings.data?.open ? "open" : "closed"}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sycSettings.data?.coreInstrumentEnabled ? "bg-teal-100 text-teal-800" : "bg-amber-100 text-amber-800"}`}>
                      Core assessment {sycSettings.data?.coreInstrumentEnabled ? "enabled" : "disabled"}
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(sycApplicationLink).then(() => toast({ title: "Link copied", description: "The promotional application link is ready to share." }))}
                >
                  <Copy size={14} className="mr-2" /> Copy promotional link
                </Button>
                {sycSettings.data && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saveSycSettings.isPending}
                      onClick={() => saveSycSettings.mutate({ open: !sycSettings.data!.open })}
                    >
                      {sycSettings.data.open ? "Close intake" : "Open intake"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saveSycSettings.isPending}
                      title="Enable only when the instrument and programme are operationally ready."
                      onClick={() => saveSycSettings.mutate({ coreInstrumentEnabled: !sycSettings.data!.coreInstrumentEnabled })}
                    >
                      {sycSettings.data.coreInstrumentEnabled ? "Disable core assessment" : "Enable core assessment"}
                    </Button>
                  </>
                )}
              </div>
              <div className="break-all rounded-lg border bg-slate-50 p-3 font-mono text-xs text-slate-700">{sycApplicationLink}</div>
              <p className="text-xs leading-5 text-slate-500">
                Public portal inquiries and this detailed promotional intake are both stored in RAOS Inquiries. The source controls AI review criteria and the next standard RAOS forms.
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 rounded-xl border bg-white p-4">
              <QRCodeSVG value={sycApplicationLink} size={148} level="M" />
              <span className="text-xs text-slate-500">Scan to open the promotional intake</span>
            </div>
          </CardContent>
        </Card>
      )}

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
              {includeConsent && <span className="ml-auto text-xs text-emerald-600 font-normal">+ parent/guardian consent</span>}
            </button>

            {/* Contact details + actions */}
            {inviteSent && generatedLink ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 size={20} className="text-emerald-500 shrink-0"/>
                  <span className="font-medium text-sm">Invite sent to {inviteForm.toEmail}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-500">Portal link (you can also share this directly):</p>
                  <div className="flex items-center gap-2 bg-white border border-emerald-200 rounded-lg px-3 py-2">
                    <Link size={13} className="text-emerald-400 shrink-0"/>
                    <span className="text-xs text-slate-500 truncate flex-1 font-mono select-all">{generatedLink}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedLink); setLinkCopied("done"); setTimeout(() => setLinkCopied(null), 2000); }}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
                    >
                      {linkCopied === "done" ? <CheckCircle2 size={12}/> : <Copy size={12}/>}
                      {linkCopied === "done" ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => { setInviteSent(false); setGeneratedLink(null); setGeneratedInviteToken(null); setIncludeConsent(false); setInviteForm({ toName: "", toEmail: "", schoolName: "", note: "" }); }}
                >
                  Send another
                </Button>
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
                  <label className="text-xs font-medium text-slate-600">Personal note <span className="text-slate-400">(optional — included in email)</span></label>
                  <Textarea
                    placeholder="e.g. It was great speaking with you last week…"
                    value={inviteForm.note}
                    onChange={e => setInviteForm(f => ({ ...f, note: e.target.value }))}
                    className="text-sm resize-none"
                    rows={2}
                  />
                </div>

                {/* Generated link preview (after copy-only action) */}
                {generatedLink && !inviteSent && (
                  <div className="flex items-center gap-2 bg-white border border-indigo-200 rounded-lg px-3 py-2">
                    <Link size={13} className="text-indigo-400 shrink-0"/>
                    <span className="text-xs text-slate-500 truncate flex-1 font-mono select-all">{generatedLink}</span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedLink!); setLinkCopied("generated"); setTimeout(() => setLinkCopied(null), 2000); }}
                      className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-indigo-100 hover:bg-indigo-200 text-indigo-700"
                    >
                      {linkCopied === "generated" ? <CheckCircle2 size={12} className="text-emerald-600"/> : <Copy size={12}/>}
                      {linkCopied === "generated" ? "Copied!" : "Copy again"}
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                    disabled={!inviteForm.toName.trim() || !inviteForm.toEmail.trim() || sendReferralInvite.isPending || copyLinkOnly.isPending}
                    onClick={() => sendReferralInvite.mutate()}
                  >
                    <SendHorizonal size={14}/>
                    {sendReferralInvite.isPending ? "Sending…" : "Send Email Invite"}
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    disabled={!inviteForm.toName.trim() || !inviteForm.toEmail.trim() || copyLinkOnly.isPending || sendReferralInvite.isPending}
                    onClick={() => copyLinkOnly.mutate()}
                  >
                    {copyLinkOnly.isPending ? (
                      <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin"/> Generating…</span>
                    ) : linkCopied === "generated" ? (
                      <><CheckCircle2 size={14} className="text-emerald-600"/> Copied!</>
                    ) : (
                      <><Copy size={14}/> Copy Link Only</>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowInviteForm(false); setGeneratedLink(null); setInviteSent(false); setGeneratedInviteToken(null); setIncludeConsent(false); }}>Cancel</Button>
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

      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <Input
          type="search"
          aria-label="Search inquiries"
          placeholder="Search school, contact, email, concern, or intake"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <Card className="border-none shadow-md">
          <CardContent className="py-16 text-center text-slate-400">
            {normalizedSearchTerm ? "No inquiries match that search." : "No inquiries found."}
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
                          : inq.inquiryType === "partner_school"
                          ? "bg-purple-100"
                          : inq.inquiryType === "workshop_sales"
                          ? "bg-amber-100"
                          : "bg-teal-100"
                      }`}
                    >
                      {inq.inquiryType === "school" ? (
                        <School size={18} className="text-indigo-600" />
                      ) : inq.inquiryType === "partner_school" ? (
                        <Building2 size={18} className="text-purple-600" />
                        ) : inq.inquiryType === "workshop_sales" ? (
                          <Calendar size={18} className="text-amber-600" />
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
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          inq.inquiryType === "partner_school"
                            ? "bg-purple-100 text-purple-700"
                            : "text-slate-400"
                        }`}>
                          {inq.inquiryType === "partner_school" ? "Partner School" : inq.inquiryType === "workshop_sales" ? "Workshop Sales" : inq.inquiryType}
                        </span>
                        {inq.metadata?.productId === "STRENGTHEN_CORE" && inq.metadata.source === "promotional_link" && (
                          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
                            Strengthen Your Core · Promotional
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {inq.workshopTitle ? `${inq.workshopTitle} · ` : inq.organisation ? `${inq.organisation} · ` : ""}{inq.contactEmail}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:block">
                      {formatDate(inq.createdAt)}
                    </span>
                    <Select
                      value={inq.status}
                      onValueChange={(val) => {
                        if (inq.inquiryType === "workshop_sales" && val === "converted") {
                          const confirmed = window.confirm(
                            "Confirm that this workshop payment has been received. This will add the person to the paid attendee roster and send their registration confirmation."
                          );
                          if (!confirmed) return;
                          updateStatus.mutate({ id: inq.id, status: val, paymentConfirmed: true });
                          return;
                        }
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
          {inq.metadata?.productId === "STRENGTHEN_CORE" && inq.metadata.source === "promotional_link" && (
            <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 p-4" data-testid={`syc-inquiry-${inq.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-teal-900">Strengthen Your Core · Promotional application</h4>
                  <p className="mt-1 text-xs text-teal-800">This inquiry came through the designated school promotional link and uses the existing RAOS inquiry queue.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={analyzeSycInquiry.isPending}
                    onClick={(event) => { event.stopPropagation(); analyzeSycInquiry.mutate(inq.id); }}
                  >
                    {analyzeSycInquiry.isPending ? "Analyzing…" : "Generate review suggestions"}
                  </Button>
                  {inq.metadata.source === "promotional_link" && !inq.metadata.caseId && (
                    <Button
                      size="sm"
                      onClick={(event) => { event.stopPropagation(); startSycCase.mutate(inq.id); }}
                      disabled={startSycCase.isPending}
                      className="bg-teal-700 text-white hover:bg-teal-800"
                    >
                      {startSycCase.isPending ? "Opening…" : "Create RAOS case"}
                    </Button>
                  )}
                  {typeof inq.metadata.caseId === "string" && (
                    <>
                      <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); setLocation(`/cases/${encodeURIComponent(String(inq.metadata?.caseId))}`); }}>
                        Open RAOS case
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {inq.metadata.source === "promotional_link" && Boolean(inq.metadata.intakeData) && (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg bg-white p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted school referral details</p>
                    <div className="max-h-64 space-y-2 overflow-auto">
                      {Object.entries(inq.metadata.intakeData as Record<string, unknown>).map(([key, value]) => (
                        <div key={key} className="border-b border-slate-100 pb-2 last:border-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase())}</p>
                          <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{typeof value === "string" ? value : JSON.stringify(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {Boolean(inq.metadata.aiAnalysis) && (
                    <div className="rounded-lg bg-white p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">AI review suggestions · human review required</p>
                      <div className="max-h-64 overflow-auto"><SycAnalysisSummary value={inq.metadata.aiAnalysis} /></div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {inq.inquiryType === "partner_school" ? (
                    // Partner school expanded view
                    <div className="mt-4 space-y-5">
                      <div className="grid sm:grid-cols-2 gap-5">
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">School</h4>
                          <div className="space-y-2">
                            {inq.organisation && <InfoRow icon={Building2} label="Name" value={inq.organisation} />}
                            {inq.schoolType && <InfoRow icon={Building2} label="Type" value={inq.schoolType} />}
                            {inq.schoolLocation && <InfoRow icon={Building2} label="Location" value={inq.schoolLocation} />}
                            {inq.enrollment && <InfoRow icon={User} label="Enrollment" value={inq.enrollment} />}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contact</h4>
                          <div className="space-y-2">
                            <InfoRow icon={Mail} label="Email" value={inq.contactEmail} href={`mailto:${inq.contactEmail}`} />
                            {inq.role && <InfoRow icon={User} label="Title" value={inq.role} />}
                            {inq.contactPhone && <InfoRow icon={Phone} label="Phone" value={inq.contactPhone} />}
                            {inq.wechatId && <InfoRow icon={User} label="WeChat" value={inq.wechatId} />}
                            {inq.whatsappId && <InfoRow icon={Phone} label="WhatsApp" value={inq.whatsappId} />}
                            <InfoRow icon={Calendar} label="Submitted" value={formatDate(inq.createdAt)} />
                          </div>
                        </div>
                      </div>
                      {inq.currentSupport && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Current Support</h4>
                          <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{inq.currentSupport}</div>
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Reason for Interest</h4>
                        <div className="bg-purple-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{inq.message}</div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {inq.timeline && (
                          <div className="bg-slate-50 rounded-xl px-4 py-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Timeline</p>
                            <p className="text-sm text-slate-700">{inq.timeline}</p>
                          </div>
                        )}
                        {inq.howHeard && (
                          <div className="bg-slate-50 rounded-xl px-4 py-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">How They Heard</p>
                            <p className="text-sm text-slate-700">{inq.howHeard}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // School / parent expanded view
                    <>
                      <div className="grid sm:grid-cols-2 gap-5 mt-4">
                        <div className="space-y-3">
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contact Details</h4>
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
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Student Details</h4>
                            <div className="space-y-2">
                              {inq.studentName && <InfoRow icon={User} label="Name" value={inq.studentName} />}
                              {inq.studentAge && <InfoRow icon={User} label="Age" value={inq.studentAge} />}
                              {inq.yearGroup && <InfoRow icon={User} label="Year Group" value={inq.yearGroup} />}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-5">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Message / Reason</h4>
                        <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{inq.message}</div>
                      </div>
                      {inq.inquiryType === "workshop_sales" && (
                        <div className="mt-5 space-y-4">
                          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">School information and interests</h4>
                            <div className="space-y-1 text-sm text-slate-700">
                              {inq.schoolType && <p><strong>School type:</strong> {inq.schoolType}</p>}
                              {inq.schoolSize && <p><strong>Approximate students:</strong> {inq.schoolSize}</p>}
                              {!!inq.areasOfInterest?.length && <p><strong>Areas of interest:</strong> {inq.areasOfInterest.join(", ")}</p>}
                              {inq.schoolSupportChallenge && <p><strong>School need:</strong> {inq.schoolSupportChallenge}</p>}
                              <p><strong>Future interest:</strong> {[
                                inq.interestedFutureLearning && "Free professional learning",
                                inq.interestedSchoolTraining && "Dedicated school training",
                                inq.interestedAssessmentServices && "Assessment services",
                                inq.interestedPartnerSchool && "Partner School",
                                inq.trainingOnly && "This workshop only",
                              ].filter(Boolean).join(", ") || "None selected"}</p>
                              <p><strong>Marketing consent:</strong> {inq.marketingConsent ? "Yes" : "No"}</p>
                            </div>
                          </div>
                          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                            <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">Payment preference</h4>
                            <p className="text-sm font-semibold text-slate-800">
                              {inq.paymentMethod === "wechat_pay" ? "WeChat Pay" : inq.paymentMethod === "alipay" ? "Alipay" : "Credit Card"}
                            </p>
                            {inq.paymentReference && <p className="mt-1 text-sm text-slate-600">Reference: {inq.paymentReference}</p>}
                            <p className="mt-1 text-xs text-slate-500">
                              {inq.receiptUploaded ? "Receipt screenshot uploaded — payment requires administrator verification." : "No immediate payment receipt; contact the registrant with payment instructions."}
                            </p>
                            {inq.receiptUploaded && (
                              <a href={`/api/training/workshops/manual-sales-inquiries/${inq.id}/receipt`} target="_blank" rel="noreferrer"
                                className="mt-3 inline-block text-sm font-semibold text-teal-700 underline">
                                View receipt screenshot
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
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
