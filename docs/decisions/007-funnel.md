---
type: decision
status: accepted
date: 2026-10-08
tags: [api, funnel, dataviz]
project: affiliate-charts
---

# 007 — the funnel: units per call, base and earned on one scale, three forms

## Context

An affiliate funnel mixes units. Clicks and registrations are counts. Deposits, first deposits and
revenue carry two money numbers each: the base of the event (deposit sum, the platform's GGR) and the
partner's commission from it. Showing one instead of the other misleads both ways: the base overstates
earnings, the commission hides volume. Some numbers do not exist in a given programme (NGR, when the
platform does not send it). Money can be negative: GGR and revenue-share commission go below zero in a
period where players win; cancellations are negative by meaning.

Steps are not additive (unique clicks are inside clicks; second, third and later deposits are inside
deposits), and putting counts and money on one scale, or on two y-axes, is the most common chart
mistake.

## Decision

User decision, 2026-10-08, refined after review the same day:

- **Units per call.** A consumer calls `funnel()` once for counts (clicks → unique clicks →
  registrations → first deposits) and once for money. The library knows nothing about units.
- **One scale per chart, losses included.** Main steps and the losses block share the scale, so 40
  cancellations next to 100 deposits look like 40 next to 100 — a separate losses scale would make
  −450 look as big as 100 000. The scale includes zero and both signs: negative values grow left of a
  zero line, positive right. Nothing is clamped.
- **Base and earned as a pair.** A step may carry `earned: { value, display }`. Within the step's row
  the base bar (light) sits with the earned bar (solid) directly below it, both from the zero line,
  never nested: a CPA payout can exceed the deposit it was paid for. Earned on a `part` step implies
  nothing about the parent's earned value. A legend is required when any step has `earned`.
- **`part`** is a subset of the nearest preceding main step, so several parts in a row (2nd, 3rd,
  later deposits) are siblings, not a chain.
- **`rate`** is a caller string with no implied denominator (programmes compute conversions against
  different steps). `undefined` → no chip; `null` → em dash, never `0%` (a zero denominator means
  "nothing to count from", not "no conversion").
- **Three forms.** `bars` (default); `steps` — the rate chips emphasised between rows; `shape` — the
  classic funnel as centred rectangles whose width is the value, labels outside. Not trapezoids: their
  slanted edges would show values that do not exist. `shape` throws with `earned`, `part`, losses or a
  negative value.
- Bars scale to the largest |value|, never to a sum; a zero value draws a zero-length bar with its
  label; a step the caller omits is not drawn; losses must follow all main steps (else throw).

### Design rules, recorded so they do not depend on any tool

These come from a data-visualisation checklist applied when the catalog was chosen; they bind every
module, not only the funnel:

- One axis per chart; never a dual axis. Different units → separate charts, or index to a common base.
- A legend is always present for two or more series and absent for one; identity is never colour-alone.
- Bars at most 24px thick, with a 4px rounded data end and a square baseline end, growing from one
  baseline.
- A 2px surface-colour gap separates touching marks; markers carry a 2px surface ring; no strokes
  around marks.
- Lines are 2px with round joins; markers ≥ 8px; an area is a ~10% wash, single series only.
- Text uses text colours (primary, secondary, muted), never the series colour. Label selectively —
  the bar tip, the line end, the extreme — never a number on every point.
- Gridlines and axes are solid 1px hairlines, recessive, never dashed.
- Sequential = one hue light → dark; diverging = two hues of opposite temperature with a neutral
  midpoint; no value ramp on nominal categories; categorical hues in fixed order, colour follows the
  entity, at most 8, tail folded into "Other".
- Status colours (good/warning/critical) are reserved, never series colours, and always ship with a
  glyph or label.
- Donut only for part-to-whole at a glance, ≤ 6 segments, never for close values.
- Palettes are validated by computation (colour-vision-deficiency separation and contrast, in light
  and dark), not by eye; a contrast warning obliges visible labels or the table.
- Every chart has a table twin; tooltips (here: `<title>`) enhance, never gate.

## Consequences

- `FunnelStep` has `earned`, `part`, `group`, `rate`; `FunnelOptions` has `form` and `legend`.
- A consumer maps its funnel payload to two step arrays and decides which steps exist.
- In the money call the base differs per step (deposit sum, GGR): one currency, so one scale, but each
  step's label names its base, a base of another kind opens its own block after a gap (`gap: true` —
  agreed with the first consumer: GGR is a game result, can be negative, and without the gap reads as
  the next stage after deposits), and the legend names the pair generically, so bars of different
  bases are not read as the same quantity. Whole-funnel ratios (commission per click) are KPI tiles, not chips.
- The same units rule governs the series module: base and earned may share a call; counts never share
  one with money.
