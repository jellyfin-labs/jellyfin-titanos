import fs from 'node:fs/promises';
import path from 'node:path';
import { exec, paths } from './_utils.ts';

// Remove current destination if it exists
try {
	await fs.rm(paths.distWeb, { recursive: true });
} catch {}

// Go to jellyfin-web directory
process.chdir(paths.jellyfinWeb);

// Install dependencies
await exec('npm', 'ci', '--no-audit', '--engine-strict=false');

// Create build
await exec('npm', 'run', 'build:production');

// Move web build to local dist folder
await fs.mkdir(path.dirname(paths.distWeb), { recursive: true });
await fs.rename(paths.jellyfinWebDist, paths.distWeb);
