import { lookupUrl } from './api';
import type { WordPressProfile } from './types';

const CACHE_NAME = 'wordpressers-on-github';

/** How long a resolved profile stays cached. */
export const POSITIVE_TTL = 24 * 60 * 60 * 1000;

/** How long a "no profile" result stays cached. */
export const NEGATIVE_TTL = 60 * 60 * 1000;

interface CacheEntry {
	data: WordPressProfile | null;
	expire: number;
}

/**
 * Result of a cache lookup.
 *
 * `hit: true` with `data: null` means the API previously told us this login has
 * no WordPress.org profile — a result worth remembering, so it is deliberately
 * kept distinct from a miss.
 */
export type CacheResult =
	| { hit: true; data: WordPressProfile | null }
	| { hit: false };

const MISS: CacheResult = { hit: false };

/**
 * Reads a cached lookup result, treating expired entries as a miss.
 *
 * @param githubUsername GitHub login to look up.
 */
export async function readFromCache(
	githubUsername: string
): Promise< CacheResult > {
	const cache = await caches.open( CACHE_NAME );
	const response = await cache.match( lookupUrl( githubUsername ) );

	if ( ! response ) {
		return MISS;
	}

	let entry: CacheEntry;

	try {
		entry = ( await response.json() ) as CacheEntry;
	} catch {
		return MISS;
	}

	if ( ! entry || entry.expire <= Date.now() ) {
		return MISS;
	}

	return { hit: true, data: entry.data ?? null };
}

/**
 * Stores a lookup result, including the absence of a profile.
 *
 * @param githubUsername GitHub login the result belongs to.
 * @param data           Resolved profile, or `null` if there is none.
 */
export async function writeToCache(
	githubUsername: string,
	data: WordPressProfile | null
): Promise< void > {
	const cache = await caches.open( CACHE_NAME );
	const entry: CacheEntry = {
		data,
		expire: Date.now() + ( data ? POSITIVE_TTL : NEGATIVE_TTL ),
	};

	await cache.put(
		lookupUrl( githubUsername ),
		new Response( JSON.stringify( entry ) )
	);
}
