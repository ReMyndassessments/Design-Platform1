import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateCase, useListUsers, useGetCurrentUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, LayoutGrid, Check } from "lucide-react";
import { Link } from "wouter";
import { ALL_PRODUCTS_BY_MARKET, MARKET_LABELS } from "@/lib/products";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function authHeaders() {
  const token = localStorage.getItem("raos_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const MARKET_COLORS: Record<string, string> = {
  Schools: "border-violet-200 bg-violet-50",
  Parents: "border-sky-200 bg-sky-50",
  Corporate: "border-amber-200 bg-amber-50",
  Universities: "border-teal-200 bg-teal-50",
  Specialized: "border-rose-200 bg-rose-50",
};

const MARKET_BADGE: Record<string, string> = {
  Schools: "bg-violet-100 text-violet-700",
  Parents: "bg-sky-100 text-sky-700",
  Corporate: "bg-amber-100 text-amber-700",
  Universities: "bg-teal-100 text-teal-700",
  Specialized: "bg-rose-100 text-rose-700",
};

export default function NewCase() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createCaseMut = useCreateCase();
  const { data: users } = useListUsers();
  const { data: currentUser } = useGetCurrentUser();
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "school_clinical_coordinator";
  const isLead = currentUser?.role === "assessment_invigilator";

  const [formData, setFormData] = useState({
    studentName: "",
    dob: "",
    school: "",
    grade: "",
    languagePreference: "english" as const,
    referralReason: "",
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    assignedLeadId: "",
    assignedPsychId: ""
  });

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);

  const isPsych = currentUser?.role === "psychometrician";
  const isCoordinator = currentUser?.role === "school_clinical_coordinator";

  useEffect(() => {
    if (currentUser && !isAdmin && !isCoordinator) {
      setLocation("/cases");
    }
  }, [currentUser, isAdmin, isCoordinator, setLocation]);

  useEffect(() => {
    if (!currentUser?.id) return;
    if (isLead) {
      setFormData(prev => ({ ...prev, assignedLeadId: currentUser.id }));
    } else if (isPsych) {
      setFormData(prev => ({ ...prev, assignedPsychId: currentUser.id }));
    } else if (isCoordinator && currentUser.schoolName) {
      setFormData(prev => ({ ...prev, school: currentUser.schoolName! }));
    }
  }, [isLead, isPsych, isCoordinator, currentUser?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  function toggleProduct(id: string) {
    setSelectedProductIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createCaseMut.mutate({ data: formData }, {
      onSuccess: async (data) => {
        if (selectedProductIds.length > 0) {
          try {
            await fetch(`${BASE_URL}/api/cases/${data.id}/product-ids`, {
              method: "PATCH",
              headers: authHeaders(),
              body: JSON.stringify({ productIds: selectedProductIds }),
            });
          } catch {
            // Non-fatal — case is still created
          }
        }
        toast({ title: "Success", description: "Case created successfully." });
        setLocation(`/cases/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create case.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex items-center space-x-4">
        <Link href="/cases">
          <Button variant="ghost" size="icon" className="rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600">
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Create New Case</h1>
          <p className="text-slate-500">Enter student details to begin the intake process</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-none shadow-lg">
          <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Student Name *</label>
                <Input name="studentName" required value={formData.studentName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date of Birth *</label>
                <Input type="date" name="dob" required value={formData.dob} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">School *</label>
                {isCoordinator
                  ? <Input name="school" required value={formData.school} readOnly className="bg-slate-50 cursor-not-allowed text-slate-500" />
                  : <Input name="school" required value={formData.school} onChange={handleChange} />
                }
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Grade</label>
                <Input name="grade" value={formData.grade} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Language Preference *</label>
                <select
                  name="languagePreference"
                  value={formData.languagePreference}
                  onChange={handleChange}
                  className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                >
                  <option value="english">English</option>
                  <option value="mandarin">Mandarin</option>
                  <option value="cantonese">Cantonese</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Referral Reason *</label>
              <Textarea
                name="referralReason"
                required
                value={formData.referralReason}
                onChange={handleChange}
                className="min-h-[120px]"
                placeholder="Describe why the student is being referred for assessment..."
              />
            </div>

            <hr className="my-8" />
            <h3 className="text-lg font-display font-semibold mb-4 text-slate-800">Parent/Guardian Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Parent Name</label>
                <Input name="parentName" value={formData.parentName} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Parent Email</label>
                <Input type="email" name="parentEmail" value={formData.parentEmail} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Parent Phone</label>
                <Input type="tel" name="parentPhone" value={formData.parentPhone} onChange={handleChange} />
              </div>
            </div>

            {!isCoordinator && (<>
            <hr className="my-8" />
            <h3 className="text-lg font-display font-semibold mb-4 text-slate-800">Team Assignment</h3>
            {isAdmin ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Assessment Lead</label>
                  <select
                    name="assignedLeadId"
                    value={formData.assignedLeadId}
                    onChange={handleChange}
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                  >
                    <option value="">Unassigned</option>
                    {users?.filter(u => u.role === 'assessment_invigilator' || u.role === 'admin').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Psychometrician</label>
                  <select
                    name="assignedPsychId"
                    value={formData.assignedPsychId}
                    onChange={handleChange}
                    className="flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10"
                  >
                    <option value="">Unassigned</option>
                    {users?.filter(u => u.role === 'psychometrician' || u.role === 'admin').map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                {isLead ? "You will be assigned as Assessment Lead for this case." : "Your administrator will assign team members to this case."}
              </p>
            )}
            </>)}

            {/* ── Assessment Products ──────────────────────────────────── */}
            <hr className="my-8" />
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-display font-semibold text-slate-800 flex items-center gap-2">
                  <LayoutGrid size={18} className="text-violet-500" />
                  Assessment Products
                  <span className="text-xs font-normal text-slate-400">(optional)</span>
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  Associate one or more named battery products with this case. You can add or change these later.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 flex-shrink-0"
                onClick={() => setShowProductPicker(v => !v)}
              >
                <LayoutGrid size={13} />
                {showProductPicker ? "Hide" : "Select Products"}
                {selectedProductIds.length > 0 && (
                  <span className="ml-1 bg-violet-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {selectedProductIds.length}
                  </span>
                )}
              </Button>
            </div>

            {/* Selected summary pills */}
            {selectedProductIds.length > 0 && !showProductPicker && (
              <div className="flex flex-wrap gap-2">
                {selectedProductIds.map(id => {
                  const product = ALL_PRODUCTS_BY_MARKET.flatMap(g => g.items).find(p => p.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleProduct(id)}
                      className="flex items-center gap-1.5 text-xs bg-violet-100 text-violet-700 border border-violet-200 px-2.5 py-1 rounded-full hover:bg-violet-200 transition-colors"
                    >
                      {product?.name ?? id}
                      <span className="text-violet-400">×</span>
                    </button>
                  );
                })}
              </div>
            )}

            {showProductPicker && (
              <div className="space-y-5">
                {ALL_PRODUCTS_BY_MARKET.map(group => (
                  <div key={group.market}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${MARKET_BADGE[group.market] ?? "bg-slate-100 text-slate-600"}`}>
                        {group.market}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.items.map(product => {
                        const isSelected = selectedProductIds.includes(product.id);
                        return (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => toggleProduct(product.id)}
                            className={`flex items-start gap-3 text-left p-3 rounded-lg border transition-all ${
                              isSelected
                                ? `${MARKET_COLORS[group.market] ?? "bg-violet-50 border-violet-200"} ring-1 ring-violet-400`
                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                              isSelected ? "bg-violet-600 border-violet-600" : "border-slate-300"
                            }`}>
                              {isSelected && <Check size={11} className="text-white" />}
                            </div>
                            <span className="text-xs font-medium text-slate-800 leading-snug">{product.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-6 flex justify-end gap-3">
              <Link href="/cases">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={createCaseMut.isPending} className="shadow-lg shadow-primary/20">
                {createCaseMut.isPending ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
