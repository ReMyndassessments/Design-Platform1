import { useParams, Link } from "wouter";
import { useGetCaseScores, useCalculateScores, useGetCase } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function ScoringView() {
  const params = useParams();
  const caseId = params.id as string;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scores, isLoading } = useGetCaseScores(caseId);
  const { data: caseData } = useGetCase(caseId);
  const calcMut = useCalculateScores();

  const handleRecalculate = () => {
    calcMut.mutate({ caseId }, {
      onSuccess: () => {
        toast({ title: "Scores updated" });
        queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId, 'scores'] });
      }
    });
  };

  if (isLoading) return <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  // Prepare data for radar chart (aggregating domains across respondents)
  const domains = new Set<string>();
  scores?.forEach(s => Object.keys(s.normalizedScores).forEach(d => domains.add(d)));
  
  const radarData = Array.from(domains).map(domain => {
    const dataPoint: any = { subject: domain };
    scores?.forEach(s => {
      dataPoint[s.respondentType] = s.normalizedScores[domain] || 0;
    });
    return dataPoint;
  });

  const colors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <Link href={`/cases/${caseId}`}>
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold font-display text-slate-900">Scoring & Analysis</h1>
            <p className="text-slate-500 text-sm">Case: {caseData?.studentName}</p>
          </div>
        </div>
        <Button onClick={handleRecalculate} disabled={calcMut.isPending} variant="outline" className="bg-white">
          <RefreshCw size={16} className={`mr-2 ${calcMut.isPending ? 'animate-spin' : ''}`} /> Recalculate
        </Button>
      </div>

      {!scores || scores.length === 0 ? (
        <Card className="p-12 text-center text-slate-500">
          No scores generated yet. Ensure forms are completed and click recalculate.
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-md border-none">
            <CardHeader>
              <CardTitle>Cross-Informant Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    {Array.from(new Set(scores.map(s => s.respondentType))).map((type, i) => (
                      <Radar key={type} name={type.toUpperCase()} dataKey={type} stroke={colors[i%colors.length]} fill={colors[i%colors.length]} fillOpacity={0.3} />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-none">
            <CardHeader>
              <CardTitle>Domain Profiles (T-Scores)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={radarData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#475569' }} />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend />
                    {Array.from(new Set(scores.map(s => s.respondentType))).map((type, i) => (
                      <Bar key={type} dataKey={type} name={type.toUpperCase()} fill={colors[i%colors.length]} radius={[4,4,0,0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {scores.filter(s => s.hasHighDiscrepancy).length > 0 && (
            <Card className="lg:col-span-2 border-orange-200 bg-orange-50 shadow-sm">
              <CardContent className="p-6 flex items-start space-x-4">
                <AlertTriangle className="text-orange-500 shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-orange-900">High Discrepancy Detected</h3>
                  <p className="text-orange-800 text-sm mt-1">There is significant variance in scores between informants. Consider exploring these differences in the debriefing session.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
