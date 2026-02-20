import fs from 'node:fs/promises';
import path from 'node:path';
import { paths } from './_utils.ts';

// Remove current destination if it exists
try {
	await fs.rm(paths.distPackage, { recursive: true });
} catch {}

// Add jellyfin-web files
await fs.cp(paths.distWeb, paths.distPackage, { recursive: true });

// Add Titan OS nativeshell files
await fs.cp(paths.distNativeshell, paths.distPackage, { recursive: true });

// Patch jellyfin-web's index.html to inject the nativeshell BEFORE frontend overwrites it.
// This ensures the nativeshell script is present when jellyfin-web loads in the iframe,
// but NOT in the parent page (frontend's index.html replaces it next).
let webIndexContent = await fs.readFile(paths.distPackageIndex).then(buffer => buffer.toString());
// Inject nativeshell BEFORE jellyfin-web's scripts so it runs first in the defer queue.
// All jellyfin-web scripts use defer, and defer scripts execute in document order.
// Our script must set window.NativeShell before jellyfin-web's main bundle initializes.
const scriptInjection = `<script src="jellyfin-titanos.js" defer></script>`;
const cssInjection = `<link rel="stylesheet" href="css/titanOS.css" />`;
const injection = `${scriptInjection}\n${cssInjection}`;
webIndexContent = webIndexContent.replace(/<script/, `${injection}\n<script`);
// Save as app.html at the root (same level as JS/CSS chunks, no subdirectory needed).
// The frontend's iframe loads this file. Using a different name avoids collision with
// the frontend's index.html which gets copied next.
await fs.writeFile(path.join(paths.distPackage, 'app.html'), webIndexContent);

// Add TitanOS frontend files (entry point, styles)
// This overwrites the root index.html with the frontend's server selection page
const frontendDir = path.join(import.meta.dirname, '../frontend');
const packageDistDir = paths.distPackage;

try {
	await fs.cp(path.join(frontendDir, 'index.html'), path.join(packageDistDir, 'index.html'));
} catch (e) {
	console.log('No custom frontend index.html, using jellyfin-web');
}

try {
	await fs.cp(path.join(frontendDir, 'assets'), path.join(packageDistDir, 'assets'), { recursive: true });
} catch (e) {
	console.log('No frontend assets');
}

try {
	await fs.cp(path.join(frontendDir, 'css'), path.join(packageDistDir, 'css'), { recursive: true });
} catch (e) {
	console.log('No frontend css');
}

try {
	await fs.cp(path.join(frontendDir, 'js'), path.join(packageDistDir, 'js'), { recursive: true });
} catch (e) {
	console.log('No frontend js');
}

// Patch web config
const webConfigContent = await fs.readFile(paths.distPackageConfig).then(buffer => JSON.parse(buffer.toString()));
const srcConfigContent = await fs.readFile(paths.overridePackageConfig).then(buffer => JSON.parse(buffer.toString()));
const mergedConfigContent = { ...webConfigContent, ...srcConfigContent };
await fs.writeFile(paths.distPackageConfig, JSON.stringify(mergedConfigContent, undefined, '\t'));
