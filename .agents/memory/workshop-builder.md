---
name: Workshop Builder implementation
description: New workshop CRUD system — tables, API routes, admin UI, public page, Airwallex payment integration
---

## What was built

3 new DB tables: `workshops`, `workshop_registrations`, `workshop_payment_intents` (created by `createWorkshopTables` in index.ts, chained after `createTrainingTables`).

### API routes (training.ts)
- `GET/POST /api/training/workshops/public/:slug` — public workshop data (no auth), public registration
- `GET /api/training/workshops/public/:slug/image` — image proxy (works for non-draft workshops)
- `POST /api/training/workshops/public/:slug/payment/create` — Airwallex intent creation
- `GET/POST/PUT/DELETE /api/training/workshops` and `/:id` — admin CRUD
- Publish/unpublish/duplicate/export CSV — all admin-only

### Webhook (external.ts)
Updated `payment_intent.succeeded` handler to check `workshop_payment_intents` FIRST, then fall through to LSC intents. Workshop payment success updates `workshop_registrations` status → 'registered' and sends confirmation email.

### Frontend
- `artifacts/raos/src/pages/training-workshop.tsx` — public page at `/training/:slug` (no auth); Airwallex dropIn embedded inline (same SDK pattern as lsc-checkout.tsx); free → instant success; paid → embedded payment form
- `artifacts/raos/src/pages/admin/training-registrations.tsx` — added "Workshops" tab (default) + "Series Registrations" tab; WorkshopsSection / WorkshopCard / WorkshopBuilder (modal) / WorkshopDetail components all in same file
- `artifacts/raos/src/App.tsx` — added `/training/:slug` route BEFORE `/training` (order matters in wouter)

## Key decisions

**Why** — Route order: `/training/:slug` must precede `/training` in App.tsx or wouter matches the static route first.

**Why** — Image serving: Draft workshops don't expose images publicly (API returns 404). Admin UI skips image preview for drafts to avoid 403s.

**Why** — QR codes: Uses `https://api.qrserver.com/v1/create-qr-code/?data=...` (no package install needed).

**Why** — Webhook fall-through: Workshop payment intents are checked first; if not found, code falls through to LSC intents. This avoids breaking existing LSC payment flow.

**Why** — Session dates: Stored as JSONB array of `{date, start_time, end_time}`. Backend filters out empty date entries before storing.

## Follow-up known gaps
- Image proxy only works for non-draft workshops (status != 'draft'). Admin can't preview images for draft workshops without separately uploading.
- Airwallex payment on public page hasn't been tested end-to-end (requires Airwallex credentials).
- Admin image thumbnails for draft workshops show a placeholder calendar icon (expected).
