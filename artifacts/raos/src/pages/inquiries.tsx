import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { School, User, Mail, Phone, Calendar, Building2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

interface Inquiry {
  id: string;
  inquiryType: "school" | "parent";
  status: "new" | "contacted" | "converted" | "closed";
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  organisation: string | null;
  role: string | null;
  studentName: string | null;
  studentAge: string | null;
  yearGroup: string | null;
  message: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700 border-blue-200" },
  contacted: { label: "Contacted", color: "bg-amber-100 text-amber-700 border-amber-200" },
  converted: { label: "Converted", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  closed: { label: "Closed", color: "bg-slate-100 text-slate-500 border-slate-200" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InquiriesPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Inquiry | null>(null);

  const { data: inquiries = [], isLoading, isError } = useQuery<Inquiry[]>({
    queryKey: ["inquiries"],
    queryFn: () => customFetch<Inquiry[]>("/api/portal/inquiries"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      customFetch(`/api/portal/inquiries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inquiries"] }),
  });

  const deleteInquiry = useMutation({
    mutationFn: (id: string) =>
      customFetch(`/api/portal/inquiries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inquiries"] });
      if (expanded === deleteTarget?.id) setExpanded(null);
      setDeleteTarget(null);
    },
  });

  const filtered = filter === "all" ? inquiries : inquiries.filter((i) => i.status === filter);

  const counts = {
    all: inquiries.length,
    new: inquiries.filter((i) => i.status === "new").length,
    contacted: inquiries.filter((i) => i.status === "contacted").length,
    converted: inquiries.filter((i) => i.status === "converted").length,
    closed: inquiries.filter((i) => i.status === "closed").length,
  };

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  if (isError)
    return (
      <div className="text-destructive p-4 bg-destructive/10 rounded-xl">
        Failed to load inquiries.
      </div>
    );

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-bold font-display text-slate-900">Inquiries</h1>
        <p className="text-slate-500 mt-1">
          School and parent inquiries submitted via the portal
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "new", "contacted", "converted", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filter === s
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
            }`}
          >
            {s === "all" ? "All" : STATUS_CONFIG[s].label}{" "}
            <span className="ml-1 opacity-60">{counts[s]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="border-none shadow-md">
          <CardContent className="py-16 text-center text-slate-400">
            No inquiries found.
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {filtered.map((inq) => {
          const isOpen = expanded === inq.id;
          const cfg = STATUS_CONFIG[inq.status];
          return (
            <Card key={inq.id} className="border-none shadow-md overflow-hidden">
              <CardHeader
                className="pb-3 cursor-pointer select-none"
                onClick={() => setExpanded(isOpen ? null : inq.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        inq.inquiryType === "school"
                          ? "bg-indigo-100"
                          : "bg-teal-100"
                      }`}
                    >
                      {inq.inquiryType === "school" ? (
                        <School size={18} className="text-indigo-600" />
                      ) : (
                        <User size={18} className="text-teal-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{inq.contactName}</CardTitle>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wide ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-400 capitalize">
                          {inq.inquiryType}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">{inq.contactEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:block">
                      {formatDate(inq.createdAt)}
                    </span>
                    <Select
                      value={inq.status}
                      onValueChange={(val) => {
                        updateStatus.mutate({ id: inq.id, status: val });
                      }}
                    >
                      <SelectTrigger
                        className="h-8 text-xs w-32"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(inq);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isOpen && (
                <CardContent className="pt-0 pb-5 border-t border-slate-100">
                  <div className="grid sm:grid-cols-2 gap-5 mt-4">
                    <div className="space-y-3">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        Contact Details
                      </h4>
                      <div className="space-y-2">
                        <InfoRow icon={Mail} label="Email" value={inq.contactEmail} href={`mailto:${inq.contactEmail}`} />
                        {inq.contactPhone && <InfoRow icon={Phone} label="Phone" value={inq.contactPhone} />}
                        {inq.organisation && <InfoRow icon={Building2} label="Organisation" value={inq.organisation} />}
                        {inq.role && <InfoRow icon={User} label="Role" value={inq.role} />}
                        <InfoRow icon={Calendar} label="Submitted" value={formatDate(inq.createdAt)} />
                      </div>
                    </div>

                    {(inq.studentName || inq.studentAge || inq.yearGroup) && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          Student Details
                        </h4>
                        <div className="space-y-2">
                          {inq.studentName && <InfoRow icon={User} label="Name" value={inq.studentName} />}
                          {inq.studentAge && <InfoRow icon={User} label="Age" value={inq.studentAge} />}
                          {inq.yearGroup && <InfoRow icon={User} label="Year Group" value={inq.yearGroup} />}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      Message / Reason
                    </h4>
                    <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {inq.message}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this inquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the inquiry from{" "}
              <span className="font-semibold text-slate-700">{deleteTarget?.contactName}</span>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteInquiry.mutate(deleteTarget.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
      <span className="text-xs text-slate-500 w-20 flex-shrink-0">{label}</span>
      {href ? (
        <a href={href} className="text-xs text-primary hover:underline truncate">
          {value}
        </a>
      ) : (
        <span className="text-xs text-slate-700">{value}</span>
      )}
    </div>
  );
}
