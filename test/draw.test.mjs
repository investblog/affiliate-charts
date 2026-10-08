// M3: what the funnel draws. Layout numbers come from ADR 010's table, scale and signs from ADR 007,
// colours from ADR 011. Colour checks recompute contrast and hue here, independently of the library.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Charts from '../charts-funnel.js';

const S = (label, value, extra) => ({ label, value, display: String(value), ...extra });
const E = (value) => ({ value, display: String(value) });
const legend = ['base', 'earned'];
const height = (svg) => Number(svg.match(/^<svg [^>]*height="([\d.]+)"/u)[1]);
// nested-svg bars: [class, x%, y, width%, height, fill, opacity]
const bars = (svg) => [...svg.matchAll(/<svg class="([^"]+)" x="([-\d.]+)%" y="([\d.]+)" width="([\d.]+)%" height="([\d.]+)" fill="([^"]+)" opacity="([\d.]+)"/gu)]
	.map((m) => ({ cls: m[1], x: +m[2], y: +m[3], w: +m[4], h: +m[5], fill: m[6], op: +m[7] }));
const texts = (svg, cls) => [...svg.matchAll(new RegExp(`<text class="chart-${cls}" x="([^"]+)" y="([\\d.]+)"[^>]*>(.*?)</text>`, 'gu'))]
	.map((m) => ({ x: m[1], y: +m[2], text: m[3] }));

test('root: full width, a fixed pixel height, no viewBox, 13px text in the page colour (ADR 009, 010)', () => {
	const svg = Charts.funnel([S('Clicks', 100)]);
	assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="100%" height="32" class="chart" font-size="13" fill="currentColor"/u);
	assert.doesNotMatch(svg, /viewBox/u);
});

test('heights follow ADR 010: label line 18+2, bar 12, part 8, shape 20, rate 16 (steps 20), padding 10, block 16', () => {
	assert.equal(height(Charts.funnel([S('a', 100)])), 32);
	assert.equal(height(Charts.funnel([S('a', 100), S('b', 50, { rate: '50%' })])), 90);
	assert.equal(height(Charts.funnel([S('a', 100), S('b', 50, { rate: '50%' })], { form: 'steps' })), 94);
	assert.equal(height(Charts.funnel([S('a', 100), S('b', 50, { part: true })])), 70);
	assert.equal(height(Charts.funnel([S('a', 100), S('b', 50)], { form: 'shape' })), 90);
	assert.equal(height(Charts.funnel([S('a', 100), S('b', 50, { gap: true })])), 90);
	assert.equal(height(Charts.funnel([S('a', 100), S('b', -50, { group: 'losses' })])), 90);
	// legend 2 × 18 + 8, then one row with base and earned bars
	assert.equal(height(Charts.funnel([S('a', 100, { earned: E(10) })], { legend })), 90);
});

test('bars scale to the largest |value| on the chart, never to a sum', () => {
	const b = bars(Charts.funnel([S('a', 200), S('b', 100), S('c', 50)]));
	assert.deepEqual(b.map((x) => x.w), [100, 50, 25]);
	assert.ok(b.every((x) => x.x === 0));
});

test('base and earned share the scale; earned sits 2px under the base, solid', () => {
	const b = bars(Charts.funnel([S('Deposits', 1000, { earned: E(1500) })], { legend }));
	assert.equal(b.length, 2);
	assert.equal(b[0].w, 66.667);
	assert.equal(b[1].w, 100, 'a CPA payout larger than its deposit is drawn larger, not nested');
	assert.equal(b[1].y, b[0].y + b[0].h + 2);
	assert.equal(b[0].fill, b[1].fill);
	assert.equal(b[0].op, Charts.palette().opacity);
	assert.equal(b[1].op, 1);
	assert.equal(b[1].cls, 'chart-bar-earned');
});

test('negative values grow left of a zero line; the scale includes both signs and nothing is clamped', () => {
	const svg = Charts.funnel([S('Deposits', 300), S('GGR', -100, { gap: true })]);
	const b = bars(svg);
	assert.deepEqual([b[0].x, b[0].w], [25, 75]);
	assert.deepEqual([b[1].x, b[1].w], [0, 25]);
	assert.match(svg, /<rect x="100%" width="4" height="12" transform="translate\(-4\)"\/>/u, 'a negative bar is square on the right');
	const axes = [...svg.matchAll(/<line class="chart-axis" x1="25%" x2="25%"/gu)];
	assert.equal(axes.length, 2, 'one zero-line segment per row');
});

