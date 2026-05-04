import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

// SRVX patches (dev + Vercel)
const SRVX_LOCATIONS = [
  join(ROOT, 'node_modules', 'srvx', 'dist', '_chunks', '_url.mjs'),
  join(ROOT, '.vercel', 'output', 'functions', '__fallback.func', 'node_modules', 'srvx', 'dist', '_chunks', '_url.mjs'),
];

// Build output locations (Vercel + Nitro local)
const ENTRY_MJS_LOCATIONS = [
  join(ROOT, '.vercel', 'output', 'functions', '__fallback.func', 'chunks', 'virtual', 'entry.mjs'),
  join(ROOT, '.output', 'server', 'chunks', 'virtual', 'entry.mjs'),
];
const NITRO_MJS_LOCATIONS = [
  join(ROOT, '.vercel', 'output', 'functions', '__fallback.func', 'chunks', 'nitro', 'nitro.mjs'),
  join(ROOT, '.output', 'server', 'chunks', 'nitro', 'nitro.mjs'),
];

let patched = 0;

// === 1. Patch srvx FastURL#getPos() ===
const SRVX_OLD = 'const pathnameIndex = protoIndex === -1 ? -1 : url.indexOf("/", protoIndex + 4);';
const SRVX_NEW = 'const pathnameIndex = protoIndex === -1 ? 0 : url.indexOf("/", protoIndex + 4);';

for (const filePath of SRVX_LOCATIONS) {
  if (!existsSync(filePath)) continue;
  let content = readFileSync(filePath, 'utf-8');
  if (content.includes(SRVX_OLD)) {
    content = content.replace(SRVX_OLD, SRVX_NEW);
    writeFileSync(filePath, content, 'utf-8');
    console.log(`[patch] srvx OK: ${filePath}`);
    patched++;
  } else if (content.includes(SRVX_NEW)) {
    console.log(`[patch] srvx already patched: ${filePath}`);
  } else {
    console.log(`[patch] srvx unknown state: ${filePath}`);
  }
}

// === 2. Inject global URL polyfill into entry.mjs ===
// The URL constructor throws when given a relative path like '/'
// On Vercel/Nitro, event.request.url is just '/' — new URL('/') → TypeError
// This polyfill prepends a dummy host when no base is provided and url starts with '/'

const URL_POLYFILL = `
/* __URL_PATCH__: handle relative URLs (server sends path-only request.url) */
(function(){const U=globalThis.URL;if(typeof U._P==='number')return;const F=function(u,b){return b===void 0&&typeof u==='string'&&u.charCodeAt(0)===47?new U('http://n'+u):new U(u,b)};F.prototype=U.prototype;for(const k of Object.getOwnPropertyNames(U)){try{if(k!=='prototype'&&k!=='length'&&k!=='name')F[k]=U[k]}catch(e){}}globalThis.URL=F;Object.defineProperty(U,'_P',{value:1,writable:false})})();
`;

for (const entryMjs of ENTRY_MJS_LOCATIONS) {
  if (existsSync(entryMjs)) {
    let content = readFileSync(entryMjs, 'utf-8');
    if (content.includes('/* __URL_PATCH__ */')) {
      console.log('[patch] entry.mjs URL polyfill already injected');
    } else {
      // Insert after the last import statement
      const lastImportIdx = content.lastIndexOf("import ");
      if (lastImportIdx !== -1) {
        const afterSemicolon = content.indexOf(';', lastImportIdx);
        if (afterSemicolon !== -1) {
          const insertPos = afterSemicolon + 1;
          content = content.slice(0, insertPos) + URL_POLYFILL + content.slice(insertPos);
          writeFileSync(entryMjs, content, 'utf-8');
          console.log(`[patch] entry.mjs URL polyfill injected at position ${insertPos}`);
          patched++;
        }
      }
    }
    break; // Stop after first found
  }
}

// === 3. Patch new URL(event.request.url) in entry.mjs & nitro.mjs ===
// Entry.mjs
for (const entryMjs of ENTRY_MJS_LOCATIONS) {
  if (existsSync(entryMjs)) {
    let content = readFileSync(entryMjs, 'utf-8');

    // Pattern: const url = new URL(event.request.url);
    const PATTERN = /const url = new URL\(event\.request\.url\);/g;
    const REPLACEMENT = 'const url = new URL(event.request.url.startsWith("http") ? event.request.url : "http://_.local" + event.request.url);';
    let count = 0;
    content = content.replace(PATTERN, (m) => { count++; return REPLACEMENT; });
    if (count > 0) {
      writeFileSync(entryMjs, content, 'utf-8');
      console.log(`[patch] entry.mjs patched ${count} new URL(event.request.url) call(s)`);
      patched++;
    }
    break;
  }
}

// Nitro.mjs
for (const nitroMjs of NITRO_MJS_LOCATIONS) {
  if (existsSync(nitroMjs)) {
    let content = readFileSync(nitroMjs, 'utf-8');

    const PATTERN = /const url = new URL\(event\.url\);/g;
    const REPLACEMENT = 'const url = new URL(event.url.startsWith("http") ? event.url : "http://_.local" + event.url);';
    let count = 0;
    content = content.replace(PATTERN, (m) => { count++; return REPLACEMENT; });
    if (count > 0) {
      writeFileSync(nitroMjs, content, 'utf-8');
      console.log(`[patch] nitro.mjs patched ${count} new URL(event.url) call(s)`);
      patched++;
    }
    break;
  }
}

if (patched === 0) {
  console.log('[patch] Warning: No files were patched!');
} else {
  console.log(`[patch] Done. ${patched} file(s) patched.`);
}
