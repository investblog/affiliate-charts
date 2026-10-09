// Types for the meter module (spec, Group D). The module adds `meter` to the core and exports the core.
import Core = require('./charts.js');

declare namespace Meter {
	interface Mark {
		/** Inside `(0, target]`. */
		value: number;
		/** The tier's name, shown on hover: names on the bar cannot be measured. */
		label: string;
	}

	interface Meter {
		label: string;
		/** Not negative. Past the target the fill stops at the track's end. */
		value: number;
		/** The caller's string for the value. */
		display: string;
		/** The next tier or the cap: the track's full length. Above zero. */
		target: number;
		targetDisplay: string;
		marks?: Mark[];
	}

	type Options = Core.Common;
}

interface MeterApi {
	/** Pure: progress to a target as an SVG string. Throws on input the spec forbids. */
	meter(meter: Meter.Meter, options?: Meter.Options): string;
}

declare global {
	interface ChartsGlobal extends MeterApi {}
}

declare namespace Charts {
	type Common = Core.Common;
	type MeterInput = Meter.Meter;
	type MeterMark = Meter.Mark;
	type MeterOptions = Meter.Options;
}

declare const Charts: Core.Api & MeterApi;

export = Charts;
