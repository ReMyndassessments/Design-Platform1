export type SdqClassificationScheme = "four_band" | "three_band";
type Respondent = "parent" | "teacher" | "self";
type Band = { min: number; max: number; label: string };
type ScaleName =
  | "Emotional Symptoms"
  | "Conduct Problems"
  | "Hyperactivity/Inattention"
  | "Peer Problems"
  | "Prosocial Behaviour"
  | "Total Difficulties"
  | "Impact";

export type SdqScoringQuestion = {
  id: string;
  text?: string;
  textEnglish?: string;
  type?: string;
  domain?: string;
  options?: string[];
  rows?: Array<{ id: string; text?: string }>;
};

const ITEM_DOMAINS: Record<number, string> = {
  1: "prosocial", 2: "hyperactivity", 3: "emotional", 4: "prosocial", 5: "conduct",
  6: "peer", 7: "conduct", 8: "emotional", 9: "prosocial", 10: "hyperactivity",
  11: "peer", 12: "conduct", 13: "emotional", 14: "peer", 15: "hyperactivity",
  16: "emotional", 17: "prosocial", 18: "conduct", 19: "peer", 20: "prosocial",
  21: "hyperactivity", 22: "conduct", 23: "peer", 24: "emotional", 25: "hyperactivity",
};

const SCALE_ITEMS: Array<{ name: ScaleName; items: number[]; reversed?: boolean }> = [
  { name: "Emotional Symptoms", items: [3, 8, 13, 16, 24] },
  { name: "Conduct Problems", items: [5, 7, 12, 18, 22], reversed: true },
  { name: "Hyperactivity/Inattention", items: [2, 10, 15, 21, 25], reversed: true },
  { name: "Peer Problems", items: [6, 11, 14, 19, 23], reversed: true },
  { name: "Prosocial Behaviour", items: [1, 4, 9, 17, 20] },
];

const REVERSED_ITEMS = new Set([7, 11, 14, 21, 25]);
const ITEM_RESPONSE_CODES: Record<string, number> = {
  "not true": 0,
  "somewhat true": 1,
  "certainly true": 2,
};
const ITEM_OPTIONS = ["Not True", "Somewhat True", "Certainly True"];

const FORM_CONFIG: Record<string, { respondent: Respondent; prefix: string; minAge: number; maxAge: number }> = {
  "SDQ-P": { respondent: "parent", prefix: "sdqp4", minAge: 4, maxAge: 10 },
  "SDQ-P4": { respondent: "parent", prefix: "sdqp4", minAge: 4, maxAge: 10 },
  "SDQ-P11": { respondent: "parent", prefix: "sdqp11", minAge: 11, maxAge: 18 },
  "SDQ-T": { respondent: "teacher", prefix: "sdqt4", minAge: 4, maxAge: 10 },
  "SDQ-T4": { respondent: "teacher", prefix: "sdqt4", minAge: 4, maxAge: 10 },
  "SDQ-T11": { respondent: "teacher", prefix: "sdqt11", minAge: 11, maxAge: 18 },
  "SDQ-SR": { respondent: "self", prefix: "sdqsr11", minAge: 11, maxAge: 17 },
  "SDQ-SR11": { respondent: "self", prefix: "sdqsr11", minAge: 11, maxAge: 17 },
  "SDQ-SR18": { respondent: "self", prefix: "sdqsr18", minAge: 18, maxAge: 120 },
};

function coreItemNumber(id: string): number | null {
  const match = id.match(/(?:_|-)(\d{1,2})$/);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 1 && value <= 25 ? value : null;
}

