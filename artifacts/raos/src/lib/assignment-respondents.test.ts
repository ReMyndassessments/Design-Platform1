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

test("only missing teacher counterparts are proposed; parent and existing work are untouched", () => {
  const tools = [
    { id: "CDP-CL", respondentTypes: ["parent", "teacher"] },
    { id: "VADTRS", respondentTypes: ["teacher1", "teacher2"] },
    { id: "VADPRS", respondentTypes: ["parent"] },
  ];
  assert.deepEqual(missingTeacherAssignments(
    new Set(["CDP-CL\0parent", "CDP-CL\0teacher1", "VADTRS\0teacher2", "VADPRS\0parent"]),
    tools,
  ), [
    { toolId: "CDP-CL", respondentType: "teacher2" },
    { toolId: "VADTRS", respondentType: "teacher1" },
  ]);
});