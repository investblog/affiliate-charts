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
  series, ADR 015), `spark` / `tile` (ADR 016) — drawn and gated 2026-10-09, unreleased
- [x] M7 — Group C: `rank`, `share` (100% bar, donut ≤ 6; ADR 017), `heatmap` (hour × weekday; ADR 018) —
  drawn and gated 2026-10-09, unreleased
- [x] M8 — Group D: cohort heatmap (`form: 'cohort'`, ADR 018), `meter`, `sankey` (ADR 019) — drawn and
  gated 2026-10-09, unreleased
- [ ] M9 — independent review of the whole catalog (Codex), fixes, then one release (2026-10-09: no
  per-milestone releases)
