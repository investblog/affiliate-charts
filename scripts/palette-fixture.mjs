// `node scripts/palette-fixture.mjs`: writes test/fixtures/palette.json — Charts.palette() for a fixed
// set of brands in both themes, as Node computes it. The Node test pins the library to it, and the
// browser gate checks that every engine computes the same bytes (output stability, ADR 003): float
// functions are not required to agree in the last digit across engines. Regenerate only on purpose.
import { writeFileSync } from 'node:fs';
import Charts from '../charts.js';

const BRANDS = ['#0066ff', '#2563eb', '#e11d48', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#facc15',
	'#9a3412', '#22d3ee', '#111111', '#ffffff', '#000080', '#ffff00', '#808080', '#ff00ff'];
const out = {};
for (const b of BRANDS) for (const t of ['light', 'dark']) out[`${b} ${t}`] = Charts.palette(b, t);
writeFileSync(new URL('../test/fixtures/palette.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`${Object.keys(out).length} palettes written`);
