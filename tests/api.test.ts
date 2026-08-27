import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchProfile, getProfile, lookupUrl } from '../src/lib/api';
import { writeToCache } from '../src/lib/cache';
import { installFakeCaches, PROFILE, stubFetch } from './helpers';

describe( 'lookupUrl', () => {
	it( 'points at the WordPress.org lookup endpoint', () => {
		expect( lookupUrl( 'swissspidy' ) ).toBe(
			'https://profiles.wordpress.org/wp-json/wporg-github/v1/lookup/swissspidy'
		);
	} );

	it( 'encodes the login', () => {
		expect( lookupUrl( 'a b/c' ) ).toContain( 'a%20b%2Fc' );
	} );
} );

describe( 'fetchProfile', () => {
	afterEach( () => {
		vi.unstubAllGlobals();
	} );

	it( 'returns the profile from the API', async () => {
		stubFetch( PROFILE );

		expect( await fetchProfile( 'swissspidy' ) ).toEqual( PROFILE );
	} );

	it( 'ignores extra fields in the response', async () => {
		stubFetch( { ...PROFILE, extra: 'ignored' } );

		expect( await fetchProfile( 'swissspidy' ) ).toEqual( PROFILE );
	} );

	it( 'returns null when the login is unknown', async () => {
		stubFetch( { code: 'not_found', message: 'No user found.' }, 404 );

		expect( await fetchProfile( 'octocat' ) ).toBeNull();
	} );

	it( 'returns null when the response carries an error instead of a profile', async () => {
		stubFetch( { code: 'not_found', message: 'No user found.' } );

		expect( await fetchProfile( 'octocat' ) ).toBeNull();
	} );

	it( 'throws when the API fails', async () => {
		stubFetch( 'boom', 500 );

		await expect( fetchProfile( 'swissspidy' ) ).rejects.toThrow(
			'HTTP 500'
		);
	} );

	it( 'throws when the response is not JSON', async () => {
		stubFetch( 'not json' );

		await expect( fetchProfile( 'swissspidy' ) ).rejects.toThrow();
	} );
} );

describe( 'getProfile', () => {
	beforeEach( () => {
		installFakeCaches();
	} );

	afterEach( () => {
		vi.unstubAllGlobals();
	} );

	it( 'returns null without asking the API for an empty login', async () => {
		const fetchMock = stubFetch( PROFILE );

		expect( await getProfile( '' ) ).toBeNull();
		expect( fetchMock ).not.toHaveBeenCalled();
	} );

	it( 'fetches and caches an unknown login', async () => {
		const fetchMock = stubFetch( PROFILE );

		expect( await getProfile( 'swissspidy' ) ).toEqual( PROFILE );
		expect( await getProfile( 'swissspidy' ) ).toEqual( PROFILE );
		expect( fetchMock ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'serves a cached profile without hitting the API', async () => {
		await writeToCache( 'swissspidy', PROFILE );
		const fetchMock = stubFetch( PROFILE );

		expect( await getProfile( 'swissspidy' ) ).toEqual( PROFILE );
		expect( fetchMock ).not.toHaveBeenCalled();
	} );

	it( 'serves a cached "no profile" without hitting the API', async () => {
		await writeToCache( 'octocat', null );
		const fetchMock = stubFetch( PROFILE );

		expect( await getProfile( 'octocat' ) ).toBeNull();
		expect( fetchMock ).not.toHaveBeenCalled();
	} );

	it( 'does not cache a failed lookup', async () => {
		const failing = stubFetch( 'boom', 500 );

		expect( await getProfile( 'swissspidy' ) ).toBeNull();

		// A temporary outage must not be remembered as "has no profile".
		const succeeding = stubFetch( PROFILE );
		expect( await getProfile( 'swissspidy' ) ).toEqual( PROFILE );
		expect( failing ).toHaveBeenCalledTimes( 1 );
		expect( succeeding ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'still resolves a profile when the cache is unusable', async () => {
		vi.stubGlobal( 'caches', {
			open: async () => {
				throw new Error( 'denied' );
			},
		} );
		stubFetch( PROFILE );

		// `getProfile` promises never to reject; a broken Cache Storage costs
		// a repeat request, not the lookup.
		await expect( getProfile( 'swissspidy' ) ).resolves.toEqual( PROFILE );
	} );

	it( 'keeps a profile the cache refused to store', async () => {
		vi.stubGlobal( 'caches', {
			open: async () => ( {
				match: async () => undefined,
				put: async () => {
					throw new Error( 'quota exceeded' );
				},
			} ),
		} );
		stubFetch( PROFILE );

		await expect( getProfile( 'swissspidy' ) ).resolves.toEqual( PROFILE );
	} );

	it( 'sends credentials with the lookup request', async () => {
		const fetchMock = stubFetch( PROFILE );

		await getProfile( 'swissspidy' );

		expect( fetchMock ).toHaveBeenCalledWith(
			lookupUrl( 'swissspidy' ),
			expect.objectContaining( { credentials: 'include' } )
		);
	} );
} );
