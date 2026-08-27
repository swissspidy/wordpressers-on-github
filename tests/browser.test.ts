import { afterEach, describe, expect, it, vi } from 'vitest';
import { getResourceUrl, onMessage, sendMessage } from '../src/lib/browser';

/**
 * Builds a stand-in for a browser's extension API namespace.
 *
 * @param prefix Prefix used by the fake `getURL` implementation.
 */
function fakeApi( prefix: string ) {
	return {
		runtime: {
			getURL: vi.fn( ( path: string ) => `${ prefix }/${ path }` ),
			sendMessage: vi.fn( async () => 'response' ),
			onMessage: { addListener: vi.fn() },
		},
	};
}

describe( 'browser', () => {
	afterEach( () => {
		vi.unstubAllGlobals();
	} );

	it( 'prefers the promise-based browser namespace of Firefox', () => {
		vi.stubGlobal( 'browser', fakeApi( 'moz-extension://test' ) );
		vi.stubGlobal( 'chrome', fakeApi( 'chrome-extension://test' ) );

		expect( getResourceUrl( 'images/wp-logo.png' ) ).toBe(
			'moz-extension://test/images/wp-logo.png'
		);
	} );

	it( 'falls back to the chrome namespace', () => {
		vi.stubGlobal( 'browser', undefined );
		vi.stubGlobal( 'chrome', fakeApi( 'chrome-extension://test' ) );

		expect( getResourceUrl( 'images/wp-logo.png' ) ).toBe(
			'chrome-extension://test/images/wp-logo.png'
		);
	} );

	it( 'explains itself when no extension API is available', () => {
		vi.stubGlobal( 'browser', undefined );
		vi.stubGlobal( 'chrome', undefined );

		expect( () => getResourceUrl( 'images/wp-logo.png' ) ).toThrow(
			'No extension API available'
		);
	} );

	it( 'passes messages to the runtime', async () => {
		const api = fakeApi( 'chrome-extension://test' );
		vi.stubGlobal( 'browser', undefined );
		vi.stubGlobal( 'chrome', api );

		await expect( sendMessage( { type: 'getUser' } ) ).resolves.toBe(
			'response'
		);
		expect( api.runtime.sendMessage ).toHaveBeenCalledWith( {
			type: 'getUser',
		} );
	} );

	it( 'hides the sender argument from message listeners', () => {
		const api = fakeApi( 'chrome-extension://test' );
		vi.stubGlobal( 'browser', undefined );
		vi.stubGlobal( 'chrome', api );

		const listener = vi.fn( () => true );
		onMessage( listener );

		const registered =
			api.runtime.onMessage.addListener.mock.calls[ 0 ]![ 0 ];
		const sendResponse = vi.fn();

		expect( registered( 'message', 'sender', sendResponse ) ).toBe( true );
		expect( listener ).toHaveBeenCalledWith( 'message', sendResponse );
	} );
} );
