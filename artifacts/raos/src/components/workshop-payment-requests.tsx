import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react";
import { Calendar, DollarSign, ExternalLink, Loader2 } from "lucide-react";

type WorkshopPaymentRequest = {
  id: string;
  status: "new" | "contacted" | "converted" | "closed";
  contactName: string;
  contactEmail: string;
  organisation?: string | null;
  role?: string | null;
  workshopTitle: string;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentStatus?: string | null;
  receiptUploaded?: boolean;
  createdAt: string;
};

const REQUEST_STATUSES: WorkshopPaymentRequest["status"][] = [
  "new",
  "contacted",
  "converted",
  "closed",
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  wechat_pay: "WeChat Pay",
  alipay: "Alipay",
  credit_card: "Credit card",
};

export default function WorkshopPaymentRequests() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<{ inquiries: WorkshopPaymentRequest[] }>({
    queryKey: ["workshop-sales-inquiries"],
    queryFn: () => customFetch<{ inquiries: WorkshopPaymentRequest[] }>("/api/training/workshops/manual-sales-inquiries"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkshopPaymentRequest["status"] }) =>
      customFetch(`/api/training/workshops/manual-sales-inquiries/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(status === "converted" ? { paymentConfirmed: true } : {}) }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workshop-sales-inquiries"] });
      if (variables.status === "converted") {
        queryClient.invalidateQueries({ queryKey: ["admin-workshops"] });
        queryClient.invalidateQueries({ queryKey: ["workshop-registrations"] });
      }
    },
    onError: (error: Error) => window.alert(error.message || "Unable to update workshop payment request."),
  });

  // Paid attendees are managed in the workshop's registration roster, not in this request queue.
  const requests = (data?.inquiries ?? []).filter((request) => request.status !== "converted");

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-amber-100 bg-amber-50/70 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign size={16} className="text-amber-700" />
            <h2 className="font-semibold text-slate-900">Workshop payment requests</h2>
            {requests.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                {requests.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Review payment requests here. Confirmed attendees appear in their workshop registration roster.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> Loading workshop requests…
        </div>
      ) : isError ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-red-700">
          <span>Workshop payment requests could not be loaded.</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-red-200 px-3 py-1.5 font-medium hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-slate-500">
          No workshop payment requests are awaiting review. Confirmed attendees are listed in each workshop’s roster.
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {requests.map((request) => (
            <div key={request.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{request.contactName}</p>
                <p className="text-sm text-slate-500">{request.contactEmail}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {request.workshopTitle}
                  {request.organisation ? ` · ${request.organisation}` : ""}
                  {request.role ? ` · ${request.role}` : ""}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} /> {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                  <span>
                    Payment: {PAYMENT_METHOD_LABELS[request.paymentMethod ?? ""] ?? request.paymentMethod ?? "Not specified"}
                    {request.paymentStatus ? ` · ${request.paymentStatus.replaceAll("_", " ")}` : ""}
                  </span>
                  {request.paymentReference && <span>Reference: {request.paymentReference}</span>}
                  {request.receiptUploaded && (
                    <a
                      href={`/api/training/workshops/manual-sales-inquiries/${encodeURIComponent(request.id)}/receipt`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"
                    >
                      <ExternalLink size={12} /> View receipt
                    </a>
                  )}
                </div>
              </div>

              <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-slate-500">
                Request status
                <select
                  value={request.status}
                  disabled={updateStatus.isPending}
                  onChange={(event) => {
                    const status = event.target.value as WorkshopPaymentRequest["status"];
                    if (
                      status === "converted" &&
                      !window.confirm(
                        "Confirm that payment was received. This will add the person to the paid attendee roster and send their registration confirmation.",
                      )
                    ) {
                      return;
                    }
                    updateStatus.mutate({ id: request.id, status });
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {REQUEST_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status === "converted" ? "Confirm payment & register" : status[0].toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
