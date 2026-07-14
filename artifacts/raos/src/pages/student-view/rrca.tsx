import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BookOpen } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function RrcaStudentView() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["rrca-student-view", token],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/public/rrca-passage/${token}`);
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<{ passage: string; passageTopic: string; passageWordCount: number }>;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-300" size={36} />
      </div>
    );
  }

  if (error || !data?.passage) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-slate-400 text-sm">
        This reading passage could not be found or has not been generated yet.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-passage { font-size: 16pt !important; line-height: 2 !important; color: #000 !important; font-family: Georgia, serif !important; max-width: 100% !important; }
          .print-header-label { font-size: 10pt !important; color: #475569 !important; text-transform: uppercase !important; letter-spacing: 0.08em !important; font-weight: 600 !important; }
        }
      `}</style>

      <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
        <BookOpen size={16} className="text-slate-400 no-print" />
        <span className="text-sm font-semibold text-slate-500 tracking-wide uppercase print-header-label">
          ReMynd Reading Comprehension Assessment
        </span>
        <span className="ml-auto text-xs text-slate-400 no-print">Read the passage aloud. Take your time.</span>
        <button
          onClick={() => window.print()}
          className="no-print ml-2 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-400 rounded-lg px-4 py-2 transition-colors"
        >
          🖨️ Print
        </button>
      </div>

      <div className="flex-1 flex justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <p className="text-lg leading-8 text-slate-800 whitespace-pre-wrap font-serif print-passage">
            {data.passage}
          </p>
          <p className="mt-10 text-center text-sm text-slate-400 no-print">
            When you have finished reading, let your examiner know.
          </p>
        </div>
      </div>
    </div>
  );
}
