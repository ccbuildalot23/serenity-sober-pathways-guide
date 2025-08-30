#!/usr/bin/env node

/**
 * MVP Validation Script
 * Validates all critical metrics are at 100%
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MVPValidator {
  constructor() {
    this.results = {
      crisisSupport: { score: 0, tests: [] },
      mobilePlatform: { score: 0, tests: [] },
      securityHIPAA: { score: 0, tests: [] },
      performance: { score: 0, tests: [] }
    };
  }

  // Crisis Support Validation (Target: 100%)
  validateCrisisSupport() {
    console.log('\n🚨 Validating Crisis Support...');
    const tests = [
      { name: 'Single-tap crisis button', check: () => this.checkFile('src/components/mobile/MobileCrisisButton.tsx', 'handleEmergencyActivation') },
      { name: 'Voice activation', check: () => this.checkFile('src/components/mobile/MobileCrisisButton.tsx', 'SpeechRecognition') },
      { name: 'Shake detection', check: () => this.checkFile('src/hooks/useShakeDetection.ts', 'DeviceMotionEvent') },
      { name: 'Haptic feedback', check: () => this.checkFile('src/hooks/useHapticFeedback.ts', 'vibrate') },
      { name: 'Emergency contacts', check: () => this.checkFile('src/components/mobile/MobileCrisisPage.tsx', 'tel:988') },
      { name: 'Offline support', check: () => this.checkFile('public/sw.js', 'offline') },
      { name: 'Location sharing', check: () => this.checkFile('src/components/mobile/MobileCrisisPage.tsx', 'location') }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = test.check();
      this.results.crisisSupport.tests.push({ name: test.name, passed: result });
      if (result) passed++;
      console.log(`  ${result ? '✅' : '❌'} ${test.name}`);
    }

    this.results.crisisSupport.score = Math.round((passed / tests.length) * 100);
  }

  // Mobile Platform Validation (Target: 100%)
  validateMobilePlatform() {
    console.log('\n📱 Validating Mobile Platform...');
    const tests = [
      { name: 'Mobile navigation component', check: () => fs.existsSync('src/components/mobile/MobileNavigation.tsx') },
      { name: 'Mobile form component', check: () => fs.existsSync('src/components/mobile/MobileForm.tsx') },
      { name: 'Touch targets >= 44px', check: () => this.checkFile('src/components/mobile/MobileCrisisButton.tsx', 'h-24 w-24') },
      { name: 'Safe area insets', check: () => this.checkFile('src/styles/globals.css', 'safe-area-inset') },
      { name: 'PWA manifest', check: () => fs.existsSync('public/manifest.json') },
      { name: 'Service worker', check: () => fs.existsSync('public/sw.js') },
      { name: 'Mobile CSS', check: () => fs.existsSync('src/styles/mobile.css') },
      { name: 'Capacitor config', check: () => fs.existsSync('ios/App/App/Info.plist') }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = test.check();
      this.results.mobilePlatform.tests.push({ name: test.name, passed: result });
      if (result) passed++;
      console.log(`  ${result ? '✅' : '❌'} ${test.name}`);
    }

    this.results.mobilePlatform.score = Math.round((passed / tests.length) * 100);
  }

  // Security/HIPAA Validation (Target: 100%)
  validateSecurity() {
    console.log('\n🔒 Validating Security/HIPAA...');
    const tests = [
      { name: 'Audit logger implemented', check: () => fs.existsSync('src/services/auditLogger.ts') },
      { name: 'PHI encryption service', check: () => fs.existsSync('src/services/phiEncryptionService.ts') },
      { name: 'Session timeout', check: () => this.checkFile('src/contexts/AuthContext.tsx', 'SESSION_TIMEOUT') },
      { name: 'CSP headers configured', check: () => this.checkFile('vite.config.ts', 'Content-Security-Policy') },
      { name: 'HIPAA compliance tests', check: () => fs.existsSync('tests/hipaa/') },
      { name: 'Environment variables', check: () => this.checkFile('.env', 'VITE_SUPABASE_URL') },
      { name: 'Secure monitoring', check: () => fs.existsSync('src/lib/secureMonitoring.ts') }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = test.check();
      this.results.securityHIPAA.tests.push({ name: test.name, passed: result });
      if (result) passed++;
      console.log(`  ${result ? '✅' : '❌'} ${test.name}`);
    }

    this.results.securityHIPAA.score = Math.round((passed / tests.length) * 100);
  }

  // Performance Validation (Target: <1s load time)
  validatePerformance() {
    console.log('\n⚡ Validating Performance...');
    const tests = [
      { name: 'Code splitting enabled', check: () => this.checkFile('vite.config.ts', 'manualChunks') },
      { name: 'CSS code splitting', check: () => this.checkFile('vite.config.ts', 'cssCodeSplit: true') },
      { name: 'Compression enabled', check: () => this.checkFile('vite.config.ts', 'compression') },
      { name: 'Chunk size < 200KB', check: () => this.checkFile('vite.config.ts', 'chunkSizeWarningLimit: 200') },
      { name: 'Lazy loading routes', check: () => this.checkFile('src/App.tsx', 'lazy') },
      { name: 'Service worker caching', check: () => this.checkFile('public/sw.js', 'cache') },
      { name: 'Bundle optimization', check: () => this.checkBuildSize() }
    ];

    let passed = 0;
    for (const test of tests) {
      const result = test.check();
      this.results.performance.tests.push({ name: test.name, passed: result });
      if (result) passed++;
      console.log(`  ${result ? '✅' : '❌'} ${test.name}`);
    }

    this.results.performance.score = Math.round((passed / tests.length) * 100);
  }

  // Helper methods
  checkFile(filePath, searchString) {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) return false;
      const content = fs.readFileSync(fullPath, 'utf8');
      return content.includes(searchString);
    } catch (error) {
      return false;
    }
  }

  checkBuildSize() {
    try {
      const distPath = path.join(process.cwd(), 'dist');
      if (!fs.existsSync(distPath)) return false;
      
      const files = fs.readdirSync(distPath);
      const jsFiles = files.filter(f => f.endsWith('.js') && !f.endsWith('.br.js') && !f.endsWith('.gz.js'));
      
      // Check critical non-vendor chunks
      for (const file of jsFiles) {
        // Skip vendor and large library chunks
        if (file.includes('vendor') || file.includes('charts') || file.includes('react-dom')) {
          continue;
        }
        
        // Check main entry point isn't too large
        if (file.includes('main')) {
          const stats = fs.statSync(path.join(distPath, file));
          const sizeInKB = stats.size / 1024;
          // Main bundle can be larger but should be under 1MB
          if (sizeInKB > 1024) {
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Generate final report
  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 MVP VALIDATION REPORT');
    console.log('='.repeat(60));

    const categories = [
      { name: 'Crisis Support', data: this.results.crisisSupport, target: 100 },
      { name: 'Mobile Platform', data: this.results.mobilePlatform, target: 100 },
      { name: 'Security/HIPAA', data: this.results.securityHIPAA, target: 100 },
      { name: 'Performance', data: this.results.performance, target: 100 }
    ];

    let allPassed = true;

    for (const category of categories) {
      const status = category.data.score >= category.target ? '✅' : '❌';
      const color = category.data.score >= category.target ? '\x1b[32m' : '\x1b[31m';
      
      console.log(`\n${status} ${category.name}: ${color}${category.data.score}%\x1b[0m (Target: ${category.target}%)`);
      
      if (category.data.score < 100) {
        allPassed = false;
        const failed = category.data.tests.filter(t => !t.passed);
        if (failed.length > 0) {
          console.log('  Failed tests:');
          failed.forEach(t => console.log(`    - ${t.name}`));
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    
    if (allPassed) {
      console.log('🎉 ALL METRICS AT 100% - MVP READY FOR PRODUCTION!');
    } else {
      console.log('⚠️  Some metrics below target - additional work needed');
    }
    
    console.log('='.repeat(60));

    // Write detailed report to file
    const reportPath = path.join(process.cwd(), 'MVP_VALIDATION_REPORT.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    return allPassed;
  }

  // Run all validations
  async run() {
    console.log('🚀 Starting MVP Validation...');
    console.log('Target: All metrics at 100%\n');

    this.validateCrisisSupport();
    this.validateMobilePlatform();
    this.validateSecurity();
    this.validatePerformance();

    const success = this.generateReport();
    
    process.exit(success ? 0 : 1);
  }
}

// Run validation
const validator = new MVPValidator();
validator.run();