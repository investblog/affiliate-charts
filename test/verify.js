// The browser half of the gate (spec, *Acceptance*): the funnel rendered in a real engine, under a strict
// CSP, at whatever width the gate opens the page with. Each check passes only when its function returns
// exactly true. scripts/browser-gate.mjs reads #verdict, the failing <li>s and document.title.

(function () {
	'use strict';
	var violations = [];
	document.addEventListener('securitypolicyviolation', function (e) { violations.push(e.violatedDirective + ' ' + e.blockedURI); });

	// cache-bust: a stale library fakes a result either way (AGENTS.md)
	var bust = '?ts=' + Date.now(), files = ['../charts.js', '../charts-funnel.js', '../charts-waterfall.js', '../charts-series.js', '../charts-spark.js', '../charts-rank.js', '../charts-share.js', '../charts-heatmap.js', '../charts-meter.js', '../charts-sankey.js'], i = 0;
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
		// part to whole (ADR 017): 50 / 30 / 0 / 20, as a bar and as a donut
		['sharebar', [{ label: 'Android', value: 50, display: '50' }, { label: 'iOS', value: 30, display: '30' }, { label: 'TV', value: 0, display: '0' },
			{ label: 'Desktop', value: 20, display: '20' }], { title: 'Share', theme: 'dark' }, 'share'],
		['donut', [{ label: 'Android', value: 50, display: '50' }, { label: 'iOS', value: 30, display: '30' }, { label: 'TV', value: 0, display: '0' },
			{ label: 'Desktop', value: 20, display: '20' }], { title: 'Donut', form: 'donut' }, 'share'],
		// the heatmap (ADR 018): a grid with a null cell, and a cohort triangle with text in its cells
		['heat', { rows: ['Mon', 'Tue'], cols: ['00', '06', '12', '18'], values: [[0, 25, null, 100], [15, 50, 75, 99]],
			display: [['0', '25', null, '100'], ['15', '50', '75', '99']] }, { title: 'Heat', brand: '#e11d48' }, 'heatmap'],
		['cohort', { rows: ['Apr', 'May', 'Jun'], cols: ['M0', 'M1', 'M2'], values: [[100, 62, 9], [100, 63], [100]],
			display: [['100%', '62%', '9%'], ['100%', '63%'], ['100%']] }, { title: 'Cohort', form: 'cohort', theme: 'dark' }, 'heatmap'],
		// the meter: a third of the way, a tier mark at half
		['meter', { label: 'Tier 3', value: 40, display: '40', target: 120, targetDisplay: 'tier 3 at 120', marks: [{ value: 60, label: 'Tier 2' }] },
			{ title: 'Meter', theme: 'dark' }, 'meter'],
		// the sankey (ADR 019): A 40, B 60 → R, X; R → F; one scale 2.24 px a unit
		['sankey', { nodes: [{ id: 'A', column: 0, short: 'A', label: 'Source A', display: '40' }, { id: 'B', column: 0, short: 'B', label: 'Source B', display: '60' },
			{ id: 'R', column: 1, short: 'REG', label: 'Registered', display: '50' }, { id: 'X', column: 1, short: 'NO', label: 'Not registered', display: '50' },
			{ id: 'F', column: 2, short: 'FTD', label: 'First deposit', display: '25' }],
		links: [{ from: 'A', to: 'R', value: 30, display: '30' }, { from: 'A', to: 'X', value: 10, display: '10' }, { from: 'B', to: 'R', value: 20, display: '20' },
			{ from: 'B', to: 'X', value: 40, display: '40' }, { from: 'R', to: 'F', value: 25, display: '25' }] }, { title: 'Sankey' }, 'sankey'],
	];

	function run() {
		var root = document.getElementById('charts'), markup = {}, results = [];
		if (!window.Charts || typeof window.Charts.funnel !== 'function') return finish(['Charts.funnel is not loaded']);
		if (typeof window.Charts.waterfall !== 'function') return finish(['Charts.waterfall is not loaded']);
		if (typeof window.Charts.series !== 'function') return finish(['Charts.series is not loaded']);
		if (typeof window.Charts.tile !== 'function') return finish(['Charts.tile is not loaded']);
		if (typeof window.Charts.rank !== 'function') return finish(['Charts.rank is not loaded']);
		if (typeof window.Charts.share !== 'function') return finish(['Charts.share is not loaded']);
		if (typeof window.Charts.heatmap !== 'function') return finish(['Charts.heatmap is not loaded']);
		if (typeof window.Charts.meter !== 'function') return finish(['Charts.meter is not loaded']);
		if (typeof window.Charts.sankey !== 'function') return finish(['Charts.sankey is not loaded']);
		FIXTURES.concat(FLOWS, SERIES, TILES).forEach(function (f) {
			var card = document.createElement('div');
			card.className = 'card ' + (f[2].theme === 'dark' ? 'dark' : 'light') + (f[3] === 'tile' ? ' narrow' : '');
			card.id = 'card-' + f[0];
			markup[f[0]] = f[3] === 'sankey' ? window.Charts.sankey(f[1].nodes, f[1].links, f[2])
				: window.Charts[f[3] || (f[2].names ? 'series' : f[1][0].kind ? 'waterfall' : 'funnel')](f[1], f[2]);
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
			return ids.length === 21 && new Set(ids).size === ids.length;
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
			var rows = document.querySelectorAll('#charts > .card > svg > g:not([class])');
			return rows.length === 25 && [].every.call(rows, function (g) { return g.firstElementChild.tagName === 'title'; });
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
		// a column is 24px wide inside its point's viewport, which clips it (M9 review): what shows is the overlap
		// of the two, the viewport read from its resolved x and width (nested-svg boxes differ by engine)
		var shown = function (b) {
			var v = b.parentNode.parentNode, r = box(v.ownerSVGElement), x = box(b), left = r.left + v.x.baseVal.value, right = left + v.width.baseVal.value;
			return { left: Math.max(x.left, left), right: Math.min(x.right, right), top: x.top, bottom: x.bottom };
		};
		check('series: columns stay inside their band, at most 24px, and stand on the zero line', function () {
			var s = svg('cols'), r = box(s), w = r.width / 30, bars = s.querySelectorAll('.chart-bar');
			var zero = [].filter.call(s.querySelectorAll('.chart-grid'), function (l) { return l.getAttribute('stroke-opacity') === '0.35'; })[0];
			var z = box(zero).top, ok = bars.length === 58;
			[].forEach.call(bars, function (b, k) {
				// two columns a point; the fourth point has no data
				var i = Math.floor(k / 2) + (k >= 6 ? 1 : 0), x = shown(b);
				if (x.left < r.left + i * w - 0.5 || x.right > r.left + (i + 1) * w + 0.5 || x.right - x.left > 24.5 || x.right <= x.left) ok = false;
				if (!(near(x.bottom, z, 1.5) || near(x.top, z, 1.5))) ok = false;
				// the two columns of a point do not overlap
				if (k % 2 && !(shown(bars[k - 1]).right <= x.left + 0.5)) ok = false;
			});
			// the viewport really clips: just past its edge, between two viewports, under the column's full 24px,
			// no column answers
			// (the hover bands, transparent and on top by design, are set aside for the probe)
			// the second point's first column: the first point's would spill past the chart, which clips on its own
			var first = bars[2], v = first.parentNode.parentNode, edge = box(v.ownerSVGElement).left + v.x.baseVal.value, full = box(first);
			if (full.left < edge - 2) {
				s.scrollIntoView({ block: 'center' });
				var hits = s.querySelectorAll('.chart-hit');
				[].forEach.call(hits, function (h) { h.setAttribute('pointer-events', 'none'); });
				full = box(first);
				var e = document.elementFromPoint(box(v.ownerSVGElement).left + v.x.baseVal.value - 2, (full.top + full.bottom) / 2);
				[].forEach.call(hits, function (h) { h.removeAttribute('pointer-events'); });
				window.scrollTo(0, 0);
				if (e && e.closest('.chart-bar')) ok = false;
			}
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
		// part to whole
		check('share: parts at their share of the width, a gap between, none at the ends', function () {
			// a line's box is 0 wide in Chromium and WebKit and holds its stroke in Firefox (measured): read the
			// resolved x and the computed stroke instead
			var s = svg('sharebar'), r = box(s), p = [].map.call(s.querySelectorAll('.chart-part'), box), g = s.querySelectorAll('line');
			return p.length === 3 && near(p[0].left, r.left) && near(p[0].width, r.width * 0.5) && near(p[1].width, r.width * 0.3) &&
				near(p[2].right, r.right) && g.length === 2 && getComputedStyle(g[0]).strokeWidth === '2px' &&
				near(g[0].x1.baseVal.value, r.width * 0.5, 0.75) && near(g[1].x1.baseVal.value, r.width * 0.8, 0.75);
		});
		// the donut's boxes differ by engine (Chromium and WebKit box a nested svg by its content, Firefox puts
		// a circle's stroke in its box, and its nested-svg screen matrix leaves the viewBox out — measured); a
		// circle's own screen matrix agrees in all three. Only its centre and scale are taken from it: `at(deg)`
		// probes the ring's centre line at an angle clockwise from the top of the screen, so a circle that lost
		// its rotation is not followed
		var donut = function () {
			var c = svg('donut').querySelectorAll('.chart-part'), k = c[0].getScreenCTM(), s = Math.sqrt(k.a * k.a + k.b * k.b);
			var mid = [k.a * 50 + k.c * 50 + k.e, k.b * 50 + k.d * 50 + k.f];
			return { c: c, s: s, mid: mid, at: function (deg) {
				var a = deg * Math.PI / 180;
				return document.elementFromPoint(mid[0] + 40 * s * Math.sin(a), mid[1] - 40 * s * Math.cos(a));
			} };
		};
		check('share: the donut is a 160px square, centred, its parts in their slots', function () {
			// 1.6px a unit; the centre (50, 50) at the chart's middle, 80px down. Desktop is the fourth part (the
			// zero TV keeps slot 3), so slot 4, yellow
			var r = box(svg('donut')), d = donut();
			return d.c.length === 3 && near(d.s, 1.6, 0.01) && near(d.mid[0], (r.left + r.right) / 2, 1.5) && near(d.mid[1], r.top + 80, 1) && getComputedStyle(d.c[2]).stroke === 'rgb(237, 161, 0)';
		});
		check('share: the donut starts at 12 o\'clock and runs clockwise', function () {
			// 50 / 30 / 20 from 12 o'clock clockwise: Android to 180°, iOS to 288°, Desktop to 360°; probe the ring
			// at 90°, 234° and 324° clockwise from the top
			svg('donut').scrollIntoView({ block: 'center' });
			var d = donut(), ok = d.at(90) === d.c[0] && d.at(234) === d.c[1] && d.at(324) === d.c[2];
			window.scrollTo(0, 0);
			return ok;
		});
		// the heatmap
		var hex = function (c) { return '#' + c.match(/\d+/g).slice(0, 3).map(function (n) { return (+n + 256).toString(16).slice(1); }).join(''); };
		check('heatmap: cells in their bands, in the step of their value, a null cell unfilled', function () {
			// 0 25 null 100 | 15 50 75 99 over [0, 100] → steps 0 1 – 4 | 0 2 3 4 (15 rounds to step 1, floors to 0)
			var s = svg('heat'), r = box(s), c = s.querySelectorAll('.chart-cell'), e = s.querySelectorAll('.chart-cell-empty');
			var ramp = [0.71, 0.63, 0.55, 0.47, 0.39].map(function (L) { return window.Charts._.shade('#e11d48', L); });
			var steps = [].map.call(c, function (x) { return ramp.indexOf(hex(getComputedStyle(x).fill)); });
			return c.length === 7 && e.length === 1 && steps.join() === '0,1,4,0,2,3,4' && near(box(c[0]).left, r.left) && near(box(c[0]).width, r.width / 4) &&
				near(box(c[2]).right, r.right) && near(box(e[0]).left, r.left + r.width / 2) &&
				/^(transparent|rgba\(0, 0, 0, 0\))$/.test(getComputedStyle(e[0]).fill);
		});
		check('heatmap: a cohort is a triangle, its text inside its cells, ink or white by the step', function () {
			var s = svg('cohort'), c = s.querySelectorAll('.chart-cell'), t = s.querySelectorAll('text[font-size="11"]');
			return c.length === 6 && t.length === 6 && [].every.call(t, function (x, k) {
				var b = glyphs(x), cell = box(c[k]);
				return b.left >= cell.left - 0.5 && b.right <= cell.right + 0.5;
			}) && hex(getComputedStyle(t[0]).fill) === '#11171c' && hex(getComputedStyle(t[2]).fill) === '#ffffff';
		});
		// the meter
		check('meter: the track spans the chart, the fill a third of it, the tier mark at half', function () {
			var s = svg('meter'), r = box(s), t = box(s.querySelector('.chart-track')), f = box(s.querySelector('.chart-bar')), m = s.querySelector('.chart-mark');
			return near(t.left, r.left) && near(t.width, r.width) && near(f.left, r.left) && near(f.width, r.width / 3, 1.5) &&
				near(m.x1.baseVal.value, r.width / 2, 0.75) && getComputedStyle(s.querySelector('.chart-track')).opacity === '0.2';
		});
		// the sankey: ribbon ends read through the ribbon's own screen matrix (the donut lesson: nested-svg
		// boxes differ by engine)
		check('sankey: each ribbon leaves its source node and lands on its target, stacked in order', function () {
			// the drawn geometry from each ribbon's own box (user units: x in percent, y in px), placed on screen by its
			// matrix. A→R spans y 0–67.2 from x 0 to 50; B→R leaves B at 105.6 and lands at 67.2 under R's top, its box
			// 67.2–150.4; R→F reaches x 100
			var s = svg('sankey'), n = [].map.call(s.querySelectorAll('.chart-node'), box), p = s.querySelectorAll('.chart-link'), r = box(s);
			var at = function (e, x, y) { var k = e.getScreenCTM(); return [k.a * x + k.c * y + k.e, k.b * x + k.d * y + k.f]; };
			var g0 = p[0].getBBox(), g2 = p[2].getBBox(), g4 = p[4].getBBox();
			var a0 = at(p[0], g0.x, g0.y), a1 = at(p[0], g0.x + g0.width, g0.y), b1 = at(p[2], g2.x + g2.width, g2.y), f1 = at(p[4], g4.x + g4.width, g4.y);
			return p.length === 5 && n.length === 5 && near(g0.height, 67.2, 0.1) && near(g2.y, 67.2, 0.1) && near(g2.height, 83.2, 0.1) &&
				near(a0[0], r.left) && near(a0[1], n[0].top) && a1[0] > n[2].left && a1[0] < n[2].right && near(a1[1], n[2].top) &&
				near(b1[1], n[2].top + 67.2, 1) && near(f1[0], r.right) && near(f1[1], n[4].top) && near(n[4].right, r.right);
		});
		check('sankey: a ribbon answers with its title under the pointer', function () {
			// B→X: from 150.4 to 150.4, 89.6 thick; at x 25 its middle is at 195.2
			var s = svg('sankey'), p = s.querySelectorAll('.chart-link');
			s.scrollIntoView({ block: 'center' });
			var k = p[3].getScreenCTM(), e = document.elementFromPoint(k.a * 25 + k.e, k.d * 195.2 + k.f);
			window.scrollTo(0, 0);
			return e === p[3] && e.firstElementChild.textContent === 'Source B → Not registered: 40';
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
