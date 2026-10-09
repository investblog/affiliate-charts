// Types for the part-to-whole module (ADR 017). The module adds `share` to the core and exports the core.
import Core = require('./charts.js');

declare namespace Share {
	interface Part {
		/** A device, a geo, "Other" — already translated. */
		label: string;
		/** Not negative: a share of a whole cannot be. */
		value: number;
		/** Already formatted; shown in the key as given. */
		display: string;
	}

	interface Options extends Core.Common {
		/** Default `'bar'`, a 100% bar. */
		form?: 'bar' | 'donut';
	}
}

interface ShareApi {
	/** Pure: up to six parts of a whole as an SVG string. Throws on input the spec forbids. */
	share(parts: Share.Part[], options?: Share.Options): string;
}

declare global {
	interface ChartsGlobal extends ShareApi {}
}

declare namespace Charts {
	type Common = Core.Common;
	type SharePart = Share.Part;
	type ShareOptions = Share.Options;
}

declare const Charts: Core.Api & ShareApi;

export = Charts;
