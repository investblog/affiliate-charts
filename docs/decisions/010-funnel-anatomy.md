---
type: decision
status: accepted
date: 2026-10-08
tags: [layout, text, funnel, a11y]
project: affiliate-charts
---

# 010 — the funnel row: labels, values, rates, truncation

## Context

Spec questions O2 (long labels) and O3 (value placement). Under ADR 009 marks are in percent and text is
in pixels, and a pure function cannot measure text. Values cannot sit just past a bar's end (no
`100% − Npx` in SVG lengths, and a nested `<svg>` clips), and a value inside a bar needs the text width
to know it fits.

## Decision

**Row anatomy, in pixels** (`font-size="13"` on the root as a presentation attribute):

| Part | Height | Notes |
|---|---|---|
| rate line | 16 (`steps`: 20) | `↓ <rate>` at 12 px muted (`steps`: 13 px semibold); omitted when `rate` is absent; `null` → `↓ —` |
| label line | 18 | label at `x=0` (`part`: 12 px indent); values at `x=100%`, end-anchored |
| value line | 18 | only when the row is split (below) |
| base bar | 12 (`part`: 8, `shape`: 20) | after 2 px |
| earned bar | same as base | after 2 px; solid |
| padding | 10 | |
| block gap | 16 | before a `gap: true` step and before the first loss: a 1 px hairline across the chart, no heading |

A legend (when any step has `earned`) sits on top, **one entry per line** (18 px each), so it needs no
text width.

- **Values share the label line** — base value muted, then ` · `, then the earned value in semibold:
  the text-side twin of the light and the solid bar, in the legend's order.
- **Splitting.** A row whose label and values might not fit together at the narrowest promised width
  (343 px, ADR 009) puts its values on their own line, at every width, so the bytes never depend on the
  page: split when `(label + values + 2) × 8 > 343` characters-to-pixels. 8 px is a ceiling of the
  measured widest average glyph at 13 px Montserrat (a wide face): 7.55 px Chromium, 7.81 Firefox, 7.84
  WebKit.
- **Truncation.** A label longer than `floor(343 / 8) = 42` characters (40 for a `part`) is cut to fit with
  `…`.
- **The row is the accessible unit.** Each row is a `<g>` whose `<title>` carries the full label, the
  base and earned values and the rate — the label, both bars and the rate share it, and hovering any of
  them shows it. This is how ADR 006's "every mark gets its own `<title>`" is met for the funnel.
- **Zero line.** When any value is negative, a hairline at zero is drawn beside each row's bars only, so it
  never runs through a label.
- **`steps` form** draws, behind each main bar, a ghost of the previous main step's value — the drop-off
  read — in `currentColor` at 0.12.
- **`shape` form**: centred rectangles (ADR 007), labels and values on the label line as in `bars`.

## Consequences

- Text is in px: a page that overrides the font size through CSS voids the layout promise (rows are
  spaced for 13 px). Font family and colour are the page's.
- Very long labels lose their tail on screen but never in the row's `<title>` or the data table.
- The estimate is conservative: rows split sooner than strictly needed at desktop widths. Measured on
  the playground, this costs one extra line on money rows with long labels and nothing on count rows.

## Addendum (M3 review, 2026-10-08)

- The legend is followed by an 8 px gap before the first row (missing from the table above).
- The estimate is for Latin and Cyrillic. Wide scripts (CJK runs about 13 px a glyph at 13 px) and
  emoji are outside the 375 px promise: their rows may overflow on a phone.
- Truncation counts UTF-16 code units but never cuts between the two halves of a surrogate pair: when
  the cut lands after a high surrogate it backs off one unit, so an emoji is dropped whole, never split
  into a replacement character.
- In a chart where any step has `earned`, every base bar is light, a step without `earned` included:
  a solid bar means "earned" everywhere in that chart, as the legend says.
- The `steps` ghost belongs to a block: a `gap` starts a base of another kind and resets it, and no ghost
  is drawn for a previous value that is not positive.

## Addendum (1.2.0, 2026-10-11): the rate inline

The first consumer asked for a shorter funnel: five count steps (clicks → registrations → first, second
and third deposits) with a rate on every step but the first spend much of their height on rate lines,
and the zero steps have nothing else to show.

**`rates?: 'above' | 'inline'`.** `'above'` is the table above and the default; a chart without the
option, or with `'above'`, keeps its 1.x bytes and ids. `'inline'` moves the chip onto the label line:

- **Before the values**, as a muted `<tspan class="…-rate">` inside the value text, then an en space,
  then the value(s): `↓ 7.8%  410`. Values stay end-anchored at `x=100%`, so they still line up as a
  column. Same size and weight as the chip above (12 px muted; `steps`: 13 px semibold); every form.
- **No rate line**: a rated row is 16 px shorter (20 in `steps`). The consumer's five steps: 264 → 200 px
  (`steps`: 280 → 200).
- **The split estimate counts the chip**: `rate.length + 3` characters (arrow, space, en space). A row
  that fits without it may split with it; the label is never cut to make room, since truncation looks
  at the label alone.
- The row's `<title>` still carries the rate; `null` is still `↓ —`.
- The option enters the id key only when `'inline'`, so the default keeps its ids.

**Why before the values, not after the label** (the consumer's sketch, `Registrations ↓ 7.8%`): the
label side needs the core's shared label line to take a suffix and cut the label shorter by the chip —
a core change shared with the waterfall, against 71 B of headroom in the core budget. Before the values
it is a funnel-only change: the chip joins the value text the split already measures. Cost, measured
with `npm run size`: `charts-funnel.js` 1935 → 2037 B gzipped (budget 2176); the core unchanged.
