---
type: decision
status: accepted
date: 2026-10-08
tags: [packaging, size, module-format, types]
project: charts-lite
---

# 008 — a core plus one file per chart

## Context

Every sibling ships one file (roulette-lite 007). This library's catalog is about a dozen forms across
four groups (spec, *Catalog*); in one file a page that draws only a funnel would carry the Sankey
layout. ES modules with tree-shaking would solve that, but leave the family's format (ES5 IIFE + UMD),
which consumers load with a plain `<script>` or `require`.

## Decision

User decision, 2026-10-08: **core + modules**, each file in the family format.

- `charts.js` — the core, global `Charts`. It starts with what the first module (funnel) needs and
  every later one will: the svg builder, `esc`, `n`, a linear scale with zero and both signs, the
  legend, the palette, `init`. Anything else (band scales, nice ticks, axes) moves into the core when a second
  module needs it; until then it lives in its one module.
- `charts-<form>.js` — one module per chart. Its UMD head takes the core from `require('./charts.js')`
  under CommonJS and from `root.Charts` in the browser, throws
  `Error('charts-lite: load charts.js before charts-<form>.js')` without it, adds its function to the
  core object, and **exports the core object**. Loading a module twice reassigns the same function.
- **Types per file.** `charts.d.ts` declares the core; each `charts-<form>.d.ts` sits next to its
  module and exports the core type extended with that module's function, so
  `import Charts from 'charts-lite/charts-funnel.js'` types `Charts.funnel` and nothing that is not
  loaded. For the page global, `charts.d.ts` declares `Charts` once as an interface and each module
  file adds its function to that interface by declaration merging — never a second `declare var`.
- Registration is a side effect: `package.json` never declares `sideEffects: false`, and the module test
  includes a bundler-style import to prove the function survives.
- `package.json` `config.sizeBudget` is a map `file → bytes`; `scripts/size.mjs` measures and checks
  each file.

## Consequences

- "Do not carry code before it is used" survives a large catalog: each file's size number is honest
  and a page pays only for what it draws.
- `.gitignore` ignores `*.min.js`; `package.json` `files` lists every module, its `.d.ts` and its
  minified twin.
- In the browser, script order matters (core first); the README says so, and the module's error says
  it again.

## Addendum (M1, 2026-10-08) — how a module reaches the core's helpers

The core hands its shared helpers to modules through one property, `Charts._`. It is not part of the
public contract: it is absent from the `.d.ts` files, its members may change in any release, and a
module checks for it (not merely for `Charts`) before registering. A module receives `_` as its
factory's argument and never reaches into it again at call time.
