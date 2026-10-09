// M6 Group B: the sparkline and the KPI tile (spec, ADR 016). Positions are recomputed here from the
// rules (band centres, the values' own min and max, the tile's fixed lines), not read back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Charts from '../charts-spark.js';

const height = (svg) => Number(svg.match(/^<svg [^>]*height="([\d.]+)"/u)[1]);
const lines = (svg) => [...svg.matchAll(/<polyline class="chart-line" points="([^"]+)" fill="none" stroke="([^"]+)" stroke-opacity="([\d.]+)"/gu)]
	.map((m) => ({ pts: m[1].split(' ').map((p) => p.split(',').map(Number)), stroke: m[2], op: +m[3] }));
const dot = (svg) => {
	const m = svg.match(/<circle class="chart-dot" cx="([\d.]+)%" cy="([\d.]+)" r="4" fill="([^"]+)" stroke="([^"]+)" stroke-width="2"\/>/u);
	return m && { cx: +m[1], cy: +m[2], fill: m[3], ring: m[4] };
};
const pinned = JSON.parse(readFileSync(new URL('fixtures/palette.json', import.meta.url), 'utf8'));
const solid = (theme, brand = '#2563eb') => pinned[`${brand} ${theme}`].solid;

test('a sparkline: 32px, band centres, its own min and max, the box 6px inside', () => {
	const svg = Charts.spark([10, 30, 20, 40]);
	assert.equal(height(svg), 32);
	// min 10, max 40 → y = (40 − v) / 30 × 20 in a 20px box at y=6
	assert.deepEqual(lines(svg)[0].pts, [[12.5, 20], [37.5, 6.67], [62.5, 13.33], [87.5, 0]]);
	assert.match(svg, /<svg y="6" width="100%" height="20" viewBox="0 0 100 20" preserveAspectRatio="none" overflow="visible">/u);
	assert.match(svg, /stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/u);
	// a line is not a length: the scale leaves zero out, so a small change still shows
	assert.deepEqual(lines(Charts.spark([1000, 1010]))[0].pts.map((p) => p[1]), [20, 0]);
});

test('a sparkline\'s colour is the brand solid, its end dot on the last point with data, ringed in the surface', () => {
	for (const [theme, ring] of [['light', '#fcfcfb'], ['dark', '#1a1a19']]) {
		const svg = Charts.spark([1, 3, null], { theme, brand: '#e11d48' });
		assert.deepEqual([lines(svg)[0].stroke, lines(svg)[0].op], [solid(theme, '#e11d48'), 1]);
		assert.deepEqual(dot(svg), { cx: 50, cy: 6, fill: solid(theme, '#e11d48'), ring });
	}
});

test('a sparkline: null breaks the line, a lone point is a dot, equal values sit in the middle', () => {
	const svg = Charts.spark([1, 2, null, 3, null, 4, 5]);
	assert.equal(lines(svg).length, 2);
	assert.equal([...svg.matchAll(/<circle class="chart-line" cx="([\d.]+)%"/gu)].map((m) => +m[1]).join(), String(+(350 / 7).toFixed(3)));
	assert.deepEqual(lines(Charts.spark([5, 5, 5]))[0].pts.map((p) => p[1]), [10, 10, 10]);
	assert.doesNotMatch(Charts.spark([null, null]), /<polyline|<circle/u, 'no data, no marks');
	assert.equal(dot(Charts.spark([7])).cy, 16, 'one point: the middle');
});

const base = { label: 'EPC', value: '0.42' };
test('a tile: label 18, value 34, delta 22, a 4px gap and a 32px trend', () => {
	assert.equal(height(Charts.tile(base)), 52);
	assert.equal(height(Charts.tile({ ...base, delta: { display: '+8%', direction: 'up', good: true } })), 74);
	assert.equal(height(Charts.tile({ ...base, trend: [1, 2] })), 88);
	const all = Charts.tile({ ...base, delta: { display: '+8%', direction: 'up', good: true }, trend: [1, 2] });
	assert.equal(height(all), 110);
	assert.match(all, /<text class="chart-label" x="0" y="13" opacity="0.7">EPC<\/text><text class="chart-value" x="0" y="46" font-size="26" font-weight="600">0.42<\/text>/u);
	assert.match(all, /<text class="chart-delta chart-delta-good" x="0" y="68" fill="#\w+">▲ \+8%<\/text>/u);
	assert.match(all, /<g class="chart-trend"><svg y="84" width="100%" height="20"/u);
});

