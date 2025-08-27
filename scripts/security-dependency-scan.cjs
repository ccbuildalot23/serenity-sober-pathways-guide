#!/usr/bin/env node

/**
 * Security Dependency Scanning Script
 * Automated vulnerability scanning for npm dependencies with HIPAA compliance reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SecurityDependencyScanner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      vulnerabilities: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        info: 0
      },
      hipaa_compliance: {
        status: 'unknown',
        issues: [],
        recommendations: []
      },
      dependencies: {
        total: 0,
        outdated: [],
        critical_packages: []
      }
    };

    this.criticalPackages = [
      '@supabase/supabase-js',
      'react',
      'react-dom',
      'dompurify',
      '@types/dompurify',
      'zod',
      '@tanstack/react-query',
      'bcrypt',
      'jsonwebtoken'
    ];
  }

  async runComprehensiveScan() {
    console.log('🔍 Starting comprehensive security dependency scan...\n');

    try {
      // 1. Run npm audit
      await this.runNpmAudit();
      
      // 2. Check for outdated packages
      await this.checkOutdatedPackages();
      
      // 3. Analyze critical security packages
      await this.analyzeCriticalPackages();
      
      // 4. Check package integrity
      await this.checkPackageIntegrity();
      
      // 5. Generate HIPAA compliance report
      this.generateHIPAAComplianceReport();
      
      // 6. Save results
      await this.saveResults();
      
      // 7. Generate recommendations
      this.generateRecommendations();
      
      // 8. Display summary
      this.displaySummary();
      
    } catch (error) {
      console.error('❌ Security scan failed:', error.message);
      process.exit(1);
    }
  }

  async runNpmAudit() {
    console.log('📋 Running npm audit...');
    
    try {
      // Run npm audit with JSON output
      const auditOutput = execSync('npm audit --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const auditData = JSON.parse(auditOutput);
      
      if (auditData.vulnerabilities) {
        Object.entries(auditData.vulnerabilities).forEach(([pkgName, vuln]) => {
          this.results.vulnerabilities.push({
            package: pkgName,
            severity: vuln.severity,
            title: vuln.title || 'Unknown vulnerability',
            description: vuln.description || 'No description available',
            cwe: vuln.cwe || [],
            cvss: vuln.cvss || null,
            range: vuln.range || 'Unknown',
            fixAvailable: vuln.fixAvailable || false,
            via: vuln.via || []
          });
          
          // Update summary counts
          this.results.summary.total++;
          if (vuln.severity) {
            this.results.summary[vuln.severity]++;
          }
        });
      }
      
      console.log(`   Found ${this.results.summary.total} vulnerabilities`);
      
    } catch (error) {
      // npm audit returns non-zero exit code when vulnerabilities are found
      if (error.stdout) {
        try {
          const auditData = JSON.parse(error.stdout);
          // Process audit data similar to above
          if (auditData.vulnerabilities) {
            Object.entries(auditData.vulnerabilities).forEach(([pkgName, vuln]) => {
              this.results.vulnerabilities.push({
                package: pkgName,
                severity: vuln.severity,
                title: vuln.title || 'Unknown vulnerability',
                description: vuln.description || 'No description available',
                cwe: vuln.cwe || [],
                cvss: vuln.cvss || null,
                range: vuln.range || 'Unknown',
                fixAvailable: vuln.fixAvailable || false,
                via: vuln.via || []
              });
              
              this.results.summary.total++;
              if (vuln.severity) {
                this.results.summary[vuln.severity]++;
              }
            });
          }
          console.log(`   Found ${this.results.summary.total} vulnerabilities`);
        } catch (parseError) {
          console.warn('   Could not parse npm audit output, continuing...');
        }
      } else {
        console.warn('   npm audit failed, continuing with other checks...');
      }
    }
  }

  async checkOutdatedPackages() {
    console.log('📦 Checking for outdated packages...');
    
    try {
      const outdatedOutput = execSync('npm outdated --json', { 
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      const outdatedData = JSON.parse(outdatedOutput);
      
      Object.entries(outdatedData).forEach(([pkgName, info]) => {
        this.results.dependencies.outdated.push({
          package: pkgName,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
          type: info.type,
          isCritical: this.criticalPackages.includes(pkgName)
        });
      });
      
      console.log(`   Found ${this.results.dependencies.outdated.length} outdated packages`);
      
    } catch (error) {
      // npm outdated returns non-zero when packages are outdated
      if (error.stdout) {
        try {
          const outdatedData = JSON.parse(error.stdout);
          Object.entries(outdatedData).forEach(([pkgName, info]) => {
            this.results.dependencies.outdated.push({
              package: pkgName,
              current: info.current,
              wanted: info.wanted,
              latest: info.latest,
              type: info.type,
              isCritical: this.criticalPackages.includes(pkgName)
            });
          });
          console.log(`   Found ${this.results.dependencies.outdated.length} outdated packages`);
        } catch (parseError) {
          console.log('   No outdated packages found or could not parse output');
        }
      } else {
        console.log('   No outdated packages found');
      }
    }
  }

  async analyzeCriticalPackages() {
    console.log('🔒 Analyzing critical security packages...');
    
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    const packageLockPath = path.join(process.cwd(), 'package-lock.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      console.warn('   package.json not found, skipping critical package analysis');
      return;
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDependencies = {
      ...packageJson.dependencies || {},
      ...packageJson.devDependencies || {}
    };
    
    this.results.dependencies.total = Object.keys(allDependencies).length;
    
    this.criticalPackages.forEach(criticalPackage => {
      if (allDependencies[criticalPackage]) {
        const currentVersion = allDependencies[criticalPackage];
        
        // Check if this package has vulnerabilities
        const packageVulns = this.results.vulnerabilities.filter(v => 
          v.package === criticalPackage || v.package.startsWith(criticalPackage + '/')
        );
        
        this.results.dependencies.critical_packages.push({
          package: criticalPackage,
          version: currentVersion,
          vulnerabilities: packageVulns.length,
          severity: packageVulns.length > 0 ? 
            Math.max(...packageVulns.map(v => this.getSeverityScore(v.severity))) : 0
        });
      }
    });
    
    console.log(`   Analyzed ${this.results.dependencies.critical_packages.length} critical packages`);
  }

  async checkPackageIntegrity() {
    console.log('🔐 Checking package integrity...');
    
    try {
      // Check if package-lock.json exists and is consistent
      const packageLockPath = path.join(process.cwd(), 'package-lock.json');
      
      if (fs.existsSync(packageLockPath)) {
        // Run npm ci --dry-run to check integrity
        execSync('npm ci --dry-run', { stdio: 'pipe' });
        console.log('   Package integrity verified');
      } else {
        console.warn('   package-lock.json not found - package integrity cannot be fully verified');
        this.results.hipaa_compliance.issues.push('Missing package-lock.json file');
      }
      
    } catch (error) {
      console.warn('   Package integrity check failed:', error.message);
      this.results.hipaa_compliance.issues.push('Package integrity verification failed');
    }
  }

  generateHIPAAComplianceReport() {
    console.log('🏥 Generating HIPAA compliance report...');
    
    const { critical, high, moderate } = this.results.summary;
    const totalSevere = critical + high + moderate;
    
    // Determine compliance status
    if (critical > 0) {
      this.results.hipaa_compliance.status = 'non-compliant';
      this.results.hipaa_compliance.issues.push(`${critical} critical vulnerabilities require immediate attention`);
    } else if (high > 5) {
      this.results.hipaa_compliance.status = 'needs-attention';
      this.results.hipaa_compliance.issues.push(`${high} high-severity vulnerabilities should be addressed`);
    } else if (totalSevere > 10) {
      this.results.hipaa_compliance.status = 'needs-attention';
      this.results.hipaa_compliance.issues.push(`${totalSevere} total vulnerabilities require review`);
    } else {
      this.results.hipaa_compliance.status = 'compliant';
    }
    
    // Check critical packages for issues
    const criticalPackageIssues = this.results.dependencies.critical_packages.filter(p => p.vulnerabilities > 0);
    if (criticalPackageIssues.length > 0) {
      this.results.hipaa_compliance.issues.push(
        `${criticalPackageIssues.length} critical security packages have known vulnerabilities`
      );
      if (this.results.hipaa_compliance.status === 'compliant') {
        this.results.hipaa_compliance.status = 'needs-attention';
      }
    }
    
    // Check for outdated critical packages
    const outdatedCritical = this.results.dependencies.outdated.filter(p => p.isCritical);
    if (outdatedCritical.length > 0) {
      this.results.hipaa_compliance.issues.push(
        `${outdatedCritical.length} critical packages are outdated`
      );
    }
    
    console.log(`   HIPAA compliance status: ${this.results.hipaa_compliance.status.toUpperCase()}`);
  }

  generateRecommendations() {
    const recommendations = this.results.hipaa_compliance.recommendations;
    
    // Critical vulnerabilities
    if (this.results.summary.critical > 0) {
      recommendations.push('URGENT: Fix all critical vulnerabilities immediately');
      recommendations.push('Run "npm audit fix" to automatically fix resolvable issues');
    }
    
    // High severity vulnerabilities
    if (this.results.summary.high > 0) {
      recommendations.push('Address high-severity vulnerabilities within 24 hours');
    }
    
    // Outdated packages
    if (this.results.dependencies.outdated.length > 0) {
      recommendations.push('Update outdated packages, especially security-related ones');
      recommendations.push('Run "npm update" to update to latest compatible versions');
    }
    
    // Critical package issues
    const criticalIssues = this.results.dependencies.critical_packages.filter(p => p.vulnerabilities > 0);
    if (criticalIssues.length > 0) {
      recommendations.push('Prioritize updates for critical security packages');
      criticalIssues.forEach(pkg => {
        recommendations.push(`  - Update ${pkg.package} (${pkg.vulnerabilities} vulnerabilities)`);
      });
    }
    
    // General recommendations
    recommendations.push('Implement automated dependency scanning in CI/CD pipeline');
    recommendations.push('Schedule weekly dependency security reviews');
    recommendations.push('Consider using npm audit in pre-commit hooks');
    recommendations.push('Maintain an updated security policy for dependency management');
    
    // HIPAA-specific recommendations
    if (this.results.hipaa_compliance.status !== 'compliant') {
      recommendations.push('Review HIPAA security requirements for healthcare applications');
      recommendations.push('Document all security decisions and risk assessments');
      recommendations.push('Implement additional monitoring for security-sensitive dependencies');
    }
  }

  async saveResults() {
    const outputDir = path.join(process.cwd(), 'security-reports');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(outputDir, `dependency-scan-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Security report saved to: ${reportPath}`);
  }

  displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 SECURITY DEPENDENCY SCAN SUMMARY');
    console.log('='.repeat(60));
    
    // Vulnerability summary
    console.log('\n📊 Vulnerability Summary:');
    console.log(`   Total vulnerabilities: ${this.results.summary.total}`);
    console.log(`   Critical: ${this.results.summary.critical}`);
    console.log(`   High: ${this.results.summary.high}`);
    console.log(`   Moderate: ${this.results.summary.moderate}`);
    console.log(`   Low: ${this.results.summary.low}`);
    console.log(`   Info: ${this.results.summary.info}`);
    
    // Dependency summary
    console.log('\n📦 Dependency Summary:');
    console.log(`   Total dependencies: ${this.results.dependencies.total}`);
    console.log(`   Outdated packages: ${this.results.dependencies.outdated.length}`);
    console.log(`   Critical packages analyzed: ${this.results.dependencies.critical_packages.length}`);
    
    // HIPAA compliance
    console.log('\n🏥 HIPAA Compliance:');
    console.log(`   Status: ${this.results.hipaa_compliance.status.toUpperCase()}`);
    
    if (this.results.hipaa_compliance.issues.length > 0) {
      console.log('\n⚠️  Issues requiring attention:');
      this.results.hipaa_compliance.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
    
    if (this.results.hipaa_compliance.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      this.results.hipaa_compliance.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }
    
    // Next steps
    console.log('\n📋 Next Steps:');
    if (this.results.summary.critical > 0) {
      console.log('   1. 🚨 URGENT: Fix critical vulnerabilities immediately');
      console.log('   2. Run: npm audit fix');
      console.log('   3. Verify fixes with: npm audit');
    } else if (this.results.summary.high > 0) {
      console.log('   1. Address high-severity vulnerabilities within 24 hours');
      console.log('   2. Run: npm audit fix');
    } else {
      console.log('   1. Monitor for new vulnerabilities daily');
      console.log('   2. Update dependencies regularly');
    }
    
    console.log('   3. Review security report in: ./security-reports/');
    console.log('   4. Schedule next security scan');
    console.log('   5. Update security documentation');
    
    // Final status
    const statusEmoji = this.results.hipaa_compliance.status === 'compliant' ? '✅' : 
                       this.results.hipaa_compliance.status === 'needs-attention' ? '⚠️' : '🚨';
    
    console.log(`\n${statusEmoji} Security scan completed - Status: ${this.results.hipaa_compliance.status.toUpperCase()}`);
    
    if (this.results.hipaa_compliance.status === 'non-compliant') {
      console.log('🚨 IMMEDIATE ACTION REQUIRED FOR HIPAA COMPLIANCE');
      process.exit(1);
    }
  }

  getSeverityScore(severity) {
    const scores = {
      'critical': 4,
      'high': 3,
      'moderate': 2,
      'low': 1,
      'info': 0
    };
    return scores[severity] || 0;
  }
}

// Main execution
async function main() {
  const scanner = new SecurityDependencyScanner();
  await scanner.runComprehensiveScan();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Scan failed:', error);
    process.exit(1);
  });
}

module.exports = { SecurityDependencyScanner };
















