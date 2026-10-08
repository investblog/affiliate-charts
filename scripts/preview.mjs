// `npm run preview`: writes docs/preview.svg — the README's picture, drawn by the library itself. Two
// cards side by side (a money funnel on a light card, a counts funnel in the steps form on a dark one),
// each chart nested at a fixed width, since an <img> has no container for `width="100%"` to follow.
import { writeFileSync } from 'node:fs';
import Charts from '../charts-funnel.js';

const S = (label, value, display, extra) => ({ label, value, display, ...extra });
const E = (value, display) => ({ value, display });
const W = 440, PAD = 24, GAP = 24, TOP = 44;

const cards = [
	{ title: 'Money: base and earned', bg: '#f3f5f6', ink: '#11171c', svg: Charts.funnel([
		S('Deposits — sum topped up', 124000, '124 000', { earned: E(18600, '18 600') }),
		S('2nd deposits', 41000, '41 000', { part: true, earned: E(6150, '6 150') }),
		S('First deposits', 41000, '41 000', { earned: E(20500, '20 500') }),
		S('Revenue — GGR', 52000, '52 000', { gap: true, earned: E(13000, '13 000') }),
		S('Cancellations', -9600, '−9 600', { group: 'losses', earned: E(-1440, '−1 440') }),
	], { legend: ['base of the event', 'earned by the partner'], theme: 'light', brand: '#0066ff', classPrefix: 'pl' }) },
	{ title: 'Counts: the steps form', bg: '#1f262c', ink: '#e6e6e6', svg: Charts.funnel([
		S('Clicks', 18400, '18 400'),
		S('Unique clicks', 12100, '12 100', { part: true }),
		S('Registrations', 3120, '3 120', { rate: '17.0%' }),
		S('First deposits', 410, '410', { rate: '13.1%' }),
	], { form: 'steps', theme: 'dark', brand: '#0066ff', classPrefix: 'pd' }) },
];

const height = (svg) => Number(svg.match(/height="([\d.]+)"/u)[1]);
const H = Math.max(...cards.map((c) => height(c.svg))) + TOP + PAD;
const total = cards.length * (W + 2 * PAD) + (cards.length - 1) * GAP;
const body = cards.map((c, i) => {
	const x = i * (W + 2 * PAD + GAP);
	const chart = c.svg.replace('width="100%"', `x="${PAD}" y="${TOP}" width="${W}"`);
	return `<g transform="translate(${x} 0)" color="${c.ink}"><rect width="${W + 2 * PAD}" height="${height(c.svg) + TOP + PAD}" rx="12" fill="${c.bg}"/>` +
		`<text x="${PAD}" y="28" font-size="13" font-weight="600" fill="currentColor" fill-opacity="0.7">${c.title}</text>${chart}</g>`;
}).join('');
const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="${H}" viewBox="0 0 ${total} ${H}" ` +
	`font-family="Montserrat, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif">${body}</svg>\n`;
writeFileSync(new URL('../docs/preview.svg', import.meta.url), out);
console.log(`docs/preview.svg ${total}×${H}, ${out.length} bytes`);
