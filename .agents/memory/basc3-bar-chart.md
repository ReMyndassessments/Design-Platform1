---
name: BASC-3 bar chart overcrowding
description: Why the Domain Scores bar chart appears empty for merged BASC-3/BRIEF-2 batteries
---

## Rule
The bar chart for merged batteries (BASC-3 = TRS-A + PRS-A + SRP-A) must use a filtered `barData` array — NOT the full `radarData`.

**Why:** TRS-A has 15 subscales, PRS-A adds 1, SRP-A adds 11 = ~27 unique domains. At 27 groups × 4 bars = 108 bars in a ~500px chart, each bar is ~4px wide and invisible even when values are correct (e.g., teacher2 aggression=67). The radar handles many spokes fine; the bar chart does not.

**How to apply:**
- `barData` = `radarData` filtered to domains where at least one respondent > 0, sorted by average desc, sliced to top 15.
- Never use `minPointSize` on the Bar — it renders 3px phantom bars for zero-value domains, creating visual noise.
- Y-axis: `domain={[0, (dataMax) => Math.min(100, Math.max(30, Math.ceil(dataMax * 1.15)))]}` auto-scales correctly.
- Production scores confirmed correct (BASC3-TRS-A teacher2: aggression=67, learning_problems=77, etc.) — the rendering was the only issue.
