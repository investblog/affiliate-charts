// `npm run mutate`: a check is trusted only after it has been seen red (cards-lite M5). Each mutation
// breaks one rule in a source file, runs the gate that guards it, and must make that gate fail.
// Safety: before a file is mutated its original bytes are written to temp/mutate/ (gitignored); they
// are restored after every mutation, on exit and on Ctrl-C/hang-up — never through git. A run killed
// hard leaves the backup, and the next run restores it before doing anything else. An anchor that no
// longer matches exactly once is a failure too: the list has drifted from the source.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const TEST = [process.execPath, ['--test', 'test/*.test.mjs']];
const TYPES = [process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json']];
const BUNDLE = [process.execPath, ['scripts/bundle-gate.mjs']];
const T = TEST, C = 'charts.js', F = 'charts-funnel.js';

const MUTATIONS = [
	[C, T, 'esc leaves the apostrophe', ".replace(/'/g, '&#39;')", ''],
	[C, T, 'no title, no aria-hidden', "label ? null : 'true'", 'null'],
	[C, T, 'title without role', "label ? 'img' : null", 'null'],
	[C, T, 'desc not referenced', "label += ' ' + id + '-d';", ''],
	[C, T, 'Infinity accepted', '!isFinite(v)', 'v !== v'],
	[C, T, 'ids ignore the input', "id = p + '-' + hash(key)", "id = p + '-' + hash('')"],
	[C, T, 'no default class prefix', "opts.classPrefix || 'chart'", 'opts.classPrefix'],
	[C, T, 'class prefix unchecked', "if (p != null && (typeof p !== 'string' || !/^[A-Za-z_][\\w-]*$/.test(p))) fail('classPrefix must be a token like \"chart\"');", ''],
	[C, T, 'class prefix may hold a space', '/^[A-Za-z_][\\w-]*$/', '/^[A-Za-z_][\\w -]*$/'],
	[C, T, 'class prefix may be a non-string', "typeof p !== 'string' || ", ''],
	[C, T, 'brand unchecked', "if (o.brand != null && !/^#[0-9a-fA-F]{6}$/.test(o.brand)) fail('brand must be a #rrggbb hex');", ''],
	[C, T, 'theme unchecked', "if (o.theme != null && o.theme !== 'light' && o.theme !== 'dark') fail('theme must be \"light\" or \"dark\"');", ''],
	[F, T, 'unknown form accepted', "if (opts.form != null && opts.form !== 'bars' && opts.form !== 'steps' && opts.form !== 'shape') fail('unknown form');", ''],
	[C, T, 'options may be a string', "if (typeof o !== 'object') fail('options must be an object');", ''],
	[C, T, 'title may be a number', "if (o.title != null) str(o.title, 'title');", ''],
	[C, T, 'any caller string accepted', "if (typeof v !== 'string') fail(what + ' must be a string');", ''],
	[F, T, 'module without core does not throw', "if (!core || !core._) throw new Error('charts-lite: load charts.js before charts-funnel.js');", 'if (!core) return;'],
	[F, T, 'module exports the function', 'if (cjs) module.exports = core;', 'if (cjs) module.exports = core.funnel;'],
	[F, T, 'undefined steps reach the engine', 'steps = steps || [];', ''],
	[F, T, 'a null step reaches the engine', 'var s = steps[i] || {}', 'var s = steps[i]'],
	[F, T, 'legend shape unchecked', "if (legend != null && !(legend.length === 2 && typeof legend[0] === 'string' && typeof legend[1] === 'string')) fail('`legend` must be two strings');", ''],
	[F, T, 'earned without legend', "if (!legend) fail('`earned` needs `legend`');", ''],
	[F, T, 'earned unchecked', "row.push(bar(s.earned, at + ' earned'));", ''],
	[F, T, 'rate type unchecked', "if (s.rate !== undefined && s.rate !== null) _.str(s.rate, at + ' rate');", ''],
	[F, T, 'main step after losses', "} else if (losses) fail(at + ' is a main step after the losses');", '} else if (losses) main += 0;'],
	[F, T, 'losses-only funnel accepted', "if (!main) fail('no main step');", ''],
	[F, T, 'part first', 'if (i === 0 || losses)', 'if (losses)'],
	[F, T, 'part inside losses', 'if (i === 0 || losses)', 'if (i === 0)'],
	[F, T, 'gap on a part', "if (s.gap) fail(at + ': `gap` on a `part`');", ''],
	[F, T, 'shape with earned', "if (shape) fail('`shape` cannot draw `earned`');", ''],
	[F, T, 'shape with losses', "if (shape) fail('`shape` cannot draw losses');", ''],
	[F, T, 'shape with a part', "if (shape) fail('`shape` cannot draw `part`');", ''],
	[F, T, 'shape with a negative', "if (shape && s.value < 0) fail('`shape` cannot draw a negative value');", ''],
	[F, T, 'ids ignore the steps', '\t\treturn key;', '\t\treturn [];'],
	[F, T, 'ids ignore the form', "key.push([opts.form || 'bars', ", 'key.push([',],
	[F, BUNDLE, 'bundled: module exports the function', 'if (cjs) module.exports = core;', 'if (cjs) module.exports = core.funnel;'],
	[F, BUNDLE, 'bundled: the core taken from a global', "var core = cjs ? require('./charts.js') : root.Charts;", 'var core = root.Charts;'],
	['charts-funnel.d.ts', TYPES, 'form is open', "form?: 'bars' | 'steps' | 'shape';", 'form?: string;'],
	['charts-funnel.d.ts', TYPES, 'legend not a pair', 'legend?: [string, string];', 'legend?: string[];'],
	['charts-funnel.d.ts', TYPES, 'group is open', "group?: 'losses';", 'group?: string;'],
	['charts-funnel.d.ts', TYPES, 'global not merged', 'interface ChartsGlobal extends FunnelApi {}', ''],
	['charts.d.ts', TYPES, 'core types lose palette', "palette(brand?: string, theme?: 'light' | 'dark'): Palette;", ''],
	['charts.d.ts', TYPES, 'palette theme is open', "palette(brand?: string, theme?: 'light' | 'dark'): Palette;", 'palette(brand?: string, theme?: string): Palette;'],
	['charts.d.ts', TYPES, 'core types the funnel', 'init(target: Element, svg: string): void;', 'init(target: Element, svg: string): void; funnel(...a: unknown[]): string;'],
].map(([file, gate, label, from, to]) => ({ file, gate, label, from, to }));

const BACKUP = 'temp/mutate';
const originals = new Map();
let dirty = null;

function restore() {
	if (!dirty) return;
	writeFileSync(dirty, originals.get(dirty));
	rmSync(`${BACKUP}/${dirty}`, { force: true });
	dirty = null;
}
process.on('exit', restore);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { restore(); process.exit(130); });

