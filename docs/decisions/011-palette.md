---
type: decision
status: accepted
date: 2026-10-08
tags: [colour, dataviz, a11y]
project: affiliate-charts
---

# 011 — the palette: OKLCH from `brand`, `currentColor` for everything else

## Context

Spec question O4. ADR 001 adopted the family's palette engine, CIE LCh (hexagons 002, roulette-lite
004). A funnel needs two marks from one brand — a light base and a solid earned bar — that read on light
and dark surfaces, plus neutral marks for losses and chrome, and text that matches the page.

Measured: lifting `#0066ff` until it clears contrast on a dark surface turns it violet in CIE LCh
(`#5e7bff`) and keeps it blue in OKLCH (`#317cff`). CIE Lab's blue region is known to bend hue as
lightness changes.

## Decision

**This supersedes ADR 001's adoption of the CIE LCh engine for this library.** The rest of ADR 001 stands.

- **Solid mark:** the brand converted to OKLCH, its lightness clamped into the theme's band, then moved
  (lightness only — toward white on dark, toward black on light) until it clears **4.5:1** on the theme's
  reference surface. Hue and chroma stay the brand's; out-of-gamut colours lose chroma, never a clipped
  channel.
- **Light mark:** the solid at **opacity 0.6** over whatever surface the page has.
- **Reference surfaces:** light `#fcfcfb`, dark `#1a1a19`. **Lightness band (OKLCH L):** light
  0.43–0.77, dark 0.48–0.67, applied 0.005 inside each edge so rounding to 8-bit channels cannot carry a
  colour out. Default brand `#2563eb`.
- **Everything else is `currentColor`** at an opacity, so it follows the page's text colour in either
  theme: text 1 (muted text 0.7); loss base 0.35; loss earned 0.7; zero line 0.35; separators 0.2; the
  `steps` ghost 0.12.
- `theme` selects the surface the brand is fitted to; switching theme means rendering again. A page can
  also override any colour through the class hooks (ADR 005).
- `Charts.palette(brand, theme)` returns `{ solid, light, opacity }` so a page can paint its table to
  match.

## Measurements (2026-10-08)

Thresholds, so this record stands without the tool that produced it (the dataviz validator): a mark's
OKLCH lightness inside the band; chroma ≥ 0.10; the light end of an ordinal pair ≥ 2:1 against the
surface; a solid mark ≥ 3:1; text ≥ 4.5:1.

Brand pairs were checked against three light surfaces (`#fcfcfb`, `#f3f5f6`, `#ffffff`) and three
dark ones (`#1a1a19`, `#1f262c`, `#11171c`), for `#0066ff #2563eb #e11d48 #16a34a #f59e0b #7c3aed
#0891b2 #facc15 #9a3412 #22d3ee`. All pass every check, with two accepted exceptions:

- **Achromatic brands** (`#111111`, `#ffffff`) fail the chroma floor by definition. That check guards
  identity between categories; a single-hue chart in the brand's grey is the caller's choice.
- **Light cyan on light surfaces** (`#22d3ee` → `#007e90`) reaches chroma 0.095: at 4.5:1 the sRGB gamut
  allows no more. The hue holds.

With opacity 0.55 the light mark measured 1.98–2.00:1 on the darkest sample surface. 0.6 clears it.

`currentColor` marks (light ink `#11171c`, dark ink `#e6e6e6`):

| Mark | Opacity | Light surfaces | Dark surfaces | Needed |
|---|---|---|---|---|
| loss base | 0.35 | 2.21–2.23 | 2.77–2.83 | 2:1 |
| loss earned | 0.7 | 6.42–6.69 | 6.75–7.56 | 3:1 |
| muted text | 0.7 | 6.42–6.69 | 6.75–7.56 | 4.5:1 |
| zero line | 0.35 | 2.21–2.23 | 2.77–2.83 | chrome |
| separator | 0.2 | 1.53–1.54 | 1.73–1.77 | chrome |
| `steps` ghost | 0.12 | 1.28 | 1.35–1.39 | context, repeated by the previous row |

## Consequences

- The colour engine is ~50 lines and lives in the core; it grows only by measurement.
- A page whose text colour is far from these inks should re-measure its loss bars; the table twin
  (ADR 006) remains the accessible record either way.
