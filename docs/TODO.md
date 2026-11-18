---
type: note
status: active
tags: [backlog]
project: affiliate-charts
---

# Backlog

The milestone table is in
[README.md](README.md#milestones).

- [x] M1 — contract: `charts.d.ts` + `charts-funnel.d.ts`, core skeleton, module pattern on `funnel`, size map
- [x] M2 — playground `index.html`; decide O1–O4 (responsive text, long labels, value placement, palette)
- [x] M3 — core drawing + `funnel` (bars, steps, shape) → 0.1.0; Node + browser gates seen red
- [x] M4 — first consumer: both funnels above their tables, npm + Vite default import, CSP unchanged (consumer branch; merges after the npm version)
- [x] M5 — package-name ADR, public repo, playground on Pages, first publish (2026-10-08); Trusted Publisher, first OIDC release 0.1.1 (2026-10-09)
- [x] M6 — `waterfall` (ADR 014), Group B: `series` (line, area, columns, previous period; at most two
  series, ADR 015), `spark` / `tile` (ADR 016) — drawn and gated 2026-10-09, released in 1.0.0
- [x] M7 — Group C: `rank`, `share` (100% bar, donut ≤ 6; ADR 017), `heatmap` (hour × weekday; ADR 018) —
  drawn and gated 2026-10-09, released in 1.0.0
- [x] M8 — Group D: cohort heatmap (`form: 'cohort'`, ADR 018), `meter`, `sankey` (ADR 019) — drawn and
  gated 2026-10-09, released in 1.0.0
- [x] M9 — independent review of the whole catalog (Codex, three passes, ADR 020), fixes, then one release: 1.0.0 (2026-10-09; no
  per-milestone releases)
- [x] 1.1.0 — the series' `second` (hex or `'tint'`) and `gutter` in percent, from the second consumer's
  issues #1 and #2 (ADR 021); the demo shows both (2026-10-10)
- [x] 1.2.0 — the funnel's `rates: 'inline'`: the rate on the label line, before the value, from the
  first consumer (ADR 010 addendum; 2026-10-11)
- [x] 1.3.0 — the heatmap as a status matrix (issue #3, ADR 022): `gutter`, `domain`, `cells.short`,
  `header: false`, `legend: false`, class hooks per step. First real-project check: 6 × 10, a 448 px
  slot, two-character shorts, `gutter: 35`, `domain: [0, 60]`; 208 px against ~364 px before. Released
  2026-11-18 with a repo revision: npm description, demo phone layout and OpenGraph, `docs/social.png`
- [x] Upload `docs/social.png` as the repository's social preview (GitHub Settings; no API; 2026-11-18)
- [ ] Decide: a public `ramp(brand, theme)` → the five step colours, so a page can write its theme CSS
  for one render without reading fills from two (asked for by the first matrix consumer; nice to have)
- [ ] Decide: a lighter `tint` on the dark theme (reported as dull; by design it blends toward the
  surface; a change alters bytes, so it needs a minor version — the "→ 1.2.0" written here on
  2026-10-10 went stale when 1.2.0 shipped the funnel's `rates` instead)
