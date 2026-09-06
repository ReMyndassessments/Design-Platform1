import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Save, Send, Calendar as CalendarIcon, Check, Mail, Eye, Image as ImageIcon, X } from "lucide-react";
import { customFetch } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useCreateCampaign, useCreateDraft, useUpdateDraft, useScheduleCampaign, 
  useSendCampaign, useSendTestCampaign, useProviderStatus, useDraft, 
  useTemplates, useCreateTemplate, useAssets, useDirectSend, useAudiencePreview 
} from "@/hooks/use-communications";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

export default function CommunicationsComposePage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/communications/compose/:id");
  const draftId = match ? params.id : null;
  
  const { data: draftData } = useDraft(draftId || "");
  const { data: statusData } = useProviderStatus();
  const { data: templatesData } = useTemplates();
  const { data: assetsData } = useAssets();
  const { data: workshopsData } = useQuery({
    queryKey: ["admin-workshops"],
    queryFn: () => customFetch("/api/training/workshops") as Promise<{ workshops: any[] }>,
  });
  const { data: casesData } = useQuery({
    queryKey: ["communications-case-options"],
    queryFn: () => customFetch("/api/cases") as Promise<any[]>,
  });
  const { data: inquiriesData } = useQuery({
    queryKey: ["communications-inquiry-options"],
    queryFn: () => customFetch("/api/portal/inquiries") as Promise<any[]>,
  });
  
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();
  const scheduleCampaign = useScheduleCampaign();
  const createDraft = useCreateDraft();
  const updateDraft = useUpdateDraft();
  const sendTest = useSendTestCampaign();
  const directSend = useDirectSend();
  const audiencePreview = useAudiencePreview();

  const createTemplate = useCreateTemplate();

  // Form State
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  
  // Structured Content
  const [previewText, setPreviewText] = useState("");
  const [greeting, setGreeting] = useState("Hello {{first_name}},");
  const [heading, setHeading] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  
  // Or raw HTML mode
  const [mode, setMode] = useState<"structured" | "html">("structured");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile" | "text">("desktop");
  const [html, setHtml] = useState("");
  
  const [kind, setKind] = useState<"operational" | "promotional">("operational");
  const [audienceSources, setAudienceSources] = useState<string[]>([]);
  const [workshopIds, setWorkshopIds] = useState<string[]>([]);
  const [seriesCohorts, setSeriesCohorts] = useState<string[]>([]);
  const [caseIds, setCaseIds] = useState<string[]>([]);
  const [inquiryIds, setInquiryIds] = useState<string[]>([]);
  const [manualRecipients, setManualRecipients] = useState("");
  
  // Contextual Direct Send
  const [isDirectSend, setIsDirectSend] = useState(false);
  const [directEmail, setDirectEmail] = useState("");
  const [directName, setDirectName] = useState("");
  const [directSourceType, setDirectSourceType] = useState("");
  const [directSourceId, setDirectSourceId] = useState("");
  
  // Modals
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testSent, setTestSent] = useState(false);
  
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  
  const [assetsModalOpen, setAssetsModalOpen] = useState(false);

  const provider = kind === "operational" ? "gmail" : "emailoctopus";
  const isProviderReady = statusData?.providers?.[provider]?.configured;

  // Preload from query params
  useEffect(() => {
    if (!draftId) {
      const searchParams = new URLSearchParams(window.location.search);
      const source = searchParams.get("source");
      const wId = searchParams.get("workshopId");
      
      const email = searchParams.get("email");
      const pName = searchParams.get("name");
      const type = searchParams.get("sourceType");
      const sId = searchParams.get("sourceId");
      
      if (email && type && sId) {
        setIsDirectSend(true);
        setDirectEmail(email);
        setDirectName(pName || "");
        setDirectSourceType(type);
        setDirectSourceId(sId);
        setName(`Direct message to ${email}`);
        setKind("operational");
      } else if (source) {
        setAudienceSources([source]);
        if (source === "workshops" && wId) {
          setWorkshopIds([wId]);
        }
      } else if (email) {
        // Just prefilling test email
        setTestEmail(email);
      }
    }
  }, [draftId]);

  // Load draft
  useEffect(() => {
    if (draftId && draftData?.draft) {
      const draft = draftData.draft;
      setName(draft.name);
      setSubject(draft.subject || "");
      
      // Try to parse structured content if possible, else fallback to HTML
      if (draft.html?.includes("data-structured=\"true\"")) {
        setMode("structured");
        // We could store structured data in audience json for drafts, but for now we'll just extract or just use HTML mode
        // Let's rely on audience.structured object if we save it there.
        if (draft.audience?.structured) {
          setPreviewText(draft.audience.structured.previewText || "");
          setGreeting(draft.audience.structured.greeting || "");
          setHeading(draft.audience.structured.heading || "");
          setBodyText(draft.audience.structured.bodyText || "");
          setCtaText(draft.audience.structured.ctaText || "");
          setCtaUrl(draft.audience.structured.ctaUrl || "");
        }
      } else {
        setMode("html");
        setHtml(draft.html || "");
      }
      
      if (draft.audience?.sources) setAudienceSources(draft.audience.sources);
      if (draft.audience?.workshopIds) setWorkshopIds(draft.audience.workshopIds);
      if (draft.audience?.seriesCohorts) setSeriesCohorts(draft.audience.seriesCohorts);
      if (draft.audience?.caseIds) setCaseIds(draft.audience.caseIds);
      if (draft.audience?.inquiryIds) setInquiryIds(draft.audience.inquiryIds);
      if (draft.audience?.manualRecipients) setManualRecipients(draft.audience.manualRecipients.join("\n"));
    }
  }, [draftId, draftData]);

  const generatedHtml = useMemo(() => {
    if (mode === "html") return html;
    
    // Safe structured HTML generation
    const paragraphs = bodyText.split("\n\n").map(p => `<p style="margin-bottom: 1em; color: #334155; line-height: 1.6;">${p.replace(/\n/g, "<br>")}</p>`).join("");
    
    return `
      <div data-structured="true" style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}</div>` : ""}
        ${heading ? `<h2 style="color: #0f172a; margin-bottom: 24px; font-size: 24px;">${heading}</h2>` : ""}
        ${greeting ? `<p style="color: #334155; font-size: 16px; margin-bottom: 20px;">${greeting}</p>` : ""}
        <div style="font-size: 15px;">
          ${paragraphs}
        </div>
        ${ctaText && ctaUrl ? `
          <div style="margin-top: 32px; margin-bottom: 32px;">
            <a href="${ctaUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              ${ctaText}
            </a>
          </div>
        ` : ""}
      </div>
    `;
  }, [mode, html, previewText, greeting, heading, bodyText, ctaText, ctaUrl]);

  const generatedText = useMemo(() => {
    return generatedHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }, [generatedHtml]);

  const handleSourceToggle = (source: string) => {
    setAudienceSources(prev => 
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    );
  };

  const handleWorkshopToggle = (wId: string) => {
    setWorkshopIds(prev => 
      prev.includes(wId) ? prev.filter(id => id !== wId) : [...prev, wId]
    );
  };

  const handleSeriesCohortToggle = (cohortId: string) => {
    setSeriesCohorts(prev =>
      prev.includes(cohortId) ? prev.filter(id => id !== cohortId) : [...prev, cohortId]
    );
  };

  const toggleSelectedId = (id: string, selected: string[], setSelected: (ids: string[]) => void) => {
    setSelected(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id]);
  };

  const getAudienceObject = () => ({
    sources: audienceSources,
    ...(kind === "operational" ? {
      manualRecipients: manualRecipients.split(/[\n,;]+/).map(email => email.trim()).filter(Boolean)
    } : {}),
    ...(audienceSources.includes("workshops") ? { workshopIds } : {}),
    ...(audienceSources.includes("training_series") ? { seriesCohorts } : {}),
    ...(audienceSources.includes("cases") ? { caseIds } : {}),
    ...(audienceSources.includes("inquiries") ? { inquiryIds } : {}),
    structured: mode === "structured" ? { previewText, greeting, heading, bodyText, ctaText, ctaUrl } : undefined
  });

  const handleSaveTemplate = () => {
    if (!name || !subject || !generatedHtml) return alert("Name, subject, and content are required to save a template.");
    createTemplate.mutate({ name, subject, html: generatedHtml }, {
      onSuccess: () => alert("Template saved!")
    });
  };

  const handleSaveDraft = () => {
    if (!name) return alert("Internal campaign name is required to save a draft.");
    const payload = { name, subject, html: generatedHtml, audience: getAudienceObject() };
    
    if (draftId) {
      updateDraft.mutate({ id: draftId, data: payload }, {
        onSuccess: () => alert("Draft updated!")
      });
    } else {
      createDraft.mutate(payload, {
        onSuccess: (res: any) => {
          alert("Draft saved!");
          setLocation(`/communications/compose/${res.id}`);
        }
      });
    }
  };

  const handlePreviewAudience = () => {
    if (audienceSources.length === 0) return alert("Select at least one audience source.");
    audiencePreview.mutate({ audience: getAudienceObject(), kind }, {
      onSuccess: (res: any) => {
        setPreviewData(res);
        setPreviewModalOpen(true);
      },
      onError: (err: any) => alert(err.message || "Failed to preview audience")
    });
  };

  const processSend = async (action: "send" | "schedule") => {
    if (!subject || !generatedHtml) return alert("Subject and content are required.");
    
    if (isDirectSend) {
      directSend.mutate({
        email: directEmail, name: directName, subject, html: generatedHtml,
        sourceType: directSourceType, sourceId: directSourceId
      }, {
        onSuccess: () => {
          alert("Direct email sent!");
          setLocation("/communications");
        },
        onError: (err: any) => alert(err.message || "Send failed")
      });
      return;
    }

    const hasManualRecipients = kind === "operational" && manualRecipients.split(/[\n,;]+/).some(email => email.trim());
    if (!name || (audienceSources.length === 0 && !hasManualRecipients)) {
      return alert("Name and at least one audience source or email recipient are required.");
    }
    
    createCampaign.mutate(
      { name, subject, html: generatedHtml, kind, provider, audience: getAudienceObject() },
      {
        onSuccess: (res: any) => {
          if (action === "send") {
            sendCampaign.mutate(res.id, {
              onSuccess: () => {
                alert("Campaign is sending!");
                setLocation("/communications");
              }
            });
          } else {
            const dt = new Date(`${scheduleDate}T${scheduleTime}`);
            scheduleCampaign.mutate({ id: res.id, scheduledAt: dt.toISOString() }, {
              onSuccess: () => {
                alert("Campaign scheduled!");
                setLocation("/communications");
              }
            });
          }
        },
        onError: (err: any) => {
          alert(err?.message || "Failed to create campaign");
        }
      }
    );
  };

  const handleTestSend = () => {
    if (!testEmail) return;
    
    // For test sends, we create a Campaign prefixed with [TEST] so it is obvious in history.
    createCampaign.mutate(
      { name: `[TEST] ${name || "Untitled"}`, subject, html: generatedHtml, kind, provider, audience: getAudienceObject() },
      {
        onSuccess: (res: any) => {
          sendTest.mutate({ id: res.id, email: testEmail }, {
            onSuccess: () => {
              setTestSent(true);
              setTimeout(() => setTestSent(false), 2000);
            },
            onError: (err: any) => alert(err.message || "Test send failed")
          });
        },
        onError: (err: any) => alert(err.message || "Failed to setup test campaign")
      }
    );
  };
  
  const insertAsset = (url: string) => {
    if (mode === "structured") {
      setBodyText(prev => prev + `\n\n<img src="${url}" style="max-width: 100%; border-radius: 8px;" />`);
    } else {
      setHtml(prev => prev + `<img src="${url}" style="max-width: 100%; border-radius: 8px;" />`);
    }
    setAssetsModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLocation("/communications")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isDirectSend ? "Direct Message" : draftId ? "Edit Draft" : "Compose Campaign"}
            </h1>
            {isDirectSend && (
              <p className="text-sm text-slate-500 mt-1">To: {directName ? `${directName} <${directEmail}>` : directEmail}</p>
            )}
          </div>
        </div>
        {!isDirectSend && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              disabled={createDraft.isPending || updateDraft.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Save size={16} /> Save Draft
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={createTemplate.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Save as Template
            </button>
            <button
              onClick={() => document.getElementById("email-preview")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Eye size={16} /> Preview Email
            </button>
            <button
              onClick={() => setTestModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              <Mail size={16} /> Send Test
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            {!isDirectSend && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Internal Campaign Name
                </label>
                <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                  placeholder="e.g. Workshop Fall 2026 Reminder"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Subject
              </label>
              <input 
                type="text" 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                placeholder="Subject line..."
              />
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setMode("structured")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === "structured" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Structured Builder
                    </button>
                    <button
                      onClick={() => setMode("html")}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${mode === "html" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Raw HTML
                    </button>
                  </div>
                  {templatesData?.templates && templatesData.templates.length > 0 && mode === "html" && (
                    <select 
                      className="text-xs border-none bg-transparent text-indigo-600 cursor-pointer focus:outline-none font-semibold"
                      onChange={async (e) => {
                        const tId = e.target.value;
                        if(tId) {
                          const res = await customFetch(`/api/communications/templates/${tId}`) as any;
                          if (res.template) {
                            setHtml(res.template.html);
                            setSubject(res.template.subject || subject);
                          }
                          e.target.value = "";
                        }
                      }}
                    >
                      <option value="">Load HTML Template...</option>
                      {templatesData.templates.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button 
                  onClick={() => setAssetsModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  <ImageIcon size={14} /> Insert Asset
                </button>
              </div>

              {mode === "structured" ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Preview Text (Hidden Preheader)</label>
                    <input 
                      type="text" value={previewText} onChange={e => setPreviewText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Heading</label>
                    <input 
                      type="text" value={heading} onChange={e => setHeading(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Greeting</label>
                    <input 
                      type="text" value={greeting} onChange={e => setGreeting(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Body Text</label>
                    <textarea 
                      value={bodyText} onChange={e => setBodyText(e.target.value)} rows={8}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">CTA Button Text</label>
                      <input 
                        type="text" value={ctaText} onChange={e => setCtaText(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">CTA URL</label>
                      <input 
                        type="url" value={ctaUrl} onChange={e => setCtaUrl(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <textarea 
                  value={html}
                  onChange={e => setHtml(e.target.value)}
                  rows={16}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 font-mono"
                  placeholder="<h1>Hello {{first_name}}</h1>..."
                />
              )}
            </div>
          </div>
          
          <div id="email-preview" className="bg-slate-50 border border-slate-200 rounded-xl p-6 scroll-mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Email Preview</h3>
              <div className="flex bg-slate-200 p-1 rounded-lg">
                <button onClick={() => setPreviewMode("desktop")} className={`px-2 py-1 text-[10px] font-semibold rounded ${previewMode === "desktop" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Desktop</button>
                <button onClick={() => setPreviewMode("mobile")} className={`px-2 py-1 text-[10px] font-semibold rounded ${previewMode === "mobile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Mobile</button>
                <button onClick={() => setPreviewMode("text")} className={`px-2 py-1 text-[10px] font-semibold rounded ${previewMode === "text" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>Plain Text</button>
              </div>
            </div>
            <div className="flex justify-center">
              <div className={`bg-white border border-slate-200 rounded-lg p-6 shadow-sm overflow-hidden transition-all duration-300 w-full ${previewMode === "mobile" ? "max-w-[375px]" : ""}`}>
                {previewMode === "text" ? (
                  <div className="whitespace-pre-wrap font-mono text-xs text-slate-700">{generatedText}</div>
                ) : (
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {!isDirectSend && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Classification</h3>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setKind("operational")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${kind === "operational" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Operational
                  </button>
                  <button
                    onClick={() => setKind("promotional")}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${kind === "promotional" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    Promotional
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                  {kind === "operational" 
                    ? "Uses Gmail. Strict limits apply. For transactional alerts only." 
                    : "Uses EmailOctopus. For bulk marketing and newsletters. Includes footer and honors suppressions."}
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Audience Sources</h3>
                  <button 
                    onClick={handlePreviewAudience}
                    disabled={audiencePreview.isPending}
                    className="text-xs font-semibold text-indigo-600 flex items-center gap-1 hover:text-indigo-700"
                  >
                    <Eye size={12} /> Preview Audience
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    { id: "training", label: "All Training Series Registrants" },
                    { id: "training_series", label: "Training Series Cohorts" },
                    { id: "workshops", label: "Standalone Workshop Registrations" },
                    { id: "cases", label: "Case Parents" },
                    { id: "users", label: "System Users" },
                    { id: "inquiries", label: "Inquiries" }
                  ].map(source => (
                    <label key={source.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={audienceSources.includes(source.id)}
                        onChange={() => handleSourceToggle(source.id)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      {source.label}
                    </label>
                  ))}
                </div>

                {kind === "operational" && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Individual email recipients
                    </label>
                    <textarea
                      value={manualRecipients}
                      onChange={e => setManualRecipients(e.target.value)}
                      rows={4}
                      placeholder={"person@example.com\nanother@example.com"}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Enter one address per line, or separate addresses with commas. These recipients are included only in this operational email.
                    </p>
                  </div>
                )}

                {audienceSources.includes("training_series") && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      September–October 2026 Series
                    </label>
                    <div className="space-y-1.5">
                      {[
                        { id: "full_series", label: "Full Series Registrants Only" },
                        { id: "workshop_1", label: "Workshop 1 Attendees" },
                        { id: "workshop_2", label: "Workshop 2 Attendees" },
                        { id: "workshop_3", label: "Workshop 3 Attendees" },
                        { id: "workshop_4", label: "Workshop 4 Attendees" },
                      ].map(cohort => (
                        <label key={cohort.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={seriesCohorts.includes(cohort.id)}
                            onChange={() => handleSeriesCohortToggle(cohort.id)}
                            className="rounded border-slate-300"
                          />
                          {cohort.label}
                        </label>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Each workshop attendee list also includes people registered for the full series.
                    </p>
                  </div>
                )}
                
                {audienceSources.includes("workshops") && workshopsData?.workshops && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Select Standalone Workshops</label>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                      {workshopsData.workshops.map((w: any) => (
                        <label key={w.id} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={workshopIds.includes(w.id)}
                            onChange={() => handleWorkshopToggle(w.id)}
                            className="rounded border-slate-300 mt-0.5"
                          />
                          <span className="leading-tight">{w.title} <br/><span className="text-slate-400">{w.status}</span></span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {audienceSources.includes("cases") && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Select Cases</label>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                      {(casesData ?? []).filter((c: any) => c.parentEmail).map((c: any) => (
                        <label key={c.id} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={caseIds.includes(c.id)}
                            onChange={() => toggleSelectedId(c.id, caseIds, setCaseIds)}
                            className="rounded border-slate-300 mt-0.5"
                          />
                          <span>
                            <strong>{c.studentName}</strong>
                            <br />
                            <span className="text-slate-500">{c.parentName || "Parent/Guardian"} · {c.parentEmail}</span>
                          </span>
                        </label>
                      ))}
                      {(casesData ?? []).filter((c: any) => c.parentEmail).length === 0 && (
                        <p className="text-xs text-slate-500">No cases currently have a parent email address.</p>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Select specific cases. Leave all case boxes blank to include every case with a parent email.
                    </p>
                  </div>
                )}

                {audienceSources.includes("inquiries") && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Select Inquiries</label>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                      {(inquiriesData ?? []).filter((i: any) => i.contactEmail).map((i: any) => (
                        <label key={i.id} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={inquiryIds.includes(i.id)}
                            onChange={() => toggleSelectedId(i.id, inquiryIds, setInquiryIds)}
                            className="rounded border-slate-300 mt-0.5"
                          />
                          <span>
                            <strong>{i.contactName}</strong>
                            <br />
                            <span className="text-slate-500">{i.inquiryType?.replaceAll("_", " ")} · {i.contactEmail}</span>
                          </span>
                        </label>
                      ))}
                      {(inquiriesData ?? []).filter((i: any) => i.contactEmail).length === 0 && (
                        <p className="text-xs text-slate-500">No inquiry email addresses are available.</p>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      Pulled from public School, Parent, and Partner School inquiry submissions. Leave all boxes blank to include every inquiry.
                    </p>
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-[10px] rounded border border-blue-100">
                  <strong>Note:</strong> The system automatically deduplicates recipients by email address and excludes those on the suppression list.
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            {!isProviderReady && statusData && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {provider === "gmail" ? "Gmail" : "EmailOctopus"} is not configured on the server. You cannot send or schedule this campaign until the provider is set up.
              </div>
            )}
            <div className="space-y-3">
              <button 
                onClick={() => processSend("send")}
                disabled={createCampaign.isPending || sendCampaign.isPending || directSend.isPending || !isProviderReady}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} /> Send Now
              </button>
              {!isDirectSend && (
                <button 
                  onClick={() => setScheduleModalOpen(true)}
                  disabled={!isProviderReady}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CalendarIcon size={16} /> Schedule...
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Audience Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex flex-col pt-4">
            {previewData && (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6 shrink-0">
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                    <p className="text-[10px] uppercase font-bold text-emerald-600">Included</p>
                    <p className="text-xl font-bold text-emerald-900">{previewData.counts.included}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Excluded</p>
                    <p className="text-xl font-bold text-slate-900">{previewData.counts.excluded}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Suppressed</p>
                    <p className="text-xl font-bold text-slate-900">{previewData.counts.suppressed}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Duplicate</p>
                    <p className="text-xl font-bold text-slate-900">{previewData.counts.duplicate}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Invalid</p>
                    <p className="text-xl font-bold text-slate-900">{previewData.counts.invalid}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-500">No Consent</p>
                    <p className="text-xl font-bold text-slate-900">{previewData.counts.noConsent}</p>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-slate-600">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.recipients.map((r: any, i: number) => (
                        <tr key={i} className={r.included ? "bg-white" : "bg-slate-50 opacity-60"}>
                          <td className="px-4 py-2 font-medium text-slate-900">{r.email}</td>
                          <td className="px-4 py-2 text-slate-600">{r.name || "—"}</td>
                          <td className="px-4 py-2 text-slate-500 text-xs capitalize">
                            {r.sourceType}
                            {!r.included && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">{r.reason}</span>}
                          </td>
                        </tr>
                      ))}
                      {previewData.recipients.length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">No recipients match the selected audience.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assets Modal */}
      <Dialog open={assetsModalOpen} onOpenChange={setAssetsModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Insert Asset</DialogTitle>
          </DialogHeader>
          <div className="pt-4 grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
            {assetsData?.assets?.filter(a => a.content_type.startsWith("image/")).map((a: any) => (
              <div 
                key={a.id} 
                onClick={() => insertAsset(window.location.origin + (a.serving_url || a.object_path))}
                className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:border-indigo-500 hover:ring-2 hover:ring-indigo-200 transition-all"
              >
                <div className="aspect-square bg-slate-50 flex items-center justify-center">
                  <img src={a.serving_url || a.object_path} alt={a.alt_text || a.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-2 text-[10px] truncate bg-white">{a.name}</div>
              </div>
            ))}
            {(!assetsData?.assets || assetsData.assets.length === 0) && (
              <div className="col-span-full py-12 text-center text-slate-400">
                No images available. Upload them in the Communications dashboard first.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Test Modal */}
      <Dialog open={testModalOpen} onOpenChange={setTestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-slate-500">Send a test to verify formatting and personalization.</p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
              <input 
                type="email" 
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
              />
            </div>
            <button 
              onClick={handleTestSend}
              disabled={createCampaign.isPending || sendTest.isPending || !statusData?.providers?.gmail?.configured}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testSent ? <Check size={16} /> : <Mail size={16} />}
              {testSent ? "Sent!" : "Send Test"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Date</label>
                <input 
                  type="date" 
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Time</label>
                <input 
                  type="time" 
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>
            <DialogFooter>
              <button 
                onClick={() => setScheduleModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setScheduleModalOpen(false);
                  processSend("schedule");
                }}
                disabled={!scheduleDate || !scheduleTime}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Schedule
              </button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
