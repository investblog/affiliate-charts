# Changelog

## 0.1.0 — 2026-10-08

- The core (`charts.js`): the shared SVG builder, an OKLCH palette fitted to a light or dark surface,
  `init` and `palette`.
- The funnel (`charts-funnel.js`): `bars`, `steps` and `shape` forms; base and earned bars on one
  scale; `part` steps, losses and negative values on the same scale; gaps between blocks; rate chips;
  an accessible title per row.
- Renders under `default-src 'self'`; checked in Chromium, Firefox and WebKit at 375 and 1280 px.
