import { useState, useEffect } from "react";
import { useBrandSettings, useUpdateBrandSettings, useAddSuppression, useSuppressions, useRemoveSuppression } from "@/hooks/use-communications";
import { Save, ShieldAlert, Check, Trash2 } from "lucide-react";
import { format } from "date-fns";

export function SettingsTab() {
  const { data: brandData, isLoading: brandLoading } = useBrandSettings();
  const { data: suppData, isLoading: suppLoading } = useSuppressions();
  
  const updateSettings = useUpdateBrandSettings();
  const addSuppression = useAddSuppression();
  const removeSuppression = useRemoveSuppression();

  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [footer, setFooter] = useState("");
  const [saved, setSaved] = useState(false);

  const [suppressEmail, setSuppressEmail] = useState("");
  const [suppressKind, setSuppressKind] = useState<"unsubscribe" | "hard">("unsubscribe");
  const [suppressReason, setSuppressReason] = useState("");
  const [suppressSaved, setSuppressSaved] = useState(false);

  useEffect(() => {
    if (brandData?.settings) {
      setFromName(brandData.settings.fromName || "");
      setFromEmail(brandData.settings.fromEmail || "");
      setFooter(brandData.settings.footer || "");
    }
  }, [brandData]);

  const handleSaveSettings = () => {
    updateSettings.mutate({ fromName, fromEmail, footer }, {
      onSuccess: () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  const handleAddSuppression = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppressEmail) return;
    addSuppression.mutate({ email: suppressEmail, kind: suppressKind, reason: suppressReason }, {
      onSuccess: () => {
        setSuppressEmail("");
        setSuppressReason("");
        setSuppressSaved(true);
        setTimeout(() => setSuppressSaved(false), 2000);
      }
    });
  };

  if (brandLoading || suppLoading) return <div className="py-12 text-center text-slate-400">Loading settings...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Brand Settings */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Brand Settings</h2>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Default From Name (EmailOctopus)
            </label>
            <input 
              type="text" 
              value={fromName}
              onChange={e => setFromName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
              placeholder="e.g. ReMynd Student Services"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Default From Email (EmailOctopus)
            </label>
            <input 
              type="email" 
              value={fromEmail}
              onChange={e => setFromEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
              placeholder="e.g. hello@remynd.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Footer (HTML allowed)
            </label>
            <textarea 
              value={footer}
              onChange={e => setFooter(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 font-mono"
              placeholder="<p>Copyright © 2026 ReMynd. All rights reserved.</p>"
            />
          </div>
          <button 
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
          >
            {saved ? <Check size={16} className="text-emerald-400" /> : <Save size={16} />}
            {saved ? "Saved" : updateSettings.isPending ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Manual Suppression */}
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
          <ShieldAlert size={20} className="text-slate-400" />
          Suppression List
        </h2>
        <form onSubmit={handleAddSuppression} className="space-y-4 max-w-md bg-slate-50 p-5 rounded-xl border border-slate-200 mb-6">
          <p className="text-sm text-slate-600 mb-4">
            Manually add an email to the suppression list. They will be excluded from future campaigns based on the type.
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input 
              type="email" 
              required
              value={suppressEmail}
              onChange={e => setSuppressEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Suppression Type
            </label>
            <select
              value={suppressKind}
              onChange={e => setSuppressKind(e.target.value as "unsubscribe" | "hard")}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400 bg-white"
            >
              <option value="unsubscribe">Unsubscribe (Promotional only)</option>
              <option value="hard">Hard block (All communications)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Reason (Optional)
            </label>
            <input 
              type="text" 
              value={suppressReason}
              onChange={e => setSuppressReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-400"
            />
          </div>
          <button 
            type="submit"
            disabled={addSuppression.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors w-full justify-center"
          >
            {suppressSaved ? <Check size={16} className="text-emerald-500" /> : <Save size={16} />}
            {suppressSaved ? "Added" : addSuppression.isPending ? "Adding..." : "Add to Suppression List"}
          </button>
        </form>
        
        <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Active Suppressions</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            {suppData?.suppressions?.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">No suppressions active.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {suppData?.suppressions?.map((s: any) => (
                  <li key={s.email} className="p-4 flex items-center justify-between hover:bg-slate-50 group">
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="text-sm font-medium text-slate-900 truncate">{s.email}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {s.kind === "hard" ? "Hard Block" : "Unsubscribed"} • {s.reason || "No reason"}
                      </p>
                    </div>
                    <button 
                      onClick={() => {
                        if(window.confirm(`Remove ${s.email} from suppression list?`)) {
                          removeSuppression.mutate(s.email);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                      title="Remove from list"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
