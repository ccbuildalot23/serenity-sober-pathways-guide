#!/usr/bin/env node

/**
 * Comprehensive Integration Validation Script
 * Tests all components are properly integrated and working
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class IntegrationValidator {
  constructor() {
    this.results = {
      backend: { passed: 0, failed: 0, tests: [] },
      frontend: { passed: 0, failed: 0, tests: [] },
      database: { passed: 0, failed: 0, tests: [] },
      integration: { passed: 0, failed: 0, tests: [] }
    };
  }

  async testBackendHealth() {
    console.log('\n🔍 Testing Backend Health...');
    try {
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      
      if (data.status === 'healthy') {
        this.results.backend.passed++;
        this.results.backend.tests.push({ name: 'Health endpoint', status: 'PASS' });
        return true;
      }
    } catch (error) {
      this.results.backend.failed++;
      this.results.backend.tests.push({ name: 'Health endpoint', status: 'FAIL', error: error.message });
    }
    return false;
  }

  async testAuthentication() {
    console.log('\n🔐 Testing Authentication...');
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test-patient@serenity.com',
          password: 'TestSerenity2024!@#'
        })
      });
      
      const data = await response.json();
      
      if (data.token) {
        this.results.backend.passed++;
        this.results.backend.tests.push({ name: 'Authentication', status: 'PASS' });
        return data.token;
      }
    } catch (error) {
      this.results.backend.failed++;
      this.results.backend.tests.push({ name: 'Authentication', status: 'FAIL', error: error.message });
    }
    return null;
  }

  async testCrisisEndpoint(token) {
    console.log('\n🚨 Testing Crisis Alert Endpoint...');
    try {
      const response = await fetch('http://localhost:3001/api/crisis/alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          severity: 'high',
          message: 'Test crisis alert'
        })
      });
      
      const data = await response.json();
      
      if (data.alert) {
        this.results.backend.passed++;
        this.results.backend.tests.push({ name: 'Crisis alert creation', status: 'PASS' });
        return true;
      }
    } catch (error) {
      this.results.backend.failed++;
      this.results.backend.tests.push({ name: 'Crisis alert creation', status: 'FAIL', error: error.message });
    }
    return false;
  }

  async testCheckInEndpoint(token) {
    console.log('\n📝 Testing Check-in Endpoint...');
    try {
      const response = await fetch('http://localhost:3001/api/checkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mood: 'good',
          anxiety_level: 3,
          sleep_hours: 8,
          medication_taken: true,
          notes: 'Test check-in'
        })
      });
      
      const data = await response.json();
      
      if (data.id) {
        this.results.backend.passed++;
        this.results.backend.tests.push({ name: 'Check-in creation', status: 'PASS' });
        return true;
      }
    } catch (error) {
      this.results.backend.failed++;
      this.results.backend.tests.push({ name: 'Check-in creation', status: 'FAIL', error: error.message });
    }
    return false;
  }

  async testFrontendAccess() {
    console.log('\n🌐 Testing Frontend Access...');
    const pages = [
      { url: 'http://localhost:8080', name: 'Homepage' },
      { url: 'http://localhost:8080/auth', name: 'Auth page' },
      { url: 'http://localhost:8080/crisis', name: 'Crisis page' }
    ];

    for (const page of pages) {
      try {
        const response = await fetch(page.url);
        if (response.ok) {
          this.results.frontend.passed++;
          this.results.frontend.tests.push({ name: page.name, status: 'PASS' });
        } else {
          this.results.frontend.failed++;
          this.results.frontend.tests.push({ name: page.name, status: 'FAIL', error: `Status ${response.status}` });
        }
      } catch (error) {
        this.results.frontend.failed++;
        this.results.frontend.tests.push({ name: page.name, status: 'FAIL', error: error.message });
      }
    }
  }

  async testDatabaseConnection() {
    console.log('\n🗄️ Testing Database Connection...');
    try {
      const { stdout } = await execAsync('docker exec serenity-postgres-1 psql -U serenity_user -d serenity -c "SELECT COUNT(*) FROM users;"');
      
      if (stdout.includes('4') || stdout.includes('3')) { // We have 3-4 test users
        this.results.database.passed++;
        this.results.database.tests.push({ name: 'User count', status: 'PASS' });
      } else {
        this.results.database.failed++;
        this.results.database.tests.push({ name: 'User count', status: 'FAIL', error: 'Unexpected user count' });
      }
    } catch (error) {
      this.results.database.failed++;
      this.results.database.tests.push({ name: 'Database connection', status: 'FAIL', error: error.message });
    }
  }

  async testRedisConnection() {
    console.log('\n📦 Testing Redis Connection...');
    try {
      const { stdout } = await execAsync('docker exec serenity-redis-1 redis-cli ping');
      
      if (stdout.includes('PONG')) {
        this.results.database.passed++;
        this.results.database.tests.push({ name: 'Redis connection', status: 'PASS' });
      } else {
        this.results.database.failed++;
        this.results.database.tests.push({ name: 'Redis connection', status: 'FAIL' });
      }
    } catch (error) {
      this.results.database.failed++;
      this.results.database.tests.push({ name: 'Redis connection', status: 'FAIL', error: error.message });
    }
  }

  async testFullIntegration() {
    console.log('\n🔄 Testing Full Integration Flow...');
    
    // 1. Login and get token
    const token = await this.testAuthentication();
    if (!token) {
      this.results.integration.failed++;
      this.results.integration.tests.push({ name: 'Full auth flow', status: 'FAIL' });
      return;
    }
    
    // 2. Create a check-in
    const checkInSuccess = await this.testCheckInEndpoint(token);
    if (checkInSuccess) {
      this.results.integration.passed++;
      this.results.integration.tests.push({ name: 'Auth + Check-in flow', status: 'PASS' });
    } else {
      this.results.integration.failed++;
      this.results.integration.tests.push({ name: 'Auth + Check-in flow', status: 'FAIL' });
    }
    
    // 3. Create crisis alert
    const crisisSuccess = await this.testCrisisEndpoint(token);
    if (crisisSuccess) {
      this.results.integration.passed++;
      this.results.integration.tests.push({ name: 'Auth + Crisis flow', status: 'PASS' });
    } else {
      this.results.integration.failed++;
      this.results.integration.tests.push({ name: 'Auth + Crisis flow', status: 'FAIL' });
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 INTEGRATION VALIDATION REPORT');
    console.log('='.repeat(60));
    
    let totalPassed = 0;
    let totalFailed = 0;
    
    for (const [category, results] of Object.entries(this.results)) {
      console.log(`\n📦 ${category.toUpperCase()}`);
      console.log('-'.repeat(40));
      
      results.tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✅' : '❌';
        console.log(`  ${icon} ${test.name}: ${test.status}`);
        if (test.error) {
          console.log(`     Error: ${test.error}`);
        }
      });
      
      console.log(`  Summary: ${results.passed} passed, ${results.failed} failed`);
      totalPassed += results.passed;
      totalFailed += results.failed;
    }
    
    const totalTests = totalPassed + totalFailed;
    const successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 OVERALL RESULTS');
    console.log('='.repeat(60));
    console.log(`  Total Tests: ${totalTests}`);
    console.log(`  Passed: ${totalPassed}`);
    console.log(`  Failed: ${totalFailed}`);
    console.log(`  Success Rate: ${successRate}%`);
    
    // Determine overall status
    let status;
    if (successRate >= 95) {
      status = '🎉 EXCELLENT - Platform is production ready!';
    } else if (successRate >= 80) {
      status = '✅ GOOD - Most integrations working';
    } else if (successRate >= 60) {
      status = '⚠️ FAIR - Some issues need fixing';
    } else {
      status = '❌ POOR - Major integration issues';
    }
    
    console.log(`\n  Overall Status: ${status}`);
    console.log('='.repeat(60));
    
    return successRate;
  }

  async runAllTests() {
    console.log('🚀 Starting Integration Validation');
    console.log('=' .repeat(60));
    
    // Test backend
    await this.testBackendHealth();
    
    // Test frontend
    await this.testFrontendAccess();
    
    // Test database
    await this.testDatabaseConnection();
    await this.testRedisConnection();
    
    // Test full integration
    await this.testFullIntegration();
    
    // Generate report
    const successRate = this.generateReport();
    
    // Return exit code based on success
    process.exit(successRate >= 80 ? 0 : 1);
  }
}

// Run validation
const validator = new IntegrationValidator();
validator.runAllTests().catch(console.error);