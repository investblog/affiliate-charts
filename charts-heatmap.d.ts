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
	}

	interface Options extends Core.Common {
		/** Default `'grid'`. `'cohort'`: rows may be shorter, cells show their display when it fits. */
		form?: 'grid' | 'cohort';
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
