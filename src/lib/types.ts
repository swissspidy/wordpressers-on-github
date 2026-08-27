/**
 * A WordPress.org profile as returned by the lookup API.
 */
export interface WordPressProfile {
	/** WordPress.org user login, e.g. `swissspidy`. */
	slug: string;
	/** Absolute URL of the WordPress.org profile page. */
	profile: string;
}

/**
 * Message sent from the content script to the background script to resolve a
 * GitHub login into a WordPress.org profile.
 */
export interface GetUserMessage {
	type: 'getUser';
	githubUsername: string;
}

/**
 * Looks up the WordPress.org profile for a GitHub login.
 *
 * Resolves with `null` when the login has no known profile.
 */
export type ProfileLookup = (
	githubUsername: string
) => Promise< WordPressProfile | null >;
