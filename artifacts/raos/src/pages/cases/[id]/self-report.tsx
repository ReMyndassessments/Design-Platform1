import { useState } from "react";
import { useParams, Link } from "wouter";
import { useSubmitSelfReport, useGetCase } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function GuidedSelfReport() {
  const params = useParams();
  const caseId = params.id as string;
  const { data: caseData } = useGetCase(caseId);
  const submitMut = useSubmitSelfReport();

  const [language, setLanguage] = useState("english");
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  
  // Mock questions for demo
  const questions = [
    { id: "q1", text: "I find it easy to make friends.", type: "likert" },
    { id: "q2", text: "I often feel worried about school.", type: "likert" },
    { id: "q3", text: "I can sit still when I need to.", type: "likert" }
  ];

  const handleSubmit = () => {
    submitMut.mutate({ 
      caseId, 
      data: { toolId: "self_report_v1", answers, language, administeredBy: "Psychometrician" } 
    }, {
      onSuccess: () => setSubmitted(true)
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8 border-none shadow-xl">
          <div className="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Assessment Complete</h2>
          <p className="text-slate-500 mb-8">The guided self-report has been recorded successfully.</p>
          <Link href={`/cases/${caseId}`}>
            <Button className="w-full">Return to Case</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 pt-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="icon" className="rounded-full bg-slate-100"><ArrowLeft size={20}/></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-display">Guided Self-Report</h1>
            <p className="text-slate-500 text-sm">Student: {caseData?.studentName}</p>
          </div>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {['english', 'mandarin', 'cantonese'].map(lang => (
            <button 
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1 text-sm rounded-md capitalize transition-colors ${language === lang ? 'bg-white shadow-sm font-medium text-primary' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {lang.substring(0,2)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {questions.map((q, i) => (
          <Card key={q.id} className="border-none shadow-md overflow-hidden">
            <div className="bg-primary/5 px-6 py-3 border-b border-primary/10">
              <span className="text-sm font-bold text-primary">Question {i+1}</span>
            </div>
            <CardContent className="p-6 md:p-8">
              <h3 className="text-2xl font-medium text-slate-800 mb-8">{q.text}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {['Never', 'Rarely', 'Sometimes', 'Often', 'Always'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setAnswers({...answers, [q.id]: opt})}
                    className={`py-4 rounded-xl border-2 font-medium transition-all ${
                      answers[q.id] === opt 
                        ? 'border-primary bg-primary text-white shadow-lg shadow-primary/25 scale-105' 
                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary/50 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="pt-8 flex justify-end">
        <Button size="lg" onClick={handleSubmit} disabled={Object.keys(answers).length < questions.length || submitMut.isPending} className="shadow-lg px-12 h-14 text-lg">
          {submitMut.isPending ? "Saving..." : "Submit Answers"}
        </Button>
      </div>
    </div>
  );
}
