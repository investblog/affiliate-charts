---
type: decision
status: accepted
date: 2026-10-09
tags: [spark, tile, kpi, colour, dataviz]
project: affiliate-charts
---

# 016 — the sparkline and the KPI tile

## Context

Group B's last module: a sparkline for a table cell, and a KPI tile (EPC, CR, ARPU, first deposits) —
a label, a value, an optional change against a period, an optional trend. Both are mostly text, and
text cannot be measured (ADR 009), so their layout is fixed by the narrowest place they are promised to
fit. A change is coloured by whether it is good, which is a status colour, not a series colour.

## Decision

**The sparkline** (`spark(values, options)`): 32 px high, the page's width. One 2 px line through points
at band centres in ADR 015's stretched box, `null` breaking it and a lone point drawn as a dot; the last
point with data gets ADR 015's 8 px end dot. Its scale is **the values' own minimum and maximum**, not
zero: a sparkline shows a shape, and its line positions are not lengths (bars and columns keep zero —
spec, *Signs*). Equal values draw a flat line in the middle. Brand solid, no axis, no text: the values
have no caller strings, so there is nothing to show beyond the accessible name.

**The tile** (`tile(tile, options)`): one SVG, top to bottom:

| Line | px | Content |
|---|---|---|
| label | 18 | 13 px at 0.7; cut at 20 characters with `…`, the whole label in the text's `<title>` |
| value | 34 | 26 px, weight 600, the caller's string, never cut |
| delta | 22 | 13 px: `▲` or `▼` and the caller's `display`, in the change's colour; `flat` has no arrow and the page colour |
| trend | 4 + 32 | a sparkline in the page colour at 0.35, the last point's dot in the brand: the current period is the accent |

A tile is promised **160 px**: two tiles a row on a 375 px screen. 20 characters at ADR 010's 8 px fit;
a value of up to 10 characters at 26 px fits (`18 400.00`, `€12.9K`). The value is a number the caller
formatted and is never cut — keeping it short is the caller's part.

**Colour of a change: direction × good.** `good: true` is green, `false` red, whichever way it moves —
a falling CPA is good. The hues are the dataviz status pair (good `#0ca30c`, critical `#d03b3b`), fitted
like the brand to the theme's band and 4.5:1 as text. Never colour alone: the arrow and the caller's
signed string say it again.

## Measurements (2026-10-09)

The fitted pair, through the dataviz validator on ADR 011's six surfaces:

- light `#008700` / `#d03b3b`: text 4.58 / 4.68 on `#fcfcfb`, 4.30 / 4.39 on `#f3f5f6`, 4.70 / 4.80 on white;
  dark `#0ca30c` / `#e5504d`: 5.19 / 4.63 on `#1a1a19`, 4.56 / 4.07 on `#1f262c`, 5.38 / 4.80 on `#11171c`.
  Below 4.5 only on the cabinet's cards, as the brand's solid mark (ADR 011: 4.5 is held on the reference
  surface).
- the pair: normal vision ΔE 31.8 light, 33.6 dark; deuteranopia ΔE 4.7 light, 3.3 dark — a FAIL, as
  every red/green pair: `#16a34a`/`#dc2626` 7.1 and 4.5, `#15803d`/`#b91c1c` 4.2 and 6.8. Accepted
  because the colour is never the carrier: the arrow is (the dataviz status rule: icon + label).

## Consequences

- `good` is required with `up` and `down`; the library never guesses whether a rise is good.
- A page whose cards differ from the reference surfaces overrides the colours through `-delta-good`
  and `-delta-bad`.
- The sparkline repeats ADR 015's line code rather than sharing it through the core, until a
  measurement says sharing is smaller (ADR 012).
