---
type: note
status: active
tags: [architecture, overview, spec]
project: affiliate-charts
---

# affiliate-charts — spec / dev source of truth

Docs for developers and agents. `index.html` is the playground, `test/verify.html` the browser
gate, `test/*.test.mjs` the Node gate. Contract-first: change the doc here **before** the code.

**Status (2026-10-09): `affiliate-charts@1.0.0` — the whole catalog — is released from a `v*` tag
through the Trusted Publisher, with provenance.** The first consumer integrated the funnel (0.1.x) on a
branch (M4) under its production CSP, both themes, 375 and 1280 px. Every chart — the funnel, the
waterfall (ADR 014), the daily series (ADR 015), the sparkline and the KPI tile (ADR 016), the ranking,
part to whole (ADR 017), the heatmap with its cohort form (ADR 018), the meter and the sankey (ADR 019)
— passes the Node tests, the typecheck, the Vite bundle gate and the browser gate (Chromium, Firefox,
WebKit under `default-src 'self'`, 375 and 1280 px) and the demo walk; every check has been seen red
under mutation. An independent review in three passes (M9, ADR 020) found no critical issue; its
seventeen findings are fixed. Budgets frozen (ADR 012). Scope:
**a chart library for affiliate programmes** — the forms a partner cabinet uses to show traffic,
conversions and money to a partner. Numbers marked *provisional* are forecasts, not measurements;
each names the milestone that replaces it. Keep this line true at every milestone.

## The pitch, in one paragraph

Charts for affiliate dashboards, drawn by code from data. One call returns an SVG string — in Node
at build time or in the browser — with no runtime dependency and **no inline styles**, so it renders
under a strict `style-src 'self'` Content Security Policy where most chart libraries break. The
library knows the affiliate shapes — funnels that are not additive, money that flows from GGR to the
partner's share, cohorts by first-deposit month — and draws them honestly. A small core plus one file
per chart: a page loads only what it draws. Labels arrive formatted by the caller; axis ticks go
through the caller's `format` callback, so the library carries no `Intl` and no translations.
Colours come from one `brand` hex or from the page's CSS classes. Every chart has an accessible name
and a per-mark `<title>`, and is meant to sit **above** a data table, not to replace it.

## Why not an existing library

- **CSP.** Partner cabinets that ship `style-src 'self'` block libraries that write `style=""` or an
  inline `<style>`; a `data:` image survives CSP but loses hover titles.
- **Weight.** General-purpose packages weigh tens to hundreds of KB (plotly: megabytes). A cabinet
  that shows a funnel and a daily series should pay for those two.
- **Honesty of the domain.** Generic libraries happily stack non-additive funnel steps, put counts
  and money on two y-axes, or fill a funnel shape whose area means nothing. The rules here are
  enforced by the API, not left to each integrator.
- **Runtime.** Cabinets served as static assets have no server-side renderer — ADR 002.

## Inherited from the family — ADR 001

| Decision | Parent |
|---|---|
| SVG string, not canvas; pure functions, no DOM; `init()` is a thin browser helper | roulette-lite 002 |
| No signature in the output: no comments, `data-*`, library or credit names; ids and classes are derived tokens | roulette-lite 005 (this library takes no `#000`/`#fff` exception) |
| ES5 IIFE with a UMD tail per file; no `type`/`exports` in `package.json`; hand-written `.d.ts`; minified files generated, never committed | roulette-lite 007, **extended to several files by ADR 008** |
| Node tests plus a browser verification page; a check is trusted only after it was seen red (`--mutate`) | roulette-lite 008, cards-lite M5 |
| Size: terser in process, Node `gzipSync` level 9; provisional budgets frozen at measured + margin | roulette-lite 009, slots-lite 007 |
| Output stability: within a minor version the same input gives byte-identical SVG; consumers pin the exact version | roulette-lite 010 |
| Palette derived from `brand` — **superseded by ADR 011**: OKLCH instead of CIE LCh | hexagons 002, roulette-lite 004 |
| Contract-first; `author: 301st`; OIDC trusted publishing; "gzip beats clever — trim only by measurement" | family |

