/*!
 * affiliate-charts / rank — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// The ranking: one bar a row, in the caller's order, one colour, an optional emphasis.
(function (root, factory) {
	var cjs = typeof module === 'object' && module.exports;
	var core = cjs ? require('./charts.js') : root.Charts;
	if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-rank.js');
	core.rank = factory(core._);
	if (cjs) module.exports = core;
})(typeof self !== 'undefined' ? self : this, function (_) {
	'use strict';

	function fail(msg) {
		_.fail('rank: ' + msg);
	}

	// Row anatomy in px (ADR 010): label line, bar, padding.
	var BAR = 12, PAD = 10;

	return function rank(rows, options) {
		var o = _.common(options), lo = 0, hi = 0, i, r, h = o.highlight;
		if (!Array.isArray(rows)) fail('`rows` must be an array');
		if (!rows.length) fail('no rows');
		for (i = 0; i < rows.length; i++) {
			r = rows[i] || {};
			_.str(r.label, 'row ' + i + ' label');
			_.str(r.display, 'row ' + i + ' display');
			lo = Math.min(lo, _.num(r.value, 'row ' + i + ' value'));
			hi = Math.max(hi, r.value);
		}
		if (!isFinite(hi - lo)) fail('values too far apart to share a scale');
		if (h != null && !(typeof h === 'number' && h >= 0 && h < rows.length && h % 1 === 0)) fail('`highlight` must be the index of a row');

		var p = o.classPrefix || 'chart', solid = _.palette(o.brand, o.theme).solid, range = hi - lo || 1, z = -lo / range * 100, y = 0, out = '';
		for (i = 0; i < rows.length; i++) {
			r = rows[i];
			var ll = _.labelLine(p, r.label, _.esc(r.display), r.label.length + r.display.length + 2, 0, y), row = ll.svg, muted = h != null && h !== i;
			y += ll.h;
			if (r.value) {
				var w = Math.abs(r.value) / range * 100;
				row += _.bar(r.value < 0 ? z - w : z, w, y, BAR, muted ? 'currentColor' : solid, muted ? 0.35 : 1,
					p + (muted ? '-bar-muted' : '-bar'), r.value < 0);
			}
			// the zero line, when any bar reaches below zero: beside this row's bar only (ADR 010)
			if (lo < 0) {
				row += _.el('line', ['class', p + '-axis', 'x1', _.pct(z), 'x2', _.pct(z), 'y1', y - 2, 'y2', y + BAR + 2,
					'stroke', 'currentColor', 'stroke-opacity', 0.35]);
			}
			y += BAR + PAD;
			out += _.el('g', [], _.el('title', [], _.esc(r.label + ': ' + r.display)) + row);
		}
		// ids from what is drawn and the raw values: one row of 1 and one of 2 draw alike (ADR 003)
		return _.svg(o, y - PAD, out, JSON.stringify([o.title, o.desc, rows.map(function (q) { return q.value; }), out]));
	};
});
