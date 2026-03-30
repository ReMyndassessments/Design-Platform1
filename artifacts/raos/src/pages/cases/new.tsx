import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCreateCase, useListUsers, useGetCurrentUser } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NewCase() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createCaseMut = useCreateCase();
  const { data: users } = useListUsers();
  const { data: currentUser } = useGetCurrentUser();
  const isAdmin = currentUser?.role === "admin";
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

  const isPsych = currentUser?.role === "psychometrician";

  useEffect(() => {
    if (!currentUser?.id) return;
    if (isLead) {
      setFormData(prev => ({ ...prev, assignedLeadId: currentUser.id }));
    } else if (isPsych) {
      setFormData(prev => ({ ...prev, assignedPsychId: currentUser.id }));
    }
  }, [isLead, isPsych, currentUser?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCaseMut.mutate({ data: formData }, {
      onSuccess: (data) => {
        toast({ title: "Success", description: "Case created successfully." });
        setLocation(`/cases/${data.id}`);
      },
      onError: (err) => {
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
                <Input name="school" required value={formData.school} onChange={handleChange} />
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