## Deviations — each its own ADR

- **002** a hand-written library rather than a general package rendered elsewhere.
- **003** input is data, not a seed; no randomness.
- **004** text in the output, no `font-family`; values formatted by the caller; ticks through a
  `format` callback; everything escaped (`& < > " '`).
- **005** colour through presentation attributes and class hooks; never `style=""`/`<style>`.
- **006** accessibility: `role="img"` + `<title>`, a `<title>` per mark, else `aria-hidden`.
- **007** the funnel: units per call; base and earned on one scale; three forms.
- **008** core + modules: one core file, one file per chart, one `.d.ts` per file.
- **009** width from the page: marks in percent, text in pixels; no `width` option.
- **010** the funnel row: values on the label line, split and truncation by a conservative estimate.
- **011** the palette: OKLCH from `brand`; `currentColor` for text, losses and chrome.
- **014** the waterfall: rows, a ghost of the running total instead of connectors, three colour roles.

## Architecture (ADR 008)

```
charts.js / charts.d.ts                 core — global `Charts`
charts-funnel.js / charts-funnel.d.ts   one module per chart, each with its own types
charts-waterfall.js / charts-waterfall.d.ts
…
```

- A module takes the core from `require('./charts.js')` (CommonJS) or `root.Charts` (browser), throws
  `Error('affiliate-charts: load charts.js before charts-<form>.js')` without it, adds its function to the
  core object and **exports that core object** — `require('affiliate-charts/charts-funnel.js').funnel`.
- Registration is a side effect: `package.json` never declares `sideEffects: false`.
- Every chart is a pure function `(data, options) → string`. Size budgets are per file.

### Options every chart shares

```ts
interface Common {
  title?: string;          // accessible name; omit → aria-hidden (a data table must stay next to it)
  desc?: string;
  brand?: string;          // hex; default palette when the page sets no classes
  theme?: 'light' | 'dark';// picks the validated colour set for that surface; switching = re-render
                           // (or the page overrides colours through the class hooks)
  classPrefix?: string;    // class hooks are `<prefix>-<role>`; default 'chart'. Ids (for aria) are derived
                           // from the input, so two different charts on a page do not collide
  format?: (v: number) => string;  // text for numbers the library chooses (axis ticks); default n(v, 6): six decimals at most, no -0
}
```

**Width comes from the page (ADR 009).** The root `<svg>` has `width="100%"`, a fixed pixel `height` and
no `viewBox`. Marks are laid out in percentages of that width; text sits at pixel positions and keeps
its pixel size at any width. A page sizes a chart through its container; nothing re-renders on
resize. Every chart has a fixed height for given data.

Input rules shared by every chart:
- A non-finite number (`NaN`, `±Infinity`) throws `TypeError`; `null` is accepted only where a shape
  says so (it means "no data", never zero).
- A violated shape rule (documented per chart below) throws — the library never silently repairs data.
- Every caller string (`label`, `display`, `title`, `desc`, legend entries) must be a string; `options`, when
  given, an object; `classPrefix` a string matching `[A-Za-z_][A-Za-z0-9_-]*` — it lands in ids and
  `aria-labelledby`, where a space or a quote would break the accessible name or the markup;
  `brand` a `#rrggbb` hex string; `theme` `light` or `dark`; an unknown `form` throws. An option is
  absent when it is `undefined`; `options: null` or a shared option set to `null` throws (ADR 020).
- Every input error is a `TypeError` whose message starts with `affiliate-charts:`.

**What the library computes, and what it never does.** It derives **positions**: scale domains, nice
tick values, running offsets in a waterfall, segment widths in a part-to-whole bar. It never derives
**text**: no rates, totals, shares, deltas or signs are shown that the caller did not pass as a
string. Every value shown next to a mark arrives as a caller string (`display`); the caller also
folds a long tail into "Other".

