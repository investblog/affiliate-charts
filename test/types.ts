// Type-level contract (ADR 008): compiled by `npm run typecheck`, never run. A line marked
// `@ts-expect-error` must stay an error — if the types loosen, tsc reports the unused directive.
import Charts from '../charts-funnel.js';
import Core from '../charts.js';
import Charts2 from '../charts-waterfall.js';
import Charts3 from '../charts-series.js';
import Charts4 from '../charts-spark.js';
import Charts5 from '../charts-rank.js';
import Charts6 from '../charts-share.js';
import Charts7 from '../charts-heatmap.js';
import Charts8 from '../charts-meter.js';
import Charts9 from '../charts-sankey.js';

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
const pair: string = Charts3.series(days, { names: ['Views', 'Visitors'], form: 'columns', second: '#7c3aed', gutter: 4 });
void sr; void one; void pair;
// @ts-expect-error — the gutter is a number of percent
Charts3.series(days, { names: ['a'], gutter: '4%' });
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

// the spark module types the sparkline and the tile
const kpi: Charts4.Tile = { label: 'EPC', value: '0.42', delta: { display: '+8%', direction: 'up', good: true }, trend: [1, null, 3] };
const tl: string = Charts4.tile(kpi, { theme: 'dark' }) + Charts4.spark([1, 2, null, 4]) +
	Charts4.tile({ label: 'CR', value: '3.1%', delta: { display: '0%', direction: 'flat' } });
void tl;
// @ts-expect-error — up needs good
Charts4.tile({ label: 'CPA', value: '12', delta: { display: '−3', direction: 'down' } });
// @ts-expect-error — direction is a closed set
Charts4.tile({ label: 'CPA', value: '12', delta: { display: '−3', direction: 'sideways', good: true } });
// @ts-expect-error — the value is the caller's string, not a number
Charts4.tile({ label: 'CPA', value: 12 });
// @ts-expect-error — a sparkline takes numbers
Charts4.spark(['1']);
// @ts-expect-error — the spark module does not type the series
Charts4.series([], { names: ['a'] });

// the rank module types the ranking
const sources: Charts5.RankRow[] = [{ label: 'sub-1', value: 120, display: '120' }, { label: 'sub-2', value: -30, display: '−30' }];
const rk: string = Charts5.rank(sources, { highlight: 0, theme: 'dark' });
void rk;
// @ts-expect-error — highlight is an index, not a label
Charts5.rank(sources, { highlight: 'sub-1' });
// @ts-expect-error — a row needs its display
Charts5.rank([{ label: 'a', value: 1 }]);
// @ts-expect-error — the rank module does not type the tile
Charts5.tile(kpi);

// the share module types part to whole
const devices: Charts6.SharePart[] = [{ label: 'Android', value: 5, display: '5' }, { label: 'iOS', value: 3, display: '3' }];
const sh: string = Charts6.share(devices, { form: 'donut', theme: 'dark' });
void sh;
// @ts-expect-error — form is a closed set
Charts6.share(devices, { form: 'pie' });
// @ts-expect-error — a part needs its display
Charts6.share([{ label: 'a', value: 1 }]);
// @ts-expect-error — the share module does not type the ranking
Charts6.rank(sources);

// the heatmap module types the grid and the cohort
const week: Charts7.HeatmapCells = { rows: ['Mon'], cols: ['00', '01'], values: [[1, null]], display: [['1', null]] };
const hm: string = Charts7.heatmap(week, { form: 'cohort', format: (v) => v + '%' });
void hm;
// @ts-expect-error — form is a closed set
Charts7.heatmap(week, { form: 'calendar' });
// @ts-expect-error — the display is required
Charts7.heatmap({ rows: ['a'], cols: ['b'], values: [[1]] });
// @ts-expect-error — the heatmap module does not type the share
Charts7.share(devices);

// the meter module types the meter
const tier: Charts8.MeterInput = { label: 'Tier 3', value: 31, display: '31', target: 50, targetDisplay: '50', marks: [{ value: 20, label: 'Tier 2' }] };
const mt: string = Charts8.meter(tier, { theme: 'dark' });
void mt;
// @ts-expect-error — the target's string is required
Charts8.meter({ label: 'a', value: 1, display: '1', target: 2 });
// @ts-expect-error — a mark needs its label
Charts8.meter({ ...tier, marks: [{ value: 1 }] });
// @ts-expect-error — the meter module does not type the heatmap
Charts8.heatmap(week);

// the sankey module types the flows
const sn: Charts9.SankeyNode[] = [{ id: 'tg', column: 0, short: 'TG', label: 'sub-id: tg', display: '9 200' },
	{ id: 'reg', column: 1, short: 'REG', label: 'Registrations', display: '2 410' }];
const sl: Charts9.SankeyLink[] = [{ from: 'tg', to: 'reg', value: 1500, display: '1 500' }];
const sk: string = Charts9.sankey(sn, sl, { theme: 'dark' });
void sk;
// @ts-expect-error — a node needs its short tag
Charts9.sankey([{ id: 'a', column: 0, label: 'a', display: '1' }], sl);
// @ts-expect-error — a link needs its display
Charts9.sankey(sn, [{ from: 'tg', to: 'reg', value: 1 }]);
// @ts-expect-error — the sankey module does not type the meter
Charts9.meter(tier);

// the page global, merged from every declaration file
const viaGlobal: string = globalThis.Charts.funnel(steps) + globalThis.Charts.waterfall(flow) +
	globalThis.Charts.series(days, { names: ['GGR'] }) + globalThis.Charts.spark([1, 2]) + globalThis.Charts.tile(kpi) + globalThis.Charts.rank(sources) + globalThis.Charts.share(devices) + globalThis.Charts.heatmap(week) + globalThis.Charts.meter(tier) + globalThis.Charts.sankey(sn, sl);
void viaGlobal;
