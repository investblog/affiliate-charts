---
type: decision
status: accepted
date: 2026-10-09
tags: [heatmap, cohort, colour, dataviz]
project: affiliate-charts
---

# 018 — the heatmap and the cohort: a five-step ramp of the brand, rows as labelled lines

## Context

Two charts share one grid: clicks by hour × weekday (24 columns), and cohorts — first-deposit month ×
months since (a triangle: a later cohort has fewer months behind it). A value is a magnitude, so the
colour is sequential, one hue. The grid must read at 343 px, where 24 columns are 14 px each, and its
labels cannot be measured (ADR 009).

## Decision

**Shape.** `rows` and `cols` are caller strings; `values[r][c]` and `display[r][c]` the cells. In the
`cohort` form a row may be shorter than `cols`: the cells past it are **absent** — not drawn, not zero
(a cohort's future). In the `grid` form every row is full. `null` is **no data**: the cell has no fill
and an em dash, never the lightest colour.

**Scale: five steps of the brand's hue**, quantised over `[0, max]`: a value's step is
`min(4, ⌊v / max × 5⌋)`, zero the near-zero step. Negative values throw: a sequential ramp has no
honest place for them, and no diverging form is offered.

| Step | light (OKLCH L) | dark |
|---|---|---|
| 0 (near zero) | 0.71 | 0.52 |
| 1 | 0.63 | 0.60 |
| 2 | 0.55 | 0.68 |
| 3 | 0.47 | 0.76 |
| 4 (max) | 0.39 | 0.84 |

Hue and chroma are the brand's (chroma reduced into sRGB, ADR 011). On light surfaces more is darker,
on dark surfaces more is brighter.

**Layout.** One row per row: the row's label on ADR 010's label line, then 20 px of cells, then 6 px.
Cells sit in percent bands; between two cells a 2 px line of the theme's surface (ADR 017's gap). Under
the grid the column labels follow ADR 015's x-label rule; then the scale: five 20 × 10 px swatches with
`format(0)` under the first and `format(max)` end-anchored under the last.

**Text in cohort cells.** The cell's `display` at 11 px, centred, when its characters (6.5 px each at
11 px) and 4 px fit one band at 343 px — the same at every width. Ink `#11171c` on steps whose lightness
is at least 0.6, white below. Grid cells carry no text. Every cell, the empty ones included, has a
`<title>`: `row · col: display`.

## Measurements (2026-10-09)

The ramp through the dataviz ordinal validator (ΔL ≥ 0.06 between steps, the near-zero step ≥ 2:1 on
the surface), ten brands × ADR 011's six surfaces: all 60 pass; the near-zero step's worst contrast
2.19:1 light, 2.44:1 dark. The first try (light 0.74 → 0.38, dark 0.42 → 0.78) failed 1 and 17 of 30:
its near-zero step fell under 2:1, down to 1.59:1 on the dark card.

Text on the steps, worst of ten brands: light — ink 6.44, 4.61 on steps 0–1, white 4.53, 6.43, 9.17 on
steps 2–4; dark — white 5.14 on step 0, ink 4.07, 5.67, 7.88, 10.63 on steps 1–4. Dark step 1 is the
mid-tone neither ink nor white clears 4.5:1 on (white 3.68); accepted, the value is also in the cell's
`<title>` and the caller's table.

## Consequences

- The x-label rule now lives in two modules; ADR 012 decides by measurement whether the core takes it.
- A cohort of more than about 20 months shows no text at 343 px; its cells keep their titles.