test('a change is coloured by good, whichever way it moves, and always carries its arrow', () => {
	for (const theme of ['light', 'dark']) {
		const good = pinned[`#0ca30c ${theme}`], bad = pinned[`#d03b3b ${theme}`];
		const t = (direction, g) => Charts.tile({ ...base, delta: { display: 'x', direction, good: g } }, { theme }).match(/<text class="(chart-delta[^"]*)" x="0" y="68"( fill="([^"]+)")?>(.*?)<\/text>/u);
		assert.deepEqual(t('up', true).slice(1), ['chart-delta chart-delta-good', ` fill="${good.solid}"`, good.solid, '▲ x']);
		assert.deepEqual(t('down', true).slice(1), ['chart-delta chart-delta-good', ` fill="${good.solid}"`, good.solid, '▼ x']);
		assert.deepEqual(t('up', false).slice(1), ['chart-delta chart-delta-bad', ` fill="${bad.solid}"`, bad.solid, '▲ x']);
		assert.deepEqual(t('down', false).slice(1), ['chart-delta chart-delta-bad', ` fill="${bad.solid}"`, bad.solid, '▼ x']);
		// flat: no arrow, the page colour, whatever `good` says
		assert.deepEqual(t('flat', true).slice(1), ['chart-delta', undefined, undefined, 'x']);
	}
});

test('the trend: the page colour at 0.35, the current period in the brand', () => {
	const svg = Charts.tile({ ...base, trend: [1, 2, 3] }, { brand: '#e11d48', theme: 'dark' });
	assert.deepEqual([lines(svg)[0].stroke, lines(svg)[0].op], ['currentColor', 0.35]);
	assert.deepEqual(dot(svg), { cx: 83.333, cy: 62, fill: solid('dark', '#e11d48'), ring: '#1a1a19' });
});

test('a label past 20 characters is cut with an ellipsis, the whole kept in a <title>, never splitting an emoji', () => {
	const long = 'Registrations → first deposit rate';
	assert.match(Charts.tile({ ...base, label: long }), new RegExp(`<text class="chart-label"[^>]*><title>${long}</title>Registrations → fir…</text>`, 'u'));
	assert.match(Charts.tile({ ...base, label: 'x'.repeat(20) }), />x{20}<\/text>/u, '20 fit');
	const emoji = 'x'.repeat(18) + '😀' + 'tail';
	assert.match(Charts.tile({ ...base, label: emoji }), new RegExp(`</title>${'x'.repeat(18)}…</text>`, 'u'));
});

