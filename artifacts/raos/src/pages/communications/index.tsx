import { useState } from "react";
import { Link } from "wouter";
import { Plus, Mail, Archive, LayoutTemplate, Settings, Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { useProviderStatus } from "@/hooks/use-communications";
import { CampaignsTab } from "./components/campaigns-tab";
import { DraftsTab } from "./components/drafts-tab";
import { TemplatesTab } from "./components/templates-tab";
import { AssetsTab } from "./components/assets-tab";
import { SettingsTab } from "./components/settings-tab";

type Tab = "campaigns" | "drafts" | "templates" | "assets" | "settings";

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("campaigns");
  const { data: statusData, isLoading: isLoadingStatus } = useProviderStatus();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Communications Center</h1>
          <p className="text-sm text-slate-500 mt-1">Manage system-wide operational and promotional campaigns.</p>
        </div>
        <Link 
          href="/communications/compose" 
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus size={16} />
          Compose New
        </Link>
      </div>

      {!isLoadingStatus && statusData && (
        <div className="flex items-center gap-4 text-xs font-medium border border-slate-200 bg-white px-4 py-2 rounded-xl text-slate-600">
          <span className="text-slate-400 font-semibold uppercase tracking-wider">Providers:</span>
          <div className="flex items-center gap-1.5">
            {statusData.providers.gmail.configured ? (
              <CheckCircle2 size={14} className="text-emerald-500" />
            ) : (
              <AlertCircle size={14} className="text-amber-500" />
            )}
            <span>Gmail {statusData.providers.gmail.configured ? "Ready" : "Not Configured"}</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-1.5">
            {statusData.providers.emailoctopus.configured ? (
              <CheckCircle2 size={14} className="text-emerald-500" />
            ) : (
              <AlertCircle size={14} className="text-amber-500" />
            )}
            <span>EmailOctopus {statusData.providers.emailoctopus.configured ? "Ready" : "Not Configured"}</span>
          </div>
        </div>
      )}

      <div className="border-b border-slate-200">
        <nav className="flex space-x-6">
          {(
            [
              { id: "campaigns", label: "Campaigns", icon: Mail },
              { id: "drafts", label: "Drafts", icon: Archive },
              { id: "templates", label: "Templates", icon: LayoutTemplate },
              { id: "assets", label: "Assets", icon: ImageIcon },
              { id: "settings", label: "Settings", icon: Settings },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? "text-slate-900" : "text-slate-400"} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 min-h-[500px]">
        {activeTab === "campaigns" && <CampaignsTab />}
        {activeTab === "drafts" && <DraftsTab />}
        {activeTab === "templates" && <TemplatesTab />}
        {activeTab === "assets" && <AssetsTab />}
        {activeTab === "settings" && <SettingsTab />}
      </div>
    </div>
  );
}
