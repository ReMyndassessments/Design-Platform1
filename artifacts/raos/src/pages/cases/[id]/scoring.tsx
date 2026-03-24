import { useParams, Link } from "wouter";
import { useGetCaseScores, useCalculateScores, useGetCase } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, AlertTriangle, FileText, TrendingUp, Users, ClipboardList } from "lucide-react";
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const DOMAIN_LABELS: Record<string, string> = {
  attention: "Attention & Self-Regulation",
  working_memory: "Working Memory & Processing",
  executive_function: "Executive Planning & Organization",
  emotional_regulation: "Emotional Regulation",
  social_communication: "Social Reciprocity & Communication",
  academic_persistence: "Academic Persistence",
  functional_impact: "Functional Impact",
  general: "General",
};

const DOMAIN_DESCRIPTIONS: Record<string, { low: string; mild: string; moderate: string; elevated: string }> = {
  attention: {
    low: "Attention and self-regulation appear to be functioning within typical limits. The respondent did not endorse significant concerns in this area.",
    mild: "Mild difficulties with sustained attention or self-regulation were noted. These may manifest as occasional off-task behavior or difficulty refocusing after disruptions, but are generally manageable in structured environments.",
    moderate: "Moderate concerns were identified in the area of attention and self-regulation. The student may experience consistent difficulty maintaining focus during extended tasks, may be easily distracted, and may require frequent redirection or environmental supports.",
    elevated: "Significant challenges with attention and self-regulation were reported. This level of concern suggests the student may have substantial difficulty maintaining focus, filtering distractions, and regulating their behavior across settings, which likely interferes with daily functioning.",
  },
  working_memory: {
    low: "Working memory and processing capacity appear adequate. The respondent did not indicate significant difficulty holding and manipulating information in mind during tasks.",
    mild: "Mild working memory challenges were noted. The student may occasionally lose track of multi-step instructions or need prompts to recall recently presented information, but can generally compensate with supports.",
    moderate: "Moderate working memory difficulties were identified. The student may have consistent trouble following multi-step directions, retaining information while completing tasks, or demonstrating knowledge under timed or high-demand conditions.",
    elevated: "Marked working memory and processing challenges were reported. This suggests the student may frequently struggle to hold information in mind long enough to use it, significantly impacting their ability to follow directions, complete tasks, and retain new learning.",
  },
  executive_function: {
    low: "Executive planning and organizational skills appear to be developing appropriately. The respondent did not identify meaningful concerns in this domain.",
    mild: "Some mild difficulties with planning, organization, or task initiation were noted. The student may need occasional prompting to start tasks or organize their materials, but generally benefits from structured routines.",
    moderate: "Moderate executive function challenges were reported. The student may have persistent difficulty with planning ahead, organizing their work, managing time, and initiating tasks independently. These challenges may be impacting academic productivity and daily routines.",
    elevated: "Significant executive function difficulties were identified. The student may experience substantial challenges with all aspects of planning, organization, and self-directed action. This level of concern suggests that executive functioning deficits are pervasive and likely impacting multiple areas of school and home life.",
  },
  emotional_regulation: {
    low: "Emotional regulation appears to be within a typical range. The respondent did not report significant concerns regarding the student's ability to manage emotional responses.",
    mild: "Mild emotional regulation challenges were noted. The student may occasionally have difficulty managing frustration, transitions, or unexpected changes, but can generally recover with support.",
    moderate: "Moderate concerns were identified in emotional regulation. The student may exhibit more frequent emotional reactions that are difficult to de-escalate, sensitivity to perceived criticism or failure, or difficulty coping with transitions and changes in routine.",
    elevated: "Significant emotional regulation difficulties were reported. This suggests the student may experience intense emotional responses that are disproportionate to the situation, difficulty returning to a regulated state, and that emotional dysregulation may be substantially disrupting their learning and relationships.",
  },
  social_communication: {
    low: "Social reciprocity and communication skills appear to be functioning within expected parameters. The respondent did not report notable concerns in this area.",
    mild: "Mild social communication challenges were noted. The student may occasionally have difficulty with turn-taking in conversation, reading social cues, or adjusting communication style across contexts, but generally engages in positive peer interactions.",
    moderate: "Moderate concerns were identified in social reciprocity and communication. The student may consistently have difficulty initiating or sustaining peer interactions, understanding nonverbal communication, or navigating the social demands of group settings.",
    elevated: "Significant social communication challenges were reported. This level of concern suggests the student may experience considerable difficulty with the pragmatics of communication, interpreting social situations, and engaging in reciprocal peer relationships, which may be leading to social isolation or conflict.",
  },
  academic_persistence: {
    low: "Academic persistence and motivation appear adequate. The respondent did not identify significant challenges with the student's ability to sustain effort on academic tasks.",
    mild: "Mild challenges with academic persistence were noted. The student may avoid or procrastinate on challenging tasks, give up more easily than peers, or express negative feelings about their academic abilities, but can generally be encouraged to persist.",
    moderate: "Moderate concerns were identified regarding academic persistence. The student may consistently avoid difficult work, demonstrate low academic self-efficacy, or show signs of learned helplessness in challenging situations, requiring significant adult encouragement and task modification.",
    elevated: "Significant difficulties with academic persistence were reported. This suggests the student may show marked avoidance of academic challenge, strong negative beliefs about their ability to succeed, and may disengage from learning tasks to a degree that is substantially limiting their academic progress.",
  },
  functional_impact: {
    low: "Overall functional impact appears minimal. The reported challenges do not seem to be significantly impairing the student's ability to meet daily expectations across settings.",
    mild: "Mild functional impact was noted. While some challenges were identified, their overall effect on the student's day-to-day functioning appears to be limited and may be manageable with targeted, low-intensity supports.",
    moderate: "Moderate functional impact was identified. The combination of challenges noted across domains appears to be meaningfully affecting the student's ability to meet daily academic and behavioral expectations, and may warrant more structured intervention or evaluation.",
    elevated: "Significant functional impairment was reported. The challenges identified appear to be substantially limiting the student's ability to function effectively in academic, social, and/or daily living contexts, and likely warrant comprehensive evaluation and multi-tiered intervention planning.",
  },
  general: {
    low: "Overall functioning in this area appears to be within typical limits based on the information provided.",
    mild: "Mild concerns were noted in this area. Targeted monitoring and low-intensity supports may be beneficial.",
    moderate: "Moderate concerns were identified. This level of difficulty may warrant additional evaluation and structured support.",
    elevated: "Significant concerns were reported in this area. Comprehensive evaluation and intervention planning are recommended.",
  },
};

