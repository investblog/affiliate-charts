// `npm run preview`: writes docs/preview.svg — the README's picture, drawn by the library itself. Six cards
// in a 3 × 2 grid, light and dark in turn, each chart nested at a fixed width, since an <img> has no
// container for `width="100%"` to follow.
import { writeFileSync } from 'node:fs';
import Charts from '../charts-funnel.js';
import '../charts-waterfall.js';
import '../charts-series.js';
import '../charts-sankey.js';
import '../charts-heatmap.js';
import '../charts-share.js';

const S = (label, value, display, extra) => ({ label, value, display, ...extra });
const E = (value, display) => ({ value, display });
const W = 360, PAD = 24, GAP = 24, TOP = 44, COLS = 3;
const LIGHT = { bg: '#f3f5f6', ink: '#11171c', theme: 'light' }, DARK = { bg: '#1f262c', ink: '#e6e6e6', theme: 'dark' };
const o = (look, prefix, extra) => ({ theme: look.theme, brand: '#0066ff', classPrefix: prefix, ...extra });

const days = [4120, 3880, 5210, 4790, 6020, 7350, 5480, 4470, -1240, 5010, 6380, 7120, 8240, 6940];
const ggr = days.map((v, i) => ({ x: `${i + 1} Oct`, values: [v, Math.round(v / 4)], display: [String(v), String(Math.round(v / 4))] }));
const cohort = [[100, 58, 34, 20, 11], [100, 60, 36, 22], [100, 62, 38], [100, 64], [100]];
const N = (id, column, short, label, display) => ({ id, column, short, label, display });
const L = (from, to, value) => ({ from, to, value, display: String(value) });

const cards = [
	{ title: 'Money funnel: base and earned', look: LIGHT, svg: (l) => Charts.funnel([
		S('Deposits — sum topped up', 124000, '124 000', { earned: E(18600, '18 600') }),
		S('2nd deposits', 41000, '41 000', { part: true, earned: E(6150, '6 150') }),
		S('First deposits', 41000, '41 000', { earned: E(20500, '20 500') }),
		S('Revenue — GGR', 52000, '52 000', { gap: true, earned: E(13000, '13 000') }),
		S('Cancellations', -9600, '−9 600', { group: 'losses', earned: E(-1440, '−1 440') }),
	], o(l, 'p1', { legend: ['base of the event', 'earned by the partner'] })) },
	{ title: 'Waterfall: GGR to commission', look: DARK, svg: (l) => Charts.waterfall([
		{ label: 'Revenue — GGR', value: 52000, display: '52 000', kind: 'total' },
		{ label: 'Bonuses', value: -7800, display: '−7 800', kind: 'delta' },
		{ label: 'Payment fees', value: -1300, display: '−1 300', kind: 'delta' },
		{ label: 'NGR', value: 42900, display: '42 900', kind: 'total' },
		{ label: 'Stays with the platform and the network', value: -31000, display: '−31 000', kind: 'delta' },
		{ label: 'Partner commission', value: 11900, display: '11 900', kind: 'total' },
	], o(l, 'p2')) },
	{ title: 'Daily series: GGR and commission', look: LIGHT, svg: (l) => Charts.series(ggr, o(l, 'p3', { names: ['Revenue — GGR', 'Commission'], form: 'columns' })) },
	{ title: 'Flows: sources to first deposits', look: DARK, svg: (l) => Charts.sankey([
		N('tg', 0, 'TG', 'sub-id: tg-channel', '9 200'), N('seo', 0, 'SEO', 'sub-id: seo-reviews', '5 100'),
		N('reg', 1, 'REG', 'Registered', '2 300'), N('no', 1, 'NO', 'Not registered', '12 000'),
		N('ftd', 2, 'FTD', 'First deposit', '380'), N('nd', 2, 'ND', 'No deposit yet', '1 920'),
	], [L('tg', 'reg', 1500), L('tg', 'no', 7700), L('seo', 'reg', 800), L('seo', 'no', 4300), L('reg', 'ftd', 380), L('reg', 'nd', 1920)], o(l, 'p4')) },
	{ title: 'Cohorts: still depositing', look: LIGHT, svg: (l) => Charts.heatmap({ rows: ['May', 'Jun', 'Jul', 'Aug', 'Sep'], cols: ['M0', 'M1', 'M2', 'M3', 'M4'],
		values: cohort, display: cohort.map((r) => r.map((v) => v + '%')) }, o(l, 'p5', { form: 'cohort', format: (v) => v + '%' })) },
	{ title: 'Part to whole: clicks by device', look: DARK, svg: (l) => Charts.share([
		{ label: 'Mobile — Android', value: 9820, display: '9 820' }, { label: 'Mobile — iOS', value: 5410, display: '5 410' },
		{ label: 'Desktop', value: 2630, display: '2 630' }, { label: 'Tablet', value: 410, display: '410' },
	], o(l, 'p6', { form: 'donut' })) },
].map((c) => ({ ...c, svg: c.svg(c.look) }));

const height = (svg) => Number(svg.match(/height="([\d.]+)"/u)[1]);
const rows = [];
for (let i = 0; i < cards.length; i += COLS) rows.push(cards.slice(i, i + COLS));
const rowH = rows.map((r) => Math.max(...r.map((c) => height(c.svg))) + TOP + PAD);
const total = COLS * (W + 2 * PAD) + (COLS - 1) * GAP;
const H = rowH.reduce((a, b) => a + b, 0) + (rows.length - 1) * GAP;
let y = 0;
const body = rows.map((r, ri) => {
	const g = r.map((c, i) => {
		const x = i * (W + 2 * PAD + GAP);
		const chart = c.svg.replace('width="100%"', `x="${PAD}" y="${TOP}" width="${W}"`);
		return `<g transform="translate(${x} ${y})" color="${c.look.ink}"><rect width="${W + 2 * PAD}" height="${rowH[ri]}" rx="12" fill="${c.look.bg}"/>` +
			`<text x="${PAD}" y="28" font-size="13" font-weight="600" fill="currentColor" fill-opacity="0.7">${c.title}</text>${chart}</g>`;
	}).join('');
	y += rowH[ri] + GAP;
	return g;
}).join('');
const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${H}" viewBox="0 0 ${total} ${H}" ` +
	`font-family="Montserrat, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">${body}</svg>\n`;
writeFileSync(new URL('../docs/preview.svg', import.meta.url), out);
console.log(`docs/preview.svg ${total}×${H}, ${out.length} bytes`);
