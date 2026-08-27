import { defineConfig } from 'vitest/config';

export default defineConfig( {
	test: {
		coverage: {
			include: [ 'src/**/*.ts', 'scripts/**/*.mjs' ],
		},
		projects: [
			{
				test: {
					name: 'unit',
					environment: 'jsdom',
					include: [ 'tests/*.test.ts' ],
				},
			},
			{
				test: {
					name: 'e2e',
					environment: 'node',
					include: [ 'tests/e2e/*.test.ts' ],
					// Starting a browser with the extension takes a moment.
					hookTimeout: 60_000,
					testTimeout: 30_000,
				},
			},
		],
	},
} );
