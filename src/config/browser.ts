/**
 * Chromium version detection for Titan OS TVs.
 *
 * Known platform versions:
 *   2020-2022 (Philips): Chrome 84
 *   2023-2024 (Philips): Chrome 112
 *   2025-2026 (Philips/JVC): Chromium 122
 *
 * Chrome 84 is missing: Promise.any, String.replaceAll, logical assignment
 * operators (??=, ||=, &&=), Array.at(), structuredClone, CSS aspect-ratio.
 */

export interface BrowserInfo {
	chromeMajor: number;
	userAgent: string;
	/** Titan OS model year extracted from user agent (e.g. "2025"), if available */
	modelYear: string | null;
}

/** Parse the Chrome major version from the user agent string. */
export function detectBrowser(): BrowserInfo {
	const ua = navigator.userAgent;
	const chromeMatch = ua.match(/Chrome\/(\d+)/);
	const chromeMajor = chromeMatch ? parseInt(chromeMatch[1], 10) : 0;

	// Titan OS user agents contain the model year in patterns like TV_MODEL_2025
	const yearMatch = ua.match(/TV_\w+_(\d{4})/) || ua.match(/_TV__(\d{4})/);
	const modelYear = yearMatch ? yearMatch[1] : null;

	return { chromeMajor, userAgent: ua, modelYear };
}

/** Check if the browser supports Chrome 85+ features (replaceAll, Promise.any, etc.) */
export function supportsChrome85(info: BrowserInfo): boolean {
	return info.chromeMajor >= 85;
}

/** Check if the browser supports Chrome 112+ features (CSS nesting, :has(), etc.) */
export function supportsChrome112(info: BrowserInfo): boolean {
	return info.chromeMajor >= 112;
}
