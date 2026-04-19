#!/usr/bin/env node

import { existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 Checking build output...');

const requiredPaths = [
  '.output/server/index.mjs',
  '.output/public',
  'dist/client/_build'
];

let allExists = true;

for (const path of requiredPaths) {
  if (existsSync(path)) {
    console.log(`✅ ${path} exists`);
  } else {
    console.error(`❌ ${path} does not exist`);
    allExists = false;
  }
}

// Check if this is a production build
const isProduction = process.env.NODE_ENV === 'production';
console.log(`\n🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
console.log(`🔄 NITRO_PRESET: ${process.env.NITRO_PRESET || 'not set'}`);

if (!allExists) {
  console.error('\n🚨 Build output incomplete. Deployment cannot proceed.');
  console.log('\nPossible solutions:');
  console.log('1. Run `bun run build` locally to verify build works');
  console.log('2. Check for build errors in the logs');
  console.log('3. Ensure NODE_ENV=production is set during build');
  process.exit(1);
}

console.log('\n✅ Build output validation passed.');
console.log('🚀 Ready for deployment!');