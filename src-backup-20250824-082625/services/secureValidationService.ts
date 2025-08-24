import { SecurityHeaders } from '@/lib/securityHeaders';
import { EnhancedSecurityAuditService } from './EnhancedSecurityAuditService';

/**
 * Secure Input Validation Service
 * Enforces security validation across all user inputs
 */
export class SecureValidationService {
  private static rateLimitMap = new Map<string, number[]>();
  private static readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private static readonly RATE_LIMIT_MAX_ATTEMPTS = 50;

  /**
   * Validates and sanitizes user input
   */
  static validateUserInput(input: string, context: string = 'general'): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Check rate limiting
    if (!this.checkRateLimit(context)) {
      throw new Error('Rate limit exceeded for input validation');
    }

    // Use existing sanitization from SecurityHeaders
    const _sanitized = SecurityHeaders.sanitizeUserInput(input);

    // Log potentially malicious input _attempts
    if (this.isSuspiciousInput(input)) {
      EnhancedSecurityAuditService.logSecurityViolation('SUSPICIOUS_INPUT_DETECTED', {
        input: input.substring(0, 100) + '...',
        context,
        timestamp: new Date().toISOString()
      });
    }

    return _sanitized;
  }

  /**
   * Validates email format with security checks
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitizedEmail = this.validateUserInput(email, 'email');
    
    if (!emailRegex.test(sanitizedEmail)) {
      return false;
    }

    // Check for suspicious email patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(email))) {
      EnhancedSecurityAuditService.logSecurityViolation('MALICIOUS_EMAIL_ATTEMPT', {
        email: email.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });
      return false;
    }

    return true;
  }

  /**
   * Validates password strength
   */
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty',
      'letmein', 'welcome', 'monkey', '1234567890'
    ];

    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Rate limiting for input validation
   */
  private static checkRateLimit(context: string): boolean {
    const now = Date.now();
    const _key = `validation_${context}`;
    const _attempts = this.rateLimitMap.get(_key) || [];

    // Clean old _attempts
    const _recentAttempts = _attempts.filter(time => now - time < this.RATE_LIMIT_WINDOW);

    if (_recentAttempts.length >= this.RATE_LIMIT_MAX_ATTEMPTS) {
      EnhancedSecurityAuditService.logSecurityViolation('VALIDATION_RATE_LIMIT_EXCEEDED', {
        context,
        _attempts: _recentAttempts.length,
        window: this.RATE_LIMIT_WINDOW
      });
      return false;
    }

    _recentAttempts.push(now);
    this.rateLimitMap.set(_key, _recentAttempts);
    return true;
  }

  /**
   * Detects potentially malicious input
   */
  private static isSuspiciousInput(input: string): boolean {
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
      /document\.cookie/gi,
      /window\.location/gi,
      /eval\(/gi,
      /expression\(/gi,
      /SELECT.*FROM/gi,
      /INSERT.*INTO/gi,
      /DELETE.*FROM/gi,
      /UPDATE.*SET/gi,
      /UNION.*SELECT/gi,
      /DROP.*TABLE/gi
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Validates JSON input
   */
  static validateJSON(jsonString: string): { isValid: boolean; data?: unknown; error?: string } {
    try {
      const _sanitized = this.validateUserInput(jsonString, 'json');
      const data = JSON.parse(_sanitized);
      
      // Check for dangerous properties
      const _dangerousKeys = ['__proto__', 'constructor', 'prototype'];
      if (this.containsDangerousKeys(data, _dangerousKeys)) {
        EnhancedSecurityAuditService.logSecurityViolation('DANGEROUS_JSON_KEYS', {
          jsonPreview: jsonString.substring(0, 100) + '...',
          timestamp: new Date().toISOString()
        });
        return { isValid: false, error: 'JSON contains dangerous properties' };
      }

      return { isValid: true, data };
    } catch (error) {
      return { isValid: false, error: 'Invalid JSON format' };
    }
  }

  /**
   * Recursively checks for dangerous keys in objects
   */
  private static containsDangerousKeys(obj: unknown, _dangerousKeys: string[]): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    for (const _key in obj) {
      if (_dangerousKeys.includes(_key)) {
        return true;
      }

      if (typeof obj[_key] === 'object' && this.containsDangerousKeys(obj[_key], _dangerousKeys)) {
        return true;
      }
    }

    return false;
  }
}