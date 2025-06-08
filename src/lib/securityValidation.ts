
/**
 * Security Validation Service
 * Enhanced to work with RLS policies and database-level security
 */
export class SecurityValidation {
  private static readonly FORBIDDEN_CLIENT_KEYS = [
    'ENCRYPTION_SECRET',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PRIVATE_KEY',
    'SECRET_KEY'
  ];

  /**
   * Validates that no sensitive keys are exposed to client-side code
   */
  static validateEnvironmentSecurity(): void {
    this.FORBIDDEN_CLIENT_KEYS.forEach(key => {
      if (import.meta.env[`VITE_${key}`]) {
        console.error(`CRITICAL SECURITY ERROR: ${key} must NEVER be exposed to client-side code`);
        this.logSecurityViolation('CLIENT_SIDE_KEY_EXPOSURE', { key });
        throw new Error(`Security violation: ${key} exposed to client`);
      }
    });

    // Validate Supabase configuration
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.warn('Supabase configuration incomplete');
      this.logSecurityEvent('INCOMPLETE_SUPABASE_CONFIG');
    }

    console.log('✅ Environment security validation passed');
  }

  /**
   * Prevents usage of client-side encryption
   */
  static preventClientSideEncryption(): void {
    // Check if the vulnerable secureEncryption service is being used
    if (typeof window !== 'undefined' && (window as any).secureEncryption) {
      console.error('SECURITY VIOLATION: Client-side encryption detected');
      this.logSecurityViolation('CLIENT_SIDE_ENCRYPTION_DETECTED', {});
      throw new Error('Client-side encryption is prohibited');
    }
  }

  /**
   * Validates secure context requirements
   */
  static validateSecureContext(): boolean {
    if (import.meta.env.PROD && !this.isSecureContext()) {
      console.error('SECURITY WARNING: Production environment must use HTTPS');
      this.logSecurityEvent('PRODUCTION_INSECURE_CONTEXT');
      return false;
    }
    return true;
  }

  /**
   * Validates database access patterns for RLS compliance
   */
  static async validateDatabaseAccess(operation: string, table: string, userRequired: boolean = true): Promise<boolean> {
    if (userRequired) {
      // Import dynamically to avoid circular dependencies
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        this.logSecurityViolation('DATABASE_ACCESS_WITHOUT_AUTH', {
          operation,
          table,
          timestamp: new Date().toISOString()
        });
        return false;
      }
    }
    
    return true;
  }

  /**
   * Validates user input for potential security issues
   */
  static validateUserInput(input: string, maxLength: number = 1000): boolean {
    if (!input || typeof input !== 'string') {
      return true; // Empty/null input is valid
    }

    // Check for potential XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        this.logSecurityViolation('XSS_ATTEMPT_DETECTED', {
          input_sample: input.substring(0, 100),
          pattern: pattern.source
        });
        return false;
      }
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b)/gi,
      /(\bor\b|\band\b)\s+\d+\s*=\s*\d+/gi,
      /;\s*--/gi,
      /\/\*[\s\S]*?\*\//gi
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        this.logSecurityViolation('SQL_INJECTION_ATTEMPT', {
          input_sample: input.substring(0, 100),
          pattern: pattern.source
        });
        return false;
      }
    }

    // Check length
    if (input.length > maxLength) {
      this.logSecurityViolation('INPUT_LENGTH_EXCEEDED', {
        actual_length: input.length,
        max_length: maxLength
      });
      return false;
    }

    return true;
  }

  private static isSecureContext(): boolean {
    return window.isSecureContext || 
           window.location.protocol === 'https:' || 
           window.location.hostname === 'localhost' ||
           window.location.hostname === '127.0.0.1';
  }

  private static logSecurityEvent(event: string, details: any = {}) {
    const securityEvent = {
      event,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100),
      url: window.location.href,
      severity: 'info',
      ...details
    };

    console.log(`Security Event: ${event}`, securityEvent);
    this.storeSecurityEvent(securityEvent);
  }

  private static logSecurityViolation(violation: string, details: any = {}) {
    const securityEvent = {
      event: violation,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100),
      url: window.location.href,
      severity: 'critical',
      ...details
    };

    console.error(`SECURITY VIOLATION: ${violation}`, securityEvent);
    this.storeSecurityEvent(securityEvent);
  }

  private static storeSecurityEvent(event: any) {
    try {
      const securityLogs = JSON.parse(localStorage.getItem('security_events') || '[]');
      securityLogs.push(event);
      
      // Keep only last 100 events
      if (securityLogs.length > 100) {
        securityLogs.splice(0, securityLogs.length - 100);
      }
      
      localStorage.setItem('security_events', JSON.stringify(securityLogs));
    } catch (error) {
      console.warn('Could not store security event:', error);
    }
  }

  /**
   * Initialize security validation on app start
   */
  static initialize(): void {
    this.validateEnvironmentSecurity();
    this.preventClientSideEncryption();
    this.validateSecureContext();
    
    console.log('🔒 Enhanced security validation system initialized');
  }

  static getSecurityEvents(): any[] {
    try {
      return JSON.parse(localStorage.getItem('security_events') || '[]');
    } catch (error) {
      return [];
    }
  }

  static clearSecurityEvents(): void {
    localStorage.removeItem('security_events');
    this.logSecurityEvent('SECURITY_EVENTS_CLEARED');
  }
}
