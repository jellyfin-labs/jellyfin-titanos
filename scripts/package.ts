import fs from 'node:fs/promises';
import { paths } from './_utils.ts';

// Remove current destination if it exists
try {
	await fs.rm(paths.distPackage, { recursive: true });
} catch {}

// Add jellyfin-web files
await fs.cp(paths.distWeb, paths.distPackage, { recursive: true });

// Add Titan OS nativeshell files
await fs.cp(paths.distNativeshell, paths.distPackage, { recursive: true });

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
