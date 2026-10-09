# Changelog

## Unreleased

- The waterfall (`charts-waterfall.js`): totals from zero, deltas floating from the running total with a
  ghost of it behind them; totals in the brand, an increase in its lighter mark, a decrease in the
  opposite hue (ADR 014).
- The core: the row's label line is shared by the funnel and the waterfall (the funnel's bytes are
  unchanged); its palette can turn the brand's hue. Size budgets re-frozen (ADR 012).
- The daily series (`charts-series.js`): lines, an area or columns (grouped or stacked) at band centres,
  `null` as a break, a comparison period, one value axis with nice ticks through `format`, at most two
  series — the brand and its opposite hue (ADR 015).
- Sparklines and KPI tiles (`charts-spark.js`): a 32 px sparkline on its own min and max; a tile of label,
  value, a change coloured by direction × good with its arrow, and a trend (ADR 016).
- Rankings (`charts-rank.js`): one bar a row in the caller's order, negatives left of zero, one colour,
  an optional `highlight` with the rest in grey.
- Part to whole (`charts-share.js`): a 100% bar or a donut, up to six parts, in a fixed palette of six
  per theme checked for colour blindness — the one chart that ignores `brand` (ADR 017).
- Heatmaps and cohorts (`charts-heatmap.js`): a grid or a cohort triangle in five steps of the brand's
  hue, `null` as a dash, absent future cells not drawn, values in cohort cells when they fit (ADR 018).
  The core gains `shade` for the ramp.
- Meters (`charts-meter.js`): progress to a tier or a cap, a fill on a lighter track of the brand, tier
  marks as hairlines named on hover.
- Flows (`charts-sankey.js`): two to four columns of up to eight nodes, ribbons to the next column, short
  tags beside the nodes and the names in a key, one colour (ADR 019).
- The demo picks any of the ten charts.

## 0.1.1 — 2026-10-08

- Documentation only; the library's bytes are unchanged. The README gains npm and licence badges, the
  live demo link, a preview picture drawn by the library, and jsDelivr install lines; it names the
  publisher (301) and the sponsor (OktagonBet Partners). The npm homepage is the live demo.
- The demo's shape form no longer throws on money funnels or on part steps.
- The first release through the OIDC Trusted Publisher (`release.yml`).

## 0.1.0 — 2026-10-08

- The core (`charts.js`): the shared SVG builder, an OKLCH palette fitted to a light or dark surface,
  `init` and `palette`.
- The funnel (`charts-funnel.js`): `bars`, `steps` and `shape` forms; base and earned bars on one
  scale; `part` steps, losses and negative values on the same scale; gaps between blocks; rate chips;
  an accessible title per row.
- Renders under `default-src 'self'`; checked in Chromium, Firefox and WebKit at 375 and 1280 px.
