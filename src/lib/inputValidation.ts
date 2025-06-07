
import DOMPurify from 'dompurify';

// Input validation and sanitization utilities
export class InputValidator {
  
  // Sanitize HTML content to prevent XSS
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    });
  }

  // Sanitize plain text input
  static sanitizeText(input: string): string {
    if (typeof input !== 'string') return '';
    
    // Remove any HTML tags and trim
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
      return data.map(item => this.sanitizeJsonData(item)).slice(0, 50); // Limit array size
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      const keys = Object.keys(data).slice(0, 20); // Limit object keys
      
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
      
      // Remove old attempts outside the window
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

// Create rate limiters for different operations
export const authRateLimiter = InputValidator.createRateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const formRateLimiter = InputValidator.createRateLimiter(10, 60 * 1000); // 10 submissions per minute
