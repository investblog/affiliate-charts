---
type: decision
status: accepted
date: 2026-10-08
tags: [layout, text, funnel, a11y]
project: charts-lite
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
