// The browser half of the gate (spec, *Acceptance*): the funnel rendered in a real engine, under a strict
// CSP, at whatever width the gate opens the page with. Each check passes only when its function returns
// exactly true. scripts/browser-gate.mjs reads #verdict, the failing <li>s and document.title.

(function () {
	'use strict';
	var violations = [];
	document.addEventListener('securitypolicyviolation', function (e) { violations.push(e.violatedDirective + ' ' + e.blockedURI); });

	// cache-bust: a stale library fakes a result either way (AGENTS.md)
	var bust = '?ts=' + Date.now(), files = ['../charts.js', '../charts-funnel.js', '../charts-waterfall.js'], i = 0;
	(function next() {
		if (i === files.length) return setTimeout(run, 50);
		var s = document.createElement('script');
		s.src = files[i++] + bust;
		s.onload = next;
		s.onerror = function () { finish(['library did not load: ' + s.src]); };
		document.head.appendChild(s);
	})();

	var S = function (label, value, extra) {
		var o = { label: label, value: value, display: String(value) };
		for (var k in extra) o[k] = extra[k];
		return o;
	};
	var E = function (v) { return { value: v, display: String(v) }; };
	var FIXTURES = [
		['counts', [S('Clicks', 1000), S('Unique clicks', 500, { part: true }), S('Registrations', 250, { rate: '25%' }),
			S('First deposits', 0, { rate: null })], { title: 'Counts' }],
		['money', [S('Deposits — sum topped up', 400, { earned: E(60) }), S('2nd deposits', 100, { part: true, earned: E(15) }),
			S('Revenue — GGR', -100, { gap: true, earned: E(-25) }),
			S('Отклонённые записи (фрод, запрещённый источник, разбор)', 50, { group: 'losses', earned: E(8) })],
			{ title: 'Money', desc: 'Bases differ', legend: ['base of the event', 'earned by the partner'], theme: 'dark' }],
		['steps', [S('a', 1000), S('b', 400, { rate: '40%' })], { title: 'Steps', form: 'steps' }],
		['shape', [S('a', 1000), S('b', 500)], { title: 'Shape', form: 'shape' }],
	];
	// the waterfall (ADR 014): GGR to commission with a long neutral label, and a negative start crossing zero
	var T = function (label, value) { return { label: label, value: value, display: String(value), kind: 'total' }; };
	var D = function (label, value) { return { label: label, value: value, display: String(value), kind: 'delta' }; };
	var FLOWS = [
		['flow', [T('Revenue — GGR', 1000), D('Bonuses', -200), D('Fees', -100), T('NGR', 700),
			D('Stays with the platform and the network, by the agreement', -490), T('Commission', 210)], { title: 'Flow', brand: '#e11d48' }],
		['flowneg', [T('GGR', -200), D('Recovered', 500), T('Result', 300)], { title: 'Flow, negative', theme: 'dark' }],
	];

	function run() {
		var root = document.getElementById('charts'), markup = {}, results = [];
		if (!window.Charts || typeof window.Charts.funnel !== 'function') return finish(['Charts.funnel is not loaded']);
		if (typeof window.Charts.waterfall !== 'function') return finish(['Charts.waterfall is not loaded']);
		FIXTURES.concat(FLOWS).forEach(function (f) {
			var card = document.createElement('div');
			card.className = 'card ' + (f[2].theme === 'dark' ? 'dark' : 'light');
			card.id = 'card-' + f[0];
			markup[f[0]] = window.Charts[f[1][0].kind ? 'waterfall' : 'funnel'](f[1], f[2]);
			window.Charts.init(card, markup[f[0]]);
			root.appendChild(card);
		});
		var svg = function (name) { return document.querySelector('#card-' + name + ' > svg'); };
		var near = function (a, b, tol) { return Math.abs(a - b) <= (tol || 1); };

		function check(name, fn) {
			var ok;
			try { ok = fn() === true; } catch (e) { ok = false; name += ' — threw ' + e.message; }
			results.push([name, ok]);
		}

		check('every chart parses as XML', function () {
			return Object.keys(markup).every(function (k) {
				return !new DOMParser().parseFromString(markup[k], 'image/svg+xml').querySelector('parsererror');
			});
		});
		check('ids are unique across charts on one page', function () {
			var ids = [].map.call(document.querySelectorAll('#charts svg [id]'), function (e) { return e.id; });
			return ids.length === 7 && new Set(ids).size === ids.length;
		});
		check('aria-labelledby resolves inside its own chart', function () {
			return [].every.call(document.querySelectorAll('#charts svg[aria-labelledby]'), function (s) {
				return s.getAttribute('aria-labelledby').split(' ').every(function (id) {
					var t = document.getElementById(id);
					return t && t.parentNode === s && t.textContent.length > 0;
				});
			});
		});
		check('every row is a group whose first child is its <title>', function () {
			var rows = document.querySelectorAll('#charts svg > g:not([class])');
			return rows.length === 21 && [].every.call(rows, function (g) { return g.firstElementChild.tagName === 'title'; });
		});
		check('bars follow the page width: 50% of the value is 50% of the chart', function () {
			var s = svg('counts'), w = s.getBoundingClientRect().width;
			var bars = s.querySelectorAll('.chart-bar, .chart-bar-part');
			return near(bars[0].getBoundingClientRect().width, w) && near(bars[1].getBoundingClientRect().width, w / 2);
		});
		check('text keeps 13px at any width, unscaled', function () {
			// a viewBox would scale text on screen while its computed font-size still reads 13px: compare
			// the on-screen width with the width in the chart's own units (heights differ by engine: Firefox
			// boxes text by the font's full height, and adds 1px a side to the width — measured)
			var unscaled = function (sel, px) {
				return [].every.call(document.querySelectorAll(sel), function (t) {
					return getComputedStyle(t).fontSize === px && Math.abs(t.getBoundingClientRect().width - t.getBBox().width) <= 3;
				});
			};
			return unscaled('#charts .chart-label', '13px') && unscaled('#charts .chart-value', '13px') &&
				unscaled('#card-counts .chart-rate', '12px') && unscaled('#card-steps .chart-rate', '13px');
		});
		check('a part row is indented 12px', function () {
			var s = svg('counts'), labels = s.querySelectorAll('.chart-label');
			return near(labels[1].getBoundingClientRect().left - labels[0].getBoundingClientRect().left, 12, 1.5);
		});
		check('steps: a ghost of the previous step behind the next bar, at its full length', function () {
			var s = svg('steps'), g = s.querySelectorAll('.chart-bar-ghost'), w = s.getBoundingClientRect().width;
			return g.length === 1 && near(g[0].getBoundingClientRect().width, w);
		});
		check('text wears the page colour', function () {
			var t = svg('counts').querySelector('.chart-label'), d = svg('money').querySelector('.chart-label');
			return getComputedStyle(t).fill === 'rgb(17, 23, 28)' && getComputedStyle(d).fill === 'rgb(230, 230, 230)';
		});
		check('a negative bar ends at the zero line', function () {
			// the GGR row by its title, so a shifted positive bar cannot pass for it
			var s = svg('money'), line = s.querySelector('.chart-axis').getBoundingClientRect();
			var row = [].filter.call(s.querySelectorAll('g'), function (g) { return /^Revenue/.test(g.firstElementChild.textContent); })[0];
			var neg = row.querySelector('.chart-bar').getBoundingClientRect(), pos = s.querySelector('.chart-bar').getBoundingClientRect();
			return near(neg.right, line.left, 1.5) && near(pos.left, line.left, 1.5) && neg.width > 0;
		});
		check('no text overlaps, and none leaves its chart', function () {
			return [].every.call(document.querySelectorAll('#charts > .card > svg'), function (s) {
				var r = s.getBoundingClientRect();
				var boxes = [].map.call(s.querySelectorAll('text'), function (t) { return t.getBoundingClientRect(); });
				return boxes.every(function (a, k) {
					if (a.right > r.right + 2 || a.left < r.left - 2) return false;
					return boxes.slice(k + 1).every(function (b) {
						return !(a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 3 && b.top < a.bottom - 3);
					});
				});
			});
		});
		check('the shape form is centred', function () {
			var s = svg('shape'), r = s.getBoundingClientRect(), b = s.querySelectorAll('.chart-bar')[1].getBoundingClientRect();
			return near((b.left + b.right) / 2, (r.left + r.right) / 2, 1.5);
		});
		// the waterfall's bars in row order, ghosts apart: [total, down, down, total, down, total] for 'flow'
		var flowBars = function (name, cls) {
			return [].map.call(svg(name).querySelectorAll(cls || '.chart-bar-total, .chart-bar-up, .chart-bar-down'), function (b) { return b.getBoundingClientRect(); });
		};
		check('waterfall: each bar starts where the one above it ends', function () {
			// totals from zero, deltas from the running total; the totals here match the running sums
			var b = flowBars('flow'), r = svg('flow').getBoundingClientRect();
			return b.length === 6 && near(b[0].left, r.left) && near(b[0].right, r.right) &&
				near(b[1].right, b[0].right, 1.5) && near(b[2].right, b[1].left, 1.5) && near(b[3].right, b[2].left, 1.5) &&
				near(b[4].right, b[3].right, 1.5) && near(b[5].right, b[4].left, 1.5) && near(b[5].width, r.width * 0.21, 1.5);
		});
		check('waterfall: behind each delta a ghost from zero to the running total', function () {
			var g = flowBars('flow', '.chart-bar-ghost'), b = flowBars('flow'), r = svg('flow').getBoundingClientRect();
			return g.length === 3 && g.every(function (x) { return near(x.left, r.left); }) &&
				near(g[0].right, b[0].right, 1.5) && near(g[1].right, b[1].left, 1.5) && near(g[2].right, b[3].right, 1.5);
		});
		check('waterfall: a negative total ends at the zero line, a delta crosses it', function () {
			var s = svg('flowneg'), line = s.querySelector('.chart-axis').getBoundingClientRect(), b = flowBars('flowneg'), r = s.getBoundingClientRect();
			// range 500, zero at 40%
			return b.length === 3 && near(line.left, r.left + r.width * 0.4, 1.5) && near(b[0].right, line.left, 1.5) &&
				near(b[0].left, r.left) && near(b[1].left, r.left) && near(b[1].right, r.right) && near(b[2].left, line.left, 1.5);
		});
		check('waterfall colours: totals the solid, an increase lighter, a decrease the opposite hue', function () {
			var hex = function (c) { return '#' + c.match(/\d+/g).slice(0, 3).map(function (v) { return (+v + 256).toString(16).slice(1); }).join(''); };
			var fill = function (name, cls) { return hex(getComputedStyle(svg(name).querySelector(cls + ' rect')).fill); };
			var light = window.Charts._.palette('#e11d48', 'light'), dark = window.Charts._.palette(null, 'dark');
			return fill('flow', '.chart-bar-total') === light.solid && fill('flow', '.chart-bar-down') === window.Charts._.palette('#e11d48', 'light', Math.PI).solid &&
				fill('flowneg', '.chart-bar-up') === dark.solid && svg('flowneg').querySelector('.chart-bar-up').getAttribute('opacity') === '0.6' &&
				light.solid !== window.Charts._.palette('#e11d48', 'light', Math.PI).solid;
		});
		// last, after every chart has been in the document: CSP reports arrive asynchronously
		// the palette in this engine against the bytes Node computed (test/fixtures/palette.json): float
		// functions need not agree in the last digit across engines, and the output is a contract
		var pinned = null;
		fetch('fixtures/palette.json' + bust).then(function (r) { return r.json(); }).then(function (j) { pinned = j; }, function () { pinned = {}; });
		setTimeout(function wait() {
			if (!pinned) return setTimeout(wait, 50);
			check('the palette matches Node byte for byte', function () {
				var keys = Object.keys(pinned);
				return keys.length === 64 && keys.every(function (k) {
					// "<brand> <theme> turned" is the waterfall's decrease, the opposite hue (ADR 014)
					var a = k.split(' '), p = a[2] ? window.Charts._.palette(a[0], a[1], Math.PI) : window.Charts.palette(a[0], a[1]), w = pinned[k];
					return p.solid === w.solid && p.light === w.light && p.opacity === w.opacity;
				});
			});
			check('no CSP violations under default-src \'self\'', function () { return violations.length === 0; });
			finish(null, results);
		}, 150);
	}

	function finish(fatal, results) {
		var out = document.getElementById('out'), fails = 0;
		(results || []).forEach(function (r) {
			var li = document.createElement('li');
			li.textContent = r[0] + (r[1] ? ' — ok' : ' — FAIL');
			if (!r[1]) { li.className = 'fail'; fails++; }
			out.appendChild(li);
		});
		var v = fatal ? 'FAIL — ' + fatal.join('; ') : fails ? 'FAIL — ' + fails + ' of ' + results.length : 'ALL GREEN — ' + results.length + ' checks';
		document.getElementById('verdict').textContent = v + ' at ' + innerWidth + 'px';
		document.title = fatal || fails ? 'FAIL' : 'PASS';
	}
})();
