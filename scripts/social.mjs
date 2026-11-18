// `npm run social`: writes docs/social.png — the 1280 × 640 social preview (the demo's og:image and the
// repository's social preview on GitHub), drawn by the library itself. Laid out at 840 × 420 and shot at
// ×1.52, so its text survives a feed thumbnail; each chart gets at least the 343px the layout promises
// (ADR 009). Uses whatever playwright the machine has, as the browser gate does; none is not a failure.
import path from 'node:path';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Charts from '../charts-waterfall.js';
import '../charts-heatmap.js';

const o = (prefix, extra) => ({ theme: 'dark', brand: '#0066ff', classPrefix: prefix, ...extra });
const flow = Charts.waterfall([
	{ label: 'Revenue — GGR', value: 52000, display: '52 000', kind: 'total' },
	{ label: 'Bonuses', value: -7800, display: '−7 800', kind: 'delta' },
	{ label: 'NGR', value: 44200, display: '44 200', kind: 'total' },
	{ label: 'Platform and network', value: -32300, display: '−32 300', kind: 'delta' },
	{ label: 'Partner commission', value: 11900, display: '11 900', kind: 'total' },
], o('s1'));
const rows = ['Alpha Casino', 'Bravo Bet', 'Charlie Spin', 'Delta Play', 'Echo Spins'];
const values = rows.map((_, r) => Array.from({ length: 8 }, (_, c) => (r * 17 + c * 23 + r * c * 7) % 61));
const matrix = Charts.heatmap({ rows, cols: ['Licence', 'Payments', 'Bonus', 'Wagering', 'Withdrawal', 'Verification', 'Support', 'Games'],
	short: ['LIC', 'PAY', 'BON', 'WAG', 'WDR', 'KYC', 'SUP', 'GAM'], values, display: values.map((r) => r.map((v) => v + ' days')) },
	o('s2', { gutter: 30, domain: [0, 60], format: (v) => v + ' d' }));

const card = (title, svg) => `<div class="card"><h2>${title}</h2>${svg}</div>`;
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
<style>
	* { box-sizing: border-box; }
	body { margin: 0; width: 840px; height: 420px; overflow: hidden; background: #111318; color: #e6e6e6; font-family: Montserrat, system-ui, sans-serif; }
	header { padding: 28px 28px 0; display: flex; align-items: baseline; gap: 16px; }
	h1 { margin: 0; font-size: 30px; font-weight: 700; letter-spacing: -0.4px; }
	header p { margin: 0; font-size: 14px; color: #9aa0aa; }
	.tag { padding: 8px 28px 0; font-size: 12.5px; color: #c8ccd4; }
	.tag b { color: #4d8dff; font-weight: 600; }
	.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 22px 28px 0; }
	.card { background: #1f262c; border-radius: 10px; padding: 16px; height: 276px; overflow: hidden; }
	.card h2 { margin: 0 0 12px; font-size: 13px; font-weight: 600; opacity: .7; }
	.card svg { display: block; }
</style></head><body>
<header><h1>affiliate-charts</h1><p>charts for partner cabinets, as SVG strings</p></header>
<div class="tag"><b>Strict CSP</b> · zero dependencies · Node and the browser · funnels, waterfalls, series, heatmaps, flows</div>
<div class="grid">${card('GGR to commission', flow)}${card('Status matrix: days to re-check', matrix)}</div>
</body></html>`;

function playwright() {
	const require = createRequire(import.meta.url);
	for (const id of ['playwright', 'playwright-core']) {
		try { return require(id); } catch { /* keep looking */ }
	}
	try {
		const root = execSync('npm root -g', { encoding: 'utf8' }).trim();
		return createRequire(path.join(root, '@playwright', 'mcp', 'package.json'))('playwright-core');
	} catch { return null; }
}

const pw = playwright();
if (!pw) {
	console.log('no playwright on this machine — docs/social.png left as it is.');
} else {
	const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'social.png');
	const browser = await pw.chromium.launch();
	try {
		const page = await browser.newPage({ viewport: { width: 840, height: 420 }, deviceScaleFactor: 1280 / 840 });
		await page.setContent(html, { waitUntil: 'networkidle' });
		await page.screenshot({ path: out });
	} finally {
		await browser.close();
	}
	console.log('docs/social.png 1280×640');
}
