import { useState } from "react";
import { useParams } from "wouter";
import { useGetExternalForm, useSubmitExternalForm } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, CheckCircle2 } from "lucide-react";

export default function ExternalFormView() {
  const { token } = useParams();
  const { data: form, isLoading, isError } = useGetExternalForm(token as string, { query: { retry: false }});
  const submitMut = useSubmitExternalForm();

  const [language, setLanguage] = useState("english");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    submitMut.mutate({ token: token as string, data: { answers, language } }, {
      onSuccess: () => setSubmitted(true)
    });
  };

  if (isLoading) return <div className="min-h-screen flex justify-center items-center"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (isError || !form) return <div className="min-h-screen flex justify-center items-center bg-slate-50"><Card className="p-8"><p className="text-destructive">Invalid or expired link.</p></Card></div>;

  if (form.alreadySubmitted || submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="w-full max-w-md text-center p-10 border-none shadow-xl">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-3xl font-display font-bold mb-3 text-slate-900">Thank You!</h2>
          <p className="text-slate-500 text-lg">Your responses have been securely submitted to the assessment team.</p>
          <div className="mt-12 text-slate-400 flex items-center justify-center text-sm font-medium">
            <BrainCircuit size={16} className="mr-2" /> ReMynd Assessment
          </div>
        </Card>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalCount = form.questions.length;
  const progress = (answeredCount / totalCount) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center text-primary">
          <BrainCircuit size={24} className="mr-2" />
          <span className="font-display font-bold tracking-tight text-lg">ReMynd</span>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          {['english', 'mandarin', 'cantonese'].map(lang => (
            <button 
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize font-medium transition-colors ${language === lang ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
            >
              {lang.substring(0,2)}
            </button>
          ))}
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 h-1.5 fixed top-14 z-20">
        <div className="bg-primary h-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 md:p-8 space-y-6 pt-10">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{form.toolName}</h1>
          <p className="text-slate-500 mt-2 text-lg">Regarding student: <span className="font-semibold text-slate-800">{form.studentName}</span></p>
        </div>

        {form.questions.map((q, i) => {
          const qText = language === 'mandarin' && q.textMandarin ? q.textMandarin : 
                        language === 'cantonese' && q.textCantonese ? q.textCantonese : q.text;
          
          return (
            <Card key={q.id} className="border-none shadow-md overflow-hidden bg-white">
              <div className="p-6 md:p-8">
                <p className="text-sm font-bold text-primary mb-3 uppercase tracking-wider">Question {i+1} of {totalCount}</p>
                <h3 className="text-xl md:text-2xl font-medium text-slate-800 mb-8 leading-snug">{qText}</h3>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {['Never', 'Rarely', 'Sometimes', 'Often', 'Always'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setAnswers({...answers, [q.id]: opt})}
                      className={`flex-1 py-4 md:py-5 rounded-xl border-2 font-semibold transition-all duration-200 text-sm md:text-base ${
                        answers[q.id] === opt 
                          ? 'border-primary bg-primary text-white shadow-lg shadow-primary/30 transform scale-[1.02]' 
                          : 'border-slate-200 bg-white text-slate-600 hover:border-primary/30 hover:bg-slate-50 active:scale-95'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}

        <div className="pt-8 pb-12 sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
          <Button 
            size="lg" 
            onClick={handleSubmit} 
            disabled={answeredCount < totalCount || submitMut.isPending} 
            className="w-full h-16 text-lg rounded-2xl shadow-xl shadow-primary/20"
          >
            {submitMut.isPending ? "Submitting securely..." : "Submit Form"}
          </Button>
          {answeredCount < totalCount && (
            <p className="text-center text-sm text-slate-500 mt-4">
              Please answer all questions before submitting ({answeredCount}/{totalCount})
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
