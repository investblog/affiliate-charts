// M7 Group C / M8 cohort: the heatmap (spec, ADR 018). Steps and positions are recomputed here from the
// rules (five steps over [0, max], percent bands), not read back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Charts from '../charts-heatmap.js';

const D = (values) => values.map((r) => r.map((v) => (v === null ? null : String(v))));
const H = (rows, cols, values) => ({ rows, cols, values, display: D(values) });
const grid = H(['Mon', 'Tue'], ['00', '01', '02', '03'], [[0, 25, 50, 100], [10, 39, 40, 99]]);
const height = (svg) => Number(svg.match(/^<svg [^>]*height="([\d.]+)"/u)[1]);
const cells = (svg) => [...svg.matchAll(/<rect class="chart-cell chart-cell-(\d)" x="([\d.]+)%" y="([\d.]+)" width="([\d.]+)%" height="20" fill="(#\w+)"><title>(.*?)<\/title>/gu)]
	.map((m) => ({ step: +m[1], x: +m[2], y: +m[3], w: +m[4], fill: m[5], title: m[6] }));
// the ramp, recomputed from the steps' lightness on the brand's hue (ADR 018) through the core's shade
const STEPS = { light: [0.71, 0.63, 0.55, 0.47, 0.39], dark: [0.52, 0.6, 0.68, 0.76, 0.84] };
const ramp = (theme, brand) => STEPS[theme].map((L) => Charts._.shade(brand, L));

