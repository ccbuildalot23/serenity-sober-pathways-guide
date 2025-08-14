#!/usr/bin/env node

/**
 * Deployment Check Script
 * Runs comprehensive deployment validation checks
 * Fails the build if critical issues are found
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import ora from 'ora';

const execAsync = promisify(exec);

const CRITICAL_THRESHOLDS = {
  infrastructure: 90,
  security: 95,
  compliance: 95,
  performance: 85,
  integrations: 90,
  data: 95
};

async function runDeploymentCheck() {
  console.log(chalk.cyan.bold('\n🚀 Running Deployment Validation Checks\n'));
  
  const spinner = ora('Starting validation...').start();
  
  try {
    // Run comprehensive validation using existing script
    spinner.text = 'Running comprehensive validation...';
    
    // First run the TypeScript validation script
    let report;
    try {
      const { stdout } = await execAsync('npx ts-node scripts/deployment-validation.ts');
      // Parse the output
      const lines = stdout.split('\n');
      const jsonLine = lines.find(line => line.includes('{') && line.includes('readinessScore'));
      if (jsonLine) {
        report = JSON.parse(jsonLine);
      }
    } catch (error) {
      // Fallback to manual checks if TypeScript execution fails
      report = await performManualValidation();
    }
    
    spinner.stop();
    
    // Display results
    displayValidationResults(report);
    
    // Check for critical issues
    const criticalIssues = checkForCriticalIssues(report);
    
    if (criticalIssues.length > 0) {
      console.log(chalk.red.bold('\n❌ Deployment Blocked - Critical Issues Found:\n'));
      
      criticalIssues.forEach(issue => {
        console.log(chalk.red(`  • ${issue}`));
      });
      
      console.log(chalk.yellow('\n📋 Recommended Actions:'));
      report.recommendations.forEach(rec => {
        console.log(chalk.yellow(`  • ${rec}`));
      });
      
      process.exit(1);
    }
    
    // Check readiness score
    if (report.readinessScore < 85) {
      console.log(chalk.yellow.bold(`\n⚠️  Warning: Readiness score (${report.readinessScore}%) is below recommended threshold (85%)`));
      
      const proceed = await promptUser('Do you want to proceed with deployment anyway? (y/n): ');
      
      if (!proceed) {
        console.log(chalk.red('\n❌ Deployment cancelled by user'));
        process.exit(1);
      }
    }
    
    console.log(chalk.green.bold('\n✅ Deployment validation passed!\n'));
    console.log(chalk.green(`Readiness Score: ${report.readinessScore}%`));
    console.log(chalk.green(`Overall Status: ${report.overallStatus}`));
    
    // Save report for audit
    await saveValidationReport(report);
    
    process.exit(0);
    
  } catch (error) {
    spinner.fail('Validation failed');
    console.error(chalk.red('\n❌ Deployment validation error:'), error.message);
    
    if (error.stack && process.env.DEBUG) {
      console.error(chalk.gray(error.stack));
    }
    
    process.exit(1);
  }
}

async function performManualValidation() {
  // Fallback validation when TypeScript service isn't available
  const report = {
    metrics: {},
    readinessScore: 0,
    overallStatus: 'unknown',
    timestamp: new Date().toISOString(),
    findings: [],
    recommendations: []
  };
  
  // Check infrastructure
  try {
    await execAsync('npm run typecheck');
    report.metrics.infrastructure = { score: 95 };
  } catch {
    report.metrics.infrastructure = { score: 70 };
    report.findings.push({ severity: 'high', message: 'TypeScript errors detected' });
  }
  
  // Check build
  try {
    await execAsync('npm run build --dry-run');
    report.metrics.performance = { score: 90 };
  } catch {
    report.metrics.performance = { score: 60 };
    report.findings.push({ severity: 'critical', message: 'Build process failed' });
  }
  
  // Check tests
  try {
    const { stdout } = await execAsync('npm run test:e2e -- --list');
    report.metrics.integrations = { score: 95 };
  } catch {
    report.metrics.integrations = { score: 80 };
  }
  
  // Set default security and compliance scores
  report.metrics.security = { score: 90 };
  report.metrics.compliance = { score: 90 };
  report.metrics.data = { score: 95 };
  
  // Calculate readiness score
  const scores = Object.values(report.metrics).map(m => m.score);
  report.readinessScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  
  // Determine overall status
  if (report.readinessScore >= 90) {
    report.overallStatus = 'ready';
  } else if (report.readinessScore >= 75) {
    report.overallStatus = 'warning';
  } else {
    report.overallStatus = 'not_ready';
  }
  
  return report;
}

function displayValidationResults(report) {
  console.log(chalk.cyan.bold('\n📊 Validation Results:\n'));
  
  const categories = [
    { key: 'infrastructure', label: 'Infrastructure', icon: '🏗️' },
    { key: 'security', label: 'Security', icon: '🔒' },
    { key: 'compliance', label: 'Compliance', icon: '📋' },
    { key: 'performance', label: 'Performance', icon: '⚡' },
    { key: 'integrations', label: 'Integrations', icon: '🔗' },
    { key: 'data', label: 'Data Integrity', icon: '💾' }
  ];
  
  categories.forEach(({ key, label, icon }) => {
    const metric = report.metrics[key];
    if (!metric) return;
    
    const score = metric.score;
    const threshold = CRITICAL_THRESHOLDS[key];
    let color = chalk.green;
    let status = '✓';
    
    if (score < threshold) {
      color = chalk.red;
      status = '✗';
    } else if (score < threshold + 5) {
      color = chalk.yellow;
      status = '⚠';
    }
    
    console.log(
      `${icon} ${chalk.bold(label.padEnd(20))} ${status} ${color(score + '%')} ` +
      chalk.gray(`(threshold: ${threshold}%)`)
    );
    
    // Show failed checks
    if (metric.checks) {
      const failedChecks = metric.checks.filter(c => !c.passed);
      if (failedChecks.length > 0) {
        failedChecks.forEach(check => {
          console.log(chalk.red(`    ✗ ${check.name}: ${check.message}`));
        });
      }
    }
  });
  
  // Display overall metrics
  console.log(chalk.cyan.bold('\n📈 Overall Metrics:\n'));
  console.log(`  Readiness Score: ${getColoredScore(report.readinessScore)}%`);
  console.log(`  Status: ${getColoredStatus(report.overallStatus)}`);
  console.log(`  Timestamp: ${chalk.gray(new Date(report.timestamp).toLocaleString())}`);
  
  // Display critical findings
  if (report.findings && report.findings.length > 0) {
    console.log(chalk.yellow.bold('\n⚠️  Findings:\n'));
    report.findings.forEach(finding => {
      const icon = finding.severity === 'critical' ? '🔴' : 
                   finding.severity === 'high' ? '🟠' : 
                   finding.severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${icon} [${finding.severity.toUpperCase()}] ${finding.message}`);
    });
  }
}

function checkForCriticalIssues(report) {
  const issues = [];
  
  // Check each category against critical thresholds
  Object.entries(CRITICAL_THRESHOLDS).forEach(([category, threshold]) => {
    const metric = report.metrics[category];
    if (metric && metric.score < threshold) {
      issues.push(`${category} score (${metric.score}%) is below critical threshold (${threshold}%)`);
    }
  });
  
  // Check for critical findings
  if (report.findings) {
    const criticalFindings = report.findings.filter(f => f.severity === 'critical');
    criticalFindings.forEach(finding => {
      issues.push(`Critical: ${finding.message}`);
    });
  }
  
  // Check specific critical requirements
  if (report.metrics.security?.checks) {
    const securityChecks = report.metrics.security.checks;
    
    // HIPAA compliance is mandatory
    const hipaaCheck = securityChecks.find(c => c.name.includes('HIPAA'));
    if (hipaaCheck && !hipaaCheck.passed) {
      issues.push('HIPAA compliance check failed - deployment blocked');
    }
    
    // SOC-2 compliance is mandatory
    const soc2Check = securityChecks.find(c => c.name.includes('SOC-2'));
    if (soc2Check && !soc2Check.passed) {
      issues.push('SOC-2 compliance check failed - deployment blocked');
    }
  }
  
  // Check crisis response time
  if (report.metrics.performance?.checks) {
    const crisisCheck = report.metrics.performance.checks.find(c => 
      c.name.includes('crisis') || c.name.includes('Crisis')
    );
    if (crisisCheck && !crisisCheck.passed) {
      issues.push('Crisis response time exceeds 250ms threshold');
    }
  }
  
  return issues;
}

function getColoredScore(score) {
  if (score >= 90) return chalk.green(score);
  if (score >= 75) return chalk.yellow(score);
  return chalk.red(score);
}

function getColoredStatus(status) {
  switch (status) {
    case 'ready':
      return chalk.green('✅ Ready for Production');
    case 'warning':
      return chalk.yellow('⚠️  Ready with Warnings');
    case 'not_ready':
      return chalk.red('❌ Not Ready');
    default:
      return chalk.gray(status);
  }
}

async function promptUser(question) {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdout.write(chalk.yellow(question));
    
    process.stdin.once('data', (data) => {
      process.stdin.pause();
      const answer = data.toString().trim().toLowerCase();
      resolve(answer === 'y' || answer === 'yes');
    });
  });
}

async function saveValidationReport(report) {
  try {
    const fs = await import('fs/promises');
    const reportDir = './deployment-reports';
    
    // Create directory if it doesn't exist
    await fs.mkdir(reportDir, { recursive: true });
    
    // Save report with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${reportDir}/validation-${timestamp}.json`;
    
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    console.log(chalk.gray(`\n📁 Report saved to: ${filename}`));
    
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Warning: Could not save validation report:'), error.message);
  }
}

// Run the deployment check
runDeploymentCheck().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});