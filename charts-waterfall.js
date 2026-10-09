/*!
 * affiliate-charts / waterfall — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// The waterfall (ADR 014): totals from zero, deltas floating from the running total, one row a step.
(function (root, factory) {
	var cjs = typeof module === 'object' && module.exports;
	var core = cjs ? require('./charts.js') : root.Charts;
	if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-waterfall.js');
	core.waterfall = factory(core._);
	if (cjs) module.exports = core;
})(typeof self !== 'undefined' ? self : this, function (_) {
	'use strict';

	function fail(msg) {
		_.fail('waterfall: ' + msg);
	}

	// every rule the spec lists under *Throws*. Returns the fields the chart draws, in a fixed order — the
	// key its ids are derived from (ADR 003) — and the scale's two ends, over both ends of every bar.
	function check(steps) {
		if (!Array.isArray(steps)) fail('`steps` must be an array');
		if (!steps.length) fail('no steps');
		var key = [], run = 0, lo = 0, hi = 0;
		for (var i = 0; i < steps.length; i++) {
			var s = steps[i] || {}, at = 'step ' + i;
			key.push([_.str(s.label, at + ' label'), _.num(s.value, at + ' value'), _.str(s.display, at + ' display'), s.kind]);
			if (s.kind === 'total') run = s.value;
			else if (s.kind !== 'delta') fail(at + ': `kind` must be "total" or "delta"');
			else if (!i) fail('the first step must be a total');
			else run += s.value;
			// a bar's ends are the running totals before and after it; a delta's own value is a length
			lo = Math.min(lo, run);
			hi = Math.max(hi, run);
		}
		if (!isFinite(hi - lo)) fail('values too far apart to share a scale');
		key.lo = lo;
		key.hi = hi;
		return key;
	}

	// Row anatomy in px (ADR 010, 014): label line [value line] bar padding.
	var BAR = 12, PAD = 10;

	function draw(steps, opts, lo, hi) {
		var p = opts.classPrefix || 'chart', pal = _.palette(opts.brand, opts.theme);
		var down = _.palette(opts.brand, opts.theme, Math.PI).solid;
		var range = hi - lo || 1, z = -lo / range * 100, run = 0, y = 0, out = '';
		for (var i = 0; i < steps.length; i++) {
			var s = steps[i], v = s.value, total = s.kind === 'total', from = total ? 0 : run, row = '';
			var ll = _.labelLine(p, s.label, _.esc(s.display), s.label.length + s.display.length + 2, 0, y);
			row += ll.svg;
			y += ll.h;
			// behind a delta, the running total before it: the delta extends it or bites into it (ADR 014)
			if (!total && run) row += span(0, run, 'currentColor', 0.12, p + '-bar-ghost');
			if (v) {
				row += total ? span(0, v, pal.solid, 1, p + '-bar-total')
					: v > 0 ? span(from, from + v, pal.solid, pal.opacity, p + '-bar-up')
						: span(from, from + v, down, 1, p + '-bar-down');
			}
			// the zero line, when any bar reaches below zero: beside this row's bar only (ADR 010)
			if (lo < 0) {
				row += _.el('line', ['class', p + '-axis', 'x1', _.pct(z), 'x2', _.pct(z), 'y1', y - 2, 'y2', y + BAR + 2,
					'stroke', 'currentColor', 'stroke-opacity', 0.35]);
			}
			run = total ? v : run + v;
			y += BAR + PAD;
			out += _.el('g', [], _.el('title', [], _.esc(s.label + ': ' + s.display)) + row);
		}
		return { body: out, h: y - PAD };

		// a bar from a to b on the chart's scale; its rounded data end is at b
		function span(a, b, fill, op, cls) {
			return _.bar(z + Math.min(a, b) / range * 100, Math.abs(b - a) / range * 100, y, BAR, fill, op, cls, b < a);
		}
	}

	return function waterfall(steps, options) {
		var opts = _.common(options);
		var key = check(steps);
		key.push([opts.title, opts.desc, opts.brand, opts.theme]);
		var d = draw(steps, opts, key.lo, key.hi);
		return _.svg(opts, d.h, d.body, JSON.stringify(key));
	};
});
