---
type: decision
status: accepted
date: 2026-10-09
tags: [review, ids, validation, series, release]
project: affiliate-charts
---

# 020 — the pre-release review: what it found and what changed

## Context

Before the catalog's first release (M9) an independent reviewer (Codex) read the spec, the ADRs and
every module. It reported no critical finding and eleven others. Each was checked against the code
before it was fixed; none was declined.

## Decision

| # | Finding | Change |
|---|---|---|
| 1 | `series` with `Number.MIN_VALUE` drew `NaN` (the tick step underflowed), with `Number.MAX_VALUE` non-finite ticks | throws `values too small or too large to draw` when the ticks are empty, not finite or not increasing |
| 2 | `sankey` with a `Number.MIN_VALUE` flow had an infinite scale; two columns of `1e308` a zero one | throws `flows too small or too large to draw` unless the scale is finite and above zero |
| 3 | the core's `n(v, 6)` printed `Infinity` for `1e308` (`v × 10⁶` overflows) | `n` prints such a value as it is; the "no exponent below 1e21" claim (ADR 003) stands |
| 4 | the 32-bit id hash had real collisions: two different titles, one id | two FNV-1a passes from two offsets, each 7 fixed base-36 digits: 64 bits |
| 5 | `rank`, `meter` and `series` keyed their ids on the drawing only: a row of 1 and a row of 2 with one display draw alike | their keys take the raw values, as `spark` and `share` already did |
| 6 | a one-point `series` in columns drew one column across 70% of the chart, against "bars at most 24 px thick" | columns are 24 px, two of a point 2 px apart, in a viewport of 70% of the band that clips them |
| 7 | `part: "false"`, `gap: "false"` and `stacked: "false"` were truthy; an unknown `group` was ignored | flags must be booleans, the only group is `'losses'`; both throw |
| 8 | `brand: ['#2563eb']` passed the regex through `toString` | `brand` must be a string |
| 9 | a zero part (`share`) or a node without flow (`sankey`) had no `<title>`; a cut key label lost its whole | every key line is a `<g>` with a `<title>` |
| 10 | `short: '😀😀'` counted four (UTF-16 units) | `short` is counted in characters |
| 11 | the spec named the default `format` as `n(v)`; the code uses `n(v, 6)` (ADR 015) | the spec says `n(v, 6)` |

Found by the review and kept for later: the heatmap's rows pass an empty value to the core's label
line, which emits an empty `<text class="-value">`; the x-label rule is repeated in `series` and
`heatmap`. Both are bytes, not behaviour.

## Consequences

- Ids change for every chart, the funnel's included: the output of the next release differs from
  0.1.1's byte for byte. Consumers pin the exact version (ADR 003), so this is a minor-version change.
- `series` grows past its frozen budget by 1 B with these fixes; the budget is re-frozen (ADR 012).
- Each fix has a Node test and a mutation seen red; the column clipping also a browser check that probes
  a pixel past the viewport's edge (two mutations survived the first two drafts of that check).
