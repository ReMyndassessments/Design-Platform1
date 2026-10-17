export interface ChineseLiteracyDashboardDomainModel {
  id: string;
  name: string;
  mean: number | null;
  status: string;
  validCount: number;
  notObservedCount: number;
  notApplicableCount: number;
  unansweredCount: number;
}

export interface ChineseLiteracyDashboardAdministrationModel {
  assignmentId: string;
  respondentType: string;
  setting: string;
  status: string;
  revision: number;
  submittedAt: string | null;
  domains: ChineseLiteracyDashboardDomainModel[];
}

export interface ChineseLiteracyDashboardSnapshotModel {
  parentAssignmentId: string;
  teacherAssignmentId: string;
  parentRevision: number;
  teacherRevision: number;
}

export const AUTO_REFRESH_OPTIONS = [
  { label: "Off", value: null },
  { label: "Every 5 min", value: 5 * 60 * 1000 },
  { label: "Every 15 min", value: 15 * 60 * 1000 },
  { label: "Every 1 hour", value: 60 * 60 * 1000 },
] as const;

export function hasChineseLiteracyDashboardAccess(role: string | null | undefined) {
  return role === "admin" || role === "psychometrician" || role === "school_clinical_coordinator";
}

export function isParentHome(record: Pick<ChineseLiteracyDashboardAdministrationModel, "respondentType" | "setting">) {
  const setting = record.setting.toLowerCase();
  return record.respondentType.toLowerCase() === "parent" && (setting.includes("home") || setting.includes("parent"));
}

export function isTeacherClassroom(record: Pick<ChineseLiteracyDashboardAdministrationModel, "respondentType" | "setting">) {
  const setting = record.setting.toLowerCase();
  return record.respondentType.toLowerCase().includes("teacher") && (setting.includes("classroom") || setting.includes("school"));
}

export function sharedDomainPairs<TDomain extends ChineseLiteracyDashboardDomainModel>(
  parent: { domains: TDomain[] } | undefined,
  teacher: { domains: TDomain[] } | undefined,
): Array<{ name: string; parentDomain: TDomain; teacherDomain: TDomain }> {
  if (!parent || !teacher) return [];
  return parent.domains.flatMap(parentDomain => {
    const teacherDomain = teacher.domains.find(domain =>
      domain.id === parentDomain.id && domain.name.trim() === parentDomain.name.trim());
    return teacherDomain ? [{ name: parentDomain.name, parentDomain, teacherDomain }] : [];
  });
}

export function snapshotMatchesSelection(
  snapshot: ChineseLiteracyDashboardSnapshotModel | null | undefined,
  parent: Pick<ChineseLiteracyDashboardAdministrationModel, "assignmentId" | "revision"> | undefined,
  teacher: Pick<ChineseLiteracyDashboardAdministrationModel, "assignmentId" | "revision"> | undefined,
) {
  return Boolean(snapshot && parent && teacher
    && snapshot.parentAssignmentId === parent.assignmentId
    && snapshot.teacherAssignmentId === teacher.assignmentId
    && snapshot.parentRevision === parent.revision
    && snapshot.teacherRevision === teacher.revision);
}

export function canGenerateComparison(
  parent: Pick<ChineseLiteracyDashboardAdministrationModel, "status" | "submittedAt"> | undefined,
  teacher: Pick<ChineseLiteracyDashboardAdministrationModel, "status" | "submittedAt"> | undefined,
  sharedDomainCount: number,
  isPending: boolean,
) {
  return Boolean(parent && teacher
    && ["submitted", "under_review", "approved"].includes(parent.status.toLowerCase())
    && ["submitted", "under_review", "approved"].includes(teacher.status.toLowerCase())
    && parent.submittedAt && teacher.submittedAt
    && sharedDomainCount > 0 && !isPending);
}

export function createComparisonCsv(domains: Array<{
  name: string;
  parentDomain: Pick<ChineseLiteracyDashboardDomainModel, "mean" | "status">;
  teacherDomain: Pick<ChineseLiteracyDashboardDomainModel, "mean" | "status">;
}>) {
  const cell = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = [
    ["Domain", "Parent / home mean", "Teacher / classroom mean", "Parent status", "Teacher status"],
    ...domains.map(({ name, parentDomain, teacherDomain }) => [
      name,
      parentDomain.mean,
      teacherDomain.mean,
      parentDomain.status,
      teacherDomain.status,
    ]),
  ];
  return rows.map(row => row.map(cell).join(",")).join("\r\n");
}
