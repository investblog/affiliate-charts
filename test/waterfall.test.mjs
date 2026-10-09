// M6: the waterfall (spec, ADR 014) — its input contract and what it draws. Positions are recomputed
// here from the rule (totals from zero, deltas from the running total), not read back from the library.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Charts from '../charts-waterfall.js';

const T = (label, value) => ({ label, value, display: String(value), kind: 'total' });
const D = (label, value) => ({ label, value, display: String(value), kind: 'delta' });
const flow = [T('GGR', 1000), D('Bonuses', -200), D('Fees', -100), T('NGR', 700), D('Stays with the platform', -490), T('Commission', 210)];
const height = (svg) => Number(svg.match(/^<svg [^>]*height="([\d.]+)"/u)[1]);
// nested-svg bars: [class, x%, y, width%, height, fill, opacity]
const bars = (svg) => [...svg.matchAll(/<svg class="([^"]+)" x="([-\d.]+)%" y="([\d.]+)" width="([\d.]+)%" height="([\d.]+)" fill="([^"]+)" opacity="([\d.]+)"/gu)]
	.map((m) => ({ cls: m[1].replace('chart-bar-', ''), x: +m[2], y: +m[3], w: +m[4], h: +m[5], fill: m[6], op: +m[7] }));
const texts = (svg, cls) => [...svg.matchAll(new RegExp(`<text class="chart-${cls}" x="([^"]+)" y="([\\d.]+)"[^>]*>(.*?)</text>`, 'gu'))]
	.map((m) => ({ x: m[1], y: +m[2], text: m[3] }));
const pinned = JSON.parse(readFileSync(new URL('fixtures/palette.json', import.meta.url), 'utf8'));

test('a waterfall draws: totals from zero, deltas from the running total, a ghost behind each delta', () => {
	const b = bars(Charts.waterfall(flow));
	assert.deepEqual(b.map((x) => [x.cls, x.x, x.w]), [
		['total', 0, 100],
		['ghost', 0, 100], ['down', 80, 20],
		['ghost', 0, 80], ['down', 70, 10],
		['total', 0, 70],
		['ghost', 0, 70], ['down', 21, 49],
		['total', 0, 21],
	]);
});

test('rows follow ADR 010: label line 18+2, bar 12, padding 10; the ghost sits under its delta', () => {
	const svg = Charts.waterfall(flow), b = bars(svg);
	assert.equal(height(Charts.waterfall([T('a', 1)])), 32);
	assert.equal(height(svg), 6 * 42 - 10);
	assert.deepEqual(b.filter((x) => x.cls !== 'ghost').map((x) => x.y), [20, 62, 104, 146, 188, 230]);
	assert.ok(b.every((x) => x.h === 12));
	assert.equal(b[1].y, b[2].y, 'a ghost and its delta share the row');
	assert.ok(svg.indexOf('chart-bar-ghost') < svg.indexOf('chart-bar-down'), 'the ghost is drawn first, under the delta');
	assert.deepEqual(texts(svg, 'label').map((t) => [t.x, t.y]).slice(0, 2), [['0', 13], ['0', 55]]);
	assert.deepEqual(texts(svg, 'value').map((t) => [t.x, t.text]).slice(0, 2), [['100%', '1000'], ['100%', '-200']]);
});

test('colour: a total is the solid mark, an increase the light mark, a decrease the opposite hue (ADR 014)', () => {
	for (const theme of ['light', 'dark']) {
		const b = bars(Charts.waterfall([T('a', 100), D('b', 50), D('c', -30)], { brand: '#e11d48', theme }));
		const solid = pinned[`#e11d48 ${theme}`].solid, turned = pinned[`#e11d48 ${theme} turned`].solid;
		assert.deepEqual([b[0].fill, b[0].op], [solid, 1]);
		assert.deepEqual([b[2].cls, b[2].fill, b[2].op], ['up', solid, 0.6]);
		assert.deepEqual([b[4].cls, b[4].fill, b[4].op], ['down', turned, 1]);
		assert.notEqual(turned, solid);
		assert.deepEqual([b[1].fill, b[1].op], ['currentColor', 0.12]);
	}
});