function ageAtAdministration(dateOfBirth: string | Date | null | undefined, administeredAt: string | Date | null | undefined): number | null {
  if (!dateOfBirth || !administeredAt) return null;
  const birth = new Date(dateOfBirth);
  const administered = new Date(administeredAt);
  if (!Number.isFinite(birth.getTime()) || !Number.isFinite(administered.getTime()) || administered < birth) return null;
  let age = administered.getUTCFullYear() - birth.getUTCFullYear();
  const hadBirthday = administered.getUTCMonth() > birth.getUTCMonth()
    || (administered.getUTCMonth() === birth.getUTCMonth() && administered.getUTCDate() >= birth.getUTCDate());
  if (!hadBirthday) age--;
  return age >= 0 ? age : null;
}

function itemCode(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 2) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (Object.hasOwn(ITEM_RESPONSE_CODES, normalized)) return ITEM_RESPONSE_CODES[normalized];
    if (/^[0-2]$/.test(normalized)) return Number(normalized);
  }
  return "invalid";
}

function impactContribution(value: unknown): number | null | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const normalized = value.trim().toLowerCase();
  if (normalized === "not at all" || normalized === "only a little") return 0;
  if (normalized === "a medium amount") return 1;
  if (normalized === "a great deal") return 2;
  return "invalid";
}

function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5);
}

function ageForBand(age: number | null, respondent: Respondent): boolean {
  if (age === null || age < 4 || age > 17) return false;
  return respondent !== "self" || age >= 11;
}

function band(min: number, max: number, label: string): Band {
  return { min, max, label };
}

function makeClassificationBands(respondent: Respondent, scheme: SdqClassificationScheme): Partial<Record<ScaleName, Band[]>> {
  const four = scheme === "four_band";
  const concernLabels = four
    ? ["Close to average", "Slightly raised", "High", "Very high"]
    : ["Normal", "Borderline", "Abnormal"];
  const strengthLabels = four
    ? ["Very low", "Low", "Slightly lowered", "Close to average"]
    : ["Abnormal", "Borderline", "Normal"];
  const all = (maximum: number, thresholds: number[]): Band[] => {
    const bands: Band[] = [];
    let min = 0;
    for (let i = 0; i < thresholds.length; i++) {
      bands.push(band(min, thresholds[i], concernLabels[i]));
      min = thresholds[i] + 1;
    }
    bands.push(band(min, maximum, concernLabels[thresholds.length]));
    return bands;
  };
  const strength = (thresholds: number[]): Band[] => {
    const bands: Band[] = [];
    let min = 0;
    for (let i = 0; i < thresholds.length; i++) {
      bands.push(band(min, thresholds[i], strengthLabels[i]));
      min = thresholds[i] + 1;
    }
    bands.push(band(min, 10, strengthLabels[thresholds.length]));
    return bands;
  };

  if (respondent === "parent") {
    if (four) return {
      "Total Difficulties": all(40, [13, 16, 19]),
      "Emotional Symptoms": all(10, [3, 4, 6]),
      "Conduct Problems": all(10, [2, 3, 5]),
      "Hyperactivity/Inattention": all(10, [5, 7, 8]),
      "Peer Problems": all(10, [2, 3, 4]),
      "Prosocial Behaviour": strength([5, 6, 7]),
      "Impact": all(10, [0, 1, 2]),
    };
    return {
      "Total Difficulties": all(40, [13, 16]),
      "Emotional Symptoms": all(10, [3, 4]),
      "Conduct Problems": all(10, [2, 3]),
      "Hyperactivity/Inattention": all(10, [5, 6]),
      "Peer Problems": all(10, [2, 3]),
      "Prosocial Behaviour": strength([4, 5]),
      "Impact": all(10, [0, 1]),
    };
  }
  if (respondent === "teacher") {
    if (four) return {
      "Total Difficulties": all(40, [11, 15, 18]),
      "Emotional Symptoms": all(10, [3, 4, 5]),
      "Conduct Problems": all(10, [2, 3, 4]),
      "Hyperactivity/Inattention": all(10, [5, 7, 8]),
      "Peer Problems": all(10, [2, 4, 5]),
      "Prosocial Behaviour": strength([3, 4, 5]),
      "Impact": all(6, [0, 1, 2]),
    };
    return {
      "Total Difficulties": all(40, [11, 15]),
      "Emotional Symptoms": all(10, [4, 5]),
      "Conduct Problems": all(10, [2, 3]),
      "Hyperactivity/Inattention": all(10, [5, 6]),
      "Peer Problems": all(10, [3, 4]),
      "Prosocial Behaviour": strength([4, 5]),
      "Impact": all(6, [0, 1]),
    };
  }
  if (four) return {
    "Total Difficulties": all(40, [14, 17, 19]),
    "Emotional Symptoms": all(10, [4, 5, 6]),
    "Conduct Problems": all(10, [3, 4, 5]),
    "Hyperactivity/Inattention": all(10, [5, 6, 7]),
    "Peer Problems": all(10, [2, 3, 4]),
    "Prosocial Behaviour": strength([4, 5, 6]),
    "Impact": all(10, [0, 1, 2]),
  };
  return {
    "Total Difficulties": all(40, [15, 19]),
    "Emotional Symptoms": all(10, [5, 6]),
    "Conduct Problems": all(10, [3, 4]),
    "Hyperactivity/Inattention": all(10, [5, 6]),
    "Peer Problems": all(10, [3, 5]),
    "Prosocial Behaviour": strength([4, 5]),
    "Impact": all(10, [0, 1]),
  };
}

