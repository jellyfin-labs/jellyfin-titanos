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
const injection = `<script src="jellyfin-titanos.js" defer></script>`;
if (webIndexContent.includes('</head>')) {
	webIndexContent = webIndexContent.replace('</head>', `${injection}\n</head>`);
} else {
	webIndexContent = webIndexContent.replace(/<script/, `${injection}\n<script`);
}
// Save as web/index.html so the iframe can load it locally
await fs.mkdir(path.join(paths.distPackage, 'web'), { recursive: true });
await fs.writeFile(path.join(paths.distPackage, 'web', 'index.html'), webIndexContent);

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
