# WordPressers on GitHub

Show WordPress.org profiles for users on GitHub. Makes it very easy to find WordPress contributors on WordPress.org if they use different usernames on the two platforms.

Everywhere you see their username on GitHub, you'll see a small WordPress logo with a link to their WordPress.org profile next to it. Hover over the logo to quickly see their username in a tooltip. Similarly, visit someone's GitHub profile and a link to their WordPress.org profile will appear in their bio.

## Download

* [Download for 🦊 Firefox](https://addons.mozilla.org/en-US/firefox/addon/wordpressers-on-github/)
* [Download for Google Chrome](https://chromewebstore.google.com/detail/wordpressers-on-github/hgomfjikakokcbkjlfgodhklifiplmpg)
* (Safari version coming soon)

## Examples

<img width="365" alt="Single Commit" src="https://github.com/WordPress/wordpress-develop/assets/841956/b04ce814-1ad5-4a41-ac7a-f2ecf16fe66f">

<img width="383" alt="Pull Request" src="https://github.com/WordPress/wordpress-develop/assets/841956/c525b1c2-43bb-4ef1-b54e-275ad322470b">

<img width="354" alt="Profile" src="https://github.com/swissspidy/wordpressers-on-github/assets/841956/a0ff7fd6-8b09-4f28-87d3-1c5237e13fdb">

## Development

Both browser versions are built from a single TypeScript codebase in `src`, so
a fix only ever has to be made once.

| Path         | Contents                                                     |
|--------------|--------------------------------------------------------------|
| `src`        | Extension sources. `background.ts` and `content-script.ts` are the entry points, everything else lives in `src/lib`. |
| `assets`     | Icons and translations, copied into every build as-is.        |
| `manifests`  | `base.json` holds what both browsers share; `chrome.json` and `firefox.json` add what differs between Manifest V3 and V2. The version comes from `package.json`. |
| `scripts`    | Build tooling.                                                |
| `tests`      | Unit tests, plus an end-to-end test in `tests/e2e` that loads the built extension into Chromium. |

Install the dependencies with `npm install`, then:

```sh
npm run build       # Build both extensions into build/
npm run dev         # Same, rebuilding as files change
npm test            # Run the unit tests
npm run test:watch  # Run the unit tests as files change
npm run test:e2e    # Build, then run the extension in Chromium
npm run lint:js     # Lint
npm run lint:types  # Type-check
npm run format      # Format
```

The end-to-end test drives a real browser, so it needs one installed once:

```sh
npx playwright install chromium
```

### Running the development version

In Google Chrome:

1. Run `npm run build`.
2. Visit `chrome://extensions`.
3. Select `Developer mode` in the upper right corner.
4. Click on `Load unpacked`.
5. Select the `build/chrome` directory.
6. Visit a GitHub repository such as <https://github.com/WordPress/wordpress-develop/> and browse through pull requests.

In Firefox:

1. Run `npm run build`.
2. Visit `about:debugging#/runtime/this-firefox`.
3. Click on `Load Temporary Add-on…`.
4. Select the `build/firefox/manifest.json` file.
5. Visit a GitHub repository such as <https://github.com/WordPress/wordpress-develop/> and browse through pull requests.
