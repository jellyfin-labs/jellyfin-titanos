import { spawn } from 'node:child_process';
import path from 'node:path';

export const paths = {
	jellyfinWeb: path.join(import.meta.dirname, '../jellyfin-web'),
	jellyfinWebDist: path.join(import.meta.dirname, '../jellyfin-web/dist'),
	dist: path.join(import.meta.dirname, '../dist'),
	distWeb: path.join(import.meta.dirname, '../dist/web'),
	distNativeshell: path.join(import.meta.dirname, '../dist/nativeshell'),
	distPackage: path.join(import.meta.dirname, '../dist/package'),
	distPackageIndex: path.join(import.meta.dirname, '../dist/package/index.html'),
};

export async function exec(cmd: string, ...params: string[]): Promise<void> {
	const groupName = `${cmd} ${params.join(' ')}`;
	console.group(groupName);

	try {
		await new Promise<void>((resolve, reject) => {
			const childProcess = spawn(cmd, params, { stdio: 'inherit' });

			childProcess.on('error', (err) => reject(err));

			childProcess.on('exit', (code) => {
				if (code === 0) resolve();
				else reject(new Error(`Command exited with code ${code}`));
			});
		});
	} finally {
		console.groupEnd();
	}
}
