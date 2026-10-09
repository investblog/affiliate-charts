// M1: the module contract (ADR 008). The core and the funnel load the ways the family promises — ES
// module default import, CommonJS, a page <script> — and a module loaded without the core says so.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import Charts from '../charts-funnel.js';
import Core from '../charts.js';

const require = createRequire(import.meta.url);
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

// a page: one global object, scripts run in order, no module system
function page(...files) {
	const self = {};
	const ctx = vm.createContext({ self });
	for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
	return self;
}

test('ES module default import and CommonJS give the same core, and the module returns the core', () => {
	assert.equal(typeof Charts.funnel, 'function');
	assert.equal(Charts, Core, 'the funnel module exports the core object');
	assert.equal(require('../charts-funnel.js'), require('../charts.js'));
	assert.equal(require('../charts-funnel.js').funnel, Charts.funnel);
});

test('as <script> tags: the core defines exactly one global and the module adds its chart to it', () => {
	const self = page('charts.js', 'charts-funnel.js');
	assert.deepEqual(Object.keys(self), ['Charts']);
	assert.equal(typeof self.Charts.funnel, 'function');
	assert.equal(typeof self.Charts.init, 'function');
	for (const f of ['charts.js', 'charts-funnel.js']) assert.doesNotMatch(read(f), /window\.\w+\s*=/u, f);
});

test('a module loaded before the core throws a clear error and defines nothing', () => {
	assert.throws(() => page('charts-funnel.js'), /load charts\.js before charts-funnel\.js/u);
});

test('loading a module twice is harmless', () => {
	const self = page('charts.js', 'charts-funnel.js', 'charts-funnel.js');
	assert.match(self.Charts.funnel([{ label: 'a', value: 1, display: '1' }]), /^<svg /u);
});

test('the internals are reachable by modules but absent from the public types', () => {
	assert.equal(typeof Core._, 'object');
	for (const f of ['charts.d.ts', 'charts-funnel.d.ts', 'charts-waterfall.d.ts']) assert.doesNotMatch(read(f), /\b_\s*:/u, f);
});

test('two modules share one core, in either order, through CommonJS and on a page', () => {
	assert.equal(require('../charts-waterfall.js'), require('../charts.js'));
	assert.equal(typeof require('../charts-waterfall.js').funnel, 'function', 'the funnel loaded above is on the same core');
	for (const files of [['charts.js', 'charts-funnel.js', 'charts-waterfall.js'], ['charts.js', 'charts-waterfall.js', 'charts-funnel.js']]) {
		const self = page(...files);
		assert.deepEqual(Object.keys(self), ['Charts']);
		assert.match(self.Charts.funnel([{ label: 'a', value: 1, display: '1' }]), /^<svg /u);
		assert.match(self.Charts.waterfall([{ label: 'a', value: 1, display: '1', kind: 'total' }]), /^<svg /u);
	}
	assert.doesNotMatch(read('charts-waterfall.js'), /window\.\w+\s*=/u);
});

test('the waterfall loaded before the core throws a clear error and defines nothing', () => {
	assert.throws(() => page('charts-waterfall.js'), /load charts\.js before charts-waterfall\.js/u);
	assert.equal(page('charts.js', 'charts-waterfall.js', 'charts-waterfall.js').Charts.funnel, undefined, 'a page that loads the waterfall alone gets no funnel');
});
