// Types for the series module (ADR 015). The module adds `series` to the core and exports the core.
import Core = require('./charts.js');

declare namespace Series {
	interface Point {
		/** The point's label on the x axis, already formatted (a date, a week). */
		x: string;
		/** One value per series; `null` is no data, never zero. */
		values: (number | null)[];
		/** One caller string per series; `null` exactly where the value is `null`. */
		display: (string | null)[];
	}

	/** The comparison period, one entry per point. */
	interface Previous {
		name: string;
		values: (number | null)[];
		display: (string | null)[];
	}

	interface Options extends Core.Common {
		/** Default `'line'`. */
		form?: 'line' | 'area' | 'columns';
		/** One or two series names, for the key. */
		names: [string] | [string, string];
		/** Columns only: the caller asserts the parts add up. */
		stacked?: boolean;
		/** Two series only: the second series' colour (ADR 021) — a `#rrggbb` fitted to the theme as `brand`
		 * is, or `'tint'`, the brand's light mark, for nested pairs. Default: the brand's opposite hue. */
		second?: string;
		/** Percent of the width, 0–50, kept clear left of the plot for the tick text (ADR 021). Default 0. */
		gutter?: number;
		/** A single series only. */
		previous?: Previous;
	}
}

interface SeriesApi {
	/** Pure: the series as an SVG string. Throws on input the spec forbids. */
	series(points: Series.Point[], options: Series.Options): string;
}

declare global {
	interface ChartsGlobal extends SeriesApi {}
}

declare namespace Charts {
	type Common = Core.Common;
	type SeriesPoint = Series.Point;
	type SeriesPrevious = Series.Previous;
	type SeriesOptions = Series.Options;
}

declare const Charts: Core.Api & SeriesApi;

export = Charts;
