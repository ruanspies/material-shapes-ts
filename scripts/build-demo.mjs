/*
 * Builds the self-contained demo gallery/playground.
 *
 * Bundles the compiled library (dist/index.js) into a single IIFE exposing the
 * global `MS`, inlines it with the demo styles/markup/app, and writes:
 *   - demo/index.html        a full, self-contained page (opens on file://)
 *   - demo/artifact.html     body-only content (for hosting as an Artifact)
 *
 * Run `npm run build` first, then `npm run build:demo`.
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const result = await build({
  entryPoints: [join(root, 'dist/index.js')],
  bundle: true,
  format: 'iife',
  globalName: 'MS',
  minify: true,
  write: false,
});
const bundle = result.outputFiles[0].text;

const css = read('demo/src/styles.css');
const markup = read('demo/src/markup.html');
const app = read('demo/src/app.js');

const body =
  `<style>\n${css}\n</style>\n` +
  `${markup}\n` +
  `<script>${bundle}</script>\n` +
  `<script>\n${app}\n</script>\n`;

const fullPage =
  `<!doctype html>\n<html lang="en">\n<head>\n` +
  `<meta charset="utf-8" />\n` +
  `<meta name="viewport" content="width=device-width, initial-scale=1" />\n` +
  `<title>Material Shapes — gallery & morph playground</title>\n` +
  `</head>\n<body>\n${body}</body>\n</html>\n`;

writeFileSync(join(root, 'demo/index.html'), fullPage);
writeFileSync(join(root, 'demo/artifact.html'), body);
console.log(`demo/index.html    ${(fullPage.length / 1024).toFixed(1)} kb`);
console.log(`demo/artifact.html ${(body.length / 1024).toFixed(1)} kb`);
