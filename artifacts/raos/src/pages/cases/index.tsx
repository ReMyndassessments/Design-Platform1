import { useState } from "react";
import { useListCases, useGetCurrentUser } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function CasesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: cases, isLoading } = useListCases();
  const { data: currentUser } = useGetCurrentUser();
  const isAdmin = currentUser?.role === "admin";

  const filteredCases = cases?.filter(c => 
    c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPhaseBadge = (phase: string) => {
    switch(phase) {
      case 'pre_commitment': return <Badge variant="secondary">Pre-Commitment</Badge>;
      case 'complete': return <Badge variant="success">Complete</Badge>;
      default: return <Badge variant="default" className="capitalize">{phase.replace('_', ' ')}</Badge>;
    }
  };

  const getRiskBadge = (risk: string | null | undefined) => {
    if (!risk) return null;
    switch(risk) {
      case 'low': return <Badge variant="success">Low Risk</Badge>;
      case 'moderate': return <Badge variant="warning">Moderate</Badge>;
      case 'high': return <Badge variant="destructive">High Risk</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-slate-900">Cases</h1>
          <p className="text-slate-500 mt-1">Manage and track all assessment cases</p>
        </div>
        <Link href="/cases/new">
          <Button className="shrink-0 shadow-lg shadow-primary/25">
            <Plus size={18} className="mr-2" /> New Case
          </Button>
        </Link>
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <div className="p-4 border-b bg-slate-50/50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Search by student name or ID..." 
              className="pl-10 bg-white"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="shrink-0 bg-white">
            <Filter size={18} className="mr-2 text-slate-500" /> Filter
          </Button>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Student</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Risk Level</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCases?.map((c) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors">
                    <TableCell className="font-medium text-slate-900">
                      <div>{c.studentName}</div>
                      <div className="text-xs text-slate-500 font-normal mt-0.5">ID: {c.id.substring(0,8)}</div>
                    </TableCell>
                    <TableCell>{getPhaseBadge(c.currentPhase)}</TableCell>
                    <TableCell>
                      <div className="flex items-center min-w-[120px]">
                        <div className="w-full h-2 bg-slate-100 rounded-full mr-3 overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{width: `${c.progressPercentage}%`}} />
                        </div>
                        <span className="text-xs text-slate-500 font-medium">{c.progressPercentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell>{getRiskBadge(c.riskLevel)}</TableCell>
                    <TableCell className="text-slate-500 text-sm">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/cases/${c.id}`}>
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCases?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      {searchTerm ? "No cases found matching your search." : isAdmin ? "No cases yet." : "No cases assigned to you yet."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
