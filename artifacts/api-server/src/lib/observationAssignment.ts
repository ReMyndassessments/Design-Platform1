/** Observation is staff work, never a student or examiner-administered test. */
export function canAssignObservation(toolId: string, respondentType: string): boolean {
  return toolId !== "BEHAVOBS" || respondentType === "invigilator";
}

type ObservationAssignment = {
  id: string;
  toolId: string;
  respondentType: string;
  respondentLabel: string;
  status: string;
  submittedAt?: Date | string | null;
};

/** Hide only unused, misrouted duplicates; retain all saved evidence and DB rows. */
export function visibleObservationAssignments<T extends ObservationAssignment>(
  assignments: readonly T[],
  responseIds: ReadonlySet<string>,
): T[] {
  const hasInvigilatorCopy = assignments.some(a =>
    a.toolId === "BEHAVOBS" && a.respondentType === "invigilator");
  return assignments.flatMap(a => {
    if (a.toolId !== "BEHAVOBS" || a.respondentType === "invigilator") return [a];
    if (hasInvigilatorCopy && a.status === "not_started" && !a.submittedAt && !responseIds.has(a.id)) return [];
    return [{ ...a, respondentType: "invigilator", respondentLabel: "Post-Assessment" }];
  });
}