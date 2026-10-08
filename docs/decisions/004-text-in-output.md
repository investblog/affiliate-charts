---
type: decision
status: accepted
date: 2026-10-08
tags: [api, text, i18n]
project: affiliate-charts
---

# 004 — text in the output; values from the caller, ticks through a callback

## Context

The family keeps digits and text out of its pictures so they do not depend on a font. A chart is
unreadable without labels and values. Affiliate cabinets are localised (currencies, thousands
separators and decimal marks differ by locale) and already format every number for their tables.
Axis ticks are different: their values are chosen by the library (nice round numbers on a scale), so
the caller cannot pre-format them without reimplementing the scale.

## Decision

- Labels and values are drawn as `<text>` with **no** `font-family`, so they inherit the page's font.
- **Values shown next to marks** — `display`, `rate`, legend entries, `title`, `desc`, tile values and
  deltas — are passed in already translated and formatted. The library derives positions, never text: no
  rate, total, share, delta or sign is shown that the caller did not pass, and no step it was not given.
- **Numbers the library itself chooses** — axis tick values, scale-legend stops — are formatted by
  the caller's `format(v) → string` option. Without it the default is the core's `n(v)` string (the
  rounding helper ported from slots-lite: no `-0`, no exponent), so output stays byte-deterministic.
  The library has no locale and does not use `Intl`.
- All text, including the callback's output, is escaped for `& < > " '`. slots-lite's `esc()` leaves
  `'`; this library adds it, because labels arrive from user data (campaign names, sub-ids).

## Consequences

- Determinism with a callback is the caller's responsibility: a callback that depends on time or
  environment breaks byte stability, and the docs say so.
- Text width cannot be measured by a pure function. Layout that depends on it (long labels, value
  inside vs outside a bar) is decided on the playground — questions O2 and O3 in the spec.
- The escaping test feeds every special character through every text slot, the callback included.
