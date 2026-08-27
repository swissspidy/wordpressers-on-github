import wordpress from '@wordpress/scripts/config/eslint.config.cjs';

export default [
	{
		ignores: [ 'build/**', 'coverage/**' ],
	},

	...wordpress,

	{
		// The bundled resolver predates package export maps, so it cannot
		// find subpath exports such as `vitest/config`.
		files: [ 'vitest.config.ts' ],
		rules: {
			'import/no-unresolved': 'off',
		},
	},
];
