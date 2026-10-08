/** Every teacher-rated catalogue form is assigned separately to both teachers. */
export const CHINESE_LITERACY_TOOL_ID = "REMYND_CHINESE_LITERACY_TEACHER_OBSERVATION";

/** The Chinese literacy teacher form is single-teacher by default; teacher2 is optional and manual only. */
export function assignmentRespondentTypes(catalogueTypes: readonly string[], toolId?: string): string[] {
  if (toolId === CHINESE_LITERACY_TOOL_ID) {
    return [...new Set(catalogueTypes.map(type => (type === "teacher" || type === "teacher2" ? "teacher1" : type)))];
  }
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
  const assignedToolIds = new Set([...existingKeys].map(key => key.split("\0", 1)[0]));
  for (const tool of tools) {
    if (tool.id === CHINESE_LITERACY_TOOL_ID) continue;
    if (!assignedToolIds.has(tool.id) || !assignmentRespondentTypes(tool.respondentTypes ?? []).includes("teacher1")) continue;
    const first = existingKeys.has(`${tool.id}\0teacher1`);
    const second = existingKeys.has(`${tool.id}\0teacher2`);
    if (!first) missing.push({ toolId: tool.id, respondentType: "teacher1" });
    if (!second) missing.push({ toolId: tool.id, respondentType: "teacher2" });
  }
  return missing;
}