test('an increase grows right of the running total, a decrease left; the rounded end is the data end', () => {
	const svg = Charts.waterfall([T('a', 50), D('up', 50), D('down', -25)]);
	const b = bars(svg).filter((x) => x.cls !== 'ghost');
	assert.deepEqual(b.map((x) => [x.cls, x.x, x.w]), [['total', 0, 50], ['up', 50, 50], ['down', 75, 25]]);
	// a bar ending left of where it starts is square on the right (the core's bar)
	assert.equal([...svg.matchAll(/transform="translate\(-4\)"/gu)].length, 1);
});

test('one scale over zero and both ends of every bar: a negative total and a delta crossing zero', () => {
	const svg = Charts.waterfall([T('GGR', -200), D('Recovered', 500), T('Result', 300)]);
	const b = bars(svg);
	// range 500, zero at 40%
	assert.deepEqual(b.map((x) => [x.cls, x.x, x.w]), [['total', 0, 40], ['ghost', 0, 40], ['up', 0, 100], ['total', 40, 60]]);
	assert.equal([...svg.matchAll(/<line class="chart-axis" x1="40%" x2="40%"/gu)].length, 3, 'a zero line beside every row');
	assert.doesNotMatch(Charts.waterfall(flow), /chart-axis/u, 'no zero line when nothing reaches below zero');
	// the running total, not the values alone, sets the scale: 100 − 300 reaches −200
	const r = bars(Charts.waterfall([T('a', 100), D('b', -300)]));
	assert.deepEqual(r.map((x) => [x.cls, x.x, x.w]), [['total', 66.667, 33.333], ['ghost', 66.667, 33.333], ['down', 0, 100]]);
});

test('a zero value keeps its row and label but draws no bar; a zero running total draws no ghost', () => {
	const svg = Charts.waterfall([T('a', 100), D('nothing', 0), T('zero', 0), D('b', 40)]);
	assert.deepEqual(bars(svg).map((x) => x.cls), ['total', 'ghost', 'up']);
	assert.deepEqual(texts(svg, 'label').map((t) => t.text), ['a', 'nothing', 'zero', 'b']);
	assert.equal(height(svg), 4 * 42 - 10);
});

test('a total that does not match the running sum is drawn at its own value', () => {
	const b = bars(Charts.waterfall([T('GGR', 100), D('Bonuses', -10), T('NGR', 50)]));
	assert.deepEqual([b[3].cls, b[3].x, b[3].w], ['total', 0, 50]);
});

test('each row is a group with one <title>: label and value, escaped', () => {
	const svg = Charts.waterfall([T('GGR <all>', 100), { label: 'Fees & "tax"', value: -5, display: '−5.00', kind: 'delta' }]);
	const groups = [...svg.matchAll(/<g><title>(.*?)<\/title>/gu)].map((m) => m[1]);
	assert.deepEqual(groups, ['GGR &lt;all&gt;: 100', 'Fees &amp; &quot;tax&quot;: −5.00']);
});

test('the label line is the funnel\'s: a long label is cut, long values take their own line', () => {
	const long = 'A label that goes on far past the forty-two characters a row holds';
	const svg = Charts.waterfall([T(long, 1), { label: 'x', value: 2, display: '9'.repeat(41), kind: 'delta' }]);
	const l = texts(svg, 'label'), v = texts(svg, 'value');
	assert.equal(l[0].text, long.slice(0, 41) + '…');
	assert.equal(v[0].y, l[0].y + 18, 'label + value past 343px: values on the next line');
	assert.equal(v[1].y, l[1].y + 18, 'a long value alone splits too');
	assert.equal(height(Charts.waterfall([T('x', 1), D('y', 1)])) + 18, height(Charts.waterfall([T(long, 1), D('y', 1)])));
});