test('text is escaped; the value is never cut', () => {
	const svg = Charts.tile({ label: '<a & "b">', value: '12 345 678 901.00', delta: { display: "it's", direction: 'flat' } });
	assert.match(svg, />&lt;a &amp; &quot;b&quot;&gt;</u);
	assert.match(svg, />12 345 678 901.00</u);
	assert.match(svg, />it&#39;s</u);
});

test('accessible root, determinism, ids from what is drawn, no inline style', () => {
	const t = { ...base, delta: { display: '+8%', direction: 'up', good: true }, trend: [1, 2] };
	const a = Charts.tile(t, { title: 'EPC', desc: 'Earnings per click' });
	assert.match(a, /^<svg [^>]*role="img" aria-labelledby="chart-(\w+)-t chart-\1-d"/u);
	assert.match(Charts.tile(t), /aria-hidden="true"/u);
	assert.equal(a, Charts.tile(JSON.parse(JSON.stringify(t)), { desc: 'Earnings per click', title: 'EPC' }));
	const id = (svg) => svg.match(/id="([^"]+)-t"/u)[1];
	assert.notEqual(id(a), id(Charts.tile({ ...t, value: '0.43' }, { title: 'EPC', desc: 'Earnings per click' })));
	// a sparkline is drawn on its own min and max, so 1→2 and 1→3 draw the same line: the values themselves
	// keep two such charts on one page apart
	assert.notEqual(id(Charts.spark([1, 2], { title: 's' })), id(Charts.spark([1, 3], { title: 's' })));
	assert.notEqual(id(Charts.tile({ ...base, trend: [1, 2] }, { title: 't' })), id(Charts.tile({ ...base, trend: [1, 3] }, { title: 't' })));
	assert.notEqual(id(Charts.spark([1, 2], { title: 's' })), id(Charts.spark([1, 2], { title: 's', theme: 'dark' })));
	assert.equal(id(Charts.spark([1, 2], { title: 's' })), id(Charts.spark([1, 2], { title: 's', format: String })), 'an unused option changes nothing');
	assert.doesNotMatch(a + Charts.spark([1, 2]), /style|<script|data-|data:/u);
	assert.match(Charts.tile(t, { classPrefix: 'k' }), /class="k-label".*class="k-value".*class="k-delta k-delta-good".*class="k-trend".*class="k-line".*class="k-dot"/su);
});

const throwsCases = [
	['spark values that are not an array', () => Charts.spark('1,2'), /`values` must be a non-empty array/u],
	['spark of no values', () => Charts.spark([]), /`values` must be a non-empty array/u],
	['a NaN in a spark', () => Charts.spark([1, NaN]), /values 1 must be a finite number/u],
	['a string in a spark', () => Charts.spark(['1']), /values 0 must be a finite number/u],
	['an undefined in a spark', () => Charts.spark([undefined]), /values 0 must be a finite number/u],
	['a spark too far apart', () => Charts.spark([-1.7e308, 1.7e308]), /too far apart/u],
	['a tile that is not an object', () => Charts.tile('EPC'), /the tile must be an object/u],
	['no tile', () => Charts.tile(), /the tile must be an object/u],
	['a numeric value', () => Charts.tile({ label: 'a', value: 1 }), /value must be a string/u],
	['a missing label', () => Charts.tile({ value: '1' }), /label must be a string/u],
	['a delta that is a string', () => Charts.tile({ ...base, delta: '+8%' }), /`delta` must be an object/u],
	['a delta without display', () => Charts.tile({ ...base, delta: { direction: 'flat' } }), /delta display must be a string/u],
	['an unknown direction', () => Charts.tile({ ...base, delta: { display: 'x', direction: 'left', good: true } }), /`direction` must be/u],
	['up without good', () => Charts.tile({ ...base, delta: { display: 'x', direction: 'up' } }), /need a boolean `good`/u],
	['down with a string good', () => Charts.tile({ ...base, delta: { display: 'x', direction: 'down', good: 'yes' } }), /need a boolean `good`/u],
	['an empty trend', () => Charts.tile({ ...base, trend: [] }), /`trend` must be a non-empty array/u],
	['a NaN in a trend', () => Charts.tile({ ...base, trend: [NaN] }), /trend 0 must be a finite number/u],
	['a bad theme', () => Charts.spark([1], { theme: 'sepia' }), /theme/u],
	['a bad brand', () => Charts.tile(base, { brand: 'red' }), /brand/u],
];
for (const [name, fn, msg] of throwsCases) {
	test(`throws: ${name}`, () => {
		assert.throws(fn, (e) => e instanceof TypeError && /^affiliate-charts: /u.test(e.message) && msg.test(e.message));
	});
}

test('allowed: a flat change without good, a trend of nulls, a one-point spark', () => {
	assert.match(Charts.tile({ ...base, delta: { display: '0%', direction: 'flat' } }), /^<svg /u);
	assert.match(Charts.tile({ ...base, trend: [null] }), /^<svg /u);
	assert.match(Charts.spark([3]), /^<svg /u);
});
