// Flat config (ESLint 9+). The library is ES5 and ships as files that work as a <script> and as
// CommonJS modules (ADR 008); tests and scripts are modern ES modules run by Node.
// CommonJS on purpose: there is no "type": "module" here.
module.exports = [
	{
		ignores: ['*.min.js', '*.d.ts', 'test/*.ts', 'node_modules/', '.agents/', 'temp/'],
	},
	{
		files: ['**/*.js'],
		languageOptions: {
			ecmaVersion: 5,
			sourceType: 'script',
			globals: {
				self: 'readonly',
				module: 'writable',
				require: 'readonly',
			},
		},
		rules: {
			'no-undef': 'error',
			'no-unused-vars': 'error',
			'no-redeclare': 'error',
		},
	},
	{
		// the browser verify page: runs in the engines the gate opens, never shipped
		files: ['test/verify.js'],
		languageOptions: {
			ecmaVersion: 2015,
			globals: {
				window: 'readonly',
				document: 'readonly',
				DOMParser: 'readonly',
				getComputedStyle: 'readonly',
				innerWidth: 'readonly',
				setTimeout: 'readonly',
				fetch: 'readonly',
			},
		},
	},
	{
		files: ['**/*.mjs'],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: 'module',
			globals: {
				process: 'readonly',
				Buffer: 'readonly',
				console: 'readonly',
				URL: 'readonly',
				structuredClone: 'readonly',
			},
		},
		rules: {
			'no-undef': 'error',
			'no-unused-vars': 'error',
		},
	},
];
