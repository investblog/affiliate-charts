// Type-level contract (ADR 008): compiled by `npm run typecheck`, never run. A line marked
// `@ts-expect-error` must stay an error — if the types loosen, tsc reports the unused directive.
import Charts from '../charts-funnel.js';
import Core from '../charts.js';
import Charts2 from '../charts-waterfall.js';
import Charts3 from '../charts-series.js';

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

// the series module types its own chart
const days: Charts3.SeriesPoint[] = [
	{ x: '1 Oct', values: [120, 30], display: ['120.00', '30.00'] },
	{ x: '2 Oct', values: [null, -5], display: [null, '−5.00'] },
];
const sr: string = Charts3.series(days, { names: ['GGR', 'Commission'], form: 'columns', format: (v) => String(v) });
const one: string = Charts3.series([{ x: 'a', values: [1], display: ['1'] }],
	{ names: ['Clicks'], form: 'area', previous: { name: 'Last month', values: [2], display: ['2'] } });
void sr; void one;
// @ts-expect-error — names are required
Charts3.series(days, {});
// @ts-expect-error — at most two series
Charts3.series(days, { names: ['a', 'b', 'c'] });
// @ts-expect-error — form is a closed set
Charts3.series(days, { names: ['a'], form: 'pie' });
// @ts-expect-error — previous is an object with a name, not a bare array
Charts3.series(days, { names: ['a'], previous: [1, 2] });
// @ts-expect-error — format returns a string
Charts3.series(days, { names: ['a'], format: (v: number) => v });
// @ts-expect-error — the series module does not type the waterfall
Charts3.waterfall(flow);

// the page global, merged from every declaration file
const viaGlobal: string = globalThis.Charts.funnel(steps) + globalThis.Charts.waterfall(flow) +
	globalThis.Charts.series(days, { names: ['GGR'] });
void viaGlobal;
