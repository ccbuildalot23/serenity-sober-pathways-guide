#!/usr/bin/env node

import { execSync } from 'node:child_process';

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

async function main() {
  try {
    // HIPAA-focused checks already present in repo (Playwright specs and security scan)
    run('npm run lint');
    run('npm run typecheck');
    run('node scripts/security-dependency-scan.js');

    // Existing E2E includes HIPAA coverage
    run('npm run test:e2e');

    console.log('✅ Autonomous validator checks passed');
  } catch (err) {
    console.error('❌ Autonomous validator failed');
    process.exit(1);
  }
}

main();



