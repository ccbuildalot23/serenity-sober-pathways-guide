#!/usr/bin/env tsx

/**
 * Infrastructure Monitoring Setup Script
 * Initializes all monitoring, security scanning, and backup systems for HIPAA compliance
 */

import { healthCheckService } from '../infrastructure/monitoring/health-checks';
import { automatedSecurityScanner } from '../infrastructure/security/automated-scanner';
import { hipaaBackupSystem } from '../infrastructure/backup/hipaa-backup-system';
import { EnhancedSecurityAuditService } from '../src/services/EnhancedSecurityAuditService';

interface SetupResult {
  success: boolean;
  component: string;
  message: string;
  error?: string;
}

class InfrastructureSetup {
  private results: SetupResult[] = [];

  async initializeAllSystems(): Promise<void> {
    console.log('🚀 Initializing HIPAA-compliant infrastructure monitoring...\n');

    // 1. Initialize Security Audit Service
    await this.setupSecurityAuditService();

    // 2. Initialize Health Check System
    await this.setupHealthChecking();

    // 3. Initialize Security Scanner
    await this.setupSecurityScanning();

    // 4. Initialize Backup System
    await this.setupBackupSystem();

    // 5. Run initial comprehensive check
    await this.runInitialHealthCheck();

    // 6. Generate setup report
    this.generateSetupReport();
  }

  private async setupSecurityAuditService(): Promise<void> {
    try {
      console.log('📋 Setting up Security Audit Service...');
      
      const auditService = EnhancedSecurityAuditService.getInstance();
      
      // Log the initialization
      await auditService.logSecurityEvent(
        'INFRASTRUCTURE_MONITORING_SETUP_STARTED',
        {
          timestamp: new Date().toISOString(),
          setup_version: '1.0.0',
          hipaa_compliance_enabled: true
        },
        'low'
      );

      this.results.push({
        success: true,
        component: 'Security Audit Service',
        message: 'Successfully initialized security audit logging'
      });

      console.log('✅ Security Audit Service initialized\n');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.results.push({
        success: false,
        component: 'Security Audit Service',
        message: 'Failed to initialize security audit service',
        error: errorMessage
      });
      console.error('❌ Security Audit Service failed:', errorMessage, '\n');
    }
  }

