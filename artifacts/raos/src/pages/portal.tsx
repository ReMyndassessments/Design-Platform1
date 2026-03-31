import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, School, Users, ClipboardList, ShieldCheck, Clock,
  ChevronRight, ArrowRight, Brain, FileText, MessageSquare, Phone,
  BookOpen, Heart, Star, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "school" | "parent";

const YEAR_GROUPS = [
  "Year 1", "Year 2", "Year 3", "Year 4", "Year 5", "Year 6",
  "Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12", "Year 13",
  "Foundation", "Kindergarten", "Reception", "Pre-K", "University / Adult",
];

const SCHOOL_ROLES = [
  "Class Teacher", "Subject Teacher", "Pastoral Lead", "Head of Year",
  "SENCO / Learning Support", "School Counsellor", "School Psychologist",
  "Principal / Deputy Principal", "School Administrator", "Other",
];

interface InquiryForm {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  organisation: string;
  role: string;
  studentName: string;
  studentAge: string;
  yearGroup: string;
  message: string;
}

const emptyForm: InquiryForm = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  organisation: "",
  role: "",
  studentName: "",
  studentAge: "",
  yearGroup: "",
  message: "",
};

function Step({ number, title, description, icon: Icon }: { number: number; title: string; description: string; icon: React.ElementType }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
        <Icon size={18} className="text-indigo-600" />
      </div>
      <div>
        <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">Step {number}</p>
        <h4 className="font-semibold text-slate-900 text-sm">{title}</h4>
        <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function SchoolContent({ onInquire }: { onInquire: () => void }) {
  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Supporting your students through expert assessment</h3>
        <p className="text-slate-600 leading-relaxed">
          ReMynd partners with schools to provide gold-standard psychoeducational assessments that help identify each student's unique learning profile — and put the right support in place.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Brain, label: "Evidence-based", desc: "Assessment tools validated by international research" },
          { icon: ShieldCheck, label: "Confidential", desc: "Strict data privacy and informed consent throughout" },
          { icon: Clock, label: "Efficient", desc: "Clear timelines and progress updates at every stage" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-indigo-50 rounded-xl p-4 text-center">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon size={18} className="text-indigo-600" />
            </div>
            <p className="font-semibold text-slate-900 text-sm">{label}</p>
            <p className="text-slate-500 text-xs mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h4 className="font-semibold text-slate-900 mb-4">How the process works</h4>
        <div className="space-y-5">
          <Step number={1} icon={FileText} title="Submit a referral" description="A teacher, pastoral lead, or SENCO completes a short referral form outlining the student's presenting concerns." />
          <Step number={2} icon={ClipboardList} title="Intake & consent" description="Parents are informed and provide written consent. A detailed intake questionnaire gathers developmental and background history." />
          <Step number={3} icon={Brain} title="Assessment session" description="Our psychometrician conducts a structured assessment session with the student, supported by standardised rating scales completed by teachers and parents." />
          <Step number={4} icon={BookOpen} title="Report & debrief" description="A comprehensive psychoeducational report is produced with practical recommendations, followed by a debrief session with school staff and parents." />
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-5">
        <h4 className="font-semibold text-slate-900 mb-2">What we assess</h4>
        <div className="flex flex-wrap gap-2">
          {["Executive Function", "Attention & ADHD", "Learning Difficulties", "Social-Emotional Wellbeing", "Autism Spectrum", "Anxiety & Mood", "Behaviour & Regulation", "Sensory Processing"].map(t => (
            <span key={t} className="px-2.5 py-1 bg-white border border-slate-200 rounded-full text-xs text-slate-700">{t}</span>
          ))}
        </div>
      </div>

      <div className="text-center pt-2">
        <Button onClick={onInquire} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          Refer a Student <ArrowRight size={16} />
        </Button>
        <p className="text-xs text-slate-400 mt-2">Takes around 3 minutes. We'll be in touch within one business day.</p>
      </div>
    </div>
  );
}

function ParentContent({ onInquire }: { onInquire: () => void }) {
  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Understanding your child's unique way of thinking and learning</h3>
        <p className="text-slate-600 leading-relaxed">
          A psychoeducational assessment can provide clarity, answers, and a clear path forward — helping your child get the right support at school and at home.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { icon: Heart, label: "Child-centred", desc: "We take time to understand your child as a whole person" },
          { icon: Star, label: "Strengths-based", desc: "We highlight strengths alongside any areas of difficulty" },
          { icon: Zap, label: "Actionable", desc: "Recommendations your school and family can implement straight away" },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="bg-rose-50 rounded-xl p-4 text-center">
            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon size={18} className="text-rose-500" />
            </div>
            <p className="font-semibold text-slate-900 text-sm">{label}</p>
            <p className="text-slate-500 text-xs mt-1">{desc}</p>
          </div>
        ))}
      </div>

      <div>
        <h4 className="font-semibold text-slate-900 mb-3">Common reasons parents reach out</h4>
        <div className="space-y-2">
          {[
            "My child is struggling at school despite working hard",
            "Teachers have raised concerns about attention or behaviour",
            "My child seems anxious, withdrawn, or emotionally dysregulated",
            "We suspect a learning difficulty such as dyslexia or ADHD",
            "My child has social difficulties or shows autistic traits",
            "We want to understand why school feels so hard for my child",
          ].map(r => (
            <div key={r} className="flex items-start gap-2">
              <CheckCircle2 size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">{r}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-slate-900 mb-4">What to expect</h4>
        <div className="space-y-5">
          <Step number={1} icon={MessageSquare} title="Initial conversation" description="We start with a brief call or message exchange to understand your concerns and determine whether an assessment is appropriate." />
          <Step number={2} icon={ClipboardList} title="Intake questionnaire" description="You'll complete a detailed background questionnaire covering your child's development, health, and school history." />
          <Step number={3} icon={Brain} title="Assessment session" description="Your child meets with our psychometrician in a comfortable, supportive setting. Sessions typically last 2–3 hours with breaks." />
          <Step number={4} icon={BookOpen} title="Report & debrief" description="You receive a comprehensive written report followed by a debrief session where we walk you through the findings and next steps." />
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-5">
        <h4 className="font-semibold text-slate-900 mb-1">Your child's privacy is protected</h4>
        <p className="text-sm text-slate-600">All information shared is strictly confidential. Reports are released only to authorised individuals with your written consent. Data is handled in accordance with applicable privacy legislation.</p>
      </div>

      <div className="text-center pt-2">
        <Button onClick={onInquire} size="lg" className="bg-rose-500 hover:bg-rose-600 text-white gap-2">
          Make an Enquiry <ArrowRight size={16} />
        </Button>
        <p className="text-xs text-slate-400 mt-2">No obligation. We'll get back to you within one business day.</p>
      </div>
    </div>
  );
}

function InquiryFormPanel({ tab, onBack, onSuccess }: { tab: Tab; onBack: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState<InquiryForm>(emptyForm);
  const isSchool = tab === "school";
  const accent = isSchool ? "indigo" : "rose";

  const mutation = useMutation({
    mutationFn: async (data: InquiryForm) => {
      const res = await fetch("/api/portal/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, inquiryType: tab }),
      });
      if (!res.ok) throw new Error("Submission failed");
      return res.json();
    },
    onSuccess,
  });

  const set = (field: keyof InquiryForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
        ← Back
      </button>

      <h3 className="text-lg font-bold text-slate-900">
        {isSchool ? "Refer a Student" : "Make an Enquiry"}
      </h3>
      <p className="text-sm text-slate-500">Fill in the details below and we'll be in touch within one business day.</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Your Name <span className="text-red-400">*</span></Label>
          <Input placeholder="Full name" value={form.contactName} onChange={set("contactName")} required />
        </div>
        <div className="space-y-1.5">
          <Label>Email Address <span className="text-red-400">*</span></Label>
          <Input type="email" placeholder="email@example.com" value={form.contactEmail} onChange={set("contactEmail")} required />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Phone Number</Label>
          <Input placeholder="+1 (optional)" value={form.contactPhone} onChange={set("contactPhone")} />
        </div>
        {isSchool ? (
          <div className="space-y-1.5">
            <Label>School / Organisation</Label>
            <Input placeholder="School name" value={form.organisation} onChange={set("organisation")} />
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Child's School</Label>
            <Input placeholder="School name (if applicable)" value={form.organisation} onChange={set("organisation")} />
          </div>
        )}
      </div>

      {isSchool && (
        <div className="space-y-1.5">
          <Label>Your Role</Label>
          <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
            <SelectContent>
              {SCHOOL_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {isSchool ? "Student Details" : "Your Child"}
        </p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-1">
            <Label>{isSchool ? "Student First Name" : "Child's First Name"}</Label>
            <Input placeholder="First name" value={form.studentName} onChange={set("studentName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Age</Label>
            <Input placeholder="e.g. 10" value={form.studentAge} onChange={set("studentAge")} />
          </div>
          <div className="space-y-1.5">
            <Label>Year Group</Label>
            <Select value={form.yearGroup} onValueChange={v => setForm(f => ({ ...f, yearGroup: v }))}>
              <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
              <SelectContent>
                {YEAR_GROUPS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>
          {isSchool ? "Reason for Referral" : "What are your main concerns?"} <span className="text-red-400">*</span>
        </Label>
        <Textarea
          placeholder={isSchool
            ? "Briefly describe the concerns that have prompted this referral — academic, social, emotional, or behavioural..."
            : "Describe what you've observed — at home, at school, or in social situations. There's no wrong answer."}
          rows={5}
          value={form.message}
          onChange={set("message")}
          required
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-red-500">Something went wrong. Please try again or contact us directly.</p>
      )}

      <Button
        type="submit"
        disabled={mutation.isPending}
        className={cn("w-full", isSchool ? "bg-indigo-600 hover:bg-indigo-700" : "bg-rose-500 hover:bg-rose-600")}
      >
        {mutation.isPending ? "Submitting…" : "Submit Enquiry"}
      </Button>

      <p className="text-xs text-center text-slate-400">
        By submitting this form you consent to ReMynd contacting you regarding your enquiry. Your information will not be shared with third parties.
      </p>
    </form>
  );
}

function SuccessPanel({ tab, onReset }: { tab: Tab; onReset: () => void }) {
  const isSchool = tab === "school";
  return (
    <div className="text-center py-12 space-y-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 size={32} className="text-green-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-900">Enquiry received</h3>
      <p className="text-slate-500 max-w-sm mx-auto">
        {isSchool
          ? "Thank you for your referral. A member of our team will be in touch within one business day to discuss next steps."
          : "Thank you for reaching out. We'll be in touch within one business day to have a conversation about how we can help."}
      </p>
      <Button variant="outline" onClick={onReset} className="mt-4">Submit another enquiry</Button>
    </div>
  );
}

export default function Portal() {
  const [tab, setTab] = useState<Tab>("school");
  const [view, setView] = useState<"info" | "form" | "success">("info");

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setView("info");
  };

  const isSchool = tab === "school";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Brain size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg">ReMynd</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">Already have a form link?</span>
            <a href="/login" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Staff Login →</a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-14 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full text-indigo-600 text-xs font-semibold mb-6">
          <Zap size={12} /> Psychoeducational Assessments
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight mb-4">
          Every student deserves to<br className="hidden sm:block" /> be understood
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          ReMynd delivers thorough, compassionate psychoeducational assessments that identify how a student learns, thinks, and experiences the world — and what they need to thrive.
        </p>
      </section>

      {/* Tab selector */}
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1 max-w-sm mx-auto">
          <button
            onClick={() => handleTabChange("school")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all",
              tab === "school"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <School size={15} /> Schools
          </button>
          <button
            onClick={() => handleTabChange("parent")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all",
              tab === "parent"
                ? "bg-white text-rose-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Users size={15} /> Parents
          </button>
        </div>
      </div>

      {/* Content panel */}
      <div className="max-w-2xl mx-auto px-6 pb-20">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {view === "success" ? (
            <SuccessPanel tab={tab} onReset={() => { setView("info"); }} />
          ) : view === "form" ? (
            <InquiryFormPanel tab={tab} onBack={() => setView("info")} onSuccess={() => setView("success")} />
          ) : tab === "school" ? (
            <SchoolContent onInquire={() => setView("form")} />
          ) : (
            <ParentContent onInquire={() => setView("form")} />
          )}
        </div>

        {/* FAQ */}
        {view === "info" && (
          <div className="mt-10 space-y-4">
            <h4 className="font-semibold text-slate-900">Frequently asked questions</h4>
            {(isSchool ? [
              { q: "How long does the assessment process take?", a: "From referral to final report typically takes 2–4 weeks, depending on form completion speed and scheduling." },
              { q: "Do parents need to be involved?", a: "Yes. Parental consent is required before any assessment begins. Parents also complete an intake questionnaire and receive a copy of the report." },
              { q: "Can we refer more than one student?", a: "Absolutely. Each student receives their own individual referral and case file." },
              { q: "Is there a cost to the school?", a: "Assessment fees are discussed during the initial consultation and depend on the scope of assessment required." },
            ] : [
              { q: "Does my child need to prepare?", a: "No preparation is needed. We encourage your child to come as they are — the assessment is not a test with right or wrong answers." },
              { q: "Can I be present during the session?", a: "We ask that parents wait nearby while the assessment session takes place, as our psychometrician works best one-on-one. You will be fully debriefed afterwards." },
              { q: "How long does a session take?", a: "Most assessment sessions run between 2 and 3 hours, with regular breaks built in." },
              { q: "Will I receive a written report?", a: "Yes. Every assessment results in a comprehensive written report with findings and practical recommendations." },
            ]).map(({ q, a }) => (
              <div key={q} className="bg-slate-50 rounded-xl p-4">
                <p className="font-semibold text-sm text-slate-800 mb-1">{q}</p>
                <p className="text-sm text-slate-500">{a}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
