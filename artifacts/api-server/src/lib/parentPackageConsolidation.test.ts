import test from "node:test";
import assert from "node:assert/strict";
import { consolidatedParentPortalToken, planParentPackageConsolidation, tokenFromPortalLink, parentPortalLinkAfterRecipientUpdate } from "./parentPackageConsolidation.ts";

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

test("a consolidated group has one portal entry token even when a form gets added later", () => {
  const canonical = { uniqueToken: "main", uniqueLink: "https://example.org/external/main", respondentLabel: "Parent Assessment Package", assignedToEmail: null };
  const olderLink = { ...canonical, uniqueToken: "old" };
  const addedLater = { ...canonical, uniqueToken: "new", uniqueLink: "https://example.org/external/new" };
  assert.equal(tokenFromPortalLink(canonical.uniqueLink), "main");
  assert.equal(consolidatedParentPortalToken(olderLink, [canonical, olderLink, addedLater]), "main");
  assert.equal(consolidatedParentPortalToken(addedLater, [canonical, olderLink, addedLater]), "main");
  assert.equal(consolidatedParentPortalToken(canonical, [canonical, olderLink, addedLater]), "main");
  assert.equal(consolidatedParentPortalToken(addedLater, [canonical, addedLater]), null);
  const emailed = [canonical, olderLink].map(row => ({ ...row, assignedToEmail: "parent@example.org" }));
  assert.equal(consolidatedParentPortalToken(emailed[1], emailed), "main");
});

test("different parent recipients cannot inherit another parent's canonical link", () => {
  const canonical = { uniqueToken: "main", uniqueLink: "/external/main", respondentLabel: "Parent Assessment Package", assignedToEmail: "one@example.org" };
  const marker = { ...canonical, uniqueToken: "old" };
  const otherParent = { uniqueToken: "second", uniqueLink: "/external/second", respondentLabel: "Second Parent / Guardian", assignedToEmail: "two@example.org" };
  assert.equal(consolidatedParentPortalToken(otherParent, [canonical, marker, otherParent]), null);
});

test("sending a newly assigned parent form uses the established portal after contact entry", () => {
  const canonical = { uniqueToken: "main", uniqueLink: "/external/main", respondentLabel: "Existing parent", assignedToEmail: "parent@example.org" };
  const marker = { ...canonical, uniqueToken: "old-form" };
  const added = { uniqueToken: "chinese-parent", uniqueLink: "/external/chinese-parent", respondentLabel: "Parent Assessment Package", assignedToEmail: null };
  const rows = [canonical, marker, added];
  const before = structuredClone(rows);
  assert.equal(parentPortalLinkAfterRecipientUpdate(added, rows, "parent@example.org"), "/external/main");
  assert.deepEqual(rows, before, "resolving a link must not modify stored contact data");
});

test("sending to a different parent with the same package label keeps their own portal", () => {
  const canonical = { uniqueToken: "main", uniqueLink: "/external/main", respondentLabel: "Parent Assessment Package", assignedToEmail: "first@example.org" };
  const marker = { ...canonical, uniqueToken: "old-form" };
  const second = { uniqueToken: "second", uniqueLink: "/external/second", respondentLabel: "Parent Assessment Package", assignedToEmail: null };
  assert.equal(parentPortalLinkAfterRecipientUpdate(second, [canonical, marker, second], "second@example.org"), "/external/second");
});

test("a missing canonical invitation is rejected rather than emailing a retired link", () => {
  const marker = { uniqueToken: "old-form", uniqueLink: "/external/main", respondentLabel: "Parent Assessment Package", assignedToEmail: "parent@example.org" };
  assert.equal(parentPortalLinkAfterRecipientUpdate(marker, [marker], "parent@example.org"), null);
});