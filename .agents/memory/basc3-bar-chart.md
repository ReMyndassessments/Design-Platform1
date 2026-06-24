---
name: BASC-3 scoring page crashes
description: Root causes of crashes on the scoring/response pages for BASC-3 and tools without scoringConfig.domains
---

## Rule 1 — scoringConfig.domains guard
Any code that calls `Object.keys(scoringConfig.domains)` must guard with
`scoringConfig?.domains ?` NOT just `scoringConfig ?`. BASC-3 and similar
tools have `scoringConfig: { max: 3 }` with NO `domains` key, so
`scoringConfig` is truthy but `scoringConfig.domains` is undefined.

**Why:** `Object.keys(undefined)` throws "Cannot convert undefined or null to
object". The truthy check on scoringConfig alone is insufficient.

**How to apply:** Everywhere `scoringConfig.domains` is accessed, use
optional chaining: `scoringConfig?.domains`.

## Rule 2 — Bar chart overcrowding
The merged BASC-3 battery (TRS-A + PRS-A + SRP-A) produces 27+ unique
clinical subscales. Bar chart must use a filtered `barData` — NOT the full
`radarData`. Filter to domains where at least one informant > 0, sort by
average desc, cap at top 15.

**Why:** 27 domains × 4 bars = 108 bars in a ~500px chart → each bar ~4px
wide and invisible. The radar handles many spokes fine; the bar chart does not.

**How to apply:** Never use `minPointSize` on Bar (phantom zero bars). Use
`barData` for the BarChart, `radarData` for RadarChart.

## Rule 3 — normalizedScores null guard
All Object.entries/keys/values on normalizedScores or domainScores must use
`?? {}` since older score records may have null values at runtime despite
DB schema saying notNull.

**Production scores confirmed correct** (BASC3-TRS-A teacher2:
aggression=67, learning_problems=77, etc.) — only rendering was the issue.
