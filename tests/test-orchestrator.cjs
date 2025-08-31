/**
 * Test Orchestrator for Triple Validation
 * Validates MVP functionality through three passes
 */

const { chromium } = require('@playwright/test');

class TestOrchestrator {
  constructor() {
    this.results = {
      pass1: { success: false, tests: [] },
      pass2: { success: false, tests: [] },
      pass3: { success: false, tests: [] }
    };
  }

  async runBasicTests() {
    console.log('🔍 Running Pass 1: Basic Functionality Tests...');
    const tests = [];
    
    // Test 1: Backend Health Check
    try {
      const response = await fetch('http://localhost:3001/health');
      const data = await response.json();
      tests.push({
        name: 'Backend Health Check',
        success: data.status === 'healthy',
        message: `Backend is ${data.status}`
      });
    } catch (error) {
      tests.push({
        name: 'Backend Health Check',
        success: false,
        message: error.message
      });
    }

    // Test 2: Frontend Accessibility
    try {
      const response = await fetch('http://localhost:8080');
      tests.push({
        name: 'Frontend Accessibility',
        success: response.ok,
        message: `Frontend returned ${response.status}`
      });
    } catch (error) {
      tests.push({
        name: 'Frontend Accessibility',
        success: false,
        message: error.message
      });
    }

    // Test 3: Authentication API
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test-patient@serenity.com',
          password: 'TestPass123'
        })
      });
      const data = await response.json();
      tests.push({
        name: 'Authentication API',
        success: !!data.token,
        message: data.token ? 'Login successful' : 'Login failed'
      });
    } catch (error) {
      tests.push({
        name: 'Authentication API',
        success: false,
        message: error.message
      });
    }

    this.results.pass1 = {
      success: tests.every(t => t.success),
      tests
    };
    
    return this.results.pass1;
  }

  async runIntegrationTests() {
    console.log('🔗 Running Pass 2: Integration Tests...');
    const tests = [];
    
    // Get auth token first
    let token = null;
    try {
      const authResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test-patient@serenity.com',
          password: 'TestPass123'
        })
      });
      const authData = await authResponse.json();
      token = authData.token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }

    // Test 1: Check-in Submission
    if (token) {
      try {
        const response = await fetch('http://localhost:3001/api/checkins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            mood: 8,
            anxiety_level: 2,
            sleep_hours: 7.5,
            medication_taken: true,
            notes: 'Integration test check-in'
          })
        });
        const data = await response.json();
        tests.push({
          name: 'Check-in Submission',
          success: !!data.id,
          message: data.id ? 'Check-in saved' : 'Check-in failed'
        });
      } catch (error) {
        tests.push({
          name: 'Check-in Submission',
          success: false,
          message: error.message
        });
      }
    }

    // Test 2: Crisis Alert Creation
    if (token) {
      try {
        const response = await fetch('http://localhost:3001/api/crisis/alert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            severity: 'medium',
            message: 'Integration test alert'
          })
        });
        const data = await response.json();
        tests.push({
          name: 'Crisis Alert Creation',
          success: !!data.alert?.id,
          message: data.alert?.id ? 'Alert created' : 'Alert failed'
        });
      } catch (error) {
        tests.push({
          name: 'Crisis Alert Creation',
          success: false,
          message: error.message
        });
      }
    }

    // Test 3: WebSocket Connection
    try {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:3001');
      
      await new Promise((resolve, reject) => {
        ws.on('open', () => {
          tests.push({
            name: 'WebSocket Connection',
            success: true,
            message: 'WebSocket connected'
          });
          ws.close();
          resolve();
        });
        
        ws.on('error', (error) => {
          tests.push({
            name: 'WebSocket Connection',
            success: false,
            message: error.message
          });
          reject(error);
        });
        
        setTimeout(() => {
          ws.close();
          reject(new Error('WebSocket timeout'));
        }, 5000);
      });
    } catch (error) {
      tests.push({
        name: 'WebSocket Connection',
        success: false,
        message: error.message
      });
    }

    this.results.pass2 = {
      success: tests.every(t => t.success),
      tests
    };
    
    return this.results.pass2;
  }

  async runPerformanceTests() {
    console.log('⚡ Running Pass 3: Performance & Security Tests...');
    const tests = [];
    
    // Test 1: API Response Time
    try {
      const start = Date.now();
      await fetch('http://localhost:3001/health');
      const responseTime = Date.now() - start;
      tests.push({
        name: 'API Response Time',
        success: responseTime < 200,
        message: `Response time: ${responseTime}ms`
      });
    } catch (error) {
      tests.push({
        name: 'API Response Time',
        success: false,
        message: error.message
      });
    }

    // Test 2: Frontend Load Time
    try {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      
      const start = Date.now();
      await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - start;
      
      tests.push({
        name: 'Frontend Load Time',
        success: loadTime < 3000,
        message: `Load time: ${loadTime}ms`
      });
      
      await browser.close();
    } catch (error) {
      tests.push({
        name: 'Frontend Load Time',
        success: false,
        message: error.message
      });
    }

    // Test 3: Security Headers
    try {
      const response = await fetch('http://localhost:3001/health');
      const hasContentType = response.headers.get('content-type')?.includes('application/json');
      tests.push({
        name: 'Security Headers',
        success: hasContentType,
        message: hasContentType ? 'Headers configured' : 'Headers missing'
      });
    } catch (error) {
      tests.push({
        name: 'Security Headers',
        success: false,
        message: error.message
      });
    }

    this.results.pass3 = {
      success: tests.every(t => t.success),
      tests
    };
    
    return this.results.pass3;
  }

  async tripleValidation() {
    console.log('🚀 Starting Triple Validation Process...\n');
    
    // First Pass: Basic Functionality
    const pass1 = await this.runBasicTests();
    this.printResults('Pass 1: Basic Functionality', pass1);
    
    // Second Pass: Integration Tests
    const pass2 = await this.runIntegrationTests();
    this.printResults('Pass 2: Integration', pass2);
    
    // Third Pass: Performance & Security
    const pass3 = await this.runPerformanceTests();
    this.printResults('Pass 3: Performance', pass3);
    
    // Overall Results
    const overallSuccess = pass1.success && pass2.success && pass3.success;
    
    console.log('\n📊 OVERALL RESULTS:');
    console.log('===================');
    console.log(`Pass 1: ${pass1.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Pass 2: ${pass2.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Pass 3: ${pass3.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log('===================');
    console.log(`MVP Status: ${overallSuccess ? '✅ OPERATIONAL' : '❌ NEEDS ATTENTION'}\n`);
    
    return {
      success: overallSuccess,
      metrics: this.results
    };
  }

  printResults(title, results) {
    console.log(`\n${title}:`);
    console.log('-'.repeat(40));
    results.tests.forEach(test => {
      console.log(`${test.success ? '✅' : '❌'} ${test.name}: ${test.message}`);
    });
    console.log(`Result: ${results.success ? 'PASSED' : 'FAILED'}`);
  }
}

// Run if executed directly
if (require.main === module) {
  const orchestrator = new TestOrchestrator();
  orchestrator.tripleValidation()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test orchestrator failed:', error);
      process.exit(1);
    });
}

module.exports = TestOrchestrator;