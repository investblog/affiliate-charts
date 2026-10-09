// M8 Group D: the meter (spec). Positions are recomputed here from value / target, not read back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Charts from '../charts-meter.js';

const M = (value, target, extra) => ({ label: 'Tier 3', value, display: String(value), target, targetDisplay: 'tier 3 at ' + target, ...extra });
const height = (svg) => Number(svg.match(/^<svg [^>]*height="([\d.]+)"/u)[1]);
const bars = (svg) => [...svg.matchAll(/<svg class="chart-(track|bar)" x="0%" y="(\d+)" width="([\d.]+)%" height="12" fill="(#\w+)" opacity="([\d.]+)"/gu)]
	.map((m) => ({ cls: m[1], y: +m[2], w: +m[3], fill: m[4], op: +m[5] }));
const pinned = JSON.parse(readFileSync(new URL('fixtures/palette.json', import.meta.url), 'utf8'));

test('the track is the solid at 0.2 over the full length, the fill the solid to value / target', () => {
	for (const theme of ['light', 'dark']) {
		const solid = pinned[`#e11d48 ${theme}`].solid;
		assert.deepEqual(bars(Charts.meter(M(30, 120), { brand: '#e11d48', theme })), [
			{ cls: 'track', y: 20, w: 100, fill: solid, op: 0.2 }, { cls: 'bar', y: 20, w: 25, fill: solid, op: 1 }]);
	}
});

test('past the target the fill stops at the track\'s end; zero draws no fill', () => {
	assert.equal(bars(Charts.meter(M(118, 100)))[1].w, 100);
	assert.deepEqual(bars(Charts.meter(M(0, 10))).map((b) => b.cls), ['track']);
	assert.match(Charts.meter(M(118, 100)), />118<\/text>/u, 'the caller\'s display says by how much');
});

test('anatomy: the label line, the bar after 2px, the target end-anchored under it', () => {
	const svg = Charts.meter(M(30, 120));
	assert.equal(height(svg), 20 + 12 + 20);
	assert.match(svg, /<text class="chart-label" x="0" y="13">Tier 3<\/text><text class="chart-value" x="100%" y="13" text-anchor="end">30<\/text>/u);
	assert.match(svg, /<text class="chart-target" x="100%" y="47" text-anchor="end" opacity="0.7">tier 3 at 120<\/text>/u);
	assert.equal(height(Charts.meter({ ...M(1, 2), label: 'x'.repeat(30), display: '1'.repeat(12) })), 20 + 18 + 12 + 20, 'a long value takes its own line');
});

test('marks: hairlines at value / target, 3px beyond the bar, each with its title', () => {
	const svg = Charts.meter(M(30, 120, { marks: [{ value: 60, label: 'Tier 2 <30%>' }, { value: 120, label: 'Tier 3' }] }));
	const marks = [...svg.matchAll(/<line class="chart-mark" x1="([\d.]+)%" x2="\1%" y1="17" y2="35" stroke="currentColor" stroke-width="1"><title>(.*?)<\/title><\/line>/gu)].map((m) => [+m[1], m[2]]);
	assert.deepEqual(marks, [[50, 'Tier 2 &lt;30%&gt;'], [100, 'Tier 3']]);
	assert.doesNotMatch(Charts.meter(M(30, 120)), /chart-mark/u);
});

test('the bar\'s title says where it stands against the target, escaped', () => {
	assert.match(Charts.meter({ ...M(1, 2), label: '<CPA & "cap">' }), /<g><title>&lt;CPA &amp; &quot;cap&quot;&gt;: 1 \/ tier 3 at 2<\/title>/u);
	assert.match(Charts.meter({ ...M(1, 2), targetDisplay: "<cap's>" }), /class="chart-target"[^>]*>&lt;cap&#39;s&gt;<\/text>/u);
});

test('accessible root, determinism, ids from what is drawn, no inline style', () => {
	const a = Charts.meter(M(30, 120), { title: 'Next tier', desc: 'Revenue share' });
	assert.match(a, /^<svg [^>]*role="img" aria-labelledby="chart-(\w+)-t chart-\1-d"/u);
	assert.match(Charts.meter(M(30, 120)), /aria-hidden="true"/u);
	assert.equal(a, Charts.meter(M(30, 120), { desc: 'Revenue share', title: 'Next tier' }));
	const id = (svg) => svg.match(/id="([^"]+)-t"/u)[1];
	assert.notEqual(id(a), id(Charts.meter({ ...M(30, 120), display: '31' }, { title: 'Next tier', desc: 'Revenue share' })));
	assert.notEqual(id(a), id(Charts.meter(M(31, 120), { title: 'Next tier', desc: 'Revenue share' })));
	// M9 review: 1 of 4 and 2 of 8 with the same strings draw alike; the raw values keep them apart
	const same = (v, t) => ({ label: 'a', value: v, display: 'x', target: t, targetDisplay: 'y' });
	assert.notEqual(id(Charts.meter(same(1, 4), { title: 't' })), id(Charts.meter(same(2, 8), { title: 't' })));
	assert.doesNotMatch(a, /style|<script|data-|data:/u);
	assert.match(Charts.meter(M(30, 120, { marks: [{ value: 60, label: 'm' }] }), { classPrefix: 'k' }), /class="k-label".*class="k-value".*class="k-track".*class="k-bar".*class="k-mark".*class="k-target"/su);
});

const throwsCases = [
	['no meter', undefined, /the meter must be an object/u],
	['a meter that is a string', 'tier', /the meter must be an object/u],
	['a label missing', { ...M(1, 2), label: undefined }, /label must be a string/u],
	['a display that is a number', { ...M(1, 2), display: 1 }, /display must be a string/u],
	['a target display missing', { ...M(1, 2), targetDisplay: undefined }, /targetDisplay must be a string/u],
	['a negative value', M(-1, 2), /`value` cannot be negative/u],
	['a NaN value', M(NaN, 2), /value must be a finite number/u],
	['a zero target', M(1, 0), /`target` must be above zero/u],
	['a negative target', M(1, -5), /`target` must be above zero/u],
	['an Infinity target', M(1, Infinity), /target must be a finite number/u],
	['marks that are not an array', M(1, 2, { marks: { value: 1 } }), /`marks` must be an array/u],
	['a mark at zero', M(1, 2, { marks: [{ value: 0, label: 'a' }] }), /mark 0 must lie inside \(0, target\]/u],
	['a mark past the target', M(1, 2, { marks: [{ value: 3, label: 'a' }] }), /mark 0 must lie inside/u],
	['a mark without its label', M(1, 2, { marks: [{ value: 1 }] }), /mark 0 label must be a string/u],
	['a null mark', M(1, 2, { marks: [null] }), /mark 0 label must be a string/u],
];
for (const [name, data, msg] of throwsCases) {
	test(`throws: ${name}`, () => {
		assert.throws(() => Charts.meter(data), (e) => e instanceof TypeError && /^affiliate-charts: /u.test(e.message) && msg.test(e.message));
	});
}
