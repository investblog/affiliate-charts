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
// **It writes to charts.js and charts-funnel.js.** The original bytes are taken once, before anything
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
const FILES = ['charts.js', 'charts-funnel.js'];
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
				rq.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream',
					'cache-control': 'no-store', 'content-security-policy': CSP });
				rq.end(d);
			});
		});
		// loopback only: `listen(port)` alone binds every interface
		s.listen(0, '127.0.0.1', () => res([s, s.address().port]));
	});
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
	{ label: 'labels never cut, rows never split', file: 'charts-funnel.js', edits: [['NARROW = 343, GLYPH = 8;', 'NARROW = 343, GLYPH = 2;']] },
	{ label: 'shape not centred', file: 'charts-funnel.js', edits: [['return _.bar(50 - w / 2, w,', 'return _.bar(0, w,']] },
	{ label: 'an inline style on the root', file: 'charts.js', edits: [["'font-size', 13,", "'style', 'font-size:13px',"]] },
	{ label: 'part rows not indented', file: 'charts-funnel.js', edits: [['INDENT = 12', 'INDENT = 0']] },
	{ label: 'no ghost in the steps form', file: 'charts-funnel.js', edits: [["if (form === 'steps' && prev && prev.value > 0", "if (form === 'step' && prev && prev.value > 0"]] },
	{ label: 'a smaller rate chip', file: 'charts-funnel.js', edits: [["'font-size', form === 'steps' ? 13 : 12,", "'font-size', form === 'steps' ? 13 : 11,"]] },
	{ label: 'a palette off by a contrast step', file: 'charts.js', edits: [['bg, 4.5, t ===', 'bg, 4.6, t ===']] },
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
