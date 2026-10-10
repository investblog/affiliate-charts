// The browser half of the gate, run by hand: `npm run gate:browser [-- --mutate]`.
//
// It serves the repo on loopback with the CSP a strict cabinet ships (`default-src 'self'`), opens
// test/verify.html in every engine it can find at 375 and 1280 px, and reads the page's verdict.
//
// With --mutate it then breaks the library on purpose, one anchor at a time, and reports any check
// that never went red: a check is trusted only after it has been seen to fail (cards-lite M5).
// Ported from slots-lite (itself from cards-lite) with its guards; the CSP header, the widths and the
// two-file mutations are this library's.
//
// **It writes to charts.js and the chart modules.** The original bytes are taken once, before anything
// is written, and put back from memory — never with `git checkout`, which restores the index and
// would discard uncommitted work. Restoration is wired to SIGINT, SIGTERM, SIGHUP and exit as well as
// to the finally block.
//
// Playwright is NOT a dependency of this package. This script uses whatever playwright is on the
// machine (directly, or inside a globally installed @playwright/mcp); if none is, it says so and
// exits 0, because a missing dev tool is not a failing library.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['charts.js', 'charts-funnel.js', 'charts-waterfall.js', 'charts-series.js', 'charts-spark.js', 'charts-rank.js', 'charts-share.js', 'charts-heatmap.js', 'charts-meter.js', 'charts-sankey.js'];
const MUTATE = process.argv.includes('--mutate');
const WIDTHS = [375, 1280];
const CSP = "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self'; base-uri 'none'; object-src 'none'";

// taken before a single byte is written anywhere, and the only source of truth for putting it back
const ORIGINAL = Object.fromEntries(FILES.map((f) => [f, fs.readFileSync(path.join(ROOT, f))]));
let dirty = null;
function restore() {
	if (!dirty) return;
	fs.writeFileSync(path.join(ROOT, dirty), ORIGINAL[dirty]);
	dirty = null;
}
process.on('exit', restore);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { restore(); process.exit(130); });

function playwright() {
	const require = createRequire(import.meta.url);
	for (const id of ['playwright', 'playwright-core']) {
		try { return require(id); } catch { /* keep looking */ }
	}
	try {
		// execSync, not execFileSync: npm is a .cmd on Windows, which Node will not spawn without a shell
		const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
		return createRequire(path.join(root, '@playwright', 'mcp', 'package.json'))('playwright-core');
	} catch { return null; }
}

const TYPES = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript;charset=utf-8', '.css': 'text/css;charset=utf-8' };
function serve() {
	return new Promise((res) => {
		const s = http.createServer((req, rq) => {
			let f;
			// a bad %-escape must not take the process down, and the path must stay inside the repo
			try { f = path.resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0])); } catch { f = null; }
			if (!f || (f !== ROOT && !f.startsWith(ROOT + path.sep))) { rq.writeHead(403); return rq.end('no'); }
			fs.readFile(f, (e, d) => {
				if (e) { rq.writeHead(404); return rq.end('no'); }
				// no-store, so a run never reads the previous version of the library
				// the strict CSP on the verify page (the product's promise); the demo is served as Pages
				// serves it, without one — it has its own inline styles and is not the product
				const headers = { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' };
				if (f.startsWith(path.join(ROOT, 'test') + path.sep)) headers['content-security-policy'] = CSP;
				rq.writeHead(200, headers);
				rq.end(d);
			});
		});
		// loopback only: `listen(port)` alone binds every interface
		s.listen(0, '127.0.0.1', () => res([s, s.address().port]));
	});
}