**Signs.** Every scale includes zero and both signs present in its data: a negative value draws a
bar to the left of (or below) a zero line. GGR and commission can be negative in a period where
players win; they are drawn, never clamped.

## Catalog

Each module lists its data shape, its throws and the design verdict. Common to all (ADR 007 records
the reasons): one axis per chart; a legend when there are two or more series and none for one; bars
at most 24px thick with a 4px rounded data end and a square baseline end; 2px surface-colour gaps
instead of strokes; text in text colours, never the series colour; solid 1px recessive gridlines,
never dashed; values labelled selectively; status colours (good/warning/critical) reserved and never
used as series colours.

### Group A — funnel and money flow

**`Charts.funnel(steps, options)`** — `charts-funnel.js`

```ts
interface Bar { value: number; display: string }
interface FunnelStep {
  label: string;           // already translated
  value: number;           // the base bar: a count, or money (deposit sum, GGR)
  display: string;         // formatted value at the bar end ("1 840", "-450.00")
  earned?: Bar;            // money funnels: the partner's commission from this step
  part?: boolean;          // a subset of the nearest preceding main step (unique clicks; 2nd, 3rd,
                           // later deposits are all parts of "deposits"): indented, thinner
  group?: 'losses';        // the losses block (cancellations, rejected); must come after all main steps
  gap?: boolean;           // start a new block after a visual gap (same scale): a base of another kind,
                           // e.g. revenue (GGR) after the deposit steps. Not on a `part` step
  rate?: string | null;    // a caller string shown as a chip before this row; the library implies no
                           // denominator. undefined → no chip; null → em dash (nothing to count from)
}
interface FunnelOptions extends Common {
  form?: 'bars' | 'steps' | 'shape';
  legend?: [string, string];   // [base, earned]; required when any step has `earned`
}
```

- **One scale for the whole chart**, main steps and losses alike, so 40 cancellations next to 100
  deposits look like 40 next to 100. Losses sit after a gap marked by a hairline (no heading); a negative
  value (a cancellation) grows left of the zero line, a positive one (a rejected record — what would
  have been earned) grows right. The sign is never recomputed; `display` carries it.
- **Base and earned** are a pair inside one step's row: the base bar (light) with the earned bar
  (solid) directly below it, both from the zero line, never nested — a CPA payout can exceed the
  deposit it was paid for. `earned` on a `part` step is drawn on the same scale and implies nothing
  about its parent's earned value. In a chart where any step has `earned`, every base bar is light,
  including a step without `earned` — a solid bar always means "earned", as the legend says.
- Bars scale to the largest |value| on the chart, never to a sum; `part` steps never stack; a zero
  value keeps its row, label and value but draws no bar; a step the caller omits is not drawn.
- Forms: `bars` (default); `steps` — the `rate` chips emphasised and, behind each main bar, a faint
  ghost of the previous main value in the same block (the drop-off read; none after a `gap`, which
  starts a base of another kind, and none when that value is not positive); `shape` — the classic funnel as **centred
  rectangles** whose width is the value, labels and values on the label line. Trapezoids are not
  drawn: their slanted edges would show values that do not exist. Row anatomy in pixels: ADR 010.
- Class hooks: `-bar`, `-bar-earned`, `-bar-part`, `-bar-loss`, `-bar-ghost`, `-rate`, plus the core's
  `-label`, `-value`, `-legend`, `-grid` (separators), `-axis` (the zero line).
- Throws: `steps` that is not an array, no steps or no main step; values whose range overflows a
  number; `earned` without a `legend` array of two strings; a `rate` that is not a
  string, `null` or absent; a `part` step first or inside losses; a main step after
  a losses step; `gap` on a `part` step; `shape` with `earned`, `part`, losses or a negative value;
  a `part` or `gap` that is present and not a boolean; a `group` other than `'losses'` (ADR 020).
