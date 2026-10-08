---
type: note
status: active
tags: [architecture, overview, spec]
project: charts-lite
---

# charts-lite — spec / dev source of truth

Docs for developers and agents. `index.html` is the playground, `test/verify.html` the browser
gate, `test/*.test.mjs` the Node gate. Contract-first: change the doc here **before** the code.

**Status (2026-10-08): M3 done — core + funnel ready for 0.1.0, not yet published (M5).** The funnel
(three forms, base and earned, losses, negative values, gaps) passes the Node tests, the typecheck, the
Vite bundle gate and the browser gate (Chromium, Firefox, WebKit at 375 and 1280 px under
`default-src 'self'`); every Node, type, bundle and browser check has been seen red under mutation.
Budgets frozen (ADR 012): core 2344/2432 B, funnel 2003/2176 B. Next: M4, the first consumer. Scope:
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

## Architecture (ADR 008)

```
charts.js / charts.d.ts                 core — global `Charts`
charts-funnel.js / charts-funnel.d.ts   one module per chart, each with its own types
charts-waterfall.js / …
```

- A module takes the core from `require('./charts.js')` (CommonJS) or `root.Charts` (browser), throws
  `Error('charts-lite: load charts.js before charts-<form>.js')` without it, adds its function to the
  core object and **exports that core object** — `require('charts-lite/charts-funnel.js').funnel`.
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
  format?: (v: number) => string;  // text for numbers the library chooses (axis ticks); default n(v)
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
  `brand` a `#rrggbb` hex; `theme` `light` or `dark`; an unknown `form` throws.
- Every input error is a `TypeError` whose message starts with `charts-lite:`.

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
  a losses step; `gap` on a `part` step; `shape` with `earned`, `part`, losses or a negative value.
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
  label: string; value: number; display: string;
  kind: 'total' | 'delta';  // total: a bar from zero (GGR, NGR, commission); delta: a floating bar
}
```

GGR → −bonuses → −taxes/fees → NGR → partner share → commission. A delta is not always an expense:
the step between NGR and the partner's commission is the share that stays with the platform and the
network, and its caller label should say so neutrally. A total is a bar from zero (negative
totals hang below the zero line). A delta floats from the previous bar's end — a position the library
derives by adding the delta to it; it does not check that the next total equals that sum (the
caller's totals are the truth; a mismatch shows as a visible jump, which is the caller's bug to see).
Increase and decrease are a diverging pair (two hues of opposite temperature), not status green/red;
totals in the brand hue; connector hairlines between bars. Throws: the first step is not a total.

### Group B — dynamics

**`Charts.series(points, options)`** — `charts-series.js`

```ts
interface SeriesPoint { x: string; values: (number | null)[]; display: (string | null)[] }  // x: formatted label
interface SeriesOptions extends Common {
  form?: 'line' | 'area' | 'columns';
  names: string[];                 // series names for the legend; length = values.length
  stacked?: boolean;               // columns only; the caller asserts the parts are additive
  previous?: (number | null)[];    // comparison period for a single series, same length as points
}
```

- `line`: 2px lines, round joins; `null` breaks the line (no data ≠ zero). End-dot ≥ 8px with a 2px
  surface ring; the last value is the one direct label.
- `area`: a single series only (a ~10% wash under a 2px line).
- `columns`: **grouped** by default — GGR / NGR / commission are nested amounts, not parts of a whole,
  and a stack would count the same money twice. `stacked: true` is for genuinely additive parts
  (deposits by payment method) and is the caller's assertion.
- `previous`: the comparison period as a de-emphasis gray line under a **single** series, never dashed,
  never a second axis.
- Throws: `area` or `previous` with more than one series; `stacked` outside `columns`; arrays of
  mismatched length.

**`Charts.spark(values, options)` and `Charts.tile(tile, options)`** — `charts-spark.js`

A sparkline (2px line, last point marked) and a KPI tile as one SVG: `label`, `value` (caller string,
proportional figures), optional `delta` (caller string + `direction: 'up' | 'down'` + `good: boolean`,
coloured by direction × goodness and always shipped with an arrow glyph, never colour alone),
optional trend sparkline in the de-emphasis hue with the current period in the accent. EPC, CR,
ARPU, FTD.

### Group C — traffic breakdowns

**`Charts.rank(rows, options)`** — `charts-rank.js`. Horizontal bars by source, sub-id, geo,
campaign; one colour for every bar (no value ramp on nominal categories); optional `highlight` index
for the emphasis form. `rows: { label, value, display }[]`; the caller sorts and folds the tail.

**`Charts.share(parts, options)`** — `charts-share.js`. Part-to-whole (device, geo). Default form is a
**100% stacked bar**; `form: 'donut'` is allowed with a **hard cap of 6 segments** (throws above it —
fold into "Other"); segment labels follow O3. Never for comparing close values. Categorical hues in
fixed order; colour follows the entity. Throws: a negative part.

**`Charts.heatmap(cells, options)`** — `charts-heatmap.js`. A grid: hour × weekday of clicks.
Sequential, one hue light → dark, with a scale legend; a `null` cell is drawn as an empty outlined
cell, never as the lightest colour.

### Group D — cohorts, flows, targets

**Cohort** — `heatmap` with `form: 'cohort'`: rows = FTD month, columns = month since FTD; a
triangular matrix (future cells are absent, not zero); values as caller strings.

**`Charts.sankey(nodes, links, options)`** — `charts-sankey.js`. Source → registration → FTD flows.
Readable only small: at most 4 columns and 8 nodes per column (throws above); links coloured by their
source node at reduced opacity; nodes labelled outside. Built last — the layout is the largest piece
of code in the library.

**`Charts.meter(meter, options)`** — `charts-meter.js`. Progress to the next revenue-share tier or a
CPA cap: a filled bar on a lighter track of the same ramp, tier marks as hairlines, caller strings
for the current value and the target.

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
| M5 | package-name ADR, public repo, Pages playground, first publish, Trusted Publisher, release from `v*` tags | published |
| M6 | `waterfall`, then Group B: `series` (daily first), `spark`/`tile` | gates green → 0.2.0 |
| M7 | Group C: `rank`, `share`, `heatmap` | → 0.3.0 |
| M8 | Group D: cohort, `meter`, `sankey` (*provisional budget 4096 B*) | → 0.4.0, then v1.0 |

The funnel ships first and alone (0.1.0): it is what the first consumer needs, and it proves the core.
The waterfall waits for a consumer with at least one real deduction (bonuses, taxes, NGR): drawn from
GGR and commission alone it would show the platform's share as an expense and repeat two numbers the
money funnel already shows. Groups B–D are built against fixtures on the playground; each module's
`.d.ts` is written when its milestone starts (contract-first per module).

## Acceptance (every module)

- Output contains no `style=` attribute, no `<style>` element, no `<script>`, no `data-*`, no `data:`,
  no library name, no comment.
- Same `(data, options)` → identical bytes across runs and Node 22/24.
- Labels with `<`, `&`, quotes render as text; so does the `format` callback's output.
- `title` given → `role="img"` and `<title>`; every mark has a `<title>`; no `title` →
  `aria-hidden="true"`.
- Every documented throw fires; non-finite numbers throw.
- Measured gzip size within the frozen budget of each file.
- In a consumer: renders under a `style-src 'self'` CSP with zero console violations, readable in
  light and dark, no horizontal scroll at 375 px.
