/*!
 * charts-lite / funnel — needs charts.js loaded first.
 * MIT © 301ST (https://301.st)
 */
// The funnel (ADR 007). M1: the contract — input rules and the accessible root; the bars are drawn at M3.
(function (root, factory) {
	var cjs = typeof module === 'object' && module.exports;
	var core = cjs ? require('./charts.js') : root.Charts;
	if (!core || !core._) throw new Error('charts-lite: load charts.js before charts-funnel.js');
	core.funnel = factory(core._);
	if (cjs) module.exports = core;
})(typeof self !== 'undefined' ? self : this, function (_) {
	'use strict';

	function fail(msg) {
		_.fail('funnel: ' + msg);
	}
	function bar(b, at) {
		return [_.num(b.value, at + ' value'), _.str(b.display, at + ' display')];
	}

	// every rule the spec lists under *Throws*; the library never repairs data. Returns the fields the
	// chart draws, in a fixed order — the key its ids are derived from (ADR 003).
	function check(steps, opts) {
		steps = steps || []; // no steps at all fails below as "no main step"
		if (opts.form != null && opts.form !== 'bars' && opts.form !== 'steps' && opts.form !== 'shape') fail('unknown form');
		var shape = opts.form === 'shape', losses = false, main = 0, legend = opts.legend, key = [];
		if (legend != null && !(legend.length === 2 && typeof legend[0] === 'string' && typeof legend[1] === 'string')) fail('`legend` must be two strings');
		for (var i = 0; i < steps.length; i++) {
			var s = steps[i] || {}, at = 'step ' + i, row = [_.str(s.label, at + ' label')].concat(bar(s, at));
			if (s.earned) {
				row.push(bar(s.earned, at + ' earned'));
				if (!legend) fail('`earned` needs `legend`');
				if (shape) fail('`shape` cannot draw `earned`');
			}
			if (s.rate !== undefined && s.rate !== null) _.str(s.rate, at + ' rate');
			if (s.group === 'losses') {
				losses = true;
				if (shape) fail('`shape` cannot draw losses');
			} else if (losses) fail(at + ' is a main step after the losses');
			else if (!s.part) main++;
			if (s.part) {
				if (i === 0 || losses) fail(at + ': a `part` needs a main step before it');
				if (s.gap) fail(at + ': `gap` on a `part`');
				if (shape) fail('`shape` cannot draw `part`');
			}
			if (shape && s.value < 0) fail('`shape` cannot draw a negative value');
			key.push(row.concat([!!s.part, s.group === 'losses', !!s.gap, s.rate]));
		}
		if (!main) fail('no main step');
		return key;
	}

	return function funnel(steps, options) {
		var opts = _.common(options);
		var key = check(steps, opts);
		key.push([opts.form || 'bars', opts.legend || null, opts.title, opts.desc, opts.brand, opts.theme, opts.width]);
		return _.svg(opts, 640, 0, '', JSON.stringify(key));
	};
});
