/**
 * Interpretation of an already verified publisher T-score is NOT raw-to-T
 * conversion. These rules must never receive RAOS percentages or raw totals.
 */
export type PublisherFamily = "BRIEF2" | "BASC3" | "BYI2";
export type PublishedBand = { min: number | null; max: number | null; label: string; adaptiveLabel?: string };

const BRIEF_BANDS: PublishedBand[] = [
  { min: null, max: 59, label: "Not elevated" },
  { min: 60, max: 64, label: "Mildly elevated" },
  { min: 65, max: 69, label: "Potentially clinically elevated" },
  { min: 70, max: null, label: "Clinically elevated" },
];
const BASC_BANDS: PublishedBand[] = [
  { min: null, max: 30, label: "Very low", adaptiveLabel: "Clinically Significant" },
  { min: 31, max: 40, label: "Low", adaptiveLabel: "At-Risk" },
  { min: 41, max: 59, label: "Average", adaptiveLabel: "Average" },
  { min: 60, max: 69, label: "At-Risk", adaptiveLabel: "High" },
  { min: 70, max: null, label: "Clinically Significant", adaptiveLabel: "Very high" },
];

export function interpretVerifiedPublisherTScore(input: {
  family: PublisherFamily;
  tScore: number | null;
  sourceVerified: boolean;
  applicabilityVerified: boolean;
  scaleType: "ordinary_problem" | "ordinary_adaptive" | "special";
  sourceClassification?: string | null;
}) {
  const unavailable = { classification: null, referenceBand: null, provenance: "unavailable" as const };
  if (!input.sourceVerified) return unavailable;
  const sourceClassification = input.sourceClassification?.trim() || null;
  // BYI inventories and special BASC/BRIEF indices retain the exact source
  // category. A sample report does not establish a universal cutoff table.
  if (input.family === "BYI2" || input.scaleType === "special") {
    return {
      classification: sourceClassification, referenceBand: null,
      provenance: sourceClassification ? "publisher_source" as const : "unavailable" as const,
    };
  }
  if (!input.applicabilityVerified || input.tScore === null || !Number.isFinite(input.tScore) || !Number.isInteger(input.tScore)) {
    return sourceClassification
      ? { classification: sourceClassification, referenceBand: null, provenance: "publisher_source" as const }
      : unavailable;
  }
  if (input.family === "BRIEF2" && input.scaleType !== "ordinary_problem") return unavailable;
  const bands = input.family === "BRIEF2" ? BRIEF_BANDS : BASC_BANDS;
  const band = bands.find(band =>
    (band.min === null || input.tScore! >= band.min) && (band.max === null || input.tScore! <= band.max));
  const referenceBand = input.scaleType === "ordinary_adaptive" ? band?.adaptiveLabel ?? null : band?.label ?? null;
  return {
    classification: sourceClassification ?? referenceBand,
    referenceBand,
    provenance: sourceClassification ? "publisher_source" as const : referenceBand ? "published_interpretation_rule" as const : "unavailable" as const,
  };
}

const BRIEF_SOURCE = "https://www.parinc.com/docs/default-source/product-resources/brief2-parent-form-interpretive-report-sample-(002).pdf";
const BASC_SOURCE = "https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/basc-3/basc-3-rating-scales-report-sample.pdf";
const BYI_ENTRY_SOURCE = "https://qglobal.pearsonclinical.com/qg/static/Product/sv/BYI-2/BYI-2_Enter_Scores.htm";
const BYI_REPORT_SOURCE = "https://www.pearsonclinical.co.uk/content/dam/school/global/clinical/us/assets/beck/BYI-2-Score-Report-Sample.pdf";

