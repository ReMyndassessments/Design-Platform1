import { useQuery } from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

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
