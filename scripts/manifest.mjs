import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join( dirname( fileURLToPath( import.meta.url ) ), '..' );

/** Browsers the extension is built for. */
export const TARGETS = [ 'chrome', 'firefox' ];

const readJson = async ( ...path ) =>
	JSON.parse( await readFile( join( rootDir, ...path ), 'utf8' ) );

/**
 * Builds the manifest for a single browser.
 *
 * Everything the two browsers agree on lives in `manifests/base.json`, and the
 * version comes from `package.json`, so neither can drift between targets.
 *
 * @param {string} target Browser to build the manifest for.
 * @return {Promise<Record<string, unknown>>} Complete manifest.
 */
export async function buildManifest( target ) {
	if ( ! TARGETS.includes( target ) ) {
		throw new Error( `Unknown build target: ${ target }` );
	}

	const [ pkg, base, overrides ] = await Promise.all( [
		readJson( 'package.json' ),
		readJson( 'manifests', 'base.json' ),
		readJson( 'manifests', `${ target }.json` ),
	] );

	const { manifest_version: manifestVersion, ...rest } = overrides;

	return {
		manifest_version: manifestVersion,
		...base,
		version: pkg.version,
		...rest,
	};
}
