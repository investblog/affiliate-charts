---
type: decision
status: accepted
date: 2026-10-09
tags: [waterfall, layout, colour, dataviz]
project: affiliate-charts
---

# 014 — the waterfall: rows, a ghost of the running total, three colour roles

## Context

The money flow from GGR to the partner's commission (GGR → −bonuses → −fees → NGR → −platform and
network share → commission) is a waterfall: totals stand on zero, each delta floats from where the
running total stands. The spec fixed the data shape (`kind: 'total' | 'delta'`) and three intents:
totals in the brand hue, increase and decrease as a pair of opposite temperature (never status green
and red), connector hairlines between bars.

Two of those meet ADR 009 badly:

- **Vertical columns** put each label under its column, at a percent position. Six columns on a 375 px
  screen leave about 55 px a label; "Revenue — GGR" does not fit and cannot be measured.
- **Connectors** in a stack of rows run from one bar's end to the next bar's start, through the label
  line between them. Most running totals end near the right edge, where the values are end-anchored: the
  hairline would cross the value text on most rows. The funnel's zero line was moved out of the label
  line for the same reason (ADR 010).

## Decision

**Rows, as the funnel.** One row a step, with ADR 010's anatomy: label line (label at `x=0`, value at
`x=100%`, the same split and truncation rules), then a 12 px bar after 2 px, then 10 px padding. No rate
line, no blocks, no legend. The waterfall reuses the core's `bar`; the row constants and the label
rules are the funnel's numbers, held in whichever file gzip measures smaller (ADR 012 addendum).

**No connectors: a ghost of the running total.** Behind each delta the row draws the running total
before it, from zero, in `currentColor` at 0.12 (the funnel's `steps` ghost). The delta then visibly
extends the ghost or bites into it, so where it starts needs no line, and nothing crosses text.

**Positions.** A total is a bar from zero to its value. A delta floats from the running total to the
running total plus the delta; the running total is the last total plus every delta since. The library
does not check that a total equals the sum before it — the caller's totals are the truth, and a mismatch
is visible against the previous row: the total's end does not line up with the end of the delta above. One scale over zero and every bar's two ends, so a
negative total, or a delta that crosses zero, grows left of a zero line drawn per row (ADR 010).

**Colour, measured (below).**

| Role | Mark | Why |
|---|---|---|
| total | the brand's solid mark | the amounts the chart is about |
| increase | the solid at 0.6 (the light mark) | the same hue as the total it adds to — the funnel's light/solid pair |
| decrease | the brand's **opposite hue** (OKLCH hue + 180°), fitted like the solid: same band, 4.5:1 | opposite temperature by construction, for any brand |

The core's `palette` takes the hue turn as a third argument; `Charts.palette` stays two-argument.

**No legend.** Colour is never the only carrier: every row names itself, its `display` carries the sign,
a total starts at zero and a delta floats against its ghost, and a decrease grows left and an increase
right. A legend would repeat that. (The dataviz rule "a legend for two or more series" is about series a
reader must match to marks; here every mark is labelled on its own row.)

## Measurements (2026-10-09)

The ten brands of ADR 011 on its three light and three dark surfaces, through the dataviz validator.

- **Increase vs decrease** (light brand over the surface vs the opposite solid): CVD and normal-vision
  separation pass for every brand and surface except the red brand `#e11d48` on light surfaces —
  protan ΔE 5.3–6.7 (WARN band, one FAIL at 5.3 on `#f3f5f6`); normal vision 28.2–29.0. Accepted:
  direction and the signed `display` encode it again.
- **Total vs decrease** (both solid): pass on every brand and surface; worst CVD ΔE 11.2.
- **Decrease mark alone:** lightness band and ≥ 3:1 pass everywhere (it is fitted to 4.5:1). Chroma
  falls below 0.10 for the teal opposites of red-brown brands (`#e11d48` → `#008184` 0.093,
  `#9a3412` → `#00667a` 0.084 on light; `#0b9194` 0.100, `#398ea4` 0.087 on dark): at 4.5:1 the sRGB
  gamut allows no more teal — ADR 011's light-cyan exception, the same cause.
- **Increase mark:** ≥ 2:1 on every surface (worst 2.16:1), as ADR 011's light mark.

Rejected, by the same tool: increase and decrease both as light marks (normal-vision ΔE under 15 for
`#0891b2` and `#9a3412` on light and dark surfaces, protan ΔE 6.1 for `#e11d48`); decrease as the
losses grey (`currentColor` 0.35) against a light increase (normal-vision ΔE under 15 for eight of ten
brands on light surfaces, CVD ΔE 2.1–5.7 for the cyan, teal, green and red ones).

## Consequences

- The spec's connector hairlines are replaced by the ghost; the class hook `-bar-ghost` is shared with the
  funnel.
- A page that recolours one role through its class hook (`-bar-total`, `-bar-up`, `-bar-down`) owns that
  contrast.
- `format` is unused: the waterfall draws no ticks, as the funnel.