test('no zero line without a negative value', () => {
	assert.doesNotMatch(Charts.funnel([S('a', 1), S('b', 0)]), /chart-axis/u);
});

test('losses share the main scale, after a separator, in currentColor', () => {
	const svg = Charts.funnel([S('Deposits', 100), S('Cancelled', -40, { group: 'losses', earned: E(-10) }),
		S('Rejected', 20, { group: 'losses' })], { legend });
	const loss = bars(svg).filter((x) => x.cls === 'chart-bar-loss');
	assert.deepEqual(loss.map((x) => x.w), [28.571, 14.286], '40 and 20 against 100 on a -40..100 scale');
	assert.ok(loss.every((x) => x.fill === 'currentColor' && x.op === 0.35));
	const earned = bars(svg).find((x) => x.cls === 'chart-bar-earned');
	assert.deepEqual([earned.fill, earned.op], ['currentColor', 0.7]);
	assert.equal([...svg.matchAll(/class="chart-grid"/gu)].length, 1, 'one separator before the block, none between losses');
});

test('a gap opens a block with a separator; a part is indented and thinner', () => {
	const svg = Charts.funnel([S('Deposits', 100), S('2nd', 50, { part: true }), S('GGR', 80, { gap: true })]);
	assert.equal([...svg.matchAll(/class="chart-grid"/gu)].length, 1);
	const part = bars(svg).find((x) => x.cls === 'chart-bar-part');
	assert.equal(part.h, 8);
	assert.equal(texts(svg, 'label')[1].x, '12');
});

test('a zero value keeps its row and label but draws no bar', () => {
	const svg = Charts.funnel([S('Clicks', 10), S('Registrations', 0)]);
	assert.equal(bars(svg).length, 1);
	assert.deepEqual(texts(svg, 'label').map((t) => t.text), ['Clicks', 'Registrations']);
	assert.deepEqual(texts(svg, 'value').map((t) => t.text), ['10', '0']);
});

test('rates: absent → no chip; null → an em dash; a string as given, escaped', () => {
	const svg = Charts.funnel([S('a', 10), S('b', 5, { rate: null }), S('c', 2, { rate: '<40%' })]);
	assert.deepEqual(texts(svg, 'rate').map((t) => t.text), ['↓ —', '↓ &lt;40%']);
});

test('values: the base value, then the earned one in semibold, on the label line', () => {
	const svg = Charts.funnel([S('Dep', 12, { earned: E(3) })], { legend });
	const v = texts(svg, 'value')[0];
	assert.equal(v.x, '100%');
	assert.equal(v.y, texts(svg, 'label')[0].y);
	assert.equal(v.text, '<tspan fill-opacity="0.75">12</tspan> · <tspan font-weight="600">3</tspan>');
});

test('a row that may not fit at 343px puts its values on their own line (8px a glyph)', () => {
	const fits = 'x'.repeat(40 - 2 - 2), over = 'x'.repeat(41 - 2 - 2); // 40 × 8 = 320, 41 × 8 = 328: both fit
	const at = (label) => { const svg = Charts.funnel([S(label, 10)]); return texts(svg, 'value')[0].y - texts(svg, 'label')[0].y; };
	assert.equal(at(fits), 0);
	assert.equal(at(over), 0);
	assert.equal(at('x'.repeat(41)), 18, '41 + 2 + 2 = 45 chars × 8 = 360 > 343');
});

test('labels past 42 characters are cut with an ellipsis; the row title keeps the whole label', () => {
	const long = 'L'.repeat(50);
	const svg = Charts.funnel([S(long, 10), S('p'.repeat(41), 5, { part: true })]);
	const labels = texts(svg, 'label').map((t) => t.text);
	assert.equal(labels[0], 'L'.repeat(41) + '…');
	assert.equal(labels[1], 'p'.repeat(39) + '…', 'a part loses two characters to its indent');
	assert.ok(svg.includes(`<title>${long}: 10</title>`));
	assert.equal(Charts.funnel([S('k'.repeat(42), 1)]).includes('…'), false, '42 characters fit');
});

