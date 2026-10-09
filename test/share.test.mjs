// M7 Group C: part to whole (spec, ADR 017). Shares are recomputed here from the values, the donut's
// dashes from the circumference, not read back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Charts from '../charts-share.js';

const P = (label, value) => ({ label, value, display: String(value) });
const parts = [P('Android', 50), P('iOS', 30), P('Desktop', 20)];
const height = (svg) => Number(svg.match(/^<svg [^>]*height="([\d.]+)"/u)[1]);
const rects = (svg) => [...svg.matchAll(/<rect class="chart-part chart-part-(\d)" x="([\d.]+)%" width="([\d.]+)%" height="24" fill="([^"]+)"><title>(.*?)<\/title>/gu)]
	.map((m) => ({ slot: +m[1], x: +m[2], w: +m[3], fill: m[4], title: m[5] }));
const arcs = (svg) => [...svg.matchAll(/<circle class="chart-part chart-part-(\d)" cx="50" cy="50" r="40" fill="none" stroke="([^"]+)" stroke-width="16"( stroke-dasharray="([\d.]+) ([\d.]+)" stroke-dashoffset="([-\d.]+)")? transform="rotate\(-90 50 50\)"><title>(.*?)<\/title>/gu)]
	.map((m) => ({ slot: +m[1], fill: m[2], dash: m[4] && +m[4], rest: m[5] && +m[5], offset: m[6] && +m[6], title: m[7] }));
const LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300'];
const CIRC = 2 * Math.PI * 40;

test('the bar: parts at their share of the width, a 2px surface line between, then the key', () => {
	const svg = Charts.share(parts);
	assert.deepEqual(rects(svg).map((r) => [r.x, r.w]), [[0, 50], [50, 30], [80, 20]]);
	const gaps = [...svg.matchAll(/<line x1="([\d.]+)%" x2="\1%" y2="24" stroke="(#\w+)" stroke-width="2"\/>/gu)].map((m) => [+m[1], m[2]]);
	assert.deepEqual(gaps, [[50, '#fcfcfb'], [80, '#fcfcfb']], 'between parts only: no frame at 0% or 100%');
	assert.equal(height(svg), 24 + 12 + 3 * 20);
	assert.match(svg, /<g class="chart-key"><rect x="0" y="39" width="10" height="10" rx="2" fill="#2a78d6"\/><text class="chart-label" x="16" y="49">Android<\/text><text class="chart-value" x="100%" y="49" text-anchor="end">50<\/text>/u);
});

test('colour: the fixed slots by index, per theme; the brand is not used', () => {
	const six = [1, 2, 3, 4, 5, 6].map((v, i) => P('p' + i, v));
	assert.deepEqual(rects(Charts.share(six)).map((r) => [r.slot, r.fill]), LIGHT.map((c, i) => [i + 1, c]));
	assert.deepEqual(rects(Charts.share(six, { theme: 'dark' })).map((r) => r.fill), DARK);
	assert.equal(Charts.share(six, { brand: '#e11d48' }), Charts.share(six), 'the brand changes nothing');
	const swatches = [...Charts.share(six, { theme: 'dark' }).matchAll(/<rect x="0" y="[\d.]+" width="10" height="10" rx="2" fill="([^"]+)"/gu)].map((m) => m[1]);
	assert.deepEqual(swatches, DARK);
	assert.match(Charts.share([P('a', 1), P('b', 1)], { theme: 'dark' }), /stroke="#1a1a19" stroke-width="2"/u);
});

test('the donut: dashes of the circumference less a 1.25 gap, from 12 o\'clock, clockwise', () => {
	const svg = Charts.share(parts, { form: 'donut' }), a = arcs(svg);
	assert.deepEqual(a.map((x) => [x.slot, x.dash, x.rest, x.offset]), [
		[1, +(0.5 * CIRC - 1.25).toFixed(3), +CIRC.toFixed(3), 0],
		[2, +(0.3 * CIRC - 1.25).toFixed(3), +CIRC.toFixed(3), +(-0.5 * CIRC).toFixed(3)],
		[3, +(0.2 * CIRC - 1.25).toFixed(3), +CIRC.toFixed(3), +(-0.8 * CIRC).toFixed(3)],
	]);
	assert.match(svg, /<svg width="100%" height="160" viewBox="0 0 100 100">/u);
	assert.equal(height(svg), 160 + 12 + 3 * 20);
	assert.doesNotMatch(svg, /<line /u, 'no bar gaps in a donut');
	// one part alone: the whole ring, no dash
	assert.deepEqual(arcs(Charts.share([P('All', 5), P('None', 0)], { form: 'donut' })).map((x) => [x.slot, x.dash]), [[1, undefined]]);
	// a sliver keeps half a unit, so a tiny part stays visible
	assert.equal(arcs(Charts.share([P('a', 10000), P('b', 1)], { form: 'donut' }))[1].dash, 0.5);
});

