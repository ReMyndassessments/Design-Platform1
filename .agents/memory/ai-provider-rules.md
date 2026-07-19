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

## Vision calls — current state
Ideal: DeepSeek (`DEEPSEEK_API_KEY`, model: `deepseek-vl2`, endpoint: `https://api.deepseek.com/v1/chat/completions`). But `DEEPSEEK_API_KEY` is not configured.
Actual: Groq vision model `meta-llama/llama-4-scout-17b-16e-instruct` (the old `llama-3.2-11b-vision-preview` was deprecated and returns 400).

## OpenRouter → forbidden without asking
Never provision or use Replit OpenRouter AI integration without checking with the user first — it bills Replit credits directly.

**Why:** User explicitly rejected this approach when it was set up without permission.
