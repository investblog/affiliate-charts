---
type: decision
status: accepted
date: 2026-10-09
tags: [series, layout, colour, dataviz, axis]
project: affiliate-charts
---

# 015 — the series: lines in a stretched box, ticks on the gridlines, at most two series

## Context

`series` is the first chart with a value axis and an x axis, and the first that needs more than one
categorical colour. ADR 009 holds: marks in percent of the page's width, text in pixels, bytes that do
not depend on the page. A `path` or `polyline` cannot take percentages, tick and x labels cannot be
measured, and every colour still comes from one `brand`.

## Decision

**Lines in a stretched box.** The plot is a nested `<svg width="100%" viewBox="0 0 100 H"
preserveAspectRatio="none">`, H the plot's pixel height: x in percent of the width, y in pixels. Lines
are `<polyline>`s with `vector-effect="non-scaling-stroke"` (a presentation attribute), so the stroke
stays 2 px however far the box is stretched. Dots are `<circle cx="…%">` outside the box, so they stay
round. Columns are nested `<svg>`s with percent x and width, as ADR 009's bars, rounded at the data end.

**Points sit at band centres.** N points split the width into N bands; a point, a column group and a
hover target sit in band *i*, the point at its centre. Nothing is drawn at 0 % or 100 %, where a dot or
a column would be clipped half.

**`null` is no data.** It breaks a line into runs (never bridged), draws no column, and a run of one
point is drawn as a dot, so a lone day stays visible.

**One value axis, the ticks on the gridlines.** The scale is over zero and every value drawn (both
series, the comparison period, stack totals), widened to "nice" steps (1, 2 or 5 × 10ⁿ, about four
intervals). Each gridline carries its tick text above it at `x=0`, so the labels take no width from the
plot. The plot then starts at the chart's left edge, under the tick text: the text is drawn after the
marks, with a 3 px halo of the theme's surface (`stroke` + `paint-order="stroke"`, presentation
attributes), so the first column or a line cannot hide it — seen on the playground, where the first
column covered the `0` and the `500`. Tick text is the caller's `format(v)`; the default is the core's `n(v, 6)` — `n(v)` as ADR 004
names it rounds to an integer and would print a 0.25 step as `0`. All values zero or `null`: one tick, 0.

**x labels: first, last, and what fits at 343 px.** The first and the last label are centred under their
point when the label (8 px a character) fits in one band at 343 px; otherwise the first is start-anchored
at `x=0` and the last end-anchored at `100%`, so neither is clipped. Between them labels at band centres every *k*-th point, *k* chosen so the
longest label (8 px a character, ADR 010's estimate) plus a 12 px gap fits at the narrow width — the same
labels at every width. Every point's `x` is in its hover `<title>`.

**The last value is in the key, not at the dot.** Above the plot one line per series (and one for the
comparison period): a swatch, the name, and the last point's `display` end-anchored at `100%` — ADR 010's
label line, so the cut and the split are the funnel's. A direct label beside the end dot would sit on the
line itself whenever earlier values are higher. A last point with no data shows an em dash, as a `null`
rate does.

**Hover is `<title>`, never script.** Each point has a transparent hit band the full plot height with a
`<title>`: `x: name display`, one entry per series, the comparison period last. `init` stays
`innerHTML` (ADR 008).

**Colour: at most two series.**

| Role | Mark |
|---|---|
| series 1 | the brand's solid mark |
| series 2 | the brand's opposite hue (ADR 014's decrease), fitted like the solid |
| comparison period | `currentColor` at 0.35, under the series, never dashed |
| area | the series colour at 0.1 under its 2 px line |

A third series is not offered: no third colour derived from one brand passes the dataviz checks on
every brand and surface (below). More measures are more charts — small multiples, the caller's call.

**Columns grouped, or stacked on the caller's word.** Two series side by side in their band (GGR and
commission are nested amounts; a stack would count the same money twice). `stacked: true` asserts the
parts add up; negative parts then throw — a stack across zero has no honest reading.

## Measurements (2026-10-09)

- **Stretched lines,** a polyline with a horizontal and a vertical segment in a `viewBox="0 0 100 160"`
  box, Chromium, Firefox and WebKit, 375 and 1280 px: without `vector-effect` the vertical segment is
  7 px and 26 px wide; with it 2 px at 1280 and 2 px split over two pixels at 375 (x on a half pixel),
  the horizontal segment 2 px everywhere. `<circle cx="80%">` lands at 80 % with an 8 px box in all three.
- **Colour,** the ten brands of ADR 011 on its six surfaces through the dataviz validator, all pairs
  (lines cross):
  - solid + opposite: CVD and normal-vision pass on all 60, worst CVD ΔE 11.2, normal 21.3 (the teal
    chroma exception of ADR 014 stays).
  - a third slot as a hue turn of the solid at its lightness: 39–60 of 60 fail for turns of 60°, 90°,
    120°, 240°, 270°; worst CVD ΔE 0.7–1.1.
  - a third slot at any in-band lightness, turns every 15°: none passes all 60; the best leaves 3 of 30
    per theme in the CVD warn band and needs a different turn in light (90°) and dark (270°), so a
    series would change hue with the theme.
  - a third slot as the light mark of the solid or of the opposite: normal-vision ΔE under 15 for the
    red, cyan, blue and violet brands on some surface (worst 13.3).

## Consequences

- `names` takes one or two entries; the spec's open count is narrowed.
- The ring around an end dot and the halo behind tick text are the theme's reference surface (ADR 011);
  a page on another surface overrides them through `-dot` and `-tick`.
- Firefox counts a text's stroke in its client rect (measured: the halo moves a tick's box 2.5 px left
  and 2 px down); the browser gate measures haloed text by its fill geometry (`getBBox`).
- At 30 points and two grouped series a column is about 4.5 px wide at 375 px, and the percent gap
  inside a band under 1 px. Accepted: the hover band, not the column, is the target.
