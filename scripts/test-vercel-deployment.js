#!/usr/bin/env node

/**
 * Vercel Deployment Test Script
 * Simulates Vercel's build environment locally to catch issues before deployment
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Vercel Deployment Test Script');
console.log('==================================\n');

// Color output helpers
const red = (text) => `\x1b[31m${text}\x1b[0m`;
const green = (text) => `\x1b[32m${text}\x1b[0m`;
const yellow = (text) => `\x1b[33m${text}\x1b[0m`;
const blue = (text) => `\x1b[34m${text}\x1b[0m`;

let hasErrors = false;

// Test 1: Check Node version
console.log(blue('📋 Test 1: Node Version Check'));
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion !== 20) {
  console.log(yellow(`  ⚠️  Warning: Using Node ${nodeVersion}, Vercel uses Node 20.x`));
} else {
  console.log(green(`  ✅ Node version: ${nodeVersion}`));
}
console.log();

// Test 2: Verify package.json scripts
console.log(blue('📋 Test 2: Package.json Scripts'));
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const requiredScripts = ['build', 'vercel-build'];
  
  for (const script of requiredScripts) {
    if (packageJson.scripts[script]) {
      console.log(green(`  ✅ ${script}: ${packageJson.scripts[script].substring(0, 50)}...`));
    } else {
      console.log(red(`  ❌ Missing script: ${script}`));
      hasErrors = true;
    }
  }
} catch (error) {
  console.log(red(`  ❌ Failed to read package.json: ${error.message}`));
  hasErrors = true;
}
console.log();

// Test 3: Verify vercel.json
console.log(blue('📋 Test 3: Vercel Configuration'));
try {
  const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
  
  if (vercelConfig.env?.NODE_ENV) {
    console.log(red('  ❌ NODE_ENV is set in vercel.json env - this will cause issues!'));
    hasErrors = true;
  } else {
    console.log(green('  ✅ NODE_ENV not set in env (correct)'));
  }
  
  if (vercelConfig.installCommand?.includes('--production=false')) {
    console.log(green('  ✅ Install command includes --production=false'));
  } else {
    console.log(yellow('  ⚠️  Install command might skip devDependencies'));
  }
  
  console.log(green(`  ✅ Build command: ${vercelConfig.buildCommand?.substring(0, 50)}...`));
} catch (error) {
  console.log(red(`  ❌ Failed to read vercel.json: ${error.message}`));
  hasErrors = true;
}
console.log();

// Test 4: Check .npmrc
console.log(blue('📋 Test 4: NPM Configuration'));
try {
  const npmrc = fs.readFileSync('.npmrc', 'utf-8');
  
  if (npmrc.includes('production=false')) {
    console.log(yellow('  ⚠️  .npmrc contains production=false - might conflict with Vercel'));
  } else {
    console.log(green('  ✅ .npmrc does not override production mode'));
  }
  
  if (npmrc.includes('legacy-peer-deps=true')) {
    console.log(green('  ✅ Legacy peer deps enabled'));
  }
} catch (error) {
  console.log(yellow('  ⚠️  No .npmrc file found'));
}
console.log();

// Test 5: Simulate Vercel install
console.log(blue('📋 Test 5: Simulating Vercel Install'));
console.log('  Running: npm ci --production=false --legacy-peer-deps --no-audit --no-fund');
try {
  // Clean node_modules first
  if (fs.existsSync('node_modules')) {
    console.log('  Cleaning existing node_modules...');
    execSync('rm -rf node_modules', { stdio: 'ignore' });
  }
  
  // Run install command
  execSync('npm ci --production=false --legacy-peer-deps --no-audit --no-fund', {
    stdio: 'inherit',
    env: { ...process.env, CI: 'true' }
  });
  console.log(green('  ✅ Dependencies installed successfully'));
} catch (error) {
  console.log(red(`  ❌ Install failed: ${error.message}`));
  hasErrors = true;
}
console.log();

// Test 6: Verify critical dependencies
console.log(blue('📋 Test 6: Verifying Critical Dependencies'));
const criticalDeps = ['vite', 'typescript', '@vitejs/plugin-react-swc', 'tailwindcss'];
for (const dep of criticalDeps) {
  const depPath = path.join('node_modules', dep);
  if (fs.existsSync(depPath)) {
    console.log(green(`  ✅ ${dep} installed`));
  } else {
    console.log(red(`  ❌ ${dep} NOT FOUND`));
    hasErrors = true;
  }
}
console.log();

// Test 7: Run build
console.log(blue('📋 Test 7: Testing Build Process'));
console.log('  Running: NODE_ENV=production npm run build');
try {
  execSync('npm run build', {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production', CI: 'true' }
  });
  console.log(green('  ✅ Build completed successfully'));
} catch (error) {
  console.log(red(`  ❌ Build failed: ${error.message}`));
  hasErrors = true;
}
console.log();

// Test 8: Verify build output
console.log(blue('📋 Test 8: Verifying Build Output'));
if (fs.existsSync('dist')) {
  const distFiles = fs.readdirSync('dist');
  console.log(green(`  ✅ dist folder created with ${distFiles.length} files`));
  
  if (fs.existsSync('dist/index.html')) {
    console.log(green('  ✅ index.html generated'));
  } else {
    console.log(red('  ❌ index.html not found'));
    hasErrors = true;
  }
  
  if (fs.existsSync('dist/assets')) {
    console.log(green('  ✅ assets folder generated'));
  } else {
    console.log(red('  ❌ assets folder not found'));
    hasErrors = true;
  }
} else {
  console.log(red('  ❌ dist folder not created'));
  hasErrors = true;
}
console.log();

// Final report
console.log('==================================');
if (hasErrors) {
  console.log(red('❌ DEPLOYMENT TEST FAILED'));
  console.log('Fix the issues above before deploying to Vercel');
  process.exit(1);
} else {
  console.log(green('✅ DEPLOYMENT TEST PASSED'));
  console.log('Your project should deploy successfully to Vercel');
  process.exit(0);
}