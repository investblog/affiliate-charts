// Type-level contract (ADR 008): compiled by `npm run typecheck`, never run. A line marked
// `@ts-expect-error` must stay an error — if the types loosen, tsc reports the unused directive.
import Charts from '../charts-funnel.js';
import Core from '../charts.js';

const steps: Charts.FunnelStep[] = [
	{ label: 'Clicks', value: 1840, display: '1 840' },
	{ label: 'Unique', value: 1210, display: '1 210', part: true },
	{ label: 'Revenue — GGR', value: -450, display: '-450.00', earned: { value: -112.5, display: '-112.50' }, gap: true },
	{ label: 'Cancelled', value: -40, display: '-40', group: 'losses', rate: null },
];
const svg: string = Charts.funnel(steps, { title: 'Money', legend: ['base', 'earned'], form: 'bars' });
Charts.init(document.body, svg);
Core.init(document.body, svg);

// the core alone does not know about the funnel
// @ts-expect-error
Core.funnel(steps);
// @ts-expect-error — form is a closed set
Charts.funnel(steps, { form: 'pyramid' });
// @ts-expect-error — the legend is a pair
Charts.funnel(steps, { legend: ['base'] });
// @ts-expect-error — only the losses group exists
Charts.funnel([{ label: 'x', value: 1, display: '1', group: 'other' }]);

// the page global, merged from both declaration files
const viaGlobal: string = globalThis.Charts.funnel(steps);
void viaGlobal;
