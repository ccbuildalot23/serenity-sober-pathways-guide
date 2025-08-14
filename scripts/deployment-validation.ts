#!/usr/bin/env ts-node

/**
 * Comprehensive Deployment Validation Script
 * Execute before December 2025 soft launch to ensure system readiness
 * 
 * Usage: npx ts-node scripts/deployment-validation.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

interface ValidationResult {
  category: string;
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  remediation?: string;
  details?: any;
}

interface DeploymentReadiness {
  timestamp: Date;
  environment: string;
  overallStatus: 'ready' | 'not-ready' | 'needs-attention';
  readinessScore: number;
  criticalIssues: number;
  highPriorityIssues: number;
  warnings: number;
  passed: number;
  total: number;
  validations: ValidationResult[];
  recommendations: string[];
}

class DeploymentValidator {
  private results: ValidationResult[] = [];
  private readonly criticalServices = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'DATABASE_CONNECTION',
    'AUTHENTICATION',
    'CRISIS_RESPONSE',
    'PAYMENT_GATEWAY'
  ];

  async runValidation(): Promise<DeploymentReadiness> {
    console.log('\n🚀 SERENITY DEPLOYMENT VALIDATION');
    console.log('   Target Launch: December 2025');
    console.log('   Environment:', process.env.NODE_ENV || 'development');
    console.log('=' . repeat(50) + '\n');

    // Run all validation checks
    await this.validateEnvironment();
    await this.validateSecurity();
    await this.validateCompliance();
    await this.validatePerformance();
    await this.validateIntegrations();
    await this.validateBackups();
    await this.validateMonitoring();
    await this.validateDocumentation();
    await this.validateScalability();
    await this.validateFinancials();

    // Calculate readiness
    const readiness = this.calculateReadiness();
    
    // Generate report
    this.generateReport(readiness);
    
    // Save results
    await this.saveResults(readiness);
    
    return readiness;
  }

  private async validateEnvironment(): Promise<void> {
    console.log('🔍 Validating Environment Configuration...');
    
    // Check Node version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion >= 20) {
      this.addResult('Environment', 'Node.js Version', 'pass', 
        `Node.js ${nodeVersion} meets requirements`);
    } else {
      this.addResult('Environment', 'Node.js Version', 'fail', 
        `Node.js ${nodeVersion} below required v20+`, 'high',
        'Upgrade to Node.js 20 or higher');
    }
    
    // Check required environment variables
    const requiredVars = [
      { name: 'VITE_SUPABASE_URL', critical: true },
      { name: 'VITE_SUPABASE_ANON_KEY', critical: true },
      { name: 'STRIPE_SECRET_KEY', critical: true },
      { name: 'STRIPE_WEBHOOK_SECRET', critical: true },
      { name: 'ENCRYPTION_KEY', critical: true },
      { name: 'SENTRY_DSN', critical: false },
      { name: 'OPENTELEMETRY_ENDPOINT', critical: false }
    ];
    
    for (const envVar of requiredVars) {
      if (process.env[envVar.name]) {
        this.addResult('Environment', `${envVar.name}`, 'pass', 
          `${envVar.name} configured`);
      } else {
        this.addResult('Environment', `${envVar.name}`, 
          envVar.critical ? 'fail' : 'warning',
          `${envVar.name} not configured`,
          envVar.critical ? 'critical' : 'medium',
          `Set ${envVar.name} in environment configuration`);
      }
    }
    
    // Check deployment mode
    if (process.env.NODE_ENV === 'production') {
      this.addResult('Environment', 'Deployment Mode', 'pass', 
        'Running in production mode');
    } else {
      this.addResult('Environment', 'Deployment Mode', 'warning', 
        `Running in ${process.env.NODE_ENV || 'development'} mode`, 'medium',
        'Set NODE_ENV=production for deployment');
    }
  }

  private async validateSecurity(): Promise<void> {
    console.log('🔒 Validating Security Configuration...');
    
    // Check HTTPS enforcement
    const httpsEnforced = process.env.FORCE_HTTPS === 'true';
    this.addResult('Security', 'HTTPS Enforcement', 
      httpsEnforced ? 'pass' : 'fail',
      httpsEnforced ? 'HTTPS enforced' : 'HTTPS not enforced',
      'critical',
      'Enable FORCE_HTTPS=true in production');
    
    // Check CSP headers
    const cspConfigured = process.env.CONTENT_SECURITY_POLICY;
    this.addResult('Security', 'CSP Headers', 
      cspConfigured ? 'pass' : 'warning',
      cspConfigured ? 'CSP headers configured' : 'CSP headers not configured',
      'high',
      'Configure Content Security Policy headers');
    
    // Check rate limiting
    const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED === 'true';
    this.addResult('Security', 'Rate Limiting', 
      rateLimitEnabled ? 'pass' : 'warning',
      rateLimitEnabled ? 'Rate limiting enabled' : 'Rate limiting not enabled',
      'medium',
      'Enable rate limiting for API endpoints');
    
    // Check encryption
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (encryptionKey && encryptionKey.length >= 32) {
      this.addResult('Security', 'Encryption Key', 'pass', 
        'Encryption key configured properly');
    } else {
      this.addResult('Security', 'Encryption Key', 'fail', 
        'Encryption key missing or too short', 'critical',
        'Generate 256-bit encryption key');
    }
    
    // Check MFA enforcement
    const mfaRequired = process.env.REQUIRE_MFA === 'true';
    this.addResult('Security', 'MFA Enforcement', 
      mfaRequired ? 'pass' : 'warning',
      mfaRequired ? 'MFA required for all users' : 'MFA not enforced',
      'high',
      'Enable REQUIRE_MFA=true for production');
  }

  private async validateCompliance(): Promise<void> {
    console.log('⚖️ Validating Compliance Requirements...');
    
    // HIPAA compliance checks
    const hipaaChecks = [
      { name: 'PHI Encryption', env: 'PHI_ENCRYPTION_ENABLED', critical: true },
      { name: 'Audit Logging', env: 'AUDIT_LOGGING_ENABLED', critical: true },
      { name: 'Access Controls', env: 'RBAC_ENABLED', critical: true },
      { name: 'Data Retention', env: 'DATA_RETENTION_POLICY', critical: true },
      { name: 'Session Timeout', env: 'SESSION_TIMEOUT_MINUTES', critical: true },
      { name: 'BAA Tracking', env: 'BAA_MANAGEMENT_ENABLED', critical: false }
    ];
    
    let hipaaScore = 0;
    for (const check of hipaaChecks) {
      const enabled = process.env[check.env] === 'true' || !!process.env[check.env];
      if (enabled) {
        hipaaScore++;
        this.addResult('Compliance', `HIPAA: ${check.name}`, 'pass', 
          `${check.name} configured`);
      } else {
        this.addResult('Compliance', `HIPAA: ${check.name}`, 
          check.critical ? 'fail' : 'warning',
          `${check.name} not configured`,
          check.critical ? 'critical' : 'high',
          `Configure ${check.env} for HIPAA compliance`);
      }
    }
    
    const hipaaCompliance = (hipaaScore / hipaaChecks.length) * 100;
    this.addResult('Compliance', 'HIPAA Overall', 
      hipaaCompliance >= 95 ? 'pass' : hipaaCompliance >= 80 ? 'warning' : 'fail',
      `HIPAA compliance: ${hipaaCompliance.toFixed(1)}%`,
      hipaaCompliance < 80 ? 'critical' : 'high');
    
    // SOC-2 readiness
    const soc2Checks = [
      'SECURITY_MONITORING',
      'CHANGE_MANAGEMENT', 
      'INCIDENT_RESPONSE',
      'VENDOR_MANAGEMENT',
      'RISK_ASSESSMENT'
    ];
    
    let soc2Score = 0;
    for (const check of soc2Checks) {
      if (process.env[check + '_ENABLED'] === 'true') {
        soc2Score++;
      }
    }
    
    const soc2Readiness = (soc2Score / soc2Checks.length) * 100;
    this.addResult('Compliance', 'SOC-2 Readiness', 
      soc2Readiness >= 80 ? 'pass' : 'warning',
      `SOC-2 readiness: ${soc2Readiness.toFixed(1)}%`,
      'medium',
      'Complete SOC-2 control implementation');
  }

  private async validatePerformance(): Promise<void> {
    console.log('⚡ Validating Performance Configuration...');
    
    // Check caching configuration
    const cacheEnabled = process.env.REDIS_URL || process.env.CACHE_ENABLED === 'true';
    this.addResult('Performance', 'Caching', 
      cacheEnabled ? 'pass' : 'warning',
      cacheEnabled ? 'Caching configured' : 'No caching configured',
      'medium',
      'Configure Redis or memory caching');
    
    // Check CDN configuration
    const cdnEnabled = process.env.CDN_URL || process.env.CLOUDFLARE_ENABLED === 'true';
    this.addResult('Performance', 'CDN', 
      cdnEnabled ? 'pass' : 'warning',
      cdnEnabled ? 'CDN configured' : 'No CDN configured',
      'low',
      'Configure CDN for static assets');
    
    // Check database connection pooling
    const dbPoolSize = parseInt(process.env.DB_POOL_SIZE || '10');
    this.addResult('Performance', 'Database Pooling', 
      dbPoolSize >= 20 ? 'pass' : 'warning',
      `Database pool size: ${dbPoolSize}`,
      'medium',
      'Increase DB_POOL_SIZE for production load');
    
    // Check response time targets
    const targetResponseTime = parseInt(process.env.TARGET_RESPONSE_TIME_MS || '500');
    this.addResult('Performance', 'Response Time Target', 
      targetResponseTime <= 250 ? 'pass' : 'warning',
      `Target response time: ${targetResponseTime}ms`,
      'medium',
      'Set target to 250ms for crisis response');
  }

  private async validateIntegrations(): Promise<void> {
    console.log('🔌 Validating External Integrations...');
    
    // Stripe payment gateway
    if (process.env.STRIPE_SECRET_KEY) {
      this.addResult('Integrations', 'Stripe Payments', 'pass', 
        'Stripe payment gateway configured');
      
      // Check webhook configuration
      if (process.env.STRIPE_WEBHOOK_SECRET) {
        this.addResult('Integrations', 'Stripe Webhooks', 'pass', 
          'Stripe webhooks configured');
      } else {
        this.addResult('Integrations', 'Stripe Webhooks', 'fail', 
          'Stripe webhook secret missing', 'critical',
          'Configure STRIPE_WEBHOOK_SECRET for payment processing');
      }
    } else {
      this.addResult('Integrations', 'Stripe Payments', 'fail', 
        'Stripe not configured', 'critical',
        'Configure Stripe for payment processing');
    }
    
    // Error monitoring
    if (process.env.SENTRY_DSN) {
      this.addResult('Integrations', 'Error Monitoring', 'pass', 
        'Sentry error monitoring configured');
    } else {
      this.addResult('Integrations', 'Error Monitoring', 'warning', 
        'Error monitoring not configured', 'medium',
        'Configure Sentry for production error tracking');
    }
    
    // Analytics
    const analyticsConfigured = process.env.GOOGLE_ANALYTICS_ID || 
                               process.env.MIXPANEL_TOKEN;
    this.addResult('Integrations', 'Analytics', 
      analyticsConfigured ? 'pass' : 'warning',
      analyticsConfigured ? 'Analytics configured' : 'Analytics not configured',
      'low',
      'Configure analytics for usage tracking');
    
    // Email service
    const emailConfigured = process.env.SENDGRID_API_KEY || 
                          process.env.RESEND_API_KEY ||
                          process.env.SMTP_HOST;
    this.addResult('Integrations', 'Email Service', 
      emailConfigured ? 'pass' : 'fail',
      emailConfigured ? 'Email service configured' : 'Email service not configured',
      'critical',
      'Configure email service for notifications');
  }

  private async validateBackups(): Promise<void> {
    console.log('💾 Validating Backup Configuration...');
    
    // Database backups
    const dbBackupEnabled = process.env.DB_BACKUP_ENABLED === 'true';
    this.addResult('Backups', 'Database Backups', 
      dbBackupEnabled ? 'pass' : 'fail',
      dbBackupEnabled ? 'Database backups enabled' : 'Database backups not enabled',
      'critical',
      'Enable automated database backups');
    
    // Backup frequency
    const backupFrequency = process.env.BACKUP_FREQUENCY_HOURS || '24';
    const frequency = parseInt(backupFrequency);
    this.addResult('Backups', 'Backup Frequency', 
      frequency <= 6 ? 'pass' : frequency <= 24 ? 'warning' : 'fail',
      `Backup frequency: every ${frequency} hours`,
      frequency > 24 ? 'high' : 'medium',
      'Set backup frequency to 6 hours or less');
    
    // Backup retention
    const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '7');
    this.addResult('Backups', 'Backup Retention', 
      retentionDays >= 30 ? 'pass' : 'warning',
      `Backup retention: ${retentionDays} days`,
      'medium',
      'Set retention to 30+ days for compliance');
    
    // Backup testing
    const backupTestingEnabled = process.env.BACKUP_TESTING_ENABLED === 'true';
    this.addResult('Backups', 'Backup Testing', 
      backupTestingEnabled ? 'pass' : 'warning',
      backupTestingEnabled ? 'Backup testing enabled' : 'Backup testing not configured',
      'medium',
      'Enable automated backup restoration testing');
  }

  private async validateMonitoring(): Promise<void> {
    console.log('📊 Validating Monitoring Configuration...');
    
    // Application monitoring
    const apmConfigured = process.env.NEW_RELIC_LICENSE_KEY || 
                         process.env.DATADOG_API_KEY ||
                         process.env.OPENTELEMETRY_ENDPOINT;
    this.addResult('Monitoring', 'APM', 
      apmConfigured ? 'pass' : 'warning',
      apmConfigured ? 'Application monitoring configured' : 'No APM configured',
      'medium',
      'Configure APM for performance monitoring');
    
    // Log aggregation
    const loggingConfigured = process.env.LOGTAIL_SOURCE_TOKEN || 
                            process.env.PAPERTRAIL_URL ||
                            process.env.ELASTICSEARCH_URL;
    this.addResult('Monitoring', 'Log Aggregation', 
      loggingConfigured ? 'pass' : 'warning',
      loggingConfigured ? 'Log aggregation configured' : 'No log aggregation',
      'medium',
      'Configure centralized logging');
    
    // Uptime monitoring
    const uptimeConfigured = process.env.UPTIME_ROBOT_API_KEY || 
                           process.env.PINGDOM_API_KEY;
    this.addResult('Monitoring', 'Uptime Monitoring', 
      uptimeConfigured ? 'pass' : 'warning',
      uptimeConfigured ? 'Uptime monitoring configured' : 'No uptime monitoring',
      'high',
      'Configure uptime monitoring for SLA tracking');
    
    // Alert configuration
    const alertsConfigured = process.env.PAGERDUTY_API_KEY || 
                           process.env.OPSGENIE_API_KEY ||
                           process.env.ALERT_EMAIL;
    this.addResult('Monitoring', 'Alerting', 
      alertsConfigured ? 'pass' : 'fail',
      alertsConfigured ? 'Alert system configured' : 'No alerting configured',
      'critical',
      'Configure alerting for critical issues');
  }

  private async validateDocumentation(): Promise<void> {
    console.log('📚 Validating Documentation...');
    
    // Check for required documentation files
    const requiredDocs = [
      { file: 'README.md', critical: false },
      { file: 'CLAUDE.md', critical: false },
      { file: 'docs/deployment.md', critical: true },
      { file: 'docs/disaster-recovery.md', critical: true },
      { file: 'docs/api-documentation.md', critical: false },
      { file: 'docs/compliance/hipaa-policy.md', critical: true },
      { file: 'docs/compliance/soc2-readiness.md', critical: false }
    ];
    
    const fs = require('fs');
    const path = require('path');
    
    for (const doc of requiredDocs) {
      const exists = fs.existsSync(path.join(process.cwd(), doc.file));
      if (exists) {
        this.addResult('Documentation', doc.file, 'pass', 
          `${doc.file} exists`);
      } else {
        this.addResult('Documentation', doc.file, 
          doc.critical ? 'fail' : 'warning',
          `${doc.file} not found`,
          doc.critical ? 'high' : 'low',
          `Create ${doc.file} documentation`);
      }
    }
  }

  private async validateScalability(): Promise<void> {
    console.log('📈 Validating Scalability Configuration...');
    
    // Auto-scaling configuration
    const minInstances = parseInt(process.env.MIN_INSTANCES || '1');
    const maxInstances = parseInt(process.env.MAX_INSTANCES || '1');
    
    if (maxInstances > minInstances && maxInstances >= 5) {
      this.addResult('Scalability', 'Auto-scaling', 'pass', 
        `Auto-scaling configured (${minInstances}-${maxInstances} instances)`);
    } else {
      this.addResult('Scalability', 'Auto-scaling', 'warning', 
        `Limited scaling: ${minInstances}-${maxInstances} instances`,
        'medium',
        'Configure auto-scaling for production load');
    }
    
    // Load balancer configuration
    const loadBalancerEnabled = process.env.LOAD_BALANCER_ENABLED === 'true';
    this.addResult('Scalability', 'Load Balancer', 
      loadBalancerEnabled ? 'pass' : 'warning',
      loadBalancerEnabled ? 'Load balancer configured' : 'No load balancer',
      'medium',
      'Configure load balancer for high availability');
    
    // Database read replicas
    const readReplicasEnabled = process.env.DB_READ_REPLICAS_ENABLED === 'true';
    this.addResult('Scalability', 'Read Replicas', 
      readReplicasEnabled ? 'pass' : 'warning',
      readReplicasEnabled ? 'Database read replicas configured' : 'No read replicas',
      'low',
      'Configure read replicas for database scaling');
  }

  private async validateFinancials(): Promise<void> {
    console.log('💰 Validating Financial Configuration...');
    
    // Subscription tiers configuration
    const tiersConfigured = process.env.SUBSCRIPTION_TIERS === 'professional,practice,enterprise';
    this.addResult('Financials', 'Subscription Tiers', 
      tiersConfigured ? 'pass' : 'warning',
      tiersConfigured ? 'All pricing tiers configured' : 'Pricing tiers not fully configured',
      'medium',
      'Configure all three subscription tiers');
    
    // Trial period configuration
    const trialDays = parseInt(process.env.TRIAL_PERIOD_DAYS || '14');
    this.addResult('Financials', 'Trial Period', 
      trialDays === 14 ? 'pass' : 'warning',
      `Trial period: ${trialDays} days`,
      'low',
      'Set trial period to 14 days as per business plan');
    
    // Revenue tracking
    const revenueTrackingEnabled = process.env.REVENUE_TRACKING_ENABLED === 'true';
    this.addResult('Financials', 'Revenue Tracking', 
      revenueTrackingEnabled ? 'pass' : 'warning',
      revenueTrackingEnabled ? 'Revenue tracking enabled' : 'Revenue tracking not configured',
      'medium',
      'Enable revenue tracking for financial reporting');
  }

  private addResult(
    category: string, 
    check: string, 
    status: 'pass' | 'fail' | 'warning',
    message: string, 
    severity?: 'low' | 'medium' | 'high' | 'critical',
    remediation?: string
  ): void {
    this.results.push({
      category,
      check,
      status,
      message,
      severity: severity || (status === 'fail' ? 'high' : status === 'warning' ? 'medium' : 'low'),
      remediation
    });
  }

  private calculateReadiness(): DeploymentReadiness {
    const passed = this.results.filter(r => r.status === 'pass').length;
    const failed = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;
    const total = this.results.length;
    
    const criticalIssues = this.results.filter(r => 
      r.status === 'fail' && r.severity === 'critical'
    ).length;
    
    const highPriorityIssues = this.results.filter(r => 
      r.status === 'fail' && r.severity === 'high'
    ).length;
    
    const readinessScore = (passed / total) * 100;
    
    let overallStatus: 'ready' | 'not-ready' | 'needs-attention';
    if (criticalIssues > 0) {
      overallStatus = 'not-ready';
    } else if (highPriorityIssues > 2 || warnings > 5) {
      overallStatus = 'needs-attention';
    } else {
      overallStatus = 'ready';
    }
    
    const recommendations = this.generateRecommendations();
    
    return {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development',
      overallStatus,
      readinessScore,
      criticalIssues,
      highPriorityIssues,
      warnings,
      passed,
      total,
      validations: this.results,
      recommendations
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    
    const criticalFails = this.results.filter(r => 
      r.status === 'fail' && r.severity === 'critical'
    );
    
    if (criticalFails.length > 0) {
      recommendations.push(`🚨 Address ${criticalFails.length} critical issues immediately`);
      recommendations.push('Do not deploy until all critical issues are resolved');
    }
    
    const securityIssues = this.results.filter(r => 
      r.category === 'Security' && r.status !== 'pass'
    );
    
    if (securityIssues.length > 0) {
      recommendations.push('Complete security hardening before launch');
      recommendations.push('Schedule penetration testing');
    }
    
    const complianceIssues = this.results.filter(r => 
      r.category === 'Compliance' && r.status !== 'pass'
    );
    
    if (complianceIssues.length > 0) {
      recommendations.push('Ensure HIPAA compliance before handling PHI');
      recommendations.push('Complete SOC-2 readiness assessment');
    }
    
    if (this.results.every(r => r.status === 'pass')) {
      recommendations.push('✅ System ready for December 2025 soft launch');
      recommendations.push('Schedule final security review');
      recommendations.push('Prepare incident response team');
      recommendations.push('Begin pilot clinic onboarding');
    } else if (criticalFails.length === 0) {
      recommendations.push('System approaching readiness');
      recommendations.push('Address remaining issues by November 2025');
      recommendations.push('Schedule weekly validation checks');
    }
    
    return recommendations;
  }

  private generateReport(readiness: DeploymentReadiness): void {
    const colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m'
    };
    
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.cyan}${colors.bright}     DEPLOYMENT VALIDATION REPORT${colors.reset}`);
    console.log('='.repeat(60));
    
    console.log(`\nDate: ${readiness.timestamp.toISOString()}`);
    console.log(`Environment: ${readiness.environment}`);
    console.log(`Target Launch: December 2025\n`);
    
    // Summary
    console.log(`${colors.bright}SUMMARY${colors.reset}`);
    console.log('-'.repeat(40));
    console.log(`Total Checks: ${readiness.total}`);
    console.log(`${colors.green}Passed: ${readiness.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${readiness.total - readiness.passed - readiness.warnings}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${readiness.warnings}${colors.reset}`);
    
    const scoreColor = readiness.readinessScore >= 90 ? colors.green : 
                      readiness.readinessScore >= 70 ? colors.yellow : colors.red;
    console.log(`\nReadiness Score: ${scoreColor}${readiness.readinessScore.toFixed(1)}%${colors.reset}`);
    
    // Overall Status
    console.log(`\n${colors.bright}DEPLOYMENT STATUS${colors.reset}`);
    console.log('-'.repeat(40));
    
    if (readiness.overallStatus === 'ready') {
      console.log(`${colors.green}${colors.bright}✅ READY FOR DEPLOYMENT${colors.reset}`);
    } else if (readiness.overallStatus === 'needs-attention') {
      console.log(`${colors.yellow}${colors.bright}⚠️ NEEDS ATTENTION${colors.reset}`);
    } else {
      console.log(`${colors.red}${colors.bright}❌ NOT READY FOR DEPLOYMENT${colors.reset}`);
    }
    
    // Critical Issues
    if (readiness.criticalIssues > 0) {
      console.log(`\n${colors.red}${colors.bright}CRITICAL ISSUES (${readiness.criticalIssues})${colors.reset}`);
      console.log('-'.repeat(40));
      this.results
        .filter(r => r.status === 'fail' && r.severity === 'critical')
        .forEach(r => {
          console.log(`${colors.red}• [${r.category}] ${r.check}: ${r.message}${colors.reset}`);
          if (r.remediation) {
            console.log(`  → ${r.remediation}`);
          }
        });
    }
    
    // High Priority Issues
    if (readiness.highPriorityIssues > 0) {
      console.log(`\n${colors.yellow}${colors.bright}HIGH PRIORITY ISSUES (${readiness.highPriorityIssues})${colors.reset}`);
      console.log('-'.repeat(40));
      this.results
        .filter(r => r.status === 'fail' && r.severity === 'high')
        .forEach(r => {
          console.log(`${colors.yellow}• [${r.category}] ${r.check}: ${r.message}${colors.reset}`);
          if (r.remediation) {
            console.log(`  → ${r.remediation}`);
          }
        });
    }
    
    // Recommendations
    if (readiness.recommendations.length > 0) {
      console.log(`\n${colors.cyan}${colors.bright}RECOMMENDATIONS${colors.reset}`);
      console.log('-'.repeat(40));
      readiness.recommendations.forEach((rec, idx) => {
        console.log(`${idx + 1}. ${rec}`);
      });
    }
    
    // Category Summary
    const categories = [...new Set(this.results.map(r => r.category))];
    console.log(`\n${colors.bright}VALIDATION BY CATEGORY${colors.reset}`);
    console.log('-'.repeat(40));
    
    for (const category of categories) {
      const catResults = this.results.filter(r => r.category === category);
      const catPassed = catResults.filter(r => r.status === 'pass').length;
      const catTotal = catResults.length;
      const percentage = (catPassed / catTotal) * 100;
      
      const catColor = percentage === 100 ? colors.green : 
                       percentage >= 80 ? colors.yellow : colors.red;
      console.log(`${catColor}${category}: ${catPassed}/${catTotal} (${percentage.toFixed(0)}%)${colors.reset}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('End of Validation Report');
    console.log('='.repeat(60) + '\n');
  }

  private async saveResults(readiness: DeploymentReadiness): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const reportDir = path.join(process.cwd(), 'validation-reports');
    const reportFile = path.join(reportDir, 
      `deployment-validation-${new Date().toISOString().split('T')[0]}.json`);
    
    try {
      await fs.mkdir(reportDir, { recursive: true });
      await fs.writeFile(reportFile, JSON.stringify(readiness, null, 2));
      console.log(`📁 Report saved to: ${reportFile}`);
    } catch (error) {
      console.error('Failed to save validation report:', error);
    }
  }
}

// Execute validation
async function main() {
  const validator = new DeploymentValidator();
  const readiness = await validator.runValidation();
  
  // Exit with appropriate code
  if (readiness.overallStatus === 'ready') {
    process.exit(0);
  } else if (readiness.overallStatus === 'needs-attention') {
    process.exit(1);
  } else {
    process.exit(2);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Validation failed:', error);
    process.exit(3);
  });
}

export { DeploymentValidator, DeploymentReadiness };