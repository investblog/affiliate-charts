// M8 Group D: the sankey (spec, ADR 019). Sizes and ribbons are recomputed here from the rules (one scale,
// the fullest column filling 240px with 16px gaps, ribbons stacked in the caller's order), not read back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Charts from '../charts-sankey.js';

const N = (id, column, short, label = 'node ' + id) => ({ id, column, short, label, display: 'd' + id });
const L = (from, to, value) => ({ from, to, value, display: String(value) });
// col 0: A 40, B 60 → (240 − 16) / 100 = 2.24; col 1: R max(50 in, 25 out), X 50 → 2.24; col 2: F 25 → 9.6. k = 2.24
const nodes = [N('A', 0, 'A'), N('B', 0, 'B'), N('R', 1, 'REG'), N('X', 1, 'NO'), N('F', 2, 'FTD')];
const links = [L('A', 'R', 30), L('A', 'X', 10), L('B', 'R', 20), L('B', 'X', 40), L('R', 'F', 25)];
const height = (svg) => Number(svg.match(/^<svg [^>]*height="([\d.]+)"/u)[1]);
const rects = (svg) => [...svg.matchAll(/<rect class="chart-node" x="([\d.]+)%" y="([\d.]+)" width="8" height="([\d.]+)" fill="(#\w+)"( transform="translate\(-([\d.]+)\)")?><title>(.*?)<\/title>/gu)]
	.map((m) => ({ x: +m[1], y: +m[2], h: +m[3], fill: m[4], shift: m[6] ? +m[6] : 0, title: m[7] }));
const paths = (svg) => [...svg.matchAll(/<path class="chart-link" d="([^"]+)" fill="(#\w+)" fill-opacity="([\d.]+)"><title>(.*?)<\/title>/gu)]
	.map((m) => ({ d: m[1], fill: m[2], op: +m[3], title: m[4] }));
const tags = (svg) => [...svg.matchAll(/<text class="chart-tag" x="([\d.]+)%" y="([\d.]+)" dx="([-\d.]+)"( text-anchor="end")? font-size="11" font-weight="600" stroke="(#\w+)" stroke-width="3" stroke-linejoin="round" paint-order="stroke">(.*?)<\/text>/gu)]
	.map((m) => ({ x: +m[1], y: +m[2], dx: +m[3], end: !!m[4], halo: m[5], text: m[6] }));
const pinned = JSON.parse(readFileSync(new URL('fixtures/palette.json', import.meta.url), 'utf8'));
const band = (x0, x1, y0, y1, h) => {
	const m = (x0 + x1) / 2, n = (v) => +v.toFixed(2);
	return `M${x0},${n(y0)}C${m},${n(y0)} ${m},${n(y1)} ${x1},${n(y1)}L${x1},${n(y1 + h)}C${m},${n(y1 + h)} ${m},${n(y0 + h)} ${x0},${n(y0 + h)}Z`;
};

test('one scale: the fullest column fills 240px with 16px gaps; a node is the larger of its in- and outflow', () => {
	const r = rects(Charts.sankey(nodes, links));
	// 8px above the plot
	assert.deepEqual(r.map((x) => [x.x, +(x.y - 8).toFixed(2), x.h]), [[0, 0, 89.6], [0, 105.6, 134.4], [50, 0, 112], [50, 128, 112], [100, 0, 56]]);
});

test('ribbons: filled bands column line to column line, stacked in the caller\'s order at both ends', () => {
	const p = paths(Charts.sankey(nodes, links));
	assert.deepEqual(p.map((x) => x.d), [
		band(0, 50, 0, 0, 67.2), band(0, 50, 67.2, 128, 22.4), band(0, 50, 105.6, 67.2, 44.8), band(0, 50, 150.4, 150.4, 89.6), band(50, 100, 0, 0, 56)]);
	assert.match(Charts.sankey(nodes, links), /<svg y="8" width="100%" height="240" viewBox="0 0 100 240" preserveAspectRatio="none"><path /u);
});

test('colour: nodes the brand solid, ribbons the solid at 0.3 (ADR 019)', () => {
	for (const theme of ['light', 'dark']) {
		const solid = pinned[`#e11d48 ${theme}`].solid, svg = Charts.sankey(nodes, links, { brand: '#e11d48', theme });
		assert.ok(rects(svg).every((x) => x.fill === solid));
		assert.ok(paths(svg).every((x) => x.fill === solid && x.op === 0.3));
		assert.ok(tags(svg).every((t) => t.halo === (theme === 'dark' ? '#1a1a19' : '#fcfcfb')));
	}
});

test('nodes sit inside the edges: moved left by 8 × c / (C − 1)', () => {
	assert.deepEqual(rects(Charts.sankey(nodes, links)).map((x) => x.shift), [0, 0, 4, 4, 8]);
	const four = [N('a', 0, 'a'), N('b', 1, 'b'), N('c', 2, 'c'), N('d', 3, 'd')];
	const r = rects(Charts.sankey(four, [L('a', 'b', 1), L('b', 'c', 1), L('c', 'd', 1)]));
	assert.deepEqual(r.map((x) => [x.x, x.shift]), [[0, 0], [33.333, 2.67], [66.667, 5.33], [100, 8]]);
});

test('tags: beside their node, centred on it, inward at the last column, haloed', () => {
	const t = tags(Charts.sankey(nodes, links));
	// y = 8 + top + h / 2 + 4; dx: right of the node (8 − shift + 4), or 12 left at the last column
	assert.deepEqual(t.map((x) => [x.text, x.x, +x.y.toFixed(2), x.dx, x.end]), [
		['A', 0, 56.8, 12, false], ['B', 0, 184.8, 12, false], ['REG', 50, 68, 8, false], ['NO', 50, 196, 8, false], ['FTD', 100, 40, -12, true]]);
});

test('titles: a ribbon names both ends and its display; a node its label and display; escaped', () => {
	const svg = Charts.sankey(nodes, links);
	assert.equal(paths(svg)[0].title, 'node A → node R: 30');
	assert.equal(rects(svg)[2].title, 'node R: dR');
	const esc = Charts.sankey([N('a', 0, '<', '<a & "b">'), N('b', 1, "'")], [L('a', 'b', 1)]);
	assert.match(esc, /<title>&lt;a &amp; &quot;b&quot;&gt; → node b: 1<\/title>/u);
	assert.match(esc, /paint-order="stroke">&lt;<\/text>/u);
	assert.match(esc, /paint-order="stroke">&#39;<\/text>/u);
});

test('the key: one line a node in the caller\'s order, tag and label, the display end-anchored', () => {
	const svg = Charts.sankey(nodes, links);
	assert.equal(height(svg), 8 + 240 + 12 + 5 * 20);
	const k = [...svg.matchAll(/<text class="chart-label" x="0" y="(\d+)">(.*?)<\/text><text class="chart-value" x="100%" y="\1" text-anchor="end">(.*?)<\/text>/gu)].map((m) => [+m[1], m[2], m[3]]);
	assert.deepEqual(k, [[273, 'A node A', 'dA'], [293, 'B node B', 'dB'], [313, 'REG node R', 'dR'], [333, 'NO node X', 'dX'], [353, 'FTD node F', 'dF']]);
	assert.match(svg, /<g class="chart-key"><text class="chart-label"/u);
	assert.equal(height(Charts.sankey([N('a', 0, 'a', 'x'.repeat(30)), N('b', 1, 'b')], [L('a', 'b', 1)])), 8 + 240 + 12 + 40);
	// a 30-character name with a 12-character display may not fit at 343px: the display takes its own line
	const long = [{ id: 'a', column: 0, short: 'a', label: 'x'.repeat(30), display: '1'.repeat(12) }, N('b', 1, 'b')];
	assert.equal(height(Charts.sankey(long, [L('a', 'b', 1)])), 8 + 240 + 12 + 40 + 18);
});

test('a node is the larger of its flows, out as well as in', () => {
	// M takes 10 in and sends 30 out: its size is 30. Column 1 holds M alone: 240 / 30 = 8, column 0: 240 / 10
	// = 24, column 2: 240 / 30 = 8 → k = 8 and M is the full 240
	const r = rects(Charts.sankey([N('a', 0, 'a'), N('m', 1, 'm'), N('z', 2, 'z')], [L('a', 'm', 10), L('m', 'z', 30)]));
	assert.deepEqual(r.map((x) => x.h), [80, 240, 240]);
});

test('a zero node keeps its key line and draws nothing; a zero link draws no ribbon', () => {
	const z = [...nodes, N('Z', 1, 'Z')];
	const svg = Charts.sankey(z, [...links, L('A', 'Z', 0)]);
	assert.equal(rects(svg).length, 5);
	assert.equal(paths(svg).length, 5);
	assert.match(svg, />Z node Z<\/text>/u);
	assert.deepEqual(rects(svg).map((x) => x.h), rects(Charts.sankey(nodes, links)).map((x) => x.h), 'a zero node takes no gap');
});

test('accessible root, determinism, ids from what is drawn and the flows, no inline style', () => {
	const a = Charts.sankey(nodes, links, { title: 'Flows', desc: 'October' });
	assert.match(a, /^<svg [^>]*role="img" aria-labelledby="chart-(\w+)-t chart-\1-d"/u);
	assert.match(Charts.sankey(nodes, links), /aria-hidden="true"/u);
	assert.equal(a, Charts.sankey(JSON.parse(JSON.stringify(nodes)), JSON.parse(JSON.stringify(links)), { desc: 'October', title: 'Flows' }));
	const id = (svg) => svg.match(/id="([^"]+)-t"/u)[1];
	// one scale fills the plot: doubled flows with the same displays draw alike
	const twice = links.map((l) => ({ ...l, value: l.value * 2 }));
	assert.notEqual(id(a), id(Charts.sankey(nodes, twice, { title: 'Flows', desc: 'October' })));
	assert.doesNotMatch(a, /style|<script|data-|data:/u);
	assert.match(Charts.sankey(nodes, links, { classPrefix: 'k' }), /class="k-link".*class="k-node".*class="k-tag".*class="k-key".*class="k-label"/su);
	assert.match(Charts.sankey([N('__proto__', 0, 'p'), N('constructor', 1, 'c')], [L('__proto__', 'constructor', 1)]), /^<svg /u, 'ids are ordinary keys');
});

const two = [N('a', 0, 'a'), N('b', 1, 'b')];
const throwsCases = [
	['nodes that are not an array', 'a', [], /`nodes` must be an array/u],
	['links that are not an array', two, {}, /`links` must be an array/u],
	['one column', [N('a', 0, 'a'), N('b', 0, 'b')], [], /two to four columns/u],
	['five columns', [0, 1, 2, 3, 4].map((c) => N('n' + c, c, 'n')), [], /`column` must be 0, 1, 2 or 3/u],
	['a column skipped', [N('a', 0, 'a'), N('b', 2, 'b')], [L('a', 'b', 1)], /column 1 has no node/u],
	['nine nodes in a column', [...Array.from({ length: 9 }, (_, i) => N('s' + i, 0, 's')), N('b', 1, 'b')], [], /column 0 has more than eight nodes/u],
	['a fractional column', [N('a', 0.5, 'a'), N('b', 1, 'b')], [], /node 0: `column` must be/u],
	['a column that is a string', [N('a', '0', 'a'), N('b', 1, 'b')], [], /node 0: `column` must be/u],
	['a repeated id', [N('a', 0, 'a'), N('a', 1, 'b')], [], /node 1: its id repeats/u],
	['a short tag of four characters', [N('a', 0, 'ABCD'), N('b', 1, 'b')], [], /node 0: `short` must be one to three characters/u],
	['an empty short tag', [N('a', 0, ''), N('b', 1, 'b')], [], /`short` must be one to three characters/u],
	['a label missing', [{ id: 'a', column: 0, short: 'a', display: 'x' }, N('b', 1, 'b')], [], /node 0 label must be a string/u],
	['a null node', [null, N('b', 1, 'b')], [], /node 0 id must be a string/u],
	['a link to an unknown node', two, [L('a', 'zz', 1)], /link 0: unknown node/u],
	['a null link', two, [null], /link 0 from must be a string/u],
	['a link backwards', two, [L('b', 'a', 1)], /link 0: a link joins a column to the next/u],
	['a link that skips a column', [N('a', 0, 'a'), N('m', 1, 'm'), N('b', 2, 'b')], [L('a', 'b', 1)], /link 0: a link joins a column to the next/u],
	['a link inside a column', [N('a', 0, 'a'), N('c', 0, 'c'), N('b', 1, 'b')], [L('a', 'c', 1)], /a link joins a column to the next/u],
	['a negative link', two, [L('a', 'b', -1)], /link 0 is negative/u],
	['a NaN link', two, [L('a', 'b', NaN)], /link 0 value must be a finite number/u],
	['a link without display', two, [{ from: 'a', to: 'b', value: 1 }], /link 0 display must be a string/u],
	['every link zero', two, [L('a', 'b', 0)], /every link is zero/u],
	['no links', two, [], /every link is zero/u],
	['flows that overflow', two, [L('a', 'b', 1.7e308), L('a', 'b', 1.7e308)], /overflow/u],
];
for (const [name, n, l, msg] of throwsCases) {
	test(`throws: ${name}`, () => {
		assert.throws(() => Charts.sankey(n, l), (e) => e instanceof TypeError && /^affiliate-charts: /u.test(e.message) && msg.test(e.message));
	});
}
