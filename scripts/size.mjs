// Cross-platform `npm run size`: minify + gzip via Node APIs, no shell pipes (roulette-lite ADR 009).
// Prints one line per file in package.json `config.sizeBudget` (ADR 008: a budget per file) as
// `<file> <bytes>/<budget>` and exits 1 when any file is above its budget. Never measure with the gzip
// CLI: its header carries the file name, so the number drifts between machines.
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { minify } from 'terser';

try {
	const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
	const budgets = (pkg.config && pkg.config.sizeBudget) || {};
	let over = 0;
	for (const [file, budget] of Object.entries(budgets)) {
		const src = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
		const min = await minify(src, { compress: true, mangle: true });
		if (!min.code) throw new Error(`terser produced no output for ${file}`);
		const bytes = gzipSync(Buffer.from(min.code), { level: 9 }).length;
		console.log(`${file} ${bytes}/${budget}`);
		if (bytes > budget) {
			console.error(`over budget: ${file} ${bytes} B > ${budget} B`);
			over++;
		}
	}
	if (over) process.exit(1);
} catch (err) {
	console.error(err && err.message ? err.message : err);
	process.exit(1);
}
