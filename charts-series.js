/*!
 * affiliate-charts / series — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// The series (ADR 015): lines, an area or columns over points at band centres, one value axis.
(function (root, factory) {
	var cjs = typeof module === 'object' && module.exports;
	var core = cjs ? require('./charts.js') : root.Charts;
	if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-series.js');
	core.series = factory(core._);
	if (cjs) module.exports = core;
})(typeof self !== 'undefined' ? self : this, function (_) {
	'use strict';

	function fail(msg) {
		_.fail('series: ' + msg);
	}

	// one row of values and their caller strings: `null` in both or in neither
	function pair(values, display, len, at, scan) {
		if (!Array.isArray(values) || !Array.isArray(display) || values.length !== len || display.length !== len) {
			fail(at + ': `values` and `display` must have ' + len + ' entries');
		}
		for (var j = 0; j < len; j++) {
			if (values[j] === null) {
				if (display[j] !== null) fail(at + ': a `null` value needs a `null` display');
			} else {
				scan(_.num(values[j], at + ' value'));
				_.str(display[j], at + ' display');
			}
		}
	}

	// every rule the spec lists under *Throws*. Returns the scale's two ends, over zero and every value
	// drawn: a stack by its total.
	function check(points, o) {
		if (!Array.isArray(points)) fail('`points` must be an array');
		if (!points.length) fail('no points');
		var names = o.names, form = o.form, lo = 0, hi = 0, prev = o.previous;
		if (!Array.isArray(names) || !names.length || names.length > 2) fail('`names` must be one or two strings');
		for (var j = 0; j < names.length; j++) _.str(names[j], 'name ' + j);
		if (form != null && form !== 'line' && form !== 'area' && form !== 'columns') fail('unknown form');
		if (o.stacked != null && typeof o.stacked !== 'boolean') fail('`stacked` is a boolean');
		if (o.stacked && form !== 'columns') fail('`stacked` needs `columns`');
		if (form === 'area' && names.length > 1) fail('`area` draws a single series');
		if (o.format != null && typeof o.format !== 'function') fail('`format` must be a function');
		function scan(v) {
			lo = Math.min(lo, v);
			hi = Math.max(hi, v);
		}
		for (var i = 0; i < points.length; i++) {
			var p = points[i] || {}, at = 'point ' + i, sum = 0;
			_.str(p.x, at + ' x');
			pair(p.values, p.display, names.length, at, o.stacked ? function (v) {
				if (v < 0) fail('a stack cannot hold a negative value');
				sum += v;
			} : scan);
			if (o.stacked) scan(sum);
		}
		if (prev != null) {
			if (names.length > 1) fail('`previous` compares a single series');
			if (typeof prev !== 'object') fail('`previous` must be an object');
			_.str(prev.name, 'previous name');
			pair(prev.values, prev.display, points.length, 'previous', scan);
		}
		if (!isFinite(hi - lo)) fail('values too far apart to share a scale');
		return [lo, hi];
	}

	// nice ticks over [lo, hi]: 1, 2 or 5 × 10ⁿ, about four intervals; one tick when there is no range
	function ticks(lo, hi) {
		if (lo === hi) return [0];
		var raw = (hi - lo) / 4, e = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / e, t = [];
		var step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
		for (var k = Math.floor(lo / step); k <= Math.ceil(hi / step); k++) t.push(+(k * step).toPrecision(12));
		return t;
	}

	// Anatomy in px (ADR 015): key lines, GAP, TOP (room for the top tick text), the plot, the x labels.
	// NARROW and GLYPH are ADR 010's estimate.
	var GAP = 8, TOP = 16, PLOT = 160, XL = 20, NARROW = 343, GLYPH = 8, COL = 24;

	function draw(points, o, tk) {
		var p = o.classPrefix || 'chart', names = o.names, S = names.length, N = points.length, prev = o.previous;
		var form = o.form || 'line', format = o.format || function (v) { return _.n(v, 6); };
		var colour = [_.palette(o.brand, o.theme).solid, _.palette(o.brand, o.theme, Math.PI).solid];
		var dLo = tk[0], dHi = tk.length > 1 ? tk[tk.length - 1] : 1, w = 100 / N, y = 0, key = '', out = '';
		var last = points[N - 1], j, i;

		// the key: swatch, name, the last point's display (ADR 015)
		for (j = 0; j <= S; j++) {
			var cur = j < S, name = cur ? names[j] : prev && prev.name;
			if (name == null) break;
			var d = cur ? last.display[j] : prev.display[N - 1];
			d = d == null ? '—' : d;
			var ll = _.labelLine(p, name, _.esc(d), name.length + d.length + 4, 16, y);
			key += _.el('rect', ['x', 0, 'y', y + 3, 'width', 10, 'height', 10, 'rx', 2,
				'fill', cur ? colour[j] : 'currentColor', 'opacity', cur ? null : 0.35]) + ll.svg;
			y += ll.h;
		}
		out += _.el('g', ['class', p + '-key'], key);
		var top = y + GAP + TOP;

		function at(v) { return (dHi - v) / (dHi - dLo) * PLOT; }
		function cx(i) { return (i + 0.5) * w; }

		// gridlines under the marks; their tick text above each line and over the marks, haloed in the theme's
		// surface so a column or a line at the left edge cannot hide it (ADR 015); zero stronger
		var surface = _.SURFACE[o.theme === 'dark' ? 'dark' : 'light'], tickText = '';
		for (i = 0; i < tk.length; i++) {
			var gy = top + at(tk[i]);
			out += _.el('line', ['class', p + '-grid', 'x1', 0, 'x2', '100%', 'y1', _.n(gy, 2), 'y2', _.n(gy, 2),
				'stroke', 'currentColor', 'stroke-opacity', tk[i] ? 0.12 : 0.35]);
			tickText += _.el('text', ['class', p + '-tick', 'x', 0, 'y', _.n(gy - 4, 2), 'opacity', 0.7, 'stroke', surface, 'stroke-width', 3,
				'stroke-linejoin', 'round', 'paint-order', 'stroke'], _.esc(_.str(format(tk[i]), 'format(v)')));
		}

		var box = '', dots = '', z = at(0);
		// a line through the runs of non-null values; a run of one is a dot (ADR 015)
		function line(values, stroke, op, cls, area) {
			var run = [], s = '';
			for (var i = 0; i <= N; i++) {
				if (i < N && values[i] !== null) { run.push([_.n(cx(i), 3), _.n(at(values[i]), 2)]); continue; }
				if (run.length === 1) {
					dots += _.el('circle', ['class', cls, 'cx', run[0][0] + '%', 'cy', _.n(top + +run[0][1], 2), 'r', 3, 'fill', stroke, 'fill-opacity', op]);
				} else if (run.length) {
					if (area) {
						s += _.el('path', ['class', p + '-area', 'd', 'M' + run[0][0] + ',' + _.n(z, 2) + 'L' + run.join('L') + 'L' +
							run[run.length - 1][0] + ',' + _.n(z, 2) + 'Z', 'fill', stroke, 'fill-opacity', 0.1]);
					}
					s += _.el('polyline', ['class', cls, 'points', run.join(' '), 'fill', 'none', 'stroke', stroke, 'stroke-opacity', op,
						'stroke-width', 2, 'stroke-linejoin', 'round', 'stroke-linecap', 'round', 'vector-effect', 'non-scaling-stroke']);
				}
				run = [];
			}
			return s;
		}
		function column(j) {
			return points.map(function (pt) { return pt.values[j]; });
		}

		if (prev) box += line(prev.values, 'currentColor', 0.35, p + '-prev');
		if (form === 'columns') {
			// each point's columns in a viewport of 70% of its band, centred, COL px wide and 2px apart: the
			// viewport clips them, so a column is as thick as the narrower of its share of the band and COL (M9
			// review: a sparse series drew one column across 70% of the chart)
			for (i = 0; i < N; i++) {
				var base = 0, cols = '';
				for (j = 0; j < S; j++) {
					var v = points[i].values[j];
					if (!v) continue;
					if (o.stacked) {
						// the top segment with a value keeps the rounded end; the others are square, 2px apart
						var topmost = true;
						for (var k = j + 1; k < S; k++) if (points[i].values[k]) topmost = false;
						var b = at(base + v);
						cols += col(-COL / 2, base ? Math.max(b, at(base) - 2) : at(base), b, colour[j], topmost);
						base += v;
					} else {
						cols += col(S > 1 ? (j ? 1 : -COL - 1) : -COL / 2, z, at(v), colour[j], true);
					}
				}
				if (cols) out += _.el('svg', ['x', _.pct(i * w + 0.15 * w), 'width', _.pct(0.7 * w)], cols);
			}
		} else {
			for (j = 0; j < S; j++) {
				var vs = column(j);
				box += line(vs, colour[j], 1, p + '-line', form === 'area');
				// the end dot on the last point with data, ringed with the theme's surface
				for (i = N - 1; i >= 0 && vs[i] === null; i--);
				if (i >= 0) {
					dots += _.el('circle', ['class', p + '-dot', 'cx', _.pct(cx(i)), 'cy', _.n(top + at(vs[i]), 2), 'r', 4,
						'fill', colour[j], 'stroke', surface, 'stroke-width', 2]);
				}
			}
		}
		out += _.el('svg', ['y', top, 'width', '100%', 'height', PLOT, 'viewBox', '0 0 100 ' + PLOT, 'preserveAspectRatio', 'none',
			'overflow', 'visible'], box) + dots + tickText;

		// x labels: the first and the last, and every k-th between them that fits at the narrow width. The
		// first and the last sit under their point when half of them fits in half a band there, else at the edge.
		var ly = top + PLOT + 15, bw2 = NARROW / N, maxLen = 0, right = edge(0, 0), lastLeft;
		for (i = 0; i < N; i++) maxLen = Math.max(maxLen, points[i].x.length);
		if (N > 1) {
			lastLeft = NARROW - edge(N - 1, 1);
			for (var step = Math.ceil((maxLen * GLYPH + 12) / bw2), m = step; m < N - 1; m += step) {
				var c = (m + 0.5) * bw2, half = points[m].x.length * GLYPH / 2;
				if (c - half >= right + 12 && c + half + 12 <= lastLeft) {
					out += xl(m, _.pct(cx(m)), 'middle');
					right = c + half;
				}
			}
		}

		// hover: a transparent band a point, the full plot height, with a <title>
		for (i = 0; i < N; i++) {
			var t = [];
			for (j = 0; j < S; j++) t.push(names[j] + ' ' + (points[i].display[j] == null ? '—' : points[i].display[j]));
			if (prev) t.push(prev.name + ' ' + (prev.display[i] == null ? '—' : prev.display[i]));
			out += _.el('rect', ['class', p + '-hit', 'x', _.pct(i * w), 'y', top, 'width', _.pct(w), 'height', PLOT, 'fill', 'transparent'],
				_.el('title', [], _.esc(points[i].x + ': ' + t.join(', '))));
		}
		return { body: out, h: ly + XL - 15 };

		// the first (end 0) or the last (end 1) label; returns how far it reaches from its edge at 343px
		function edge(i, end) {
			var len = points[i].x.length * GLYPH;
			if (len <= bw2) {
				out += xl(i, _.pct(cx(i)), 'middle');
				return (bw2 + len) / 2;
			}
			out += xl(i, end ? '100%' : 0, end ? 'end' : 'start');
			return len;
		}
		function xl(i, x, anchor) {
			return _.el('text', ['class', p + '-x', 'x', x, 'y', ly, 'text-anchor', anchor === 'start' ? null : anchor], _.esc(points[i].x));
		}
		// a column dx px from its viewport's centre, from the baseline end a to the data end b (y in the plot,
		// px); rounded at b
		function col(dx, a, b, fill, round) {
			var h = Math.abs(a - b), r = round ? Math.min(4, h / 2) : 0;
			return _.el('g', ['transform', 'translate(' + dx + ')'], _.el('svg', ['class', p + '-bar', 'x', '50%', 'y', _.n(top + Math.min(a, b), 2),
				'width', COL, 'height', _.n(h, 2), 'fill', fill],
			_.el('rect', ['width', '100%', 'height', _.n(h, 2), 'rx', r ? _.n(r, 2) : null]) +
				(r ? _.el('rect', ['y', b < a ? _.n(h - r, 2) : 0, 'width', '100%', 'height', _.n(r, 2)]) : '')));
		}
	}

	return function series(points, options) {
		var opts = _.common(options);
		var ends = check(points, opts), tk = ticks(ends[0], ends[1]);
		// a range near Number.MIN_VALUE underflows the step, one near the top overflows the widened ends (M9 review)
		if (!tk.length) fail('values too small or too large to draw');
		for (var i = 0; i < tk.length; i++) if (!isFinite(tk[i]) || i && !(tk[i] > tk[i - 1])) fail('values too small or too large to draw');
		var d = draw(points, opts, tk);
		// ids from what is drawn and the raw values: 1 and 10 can draw alike when their ticks read alike (ADR 003)
		return _.svg(opts, d.h, d.body, JSON.stringify([opts.title, opts.desc, points.map(function (q) { return q.values; }), opts.previous && opts.previous.values, d.body]));
	};
});
