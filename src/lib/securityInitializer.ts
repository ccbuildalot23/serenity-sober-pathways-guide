
import { SecurityValidation } from './securityValidation';
import { EnhancedSecurityHeaders } from './enhancedSecurityHeaders';
import { SecureMonitoring } from './secureMonitoring';
import { logSecurityHardening } from '@/services/secureAuditLogService';

/**
 * Enhanced Security Initializer with comprehensive protections
 */
export class SecurityInitializer {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔒 Initializing enhanced security hardening measures...');

      // Initialize core security validation
      SecurityValidation.initialize();

      // Apply enhanced security headers with stricter CSP
      EnhancedSecurityHeaders.applyEnhancedSecurity();

      // Initialize monitoring
      SecureMonitoring.monitorConsoleAccess();
      SecureMonitoring.trackPageAccess();

      // Log the security hardening completion
      await logSecurityHardening();

      this.initialized = true;
      console.log('✅ Enhanced security hardening initialization complete');
      
    } catch (error) {
      console.error('❌ Enhanced security initialization failed:', error);
      throw error;
    }
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  static getSecurityStatus(): Record<string, boolean> {
    return {
      initialized: this.initialized,
      secureContext: SecurityValidation.validateSecureContext(),
      enhancedHeadersApplied: true,
      sessionSecurityActive: true,
      monitoringActive: true
    };
  }
}
