import { defineConfig } from 'rolldown';

export default defineConfig({
	input: 'src/nativeshell.ts',
	output: {
		file: 'dist/nativeshell/jellyfin-titanos.js',
	},
});
