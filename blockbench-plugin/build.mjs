//es modules in src/ get flattened here

import * as esbuild from 'esbuild';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { extname } from 'node:path';

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
	buildAssets();
	console.log('built dist/marionette.js');
}

function buildAssets() {
	writeFileSync('dist/about.md', inlineImages(readFileSync('about.md', 'utf8')));
	copyFileSync('logo.png', 'dist/logo.png');
}

function inlineImages(markdown) {
	return markdown.replace(/!\[([^\]]*)\]\((?!\w+:)([^)]+)\)/g, (whole, alt, file) => {
		const types = {
			'.png': 'image/png', '.svg': 'image/svg+xml',
			'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
		};
		const type = types[extname(file).toLowerCase()];
		if (!type) throw new Error(`about.md references ${file}, which is not an inlinable image`);
		return `![${alt}](data:${type};base64,${readFileSync(file).toString('base64')})`;
	});
}
