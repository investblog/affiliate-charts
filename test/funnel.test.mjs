// The funnel's input contract (spec, *Throws*; ADR 007) and the core's output rules that already apply
// at M1: the accessible root (ADR 006), escaping (ADR 004), determinism (ADR 003), no style (ADR 005).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import Charts from '../charts-funnel.js';

const S = (label, value, extra) => ({ label, value, display: String(value), ...extra });
const counts = [S('Clicks', 1840), S('Unique', 1210, { part: true }), S('Registrations', 312, { rate: '17%' }),
	S('First deposits', 41, { rate: null })];
const money = [S('Deposits', 12400, { earned: { value: 1860, display: '1860' } }),
	S('2nd deposits', 3000, { part: true }), S('Revenue — GGR', -450, { gap: true, earned: { value: -112.5, display: '-112.5' } }),
	S('Cancelled', -40, { group: 'losses' }), S('Rejected', 25, { group: 'losses' })];
const legend = ['base', 'earned'];

test('valid funnels draw: counts, and money with earned, part, gap, negative values and losses', () => {
	assert.match(Charts.funnel(counts), /^<svg [^>]*>.*<\/svg>$/su);
	assert.match(Charts.funnel(money, { legend }), /^<svg /u);
});

const throwsCases = [
	['no steps', [], {}],
	['no steps (undefined)', undefined, {}],
	['earned without legend', money, {}],
	['a part first', [S('Unique', 1, { part: true }), S('Clicks', 2)], {}],
	['a part inside losses', [S('a', 1), S('b', -1, { group: 'losses', part: true })], {}],
	['a main step after losses', [S('a', 1), S('b', -1, { group: 'losses' }), S('c', 1)], {}],
	['gap on a part', [S('a', 1), S('b', 1, { part: true, gap: true })], {}],
	['shape with earned', money.slice(0, 1), { form: 'shape', legend }],
	['shape with a part', counts, { form: 'shape' }],
	['shape with losses (a positive one: rejected)', [S('a', 1), S('b', 1, { group: 'losses' })], { form: 'shape' }],
	['shape with a negative value', [S('a', 1), S('b', -1)], { form: 'shape' }],
	['NaN value', [S('a', NaN)], {}],
	['Infinity value', [S('a', Infinity)], {}],
	['a string value', [S('a', '5')], {}],
	['NaN earned', [S('a', 1, { earned: { value: NaN, display: '' } })], { legend }],
	['no main step (losses only)', [S('a', -1, { group: 'losses' })], {}],
	['a null step', [null], {}],
	['a label that is not a string', [S(5, 1)], {}],
	['a display that is not a string', [{ label: 'a', value: 1, display: 1 }], {}],
	['an earned display missing', [S('a', 1, { earned: { value: 1 } })], { legend }],
	['a rate that is a number', [S('a', 1), S('b', 1, { rate: 0.17 })], {}],
	['an empty legend', money, { legend: [] }],
	['a legend string', money, { legend: 'base' }],
	['a legend of numbers', money, { legend: [1, 2] }],
	['options that are a string', counts, 'shape'],
	['a title that is not a string', counts, { title: 5 }],
	['a class prefix with a quote', counts, { classPrefix: 'x" onload="alert(1)' }],
	['a class prefix with a space', counts, { classPrefix: 'a b' }],
	['a class prefix starting with a digit', counts, { classPrefix: '1a' }],
	['a class prefix that is an array', counts, { classPrefix: ['chart'] }],
	['a class prefix that lies on its second toString', counts, {
		classPrefix: { calls: 0, toString() { return this.calls++ ? 'x" onload="y' : 'ok'; } },
	}],
	['a brand that is not a hex', counts, { brand: 'blue' }],
	['a circular brand', counts, (() => { const b = {}; b.b = b; return { brand: b }; })()],
	['an unknown theme', counts, { theme: 'sepia' }],
	['a zero width', counts, { width: 0 }],
	['a NaN width', counts, { width: NaN }],
	['an unknown form', counts, { form: 'pyramid' }],
];
for (const [name, steps, opts] of throwsCases) {
	// the library's own error, not an engine error that a broken check would also raise
	test(`throws: ${name}`, () => assert.throws(() => Charts.funnel(steps, opts), { name: 'TypeError', message: /^charts-lite: / }));
}

