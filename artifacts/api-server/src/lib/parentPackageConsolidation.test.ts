import test from "node:test";
import assert from "node:assert/strict";
import { planParentPackageConsolidation } from "./parentPackageConsolidation.ts";

const source = { id: "first", respondentLabel: "Parent", assignedToName: null, assignedToEmail: null };
const target = { id: "second", respondentLabel: "Parent Assessment Package", assignedToName: null, assignedToEmail: null };

test("only source parent assignments are moved; target assignments stay unchanged", () => {
  assert.deepEqual(planParentPackageConsolidation([source, target]), { sourceIds: ["first"] });
});

test("identified parent assignments cannot be silently merged", () => {
  assert.deepEqual(planParentPackageConsolidation([{ ...source, assignedToName: "Other parent" }, target]), { error: "recipient_identified" });
  assert.deepEqual(planParentPackageConsolidation([source, { ...target, assignedToEmail: "other@example.org" }]), { error: "recipient_identified" });
});

test("already combined or incomplete groups do not trigger a repair", () => {
  assert.deepEqual(planParentPackageConsolidation([target]), { error: "no_split_parent_package" });
  assert.deepEqual(planParentPackageConsolidation([source]), { error: "no_split_parent_package" });
});