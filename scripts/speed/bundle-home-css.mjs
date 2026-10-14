#!/usr/bin/env node
// Joins the home page's style sheets into one file, in the order the page used to load them,
// so a phone downloads one file before the first paint instead of eight. Looks identical.
// Run it after changing any of these files:  node scripts/speed/bundle-home-css.mjs
// then  node scripts/speed/critical-css.mjs  (the first-screen styles inline in site/index.html) and bump ?v= on home.bundle.css in site/index.html.
// Other pages still load the separate files, so only the home page needs this.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const css = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'site', 'assets', 'css');
const parts = ['fonts', 'base', 'case', 'case-plus', 'whats-in-my-fridge', 'home-extra', 'type', 'jb-credit'];
const out = parts.map(p => `/* ===== ${p}.css ===== */\n` + fs.readFileSync(path.join(css, p + '.css'), 'utf8').trim()).join('\n\n');
fs.writeFileSync(path.join(css, 'home.bundle.css'),
  `/* Made by scripts/speed/bundle-home-css.mjs from ${parts.map(p => p + '.css').join(', ')}. Edit those, then run it again. */\n\n${out}\n`);
console.log(`home.bundle.css: ${parts.length} files, ${Math.round(out.length / 1024)} KB`);
