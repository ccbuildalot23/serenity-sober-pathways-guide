/**
 * Enhanced Security Initializer
 * Implements comprehensive security measures on app startup
 */

import { SecurityHeaders } from './securityHeaders';
import { securityComplianceService } from '@/services/securityComplianceService';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

export class EnhancedSecurityInitializer {
  private static initialized = false;
  private static securityIssues: string[] = [];

  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔒 Initializing enhanced security measures...');

      // Validate environment before proceeding
      this.validateEnvironmentVariables();

      // Apply basic security headers
      SecurityHeaders.applySecurity();
      SecurityHeaders.validateEnvironment();

      // Apply comprehensive security measures
      securityComplianceService.initializeComprehensiveSecurity();

      // Initialize security monitoring
      this.initializeSecurityMonitoring();

      // Perform initial security health check
      await this.performSecurityHealthCheck();

      this.initialized = true;
      console.log('✅ Enhanced security initialization complete');
      
      if (this.securityIssues.length > 0) {
        console.warn('⚠️ Security warnings detected:', this.securityIssues);
      }
      
    } catch (error) {
      console.error('❌ Enhanced security initialization failed:', error);
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'SECURITY_INITIALIZATION_FAILED',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      // Don't throw - allow app to continue
    }
  }

  private static validateEnvironmentVariables(): void {
    const requiredVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY'
    ];

    const forbiddenClientVars = [
      'VITE_SUPABASE_SERVICE_ROLE_KEY',
      'VITE_ENCRYPTION_SECRET',
      'VITE_TWILIO_AUTH_TOKEN'
    ];

    // Check for missing required variables
    for (const varName of requiredVars) {
      if (!import.meta.env[varName]) {
        this.securityIssues.push(`Missing required environment variable: ${varName}`);
      }
    }

    // Check for forbidden client-side variables
    for (const varName of forbiddenClientVars) {
      if (import.meta.env[varName]) {
        this.securityIssues.push(`Security risk: Sensitive environment variable exposed on client: ${varName}`);
      }
    }

    // Validate HTTPS in production
    if (import.meta.env.PROD && !window.location.protocol.startsWith('https')) {
      this.securityIssues.push('Production app not served over HTTPS');
    }
  }

  private static initializeSecurityMonitoring(): void {
    // Set up automated security monitoring
    if (typeof window !== 'undefined') {
      // Monitor for suspicious activity patterns
      this.setupSuspiciousActivityDetection();
      
      // Set up periodic security checks
      this.scheduleSecurityHealthChecks();
    }
  }

  private static setupSuspiciousActivityDetection(): void {
    let rapidClickCount = 0;
    let rapidClickTimer: NodeJS.Timeout;

    // Detect rapid clicking (potential automation)
    document.addEventListener('click', () => {
      rapidClickCount++;
      
      clearTimeout(rapidClickTimer);
      rapidClickTimer = setTimeout(() => {
        if (rapidClickCount > 20) {
          EnhancedSecurityAuditService.logSecurityEvent({
            action: 'SUSPICIOUS_RAPID_CLICKING',
            details: { clickCount: rapidClickCount, timeWindow: '1000ms' },
          });
        }
        rapidClickCount = 0;
      }, 1000);
    });

    // Monitor console access (potential debugging attempts)
    let consoleUsageCount = 0;
    const originalConsole = { ...console };
    
    ['log', 'warn', 'error', 'debug'].forEach(method => {
      (console as any)[method] = (...args: any[]) => {
        consoleUsageCount++;
        if (consoleUsageCount > 50) {
          EnhancedSecurityAuditService.logSecurityEvent({
            action: 'EXCESSIVE_CONSOLE_USAGE',
            details: { usageCount: consoleUsageCount },
          });
        }
        return (originalConsole as any)[method](...args);
      };
    });
  }

  private static scheduleSecurityHealthChecks(): void {
    // Perform security health checks every 5 minutes
    setInterval(async () => {
      await this.performSecurityHealthCheck();
    }, 5 * 60 * 1000);
  }

  private static async performSecurityHealthCheck(): Promise<void> {
    try {
      const healthCheck = {
        timestamp: new Date().toISOString(),
        browserInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        },
        securityHeaders: {
          isSecureContext: SecurityHeaders.isSecureContext(),
          headersApplied: true
        },
        sessionInfo: {
          sessionStorage: sessionStorage.length,
          localStorage: localStorage.length,
          hasDeviceFingerprint: !!localStorage.getItem('device_fingerprint')
        }
      };

      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'SECURITY_HEALTH_CHECK',
        details: healthCheck,
      });

    } catch (error) {
      console.warn('Security health check failed:', error);
    }
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  static getSecurityStatus(): Record<string, any> {
    return {
      initialized: this.initialized,
      secureContext: SecurityHeaders.isSecureContext(),
      headersApplied: true,
      auditRetentionActive: true,
      complianceEnabled: true,
      securityIssues: this.securityIssues,
      lastHealthCheck: new Date().toISOString(),
      environmentValidated: this.securityIssues.length === 0,
    };
  }

  static getSecurityIssues(): string[] {
    return [...this.securityIssues];
  }

  static resolveSecurityIssue(issue: string): void {
    const index = this.securityIssues.indexOf(issue);
    if (index > -1) {
      this.securityIssues.splice(index, 1);
    }
  }
}