- Allowed: `earned` on a losses step (a cancelled commission); a funnel of one step.
- Units: counts and money are separate calls (ADR 007). A step with no money base (registrations)
  simply is not in the money call.
- **Different bases on one money scale.** Deposit sums and GGR are both money in one currency, so they
  share the scale, but they are different bases. Each step's `label` names its base ("Deposits — sum
  topped up", "Revenue — GGR"), a step of another kind opens its own block with `gap: true` (GGR is a
  game result, not money paid in, and can be negative — without the gap its bar reads as the next stage
  after deposits), the legend names the pair generically ("base of the event" / "earned by the
  partner"), and the chart's `desc` says the bases differ. The currency is the programme's; the
  library never assumes one. A ratio between whole-funnel numbers
  (commission per click) is a KPI tile, not a rate chip.

**`Charts.waterfall(steps, options)`** — `charts-waterfall.js`

```ts
interface WaterfallStep {
  label: string;            // already translated
  value: number;            // a total's amount, or a delta's signed change
  display: string;          // formatted, sign included ("−1 200.00")
  kind: 'total' | 'delta';  // total: a bar from zero (GGR, NGR, commission); delta: a floating bar
}
type WaterfallOptions = Common;   // no form, no legend (ADR 014)
```

GGR → −bonuses → −taxes/fees → NGR → partner share → commission. A delta is not always an expense:
the step between NGR and the partner's commission is the share that stays with the platform and the
network, and its caller label should say so neutrally. Layout and colour: ADR 014.

- **Rows**, one a step, with the funnel's anatomy (ADR 010: label line, the same split and truncation,
  a 12 px bar, padding); no rate line, no blocks, no legend, no ticks.
- **Positions.** A total is a bar from zero (a negative total grows left of the zero line). A delta
  floats from the running total — the last total plus every delta since — to the running total plus
  the delta. The library does not check that a total equals that sum: the caller's totals are the
  truth, and a mismatch is visible against the previous row (the ends do not line up), which is the
  caller's bug to see.
- **One scale** over zero and both ends of every bar. A zero line per row when any bar reaches below
  zero, as in the funnel.
- **Behind each delta, a ghost of the running total before it** (from zero, `currentColor` at 0.12):
  the delta extends it or bites into it. No connector lines — they would cross the value text.
- **Colour:** totals the brand's solid mark; an increase the light mark (the solid at 0.6); a decrease
  the brand's opposite hue, fitted like the solid. Never status green/red. A zero value keeps its row,
  label and value but draws no bar.
- Class hooks: `-bar-total`, `-bar-up`, `-bar-down`, `-bar-ghost`, plus the core's `-label`, `-value`,
  `-axis`. Each row is a `<g>` with a `<title>`: `label: display`.
- Throws: `steps` that is not an array, or empty; a `kind` other than `total` or `delta`; a first step
  that is not a total; values whose range overflows a number; and the shared input rules.
- Allowed: a delta after a delta; a total anywhere after the first, matching the running sum or not; a
  waterfall of one total.

### Group B — dynamics

**`Charts.series(points, options)`** — `charts-series.js`

```ts
interface SeriesPoint { x: string; values: (number | null)[]; display: (string | null)[] }  // x: formatted label
interface SeriesOptions extends Common {
  form?: 'line' | 'area' | 'columns';   // default 'line'
  names: string[];                 // one or two series names, for the key; length = values.length
  stacked?: boolean;               // columns only; the caller asserts the parts are additive
  previous?: {                     // comparison period for a single series, one entry per point
    name: string; values: (number | null)[]; display: (string | null)[];
  };
}
```

Layout and colour: ADR 015. In short:

- **Anatomy, top to bottom:** the key — one line per series and one for `previous`: a swatch, the name,
  the last point's `display` end-anchored (an em dash when the last point has no data); the plot,
  gridlines carrying their tick text above them at the left; the x labels.
- **Points at band centres.** `null` is no data: a line breaks, a column is not drawn, a lone point
  is a dot. Never zero.
