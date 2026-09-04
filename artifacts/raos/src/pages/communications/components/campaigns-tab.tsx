import { useState } from "react";
import { useCampaigns, useRetryCampaign, useCancelCampaign, useCampaignDetail } from "@/hooks/use-communications";
import { Mail, Calendar, Clock, RefreshCw, Send, XCircle, Eye } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function CampaignsTab() {
  const { data, isLoading } = useCampaigns();
  const retryMutation = useRetryCampaign();
  const cancelMutation = useCancelCampaign();

  const [detailId, setDetailId] = useState<string | null>(null);

  if (isLoading) return <div className="py-12 text-center text-slate-400">Loading campaigns...</div>;

  const campaigns = data?.campaigns ?? [];

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <Mail size={48} className="mb-4 text-slate-200" />
        <p className="text-sm font-medium text-slate-600">No campaigns yet</p>
        <p className="text-xs mt-1">Create your first campaign to get started.</p>
        <Link 
          href="/communications/compose" 
          className="mt-6 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Compose Campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((c) => (
        <div key={c.id} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900">{c.name}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  c.status === "sent" ? "bg-emerald-100 text-emerald-700" :
                  c.status === "scheduled" ? "bg-blue-100 text-blue-700" :
                  c.status === "failed" ? "bg-red-100 text-red-700" :
                  c.status === "sending" ? "bg-amber-100 text-amber-700" :
                  c.status === "cancelled" ? "bg-slate-100 text-slate-500 line-through" :
                  "bg-slate-100 text-slate-700"
                }`}>
                  {c.status}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                  {c.kind} / {c.provider}
                </span>
              </div>
              <p className="text-sm text-slate-500">{c.subject}</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setDetailId(c.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              >
                <Eye size={14} />
                Details
              </button>
              {c.status === "failed" && (
                <button 
                  onClick={() => {
                    if (window.confirm("Retry failed sends for this campaign?")) {
                      retryMutation.mutate(c.id);
                    }
                  }}
                  disabled={retryMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <RefreshCw size={14} className={retryMutation.isPending ? "animate-spin" : ""} />
                  Retry Failed
                </button>
              )}
              {c.status === "scheduled" && (
                <button 
                  onClick={() => {
                    if (window.confirm("Cancel this scheduled campaign?")) {
                      cancelMutation.mutate(c.id);
                    }
                  }}
                  disabled={cancelMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <XCircle size={14} />
                  Cancel
                </button>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-semibold mb-0.5">Recipients</p>
              <p className="text-sm font-medium text-slate-700">{c.recipient_count || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-semibold mb-0.5">Sent</p>
              <p className="text-sm font-medium text-emerald-600">{c.sent_count || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-semibold mb-0.5">Failed</p>
              <p className="text-sm font-medium text-red-600">{c.failed_count || 0}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-slate-400 font-semibold mb-0.5">Date</p>
              <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                {c.status === "scheduled" ? (
                  <><Clock size={12} className="text-blue-500" /> {format(new Date(c.scheduled_at), "MMM d, yyyy h:mm a")}</>
                ) : c.sent_at ? (
                  <><Send size={12} className="text-emerald-500" /> {format(new Date(c.sent_at), "MMM d, yyyy h:mm a")}</>
                ) : (
                  <><Calendar size={12} className="text-slate-400" /> {format(new Date(c.created_at), "MMM d, yyyy")}</>
                )}
              </p>
            </div>
          </div>
        </div>
      ))}
      {detailId && <CampaignDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}

function CampaignDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, isLoading } = useCampaignDetail(id);
  
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 border-b border-slate-200">
          <DialogTitle>Campaign Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading details...</div>
        ) : data ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-6 overflow-y-auto">
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-900 mb-1">{data.campaign.name}</h3>
                <p className="text-sm text-slate-600 mb-3">{data.campaign.subject}</p>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span><strong>Status:</strong> <span className="capitalize">{data.campaign.status}</span></span>
                  <span><strong>Type:</strong> <span className="capitalize">{data.campaign.kind}</span></span>
                  <span><strong>Provider:</strong> <span className="capitalize">{data.campaign.provider}</span></span>
                  {data.campaign.sent_at && <span><strong>Sent:</strong> {format(new Date(data.campaign.sent_at), "MMM d, yyyy h:mm a")}</span>}
                </div>
              </div>

              <h4 className="text-sm font-semibold text-slate-900 mb-3">Delivery History</h4>
              {data.history.length === 0 ? (
                <div className="p-6 text-center text-slate-500 border border-slate-200 rounded-xl bg-slate-50">
                  No recipient history recorded.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2 font-semibold text-slate-600 text-xs">Source</th>
                        <th className="px-4 py-2 font-semibold text-slate-600 text-xs">Status</th>
                        <th className="px-4 py-2 font-semibold text-slate-600 text-xs">Attempts</th>
                        <th className="px-4 py-2 font-semibold text-slate-600 text-xs">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.history.map((h: any) => (
                        <tr key={h.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <span className="capitalize font-medium text-slate-900">{h.source_type}</span>
                            <br />
                            <span className="text-[10px] font-mono text-slate-400">{h.source_id.slice(0,8)}...</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              h.status === 'sent' ? 'bg-emerald-100 text-emerald-700' :
                              h.status === 'failed' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{h.attempts}</td>
                          <td className="px-4 py-3">
                            {h.error ? (
                              <span className="text-xs text-red-600 line-clamp-2" title={h.error}>{h.error}</span>
                            ) : h.sent_at ? (
                              <span className="text-xs text-slate-500">{format(new Date(h.sent_at), "MMM d, h:mm a")}</span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-red-500">Failed to load campaign</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