test('allowed: earned on a losses step, a single step, a null or absent rate', () => {
	assert.match(Charts.funnel([S('a', 1, { earned: { value: 1, display: '1' } }),
		S('b', -1, { group: 'losses', earned: { value: -1, display: '-1' } })], { legend }), /^<svg /u);
	assert.match(Charts.funnel([S('a', 1, { rate: null })]), /^<svg /u);
});

test('shape draws one positive series', () => {
	assert.match(Charts.funnel([S('a', 10), S('b', 0)], { form: 'shape' }), /^<svg /u);
});

test('with a title: role="img", <title> and <desc>, referenced by aria-labelledby', () => {
	const svg = Charts.funnel(counts, { title: 'Funnel', desc: 'Counts' });
	assert.match(svg, /role="img"/u);
	const ids = svg.match(/aria-labelledby="([^"]+)"/u)[1].split(' ');
	assert.equal(ids.length, 2);
	assert.ok(svg.includes(`<title id="${ids[0]}">Funnel</title>`));
	assert.ok(svg.includes(`<desc id="${ids[1]}">Counts</desc>`));
	assert.doesNotMatch(svg, /aria-hidden/u);
});

test('without a title: aria-hidden and no role', () => {
	const svg = Charts.funnel(counts);
	assert.match(svg, /^<svg [^>]*aria-hidden="true"/u);
	assert.doesNotMatch(svg, /role=|<title|aria-labelledby/u);
});

test('text is escaped, all five characters', () => {
	const svg = Charts.funnel(counts, { title: `<b>&"x'`, desc: `'"` });
	assert.ok(svg.includes('&lt;b&gt;&amp;&quot;x&#39;'));
	assert.ok(svg.includes('&#39;&quot;'));
	assert.doesNotMatch(svg.replace(/<\/?(svg|title|desc)\b[^>]*>/gu, ''), /[<>]/u);
});

test('the class prefix defaults to "chart" and starts every id', () => {
	assert.match(Charts.funnel(counts), /class="chart"/u);
	const svg = Charts.funnel(counts, { classPrefix: 'pap_f-1', title: 't', desc: 'd' });
	assert.match(svg, /class="pap_f-1"/u);
	const ids = [...svg.matchAll(/ id="([^"]+)"/gu)].map((m) => m[1]);
	assert.equal(ids.length, 2);
	for (const id of ids) assert.match(id, /^pap_f-1-[0-9a-z]+-[td]$/u);
});

test('deterministic: same input, same bytes; different input, different ids', () => {
	const a = Charts.funnel(counts, { title: 't' });
	assert.equal(Charts.funnel(structuredClone(counts), { title: 't' }), a);
	const b = Charts.funnel(counts.slice(0, 2), { title: 't' });
	assert.notEqual(a.match(/id="([^"]+)"/u)[1], b.match(/id="([^"]+)"/u)[1]);
});

test('ids come from what is drawn: option order and unused fields do not change them', () => {
	const a = Charts.funnel(counts, { title: 't', desc: 'd' });
	assert.equal(Charts.funnel(counts, { desc: 'd', title: 't' }), a);
	const extra = counts.map((s) => ({ ...s, row: { big: 10n } }));
	assert.equal(Charts.funnel(extra, { title: 't', desc: 'd', format: (v) => `${v}` }), a);
	assert.notEqual(Charts.funnel(counts, { title: 't', desc: 'd', form: 'steps' }).match(/id="([^"]+)"/u)[1],
		a.match(/id="([^"]+)"/u)[1], 'a different form is a different chart');
});

test('no inline style, script, data-* or data: in the output', () => {
	for (const svg of [Charts.funnel(counts, { title: 't' }), Charts.funnel(money, { legend })]) {
		assert.doesNotMatch(svg, /style=|<style|<script|data-|data:|<!--/u);
	}
});