export function getPublisherCriteria(toolId: string | null | undefined) {
  const family: PublisherFamily | null = toolId && ["BRIEF2", "BRIEF2-P", "BRIEF2-T", "BRIEF2-SR"].includes(toolId) ? "BRIEF2"
    : toolId === "BASC3" || toolId?.startsWith("BASC3-") ? "BASC3"
    : toolId === "BYI2" ? "BYI2" : null;
  if (!family) return null;
  const bands = family === "BRIEF2" ? BRIEF_BANDS : family === "BASC3" ? BASC_BANDS : [];
  const clinicalScales = family === "BRIEF2" && toolId !== "BRIEF2"
    ? toolId === "BRIEF2-SR"
      ? ["Inhibit", "Self-Monitor", "Shift", "Emotional Control", "Task Completion", "Working Memory", "Plan/Organize"]
      : ["Inhibit", "Self-Monitor", "Shift", "Emotional Control", "Initiate", "Working Memory", "Plan/Organize", "Task-Monitor", "Organization of Materials"]
    : [];
  const inventories = family === "BYI2" ? [
    { code: "BSCI-Y", name: "Self-Concept", direction: "Higher scores indicate more positive self-concept." },
    { code: "BAI-Y", name: "Anxiety", direction: "Higher scores indicate more reported symptoms." },
    { code: "BDI-Y", name: "Depression", direction: "Higher scores indicate more reported symptoms." },
    { code: "BANI-Y", name: "Anger", direction: "Higher scores indicate more reported symptoms." },
    { code: "BDBI-Y", name: "Disruptive Behavior", direction: "Higher scores indicate more reported symptoms." },
  ] : [];
  return {
    family, formId: toolId, version: "publisher-interpretation-2026-10-26",
    bands, clinicalScales, inventories,
    responseAnchors: family === "BYI2"
      ? ["0 = Never", "1 = Sometimes", "2 = Often", "3 = Always"]
      : family === "BRIEF2" ? ["Never", "Sometimes", "Often"]
      : ["Never", "Sometimes", "Often", "Almost Always", "Self-report also includes True/False items"],
    sources: family === "BRIEF2" ? [{ title: "PAR BRIEF-2 interpretive report: clinical T-score bands", url: BRIEF_SOURCE }]
      : family === "BASC3" ? [
          { title: "Pearson BASC-3 rating-scales report: clinical/adaptive profiles", url: BASC_SOURCE },
          { title: "Pearson BASC-3 publication summary: scoring and norm groups", url: "https://www.pearsonassessments.com/content/dam/school/global/clinical/us/assets/basc-3/basc3-publication-summary.pdf" },
        ] : [
          { title: "Pearson Q-global: BYI-2 item-entry coding", url: BYI_ENTRY_SOURCE },
          { title: "Pearson BYI-2 report: separate inventory scores and source categories", url: BYI_REPORT_SOURCE },
        ],
    limitations: family === "BRIEF2"
      ? ["The table applies to verified clinical scale/index/composite T-scores, not raw responses or RAOS percentages.", "Validity findings require their own source rules. Never average scale T-scores to create BRI/ERI/CRI/GEC."]
      : family === "BASC3"
        ? ["Use the appropriate direction only for ordinary scales confirmed against the administered form. Special indexes retain their source-specific categories.", "Low problem scores do not indicate impairment; high adaptive scores indicate strengths. No scale T-score averages are used to manufacture composites."]
        : ["Five inventories remain independent; there is no overall Beck score.", "Self-Concept must not receive symptom cutoffs. The publisher samples do not establish a complete cutoff table; preserve the exact official classification.", "A 0–60 direct-sum raw total requires the correct complete 20-item inventory and a verified key. Missing answers are not zeros."],
    readiness: [
      { rule: family === "BYI2" ? "Response coding and inventory direction" : "T-score interpretation criteria", state: "Reference rules available", detail: "Confirmed public publisher guidance and the supplied correction instructions; applicability to each administration must still be established." },
      { rule: "Raw-to-T conversion", state: "Source tables not configured", detail: "Requires the applicable form/age/norm-specific licensed lookup tables or official results; sample-report raw/T pairs are not conversion tables." },
      { rule: "Percentiles, intervals and validity", state: "Source-specific results required", detail: "Preserve official values and bounded notation exactly. Do not estimate missing fields from a normal distribution or an LLM." },
    ],
  };
}
