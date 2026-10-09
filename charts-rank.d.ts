// Types for the ranking module (spec, Group C). The module adds `rank` to the core and exports the core.
import Core = require('./charts.js');

declare namespace Rank {
	interface Row {
		/** A source, sub-id, geo or campaign, already translated. */
		label: string;
		value: number;
		/** Already formatted; shown as given. */
		display: string;
	}

	interface Options extends Core.Common {
		/** The index of the row to emphasise; every other bar turns grey. */
		highlight?: number;
	}
}

interface RankApi {
	/** Pure: horizontal bars, in the caller's order, as an SVG string. Throws on input the spec forbids. */
	rank(rows: Rank.Row[], options?: Rank.Options): string;
}

declare global {
	interface ChartsGlobal extends RankApi {}
}

declare namespace Charts {
	type Common = Core.Common;
	type RankRow = Rank.Row;
	type RankOptions = Rank.Options;
}

declare const Charts: Core.Api & RankApi;

export = Charts;