function classify(value: number | null, bands: Band[] | undefined): string | null {
  if (value === null || !bands) return null;
  return bands.find(candidate => value >= candidate.min && value <= candidate.max)?.label ?? null;
}

function getImpactRawValue(
  questionId: string,
  questions: SdqScoringQuestion[],
  answers: Record<string, unknown>,
): unknown {
  if (Object.hasOwn(answers, questionId)) return answers[questionId];
  for (const question of questions) {
    const row = question.rows?.find(candidate => candidate.id === questionId);
    if (!row) continue;
    const parentAnswer = answers[question.id];
    if (parentAnswer && typeof parentAnswer === "object" && !Array.isArray(parentAnswer)) {
      return (parentAnswer as Record<string, unknown>)[row.id];
    }
  }
  return undefined;
}

export function scoreSdq(input: {
  toolId: string;
  questions: SdqScoringQuestion[];
  answers: Record<string, unknown>;
  language?: string | null;
  dateOfBirth?: string | Date | null;
  administeredAt?: string | Date | null;
}) {
  const form = FORM_CONFIG[input.toolId];
  const age = ageAtAdministration(input.dateOfBirth, input.administeredAt);
  const coreQuestions = input.questions
    .map(question => ({ question, itemNumber: coreItemNumber(question.id) }))
    .filter(item => item.itemNumber !== null);
  const itemNumbers = coreQuestions.map(item => item.itemNumber as number);
  const duplicateItems = itemNumbers.filter((itemNumber, index) => itemNumbers.indexOf(itemNumber) !== index);
  const missingItems = Array.from({ length: 25 }, (_, index) => index + 1).filter(itemNumber => !itemNumbers.includes(itemNumber));
  const issues: string[] = [];

  if (!form) issues.push("The saved form identifier is not mapped to a verified SDQ respondent/version.");
  if (!/^en(?:[-_]|$)/i.test(input.language ?? "")) issues.push("This implementation has not verified the administered non-English translation and response mapping.");
  if (coreQuestions.length !== 25 || missingItems.length || duplicateItems.length) {
    issues.push("The saved form does not contain exactly one of each canonical core item.");
  }
  for (const { question, itemNumber } of coreQuestions) {
    if (itemNumber === null) continue;
    if (question.domain !== ITEM_DOMAINS[itemNumber]) {
      issues.push(`Canonical item ${itemNumber} does not match the expected SDQ scale mapping.`);
    }
    if (JSON.stringify(question.options ?? []) !== JSON.stringify(ITEM_OPTIONS)) {
      issues.push(`Canonical item ${itemNumber} does not use the verified English response options.`);
    }
  }
  if (age !== null && form && (age < form.minAge || age > form.maxAge)) {
    issues.push(`Age ${age} at administration is outside this saved form's stated age range.`);
  }

  const contributions: Array<{
    itemNumber: number;
    response: unknown;
    directValue: number | null;
    contribution: number | null;
    reversed: boolean;
  }> = [];
  let invalidAnswer = false;
  for (const { question, itemNumber } of coreQuestions) {
    if (itemNumber === null) continue;
    const response = input.answers[question.id];
    const directValue = itemCode(response);
    if (directValue === "invalid") {
      invalidAnswer = true;
      issues.push(`Canonical item ${itemNumber} has an unrecognized response value.`);
      contributions.push({ itemNumber, response, directValue: null, contribution: null, reversed: REVERSED_ITEMS.has(itemNumber) });
      continue;
    }
    const reversed = REVERSED_ITEMS.has(itemNumber);
    contributions.push({
      itemNumber,
      response,
      directValue,
      contribution: directValue === null ? null : reversed ? 2 - directValue : directValue,
      reversed,
    });
  }

  const formSuitable = !!form && !issues.some(issue =>
    issue.includes("form identifier") || issue.includes("outside this saved form"),
  );
  const ruleReady = formSuitable && /^en(?:[-_]|$)/i.test(input.language ?? "")
    && !issues.some(issue => issue.includes("canonical core item") || issue.includes("expected SDQ scale") || issue.includes("verified English response"));
  const scales: Record<string, {
    score: number | null;
    validAnswers: number;
    missingAnswers: number;
    prorated: boolean;
    unroundedScore: number | null;
    range: [number, number];
  }> = {};

  for (const scale of SCALE_ITEMS) {
    const items = scale.items.map(itemNumber => contributions.find(item => item.itemNumber === itemNumber));
    const valid = items.filter(item => item?.contribution !== null && item?.contribution !== undefined);
    const sum = valid.reduce((total, item) => total + (item?.contribution ?? 0), 0);
    const eligible = valid.length === 5 || valid.length >= 3;
    const prorated = valid.length >= 3 && valid.length < 5;
    const unroundedScore = eligible ? (prorated ? (5 * sum) / valid.length : sum) : null;
    scales[scale.name] = {
      score: ruleReady && !invalidAnswer && eligible ? (prorated ? roundHalfUp(unroundedScore as number) : sum) : null,
      validAnswers: valid.length,
      missingAnswers: 5 - valid.length,
      prorated,
      unroundedScore,
      range: [0, 10],
    };
  }

  const difficultyScaleNames: ScaleName[] = [
    "Emotional Symptoms",
    "Conduct Problems",
    "Hyperactivity/Inattention",
    "Peer Problems",
  ];
  const difficultyScores = difficultyScaleNames.map(name => scales[name].score);
  const totalDifficulties = ruleReady && !invalidAnswer && difficultyScores.every(score => score !== null)
    ? difficultyScores.reduce((total, score) => total + (score ?? 0), 0)
    : null;

  let impact: { score: number | null; maximum: number; validComponents: number; requiredComponents: number; components: Array<{ id: string; response: unknown; contribution: number | null }> } = {
    score: null,
    maximum: form?.respondent === "teacher" ? 6 : 10,
    validComponents: 0,
    requiredComponents: form?.respondent === "teacher" ? 3 : 5,
    components: [],
  };
  if (form) {
    const impactIds = form.prefix === "sdqt4"
      ? [`${form.prefix}_distress`, `${form.prefix}_if_friends`, `${form.prefix}_if_class`]
      : form.prefix === "sdqt11"
        ? [`${form.prefix}_distress`, `${form.prefix}_if_peers`, `${form.prefix}_if_class`]
        : form.prefix === "sdqp4"
          ? [`${form.prefix}_distress`, `${form.prefix}_if_home`, `${form.prefix}_if_friends`, `${form.prefix}_if_class`, `${form.prefix}_if_leisure`]
          : form.prefix === "sdqp11"
            ? [`${form.prefix}_distress`, `${form.prefix}_if_home`, `${form.prefix}_if_friends`, `${form.prefix}_if_learn`, `${form.prefix}_if_leisure`]
            : form.prefix === "sdqsr18"
              ? [`${form.prefix}_distress`, `${form.prefix}_if_close`, `${form.prefix}_if_friends`, `${form.prefix}_if_work`, `${form.prefix}_if_leisure`]
              : [`${form.prefix}_distress`, `${form.prefix}_if_home`, `${form.prefix}_if_friends`, `${form.prefix}_if_class`, `${form.prefix}_if_leisure`];
    const components = impactIds.map(id => {
      const response = getImpactRawValue(id, input.questions, input.answers);
      const contribution = impactContribution(response);
      return {
        id,
        response,
        contribution: contribution === "invalid" ? null : contribution,
        invalid: contribution === "invalid",
      };
    });
    const validComponents = components.filter(component => component.contribution !== null).length;
    const invalidImpact = components.some(component => component.invalid);
    const expectedComponentCount = form.respondent === "teacher" ? 3 : 5;
    const requiredComponents = components.slice(0, expectedComponentCount);
    impact = {
      score: ruleReady && !invalidAnswer && !invalidImpact && requiredComponents.every(component => component.contribution !== null)
        ? requiredComponents.reduce((total, component) => total + (component.contribution ?? 0), 0)
        : null,
      maximum: form.respondent === "teacher" ? 6 : 10,
      validComponents: requiredComponents.filter(component => component.contribution !== null).length,
      requiredComponents: expectedComponentCount,
      components: components.map(({ id, response, contribution }) => ({ id, response, contribution })),
    };
  }

  const ageApplicable = ageForBand(age, form?.respondent ?? "parent");
  const classificationEligible = ruleReady && !invalidAnswer && ageApplicable;
  const classificationSchemes: Record<SdqClassificationScheme, Record<string, string | null>> = {
    four_band: {},
    three_band: {},
  };
  for (const scheme of ["four_band", "three_band"] as const) {
    const tables = form ? makeClassificationBands(form.respondent, scheme) : {};
    const values: Partial<Record<ScaleName, number | null>> = {
      ...Object.fromEntries(Object.entries(scales).map(([name, data]) => [name, data.score])),
      "Total Difficulties": totalDifficulties,
      Impact: impact.score,
    };
    for (const name of Object.keys(values) as ScaleName[]) {
      classificationSchemes[scheme][name] = classificationEligible
        ? classify(values[name] ?? null, tables[name])
        : null;
    }
  }

  const blockingIssues = issues.length
    ? issues
    : !ruleReady
      ? ["This record is not eligible for local SDQ scoring; original answers remain available for descriptive review."]
      : [];
  return {
    scoringVersion: "sdq-uk-reference-2016-raos-v1",
    source: "User-supplied criteria citing SDQ developer scoring guidance dated 20 June 2016",
    respondent: form?.respondent ?? null,
    ageAtAdministration: age,
    referencePopulation: classificationEligible ? "UK reference, age 4–17 (screening bands; not local norms or diagnosis)" : null,
    scoringState: ruleReady && !invalidAnswer ? "scored" as const : "blocked" as const,
    classificationState: classificationEligible ? "available" as const : "withheld" as const,
    classificationLimit: ageApplicable
      ? "UK reference bands only; not locally normed and not diagnostic."
      : "Child classification bands are withheld because age at administration is unavailable or outside the supported respondent/age range.",
    issues: blockingIssues,
    itemContributions: contributions,
    scales,
    totalDifficulties: { score: totalDifficulties, range: [0, 40] as [number, number] },
    impact,
    classificationSchemes,
  };
}
