import fs from 'node:fs/promises';
import { paths } from './_utils.ts';

try {
	await fs.rm(paths.dist, { recursive: true });
} catch {}
