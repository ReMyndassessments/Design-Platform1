export interface RrcaQuestion {
  id: string;
  text: string;
  type: "literal" | "inferential" | "vocabulary";
  score: number | null;
  notes: string;
}

export interface RrcaAnswers {
  mode: string;
  passage: string;
  passageLanguage: string;
  passageDifficulty: string;
  passageTopic: string;
  passageWordCount: number;
  questions: RrcaQuestion[];
  generalNotes: string;
}

export interface RrcaScores {
  literalScore: number;
  inferentialScore: number;
  vocabularyScore: number;
  rawScore: number;
  maxScore: number;
  percentage: number;
  riskLevel: string;
  interpretationText: string;
}

const RISK_INTERPRETATIONS: Record<string, string> = {
  low: "Reading comprehension performance was in the Low Concern range (85–100%), indicating age-appropriate ability to understand, interpret, and apply meaning from text.",
  mild: "Reading comprehension performance was in the Mild Concern range (70–84%), suggesting some emerging difficulty with aspects of reading understanding. Monitoring and targeted support are advisable.",
  moderate: "Reading comprehension performance was in the Moderate Concern range (50–69%), indicating notable difficulty understanding text. Further assessment and comprehension support are recommended.",
  significant: "Reading comprehension performance was in the Significant Concern range (below 50%), indicating marked difficulty deriving meaning from text. This profile warrants further assessment and targeted intervention.",
};

function rrcaRiskLevel(pct: number): string {
  if (pct >= 85) return "low";
  if (pct >= 70) return "mild";
  if (pct >= 50) return "moderate";
  return "significant";
}

export function calculateRrcaScores(answers: RrcaAnswers): RrcaScores {
  let literalScore = 0;
  let inferentialScore = 0;
  let vocabularyScore = 0;
  let maxScore = 0;

  for (const q of answers.questions) {
    if (q.score === null) continue;
    maxScore += 1;
    if (q.type === "literal") literalScore += q.score;
    else if (q.type === "inferential") inferentialScore += q.score;
    else if (q.type === "vocabulary") vocabularyScore += q.score;
  }

  const rawScore = literalScore + inferentialScore + vocabularyScore;
  const percentage = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const riskLevel = rrcaRiskLevel(percentage);

  return {
    literalScore,
    inferentialScore,
    vocabularyScore,
    rawScore,
    maxScore,
    percentage,
    riskLevel,
    interpretationText: RISK_INTERPRETATIONS[riskLevel],
  };
}

export const RRCA_SCORING_CONFIG = {
  max: 10,
  thresholds: { low: 30, mild: 50, moderate: 70 },
  domains: {
    comprehension: {
      label: "Reading Comprehension",
      shortLabel: "Comprehension",
      narratives: {
        low: RISK_INTERPRETATIONS.low,
        mild: RISK_INTERPRETATIONS.mild,
        moderate: RISK_INTERPRETATIONS.moderate,
        elevated: RISK_INTERPRETATIONS.significant,
      },
    },
  },
};
