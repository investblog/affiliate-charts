---
type: decision
status: accepted
date: 2026-10-10
tags: [series, colour, layout, axis, consumer]
project: affiliate-charts
---

# 021 — the series: the caller's second colour, and a gutter in percent

## Context

A second consumer (a web-analytics dashboard: views and visitors a day, 7 and 30 days, light and dark)
filed two issues against `series`:

1. **The second series' colour.** The opposite hue of a violet brand (`#4D48ED`) is olive (`#7c6700` on
   light). It passes the dataviz checks (ADR 015) but reads as off-palette, and many pairs are nested
   (views ⊃ visitors), where the caller would rather have a tint of the brand. The issue proposed
   `second: 'opposite' | 'tint'` or `second: '#rrggbb'`.
2. **Tick text over the first columns.** Tick text sits at `x=0` above its gridline, over the marks, with
   a halo of the theme's surface (ADR 015). At 30 points of two grouped series and ~1100 px the first
   columns start under the text, and the halo cuts a notch out of them. The issue proposed a left gutter
   measured from the longest tick text, or a caller-set halo colour.

## Measurements (2026-10-10)

- **A pixel gutter.** The plot would have to start G px from the left and end at the right edge: a width
  of `100% − G px`. Without a stylesheet the only spelling is the presentation attribute
  `width="calc(100% - 40px)"` on a nested `<svg x="40">`, its contents a rect, a column viewport, a
  stretched box and end-anchored text, in a 400 px container:
  - Chromium honours it: the wrapper spans 40–401 px, its content ends at 400.
  - Firefox and WebKit drop it and use `100%`: the content spans 40–440 px, 40 px past the chart's edge.

  Every other spelling — nested viewports, `viewBox`, `preserveAspectRatio`, transforms — places a point
  at `a·W + b` with one scale factor for a whole polyline; a gutter needs the factor `W − G`, which no
  constant attribute expresses. Inline `style` would, and is forbidden (`style-src 'self'`).
- **`'tint'`.** ADR 015 measured the brand's light mark as a series colour beside the solid: normal-vision
  ΔE under 15 for the red, cyan, blue and **violet** brands on some surface (worst 13.3). The issue's
  own brand is in that list.

## Decision

**`second?: '#rrggbb'`** — the second series' colour, fitted to the theme exactly as `brand` is (its
lightness held in the band, then moved to clear 4.5:1 on the surface; hue and chroma the caller's). It
paints the second series' lines, columns and key swatch. Absent: the brand's opposite hue, as before.
The library does not check the pair: two colours the caller chose are the caller's to keep apart — the
reason ADR 015 offers no derived third colour is the same reason it offers no named tint here. A
`'tint'` preset is not offered: on the issue's own brand it measured below the distinctness floor.
`second` with a single series throws, as `stacked` without columns does.

**`gutter?: number`** — percent of the chart's width kept clear at the left of the plot, `0` to `50`,
default `0`. Bands, points, columns, hover bands and x labels lie in the rest; gridlines and tick text
keep the full width, the tick text at `x=0` with its halo. A percent, not pixels: the measurement above
rules pixels out, and the caller knows the width of its card (the issue's ~1100 px and a 5-character
tick: `gutter: 4`). A gutter sized by the library from the 343 px width (about 13 % for `3,000`) was
rejected: it would leave about 140 px empty at 1100 px and change every existing chart's bytes.

The halo stays: at a width narrower than the caller planned for, text still lands on a column. Its
colour is the theme's reference surface; a page on another surface sets it through the `-tick` class
(`.chart-tick { stroke: #f7f7f8 }`, or `stroke: none` with a gutter) — the override ADR 015 already
names, now written in the README. A `halo` option is not added: the class does it without bytes.

## Consequences

- Without `second` and `gutter` every series chart keeps its bytes (checked over 70 charts: one and two
  series, every form, both themes, 1 to 133 points).
- With a gutter, x labels that do not fit their band anchor at the plot's left edge (`x = gutter %`),
  and the k-th label spacing is computed over the plot's share of 343 px.
- Size: the two options are measured in `npm run size`; the series budget is re-checked, not assumed.
