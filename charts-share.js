/*!
 * affiliate-charts / share — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// Part to whole (ADR 017): a 100% bar or a donut, up to six parts, then the key.
(function (root, factory) {
	var cjs = typeof module === 'object' && module.exports;
	var core = cjs ? require('./charts.js') : root.Charts;
	if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-share.js');
	core.share = factory(core._);
	if (cjs) module.exports = core;
})(typeof self !== 'undefined' ? self : this, function (_) {
	'use strict';

	function fail(msg) {
		_.fail('share: ' + msg);
	}

	// the dataviz reference categorical slots 1–6 per theme, measured in ADR 017; `brand` is not used
	var SLOTS = {
		light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
		dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300']
	};
	// Anatomy in px (ADR 017): the bar or the donut, a gap, the key. R, RING, GAP: the donut in viewBox units
	// (a 160px square: 1.25 units are 2px).
	var BAR = 24, DONUT = 160, SPACE = 12, R = 40, RING = 16, GAP = 1.25, CIRC = 2 * Math.PI * R;

	return function share(parts, options) {
		var o = _.common(options), sum = 0, i, s;
		if (!Array.isArray(parts)) fail('`parts` must be an array');
		if (!parts.length || parts.length > 6) fail('one to six parts — fold the rest into "Other"');
		if (o.form != null && o.form !== 'bar' && o.form !== 'donut') fail('unknown form');
		for (i = 0; i < parts.length; i++) {
			s = parts[i] || {};
			_.str(s.label, 'part ' + i + ' label');
			_.str(s.display, 'part ' + i + ' display');
			if (_.num(s.value, 'part ' + i + ' value') < 0) fail('part ' + i + ' is negative: a share cannot be');
			sum += s.value;
		}
		if (!isFinite(sum)) fail('the parts overflow a number');
		if (!sum) fail('every part is zero: nothing to share');

		var p = o.classPrefix || 'chart', t = o.theme === 'dark' ? 'dark' : 'light', surface = _.SURFACE[t], donut = o.form === 'donut';
		var at = 0, n = 0, marks = '', gaps = '', key = '', y;
		for (i = 0; i < parts.length; i++) if (parts[i].value) n++;
		for (i = 0; i < parts.length; i++) {
			s = parts[i];
			var f = s.value / sum, fill = SLOTS[t][i], cls = p + '-part ' + p + '-part-' + (i + 1), title = _.el('title', [], _.esc(s.label + ': ' + s.display));
			if (f) {
				marks += donut
					// a dash of the part's share of the circumference, less the gap; one part alone is the whole ring
					? _.el('circle', ['class', cls, 'cx', 50, 'cy', 50, 'r', R, 'fill', 'none', 'stroke', fill, 'stroke-width', RING,
						'stroke-dasharray', n > 1 ? _.n(Math.max(f * CIRC - GAP, 0.5), 3) + ' ' + _.n(CIRC, 3) : null,
						'stroke-dashoffset', n > 1 ? _.n(-at * CIRC, 3) : null, 'transform', 'rotate(-90 50 50)'], title)
					: _.el('rect', ['class', cls, 'x', _.pct(at * 100), 'width', _.pct(f * 100), 'height', BAR, 'fill', fill], title);
				// between two parts of the bar, a 2px line of the surface: the gap, and no frame around the bar (ADR 017)
				if (!donut && at) gaps += _.el('line', ['x1', _.pct(at * 100), 'x2', _.pct(at * 100), 'y2', BAR, 'stroke', surface, 'stroke-width', 2]);
			}
			at += f;
		}
		marks += gaps;
		y = (donut ? DONUT : BAR) + SPACE;
		for (i = 0; i < parts.length; i++) {
			s = parts[i];
			var ll = _.labelLine(p, s.label, _.esc(s.display), s.label.length + s.display.length + 4, 16, y);
			key += _.el('rect', ['x', 0, 'y', y + 3, 'width', 10, 'height', 10, 'rx', 2, 'fill', SLOTS[t][i]]) + ll.svg;
			y += ll.h;
		}
		var body = (donut ? _.el('svg', ['width', '100%', 'height', DONUT, 'viewBox', '0 0 100 100'], marks) : marks) +
			_.el('g', ['class', p + '-key'], key);
		// ids from what is drawn and the values: shares alike draw alike (ADR 017)
		return _.svg(o, y, body, JSON.stringify([o.title, o.desc, parts.map(function (q) { return q.value; }), body]));
	};
});
