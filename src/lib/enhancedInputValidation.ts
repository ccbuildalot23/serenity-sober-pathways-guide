import DOMPurify from 'dompurify';
import crypto from 'crypto';

// Consolidated input validation utilities. This file now contains the
// previously separate InputValidator along with the enhanced features.

export class InputValidator {
  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
    });
  }

  // Sanitize plain text input
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') return '';

    return input
      .replace(/<[^>]*>/g, '')
      .trim()
      .substring(0, 1000); // Limit length
  }

  // Validate email format
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  // Validate phone number
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone);
  }

  // Validate rating (1-10)
  static validateRating(rating: any): boolean {
    const num = Number(rating);
    return !isNaN(num) && num >= 1 && num <= 10;
  }

  // Sanitize JSONB data
  static sanitizeJsonData(data: any): any {
    if (typeof data === 'string') {
      return this.sanitizeText(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJsonData(item)).slice(0, 50);
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      const keys = Object.keys(data).slice(0, 20);

      for (const key of keys) {
        const sanitizedKey = this.sanitizeText(key);
        if (sanitizedKey.length > 0) {
          sanitized[sanitizedKey] = this.sanitizeJsonData(data[key]);
        }
      }
      return sanitized;
    }

    return data;
  }

  // Validate and sanitize form data
  static validateFormData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      const sanitizedKey = this.sanitizeText(key);

      if (sanitizedKey.length === 0) continue;

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeText(value);
      } else if (typeof value === 'number') {
        sanitized[sanitizedKey] = isFinite(value) ? value : 0;
      } else if (typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else if (value !== null && value !== undefined) {
        sanitized[sanitizedKey] = this.sanitizeJsonData(value);
      }
    }

    return sanitized;
  }

  // Rate limiting helper
  static createRateLimiter(maxAttempts: number, windowMs: number) {
    const attempts = new Map<string, number[]>();

    return (key: string): boolean => {
      const now = Date.now();
      const userAttempts = attempts.get(key) || [];

      const recentAttempts = userAttempts.filter(time => now - time < windowMs);

      if (recentAttempts.length >= maxAttempts) {
        return false;
      }

      recentAttempts.push(now);
      attempts.set(key, recentAttempts);
      return true;
    };
  }
}

export class EnhancedInputValidator extends InputValidator {
  /**
   * Validates phone number format
   */
  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
    return phoneRegex.test(cleanPhone) && cleanPhone.length >= 10;
  }

  /**
   * Validates email domain against common typos and suspicious domains
   */
  static validateEmailDomain(email: string): { isValid: boolean; warning?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return { isValid: false };
    }

    const domain = email.split('@')[1].toLowerCase();
    
    // Common typos
    const commonTypos = {
      'gmai.com': 'gmail.com',
      'gmial.com': 'gmail.com',
      'yahooo.com': 'yahoo.com',
      'hotmial.com': 'hotmail.com'
    };

    if (commonTypos[domain]) {
      return {
        isValid: false,
        warning: `Did you mean ${commonTypos[domain]}?`
      };
    }

    // Suspicious domains (obviously fake examples)
    const suspiciousDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
    if (suspiciousDomains.includes(domain)) {
      return {
        isValid: false,
        warning: 'Temporary email addresses are not allowed'
      };
    }

    return { isValid: true };
  }

  /**
   * Validates emergency contact data
   */
  static validateEmergencyContact(contact: {
    name: string;
    phone?: string;
    email?: string;
    relationship: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!contact.name || contact.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!contact.relationship || contact.relationship.trim().length < 2) {
      errors.push('Relationship must be specified');
    }

    if (!contact.phone && !contact.email) {
      errors.push('At least one contact method (phone or email) is required');
    }

    if (contact.phone && !this.validatePhoneNumber(contact.phone)) {
      errors.push('Phone number format is invalid');
    }

    if (contact.email) {
      const emailValidation = this.validateEmailDomain(contact.email);
      if (!emailValidation.isValid) {
        errors.push(emailValidation.warning || 'Email format is invalid');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates notification settings for rate limiting
   */
  static validateNotificationSettings(settings: {
    freq: number;
    time: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (settings.freq < 1 || settings.freq > 7) {
      errors.push('Notification frequency must be between 1 and 7 times per week');
    }

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(settings.time)) {
      errors.push('Time must be in HH:MM format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates CSRF token for sensitive operations
   */
  static generateCSRFToken(): string {
    return crypto.randomUUID();
  }

  /**
   * Validates CSRF token
   */
  static validateCSRFToken(token: string, storedToken: string): boolean {
    return token === storedToken && token.length > 0;
  }
}

// Create rate limiters for different operations using the consolidated class
export const authRateLimiter = InputValidator.createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const formRateLimiter = InputValidator.createRateLimiter(10, 60 * 1000); // 10 submissions per minute
export const formRateLimiter = InputValidator.createRateLimiter(10, 60 * 1000); // 10 submissions per minute
