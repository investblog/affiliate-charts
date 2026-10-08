// `npm run build`: writes `<file>.min.js` next to every file that has a size budget (ADR 008). The
// minified files are generated, listed in package.json `files`, and never committed.
import { readFile, writeFile } from 'node:fs/promises';
import { minify } from 'terser';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
for (const file of Object.keys(pkg.config.sizeBudget)) {
	const src = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
	const min = await minify(src, { compress: true, mangle: true });
	if (!min.code) throw new Error(`terser produced no output for ${file}`);
	await writeFile(new URL(`../${file.replace(/\.js$/u, '.min.js')}`, import.meta.url), min.code);
}
