import { beforeEach, describe, expect, it } from 'vitest';
import { addVcard } from '../src/lib/vcard';
import { PROFILE, renderContext } from './helpers';

const context = () => renderContext( { swissspidy: PROFILE } );

/**
 * Renders the parts of a GitHub profile page the extension looks at.
 *
 * @param login GitHub login shown on the page.
 */
function profilePage( login: string ): void {
	document.body.innerHTML = `
		<span class="vcard-username">${ login }</span>
		<ul class="vcard-details"></ul>
	`;
}

const details = () => document.querySelector( 'ul.vcard-details' );

describe( 'addVcard', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
	} );

	it( 'adds a WordPress.org profile link to the details list', async () => {
		profilePage( 'swissspidy' );

		await addVcard( context(), document.body );

		const link = details()?.querySelector( 'a' );
		expect( link?.getAttribute( 'href' ) ).toBe( PROFILE.profile );
		expect( link?.textContent ).toBe( `@${ PROFILE.slug }` );
		expect( details()?.querySelector( 'img' )?.src ).toContain(
			'images/wp-logo.png'
		);
	} );

	it( 'adds the link only once', async () => {
		profilePage( 'swissspidy' );

		await addVcard( context(), document.body );
		await addVcard( context(), document.body );

		expect( details()?.querySelectorAll( 'a' ) ).toHaveLength( 1 );
	} );

	it( 'adds the link only once when called concurrently', async () => {
		profilePage( 'swissspidy' );
		const rendering = context();

		await Promise.all( [
			addVcard( rendering, document.body ),
			addVcard( rendering, document.body ),
		] );

		expect( details()?.querySelectorAll( 'a' ) ).toHaveLength( 1 );
	} );

	it( 'leaves users without a WordPress.org profile alone', async () => {
		profilePage( 'octocat' );

		await addVcard( context(), document.body );

		expect( details()?.children ).toHaveLength( 0 );
	} );

	it( 'does nothing on a page without a details list', async () => {
		document.body.innerHTML =
			'<span class="vcard-username">swissspidy</span>';
		const rendering = context();

		await addVcard( rendering, document.body );

		expect( rendering.lookupProfile ).not.toHaveBeenCalled();
	} );

	it( 'does nothing on a page without a username', async () => {
		document.body.innerHTML = '<ul class="vcard-details"></ul>';
		const rendering = context();

		await addVcard( rendering, document.body );

		expect( rendering.lookupProfile ).not.toHaveBeenCalled();
	} );

	it( 'retries once a failed lookup could succeed', async () => {
		profilePage( 'swissspidy' );

		// A lookup that came back empty must not mark the list as done.
		await addVcard( renderContext( {} ), document.body );
		await addVcard( context(), document.body );

		expect( details()?.querySelectorAll( 'a' ) ).toHaveLength( 1 );
	} );
} );
