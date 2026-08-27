import {
	createLogo,
	isVisited,
	markVisited,
	type RenderContext,
} from './elements';

/**
 * Adds a WordPress.org profile link to the details list on a GitHub profile.
 *
 * @param context Rendering context.
 * @param root    Element to search within.
 */
export async function addVcard(
	context: RenderContext,
	root: ParentNode
): Promise< void > {
	const vcardList = root.querySelector< HTMLElement >( 'ul.vcard-details' );

	if ( ! vcardList || isVisited( vcardList ) ) {
		return;
	}

	const vcardUsername =
		root.querySelector< HTMLElement >( '.vcard-username' );
	const login = vcardUsername?.textContent?.match( /[a-z0-9-]+/i )?.[ 0 ];

	if ( ! login ) {
		return;
	}

	const profile = await context.lookupProfile( login );

	if ( ! profile?.profile ) {
		return;
	}

	// Another mutation may have added the entry while the lookup was pending.
	if ( isVisited( vcardList ) ) {
		return;
	}

	markVisited( vcardList );

	const vcardDetail = document.createElement( 'li' );
	vcardDetail.setAttribute( 'itemprop', 'social' );
	vcardDetail.classList.add( 'vcard-detail', 'pt-1' );

	const logo = createLogo( context, 16 );
	logo.classList.add( 'octicon' );
	vcardDetail.appendChild( logo );

	const profileLink = document.createElement( 'a' );
	profileLink.target = '_blank';
	profileLink.setAttribute( 'href', profile.profile );
	profileLink.textContent = `@${ profile.slug }`;
	profileLink.classList.add( 'Link--primary' );
	vcardDetail.appendChild( profileLink );

	vcardList.appendChild( vcardDetail );
}
