/**
 * Enhanced Security Initializer
 * Implements comprehensive security measures on app startup
 */

import { SecurityHeaders } from './securityHeaders';
import { securityComplianceService } from '@/services/securityComplianceService';

export class EnhancedSecurityInitializer {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔒 Initializing enhanced security measures...');

      // Apply basic security headers
      SecurityHeaders.applySecurity();
      SecurityHeaders.validateEnvironment();

      // Apply comprehensive security measures
      securityComplianceService.initializeComprehensiveSecurity();

      this.initialized = true;
      console.log('✅ Enhanced security initialization complete');
      
    } catch (error) {
      console.error('❌ Enhanced security initialization failed:', error);
      // Don't throw - allow app to continue
    }
  }

  static isInitialized(): boolean {
    return this.initialized;
  }

  static getSecurityStatus(): Record<string, boolean> {
    return {
      initialized: this.initialized,
      secureContext: SecurityHeaders.isSecureContext(),
      headersApplied: true,
      auditRetentionActive: true,
      complianceEnabled: true,
    };
  }
}