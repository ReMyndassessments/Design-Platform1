import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormView, type StaffPreviewForm } from "@/pages/external/[token]";

type TestPackageForm = {
  assignmentId: string;
  toolName: string;
  respondentLabel: string;
};

type TestPackageData = {
  preview: true;
  packageLabel: string;
  forms: TestPackageForm[];
  expiresAt: string;
};

type ApiError = Error & { status?: number };

async function requestTestPackage<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "X-Battery-Test-Token": token },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string; error?: string } | null;
    const fallback = response.status === 410
      ? "This test link has expired. Ask the person who sent it for a new link."
      : response.status === 409
        ? "This assessment package has changed since the test link was sent. Ask the sender for an updated link."
        : response.status === 401 || response.status === 403
          ? "This test link is invalid or you do not have access to it."
          : "The test package could not be loaded. Ask the sender for a new link.";
    const error = new Error(body?.message ?? body?.error ?? fallback) as ApiError;
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

function formatExpiration(value: string | undefined): string {
  if (!value) return "Expiration time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Expiration time unavailable" : date.toLocaleString();
}

export default function TestPackagePage() {
  const apiBase = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [token] = useState(() => new URLSearchParams(window.location.search).get("token")?.trim() ?? "");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [language, setLanguage] = useState("english");

  useEffect(() => {
    if (!token) return;
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("token");
    window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`);
  }, [token]);

  const packageQuery = useQuery<TestPackageData, ApiError>({
    queryKey: ["/api/external/battery-test", token],
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
    queryFn: () => requestTestPackage<TestPackageData>(`${apiBase}/api/external/battery-test`, token),
  });

  const formQuery = useQuery<StaffPreviewForm, ApiError>({
    queryKey: ["/api/external/battery-test/forms", token, selectedAssignmentId],
    enabled: Boolean(token && selectedAssignmentId),
    retry: false,
    staleTime: 0,
    queryFn: () => requestTestPackage<StaffPreviewForm>(
      `${apiBase}/api/external/battery-test/forms/${encodeURIComponent(selectedAssignmentId ?? "")}`,
      token,
    ),
  });

  const backToPackage = () => {
    setSelectedAssignmentId(null);
    setLanguage("english");
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 text-amber-600" size={36} />
          <h1 className="text-xl font-semibold text-slate-900">Test link unavailable</h1>
          <p role="alert" data-testid="status-test-package-error" className="mt-2 text-sm text-slate-600">
            This link is incomplete or the token is missing. Ask the sender to email you a new test package link.
          </p>
        </section>
      </main>
    );
  }

  if (packageQuery.isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p>Loading the test package…</p>
        </div>
      </main>
    );
  }

  if (packageQuery.isError || !packageQuery.data) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <section className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 text-amber-600" size={36} />
          <h1 className="text-xl font-semibold text-slate-900">Test package unavailable</h1>
          <p role="alert" data-testid="status-test-package-error" className="mt-2 text-sm leading-relaxed text-slate-600">
            {packageQuery.error?.message ?? "This link may have expired or the package may have changed. Ask the sender for a new link."}
          </p>
        </section>
      </main>
    );
  }

  const packageData = packageQuery.data;

  if (selectedAssignmentId && formQuery.isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p>Loading the assigned form for a test run…</p>
        </div>
      </main>
    );
  }

  if (selectedAssignmentId && (formQuery.isError || !formQuery.data)) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <section className="w-full max-w-lg rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 text-amber-600" size={36} />
          <h1 className="text-xl font-semibold text-slate-900">Form unavailable</h1>
          <p role="alert" data-testid="status-test-package-form-error" className="mt-2 text-sm leading-relaxed text-slate-600">
            {formQuery.error?.message ?? "This form link may have expired or the package may have changed. Ask the sender for a new link."}
          </p>
          <Button variant="outline" className="mt-5" onClick={backToPackage} data-testid="button-back-to-test-package">
            <ArrowLeft size={16} className="mr-2" /> Back to package
          </Button>
        </section>
      </main>
    );
  }

  if (selectedAssignmentId && formQuery.data) {
    return (
      <FormView
        key={selectedAssignmentId}
        activeToken=""
        language={language || formQuery.data.language || "english"}
        setLanguage={setLanguage}
        onBack={backToPackage}
        onSubmitted={backToPackage}
        previewMode
        previewForm={formQuery.data}
        previewError={formQuery.error?.message}
        previewBackLabel="Back to package"
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <section className="mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 bg-slate-900 px-6 py-6 text-white sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/20 text-violet-200">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-200">Test package</p>
              <h1 className="mt-1 text-xl font-semibold" data-testid="text-test-package-label">{packageData.packageLabel}</h1>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-6 sm:p-8">
          <div role="status" data-testid="status-test-package-only" className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">
            <p className="font-bold">[TEST ONLY] This package does not save responses.</p>
            <p className="mt-1">Try the forms below. Your answers stay in this browser and are never sent or saved to a case.</p>
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500" data-testid="text-test-package-expiration">
            <Clock3 size={14} />
            Link expires {formatExpiration(packageData.expiresAt)}
          </p>

          {packageData.forms.length === 0 ? (
            <p role="status" data-testid="status-test-package-empty" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600">
              There are no forms available in this test package.
            </p>
          ) : (
            <div className="space-y-3">
              {packageData.forms.map((form, index) => (
                <button
                  key={form.assignmentId}
                  type="button"
                  data-testid={`button-open-test-form-${form.assignmentId}`}
                  onClick={() => {
                    setLanguage("english");
                    setSelectedAssignmentId(form.assignmentId);
                  }}
                  className="flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-violet-300 hover:bg-violet-50/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900">{form.toolName}</span>
                    <span className="mt-1 block text-xs text-slate-500">{form.respondentLabel}</span>
                  </span>
                  <ArrowLeft className="rotate-180 text-slate-400" size={16} aria-hidden="true" />
                </button>
              ))}
            </div>
          )}

          <p className="border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
            ReMynd Assessment System · Test answers are not submitted or saved.
          </p>
        </div>
      </section>
    </main>
  );
}