---
type: decision
status: accepted
date: 2026-10-08
tags: [size, budget]
project: affiliate-charts
---

# 012 — size budgets, frozen per file for 0.1.0

## Context

ADR 008 gives every file its own budget; the spec named provisional ones (core 4096 B, funnel
2048 B). The family freezes a budget once a milestone's features are in, at the measured size + 2.5%,
rounded up to the next 128 (slots-lite 007, roulette-lite 009), and measures with terser in process and
Node `gzipSync` level 9 (`npm run size`).

## Decision

Measured at the end of M3 (2026-10-08), with the funnel's three forms, base and earned, losses,
negative values, gaps, the OKLCH palette and `init`:

| File | Measured | Frozen |
|---|---|---|
| `charts.js` | 2344 B | **2432 B** |
| `charts-funnel.js` | 2003 B | **2176 B** |

A page that draws a funnel pays 4347 B gzipped for both files. The funnel was 1858 B before the M3
review; its fixes (surrogate-safe truncation, light base bars in money charts, the ghost reset at a
gap, array and range checks) cost 145 B and are in the measurement.

## Consequences

- From here a budget is room for fixes, not features.
- The core is expected to grow when a second module moves a shared helper into it (ADR 008: by
  measurement, not anticipation). That growth is re-frozen in an addendum here, with the module that
  caused it named, and the new module gets its own row.

## Addendum (M6, the waterfall, 2026-10-09)

The waterfall moved the row's label line (the cut at 42 characters, the split at 343 px) from the funnel
into the core as `labelLine`, and the core's palette took a hue turn for the waterfall's decrease.
Measured: the shared helper costs a funnel-only page 31 B (core +169 B, funnel −138 B). A copy in the
waterfall would have added about as much as the funnel saved to every page that draws a waterfall, and
two copies of the truncation rule to keep in step.

| File | Measured | Frozen |
|---|---|---|
| `charts.js` | 2523 B | **2688 B** (was 2432) |
| `charts-funnel.js` | 1870 B | 2176 B (unchanged) |
| `charts-waterfall.js` | 1084 B | **1152 B** |

A page that draws the funnel pays 4393 B gzipped; the waterfall alone 3607 B; both 5477 B.
