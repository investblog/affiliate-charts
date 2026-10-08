// Types for the charts-lite core. Each chart module ships its own `.d.ts` next to its file (ADR 008):
// importing `charts-lite/charts-funnel.js` types `funnel`, and nothing that is not loaded. For the page
// global, the `Charts` interface below is extended by each module's file through declaration merging.

declare namespace Charts {
	/** Options every chart shares. */
	interface Common {
		/** Accessible name. Without it the SVG is `aria-hidden` — keep a data table next to it. */
		title?: string;
		desc?: string;
		/** A hex colour the palette is derived from. */
		brand?: string;
		/** The surface the chart sits on. Switching theme means rendering again. */
		theme?: 'light' | 'dark';
		/** Class hooks are `<prefix>-<role>`. Default `'chart'`. */
		classPrefix?: string;
		/** Text for numbers the library chooses itself (axis ticks). Must be deterministic. */
		format?: (v: number) => string;
	}

	/** The colours a chart derives from `brand` for a theme, so a page can paint its table to match. */
	interface Palette {
		/** The solid mark (earned, single-series bars), `#rrggbb`. */
		solid: string;
		/** The light mark as drawn over the theme's reference surface, `#rrggbb`. */
		light: string;
		/** The opacity the light mark is drawn with over the page's own surface. */
		opacity: number;
	}

	/** The core. Modules add their chart functions to it. */
	interface Api {
		/** Browser only: puts the SVG string into the element. Nothing else. */
		init(target: Element, svg: string): void;
		/** Pure. Throws like a chart on a brand that is not `#rrggbb` or an unknown theme. */
		palette(brand?: string, theme?: 'light' | 'dark'): Palette;
	}
}

declare global {
	/** The page global `Charts` (a `<script>` load). Each module's `.d.ts` merges its chart into it. */
	interface ChartsGlobal extends Charts.Api {}
	var Charts: ChartsGlobal;
}

declare const Charts: Charts.Api;

export = Charts;