- `line`: 2 px lines, round joins; the last point with data of each series gets an 8 px dot with a 2 px
  ring of the theme surface.
- `area`: a single series only, a 0.1 wash between the line and zero.
- `columns`: **grouped** by default — GGR and commission are nested amounts, not parts of a whole, and a
  stack would count the same money twice. `stacked: true` is for genuinely additive parts (first and
  repeat deposits) and is the caller's assertion. A column is 24 px wide, centred in its own viewport —
  its share of 70% of the point's band, a 6% gap between two — that clips it: as thick as the narrower
  of the two, never gone however dense the series (ADR 020).
- `previous`: the comparison period as a `currentColor` line at 0.35 under a **single** series, never
  dashed, never a second axis.
- **Colours:** series 1 the brand's solid mark, series 2 its opposite hue. At most two series: no
  third colour from one brand passes the checks (ADR 015) — more measures are more charts.
- **Scale:** zero and every value drawn, widened to nice steps (1, 2, 5 × 10ⁿ, about four intervals);
  tick text through `format`, default `n(v, 6)`. All values zero or `null`: one tick, 0.
- **x labels:** the first and the last always — under their point when the label fits in one band at
  343 px, else at the chart's edge; between them every k-th, k from the longest label at 343 px (8 px a
  character, a 12 px gap), skipping any that would touch the first or the last.
- **Hover:** a transparent band per point with a `<title>`: `x: name display`, one entry per series,
  `previous` last. No script.
- Class hooks: `-line`, `-area`, `-bar`, `-dot`, `-prev`, `-grid`, `-tick`, `-x`, `-hit`, `-key`, plus the
  core's `-label`, `-value`.
- Throws: `points` not an array, or empty; `names` not an array of one or two strings; a point whose
  `values` or `display` length differs from `names`; a value `null` whose `display` is not, or the
  reverse; `area` or `previous` with two series; `stacked` outside `columns`; a negative value in a
  stack; `previous` arrays of a length other than the points'; `format` that is not a function or
  returns something other than a string; values whose range overflows a number; `stacked` present and
  not a boolean; values so small or so large that the nice ticks underflow or overflow (ADR 020).

**`Charts.spark(values, options)` and `Charts.tile(tile, options)`** — `charts-spark.js`

```ts
spark(values: (number | null)[], options?: Common): string
interface Tile {
  label: string;                   // ≤ 20 characters shown; the rest cut with … (the whole in a <title>)
  value: string;                   // the caller's figure, never cut; ≤ 10 characters fit 160 px
  delta?: { display: string; direction: 'up' | 'down'; good: boolean }
        | { display: string; direction: 'flat' };
  trend?: (number | null)[];
}
tile(tile: Tile, options?: Common): string
```

Layout and colour: ADR 016. In short:

- **Sparkline:** 32 px high, a 2 px brand line through band centres, `null` breaks it, the last point
  with data marked with an 8 px dot. Scale: the values' own minimum and maximum (a line, not a length).
  No text.
- **Tile:** label (13 px, 0.7), value (26 px, 600), delta (13 px: `▲`/`▼` + `display`), trend (a
  sparkline in the page colour at 0.35, the last dot in the brand). Promised from 160 px wide.
- **A change's colour** is direction × good: `good: true` green, `false` red, fitted to 4.5:1 per theme;
  `flat` has no arrow and the page colour. Never colour alone — the arrow and the signed string.
- Class hooks: `-line`, `-dot`, `-label`, `-value`, `-delta`, `-delta-good`, `-delta-bad`, `-trend`.
- Throws: `values` or `trend` not an array, empty, or holding anything but finite numbers and `null`;
  a tile that is not an object; a `label` or `value` that is not a string; a `delta` without a string
  `display`, with an unknown `direction`, or `up`/`down` without a boolean `good`; values whose range
  overflows a number.

### Group C — traffic breakdowns

