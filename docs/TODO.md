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
- [ ] M5 — package-name ADR, public repo, playground on Pages, first publish (all done 2026-10-08); Trusted Publisher on npmjs.com (open)
- [ ] M6 — `waterfall`, then Group B: `series` (line, area, columns, previous period), `spark` / `tile`
- [ ] M7 — Group C: `rank`, `share` (100% bar, donut ≤ 6), `heatmap` (hour × weekday)
- [ ] M8 — Group D: cohort heatmap, `meter`, `sankey` → v1.0
