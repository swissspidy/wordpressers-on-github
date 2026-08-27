/**
 * Cross-browser access to the extension APIs.
 *
 * Firefox exposes the promise-based `browser` namespace, Chrome only exposes
 * `chrome`. Chrome's Manifest V3 APIs return promises whenever no callback is
 * passed, so for everything this extension needs the two are interchangeable
 * and a single shared code path is enough.
 */

declare global {
	var browser: typeof chrome | undefined;
}

/**
 * Returns the extension API namespace provided by the current browser.
 *
 * Resolved lazily so that importing this module does not require the APIs to
 * be present, which keeps the surrounding logic testable outside a browser.
 */
function extensionApi(): typeof chrome {
	const api = globalThis.browser ?? globalThis.chrome;

	if ( ! api ) {
		throw new Error( 'No extension API available in this context.' );
	}

	return api;
}

/**
 * Returns the fully qualified URL of a file bundled with the extension.
 *
 * @param path Path relative to the extension root, e.g. `images/wp-logo.png`.
 */
export function getResourceUrl( path: string ): string {
	return extensionApi().runtime.getURL( path );
}

/**
 * Sends a message to the background script and resolves with its response.
 *
 * @param message Message to send.
 */
export function sendMessage< Response >(
	message: unknown
): Promise< Response > {
	return extensionApi().runtime.sendMessage( message ) as Promise< Response >;
}

/**
 * Registers a listener for messages sent by other parts of the extension.
 *
 * @param listener Listener receiving the message and a response callback. It
 *                 must return `true` when it responds asynchronously, which is
 *                 the one pattern both Chrome and Firefox support.
 */
export function onMessage(
	listener: (
		message: unknown,
		sendResponse: ( response: unknown ) => void
	) => boolean
): void {
	extensionApi().runtime.onMessage.addListener(
		(
			message: unknown,
			_sender: unknown,
			sendResponse: ( response: unknown ) => void
		) => listener( message, sendResponse )
	);
}
