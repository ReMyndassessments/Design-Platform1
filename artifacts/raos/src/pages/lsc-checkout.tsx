/**
 * Airwallex drop-in checkout page for LSC subscriptions.
 * Accessed in a new tab opened by the parent portal.
 * No auth required — identified by portal_token in URL params.
 *
 * Key gotchas (from reference):
 * - SDK global is window.AirwallexComponentsSDK, NOT window.Airwallex
 * - createElement() is async — must be awaited
 * - return_url is only used for 3DS redirect flows
 */

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    AirwallexComponentsSDK?: {
      init: (opts: { env: string; origin: string }) => Promise<void>;
      createElement: (type: string, opts: Record<string, unknown>) => Promise<{
        mount: (el: HTMLElement) => void;
      }>;
    };
  }
}

type Stage = "loading" | "payment" | "success" | "error";

const PLAN_LABELS: Record<string, { en: string; zh: string; ko: string }> = {
  monthly: { en: "Monthly subscription", zh: "月度订阅", ko: "월간 구독" },
  annual:  { en: "Annual subscription",  zh: "年度订阅", ko: "연간 구독" },
};

export default function LscCheckoutPage() {
  const [stage, setStage] = useState<Stage>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intentId     = params.get("intent_id")     ?? "";
    const clientSecret = params.get("client_secret") ?? "";
    const env          = params.get("env")            ?? "prod";
    const portalToken  = params.get("portal_token")  ?? "";
    const plan         = params.get("plan")           ?? "monthly";

    if (!intentId || !clientSecret) {
      setErrorMsg("Missing payment details. Please return to the portal and try again.");
      setStage("error");
      return;
    }

    let cancelled = false;

    async function waitForSDK(timeoutMs = 15000): Promise<NonNullable<Window["AirwallexComponentsSDK"]>> {
      const end = Date.now() + timeoutMs;
      while (!window.AirwallexComponentsSDK && Date.now() < end) {
        await new Promise(r => setTimeout(r, 150));
      }
      if (!window.AirwallexComponentsSDK) throw new Error("Airwallex SDK timed out");
      return window.AirwallexComponentsSDK;
    }

    async function run() {
      try {
        // Inject SDK script if not already present
        if (!document.querySelector('script[data-airwallex-sdk]')) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://static.airwallex.com/components/sdk/v1/index.js";
            s.dataset.airwallexSdk = "1";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Failed to load Airwallex SDK"));
            document.head.appendChild(s);
          });
        }

        const AW = await waitForSDK();
        if (cancelled) return;

        await AW.init({
          env: env === "prod" ? "prod" : "demo",
          origin: window.location.origin,
        });
        if (cancelled) return;

        // createElement MUST be awaited
        const element = await AW.createElement("dropIn", {
          intent_id:     intentId,
          client_secret: clientSecret,
        });
        if (cancelled || !containerRef.current) return;

        element.mount(containerRef.current);
        setStage("payment");

        // Listen for success / error events
        containerRef.current.addEventListener("onSuccess", async () => {
          // Confirm on the backend
          try {
            const base = window.location.pathname.includes("/raos")
              ? "/raos"
              : "";
            const m = parseInt(new URLSearchParams(window.location.search).get("months") ?? "1", 10) || 1;
            await fetch(`${base}/api/external/portal/${portalToken}/lsc/confirm`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ intent_id: intentId, months: m }),
            });
          } catch { /* webhook covers this as backup */ }
          setStage("success");
        });

        containerRef.current.addEventListener("onError", (e: Event) => {
          const detail = (e as CustomEvent).detail;
          console.error("[LSC Checkout] payment error:", detail);
          setErrorMsg(detail?.message ?? "Payment failed. Please try again.");
          setStage("error");
        });

      } catch (err) {
        if (cancelled) return;
        console.error("[LSC Checkout] init error:", err);
        setErrorMsg(err instanceof Error ? err.message : "Failed to initialise payment. Please try again.");
        setStage("error");
      }
    }

    run();
    return () => { cancelled = true; };
  }, []);

  const params = new URLSearchParams(window.location.search);
  const months = parseInt(params.get("months") ?? "1", 10) || 1;
  const amount = params.get("amount") ?? "";
  const planLabel = `${months}-month subscription`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start pt-12 px-4">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="w-9 h-9 bg-white rounded-xl shadow-md flex items-center justify-center">
            <img src="/images/remynd-logo.png" alt="ReMynd" className="w-7 h-7 object-contain" />
          </div>
          <span className="font-bold text-xl text-slate-900 tracking-tight">ReMynd</span>
        </div>
        <p className="text-sm text-slate-500">Learning Support Coach™ — {planLabel}{amount ? ` · ¥${amount}` : ""}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg overflow-hidden">
        {stage === "loading" && (
          <div className="p-10 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Setting up secure checkout…</p>
          </div>
        )}

        {(stage === "loading" || stage === "payment") && (
          <div ref={containerRef} className={stage === "payment" ? "min-h-[400px]" : "hidden"} />
        )}

        {stage === "success" && (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 mb-1">Payment successful!</p>
              <p className="text-sm text-slate-500">
                Your Learning Support Coach subscription is now active. Return to your portal to start analysing lessons.
              </p>
            </div>
            <button
              onClick={() => window.close()}
              className="mt-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Close this tab
            </button>
          </div>
        )}

        {stage === "error" && (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 mb-1">Something went wrong</p>
              <p className="text-sm text-slate-500">{errorMsg}</p>
            </div>
            <button
              onClick={() => window.close()}
              className="mt-2 px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
            >
              Close and try again
            </button>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-400 text-center max-w-xs">
        Payments are processed securely by Airwallex. ReMynd does not store your card details.
      </p>
    </div>
  );
}
