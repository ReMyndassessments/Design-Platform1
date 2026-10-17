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
  responseLanguage?: string;
  phaseOutcome?: "completed" | "stopped_early";
  questionsReached?: number | null;
  phaseNotes?: string;
  languageTrials?: RrcaLanguageTrial[];
  activeLanguageTrialIndex?: number;
}

export interface RrcaLanguageTrial {
  passageLanguage: string;
  responseLanguage?: string;
  passage: string;
  passageDifficulty: string;
  passageTopic: string;
  passageWordCount: number;
  questions: RrcaQuestion[];
  outcome?: "completed" | "stopped_early";
  questionsReached?: number | null;
  notes?: string;
}

export interface RrcaLanguageTrialResult {
  phase: number;
  passageLanguage: string;
  responseLanguage: string;
  outcome: "completed" | "stopped_early";
  questionsReached: number | null;
  itemsScored: number;
  rawScore: number;
  maxScore: number;
  percentage: number | null;
  literalScore: number;
  inferentialScore: number;
  vocabularyScore: number;
  literalItemsScored: number;
  inferentialItemsScored: number;
  vocabularyItemsScored: number;
  passageDifficulty: string;
  passageTopic: string;
  detectedPassageScript: string;
  detectedQuestionScript: string;
  notes: string;
}

export interface RrcaScores {
  literalScore: number;
  inferentialScore: number;
  vocabularyScore: number;
  literalItemsScored: number;
  inferentialItemsScored: number;
  vocabularyItemsScored: number;
  rawScore: number;
  maxScore: number;
  percentage: number;
  riskLevel: string;
  interpretationText: string;
}

const RISK_INTERPRETATIONS: Record<string, string> = {
  low: "Accuracy was high on this administered passage (85–100% of scored items). This descriptive result applies only to this passage; it does not establish age-level reading ability or rule out difficulty.",
  mild: "Some responses were incorrect or partial on this administered passage (70–84%). This descriptive passage-specific band may warrant review alongside other reading and language evidence.",
  moderate: "Accuracy was mixed on this administered passage (50–69%). This descriptive passage-specific band supports review of the item-level pattern and consideration of further reading and language assessment.",
  significant: "Accuracy was low on this administered passage (below 50%). This descriptive passage-specific band supports careful review and further assessment; it is not a diagnosis or norm-referenced risk rating.",
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
  let literalItemsScored = 0;
  let inferentialItemsScored = 0;
  let vocabularyItemsScored = 0;
  let maxScore = 0;

  for (const q of answers.questions) {
    if (typeof q.score !== "number") continue;
    maxScore += 1;
    if (q.type === "literal") {
      literalScore += q.score;
      literalItemsScored += 1;
    } else if (q.type === "inferential") {
      inferentialScore += q.score;
      inferentialItemsScored += 1;
    } else if (q.type === "vocabulary") {
      vocabularyScore += q.score;
      vocabularyItemsScored += 1;
    }
  }

  const rawScore = literalScore + inferentialScore + vocabularyScore;
  const percentage = maxScore > 0 ? Math.round((rawScore / maxScore) * 100) : 0;
  const riskLevel = rrcaRiskLevel(percentage);

  return {
    literalScore,
    inferentialScore,
    vocabularyScore,
    literalItemsScored,
    inferentialItemsScored,
    vocabularyItemsScored,
    rawScore,
    maxScore,
    percentage,
    riskLevel,
    interpretationText: RISK_INTERPRETATIONS[riskLevel],
  };
}

export function detectRrcaTextScript(text: string): string {
  const hasHan = /[\u3400-\u4DBF\u4E00-\u9FFF]/.test(text);
  const hasHangul = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(text);
  const hasLatin = /[A-Za-z]/.test(text);
  const scripts = [hasHan, hasHangul, hasLatin].filter(Boolean).length;
  if (scripts > 1) return "Mixed scripts";
  if (hasHan) return "Chinese characters";
  if (hasHangul) return "Hangul";
  if (hasLatin) return "Latin script";
  return "Unclear";
}

export function getRrcaLanguageTrialResults(answers: RrcaAnswers): RrcaLanguageTrialResult[] {
  const trials = Array.isArray(answers.languageTrials) && answers.languageTrials.length > 0
    ? answers.languageTrials
    : [{
        passageLanguage: answers.passageLanguage,
        responseLanguage: answers.responseLanguage,
        passage: answers.passage,
        passageDifficulty: answers.passageDifficulty,
        passageTopic: answers.passageTopic,
        passageWordCount: answers.passageWordCount,
        questions: answers.questions,
        outcome: answers.phaseOutcome,
        questionsReached: answers.questionsReached,
        notes: answers.phaseNotes,
      }];

  return trials.map((trial, index) => {
    const questions = Array.isArray(trial.questions) ? trial.questions : [];
    const scores = calculateRrcaScores({ ...answers, questions });
    const questionText = questions.map(question => question.text).join("\n");
    const responseLanguage = trial.responseLanguage === "same_as_passage"
      ? trial.passageLanguage
      : trial.responseLanguage || "not recorded";
    const outcome = trial.outcome === "stopped_early" ? "stopped_early" : "completed";
    const questionsReached = typeof trial.questionsReached === "number"
      ? trial.questionsReached
      : outcome === "completed" && questions.length > 0
        ? questions.length
        : null;

    return {
      phase: index + 1,
      passageLanguage: trial.passageLanguage || "unspecified",
      responseLanguage: responseLanguage || "not recorded",
      outcome,
      questionsReached,
      itemsScored: questions.filter(question => typeof question.score === "number").length,
      rawScore: scores.rawScore,
      maxScore: scores.maxScore,
      percentage: scores.maxScore > 0 ? scores.percentage : null,
      literalScore: scores.literalScore,
      inferentialScore: scores.inferentialScore,
      vocabularyScore: scores.vocabularyScore,
      literalItemsScored: scores.literalItemsScored,
      inferentialItemsScored: scores.inferentialItemsScored,
      vocabularyItemsScored: scores.vocabularyItemsScored,
      passageDifficulty: trial.passageDifficulty || "unspecified",
      passageTopic: trial.passageTopic || "unspecified",
      detectedPassageScript: detectRrcaTextScript(trial.passage || ""),
      detectedQuestionScript: detectRrcaTextScript(questionText),
      notes: trial.notes || "",
    };
  });
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
