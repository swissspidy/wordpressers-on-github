import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lookupUrl } from '../src/lib/api';
import {
	NEGATIVE_TTL,
	POSITIVE_TTL,
	readFromCache,
	writeToCache,
} from '../src/lib/cache';
import { installFakeCaches, PROFILE } from './helpers';

describe( 'cache', () => {
	beforeEach( () => {
		installFakeCaches();
		vi.useFakeTimers();
	} );

	afterEach( () => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	} );

	it( 'reports a miss for an unknown login', async () => {
		expect( await readFromCache( 'nobody' ) ).toEqual( { hit: false } );
	} );

	it( 'returns a stored profile', async () => {
		await writeToCache( 'swissspidy', PROFILE );

		expect( await readFromCache( 'swissspidy' ) ).toEqual( {
			hit: true,
			data: PROFILE,
		} );
	} );

	it( 'remembers that a login has no profile', async () => {
		await writeToCache( 'octocat', null );

		// A cached "no profile" must stay distinguishable from a miss, or
		// every page view would look the same login up again.
		expect( await readFromCache( 'octocat' ) ).toEqual( {
			hit: true,
			data: null,
		} );
	} );

	it( 'keeps a profile for a day', async () => {
		await writeToCache( 'swissspidy', PROFILE );

		vi.advanceTimersByTime( POSITIVE_TTL - 1 );
		expect( await readFromCache( 'swissspidy' ) ).toMatchObject( {
			hit: true,
		} );

		vi.advanceTimersByTime( 1 );
		expect( await readFromCache( 'swissspidy' ) ).toEqual( { hit: false } );
	} );

	it( 'retries a missing profile after an hour', async () => {
		await writeToCache( 'octocat', null );

		vi.advanceTimersByTime( NEGATIVE_TTL - 1 );
		expect( await readFromCache( 'octocat' ) ).toMatchObject( {
			hit: true,
		} );

		vi.advanceTimersByTime( 1 );
		expect( await readFromCache( 'octocat' ) ).toEqual( { hit: false } );
	} );

	it( 'treats an unreadable entry as a miss', async () => {
		const cache = installFakeCaches();
		await cache.put(
			lookupUrl( 'swissspidy' ),
			new Response( 'not json' )
		);

		expect( await readFromCache( 'swissspidy' ) ).toEqual( { hit: false } );
	} );
} );