**`Charts.rank(rows, options)`** — `charts-rank.js`. Horizontal bars by source, sub-id, geo,
campaign; one colour for every bar (no value ramp on nominal categories); optional `highlight` index
for the emphasis form. `rows: { label, value, display }[]`; the caller sorts and folds the tail.

```ts
interface RankRow { label: string; value: number; display: string }
interface RankOptions extends Common { highlight?: number }   // a row index
```

- Rows as the funnel's and the waterfall's (ADR 010): label line, a 12 px bar after 2 px, 10 px padding;
  the same label cut and value split. One scale over zero and every value; a negative value (GGR by a
  source where players won) grows left of a per-row zero line, never clamped. A zero value keeps its
  row and label, and draws no bar.
- Colour: every bar the brand's solid mark. With `highlight`, that row stays solid and every other bar
  is `currentColor` at 0.35 — the de-emphasis grey of losses and `previous`. Identity never rests on
  colour: each row is labelled.
- Each row is a `<g>` with a `<title>`: `label: display`. Class hooks: `-bar`, `-bar-muted`, plus the
  core's `-label`, `-value`, `-axis`.
- Throws: `rows` not an array, or empty; a row whose `label` or `display` is not a string or whose
  `value` is not finite; `highlight` that is not an integer index of a row; values whose range overflows.

**`Charts.share(parts, options)`** — `charts-share.js`. Part-to-whole (device, geo). Default form is a
**100% stacked bar**; `form: 'donut'` is allowed. Never for comparing close values. Categorical hues in
fixed order; colour follows the entity.

```ts
interface SharePart { label: string; value: number; display: string }
interface ShareOptions extends Common { form?: 'bar' | 'donut' }
```

Layout and colour: ADR 017. In short:

- **Colour:** the dataviz reference palette, six slots per theme, by the part's index. `brand` is not
  used — no brand-derived set of six passes the checks.
- **At most six parts**, in either form (throws above — fold into "Other").
- `bar`: a 24 px bar, parts at their share of the width, 2 px apart (a surface line between); `donut`: a
  160 px ring from 12 o'clock, clockwise, nothing in the hole. Then the key: one line a part — swatch,
  name, `display` (ADR 010's label line).
- A zero part keeps its key line and draws nothing. Each part, and each key line, has a `<title>`:
  `label: display` — so a zero part and a cut label keep theirs (ADR 020).
- Class hooks: `-part`, `-part-1` … `-part-6`, `-key`, plus the core's `-label`, `-value`.
- Throws: `parts` not an array, empty, or longer than six; a part whose `label` or `display` is not a
  string, whose `value` is not finite or is negative; every value zero; a sum that overflows; an unknown
  `form`.

**`Charts.heatmap(cells, options)`** — `charts-heatmap.js`. A grid: hour × weekday of clicks.
Sequential, one hue, with a scale legend; a `null` cell has no fill and an em dash, never the lightest
colour.

```ts
interface HeatmapCells {
  rows: string[]; cols: string[];          // caller strings
  values: (number | null)[][];             // values[row][col]; null: no data
  display: (string | null)[][];            // the same shape; null exactly where the value is null
}
interface HeatmapOptions extends Common { form?: 'grid' | 'cohort' }   // default 'grid'
```

Layout and colour: ADR 018. In short:

- **Five steps of the brand's hue**, quantised over `[0, max]`; more is darker on light surfaces,
  brighter on dark ones. Negative values throw (no diverging form).
- **Rows** as labelled lines (ADR 010): the label, then 20 px of cells, 2 px surface lines between
  cells; column labels by ADR 015's x-label rule; then the scale: five swatches, `format(0)` and
  `format(max)`.
- `grid`: every row full, no text in cells. `cohort`: a row may be shorter than `cols` — the cells
  past it are absent, not zero — and a cell shows its `display` at 11 px when it fits one band at
  343 px.
- Every cell has a `<title>`: `row · col: display`. Class hooks: `-row`, `-cell`, `-cell-empty`, `-x`,
  `-legend`, plus the core's `-label`.
- Throws: `rows` or `cols` not a non-empty array of strings; `values` or `display` not an array of one
  array per row; a row longer than `cols`, or shorter in the `grid` form; a `display` row of another
  length than its `values` row; a value `null` whose display is not, or the reverse; a value that is
  not finite or is negative; an unknown `form`.

### Group D — cohorts, flows, targets

**Cohort** — `heatmap` with `form: 'cohort'`: rows = FTD month, columns = month since FTD; a
triangular matrix (future cells are absent, not zero); values as caller strings. Built with the
heatmap (ADR 018).

**`Charts.sankey(nodes, links, options)`** — `charts-sankey.js`. Source → registration → FTD flows.
Readable only small: at most 4 columns and 8 nodes per column (throws above). Built last — the layout
is the largest piece of code in the library.

```ts
interface SankeyNode { id: string; column: number; short: string; label: string; display: string }  // short ≤ 3 chars
interface SankeyLink { from: string; to: string; value: number; display: string }
sankey(nodes: SankeyNode[], links: SankeyLink[], options?: Common): string
```

Layout and colour: ADR 019. In short:

- **Labels:** each node's `short` tag (≤ 3 characters, 11 px) beside it; the full `label` and its
  `display` in a key under the diagram, one line a node. (The first sketch, "nodes labelled outside",
  cannot fit 375 px — ADR 019.)
- **Sizes:** a node is the larger of its in- and outflow; one scale for the diagram, the fullest column
  filling a 240 px plot with 16 px between nodes; ribbons stack in the caller's order.
- **Colour:** one — nodes the brand's solid mark, ribbons the solid at 0.3. (The first sketch, links
  coloured by their source node, needs a palette no brand gives — ADR 015, 017.)
