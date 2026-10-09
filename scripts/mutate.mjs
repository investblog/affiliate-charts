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
const T = TEST, C = 'charts.js', F = 'charts-funnel.js', W = 'charts-waterfall.js';

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
	[F, T, 'module without core does not throw', "if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-funnel.js');", 'if (!core) return;'],
	[F, T, 'module exports the function', 'if (cjs) module.exports = core;', 'if (cjs) module.exports = core.funnel;'],
	[F, T, 'steps may be any object', "if (!Array.isArray(steps)) fail('`steps` must be an array');", ''],
	[F, T, 'a null step reaches the engine', 'var s = steps[i] || {}', 'var s = steps[i]'],
	[F, T, 'legend shape unchecked', "if (legend != null && !(Array.isArray(legend) && legend.length === 2 && typeof legend[0] === 'string' && typeof legend[1] === 'string')) fail('`legend` must be two strings');", ''],
	[F, T, 'legend may be a string', 'Array.isArray(legend) && legend.length === 2', 'legend.length === 2'],
	[F, T, 'range overflow drawn as nothing', "if (!isFinite(hi - lo)) fail('values too far apart to share a scale');", ''],
	[F, T, 'an unused legend in the ids', 'earned ? opts.legend : null,', 'opts.legend || null,'],
	[C, T, 'truncation splits a surrogate pair', 'if (c >= 0xD800 && c <= 0xDBFF) cut--;', ''],
	[F, T, 'base bar solid beside an earned chart', 'loss ? 0.35 : earned ? pal.opacity : 1, cls', 'loss ? 0.35 : s.earned ? pal.opacity : 1, cls'],
	[F, T, 'ghost crosses a gap', 'if (s.gap) prev = null;', ''],
	[F, T, 'ghost of a value that is not positive', 'prev && prev.value > 0 && !s.part', 'prev && !s.part'],
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
	// drawing (M3): layout numbers (ADR 010), scale and signs (ADR 007), percent layout (ADR 009)
	[C, T, 'label line height', 'var LINE = 18,', 'var LINE = 17,'],
	[F, T, 'bar height', 'BAR = 12,', 'BAR = 14,'],
	[F, T, 'part height', 'PART = 8,', 'PART = 12,'],
	[F, T, 'shape height', 'SHAPE = 20,', 'SHAPE = 12,'],
	[F, T, 'row padding', 'PAD = 10,', 'PAD = 8,'],
	[F, T, 'block gap', 'BLOCK = 16,', 'BLOCK = 12,'],
	[F, T, 'steps rate line not taller', 'RATE + 4 : RATE', 'RATE : RATE'],
	[F, T, 'part not indented', 'INDENT = 12', 'INDENT = 0'],
	[F, T, 'scale to the top only', 'var range = hi - lo || 1', 'var range = hi || 1'],
	[F, T, 'earned flush under the base', '\t\t\t\ty += 2;\n\t\t\t\trow += mark(s.earned.value', '\t\t\t\trow += mark(s.earned.value'],
	[F, T, 'negatives grow right', 'return _.bar(v < 0 ? z - w : z,', 'return _.bar(z,'],
	[F, T, 'negative bar square on the left', 'fill, op, c, v < 0);', 'fill, op, c, false);'],
	[F, T, 'zero line without negatives', 'if (lo < 0) {', 'if (lo <= 0) {'],
	[F, T, 'losses in brand colour', "var fill = loss ? 'currentColor' : pal.solid;", 'var fill = pal.solid;'],
	[F, T, 'loss opacity', 'loss ? 0.35 :', 'loss ? 0.5 :'],
	[F, T, 'loss earned opacity', 'loss ? 0.7 : 1,', 'loss ? 1 : 1,'],
	[F, T, 'no separator before losses', 'if (i && (s.gap || firstLoss))', 'if (i && s.gap)'],
	[F, T, 'a separator between losses', "firstLoss = loss && !(i && steps[i - 1].group === 'losses')", 'firstLoss = loss'],
	[F, T, 'a zero value draws a bar', "if (!w) return '';", ''],
	[F, T, 'null rate as blank', 's.rate === null ? DASH : s.rate', "s.rate === null ? '' : s.rate"],
	[F, T, 'null rate hidden', 'if (s.rate !== undefined) {', 'if (s.rate != null) {'],
	[F, T, 'earned value not bold', "_.el('tspan', ['font-weight', 600]", "_.el('tspan', ['font-weight', 400]"],
	[C, T, 'rows never split', 'var dy = chars * GLYPH > NARROW ? LINE : 0;', 'var dy = 0;'],
	[C, T, 'values on the label line when split', "'y', y + dy + 13, 'text-anchor', 'end'", "'y', y + 13, 'text-anchor', 'end'"],
	[C, T, 'glyph estimate narrower', 'NARROW = 343, GLYPH = 8;', 'NARROW = 343, GLYPH = 7;'],
	[C, T, 'labels never cut', 'label.length > max ?', 'false ?'],
	[C, T, 'part loses no characters', 'var max = Math.floor(NARROW / GLYPH) - (indent ? 2 : 0),', 'var max = Math.floor(NARROW / GLYPH),'],
	[F, T, 'funnel chars ignore earned', "(s.earned ? s.earned.display.length + 3 : 0) + 2", '2'],
	[F, T, 'part label not indented', 's.part ? INDENT : 0, y);', '0, y);'],
	[F, T, 'row without a title', "_.el('title', [], _.esc(tip))", "''"],
	[F, T, 'rate missing from the title', "tip += ' (' + rate + ')';", ''],
	[F, T, 'legend without earned', '\t\tif (earned) {', '\t\tif (opts.legend) {'],
	[F, T, 'legend base swatch solid', '[[opts.legend[0], pal.solid, pal.opacity]', '[[opts.legend[0], pal.solid, 1]'],
	[F, T, 'ghost on a part', 'prev.value > 0 && !s.part && !loss) {', 'prev.value > 0 && !loss) {'],
	[F, T, 'ghost follows parts', 'if (!s.part && !loss) prev = s;', 'if (!loss) prev = s;'],
	[F, T, 'shape not centred', 'return _.bar(50 - w / 2, w,', 'return _.bar(0, w,'],
	[C, T, 'root with a viewBox', "'width', '100%',\n\t\t\t'height'", "'viewBox', '0 0 100 100',\n\t\t\t'height'"],
	[C, T, 'root text size', "'font-size', 13,", "'font-size', 12,"],
	[C, T, 'bar overlap darker', "'fill', fill, 'opacity', opacity],", "'fill', fill, 'fill-opacity', opacity],"],
	[C, T, 'bar square side ignored', 'el(\'rect\', toLeft ?', 'el(\'rect\', false ?'],
	[C, T, 'legend lines tighter', 'top = y + i * 18;', 'top = y + i * 16;'],
	[C, T, 'light mark opacity', 'LIGHT = 0.6;', 'LIGHT = 0.55;'],
	[C, T, 'solid contrast target', 'bg, 4.5, t ===', 'bg, 3, t ==='],
	[C, T, 'contrast repaired the wrong way', "t === 'dark' ? 1 : -1);", "t === 'dark' ? -1 : 1);"],
	[C, T, 'no band clamp', 'var solid = fromOklch(Math.min(BAND[t][1], Math.max(BAND[t][0], o[0])), o[1], o[2] + (turn || 0));', 'var solid = fromOklch(o[0], o[1], o[2] + (turn || 0));'],
	[C, T, 'channel clipping instead of chroma', 'if (!inGamut(v)) {', 'if (false) {'],
	[C, T, 'default brand', "rgb(brand || '#2563eb')", "rgb(brand || '#0066ff')"],
	[C, T, 'the hue turn ignored', 'o[2] + (turn || 0)', 'o[2]'],
	// the waterfall (M6, ADR 014)
	[W, T, 'waterfall without core does not throw', "if (!core || !core._) throw new Error('affiliate-charts: load charts.js before charts-waterfall.js');", 'if (!core) return;'],
	[W, T, 'waterfall exports the function', 'if (cjs) module.exports = core;', 'if (cjs) module.exports = core.waterfall;'],
	[W, T, 'waterfall steps may be any object', "if (!Array.isArray(steps)) fail('`steps` must be an array');", ''],
	[W, T, 'an empty waterfall accepted', "if (!steps.length) fail('no steps');", ''],
	[W, T, 'a first delta accepted', "else if (!i) fail('the first step must be a total');", ''],
	[W, T, 'kind unchecked', "else if (s.kind !== 'delta') fail(at + ': `kind` must be \"total\" or \"delta\"');", ''],
	[W, T, 'a null waterfall step reaches the engine', 'var s = steps[i] || {}', 'var s = steps[i]'],
	[W, T, 'waterfall overflow drawn as nothing', "if (!isFinite(hi - lo)) fail('values too far apart to share a scale');", ''],
	[W, T, 'a delta\'s length on the scale', 'lo = Math.min(lo, run);', 'lo = Math.min(lo, run, s.value);'],
	[W, T, 'waterfall scale to the top only', 'var range = hi - lo || 1', 'var range = hi || 1'],
	[W, T, 'no ghost', 'if (!total && run) row += span(', 'if (false) row += span('],
	[W, T, 'a ghost of a zero running total', 'if (!total && run) row', 'if (!total) row'],
	[W, T, 'ghost opacity', "span(0, run, 'currentColor', 0.12,", "span(0, run, 'currentColor', 0.2,"],
	[W, T, 'increase solid', 'pal.solid, pal.opacity, p', 'pal.solid, 1, p'],
	[W, T, 'decrease in the brand hue', 'Math.PI).solid', '0).solid'],
	[W, T, 'deltas from zero', 'from = total ? 0 : run', 'from = 0'],
	[W, T, 'the running total forgets deltas', 'run = total ? v : run + v;', 'run = v;'],
	[W, T, 'waterfall bar square on the wrong side', 'BAR, fill, op, cls, b < a);', 'BAR, fill, op, cls, false);'],
	[W, T, 'waterfall zero line without negatives', 'if (lo < 0) {', 'if (lo <= 0) {'],
	[W, T, 'a zero waterfall value draws a bar', 'if (v) {', 'if (true) {'],
	[W, T, 'waterfall row without a title', "_.el('title', [], _.esc(s.label + ': ' + s.display))", "''"],
	[W, T, 'waterfall title unescaped', "_.el('title', [], _.esc(s.label + ': ' + s.display))", "_.el('title', [], s.label + ': ' + s.display)"],
	[W, T, 'waterfall chars ignore the value', 's.label.length + s.display.length + 2', 's.label.length + 2'],
	[W, T, 'waterfall bar height', 'var BAR = 12, PAD = 10;', 'var BAR = 14, PAD = 10;'],
	[W, T, 'waterfall row padding', 'var BAR = 12, PAD = 10;', 'var BAR = 12, PAD = 8;'],
	[W, T, 'waterfall ids ignore the kind', ", _.str(s.display, at + ' display'), s.kind]);", ", _.str(s.display, at + ' display')]);"],
	[W, T, 'waterfall ids ignore the options', 'key.push([opts.title, opts.desc, opts.brand, opts.theme]);', ''],
	[W, BUNDLE, 'bundled: waterfall exports the function', 'if (cjs) module.exports = core;', 'if (cjs) module.exports = core.waterfall;'],
	['charts-waterfall.d.ts', TYPES, 'kind is open', "kind: 'total' | 'delta';", 'kind: string;'],
	['charts-waterfall.d.ts', TYPES, 'kind optional', "kind: 'total' | 'delta';", "kind?: 'total' | 'delta';"],
	['charts-waterfall.d.ts', TYPES, 'waterfall global not merged', 'interface ChartsGlobal extends WaterfallApi {}', ''],
	['charts-waterfall.d.ts', TYPES, 'waterfall options take a form', 'type Options = Core.Common;', "type Options = Core.Common & { form?: 'bars' };"],
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
