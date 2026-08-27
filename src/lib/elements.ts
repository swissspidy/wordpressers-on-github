// The WordPress mark, taken unchanged from simple-icons (CC0-1.0).
import logoMarkup from '../wp-logo.svg';
import type { ProfileLookup } from './types';

/**
 * `data-` attribute marking elements this extension has already handled, so
 * that repeated mutations never add a second badge to the same element.
 */
export const HAS_VISITED = 'wogHasVisited';

/**
 * Everything the DOM helpers need from their environment.
 *
 * Passing this in rather than reaching for the extension APIs directly keeps
 * the DOM logic usable — and testable — outside of a browser extension.
 */
export interface RenderContext {
	/** Resolves a GitHub login into a WordPress.org profile. */
	lookupProfile: ProfileLookup;
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
 * Creates the WordPress logo shown next to a username.
 *
 * The mark is inlined rather than loaded from an `<img>`, so that it can be
 * filled with `currentColor` and follow whichever theme GitHub is rendering
 * in. A file loaded through `<img>` cannot see the page's colours, and the
 * mark is dark enough to disappear against a dark background.
 *
 * @param size Width and height in pixels.
 */
export function createLogo( size: number ): SVGElement {
	const parsed = new DOMParser().parseFromString(
		logoMarkup,
		'image/svg+xml'
	);
	const logo = document.importNode(
		parsed.documentElement,
		true
	) as unknown as SVGElement;

	logo.setAttribute( 'width', String( size ) );
	logo.setAttribute( 'height', String( size ) );
	logo.setAttribute( 'fill', 'currentColor' );
	logo.setAttribute( 'aria-hidden', 'true' );
	logo.setAttribute( 'focusable', 'false' );

	return logo;
}
