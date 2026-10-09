// Type-level contract (ADR 008): compiled by `npm run typecheck`, never run. A line marked
// `@ts-expect-error` must stay an error — if the types loosen, tsc reports the unused directive.
import Charts from '../charts-funnel.js';
import Core from '../charts.js';
import Charts2 from '../charts-waterfall.js';

const steps: Charts.FunnelStep[] = [
	{ label: 'Clicks', value: 1840, display: '1 840' },
	{ label: 'Unique', value: 1210, display: '1 210', part: true },
	{ label: 'Revenue — GGR', value: -450, display: '-450.00', earned: { value: -112.5, display: '-112.50' }, gap: true },
	{ label: 'Cancelled', value: -40, display: '-40', group: 'losses', rate: null },
];
const svg: string = Charts.funnel(steps, { title: 'Money', legend: ['base', 'earned'], form: 'bars' });
Charts.init(document.body, svg);
Core.init(document.body, svg);

const pal: Core.Palette = Core.palette('#0066ff', 'dark');
const solid: string = Charts.palette().solid;
void pal; void solid;
// @ts-expect-error — the theme is a closed set
Core.palette('#0066ff', 'sepia');

// the core alone does not know about the funnel
// @ts-expect-error
Core.funnel(steps);
// @ts-expect-error — form is a closed set
Charts.funnel(steps, { form: 'pyramid' });
// @ts-expect-error — the legend is a pair
Charts.funnel(steps, { legend: ['base'] });
// @ts-expect-error — only the losses group exists
Charts.funnel([{ label: 'x', value: 1, display: '1', group: 'other' }]);

// the waterfall module types its own chart, and not the funnel
const flow: Charts2.WaterfallStep[] = [
	{ label: 'Revenue — GGR', value: 1000, display: '1 000.00', kind: 'total' },
	{ label: 'Bonuses', value: -120, display: '−120.00', kind: 'delta' },
	{ label: 'NGR', value: 880, display: '880.00', kind: 'total' },
];
const wf: string = Charts2.waterfall(flow, { title: 'Money flow', theme: 'dark' });
void wf;
// @ts-expect-error — kind is a closed set
Charts2.waterfall([{ label: 'x', value: 1, display: '1', kind: 'start' }]);
// @ts-expect-error — kind is required
Charts2.waterfall([{ label: 'x', value: 1, display: '1' }]);
// @ts-expect-error — the waterfall has no form
Charts2.waterfall(flow, { form: 'bars' });
// @ts-expect-error — the waterfall module does not type the funnel
Charts2.funnel(steps);

// the page global, merged from every declaration file
const viaGlobal: string = globalThis.Charts.funnel(steps) + globalThis.Charts.waterfall(flow);
void viaGlobal;
