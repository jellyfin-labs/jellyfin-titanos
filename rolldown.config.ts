import { defineConfig } from 'rolldown';
import { replacePlugin } from 'rolldown/plugins';

export default defineConfig({
	input: 'src/nativeshell.ts',
	output: {
		file: 'dist/nativeshell/jellyfin-titanos.js',
	},
	plugins: [
		replacePlugin({
			'import.meta.env.VERSION_NAME': `'${process.env.VERSION_NAME ?? ''}'`,
		}),
	],
});