test('a zero part keeps its key line and draws nothing; it keeps its slot', () => {
	const svg = Charts.share([P('a', 1), P('zero', 0), P('c', 1)]);
	assert.deepEqual(rects(svg).map((r) => [r.slot, r.x, r.w]), [[1, 0, 50], [3, 50, 50]]);
	assert.match(svg, />zero<\/text>/u);
	assert.equal([...svg.matchAll(/<line /gu)].length, 1);
	assert.deepEqual(rects(Charts.share([P('one', 3)])).map((r) => [r.x, r.w]), [[0, 100]]);
	assert.doesNotMatch(Charts.share([P('one', 3)]), /<line /u);
});

test('each part has a <title>; text escaped; the key line is the core\'s', () => {
	const svg = Charts.share([{ label: '<iOS & "co">', value: 1, display: "it's" }]);
	assert.match(svg, /<title>&lt;iOS &amp; &quot;co&quot;&gt;: it&#39;s<\/title>/u);
	assert.match(Charts.share([P('x'.repeat(50), 1)]), /x{39}…<\/text>/u, 'the key label is cut as an indented row');
	// a 30-character name with a 12-character value may not fit at 343px: the value takes its own line
	assert.equal(height(Charts.share([{ label: 'x'.repeat(30), value: 1, display: '1'.repeat(12) }])), 24 + 12 + 20 + 18);
	assert.equal(height(Charts.share([{ label: 'x'.repeat(30), value: 1, display: '1'.repeat(4) }])), 24 + 12 + 20);
});

test('accessible root, determinism, ids from what is drawn and the values, no inline style', () => {
	const a = Charts.share(parts, { title: 'Devices', desc: 'Clicks' });
	assert.match(a, /^<svg [^>]*role="img" aria-labelledby="chart-(\w+)-t chart-\1-d"/u);
	assert.match(Charts.share(parts), /aria-hidden="true"/u);
	assert.equal(a, Charts.share(parts.map((q) => ({ ...q })), { desc: 'Clicks', title: 'Devices' }));
	const id = (svg) => svg.match(/id="([^"]+)-t"/u)[1];
	// 1:1 and 2:2 draw the same bar: the values keep them apart
	const same = (v) => [{ label: 'a', value: v, display: 'x' }, { label: 'b', value: v, display: 'x' }];
	assert.notEqual(id(Charts.share(same(1), { title: 't' })), id(Charts.share(same(2), { title: 't' })));
	assert.notEqual(id(a), id(Charts.share(parts, { title: 'Devices', desc: 'Clicks', form: 'donut' })));
	assert.notEqual(id(a), id(Charts.share(parts, { title: 'Devices', desc: 'Clicks', theme: 'dark' })));
	assert.doesNotMatch(a + Charts.share(parts, { form: 'donut' }), /style|<script|data-|data:/u);
	assert.match(Charts.share(parts, { classPrefix: 'k' }), /class="k-part k-part-1".*class="k-key".*class="k-label".*class="k-value"/su);
});

const throwsCases = [
	['parts that are not an array', 'a', undefined, /`parts` must be an array/u],
	['no parts', [], undefined, /one to six parts/u],
	['seven parts', [1, 2, 3, 4, 5, 6, 7].map((v) => P('p', v)), undefined, /one to six parts/u],
	['seven parts in a donut', [1, 2, 3, 4, 5, 6, 7].map((v) => P('p', v)), { form: 'donut' }, /one to six parts/u],
	['a negative part', [P('a', 2), P('b', -1)], undefined, /part 1 is negative/u],
	['every part zero', [P('a', 0), P('b', 0)], undefined, /every part is zero/u],
	['a NaN part', [P('a', NaN)], undefined, /part 0 value must be a finite number/u],
	['a null part', [null], undefined, /part 0 label must be a string/u],
	['a display missing', [{ label: 'a', value: 1 }], undefined, /part 0 display must be a string/u],
	['a sum that overflows', [P('a', 1.7e308), P('b', 1.7e308)], undefined, /overflow/u],
	['an unknown form', parts, { form: 'pie' }, /unknown form/u],
	['a bad theme', parts, { theme: 'sepia' }, /theme/u],
];
for (const [name, data, options, msg] of throwsCases) {
	test(`throws: ${name}`, () => {
		assert.throws(() => Charts.share(data, options), (e) => e instanceof TypeError && /^affiliate-charts: /u.test(e.message) && msg.test(e.message));
	});
}
