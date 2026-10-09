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
Measured both ways: shared, the core grows 169 B and the funnel shrinks 138 B; as a copy inside the
waterfall, the waterfall would be 1274 B instead of 1084 B. Shared costs a funnel-only page 31 B and
saves a waterfall-only page 21 B and a page with both 159 B — and keeps one copy of the truncation rule.

| File | Measured | Frozen |
|---|---|---|
| `charts.js` | 2523 B | **2688 B** (was 2432) |
| `charts-funnel.js` | 1870 B | 2176 B (unchanged) |
| `charts-waterfall.js` | 1084 B | **1152 B** |

A page that draws the funnel pays 4393 B gzipped; the waterfall alone 3607 B; both 5477 B.

## Addendum (M6, the daily series, 2026-10-09)

The series takes the theme's reference surface from the core (`_.SURFACE`, for the end dot's ring and the
tick halo, ADR 015): the core grows 11 B, inside its budget, which stays. The series is the first module
with an axis, two forms of mark and x-label placement; measured as built, no trim attempted yet.

| File | Measured | Frozen |
|---|---|---|
| `charts.js` | 2534 B | 2688 B (unchanged) |
| `charts-series.js` | 2831 B | **2944 B** |

A page that draws the series alone pays 5365 B gzipped; the funnel and the series 7235 B.

## Addendum (M6, the sparkline and the tile, 2026-10-09)

The module carries its own copy of ADR 015's line code (runs, lone dots, the end dot); the core is
untouched. Sharing it was not measured yet — the next module that draws a line decides.

| File | Measured | Frozen |
|---|---|---|
| `charts-spark.js` | 1630 B | **1792 B** |

A page of KPI tiles pays 4164 B gzipped; tiles with the series 6995 B.

## Addendum (M7, the ranking, 2026-10-09)

The ranking is rows of the core's `bar` and `labelLine`; it adds nothing to the core.

| File | Measured | Frozen |
|---|---|---|
| `charts-rank.js` | 915 B | **1024 B** |

A page with a ranking alone pays 3449 B gzipped.