- Each ribbon has a `<title>` `from → to: display`, each node and each key line `label: display`. Class hooks: `-node`,
  `-link`, `-tag`, `-key`, plus the core's `-label`, `-value`.
- Throws: `nodes` or `links` not an array; fewer than two columns or more than four, a gap in the column
  numbers, more than eight nodes a column; a node id repeated, a `column` that is not an integer, a
  `short` that is not a string of one to three characters (characters, not UTF-16 units: an emoji is
  one), a `label` or `display` that is not a string; a link to an unknown id, between columns that are
  not neighbours, or backwards; a link `value` that is not finite or is negative; every link zero; flows
  so small or so large that the scale underflows or overflows (ADR 020).

**`Charts.meter(meter, options)`** — `charts-meter.js`. Progress to the next revenue-share tier or a
CPA cap: a filled bar on a lighter track of the same ramp, tier marks as hairlines, caller strings
for the current value and the target.

```ts
interface Meter {
  label: string;
  value: number; display: string;          // where the partner stands
  target: number; targetDisplay: string;   // the next tier or the cap: the track's full length
  marks?: { value: number; label: string }[];  // tiers on the way, as hairlines
}
```

- Anatomy: ADR 010's label line (the label, the `display` end-anchored), a 12 px bar after 2 px, then
  `targetDisplay` end-anchored under the bar's end on an 18 px line.
- The track is the brand's solid at 0.2 over the full length; the fill is the solid from zero to
  `value / target`. A value past the target fills the track and stops there — the `display` says by
  how much; the library never shows a number of its own.
- A mark is a 1 px `currentColor` hairline at `value / target` across the bar, 3 px beyond it on each
  side, with a `<title>` of its label: tier names cannot be measured, so they are not written on the
  bar.
- The bar has a `<title>`: `label: display / targetDisplay`. Class hooks: `-track`, `-bar`, `-mark`,
  `-target`, plus the core's `-label`, `-value`.
- Throws: a meter that is not an object; `label`, `display` or `targetDisplay` not a string; a `value`
  that is not finite or is negative; a `target` that is not finite or not above zero; `marks` not an
  array, or a mark whose `label` is not a string or whose `value` is not inside `(0, target]`.

### Core helpers

