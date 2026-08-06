/**
 * Airwallex payment integration.
 * Uses window.AirwallexComponentsSDK (not window.Airwallex) on the frontend.
 * Backend: token caching, intent creation, intent retrieval.
 */

const CLIENT_ID = process.env.AIRWALLEX_CLIENT_ID;
const API_KEY   = process.env.AIRWALLEX_API_KEY;
const FORCE_ENV = process.env.AIRWALLEX_ENV ?? "prod"; // "prod" | "demo"

const PROD_URL = "https://api.airwallex.com/api/v1";
const DEMO_URL = "https://api-demo.airwallex.com/api/v1";

// ── Token cache ───────────────────────────────────────────────────────────────
let _token: string | null = null;
let _tokenExpiresAt = 0;
let _baseUrl = FORCE_ENV === "demo" ? DEMO_URL : PROD_URL;

export function isConfigured(): boolean {
  return Boolean(CLIENT_ID && API_KEY);
}

export function getEnv(): "prod" | "demo" {
  return _baseUrl === PROD_URL ? "prod" : "demo";
}

export async function getAccessToken(): Promise<string | null> {
  if (_token && Date.now() / 1000 < _tokenExpiresAt - 60) return _token;
  if (!CLIENT_ID || !API_KEY) {
    console.error("[Airwallex] credentials not configured");
    return null;
  }

  // Try configured env first, fall back to the other
  const order = FORCE_ENV === "demo"
    ? [[DEMO_URL, "demo"], [PROD_URL, "prod"]]
    : [[PROD_URL, "prod"], [DEMO_URL, "demo"]];

  for (const [url, envName] of order) {
    try {
      const r = await fetch(`${url}/authentication/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": CLIENT_ID,
          "x-api-key": API_KEY,
        },
      });
      if (r.status === 201) {
        const data = await r.json() as { token: string };
        _token = data.token;
        _tokenExpiresAt = Date.now() / 1000 + 1800; // 30 min
        _baseUrl = url as string;
        console.info(`[Airwallex] authenticated via ${envName}`);
        return _token;
      }
    } catch (err) {
      console.error(`[Airwallex] auth attempt failed (${envName}):`, err);
    }
  }

  console.error("[Airwallex] auth failed on all environments");
  return null;
}

// ── Create payment intent ─────────────────────────────────────────────────────
export async function createPaymentIntent(opts: {
  amount: number;
  currency: string;
  plan: string;
  caseId: string;
  portalToken: string;
  returnUrl: string;
}): Promise<{ id: string; clientSecret: string; status: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const requestId = crypto.randomUUID();
  const merchantOrderId = `remynd-lsc-${opts.caseId.slice(0, 8)}-${opts.plan}-${requestId.slice(0, 8)}`;

  const body = {
    request_id: requestId,
    amount: opts.amount,
    currency: opts.currency.toUpperCase(),
    merchant_order_id: merchantOrderId,
    return_url: opts.returnUrl,
    metadata: {
      case_id: opts.caseId,
      portal_token: opts.portalToken,
      plan: opts.plan,
    },
  };

  try {
    const r = await fetch(`${_baseUrl}/pa/payment_intents/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-client-id": CLIENT_ID!,
      },
      body: JSON.stringify(body),
    });
    if (r.status === 200 || r.status === 201) {
      const data = await r.json() as { id: string; client_secret: string; status: string };
      return { id: data.id, clientSecret: data.client_secret, status: data.status };
    }
    console.error(`[Airwallex] create intent failed: ${r.status} ${await r.text()}`);
    return null;
  } catch (err) {
    console.error("[Airwallex] create intent error:", err);
    return null;
  }
}

// ── Get payment intent ────────────────────────────────────────────────────────
export async function getPaymentIntent(intentId: string): Promise<Record<string, unknown> | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const r = await fetch(`${_baseUrl}/pa/payment_intents/${intentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-client-id": CLIENT_ID!,
      },
    });
    return r.status === 200 ? (await r.json() as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
