---
type: decision
status: accepted
date: 2026-11-18
tags: [heatmap, layout, colour, consumer]
project: affiliate-charts
---

# 022 — the heatmap as a status matrix: a side column, a fixed domain, a header, classes per step

## Context

Issue #3 brings a second use for the heatmap (ADR 018): a **status matrix** — entities × attributes,
each cell a value on a known scale (days left before a fact must be re-checked, out of a 60-day window),
drawn as a compact illustration beside a page header at about 450 px. Four of ADR 018's defaults get in
its way:

1. **Height.** A row costs 46 px — a 20 px label line above 20 px of cells, then 6 px. Most of a
   six-row chart's height is row labels.
2. **The ramp is relative.** A step is `⌊v / max × 5⌋` over the data's own max: when every value has
   aged by the same amount the grid still shows the top step.
3. **Column labels.** ADR 015's x-label rule draws the first and last always and the middle ones only
   when they fit at 343 px: ten term names get two labels.
4. **Theming.** Fills are hex per theme with no step class, so a page that switches light and dark at
   run time renders the chart twice.

The issue also proposed a fallback to the label line "on narrow screens", a key line under the scale
(`short — full`) and an inline legend. None of the three is adopted: the markup cannot know the width
it lands in (ADR 009), a key of ten names is ten lines and gives back the height the side column saves,
and an inline legend needs a text width the library cannot measure.

## Decision

Every option is opt-in. Without them the heatmap keeps ADR 018's anatomy; only the class tokens below
are new in its bytes.

**`gutter?: number`** — the row labels move into a left column of that percent of the width, `10` to
`50`, on the same line as their cells. A row is 20 px of cells and 6 px: 26 px instead of 46. The name
and the unit are the series' (ADR 021): a pixel column cannot be spelled (`calc()` in an attribute
works in Chromium only), so the cells lie in the remaining percent. The label is end-anchored 6 px
before the cells (`x="g%" dx="-6"`), so a label wider than its estimate leaves the chart on the left —
clipped — and never covers a cell. It is cut with an ellipsis, surrogate-safe (ADR 010), at what the
column holds at 343 px by ADR 010's estimate (8 px a glyph, 6 px of gap), and a cut label carries its
full text as a `<title>`. The floor of 10 keeps the cut above zero characters (34 px: three). The caller
picks the gutter for the card it knows; the library does not switch layouts by width.

Everything that read the full width now reads the band: one band is `343 × (1 − g/100) / N` px for the
fit estimates (cohort text, column labels), and cells, gaps and column labels sit at `g % + c × w %`.

**`domain?: [lo, hi]`** — the ramp is quantised over a fixed domain instead of `[0, max]`: a value's
step is `min(4, ⌊(v − lo) / (hi − lo) × 5⌋)`. Both finite, `lo < hi`, and `hi − lo` finite; a value
outside throws (ADR 003: input is data — a value past the scale the caller declared is a bug upstream,
never clamped). Inside a domain a negative value is allowed: the domain's `lo` is the ramp's near end.
Without a domain negatives still throw (ADR 018). The scale prints `format(lo)` and `format(hi)`.
The five steps and their lightness are ADR 018's, so ADR 011's checks on the ramp hold unchanged; only
the input to the quantiser moves. A caller who wants the urgent end dark passes `hi − v` as the value
and keeps its own text in `display`: no `reverse` option.

