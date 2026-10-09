---
type: decision
status: accepted
date: 2026-10-09
tags: [share, donut, colour, dataviz]
project: affiliate-charts
---

# 017 — part to whole: a fixed palette of six, a 100% bar or a donut

## Context

`share` shows parts of a whole — clicks by device, deposits by geo. Every part needs its own colour, up
to six, and ADR 015 showed that one brand yields two colours that pass the dataviz checks, not six.

## Decision

**Colour: the dataviz reference categorical palette, slots 1–6, per theme — `brand` is not used.**

| Slot | light | dark |
|---|---|---|
| 1 blue | `#2a78d6` | `#3987e5` |
| 2 orange | `#eb6834` | `#d95926` |
| 3 aqua | `#1baf7a` | `#199e70` |
| 4 yellow | `#eda100` | `#c98500` |
| 5 magenta | `#e87ba4` | `#d55181` |
| 6 green | `#008300` | `#008300` |

Slots go by the part's index: the colour follows the caller's order, so a caller that keeps its parts
in a fixed order keeps their colours. Three light slots sit under 3:1 on light surfaces (aqua, yellow,
magenta): the dataviz relief rule applies, and the chart always ships its relief — every part has a key
line with its name and its value. `share` is the one module that ignores `brand`; a page recolours a
slot through `-part-1` … `-part-6`.

**At most six parts in either form**, a hard cap: fold the tail into "Other". Six is where the
palette's adjacent pairs and the donut's ring closure (slot 6 beside slot 1) were measured.

**The 100% bar** (default): one 24 px bar, each part a `rect` at its share of the width in percent, and
at each boundary between two parts a 2 px `line` of the theme's surface — the 2 px gap the dataviz
spacer asks for, without a pixel width that percent cannot express. (A surface stroke on every part was
tried first: it also framed the whole bar, visibly on the cabinet's dark card, `#1f262c` against the
reference `#1a1a19`.) Then the key, one line a part: a swatch, the name, the `display`.

**The donut**: 160 px, centred in a square nested `<svg viewBox="0 0 100 100">` (the default `meet`
scales a circle evenly). Each part is a `<circle r="40">` stroked 16 units wide with a dash of its
share of the circumference, less a 1.25-unit gap (2 px at 160 px), starting at 12 o'clock and running
clockwise. No text in the hole: a total is not the caller's string. Then the key.

**Values.** Parts are not negative (a share of a whole cannot be); a zero part keeps its key line and
draws nothing; all parts zero throws — nothing to share. Shares are positions; the text is the caller's.

## Measurements (2026-10-09)

Through the dataviz validator on ADR 011's six surfaces:

- slots 1–6, adjacent pairs and the ring closure 6↔1: all pass; worst CVD ΔE 9.1 light, 8.4 dark;
  normal vision 19.6 light, 19.3 dark.
- the brand as slot 1 with fixed slots 2–6 (the alternative that keeps `brand`), its pairs with slots 2
  and 6, ten brands: fails for five of ten in both themes — green `#16a34a` against slot 6 (CVD ΔE 2.5,
  normal 3.6 on light), brown `#9a3412` against slot 2 (2.6 / 3.1 on dark), red `#e11d48`, amber
  `#f59e0b` and yellow `#facc15` against orange (normal 9.2–14.6 on dark). The two blues, violet, cyan
  and teal pass. Rejected: a palette that changes with the brand could not be checked ahead.

## Consequences

- A cabinet whose brand is one of the six hues sees it among the parts; that is the price of a checked
  palette.
- The ids take the raw values: two part sets with the same proportions draw the same chart.