// The live demo (index.html), every combination of its controls: no page error, and every card shows a
// chart or the demo's own note. A shape that threw on the counts example (its part step) once reached
// the published demo because nothing here opened it (2026-10-09).
async function demo(pw, port) {
	const browser = await pw.chromium.launch();
	const problems = [];
	try {
		const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
		page.on('pageerror', (e) => problems.push(String(e).split('\n')[0]));
		page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/u.test(m.text())) problems.push(m.text()); });
		await page.goto(`http://127.0.0.1:${port}/index.html`);
		await page.waitForSelector('#stage .card');
		let combos = 0;
		// the waterfall has one form: its form control is disabled, and is not touched
		const charts = { funnel: [['counts', 'money', 'negative', 'fresh'], ['bars', 'steps', 'shape'], '.chart-bar'],
			waterfall: [['flow', 'losing'], [null], '.chart-bar-total'],
			series: [['money', 'clicks', 'deposits'], ['line', 'area', 'columns'], '.chart-hit'],
			tile: [['epc', 'cpa', 'cr', 'ftd'], [null], '.chart-value'],
			rank: [['sources', 'focus'], [null], '.chart-bar'],
			share: [['devices', 'geo'], ['bar', 'donut'], '.chart-part'],
			heatmap: [['hours', 'cohorts'], [null], '.chart-cell'],
			meter: [['tier', 'cap'], [null], '.chart-track'],
			sankey: [['funnel', 'geo'], [null], '.chart-link'] };
		for (const [chart, [examples, forms, mark]] of Object.entries(charts)) {
			await page.selectOption('#chart', chart);
			for (const show of ['one', 'sheet']) {
				for (const example of examples) {
					for (const form of forms) {
						for (const theme of ['dark', 'light']) {
							await page.selectOption('#show', show);
							if (show === 'one') await page.selectOption('#example', example);
							// a disabled option is the demo's answer for that example; selecting it must not throw
							if (form) await page.selectOption('#form', form).catch(() => {});
							await page.selectOption('#theme', theme);
							/* global document -- runs in the page */
							const [cards, empty, drawn] = await page.evaluate((m) => {
								const all = [...document.querySelectorAll('#stage .card')];
								return [all.length, all.filter((c) => !c.querySelector('svg') && !c.querySelector('.note')).length,
									all.filter((c) => c.querySelector('svg ' + m)).length];
							}, mark);
							const at = `${chart}/${show}/${example}/${form || '-'}/${theme}`;
							if (!cards) problems.push(`${at}: no card`);
							if (empty) problems.push(`${at}: ${empty} card(s) with neither a chart nor a note`);
							// the chart chosen is the chart drawn: a waterfall card carries total bars, a series card its hover bands
							if (chart !== 'funnel' && drawn !== cards) problems.push(`${at}: ${cards - drawn} card(s) without a ${chart}`);
							combos++;
						}
					}
				}
			}
		}
		// and back: the funnel after the waterfall gets its form control and its bars again
		await page.selectOption('#show', 'one');
		await page.selectOption('#chart', 'funnel');
		const back = await page.evaluate(() => !document.getElementById('form').disabled && !!document.querySelector('#stage .card svg .chart-bar'));
		if (!back) problems.push('waterfall → funnel: the form stays disabled or no funnel is drawn');
		return { combos, problems };
	} finally { await browser.close(); }
}

async function verify(pw, engine, port, width) {
	const browser = await pw[engine].launch();
	try {
		const page = await browser.newPage({ viewport: { width, height: 900 } });
		await page.goto(`http://127.0.0.1:${port}/test/verify.html`);
		// the page sets its title to PASS or FAIL when done; a suite that dies leaves the original
		// title, the third outcome, which must read as neither
		await page.waitForFunction(() => document.title !== 'affiliate-charts — verify', null, { timeout: 30000 });
		/* global document -- the lines below run inside the page */
		return await page.evaluate(() => ({
			verdict: document.getElementById('verdict').textContent,
			all: [...document.querySelectorAll('#out li')].map((l) => l.textContent.split(' — ')[0]),
			fails: [...document.querySelectorAll('#out li.fail')].map((l) => l.textContent),
		}));
	} finally { await browser.close(); }
}

