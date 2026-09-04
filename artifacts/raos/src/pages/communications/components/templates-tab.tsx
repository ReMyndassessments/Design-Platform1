import { useState } from "react";
import { useTemplates, useCreateTemplate, useDuplicateTemplate, useArchiveTemplate } from "@/hooks/use-communications";
import { LayoutTemplate, Copy, Archive, FileEdit, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "wouter";

export function TemplatesTab() {
  const { data, isLoading } = useTemplates();
  const duplicateMutation = useDuplicateTemplate();
  const archiveMutation = useArchiveTemplate();

  if (isLoading) return <div className="py-12 text-center text-slate-400">Loading templates...</div>;

  const templates = data?.templates ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Email Templates</h2>
        {/* Templates are typically created from composer or specific create dialog. For now we provide a way to see them. */}
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl">
          <LayoutTemplate size={48} className="mb-4 text-slate-200" />
          <p className="text-sm font-medium text-slate-600">No templates yet</p>
          <p className="text-xs mt-1">Save a campaign as a template to reuse it later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="p-4 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors flex flex-col relative group">
              {t.archived_at && (
                <div className="absolute top-2 right-2 text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                  Archived
                </div>
              )}
              <div className="flex-1">
                <h3 className={`font-semibold mb-1 ${t.archived_at ? "text-slate-400" : "text-slate-900"}`}>{t.name}</h3>
                <p className="text-sm text-slate-500 mb-3 line-clamp-1">{t.subject}</p>
                <p className="text-xs text-slate-400 mb-4">
                  {format(new Date(t.updated_at), "MMM d, yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-2 border-t border-slate-100 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {!t.archived_at && (
                  <button 
                    onClick={() => {
                      if (window.confirm("Duplicate this template?")) {
                        duplicateMutation.mutate(t.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={14} />
                  </button>
                )}
                {!t.archived_at && (
                  <button 
                    onClick={() => {
                      if (window.confirm("Archive this template?")) {
                        archiveMutation.mutate(t.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Archive"
                  >
                    <Archive size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