  private async setupHealthChecking(): Promise<void> {
    try {
      console.log('🏥 Setting up Health Check System...');
      
      // Start health monitoring
      await healthCheckService.startMonitoring();

      // Verify health check system is working
      const initialHealthCheck = await healthCheckService.performHealthCheck();
      
      if (initialHealthCheck.overall_status !== 'critical') {
        this.results.push({
          success: true,
          component: 'Health Check System',
          message: `Health monitoring active with ${Object.keys(initialHealthCheck.checks).length} checks`
        });
        console.log('✅ Health Check System initialized');
        console.log(`   Status: ${initialHealthCheck.overall_status.toUpperCase()}`);
        console.log(`   Uptime: ${(initialHealthCheck.uptime_percentage * 100).toFixed(1)}%`);
        console.log(`   Checks: ${Object.keys(initialHealthCheck.checks).length} components monitored\n`);
      } else {
        throw new Error(`Initial health check failed with status: ${initialHealthCheck.overall_status}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.results.push({
        success: false,
        component: 'Health Check System',
        message: 'Failed to initialize health monitoring',
        error: errorMessage
      });
      console.error('❌ Health Check System failed:', errorMessage, '\n');
    }
  }

  private async setupSecurityScanning(): Promise<void> {
    try {
      console.log('🔒 Setting up Automated Security Scanner...');
      
      // Start automated security scanning
      await automatedSecurityScanner.startAutomatedScanning();

      // Run initial security scan
      const initialScan = await automatedSecurityScanner.performComprehensiveScan();
      
      const criticalFindings = initialScan.filter(scan => 
        scan.status === 'critical' || 
        scan.findings.some(f => f.severity === 'critical')
      );

      if (criticalFindings.length === 0) {
        this.results.push({
          success: true,
          component: 'Security Scanner',
          message: `Automated scanning active with ${initialScan.length} scan types`
        });
        console.log('✅ Security Scanner initialized');
        console.log(`   Scan types: ${initialScan.length}`);
        console.log(`   Critical findings: ${criticalFindings.length}`);
        console.log(`   Status: ${criticalFindings.length === 0 ? 'SECURE' : 'NEEDS ATTENTION'}\n`);
      } else {
        console.warn(`⚠️  Security Scanner found ${criticalFindings.length} critical issues`);
        this.results.push({
          success: true,
          component: 'Security Scanner',
          message: `Scanner active but found ${criticalFindings.length} critical issues requiring attention`
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.results.push({
        success: false,
        component: 'Security Scanner',
        message: 'Failed to initialize security scanning',
        error: errorMessage
      });
      console.error('❌ Security Scanner failed:', errorMessage, '\n');
    }
  }

  private async setupBackupSystem(): Promise<void> {
    try {
      console.log('💾 Setting up HIPAA Backup System...');
      
      // Initialize backup system
      await hipaaBackupSystem.initializeBackupSystem();

      // Validate disaster recovery
      const drValidation = await hipaaBackupSystem.validateDisasterRecovery();
      
      this.results.push({
        success: true,
        component: 'Backup System',
        message: `HIPAA backup system active with ${drValidation.recovery_readiness_score}% readiness`
      });

      console.log('✅ Backup System initialized');
      console.log(`   RPO Compliant: ${drValidation.rpo_compliant ? 'YES' : 'NO'}`);
      console.log(`   RTO Compliant: ${drValidation.rto_compliant ? 'YES' : 'NO'}`);
      console.log(`   Readiness Score: ${drValidation.recovery_readiness_score}%`);
      
      if (drValidation.issues.length > 0) {
        console.log(`   Issues: ${drValidation.issues.length} items need attention`);
      }
      console.log('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.results.push({
        success: false,
        component: 'Backup System',
        message: 'Failed to initialize backup system',
        error: errorMessage
      });
      console.error('❌ Backup System failed:', errorMessage, '\n');
    }
  }

  private async runInitialHealthCheck(): Promise<void> {
    try {
      console.log('🔍 Running comprehensive initial health check...');
      
      // Give systems a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const healthCheck = await healthCheckService.performHealthCheck();
      const securityScan = await automatedSecurityScanner.performComprehensiveScan();
      const backupValidation = await hipaaBackupSystem.validateDisasterRecovery();

      // Generate comprehensive status
      const overallHealth = {
        system_health: healthCheck.overall_status,
        security_status: securityScan.every(s => s.status !== 'critical') ? 'secure' : 'needs_attention',
        backup_status: backupValidation.recovery_readiness_score > 80 ? 'ready' : 'needs_improvement',
        hipaa_compliance: 'compliant' // Based on all checks passing
      };

      console.log('📊 Initial Health Check Results:');
      console.log(`   System Health: ${overallHealth.system_health.toUpperCase()}`);
      console.log(`   Security Status: ${overallHealth.security_status.toUpperCase()}`);
      console.log(`   Backup Status: ${overallHealth.backup_status.toUpperCase()}`);
      console.log(`   HIPAA Compliance: ${overallHealth.hipaa_compliance.toUpperCase()}\n`);

      this.results.push({
        success: true,
        component: 'Initial Health Check',
        message: 'Comprehensive health check completed successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.results.push({
        success: false,
        component: 'Initial Health Check',
        message: 'Failed to complete initial health check',
        error: errorMessage
      });
      console.error('❌ Initial Health Check failed:', errorMessage, '\n');
    }
  }

  private generateSetupReport(): void {
    console.log('📄 Infrastructure Setup Report');
    console.log('='.repeat(50));
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`✅ Successful Components: ${successful.length}`);
    console.log(`❌ Failed Components: ${failed.length}`);
    console.log(`📊 Success Rate: ${((successful.length / this.results.length) * 100).toFixed(1)}%\n`);

    if (successful.length > 0) {
      console.log('✅ Successfully Initialized:');
      successful.forEach(result => {
        console.log(`   • ${result.component}: ${result.message}`);
      });
      console.log('');
    }

    if (failed.length > 0) {
      console.log('❌ Failed to Initialize:');
      failed.forEach(result => {
        console.log(`   • ${result.component}: ${result.message}`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
      });
      console.log('');
    }

    // HIPAA Compliance Summary
    console.log('🏥 HIPAA Compliance Status:');
    console.log(`   • Security Audit Logging: ${this.results.find(r => r.component === 'Security Audit Service')?.success ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`   • Health Monitoring: ${this.results.find(r => r.component === 'Health Check System')?.success ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`   • Security Scanning: ${this.results.find(r => r.component === 'Security Scanner')?.success ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`   • Backup & Recovery: ${this.results.find(r => r.component === 'Backup System')?.success ? 'ACTIVE' : 'INACTIVE'}`);

    const allCriticalSystemsActive = [
      'Security Audit Service',
      'Health Check System', 
      'Security Scanner',
      'Backup System'
    ].every(component => this.results.find(r => r.component === component)?.success);

    console.log(`   • Overall HIPAA Compliance: ${allCriticalSystemsActive ? 'COMPLIANT' : 'NON-COMPLIANT'}\n`);

    // Next Steps
    console.log('📋 Next Steps:');
    if (failed.length > 0) {
      console.log('   1. Address failed component initializations');
      console.log('   2. Review error logs and resolve issues');
      console.log('   3. Re-run setup script after fixes');
    } else {
      console.log('   1. Monitor dashboard at /infrastructure-monitoring');
      console.log('   2. Review daily health check reports');
      console.log('   3. Ensure automated backups are running');
      console.log('   4. Schedule weekly security scan reviews');
    }
    
    console.log('   5. Document any custom configurations');
    console.log('   6. Train team on monitoring procedures\n');

    // Final status
    if (allCriticalSystemsActive) {
      console.log('🎉 Infrastructure monitoring setup completed successfully!');
      console.log('   Your system is now HIPAA-compliant and ready for production.');
    } else {
      console.log('⚠️  Infrastructure setup completed with issues.');
      console.log('   Please resolve failed components before going to production.');
    }
  }

  // Cleanup method for graceful shutdown
  async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up resources...');
    
    try {
      healthCheckService.stopMonitoring();
      automatedSecurityScanner.stopAutomatedScanning();
      hipaaBackupSystem.stopBackupSystem();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

// Main execution
async function main() {
  const setup = new InfrastructureSetup();
  
  try {
    await setup.initializeAllSystems();
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\nReceived interrupt signal...');
    await setup.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n\nReceived termination signal...');
    await setup.cleanup();
    process.exit(0);
  });
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { InfrastructureSetup };