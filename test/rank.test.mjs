// M7 Group C: the ranking (spec) — rows as ADR 010, one colour, an optional emphasis. Positions are
// recomputed here from the rule (one scale over zero and every value), not read back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Charts from '../charts-rank.js';

const R = (label, value) => ({ label, value, display: String(value) });
const rows = [R('sub-1', 400), R('sub-2', 200), R('sub-3', 100), R('Other', 50)];
const height = (svg) => Number(svg.match(/^<svg [^>]*height="([\d.]+)"/u)[1]);
// nested-svg bars: [class, x%, y, width%, fill, opacity]
const bars = (svg) => [...svg.matchAll(/<svg class="([^"]+)" x="([-\d.]+)%" y="([\d.]+)" width="([\d.]+)%" height="12" fill="([^"]+)" opacity="([\d.]+)"/gu)]
	.map((m) => ({ cls: m[1], x: +m[2], y: +m[3], w: +m[4], fill: m[5], op: +m[6] }));
const pinned = JSON.parse(readFileSync(new URL('fixtures/palette.json', import.meta.url), 'utf8'));

test('rows follow ADR 010: label line 18+2, bar 12, padding 10; bars scale to the largest value', () => {
	const svg = Charts.rank(rows), b = bars(svg);
	assert.equal(height(svg), 4 * 42 - 10);
	assert.deepEqual(b.map((x) => [x.x, x.w, x.y]), [[0, 100, 20], [0, 50, 62], [0, 25, 104], [0, 12.5, 146]]);
	assert.match(svg, /<text class="chart-label" x="0" y="13">sub-1<\/text><text class="chart-value" x="100%" y="13" text-anchor="end">400<\/text>/u);
});

test('one colour: every bar the brand solid; a highlight keeps one solid and greys the rest', () => {
	for (const theme of ['light', 'dark']) {
		const solid = pinned[`#e11d48 ${theme}`].solid;
		assert.ok(bars(Charts.rank(rows, { brand: '#e11d48', theme })).every((x) => x.cls === 'chart-bar' && x.fill === solid && x.op === 1));
		const h = bars(Charts.rank(rows, { brand: '#e11d48', theme, highlight: 2 }));
		assert.deepEqual(h.map((x) => [x.cls, x.fill, x.op]), [
			['chart-bar-muted', 'currentColor', 0.35], ['chart-bar-muted', 'currentColor', 0.35],
			['chart-bar', solid, 1], ['chart-bar-muted', 'currentColor', 0.35]]);
	}
	assert.equal(bars(Charts.rank(rows, { highlight: 0 }))[0].cls, 'chart-bar', 'index 0 is a highlight too');
});

test('a negative value grows left of a per-row zero line; nothing is clamped', () => {
	const svg = Charts.rank([R('a', 300), R('b', -100)]);
	// range 400, zero at 25%
	assert.deepEqual(bars(svg).map((x) => [x.x, x.w]), [[25, 75], [0, 25]]);
	assert.equal([...svg.matchAll(/<line class="chart-axis" x1="25%" x2="25%"/gu)].length, 2);
	assert.doesNotMatch(Charts.rank(rows), /chart-axis/u, 'no zero line without a negative value');
	// the negative bar is square at its baseline, on the right
	assert.equal([...svg.matchAll(/transform="translate\(-4\)"/gu)].length, 1);
});

test('a zero value keeps its row and label but draws no bar; all zeros draw none', () => {
	const svg = Charts.rank([R('a', 10), R('b', 0)]);
	assert.equal(bars(svg).length, 1);
	assert.match(svg, />b<\/text>/u);
	assert.equal(bars(Charts.rank([R('a', 0)])).length, 0);
});

test('each row is a group with one <title>; the label line is the core\'s', () => {
	const svg = Charts.rank([{ label: '<sub & "1">', value: 1, display: "it's" }]);
	assert.match(svg, /<g><title>&lt;sub &amp; &quot;1&quot;&gt;: it&#39;s<\/title>/u);
	const long = 'x'.repeat(50);
	assert.match(Charts.rank([R(long, 1)]), new RegExp(`<title>${long}: 1</title><text class="chart-label" x="0" y="13">x{41}…</text>`, 'u'));
	assert.equal(height(Charts.rank([{ label: 'x'.repeat(30), value: 1, display: '1'.repeat(12) }])), 32 + 18, 'long values take their own line');
});

test('accessible root, determinism, ids from what is drawn, no inline style', () => {
	const a = Charts.rank(rows, { title: 'Sources', desc: 'By GGR' });
	assert.match(a, /^<svg [^>]*role="img" aria-labelledby="chart-(\w+)-t chart-\1-d"/u);
	assert.match(Charts.rank(rows), /aria-hidden="true"/u);
	assert.equal(a, Charts.rank(rows.map((r) => ({ ...r })), { desc: 'By GGR', title: 'Sources' }));
	const id = (svg) => svg.match(/id="([^"]+)-t"/u)[1];
	assert.notEqual(id(a), id(Charts.rank(rows, { title: 'Sources', desc: 'By GGR', highlight: 1 })));
	assert.notEqual(id(a), id(Charts.rank([R('sub-1', 400), R('sub-2', 201)], { title: 'Sources', desc: 'By GGR' })));
	assert.equal(id(Charts.rank(rows, { title: 't' })), id(Charts.rank(rows, { title: 't', format: String })), 'an unused option changes nothing');
	assert.doesNotMatch(a, /style|<script|data-|data:/u);
	assert.match(Charts.rank(rows, { classPrefix: 'k', highlight: 0 }), /class="k-label".*class="k-value".*class="k-bar".*class="k-bar-muted"/su);
});

const throwsCases = [
	['rows that are not an array', 'a', undefined, /`rows` must be an array/u],
	['no rows', [], undefined, /no rows/u],
	['a null row', [null], undefined, /row 0 label must be a string/u],
	['a label that is not a string', [{ label: 1, value: 1, display: '1' }], undefined, /row 0 label must be a string/u],
	['a display missing', [{ label: 'a', value: 1 }], undefined, /row 0 display must be a string/u],
	['a NaN value', [R('a', NaN)], undefined, /row 0 value must be a finite number/u],
	['a string value', [{ label: 'a', value: '1', display: '1' }], undefined, /row 0 value must be a finite number/u],
	['values too far apart', [R('a', -1.7e308), R('b', 1.7e308)], undefined, /too far apart/u],
	['a highlight past the rows', rows, { highlight: 4 }, /`highlight` must be the index of a row/u],
	['a negative highlight', rows, { highlight: -1 }, /`highlight` must be the index of a row/u],
	['a fractional highlight', rows, { highlight: 1.5 }, /`highlight` must be the index of a row/u],
	['a highlight that is a string', rows, { highlight: '1' }, /`highlight` must be the index of a row/u],
	['a bad theme', rows, { theme: 'sepia' }, /theme/u],
];
for (const [name, data, options, msg] of throwsCases) {
	test(`throws: ${name}`, () => {
		assert.throws(() => Charts.rank(data, options), (e) => e instanceof TypeError && /^affiliate-charts: /u.test(e.message) && msg.test(e.message));
	});
}
