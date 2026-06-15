export const RDA_ITEMS = [
  { id: "rda_1",  word: "mip",      expected: "mip" },
  { id: "rda_2",  word: "tave",     expected: "tave" },
  { id: "rda_3",  word: "blon",     expected: "blon" },
  { id: "rda_4",  word: "strav",    expected: "strav" },
  { id: "rda_5",  word: "nake",     expected: "nake" },
  { id: "rda_6",  word: "fim",      expected: "fim" },
  { id: "rda_7",  word: "lape",     expected: "lape" },
  { id: "rda_8",  word: "plinder",  expected: "plinder" },
  { id: "rda_9",  word: "glost",    expected: "glost" },
  { id: "rda_10", word: "drant",    expected: "drant" },
  { id: "rda_11", word: "skeep",    expected: "skeep" },
  { id: "rda_12", word: "brinter",  expected: "brinter" },
  { id: "rda_13", word: "chab",     expected: "chab" },
  { id: "rda_14", word: "flape",    expected: "flape" },
  { id: "rda_15", word: "snorp",    expected: "snorp" },
  { id: "rda_16", word: "tralip",   expected: "tralip" },
  { id: "rda_17", word: "voster",   expected: "voster" },
  { id: "rda_18", word: "splent",   expected: "splent" },
  { id: "rda_19", word: "crund",    expected: "crund" },
  { id: "rda_20", word: "bralisko", expected: "bralisko" },
];

export interface RdaItemResponse {
  studentResponse: string;
  score: number | null;
  notes: string;
}

export interface RdaAnswers {
  mode: string;
  generalNotes: string;
  items: Record<string, RdaItemResponse>;
}

export interface RdaScores {
  rawScore: number;
  maxScore: number;
  percentage: number;
  riskLevel: string;
  administeredCount: number;
  correctCount: number;
  partialCount: number;
  incorrectCount: number;
  interpretationText: string;
}

const RISK_INTERPRETATIONS: Record<string, string> = {
  low: "Performance in the Low Concern range (85–100%) suggests age-appropriate decoding skills with strong phonics and sound-symbol mapping ability.",
  mild: "Performance in the Mild Concern range (70–84%) suggests some emerging difficulty decoding unfamiliar words. Monitoring and targeted phonics support may be beneficial.",
  moderate: "Performance in the Moderate Concern range (50–69%) indicates notable difficulty decoding nonwords, suggesting gaps in phonics knowledge and decoding efficiency.",
  significant: "Performance in the Significant Concern range (below 50%) indicates marked difficulty decoding unfamiliar words, consistent with phonics weaknesses that warrant further assessment and structured literacy intervention.",
};

function rdaRiskLevel(pct: number): string {
  if (pct >= 85) return "low";
  if (pct >= 70) return "mild";
  if (pct >= 50) return "moderate";
  return "significant";
}

export function calculateRdaScores(answers: RdaAnswers): RdaScores {
  let rawScore = 0;
  let maxScore = 0;
  let administeredCount = 0;
  let correctCount = 0;
  let partialCount = 0;
  let incorrectCount = 0;

  for (const item of RDA_ITEMS) {
    const resp = answers.items[item.id];
    if (!resp || resp.score === null) continue;
    administeredCount++;
    maxScore += 1;
    if (resp.score === 1) { correctCount++; rawScore += 1; }
    else if (resp.score === 0.5) { partialCount++; rawScore += 0.5; }
    else { incorrectCount++; }
  }

  const percentage = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const riskLevel = rdaRiskLevel(percentage);

  return {
    rawScore,
    maxScore,
    percentage,
    riskLevel,
    administeredCount,
    correctCount,
    partialCount,
    incorrectCount,
    interpretationText: RISK_INTERPRETATIONS[riskLevel],
  };
}

export const RDA_SCORING_CONFIG = {
  max: 20,
  thresholds: { low: 30, mild: 50, moderate: 70 },
  domains: {
    decoding: {
      label: "Decoding and Nonword Reading",
      shortLabel: "Decoding",
      narratives: {
        low: RISK_INTERPRETATIONS.low,
        mild: RISK_INTERPRETATIONS.mild,
        moderate: RISK_INTERPRETATIONS.moderate,
        elevated: RISK_INTERPRETATIONS.significant,
      },
    },
  },
};
