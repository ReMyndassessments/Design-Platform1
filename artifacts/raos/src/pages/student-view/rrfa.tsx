import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, BookOpen } from "lucide-react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function RrfaStudentView() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["rrfa-student-view", token],
    queryFn: async () => {
      const r = await fetch(`${BASE_URL}/api/public/rrfa-passage/${token}`);
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
      <div className="border-b border-slate-100 px-6 py-4 flex items-center gap-3">
        <BookOpen size={16} className="text-slate-400" />
        <span className="text-sm font-semibold text-slate-500 tracking-wide uppercase">Reading Fluency Assessment</span>
        <span className="ml-auto text-xs text-slate-400">Read the passage aloud. Take your time.</span>
      </div>
      <div className="flex-1 flex justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          <p className="text-lg leading-8 text-slate-800 whitespace-pre-wrap font-serif">
            {data.passage}
          </p>
          <p className="mt-10 text-center text-sm text-slate-400">
            When you have finished reading, let your examiner know.
          </p>
        </div>
      </div>
    </div>
  );
}
