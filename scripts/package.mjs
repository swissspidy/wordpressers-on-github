import AdmZip from 'adm-zip';
import { access, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TARGETS } from './manifest.mjs';

const rootDir = join( dirname( fileURLToPath( import.meta.url ) ), '..' );
const buildDir = join( rootDir, 'build' );

const { name, version } = JSON.parse(
	await readFile( join( rootDir, 'package.json' ), 'utf8' )
);

/**
 * Zips up a built extension, ready to upload to the browser's store.
 *
 * Both stores expect `manifest.json` at the root of the archive, so the
 * contents of the build directory are added rather than the directory itself.
 *
 * @param {string} target Browser the build was made for.
 * @return {Promise<string>} Name of the archive that was written.
 */
async function packageTarget( target ) {
	const outdir = join( buildDir, target );

	try {
		await access( join( outdir, 'manifest.json' ) );
	} catch {
		throw new Error(
			`No build found at ${ outdir }. Run \`npm run build\` first.`
		);
	}

	const archive = new AdmZip();
	archive.addLocalFolder( outdir );

	if ( ! archive.getEntry( 'manifest.json' ) ) {
		throw new Error( `manifest.json is missing from the ${ target } zip.` );
	}

	const filename = `${ name }-${ target }-${ version }.zip`;
	archive.writeZip( join( buildDir, filename ) );

	return filename;
}

for ( const target of TARGETS ) {
	const filename = await packageTarget( target );
	// eslint-disable-next-line no-console
	console.log( `  build/${ filename }` );
}
