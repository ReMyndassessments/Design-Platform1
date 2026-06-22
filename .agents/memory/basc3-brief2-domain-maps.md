---
name: BASC-3 & BRIEF-2 domain maps
description: Root cause fix for degenerate single-spoke radar charts; where domain lookup tables live and how they work.
---

## The problem they solve
Every question in `basc3.ts` was tagged `domain:"behavior"` and every question in `brief2.ts` was tagged `domain:"executive-function"` via a hardcoded literal in the shared `q()` / `qtf()` helper. This caused the Profile Overview radar chart to render a single spoke instead of the full set of clinical subscales.

## Fix architecture
Both files now have a large `const DOMAIN_MAP: Record<string, string>` at the top, keyed by item ID (e.g. `"b3ta-4"`, `"b2p-1"`). The `q()` / `qtf()` helpers look up `DOMAIN_MAP[id] ?? <fallback>`.

- **`artifacts/api-server/src/lib/brief2.ts`** — `B2_DOMAIN`, covers all 181 items across 3 forms (b2p, b2t, b2sr). 9 subscale keys: `inhibit`, `self_monitor`, `shift`, `emotional_control`, `initiate`, `working_memory`, `plan_organize`, `task_monitor`, `organization_of_materials`.
- **`artifacts/api-server/src/lib/basc3.ts`** — `BASC3_DOMAIN`, covers all ~995 items across 6 forms (b3ta, b3pa, b3tc, b3pc, b3sa, b3sc). TRS/PRS use up to 16 subscale keys; SRP forms use 13 clinical subscale keys. Validity/F/L/V index items are tagged `"behavior"` so they don't pollute clinical spokes.

## Display labels
Both `scoring.tsx` (line ~92) and `remynd-dashboard.tsx` (line ~54) have `DOMAIN_LABELS` maps that now include all BASC-3 and BRIEF-2 subscale keys. The `formatDomainLabel` / `dLabel` fallback auto-title-cases any key not in the map, so new keys added to the domain maps will display acceptably without requiring a label entry.

**Why:** The scoring engine groups responses by `domain`, averages them, and plots the result on a radar. If all items share the same domain, only one spoke appears.

**How to apply:** Any new form added to either file must have its items assigned to per-subscale domain keys in the corresponding lookup table, not to the generic fallback. Adding new subscale keys to `DOMAIN_LABELS` is optional (auto-title-case covers it) but recommended for precise clinical wording.
