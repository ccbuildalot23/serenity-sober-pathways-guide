#!/usr/bin/env node

/**
 * Vercel Environment Validation Script
 * Checks that all required environment variables are configured
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('\n🔍 Validating Vercel Environment Configuration...\n');

// Required environment variables
const requiredVars = {
  production: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'VITE_ENCRYPTION_MASTER_KEY',
    'APP_STORE_CONNECT_API_KEY_ID',
    'APP_STORE_CONNECT_ISSUER_ID',
    'APPLE_ID',
    'APPLE_TEAM_ID',
    'NODE_ENV',
    'VITE_APP_ENV'
  ],
  optional: [
    'VITE_SENTRY_DSN',
    'SENTRY_AUTH_TOKEN',
    'P12_PASSWORD'
  ]
};

// Check if Vercel CLI is logged in
try {
  execSync('vercel whoami', { stdio: 'pipe' });
  console.log('✅ Vercel CLI authenticated\n');
} catch (error) {
  console.error('❌ Not logged in to Vercel. Run: vercel login');
  process.exit(1);
}

// Pull environment variables
console.log('Fetching production environment variables...');
try {
  execSync('vercel env pull .env.production.local --environment=production', { 
    stdio: 'pipe' 
  });
  console.log('✅ Environment variables pulled\n');
} catch (error) {
  console.error('❌ Failed to pull environment variables');
  console.error('Make sure you have linked your project: vercel link');
  process.exit(1);
}

// Read and validate variables
const envFile = '.env.production.local';
if (!fs.existsSync(envFile)) {
  console.error('❌ Environment file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envFile, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2];
  }
});

// Check required variables
console.log('Checking required variables:');
let missingRequired = [];
requiredVars.production.forEach(varName => {
  if (envVars[varName] && envVars[varName] !== 'undefined') {
    console.log(`  ✅ ${varName}: Configured`);
  } else {
    console.log(`  ❌ ${varName}: MISSING`);
    missingRequired.push(varName);
  }
});

console.log('\nChecking optional variables:');
requiredVars.optional.forEach(varName => {
  if (envVars[varName] && envVars[varName] !== 'undefined') {
    console.log(`  ✅ ${varName}: Configured`);
  } else {
    console.log(`  ⚠️  ${varName}: Not configured (optional)`);
  }
});

// Security checks
console.log('\n🔒 Security Validation:');

// Check encryption key length
if (envVars.VITE_ENCRYPTION_MASTER_KEY) {
  const keyLength = envVars.VITE_ENCRYPTION_MASTER_KEY.length;
  if (keyLength >= 64) {
    console.log(`  ✅ Encryption key: Strong (${keyLength} characters)`);
  } else {
    console.log(`  ⚠️  Encryption key: Weak (${keyLength} characters, recommend 64+)`);
  }
}

// Check for test/dev values in production
const testPatterns = ['test', 'demo', 'example', 'localhost', '0123456789'];
let securityWarnings = [];

Object.entries(envVars).forEach(([key, value]) => {
  testPatterns.forEach(pattern => {
    if (value && value.toLowerCase().includes(pattern)) {
      securityWarnings.push(`${key} contains '${pattern}'`);
    }
  });
});

if (securityWarnings.length > 0) {
  console.log('  ⚠️  Potential test values detected:');
  securityWarnings.forEach(warning => {
    console.log(`     - ${warning}`);
  });
} else {
  console.log('  ✅ No test values detected');
}

// Clean up
fs.unlinkSync(envFile);

// Summary
console.log('\n========================================');
console.log('  VALIDATION SUMMARY');
console.log('========================================\n');

if (missingRequired.length === 0) {
  console.log('✅ All required environment variables are configured!');
  console.log('\n🎉 Your Vercel environment is ready for production!');
  
  if (!envVars.VITE_SENTRY_DSN) {
    console.log('\n📝 Next step: Configure Sentry for error monitoring');
  }
} else {
  console.log(`❌ Missing ${missingRequired.length} required variables:\n`);
  missingRequired.forEach(varName => {
    console.log(`  - ${varName}`);
  });
  console.log('\n📝 Add these in the Vercel Dashboard:');
  console.log('   https://vercel.com/dashboard → Settings → Environment Variables');
  process.exit(1);
}

console.log('\n');