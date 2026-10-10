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
- **`'tint'` as the second slot.** ADR 015 measured the light mark only as a *third* slot, beside both
  the solid and the opposite. Measured here as a pair, the solid and the light mark
  (`palette(brand, theme)`), through the dataviz validator, ADR 011's ten brands and the issue's
  `#4d48ed`, on its six surfaces (66 cases):
  - solid + light: normal-vision ΔE ≥ 15 in 63 of 66. The three failures are `#e11d48` on the light
    surfaces, ΔE 14.7. Worst CVD ΔE 12.5, all pass. `#4d48ed` on light: normal 20.7, CVD 16.7. The light
    mark is 2–2.7:1 against its surface, under the 3:1 for a lone mark (a WARN, relief required): ADR 011
    built it for 2:1, as the ordinal light end.
  - solid + opposite, for reference: 66 of 66 pass. Worst normal 21.3, worst CVD 11.2.
- **A hex cannot spell the tint.** `second` is fitted like `brand`, so a light hex is darkened until it
  clears 4.5:1 on the surface and lands near the solid. The light mark is reachable only by name.

## Decision

**`second?: '#rrggbb' | 'tint'`** colours the second series' lines, columns and key swatch. Absent: the
brand's opposite hue, as before.

- A hex is fitted to the theme exactly as `brand` is (its lightness held in the band, then moved to
  clear 4.5:1 on the surface; hue and chroma the caller's). The library does not check the pair: two
  colours the caller chose are the caller's to keep apart.
- `'tint'` is the brand's light mark (`palette(brand, theme).light`), for nested pairs (views ⊃
  visitors, GGR ⊃ commission), where a lighter step of one hue says "part of the same thing". Its limits
  are measured, not hidden: on red brands on light surfaces it sits just under the normal-vision floor,
  and its contrast with the surface is the ordinal light end's 2:1, not a lone mark's 3:1. The key, with
  each series' value, and the hover title carry the series' identity, which is what the validator's
  WARN asks for. The opposite hue stays the default because it passes everywhere.
- `second` with a single series throws, as `stacked` without columns does.

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
