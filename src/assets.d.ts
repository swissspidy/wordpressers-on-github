/**
 * SVG assets are inlined into the bundle as markup by the build's `text`
 * loader, rather than being emitted as separate files.
 */
declare module '*.svg' {
	const markup: string;
	export default markup;
}
