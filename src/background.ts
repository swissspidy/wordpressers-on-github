import { getProfile } from './lib/api';
import { onMessage } from './lib/browser';
import type { GetUserMessage } from './lib/types';

/**
 * Returns whether a message is a well-formed profile lookup request.
 *
 * @param message Message received from another part of the extension.
 */
function isGetUserMessage( message: unknown ): message is GetUserMessage {
	return (
		typeof message === 'object' &&
		message !== null &&
		( message as GetUserMessage ).type === 'getUser'
	);
}

onMessage( ( message, sendResponse ) => {
	if ( ! isGetUserMessage( message ) ) {
		return false;
	}

	getProfile( message.githubUsername )
		.then( sendResponse )
		.catch( () => sendResponse( null ) );

	// Both Chrome and Firefox keep `sendResponse` alive when a listener
	// returns `true`, which makes this the one portable way to answer
	// asynchronously.
	return true;
} );
