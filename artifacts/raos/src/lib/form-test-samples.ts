/** Synthetic values for staff-only dry runs. Never use these in live submissions. */
export type SampleQuestion = {
  id: string; text: string; type: string; options?: string[]; rows?: SampleQuestion[];
};

export function sampleQuestionnaireAnswers(questions: readonly SampleQuestion[]): Record<string, string | string[]> {
  const answers: Record<string, string | string[]> = {};
  const fill = (question: SampleQuestion) => {
    if (question.type === "section_header") return;
    if (question.type === "frequency_grid") {
      (question.rows ?? []).forEach(row => fill({ ...row, options: row.options ?? question.options }));
      return;
    }
    const options = question.options ?? (["likert", "scale"].includes(question.type) ? ["Never", "Rarely", "Sometimes", "Often", "Very Often"] : []);
    const option = options.find(value => /^(yes|agree|i agree)$/i.test(value)) ?? options[0];
    if (question.type === "checkbox_group" || question.type === "multiselect") {
      answers[question.id] = [option ?? "Sample test answer"];
    } else if (question.type === "checkbox") {
      answers[question.id] = "1";
    } else if (question.type === "date" || /(^|_)(dob|date)(_|$)/i.test(question.id)) {
      answers[question.id] = /dob/i.test(question.id) ? "2014-01-01" : "2026-01-15";
    } else if (question.type === "number") {
      answers[question.id] = "1";
    } else {
      answers[question.id] = option ?? "Sample test answer — not a real observation";
    }
  };
  questions.forEach(fill);
  return answers;
}
