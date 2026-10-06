'use strict';
// Static checks for the single-page site. No dependencies. Exit code 1 on failure.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const css = read('style.css');
const js = read('script.js');
const failures = [];
const fail = msg => failures.push(msg);
const must = (ok, msg) => { if (!ok) fail(msg); };

// Structure
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
must(!dupes.length, `Duplicate IDs: ${[...new Set(dupes)].join(', ')}`);
must((html.match(/<h1[\s>]/g) || []).length === 1, 'Page must have exactly one <h1>');
must(/<html lang="en-GB">/.test(html), 'Missing lang="en-GB"');
must(/<title>[^<]+<\/title>/.test(html), 'Missing <title>');
must(/<meta name="description" content="[^"]+"/.test(html), 'Missing meta description');
must(/<meta name="robots" content="noindex, nofollow">/.test(html), 'Demo must be noindex, nofollow');
must(!/rel="canonical"|og:url|og:image/.test(html), 'No canonical/og:url/og:image until the real domain is known');

// Internal anchors
for (const [, target] of html.matchAll(/href="#([^"]*)"/g)) {
  if (target && !ids.includes(target)) fail(`Broken anchor: #${target}`);
}
for (const t of ['services', 'about', 'reviews', 'areas', 'faq', 'contact', 'quote-form', 'main']) {
  must(ids.includes(t), `Missing required anchor target #${t}`);
}

// Local assets (src, href, srcset)
const refs = new Set();
for (const [, v] of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) refs.add(v);
for (const [, v] of html.matchAll(/srcset="([^"]+)"/g)) v.split(',').forEach(s => refs.add(s.trim().split(/\s+/)[0]));
for (const ref of refs) must(fs.existsSync(path.join(root, ref)), `Missing local file: ${ref}`);
for (const [, v] of css.matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
  if (!/^(data:|https?:)/.test(v)) must(fs.existsSync(path.join(root, v)), `Missing CSS asset: ${v}`);
}

// Images, links, form
for (const tag of html.match(/<img\b[^>]*>/g) || []) {
  must(/\salt="/.test(tag), `Image without alt: ${tag.slice(0, 60)}`);
  must(/\swidth="\d+"/.test(tag) && /\sheight="\d+"/.test(tag), `Image without width/height: ${tag.slice(0, 60)}`);
}
for (const tag of html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || []) {
  must(/rel="noopener noreferrer"/.test(tag), `target=_blank without rel="noopener noreferrer": ${tag.slice(0, 70)}`);
}
for (const [, n] of html.matchAll(/href="tel:([^"]+)"/g)) must(n === '+447403556650', `Unexpected tel link: ${n}`);
const formTag = (html.match(/<form\b[^>]*>/) || [''])[0];
must(/novalidate/.test(formTag) && !/\saction=|\smethod=/.test(formTag), 'Demo form must have no action/method');
const options = [...html.matchAll(/<option value="([^"]*)">/g)].map(m => m[1]);
for (const [, s] of html.matchAll(/data-service="([^"]+)"/g)) must(options.includes(s), `data-service "${s}" has no matching <option>`);
for (const [, id] of html.matchAll(/aria-describedby="([^"]+)"/g)) {
  id.split(/\s+/).forEach(i => must(ids.includes(i), `aria-describedby points to missing id: ${i}`));
}

// Claim safety (visible text + metadata)
const text = html.replace(/<script[\s\S]*?<\/script>/g, '');
const banned = [/24\s*\/\s*7/i, /24[- ]hour/i, /emergency/i, /same[- ]day/i, /guarantee/i, /warrant(y|ies)/i, /gas safe/i,
  /years? of experience/i, /fully insured/i, /free (quote|estimate)/i, /aggregateRating/i, /application\/ld\+json/i, /£\s*\d/, /\d+\s*%\s*off/i];
for (const re of banned) must(!re.test(text), `Unverified claim pattern found: ${re}`);
must(/5\.0<span>\/ 5<\/span>/.test(html) && /554 reviews on <b>MyBuilder<\/b>/.test(html), 'MyBuilder rating/count markup changed');

// JavaScript: syntax, strict mode, and privacy rules for the demo form
try { execFileSync(process.execPath, ['--check', path.join(root, 'script.js')], { stdio: 'pipe' }); }
catch (e) { fail(`script.js syntax error: ${e.stderr}`); }
must(/^'use strict';/.test(js), 'script.js must start with strict mode');
for (const re of [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /localStorage/, /sessionStorage/, /document\.cookie/, /\bconsole\./, /WebSocket/, /indexedDB/]) {
  must(!re.test(js), `script.js must not use ${re}`);
}

// CSS sanity
must((css.match(/{/g) || []).length === (css.match(/}/g) || []).length, 'CSS braces are unbalanced');
must(/env\(safe-area-inset-bottom\)/.test(css), 'CSS must keep safe-area-inset-bottom support');
must(/prefers-reduced-motion/.test(css), 'CSS must keep prefers-reduced-motion handling');

if (failures.length) {
  console.error(`check: ${failures.length} problem(s)\n - ` + failures.join('\n - '));
  process.exit(1);
}
console.log(`check: OK (${ids.length} ids, ${refs.size} local refs, ${html.length + css.length + js.length} bytes of source)`);