// Each entry breaks one thing the page claims to check. The label says what was broken, never which
// check should notice — a mutation that reddens a check nobody expected is information.
const MUTATIONS = [
	{ label: 'the funnel is not registered', file: 'charts-funnel.js', edits: [['core.funnel = factory(core._);', 'factory(core._);']] },
	{ label: 'an unclosed empty element', file: 'charts.js', edits: [["return inner == null ? s + '/>'", "return inner == null ? s + '>'"]] },
	{ label: 'ids ignore the input', file: 'charts.js', edits: [["id = p + '-' + hash(key)", "id = p + '-' + hash('')"]] },
	{ label: 'labelledby points elsewhere', file: 'charts.js', edits: [["label = id + '-t';", "label = id + '-x';"]] },
	{ label: 'rows lose their title', file: 'charts-funnel.js', edits: [["_.el('title', [], _.esc(tip))", "''"]] },
	{ label: 'bar lengths in px, not percent', file: 'charts.js', edits: [["return n(v, 3) + '%';", 'return n(v, 3);']] },
	{ label: 'text scaled with the chart', file: 'charts.js', edits: [["'width', '100%',\n\t\t\t'height', n(h, 2),", "'viewBox', '0 0 300 ' + n(h, 2),\n\t\t\t'width', '100%',"]] },
	{ label: 'text in a fixed colour', file: 'charts.js', edits: [["'fill', 'currentColor',\n\t\t\t'role'", "'fill', '#808080',\n\t\t\t'role'"]] },
	{ label: 'negatives grow right', file: 'charts-funnel.js', edits: [['return _.bar(v < 0 ? z - w : z,', 'return _.bar(z,']] },
	{ label: 'labels never cut, rows never split', file: 'charts.js', edits: [['NARROW = 343, GLYPH = 8;', 'NARROW = 343, GLYPH = 2;']] },
	{ label: 'shape not centred', file: 'charts-funnel.js', edits: [['return _.bar(50 - w / 2, w,', 'return _.bar(0, w,']] },
	{ label: 'an inline style on the root', file: 'charts.js', edits: [["'font-size', 13,", "'style', 'font-size:13px',"]] },
	{ label: 'part rows not indented', file: 'charts-funnel.js', edits: [['INDENT = 12', 'INDENT = 0']] },
	{ label: 'no ghost in the steps form', file: 'charts-funnel.js', edits: [["if (form === 'steps' && prev && prev.value > 0", "if (form === 'step' && prev && prev.value > 0"]] },
	{ label: 'a smaller rate chip', file: 'charts-funnel.js', edits: [["'font-size', form === 'steps' ? 13 : 12,", "'font-size', form === 'steps' ? 13 : 11,"]] },
	{ label: 'a palette off by a contrast step', file: 'charts.js', edits: [['bg, 4.5, t ===', 'bg, 4.6, t ===']] },
	{ label: 'the waterfall is not registered', file: 'charts-waterfall.js', edits: [['core.waterfall = factory(core._);', 'factory(core._);']] },
	{ label: 'waterfall deltas from zero', file: 'charts-waterfall.js', edits: [['from = total ? 0 : run', 'from = 0']] },
	{ label: 'waterfall without ghosts', file: 'charts-waterfall.js', edits: [['if (!total && run) row += span(', 'if (false) row += span(']] },
	{ label: 'waterfall negatives grow right', file: 'charts-waterfall.js', edits: [['z + Math.min(a, b) / range * 100', 'z + Math.abs(Math.min(a, b)) / range * 100']] },
	{ label: 'waterfall decrease in the brand hue', file: 'charts-waterfall.js', edits: [['Math.PI).solid', '0).solid']] },
	{ label: 'waterfall increase solid', file: 'charts-waterfall.js', edits: [['pal.solid, pal.opacity, p', 'pal.solid, 1, p']] },
	{ label: 'waterfall rows lose their title', file: 'charts-waterfall.js', edits: [["_.el('title', [], _.esc(s.label + ': ' + s.display))", "''"]] },
	{ label: 'the series is not registered', file: 'charts-series.js', edits: [['core.series = factory(core._);', 'factory(core._);']] },
	{ label: 'series points at band edges', file: 'charts-series.js', edits: [['function cx(i) { return off + (i + 0.5) * w; }', 'function cx(i) { return off + i * w; }']] },
	{ label: 'columns ignore the gutter', file: 'charts-series.js', edits: [['out += view(off + i * w + 0.15 * w + j * (cw + g)', 'out += view(i * w + 0.15 * w + j * (cw + g)']] },
	{ label: 'second ignored', file: 'charts-series.js', edits: [[': o.second ? _.palette(o.second, o.theme).solid : _.palette', ': _.palette']] },
	{ label: 'series stroke scales with the box', file: 'charts-series.js', edits: [["'vector-effect', 'non-scaling-stroke'", "'vector-effect', null"]] },
	{ label: 'series tick text under its gridline', file: 'charts-series.js', edits: [["_.n(gy - 4, 2), 'opacity', 0.7", "_.n(gy + 12, 2), 'opacity', 0.7"]] },
	{ label: 'grouped columns overlap', file: 'charts-series.js', edits: [['j * (cw + g)', 'j * cw * 0.5']] },
	{ label: 'columns unclipped by their band', file: 'charts-series.js', edits: [["'width', _.pct(cw)], inner);", "'width', _.pct(cw), 'overflow', 'visible'], inner);"]] },
	{ label: 'stacked parts touch', file: 'charts-series.js', edits: [['Math.max(b, at(base) - 2)', 'Math.max(b, at(base))']] },
	{ label: 'hover bands that take no pointer', file: 'charts-series.js', edits: [["'height', PLOT, 'fill', 'transparent'", "'height', PLOT, 'fill', 'none'"]] },
	{ label: 'series 2 in the brand hue', file: 'charts-series.js', edits: [['_.palette(o.brand, o.theme, Math.PI).solid', '_.palette(o.brand, o.theme).solid']] },
	{ label: 'series tick text under the marks', file: 'charts-series.js', edits: [["'overflow', 'visible'], box) + dots + tickText;", "'overflow', 'visible'], tickText + box) + dots;"]] },
	{ label: 'the tile is not registered', file: 'charts-spark.js', edits: [['core.tile = api.tile;', '']] },
	{ label: 'tile labels cut at 30', file: 'charts-spark.js', edits: [['LABEL = 20', 'LABEL = 30']] },
	{ label: 'the tile value small', file: 'charts-spark.js', edits: [["'font-size', 26, 'font-weight', 600", "'font-size', 20, 'font-weight', 600"]] },
	{ label: 'a change coloured by its direction', file: 'charts-spark.js', edits: [['_.palette(d.good ? GOOD : BAD, o.theme)', "_.palette(d.direction === 'up' ? GOOD : BAD, o.theme)"]] },
	{ label: 'the spark scale from zero', file: 'charts-spark.js', edits: [['return hi > lo ? (hi - v) / (hi - lo) * h : h / 2;', 'return hi > 0 ? (hi - v) / hi * h : h / 2;']] },
	{ label: 'the rank is not registered', file: 'charts-rank.js', edits: [['core.rank = factory(core._);', 'factory(core._);']] },
	{ label: 'rank negatives grow right', file: 'charts-rank.js', edits: [['r.value < 0 ? z - w : z', 'z']] },
	{ label: 'muted rank bars in the brand', file: 'charts-rank.js', edits: [["muted ? 'currentColor' : solid", 'solid']] },
	{ label: 'the share is not registered', file: 'charts-share.js', edits: [['core.share = factory(core._);', 'factory(core._);']] },
	{ label: 'the donut counter-clockwise', file: 'charts-share.js', edits: [['_.n(-at * CIRC, 3)', '_.n(at * CIRC, 3)']] },
	{ label: 'the donut from 3 o\'clock', file: 'charts-share.js', edits: [["'transform', 'rotate(-90 50 50)'", "'transform', null"]] },
	{ label: 'the donut stretched', file: 'charts-share.js', edits: [["'viewBox', '0 0 100 100']", "'viewBox', '0 0 100 100', 'preserveAspectRatio', 'none']"]] },
	{ label: 'bar gaps at the edges', file: 'charts-share.js', edits: [['if (!donut && at) gaps +=', 'if (!donut) gaps +=']] },
	{ label: 'the heatmap is not registered', file: 'charts-heatmap.js', edits: [['core.heatmap = factory(core._);', 'factory(core._);']] },
	{ label: 'heatmap steps by rounding', file: 'charts-heatmap.js', edits: [['Math.min(4, Math.floor(v / max * 5))', 'Math.min(4, Math.round(v / max * 4))']] },
	{ label: 'a null cell filled near zero', file: 'charts-heatmap.js', edits: [["'height', CELL, 'fill', 'transparent'", "'height', CELL, 'fill', ramp[0]"]] },
	{ label: 'cohort text always white', file: 'charts-heatmap.js', edits: [["STEPS[t][s] >= 0.6 ? INK : '#fff'", "'#fff'"]] },
	{ label: 'the meter is not registered', file: 'charts-meter.js', edits: [['core.meter = factory(core._);', 'factory(core._);']] },
	{ label: 'meter marks at the value', file: 'charts-meter.js', edits: [['marks[i].value / m.target * 100', 'marks[i].value / m.value * 100']] },
	{ label: 'the meter track solid', file: 'charts-meter.js', edits: [['TRACK = 0.2', 'TRACK = 1']] },
	{ label: 'the sankey is not registered', file: 'charts-sankey.js', edits: [['core.sankey = factory(core._);', 'factory(core._);']] },
	{ label: 'sankey ribbons stack from the top', file: 'charts-sankey.js', edits: [['b.i += h;', '']] },
	{ label: 'sankey nodes spill past the edge', file: 'charts-sankey.js', edits: [["'transform', shift ? 'translate(-' + _.n(shift, 2) + ')' : null", "'transform', null"]] },
	{ label: 'sankey ribbons without titles', file: 'charts-sankey.js', edits: [["title(a.n.label + ' → ' + b.n.label + ': ' + l.display)", "''"]] },
	{ label: 'the last x label past the edge', file: 'charts-series.js', edits: [["out += xl(i, end ? '100%' : off ? _.pct(off) : 0, end ? 'end' : 'start');", "out += xl(i, end ? '100%' : off ? _.pct(off) : 0, 'start');"]] },
];

