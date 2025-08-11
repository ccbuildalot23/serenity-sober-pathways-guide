const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Critical pages to test based on App.tsx routing
const CRITICAL_PAGES = [
  // Public pages (no auth required)
  { path: '/', name: 'HomePage' },
  { path: '/auth', name: 'Auth' },
  { path: '/login', name: 'Login' },
  { path: '/forgot-password', name: 'ForgotPassword' },
  { path: '/reset-password', name: 'ResetPassword' },
  { path: '/crisis', name: 'CrisisHelp' },
  { path: '/crisis-support', name: 'CrisisSupport' },
  { path: '/crisis-intervention', name: 'CrisisIntervention' },
  { path: '/mobile-crisis', name: 'MobileCrisis' },
  { path: '/enhanced-crisis-system', name: 'EnhancedCrisisSystem' },
  
  // Protected pages (will test with auth bypass)
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/patient/dashboard', name: 'PatientDashboard' },
  { path: '/checkin', name: 'CheckIn' },
  { path: '/peer-support', name: 'PeerSupport' },
  { path: '/calendar', name: 'Calendar' },
  { path: '/progress', name: 'Progress' },
  { path: '/profile', name: 'Profile' },
  { path: '/motivation', name: 'Motivation' },
  { path: '/accountability-partners', name: 'AccountabilityPartners' },
  { path: '/recovery-planning', name: 'RecoveryPlanning' },
  { path: '/relapse-prevention', name: 'RelapsePrevention' },
  
  // Provider pages
  { path: '/provider/dashboard', name: 'ProviderDashboard' },
  { path: '/clinical-protocols', name: 'ClinicalProtocols' },
  { path: '/crisis-intervention', name: 'CrisisIntervention' },
  { path: '/mobile-crisis', name: 'MobileCrisis' },
  { path: '/peer-supervision', name: 'PeerSupervision' },
  { path: '/practice-management', name: 'PracticeManagement' },
  
  // Support pages
  { path: '/supporter/dashboard', name: 'SupportDashboard' },
  { path: '/supporter/messages', name: 'SupporterMessages' },
];

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ConsoleErrorChecker {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.results = [];
    this.browser = null;
  }

  async initialize() {
    console.log('🚀 Initializing browser for console error checking...');
    this.browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }

  async checkPage(pagePath, pageName) {
    const page = await this.browser.newPage();
    const errors = [];
    const warnings = [];
    const networkErrors = [];
    
    console.log(`🔍 Testing ${pageName} at ${pagePath}...`);
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'console_error',
          message: msg.text(),
          location: msg.location()
        });
      } else if (msg.type() === 'warning') {
        warnings.push({
          type: 'console_warning',
          message: msg.text(),
          location: msg.location()
        });
      }
    });

    // Listen for network errors
    page.on('response', response => {
      if (response.status() >= 400) {
        networkErrors.push({
          type: 'network_error',
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Listen for page errors
    page.on('pageerror', error => {
      errors.push({
        type: 'page_error',
        message: error.message,
        stack: error.stack
      });
    });

    try {
      // Set auth bypass for protected routes
      if (pagePath !== '/' && pagePath !== '/auth' && pagePath !== '/login') {
        await page.evaluateOnNewDocument(() => {
          localStorage.setItem('dev_bypass_auth', 'true');
          localStorage.setItem('pw_role', 'patient');
        });
      }

      // Navigate to page
      const fullUrl = `${this.baseUrl}${pagePath}`;
      console.log(`  📍 Navigating to: ${fullUrl}`);
      
      const response = await page.goto(fullUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for React to load using delay helper
      await delay(2000);

      // Check for React errors
      const reactErrors = await page.evaluate(() => {
        const errors = [];
        // Check for React error boundaries
        const errorBoundaries = document.querySelectorAll('[data-error-boundary]');
        errorBoundaries.forEach(boundary => {
          if (boundary.textContent.includes('Error')) {
            errors.push({
              type: 'react_error',
              message: boundary.textContent
            });
          }
        });
        return errors;
      });

      errors.push(...reactErrors);

      // Take screenshot for visual verification
      const screenshotPath = `test-results/console-check-${pageName.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      });

      const result = {
        page: pageName,
        path: pagePath,
        url: fullUrl,
        status: response.status(),
        errors: errors.length,
        warnings: warnings.length,
        networkErrors: networkErrors.length,
        details: {
          consoleErrors: errors,
          consoleWarnings: warnings,
          networkErrors: networkErrors
        },
        screenshot: screenshotPath,
        timestamp: new Date().toISOString()
      };

      this.results.push(result);

      if (errors.length === 0 && networkErrors.length === 0) {
        console.log(`  ✅ ${pageName}: NO ERRORS FOUND`);
      } else {
        console.log(`  ❌ ${pageName}: ${errors.length} errors, ${networkErrors.length} network errors`);
        console.log(`     Errors:`, errors.map(e => e.message || e.type));
      }

    } catch (error) {
      console.log(`  💥 ${pageName}: NAVIGATION FAILED - ${error.message}`);
      this.results.push({
        page: pageName,
        path: pagePath,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      await page.close();
    }
  }

  async runAllTests() {
    console.log('🔬 Starting comprehensive console error check...');
    console.log(`📊 Testing ${CRITICAL_PAGES.length} critical pages`);
    
    // Create test results directory
    if (!fs.existsSync('test-results')) {
      fs.mkdirSync('test-results');
    }

    for (const page of CRITICAL_PAGES) {
      await this.checkPage(page.path, page.name);
      // Small delay between tests
      await delay(1000);
    }

    await this.generateReport();
  }

  async generateReport() {
    const report = {
      summary: {
        totalPages: this.results.length,
        pagesWithErrors: this.results.filter(r => r.errors > 0 || r.networkErrors > 0).length,
        totalErrors: this.results.reduce((sum, r) => sum + (r.errors || 0), 0),
        totalNetworkErrors: this.results.reduce((sum, r) => sum + (r.networkErrors || 0), 0),
        timestamp: new Date().toISOString()
      },
      results: this.results
    };

    // Save detailed report
    fs.writeFileSync(
      'test-results/console-error-report.json', 
      JSON.stringify(report, null, 2)
    );

    // Generate summary
    const summaryPath = 'test-results/console-error-summary.md';
    let summary = `# Console Error Check Summary\n\n`;
    summary += `**Date:** ${new Date().toLocaleString()}\n`;
    summary += `**Total Pages Tested:** ${report.summary.totalPages}\n`;
    summary += `**Pages With Errors:** ${report.summary.pagesWithErrors}\n`;
    summary += `**Total Console Errors:** ${report.summary.totalErrors}\n`;
    summary += `**Total Network Errors:** ${report.summary.totalNetworkErrors}\n\n`;

    if (report.summary.totalErrors === 0 && report.summary.totalNetworkErrors === 0) {
      summary += `## ✅ ALL PAGES PASSED - NO ERRORS FOUND\n\n`;
    } else {
      summary += `## ❌ ERRORS FOUND\n\n`;
      
      this.results.forEach(result => {
        if (result.errors > 0 || result.networkErrors > 0) {
          summary += `### ${result.page} (${result.path})\n`;
          summary += `- Console Errors: ${result.errors}\n`;
          summary += `- Network Errors: ${result.networkErrors}\n`;
          if (result.details) {
            if (result.details.consoleErrors.length > 0) {
              summary += `- Console Error Details:\n`;
              result.details.consoleErrors.forEach(error => {
                summary += `  - ${error.message || error.type}\n`;
              });
            }
            if (result.details.networkErrors.length > 0) {
              summary += `- Network Error Details:\n`;
              result.details.networkErrors.forEach(error => {
                summary += `  - ${error.url}: ${error.status} ${error.statusText}\n`;
              });
            }
          }
          summary += `\n`;
        }
      });
    }

    fs.writeFileSync(summaryPath, summary);
    console.log(`📄 Report saved to: ${summaryPath}`);
    console.log(`📄 Detailed report saved to: test-results/console-error-report.json`);
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run the checker
async function main() {
  const checker = new ConsoleErrorChecker();
  
  try {
    await checker.initialize();
    await checker.runAllTests();
  } catch (error) {
    console.error('❌ Console error check failed:', error);
  } finally {
    await checker.cleanup();
  }
}

if (require.main === module) {
  main();
}

module.exports = ConsoleErrorChecker;
