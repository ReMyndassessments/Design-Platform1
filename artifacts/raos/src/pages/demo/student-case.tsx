import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, ShieldCheck, FileText, UserCircle, BookOpen, 
  ChevronRight, CheckCircle2, Lock, Eye, Mail, 
  Calendar, MessageSquare, GraduationCap, Play
} from "lucide-react";
import { GuidedTour, TourStep } from "@/components/guided-tour";

export default function DemoStudentCase() {
  const [activeTab, setActiveTab] = useState("overview");
  const [tourVisible, setTourVisible] = useState(true);

  const steps: TourStep[] = [
    {
      target: "#demo-welcome",
      title: "Welcome to the Portal",
      content: "This is the Student Case Portal. It's a secure, reassuring space where families track assessment progress, access released reports, and control consents."
    },
    {
      target: "#demo-ai-synthesis",
      title: "Intelligent Synthesis",
      content: "Behind the scenes, ReMynd's AI safely synthesizes complex intake forms and previous records into a clear pathway, keeping human experts in control while removing administrative burden."
    },
    {
      target: "#demo-observations",
      title: "Response Summaries",
      content: "Authorized practitioners can use AI-assisted response summaries to review lengthy observations more efficiently. Families receive the reviewed, plain-language conclusions released through the portal."
    },
    {
      target: "#demo-consent",
      title: "Privacy & Consent Controls",
      content: "Families retain full control. They decide who sees the final report, granting or revoking explicit access to the school or external providers at any time."
    },
    {
      target: "#demo-teacher",
      title: "Teacher Differentiated Support",
      content: "With parent permission, teachers can view actionable strategies to differentiate lessons, directly informed by the assessment outcomes."
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="flex items-center gap-2">
            <Brain className="text-teal-400" size={24} />
            <span className="font-display font-bold text-xl tracking-tight">ReMynd</span>
          </div>
          <Badge variant="secondary" className="bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border-none">
            Interactive Demo
          </Badge>
          <Badge variant="outline" className="hidden sm:inline-flex text-slate-400 border-slate-700">
            Read Only
          </Badge>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 ml-auto">
          <Button
            variant="ghost"
            className="text-slate-300 hover:text-white hover:bg-white/10 px-2 sm:px-4"
            onClick={() => { setTourVisible(true); setActiveTab("overview"); }}
          >
            <Play size={16} className="sm:mr-2" />
            <span className="hidden sm:inline">Restart Tour</span>
            <span className="sr-only sm:hidden">Restart Tour</span>
          </Button>
          <Link href="/inquiries">
            <Button className="bg-teal-500 hover:bg-teal-600 text-white font-semibold">
              Book a Demo
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar */}
        <div className="w-full lg:w-64 shrink-0 space-y-2" id="demo-welcome">
          <div className="mb-8 px-3">
            <h2 className="text-2xl font-display font-bold text-slate-900">Student Portal</h2>
            <p className="text-sm text-slate-500 mt-1">Viewing: Avery Morgan</p>
          </div>

          {[
            { id: "overview", icon: UserCircle, label: "Overview" },
            { id: "forms", icon: FileText, label: "Intake & Forms", tourId: "demo-ai-synthesis" },
            { id: "observations", icon: MessageSquare, label: "School Observations", tourId: "demo-observations" },
            { id: "report", icon: Lock, label: "Consents & Report", tourId: "demo-consent" },
            { id: "teacher", icon: GraduationCap, label: "Teacher Preview", tourId: "demo-teacher" },
          ].map(tab => (
            <button
              key={tab.id}
              id={tab.tourId}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? "bg-white shadow-sm border border-slate-200 text-teal-700" 
                  : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
              }`}
            >
              <tab.icon size={18} className={activeTab === tab.id ? "text-teal-600" : "text-slate-400"} />
              {tab.label}
              {activeTab === tab.id && <ChevronRight size={16} className="ml-auto opacity-50" />}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 w-full max-w-4xl">
          {activeTab === "overview" && (
            <div className="space-y-6 animate-fade-in">
              <Card className="p-8 border-none shadow-md bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-display font-bold text-slate-900 mb-2">Welcome back, Jordan</h1>
                    <p className="text-slate-600 text-lg">Avery's assessment is currently in the <span className="font-semibold text-slate-900">Report Drafting</span> phase.</p>
                  </div>
                  <div className="h-16 w-16 bg-teal-50 rounded-full flex items-center justify-center border-4 border-teal-100 shrink-0 hidden sm:flex">
                    <UserCircle size={32} className="text-teal-600" />
                  </div>
                </div>
                
                <div className="mt-10 relative hidden sm:block">
                  <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
                  <div className="absolute top-1/2 left-0 w-[60%] h-1 bg-teal-500 -translate-y-1/2 rounded-full" />
                  
                  <div className="relative flex justify-between">
                    {["Intake", "Assessment", "Scoring", "Report", "Debrief"].map((step, i) => (
                      <div key={step} className="flex flex-col items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 font-semibold text-sm transition-colors ${
                          i < 3 ? "bg-teal-500 text-white shadow-md shadow-teal-500/20" : 
                          i === 3 ? "bg-white border-2 border-teal-500 text-teal-600 shadow-sm" : 
                          "bg-white border-2 border-slate-200 text-slate-400"
                        }`}>
                          {i < 3 ? <CheckCircle2 size={16} /> : i + 1}
                        </div>
                        <span className={`text-sm font-medium ${i <= 3 ? "text-slate-900" : "text-slate-400"}`}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 border-none shadow-sm bg-white">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Calendar className="text-slate-400" size={18} /> Upcoming Appointments
                  </h3>
                  <div className="p-4 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-4">
                    <div className="bg-white p-2 rounded shadow-sm border border-slate-100 text-center min-w-[3rem]">
                      <div className="text-xs text-red-500 font-bold uppercase">Oct</div>
                      <div className="text-lg font-bold text-slate-900 leading-none mt-1">24</div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900">Results Debrief</h4>
                      <p className="text-sm text-slate-500 mt-1">Virtual Meeting • 45 mins</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-6 border-none shadow-sm bg-white">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="text-slate-400" size={18} /> Action Items
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm text-slate-600 opacity-60">
                      <CheckCircle2 size={18} className="text-teal-500" />
                      <span className="line-through">Complete Parent Intake Form</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600 opacity-60">
                      <CheckCircle2 size={18} className="text-teal-500" />
                      <span className="line-through">Upload previous school reports</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium text-slate-900">
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                      <span>Review Final Report (Pending release)</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "forms" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">Intake & Forms</h2>
                <p className="text-slate-600">Illustrative documents for Avery's fictional assessment.</p>
              </div>
              
              <Card className="p-6 border border-teal-100 bg-teal-50/30 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                  <Brain size={120} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-teal-700 font-semibold mb-2">
                    <Brain size={18} />
                    <span>Illustrative AI-Assisted Intake View</span>
                  </div>
                  <p className="text-slate-700 text-sm max-w-2xl leading-relaxed">
                    This example shows how ReMynd can help authorized practitioners summarize referral and intake material, surface themes, and recommend areas for review. The content on this page is pre-written demonstration data; no live AI analysis is being performed.
                  </p>
                </div>
              </Card>

              <div className="space-y-4 mt-8">
                {[
                  { name: "Parent Background Questionnaire", date: "Submitted Oct 1", status: "Complete" },
                  { name: "Year 7 Progress Report", date: "Uploaded Oct 2", status: "Complete" },
                  { name: "Pediatrician Referral Note", date: "Uploaded Oct 2", status: "Complete" }
                ].map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-teal-300 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-50 rounded-lg text-slate-400 hidden sm:block">
                        <FileText size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">{doc.name}</h4>
                        <p className="text-xs text-slate-500">{doc.date}</p>
                      </div>
                    </div>
                    <Badge variant="success" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 shrink-0">{doc.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "observations" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">School Observations</h2>
                <p className="text-slate-600">Illustrative insights from Avery's fictional teachers.</p>
              </div>
              
              <Card className="p-6 border border-indigo-100 bg-indigo-50/30 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0 mt-1">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-indigo-900 mb-1">AI Response Summary</h3>
                    <p className="text-sm text-indigo-800/80 leading-relaxed">
                      This pre-written example demonstrates how authorized practitioners can use AI-assisted summaries to review teacher responses, then translate the reviewed findings into clear, family-friendly language. It is not a live AI result.
                    </p>
                  </div>
                </div>
              </Card>

              <div className="grid sm:grid-cols-2 gap-6">
                <Card className="p-6 bg-white border-none shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-4 pb-4 border-b border-slate-100">Key Strengths Noted</h3>
                  <ul className="space-y-4">
                    <li className="flex gap-3 text-slate-700 text-sm">
                      <CheckCircle2 size={18} className="text-teal-500 shrink-0" />
                      <span className="leading-relaxed">Shows excellent verbal comprehension and participates actively in class discussions.</span>
                    </li>
                    <li className="flex gap-3 text-slate-700 text-sm">
                      <CheckCircle2 size={18} className="text-teal-500 shrink-0" />
                      <span className="leading-relaxed">Highly empathetic; frequently helps peers when they are struggling with concepts.</span>
                    </li>
                  </ul>
                </Card>

                <Card className="p-6 bg-white border-none shadow-sm">
                  <h3 className="font-semibold text-slate-900 mb-4 pb-4 border-b border-slate-100">Areas of Friction</h3>
                  <ul className="space-y-4">
                    <li className="flex gap-3 text-slate-700 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                      <span className="leading-relaxed">Struggles with multi-step written instructions, often needing them broken down orally.</span>
                    </li>
                    <li className="flex gap-3 text-slate-700 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                      <span className="leading-relaxed">Sustained attention during independent reading tasks decreases after 10-15 minutes.</span>
                    </li>
                  </ul>
                </Card>
              </div>
            </div>
          )}

          {activeTab === "report" && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">Consents & Report</h2>
                <p className="text-slate-600">Manage who has access to Avery's fictional assessment outcomes.</p>
              </div>
              
              <Card className="p-6 bg-white border-none shadow-sm">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">Final Assessment Report</h3>
                    <p className="text-sm text-slate-500 mt-1">Pending final clinical review</p>
                  </div>
                  <Badge className="bg-slate-100 text-slate-600 border-none px-3 py-1">
                    <Lock size={14} className="mr-1" /> Locked
                  </Badge>
                </div>
                
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center max-w-md mx-auto">
                  <FileText size={40} className="mx-auto text-slate-300 mb-4" />
                  <h4 className="font-medium text-slate-700 text-lg">Report Not Yet Available</h4>
                  <p className="text-sm text-slate-500 mt-2">
                    The clinical team is finalizing the report. Once approved, you will be notified and can access it here securely.
                  </p>
                </div>
              </Card>

              <div>
                <h3 className="font-bold font-display text-slate-900 mt-8 mb-4">Access Controls</h3>
                <div className="space-y-4">
                  {[
                    { name: "Northstar Demonstration Academy (School)", status: "Granted", desc: "Allows the school to view the full report to implement accommodations." },
                    { name: "Dr. Emily Chen (Pediatrician)", status: "Revoked", desc: "Allows your referring pediatrician to view the final diagnostic outcomes." }
                  ].map((entity, i) => (
                    <Card key={i} className="p-5 bg-white border-none shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-900">{entity.name}</h4>
                        <p className="text-xs text-slate-500 mt-1">{entity.desc}</p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        {entity.status === "Granted" ? (
                          <Badge variant="success" className="bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} className="mr-1" /> Granted</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600">Revoked</Badge>
                        )}
                        <Button variant="outline" size="sm" className="text-xs">Manage</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "teacher" && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white mb-8 flex flex-col md:flex-row items-start gap-6 shadow-lg shadow-slate-900/20">
                <Eye size={32} className="text-teal-400 shrink-0 mt-1" />
                <div>
                  <h2 className="text-2xl font-display font-bold">Teacher Perspective Preview</h2>
                  <p className="text-slate-300 text-sm md:text-base mt-2 leading-relaxed max-w-2xl">
                    This preview shows the teacher support available after parent permission is granted. ReMynd can help a teacher differentiate a lesson or assignment using the reviewed case summary while keeping professional judgment and consent controls in place.
                  </p>
                </div>
              </div>

              <Card className="border border-slate-200 shadow-sm overflow-hidden bg-white">
                <div className="border-b border-slate-100 bg-slate-50 p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                      AM
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg leading-none mb-1">Avery Morgan</h3>
                      <span className="text-sm text-slate-500">Year 7 • Support Profile</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 px-3 py-1">Active Accommodations</Badge>
                </div>
                
                <div className="p-6 md:p-8 space-y-8">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4 text-lg flex items-center gap-2">
                      <BookOpen className="text-blue-500" size={20} />
                      Classroom Strategies
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/30">
                        <h5 className="font-semibold text-blue-900 text-sm mb-2">Instruction Delivery</h5>
                        <p className="text-sm text-slate-700 leading-relaxed">Provide written instructions alongside verbal ones. Avery benefits from a visual checklist for multi-step tasks.</p>
                      </div>
                      <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/30">
                        <h5 className="font-semibold text-blue-900 text-sm mb-2">Environment</h5>
                        <p className="text-sm text-slate-700 leading-relaxed">Allow brief movement breaks during sustained silent reading periods exceeding 15 minutes.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-4 text-lg flex items-center gap-2">
                      <ShieldCheck className="text-emerald-500" size={20} />
                      Approved Accommodations
                    </h4>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-700">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        50% extra time on written assessments
                      </li>
                      <li className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50 text-sm text-slate-700">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        Use of text-to-speech software for lengthy reading assignments
                      </li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
      
      <GuidedTour 
        steps={steps} 
        isActive={tourVisible} 
        onDismiss={() => setTourVisible(false)} 
        onStepChange={(idx) => {
          if (idx === 0) setActiveTab("overview");
          if (idx === 1) setActiveTab("forms");
          if (idx === 2) setActiveTab("observations");
          if (idx === 3) setActiveTab("report");
          if (idx === 4) setActiveTab("teacher");
        }}
      />
    </div>
  );
}
