---
type: decision
status: accepted
date: 2026-10-08
tags: [a11y]
project: charts-lite
---

# 006 — accessibility is part of the contract

## Context

Siblings draw decoration and mark it `aria-hidden`. A chart carries information, and a screen reader
user must reach the same numbers a sighted user sees.

## Decision

- With a `title` option: `role="img"`, a `<title>` (and a `<desc>` from `desc`), referenced by
  `aria-labelledby` through derived ids.
- Every mark gets its own `<title>` with its label and display value (and the earned value when the
  step has one), which also gives hover tooltips with no script.
- Without `title`: the SVG is `aria-hidden="true"`. This is allowed **only** because the chart sits
  above a data table that remains the carrier of the data; the chart never replaces the table.

## Consequences

- M3 tests: `title` given → `role="img"` and a `<title>`; one `<title>` per bar; no `title` →
  `aria-hidden="true"`.
- Identity is never colour-alone: when a chart has two series it has a legend (ADR 007).
