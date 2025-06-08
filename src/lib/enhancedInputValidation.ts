
import { InputValidator } from './inputValidation';

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
