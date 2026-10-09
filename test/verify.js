// The browser half of the gate (spec, *Acceptance*): the funnel rendered in a real engine, under a strict
// CSP, at whatever width the gate opens the page with. Each check passes only when its function returns
// exactly true. scripts/browser-gate.mjs reads #verdict, the failing <li>s and document.title.

(function () {
	'use strict';
	var violations = [];
	document.addEventListener('securitypolicyviolation', function (e) { violations.push(e.violatedDirective + ' ' + e.blockedURI); });

	// cache-bust: a stale library fakes a result either way (AGENTS.md)
	var bust = '?ts=' + Date.now(), files = ['../charts.js', '../charts-funnel.js', '../charts-waterfall.js', '../charts-series.js', '../charts-spark.js', '../charts-rank.js'], i = 0;
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
	// the series (ADR 015): a month of two series with gaps and a losing day, as lines and as columns; a
	// stacked week; an area with a comparison period
	var month = [], week = [], P = function (x, a, b) {
		var v = b === undefined ? [a] : [a, b];
		return { x: x, values: v, display: v.map(function (n) { return n === null ? null : String(n); }) };
	};
	for (var d = 0; d < 30; d++) {
		var ggr = d === 3 ? null : d === 5 ? -120 : 300 + (d * 53) % 400;
		month.push(P((d + 1) + ' Oct', ggr, ggr === null ? null : Math.round(ggr / 4)));
	}
	['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (x, i) { week.push(P(x, 10 + i * 3, 4 + i)); });
	var prior = month.map(function (p, i) { return i === 7 ? null : 250 + (i * 31) % 300; });
	var SERIES = [
		['days', month, { title: 'Daily', names: ['Revenue — GGR', 'Commission'], brand: '#e11d48' }],
		['cols', month, { title: 'Daily columns', names: ['Revenue — GGR', 'Commission'], form: 'columns', theme: 'dark' }],
		['stack', week, { title: 'Deposits', names: ['First deposits', 'Repeat deposits'], form: 'columns', stacked: true }],
		['area', month.map(function (p) { return P(p.x, p.values[0]); }), { title: 'GGR', names: ['October'], form: 'area', theme: 'dark',
			previous: { name: 'September', values: prior, display: prior.map(function (n) { return n === null ? null : String(n); }) } }],
	];

	// the tile at its promised 160px (ADR 016): a 20-character label and a 9-character value; a sparkline
	var TILES = [
		['tile', { label: 'Registrations → FTD rate', value: '18 400.00', delta: { display: '+8.2% vs Sep', direction: 'up', good: true },
			trend: [3, 4, 2, null, 5, 6, 5, 8] }, { title: 'Tile' }, 'tile'],
		['tiledark', { label: 'CPA', value: '41.20', delta: { display: '+3.1%', direction: 'up', good: false } }, { title: 'Tile, dark', theme: 'dark' }, 'tile'],
		['spark', [10, 30, 20, 40], { title: 'Spark' }, 'spark'],
		// the ranking: a source where players won, the third row emphasised
		['rank', [{ label: 'sub-1', value: 300, display: '300' }, { label: 'sub-2', value: 150, display: '150' },
			{ label: 'sub-3', value: -100, display: '−100' }], { title: 'Rank', highlight: 1, theme: 'dark' }, 'rank'],
	];

	function run() {
		var root = document.getElementById('charts'), markup = {}, results = [];
		if (!window.Charts || typeof window.Charts.funnel !== 'function') return finish(['Charts.funnel is not loaded']);
		if (typeof window.Charts.waterfall !== 'function') return finish(['Charts.waterfall is not loaded']);
		if (typeof window.Charts.series !== 'function') return finish(['Charts.series is not loaded']);
		if (typeof window.Charts.tile !== 'function') return finish(['Charts.tile is not loaded']);
		if (typeof window.Charts.rank !== 'function') return finish(['Charts.rank is not loaded']);
		FIXTURES.concat(FLOWS, SERIES, TILES).forEach(function (f) {
			var card = document.createElement('div');
			card.className = 'card ' + (f[2].theme === 'dark' ? 'dark' : 'light') + (f[3] === 'tile' ? ' narrow' : '');
			card.id = 'card-' + f[0];
			markup[f[0]] = window.Charts[f[3] || (f[2].names ? 'series' : f[1][0].kind ? 'waterfall' : 'funnel')](f[1], f[2]);
			window.Charts.init(card, markup[f[0]]);
			root.appendChild(card);
		});
		var svg = function (name) { return document.querySelector('#card-' + name + ' > svg'); };
		var near = function (a, b, tol) { return Math.abs(a - b) <= (tol || 1); };
		// a text's glyph box on screen. Firefox puts a text's stroke in its client rect (measured: a 3px halo
		// moves a tick's box 2.5px left and 2px down), so a haloed tick is measured by its fill geometry
		var glyphs = function (t) {
			if (t.getAttribute('paint-order') !== 'stroke') return t.getBoundingClientRect();
			var r = t.ownerSVGElement.getBoundingClientRect(), b = t.getBBox();
			return { left: r.left + b.x, right: r.left + b.x + b.width, top: r.top + b.y, bottom: r.top + b.y + b.height, width: b.width };
		};

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
			return ids.length === 15 && new Set(ids).size === ids.length;
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
			return rows.length === 24 && [].every.call(rows, function (g) { return g.firstElementChild.tagName === 'title'; });
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
			return unscaled('#charts .chart-label', '13px') && unscaled('#charts .card:not(.narrow) .chart-value', '13px') && unscaled('#charts .narrow .chart-value', '26px') &&
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
				var boxes = [].map.call(s.querySelectorAll('text'), glyphs);
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
		// the series (ADR 015)
		var box = function (e) { return e.getBoundingClientRect(); };
		check('series: points sit at band centres, at any width', function () {
			var s = svg('days'), r = box(s), dots = s.querySelectorAll('.chart-dot');
			return dots.length === 2 && [].every.call(dots, function (d) { return near((box(d).left + box(d).right) / 2, r.left + r.width * 29.5 / 30, 1.5); });
		});
		check('series: lines keep a round 2px stroke in the stretched box', function () {
			var l = svg('days').querySelectorAll('.chart-line');
			return l.length === 4 && [].every.call(l, function (p) {
				var c = getComputedStyle(p);
				return c.vectorEffect === 'non-scaling-stroke' && c.strokeWidth === '2px' && c.strokeLinejoin === 'round';
			});
		});
		check('series: each tick text sits just above its gridline', function () {
			var s = svg('days'), g = s.querySelectorAll('.chart-grid'), t = s.querySelectorAll('.chart-tick');
			return g.length > 2 && g.length === t.length && [].every.call(g, function (line, k) {
				var y = box(line).top, b = glyphs(t[k]);
				return b.bottom <= y + 1 && b.bottom > y - 8 && near(b.left, box(s).left, 2);
			});
		});
		check('series: tick text is on top of the columns, where a reader looks for it', function () {
			var s = svg('cols');
			s.scrollIntoView({ block: 'center' });
			var t = s.querySelectorAll('.chart-tick'), ok = t.length > 2;
			[].forEach.call(t, function (e) {
				var b = glyphs(e), hit = document.elementFromPoint(b.left + 2, (b.top + b.bottom) / 2);
				// the hover bands are transparent and on top by design; under them, the text must win over the marks
				if (hit && hit.classList.contains('chart-hit')) {
					hit.style.pointerEvents = 'none';
					var under = document.elementFromPoint(b.left + 2, (b.top + b.bottom) / 2);
					hit.style.pointerEvents = '';
					hit = under;
				}
				if (hit !== e) ok = false;
			});
			window.scrollTo(0, 0);
			return ok;
		});
		check('series: columns stay inside their band and stand on the zero line', function () {
			var s = svg('cols'), r = box(s), w = r.width / 30, bars = s.querySelectorAll('.chart-bar');
			var zero = [].filter.call(s.querySelectorAll('.chart-grid'), function (l) { return l.getAttribute('stroke-opacity') === '0.35'; })[0];
			var z = box(zero).top, ok = bars.length === 58;
			[].forEach.call(bars, function (b, k) {
				// two columns a point; the fourth point has no data
				var i = Math.floor(k / 2) + (k >= 6 ? 1 : 0), x = box(b);
				if (x.left < r.left + i * w - 0.5 || x.right > r.left + (i + 1) * w + 0.5) ok = false;
				if (!(near(x.bottom, z, 1.5) || near(x.top, z, 1.5))) ok = false;
			});
			return ok;
		});
		check('series: stacked parts sit on each other, 2px apart', function () {
			var b = svg('stack').querySelectorAll('.chart-bar');
			if (b.length !== 14) return false;
			for (var k = 0; k < 14; k += 2) if (!near(box(b[k + 1]).bottom, box(b[k]).top - 2, 0.75) || !near(box(b[k + 1]).left, box(b[k]).left, 0.5)) return false;
			return true;
		});
		check('series: the band under a point answers with that point\'s title', function () {
			var s = svg('days');
			s.scrollIntoView({ block: 'center' });
			var r = box(s), hits = s.querySelectorAll('.chart-hit'), plot = box(hits[0]);
			var e = document.elementFromPoint(r.left + r.width * 10.5 / 30, (plot.top + plot.bottom) / 2);
			window.scrollTo(0, 0);
			return hits.length === 30 && e === hits[10] && e.firstElementChild.textContent === '11 Oct: Revenue — GGR 430, Commission 108';
		});
		check('series colours: series 1 the solid, series 2 the opposite hue, the comparison in the page colour', function () {
			var hex = function (c) { return '#' + c.match(/\d+/g).slice(0, 3).map(function (v) { return (+v + 256).toString(16).slice(1); }).join(''); };
			var l = svg('days').querySelectorAll('.chart-line'), prev = getComputedStyle(svg('area').querySelector('.chart-prev'));
			return hex(getComputedStyle(l[0]).stroke) === window.Charts._.palette('#e11d48', 'light').solid &&
				hex(getComputedStyle(l[3]).stroke) === window.Charts._.palette('#e11d48', 'light', Math.PI).solid &&
				hex(prev.stroke) === '#e6e6e6' && prev.strokeOpacity === '0.35';
		});
		// the sparkline and the tile (ADR 016)
		check('tile: at 160px a 20-character label, the value and the change stay inside', function () {
			var s = svg('tile'), r = box(s), t = s.querySelectorAll('text');
			return near(r.width, 160) && t.length === 3 && [].every.call(t, function (e) { return glyphs(e).right <= r.right + 2; }) &&
				/…$/.test(t[0].lastChild.textContent) && t[0].querySelector('title').textContent === 'Registrations → FTD rate';
		});
		check('tile: the value is 26px semibold, the change carries its arrow and the good colour', function () {
			var v = getComputedStyle(svg('tile').querySelector('.chart-value')), d = svg('tile').querySelector('.chart-delta');
			var hex = function (c) { return '#' + c.match(/\d+/g).slice(0, 3).map(function (n) { return (+n + 256).toString(16).slice(1); }).join(''); };
			var bad = svg('tiledark').querySelector('.chart-delta');
			return v.fontSize === '26px' && v.fontWeight === '600' && /^▲ /.test(d.textContent) &&
				hex(getComputedStyle(d).fill) === window.Charts._.palette('#0ca30c', 'light').solid &&
				hex(getComputedStyle(bad).fill) === window.Charts._.palette('#d03b3b', 'dark').solid && /^▲ /.test(bad.textContent);
		});
		check('spark: its own min and max fill the box; the end dot on the last point', function () {
			// 10, 30, 20, 40: the last is the maximum, at the box's top, 6px inside the 32px chart
			var s = svg('spark'), r = box(s), d = box(s.querySelector('.chart-dot'));
			var low = s.querySelector('.chart-line').points.getItem(0);
			return near(r.height, 32) && near((d.top + d.bottom) / 2, r.top + 6, 1) && near((d.left + d.right) / 2, r.left + r.width * 0.875, 1.5) &&
				near(low.y, 20, 0.01);
		});
		// the ranking
		check('rank: one scale over zero and every value, negatives left of the zero line', function () {
			// 300, 150, −100: range 400, zero at 25%
			var s = svg('rank'), r = box(s), b = [].map.call(s.querySelectorAll('.chart-bar, .chart-bar-muted'), box);
			var line = box(s.querySelector('.chart-axis'));
			return b.length === 3 && near(line.left, r.left + r.width * 0.25, 1.5) && near(b[0].left, line.left, 1.5) && near(b[0].right, r.right) &&
				near(b[1].width, r.width * 0.375, 1.5) && near(b[2].left, r.left) && near(b[2].right, line.left, 1.5);
		});
		check('rank: the highlighted row in the brand, the others grey', function () {
			var s = svg('rank'), hex = function (c) { return '#' + c.match(/\d+/g).slice(0, 3).map(function (n) { return (+n + 256).toString(16).slice(1); }).join(''); };
			var on = s.querySelectorAll('.chart-bar'), off = s.querySelectorAll('.chart-bar-muted');
			return on.length === 1 && off.length === 2 && hex(getComputedStyle(on[0].querySelector('rect')).fill) === window.Charts._.palette(null, 'dark').solid &&
				[].every.call(off, function (m) { return getComputedStyle(m).opacity === '0.35' && hex(getComputedStyle(m.querySelector('rect')).fill) === '#e6e6e6'; });
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
				return keys.length === 72 && keys.every(function (k) {
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
