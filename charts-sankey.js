/*!
 * affiliate-charts / sankey — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// The sankey (ADR 019): flows between neighbouring columns, short tags beside the nodes, names in a key.
(function (root, factory) {
	var cjs = typeof module === 'object' && module.exports;
	var core = cjs ? require('./charts.js') : root.Charts;
	if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-sankey.js');
	core.sankey = factory(core._);
	if (cjs) module.exports = core;
})(typeof self !== 'undefined' ? self : this, function (_) {
	'use strict';

	function fail(msg) {
		_.fail('sankey: ' + msg);
	}

	// Anatomy in px (ADR 019): TOP above the plot (half a tag over a node at the top), the plot H high, GAP
	// between nodes, NODE wide; SPACE before the key.
	// LINK: the ribbons' opacity, measured in the ADR.
	var TOP = 8, H = 240, GAP = 16, NODE = 8, SPACE = 12, LINK = 0.3;

	return function sankey(nodes, links, options) {
		var o = _.common(options), byId = {}, cols = [], i, c, a, b, n, l, any = 0, at;
		if (!Array.isArray(nodes)) fail('`nodes` must be an array');
		if (!Array.isArray(links)) fail('`links` must be an array');
		for (i = 0; i < nodes.length; i++) {
			n = nodes[i] || {};
			at = 'node ' + i;
			// keys carry a prefix, so an id such as "__proto__" stays an ordinary key
			if (byId['#' + _.str(n.id, at + ' id')]) fail(at + ': its id repeats an earlier node\'s');
			if (typeof n.column !== 'number' || n.column % 1 || n.column < 0 || n.column > 3) fail(at + ': `column` must be 0, 1, 2 or 3');
			// characters, not UTF-16 units: an emoji is one (M9 review)
			var chars = typeof n.short === 'string' && n.short.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '_').length;
			if (!chars || chars > 3) fail(at + ': `short` must be one to three characters');
			_.str(n.label, at + ' label');
			_.str(n.display, at + ' display');
			byId['#' + n.id] = a = { n: n, c: n.column, inn: 0, out: 0 };
			(cols[n.column] = cols[n.column] || []).push(a);
		}
		var C = cols.length;
		if (C < 2) fail('two to four columns');
		for (c = 0; c < C; c++) {
			if (!cols[c]) fail('column ' + c + ' has no node');
			if (cols[c].length > 8) fail('column ' + c + ' has more than eight nodes');
		}
		for (i = 0; i < links.length; i++) {
			l = links[i] || {};
			at = 'link ' + i;
			a = byId['#' + _.str(l.from, at + ' from')];
			b = byId['#' + _.str(l.to, at + ' to')];
			if (!a || !b) fail(at + ': unknown node');
			if (b.c !== a.c + 1) fail(at + ': a link joins a column to the next');
			if (_.num(l.value, at + ' value') < 0) fail(at + ' is negative');
			_.str(l.display, at + ' display');
			a.out += l.value;
			b.inn += l.value;
			if (!isFinite(a.out) || !isFinite(b.inn)) fail('the flows overflow a number');
			if (l.value) any = 1;
		}
		if (!any) fail('every link is zero: nothing flows');

		// one scale for the diagram: the fullest column fills the plot (ADR 019)
		var k = Infinity, y;
		for (c = 0; c < C; c++) {
			var sum = 0, count = 0;
			for (i = 0; i < cols[c].length; i++) {
				a = cols[c][i];
				a.size = Math.max(a.inn, a.out);
				sum += a.size;
				if (a.size) count++;
			}
			if (sum) k = Math.min(k, (H - (count - 1) * GAP) / sum);
		}
		// a flow near Number.MIN_VALUE makes the scale infinite, columns that overflow make it zero (M9 review)
		if (!(k > 0 && isFinite(k))) fail('flows too small or too large to draw');
		for (c = 0; c < C; c++) {
			for (y = 0, i = 0; i < cols[c].length; i++) {
				a = cols[c][i];
				a.h = a.size * k;
				if (a.h) {
					a.y = a.o = a.i = y;
					y += a.h + GAP;
				}
			}
		}

		var p = o.classPrefix || 'chart', solid = _.palette(o.brand, o.theme).solid, surface = _.SURFACE[o.theme === 'dark' ? 'dark' : 'light'];
		var ribbons = '', marks = '', key = '';
		function x(c) { return c / (C - 1) * 100; }
		function title(s) { return _.el('title', [], _.esc(s)); }
		// a ribbon: a filled cubic band from column line to column line, as thick as its value at both ends
		for (i = 0; i < links.length; i++) {
			l = links[i];
			if (!l.value) continue;
			a = byId['#' + l.from];
			b = byId['#' + l.to];
			var h = l.value * k, x0 = _.n(x(a.c), 3), x1 = _.n(x(b.c), 3), xm = _.n((x(a.c) + x(b.c)) / 2, 3);
			// a flow so far below the largest that its height underflows to zero cannot be drawn (M9 review); a node
			// that underflows has only such flows, so this check covers it
			if (!(h > 0)) fail('flows too far apart to draw');
			var y0 = a.o, y1 = b.i;
			a.o += h;
			b.i += h;
			ribbons += _.el('path', ['class', p + '-link', 'd', 'M' + x0 + ',' + _.n(y0, 2) + 'C' + xm + ',' + _.n(y0, 2) + ' ' + xm + ',' + _.n(y1, 2) + ' ' + x1 + ',' + _.n(y1, 2) +
				'L' + x1 + ',' + _.n(y1 + h, 2) + 'C' + xm + ',' + _.n(y1 + h, 2) + ' ' + xm + ',' + _.n(y0 + h, 2) + ' ' + x0 + ',' + _.n(y0 + h, 2) + 'Z',
			'fill', solid, 'fill-opacity', LINK], title(a.n.label + ' → ' + b.n.label + ': ' + l.display));
		}
		// nodes over the ribbons' ends; a tag beside each, haloed, inward at the last column
		for (c = 0; c < C; c++) {
			var shift = NODE * c / (C - 1), last = c === C - 1;
			for (i = 0; i < cols[c].length; i++) {
				a = cols[c][i];
				if (!a.h) continue;
				marks += _.el('rect', ['class', p + '-node', 'x', _.pct(x(c)), 'y', _.n(TOP + a.y, 2), 'width', NODE, 'height', _.n(a.h, 2), 'fill', solid,
					'transform', shift ? 'translate(-' + _.n(shift, 2) + ')' : null], title(a.n.label + ': ' + a.n.display)) +
					_.el('text', ['class', p + '-tag', 'x', _.pct(x(c)), 'y', _.n(TOP + a.y + a.h / 2 + 4, 2), 'dx', last ? -NODE - 4 : _.n(NODE - shift + 4, 2),
						'text-anchor', last ? 'end' : null, 'font-size', 11, 'font-weight', 600, 'stroke', surface, 'stroke-width', 3,
						'stroke-linejoin', 'round', 'paint-order', 'stroke'], _.esc(a.n.short));
			}
		}
		// the key: one line a node, in the caller's order — the tag, the name, the display
		for (y = TOP + H + SPACE, i = 0; i < nodes.length; i++) {
			n = nodes[i];
			var name = n.short + ' ' + n.label, ll = _.labelLine(p, name, _.esc(n.display), name.length + n.display.length + 2, 0, y);
			// every key line titled, the nodes without flow included: a cut name keeps its whole in the title (M9 review)
			key += _.el('g', [], title(n.label + ': ' + n.display) + ll.svg);
			y += ll.h;
		}
		var out = _.el('svg', ['y', TOP, 'width', '100%', 'height', H, 'viewBox', '0 0 100 ' + H, 'preserveAspectRatio', 'none'], ribbons) + marks +
			_.el('g', ['class', p + '-key'], key);
		// ids from what is drawn and the flows: one scale fills the plot, so flows alike draw alike
		return _.svg(o, y, out, JSON.stringify([o.title, o.desc, links.map(function (q) { return q.value; }), out]));
	};
});
