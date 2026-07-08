import React, { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useGetCurrentUser,
  type ListUsersQueryResult,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  UserPlus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Shield,
  Users,
  ShieldAlert,
  Building2,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StaffUser = ListUsersQueryResult[number] & { schoolName?: string | null };

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  assessment_invigilator: "Invigilator",
  psychometrician: "Psychometrician",
  school_clinical_coordinator: "School Coordinator",
  clinical_apprentice: "Clinical Apprentice",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700 border-violet-200",
  assessment_invigilator: "bg-blue-100 text-blue-700 border-blue-200",
  psychometrician: "bg-emerald-100 text-emerald-700 border-emerald-200",
  school_clinical_coordinator: "bg-purple-100 text-purple-700 border-purple-200",
  clinical_apprentice: "bg-amber-100 text-amber-700 border-amber-200",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      ROLE_COLORS[role] ?? "bg-slate-100 text-slate-600 border-slate-200"
    )}>
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

type AssignableRole = "assessment_invigilator" | "psychometrician" | "school_clinical_coordinator" | "clinical_apprentice";

function AddStaffModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const createMut = useCreateUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AssignableRole>("assessment_invigilator");
  const [schoolName, setSchoolName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    if (!name.trim()) { setError("Full name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password.trim() || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (role === "school_clinical_coordinator" && !schoolName.trim()) {
      setError("School name is required for a School Coordinator account."); return;
    }

    createMut.mutate(
      {
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: role as any,
          ...((role === "school_clinical_coordinator" ? { school_name: schoolName.trim() } : {}) as any),
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/users"] });
          qc.invalidateQueries({ queryKey: ["/api/users/assignable"] });
          onClose();
        },
        onError: (err: Error) => {
          const msg = err?.message ?? "";
          if (msg.includes("409") || msg.includes("conflict")) {
            setError("A staff member with this email already exists.");
          } else {
            setError("Failed to create account. Please try again.");
          }
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <UserPlus size={16} className="text-primary" />
            <h2 className="font-bold text-slate-900 text-base">Add Staff Member</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Full Name <span className="text-red-500">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-10" placeholder="e.g. Sarah Chen" autoFocus />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Email Address <span className="text-red-500">*</span></label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-10" placeholder="name@school.edu" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Temporary Password <span className="text-red-500">*</span></label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-10" placeholder="Min. 6 characters" />
            <p className="text-xs text-slate-400">Staff will use this to log in. Ask them to note it down.</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Role <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {(["assessment_invigilator", "psychometrician"] as AssignableRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    role === r ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <p className={cn("text-sm font-semibold", role === r ? "text-primary" : "text-slate-700")}>
                    {ROLE_LABELS[r]}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {r === "assessment_invigilator" ? "Assessment, scoring & report phases" : "Scoring & report phases"}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRole("school_clinical_coordinator")}
              className={cn(
                "w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                role === "school_clinical_coordinator"
                  ? "border-purple-500 bg-purple-50/60"
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              <Building2 size={16} className={role === "school_clinical_coordinator" ? "text-purple-600" : "text-slate-400"} />
              <div>
                <p className={cn("text-sm font-semibold", role === "school_clinical_coordinator" ? "text-purple-700" : "text-slate-700")}>
                  School Clinical Coordinator
                </p>
                <p className="text-xs text-slate-400 mt-0.5">In-house partner school coordinator — restricted to contracted schools</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setRole("clinical_apprentice")}
              className={cn(
                "w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                role === "clinical_apprentice"
                  ? "border-amber-500 bg-amber-50/60"
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              <GraduationCap size={16} className={role === "clinical_apprentice" ? "text-amber-600" : "text-slate-400"} />
              <div>
                <p className={cn("text-sm font-semibold", role === "clinical_apprentice" ? "text-amber-700" : "text-slate-700")}>
                  Clinical Apprentice
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Read-only training access, limited to assigned cases</p>
              </div>
            </button>
          </div>

          {role === "school_clinical_coordinator" && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">School / Organisation <span className="text-red-500">*</span></label>
              <Input
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                className="h-10"
                placeholder="e.g. Greenwood International School"
              />
              <p className="text-xs text-slate-400">Identifies the partner school for this coordinator account.</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleCreate} disabled={createMut.isPending}>
            {createMut.isPending ? "Creating..." : "Add Staff Member"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditStaffModal({ user, onClose }: { user: StaffUser; onClose: () => void }) {
  const qc = useQueryClient();
  const updateMut = useUpdateUser();

  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [role, setRole] = useState<AssignableRole>(user.role as AssignableRole);
  const [schoolName, setSchoolName] = useState((user as any).schoolName ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    if (!name.trim()) { setError("Name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (role === "school_clinical_coordinator" && !schoolName.trim()) {
      setError("School name is required for a School Coordinator account."); return;
    }

    updateMut.mutate(
      {
        id: user.id,
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: role as any,
          ...((role === "school_clinical_coordinator"
            ? { school_name: schoolName.trim() }
            : { school_name: null }) as any),
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/users"] });
          qc.invalidateQueries({ queryKey: ["/api/users/assignable"] });
          onClose();
        },
        onError: () => setError("Failed to update. Please try again."),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Pencil size={16} className="text-primary" />
            <h2 className="font-bold text-slate-900 text-base">Edit Staff Member</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Full Name <span className="text-red-500">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-10" />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Email <span className="text-red-500">*</span></label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-10" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Role</label>
            <div className="grid grid-cols-2 gap-3">
              {(["assessment_invigilator", "psychometrician"] as AssignableRole[]).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    role === r ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <p className={cn("text-sm font-semibold", role === r ? "text-primary" : "text-slate-700")}>
                    {ROLE_LABELS[r]}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {r === "assessment_invigilator" ? "Assessment, scoring & report phases" : "Scoring & report phases"}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setRole("school_clinical_coordinator")}
              className={cn(
                "w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                role === "school_clinical_coordinator"
                  ? "border-purple-500 bg-purple-50/60"
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              <Building2 size={16} className={role === "school_clinical_coordinator" ? "text-purple-600" : "text-slate-400"} />
              <div>
                <p className={cn("text-sm font-semibold", role === "school_clinical_coordinator" ? "text-purple-700" : "text-slate-700")}>
                  School Clinical Coordinator
                </p>
                <p className="text-xs text-slate-400 mt-0.5">In-house partner school coordinator</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setRole("clinical_apprentice")}
              className={cn(
                "w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                role === "clinical_apprentice"
                  ? "border-amber-500 bg-amber-50/60"
                  : "border-slate-200 hover:border-slate-300"
              )}
            >
              <GraduationCap size={16} className={role === "clinical_apprentice" ? "text-amber-600" : "text-slate-400"} />
              <div>
                <p className={cn("text-sm font-semibold", role === "clinical_apprentice" ? "text-amber-700" : "text-slate-700")}>
                  Clinical Apprentice
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Read-only training access, limited to assigned cases</p>
              </div>
            </button>
          </div>

          {role === "school_clinical_coordinator" && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">School / Organisation <span className="text-red-500">*</span></label>
              <Input
                value={schoolName}
                onChange={e => setSchoolName(e.target.value)}
                className="h-10"
                placeholder="e.g. Greenwood International School"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={updateMut.isPending}>
            {updateMut.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({ user, onClose }: { user: StaffUser; onClose: () => void }) {
  const qc = useQueryClient();
  const deleteMut = useDeleteUser();

  const { toast } = useToast();

  const handleDelete = () => {
    deleteMut.mutate(
      { id: user.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/users"] });
          qc.invalidateQueries({ queryKey: ["/api/users/assignable"] });
          onClose();
        },
        onError: (error: any) => {
          toast({
            title: "Could not remove staff member",
            description: error?.message ?? "Something went wrong. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <h2 className="font-bold text-slate-900 text-lg mb-1">Remove Staff Member</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Are you sure you want to remove <span className="font-semibold text-slate-700">{user.name}</span>? They will lose access immediately.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleteMut.isPending}>
            {deleteMut.isPending ? "Removing..." : "Remove"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StaffRow({ user, isSelf }: { user: StaffUser; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [managingCompetencies, setManagingCompetencies] = useState(false);

  const initials = user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
  const isCoordinator = user.role === "school_clinical_coordinator";
  const isApprentice = user.role === "clinical_apprentice";
  const avatarBg = isCoordinator ? "from-purple-200 to-purple-400" : "from-primary/20 to-primary/40";
  const avatarText = isCoordinator ? "text-purple-700" : "text-primary";

  return (
    <>
      <div className="flex items-center gap-4 py-4 px-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarBg} flex items-center justify-center text-sm font-bold ${avatarText} flex-shrink-0`}>
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
            {isSelf && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">You</span>}
            <RoleBadge role={user.role} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
          {isCoordinator && (user as any).schoolName && (
            <p className="text-xs text-purple-600 mt-0.5 font-medium flex items-center gap-1">
              <Building2 size={10} /> {(user as any).schoolName}
            </p>
          )}
        </div>

        <div className="hidden sm:block text-xs text-slate-400 flex-shrink-0">
          Joined {formatDate(user.createdAt)}
        </div>

        {!isSelf && user.role !== "admin" && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {isApprentice && (
              <button
                onClick={() => setManagingCompetencies(true)}
                title="Track Competencies"
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <GraduationCap size={14} />
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              title="Edit"
              className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => setDeleting(true)}
              title="Remove"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {(isSelf || user.role === "admin") && (
          <div className="flex-shrink-0">
            <Shield size={16} className="text-slate-300" title="Protected account" />
          </div>
        )}
      </div>

      {editing && <EditStaffModal user={user} onClose={() => setEditing(false)} />}
      {deleting && <DeleteConfirmDialog user={user} onClose={() => setDeleting(false)} />}
      {managingCompetencies && <CompetencyModal user={user} onClose={() => setManagingCompetencies(false)} />}
    </>
  );
}

const BASE_URL_TEAM = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function teamAuthHeaders() {
  const token = localStorage.getItem("raos_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

interface Competency {
  id: string | null;
  apprenticeUserId: string;
  competencyKey: string;
  competencyLabel: string;
  status: "not_started" | "observing" | "guided_practice" | "competent";
  mentorNotes: string | null;
  updatedAt: string | null;
}

const COMPETENCY_STATUS_OPTIONS: { value: Competency["status"]; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "observing", label: "Observing" },
  { value: "guided_practice", label: "Guided practice" },
  { value: "competent", label: "Competent" },
];

function CompetencyModal({ user, onClose }: { user: StaffUser; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, { status: Competency["status"]; mentorNotes: string }>>({});

  const { data: competencies, isLoading } = useQuery<Competency[]>({
    queryKey: ["admin-apprentice-competencies", user.id],
    queryFn: async () => {
      const res = await fetch(`${BASE_URL_TEAM}/api/apprentices/${user.id}/competencies`, { headers: teamAuthHeaders() });
      if (!res.ok) throw new Error("Failed to load competencies");
      return res.json();
    },
  });

  const saveMut = useMutation({
    mutationFn: async (c: Competency) => {
      const draft = drafts[c.competencyKey];
      const res = await fetch(`${BASE_URL_TEAM}/api/apprentices/${user.id}/competencies/${c.competencyKey}`, {
        method: "PATCH",
        headers: teamAuthHeaders(),
        body: JSON.stringify({
          status: draft?.status ?? c.status,
          mentorNotes: draft?.mentorNotes ?? c.mentorNotes ?? "",
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-apprentice-competencies", user.id] });
      toast({ title: "Competency updated" });
    },
    onError: () => toast({ title: "Could not save competency", variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap size={16} className="text-amber-600" />
            {user.name}'s Competencies
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {(competencies ?? []).map((c) => {
              const draft = drafts[c.competencyKey] ?? { status: c.status, mentorNotes: c.mentorNotes ?? "" };
              const dirty = draft.status !== c.status || draft.mentorNotes !== (c.mentorNotes ?? "");
              return (
                <div key={c.competencyKey} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{c.competencyLabel}</p>
                    <select
                      value={draft.status}
                      onChange={(e) => setDrafts(prev => ({ ...prev, [c.competencyKey]: { ...draft, status: e.target.value as Competency["status"] } }))}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white"
                    >
                      {COMPETENCY_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Mentor notes (optional)"
                    value={draft.mentorNotes}
                    onChange={(e) => setDrafts(prev => ({ ...prev, [c.competencyKey]: { ...draft, mentorNotes: e.target.value } }))}
                    className="text-xs"
                  />
                  {dirty && (
                    <div className="flex justify-end">
                      <Button size="sm" className="h-7 text-xs" disabled={saveMut.isPending} onClick={() => saveMut.mutate(c)}>
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamPage() {
  const { data: currentUser, isLoading: userLoading } = useGetCurrentUser();
  const isAdmin = !userLoading && currentUser?.role === "admin";
  const { data: users, isLoading } = useListUsers({ query: { enabled: isAdmin } });
  const [adding, setAdding] = useState(false);

  if (userLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (currentUser.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8">
        <ShieldAlert size={40} className="text-red-500" />
        <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-slate-500 max-w-sm">You don't have permission to view this page. This area is restricted to administrators.</p>
      </div>
    );
  }

  const typed = (users ?? []) as StaffUser[];
  const sorted = typed.slice().sort((a, b) => {
    const order: Record<string, number> = { admin: 0, assessment_invigilator: 1, psychometrician: 2, school_clinical_coordinator: 3, clinical_apprentice: 4 };
    return (order[a.role] ?? 9) - (order[b.role] ?? 9);
  });

  const adminUsers = sorted.filter(u => u.role === "admin");
  const staffUsers = sorted.filter(u => u.role === "assessment_invigilator" || u.role === "psychometrician");
  const coordinators = sorted.filter(u => u.role === "school_clinical_coordinator");
  const apprentices = sorted.filter(u => u.role === "clinical_apprentice");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500 mt-1">Manage staff access and roles in the ReMynd system.</p>
        </div>
        <Button onClick={() => setAdding(true)} className="gap-2 flex-shrink-0">
          <UserPlus size={16} />
          Add Staff
        </Button>
      </div>

      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Staff", value: sorted.length, color: "text-slate-700" },
            { label: "Invigilators", value: sorted.filter(u => u.role === "assessment_invigilator").length, color: "text-blue-600" },
            { label: "Psychometricians", value: sorted.filter(u => u.role === "psychometrician").length, color: "text-emerald-600" },
            { label: "School Partners", value: coordinators.length, color: "text-purple-600" },
            { label: "Apprentices", value: apprentices.length, color: "text-amber-600" },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
              <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {!isLoading && (
        <div className="space-y-6">
          {adminUsers.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Shield size={12} /> Administrators
              </h2>
              <div className="space-y-2">
                {adminUsers.map(u => (
                  <StaffRow key={u.id} user={u} isSelf={u.id === currentUser?.id} />
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users size={12} /> Assessment Staff
            </h2>
            {staffUsers.length === 0 ? (
              <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-xl">
                <UserPlus size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">No assessment staff added yet</p>
                <p className="text-slate-400 text-xs mt-1">Click "Add Staff" to add an invigilator or psychometrician.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {staffUsers.map(u => (
                  <StaffRow key={u.id} user={u} isSelf={u.id === currentUser?.id} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Building2 size={12} /> School Partner Coordinators
            </h2>
            {coordinators.length === 0 ? (
              <div className="text-center py-10 bg-purple-50/40 border border-dashed border-purple-200 rounded-xl">
                <Building2 size={28} className="mx-auto text-purple-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">No partner schools onboarded yet</p>
                <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                  When a school signs a partnership agreement, add their coordinator account here to activate the in-house program.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {coordinators.map(u => (
                  <StaffRow key={u.id} user={u} isSelf={u.id === currentUser?.id} />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <GraduationCap size={12} /> Clinical Apprentices
            </h2>
            {apprentices.length === 0 ? (
              <div className="text-center py-10 bg-amber-50/40 border border-dashed border-amber-200 rounded-xl">
                <GraduationCap size={28} className="mx-auto text-amber-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">No apprentices added yet</p>
                <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">
                  Add a training-program apprentice, then assign them to specific cases from the case detail page.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {apprentices.map(u => (
                  <StaffRow key={u.id} user={u} isSelf={u.id === currentUser?.id} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {adding && <AddStaffModal onClose={() => setAdding(false)} />}
    </div>
  );
}
