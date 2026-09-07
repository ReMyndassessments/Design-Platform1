import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";

export function useProviderStatus() {
  return useQuery({
    queryKey: ["communications-provider-status"],
    queryFn: () => customFetch("/api/communications/provider-status") as Promise<{ providers: any }>,
  });
}

export function useCampaigns() {
  return useQuery({
    queryKey: ["communications-campaigns"],
    queryFn: () => customFetch("/api/communications/campaigns") as Promise<{ campaigns: any[] }>,
  });
}

export function useCampaignDetail(id: string) {
  return useQuery({
    queryKey: ["communications-campaign", id],
    queryFn: () => customFetch(`/api/communications/campaigns/${id}`) as Promise<{ campaign: any; summary: any; history: any[] }>,
    enabled: !!id,
  });
}

export function useCampaignSummary(id: string) {
  return useQuery({
    queryKey: ["communications-campaign-summary", id],
    queryFn: () => customFetch(`/api/communications/campaigns/${id}/summary`) as Promise<{ summary: any }>,
    enabled: !!id,
  });
}

export function useTemplates() {
  return useQuery({
    queryKey: ["communications-templates"],
    queryFn: () => customFetch("/api/communications/templates") as Promise<{ templates: any[] }>,
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ["communications-template", id],
    queryFn: () => customFetch(`/api/communications/templates/${id}`) as Promise<{ template: any }>,
    enabled: !!id,
  });
}

export function useDrafts() {
  return useQuery({
    queryKey: ["communications-drafts"],
    queryFn: () => customFetch("/api/communications/drafts") as Promise<{ drafts: any[] }>,
  });
}

export function useDraft(id: string) {
  return useQuery({
    queryKey: ["communications-draft", id],
    queryFn: () => customFetch(`/api/communications/drafts/${id}`) as Promise<{ draft: any }>,
    enabled: !!id,
  });
}

export function useBrandSettings() {
  return useQuery({
    queryKey: ["communications-brand-settings"],
    queryFn: () => customFetch("/api/communications/brand") as Promise<{ settings: any }>,
  });
}

export function useAssets() {
  return useQuery({
    queryKey: ["communications-assets"],
    queryFn: () => customFetch("/api/communications/assets") as Promise<{ assets: any[] }>,
  });
}

export function useSuppressions() {
  return useQuery({
    queryKey: ["communications-suppressions"],
    queryFn: () => customFetch("/api/communications/suppressions") as Promise<{ suppressions: any[] }>,
  });
}

// Mutations
export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => customFetch("/api/communications/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "Content-Type": "application/json" },
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-campaigns"] }),
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFetch(`/api/communications/campaigns/${id}/send`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["communications-campaigns"] });
      qc.invalidateQueries({ queryKey: ["communications-campaign-summary", id] });
    },
  });
}

export function useSendTestCampaign() {
  return useMutation({
    mutationFn: ({ id, email, name }: { id: string; email: string; name?: string }) => 
      customFetch(`/api/communications/campaigns/${id}/send-test`, {
        method: "POST",
        body: JSON.stringify({ email, name }),
        headers: { "Content-Type": "application/json" },
      }),
  });
}

export function useScheduleCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) => 
      customFetch(`/api/communications/campaigns/${id}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledAt }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["communications-campaigns"] });
      qc.invalidateQueries({ queryKey: ["communications-campaign-summary", id] });
    },
  });
}

export function useCancelCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFetch(`/api/communications/campaigns/${id}/cancel`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["communications-campaigns"] });
      qc.invalidateQueries({ queryKey: ["communications-campaign", id] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFetch(`/api/communications/campaigns/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-campaigns"] }),
  });
}

export function useArchiveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFetch(`/api/communications/campaigns/${id}/archive`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-campaigns"] }),
  });
}

export function useClearTestCampaigns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => customFetch("/api/communications/campaigns/test-drafts", { method: "DELETE" }) as Promise<{ deleted: number }>,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-campaigns"] }),
  });
}

export function useRetryCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFetch(`/api/communications/campaigns/${id}/retry-failed`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["communications-campaigns"] });
      qc.invalidateQueries({ queryKey: ["communications-campaign-summary", id] });
    },
  });
}

export function useConfirmEmailOctopusSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFetch(`/api/communications/campaigns/${id}/confirm-emailoctopus-sent`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["communications-campaigns"] });
      qc.invalidateQueries({ queryKey: ["communications-campaign", id] });
      qc.invalidateQueries({ queryKey: ["communications-campaign-summary", id] });
    },
  });
}

export function useSyncCampaignResults() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFetch(`/api/communications/campaigns/${id}/sync-results`, { method: "POST" }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["communications-campaigns"] });
      qc.invalidateQueries({ queryKey: ["communications-campaign", id] });
      qc.invalidateQueries({ queryKey: ["communications-campaign-summary", id] });
    },
  });
}

export function useDirectSend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; subject: string; html: string; sourceType: string; sourceId: string; name?: string }) => 
      customFetch("/api/communications/direct-send", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["communications-campaigns"] });
    },
  });
}

export function useAudiencePreview() {
  return useMutation({
    mutationFn: (data: { audience: any; kind: string }) => 
      customFetch("/api/communications/audience-preview", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; subject: string; html: string }) => 
      customFetch("/api/communications/templates", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      customFetch(`/api/communications/templates/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["communications-templates"] });
      qc.invalidateQueries({ queryKey: ["communications-template", id] });
    },
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFetch(`/api/communications/templates/${id}/duplicate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-templates"] }),
  });
}

export function useArchiveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFetch(`/api/communications/templates/${id}/archive`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-templates"] }),
  });
}

export function useCreateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; subject?: string; html?: string; audience?: any }) => 
      customFetch("/api/communications/drafts", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-drafts"] }),
  });
}

export function useUpdateDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      customFetch(`/api/communications/drafts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["communications-drafts"] });
      qc.invalidateQueries({ queryKey: ["communications-draft", id] });
    },
  });
}

export function useUpdateBrandSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: any) => 
      customFetch("/api/communications/brand", {
        method: "PUT",
        body: JSON.stringify({ settings }),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-brand-settings"] }),
  });
}

export function useAddSuppression() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; kind: "hard" | "unsubscribe"; reason?: string }) => 
      customFetch("/api/communications/suppressions", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-suppressions"] }),
  });
}

export function useRemoveSuppression() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => customFetch(`/api/communications/suppressions/${encodeURIComponent(email)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communications-suppressions"] }),
  });
}
