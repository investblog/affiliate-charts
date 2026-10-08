---
type: decision
status: accepted
date: 2026-10-08
tags: [layout, responsive, svg]
project: charts-lite
---

# 009 — width from the page: marks in percent, text in pixels

## Context

Spec question O1. The family draws into a fixed `viewBox` (roulette-lite 002): the picture scales as a
whole. A chart scaled that way shrinks its text on a phone — at 375 px a 13 px label becomes ~5 px.
Three constraints decide the answer:

1. text readable at 375 px;
2. `init()` stays "innerHTML, nothing else" — no resize logic, so the markup cannot depend on the
   container's width;
3. bytes depend on `(data, options)` only (ADR 003, roulette-lite 010).

A fixed `viewBox` fails (1). A caller-passed pixel width fails (2) — the page would re-render on every
resize — and weakens (3).

## Decision

- The root `<svg>` has `width="100%"`, a fixed pixel `height`, and **no `viewBox`**.
- Marks are laid out in percentages of that width: SVG lengths on `rect`, `line`, `text` and nested
  `<svg>` accept `%`, relative to the nearest viewport. Text sits at pixel positions (`x="0"`, or
  `x="100%"` with `text-anchor="end"`) and keeps its pixel size at every width.
- **A bar** is a nested `<svg x="…%" width="…%">` (it clips by default) holding a full rect with a 4px
  radius and a 4px square over the baseline side: a rounded data end and a square baseline end without
  a `path`, which cannot take percentages. `opacity` sits on the nested `<svg>` — group opacity — so the
  overlap of the two rects is not darker.
- The `width` option is removed from the contract: a page sizes a chart through its container.
- The layout promises **375 px screens** — 343 px of content after 16 px gutters. Below that text may
  leave the chart (measured: a 41-character label leaves at 320 px).

## Measurements (playground, 2026-10-08)

- One rect at `x="20%" width="37.5%"` in a `width="100%"` root, Chromium: at 375 px, 68.6 px / 128.6 px
  (expected 68.6 / 128.6); at 1280 px, 249.6 / 468.0 (expected 249.6 / 468). Text height 17 px at both.
- The funnel playground (counts, Cyrillic labels with zeros and a null rate, steps, money with negative
  values and losses, shape) at 375 and 1280 px, light and dark, in **Chromium, Firefox and WebKit**: no
  text overlaps, no text outside the chart (2–3 px slack, because Firefox measures text by the font's
  full box), no console errors.

## Consequences

- Every chart's height is fixed for given data; nothing reflows on resize, and nothing needs to.
- Layout that depends on text width (long labels, values beside marks) cannot measure — ADR 010
  decides it by a conservative estimate at the narrowest promised width.
- `svg:not(:root)` clips its overflow, so nothing may be drawn past a bar's own box.
