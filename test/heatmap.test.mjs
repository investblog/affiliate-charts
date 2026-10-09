// M7 Group C / M8 cohort: the heatmap (spec, ADR 018). Steps and positions are recomputed here from the
// rules (five steps over [0, max], percent bands), not read back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Charts from '../charts-heatmap.js';

const D = (values) => values.map((r) => r.map((v) => (v === null ? null : String(v))));
const H = (rows, cols, values) => ({ rows, cols, values, display: D(values) });
const grid = H(['Mon', 'Tue'], ['00', '01', '02', '03'], [[0, 25, 50, 100], [10, 39, 40, 99]]);
const height = (svg) => Number(svg.match(/^<svg [^>]*height="([\d.]+)"/u)[1]);
const cells = (svg) => [...svg.matchAll(/<rect class="chart-cell" x="([\d.]+)%" y="([\d.]+)" width="([\d.]+)%" height="20" fill="(#\w+)"><title>(.*?)<\/title>/gu)]
	.map((m) => ({ x: +m[1], y: +m[2], w: +m[3], fill: m[4], title: m[5] }));
// the ramp, recomputed from the steps' lightness on the brand's hue (ADR 018) through the core's shade
const STEPS = { light: [0.71, 0.63, 0.55, 0.47, 0.39], dark: [0.52, 0.6, 0.68, 0.76, 0.84] };
const ramp = (theme, brand) => STEPS[theme].map((L) => Charts._.shade(brand, L));

test('the ramp: five steps, each the brand\'s hue at the ADR\'s lightness, one hue, distinct', () => {
	for (const theme of ['light', 'dark']) {
		const r = ramp(theme, '#0066ff');
		assert.equal(new Set(r).size, 5);
		const svg = Charts.heatmap(H(['a'], ['0', '1', '2', '3', '4'], [[0, 1, 2, 3, 4]]), { theme, brand: '#0066ff' });
		assert.deepEqual([...svg.matchAll(/<rect x="\d+" y="[\d.]+" width="30" height="10" fill="(#\w+)"\/>/gu)].map((m) => m[1]), r, 'the scale shows the ramp');
	}
	// the shade keeps the hue: a blue brand's steps are all blue, getting darker in light mode
	const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
	const light = ramp('light', '#0066ff').map(rgb);
	assert.ok(light.every((c) => c[2] > c[0] && c[2] > c[1]), 'blue');
	assert.ok(light.every((c, i) => !i || c[1] < light[i - 1][1]), 'darker step by step');
});

test('steps: min(4, floor(v / max × 5)) over [0, max]; zero is the near-zero step', () => {
	const r = ramp('light'), c = cells(Charts.heatmap(grid));
	// 0 25 50 100 | 10 39 40 99 with max 100 → 0 1 2 4 | 0 1 2 4
	assert.deepEqual(c.map((x) => r.indexOf(x.fill)), [0, 1, 2, 4, 0, 1, 2, 4]);
	// every value zero: the near-zero step, no division by zero (two cells found, so `every` is not vacuous)
	const zero = cells(Charts.heatmap(H(['a'], ['x', 'y'], [[0, 0]])));
	assert.ok(zero.length === 2 && zero.every((x) => x.fill === r[0]));
});

test('the ramp is pinned: the default brand\'s five steps, as Node computes them', () => {
	// the oracle above derives the ramp through the core's shade; these bytes keep the shade itself honest
	assert.deepEqual(ramp('light'), ['#6e9fff', '#4581ff', '#2664ec', '#0d4ad0', '#0033ac']);
	assert.deepEqual(ramp('light'), ramp('light', '#2563eb'), 'no brand is the default brand');
});

test('anatomy: a label line, 20px of cells, 6px; then the column labels and the scale', () => {
	const svg = Charts.heatmap(grid), c = cells(svg);
	assert.deepEqual(c.slice(0, 4).map((x) => [x.x, x.w, x.y]), [[0, 25, 20], [25, 25, 20], [50, 25, 20], [75, 25, 20]]);
	assert.equal(c[4].y, 20 + 20 + 6 + 20);
	// rows end at 2 × 46; x labels 12 below; the scale 10 below them, 28 high
	assert.equal(height(svg), 92 + 12 + 10 + 28);
	assert.match(svg, /<g><text class="chart-label" x="0" y="13">Mon<\/text>/u);
	assert.equal([...svg.matchAll(/<line x1="([\d.]+)%" x2="\1%" y1="20" y2="40" stroke="#fcfcfb" stroke-width="2"\/>/gu)].length, 3, 'a gap between cells, none at the edges');
});

