const ANSWER_FORMAT = "remynd.intake.answers.v1";

/** Older invitations saved a single free-text reply. New replies keep each answer separate. */
export function readIntakeQuestionAnswers(answer: string | null, questionCount: number): string[] | null {
  if (!answer) return null;
  try {
    const parsed: unknown = JSON.parse(answer);
    if (
      typeof parsed === "object" && parsed !== null &&
      "format" in parsed && parsed.format === ANSWER_FORMAT &&
      "answers" in parsed && Array.isArray(parsed.answers) &&
      parsed.answers.length === questionCount &&
      parsed.answers.every((item: unknown) => typeof item === "string")
    ) {
      return parsed.answers as string[];
    }
  } catch {
    // Plain-text responses saved before the per-question form remain readable.
  }
  return null;
}

export function writeIntakeQuestionAnswers(answers: string[]): string {
  return JSON.stringify({ format: ANSWER_FORMAT, answers: answers.map(answer => answer.trim()) });
}