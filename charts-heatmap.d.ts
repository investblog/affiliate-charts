// Types for the heatmap module (ADR 018): the hour × weekday grid and the cohort triangle. The module adds
// `heatmap` to the core and exports the core.
import Core = require('./charts.js');

declare namespace Heatmap {
	interface Cells {
		/** Row labels, already formatted (weekdays, first-deposit months). */
		rows: string[];
		/** Column labels, already formatted (hours, months since the first deposit). */
		cols: string[];
		/** `values[row][col]`; `null` is no data. In a cohort a row may stop early: the rest is absent. */
		values: (number | null)[][];
		/** The same shape as `values`; `null` exactly where the value is `null`. */
		display: (string | null)[][];
		/** One to three characters per column: a header above the grid; the full `cols` stay in the titles (ADR 022). */
		short?: string[];
	}

	interface Options extends Core.Common {
		/** Default `'grid'`. `'cohort'`: rows may be shorter, cells show their display when it fits. */
		form?: 'grid' | 'cohort';
		/** 10 to 50: the row labels in a left column of that percent of the width, on the cells' line. */
		gutter?: number;
		/** A fixed `[lo, hi]` for the ramp instead of `[0, max]`; a value outside throws. */
		domain?: [number, number];
		/** `false`: no column labels (the header or the bottom row). */
		header?: boolean;
		/** `false`: no scale; the caller prints it in its own caption. */
		legend?: boolean;
	}
}

interface HeatmapApi {
	/** Pure: a heatmap as an SVG string. Throws on input the spec forbids. */
	heatmap(cells: Heatmap.Cells, options?: Heatmap.Options): string;
}

declare global {
	interface ChartsGlobal extends HeatmapApi {}
}

declare namespace Charts {
	type Common = Core.Common;
	type HeatmapCells = Heatmap.Cells;
	type HeatmapOptions = Heatmap.Options;
}

declare const Charts: Core.Api & HeatmapApi;

export = Charts;
