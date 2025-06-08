
import { SecurityValidation } from './securityValidation';
import { SecurityHeaders } from './securityHeaders';
import { SecureMonitoring } from './secureMonitoring';
import { logSecurityHardening } from '@/services/secureAuditLogService';

/**
 * Security Initializer
 * Orchestrates all security measures and validates system integrity
 */
export class SecurityInitializer {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔒 Initializing security hardening measures...');

      // Initialize core security validation
      SecurityValidation.initialize();

      // Apply security headers
      SecurityHeaders.applySecurity();
      SecurityHeaders.validateEnvironment();

      // Initialize monitoring
      SecureMonitoring.monitorConsoleAccess();
      SecureMonitoring.trackPageAccess();

      // Log the security hardening completion
      await logSecurityHardening();

      this.initialized = true;
      console.log('✅ Security hardening initialization complete');
      
    } catch (error) {
      console.error('❌ Security initialization failed:', error);
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
      headersApplied: true, // SecurityHeaders applied during init
      monitoringActive: true // SecureMonitoring active during init
    };
  }
}
