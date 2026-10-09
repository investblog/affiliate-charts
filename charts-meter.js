/*!
 * affiliate-charts / meter — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// The meter: progress to the next tier or a cap, a fill on a lighter track of the brand.
(function (root, factory) {
	var cjs = typeof module === 'object' && module.exports;
	var core = cjs ? require('./charts.js') : root.Charts;
	if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-meter.js');
	core.meter = factory(core._);
	if (cjs) module.exports = core;
})(typeof self !== 'undefined' ? self : this, function (_) {
	'use strict';

	function fail(msg) {
		_.fail('meter: ' + msg);
	}

	// Anatomy in px (ADR 010): label line, BAR, the target's line. TRACK: the track's opacity.
	var BAR = 12, TRACK = 0.2;

	return function meter(m, options) {
		var o = _.common(options), i, k;
		if (!m || typeof m !== 'object') fail('the meter must be an object');
		var label = _.str(m.label, 'label'), display = _.str(m.display, 'display'), td = _.str(m.targetDisplay, 'targetDisplay');
		if (_.num(m.value, 'value') < 0) fail('`value` cannot be negative');
		if (!(_.num(m.target, 'target') > 0)) fail('`target` must be above zero');
		var marks = m.marks == null ? [] : m.marks;
		if (!Array.isArray(marks)) fail('`marks` must be an array');
		for (i = 0; i < marks.length; i++) {
			k = marks[i] || {};
			_.str(k.label, 'mark ' + i + ' label');
			if (!(_.num(k.value, 'mark ' + i + ' value') > 0 && k.value <= m.target)) fail('mark ' + i + ' must lie inside (0, target]');
		}

		var p = o.classPrefix || 'chart', solid = _.palette(o.brand, o.theme).solid, f = Math.min(1, m.value / m.target) * 100;
		var ll = _.labelLine(p, label, _.esc(display), label.length + display.length + 2, 0, 0), y = ll.h;
		var bar = _.bar(0, 100, y, BAR, solid, TRACK, p + '-track') + (f ? _.bar(0, f, y, BAR, solid, 1, p + '-bar') : '');
		for (i = 0; i < marks.length; i++) {
			var x = _.pct(marks[i].value / m.target * 100);
			bar += _.el('line', ['class', p + '-mark', 'x1', x, 'x2', x, 'y1', y - 3, 'y2', y + BAR + 3, 'stroke', 'currentColor', 'stroke-width', 1],
				_.el('title', [], _.esc(marks[i].label)));
		}
		var out = _.el('g', [], _.el('title', [], _.esc(label + ': ' + display + ' / ' + td)) + ll.svg + bar) +
			_.el('text', ['class', p + '-target', 'x', '100%', 'y', y + BAR + 15, 'text-anchor', 'end', 'opacity', 0.7], _.esc(td));
		// ids from what is drawn and the raw values: 1 of 4 and 2 of 8 draw alike (ADR 003)
		return _.svg(o, y + BAR + 20, out, JSON.stringify([o.title, o.desc, m.value, m.target, out]));
	};
});
