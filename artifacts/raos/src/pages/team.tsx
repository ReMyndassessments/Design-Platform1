import React, { useState } from "react";
import {
  useListUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  ChevronDown,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  assessment_lead: "Invigilator",
  psychometrician: "Psychometrician",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700 border-violet-200",
  assessment_lead: "bg-blue-100 text-blue-700 border-blue-200",
  psychometrician: "bg-emerald-100 text-emerald-700 border-emerald-200",
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

// ── Add Staff Modal ───────────────────────────────────────────────────────────

function AddStaffModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const createMut = useCreateUser();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"assessment_lead" | "psychometrician">("assessment_lead");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setError(null);
    if (!name.trim()) { setError("Full name is required."); return; }
    if (!email.trim()) { setError("Email is required."); return; }
    if (!password.trim() || password.length < 6) { setError("Password must be at least 6 characters."); return; }

    createMut.mutate(
      { name: name.trim(), email: email.trim().toLowerCase(), password, role },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/users"] });
          onClose();
        },
        onError: (err: any) => {
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
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
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-10"
              placeholder="e.g. Sarah Chen"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Email Address <span className="text-red-500">*</span></label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-10"
              placeholder="name@remynd.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Temporary Password <span className="text-red-500">*</span></label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="h-10"
              placeholder="Min. 6 characters"
            />
            <p className="text-xs text-slate-400">Staff will use this to log in. Ask them to note it down.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Role <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "assessment_lead", label: "Invigilator", desc: "Pre-commitment & intake phases" },
                { value: "psychometrician", label: "Psychometrician", desc: "Scoring & report phases" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    role === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <p className={cn("text-sm font-semibold", role === opt.value ? "text-primary" : "text-slate-700")}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

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

// ── Edit Staff Modal ──────────────────────────────────────────────────────────

function EditStaffModal({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient();
  const updateMut = useUpdateUser();

  const [name, setName] = useState(user.name ?? "");
  const [role, setRole] = useState<"assessment_lead" | "psychometrician">(user.role);
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    setError(null);
    if (!name.trim()) { setError("Name is required."); return; }

    updateMut.mutate(
      { userId: user.id, data: { name: name.trim(), role } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/users"] });
          onClose();
        },
        onError: () => setError("Failed to update. Please try again."),
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
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
            <label className="text-sm font-semibold text-slate-700">Email</label>
            <Input value={user.email} disabled className="h-10 bg-slate-50 text-slate-400" />
            <p className="text-xs text-slate-400">Email cannot be changed after account creation.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">Role</label>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "assessment_lead", label: "Invigilator", desc: "Pre-commitment & intake phases" },
                { value: "psychometrician", label: "Psychometrician", desc: "Scoring & report phases" },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={cn(
                    "p-3 rounded-xl border-2 text-left transition-all",
                    role === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <p className={cn("text-sm font-semibold", role === opt.value ? "text-primary" : "text-slate-700")}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

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

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirmDialog({ user, onClose }: { user: any; onClose: () => void }) {
  const qc = useQueryClient();
  const deleteMut = useDeleteUser();

  const handleDelete = () => {
    deleteMut.mutate(
      { userId: user.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: ["/api/users"] });
          onClose();
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

// ── Staff Row ─────────────────────────────────────────────────────────────────

function StaffRow({ user, isSelf }: { user: any; isSelf: boolean }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const initials = user.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  return (
    <>
      <div className="flex items-center gap-4 py-4 px-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900 text-sm">{user.name}</p>
            {isSelf && (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">You</span>
            )}
            <RoleBadge role={user.role} />
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
        </div>

        {/* Joined */}
        <div className="hidden sm:block text-xs text-slate-400 flex-shrink-0">
          Joined {formatDate(user.createdAt)}
        </div>

        {/* Actions — hidden for self and admin accounts */}
        {!isSelf && user.role !== "admin" && (
          <div className="flex items-center gap-1 flex-shrink-0">
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

        {/* Lock icon for admin / self */}
        {(isSelf || user.role === "admin") && (
          <div className="flex-shrink-0">
            <Shield size={16} className="text-slate-300" title="Protected account" />
          </div>
        )}
      </div>

      {editing && <EditStaffModal user={user} onClose={() => setEditing(false)} />}
      {deleting && <DeleteConfirmDialog user={user} onClose={() => setDeleting(false)} />}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { data: users, isLoading } = useListUsers();
  const { data: currentUser, isLoading: userLoading } = useGetCurrentUser();
  const [, navigate] = useLocation();
  const [adding, setAdding] = useState(false);

  React.useEffect(() => {
    if (!userLoading && currentUser && currentUser.role !== "admin") {
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, currentUser]);

  if (userLoading || !currentUser) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  if (currentUser.role !== "admin") {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const sorted = (users ?? []).slice().sort((a, b) => {
    const order = { admin: 0, assessment_lead: 1, psychometrician: 2 };
    return (order[a.role as keyof typeof order] ?? 9) - (order[b.role as keyof typeof order] ?? 9);
  });

  const adminUsers = sorted.filter(u => u.role === "admin");
  const staffUsers = sorted.filter(u => u.role !== "admin");

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
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

      {/* Stats strip */}
      {!isLoading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Staff", value: sorted.length, color: "text-slate-700" },
            { label: "Invigilators", value: sorted.filter(u => u.role === "assessment_lead").length, color: "text-blue-600" },
            { label: "Psychometricians", value: sorted.filter(u => u.role === "psychometrician").length, color: "text-emerald-600" },
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
          {/* Admin section */}
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

          {/* Staff section */}
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users size={12} /> Assessment Staff
            </h2>
            {staffUsers.length === 0 ? (
              <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-xl">
                <UserPlus size={32} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 text-sm font-medium">No staff added yet</p>
                <p className="text-slate-400 text-xs mt-1">Click "Add Staff" to bring on your first invigilator or psychometrician.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {staffUsers.map(u => (
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
