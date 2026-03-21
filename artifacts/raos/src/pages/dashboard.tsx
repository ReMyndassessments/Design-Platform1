import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (isError || !stats) return <div className="text-destructive p-4 bg-destructive/10 rounded-xl">Failed to load dashboard data.</div>;

  const phaseLabels: Record<string, string> = {
    pre_commitment: "Pre-Commitment",
    intake: "Intake",
    setup: "Setup",
    forms: "Forms",
    assessment: "Assessment",
    scoring: "Scoring",
    report: "Report",
    debrief: "Debrief",
    complete: "Complete",
  };

  const chartData = Object.entries(stats.casesByPhase || {}).map(([phase, count]) => ({
    name: phaseLabels[phase] ?? phase.replace(/_/g, ' '),
    count
  }));

  const statCards = [
    { title: "Total Active Cases", value: stats.activeCases, icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Pending Forms", value: stats.pendingForms, icon: FileText, color: "text-amber-600", bg: "bg-amber-100" },
    { title: "Overdue Forms", value: stats.overdueForms, icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
    { title: "Completed Cases", value: stats.completedCases, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-bold font-display text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of all assessment activities</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-none shadow-md overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.title}</p>
                <h3 className="text-3xl font-display font-bold text-slate-900">{stat.value}</h3>
              </div>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon size={28} className={stat.color} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pipeline Chart */}
        <Card className="col-span-1 lg:col-span-2 border-none shadow-md">
          <CardHeader>
            <CardTitle>Case Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} angle={-35} textAnchor="end" interval={0} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip 
                    cursor={{fill: '#F1F5F9'}} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Cases */}
        <Card className="col-span-1 border-none shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>Recent Cases</CardTitle>
            <Link href="/cases" className="text-sm text-primary hover:underline font-medium flex items-center">
              View All <ArrowRight size={14} className="ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mt-2">
              {stats.recentCases?.map(c => (
                <Link key={c.id} href={`/cases/${c.id}`}>
                  <div className="group block p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-primary/20 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">{c.studentName}</h4>
                      <Badge variant={c.caseStatus === 'active' ? 'success' : 'secondary'} className="text-[10px] capitalize">
                        {c.caseStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span className="capitalize">{c.currentPhase.replace('_', ' ')}</span>
                      <span className="flex items-center">
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full mr-2 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{width: `${c.progressPercentage}%`}} />
                        </div>
                        {c.progressPercentage}%
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
              {(!stats.recentCases || stats.recentCases.length === 0) && (
                <div className="text-center py-8 text-slate-400">No recent cases</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
