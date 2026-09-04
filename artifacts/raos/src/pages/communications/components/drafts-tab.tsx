import { useDrafts } from "@/hooks/use-communications";
import { Archive, Edit } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export function DraftsTab() {
  const { data, isLoading } = useDrafts();

  if (isLoading) return <div className="py-12 text-center text-slate-400">Loading drafts...</div>;

  const drafts = data?.drafts ?? [];

  if (drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Archive size={48} className="mb-4 text-slate-200" />
        <p className="text-sm font-medium text-slate-600">No drafts yet</p>
        <p className="text-xs mt-1">Saved drafts will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {drafts.map((d) => (
        <div key={d.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">{d.name}</h3>
            <p className="text-sm text-slate-500">{d.subject || "(No subject)"}</p>
            <p className="text-xs text-slate-400 mt-2">
              Last updated {format(new Date(d.updated_at), "MMM d, yyyy h:mm a")}
            </p>
          </div>
          <Link
            href={`/communications/compose/${d.id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
          >
            <Edit size={14} />
            Edit Draft
          </Link>
        </div>
      ))}
    </div>
  );
}
