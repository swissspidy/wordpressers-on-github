import * as esbuild from 'esbuild';
import { watch as watchPath } from 'node:fs';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest, TARGETS } from './manifest.mjs';

const rootDir = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const buildDir = join( rootDir, 'build' );
const assetsDir = join( rootDir, 'assets' );
const manifestsDir = join( rootDir, 'manifests' );

const watch = process.argv.includes( '--watch' );

/**
 * Copies the static assets and writes the generated manifest.
 *
 * Runs as part of every build so that watch mode picks up changes to assets
 * and manifests, not just to the sources.
 *
 * @param {string} target Browser to build for.
 * @param {string} outdir Directory to assemble the extension in.
 * @return {import('esbuild').Plugin} esbuild plugin.
 */
function assetsPlugin( target, outdir ) {
	return {
		name: 'extension-assets',
		setup( build ) {
			build.onEnd( async ( { errors } ) => {
				if ( errors.length > 0 ) {
					return;
				}

				await mkdir( outdir, { recursive: true } );
				await cp( assetsDir, outdir, { recursive: true } );
				await writeFile(
					join( outdir, 'manifest.json' ),
					JSON.stringify(
						await buildManifest( target ),
						null,
						'\t'
					) + '\n'
				);
			} );
		},
	};
}

/**
 * Bundles the entry points and assembles a loadable extension directory.
 *
 * @param {string} target Browser to build for.
 * @return {Promise<import('esbuild').BuildContext>} Build context.
 */
async function createContext( target ) {
	const outdir = join( buildDir, target );

	return esbuild.context( {
		entryPoints: [
			join( rootDir, 'src', 'background.ts' ),
			join( rootDir, 'src', 'content-script.ts' ),
		],
		outdir,
		bundle: true,
		// Content scripts cannot be ES modules, so each entry point is bundled
		// into a self-contained script. The output stays unminified on
		// purpose: both extension stores review the code that ships.
		format: 'iife',
		target: [ 'chrome110', 'firefox115' ],
		// The logo is inlined into the page rather than loaded as a file, so
		// that it can pick up GitHub's text colour.
		loader: { '.svg': 'text' },
		sourcemap: watch,
		logLevel: 'info',
		plugins: [ assetsPlugin( target, outdir ) ],
	} );
}

/**
 * Rebuilds whenever a file the bundle does not import changes.
 *
 * esbuild only watches what it can reach from the entry points, so the
 * manifests, icons and translations the plugin copies in would otherwise go
 * unnoticed until the next manual build.
 *
 * @param {import('esbuild').BuildContext[]} contexts Contexts to rebuild.
 */
function watchStaticInputs( contexts ) {
	let pending;

	const rebuild = () => {
		// File writes tend to arrive in bursts; rebuild once they settle.
		clearTimeout( pending );
		pending = setTimeout( () => {
			Promise.all( contexts.map( ( context ) => context.rebuild() ) )
				// esbuild reports build failures itself.
				.catch( () => {} );
		}, 50 );
	};

	for ( const path of [
		assetsDir,
		manifestsDir,
		join( rootDir, 'package.json' ),
	] ) {
		watchPath( path, { recursive: true }, rebuild );
	}
}

await rm( buildDir, { recursive: true, force: true } );

const contexts = await Promise.all( TARGETS.map( createContext ) );

if ( watch ) {
	await Promise.all( contexts.map( ( context ) => context.watch() ) );
	watchStaticInputs( contexts );
	// eslint-disable-next-line no-console
	console.log( `Watching for changes in ${ TARGETS.join( ', ' ) }…` );
} else {
	await Promise.all(
		contexts.map( async ( context ) => {
			await context.rebuild();
			await context.dispose();
		} )
	);
}
