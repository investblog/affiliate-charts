---
type: decision
status: accepted
date: 2026-10-08
tags: [colour, csp]
project: affiliate-charts
---

# 005 — colour through presentation attributes and class hooks

## Context

Siblings colour their pictures from `brand` and some put CSS inside the SVG (roulette-lite 006,
motion via an inline `<style>`). The first consumer runs `style-src 'self'`, which blocks both
`style=""` and `<style>`. The consumer also has its own design tokens and dark theme and wants the
chart to match its table.

## Decision

- Default colours are **presentation attributes** (`fill="…"`, `stroke="…"`), derived from `brand` by
  the family's LCh engine (roulette-lite 004), or a neutral default when no `brand` is given.
- Every mark and text node carries a stable class hook (`<prefix>-<role>`). The core defines the shared
  roles (`-label`, `-value`, `-legend`, `-grid`, `-axis`); each module lists its own in its spec
  section (for the funnel: `-bar`, `-bar-part`, `-bar-earned`, `-bar-loss`, `-rate`). Hooks are part
  of the output contract (ADR 003): renaming one is a breaking change. A page stylesheet overrides the
  attribute through the class — CSS beats presentation attributes in the cascade.
- Never `style=""`, never `<style>`, never a `data:` URI, never `<script>`.

## Consequences

- No motion in v0.1: the family's CSS-in-SVG animation is not available under this CSP.
- A Node test at M3 asserts the absence of `style=`, `<style`, `<script`, `data-` and `data:` in
  every rendered fixture.
- `Charts.palette(brand)` exposes the derived colours so a page can paint its table to match.
