import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vitest/config';

/**
 * Loads SVG assets as markup, matching the build's `text` loader.
 */
function svgAsText(): Plugin {
	return {
		name: 'svg-as-text',
		enforce: 'pre',
		load( id ) {
			if ( ! id.endsWith( '.svg' ) ) {
				return null;
			}

			return `export default ${ JSON.stringify(
				readFileSync( id, 'utf8' )
			) };`;
		},
	};
}

export default defineConfig( {
	plugins: [ svgAsText() ],
	test: {
		coverage: {
			include: [ 'src/**/*.ts', 'scripts/**/*.mjs' ],
		},
		projects: [
			{
				plugins: [ svgAsText() ],
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
