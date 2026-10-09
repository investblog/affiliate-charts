// Types for the sankey module (ADR 019). The module adds `sankey` to the core and exports the core.
import Core = require('./charts.js');

declare namespace Sankey {
	interface Node {
		id: string;
		/** 0 to 3, without a gap; at most eight nodes a column. */
		column: number;
		/** One to three characters, drawn beside the node: a sub-id code, "REG", "FTD". */
		short: string;
		/** The full name, in the key under the diagram. */
		label: string;
		/** The caller's string for the node, in the key. */
		display: string;
	}

	interface Link {
		/** A node id in one column … */
		from: string;
		/** … and a node id in the next. */
		to: string;
		/** Not negative. */
		value: number;
		display: string;
	}

	type Options = Core.Common;
}

interface SankeyApi {
	/** Pure: flows between neighbouring columns as an SVG string. Throws on input the spec forbids. */
	sankey(nodes: Sankey.Node[], links: Sankey.Link[], options?: Sankey.Options): string;
}

declare global {
	interface ChartsGlobal extends SankeyApi {}
}

declare namespace Charts {
	type Common = Core.Common;
	type SankeyNode = Sankey.Node;
	type SankeyLink = Sankey.Link;
	type SankeyOptions = Sankey.Options;
}

declare const Charts: Core.Api & SankeyApi;

export = Charts;
