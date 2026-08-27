import { afterEach, describe, expect, it, vi } from 'vitest';
import { onMessage, sendMessage } from '../src/lib/browser';

/**
 * Builds a stand-in for a browser's extension API namespace.
 */
function fakeApi() {
	return {
		runtime: {
			sendMessage: vi.fn( async () => 'response' ),
			onMessage: { addListener: vi.fn() },
		},
	};
}

describe( 'browser', () => {
	afterEach( () => {
		vi.unstubAllGlobals();
	} );

	it( 'prefers the promise-based browser namespace of Firefox', async () => {
		const firefox = fakeApi();
		vi.stubGlobal( 'browser', firefox );
		vi.stubGlobal( 'chrome', fakeApi() );

		await sendMessage( { type: 'getUser' } );

		expect( firefox.runtime.sendMessage ).toHaveBeenCalled();
	} );

	it( 'falls back to the chrome namespace', async () => {
		const chrome = fakeApi();
		vi.stubGlobal( 'browser', undefined );
		vi.stubGlobal( 'chrome', chrome );

		await sendMessage( { type: 'getUser' } );

		expect( chrome.runtime.sendMessage ).toHaveBeenCalled();
	} );

	it( 'explains itself when no extension API is available', () => {
		vi.stubGlobal( 'browser', undefined );
		vi.stubGlobal( 'chrome', undefined );

		expect( () => onMessage( () => true ) ).toThrow(
			'No extension API available'
		);
	} );

	it( 'passes messages to the runtime', async () => {
		const api = fakeApi();
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
		const api = fakeApi();
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
