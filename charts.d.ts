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
		/** @unstable until M2 — layout for responsive text is not decided yet. */
		width?: number;
	}

	/** The core. Modules add their chart functions to it. */
	interface Api {
		/** Browser only: puts the SVG string into the element. Nothing else. */
		init(target: Element, svg: string): void;
	}
}

declare global {
	/** The page global `Charts` (a `<script>` load). Each module's `.d.ts` merges its chart into it. */
	interface ChartsGlobal extends Charts.Api {}
	var Charts: ChartsGlobal;
}

declare const Charts: Charts.Api;

export = Charts;