test('accessible root, determinism, ids from what is drawn, no inline style', () => {
	const a = Charts.waterfall(flow, { title: 'Money flow', desc: 'GGR to commission' });
	assert.match(a, /^<svg [^>]*role="img" aria-labelledby="chart-(\w+)-t chart-\1-d"/u);
	assert.match(Charts.waterfall(flow), /aria-hidden="true"/u);
	assert.equal(a, Charts.waterfall(flow.map((s) => ({ ...s })), { desc: 'GGR to commission', title: 'Money flow' }));
	const id = (svg) => svg.match(/id="([^"]+)-t"/u)[1];
	const kinds = flow.map((s, i) => (i === 3 ? { ...s, kind: 'delta' } : s));
	assert.notEqual(id(a), id(Charts.waterfall(kinds, { title: 'Money flow', desc: 'GGR to commission' })), 'the kind is drawn, so it is in the id');
	assert.equal(id(Charts.waterfall(flow, { title: 't', format: String })), id(Charts.waterfall(flow, { title: 't' })), 'an unused option changes nothing');
	// two charts of the same steps on one page — this month and last month's titles — must not share ids
	assert.notEqual(id(Charts.waterfall(flow, { title: 'May' })), id(Charts.waterfall(flow, { title: 'June' })));
	assert.notEqual(id(Charts.waterfall(flow, { title: 't' })), id(Charts.waterfall(flow, { title: 't', theme: 'dark' })));
	assert.doesNotMatch(a, /style|<script|data-|data:/u);
	assert.match(Charts.waterfall(flow, { classPrefix: 'k' }), /class="k-bar-total".*class="k-bar-ghost".*class="k-bar-down".*class="k-label"/su);
});

const throwsCases = [
	['steps that are not an array', 'GGR', /`steps` must be an array/u],
	['no steps', [], /no steps/u],
	['a first step that is a delta', [D('a', 1)], /the first step must be a total/u],
	['an unknown kind', [T('a', 1), { ...D('b', 1), kind: 'start' }], /step 1: `kind` must be/u],
	['a missing kind', [{ label: 'a', value: 1, display: '1' }], /step 0: `kind` must be/u],
	['a NaN value', [T('a', NaN)], /step 0 value must be a finite number/u],
	['an Infinity delta', [T('a', 1), D('b', -Infinity)], /step 1 value must be a finite number/u],
	['a string value', [T('a', '5')], /must be a finite number/u],
	['a label that is not a string', [T(5, 1)], /step 0 label must be a string/u],
	['a display missing', [{ label: 'a', value: 1, kind: 'total' }], /step 0 display must be a string/u],
	['a null step', [null], /step 0 label/u],
	['a running total that overflows', [T('a', 1e308), D('b', 1e308)], /too far apart/u],
	['totals too far apart', [T('a', -1.7e308), T('b', 1.7e308)], /too far apart/u],
];
for (const [name, steps, msg] of throwsCases) {
	test(`throws: ${name}`, () => {
		assert.throws(() => Charts.waterfall(steps), (e) => e instanceof TypeError && /^affiliate-charts: /u.test(e.message) && msg.test(e.message));
	});
}

test('throws on the shared options, like the funnel', () => {
	assert.throws(() => Charts.waterfall(flow, { theme: 'sepia' }), /theme/u);
	assert.throws(() => Charts.waterfall(flow, { brand: 'red' }), /brand/u);
	assert.throws(() => Charts.waterfall(flow, 'dark'), /options must be an object/u);
});

test('allowed: a delta after a delta, a waterfall of one total', () => {
	assert.match(Charts.waterfall([T('a', 5)]), /^<svg /u);
	assert.match(Charts.waterfall([T('a', 5), D('b', 1), D('c', 1)]), /^<svg /u);
});
