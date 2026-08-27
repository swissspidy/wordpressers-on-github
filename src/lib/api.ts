import { readFromCache, writeToCache } from './cache';
import type { WordPressProfile } from './types';

const API_ENDPOINT =
	'https://profiles.wordpress.org/wp-json/wporg-github/v1/lookup/';

/**
 * Returns the lookup API URL for a GitHub login.
 *
 * Doubles as the cache key, so reads and writes always agree on the encoding.
 *
 * @param githubUsername GitHub login to look up.
 */
export function lookupUrl( githubUsername: string ): string {
	return `${ API_ENDPOINT }${ encodeURIComponent( githubUsername ) }`;
}

/**
 * Fetches a WordPress.org profile from the lookup API.
 *
 * Resolves with `null` when the login has no profile, and throws when the API
 * is unreachable or errors out, so that callers can tell "no profile" apart
 * from "ask again later".
 *
 * @param githubUsername GitHub login to look up.
 */
export async function fetchProfile(
	githubUsername: string
): Promise< WordPressProfile | null > {
	const response = await fetch( lookupUrl( githubUsername ), {
		credentials: 'include',
		mode: 'cors',
	} );

	if ( response.status === 404 ) {
		return null;
	}

	if ( ! response.ok ) {
		throw new Error(
			`Unable to look up GitHub user login (HTTP ${ response.status }).`
		);
	}

	let data: unknown;

	try {
		data = await response.json();
	} catch {
		throw new Error( 'Unable to parse the lookup API response.' );
	}

	return toProfile( data );
}

/**
 * Narrows an API response to a profile, or `null` if it does not describe one.
 *
 * The API answers with an error object for unknown logins, hence the check.
 *
 * @param data Parsed API response.
 */
function toProfile( data: unknown ): WordPressProfile | null {
	if ( ! data || typeof data !== 'object' ) {
		return null;
	}

	const { slug, profile } = data as Record< string, unknown >;

	if ( typeof slug !== 'string' || typeof profile !== 'string' ) {
		return null;
	}

	return { slug, profile };
}

/**
 * Resolves a GitHub login into a WordPress.org profile, using the cache first.
 *
 * Never rejects: a failing lookup resolves with `null` and is not cached, so it
 * is retried on the next request instead of being remembered as "no profile".
 *
 * @param githubUsername GitHub login to look up.
 */
export async function getProfile(
	githubUsername: string
): Promise< WordPressProfile | null > {
	if ( ! githubUsername ) {
		return null;
	}

	const cached = await readFromCache( githubUsername );

	if ( cached.hit ) {
		return cached.data;
	}

	let profile: WordPressProfile | null;

	try {
		profile = await fetchProfile( githubUsername );
	} catch {
		return null;
	}

	await writeToCache( githubUsername, profile );

	return profile;
}
