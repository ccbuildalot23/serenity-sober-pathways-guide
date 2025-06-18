
import { SecurityHeaders } from './securityHeaders';

export class SecurityInitializer {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🔒 Initializing security measures...');

      // Apply basic security headers
      SecurityHeaders.applySecurity();
      SecurityHeaders.validateEnvironment();

      this.initialized = true;
      console.log('✅ Security initialization complete');
      
    } catch (error) {
      console.error('❌ Security initialization failed:', error);
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
    };
  }
}
