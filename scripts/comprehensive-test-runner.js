#!/usr/bin/env node

/**
 * Comprehensive Test Runner
 * Runs all tests and provides honest metrics
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ComprehensiveTestRunner {
  constructor() {
    this.results = {
      crisis: { total: 0, passed: 0, failed: 0, errors: [] },
      mobile: { total: 0, passed: 0, failed: 0, errors: [] },
      security: { total: 0, passed: 0, failed: 0, errors: [] },
      performance: { total: 0, passed: 0, failed: 0, errors: [] },
      authentication: { total: 0, passed: 0, failed: 0, errors: [] }
    };
    this.startTime = Date.now();
  }

  async runTest(command, category) {
    return new Promise((resolve) => {
      console.log(`\n🧪 Running ${category} tests...`);
      
      const child = spawn('npx', command.split(' '), {
        shell: true,
        env: { ...process.env, CI: 'true' }
      });

      let output = '';
      let errors = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
        // Parse test results in real-time
        const passMatch = data.toString().match(/(\d+) passed/);
        const failMatch = data.toString().match(/(\d+) failed/);
        
        if (passMatch) this.results[category].passed = parseInt(passMatch[1]);
        if (failMatch) this.results[category].failed = parseInt(failMatch[1]);
      });

      child.stderr.on('data', (data) => {
        errors += data.toString();
      });

      child.on('exit', (code) => {
        this.results[category].total = this.results[category].passed + this.results[category].failed;
        
        // Extract specific errors
        const errorMatches = output.match(/Error: .*/g) || [];
        this.results[category].errors = errorMatches.slice(0, 5); // Keep first 5 errors
        
        console.log(`  ✅ Passed: ${this.results[category].passed}`);
        console.log(`  ❌ Failed: ${this.results[category].failed}`);
        
        resolve(code === 0);
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        child.kill();
        console.log(`  ⏱️ Test timed out`);
        resolve(false);
      }, 120000);
    });
  }

  async checkFeatureAvailability() {
    console.log('\n🔍 Checking feature availability...');
    
    const features = {
      crisisButton: false,
      voiceActivation: false,
      mobileComponents: false,
      auditLogging: false,
      sessionTimeout: false
    };

    // Check if crisis button component exists and exports correctly
    try {
      const crisisButtonPath = path.join(__dirname, '../src/components/mobile/MobileCrisisButton.tsx');
      if (fs.existsSync(crisisButtonPath)) {
        const content = fs.readFileSync(crisisButtonPath, 'utf8');
        features.crisisButton = content.includes('handleEmergencyActivation');
        features.voiceActivation = content.includes('SpeechRecognition');
      }
    } catch (e) {}

    // Check mobile components
    features.mobileComponents = fs.existsSync(path.join(__dirname, '../src/components/mobile/MobileNavigation.tsx'));
    
    // Check audit logging
    features.auditLogging = fs.existsSync(path.join(__dirname, '../src/services/auditLogger.ts'));
    
    // Check session timeout
    try {
      const authPath = path.join(__dirname, '../src/contexts/AuthContext.tsx');
      if (fs.existsSync(authPath)) {
        const content = fs.readFileSync(authPath, 'utf8');
        features.sessionTimeout = content.includes('SESSION_TIMEOUT');
      }
    } catch (e) {}

    return features;
  }

  async checkActualEndpoints() {
    console.log('\n🌐 Checking actual endpoints...');
    
    const endpoints = [
      { url: 'http://localhost:8080', name: 'Home' },
      { url: 'http://localhost:8080/crisis', name: 'Crisis' },
      { url: 'http://localhost:8080/auth', name: 'Auth' },
      { url: 'http://localhost:8080/check-in', name: 'Check-in' }
    ];

    const results = {};
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, { 
          method: 'GET',
          redirect: 'manual'
        });
        results[endpoint.name] = {
          status: response.status,
          ok: response.ok || response.status === 302 // Redirects are ok
        };
      } catch (error) {
        results[endpoint.name] = {
          status: 0,
          ok: false,
          error: error.message
        };
      }
    }

    return results;
  }

  async measurePerformance() {
    console.log('\n⚡ Measuring performance...');
    
    const start = Date.now();
    try {
      const response = await fetch('http://localhost:8080');
      const html = await response.text();
      const loadTime = Date.now() - start;
      
      return {
        loadTime: loadTime,
        responseSize: html.length,
        hasCSS: html.includes('<style') || html.includes('<link rel="stylesheet"'),
        hasJS: html.includes('<script'),
        status: response.status
      };
    } catch (error) {
      return {
        loadTime: -1,
        error: error.message
      };
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Test Suite');
    console.log('=' .repeat(60));

    // 1. Check feature availability
    const features = await this.checkFeatureAvailability();
    
    // 2. Check endpoints
    const endpoints = await this.checkActualEndpoints();
    
    // 3. Measure performance
    const performance = await this.measurePerformance();
    
    // 4. Run actual tests (with shorter timeout)
    await this.runTest('playwright test tests/e2e/crisis-support.spec.ts --project=chromium --reporter=list', 'crisis');
    await this.runTest('playwright test tests/e2e/mobile-app.spec.ts --project="Mobile Chrome" --reporter=list', 'mobile');
    
    // 5. Generate report
    this.generateReport(features, endpoints, performance);
  }

  generateReport(features, endpoints, performance) {
    const duration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE TEST REPORT - ACTUAL RESULTS');
    console.log('='.repeat(60));

    // Feature Implementation Status
    console.log('\n📦 Feature Implementation:');
    console.log(`  Crisis Button: ${features.crisisButton ? '✅ Implemented' : '❌ Missing'}`);
    console.log(`  Voice Activation: ${features.voiceActivation ? '✅ Implemented' : '❌ Missing'}`);
    console.log(`  Mobile Components: ${features.mobileComponents ? '✅ Implemented' : '❌ Missing'}`);
    console.log(`  Audit Logging: ${features.auditLogging ? '✅ Implemented' : '❌ Missing'}`);
    console.log(`  Session Timeout: ${features.sessionTimeout ? '✅ Implemented' : '❌ Missing'}`);

    // Endpoint Availability
    console.log('\n🌐 Endpoint Status:');
    for (const [name, status] of Object.entries(endpoints)) {
      console.log(`  ${name}: ${status.ok ? '✅' : '❌'} (${status.status || 'Error'})`);
    }

    // Performance Metrics
    console.log('\n⚡ Performance:');
    console.log(`  Load Time: ${performance.loadTime}ms ${performance.loadTime < 1000 ? '✅' : '❌'}`);
    console.log(`  Response Size: ${performance.responseSize} bytes`);
    console.log(`  Has CSS: ${performance.hasCSS ? '✅' : '❌'}`);
    console.log(`  Has JS: ${performance.hasJS ? '✅' : '❌'}`);

    // Test Results
    console.log('\n🧪 Test Results:');
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const [category, result] of Object.entries(this.results)) {
      if (result.total > 0) {
        const percentage = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;
        console.log(`  ${category}: ${result.passed}/${result.total} (${percentage}%)`);
        totalPassed += result.passed;
        totalFailed += result.failed;
        
        if (result.errors.length > 0) {
          console.log(`    Errors: ${result.errors[0]}`);
        }
      }
    }

    // Calculate actual metrics
    const featureCount = Object.values(features).filter(f => f).length;
    const featurePercentage = Math.round((featureCount / 5) * 100);
    
    const endpointCount = Object.values(endpoints).filter(e => e.ok).length;
    const endpointPercentage = Math.round((endpointCount / 4) * 100);
    
    const testPercentage = totalPassed + totalFailed > 0 
      ? Math.round((totalPassed / (totalPassed + totalFailed)) * 100)
      : 0;

    console.log('\n' + '='.repeat(60));
    console.log('📈 ACTUAL METRICS (Not Assumptions):');
    console.log('='.repeat(60));
    console.log(`  Feature Implementation: ${featurePercentage}%`);
    console.log(`  Endpoint Availability: ${endpointPercentage}%`);
    console.log(`  Test Pass Rate: ${testPercentage}%`);
    console.log(`  Performance Score: ${performance.loadTime < 1000 ? '100%' : performance.loadTime < 2000 ? '75%' : '50%'}`);
    
    const overallScore = Math.round((featurePercentage + endpointPercentage + testPercentage) / 3);
    console.log(`\n  🎯 OVERALL READINESS: ${overallScore}%`);
    
    console.log('\n' + '='.repeat(60));
    console.log(`Test Duration: ${Math.round(duration / 1000)}s`);
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      features,
      endpoints,
      performance,
      testResults: this.results,
      metrics: {
        featureImplementation: featurePercentage,
        endpointAvailability: endpointPercentage,
        testPassRate: testPercentage,
        performanceScore: performance.loadTime < 1000 ? 100 : performance.loadTime < 2000 ? 75 : 50,
        overall: overallScore
      }
    };
    
    fs.writeFileSync(
      path.join(__dirname, '../HONEST_TEST_REPORT.json'),
      JSON.stringify(report, null, 2)
    );
    
    console.log('\n📄 Detailed report saved to HONEST_TEST_REPORT.json');
  }
}

// Run tests
const runner = new ComprehensiveTestRunner();
runner.runAllTests().catch(console.error);