/*!
 * charts-lite — charts for affiliate programmes as SVG strings.
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
	// so float noise cannot reach the bytes (ADR 003)
	function n(v, d) {
		var p = Math.pow(10, d || 0), r = Math.round(v * p) / p;
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
		throw new TypeError('charts-lite: ' + msg);
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
	function common(options) {
		var o = options == null ? {} : options;
		if (typeof o !== 'object') fail('options must be an object');
		if (o.title != null) str(o.title, 'title');
		if (o.desc != null) str(o.desc, 'desc');
		var p = o.classPrefix;
		if (p != null && (typeof p !== 'string' || !/^[A-Za-z_][\w-]*$/.test(p))) fail('classPrefix must be a token like "chart"');
		if (o.brand != null && !/^#[0-9a-fA-F]{6}$/.test(o.brand)) fail('brand must be a #rrggbb hex');
		if (o.theme != null && o.theme !== 'light' && o.theme !== 'dark') fail('theme must be "light" or "dark"');
		if (o.width != null && !(num(o.width, 'width') > 0)) fail('width must be positive');
		return o;
	}
	// FNV-1a, 32-bit: ids derived from the input, so two charts on one page never collide (ADR 003)
	function hash(s) {
		var h = 0x811c9dc5;
		for (var i = 0; i < s.length; i++) {
			h ^= s.charCodeAt(i);
			h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
		}
		return h.toString(36);
	}
	// the root element and its accessible name (ADR 006). `opts` has passed common(); `key` serialises
	// the input fields the chart draws, so equal charts share ids and different ones do not.
	function svg(opts, w, h, body, key) {
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
			'viewBox', '0 0 ' + n(w, 2) + ' ' + n(h, 2),
			'class', p,
			'role', label ? 'img' : null,
			'aria-labelledby', label,
			'aria-hidden', label ? null : 'true'
		], head + body);
	}

	function init(target, markup) {
		target.innerHTML = markup;
	}

	return { init: init, _: { n: n, esc: esc, el: el, fail: fail, num: num, str: str, common: common, svg: svg } };
});
