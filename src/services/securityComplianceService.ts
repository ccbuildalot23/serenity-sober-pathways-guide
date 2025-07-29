/**
 * Comprehensive Security Compliance Service
 * Implements all security fixes and enhancements
 */

import { supabase } from '@/integrations/supabase/client';

export class SecurityComplianceService {
  private static instance: SecurityComplianceService;

  private constructor() {}

  static getInstance(): SecurityComplianceService {
    if (!SecurityComplianceService.instance) {
      SecurityComplianceService.instance = new SecurityComplianceService();
    }
    return SecurityComplianceService.instance;
  }

  /**
   * SECURITY FIX: Replace hardcoded admin verification with role-based access
   */
  async verifyAdminAccess(): Promise<boolean> {
    try {
      // Use the new secure admin verification function
      const { data, error } = await supabase.rpc('verify_admin_role');
      
      if (error) {
        console.error('Admin verification error:', error);
        await this.logSecurityViolation('ADMIN_VERIFICATION_FAILED', { error: error.message });
        return false;
      }

      // Log admin access attempt
      if (data) {
        await supabase.rpc('log_admin_access', {
          action_type: 'ADMIN_VERIFICATION_SUCCESS',
          details: { timestamp: new Date().toISOString() }
        });
      }

      return Boolean(data);
    } catch (error) {
      console.error('Admin verification failed:', error);
      await this.logSecurityViolation('ADMIN_VERIFICATION_EXCEPTION', { error: error.message });
      return false;
    }
  }

  /**
   * Log security violations for audit purposes
   */
  private async logSecurityViolation(violationType: string, details: Record<string, any>) {
    try {
      await supabase.rpc('log_security_violation', {
        violation_type: violationType,
        details: details
      });
    } catch (error) {
      console.error('Failed to log security violation:', error);
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  async cleanupAuditLogs(): Promise<void> {
    try {
      // Manual cleanup since RPC might not be available in types
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());
      
      if (error) {
        console.error('Audit log cleanup failed:', error);
        throw error;
      }

      console.log('Audit log cleanup completed successfully');
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
      throw error;
    }
  }

  /**
   * Schedule automatic audit log cleanup
   */
  initializeAuditRetention(): void {
    // Run cleanup every 24 hours
    const cleanupInterval = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    setInterval(async () => {
      try {
        await this.cleanupAuditLogs();
      } catch (error) {
        console.error('Scheduled audit cleanup failed:', error);
      }
    }, cleanupInterval);

    // Initial cleanup
    setTimeout(() => {
      this.cleanupAuditLogs().catch(console.error);
    }, 5000); // 5 seconds delay
  }

  /**
   * Enhanced security headers configuration
   */
  applyEnhancedSecurityHeaders(): void {
    const nonce = crypto.randomUUID();
    
    // Enhanced Content Security Policy
    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://tqyiqstpvwztvofrxpuf.supabase.co wss://tqyiqstpvwztvofrxpuf.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "block-all-mixed-content"
    ].join('; ');

    this.setMetaTag('Content-Security-Policy', cspDirectives);
    this.setMetaTag('X-Content-Type-Options', 'nosniff');
    this.setMetaTag('X-Frame-Options', 'DENY');
    this.setMetaTag('X-XSS-Protection', '1; mode=block');
    this.setMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    this.setMetaTag('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    this.setMetaTag('Cross-Origin-Embedder-Policy', 'require-corp');
    this.setMetaTag('Cross-Origin-Opener-Policy', 'same-origin');
    this.setMetaTag('Cross-Origin-Resource-Policy', 'same-origin');

    // Store nonce for use
    document.documentElement.setAttribute('data-csp-nonce', nonce);
  }

  /**
   * Validate environment security
   */
  validateEnvironmentSecurity(): string[] {
    const issues: string[] = [];

    // Check for forbidden environment variables
    const forbiddenKeys = ['ENCRYPTION_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'];
    forbiddenKeys.forEach(key => {
      if (typeof window !== 'undefined' && (window as any)[key]) {
        issues.push(`Forbidden key ${key} found in client environment`);
      }
    });

    // Check HTTPS in production
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && 
        !window.location.hostname.includes('localhost')) {
      issues.push('Application not running over HTTPS in production');
    }

    return issues;
  }

  /**
   * Initialize all security measures
   */
  initializeComprehensiveSecurity(): void {
    try {
      // Apply enhanced security headers
      this.applyEnhancedSecurityHeaders();
      
      // Initialize audit log retention
      this.initializeAuditRetention();
      
      // Validate environment
      const securityIssues = this.validateEnvironmentSecurity();
      if (securityIssues.length > 0) {
        console.warn('Security issues detected:', securityIssues);
      }

      console.log('✅ Comprehensive security measures initialized');
    } catch (error) {
      console.error('❌ Security initialization failed:', error);
    }
  }

  private setMetaTag(name: string, content: string): void {
    if (typeof document !== 'undefined') {
      let meta = document.querySelector(`meta[http-equiv="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.httpEquiv = name;
        document.head.appendChild(meta);
      }
      meta.content = content;
    }
  }
}

// Export singleton instance
export const securityComplianceService = SecurityComplianceService.getInstance();