import type { ProfileLookup } from './types';

/**
 * `data-` attribute marking elements this extension has already handled, so
 * that repeated mutations never add a second badge to the same element.
 */
export const HAS_VISITED = 'wogHasVisited';

/**
 * Everything the DOM helpers need from their environment.
 *
 * Passing these in rather than reaching for the extension APIs directly keeps
 * the DOM logic usable — and testable — outside of a browser extension.
 */
export interface RenderContext {
	/** Resolves a GitHub login into a WordPress.org profile. */
	lookupProfile: ProfileLookup;
	/** Returns the URL of a file bundled with the extension. */
	resourceUrl: ( path: string ) => string;
}

/**
 * Returns whether an element has already been handled.
 *
 * @param element Element to check.
 */
export function isVisited( element: HTMLElement ): boolean {
	return Boolean( element.dataset[ HAS_VISITED ] );
}

/**
 * Marks an element as handled.
 *
 * @param element Element to mark.
 */
export function markVisited( element: HTMLElement ): void {
	element.dataset[ HAS_VISITED ] = 'true';
}

/**
 * Creates the WordPress logo image shown next to a username.
 *
 * @param context Rendering context.
 * @param size    Width and height in pixels.
 */
export function createLogo(
	context: RenderContext,
	size: number
): HTMLImageElement {
	const logo = document.createElement( 'img' );
	logo.src = context.resourceUrl( 'images/wp-logo.png' );
	logo.width = size;
	logo.height = size;
	logo.alt = '';
	return logo;
}
