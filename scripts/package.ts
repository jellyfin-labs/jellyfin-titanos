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

// Add TitanOS frontend files (entry point, styles)
const frontendDir = path.join(import.meta.dirname, '../frontend');
const packageDistDir = paths.distPackage;

// Copy frontend HTML to root (replaces jellyfin-web's index.html)
try {
	await fs.cp(path.join(frontendDir, 'index.html'), path.join(packageDistDir, 'index.html'));
} catch (e) {
	console.log('No custom frontend index.html, using jellyfin-web');
}

// Copy frontend assets
try {
	await fs.cp(path.join(frontendDir, 'assets'), path.join(packageDistDir, 'assets'), { recursive: true });
} catch (e) {
	console.log('No frontend assets');
}

// Copy frontend CSS
try {
	await fs.cp(path.join(frontendDir, 'css'), path.join(packageDistDir, 'css'), { recursive: true });
} catch (e) {
	console.log('No frontend css');
}

// Copy frontend JS
try {
	await fs.cp(path.join(frontendDir, 'js'), path.join(packageDistDir, 'js'), { recursive: true });
} catch (e) {
	console.log('No frontend js');
}

// Patch index file to inject the nativehsell
let indexContent = await fs.readFile(paths.distPackageIndex).then(buffer => buffer.toString());
indexContent = indexContent.replace(/<script/, (match) => {
	const injection = `<script src="jellyfin-titanos.js" defer></script>`;
	return injection + match;
});
await fs.writeFile(paths.distPackageIndex, indexContent);

// Patch web config
const webConfigContent = await fs.readFile(paths.distPackageConfig).then(buffer => JSON.parse(buffer.toString()));
const srcConfigContent = await fs.readFile(paths.overridePackageConfig).then(buffer => JSON.parse(buffer.toString()));
const mergedConfigContent = { ...webConfigContent, ...srcConfigContent };
await fs.writeFile(paths.distPackageConfig, JSON.stringify(mergedConfigContent, undefined, '\t'));
