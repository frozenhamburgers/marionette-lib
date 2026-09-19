//es modules in src/ get flattened here

import * as esbuild from 'esbuild';

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
	console.log('built dist/marionette.js');
}
