---
type: note
status: active
tags: [backlog]
project: charts-lite
---

# Backlog

The milestone table is in
[README.md](README.md#milestones).

- [x] M1 — contract: `charts.d.ts` + `charts-funnel.d.ts`, core skeleton, module pattern on `funnel`, size map
- [ ] M2 — playground `index.html`; decide O1–O4 (responsive text, long labels, value placement, palette)
- [ ] M3 — core drawing + `funnel` (bars, steps, shape) → 0.1.0; Node + browser gates seen red
- [ ] M4 — first consumer: both funnels above their tables, npm + Vite default import, CSP unchanged
- [ ] M5 — package-name ADR, public repo, playground on Pages, first publish, Trusted Publisher
- [ ] M6 — `waterfall`, then Group B: `series` (line, area, columns, previous period), `spark` / `tile`
- [ ] M7 — Group C: `rank`, `share` (100% bar, donut ≤ 6), `heatmap` (hour × weekday)
- [ ] M8 — Group D: cohort heatmap, `meter`, `sankey` → v1.0
