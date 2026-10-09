/*!
 * affiliate-charts / spark — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// The sparkline and the KPI tile (ADR 016).
(function (root, factory) {
	var cjs = typeof module === 'object' && module.exports;
	var core = cjs ? require('./charts.js') : root.Charts;
	if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-spark.js');
	var api = factory(core._);
	core.spark = api.spark;
	core.tile = api.tile;
	if (cjs) module.exports = core;
})(typeof self !== 'undefined' ? self : this, function (_) {
	'use strict';

	function fail(msg) {
		_.fail('spark: ' + msg);
	}

	// finite numbers and null, at least one entry; the range must fit a number
	function check(values, what) {
		if (!Array.isArray(values) || !values.length) fail('`' + what + '` must be a non-empty array');
		var lo = Infinity, hi = -Infinity;
		for (var i = 0; i < values.length; i++) {
			if (values[i] === null) continue;
			_.num(values[i], what + ' ' + i);
			lo = Math.min(lo, values[i]);
			hi = Math.max(hi, values[i]);
		}
		if (hi > lo && !isFinite(hi - lo)) fail('values too far apart to share a scale');
	}

	// Anatomy in px (ADR 016): a sparkline is H high, its line PAD inside, so an end dot and its ring fit.
	// The tile: label line, value line, delta line, a gap and the trend. LABEL: characters at 160 px.
	var H = 32, PAD = 6, LABEL = 20, GOOD = '#0ca30c', BAD = '#d03b3b';

	// a line through the runs of non-null values at band centres, its scale the values' own min and max
	// (ADR 016); a run of one is a dot; the last point with data gets the end dot, ringed with the surface
	function trace(p, values, y, stroke, op, dot, surface) {
		var N = values.length, h = H - 2 * PAD, lo = Infinity, hi = -Infinity, last = -1, run = [], box = '', dots = '', i;
		for (i = 0; i < N; i++) {
			if (values[i] === null) continue;
			lo = Math.min(lo, values[i]);
			hi = Math.max(hi, values[i]);
			last = i;
		}
		function at(v) { return hi > lo ? (hi - v) / (hi - lo) * h : h / 2; }
		function cx(i) { return (i + 0.5) * 100 / N; }
		for (i = 0; i <= N; i++) {
			if (i < N && values[i] !== null) { run.push([_.n(cx(i), 3), _.n(at(values[i]), 2)]); continue; }
			if (run.length === 1) {
				dots += _.el('circle', ['class', p + '-line', 'cx', run[0][0] + '%', 'cy', _.n(y + PAD + +run[0][1], 2), 'r', 3, 'fill', stroke, 'fill-opacity', op]);
			} else if (run.length) {
				box += _.el('polyline', ['class', p + '-line', 'points', run.join(' '), 'fill', 'none', 'stroke', stroke, 'stroke-opacity', op,
					'stroke-width', 2, 'stroke-linejoin', 'round', 'stroke-linecap', 'round', 'vector-effect', 'non-scaling-stroke']);
			}
			run = [];
		}
		if (last >= 0) {
			dots += _.el('circle', ['class', p + '-dot', 'cx', _.pct(cx(last)), 'cy', _.n(y + PAD + at(values[last]), 2), 'r', 4,
				'fill', dot, 'stroke', surface, 'stroke-width', 2]);
		}
		return _.el('svg', ['y', y + PAD, 'width', '100%', 'height', h, 'viewBox', '0 0 100 ' + h, 'preserveAspectRatio', 'none',
			'overflow', 'visible'], box) + dots;
	}

	function surfaceOf(o) {
		return _.SURFACE[o.theme === 'dark' ? 'dark' : 'light'];
	}

	function spark(values, options) {
		var o = _.common(options), solid = _.palette(o.brand, o.theme).solid;
		check(values, 'values');
		var body = trace(o.classPrefix || 'chart', values, 0, solid, 1, solid, surfaceOf(o));
		// ids from what is drawn and the values: on its own min and max, 1→2 draws the same line as 1→3
		return _.svg(o, H, body, JSON.stringify([o.title, o.desc, values, body]));
	}

	function tile(t, options) {
		var o = _.common(options), p = o.classPrefix || 'chart', d, out = '', y = 52;
		if (!t || typeof t !== 'object') fail('the tile must be an object');
		var label = _.str(t.label, 'label');
		_.str(t.value, 'value');
		if (t.delta != null) {
			d = t.delta;
			if (typeof d !== 'object') fail('`delta` must be an object');
			_.str(d.display, 'delta display');
			if (d.direction !== 'up' && d.direction !== 'down' && d.direction !== 'flat') fail('`direction` must be "up", "down" or "flat"');
			if (d.direction !== 'flat' && typeof d.good !== 'boolean') fail('`up` and `down` need a boolean `good`');
		}
		if (t.trend != null) check(t.trend, 'trend');

		// the label, cut past what 160 px hold, never between the halves of a surrogate pair; the whole in a <title>
		var cut = LABEL - 1, c = label.charCodeAt(cut - 1);
		if (c >= 0xD800 && c <= 0xDBFF) cut--;
		out += _.el('text', ['class', p + '-label', 'x', 0, 'y', 13, 'opacity', 0.7],
			label.length > LABEL ? _.el('title', [], _.esc(label)) + _.esc(label.slice(0, cut) + '…') : _.esc(label));
		out += _.el('text', ['class', p + '-value', 'x', 0, 'y', 46, 'font-size', 26, 'font-weight', 600], _.esc(t.value));
		if (d) {
			var flat = d.direction === 'flat';
			out += _.el('text', ['class', p + '-delta' + (flat ? '' : ' ' + p + (d.good ? '-delta-good' : '-delta-bad')), 'x', 0, 'y', y + 16,
				'fill', flat ? null : _.palette(d.good ? GOOD : BAD, o.theme).solid],
			_.esc((flat ? '' : d.direction === 'up' ? '▲ ' : '▼ ') + d.display));
			y += 22;
		}
		// the trend in the page colour, the current period (its last point) in the brand
		if (t.trend) {
			out += _.el('g', ['class', p + '-trend'], trace(p, t.trend, y + 4, 'currentColor', 0.35, _.palette(o.brand, o.theme).solid, surfaceOf(o)));
			y += 4 + H;
		}
		return _.svg(o, y, out, JSON.stringify([o.title, o.desc, t.trend, out]));
	}

	return { spark: spark, tile: tile };
});
