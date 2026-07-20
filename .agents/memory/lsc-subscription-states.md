---
name: LSC subscription states
description: Learning Support Coach™ subscription status flow and enforcement rules
---

## Status values and transitions

- `trial_available` → user has not yet used their free trial
- `trial_active` → AI call is in-flight (set before call, restored on failure)
- `trial_used` → trial consumed; no more full analyses without subscription
- `active_monthly` / `active_annual` → paying subscriber; limited by `monthly_analysis_limit` from `lsc_settings`
- `complimentary` / `administrator_override` → unlimited, no credit deduction
- `expired` / `suspended` / `cancelled` / `past_due` → blocked

## What is always free (no credit deduction)

- Follow-up chat (`POST /lsc/analyses/:id/followup`)
- Role version regeneration (`POST /lsc/analyses/:id/version`) — also cached in `output_versions` JSONB

## Enforcement in the analyze route

TRIAL statuses: marked `trial_active` before AI call; on AI failure, rolled back to `trial_available`. On success, bumped to `trial_used`.
ACTIVE statuses: check `monthly_usage >= monthly_analysis_limit` (from `lsc_settings`); 402 if over limit.
Blocked statuses: immediate 402 with `{ error: "subscription_required", subscriptionStatus }`.

## UI state machine

1. Safety acknowledgment → shown once per token (sessionStorage key `lsc_ack_${portalToken}`) before any analysis
2. Trial available + acknowledged + no analysis → input form with amber trial badge
3. Blocked + no prior analysis → subscribe screen with pricing cards
4. Blocked + prior analysis → results view + subscribe CTA at bottom (view is always available)
5. Active + acknowledged → full workspace (usage bar + input or results)

**Why:** Trial users keep access to their analysis results and follow-up chat even after `trial_used`; the subscribe CTA is additive, not a paywall over existing data.
