import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

// ─── Validation Warnings ─────────────────────────────────────────────────────

export interface ValidationWarning {
  type: "basc_scale_correction" | "form_version_changed";
  severity: "warning" | "error";
  caseId: string;
  studentName: string;
  school: string;
  assignmentId: string;
  toolId: string;
  toolName: string;
  respondentLabel: string;
  submittedAt?: string;
  status?: string;
  assignedVersionId?: string;
  currentVersionId?: string;
  description: string;
}

export interface ValidationWarningsResponse {
  warnings: ValidationWarning[];
  count: number;
}

export const getValidationWarningsQueryKey = () => ["/api/admin/validation-warnings"] as const;

export function useGetValidationWarnings() {
  return useQuery<ValidationWarningsResponse>({
    queryKey: getValidationWarningsQueryKey(),
    queryFn: () => customFetch<ValidationWarningsResponse>("/api/admin/validation-warnings"),
    staleTime: 5 * 60 * 1000,
  });
}

export interface MyPendingForm {
  id: string;
  caseId: string;
  studentName: string;
  toolName: string;
  status: string;
  uniqueLink: string;
  respondentType: string;
  updatedAt: string;
}

export const getMyPendingFormsQueryKey = () => ["/api/assignments/my-pending"] as const;

export function useGetMyPendingForms() {
  return useQuery<MyPendingForm[]>({
    queryKey: getMyPendingFormsQueryKey(),
    queryFn: () => customFetch<MyPendingForm[]>("/api/assignments/my-pending"),
  });
}
