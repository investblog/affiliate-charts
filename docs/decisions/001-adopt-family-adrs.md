---
type: decision
status: accepted
date: 2026-10-08
tags: [process]
project: affiliate-charts
---

# 001 — adopt the family ADRs

## Context

charts-lite is the seventh library in the family and the fourth that emits an SVG string. Re-deriving
decisions the family already paid for would waste the payment. It is also the first member whose input
is data rather than a seed, so a few inherited decisions change shape; those changes are their own ADRs.

## Decision

Adopted by reference from roulette-lite:

- **002** — an SVG string, not a canvas; a pure function that touches no DOM; `init()` is a thin
  browser helper.
- **004** — palette derived from `brand` in CIE LCh (the hexagons 002 engine), reused rather than
  re-tuned.
- **005** — no signature in the output: no comments, no `data-*`, no library or credit names; ids and
  classes are derived tokens. Its addendum allowed fixed `#000`/`#fff` shading as a stated exception;
  this library starts **without** that exception.
- **007** — module format: ES5 IIFE with a UMD tail; no `type`, no `exports` in `package.json`; a
  hand-written `.d.ts`; minified files are generated and never committed. The family ships one file;
  this library ships a core plus one file per chart, each in that format — ADR 008.
- **008** — Node tests alongside a browser verification page.
- **009** — size is measured with terser in process and Node `gzipSync` level 9, against
  `package.json` `config.sizeBudget`. The budget is provisional and frozen at measured + margin when
  drawing is done (as slots-lite 007).
- **010** — output stability is a contract: within a minor version the same input gives
  byte-identical SVG; consumers pin the exact version.

From cards-lite: the M5 rule that a check is trusted only after it has been seen red, mechanised by
`--mutate`.

From further up the family: contract-first, `author: 301st`, OIDC trusted publishing after a one-time
token bootstrap, ESLint 10, and "gzip beats clever — trim only by measurement".

Tooling is ported from slots-lite v0.1.0 (`package.json` scripts, `scripts/size.mjs`,
`eslint.config.js`, the UMD wrapper and its `n()` number helper).

## Consequences

- Where this project extends an inherited decision it does so in its own numbered ADR and cites the
  parent rather than editing it: 003 (input is data), 004 (text in the output), 005 (colour through
  classes), 006 (accessibility), 007 (the funnel), 008 (core + modules), and 002 (an exception to a
  library rule).
- The package and global name are decided at the first publish (M5); `Charts` / `charts-lite` are
  working names until then.
