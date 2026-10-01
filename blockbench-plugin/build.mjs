//es modules in src/ get flattened here

import * as esbuild from 'esbuild';
import { copyFileSync } from 'node:fs';

const watch = process.argv.includes('--watch');

const options = {
	entryPoints: ['src/index.js'],
	outfile: 'dist/marionette.js',
	bundle: true,
	format: 'iife',
	target: 'es2022',
	platform: 'browser',
	charset: 'utf8',
	legalComments: 'inline',
	banner: {
		js: '// Marionette plugin for Blockbench -- built from src/, do not edit dist/ by hand.',
	},
};

if (watch) {
	const ctx = await esbuild.context(options);
	await ctx.watch();
	console.log('watching src/ ...');
} else {
	await esbuild.build(options);
	copyAbout();
	console.log('built dist/marionette.js');
}

// Plugin.fetchAbout reads about.md from beside the loaded js, so the About tab stays empty without this
function copyAbout() {
	copyFileSync('about.md', 'dist/about.md');
}
