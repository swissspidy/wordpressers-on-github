import { addBadges } from './lib/badges';
import { getResourceUrl, sendMessage } from './lib/browser';
import type { RenderContext } from './lib/elements';
import type { GetUserMessage, WordPressProfile } from './lib/types';
import { addVcard } from './lib/vcard';

const context: RenderContext = {
	async lookupProfile( githubUsername ) {
		const message: GetUserMessage = {
			type: 'getUser',
			githubUsername,
		};

		try {
			return await sendMessage< WordPressProfile | null >( message );
		} catch {
			// The background script may not be reachable yet. Skipping a
			// badge is better than letting the whole pass fail.
			return null;
		}
	},
	resourceUrl: getResourceUrl,
};

/**
 * Adds badges within the given roots, plus the profile link on user pages.
 *
 * The vcard is always looked for in the whole document, because the details
 * list and the username it belongs to can be added in separate mutations.
 *
 * @param roots Elements to search for user references.
 */
async function render( roots: ParentNode[] ): Promise< void > {
	await Promise.all( roots.map( ( root ) => addBadges( context, root ) ) );
	await addVcard( context, document.documentElement );
}

function init(): void {
	const observer = new MutationObserver( ( mutations ) => {
		const roots: ParentNode[] = [];

		for ( const mutation of mutations ) {
			for ( const node of mutation.addedNodes ) {
				if ( node.nodeType === Node.ELEMENT_NODE ) {
					roots.push( node as Element );
				}
			}
		}

		if ( roots.length > 0 ) {
			void render( roots );
		}
	} );

	observer.observe( document.documentElement, {
		childList: true,
		subtree: true,
	} );

	void render( [ document.documentElement ] );
}

if ( document.readyState === 'complete' ) {
	init();
} else {
	window.addEventListener( 'load', init );
}
