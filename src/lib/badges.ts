import {
	createLogo,
	isVisited,
	markVisited,
	type RenderContext,
} from './elements';
import type { WordPressProfile } from './types';

/** Matches the hovercard URLs GitHub puts on elements referencing a user. */
const HOVERCARD_URL = /^\/users\/([^/]+)\/hovercard/;

/** Matches the `author:<login>` qualifier in pull request filter URLs. */
const AUTHOR_FILTER_QUERY =
	/(?:^|\s)author:([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})(?=$|\s)/i;

/** Matches a valid GitHub username. */
const GITHUB_USERNAME = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/** Selects the elements GitHub marks as referencing a user. */
const USER_SELECTOR = [
	'[data-hovercard-type="user"]',
	'[data-testid="author-filter-link"]',
	'[data-testid="attributed-author-filter-link"]',
].join( ', ' );

/**
 * Extracts a GitHub username from an element referencing a user.
 *
 * @param element Element matched by `USER_SELECTOR`.
 */
function getLogin( element: HTMLElement ): string | undefined {
	if ( element.dataset.hovercardUrl ) {
		return element.dataset.hovercardUrl
			.match( HOVERCARD_URL )?.[ 1 ]
			?.trim();
	}

	if (
		element.dataset.testid !== 'author-filter-link' &&
		element.dataset.testid !== 'attributed-author-filter-link'
	) {
		return undefined;
	}

	const href = element.getAttribute( 'href' );

	if ( href ) {
		const query = new URL( href, 'https://github.com' ).searchParams.get(
			'q'
		);
		const match = query?.match( AUTHOR_FILTER_QUERY );

		if ( match ) {
			return match[ 1 ];
		}
	}

	const text = element.textContent
		?.trim()
		.replace( /^Filter by author\s+/i, '' )
		.trim();

	return text && GITHUB_USERNAME.test( text ) ? text : undefined;
}

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

		const login = getLogin( card );

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
 * @param profile Profile to link to.
 * @param element Element referencing the user.
 */
export function addBadge(
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
	// Follow the surrounding text rather than the link colour, so the mark
	// stays legible in both of GitHub's themes.
	profileLink.style.color = 'inherit';

	const logo = createLogo( 12 );
	logo.style.verticalAlign = 'middle';
	profileLink.appendChild( logo );

	if ( ! element.checkVisibility || element.checkVisibility() ) {
		if ( element.tagName === 'A' || element.tagName === 'BUTTON' ) {
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
				addBadge( profile, element );
			}
		} )
	);
}
