---
type: decision
status: accepted
date: 2026-10-08
tags: [api, stability]
project: charts-lite
---

# 003 — input is data, not a seed

## Context

Every sibling renders from `(seed, options)`: the picture is procedural and the seed makes it
repeatable. A chart has nothing to invent — its picture is fully determined by the data.

## Decision

A chart renders from `(data, options)`. There is no randomness at all: no seed, no `Math.random`, no
dependence on time or environment. roulette-lite 010 (output stability) carries over to this pair:
within a minor version the same `(data, options)` gives byte-identical SVG, across runs and across
Node 22 and 24.

Ids and class tokens that must be unique on a page are derived from the input (as roulette-lite 005
derives them from the seed), so two different charts on one page do not collide and the same chart
twice produces the same bytes.

## Consequences

- Determinism is the first Node test at M3: render twice, compare bytes.
- Numbers in the output go through one rounding helper (`n()`, ported from slots-lite) that never
  emits `-0` or an exponent, so float noise cannot leak into the bytes.
