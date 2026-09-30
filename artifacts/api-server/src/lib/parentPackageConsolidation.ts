type ParentAssessmentRow = {
  id: string;
  respondentLabel: string;
  assignedToName: string | null;
  assignedToEmail: string | null;
};

export function planParentPackageConsolidation(rows: readonly ParentAssessmentRow[]):
  | { error: "recipient_identified" | "no_split_parent_package" }
  | { sourceIds: string[] } {
  if (rows.some(a => a.assignedToName?.trim() || a.assignedToEmail?.trim())) {
    return { error: "recipient_identified" };
  }
  const sourceIds = rows.filter(a => a.respondentLabel === "Parent").map(a => a.id);
  if (!sourceIds.length || !rows.some(a => a.respondentLabel === "Parent Assessment Package")) {
    return { error: "no_split_parent_package" };
  }
  return { sourceIds };
}