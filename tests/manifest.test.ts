import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { buildManifest, TARGETS } from '../scripts/manifest.mjs';

const pkg = JSON.parse( await readFile( 'package.json', 'utf8' ) );

const manifests = Object.fromEntries(
	await Promise.all(
		TARGETS.map( async ( target ) => [
			target,
			await buildManifest( target ),
		] )
	)
);

/**
 * Collects every script the manifest asks the browser to load.
 *
 * @param manifest Generated manifest.
 */
function scripts( manifest: Record< string, any > ): string[] {
	return [
		manifest.background.service_worker,
		...( manifest.background.scripts ?? [] ),
		...manifest.content_scripts.flatMap(
			( entry: { js: string[] } ) => entry.js
		),
	].filter( Boolean );
}

describe( 'buildManifest', () => {
	it( 'rejects an unknown target', async () => {
		await expect( buildManifest( 'safari' ) ).rejects.toThrow(
			'Unknown build target'
		);
	} );

	it.each( TARGETS )( 'builds a complete %s manifest', ( target ) => {
		expect( manifests[ target ] ).toMatchObject( {
			name: expect.any( String ),
			description: expect.any( String ),
			default_locale: 'en',
			icons: expect.any( Object ),
		} );
	} );

	it.each( TARGETS )(
		'takes the %s version from package.json',
		( target ) => {
			expect( manifests[ target ].version ).toBe( pkg.version );
		}
	);

	it( 'keeps shared metadata identical across browsers', () => {
		const shared = TARGETS.map( ( target ) => {
			const { name, description, version, icons } = manifests[ target ];
			return { name, description, version, icons };
		} );

		expect(
			new Set( shared.map( ( m ) => JSON.stringify( m ) ) ).size
		).toBe( 1 );
	} );

	it.each( TARGETS )( 'grants %s access to both hosts', ( target ) => {
		const manifest = manifests[ target ];
		const granted = [
			...manifest.permissions,
			...( manifest.host_permissions ?? [] ),
		];

		expect( granted ).toEqual(
			expect.arrayContaining( [
				'https://github.com/*',
				'https://profiles.wordpress.org/*',
			] )
		);
	} );

	it.each( TARGETS )(
		'only references scripts the %s build emits',
		async ( target ) => {
			const entryPoints = ( await readdir( 'src' ) )
				.filter( ( file ) => file.endsWith( '.ts' ) )
				.map( ( file ) => file.replace( /\.ts$/, '.js' ) );

			expect( entryPoints ).toEqual(
				expect.arrayContaining( scripts( manifests[ target ] ) )
			);
		}
	);
} );
