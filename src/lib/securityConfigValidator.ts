/**
 * Security configuration validator
 * Validates environment and runtime security settings
 */

interface SecurityValidationResult {
  isSecure: boolean;
  score: number;
  warnings: string[];
  errors: string[];
  recommendations: string[];
}

export class SecurityConfigValidator {
  /**
   * Validate complete security configuration
   */
  static validateConfiguration(): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isSecure: true,
      score: 100,
      warnings: [],
      errors: [],
      recommendations: []
    };

    // Validate HTTPS usage
    this.validateHTTPS(result);
    
    // Validate environment variables
    this.validateEnvironmentVariables(result);
    
    // Validate browser security features
    this.validateBrowserSecurity(result);
    
    // Validate localStorage usage
    this.validateStorageSecurity(result);
    
    // Calculate final security status
    result.isSecure = result.errors.length === 0 && result.score >= 80;
    
    return result;
  }

  /**
   * Validate HTTPS usage
   */
  private static validateHTTPS(result: SecurityValidationResult): void {
    if (typeof window === 'undefined') return;

    if (!import.meta.env.DEV && window.location.protocol !== 'https:') {
      result.errors.push('Application must run over HTTPS in production');
      result.score -= 30;
    }

    if (window.location.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
      result.warnings.push('HTTP protocol detected on non-localhost domain');
      result.score -= 10;
    }
  }

  /**
   * Validate environment variables
   */
  private static validateEnvironmentVariables(result: SecurityValidationResult): void {
    // Check for required variables
    const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
    
    if (missingVars.length > 0) {
      result.warnings.push(`Missing environment variables: ${missingVars.join(', ')}`);
      result.score -= missingVars.length * 15;
    }

    // Check for forbidden variables (should not exist in client)
    const forbiddenVars = ['VITE_SUPABASE_SERVICE_ROLE_KEY', 'VITE_ENCRYPTION_SECRET'];
    const presentForbiddenVars = forbiddenVars.filter(varName => import.meta.env[varName]);
    
    if (presentForbiddenVars.length > 0) {
      result.errors.push(`Forbidden client-side variables detected: ${presentForbiddenVars.join(', ')}`);
      result.score -= presentForbiddenVars.length * 25;
    }

    // Validate Supabase URL format
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.match(/^https:\/\/[a-z0-9]+\.supabase\.co$/)) {
      result.warnings.push('Supabase URL format may be incorrect');
      result.score -= 5;
    }
  }

  /**
   * Validate browser security features
   */
  private static validateBrowserSecurity(result: SecurityValidationResult): void {
    if (typeof window === 'undefined') return;

    // Check for secure context
    if (!window.isSecureContext && !import.meta.env.DEV) {
      result.errors.push('Application is not running in a secure context');
      result.score -= 20;
    }

    // Check for CSP header
    const metaTags = document.querySelectorAll('meta[http-equiv="Content-Security-Policy"]');
    if (metaTags.length === 0) {
      result.warnings.push('Content Security Policy not detected');
      result.score -= 10;
      result.recommendations.push('Implement Content Security Policy headers');
    }

    // Check for HSTS header (can't be detected client-side, but we can recommend)
    if (!import.meta.env.DEV) {
      result.recommendations.push('Ensure HSTS headers are configured on the server');
    }
  }

  /**
   * Validate localStorage security
   */
  private static validateStorageSecurity(result: SecurityValidationResult): void {
    if (typeof localStorage === 'undefined') return;

    let sensitiveDataFound = false;
    let totalStorageSize = 0;
    let unencryptedSensitiveData = 0;

    // Scan localStorage for potential security issues
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      const value = localStorage.getItem(key) || '';
      totalStorageSize += value.length;

      // Check for sensitive data patterns
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /private.*key/i,
        /access.*token/i,
        /refresh.*token/i,
        /api.*key/i
      ];

      if (sensitivePatterns.some(pattern => pattern.test(key) || pattern.test(value))) {
        sensitiveDataFound = true;
        
        // Check if it appears to be encrypted (simple heuristic)
        if (!value.includes('encrypted') && !value.startsWith('serenity_secure_')) {
          unencryptedSensitiveData++;
        }
      }
    }

    if (sensitiveDataFound) {
      result.warnings.push('Sensitive data detected in localStorage');
      result.score -= 15;
      result.recommendations.push('Use secure storage for sensitive data');
    }

    if (unencryptedSensitiveData > 0) {
      result.warnings.push(`${unencryptedSensitiveData} potentially unencrypted sensitive items found`);
      result.score -= unencryptedSensitiveData * 10;
    }

    // Check storage size
    if (totalStorageSize > 5 * 1024 * 1024) { // 5MB
      result.warnings.push('Large amount of data in localStorage detected');
      result.score -= 5;
      result.recommendations.push('Consider implementing data cleanup policies');
    }
  }

  /**
   * Get security recommendations based on current configuration
   */
  static getSecurityRecommendations(): string[] {
    const recommendations = [
      'Implement Content Security Policy (CSP) headers',
      'Use HTTPS for all environments except localhost development',
      'Implement secure session management with proper timeouts',
      'Use encrypted storage for sensitive client-side data',
      'Implement proper input validation and sanitization',
      'Set up security monitoring and alerting',
      'Regular security audits and penetration testing',
      'Implement proper error handling without exposing sensitive information',
      'Use security headers (HSTS, X-Frame-Options, etc.)',
      'Implement rate limiting for sensitive operations'
    ];

    return recommendations;
  }

  /**
   * Check if development mode security warnings should be shown
   */
  static shouldShowDevWarnings(): boolean {
    return import.meta.env.DEV && 
           typeof window !== 'undefined' && 
           localStorage.getItem('serenity_hide_dev_warnings') !== 'true';
  }

  /**
   * Log security validation results
   */
  static logValidationResults(result: SecurityValidationResult): void {
    if (result.errors.length > 0) {
      console.error('Security Configuration Errors:', result.errors);
    }
    
    if (result.warnings.length > 0) {
      console.warn('Security Configuration Warnings:', result.warnings);
    }
    
    if (import.meta.env.DEV && result.recommendations.length > 0) {
      console.info('Security Recommendations:', result.recommendations);
    }
    
    console.info(`Security Score: ${result.score}/100 - ${result.isSecure ? 'SECURE' : 'NEEDS ATTENTION'}`);
  }
}

// Auto-validate on module load
if (typeof window !== 'undefined') {
  const validationResult = SecurityConfigValidator.validateConfiguration();
  
  if (import.meta.env.DEV) {
    SecurityConfigValidator.logValidationResults(validationResult);
  } else if (!validationResult.isSecure) {
    console.error('Security validation failed in production mode');
  }
}