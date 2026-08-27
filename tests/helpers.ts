import { vi } from 'vitest';
import type { WordPressProfile } from '../src/lib/types';

/** A profile as the lookup API returns it, for use in fixtures. */
export const PROFILE: WordPressProfile = {
	slug: 'swissspidy',
	profile: 'https://profiles.wordpress.org/swissspidy/',
};

/**
 * Minimal in-memory stand-in for the Cache Storage API.
 *
 * Only implements what the extension uses: opening a named cache, matching a
 * URL and storing a response for one.
 */
class FakeCache {
	private entries = new Map< string, string >();

	async match( request: RequestInfo ): Promise< Response | undefined > {
		const body = this.entries.get( String( request ) );
		return body === undefined ? undefined : new Response( body );
	}

	async put( request: RequestInfo, response: Response ): Promise< void > {
		this.entries.set( String( request ), await response.text() );
	}
}

/**
 * Installs a fake Cache Storage on the global object.
 *
 * @return The backing cache, so tests can seed or inspect it.
 */
export function installFakeCaches(): FakeCache {
	const cache = new FakeCache();

	vi.stubGlobal( 'caches', {
		open: async () => cache,
	} );

	return cache;
}

/**
 * Stubs `fetch` with a single canned response.
 *
 * @param body   Response body. Objects are serialised as JSON.
 * @param status HTTP status code.
 */
export function stubFetch( body: unknown, status = 200 ) {
	const fetchMock = vi.fn( async () => {
		const payload =
			typeof body === 'string' ? body : JSON.stringify( body );
		return new Response( payload, { status } );
	} );

	vi.stubGlobal( 'fetch', fetchMock );

	return fetchMock;
}

/**
 * Builds an element referencing a GitHub user, the way GitHub marks them up.
 *
 * @param login GitHub login.
 * @param tag   Tag name to use.
 */
export function userElement( login: string, tag = 'a' ): HTMLElement {
	const element = document.createElement( tag );
	element.dataset.hovercardType = 'user';
	element.dataset.hovercardUrl = `/users/${ login }/hovercard`;
	element.textContent = login;
	return element;
}

/**
 * Rendering context backed by a fixed set of known profiles.
 *
 * @param profiles Profiles keyed by GitHub login.
 */
export function renderContext( profiles: Record< string, WordPressProfile > ) {
	return {
		lookupProfile: vi.fn(
			async ( githubUsername: string ) =>
				profiles[ githubUsername ] ?? null
		),
		resourceUrl: ( path: string ) => `chrome-extension://test/${ path }`,
	};
}

/**
 * Creates a promise together with its resolver.
 *
 * Handy for asserting on values handed to a callback rather than returned.
 */
export function deferred< T >() {
	let resolve!: ( value: T ) => void;
	const promise = new Promise< T >( ( resolveValue ) => {
		resolve = resolveValue;
	} );

	return { promise, resolve };
}
