import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deferred, installFakeCaches, PROFILE, stubFetch } from './helpers';

type Listener = (
	message: unknown,
	sender: unknown,
	sendResponse: ( response: unknown ) => void
) => boolean;

/**
 * Loads the background script and returns the listener it registered.
 */
async function loadBackground(): Promise< Listener > {
	const addListener = vi.fn();

	vi.stubGlobal( 'browser', undefined );
	vi.stubGlobal( 'chrome', {
		runtime: { onMessage: { addListener } },
	} );

	vi.resetModules();
	await import( '../src/background' );

	return addListener.mock.calls[ 0 ]![ 0 ] as Listener;
}

describe( 'background', () => {
	beforeEach( () => {
		installFakeCaches();
	} );

	afterEach( () => {
		vi.unstubAllGlobals();
	} );

	it( 'answers a lookup with the profile', async () => {
		stubFetch( PROFILE );
		const listener = await loadBackground();
		const { promise, resolve } = deferred< unknown >();

		// Returning `true` is what keeps `sendResponse` usable after the
		// listener returns, in both Chrome and Firefox.
		expect(
			listener(
				{ type: 'getUser', githubUsername: 'swissspidy' },
				{},
				resolve
			)
		).toBe( true );

		await expect( promise ).resolves.toEqual( PROFILE );
	} );

	it( 'answers with null when the lookup fails', async () => {
		stubFetch( 'boom', 500 );
		const listener = await loadBackground();
		const { promise, resolve } = deferred< unknown >();

		listener(
			{ type: 'getUser', githubUsername: 'swissspidy' },
			{},
			resolve
		);

		await expect( promise ).resolves.toBeNull();
	} );

	it( 'answers even when the cache is unusable', async () => {
		vi.stubGlobal( 'caches', {
			open: async () => {
				throw new Error( 'no cache storage' );
			},
		} );
		stubFetch( PROFILE );
		const listener = await loadBackground();
		const { promise, resolve } = deferred< unknown >();

		listener(
			{ type: 'getUser', githubUsername: 'swissspidy' },
			{},
			resolve
		);

		await expect( promise ).resolves.toEqual( PROFILE );
	} );

	it.each( [
		[ 'a message of another type', { type: 'somethingElse' } ],
		[ 'a message without a type', {} ],
		[ 'no message at all', null ],
	] )( 'ignores %s', async ( _label, message ) => {
		const listener = await loadBackground();
		const sendResponse = vi.fn();

		expect( listener( message, {}, sendResponse ) ).toBe( false );
		expect( sendResponse ).not.toHaveBeenCalled();
	} );
} );
