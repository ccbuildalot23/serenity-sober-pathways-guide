const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Accessibility Test Runner for Recovery Platform
 * Executes comprehensive accessibility tests and generates detailed reports
 * Focus: Healthcare accessibility compliance and emotional distress scenarios
 */

class AccessibilityTestRunner {
  constructor() {
    this.testResults = {
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        startTime: new Date(),
        endTime: null
      },
      suites: [],
      violations: [],
      recommendations: []
    };
    
    this.testSuites = [
      {
        name: 'Crisis State Accessibility Tests',
        file: 'crisis-state-tests.spec.ts',
        description: 'Tests critical recovery components during high emotional distress scenarios',
        priority: 'critical'
      },
      {
        name: 'Cognitive Load Testing',
        file: 'cognitive-load-tests.spec.ts', 
        description: 'Tests components when users have reduced cognitive capacity',
        priority: 'high'
      },
      {
        name: 'Accessibility Standards Compliance',
        file: 'accessibility-standards-tests.spec.ts',
        description: 'Comprehensive WCAG 2.1 AA compliance testing',
        priority: 'critical'
      },
      {
        name: 'Mobile Crisis Testing',
        file: 'mobile-crisis-tests.spec.ts',
        description: 'Touch targets, gestures, and mobile crisis accessibility',
        priority: 'high'
      },
      {
        name: 'Emotional Distress Scenarios',
        file: 'emotional-distress-scenarios.spec.ts',
        description: 'Real-world recovery scenarios during vulnerable emotional states',
        priority: 'critical'
      }
    ];
  }

  async runAllTests() {
    console.log('🏥 Starting Recovery Platform Accessibility Test Suite...\n');
    console.log('Focus: Critical healthcare accessibility for emotional distress scenarios\n');
    
    // Ensure test results directory exists
    const resultsDir = path.join(__dirname, '../../test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    for (const suite of this.testSuites) {
      await this.runTestSuite(suite);
    }

    this.testResults.summary.endTime = new Date();
    this.generateReport();
    this.generateRecommendations();
    
    console.log('\n📊 Test execution completed. Check reports in test-results/ directory.');
    
    return this.testResults;
  }

  async runTestSuite(suite) {
    console.log(`🧪 Running ${suite.name}...`);
    console.log(`📋 ${suite.description}`);
    
    const suiteResult = {
      name: suite.name,
      file: suite.file,
      priority: suite.priority,
      startTime: new Date(),
      endTime: null,
      passed: 0,
      failed: 0,
      warnings: 0,
      violations: [],
      duration: 0
    };

    try {
      // Run Playwright test for this suite
      const command = `npx playwright test tests/accessibility/${suite.file} --reporter=json --output=test-results/playwright-${suite.file.replace('.spec.ts', '')}.json`;
      console.log(`   Executing: ${command}`);
      
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: 300000, // 5 minutes timeout per suite
        cwd: process.cwd()
      });

      // Since we're outputting to file, read the JSON result
      const jsonFile = path.join(__dirname, '../../test-results', `playwright-${suite.file.replace('.spec.ts', '')}.json`);
      if (fs.existsSync(jsonFile)) {
        const results = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
        this.processTestResults(results, suiteResult);
      } else {
        // Parse stdout if no file output
        try {
          const results = JSON.parse(output);
          this.processTestResults(results, suiteResult);
        } catch (parseError) {
          console.log(`⚠️  Could not parse JSON output for ${suite.name}`);
          console.log('   Output:', output.substring(0, 200) + '...');
          suiteResult.warnings++;
        }
      }

    } catch (error) {
      console.error(`❌ Error running ${suite.name}:`, error.message);
      suiteResult.failed++;
      
      // Store error details for reporting
      suiteResult.violations.push({
        type: 'test_execution_error',
        message: error.message,
        severity: 'critical'
      });
    }

    suiteResult.endTime = new Date();
    suiteResult.duration = suiteResult.endTime - suiteResult.startTime;
    
    this.testResults.suites.push(suiteResult);
    this.updateSummary(suiteResult);
    
    console.log(`✅ ${suite.name} completed: ${suiteResult.passed} passed, ${suiteResult.failed} failed, ${suiteResult.warnings} warnings`);
    console.log(`⏱️  Duration: ${Math.round(suiteResult.duration / 1000)}s\n`);
  }

  processTestResults(playwrightResults, suiteResult) {
    if (playwrightResults.suites) {
      playwrightResults.suites.forEach(suite => {
        suite.specs?.forEach(spec => {
          spec.tests?.forEach(test => {
            if (test.results?.[0]?.status === 'passed') {
              suiteResult.passed++;
            } else if (test.results?.[0]?.status === 'failed') {
              suiteResult.failed++;
              
              // Extract accessibility violations from test failures
              const error = test.results[0].error;
              if (error?.message) {
                suiteResult.violations.push({
                  test: test.title,
                  type: 'accessibility_violation',
                  message: error.message,
                  severity: this.determineSeverity(error.message)
                });
              }
            } else {
              suiteResult.warnings++;
            }
          });
        });
      });
    }
  }

  determineSeverity(errorMessage) {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('critical') || message.includes('emergency') || message.includes('crisis')) {
      return 'critical';
    } else if (message.includes('serious') || message.includes('keyboard') || message.includes('screen reader')) {
      return 'serious'; 
    } else if (message.includes('moderate') || message.includes('color') || message.includes('contrast')) {
      return 'moderate';
    } else {
      return 'minor';
    }
  }

  updateSummary(suiteResult) {
    this.testResults.summary.totalTests += suiteResult.passed + suiteResult.failed + suiteResult.warnings;
    this.testResults.summary.passed += suiteResult.passed;
    this.testResults.summary.failed += suiteResult.failed;
    this.testResults.summary.warnings += suiteResult.warnings;
    
    // Collect all violations for global analysis
    this.testResults.violations.push(...suiteResult.violations);
  }

  generateReport() {
    const reportPath = path.join(__dirname, '../../test-results/accessibility-report.html');
    
    const html = this.generateHTMLReport();
    fs.writeFileSync(reportPath, html);
    
    // Also generate JSON report for programmatic analysis
    const jsonPath = path.join(__dirname, '../../test-results/accessibility-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(this.testResults, null, 2));
    
    console.log(`📄 HTML Report: ${reportPath}`);
    console.log(`📄 JSON Report: ${jsonPath}`);
  }

  generateHTMLReport() {
    const { summary, suites, violations } = this.testResults;
    const duration = summary.endTime - summary.startTime;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recovery Platform Accessibility Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f7fa; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 2.5em; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 1.2em; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .summary-card h3 { margin: 0; color: #666; font-size: 0.9em; text-transform: uppercase; letter-spacing: 1px; }
        .summary-card .value { font-size: 2.5em; font-weight: bold; margin: 10px 0; }
        .passed .value { color: #28a745; }
        .failed .value { color: #dc3545; }
        .warnings .value { color: #ffc107; }
        .total .value { color: #6c757d; }
        .suites { display: grid; gap: 20px; margin-bottom: 30px; }
        .suite { background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .suite-header { padding: 20px; border-bottom: 1px solid #eee; }
        .suite-title { margin: 0; color: #333; display: flex; justify-content: space-between; align-items: center; }
        .priority { padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; text-transform: uppercase; }
        .priority.critical { background: #dc3545; color: white; }
        .priority.high { background: #fd7e14; color: white; }
        .priority.medium { background: #ffc107; color: black; }
        .suite-description { color: #666; margin: 10px 0 0 0; }
        .suite-results { padding: 20px; display: flex; gap: 20px; align-items: center; }
        .result-badge { padding: 5px 12px; border-radius: 20px; font-weight: bold; font-size: 0.9em; }
        .result-badge.passed { background: #d4edda; color: #155724; }
        .result-badge.failed { background: #f8d7da; color: #721c24; }
        .result-badge.warnings { background: #fff3cd; color: #856404; }
        .violations { background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 30px; }
        .violation { border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; background: #f8f9fa; border-radius: 0 5px 5px 0; }
        .violation.serious { border-left-color: #fd7e14; }
        .violation.moderate { border-left-color: #ffc107; }
        .violation.minor { border-left-color: #6c757d; }
        .violation-title { font-weight: bold; margin-bottom: 5px; }
        .violation-message { color: #666; line-height: 1.5; }
        .footer { text-align: center; padding: 30px; color: #666; }
        .healthcare-focus { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
        .healthcare-focus h2 { margin: 0 0 10px 0; }
        .healthcare-focus p { margin: 0; opacity: 0.9; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 Recovery Platform Accessibility Report</h1>
            <p>Comprehensive accessibility testing for mental health and substance abuse recovery platform</p>
            <p>Focus: Critical healthcare accessibility during emotional distress scenarios</p>
        </div>

        <div class="healthcare-focus">
            <h2>🚨 Healthcare Accessibility Priority</h2>
            <p>This platform serves users in crisis situations including panic attacks, severe cravings, social anxiety, and decision paralysis. All accessibility violations must be addressed immediately as they could prevent users from accessing life-saving support during their most vulnerable moments.</p>
        </div>

        <div class="summary">
            <div class="summary-card total">
                <h3>Total Tests</h3>
                <div class="value">${summary.totalTests}</div>
            </div>
            <div class="summary-card passed">
                <h3>Passed</h3>
                <div class="value">${summary.passed}</div>
            </div>
            <div class="summary-card failed">
                <h3>Failed</h3>
                <div class="value">${summary.failed}</div>
            </div>
            <div class="summary-card warnings">
                <h3>Warnings</h3>
                <div class="value">${summary.warnings}</div>
            </div>
        </div>

        <h2>📋 Test Suites</h2>
        <div class="suites">
            ${suites.map(suite => `
                <div class="suite">
                    <div class="suite-header">
                        <div class="suite-title">
                            <span>${suite.name}</span>
                            <span class="priority ${suite.priority}">${suite.priority}</span>
                        </div>
                        <div class="suite-description">${this.testSuites.find(s => s.name === suite.name)?.description || ''}</div>
                    </div>
                    <div class="suite-results">
                        <span class="result-badge passed">${suite.passed} passed</span>
                        <span class="result-badge failed">${suite.failed} failed</span>
                        <span class="result-badge warnings">${suite.warnings} warnings</span>
                        <span style="margin-left: auto; color: #666;">⏱️ ${Math.round(suite.duration / 1000)}s</span>
                    </div>
                </div>
            `).join('')}
        </div>

        <h2>⚠️ Accessibility Violations</h2>
        <div class="violations">
            ${violations.length === 0 ? '<p style="text-align: center; color: #28a745; font-size: 1.2em;">🎉 No accessibility violations detected!</p>' : violations.map(violation => `
                <div class="violation ${violation.severity}">
                    <div class="violation-title">${violation.test || violation.type}</div>
                    <div class="violation-message">${violation.message}</div>
                </div>
            `).join('')}
        </div>

        <div class="footer">
            <p>Report generated on ${summary.endTime.toLocaleString()}</p>
            <p>Total execution time: ${Math.round(duration / 1000)} seconds</p>
            <p><strong>Healthcare Priority:</strong> Address all CRITICAL and SERIOUS violations immediately</p>
        </div>
    </div>
</body>
</html>`;
  }

  generateRecommendations() {
    const recommendations = [
      {
        priority: 'critical',
        title: 'Crisis Button Accessibility',
        description: 'Ensure all crisis and emergency buttons meet minimum 60px touch target size for users with hand tremors',
        component: 'Crisis System'
      },
      {
        priority: 'critical', 
        title: 'Screen Reader Crisis Support',
        description: 'Verify all crisis modals have proper ARIA labels and live regions for immediate screen reader announcement',
        component: 'HALT Assessment, Crisis Toolkit'
      },
      {
        priority: 'high',
        title: 'Cognitive Load Reduction',
        description: 'Implement simplified navigation paths with maximum 3 choices for users with impaired cognitive function',
        component: 'All Recovery Tools'
      },
      {
        priority: 'high',
        title: 'Color Contrast for Crisis Indicators', 
        description: 'Ensure enhanced color contrast (7:1 ratio) for all crisis warning indicators and high-intensity displays',
        component: 'HALT Assessment, Craving Timer'
      },
      {
        priority: 'medium',
        title: 'Mobile Crisis Optimization',
        description: 'Optimize all crisis functions for one-handed mobile use with thumb-friendly button placement',
        component: 'Mobile Interface'
      }
    ];

    const recommendationsPath = path.join(__dirname, '../../test-results/accessibility-recommendations.json');
    fs.writeFileSync(recommendationsPath, JSON.stringify(recommendations, null, 2));
    
    console.log(`💡 Recommendations: ${recommendationsPath}`);
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new AccessibilityTestRunner();
  runner.runAllTests().catch(console.error);
}

module.exports = AccessibilityTestRunner;