import test from "node:test";
import assert from "node:assert/strict";
import { assignmentRespondentTypes, missingTeacherAssignments } from "./assignment-respondents.ts";

test("generic teacher forms are assigned to both teacher slots", () => {
  assert.deepEqual(assignmentRespondentTypes(["parent", "teacher"]), ["parent", "teacher1", "teacher2"]);
});

test("explicit teacher slots are kept distinct without duplicates", () => {
  assert.deepEqual(assignmentRespondentTypes(["teacher1", "teacher2"]), ["teacher1", "teacher2"]);
  assert.deepEqual(assignmentRespondentTypes(["teacher", "teacher1", "teacher2"]), ["teacher1", "teacher2"]);
  assert.deepEqual(assignmentRespondentTypes(["boarding_staff", "teacher1"]), ["boarding_staff", "teacher1", "teacher2"]);
  assert.deepEqual(assignmentRespondentTypes(["parent", "self"]), ["parent", "self"]);
});

test("all assigned teacher-eligible tools get both slots without replacing existing work", () => {
  const tools = [
    { id: "CDP-CL", respondentTypes: ["parent", "teacher"] },
    { id: "CDP-CI", respondentTypes: ["parent", "teacher"] },
    { id: "VADTRS", respondentTypes: ["teacher1", "teacher2"] },
    { id: "VADPRS", respondentTypes: ["parent"] },
    { id: "UNASSIGNED", respondentTypes: ["teacher1", "teacher2"] },
  ];
  assert.deepEqual(missingTeacherAssignments(
    new Set(["CDP-CL\0parent", "CDP-CL\0teacher1", "CDP-CI\0parent", "VADTRS\0teacher2", "VADPRS\0parent"]),
    tools,
  ), [
    { toolId: "CDP-CL", respondentType: "teacher2" },
    { toolId: "CDP-CI", respondentType: "teacher1" },
    { toolId: "CDP-CI", respondentType: "teacher2" },
    { toolId: "VADTRS", respondentType: "teacher1" },
  ]);
});