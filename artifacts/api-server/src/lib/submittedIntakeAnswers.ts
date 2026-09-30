const ANSWER_FORMAT = "remynd.intake.answers.v1";

/** Legacy responses are unstructured narratives; never guess which question they answer. */
export function readSubmittedIntakeAnswers(answer: string | null, questionCount: number): string[] | null {
  if (!answer) return null;
  try {
    const parsed: unknown = JSON.parse(answer);
    if (
      typeof parsed === "object" && parsed !== null &&
      "format" in parsed && parsed.format === ANSWER_FORMAT &&
      "answers" in parsed && Array.isArray(parsed.answers) &&
      parsed.answers.length === questionCount &&
      parsed.answers.every((item: unknown) => typeof item === "string")
    ) return parsed.answers as string[];
  } catch {
    // Older replies were saved as plain text.
  }
  return null;
}

export function formatSubmittedIntakeResponses(
  requests: Array<{ audience: string; questions: string[]; answer: string | null; submittedAt: Date | null }>,
): string {
  return JSON.stringify(requests.filter(request => request.submittedAt && request.answer?.trim()).map(request => {
    const answers = readSubmittedIntakeAnswers(request.answer, request.questions.length);
    return {
      audience: request.audience,
      submittedAt: request.submittedAt,
      ...(answers
        ? { questionAnswers: request.questions.map((question, index) => ({ question, answer: answers[index] })) }
        : { questions: request.questions, combinedResponseAsWritten: request.answer }),
    };
  }), null, 2);
}