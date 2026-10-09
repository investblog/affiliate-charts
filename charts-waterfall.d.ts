// Types for the waterfall module (ADR 014). The module adds `waterfall` to the core and exports the core.
import Core = require('./charts.js');

declare namespace Waterfall {
	interface Step {
		/** Already translated. Name a deduction neutrally ("Stays with the platform and the network"). */
		label: string;
		/** A total's amount, or a delta's signed change. */
		value: number;
		/** Already formatted, sign included; shown as given. */
		display: string;
		/** `total` — a bar from zero; `delta` — floats from the running total. The first step is a total. */
		kind: 'total' | 'delta';
	}

	type Options = Core.Common;
}

interface WaterfallApi {
	/** Pure: the waterfall as an SVG string. Throws on input the spec forbids. */
	waterfall(steps: Waterfall.Step[], options?: Waterfall.Options): string;
}

declare global {
	interface ChartsGlobal extends WaterfallApi {}
}

declare namespace Charts {
	type Common = Core.Common;
	type WaterfallStep = Waterfall.Step;
	type WaterfallOptions = Waterfall.Options;
}

declare const Charts: Core.Api & WaterfallApi;

export = Charts;