**`cells.short?: string[]`** — one to three characters per column (sankey's `short`, ADR 019),
surrogate pairs counted once. With `short` the column labels are a **header above the grid**: the
shorts at 11 px, placed by ADR 015's x-label rule with 8 px a glyph and 4 px of spacing — every column
when the longest fits its band, every k-th otherwise. The full `cols` string stays in every cell's
`<title>`. Shorts are mostly capitals, so the glyph is ADR 010's 8 px, not the 6.5 px of a digit the
cohort text uses (measured below). Ten shorts of three characters all fit at 343 px up to an 18 %
gutter, from 19 % every second is drawn; ten of two characters fit up to 40 %. A caller with ten
columns chooses between three-letter shorts and row labels longer than six characters. At the caller's ~450 px every band is 30 % wider than the
estimate assumes. Without `short` the column labels stay below, as in ADR 018.

**`header?: boolean`** — `false` drops the column labels, the header or the bottom row, and their
height; for a caller that names the columns in its own caption.

**`legend?: boolean`** — `false` drops the scale and its height, for a caller that prints the scale in
its own caption. The heatmap then reads only with that caption: it is the caller's to supply.

**Class hooks per step** (ADR 005), so one render serves both themes when the page owns the colours:

| Mark | Classes |
|---|---|
| a cell | `-cell -cell-N` (N = step, 0 to 4) |
| a scale swatch | `-cell-N` |
| a 2 px gap between cells | `-gap` |
| a cohort cell's text | `-cell-text-N` |

A page that switches themes at run time writes ten fills, the gap stroke and the cohort text colours in
its own stylesheet (`.dark .chart-cell-2 { fill: … }`). ADR 018's and ADR 011's measurements cover the
library's own fills only; a page that overrides them owns the contrast.

**Heights**, top to bottom: the header, 20 px, when `short` is given and `header` is not `false`; per
row the label line (not with a gutter), 20 px of cells and 6 px; then, without `short` and with the
header on, the column labels with their baseline 12 px below that 6 px; then the scale, 28 px high,
starting 10 px below the labels' baseline, or 10 px below the last row's cells when there are no
bottom labels. Without the scale the chart ends 4 px below the labels' baseline, or at the last row's
cells.

## Measurements (2026-11-18)

Glyph widths in an SVG `<text>` under `system-ui`, Chromium, Firefox and WebKit (Windows), average and
widest of each set, in px:

| | Latin capitals | Cyrillic capitals | Latin lower | Cyrillic lower | Digits |
|---|---|---|---|---|---|
| 11 px | 6.74–7.45 (10.4) | 7.53–7.93 (11.2) | 5.38–5.43 | 6.28–6.31 | 5.93–6.12 |
| 13 px | 7.96–8.81 (12.3) | 8.89–9.37 (13.3) | 6.36–6.42 | 7.42–7.45 | 7.00–7.23 |

- **The header.** A first estimate of 6.5 px a short glyph (the cohort's digit) let ten columns of three
  capitals onto 24 px bands at a 30 % gutter. On screen `WAG` and `OWN` measured 26–29 px and neighbours
  touched in all three engines. At 8 px a glyph and an 18 % gutter, the browser gate's fixture (`LIC` …
  `OWN`) keeps every short centred on its column, with gaps of 1–3 px between the widest pairs
  (`GAM`/`WDR`). An average cannot promise more for a pair of the widest letters.
- **The side column.** Mixed-case Cyrillic and Latin names, cut at 8 px a glyph, end 5–6 px before the
  cells and start inside the chart at 375 px in all three engines. A label of all-caps Cyrillic runs
  about 17 % wider than the estimate (twelve `Ж`: 137 px against 96): its excess leaves the chart on the
  left and is clipped, and the cells stay clear. ADR 010's estimate is kept rather than a second one for
  capitals: one rule for every row label in the library.
- **Step classes.** Under the gate's `style-src 'self'`, a page rule `.chart-cell-4 { fill: … }`
  repaints a step-4 cell and leaves the other steps alone, in all three engines.

## Consequences

- Throws added: `gutter` not a number from 10 to 50; `domain` not two finite numbers with `lo < hi`
  and a finite span; a value outside the domain; `short` not an array of one string per column, or a
  short of no or more than three characters; `header` or `legend` not a boolean.
- Every heatmap's bytes and ids change once, for the class tokens (a minor version, ADR 003).
- Size is measured and the heatmap's budget re-frozen in ADR 012.