test('column labels follow the series\' rule: the edges, then every k-th that fits at 343px', () => {
	const hours = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
	const svg = Charts.heatmap(H(['a'], hours, [hours.map(() => 1)]));
	const xs = [...svg.matchAll(/<text class="chart-x" x="([^"]+)" y="[\d.]+"( text-anchor="(\w+)")?>(\w+)<\/text>/gu)].map((m) => [m[4], m[1], m[3]]);
	// 2 characters (16px) do not fit a 14.3px band: the edges anchor; k = ⌈28 / 14.3⌉ = 2, and 02 would touch 00
	assert.deepEqual(xs.slice(0, 3), [['00', '0', undefined], ['23', '100%', 'end'], ['04', '18.75%', 'middle']]);
	assert.deepEqual(xs.slice(2).map((x) => x[0]), ['04', '06', '08', '10', '12', '14', '16', '18', '20']);
	// the step comes from the longest label: one 12-character column spaces every label 10 apart
	const mixed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcd'.split('').map((c, i) => (i === 14 ? 'x'.repeat(12) : c));
	const ms = [...Charts.heatmap(H(['a'], mixed, [mixed.map(() => 1)])).matchAll(/<text class="chart-x"[^>]*>(\w+)<\/text>/gu)].map((m) => m[1]);
	assert.deepEqual(ms, ['A', 'd', 'K', 'U']);
	// labels that fit a band sit under their column, the edge ones too
	const four = [...Charts.heatmap(H(['a'], ['Q1', 'Q2', 'Q3', 'Q4'], [[1, 2, 3, 4]])).matchAll(/<text class="chart-x" x="([^"]+)"/gu)].map((m) => m[1]);
	assert.deepEqual(four, ['12.5%', '87.5%', '37.5%', '62.5%']);
});

test('null is no data: no fill, a dash, a title; absent cohort cells are not drawn', () => {
	const svg = Charts.heatmap(H(['a'], ['x', 'y'], [[null, 5]]));
	assert.match(svg, /<rect class="chart-cell-empty" x="0%" y="20" width="50%" height="20" fill="transparent"><title>a · x: —<\/title><\/rect><text x="25%" y="34" text-anchor="middle" opacity="0.5" pointer-events="none">—<\/text>/u);
	assert.equal(cells(svg).length, 1);
	const tri = Charts.heatmap(H(['Apr', 'May'], ['M0', 'M1'], [[100, 60], [100]]), { form: 'cohort' });
	assert.equal(cells(tri).length, 3);
	assert.doesNotMatch(tri, /May · M1/u, 'the future is absent, not zero');
});

test('cohort cells show their display when it fits a band at 343px, ink or white by the step', () => {
	const tri = Charts.heatmap(H(['Apr'], ['M0', 'M1', 'M2'], [[100, 50, 0]]), { form: 'cohort' });
	const t = [...tri.matchAll(/<text x="([\d.]+)%" y="34" text-anchor="middle" font-size="11" fill="(#\w+)" pointer-events="none">(.*?)<\/text>/gu)].map((m) => [m[3], m[2]]);
	// steps 4, 2, 0 in light: L 0.39, 0.55 → white; 0.71 → ink
	assert.deepEqual(t, [['100', '#fff'], ['50', '#fff'], ['0', '#11171c']]);
	const dark = Charts.heatmap(H(['Apr'], ['M0', 'M1', 'M2'], [[100, 50, 0]]), { form: 'cohort', theme: 'dark' });
	assert.deepEqual([...dark.matchAll(/font-size="11" fill="(#\w+)"/gu)].map((m) => m[1]), ['#11171c', '#11171c', '#fff'], 'dark: 0.84, 0.68 ink; 0.52 white');
	// 24 columns: a band is 14.3px at 343px, "100%" needs 30: no text, the title keeps it
	const wide = Array.from({ length: 24 }, (_, i) => 'M' + i);
	assert.doesNotMatch(Charts.heatmap({ rows: ['a'], cols: wide, values: [wide.map(() => 1)], display: [wide.map(() => '100%')] }, { form: 'cohort' }), /font-size="11"/u);
	assert.match(Charts.heatmap({ rows: ['a'], cols: wide, values: [wide.map(() => 1)], display: [wide.map(() => '9')] }, { form: 'cohort' }), /font-size="11"/u, 'one character fits');
	assert.doesNotMatch(Charts.heatmap(grid), /font-size="11"/u, 'a grid carries no text');
});

