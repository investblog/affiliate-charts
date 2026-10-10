# affiliate-charts

Charts for affiliate programmes, as SVG strings. The **funnel**: clicks to first deposits in counts,
and deposits to revenue in money — the base of each event beside what the partner earned from it, with
cancellations and rejected records on the same scale. The **waterfall**: GGR to the partner's
commission, step by step. The **daily series**: lines, areas and columns over days. **KPI tiles** and
sparklines. **Rankings** by source, **shares** as a 100% bar or a donut, **heatmaps** and **cohorts**, **meters** to the next tier, **flows** (sankey). Zero dependencies,
4.5 KB gzipped for the core and the funnel.

[![npm](https://img.shields.io/npm/v/affiliate-charts.svg)](https://www.npmjs.com/package/affiliate-charts)
[![license](https://img.shields.io/npm/l/affiliate-charts.svg)](LICENSE)

Made by [301](https://301.st) for the [OktagonBet partner programme](https://oktagonbet.partners), its
first user and sponsor.

**[Live demo →](https://investblog.github.io/affiliate-charts/)** — every option wired to a control,
four example funnels, two waterfalls, three daily series, four KPI tiles, two rankings, two shares, two heatmaps, two meters and two flows, light and dark, and a width slider to watch the bars follow their container.

[![Six charts drawn by affiliate-charts: a money funnel, a waterfall from GGR to commission, daily GGR and commission columns, a sankey from sources to first deposits, a cohort heatmap and a donut of clicks by device](https://investblog.github.io/affiliate-charts/docs/preview.svg)](https://investblog.github.io/affiliate-charts/)

- **Renders under a strict CSP.** No `style=""`, no `<style>`, no `<script>`, no `data:` — it works
  under `default-src 'self'`, where most chart libraries break.
- **Zero dependencies.** One call returns markup, in Node at build time or in the browser.
- **Small.** A core plus one file per chart: the core and the funnel are 4.5 KB gzipped together, the
  waterfall adds 1.1 KB, the daily series 2.9 KB, sparklines and KPI tiles 1.6 KB, rankings 0.9 KB, part to whole 1.3 KB, heatmaps and cohorts 1.8 KB, meters 0.9 KB, flows 1.8 KB.
- **Reads on a phone.** Bars follow the width of their container; text keeps its pixel size.
- **Honest by construction.** Steps are never summed, money and counts never share an axis, a missing
  rate is a dash and never `0%`, and the library never formats or computes a number it shows: every
  label and value is your string.

## Install

```sh
npm install affiliate-charts
```

```js
import Charts from 'affiliate-charts/charts-funnel.js'; // the core plus the funnel
```

CommonJS: `require('affiliate-charts/charts-funnel.js')`. Or from a CDN, no build step — the core first,
then the chart; the page gets the global `Charts`:

```html
<script src="https://cdn.jsdelivr.net/npm/affiliate-charts@1.0/charts.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/affiliate-charts@1.0/charts-funnel.min.js"></script>
```

A cabinet that ships `script-src 'self'` installs from npm and bundles instead.

TypeScript before 7 needs `esModuleInterop` (or `allowSyntheticDefaultImports`) for the default import.

## The funnel

```js
const counts = Charts.funnel([
  { label: 'Clicks', value: 18400, display: '18 400' },
  { label: 'Unique clicks', value: 12100, display: '12 100', part: true },
  { label: 'Registrations', value: 3120, display: '3 120', rate: '17%' },
  { label: 'First deposits', value: 410, display: '410', rate: '13.1%' },
], { title: 'Funnel' });

const money = Charts.funnel([
  { label: 'Deposits — sum topped up', value: 124000, display: '124 000.00',
    earned: { value: 18600, display: '18 600.00' } },
  { label: '2nd deposits', value: 41000, display: '41 000.00', part: true,
    earned: { value: 6150, display: '6 150.00' } },
  { label: 'Revenue — GGR', value: -18200, display: '−18 200.00', gap: true,
    earned: { value: -4550, display: '−4 550.00' } },
  { label: 'Cancellations', value: -9600, display: '−9 600.00', group: 'losses' },
], { title: 'Funnel, money', legend: ['base of the event', 'earned by the partner'], theme: 'dark' });

Charts.init(document.querySelector('#funnel'), counts); // or put the string in your HTML at build time
```

A step:

| Field | |
|---|---|
| `label`, `display` | Your strings, already translated and formatted. |
| `value` | Drives the bar. Negative values grow left of a zero line. |
| `earned` | `{ value, display }` — the partner's share of this step, a solid bar on the same scale. Needs `legend`. |
| `part` | A subset of the nearest main step above it (unique clicks, 2nd deposits): indented, thinner, never stacked. |
| `group: 'losses'` | Cancellations, rejected records: a block after the main steps, on the same scale. |
| `gap` | Start a new block — a base of another kind, like GGR after deposits. |
| `rate` | Your conversion string, shown above the row. `null` shows a dash. |

Options: `title` and `desc` (the accessible name; without `title` the chart is `aria-hidden`, so keep
your data table next to it), `form` (`'bars'`, `'steps'` with a ghost of the step before, `'shape'` for
the classic centred funnel), `legend`, `brand` (`#rrggbb`), `theme` (`'light'` | `'dark'`) and
`classPrefix`.

Bad input throws a `TypeError` starting with `affiliate-charts:` — the library never repairs data.

## The waterfall

From GGR to the partner's commission: totals stand on zero, each delta floats from where the running
total stands, with a faint ghost of that running total behind it.

```js
import Charts from 'affiliate-charts/charts-waterfall.js';

const flow = Charts.waterfall([
  { label: 'Revenue — GGR', value: 52000, display: '52 000.00', kind: 'total' },
  { label: 'Bonuses', value: -7800, display: '−7 800.00', kind: 'delta' },
  { label: 'NGR', value: 44200, display: '44 200.00', kind: 'total' },
  { label: 'Stays with the platform and the network', value: -33150, display: '−33 150.00', kind: 'delta' },
  { label: 'Partner commission', value: 11050, display: '11 050.00', kind: 'total' },
], { title: 'Money flow' });
```

The first step is a total. The library adds the deltas only to place the bars; it never checks a total
against them, and shows only your strings. Totals are your `brand`, an increase its lighter mark, a
decrease the opposite hue. Name a deduction that is not an expense neutrally, as above. Options: `title`,
`desc`, `brand`, `theme`, `classPrefix`. Both modules can sit on one page; each import returns the same
`Charts`.

## The daily series

A day (or a week, a month) per point, as lines, an area or columns, on one value axis.

```js
import Charts from 'affiliate-charts/charts-series.js';

const days = Charts.series([
  { x: '1 Oct', values: [4120, 1030], display: ['4 120.00', '1 030.00'] },
  { x: '2 Oct', values: [null, null], display: [null, null] },          // no data: the line breaks
  { x: '3 Oct', values: [-1240, -310], display: ['−1 240.00', '−310.00'] },
], { names: ['Revenue — GGR', 'Commission'], form: 'line', title: 'October' });
```

- `form`: `'line'` (default), `'area'` (one series) or `'columns'` (grouped; `stacked: true` when the parts
  really add up, such as first and repeat deposits — never GGR and commission, which are nested).
- At most two series: the first in your `brand`, the second in its opposite hue. Set `second: 'tint'`
  for a lighter step of the brand, which suits nested pairs such as views and visitors (with red brands
  on a light page it is borderline). Or pass your own `second: '#rrggbb'`, fitted to the theme like
  `brand`; keeping the two apart is then up to you. More measures are more charts.
- Tick text sits at the left edge, over the plot. With many columns, `gutter: 4` keeps 4% of the width
  clear for it — a percent, so pick it for your card's width (about 4 at 1100 px for `3,000`). The text
  has a halo of the theme's surface; on another surface restyle it: `.chart-tick { stroke: #f7f7f8 }`.
- `previous: { name, values, display }` draws a comparison period under a single series, in the page colour.
- The key above the plot shows each series' last `display`; hovering a day shows its `<title>`. Axis
  ticks are numbers the library picks, so their text goes through your `format(v)` (default: plain
  digits).

## Sparklines and KPI tiles

```js
import Charts from 'affiliate-charts/charts-spark.js';

const tile = Charts.tile({
  label: 'CPA',
  value: '41.20',
  delta: { display: '−3.1% vs Sep', direction: 'down', good: true },  // a falling CPA is good
  trend: [44.1, 43.0, 42.7, null, 41.9, 41.2],
}, { title: 'Cost per acquisition' });

const cell = Charts.spark([12, 18, 9, 22, 30]);   // 32 px high, for a table cell
```

A change is green when `good`, red when not, whichever way it moves, and always carries its arrow;
`direction: 'flat'` has neither. A tile is laid out for 160 px and up: two a row on a phone. Labels past
20 characters are cut; the value is your string and is never cut — keep it to about 10 characters.

## Rankings

```js
import Charts from 'affiliate-charts/charts-rank.js';

const top = Charts.rank([
  { label: 'sub-id: spring-promo', value: 18400, display: '18 400.00' },
  { label: 'sub-id: push-test', value: -2300, display: '−2 300.00' },   // players won: left of zero
  { label: 'Other (14 sub-ids)', value: 3900, display: '3 900.00' },
], { title: 'GGR by sub-id', highlight: 0 });
```

One bar a row in your order — sort and fold the tail yourself. Every bar is your `brand`; with
`highlight`, that row keeps it and the rest turn grey.

## Part to whole

```js
import Charts from 'affiliate-charts/charts-share.js';

const devices = Charts.share([
  { label: 'Mobile — Android', value: 9820, display: '9 820' },
  { label: 'Mobile — iOS', value: 5410, display: '5 410' },
  { label: 'Other', value: 2540, display: '2 540' },
], { form: 'donut', title: 'Clicks by device' });   // or form: 'bar', a 100% bar (default)
```

Up to six parts — fold the rest into "Other". The colours are a fixed, checked palette of six per theme,
by the part's position, and ignore `brand`: no six colours derived from one brand pass the colour-blind
checks. Each part gets a key line with your `display`; the library shows no percentages of its own.

## Heatmaps and cohorts

```js
import Charts from 'affiliate-charts/charts-heatmap.js';

const cohorts = Charts.heatmap({
  rows: ['Apr 2026', 'May 2026', 'Jun 2026'],
  cols: ['M0', 'M1', 'M2'],
  values: [[100, 58, 34], [100, 60], [100]],      // a shorter row: those months have not happened
  display: [['100%', '58%', '34%'], ['100%', '60%'], ['100%']],
}, { form: 'cohort', format: (v) => v + '%', title: 'Still depositing' });
```

Five steps of your `brand`, from zero to the largest value: more is darker on a light page, brighter on a
dark one. `form: 'grid'` (default) is for full grids such as clicks by hour and weekday; `'cohort'`
lets rows stop early and writes each value in its cell when it fits. `null` is no data — a dash, never
the lightest colour. Values are magnitudes: a negative one throws.

## Meters

```js
import Charts from 'affiliate-charts/charts-meter.js';

const tier = Charts.meter({
  label: 'Tier 3 — 35% of NGR',
  value: 31200, display: '31 200.00',
  target: 50000, targetDisplay: 'tier 3 at 50 000.00',
  marks: [{ value: 20000, label: 'Tier 2 — 30%' }],   // a hairline, named on hover
});
```

Progress to the next revenue-share tier or a CPA cap: your `brand` filling a lighter track of itself.
Past the target the fill stops at the end — say by how much in your `display`.

## Flows

```js
import Charts from 'affiliate-charts/charts-sankey.js';

const flows = Charts.sankey([
  { id: 'tg', column: 0, short: 'TG', label: 'sub-id: tg-channel', display: '9 200' },
  { id: 'reg', column: 1, short: 'REG', label: 'Registered', display: '1 500' },
  { id: 'no', column: 1, short: 'NO', label: 'Not registered', display: '7 700' },
], [
  { from: 'tg', to: 'reg', value: 1500, display: '1 500' },
  { from: 'tg', to: 'no', value: 7700, display: '7 700' },
], { title: 'From sources to registration' });
```

Two to four columns of up to eight nodes, links only to the next column. A phone has no room for node
names beside a sankey, so each node carries your `short` tag (up to three characters) on the diagram and
its full `label` and `display` in a key underneath. One colour: nodes your `brand`, ribbons a wash of it.

## Colour and size

- Bars are your `brand`, fitted for contrast on a light or a dark surface. Text, losses and lines use
  `currentColor`, so they follow your page.
- Every mark has a class (`chart-bar`, `chart-bar-earned`, `chart-bar-part`, `chart-bar-loss`, `chart-bar-ghost`,
  `chart-bar-total`, `chart-bar-up`, `chart-bar-down`, `chart-label`, `chart-value`, `chart-rate`,
  `chart-legend`, `chart-grid`, `chart-axis`, and for the series `chart-line`, `chart-area`, `chart-dot`,
  `chart-prev`, `chart-tick`, `chart-x`, `chart-key`, `chart-hit`, and for the tile `chart-delta`,
  `chart-delta-good`, `chart-delta-bad`, `chart-trend`, `chart-bar-muted` in a ranking, `chart-part-1` … `chart-part-6` in a share, `chart-cell` in a heatmap, `chart-track` and `chart-mark` in a meter, `chart-node`, `chart-link` and `chart-tag` in a sankey); a stylesheet can recolour any of them.
- `Charts.palette(brand, theme)` returns `{ solid, light, opacity }` to paint your table to match.
- The chart takes the width of its container. Text is laid out for 13 px and screens from 375 px.
- The same input gives the same bytes within a minor version: pin the exact version.

## Development

`npm test` (Node), `npm run typecheck`, `npm run size` (per-file gzip budgets), `npm run gate:bundle`
(a Vite build of a consumer), `npm run mutate` (every check must be seen to fail), and
`npm run gate:browser [-- --mutate]` (Chromium, Firefox and WebKit under a strict CSP; uses a
Playwright already on the machine). `index.html` is the playground. The specification and decisions
are in [`docs/`](docs/README.md).

MIT © [301ST](https://301.st) · sponsored by [OktagonBet Partners](https://oktagonbet.partners)
