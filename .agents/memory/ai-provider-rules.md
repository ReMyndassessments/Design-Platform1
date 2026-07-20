---
name: AI provider rules
description: Which AI providers to use for which features, and when to ask before adding a new call.
---

# AI Provider Rules

## Hard rule: Always ask before adding a new Groq call
Groq is not free forever. Never silently add a Groq API call. Before using Groq anywhere new, tell the user what you're about to do and get explicit approval.

**Why:** User was burned by surprise API usage and credit charges.

## Current approved Groq usage
Groq (`GROQ_API_KEY`) is approved **only** for:
- RAMRI interview routes — classify samples, generate interview questions, write report narrative
- RMRA (math reasoning tool) — text AI calls

No other features may use Groq without explicit user sign-off.

## Vision calls → Gemini (Replit integration)
All image/PDF vision calls use `gemini-2.5-flash` via the Replit-managed Gemini AI integration.
Import `ai` from `@workspace/integrations-gemini-ai` and call `ai.models.generateContent` with `inlineData`.
Env vars `AI_INTEGRATIONS_GEMINI_BASE_URL` and `AI_INTEGRATIONS_GEMINI_API_KEY` are auto-provisioned — do not ask user for them.
No per-call cost to user; billed through Replit credits (free tier available).

## OpenRouter → forbidden without asking
Never provision or use Replit OpenRouter AI integration without checking with the user first — it bills Replit credits directly.

**Why:** User explicitly rejected this approach when it was set up without permission.
