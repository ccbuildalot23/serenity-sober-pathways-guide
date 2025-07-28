import { EnhancedInputValidator } from './enhancedInputValidation';

export class EnhancedSecurityValidator {
  private static readonly MALICIOUS_PATTERNS = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    // Script injection patterns
    /<script[^>]*>.*?<\/script>/gi,
    // Prototype pollution attempts
    /__proto__|constructor\.prototype|prototype\./,
    // Command injection patterns
    /(\||;|&|\$\(|\`)/,
    // Path traversal
    /\.\.\//,
  ];

  private static readonly SENSITIVE_DATA_PATTERNS = [
    // Credit card patterns
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
    // SSN patterns
    /\b\d{3}-\d{2}-\d{4}\b/,
    // API key patterns
    /\b[A-Za-z0-9]{32,}\b/,
  ];

  /**
   * Enhanced input validation with security checks
   */
  static validateAndSanitizeInput(input: string, context: string = 'general'): {
    isValid: boolean;
    sanitized: string;
    warnings: string[];
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Check for malicious patterns
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(input)) {
        warnings.push('Potentially malicious content detected');
        riskLevel = 'critical';
        return {
          isValid: false,
          sanitized: '',
          warnings,
          riskLevel
        };
      }
    }

    // Check for sensitive data
    for (const pattern of this.SENSITIVE_DATA_PATTERNS) {
      if (pattern.test(input)) {
        warnings.push('Potentially sensitive data detected');
        if (riskLevel === 'low') riskLevel = 'high';
      }
    }

    // Enhanced length validation based on context
    const maxLengths = {
      'name': 100,
      'email': 254,
      'phone': 20,
      'message': 2000,
      'notes': 5000,
      'general': 1000
    };

    const maxLength = maxLengths[context] || maxLengths.general;
    if (input.length > maxLength) {
      warnings.push(`Input exceeds maximum length of ${maxLength} characters`);
      riskLevel = 'medium';
    }

    // Sanitize using existing validator
    const sanitized = EnhancedInputValidator.sanitizeText(input);

    return {
      isValid: warnings.length === 0 || riskLevel === 'low',
      sanitized,
      warnings,
      riskLevel
    };
  }

  /**
   * Rate limiting with enhanced tracking
   */
  static createAdvancedRateLimiter(
    maxAttempts: number, 
    windowMs: number,
    blockDuration: number = windowMs * 2
  ) {
    const attempts = new Map<string, { times: number[]; blocked: number | null }>();

    return (key: string): { allowed: boolean; resetTime?: number } => {
      const now = Date.now();
      const record = attempts.get(key) || { times: [], blocked: null };

      // Check if currently blocked
      if (record.blocked && now < record.blocked) {
        return { 
          allowed: false, 
          resetTime: record.blocked 
        };
      }

      // Clean old attempts
      record.times = record.times.filter(time => now - time < windowMs);
      record.blocked = null;

      if (record.times.length >= maxAttempts) {
        record.blocked = now + blockDuration;
        attempts.set(key, record);
        return { 
          allowed: false, 
          resetTime: record.blocked 
        };
      }

      record.times.push(now);
      attempts.set(key, record);
      return { allowed: true };
    };
  }

  /**
   * Crisis alert rate limiting (more restrictive)
   */
  static crisisAlertRateLimiter = this.createAdvancedRateLimiter(
    3, // max 3 alerts
    5 * 60 * 1000, // per 5 minutes
    15 * 60 * 1000 // blocked for 15 minutes
  );

  /**
   * Emergency contact rate limiting
   */
  static emergencyContactRateLimiter = this.createAdvancedRateLimiter(
    5, // max 5 attempts
    60 * 1000, // per minute
    5 * 60 * 1000 // blocked for 5 minutes
  );

  /**
   * General form submission rate limiting
   */
  static formSubmissionRateLimiter = this.createAdvancedRateLimiter(
    10, // max 10 submissions
    60 * 1000, // per minute
    2 * 60 * 1000 // blocked for 2 minutes
  );
}