/**
 * Additional types registered globally.
 */
declare global {
	interface Window {
		/**
		 * Native shell we provide for jellyfin-web to interact with Titan OS.
		 */
		NativeShell: any;

		/**
		 * Our loader plugin for jellyfin-web.
		 */
		TitanOsLoaderPlugin: any;
	}

	// Build variables
	interface ImportMeta {
		readonly env: {
			VERSION_NAME?: string;
		};
	}
}

export { };