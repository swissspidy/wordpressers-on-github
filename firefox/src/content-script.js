/**
 * @type {browser.permissions.Permissions} permissions
 */
//let permissions = {
//	origins: [ 'https://github.com/*', 'https://profiles.wordpress.org/*' ],
//	permissions: [ 'storage' ],
//};
//
//const hasPermissions = await browser.permissions.contains( permissions );
//if ( ! hasPermissions ) {
//	await browser.permissions.request( permissions );
//}

const HAS_VISITED = 'wogHasVisited';

async function init() {
	const observer = new MutationObserver( ( mutations ) => {
		for ( const mutation of mutations ) {
			for ( const node of mutation.addedNodes ) {
				if ( node.nodeType !== Node.ELEMENT_NODE ) {
					continue;
				}
				findAndAddBadges( node );
			}
		}
	} );

	observer.observe( document.documentElement, {
		childList: true,
		subtree: true,
	} );

	await findAndAddBadges( document.documentElement );
}

if ( 'complete' === document.readyState ) {
	void init();
} else {
	window.addEventListener( 'load', async () => {
		await init();
	} );
}

async function findAndAddBadges( root ) {
	const loginMap = findGitHubLogins( root );
	const promises = [];
	for ( const login of Object.keys( loginMap ) ) {
		promises.push( addWordPressLogos( login, loginMap[ login ] ) );
	}

	await Promise.all( promises );
}

function findGitHubLogins( element ) {
	const loginMap = {};
	const cards = element.querySelectorAll( '[data-hovercard-type="user"]' );
	for ( const c of cards ) {
		if ( c.dataset[ HAS_VISITED ] ) {
			continue;
		}

		if ( ! c.textContent || c.textContent.trim().length === 0 ) {
			continue;
		}

		const url = c.dataset[ 'hovercardUrl' ];
		if ( ! url ) {
			continue;
		}

		const regex = new RegExp( '^/users/(.*)/hovercard' );
		if ( ! regex.test( url ) ) {
			continue;
		}

		const result = regex.exec( url );
		if ( ! result ) {
			continue;
		}

		const login = result[ 1 ].trim();
		if ( ! login ) {
			continue;
		}

		if ( ! loginMap[ login ] ) {
			loginMap[ login ] = [];
		}

		loginMap[ login ].push( c );
	}

	return loginMap;
}

async function addWordPressLogos( githubUsername, elements ) {
	const result = await lookupUser( githubUsername );
	if ( ! result || ! result.profile ) {
		return;
	}

	for ( const e of elements ) {
		addWordPressLogo( result.profile, e );
	}
}

function addWordPressLogo( url, element ) {
	if ( element.dataset[ HAS_VISITED ] ) {
		return;
	}

	const profileLink = document.createElement( 'a' );
	profileLink.target = '_blank';
	profileLink.setAttribute( 'href', url );

	const mark = document.createElement( 'img' );
	mark.src = browser.runtime.getURL( 'images/wp-logo.png' );
	mark.width = 12;
	mark.height = 12;
	mark.style.verticalAlign = 'middle';
	mark.style.marginLeft = '2px';
	profileLink.appendChild( mark );

	element.appendChild( profileLink );

	element.dataset[ HAS_VISITED ] = 'true';
}

/**
 * Look up a user by sending its information to the background script.
 *
 * @param {string} githubUsername
 * @return {Promise<{slug: string, url: string} | null>}
 */
async function lookupUser( githubUsername ) {
	const msg = {
		type: 'getUser',
		githubUsername,
	};
	return browser.runtime.sendMessage( msg );
}
