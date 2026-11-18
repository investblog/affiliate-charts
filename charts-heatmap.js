/*!
 * affiliate-charts / heatmap — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// The heatmap and the cohort (ADR 018): rows as labelled lines of cells, five steps of the brand's hue;
// the status matrix's side column, fixed domain, header and step classes (ADR 022).
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
	// Anatomy in px (ADR 018, 022): a row's label line, CELL of cells, PAD; the x labels; the scale's SWATCH;
	// HEAD, the header of shorts. NARROW and GLYPH are ADR 010's estimate, SMALL a digit at 11px; a capital at 11px
	// measures 6.7–7.9px on average, so GLYPH holds for the shorts too (ADR 022)
	var CELL = 20, PAD = 6, SWATCH = 32, HEAD = 20, NARROW = 343, GLYPH = 8, SMALL = 6.5;

	return function heatmap(cells, options) {
		var o = _.common(options), cohort = o.form === 'cohort', g = o.gutter, dom = o.domain, max = 0, r, c, v, d, i;
		if (o.form != null && o.form !== 'grid' && !cohort) fail('unknown form');
		if (o.format != null && typeof o.format !== 'function') fail('`format` must be a function');
		if (g !== undefined && (typeof g !== 'number' || !(g >= 10 && g <= 50))) fail('`gutter` is a percent from 10 to 50');
		if (dom !== undefined && (!Array.isArray(dom) || dom.length !== 2 || !(_.num(dom[0], 'domain 0') < _.num(dom[1], 'domain 1')) ||
			!isFinite(dom[1] - dom[0]))) fail('`domain` must be [lo, hi] with lo < hi');
		if (o.header !== undefined && typeof o.header !== 'boolean') fail('`header` must be a boolean');
		if (o.legend !== undefined && typeof o.legend !== 'boolean') fail('`legend` must be a boolean');
		if (!cells || typeof cells !== 'object') fail('`cells` must be an object');
		var rows = labels(cells.rows, 'rows'), cols = labels(cells.cols, 'cols'), V = cells.values, D = cells.display, S = cells.short;
		if (S !== undefined) {
			if (!Array.isArray(S) || S.length !== cols.length) fail('`short` must hold one string per column');
			for (i = 0; i < S.length; i++) {
				// a surrogate pair is one character (ADR 019's rule)
				var k = typeof S[i] === 'string' && S[i].replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '_').length;
				if (!k || k > 3) fail('short ' + i + ' must be one to three characters');
			}
		}
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
				_.num(v[c], 'row ' + r + ' value');
				if (dom ? v[c] < dom[0] || v[c] > dom[1] : v[c] < 0) fail('row ' + r + (dom ? ': a value outside the domain' : ': a negative value has no step on a sequential ramp'));
				_.str(d[c], 'row ' + r + ' display');
				max = Math.max(max, v[c]);
			}
		}

		var p = o.classPrefix || 'chart', t = o.theme === 'dark' ? 'dark' : 'light', surface = _.SURFACE[t], N = cols.length;
		// the cells lie right of the gutter (ADR 022); bw is one band at 343px, for every fit estimate
		var off = g || 0, w = (100 - off) / N, bw = NARROW * (100 - off) / 100 / N, lo = dom ? dom[0] : 0, hi = dom ? dom[1] : max;
		var top = S && o.header !== false, bottom = !S && o.header !== false, L = S || cols, sp = S ? 4 : 12;
		var ramp = STEPS[t].map(function (l) { return _.shade(o.brand, l); }), y = top ? HEAD : 0, out = '', ly = top ? 13 : 0;
		var format = o.format || function (x) { return _.n(x, 6); };
		for (r = 0; r < rows.length; r++) {
			var row = '', gaps = '', lab;
			if (g) {
				// the side column: end-anchored 6px before the cells, cut at what it holds at 343px (ADR 022)
				var name = rows[r], most = Math.floor((NARROW * g / 100 - 6) / GLYPH), cut = most - 1, ch = name.charCodeAt(cut - 1);
				if (ch >= 0xD800 && ch <= 0xDBFF) cut--;
				lab = _.el('text', ['class', p + '-label', 'x', _.pct(g), 'y', y + 14, 'dx', -6, 'text-anchor', 'end'],
					name.length > most ? _.el('title', [], _.esc(name)) + _.esc(name.slice(0, cut) + '…') : _.esc(name));
			} else {
				var ll = _.labelLine(p, rows[r], '', rows[r].length, 0, y);
				lab = ll.svg;
				y += ll.h;
			}
			for (c = 0; c < V[r].length; c++) {
				v = V[r][c];
				d = D[r][c];
				var x = _.pct(off + c * w), mid = _.pct(off + (c + 0.5) * w), title = _.el('title', [], _.esc(rows[r] + ' · ' + cols[c] + ': ' + (d === null ? '—' : d)));
				if (v === null) {
					// no data: no fill and a dash, never the near-zero colour
					row += _.el('rect', ['class', p + '-cell-empty', 'x', x, 'y', y, 'width', _.pct(w), 'height', CELL, 'fill', 'transparent'], title) +
						_.el('text', ['x', mid, 'y', y + 14, 'text-anchor', 'middle', 'opacity', 0.5, 'pointer-events', 'none'], '—');
				} else {
					var s = hi > lo ? Math.min(4, Math.floor((v - lo) / (hi - lo) * 5)) : 0;
					row += _.el('rect', ['class', p + '-cell ' + p + '-cell-' + s, 'x', x, 'y', y, 'width', _.pct(w), 'height', CELL, 'fill', ramp[s]], title);
					// a cohort's cell carries its display when it fits one band at the narrow width (ADR 018)
					if (cohort && d.length * SMALL + 4 <= bw) {
						row += _.el('text', ['class', p + '-cell-text-' + s, 'x', mid, 'y', y + 14, 'text-anchor', 'middle', 'font-size', 11,
							'fill', STEPS[t][s] >= 0.6 ? INK : '#fff', 'pointer-events', 'none'], _.esc(d));
					}
				}
				// between two cells, a 2px line of the surface (ADR 017's gap)
				if (c) gaps += _.el('line', ['class', p + '-gap', 'x1', x, 'x2', x, 'y1', y, 'y2', y + CELL, 'stroke', surface, 'stroke-width', 2]);
			}
			out += _.el('g', ['class', p + '-row'], lab + row + gaps);
			y += CELL + PAD;
		}

		// the column labels: ADR 015's x-label rule over the band, the shorts above the grid or the names below
		if (bottom) ly = y + 12;
		if (top || bottom) {
			var maxLen = 0, right = edge(0, 0), lastLeft;
			for (i = 0; i < N; i++) maxLen = Math.max(maxLen, L[i].length);
			if (N > 1) {
				lastLeft = bw * N - edge(N - 1, 1);
				for (var step = Math.ceil((maxLen * GLYPH + sp) / bw), m = step; m < N - 1; m += step) {
					var cc = (m + 0.5) * bw, half = L[m].length * GLYPH / 2;
					if (cc - half >= right + sp && cc + half + sp <= lastLeft) {
						out += xl(m, _.pct(off + (m + 0.5) * w), 'middle');
						right = cc + half;
					}
				}
			}
		}

		// the scale: five swatches, format(lo) under the first, format(hi) under the last
		y = bottom ? ly + 10 : y + 4;
		if (o.legend !== false) {
			var scale = '';
			for (i = 0; i < 5; i++) scale += _.el('rect', ['class', p + '-cell-' + i, 'x', i * SWATCH, 'y', y, 'width', SWATCH - 2, 'height', 10, 'fill', ramp[i]]);
			scale += _.el('text', ['x', 0, 'y', y + 24], _.esc(_.str(format(lo), 'format(v)'))) +
				_.el('text', ['x', 5 * SWATCH - 2, 'y', y + 24, 'text-anchor', 'end'], _.esc(_.str(format(hi), 'format(v)')));
			out += _.el('g', ['class', p + '-legend', 'opacity', 0.85], scale);
			y += 28;
		} else y -= bottom ? 6 : 10;
		// ids from what is drawn and the values: steps alike draw alike
		return _.svg(o, y, out, JSON.stringify([o.title, o.desc, V, out]));

		// the first (end 0) or the last (end 1) column label; returns how far it reaches from its edge at 343px
		function edge(i, end) {
			var len = L[i].length * GLYPH;
			if (len <= bw) {
				out += xl(i, _.pct(off + (i + 0.5) * w), 'middle');
				return (bw + len) / 2;
			}
			out += xl(i, end ? '100%' : off ? _.pct(off) : 0, end ? 'end' : 'start');
			return len;
		}
		function xl(i, x, anchor) {
			return _.el('text', ['class', p + '-x', 'x', x, 'y', ly, 'text-anchor', anchor === 'start' ? null : anchor, 'font-size', S ? 11 : null], _.esc(L[i]));
		}
	};
});
