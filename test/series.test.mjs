// M6 Group B: the series (spec, ADR 015) — its input contract and what it draws. Positions are recomputed
// here from the rules (band centres, nice ticks, the plot's pixel scale), not read back from the library.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Charts from '../charts-series.js';

const P = (x, ...values) => ({ x, values, display: values.map((v) => (v === null ? null : String(v))) });
const height = (svg) => Number(svg.match(/^<svg [^>]*height="([\d.]+)"/u)[1]);
const texts = (svg, cls) => [...svg.matchAll(new RegExp(`<text class="chart-${cls}" x="([^"]+)" y="([-\\d.]+)"([^>]*)>(.*?)</text>`, 'gu'))]
	.map((m) => ({ x: m[1], y: +m[2], attrs: m[3], text: m[4] }));
const lines = (svg, cls = 'line') => [...svg.matchAll(new RegExp(`<polyline class="chart-${cls}" points="([^"]+)" fill="none" stroke="([^"]+)" stroke-opacity="([\\d.]+)"`, 'gu'))]
	.map((m) => ({ pts: m[1].split(' ').map((p) => p.split(',').map(Number)), stroke: m[2], op: +m[3] }));
const grid = (svg) => [...svg.matchAll(/<line class="chart-grid" x1="0" x2="100%" y1="([-\d.]+)" y2="\1" stroke="currentColor" stroke-opacity="([\d.]+)"/gu)]
	.map((m) => [+m[1], +m[2]]);
// columns: 24px wide, dx px from the centre of their point's viewport; viewports: [x%, width%]
const cols = (svg) => [...svg.matchAll(/<g transform="translate\(([-\d.]+)\)"><svg class="chart-bar" x="50%" y="([\d.]+)" width="24" height="([\d.]+)" fill="([^"]+)">(.*?)<\/svg><\/g>/gu)]
	.map((m) => ({ dx: +m[1], y: +m[2], h: +m[3], fill: m[4], inner: m[5] }));
const views = (svg) => [...svg.matchAll(/<svg x="([\d.]+)%" width="([\d.]+)%"><g /gu)].map((m) => [+m[1], +m[2]]);
const pinned = JSON.parse(readFileSync(new URL('fixtures/palette.json', import.meta.url), 'utf8'));
// the plot's top for one key line: key 20, gap 8, room for the top tick 16 (ADR 015)
const TOP = 44, PLOT = 160;

test('anatomy: the key line, a gap, room for the top tick, a 160px plot, the x labels', () => {
	assert.equal(height(Charts.series([P('a', 0), P('b', 100)], { names: ['Clicks'] })), TOP + PLOT + 20);
	const prev = { name: 'Last month', values: [1, 2], display: ['1', '2'] };
	assert.equal(height(Charts.series([P('a', 0), P('b', 100)], { names: ['Clicks'], previous: prev })), TOP + 20 + PLOT + 20);
	assert.equal(height(Charts.series([P('a', 0, 1), P('b', 100, 2)], { names: ['GGR', 'Commission'] })), TOP + 20 + PLOT + 20);
	// a key line that may not fit at 343px puts its value on its own line (ADR 010's label line)
	const long = 'x'.repeat(30);
	assert.equal(height(Charts.series([{ x: 'a', values: [1], display: ['1'.repeat(10)] }], { names: [long] })), TOP + 18 + PLOT + 20);
});

