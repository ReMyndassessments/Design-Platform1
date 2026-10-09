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

export function tokenFromPortalLink(link: string): string | null {
  return link.match(/\/external\/([^/?#]+)/)?.[1] ?? null;
}

type ParentPortalAssignment = {
  uniqueToken: string;
  uniqueLink: string;
  respondentLabel: string;
  assignedToEmail: string | null;
};

// A shared link on an assignment with a different form token marks an explicitly
// consolidated group. Its recipient portal accepts only the shared link's token.
export function consolidatedParentPortalToken(
  anchor: ParentPortalAssignment,
  candidates: readonly ParentPortalAssignment[],
): string | null {
  const email = anchor.assignedToEmail?.trim().toLowerCase();
  const group = candidates.filter(candidate => email
    ? candidate.assignedToEmail?.trim().toLowerCase() === email
    : !candidate.assignedToEmail?.trim() && candidate.respondentLabel === anchor.respondentLabel);
  const marker = group.find(candidate => {
    const linkToken = tokenFromPortalLink(candidate.uniqueLink);
    return linkToken && linkToken !== candidate.uniqueToken;
  });
  return marker ? tokenFromPortalLink(marker.uniqueLink) : null;
}

/** Resolve the invitation against the recipient contact update performed by sending. */
export function parentPortalLinkAfterRecipientUpdate(
  anchor: ParentPortalAssignment,
  candidates: readonly ParentPortalAssignment[],
  recipientEmail: string,
): string | null {
  const updated = candidates.map(candidate => {
    const receivesUpdate = anchor.assignedToEmail
      ? candidate.assignedToEmail === anchor.assignedToEmail
      : !candidate.assignedToEmail && candidate.respondentLabel === anchor.respondentLabel;
    return receivesUpdate ? { ...candidate, assignedToEmail: recipientEmail } : candidate;
  });
  const canonicalToken = consolidatedParentPortalToken(
    { ...anchor, assignedToEmail: recipientEmail }, updated,
  );
  return canonicalToken
    ? updated.find(candidate => candidate.uniqueToken === canonicalToken)?.uniqueLink ?? null
    : anchor.uniqueLink;
}