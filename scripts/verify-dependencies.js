#!/usr/bin/env node

/**
 * Vercel Dependency Verification Script
 * Ensures all required dependencies are installed before build
 * Part of the AI-orchestrated deployment solution
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPECTED_MIN_PACKAGES = 120; // Updated to match actual package count
const CRITICAL_DEPENDENCIES = [
  'vite',
  '@vitejs/plugin-react-swc',
  'react',
  'react-dom',
  '@supabase/supabase-js',
  'tailwindcss',
  'typescript'
];

console.log('🔍 Vercel Dependency Verification System');
console.log('=========================================\n');

function checkPackageCount() {
  try {
    const output = execSync('npm ls --depth=0 --json', { encoding: 'utf-8' });
    const packages = JSON.parse(output);
    const dependencyCount = Object.keys(packages.dependencies || {}).length;
    
    console.log(`📦 Total packages found: ${dependencyCount}`);
    
    if (dependencyCount < EXPECTED_MIN_PACKAGES) {
      console.error(`❌ CRITICAL: Only ${dependencyCount} packages installed!`);
      console.error(`   Expected at least ${EXPECTED_MIN_PACKAGES} packages`);
      console.error('   This indicates npm ci ran in production mode');
      return false;
    }
    
    console.log(`✅ Package count verified: ${dependencyCount} packages`);
    return true;
  } catch (error) {
    console.error('❌ Failed to count packages:', error.message);
    return false;
  }
}

function checkCriticalDependencies() {
  console.log('\n📋 Checking critical dependencies...');
  
  const missing = [];
  
  for (const dep of CRITICAL_DEPENDENCIES) {
    try {
      execSync(`npm ls ${dep} --depth=0`, { stdio: 'ignore' });
      console.log(`  ✅ ${dep}`);
    } catch {
      console.log(`  ❌ ${dep} - MISSING!`);
      missing.push(dep);
    }
  }
  
  if (missing.length > 0) {
    console.error('\n❌ CRITICAL: Missing dependencies:', missing.join(', '));
    return false;
  }
  
  console.log('\n✅ All critical dependencies present');
  return true;
}

function checkNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.error('❌ node_modules directory not found!');
    return false;
  }
  
  const vitePath = path.join(nodeModulesPath, 'vite');
  if (!fs.existsSync(vitePath)) {
    console.error('❌ Vite not found in node_modules!');
    return false;
  }
  
  console.log('✅ node_modules structure verified');
  return true;
}

function checkEnvironment() {
  console.log('\n🌍 Environment Check:');
  console.log(`  Node Version: ${process.version}`);
  console.log(`  NPM Version: ${execSync('npm -v', { encoding: 'utf-8' }).trim()}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  
  if (process.env.NODE_ENV === 'production') {
    console.warn('  ⚠️  NODE_ENV is set to production - this may affect installation');
  }
}

function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      npmVersion: execSync('npm -v', { encoding: 'utf-8' }).trim(),
      platform: process.platform,
      nodeEnv: process.env.NODE_ENV || 'not set'
    },
    checks: results,
    success: Object.values(results).every(r => r),
    recommendation: ''
  };
  
  if (!report.success) {
    report.recommendation = 'Run: npm ci --production=false --legacy-peer-deps';
  }
  
  fs.writeFileSync(
    path.join(process.cwd(), 'dependency-verification-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  return report;
}

// Main verification
console.log('Starting dependency verification...\n');

checkEnvironment();

const results = {
  packageCount: checkPackageCount(),
  criticalDeps: checkCriticalDependencies(),
  nodeModules: checkNodeModules()
};

const report = generateReport(results);

console.log('\n=========================================');
if (report.success) {
  console.log('✅ VERIFICATION PASSED - Ready for build');
  process.exit(0);
} else {
  console.error('❌ VERIFICATION FAILED - Dependencies incomplete');
  console.error('\n🔧 Recommended fix:');
  console.error('   npm ci --production=false --legacy-peer-deps');
  console.error('\nReport saved to: dependency-verification-report.json');
  process.exit(1);
}