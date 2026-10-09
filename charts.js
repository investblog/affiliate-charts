/*!
 * affiliate-charts — charts for affiliate programmes as SVG strings.
 * MIT © 301ST (https://301.st)
 */
// The core (ADR 008): helpers every chart module shares, handed to modules as `Charts._`, which is
// not part of the public contract. The core draws no chart by itself.
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	else root.Charts = api;
})(typeof self !== 'undefined' ? self : this, function () {
	'use strict';

	// rounds to d decimals; never emits -0, nor an exponent below 1e21 (layout numbers are far below),
	// so float noise cannot reach the bytes (ADR 003). A value so large that v × 10^d overflows has no
	// decimals to round: it is printed as it is, never as "Infinity"
	function n(v, d) {
		var p = Math.pow(10, d || 0), r = Math.round(v * p) / p;
		if (!isFinite(r)) r = v;
		return String(r === 0 ? 0 : r);
	}
	// all five, the apostrophe included: labels come from user data and may land in attributes (ADR 004)
	function esc(s) {
		return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
	}
	// attrs is a flat [name, value, …] list; a null value drops the attribute
	function el(tag, attrs, inner) {
		var s = '<' + tag;
		for (var i = 0; i < attrs.length; i += 2) if (attrs[i + 1] != null) s += ' ' + attrs[i] + '="' + attrs[i + 1] + '"';
		return inner == null ? s + '/>' : s + '>' + inner + '</' + tag + '>';
	}
	function fail(msg) {
		throw new TypeError('affiliate-charts: ' + msg);
	}
	// a number the caller passed; NaN and ±Infinity are a bug upstream, never drawn
	function num(v, what) {
		if (typeof v !== 'number' || !isFinite(v)) fail(what + ' must be a finite number');
		return v;
	}
	// a caller string: the library formats nothing, so anything else is a bug upstream (ADR 004)
	function str(v, what) {
		if (typeof v !== 'string') fail(what + ' must be a string');
		return v;
	}
	// the options every chart shares; the prefix lands in ids and aria-labelledby, so it is a token
	// Absent means undefined: `null` is accepted only where a shape says so (spec, input rules; M9 review).
	function common(options) {
		var o = options === undefined ? {} : options;
		if (!o || typeof o !== 'object') fail('options must be an object');
		if (o.title !== undefined) str(o.title, 'title');
		if (o.desc !== undefined) str(o.desc, 'desc');
		var p = o.classPrefix;
		if (p !== undefined && (typeof p !== 'string' || !/^[A-Za-z_][\w-]*$/.test(p))) fail('classPrefix must be a token like "chart"');
		if (o.brand !== undefined && (typeof o.brand !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(o.brand))) fail('brand must be a #rrggbb hex');
		if (o.theme !== undefined && o.theme !== 'light' && o.theme !== 'dark') fail('theme must be "light" or "dark"');
		return o;
	}
	// FNV-1a twice, from two offsets: 64 bits of id derived from the input, so two different charts on one
	// page collide only by a 1-in-2^64 chance (ADR 003). One 32-bit pass had real collisions (M9 review).
	function hash(s) {
		return fnv(s, 0x811c9dc5) + fnv(s, 0x5bd1e995);
	}
	function fnv(s, h) {
		for (var i = 0; i < s.length; i++) {
			h ^= s.charCodeAt(i);
			h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
		}
		// fixed width (2^32 is 7 base-36 digits), so the two halves cannot run into each other
		return ('000000' + h.toString(36)).slice(-7);
	}
	// ── colour: sRGB <-> OKLCH, only the parts a chart uses: parse a hex, move lightness until a contrast
	// holds, write a hex. OKLCH, not the family's CIE LCh: lightening a blue in CIE LCh turns it violet
	// (#0066ff → #5e7bff), in OKLCH it stays blue (ADR 011) ──
	function rgb(hex) {
		var v = parseInt(hex.slice(1), 16);
		return [v >> 16 & 255, v >> 8 & 255, v & 255];
	}
	function toHex(c) {
		return '#' + ((1 << 24) + (c[0] << 16) + (c[1] << 8) + c[2]).toString(16).slice(1);
	}
	function s2l(u) { u /= 255; return u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4); }
	function l2s(u) { return 255 * (u <= 0.0031308 ? u * 12.92 : 1.055 * Math.pow(u, 1 / 2.4) - 0.055); }
	function oklch(c) {
		var r = s2l(c[0]), g = s2l(c[1]), b = s2l(c[2]), t = 1 / 3;
		var l = Math.pow(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b, t);
		var m = Math.pow(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b, t);
		var s = Math.pow(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b, t);
		var A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
		var B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
		return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, Math.sqrt(A * A + B * B), Math.atan2(B, A)];
	}
	function lin(L, C, H) {
		var A = C * Math.cos(H), B = C * Math.sin(H);
		var l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
		var m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
		var s = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3);
		return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
			-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
	}
	function inGamut(v) {
		for (var i = 0; i < 3; i++) if (v[i] < -0.0005 || v[i] > 1.0005) return false;
		return true;
	}
	// gamut policy: hold L and H, reduce C until inside sRGB — clipping a channel would shift the hue
	function fromOklch(L, C, H) {
		var v = lin(L, C, H), lo = 0, hi = C, i;
		if (!inGamut(v)) {
			for (i = 0; i < 20; i++) {
				var mid = (lo + hi) / 2;
				if (inGamut(lin(L, mid, H))) lo = mid; else hi = mid;
			}
			v = lin(L, lo, H);
		}
		return [clamp255(l2s(v[0])), clamp255(l2s(v[1])), clamp255(l2s(v[2]))];
	}
	function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }
	function lum(c) { return 0.2126 * s2l(c[0]) + 0.7152 * s2l(c[1]) + 0.0722 * s2l(c[2]); }
	function contrast(a, b) {
		var x = lum(a), y = lum(b);
		return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
	}
	// repair by shifting lightness only, toward white on dark and toward black on light: hue and chroma
	// are the brand's
	function ensureContrast(c, bg, min, dir) {
		var o = oklch(c);
		for (var L = o[0]; contrast(c, bg) < min && L > 0 && L < 1; L += dir * 0.01) c = fromOklch(L, o[1], o[2]);
		return c;
	}
	// reference surfaces per theme; a page's own surface is close to one of them
	// and the OKLCH lightness band a mark may take on that surface (the dataviz checks, 0.005 inside each
	// edge so that rounding to 8-bit channels cannot carry a colour out)
	var SURFACE = { light: '#fcfcfb', dark: '#1a1a19' }, BAND = { light: [0.435, 0.765], dark: [0.485, 0.665] }, LIGHT = 0.6;
	// The solid mark: the brand's lightness held inside the band, then moved until it clears 4.5:1 on
	// the surface, so the light mark (the solid at LIGHT opacity over the page) still clears 2:1 on the
	// sample surfaces — measured in ADR 011. Hue and chroma are the brand's.
	// `turn` rotates the hue (radians): the waterfall's decrease is the brand's opposite (ADR 014)
	function palette(brand, theme, turn) {
		var t = theme === 'dark' ? 'dark' : 'light', bg = rgb(SURFACE[t]), o = oklch(rgb(brand || '#2563eb'));
		var solid = fromOklch(Math.min(BAND[t][1], Math.max(BAND[t][0], o[0])), o[1], o[2] + (turn || 0));
		solid = ensureContrast(solid, bg, 4.5, t === 'dark' ? 1 : -1);
		var light = [0, 1, 2].map(function (i) { return clamp255(solid[i] * LIGHT + bg[i] * (1 - LIGHT)); });
		return { solid: toHex(solid), light: toHex(light), opacity: LIGHT };
	}

	// the brand's hue and chroma at a given OKLCH lightness: a step of the heatmap's ramp (ADR 018)
	function shade(brand, L) {
		var o = oklch(rgb(brand || '#2563eb'));
		return toHex(fromOklch(L, o[1], o[2]));
	}

	// ── marks ──

	function pct(v) {
		return n(v, 3) + '%';
	}
	// a bar laid out in percent (ADR 009) with a 4px rounded data end and a square baseline end: a
	// nested <svg> clips a rounded rect and a square that covers the baseline side. `toLeft` — the
	// bar grows left of zero, so its baseline is on the right. Group opacity, so the overlap of the
	// two rects is not darker.
	function bar(x, w, y, h, fill, opacity, cls, toLeft, title) {
		var r = Math.min(4, h / 2);
		return el('svg', ['class', cls, 'x', pct(x), 'y', n(y, 2), 'width', pct(w), 'height', n(h, 2),
			'fill', fill, 'opacity', opacity],
		(title || '') + el('rect', ['width', '100%', 'height', n(h, 2), 'rx', n(r, 2)]) +
			el('rect', toLeft ? ['x', '100%', 'width', n(r, 2), 'height', n(h, 2), 'transform', 'translate(-' + n(r, 2) + ')']
				: ['width', n(r, 2), 'height', n(h, 2)]));
	}
	// a row's label line (ADR 010): the label at x=indent, cut with an ellipsis past what the narrow width
	// holds; the values (markup) end-anchored at 100%, on their own line when a conservative estimate of
	// `chars` says label and values may not share one at that width — the same at every width, so the
	// bytes never depend on the page. Returns the markup and the height it takes, padding included.
	// NARROW: a 375px screen less 16px gutters; GLYPH: an average glyph at 13px.
	var LINE = 18, NARROW = 343, GLYPH = 8;
	function labelLine(p, label, values, chars, indent, y) {
		var max = Math.floor(NARROW / GLYPH) - (indent ? 2 : 0), cut = max - 1, c = label.charCodeAt(cut - 1);
		// never between the halves of a surrogate pair: an emoji is dropped whole (ADR 010 addendum)
		if (c >= 0xD800 && c <= 0xDBFF) cut--;
		var dy = chars * GLYPH > NARROW ? LINE : 0;
		return {
			svg: el('text', ['class', p + '-label', 'x', indent, 'y', y + 13], esc(label.length > max ? label.slice(0, cut) + '…' : label)) +
				el('text', ['class', p + '-value', 'x', '100%', 'y', y + dy + 13, 'text-anchor', 'end'], values),
			h: dy + LINE + 2
		};
	}
	// a legend one entry per line, so it needs no text width; entries are [label, fill, opacity]
	function legend(p, entries, y) {
		var s = '';
		for (var i = 0; i < entries.length; i++) {
			var e = entries[i], top = y + i * 18;
			s += el('rect', ['x', 0, 'y', top + 3, 'width', 10, 'height', 10, 'rx', 2, 'fill', e[1], 'opacity', e[2]]) +
				el('text', ['x', 16, 'y', top + 12], esc(e[0]));
		}
		return { svg: el('g', ['class', p + '-legend'], s), h: entries.length * 18 };
	}

	// the root element and its accessible name (ADR 006). Width comes from the page, height is fixed
	// (ADR 009); text inherits the page's font and colour (ADR 004, 011). `opts` has passed common();
	// `key` serialises the input fields the chart draws, so equal charts share ids and different ones do not.
	function svg(opts, h, body, key) {
		var p = opts.classPrefix || 'chart', id = p + '-' + hash(key), head = '', label = null;
		if (opts.title != null) {
			head = el('title', ['id', id + '-t'], esc(opts.title));
			label = id + '-t';
			if (opts.desc != null) {
				head += el('desc', ['id', id + '-d'], esc(opts.desc));
				label += ' ' + id + '-d';
			}
		}
		return el('svg', [
			'xmlns', 'http://www.w3.org/2000/svg',
			'width', '100%',
			'height', n(h, 2),
			'class', p,
			'font-size', 13,
			'fill', 'currentColor',
			'role', label ? 'img' : null,
			'aria-labelledby', label,
			'aria-hidden', label ? null : 'true'
		], head + body);
	}

	function init(target, markup) {
		target.innerHTML = markup;
	}

	return {
		init: init,
		palette: function (brand, theme) {
			return palette(common({ brand: brand, theme: theme }).brand, theme);
		},
		_: { n: n, esc: esc, el: el, fail: fail, num: num, str: str, common: common, svg: svg, palette: palette,
			pct: pct, bar: bar, labelLine: labelLine, legend: legend, SURFACE: SURFACE, shade: shade }
	};
});
