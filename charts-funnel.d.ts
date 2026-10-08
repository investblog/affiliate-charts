// Types for the funnel module (ADR 007). The module adds `funnel` to the core and exports the core.
import Core = require('./charts.js');

declare namespace Funnel {
	interface Bar {
		value: number;
		/** Already formatted by the caller. */
		display: string;
	}

	interface Step {
		/** Already translated. Name the base in money funnels ("Deposits — sum topped up"). */
		label: string;
		/** The base bar: a count, or money. Negative values grow left of zero. */
		value: number;
		/** Already formatted value at the bar end; its sign is shown as given. */
		display: string;
		/** Money funnels: the partner's commission from this step, on the same scale. */
		earned?: Bar;
		/** A subset of the nearest preceding main step: indented, thinner, never stacked. */
		part?: boolean;
		/** The losses block; must follow every main step. Same scale as the main steps. */
		group?: 'losses';
		/** Start a new block after a visual gap — a base of another kind. Not on a `part` step. */
		gap?: boolean;
		/** A chip before this row. `undefined` → no chip; `null` → an em dash. No denominator is implied. */
		rate?: string | null;
	}

	interface Options extends Core.Common {
		/** `bars` (default); `steps` — rate chips emphasised; `shape` — centred bands, one positive series. */
		form?: 'bars' | 'steps' | 'shape';
		/** `[base, earned]`. Required when any step has `earned`. */
		legend?: [string, string];
	}
}

interface FunnelApi {
	/** Pure: the funnel as an SVG string. Throws on input the spec forbids. */
	funnel(steps: Funnel.Step[], options?: Funnel.Options): string;
}

declare global {
	interface ChartsGlobal extends FunnelApi {}
}

declare namespace Charts {
	type Common = Core.Common;
	type FunnelBar = Funnel.Bar;
	type FunnelStep = Funnel.Step;
	type FunnelOptions = Funnel.Options;
}

declare const Charts: Core.Api & FunnelApi;

export = Charts;
