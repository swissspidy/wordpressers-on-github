import { beforeEach, vi } from 'vitest';

beforeEach( () => {
	// Nothing in the unit tests may reach the network: a test that forgets to
	// stub `fetch` should fail loudly rather than quietly calling
	// WordPress.org and passing or failing depending on what it answers.
	vi.stubGlobal(
		'fetch',
		vi.fn( async () => {
			throw new Error(
				'Unit tests must not reach the network. Stub `fetch` instead.'
			);
		} )
	);
} );