test('the scale: format(0) and format(max), escaped; titles name the row and the column', () => {
	const svg = Charts.heatmap(grid, { format: (v) => `<${v}>` });
	assert.match(svg, /<text x="0" y="[\d.]+">&lt;0&gt;<\/text><text x="158" y="[\d.]+" text-anchor="end">&lt;100&gt;<\/text>/u);
	assert.equal(cells(svg)[1].title, 'Mon · 01: 25');
	assert.match(Charts.heatmap(H(['<a>'], ['"b"'], [[1]])), /<title>&lt;a&gt; · &quot;b&quot;: 1<\/title>/u);
	assert.match(Charts.heatmap(H(['a'], ['b'], [[0.25]])), />0.25<\/text><\/g>/u, 'the default format keeps fractions');
});

test('accessible root, determinism, ids from what is drawn and the values, no inline style', () => {
	const a = Charts.heatmap(grid, { title: 'Clicks', desc: 'By hour' });
	assert.match(a, /^<svg [^>]*role="img" aria-labelledby="chart-(\w+)-t chart-\1-d"/u);
	assert.match(Charts.heatmap(grid), /aria-hidden="true"/u);
	assert.equal(a, Charts.heatmap(JSON.parse(JSON.stringify(grid)), { desc: 'By hour', title: 'Clicks' }));
	const id = (svg) => svg.match(/id="([^"]+)-t"/u)[1];
	const same = (v) => ({ rows: ['a'], cols: ['b'], values: [[v]], display: [['x']] });
	assert.notEqual(id(Charts.heatmap(same(1), { title: 't', format: () => 'm' })), id(Charts.heatmap(same(2), { title: 't', format: () => 'm' })));
	assert.notEqual(id(a), id(Charts.heatmap(grid, { title: 'Clicks', desc: 'By hour', theme: 'dark' })));
	assert.doesNotMatch(a, /style|<script|data-|data:/u);
	assert.match(Charts.heatmap(H(['a'], ['b', 'c'], [[null, 1]]), { classPrefix: 'k' }), /class="k-label".*class="k-cell-empty".*class="k-cell".*class="k-x".*class="k-legend"/su);
});

const throwsCases = [
	['no cells', undefined, undefined, /`cells` must be an object/u],
	['cells that are a string', 'Mon', undefined, /`cells` must be an object/u],
	['rows that are not an array', { ...grid, rows: 'Mon' }, undefined, /`rows` must be a non-empty array of strings/u],
	['no columns', { ...grid, cols: [] }, undefined, /`cols` must be a non-empty array of strings/u],
	['a numeric column label', { ...grid, cols: [0, 1, 2, 3] }, undefined, /cols 0 must be a string/u],
	['values of another row count', { ...grid, values: [grid.values[0]] }, undefined, /one array per row/u],
	['display missing', { rows: grid.rows, cols: grid.cols, values: grid.values }, undefined, /one array per row/u],
	['a short row in a grid', H(['a'], ['x', 'y'], [[1]]), undefined, /row 0: one value per column$/u],
	['a long row in a cohort', H(['a'], ['x'], [[1, 2]]), { form: 'cohort' }, /row 0: one value per column at most/u],
	['a display row of another length', { rows: ['a'], cols: ['x', 'y'], values: [[1, 2]], display: [['1']] }, undefined, /row 0: `values` and `display` must be arrays of one length/u],
	['a null with a display', { rows: ['a'], cols: ['x'], values: [[null]], display: [['0']] }, undefined, /a `null` value needs a `null` display/u],
	['a value with a null display', { rows: ['a'], cols: ['x'], values: [[1]], display: [[null]] }, undefined, /row 0 display must be a string/u],
	['a negative value', H(['a'], ['x'], [[-1]]), undefined, /negative value has no step/u],
	['a NaN value', H(['a'], ['x'], [[NaN]]), undefined, /row 0 value must be a finite number/u],
	['an unknown form', grid, { form: 'pie' }, /unknown form/u],
	['a format that is not a function', grid, { format: 'n' }, /`format` must be a function/u],
	['a format that returns a number', grid, { format: (v) => v }, /format\(v\) must be a string/u],
	['a bad theme', grid, { theme: 'sepia' }, /theme/u],
];
for (const [name, data, options, msg] of throwsCases) {
	test(`throws: ${name}`, () => {
		assert.throws(() => Charts.heatmap(data, options), (e) => e instanceof TypeError && /^affiliate-charts: /u.test(e.message) && msg.test(e.message));
	});
}
