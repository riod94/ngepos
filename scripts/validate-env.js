#!/usr/bin/env node

const requiredEnvVars = [
  'DATABASE_URL',
  'AUTH_SECRET',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'APP_URL'
];

const optionalEnvVars = [
  'NODE_ENV',
  'NITRO_PRESET',
  'PORT'
];

function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  let hasError = false;
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ Missing required environment variable: ${envVar}`);
      hasError = true;
    } else {
      console.log(`✅ ${envVar} is set`);
    }
  }
  
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      console.log(`⚪ ${envVar} is set to: ${process.env[envVar]}`);
    } else {
      console.log(`⚪ ${envVar} is not set (optional)`);
    }
  }
  
  if (hasError) {
    console.error('\n🚨 Missing required environment variables. Deployment cannot proceed.');
    process.exit(1);
  }
  
  console.log('\n✅ All required environment variables are present.');
  
  if (process.env.NITRO_PRESET === 'vercel') {
    console.log('🚀 Vercel deployment detected');
  } else if (process.env.NITRO_PRESET === 'node-server') {
    console.log('🖥️  Node.js server deployment detected');
  }
}

validateEnvironment();