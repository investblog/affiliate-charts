/*!
 * affiliate-charts / funnel — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// The funnel (ADR 007). M1: the contract — input rules and the accessible root; the bars are drawn at M3.
(function (root, factory) {
	var cjs = typeof module === 'object' && module.exports;
	var core = cjs ? require('./charts.js') : root.Charts;
	if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-funnel.js');
	core.funnel = factory(core._);
	if (cjs) module.exports = core;
})(typeof self !== 'undefined' ? self : this, function (_) {
	'use strict';

	function fail(msg) {
		_.fail('funnel: ' + msg);
	}
	function bar(b, at) {
		return [_.num(b.value, at + ' value'), _.str(b.display, at + ' display')];
	}

	// every rule the spec lists under *Throws*; the library never repairs data. Returns the fields the
	// chart draws, in a fixed order — the key its ids are derived from (ADR 003).
	function check(steps, opts) {
		if (!Array.isArray(steps)) fail('`steps` must be an array');
		if (opts.form != null && opts.form !== 'bars' && opts.form !== 'steps' && opts.form !== 'shape') fail('unknown form');
		var shape = opts.form === 'shape', losses = false, main = 0, legend = opts.legend, key = [], lo = 0, hi = 0;
		if (legend != null && !(Array.isArray(legend) && legend.length === 2 && typeof legend[0] === 'string' && typeof legend[1] === 'string')) fail('`legend` must be two strings');
		for (var i = 0; i < steps.length; i++) {
			var s = steps[i] || {}, at = 'step ' + i, row = [_.str(s.label, at + ' label')].concat(bar(s, at));
			if (s.earned) {
				row.push(bar(s.earned, at + ' earned'));
				if (!legend) fail('`earned` needs `legend`');
				if (shape) fail('`shape` cannot draw `earned`');
			}
			if (s.rate !== undefined && s.rate !== null) _.str(s.rate, at + ' rate');
			if (s.group === 'losses') {
				losses = true;
				if (shape) fail('`shape` cannot draw losses');
			} else if (losses) fail(at + ' is a main step after the losses');
			else if (!s.part) main++;
			if (s.part) {
				if (i === 0 || losses) fail(at + ': a `part` needs a main step before it');
				if (s.gap) fail(at + ': `gap` on a `part`');
				if (shape) fail('`shape` cannot draw `part`');
			}
			if (shape && s.value < 0) fail('`shape` cannot draw a negative value');
			lo = Math.min(lo, s.value, s.earned ? s.earned.value : 0);
			hi = Math.max(hi, s.value, s.earned ? s.earned.value : 0);
			key.push(row.concat([!!s.part, s.group === 'losses', !!s.gap, s.rate]));
			if (s.earned) key.earned = true;
		}
		if (!main) fail('no main step');
		if (!isFinite(hi - lo)) fail('values too far apart to share a scale');
		return key;
	}

	// Row anatomy in px (ADR 010): [rate line] label line [value line] base bar [gap earned bar] padding.
	// Bars are laid out in percent of the page's width; text stays in px (ADR 009).
	var LINE = 18, RATE = 16, BAR = 12, PART = 8, SHAPE = 20, PAD = 10, BLOCK = 16, INDENT = 12;
	// the narrowest content width the layout promises (a 375px screen less 16px gutters) and an
	// average glyph width at 13px — a row whose label and values may not share a line at that width
	// puts its values on their own line, at every width, so the bytes never depend on the page (ADR 010)
	var NARROW = 343, GLYPH = 8;
	var DASH = '—', DOWN = '↓ ';

	function draw(steps, opts, earned) {
		var p = opts.classPrefix || 'chart', form = opts.form || 'bars', pal = _.palette(opts.brand, opts.theme);
		var lo = 0, hi = 0, prev = null, y = 0, out = '', marks = '', i, s;
		for (i = 0; i < steps.length; i++) {
			s = steps[i];
			lo = Math.min(lo, s.value, s.earned ? s.earned.value : 0);
			hi = Math.max(hi, s.value, s.earned ? s.earned.value : 0);
		}
		var range = hi - lo || 1, z = -lo / range * 100;
		if (earned) {
			var lg = _.legend(p, [[opts.legend[0], pal.solid, pal.opacity], [opts.legend[1], pal.solid, 1]], 0);
			out += lg.svg;
			y = lg.h + 8;
		}
		for (i = 0; i < steps.length; i++) {
			s = steps[i];
			var loss = s.group === 'losses', firstLoss = loss && !(i && steps[i - 1].group === 'losses');
			if (i && (s.gap || firstLoss)) {
				out += _.el('line', ['class', p + '-grid', 'x1', 0, 'x2', '100%', 'y1', y + BLOCK / 2, 'y2', y + BLOCK / 2,
					'stroke', 'currentColor', 'stroke-opacity', 0.2]);
				y += BLOCK;
			}
			var row = '', tip = s.label + ': ' + s.display + (s.earned ? ' / ' + s.earned.display : '');
			if (s.rate !== undefined) {
				var rate = s.rate === null ? DASH : s.rate;
				tip += ' (' + rate + ')';
				row += _.el('text', ['class', p + '-rate', 'x', s.part ? INDENT : 0, 'y', y + 12, 'fill-opacity', 0.7,
					'font-size', form === 'steps' ? 13 : 12, 'font-weight', form === 'steps' ? 600 : null], _.esc(DOWN + rate));
				y += form === 'steps' ? RATE + 4 : RATE;
			}
			var valText = s.earned ? _.el('tspan', ['fill-opacity', 0.75], _.esc(s.display)) + ' · ' +
				_.el('tspan', ['font-weight', 600], _.esc(s.earned.display)) : _.esc(s.display);
			var chars = s.label.length + (s.part ? 2 : 0) + s.display.length + (s.earned ? s.earned.display.length + 3 : 0) + 2;
			// a label longer than the narrow width holds is cut with an ellipsis; the row's <title> keeps it whole
			var max = Math.floor(NARROW / GLYPH) - (s.part ? 2 : 0);
			var cut = max - 1, c = s.label.charCodeAt(cut - 1);
			// never between the halves of a surrogate pair: an emoji is dropped whole (ADR 010 addendum)
			if (c >= 0xD800 && c <= 0xDBFF) cut--;
			var label = s.label.length > max ? s.label.slice(0, cut) + '…' : s.label;
			row += _.el('text', ['class', p + '-label', 'x', s.part ? INDENT : 0, 'y', y + 13], _.esc(label));
			if (chars * GLYPH > NARROW) y += LINE;
			row += _.el('text', ['class', p + '-value', 'x', '100%', 'y', y + 13, 'text-anchor', 'end'], valText);
			y += LINE + 2;
			var h = form === 'shape' ? SHAPE : s.part ? PART : BAR, top = y;
			var cls = p + (loss ? '-bar-loss' : s.part ? '-bar-part' : '-bar');
			var fill = loss ? 'currentColor' : pal.solid;
			// the ghost belongs to a block: a gap starts a base of another kind (ADR 010 addendum)
			if (s.gap) prev = null;
			if (form === 'steps' && prev && prev.value > 0 && !s.part && !loss) {
				row += _.bar(z, prev.value / range * 100, y, h, 'currentColor', 0.12, p + '-bar-ghost', false);
			}
			// in a chart with earned anywhere, a solid bar always means "earned", as the legend says
			row += mark(s.value, y, h, fill, loss ? 0.35 : earned ? pal.opacity : 1, cls);
			y += h;
			if (s.earned) {
				y += 2;
				row += mark(s.earned.value, y, h, fill, loss ? 0.7 : 1, p + '-bar-earned');
				y += h;
			}
			// the zero line, when the chart has a negative value: a hairline beside this row's bars only,
			// so it never runs through a label
			if (lo < 0) {
				row += _.el('line', ['class', p + '-axis', 'x1', _.pct(z), 'x2', _.pct(z), 'y1', top - 2, 'y2', y + 2,
					'stroke', 'currentColor', 'stroke-opacity', 0.35]);
			}
			y += PAD;
			if (!s.part && !loss) prev = s;
			marks += _.el('g', [], _.el('title', [], _.esc(tip)) + row);
		}
		return { body: out + marks, h: y - PAD };

		function mark(v, top, h, fill, op, c) {
			var w = Math.abs(v) / range * 100;
			if (!w) return '';
			if (form === 'shape') return _.bar(50 - w / 2, w, top, h, fill, op, c, false);
			return _.bar(v < 0 ? z - w : z, w, top, h, fill, op, c, v < 0);
		}
	}

	return function funnel(steps, options) {
		var opts = _.common(options);
		var key = check(steps, opts), earned = !!key.earned;
		// only what is drawn goes into the ids: a legend no step needs changes nothing (ADR 003)
		key.push([opts.form || 'bars', earned ? opts.legend : null, opts.title, opts.desc, opts.brand, opts.theme]);
		var d = draw(steps, opts, earned);
		return _.svg(opts, d.h, d.body, JSON.stringify(key));
	};
});
