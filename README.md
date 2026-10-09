# affiliate-charts

Charts for affiliate programmes, as SVG strings. The **funnel**: clicks to first deposits in counts,
and deposits to revenue in money — the base of each event beside what the partner earned from it, with
cancellations and rejected records on the same scale. The **waterfall**: GGR to the partner's
commission, step by step. Zero dependencies, 4.3 KB gzipped for the core and the funnel.

[![npm](https://img.shields.io/npm/v/affiliate-charts.svg)](https://www.npmjs.com/package/affiliate-charts)
[![license](https://img.shields.io/npm/l/affiliate-charts.svg)](LICENSE)

Made by [301](https://301.st) for the [OktagonBet partner programme](https://oktagonbet.partners), its
first user and sponsor.

**[Live demo →](https://investblog.github.io/affiliate-charts/)** — every option wired to a control,
four example funnels and two waterfalls, light and dark, and a width slider to watch the bars follow their container.

[![A money funnel on a light card and a counts funnel on a dark one, drawn by affiliate-charts](https://investblog.github.io/affiliate-charts/docs/preview.svg)](https://investblog.github.io/affiliate-charts/)

- **Renders under a strict CSP.** No `style=""`, no `<style>`, no `<script>`, no `data:` — it works
  under `default-src 'self'`, where most chart libraries break.
- **Zero dependencies.** One call returns markup, in Node at build time or in the browser.
- **Small.** A core plus one file per chart: the core and the funnel are 4.3 KB gzipped together, the
  waterfall adds 1.1 KB.
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
<script src="https://cdn.jsdelivr.net/npm/affiliate-charts@0.1/charts.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/affiliate-charts@0.1/charts-funnel.min.js"></script>
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

*Not on npm yet: `affiliate-charts@0.1.1` ships the funnel only. The waterfall comes with the next
release, together with the rest of the catalog; until then, take it from this repository.*

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

## Colour and size

- Bars are your `brand`, fitted for contrast on a light or a dark surface. Text, losses and lines use
  `currentColor`, so they follow your page.
- Every mark has a class (`chart-bar`, `chart-bar-earned`, `chart-bar-part`, `chart-bar-loss`, `chart-bar-ghost`,
  `chart-bar-total`, `chart-bar-up`, `chart-bar-down`, `chart-label`, `chart-value`, `chart-rate`,
  `chart-legend`, `chart-grid`, `chart-axis`); a stylesheet can recolour any of them.
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