test('the key: a swatch, the name and the last point\'s display; an em dash when the last point has no data', () => {
	const svg = Charts.series([P('a', 5, 1), P('b', 7, null)], { names: ['GGR', 'Commission'] });
	assert.deepEqual(texts(svg, 'label').map((t) => [t.x, t.text]), [['16', 'GGR'], ['16', 'Commission']]);
	assert.deepEqual(texts(svg, 'value').map((t) => [t.x, t.text]), [['100%', '7'], ['100%', '—']]);
	assert.match(svg, /<g class="chart-key"><rect x="0" y="3" width="10" height="10" rx="2" fill="#/u);
});

test('ticks: nice steps over zero and every value, on the gridlines, the zero line stronger', () => {
	const svg = Charts.series([P('a', 0), P('b', 100)], { names: ['c'] });
	// [0, 100]: a quarter is 25 → step 50; y = top + (100 − v) / 100 × 160
	assert.deepEqual(grid(svg), [[TOP + 160, 0.35], [TOP + 80, 0.12], [TOP, 0.12]]);
	assert.deepEqual(texts(svg, 'tick').map((t) => [t.x, t.y, t.text]), [['0', TOP + 156, '0'], ['0', TOP + 76, '50'], ['0', TOP - 4, '100']]);
	assert.deepEqual(texts(Charts.series([P('a', -120), P('b', 810)], { names: ['c'] }), 'tick').map((t) => t.text), ['-500', '0', '500', '1000']);
	assert.deepEqual(texts(Charts.series([P('a', 30), P('b', 20)], { names: ['c'] }), 'tick').map((t) => t.text), ['0', '10', '20', '30']);
	// fractions survive the default format, float noise does not
	assert.deepEqual(texts(Charts.series([P('a', 0.8)], { names: ['c'] }), 'tick').map((t) => t.text), ['0', '0.2', '0.4', '0.6', '0.8']);
	assert.deepEqual(texts(Charts.series([P('a', 1)], { names: ['c'] }), 'tick').map((t) => t.text), ['0', '0.5', '1']);
	// no range: one tick, zero, at the plot's foot
	const flat = Charts.series([P('a', 0), P('b', null)], { names: ['c'] });
	assert.deepEqual(grid(flat), [[TOP + 160, 0.35]]);
	assert.deepEqual(texts(flat, 'tick').map((t) => t.text), ['0']);
});

test('tick text is drawn over the marks, haloed in the theme surface, so a column cannot hide it', () => {
	for (const [theme, halo] of [['light', '#fcfcfb'], ['dark', '#1a1a19']]) {
		const svg = Charts.series([P('a', 100)], { names: ['c'], form: 'columns', theme });
		assert.ok(svg.indexOf('chart-tick') > svg.lastIndexOf('chart-bar'), 'after the columns');
		const t = [...svg.matchAll(/<text class="chart-tick" [^>]*>/gu)];
		assert.ok(t.length === 3 && t.every((m) => m[0].includes(`opacity="0.7" stroke="${halo}" stroke-width="3" stroke-linejoin="round" paint-order="stroke"`)));
	}
	const line = Charts.series([P('a', 1), P('b', 2)], { names: ['c'] });
	assert.ok(line.indexOf('chart-tick') > line.lastIndexOf('chart-dot'), 'after the lines and their dots');
});

test('tick text goes through format, escaped; format gets the tick without float noise', () => {
	const svg = Charts.series([P('a', 0), P('b', 100)], { names: ['c'], format: (v) => `<${v} €>` });
	assert.deepEqual(texts(svg, 'tick').map((t) => t.text), ['&lt;0 €&gt;', '&lt;50 €&gt;', '&lt;100 €&gt;']);
	// 3 × 0.2 is 0.6000000000000001 in floating point; the caller's String() must see 0.6
	assert.deepEqual(texts(Charts.series([P('a', 0.8)], { names: ['c'], format: String }), 'tick').map((t) => t.text), ['0', '0.2', '0.4', '0.6', '0.8']);
});

test('the comparison period is on the scale too', () => {
	const prev = { name: 'p', values: [100], display: ['100'] };
	assert.deepEqual(texts(Charts.series([P('a', 10)], { names: ['c'], previous: prev }), 'tick').map((t) => t.text), ['0', '50', '100']);
});

test('lines: points at band centres in a stretched box, y in plot pixels, a 2px stroke that does not scale', () => {
	const svg = Charts.series([P('a', 0), P('b', 50), P('c', 100), P('d', 25)], { names: ['c'] });
	assert.deepEqual(lines(svg)[0].pts, [[12.5, 160], [37.5, 80], [62.5, 0], [87.5, 120]]);
	assert.match(svg, new RegExp(`<svg y="${TOP}" width="100%" height="160" viewBox="0 0 100 160" preserveAspectRatio="none" overflow="visible">`, 'u'));
	assert.match(svg, /stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/u);
});

test('null is no data: a line breaks, a lone point is a dot, nothing is drawn at zero', () => {
	const svg = Charts.series([P('a', 1), P('b', 2), P('c', null), P('d', 3), P('e', null), P('f', 4), P('g', 4)], { names: ['c'] });
	assert.deepEqual(lines(svg).map((l) => l.pts.map((p) => p[0])), [[100 / 14, 300 / 14].map((v) => +v.toFixed(3)), [1100 / 14, 1300 / 14].map((v) => +v.toFixed(3))]);
	const lone = [...svg.matchAll(/<circle class="chart-line" cx="([\d.]+)%" cy="([\d.]+)" r="3"/gu)];
	assert.equal(lone.length, 1);
	assert.equal(+lone[0][1], +(700 / 14).toFixed(3));
});

test('the end dot sits on the last point with data, ringed with the theme surface', () => {
	for (const [theme, ring] of [['light', '#fcfcfb'], ['dark', '#1a1a19']]) {
		const svg = Charts.series([P('a', 0), P('b', 100), P('c', null)], { names: ['c'], theme });
		const d = svg.match(/<circle class="chart-dot" cx="([\d.]+)%" cy="([\d.]+)" r="4" fill="(#\w+)" stroke="(#\w+)" stroke-width="2"/u);
		assert.deepEqual([+d[1], +d[2], d[3], d[4]], [50, TOP, pinned[`#2563eb ${theme}`].solid, ring]);
	}
});

test('colour: series 1 the solid mark, series 2 the opposite hue, in lines, columns and the key', () => {
	for (const theme of ['light', 'dark']) {
		const solid = pinned[`#e11d48 ${theme}`].solid, turned = pinned[`#e11d48 ${theme} turned`].solid;
		const pts = [P('a', 5, 1), P('b', 6, 2)], o = { names: ['GGR', 'Commission'], brand: '#e11d48', theme };
		assert.deepEqual(lines(Charts.series(pts, o)).map((l) => [l.stroke, l.op]), [[solid, 1], [turned, 1]]);
		assert.deepEqual(cols(Charts.series(pts, { ...o, form: 'columns' })).map((c) => c.fill), [solid, turned, solid, turned]);
		const swatches = [...Charts.series(pts, o).matchAll(/<rect x="0" y="\d+" width="10" height="10" rx="2" fill="([^"]+)"/gu)].map((m) => m[1]);
		assert.deepEqual(swatches, [solid, turned]);
	}
});

test('area: a 0.1 wash from zero under the line, a single series', () => {
	const svg = Charts.series([P('a', 50), P('b', 100)], { names: ['c'], form: 'area' });
	assert.match(svg, /<path class="chart-area" d="M25,160L25,80L75,0L75,160Z" fill="#\w+" fill-opacity="0.1"\/>/u);
	assert.ok(svg.indexOf('chart-area') < svg.indexOf('chart-line'), 'the wash is under its line');
	// below zero the wash runs up to the zero line
	assert.match(Charts.series([P('a', -100), P('b', 100)], { names: ['c'], form: 'area' }), /d="M25,80L25,160L75,0L75,80Z"/u);
});

test('previous: a currentColor line at 0.35 under the series, in the key and in each title', () => {
	const prev = { name: 'September', values: [10, null], display: ['10', null] };
	const svg = Charts.series([P('a', 20), P('b', 30)], { names: ['October'], previous: prev });
	assert.deepEqual(lines(svg, 'prev').map((l) => [l.stroke, l.op]), []);
	assert.match(svg, /<circle class="chart-prev" cx="25%" cy="[\d.]+" r="3" fill="currentColor" fill-opacity="0.35"/u);
	const two = Charts.series([P('a', 20), P('b', 30)], { names: ['October'], previous: { name: 'September', values: [10, 15], display: ['10', '15'] } });
	assert.deepEqual(lines(two, 'prev').map((l) => [l.stroke, l.op]), [['currentColor', 0.35]]);
	assert.ok(two.indexOf('chart-prev') < two.indexOf('chart-line'), 'the comparison is under the series');
	assert.deepEqual(texts(svg, 'label').map((t) => t.text), ['October', 'September']);
	assert.deepEqual(texts(svg, 'value').map((t) => t.text), ['30', '—']);
	assert.match(svg, /fill="currentColor" opacity="0.35"\/><text class="chart-label" x="16"[^>]*>September/u);
	assert.match(svg, /<title>b: October 30, September —<\/title>/u);
});

test('columns: grouped in a viewport of 70% of their band, 24px each and 2px apart, from zero, rounded at the data end', () => {
	const svg = Charts.series([P('a', 100, 50), P('b', -50, 0)], { names: ['GGR', 'Commission'], form: 'columns' });
	// ticks −50…100 by 50 → y = (100 − v) / 150 × 160; band 50%, its viewport 70% of it, centred
	const c = cols(svg), y = (v) => +((100 - v) / 150 * 160).toFixed(2);
	assert.deepEqual(views(svg), [[7.5, 35], [57.5, 35]]);
	// series 1 left of the centre, series 2 right, 2px between; a lone series 1 keeps its side
	assert.deepEqual(c.map((b) => b.dx), [-25, 1, -25]);
	assert.deepEqual(c.map((b) => [+(b.y - TOP - 20).toFixed(2), b.h]), [[0, y(0)], [y(50), +((100 / 150 - 50 / 150) * 160).toFixed(2)], [y(0), +(50 / 150 * 160).toFixed(2)]]);
	// positive: the square sits at the foot; negative: at the top
	assert.match(c[0].inner, /rx="4"\/><rect y="[\d.]+" width="100%" height="4"\/>/u);
	assert.match(c[2].inner, /rx="4"\/><rect y="0" width="100%" height="4"\/>/u);
	assert.equal(c.length, 3, 'a zero value draws no column');
});

test('stacked columns: parts on each other, 2px apart, only the top one rounded', () => {
	const svg = Charts.series([P('a', 30, 20)], { names: ['First', 'Repeat'], form: 'columns', stacked: true });
	// the stack's total 50 sets the scale: ticks 0…60 by 20; y = (60 − v) / 60 × 160
	const c = cols(svg), y = (v) => (60 - v) / 60 * 160;
	assert.deepEqual(views(svg), [[15, 70]]);
	assert.deepEqual(c.map((b) => b.dx), [-12, -12], 'one 24px column, centred');
	assert.deepEqual([c[0].y - TOP - 20, c[0].h], [y(30), y(0) - y(30)]);
	assert.deepEqual([+(c[1].y - TOP - 20).toFixed(2), +c[1].h.toFixed(2)], [+y(50).toFixed(2), +(y(30) - 2 - y(50)).toFixed(2)]);
	assert.doesNotMatch(c[0].inner, /rx=/u);
	assert.match(c[1].inner, /rx="4"/u);
	// M9 review: one point of one series is a 24px column, not 70% of the chart
	assert.deepEqual([views(Charts.series([P('a', 5)], { names: ['c'], form: 'columns' })), cols(Charts.series([P('a', 5)], { names: ['c'], form: 'columns' }))[0].dx], [[[15, 70]], -12]);
	// the lower part is the top one when the upper has no value
	assert.match(cols(Charts.series([P('a', 30, null)], { names: ['First', 'Repeat'], form: 'columns', stacked: true }))[0].inner, /rx="4"/u);
});

test('x labels: the first and the last, under their point when they fit a band, and every k-th that fits at 343px', () => {
	const month = Array.from({ length: 30 }, (_, i) => P(`${i + 1} Oct`, i));
	const xs = texts(Charts.series(month, { names: ['c'] }), 'x');
	assert.deepEqual(xs.map((t) => t.text), ['1 Oct', '30 Oct', '7 Oct', '13 Oct', '19 Oct']);
	assert.deepEqual(xs.slice(0, 2).map((t) => [t.x, t.attrs]), [['0', ''], ['100%', ' text-anchor="end"']]);
	assert.deepEqual(xs.slice(2).map((t) => t.x), ['21.667%', '41.667%', '61.667%']);
	const week = texts(Charts.series(['Mon', 'Tue', 'Wed', 'Thu'].map((d) => P(d, 1)), { names: ['c'] }), 'x');
	assert.deepEqual(week.map((t) => [t.text, t.x, t.attrs]), [['Mon', '12.5%', ' text-anchor="middle"'], ['Thu', '87.5%', ' text-anchor="middle"'],
		['Tue', '37.5%', ' text-anchor="middle"'], ['Wed', '62.5%', ' text-anchor="middle"']]);
	assert.deepEqual(texts(Charts.series([P('only', 1)], { names: ['c'] }), 'x').map((t) => [t.text, t.x]), [['only', '50%']]);
	// the step comes from the longest label, so the labels are evenly spaced even where short ones would fit:
	// a 12-character label → (96 + 12) / (343 / 30) → every 10th
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcd'.split('').map((c, i) => P(i === 14 ? 'x'.repeat(12) : c, 1));
	assert.deepEqual(texts(Charts.series(chars, { names: ['c'] }), 'x').map((t) => t.text), ['A', 'd', 'K', 'U']);
	assert.equal(texts(Charts.series([P('a', 1)], { names: ['c'] }), 'x')[0].y, TOP + PLOT + 15);
});

test('hover: a transparent band a point, the full plot height, with a title naming every series', () => {
	const svg = Charts.series([P('1 <Oct>', 5, null), P('2 Oct', 6, 2)], { names: ['GGR', 'Com & co'] });
	const hits = [...svg.matchAll(/<rect class="chart-hit" x="([\d.]+)%" y="(\d+)" width="([\d.]+)%" height="160" fill="transparent"><title>(.*?)<\/title><\/rect>/gu)];
	assert.deepEqual(hits.map((h) => [+h[1], +h[2], +h[3], h[4]]), [[0, TOP + 20, 50, '1 &lt;Oct&gt;: GGR 5, Com &amp; co —'], [50, TOP + 20, 50, '2 Oct: GGR 6, Com &amp; co 2']]);
	assert.ok(svg.lastIndexOf('chart-hit') > svg.lastIndexOf('chart-dot'), 'the bands are on top, so every point answers');
});

test('accessible root, determinism, ids from what is drawn, no inline style', () => {
	const pts = [P('a', 1, 2), P('b', 3, 4)], o = { names: ['x', 'y'], title: 'Daily', desc: 'GGR and commission' };
	const a = Charts.series(pts, o);
	assert.match(a, /^<svg [^>]*role="img" aria-labelledby="chart-(\w+)-t chart-\1-d"/u);
	assert.match(Charts.series(pts, { names: ['x', 'y'] }), /aria-hidden="true"/u);
	assert.equal(a, Charts.series(pts.map((p) => ({ ...p })), { desc: o.desc, title: o.title, names: ['x', 'y'] }));
	const id = (svg) => svg.match(/id="([^"]+)-t"/u)[1];
	assert.notEqual(id(a), id(Charts.series([P('a', 1, 2), P('b', 3, 5)], o)), 'a value is drawn, so it is in the id');
	assert.notEqual(id(a), id(Charts.series(pts, { ...o, form: 'columns' })));
	assert.notEqual(id(a), id(Charts.series(pts, { ...o, theme: 'dark' })));
	assert.notEqual(id(a), id(Charts.series(pts, { ...o, format: (v) => v + '!' })));
	assert.notEqual(id(Charts.series(pts, { ...o, title: 'May' })), id(Charts.series(pts, { ...o, title: 'June' })));
	// M9 review: one point of 1 and one of 10 draw alike when the ticks read alike; the raw values keep them apart
	const pt = (v) => [{ x: 'a', values: [v], display: ['x'] }];
	assert.notEqual(id(Charts.series(pt(1), { names: ['c'], title: 't', format: () => 'm' })), id(Charts.series(pt(10), { names: ['c'], title: 't', format: () => 'm' })));
	assert.equal(id(a), id(Charts.series(pts, { ...o, legend: ['unused', 'option'] })), 'an unused option changes nothing');
	assert.doesNotMatch(a, /style|<script|data-|data:/u);
	assert.match(Charts.series(pts, { ...o, classPrefix: 'k' }), /class="k-key".*class="k-grid".*class="k-line".*class="k-dot".*class="k-tick".*class="k-x".*class="k-hit"/su);
});

