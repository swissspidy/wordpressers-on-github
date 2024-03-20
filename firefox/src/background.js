async function checkCache( githubUsername ) {
	const cache = await self.caches.open( 'wordpressers-on-github' );
	const req = new Request(
		`https://profiles.wordpress.org/wp-json/wporg-github/v1/lookup/${ githubUsername }`
	);
	const response = await cache.match( req );
	if ( response ) {
		return response.json();
	}
	return null;
}

/**
 * Store data in cache.
 *
 * @param {string} githubUsername
 * @param {slug: string, profile:string} data
 * @return {Promise<void>}
 */
async function cacheData( githubUsername, data ) {
	const cache = await self.caches.open( 'wordpressers-on-github' );
	const req = new Request(
		`https://profiles.wordpress.org/wp-json/wporg-github/v1/lookup/${ githubUsername }`
	);
	let expireTime = Date.now() + 60 * 60 * 1000;
	if ( data ) {
		expireTime = Date.now() + 24 * 60 * 60 * 1000;
	}
	const resp = {
		data,
		expire: expireTime,
	};
	await cache.put( req, new Response( JSON.stringify( resp ) ) );
}

async function getUserFromCache( githubUsername ) {
	const result = await checkCache( githubUsername );
	if ( result ) {
		const ttl = result.expire - Date.now();
		if ( ttl > 0 ) {
			return result.slug;
		}
	}
	return null;
}

/**
 * Fetch user information from WordPress.org API.
 *
 * @param {string} githubUsername
 * @returns {Promise<{slug: string, profile: string}|{code: string, message: string}>}
 */
async function getUserRemote( githubUsername ) {
	const url = `https://profiles.wordpress.org/wp-json/wporg-github/v1/lookup/${ githubUsername }`;
	const res = await fetch( url, { credentials: 'include', mode: 'cors' } );
	if ( ! res.ok ) {
		throw new Error( 'Unable to lookup GitHub user login.' );
	}

	/**
	 * API result.
	 *
	 * @type {{slug: string, profile:string}|{code: string, message:string}}
	 */
	const data = await res.json();

	if ( ! data.slug ) {
		return null;
	}

	return data;
}

async function getUser( githubUsername ) {
	if ( ! githubUsername ) {
		return null;
	}

	const cachedResult = await getUserFromCache( githubUsername );
	if ( cachedResult ) {
		return cachedResult;
	}

	const data = await getUserRemote( githubUsername );
	await cacheData( githubUsername, data || null );
	return data;
}

browser.runtime.onMessage.addListener( ( message ) => {
	if ( ! message || ! message.type ) {
		return undefined;
	}

	if ( message.type === 'getUser' ) {
		return getUser( message.githubUsername );
	}

	return undefined;
} );
