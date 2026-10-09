---
type: decision
status: accepted
date: 2026-10-09
tags: [sankey, flows, layout, colour]
project: affiliate-charts
---

# 019 — the sankey: short tags beside the nodes, the names in a key, one colour

## Context

Flows from sources to registrations to first deposits: up to four columns of up to eight nodes, ribbons
between neighbouring columns whose width is the flow. ADR 009 holds — marks in percent, text in pixels,
no measuring — and the spec asked for nodes "labelled outside" and links "coloured by their source
node".

**Labels.** With C columns at 343 px there are C − 1 gaps; a middle column's labels share a gap with
the next column's. The only width-independent fit is half a gap: at C = 4 the gap is 114 px; half of
it, less the 8 px node and a 4 px inset, is about 45 px — five characters at ADR 010's 8 px. No
caller's node name fits that. Cut names (ADR 010's `…`) keep about twelve characters at C = 4 and
still collide across a shared gap.

**Colour.** One brand yields two checked colours (ADR 015), and a fixed palette six (ADR 017); eight
nodes a column have none.

## Decision

**Each node carries a `short` tag of at most three characters**, the caller's string (a sub-id code,
`REG`, `FTD`), drawn beside its node at 11 px, weight 600, haloed in the theme's surface like the
series ticks: right of the node in every column but the last, left of it in the last. Three characters
are 24 px — inside half a gap at four columns. **The names go to a key** under the diagram: one ADR 010
line per node, in the caller's order — the tag and the label on the left, the `display` end-anchored.
The spec's "labelled outside" becomes this.

**Vertical spacing.** Nodes in a column are stacked from the top with a **16 px gap**; tags are centred
on their nodes, so two tags 11 px high never meet whatever the node heights.

**Sizes.** A node's size is the larger of what flows in and what flows out; one scale for the whole
diagram, `k = min over columns of (H − (n − 1) × 16) / Σ sizes`, H = 240 px, so the fullest column fills
the plot and the others keep the same scale. A ribbon is as thick as its value × k at both ends; in a
node, ribbons stack in the caller's order. The library computes positions; every number shown is a
caller's `display`.

**Geometry.** Columns at 0 %, …, 100 %. A node is an 8 px rect at its column's percent, moved left by
`8 · c / (C − 1)` px (the core bar's translate) so the outer nodes sit inside the edges. Ribbons are
filled cubic Béziers in ADR 015's stretched box (x in percent, y in px), control points at the gap's
middle; a filled shape stretches without distortion of its meaning, so no `vector-effect`. Ribbons run
column line to column line and are drawn first: their ends hide under the nodes.

**Colour: one.** Nodes in the brand's solid mark, ribbons the solid at 0.3. Identity rides on
position, the tag and the hover title (`from → to: display` on a ribbon, `label: display` on a node),
never on a hue. The spec's "coloured by their source node" is withdrawn.

**Topology, all throws:** two to four columns, numbered from 0 without a gap; at most eight nodes a
column; unique ids; a link only from a column to the next (no skips, no flow backwards — a funnel's
sankey); links to known ids; values finite and not negative; at least one link above zero. A node with
no flow keeps its key line and draws nothing; a zero link draws no ribbon.

## Measurements (2026-10-09)

Ribbon opacity, the brand solid over ADR 011's six surfaces, ten brands:

| Opacity | ribbon vs surface | node vs its ribbon, worst |
|---|---|---|
| 0.2 | 1.20–1.39 | 3.11 |
| **0.3** | **1.38–1.67** | **2.67** |
| 0.4 | 1.58–2.01 | 2.27 |

0.3 keeps a node clear of the ribbon it stands on (over 2.5:1) while the ribbons stay visible as a wash;
ribbons carry no text and no identity, so they are held to the area wash's bar, not 3:1.

## Consequences

- `short` is required: a sankey without it cannot be labelled at 375 px.
- A page that wants names on the diagram itself draws it wider and accepts the key anyway.
