import assert from "node:assert/strict";
import test from "node:test";
import { assignmentInvitationLink, respondentInvitationGroupKey } from "./assignment-invitation-links";

const groups = [
  { link: "/external/parent-primary", forms: [{ id: "parent-existing" }, { id: "chinese-parent" }] },
  { link: "/external/other-parent", forms: [{ id: "other-parent" }] },
  { link: "/external/teacher-primary", forms: [{ id: "chinese-teacher" }] },
];

test("Chinese parent shares the existing recipient portal invitation", () => {
  assert.equal(assignmentInvitationLink({
    id: "chinese-parent", respondentType: "parent", uniqueLink: "/external/parent-new",
  }, groups), "/external/parent-primary");
});

test("different parents retain independent invitations", () => {
  assert.equal(assignmentInvitationLink({
    id: "other-parent", respondentType: "parent", uniqueLink: "/external/other-form",
  }, groups), "/external/other-parent");
});

test("an ungrouped parent is not merged into another parent's portal", () => {
  assert.equal(assignmentInvitationLink({
    id: "unassigned-parent", respondentType: "parent", uniqueLink: "/external/unassigned",
  }, groups), "/external/unassigned");
});

test("teachers retain existing direct form links", () => {
  assert.equal(assignmentInvitationLink({
    id: "chinese-teacher", respondentType: "teacher1", uniqueLink: "/external/teacher-form",
  }, groups), "/external/teacher-form");
});

test("parent and teacher portals remain separate even with a shared email", () => {
  assert.notEqual(
    respondentInvitationGroupKey({ respondentType: "parent", assignedToEmail: "person@example.org" }),
    respondentInvitationGroupKey({ respondentType: "teacher1", assignedToEmail: "person@example.org" }),
  );
});

test("the same parent's email is grouped consistently", () => {
  assert.equal(
    respondentInvitationGroupKey({ respondentType: "parent", assignedToEmail: " Parent@Example.Org " }),
    respondentInvitationGroupKey({ respondentType: "parent", assignedToEmail: "parent@example.org" }),
  );
});

test("teacher role grouping matches the respondent portal", () => {
  assert.equal(
    respondentInvitationGroupKey({ respondentType: "teacher1", assignedToEmail: "teacher@example.org" }),
    respondentInvitationGroupKey({ respondentType: "special_needs_teacher", assignedToEmail: "teacher@example.org" }),
  );
});

test("unnamed parent packages are not implicitly consolidated", () => {
  assert.notEqual(
    respondentInvitationGroupKey({ respondentType: "parent", respondentLabel: "Parent" }),
    respondentInvitationGroupKey({ respondentType: "parent", respondentLabel: "Parent Assessment Package" }),
  );
});
