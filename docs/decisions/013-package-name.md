---
type: decision
status: accepted
date: 2026-10-08
tags: [packaging, naming, npm]
project: affiliate-charts
---

# 013 — the package is `affiliate-charts`

## Context

The family names a library by its subject with a `-lite` suffix (`slots-lite`, `roulette-lite`), and
learns whether npm accepts a name only at the first publish: npm refused `slots-lite` as too similar to
`stats-lite` although `npm view` reported it free the same morning (slots-lite 002). This library was
built under the working name `charts-lite`. Its first consumer asked for the name to be fixed by an ADR
before the first publish, because it pins the exact version.

The library is meant to be found by people building affiliate dashboards. A generic `charts-lite` says
nothing about the domain, and npm search ranks words in the package name.

## Decision

User decision, 2026-10-08: the package and the repository are **`affiliate-charts`**
(`investblog/affiliate-charts`).

- The two words people search for are in the name; the name covers the whole catalog, not only the
  funnel. `funnel`, `igaming`, `ggr`, `csp`, `svg` and similar go to `keywords` and the description.
- It leaves the family's `-lite` suffix: the suffix adds nothing to search, and the family membership is
  stated in the README and ADR 001.
- Checked on 2026-10-08 with `npm view`: `affiliate-charts` and its neighbours (`affiliate-chart`,
  `affiliatecharts`, `affiliate-charts-js`, `affiliate-charts-lite`, `affiliate-funnel`) are all free, so
  the similarity guard has nothing near it to match. That is evidence, not proof: the guard runs only at
  the publish. If npm refuses, the fallback is `@spintax/affiliate-charts` (the family's scope), recorded
  as an addendum here.
- Unchanged: the files (`charts.js`, `charts-<form>.js`) and the page global `Charts`. Error messages now
  start with `affiliate-charts:`; this replaces the `charts-lite:` prefix and import paths written in
  ADR 008 and the working name in ADR 001, which stay as they were when accepted.

## Consequences

- Imports read `affiliate-charts/charts-funnel.js`.
- The local folder `C:\projects\libs\charts-lite` keeps its name for now; the repository name is what
  the public sees.
