export interface RrfaAnswers {
  mode: string;
  passageType: "60-second" | "full-passage";
  wordsRead: number | null;
  errors: number | null;
  selfCorrections: number | null;
  hesitations: number | null;
  readingTimeSeconds: number | null;
  examinerRating: string;
  generalNotes: string;
}

export interface RrfaScores {
  wordsPerMinute: number | null;
  accuracyPercentage: number | null;
  fluencyRating: string;
  riskLevel: string;
  interpretationText: string;
}

const RATING_TO_RISK: Record<string, string> = {
  "Fluent and Expressive": "low",
  "Mildly Slow": "mild",
  "Moderately Slow": "moderate",
  "Significantly Slow": "significant",
};

const RISK_INTERPRETATIONS: Record<string, string> = {
  low: "Reading was described as fluent and expressive, indicating age-appropriate reading accuracy, automaticity, and prosody. No significant fluency concerns were noted.",
  mild: "Reading was described as mildly slow, suggesting some emerging difficulty with reading automaticity or pace. Occasional support with fluency building may be beneficial.",
  moderate: "Reading was described as moderately slow, indicating notable difficulty with reading fluency. Accuracy or automaticity concerns may be impacting reading efficiency.",
  significant: "Reading was described as significantly slow, indicating marked difficulty with reading fluency. This pattern suggests a need for targeted fluency intervention and further assessment.",
};

export function calculateRrfaScores(answers: RrfaAnswers): RrfaScores {
  let wordsPerMinute: number | null = null;
  let accuracyPercentage: number | null = null;

  if (answers.wordsRead != null && answers.readingTimeSeconds != null && answers.readingTimeSeconds > 0) {
    wordsPerMinute = Math.round((answers.wordsRead / answers.readingTimeSeconds) * 60);
  }
  if (answers.wordsRead != null && answers.errors != null && answers.wordsRead > 0) {
    const correctWords = Math.max(0, answers.wordsRead - answers.errors);
    accuracyPercentage = Math.round((correctWords / answers.wordsRead) * 100);
  }

  const riskLevel = RATING_TO_RISK[answers.examinerRating] ?? "low";

  return {
    wordsPerMinute,
    accuracyPercentage,
    fluencyRating: answers.examinerRating,
    riskLevel,
    interpretationText: RISK_INTERPRETATIONS[riskLevel],
  };
}

export const RRFA_SCORING_CONFIG = {
  max: 100,
  thresholds: { low: 30, mild: 50, moderate: 70 },
  domains: {
    fluency: {
      label: "Reading Fluency",
      shortLabel: "Fluency",
      narratives: {
        low: RISK_INTERPRETATIONS.low,
        mild: RISK_INTERPRETATIONS.mild,
        moderate: RISK_INTERPRETATIONS.moderate,
        elevated: RISK_INTERPRETATIONS.significant,
      },
    },
  },
};
