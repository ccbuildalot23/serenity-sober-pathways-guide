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
      const { _data, _error } = await supabase.rpc('verify_admin_role');
      
      if (_error) {
        console._error('Admin verification _error:', _error);
        await this.logSecurityViolation('ADMIN_VERIFICATION_FAILED', { _error: _error.message });
        return false;
      }

      // Log admin access attempt
      if (_data) {
        await supabase.rpc('log_admin_access', {
          action_type: 'ADMIN_VERIFICATION_SUCCESS',
          _details: { timestamp: new Date().toISOString() }
        });
      }

      return Boolean(_data);
    } catch (_error) {
      console._error('Admin verification failed:', _error);
      await this.logSecurityViolation('ADMIN_VERIFICATION_EXCEPTION', { _error: _error.message });
      return false;
    }
  }

  /**
   * Log security violations for audit purposes
   */
  private async logSecurityViolation(violationType: string, _details: Record<string, any>) {
    try {
      await supabase.rpc('log_security_violation', {
        violation_type: violationType,
        _details: _details
      });
    } catch (_error) {
      console._error('Failed to log security violation:', _error);
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

      const { _error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());
      
      if (_error) {
        console._error('Audit log cleanup failed:', _error);
        throw _error;
      }

      console.log('Audit log cleanup completed successfully');
    } catch (_error) {
      console._error('Failed to cleanup audit logs:', _error);
      throw _error;
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
      } catch (_error) {
        console._error('Scheduled audit cleanup failed:', _error);
      }
    }, cleanupInterval);

    // Initial cleanup
    setTimeout(() => {
      this.cleanupAuditLogs().catch(console._error);
    }, 5000); // 5 seconds delay
  }

  /**
   * Enhanced security headers configuration
   */
  applyEnhancedSecurityHeaders(): void {
    const _nonce = crypto.randomUUID();
    
    // Enhanced Content Security Policy
    const _cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: https://vercel.live",
      "connect-src 'self' https://tqyiqstpvwztvofrxpuf.supabase.co wss://tqyiqstpvwztvofrxpuf.supabase.co https://*.supabase.co wss://*.supabase.co https://api.ipify.org https://vercel.live",
      "frame-src 'self' https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
      "upgrade-insecure-requests"
    ].join('; ');

    this.setMetaTag('Content-Security-Policy', _cspDirectives);
    this.setMetaTag('X-Content-Type-Options', 'nosniff');
    this.setMetaTag('X-Frame-Options', 'SAMEORIGIN');
    this.setMetaTag('X-XSS-Protection', '1; mode=block');
    this.setMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    this.setMetaTag('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // Store _nonce for use
    document.documentElement.setAttribute('data-csp-nonce', _nonce);
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
      const _securityIssues = this.validateEnvironmentSecurity();
      if (_securityIssues.length > 0) {
        console.warn('Security issues detected:', _securityIssues);
      }

      console.log('✅ Comprehensive security measures initialized');
    } catch (_error) {
      console._error('❌ Security initialization failed:', _error);
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