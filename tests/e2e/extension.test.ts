import { access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	chromium,
	type BrowserContext,
	type Page,
	type Worker,
} from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PROFILE } from '../helpers';

const EXTENSION_PATH = join( process.cwd(), 'build', 'chrome' );

/** Stands in for a GitHub page mentioning two users. */
const GITHUB_PAGE = `<!doctype html>
<html lang="en">
	<body style="color: rgb(1, 2, 3)">
		<a href="/swissspidy" data-hovercard-type="user"
			data-hovercard-url="/users/swissspidy/hovercard">swissspidy</a>
		<a href="/octocat" data-hovercard-type="user"
			data-hovercard-url="/users/octocat/hovercard">octocat</a>
		<span class="vcard-username">swissspidy</span>
		<ul class="vcard-details"></ul>
	</body>
</html>`;

let context: BrowserContext;
let page: Page;
let worker: Worker;
const pageErrors: string[] = [];

beforeAll( async () => {
	try {
		await access( join( EXTENSION_PATH, 'manifest.json' ) );
	} catch {
		throw new Error(
			`No build found at ${ EXTENSION_PATH }. Run \`npm run build\` first.`
		);
	}

	context = await chromium.launchPersistentContext(
		await mkdtemp( join( tmpdir(), 'wordpressers-on-github-' ) ),
		{
			// Extensions only load in the full browser, not in the headless
			// shell Playwright uses by default.
			channel: 'chromium',
			headless: true,
			args: [
				`--disable-extensions-except=${ EXTENSION_PATH }`,
				`--load-extension=${ EXTENSION_PATH }`,
			],
		}
	);

	const [ existing ] = context.serviceWorkers();
	worker = existing ?? ( await context.waitForEvent( 'serviceworker' ) );

	// WordPress.org is not reachable from a test run, so the background script
	// gets a stand-in that answers the way the lookup API does.
	await worker.evaluate( ( profile ) => {
		globalThis.fetch = async ( input: RequestInfo | URL ) => {
			const known = String( input ).endsWith( profile.slug );
			return new Response(
				JSON.stringify(
					known ? profile : { code: 'not_found', message: 'No user.' }
				),
				{ status: known ? 200 : 404 }
			);
		};
	}, PROFILE );

	await context.route( 'https://github.com/**', ( route ) =>
		route.fulfill( { body: GITHUB_PAGE, contentType: 'text/html' } )
	);

	page = await context.newPage();
	page.on( 'pageerror', ( error ) => pageErrors.push( error.message ) );
	await page.goto( 'https://github.com/WordPress/wordpress-develop' );
} );

afterAll( async () => {
	await context?.close();
} );

describe( 'the extension in Chrome', () => {
	const badges = () =>
		page.locator(
			`a[href="${ PROFILE.profile }"][aria-label="swissspidy"]`
		);

	it( 'badges a username with its WordPress.org profile', async () => {
		await badges().first().waitFor();

		expect( await badges().count() ).toBe( 1 );
	} );

	it( 'renders the logo in the page colour', async () => {
		const logo = badges().first().locator( 'svg' );
		await logo.waitFor();

		expect(
			await logo.evaluate( ( svg: SVGElement ) => ( {
				drawn: svg.getBoundingClientRect().width > 0,
				// `currentColor` only resolves to something once the mark is
				// really part of the page, which is the point of inlining it.
				fill: getComputedStyle( svg ).fill,
			} ) )
		).toEqual( { drawn: true, fill: 'rgb(1, 2, 3)' } );
	} );

	it( 'adds the profile link to the details list', async () => {
		const link = page.locator( 'ul.vcard-details a' ).first();
		await link.waitFor();

		expect( await link.textContent() ).toBe( `@${ PROFILE.slug }` );
		expect( await link.getAttribute( 'href' ) ).toBe( PROFILE.profile );
	} );

	it( 'leaves a user without a WordPress.org profile alone', async () => {
		expect(
			await page
				.locator( 'a[href="/octocat"] + a, a[href="/octocat"] a' )
				.count()
		).toBe( 0 );
	} );

	it( 'badges usernames added after the page loaded', async () => {
		await page.evaluate( () => {
			const mention = document.createElement( 'span' );
			mention.dataset.hovercardType = 'user';
			mention.dataset.hovercardUrl = '/users/swissspidy/hovercard';
			mention.textContent = 'swissspidy';
			document.body.appendChild( mention );
		} );

		await page.locator( 'span[data-hovercard-type="user"] a' ).waitFor();

		expect( await badges().count() ).toBe( 2 );
	} );

	it( 'resolves its name and description from the locale file', async () => {
		expect(
			await worker.evaluate( () => ( {
				name: chrome.i18n.getMessage( 'appTitle' ),
				description: chrome.i18n.getMessage( 'appDescription' ),
			} ) )
		).toEqual( {
			name: 'WordPressers on GitHub',
			description: 'Show WordPress.org profiles for users on GitHub.',
		} );
	} );

	it( 'runs without raising errors', () => {
		expect( pageErrors ).toEqual( [] );
	} );
} );