function getSeverityBand(score: number): { label: string; color: string; bgColor: string; borderColor: string; key: "low" | "mild" | "moderate" | "elevated" } {
  if (score <= 25) return { label: "Low", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", key: "low" };
  if (score <= 50) return { label: "Mild", color: "text-sky-700", bgColor: "bg-sky-50", borderColor: "border-sky-200", key: "mild" };
  if (score <= 65) return { label: "Moderate", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200", key: "moderate" };
  return { label: "Elevated", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200", key: "elevated" };
}

function getOverallNarrative(avgScore: number, studentName: string): string {
  if (avgScore <= 25) {
    return `Overall, the assessment profile for ${studentName} reflects scores in the Low range across most domains. The pattern of responses does not indicate widespread areas of concern at this time. While continued monitoring is always appropriate, these results suggest the student is generally meeting developmental and behavioral expectations as rated by the responding informant(s).`;
  }
  if (avgScore <= 50) {
    return `Overall, the assessment profile for ${studentName} reflects scores primarily in the Mild range. The pattern suggests some areas of emerging concern that may benefit from additional attention, targeted skill-building, or classroom accommodations. A follow-up conversation with the educational team is recommended to determine whether a more formal evaluation or tiered support plan is warranted.`;
  }
  if (avgScore <= 65) {
    return `Overall, the assessment profile for ${studentName} reflects scores in the Moderate range across multiple domains. This pattern of results suggests that the student is experiencing meaningful challenges that are likely impacting their daily functioning in school. A comprehensive evaluation and the development of a structured support plan are strongly recommended. Results should be interpreted in the context of additional data sources, including direct observation, academic records, and family input.`;
  }
  return `Overall, the assessment profile for ${studentName} reflects scores in the Elevated range, indicating significant concerns across multiple functional domains. This pattern suggests the student may be experiencing substantial difficulties that require immediate attention, comprehensive evaluation, and the implementation of intensive, individualized supports. Results should be reviewed by a multidisciplinary team and integrated with all available data before conclusions are drawn or recommendations are finalized.`;
}

function getCrossInformantNarrative(scores: any[], studentName: string): string {
  const types = Array.from(new Set(scores.map(s => s.respondentType)));
  if (types.length <= 1) {
    return `This assessment was completed by a single informant. While the results provide valuable information, cross-setting comparisons are not available. To gain a more complete picture of ${studentName}'s functioning, additional ratings from other informants (e.g., parents, other teachers) are recommended.`;
  }
  const hasDiscrepancy = scores.some(s => s.hasHighDiscrepancy);
  if (hasDiscrepancy) {
    return `Scores were collected from multiple informants, and a high degree of discrepancy was detected between raters. This pattern may reflect genuine behavioral differences across settings, differences in respondent thresholds, or variation in the student's presentation depending on environmental demands, relationship dynamics, or task structure. These discrepancies should be explored directly with each informant during the debriefing process. Cross-informant variability is clinically meaningful and should not be dismissed — it may provide important insights into the conditions under which ${studentName} functions best or faces the greatest challenge.`;
  }
  return `Scores were collected from multiple informants, and there is reasonable agreement across raters. This consistency suggests that the patterns identified in this profile are likely to be observed across settings, increasing confidence in the results. When multiple informants align in their observations, the identified areas of concern are more likely to reflect stable characteristics of the student's functioning rather than situational or rater-specific factors.`;
}

function getRecommendationsNarrative(domains: string[], scores: any[]): string {
  const allNormalizedByDomain: Record<string, number[]> = {};
  for (const s of scores) {
    for (const [domain, val] of Object.entries(s.normalizedScores as Record<string, number>)) {
      if (!allNormalizedByDomain[domain]) allNormalizedByDomain[domain] = [];
      allNormalizedByDomain[domain].push(val);
    }
  }
  const avgByDomain: Record<string, number> = {};
  for (const [domain, vals] of Object.entries(allNormalizedByDomain)) {
    avgByDomain[domain] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  const elevated = Object.entries(avgByDomain).filter(([, v]) => v > 65).map(([k]) => DOMAIN_LABELS[k] ?? k);
  const moderate = Object.entries(avgByDomain).filter(([, v]) => v > 50 && v <= 65).map(([k]) => DOMAIN_LABELS[k] ?? k);

  const lines: string[] = [];
  if (elevated.length > 0) {
    lines.push(`Priority areas for evaluation and intervention include: ${elevated.join(", ")}. These domains show Elevated scores and may require the most immediate attention in planning.`);
  }
  if (moderate.length > 0) {
    lines.push(`Areas showing Moderate concern — including ${moderate.join(", ")} — should also be addressed through targeted monitoring and structured supports, even if not requiring the most intensive level of intervention at this time.`);
  }
  lines.push("All findings should be interpreted within the broader context of the student's educational history, developmental background, and existing supports. This screening profile is not a diagnostic instrument and should be used as one component of a comprehensive evaluation process.");
  lines.push("Next steps may include sharing these results with the student's educational team, obtaining consent for additional formal evaluation if warranted, and scheduling a collaborative debriefing with parents or guardians to review findings and determine appropriate next steps.");

  return lines.join(" ");
}

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

  const domains = new Set<string>();
  scores?.forEach(s => Object.keys(s.normalizedScores).forEach(d => domains.add(d)));
  
  const radarData = Array.from(domains).map(domain => {
    const dataPoint: any = { subject: DOMAIN_LABELS[domain] ?? domain };
    scores?.forEach(s => {
      dataPoint[s.respondentType] = (s.normalizedScores as Record<string, number>)[domain] || 0;
    });
    return dataPoint;
  });

  const colors = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];

  const allNormalizedValues = scores?.flatMap(s => Object.values(s.normalizedScores as Record<string, number>)) ?? [];
  const overallAvg = allNormalizedValues.length > 0
    ? allNormalizedValues.reduce((a, b) => a + b, 0) / allNormalizedValues.length
    : 0;

  const avgByDomain: Record<string, number> = {};
  if (scores && scores.length > 0) {
    const allNormalizedByDomain: Record<string, number[]> = {};
    for (const s of scores) {
      for (const [domain, val] of Object.entries(s.normalizedScores as Record<string, number>)) {
        if (!allNormalizedByDomain[domain]) allNormalizedByDomain[domain] = [];
        allNormalizedByDomain[domain].push(val);
      }
    }
    for (const [domain, vals] of Object.entries(allNormalizedByDomain)) {
      avgByDomain[domain] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }
  }

  const overallBand = getSeverityBand(overallAvg);
  const studentName = caseData?.studentName ?? "the student";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

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
            <p className="text-slate-500 text-sm">Case: {studentName}</p>
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
        <>
          {/* Severity Legend */}
          <Card className="shadow-sm border-none bg-slate-50">
            <CardContent className="py-4 px-6">
              <div className="flex flex-wrap items-center gap-6">
                <span className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Severity:</span>
                {[
                  { label: "Low (0–25)", color: "bg-emerald-500" },
                  { label: "Mild (26–50)", color: "bg-sky-500" },
                  { label: "Moderate (51–65)", color: "bg-amber-500" },
                  { label: "Elevated (66+)", color: "bg-red-500" },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${b.color}`} />
                    <span className="text-sm text-slate-600">{b.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-md border-none">
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11 }} />
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
                <CardTitle>Domain Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={radarData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10 }} angle={-35} textAnchor="end" interval={0} />
                      <YAxis domain={[0, 100]} tick={{ fill: '#475569' }} />
                      <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
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

          {/* ── NARRATIVE REPORT ── */}
          <div className="mt-8 space-y-6">
            {/* Report Header */}
            <div className="border-b-2 border-primary pb-4">
              <div className="flex items-center gap-3 mb-1">
                <FileText size={22} className="text-primary" />
                <h2 className="text-2xl font-bold font-display text-slate-900">Interpretive Report</h2>
              </div>
              <p className="text-slate-500 text-sm ml-9">Generated {today} · {scores.length} informant{scores.length !== 1 ? "s" : ""} · Based on scored assessment data</p>
            </div>

            {/* Overall Summary */}
            <Card className={`shadow-sm border ${overallBand.borderColor} ${overallBand.bgColor}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-slate-800">
                    <TrendingUp size={18} />
                    Overall Profile Summary
                  </CardTitle>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${overallBand.bgColor} ${overallBand.color} border ${overallBand.borderColor}`}>
                    {overallBand.label} Concern · {Math.round(overallAvg)}/100
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed text-sm">
                  {getOverallNarrative(overallAvg, studentName)}
                </p>
              </CardContent>
            </Card>

            {/* Domain-by-Domain Interpretation */}
            <Card className="shadow-sm border-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <ClipboardList size={18} />
                  Domain-by-Domain Interpretation
                </CardTitle>
                <p className="text-slate-500 text-sm font-normal mt-1">
                  Scores represent averages across all informants, normalized to a 0–100 scale. Higher scores indicate greater frequency or severity of reported challenges.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(avgByDomain).map(([domain, avg]) => {
                  const band = getSeverityBand(avg);
                  const label = DOMAIN_LABELS[domain] ?? domain;
                  const desc = DOMAIN_DESCRIPTIONS[domain] ?? DOMAIN_DESCRIPTIONS.general;
                  return (
                    <div key={domain} className={`rounded-lg border ${band.borderColor} ${band.bgColor} p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-slate-800 text-sm">{label}</h4>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 rounded-full bg-white border border-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${avg <= 25 ? 'bg-emerald-500' : avg <= 50 ? 'bg-sky-500' : avg <= 65 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${avg}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold ${band.color}`}>{avg}/100 · {band.label}</span>
                        </div>
                      </div>
                      <p className="text-slate-700 text-sm leading-relaxed">{desc[band.key]}</p>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Cross-Informant Analysis */}
            <Card className="shadow-sm border-none">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <Users size={18} />
                  Cross-Informant Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed text-sm">
                  {getCrossInformantNarrative(scores, studentName)}
                </p>
                {scores.length > 1 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 pr-4 text-slate-600 font-semibold">Domain</th>
                          {Array.from(new Set(scores.map(s => s.respondentType))).map(type => (
                            <th key={type} className="text-center py-2 px-3 text-slate-600 font-semibold capitalize">{type}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(domains).map(domain => (
                          <tr key={domain} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-2 pr-4 text-slate-700">{DOMAIN_LABELS[domain] ?? domain}</td>
                            {Array.from(new Set(scores.map(s => s.respondentType))).map(type => {
                              const score = scores.find(s => s.respondentType === type);
                              const val = score ? (score.normalizedScores as Record<string, number>)[domain] ?? "—" : "—";
                              const band = typeof val === "number" ? getSeverityBand(val) : null;
                              return (
                                <td key={type} className="text-center py-2 px-3">
                                  {band ? (
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${band.color} ${band.bgColor}`}>
                                      {val}
                                    </span>
                                  ) : <span className="text-slate-400">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recommendations & Next Steps */}
            <Card className="shadow-sm border-none bg-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-slate-800">Clinical Considerations & Recommended Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 leading-relaxed text-sm">
                  {getRecommendationsNarrative(Array.from(domains), scores)}
                </p>
                <p className="text-xs text-slate-400 mt-4 italic">
                  This interpretive report was generated automatically based on scored assessment data and is intended to support — not replace — clinical judgment. All findings should be interpreted by a qualified professional in the context of a comprehensive evaluation.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