async function main() {
	const pw = playwright();
	if (!pw) {
		console.log('no playwright on this machine — skipping the browser gate.');
		console.log('install one with:  npm i -g playwright  &&  npx playwright install');
		return 0;
	}
	const [server, port] = await serve();
	let red = 0, names = [];
	const missing = [], engines = [];
	try {
		for (const engine of ['chromium', 'firefox', 'webkit']) {
			let ran = false;
			for (const width of WIDTHS) {
				let r;
				try { r = await verify(pw, engine, port, width); } catch (e) {
					console.log(`${engine} / ${width}px: could not run — ${e.message.split('\n')[0]}`);
					missing.push(`${engine}/${width}`); continue;
				}
				ran = true;
				names = [...new Set([...names, ...r.all])];
				console.log(`${(engine + ' / ' + width + 'px').padEnd(18)} ${r.verdict}`);
				r.fails.forEach((f) => console.log('     ✘ ' + f));
				if (!r.verdict.startsWith('ALL GREEN')) red++;
			}
			if (ran) engines.push(engine);
		}
		if (missing.length) console.log(`(not run: ${missing.join(', ')})`);

		if (engines.includes('chromium')) {
			const d = await demo(pw, port);
			console.log(`${'demo / chromium'.padEnd(18)} ${d.problems.length ? 'FAIL' : 'ALL GREEN'} — ${d.combos} control combinations`);
			d.problems.slice(0, 10).forEach((p) => console.log('     ✘ ' + p));
			if (d.problems.length) red++;
		}

		if (MUTATE && !red && engines.length) {
			console.log('\n── mutations: break the library, watch the page go red ──');
			const seen = new Set();
			for (const m of MUTATIONS) {
				let src = ORIGINAL[m.file].toString(), ok = true;
				for (const [a, b] of m.edits) {
					// a mutation that lands twice, or not at all, proves nothing
					if (src.split(a).length !== 2) { ok = false; break; }
					src = src.replace(a, b);
				}
				if (!ok) { console.log(`SKIP  ${m.label.padEnd(36)} the anchor has moved; fix this mutation`); red++; continue; }
				dirty = m.file;
				fs.writeFileSync(path.join(ROOT, m.file), src);
				let caught = false, note = '';
				// the narrow width is where layout breaks first
				let r;
				try { r = await verify(pw, engines[0], port, WIDTHS[0]); } catch (e) { note = ` (${e.message.split('\n')[0]})`; }
				if (r) {
					// a mutation that kills the suite shows no failing <li>, and must not read as unnoticed
					if (r.fails.length || !r.verdict.startsWith('ALL GREEN')) caught = true;
					r.fails.map((f) => f.split(' — ')[0]).forEach((f) => seen.add(f));
				}
				console.log(`${caught ? 'RED  ' : '.... '} ${m.label.padEnd(36)} ${engines[0]}${note}`);
				if (!caught) red++;
				restore();
			}
			const never = names.filter((n) => !seen.has(n));
			console.log(never.length
				? '\nNEVER SEEN FAILING — write a mutation for each, or the check is decoration:\n' + never.map((n) => '  ' + n).join('\n')
				: '\nevery check on the page has been seen to fail.');
			red += never.length;
		}
	} finally {
		server.close();
		restore();
	}
	console.log(red ? `\n${red} problem(s)` : '\nthe browser gate is green.');
	return red ? 1 : 0;
}

// exitCode rather than exit(): on a Windows TTY stdout is asynchronous, and exiting on the heels of the
// last console.log can cut the summary off
process.exitCode = await main();