test('truncation never splits an emoji into a lone surrogate', () => {
	const svg = Charts.funnel([S('x'.repeat(40) + '\u{1F600}yyy', 1)]);
	const label = texts(svg, 'label')[0].text;
	assert.equal(label, 'x'.repeat(40) + '…', 'the emoji is dropped whole');
	// without the u flag a pattern sees code units, so a lone high surrogate is visible to it
	assert.doesNotMatch(svg, new RegExp('[\\uD800-\\uDBFF](?![\\uDC00-\\uDFFF])'));
	assert.equal(texts(Charts.funnel([S('x'.repeat(39) + '\u{1F600}yyy', 1)]), 'label')[0].text, 'x'.repeat(39) + '\u{1F600}…',
		'an emoji that fits whole is kept');
});

test('in a chart with earned anywhere, every base bar is light, a step without earned included', () => {
	const b = bars(Charts.funnel([S('Deposits', 100, { earned: E(10) }), S('Revenue', 80, { gap: true })], { legend }));
	const base = b.filter((x) => x.cls === 'chart-bar');
	assert.deepEqual(base.map((x) => x.op), [0.6, 0.6], 'a solid bar would read as "earned"');
	assert.equal(bars(Charts.funnel([S('a', 1)]))[0].op, 1, 'a single-series chart stays solid');
});

test('each row is a group with one <title>: label, values and rate', () => {
	const svg = Charts.funnel([S('Dep', 12, { earned: E(3), rate: '5%' })], { legend });
	assert.match(svg, /<g><title>Dep: 12 \/ 3 \(5%\)<\/title><text class="chart-rate"/u);
});

test('legend: two entries, one per line, only when a step has earned', () => {
	const svg = Charts.funnel([S('a', 1, { earned: E(1) })], { legend: ['<base>', 'earned'] });
	assert.match(svg, /<g class="chart-legend"><rect x="0" y="3" [^>]*\/><text x="16" y="12">&lt;base&gt;<\/text><rect x="0" y="21" [^>]*\/><text x="16" y="30">earned<\/text><\/g>/u);
	const swatches = [...svg.matchAll(/<rect x="0" y="\d+" width="10" height="10" rx="2" fill="([^"]+)" opacity="([\d.]+)"\/>/gu)];
	assert.deepEqual(swatches.map((m) => +m[2]), [Charts.palette().opacity, 1], 'the swatches look like the bars they name');
	assert.doesNotMatch(Charts.funnel([S('a', 1)], { legend }), /chart-legend/u);
});

test('steps: a ghost of the previous main value behind each later main bar', () => {
	const svg = Charts.funnel([S('a', 100), S('u', 80, { part: true }), S('b', 40), S('l', -10, { group: 'losses' })], { form: 'steps' });
	const ghosts = bars(svg).filter((x) => x.cls === 'chart-bar-ghost');
	assert.equal(ghosts.length, 1, 'not on the first step, a part or a loss');
	assert.deepEqual([ghosts[0].w, ghosts[0].op], [90.909, 0.12], '100 on a -10..100 scale');
	assert.doesNotMatch(Charts.funnel([S('a', 100), S('b', 40)]), /ghost/u, 'bars form has none');
});

test('steps: a gap resets the ghost; a previous value that is not positive leaves none', () => {
	const ghosts = (steps) => bars(Charts.funnel(steps, { form: 'steps' })).filter((x) => x.cls === 'chart-bar-ghost').length;
	assert.equal(ghosts([S('Deposits', 100), S('GGR', 40, { gap: true }), S('Net', 20)]), 1, 'only Net, ghosting GGR');
	assert.equal(ghosts([S('a', 0), S('b', 10)]), 0);
	assert.equal(ghosts([S('a', -5), S('b', 10)]), 0);
});

test('shape: centred bands whose width is the value', () => {
	const b = bars(Charts.funnel([S('a', 100), S('b', 40)], { form: 'shape' }));
	assert.deepEqual(b.map((x) => [x.x, x.w, x.h]), [[0, 100, 20], [30, 40, 20]]);
});

