---
type: decision
status: accepted
date: 2026-10-08
tags: [process, dataviz]
project: charts-lite
---

# 002 — a hand-written chart library, not a general package rendered elsewhere

## Context

Our default for interactive data visualisation is a general-purpose package (plotly), usually
rendered from Python; a hand-written JS chart is the last resort. Affiliate cabinets are often served
as static assets from an edge runtime, under the Content Security Policy `style-src 'self'`, and need
a small set of domain-specific forms.

## Decision

Build our own library in the `*-lite` family — a stated exception to that default, for three reasons:

1. **No server-side renderer.** A static cabinet on an edge runtime has no Python to call.
2. **CSP.** Plotly and most JS chart packages write `style=""` attributes or an inline `<style>`,
   which `style-src 'self'` blocks. A `data:` image survives CSP but loses per-mark hover titles.
3. **Weight.** A page that draws a funnel should not pay for a general package of tens to hundreds
   of KB (plotly is megabytes); the family's size budgets are single kilobytes per file (ADR 008).

## Consequences

- Every chart-design question the default package would have answered (marks, colour, legends) is
  answered here in an ADR instead — ADR 007 records the design rules.
- A consumer with a server-side renderer and no strict CSP is better served by the default; this
  library covers the CSP-bound static case.