test('the ramp: five steps, each the brand\'s hue at the ADR\'s lightness, one hue, distinct', () => {
	for (const theme of ['light', 'dark']) {
		const r = ramp(theme, '#0066ff');
		assert.equal(new Set(r).size, 5);
		const svg = Charts.heatmap(H(['a'], ['0', '1', '2', '3', '4'], [[0, 1, 2, 3, 4]]), { theme, brand: '#0066ff' });
		assert.deepEqual([...svg.matchAll(/<rect class="chart-cell-(\d)" x="\d+" y="[\d.]+" width="30" height="10" fill="(#\w+)"\/>/gu)].map((m) => [+m[1], m[2]]),
			r.map((f, i) => [i, f]), 'the scale shows the ramp, each swatch with its step\'s class');
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
	assert.deepEqual(c.map((x) => x.step), [0, 1, 2, 4, 0, 1, 2, 4], 'the step class names the fill\'s step');
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
	assert.match(svg, /<g class="chart-row"><text class="chart-label" x="0" y="13">Mon<\/text>/u);
	assert.equal([...svg.matchAll(/<line class="chart-gap" x1="([\d.]+)%" x2="\1%" y1="20" y2="40" stroke="#fcfcfb" stroke-width="2"\/>/gu)].length, 3, 'a gap between cells, none at the edges');
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
	const t = [...tri.matchAll(/<text class="chart-cell-text-(\d)" x="([\d.]+)%" y="34" text-anchor="middle" font-size="11" fill="(#\w+)" pointer-events="none">(.*?)<\/text>/gu)].map((m) => [m[4], m[3], +m[1]]);
	// steps 4, 2, 0 in light: L 0.39, 0.55 → white; 0.71 → ink; the class names the step
	assert.deepEqual(t, [['100', '#fff', 4], ['50', '#fff', 2], ['0', '#11171c', 0]]);
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
	assert.match(Charts.heatmap(H(['a'], ['b', 'c'], [[null, 1]]), { classPrefix: 'k' }), /class="k-label".*class="k-cell-empty".*class="k-cell k-cell-4".*class="k-gap".*class="k-x".*class="k-legend"[^>]*><rect class="k-cell-0"/su);
});

// ── the status matrix (ADR 022) ──
const xs = (svg) => [...svg.matchAll(/<text class="chart-x" x="([^"]+)" y="([\d.]+)"(?: text-anchor="(\w+)")?(?: font-size="(\d+)")?>([^<]*)<\/text>/gu)]
	.map((m) => ({ x: m[1], y: +m[2], anchor: m[3], size: m[4], text: m[5] }));

test('gutter: row labels in a left column on the cells\' line, end-anchored 6px before the cells; 26px a row', () => {
	const svg = Charts.heatmap(grid, { gutter: 30 }), c = cells(svg);
	// four bands in the remaining 70 %: 17.5 % each, from 30 %
	assert.deepEqual(c.slice(0, 4).map((x) => [x.x, x.w, x.y]), [[30, 17.5, 0], [47.5, 17.5, 0], [65, 17.5, 0], [82.5, 17.5, 0]]);
	assert.equal(c[4].y, 26);
	assert.match(svg, /<g class="chart-row"><text class="chart-label" x="30%" y="14" dx="-6" text-anchor="end">Mon<\/text><rect/u);
	assert.doesNotMatch(svg, /chart-value/u, 'no label line');
	assert.deepEqual([...svg.matchAll(/<line class="chart-gap" x1="([\d.]+)%"/gu)].map((m) => +m[1]), [47.5, 65, 82.5, 47.5, 65, 82.5]);
	// a 60px band holds a 2-character label: centred over its column, right of the gutter
	assert.deepEqual(xs(svg).map((x) => x.x), ['38.75%', '91.25%', '56.25%', '73.75%']);
	// an edge label wider than its band anchors at the cells' left edge, not at the chart's
	const wide = xs(Charts.heatmap(H(['a'], ['Jurisdiction', 'b', 'c', 'Licensing'], [[1, 2, 3, 4]]), { gutter: 30 }));
	// 12 × 8 = 96 and 9 × 8 = 72 px against a 60px band
	assert.deepEqual(wide.slice(0, 2).map((x) => [x.text, x.x, x.anchor]), [['Jurisdiction', '30%', undefined], ['Licensing', '100%', 'end']]);
	// rows end at 2 × 26; bottom labels 12 below; the scale 10 below them, 28 high
	assert.equal(height(svg), 52 + 12 + 10 + 28);
	// 46 − 26 = 20px less a row
	assert.equal(height(Charts.heatmap(grid)) - height(svg), 2 * 20);
});

test('gutter: a label is cut at what the column holds at 343px, surrogate-safe, its full text in a title', () => {
	const label = (rows, gutter) => Charts.heatmap(H(rows, ['x'], rows.map(() => [1])), { gutter }).match(/<text class="chart-label"[^>]*>(.*?)<\/text>/u)[1];
	// 20 %: (68.6 − 6) / 8 → 7 characters
	assert.equal(label(['Casino1'], 20), 'Casino1');
	assert.equal(label(['Casino Royale'], 20), '<title>Casino Royale</title>Casino…');
	// 10 %, the floor: (34.3 − 6) / 8 → 3 characters, never fewer
	assert.equal(label(['abcd'], 10), '<title>abcd</title>ab…');
	assert.equal(label(['a😀bcd'], 10), '<title>a😀bcd</title>a…', 'an emoji is dropped whole');
	// the cut follows the gutter
	assert.equal(label(['Casino Royale'], 50), 'Casino Royale');
});

test('gutter: the cohort text fits the narrower band', () => {
	const text = (n, gutter) => /font-size="11"/u.test(Charts.heatmap({ rows: ['a'], cols: Array.from({ length: n }, (_, i) => 'M' + i),
		values: [Array(n).fill(1)], display: [Array(n).fill('100%')] }, { form: 'cohort', gutter }));
	// "100%" needs 30px: 343 × 0.5 / 4 = 42.9 fits; / 6 = 28.6 does not; without a gutter / 6 = 57 fits
	assert.ok(text(4, 50));
	assert.ok(!text(6, 50));
	assert.ok(text(6));
});

test('domain: steps over [lo, hi], not the data\'s max; the scale prints lo and hi', () => {
	const r = ramp('light'), row = H(['a'], ['x', 'y', 'z'], [[0, 12, 30]]);
	assert.deepEqual(cells(Charts.heatmap(row)).map((x) => x.step), [0, 2, 4], 'relative: 30 is the top');
	const fixed = Charts.heatmap(row, { domain: [0, 60] });
	assert.deepEqual(cells(fixed).map((x) => x.step), [0, 1, 2], '⌊v / 60 × 5⌋');
	assert.deepEqual(cells(fixed).map((x) => x.fill), [r[0], r[1], r[2]]);
	assert.match(fixed, /<text x="0" y="[\d.]+">0<\/text><text x="158" y="[\d.]+" text-anchor="end">60<\/text>/u);
	// the domain's ends: hi is the top step, lo the near one; a negative lo is the near end
	const neg = Charts.heatmap(H(['a'], ['x', 'y', 'z'], [[-10, 15, 40]]), { domain: [-10, 40], format: (v) => `${v}d` });
	assert.deepEqual(cells(neg).map((x) => x.step), [0, 2, 4], '⌊(v + 10) / 50 × 5⌋');
	assert.match(neg, />-10d<\/text><text x="158" y="[\d.]+" text-anchor="end">40d<\/text>/u);
	// every value equal to lo: the near step, no division by zero
	assert.ok(cells(Charts.heatmap(H(['a'], ['x'], [[5]]), { domain: [5, 6] })).every((x) => x.step === 0));
});

test('short: a header above the grid at 11px, every column when the longest fits its band', () => {
	const cols = Array.from({ length: 10 }, (_, i) => 'Column ' + i), short = cols.map((_, i) => 'C' + i + 'x');
	const m = (n, gutter) => Charts.heatmap({ rows: ['a', 'b'], cols: cols.slice(0, n), short: short.slice(0, n),
		values: [Array(n).fill(1), Array(n).fill(2)], display: [Array(n).fill('1'), Array(n).fill('2')] }, { gutter });
	const ten = m(10, 18), head = xs(ten);
	// 343 × 0.82 / 10 = 28.13px a band; three capitals at 8px and 4px of spacing, 28, fit: all ten, centred,
	// at 11px, at the top
	assert.equal(head.length, 10);
	// no two overlap at 343px: centres at least a short and 4px apart
	const at = head.map((x) => (parseFloat(x.x) - 18) / 82 * 343 * 0.82).sort((a, b) => a - b);
	assert.ok(at.every((v, i) => !i || v - at[i - 1] >= 3 * 8 + 4));
	assert.ok(head.every((x) => x.y === 13 && x.size === '11' && x.anchor === 'middle'));
	assert.deepEqual(head.map((x) => x.text).sort(), short.slice().sort());
	// the grid starts below the header; full names stay in the titles; no bottom labels
	assert.equal(cells(ten)[0].y, 20);
	assert.equal(cells(ten)[0].title, 'a · Column 0: 1');
	// header, two rows of 26, then the scale 10 below the cells
	assert.equal(height(ten), 20 + 52 + 4 + 28);
	// the other side of the boundary: 19 % → 27.78px a band: every second, the 9th too close to the last
	assert.deepEqual(xs(m(10, 19)).map((x) => x.text), ['C0x', 'C9x', 'C2x', 'C4x', 'C6x']);
	// eleven at 30 % → 21.8px: an edge short wider than its band anchors at the cells' edges
	const eleven = Array.from({ length: 11 }, (_, i) => 'Col ' + i), sh = eleven.map((_, i) => String(i).padStart(3, 'k'));
	const e = xs(Charts.heatmap({ rows: ['a'], cols: eleven, short: sh, values: [Array(11).fill(1)], display: [Array(11).fill('1')] }, { gutter: 30 }));
	assert.deepEqual(e.map((x) => [x.text, x.anchor]), [['kk0', undefined], ['k10', 'end'], ['kk2', 'middle'], ['kk4', 'middle'], ['kk6', 'middle'], ['kk8', 'middle']]);
	assert.equal(e[0].x, '30%');
	// digits are no narrower here: the estimate is a capital's
	assert.equal(xs(Charts.heatmap({ rows: ['a'], cols: cols, short: cols.map((_, i) => String(100 + i)),
		values: [Array(10).fill(1)], display: [Array(10).fill('1')] }, { gutter: 19 })).length, 5);
	// an emoji is one character: three of them are a short
	assert.match(Charts.heatmap({ ...grid, short: ['a', 'b', 'c', '😀😀😀'] }), />😀😀😀<\/text>/u);
	// without a gutter, in the label-line form, the header sits above the first label line
	const line = Charts.heatmap({ rows: ['a'], cols: ['x', 'y'], short: ['X', 'Y'], values: [[1, 2]], display: [['1', '2']] });
	assert.match(line, /<text class="chart-label" x="0" y="33">a<\/text>/u);
	assert.equal(cells(line)[0].y, 40);
	assert.deepEqual(xs(line).map((x) => [x.x, x.text]), [['25%', 'X'], ['75%', 'Y']]);
});

test('header: false and legend: false drop their marks and their height', () => {
	const none = (o) => Charts.heatmap(grid, o);
	// the default: rows end at 92, labels at 104, the scale 114–142
	assert.equal(height(none({ header: false })), 92 + 4 + 28, 'no labels: the scale 10 below the cells');
	assert.doesNotMatch(none({ header: false }), /chart-x/u);
	assert.equal(height(none({ legend: false })), 92 + 12 + 4, '4px below the labels\' baseline');
	assert.doesNotMatch(none({ legend: false }), /chart-legend|class="chart-cell-0"/u);
	assert.match(none(), /class="chart-cell-0"/u, 'the probe finds the swatch when it is drawn');
	assert.equal(height(none({ header: false, legend: false })), 86, 'the last row\'s cells');
	assert.equal(height(none({ header: true, legend: true })), height(none()), 'true is the default');
	const sh = { ...grid, short: ['a', 'b', 'c', 'd'] };
	assert.equal(height(Charts.heatmap(sh, { gutter: 20, legend: false })), 20 + 52 - 6, 'header, rows, no trailing pad');
	const off = Charts.heatmap(sh, { gutter: 20, header: false });
	assert.doesNotMatch(off, /chart-x/u);
	assert.equal(cells(off)[0].y, 0, 'no header row');
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
	// ADR 022
	['a gutter under 10', grid, { gutter: 5 }, /`gutter` is a percent from 10 to 50/u],
	['a gutter over 50', grid, { gutter: 60 }, /`gutter` is a percent from 10 to 50/u],
	['a gutter as a string', grid, { gutter: '30' }, /`gutter` is a percent from 10 to 50/u],
	['a gutter of NaN', grid, { gutter: NaN }, /`gutter` is a percent from 10 to 50/u],
	['a domain that is a number', grid, { domain: 60 }, /`domain` must be \[lo, hi\] with lo < hi/u],
	['a domain of one end', grid, { domain: [0] }, /`domain` must be \[lo, hi\]/u],
	['a domain of three', grid, { domain: [0, 1, 2] }, /`domain` must be \[lo, hi\]/u],
	['an empty domain', grid, { domain: [100, 100] }, /`domain` must be \[lo, hi\] with lo < hi/u],
	['a reversed domain', grid, { domain: [100, 0] }, /`domain` must be \[lo, hi\] with lo < hi/u],
	['a domain end of NaN', grid, { domain: [0, NaN] }, /domain 1 must be a finite number/u],
	['a domain end of Infinity', grid, { domain: [-Infinity, 0] }, /domain 0 must be a finite number/u],
	['a domain whose span overflows', H(['a'], ['x'], [[0]]), { domain: [-1.7e308, 1.7e308] }, /`domain` must be \[lo, hi\]/u],
	['a value over the domain', grid, { domain: [0, 99] }, /row 0: a value outside the domain/u],
	['a value under the domain', grid, { domain: [5, 100] }, /row 0: a value outside the domain/u],
	['short that is a string', { ...grid, short: 'abcd' }, undefined, /`short` must hold one string per column/u],
	['short of another length', { ...grid, short: ['a', 'b'] }, undefined, /`short` must hold one string per column/u],
	['an empty short', { ...grid, short: ['a', '', 'c', 'd'] }, undefined, /short 1 must be one to three characters/u],
	['a short of four', { ...grid, short: ['a', 'b', 'c', 'dddd'] }, undefined, /short 3 must be one to three characters/u],
	['a short of four emoji', { ...grid, short: ['a', 'b', 'c', '😀😀😀😀'] }, undefined, /short 3 must be one to three characters/u],
	['a numeric short', { ...grid, short: ['a', 'b', 'c', 4] }, undefined, /short 3 must be one to three characters/u],
	['a header that is a string', grid, { header: 'none' }, /`header` must be a boolean/u],
	['a legend that is a number', grid, { legend: 0 }, /`legend` must be a boolean/u],
];
for (const [name, data, options, msg] of throwsCases) {
	test(`throws: ${name}`, () => {
		assert.throws(() => Charts.heatmap(data, options), (e) => e instanceof TypeError && /^affiliate-charts: /u.test(e.message) && msg.test(e.message));
	});
}
