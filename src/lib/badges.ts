import {
	createLogo,
	isVisited,
	markVisited,
	type RenderContext,
} from './elements';
import type { WordPressProfile } from './types';

/** Matches the hovercard URLs GitHub puts on elements referencing a user. */
const HOVERCARD_URL = /^\/users\/([^/]+)\/hovercard/;

/** Selects the elements GitHub marks as referencing a user. */
const USER_SELECTOR = '[data-hovercard-type="user"]';

/**
 * Collects the elements that reference a GitHub user, grouped by login so that
 * each login only needs a single lookup.
 *
 * @param root Element to search, itself included.
 */
export function findGitHubLogins(
	root: ParentNode
): Map< string, HTMLElement[] > {
	const logins = new Map< string, HTMLElement[] >();
	const cards: HTMLElement[] = [];

	// A mutation can add an element that *is* a user reference rather than one
	// containing them, which `querySelectorAll` on its own would miss.
	if ( root instanceof Element && root.matches( USER_SELECTOR ) ) {
		cards.push( root as HTMLElement );
	}

	cards.push( ...root.querySelectorAll< HTMLElement >( USER_SELECTOR ) );

	for ( const card of cards ) {
		if ( isVisited( card ) ) {
			continue;
		}

		if ( ! card.textContent || card.textContent.trim().length === 0 ) {
			continue;
		}

		const login = card.dataset.hovercardUrl
			?.match( HOVERCARD_URL )?.[ 1 ]
			?.trim();

		if ( ! login ) {
			continue;
		}

		const elements = logins.get( login );

		if ( elements ) {
			elements.push( card );
		} else {
			logins.set( login, [ card ] );
		}
	}

	return logins;
}

/**
 * Adds a WordPress logo linking to the given profile to a single element.
 *
 * @param context Rendering context.
 * @param profile Profile to link to.
 * @param element Element referencing the user.
 */
export function addBadge(
	context: RenderContext,
	profile: WordPressProfile,
	element: HTMLElement
): void {
	if ( isVisited( element ) ) {
		return;
	}

	const profileLink = document.createElement( 'a' );
	profileLink.target = '_blank';
	profileLink.setAttribute( 'href', profile.profile );
	profileLink.classList.add( 'tooltipped', 'tooltipped-s' );
	profileLink.setAttribute( 'aria-label', profile.slug );
	profileLink.style.paddingLeft = '2px';

	const logo = createLogo( context, 12 );
	logo.style.verticalAlign = 'middle';
	profileLink.appendChild( logo );

	if ( ! element.checkVisibility || element.checkVisibility() ) {
		if ( element.tagName === 'A' ) {
			// Sit inside the link's own padding so the logo stays visually
			// attached to the username instead of drifting away from it.
			profileLink.style.paddingRight = window
				.getComputedStyle( element, null )
				.getPropertyValue( 'padding-right' );

			if ( profileLink.style.paddingRight !== '0px' ) {
				profileLink.style.paddingLeft = '0px';
			}

			element.insertAdjacentElement( 'afterend', profileLink );
		} else {
			element.appendChild( profileLink );
		}
	}

	markVisited( element );
}

/**
 * Looks up every GitHub user an element references and adds a WordPress logo
 * next to each mention of a user who has a profile.
 *
 * @param context Rendering context.
 * @param root    Element to search, itself included.
 */
export async function addBadges(
	context: RenderContext,
	root: ParentNode
): Promise< void > {
	const logins = findGitHubLogins( root );

	await Promise.all(
		[ ...logins ].map( async ( [ login, elements ] ) => {
			const profile = await context.lookupProfile( login );

			if ( ! profile?.profile ) {
				return;
			}

			for ( const element of elements ) {
				addBadge( context, profile, element );
			}
		} )
	);
}
