---
type: note
status: active
tags: [decisions]
project: affiliate-charts
---

# Decisions (ADRs)

One file per decision, numbered, immutable once accepted — supersede, don't edit. Format:
context → decision → consequences.

- [001 — adopt the family ADRs](001-adopt-family-adrs.md)
- [002 — a hand-written chart library, not a general package rendered elsewhere](002-hand-written-library.md)
- [003 — input is data, not a seed](003-input-is-data.md)
- [004 — text in the output; values from the caller, ticks through a callback](004-text-in-output.md)
- [005 — colour through presentation attributes and class hooks](005-colour-via-classes-and-brand.md)
- [006 — accessibility is part of the contract](006-accessibility.md)
- [007 — the funnel: units per call, base and earned on one scale, three forms](007-funnel.md)
- [008 — a core plus one file per chart](008-core-and-modules.md)
- [009 — width from the page: marks in percent, text in pixels](009-percent-layout.md)
- [010 — the funnel row: labels, values, rates, truncation](010-funnel-anatomy.md)
- [011 — the palette: OKLCH from `brand`, `currentColor` for everything else](011-palette.md)
- [012 — size budgets, frozen per file for 0.1.0](012-size-budgets.md)
- [013 — the package is `affiliate-charts`](013-package-name.md)
- [014 — the waterfall: rows, a ghost of the running total, three colour roles](014-waterfall.md)
- [015 — the series: lines in a stretched box, ticks on the gridlines, at most two series](015-series.md)
- [016 — the sparkline and the KPI tile](016-spark-and-tile.md)
- [017 — part to whole: a fixed palette of six, a 100% bar or a donut](017-share.md)
- [018 — the heatmap and the cohort: a five-step ramp of the brand, rows as labelled lines](018-heatmap.md)
- [019 — the sankey: short tags beside the nodes, the names in a key, one colour](019-sankey.md)
- [020 — the pre-release review: what it found and what changed](020-review-fixes.md)
- [021 — the series: the caller's second colour, and a gutter in percent](021-series-second-and-gutter.md)
