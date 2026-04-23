import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const locations = [
  join(import.meta.dirname, '..', 'node_modules', 'srvx', 'dist', '_chunks', '_url.mjs'),
  join(import.meta.dirname, '..', '.vercel', 'output', 'functions', '__fallback.func', 'node_modules', 'srvx', 'dist', '_chunks', '_url.mjs'),
];

let patched = 0;

for (const filePath of locations) {
  if (!existsSync(filePath)) {
    console.log(`[patch-srvx] File not found: ${filePath}`);
    continue;
  }

  let content = readFileSync(filePath, 'utf-8');

  const oldCode = 'const pathnameIndex = protoIndex === -1 ? -1 : url.indexOf("/", protoIndex + 4);';
  const newCode = 'const pathnameIndex = protoIndex === -1 ? 0 : url.indexOf("/", protoIndex + 4);';

  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    writeFileSync(filePath, content, 'utf-8');
    console.log(`[patch-srvx] Patched: ${filePath}`);
    patched++;
  } else if (content.includes(newCode)) {
    console.log(`[patch-srvx] Already patched: ${filePath}`);
  } else {
    console.log(`[patch-srvx] Unknown state: ${filePath}`);
  }
}

if (patched === 0) {
  console.log('[patch-srvx] Warning: No files were patched!');
}