const ok = [P('a', 1)];
const throwsCases = [
	['points that are not an array', 'a', { names: ['c'] }, /`points` must be an array/u],
	['no points', [], { names: ['c'] }, /no points/u],
	['no options', ok, undefined, /`names` must be one or two strings/u],
	['three names', ok, { names: ['a', 'b', 'c'] }, /`names` must be one or two strings/u],
	['no names', ok, { names: [] }, /`names` must be one or two strings/u],
	['a name that is not a string', ok, { names: [5] }, /name 0 must be a string/u],
	['an unknown form', ok, { names: ['c'], form: 'pie' }, /unknown form/u],
	['stacked lines', ok, { names: ['c'], stacked: true }, /`stacked` needs `columns`/u],
	['stacked as the string "false"', [P('a', 1, 2)], { names: ['a', 'b'], form: 'columns', stacked: 'false' }, /`stacked` is a boolean/u],
	['an area of two series', [P('a', 1, 2)], { names: ['a', 'b'], form: 'area' }, /`area` draws a single series/u],
	['previous with two series', [P('a', 1, 2)], { names: ['a', 'b'], previous: { name: 'p', values: [1], display: ['1'] } }, /`previous` compares a single series/u],
	['previous that is an array', ok, { names: ['c'], previous: [1] }, /previous name must be a string/u],
	['previous of the wrong length', ok, { names: ['c'], previous: { name: 'p', values: [1, 2], display: ['1', '2'] } }, /previous: `values` and `display` must have 1 entries/u],
	['a point with more values than names', [P('a', 1, 2)], { names: ['c'] }, /point 0: `values` and `display` must have 1 entries/u],
	['a display shorter than the values', [{ x: 'a', values: [1, 2], display: ['1'] }], { names: ['a', 'b'] }, /point 0: `values` and `display`/u],
	['a null value with a display', [{ x: 'a', values: [null], display: ['0'] }], { names: ['c'] }, /a `null` value needs a `null` display/u],
	['a value with a null display', [{ x: 'a', values: [1], display: [null] }], { names: ['c'] }, /point 0 display must be a string/u],
	['a NaN value', [P('a', NaN)], { names: ['c'] }, /point 0 value must be a finite number/u],
	['an undefined value', [{ x: 'a', values: [undefined], display: ['1'] }], { names: ['c'] }, /point 0 value must be a finite number/u],
	['an x that is not a string', [{ x: 1, values: [1], display: ['1'] }], { names: ['c'] }, /point 0 x must be a string/u],
	['a null point', [null], { names: ['c'] }, /point 0 x/u],
	['a negative value in a stack', [P('a', 1, -1)], { names: ['a', 'b'], form: 'columns', stacked: true }, /a stack cannot hold a negative value/u],
	['a format that is not a function', ok, { names: ['c'], format: 'n' }, /`format` must be a function/u],
	['a format that returns a number', ok, { names: ['c'], format: (v) => v }, /format\(v\) must be a string/u],
	['values too far apart', [P('a', -1.7e308), P('b', 1.7e308)], { names: ['c'] }, /too far apart/u],
	['a stack that overflows', [P('a', 1e308, 1e308)], { names: ['a', 'b'], form: 'columns', stacked: true }, /too far apart/u],
	// M9 review: finite values whose ticks underflow or overflow must throw, never draw NaN
	['a value of Number.MIN_VALUE', [P('a', Number.MIN_VALUE)], { names: ['c'] }, /values too small or too large to draw/u],
	['a value of Number.MAX_VALUE', [P('a', Number.MAX_VALUE)], { names: ['c'] }, /values too small or too large to draw/u],
];
for (const [name, points, options, msg] of throwsCases) {
	test(`throws: ${name}`, () => {
		assert.throws(() => Charts.series(points, options), (e) => e instanceof TypeError && /^affiliate-charts: /u.test(e.message) && msg.test(e.message));
	});
}

test('throws on the shared options, like the funnel', () => {
	assert.throws(() => Charts.series(ok, { names: ['c'], theme: 'sepia' }), /theme/u);
	assert.throws(() => Charts.series(ok, { names: ['c'], brand: 'red' }), /brand/u);
	assert.throws(() => Charts.series(ok, 'dark'), /options must be an object/u);
});

test('allowed: one point, a stacked single series, columns with previous, every value null', () => {
	assert.match(Charts.series(ok, { names: ['c'] }), /^<svg /u);
	assert.match(Charts.series(ok, { names: ['c'], form: 'columns', stacked: true }), /^<svg /u);
	assert.match(Charts.series(ok, { names: ['c'], form: 'columns', previous: { name: 'p', values: [2], display: ['2'] } }), /chart-prev/u);
	assert.match(Charts.series([P('a', null)], { names: ['c'] }), /^<svg /u);
});