test('a custom class prefix reaches every hook', () => {
	const svg = Charts.funnel([S('a', 10, { earned: E(1) }), S('p', 5, { part: true, rate: '1' }),
		S('l', -1, { group: 'losses' })], { legend, classPrefix: 'pap' });
	for (const hook of ['bar', 'bar-earned', 'bar-part', 'bar-loss', 'rate', 'label', 'value', 'legend', 'grid', 'axis']) {
		assert.ok(svg.includes(`class="pap-${hook}"`), hook);
	}
	assert.doesNotMatch(svg, /class="chart/u);
});

// ── palette (ADR 011), recomputed independently ──

const lin = (u) => { u /= 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; };
const rgb = (h) => h.slice(1).match(/../gu).map((x) => parseInt(x, 16));
const lum = (h) => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const okHue = (h) => {
	const [r, g, b] = rgb(h).map(lin);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return Math.atan2(0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s) * 180 / Math.PI;
};
const okL = (h) => {
	const [r, g, b] = rgb(h).map(lin);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
};
const away = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
const BRANDS = ['#0066ff', '#2563eb', '#e11d48', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#facc15', '#9a3412', '#22d3ee'];
const SURFACES = { light: ['#fcfcfb', '#f3f5f6', '#ffffff'], dark: ['#1a1a19', '#1f262c', '#11171c'] };

test('the solid mark clears 4.5:1 on the reference surface and keeps the brand hue', () => {
	for (const brand of BRANDS) {
		for (const theme of ['light', 'dark']) {
			const p = Charts.palette(brand, theme);
			assert.ok(contrast(p.solid, SURFACES[theme][0]) >= 4.5, `${brand} ${theme}: ${p.solid}`);
			assert.ok(away(okHue(p.solid), okHue(brand)) <= 4, `${brand} ${theme}: hue of ${p.solid}`);
		}
	}
	assert.equal(Charts.palette('#0066ff', 'dark').solid, '#317cff', 'blue stays blue when lifted (not #5e7bff)');
});

test('the solid mark stays inside the theme lightness band, even for black and white brands', () => {
	const band = { light: [0.43, 0.77], dark: [0.48, 0.67] };
	for (const brand of [...BRANDS, '#111111', '#ffffff', '#000080', '#ffff00']) {
		for (const theme of ['light', 'dark']) {
			const L = okL(Charts.palette(brand, theme).solid);
			assert.ok(L >= band[theme][0] && L <= band[theme][1], `${brand} ${theme}: L ${L.toFixed(3)}`);
		}
	}
});

test('the light mark is the solid at 0.6 over the surface and clears 2:1 on every sample surface', () => {
	for (const brand of BRANDS) {
		for (const theme of ['light', 'dark']) {
			const p = Charts.palette(brand, theme);
			assert.equal(p.opacity, 0.6);
			for (const s of SURFACES[theme]) {
				const over = '#' + rgb(p.solid).map((c, i) => Math.round(c * 0.6 + rgb(s)[i] * 0.4).toString(16).padStart(2, '0')).join('');
				assert.ok(contrast(over, s) >= 2, `${brand} ${theme} on ${s}: ${over}`);
			}
		}
	}
});

test('the default brand, and a dark theme that lifts rather than darkens', () => {
	assert.equal(Charts.palette().solid, Charts.palette('#2563eb').solid);
	assert.ok(lum(Charts.palette('#0066ff', 'dark').solid) > lum('#0066ff'));
	assert.ok(lum(Charts.palette('#facc15', 'light').solid) < lum('#facc15'));
});

test('the palette is pinned to its fixture, which the browser gate checks in every engine', () => {
	const fixture = JSON.parse(readFileSync(new URL('fixtures/palette.json', import.meta.url), 'utf8'));
	assert.equal(Object.keys(fixture).length, 32);
	for (const [key, want] of Object.entries(fixture)) {
		const [brand, theme] = key.split(' ');
		assert.deepEqual(Charts.palette(brand, theme), want, key);
	}
});

test('the chart draws with the palette of its brand and theme', () => {
	const svg = Charts.funnel([S('a', 1)], { brand: '#e11d48', theme: 'dark' });
	assert.equal(bars(svg)[0].fill, Charts.palette('#e11d48', 'dark').solid);
});