// a previous run that was killed hard left its backup: put the original back first
if (existsSync(BACKUP)) {
	for (const f of readdirSync(BACKUP)) {
		writeFileSync(f, readFileSync(`${BACKUP}/${f}`));
		console.log(`restored ${f} from a run that did not finish`);
	}
	rmSync(BACKUP, { recursive: true, force: true });
}
mkdirSync(BACKUP, { recursive: true });

// exit status 0 = green, 1 = red; anything else (killed, crashed: status null) is not evidence
function run([cmd, args]) {
	const r = spawnSync(cmd, args, { encoding: 'utf8' });
	return r.status === 0 ? 'green' : r.status === 1 ? 'red' : `broken (${r.status ?? r.signal})`;
}

for (const gate of [TEST, TYPES, BUNDLE]) {
	if (run(gate) !== 'green') {
		console.error(`the gate is not green before any mutation: ${gate[1].join(' ')}`);
		process.exit(1);
	}
}

let bad = 0;
for (const m of MUTATIONS) {
	if (!originals.has(m.file)) originals.set(m.file, readFileSync(m.file));
	const src = originals.get(m.file).toString('utf8');
	if (src.split(m.from).length !== 2) {
		console.log(`DRIFT    ${m.file}: ${m.label} — the anchor does not match exactly once`);
		bad++;
		continue;
	}
	writeFileSync(`${BACKUP}/${m.file}`, originals.get(m.file));
	dirty = m.file;
	writeFileSync(m.file, src.replace(m.from, m.to));
	const verdict = run(m.gate);
	restore();
	console.log(`${verdict === 'red' ? 'caught  ' : verdict === 'green' ? 'SURVIVED' : 'BROKEN  '} ${m.file}: ${m.label}${verdict.startsWith('broken') ? ` — gate ${verdict}` : ''}`);
	if (verdict !== 'red') bad++;
}
rmSync(BACKUP, { recursive: true, force: true });
console.log(bad ? `${bad} of ${MUTATIONS.length} mutations not caught` : `all ${MUTATIONS.length} mutations caught`);
process.exitCode = bad ? 1 : 0;
