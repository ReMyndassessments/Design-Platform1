/** Every teacher-rated catalogue form is assigned separately to both teachers. */
export function assignmentRespondentTypes(catalogueTypes: readonly string[]): string[] {
  return [...new Set(catalogueTypes.flatMap(type =>
    type === "teacher" || type === "teacher1" || type === "teacher2"
      ? ["teacher1", "teacher2"] : [type]
  ))];
}

export function missingTeacherAssignments(
  existingKeys: ReadonlySet<string>,
  tools: readonly { id: string; respondentTypes?: readonly string[] | null }[],
): Array<{ toolId: string; respondentType: "teacher1" | "teacher2" }> {
  const missing: Array<{ toolId: string; respondentType: "teacher1" | "teacher2" }> = [];
  for (const tool of tools) {
    if (!assignmentRespondentTypes(tool.respondentTypes ?? []).includes("teacher1")) continue;
    const first = existingKeys.has(`${tool.id}\0teacher1`);
    const second = existingKeys.has(`${tool.id}\0teacher2`);
    if (!first && !second) continue;
    if (!first) missing.push({ toolId: tool.id, respondentType: "teacher1" });
    if (!second) missing.push({ toolId: tool.id, respondentType: "teacher2" });
  }
  return missing;
}