#!/usr/bin/env node
// Puts the styles the home page's first screen needs inline in site/index.html, so a phone can paint straight away.
//
// It opens index.html in a hidden Chrome at phone, tablet and desktop sizes, finds the parts of the page that show
// on the first screen, and copies every rule from home.bundle.css that styles them (in the same order) into the
// <style id="critical"> between the "critical css" markers. Everything else on the page is hidden while
// <html> has the class css-wait; the full home.bundle.css loads at the end of <body> and the line after it
// removes css-wait, so nothing ever shows unstyled and the scripts still run after all the styles are in.
//
// Run after changing the home page or any of its styles, after  node scripts/speed/bundle-home-css.mjs :
//   node scripts/speed/critical-css.mjs
// Needs Google Chrome (CHROME=… to point elsewhere). Node 24, nothing to install.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'site');
const home = path.join(site, 'index.html');
const SIZES = [[390, 844, true], [768, 1024, true], [1440, 900, false]];
const sleep = ms => new Promise(r => setTimeout(r, ms));

// a small static server for the site folder
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(site, p);
  if (!f.startsWith(site) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

// hidden Chrome, driven over its DevTools connection
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'wimf-critical-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run', '--no-default-browser-check',
  '--disable-component-update', '--disable-background-networking', '--disable-sync', '--disable-default-apps',
  `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const done = async code => {
  try { chrome.kill(); } catch {}
  server.close();
  await sleep(800);   // let Chrome let go of its profile folder
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(code);
};
try {
  const browserWs = await new Promise((res, rej) => {
    let buf = ''; chrome.stderr.on('data', d => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) res(m[1]); });
    setTimeout(() => rej(new Error('Chrome did not start')), 20000);
  });
  const target = await (await fetch(`http://${new URL(browserWs).host}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }); });
  let seq = 0; const pending = new Map(), waiting = [];
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
    else if (m.method) for (const w of waiting.filter(w => w.method === m.method)) { waiting.splice(waiting.indexOf(w), 1); w.res(); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
  const next = method => new Promise(res => waiting.push({ method, res }));
  const run = async expression => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const size = ([width, height, mobile]) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });

  await send('Page.enable');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await size(SIZES[0]);
  const loaded = next('Page.loadEventFired');
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
  await loaded; await sleep(2500);
  await run(`(${IN_PAGE_FN})()`);
  for (const s of SIZES) { await size(s); await sleep(1200); await run('scrollTo(0, 0); __scan()'); }
  const { css, hide, kept, total } = await run('__extract()');

  const block = `<!-- critical css: start -->\n  <style id="critical">/* first-screen styles, made by scripts/speed/critical-css.mjs from home.bundle.css: don't edit by hand */\n${css}\n/* the rest of the page waits for home.bundle.css */\nhtml.css-wait :is(${hide.join(', ')}) { display: none !important; }\n</style>\n  <!-- critical css: end -->`;
  let html = fs.readFileSync(home, 'utf8');
  const re = /<!-- critical css: start -->[\s\S]*?<!-- critical css: end -->/;
  if (!re.test(html)) throw new Error('No critical css markers in index.html');
  fs.writeFileSync(home, html.replace(re, () => block));
  console.log(`index.html: ${kept} of ${total} rules inline (${Math.round(css.length / 1024)} KB); ${hide.length} parts of the page wait for the full styles`);
  await done(0);
} catch (e) { console.error(e.message); await done(1); }

// ---------- runs inside the page ----------
function IN_PAGE_FN() {
  window.__keep = new Set();
  // the parts of the page (children of <body>, and of <main>) that show on the first screen at any of the sizes,
  // with 15% spare below the fold: before the scripts run the page can sit a little higher
  window.__scan = () => {
    const vh = innerHeight, vw = innerWidth;
    window.__tops = [...document.body.children].flatMap(c => c.tagName === 'MAIN' ? [...c.children] : [c])
      .filter(c => !['SCRIPT', 'STYLE', 'LINK', 'NOSCRIPT', 'TEMPLATE'].includes(c.tagName));
    for (const c of __tops) {
      const shows = [c, ...c.querySelectorAll('*')].some(e => { const r = e.getBoundingClientRect(); return (r.width > 0 || r.height > 0) && r.bottom > 0 && r.top < vh * 1.15 && r.right > 0 && r.left < vw; });
      if (shows) __keep.add(c);
    }
    return __keep.size;
  };
  window.__extract = () => {
    // and the section straight after the first screen, whose top edge can peek in before the scripts run
    const kids = [...document.querySelector('main').children], last = Math.max(...kids.map((c, i) => __keep.has(c) ? i : -1));
    if (kids[last + 1]) __keep.add(kids[last + 1]);
    const html = document.documentElement, main = document.querySelector('main');
    const V = new Set([html, document.body, main]);
    for (const c of __keep) { V.add(c); c.querySelectorAll('*').forEach(e => V.add(e)); }
    const els = [...V];
    const strip = s => s.replace(/::?(before|after|placeholder|selection|marker|backdrop|first-letter|first-line|file-selector-button|-webkit-[a-z-]+|-moz-[a-z-]+)/g, '')
      .replace(/:(hover|focus-visible|focus-within|focus|active|visited|target|checked|disabled|enabled|invalid|valid|placeholder-shown|empty|link|any-link)(\([^)]*\))?/g, '');
    const hits = sel => {
      const s = strip(sel).trim();
      if (!s || /^(:root|html|body|\*)$/.test(s)) return true;
      try {
        if (els.some(e => e.matches(s))) return true;
        const had = html.classList.contains('no-js'); html.classList.add('no-js');   // the first paint is before the scripts run
        const hit = els.some(e => e.matches(s)); if (!had) html.classList.remove('no-js'); return hit;
      } catch { return true; }
    };
    const sheet = [...document.styleSheets].find(s => (s.href || '').includes('home.bundle.css'));
    let kept = 0, total = 0; const frames = [];
    const ser = rules => [...rules].map(r => {
      if (r instanceof CSSStyleRule) { total++; if (r.selectorText.split(',').some(hits)) { kept++; return r.cssText; } return ''; }
      if (r instanceof CSSKeyframesRule) { frames.push(r); return `/*@kf:${r.name}*/`; }
      if (r.cssRules) { const inner = ser(r.cssRules); return inner.replace(/\/\*@kf:[^*]+\*\//g, '').trim() ? `${r.cssText.slice(0, r.cssText.indexOf('{')).trim()} {\n${inner}\n}` : ''; }
      return r.cssText;   // @font-face, @property and the like
    }).filter(Boolean).join('\n');
    let css = ser(sheet.cssRules);
    // keep only the keyframes the kept rules use
    css = css.replace(/\/\*@kf:([^*]+)\*\//g, (m, name) => new RegExp(`(animation(-name)?\\s*:[^;}]*\\b${name.replace(/[-]/g, '\\-')}\\b)`).test(css) ? frames.find(f => f.name === name).cssText : '');
    css = css.replace(/url\((["']?)\.\.\//g, 'url($1assets/').replace(/\n{2,}/g, '\n');
    // never hide an <svg> (the icon sprite): icons that use its gradients would break while it's hidden
    const hide = __tops.filter(c => !__keep.has(c) && c.tagName.toLowerCase() !== 'svg').map(c => c.id ? `#${CSS.escape(c.id)}`
      : `${c.parentElement === document.body ? 'body' : 'main'} > :nth-child(${[...c.parentElement.children].indexOf(c) + 1})`);
    return { css, hide, kept, total };
  };
}
