// `npm run gate:bundle`: the module pattern survives a bundler (ADR 008). A consumer imports the package
// from node_modules with a default import, as the first consumer does through Vite; the CommonJS
// plugin must keep the module's side effect (registering `funnel` on the core) and resolve its
// `require('./charts.js')`. The package is copied into a scratch node_modules, built with Vite, and the
// bundle is run in a bare context that has no module system.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { build } from 'vite';

const root = new URL('..', import.meta.url);
const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
const dir = mkdtempSync(join(tmpdir(), 'affiliate-charts-bundle-'));
let code = 1;
try {
	const lib = join(dir, 'node_modules', pkg.name);
	mkdirSync(lib, { recursive: true });
	cpSync(new URL('package.json', root), join(lib, 'package.json'));
	for (const f of pkg.files) if (!f.endsWith('.min.js')) cpSync(new URL(f, root), join(lib, f));
	// three modules, each a default import: all register on the one core they share
	writeFileSync(join(dir, 'main.js'), [
		`import Charts from '${pkg.name}/charts-funnel.js';`,
		`import Flow from '${pkg.name}/charts-waterfall.js';`,
		`import Days from '${pkg.name}/charts-series.js';`,
		`globalThis.out = Charts.funnel([{ label: 'a', value: 1, display: '1' }], { title: 't' });`,
		`globalThis.flow = Flow.waterfall([{ label: 'a', value: 1, display: '1', kind: 'total' }], { title: 't' });`,
		`globalThis.days = Days.series([{ x: 'a', values: [1], display: ['1'] }], { names: ['c'], title: 't' });`,
		'globalThis.same = Charts === Flow && Flow === Days;',
	].join('\n'));
	const res = await build({
		root: dir, logLevel: 'error', configFile: false,
		build: { write: false, minify: false, lib: { entry: join(dir, 'main.js'), formats: ['iife'], name: 'x' } },
	});
	const js = (Array.isArray(res) ? res[0] : res).output[0].code;
	const ctx = vm.createContext({});
	vm.runInContext(js, ctx);
	if (!/^<svg [^>]*role="img"/u.test(ctx.out || '')) throw new Error(`unexpected output: ${ctx.out}`);
	if (!/^<svg [^>]*role="img"/u.test(ctx.flow || '')) throw new Error(`unexpected waterfall output: ${ctx.flow}`);
	if (!/^<svg [^>]*role="img"/u.test(ctx.days || '')) throw new Error(`unexpected series output: ${ctx.days}`);
	if (ctx.same !== true) throw new Error('the modules exported different objects');
	console.log('bundle gate: ok — the default imports through Vite draw, on one core');
	code = 0;
} catch (err) {
	console.error('bundle gate: FAIL —', err && err.message ? err.message : err);
} finally {
	rmSync(dir, { recursive: true, force: true });
}
process.exitCode = code;
