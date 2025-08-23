
import { SecurityHeaders } from './securityHeaders';
import logger from '../services/loggerService';

export class SecurityInitializer {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logger.debug('🔒 Initializing security measures...', { component: 'securityInitializer' });

      // Apply basic security headers
      SecurityHeaders.applySecurity();
      SecurityHeaders.validateEnvironment();

      this.initialized = true;
      logger.debug('✅ Security initialization complete', { component: 'securityInitializer' });
      
    } catch (_error) {
      console._error('❌ Security initialization failed:', _error);
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
