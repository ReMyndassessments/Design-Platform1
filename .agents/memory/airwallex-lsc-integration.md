---
name: Airwallex LSC payment integration
description: How Airwallex is integrated for LSC subscriptions — key design decisions, gotchas, and model.
---

# Airwallex LSC Payment Integration

## Payment model
- Parents choose 1–12 months upfront, one-time payment (NOT recurring)
- Price = months × monthly_price_rmb (from lsc_settings, default ¥388)
- Currency: CNY
- `lsc_payment_intents.plan` stores months as a string (e.g. "3" = 3 months)
- On success: `lsc_subscriptions.subscription_status = 'active_monthly'`, `expires_at = NOW() + N months`

## Secrets required
- `AIRWALLEX_CLIENT_ID`
- `AIRWALLEX_API_KEY`
- `AIRWALLEX_ENV` (optional, defaults to "prod"; auto-detects prod vs demo at auth time)

## Key files
- `artifacts/api-server/src/lib/airwallex.ts` — auth token cache, createPaymentIntent, getPaymentIntent
- `artifacts/api-server/src/routes/external.ts` — POST lsc/checkout, POST lsc/confirm, POST external/payments/webhook
- `artifacts/raos/src/pages/lsc-checkout.tsx` — drop-in SDK checkout page (public route, new tab)
- `artifacts/raos/src/pages/external/[token].tsx` — month picker UI + handleLscCheckout

## SDK gotchas (from reference)
- Global is `window.AirwallexComponentsSDK`, NOT `window.Airwallex`
- `createElement()` is async — must be awaited or mount() throws "not a function"
- Open blank tab synchronously BEFORE any await (popup blocker bypass): `const tab = window.open('', '_blank')` then set `tab.location.href` after fetch resolves
- Airwallex HPP (checkout.airwallex.com) spins forever in embedded contexts — use drop-in SDK

## Webhook
- URL: `https://remyndassessments.com/api/external/payments/webhook`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.cancelled`
- No signature secret — idempotent via lsc_payment_intents status field
- Must be registered in Airwallex dashboard

## Subscription expiry
- `lsc_subscriptions.expires_at` — added as nullable TIMESTAMPTZ
- lsc/status route returns 'expired' if `expires_at < NOW()` for paid statuses
- `administrator_override`, `complimentary` are NOT subject to expiry check

## Status bar display
- `trial_available` / `trial_active` → amber "Free trial" badge
- `trial_used` → grey "Trial complete · subscribe to continue" (NOT the usage counter)
- Active paid statuses → green "N / allowance analyses used"
