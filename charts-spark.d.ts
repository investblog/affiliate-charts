// Types for the sparkline and KPI tile module (ADR 016). The module adds `spark` and `tile` to the core
// and exports the core.
import Core = require('./charts.js');

declare namespace Spark {
	/** A change against a period. Whether a rise is good is the caller's to say: a falling CPA is good. */
	type Delta =
		| { display: string; direction: 'up' | 'down'; good: boolean }
		| { display: string; direction: 'flat' };

	interface Tile {
		/** Up to 20 characters are shown; a longer label is cut with an ellipsis. */
		label: string;
		/** The caller's figure, never cut: up to 10 characters fit the promised 160 px. */
		value: string;
		delta?: Delta;
		/** A sparkline under the figure; `null` is no data. */
		trend?: (number | null)[];
	}

	type Options = Core.Common;
}

interface SparkApi {
	/** Pure: a sparkline as an SVG string, 32 px high. Throws on input the spec forbids. */
	spark(values: (number | null)[], options?: Spark.Options): string;
	/** Pure: a KPI tile as an SVG string. Throws on input the spec forbids. */
	tile(tile: Spark.Tile, options?: Spark.Options): string;
}

declare global {
	interface ChartsGlobal extends SparkApi {}
}

declare namespace Charts {
	type Common = Core.Common;
	type Tile = Spark.Tile;
	type TileDelta = Spark.Delta;
	type SparkOptions = Spark.Options;
}

declare const Charts: Core.Api & SparkApi;

export = Charts;
