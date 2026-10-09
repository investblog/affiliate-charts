/*!
 * affiliate-charts / heatmap — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// The heatmap and the cohort (ADR 018): rows as labelled lines of cells, five steps of the brand's hue.
(function (root, factory) {
	var cjs = typeof module === 'object' && module.exports;
	var core = cjs ? require('./charts.js') : root.Charts;
	if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-heatmap.js');
	core.heatmap = factory(core._);
	if (cjs) module.exports = core;
})(typeof self !== 'undefined' ? self : this, function (_) {
	'use strict';

	function fail(msg) {
		_.fail('heatmap: ' + msg);
	}
	function labels(a, what) {
		if (!Array.isArray(a) || !a.length) fail('`' + what + '` must be a non-empty array of strings');
		for (var i = 0; i < a.length; i++) _.str(a[i], what + ' ' + i);
		return a;
	}

	// the ramp's OKLCH lightness, near zero → max, per theme (ADR 018); text in a cell is ink from 0.6 up
	var STEPS = { light: [0.71, 0.63, 0.55, 0.47, 0.39], dark: [0.52, 0.6, 0.68, 0.76, 0.84] }, INK = '#11171c';
	// Anatomy in px (ADR 018): a row's label line, CELL of cells, PAD; the x labels; the scale's SWATCH.
	// NARROW and GLYPH are ADR 010's estimate, SMALL a glyph at 11px.
	var CELL = 20, PAD = 6, SWATCH = 32, NARROW = 343, GLYPH = 8, SMALL = 6.5;

	return function heatmap(cells, options) {
		var o = _.common(options), cohort = o.form === 'cohort', max = 0, r, c, v, d;
		if (o.form != null && o.form !== 'grid' && !cohort) fail('unknown form');
		if (o.format != null && typeof o.format !== 'function') fail('`format` must be a function');
		if (!cells || typeof cells !== 'object') fail('`cells` must be an object');
		var rows = labels(cells.rows, 'rows'), cols = labels(cells.cols, 'cols'), V = cells.values, D = cells.display;
		if (!Array.isArray(V) || !Array.isArray(D) || V.length !== rows.length || D.length !== rows.length) {
			fail('`values` and `display` must hold one array per row');
		}
		for (r = 0; r < rows.length; r++) {
			v = V[r];
			d = D[r];
			if (!Array.isArray(v) || !Array.isArray(d) || d.length !== v.length) fail('row ' + r + ': `values` and `display` must be arrays of one length');
			if (v.length > cols.length || !cohort && v.length < cols.length) fail('row ' + r + ': one value per column' + (cohort ? ' at most' : ''));
			for (c = 0; c < v.length; c++) {
				if (v[c] === null) {
					if (d[c] !== null) fail('row ' + r + ': a `null` value needs a `null` display');
					continue;
				}
				if (_.num(v[c], 'row ' + r + ' value') < 0) fail('row ' + r + ': a negative value has no step on a sequential ramp');
				_.str(d[c], 'row ' + r + ' display');
				max = Math.max(max, v[c]);
			}
		}

		var p = o.classPrefix || 'chart', t = o.theme === 'dark' ? 'dark' : 'light', surface = _.SURFACE[t], N = cols.length, w = 100 / N;
		var ramp = STEPS[t].map(function (L) { return _.shade(o.brand, L); }), bw = NARROW / N, y = 0, out = '', i;
		var format = o.format || function (x) { return _.n(x, 6); };
		for (r = 0; r < rows.length; r++) {
			var ll = _.labelLine(p, rows[r], '', rows[r].length, 0, y), row = '', gaps = '';
			y += ll.h;
			for (c = 0; c < V[r].length; c++) {
				v = V[r][c];
				d = D[r][c];
				var x = _.pct(c * w), mid = _.pct((c + 0.5) * w), title = _.el('title', [], _.esc(rows[r] + ' · ' + cols[c] + ': ' + (d === null ? '—' : d)));
				if (v === null) {
					// no data: no fill and a dash, never the near-zero colour
					row += _.el('rect', ['class', p + '-cell-empty', 'x', x, 'y', y, 'width', _.pct(w), 'height', CELL, 'fill', 'transparent'], title) +
						_.el('text', ['x', mid, 'y', y + 14, 'text-anchor', 'middle', 'opacity', 0.5, 'pointer-events', 'none'], '—');
				} else {
					var s = max ? Math.min(4, Math.floor(v / max * 5)) : 0;
					row += _.el('rect', ['class', p + '-cell', 'x', x, 'y', y, 'width', _.pct(w), 'height', CELL, 'fill', ramp[s]], title);
					// a cohort's cell carries its display when it fits one band at the narrow width (ADR 018)
					if (cohort && d.length * SMALL + 4 <= bw) {
						row += _.el('text', ['x', mid, 'y', y + 14, 'text-anchor', 'middle', 'font-size', 11, 'fill', STEPS[t][s] >= 0.6 ? INK : '#fff',
							'pointer-events', 'none'], _.esc(d));
					}
				}
				// between two cells, a 2px line of the surface (ADR 017's gap)
				if (c) gaps += _.el('line', ['x1', x, 'x2', x, 'y1', y, 'y2', y + CELL, 'stroke', surface, 'stroke-width', 2]);
			}
			out += _.el('g', [], ll.svg + row + gaps);
			y += CELL + PAD;
		}

		// the column labels: ADR 015's x-label rule over the columns
		var ly = y + 12, maxLen = 0, right = edge(0, 0), lastLeft;
		for (i = 0; i < N; i++) maxLen = Math.max(maxLen, cols[i].length);
		if (N > 1) {
			lastLeft = NARROW - edge(N - 1, 1);
			for (var step = Math.ceil((maxLen * GLYPH + 12) / bw), m = step; m < N - 1; m += step) {
				var cc = (m + 0.5) * bw, half = cols[m].length * GLYPH / 2;
				if (cc - half >= right + 12 && cc + half + 12 <= lastLeft) {
					out += xl(m, _.pct((m + 0.5) * w), 'middle');
					right = cc + half;
				}
			}
		}

		// the scale: five swatches, format(0) under the first, format(max) under the last
		y = ly + 10;
		var scale = '';
		for (i = 0; i < 5; i++) scale += _.el('rect', ['x', i * SWATCH, 'y', y, 'width', SWATCH - 2, 'height', 10, 'fill', ramp[i]]);
		scale += _.el('text', ['x', 0, 'y', y + 24], _.esc(_.str(format(0), 'format(v)'))) +
			_.el('text', ['x', 5 * SWATCH - 2, 'y', y + 24, 'text-anchor', 'end'], _.esc(_.str(format(max), 'format(v)')));
		out += _.el('g', ['class', p + '-legend', 'opacity', 0.85], scale);
		// ids from what is drawn and the values: steps alike draw alike
		return _.svg(o, y + 28, out, JSON.stringify([o.title, o.desc, V, out]));

		// the first (end 0) or the last (end 1) column label; returns how far it reaches from its edge at 343px
		function edge(i, end) {
			var len = cols[i].length * GLYPH;
			if (len <= bw) {
				out += xl(i, _.pct((i + 0.5) * w), 'middle');
				return (bw + len) / 2;
			}
			out += xl(i, end ? '100%' : 0, end ? 'end' : 'start');
			return len;
		}
		function xl(i, x, anchor) {
			return _.el('text', ['class', p + '-x', 'x', x, 'y', ly, 'text-anchor', anchor === 'start' ? null : anchor], _.esc(cols[i]));
		}
	};
});
