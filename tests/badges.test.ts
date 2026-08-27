import { beforeEach, describe, expect, it } from 'vitest';
import { addBadges, findGitHubLogins } from '../src/lib/badges';
import { PROFILE, renderContext, userElement } from './helpers';

const context = () => renderContext( { swissspidy: PROFILE } );

const badgesIn = ( root: ParentNode ) =>
	root.querySelectorAll( `a[href="${ PROFILE.profile }"]` );

describe( 'findGitHubLogins', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'groups every mention of a login', () => {
		document.body.append(
			userElement( 'swissspidy' ),
			userElement( 'swissspidy', 'span' ),
			userElement( 'octocat' )
		);

		const logins = findGitHubLogins( document.body );

		expect( [ ...logins.keys() ] ).toEqual( [ 'swissspidy', 'octocat' ] );
		expect( logins.get( 'swissspidy' ) ).toHaveLength( 2 );
	} );

	it( 'skips elements without a username', () => {
		const empty = userElement( 'swissspidy' );
		empty.textContent = '   ';
		document.body.append( empty );

		expect( findGitHubLogins( document.body ).size ).toBe( 0 );
	} );

	it( 'skips elements without a hovercard URL', () => {
		const element = userElement( 'swissspidy' );
		delete element.dataset.hovercardUrl;
		document.body.append( element );

		expect( findGitHubLogins( document.body ).size ).toBe( 0 );
	} );

	it( 'skips hovercard URLs for anything other than a user', () => {
		const element = userElement( 'swissspidy' );
		element.dataset.hovercardUrl = '/orgs/WordPress/hovercard';
		document.body.append( element );

		expect( findGitHubLogins( document.body ).size ).toBe( 0 );
	} );

	it( 'finds a login on the searched element itself', () => {
		// A mutation can add the user reference itself, not just a container.
		const element = userElement( 'swissspidy' );
		document.body.append( element );

		expect( [ ...findGitHubLogins( element ).keys() ] ).toEqual( [
			'swissspidy',
		] );
	} );

	it( 'keeps the query string out of the login', () => {
		const element = userElement( 'swissspidy' );
		element.dataset.hovercardUrl =
			'/users/swissspidy/hovercard?subject_type=issue';
		document.body.append( element );

		expect( [ ...findGitHubLogins( document.body ).keys() ] ).toEqual( [
			'swissspidy',
		] );
	} );
} );

describe( 'addBadges', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'links a WordPress.org profile next to a username', async () => {
		document.body.append( userElement( 'swissspidy' ) );

		await addBadges( context(), document.body );

		const badge = badgesIn( document.body )[ 0 ];
		expect( badge ).toBeTruthy();
		expect( badge?.getAttribute( 'aria-label' ) ).toBe( PROFILE.slug );
		expect( badge?.querySelector( 'img' )?.src ).toContain(
			'images/wp-logo.png'
		);
	} );

	it( 'places the badge after a link, and inside anything else', async () => {
		const link = userElement( 'swissspidy' );
		const span = userElement( 'swissspidy', 'span' );
		document.body.append( link, span );

		await addBadges( context(), document.body );

		expect( link.nextElementSibling ).toBe(
			badgesIn( document.body )[ 0 ]
		);
		expect( span.querySelector( 'a' ) ).toBe( badgesIn( span )[ 0 ] );
	} );

	it( 'leaves users without a WordPress.org profile alone', async () => {
		document.body.append( userElement( 'octocat' ) );

		await addBadges( context(), document.body );

		expect( document.body.querySelectorAll( 'a[href]' ) ).toHaveLength( 0 );
	} );

	it( 'looks each login up once, however often it appears', async () => {
		document.body.append(
			userElement( 'swissspidy' ),
			userElement( 'swissspidy' )
		);
		const rendering = context();

		await addBadges( rendering, document.body );

		expect( rendering.lookupProfile ).toHaveBeenCalledTimes( 1 );
		expect( badgesIn( document.body ) ).toHaveLength( 2 );
	} );

	it( 'badges an element that is itself a user reference', async () => {
		const element = userElement( 'swissspidy', 'span' );
		document.body.append( element );

		await addBadges( context(), element );

		expect( badgesIn( element ) ).toHaveLength( 1 );
	} );

	it( 'does not badge the same element twice', async () => {
		document.body.append( userElement( 'swissspidy' ) );

		await addBadges( context(), document.body );
		await addBadges( context(), document.body );

		expect( badgesIn( document.body ) ).toHaveLength( 1 );
	} );
} );
