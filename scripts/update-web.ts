import { exec, paths } from './_utils.ts';

const version = process.argv[2] ?? '';
if (!version || !version.startsWith('10'))
	throw new Error(`Invalid version ${version}`);

console.log(`Updating jellyfin-web to version ${version}`);

// Go to jellyfin-web directory
process.chdir(paths.jellyfinWeb);

// Checkout requested tag
await exec('git', 'checkout', `tags/v${version}`);