- `Charts.init(el, svg)` — sets `el.innerHTML = svg`. No listeners, no resize logic.
- `Charts.palette(brand, theme)` → `{ solid, light, opacity }`: the derived colours (`#rrggbb`) and the
  light mark's opacity, so a page can style its table to match. Throws like a chart on bad input.

## Questions decided on the playground (M2)

- **O1. Responsive text** → ADR 009: marks in percent of the page's width, text in pixels; no
  `width` option; 375 px screens promised.
- **O2. Long labels** → ADR 010: cut at 42 characters with `…`; the row's `<title>` keeps the whole label.
- **O3. Value placement** → ADR 010: values on the label line, the row split onto two lines when a
  conservative estimate says they may not fit at 343 px.
- **O4. Palette** → ADR 011: OKLCH from `brand`, validated on three light and three dark surfaces;
  `currentColor` for text, losses and chrome. The categorical, sequential and diverging palettes are
  decided with the modules that need them (M6–M8).

## Milestones

Each chart module has its own gate: drawn, Node tests, every check seen red under `--mutate`, size
measured and budget frozen. Modules ship as 0.x minor releases as they pass; v1.0 is the whole
catalog.

| M | What | Done when |
|---|---|---|
| M0 | bootstrap, ADRs 001–008 | done 2026-10-08 |
| M1 | contract: `charts.d.ts` + `charts-funnel.d.ts` (data shapes frozen; layout options `@unstable` until M2); core skeleton; module pattern proven on `funnel`; per-file size map (*provisional: core 4096 B, funnel 2048 B — replaced when each is drawn*) | `.d.ts` reviewed; module test green on ESM, CJS, browser global and "module without core" |
| M2 | playground `index.html`; O1–O4 decided | ADRs merged; layout options leave `@unstable` |
| M3 | core drawing + `funnel` (three forms) | gates green → 0.1.0 |
| M4 | first consumer: the two funnels above their tables, imported from npm through a bundler (Vite: default import of the UMD file via CJS interop), CSP unchanged (`script-src 'self'`, `style-src 'self'`), both themes, 375/1280 px | screenshots + review |
| M5 | package-name ADR (done: ADR 013), public repo, Pages playground, first publish, Trusted Publisher, release from `v*` tags | published |
| M6 | `waterfall`, then Group B: `series` (daily first), `spark`/`tile` | gates green |
| M7 | Group C: `rank`, `share`, `heatmap` | gates green |
| M8 | Group D: cohort, `meter`, `sankey` | gates green |
| M9 | an independent review of the whole catalog (Codex), its findings fixed | done 2026-10-09 → 1.0.0 |

**Release plan (2026-10-09):** M6–M8 were not released one by one. The catalog shipped once, as 1.0.0 after M9 —
the per-minor plan above (0.2.0, 0.3.0, 0.4.0) is superseded.

The funnel ships first and alone (0.1.0): it is what the first consumer needs, and it proves the core.
The waterfall is built against a fixture (2026-10-09): no consumer sends a real deduction (bonuses,
taxes, NGR) yet, and drawn from GGR and commission alone it would show the platform's share as an
expense and repeat two numbers the money funnel already shows. Groups B–D are built against fixtures on the playground; each module's
`.d.ts` is written when its milestone starts (contract-first per module).

## Acceptance (every module)

- Output contains no `style=` attribute, no `<style>` element, no `<script>`, no `data-*`, no `data:`,
  no library name, no comment.
- Same `(data, options)` → identical bytes across runs and Node 22/24.
- Labels with `<`, `&`, quotes render as text; so does the `format` callback's output.
- `title` given → `role="img"` and `<title>`; every row has a `<title>` (the accessible unit, ADR 010); no `title` →
  `aria-hidden="true"`.
- Every documented throw fires; non-finite numbers throw.
- Measured gzip size within the frozen budget of each file.
- In a consumer: renders under a `style-src 'self'` CSP with zero console violations, readable in
  light and dark, no horizontal scroll at 375 px.
