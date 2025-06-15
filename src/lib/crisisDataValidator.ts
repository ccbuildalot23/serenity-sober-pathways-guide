
import { EnhancedInputValidator } from './enhancedInputValidation';

/**
 * Enhanced validation specifically for crisis data
 */
export class CrisisDataValidator extends EnhancedInputValidator {
  
  /**
   * Validates crisis assessment responses with additional safety checks
   */
  static validateCrisisAssessment(assessment: {
    responses: Record<string, any>;
    riskLevel?: string;
    notes?: string;
  }): { isValid: boolean; errors: string[]; sanitized: any } {
    const errors: string[] = [];
    const sanitized: any = {
      responses: {},
      riskLevel: assessment.riskLevel,
      notes: assessment.notes
    };

    // Validate response structure
    if (!assessment.responses || typeof assessment.responses !== 'object') {
      errors.push('Assessment responses must be a valid object');
      return { isValid: false, errors, sanitized };
    }

    // Validate and sanitize individual responses
    for (const [key, value] of Object.entries(assessment.responses)) {
      const sanitizedKey = this.sanitizeText(key);
      
      if (sanitizedKey.length === 0) {
        errors.push(`Invalid response key: ${key}`);
        continue;
      }

      // Validate numeric responses (ratings, scores)
      if (typeof value === 'number') {
        if (!isFinite(value) || value < 0 || value > 10) {
          errors.push(`Invalid numeric response for ${key}: must be between 0-10`);
          continue;
        }
        sanitized.responses[sanitizedKey] = value;
      }
      // Validate boolean responses
      else if (typeof value === 'boolean') {
        sanitized.responses[sanitizedKey] = value;
      }
      // Validate text responses
      else if (typeof value === 'string') {
        const sanitizedValue = this.sanitizeCrisisText(value);
        if (sanitizedValue.length > 1000) {
          errors.push(`Response for ${key} exceeds maximum length`);
          continue;
        }
        sanitized.responses[sanitizedKey] = sanitizedValue;
      }
      // Validate array responses (multiple choice)
      else if (Array.isArray(value)) {
        const sanitizedArray = value
          .filter(item => typeof item === 'string')
          .map(item => this.sanitizeText(item))
          .filter(item => item.length > 0)
          .slice(0, 10); // Limit array size
        sanitized.responses[sanitizedKey] = sanitizedArray;
      }
      else {
        errors.push(`Invalid response type for ${key}`);
      }
    }

    // Validate risk level
    if (assessment.riskLevel) {
      const validRiskLevels = ['low', 'moderate', 'high', 'severe'];
      if (!validRiskLevels.includes(assessment.riskLevel.toLowerCase())) {
        errors.push('Invalid risk level specified');
      } else {
        sanitized.riskLevel = assessment.riskLevel.toLowerCase();
      }
    }

    // Validate and sanitize notes
    if (assessment.notes) {
      sanitized.notes = this.sanitizeCrisisText(assessment.notes);
      if (sanitized.notes.length > 2000) {
        errors.push('Crisis notes exceed maximum length (2000 characters)');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Enhanced text sanitization for crisis-related content
   */
  static sanitizeCrisisText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    
    // Remove potentially harmful content
    let sanitized = text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data URLs
      .replace(/vbscript:/gi, '') // Remove vbscript
      .trim();

    // Preserve line breaks but limit them
    sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
    
    // Limit overall length
    sanitized = sanitized.substring(0, 2000);
    
    return sanitized;
  }

  /**
   * Validates crisis intervention data
   */
  static validateCrisisIntervention(intervention: {
    type: string;
    duration?: number;
    effectiveness?: number;
    notes?: string;
  }): { isValid: boolean; errors: string[]; sanitized: any } {
    const errors: string[] = [];
    const sanitized: any = {};

    // Validate intervention type
    const validTypes = [
      'grounding', 'breathing', 'distraction', 'cold_water', 
      'urge_surfing', 'professional_contact', 'emergency_contact'
    ];
    
    if (!intervention.type || !validTypes.includes(intervention.type)) {
      errors.push('Invalid intervention type');
    } else {
      sanitized.type = intervention.type;
    }

    // Validate duration (in minutes)
    if (intervention.duration !== undefined) {
      if (!Number.isInteger(intervention.duration) || intervention.duration < 1 || intervention.duration > 1440) {
        errors.push('Duration must be between 1 and 1440 minutes');
      } else {
        sanitized.duration = intervention.duration;
      }
    }

    // Validate effectiveness rating
    if (intervention.effectiveness !== undefined) {
      if (!this.validateRating(intervention.effectiveness)) {
        errors.push('Effectiveness rating must be between 1 and 10');
      } else {
        sanitized.effectiveness = intervention.effectiveness;
      }
    }

    // Validate and sanitize notes
    if (intervention.notes) {
      sanitized.notes = this.sanitizeCrisisText(intervention.notes);
      if (sanitized.notes.length > 1000) {
        errors.push('Intervention notes exceed maximum length');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Validates crisis contact information
   */
  static validateCrisisContact(contact: {
    name: string;
    phone?: string;
    email?: string;
    relationship: string;
    priority?: number;
  }): { isValid: boolean; errors: string[]; sanitized: any } {
    const errors: string[] = [];
    const sanitized: any = {};

    // Validate name
    if (!contact.name || contact.name.trim().length < 2) {
      errors.push('Contact name must be at least 2 characters');
    } else {
      sanitized.name = this.sanitizeText(contact.name).substring(0, 100);
    }

    // Validate phone
    if (contact.phone) {
      const cleanPhone = contact.phone.replace(/[\s\-\(\)\.]/g, '');
      if (!/^[\+]?[1-9][\d]{9,14}$/.test(cleanPhone)) {
        errors.push('Invalid phone number format');
      } else {
        sanitized.phone = cleanPhone;
      }
    }

    // Validate email
    if (contact.email) {
      if (!this.validateEmail(contact.email)) {
        errors.push('Invalid email format');
      } else {
        sanitized.email = contact.email.toLowerCase().trim();
      }
    }

    // Ensure at least one contact method
    if (!contact.phone && !contact.email) {
      errors.push('At least one contact method (phone or email) is required');
    }

    // Validate relationship
    if (!contact.relationship || contact.relationship.trim().length < 2) {
      errors.push('Relationship must be specified');
    } else {
      sanitized.relationship = this.sanitizeText(contact.relationship).substring(0, 50);
    }

    // Validate priority
    if (contact.priority !== undefined) {
      if (!Number.isInteger(contact.priority) || contact.priority < 1 || contact.priority > 10) {
        errors.push('Priority must be between 1 and 10');
      } else {
        sanitized.priority = contact.priority;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Detects potentially concerning content in crisis notes
   */
  static analyzeCrisisContent(text: string): {
    riskIndicators: string[];
    urgencyLevel: 'low' | 'moderate' | 'high' | 'severe';
    recommendProfessionalReview: boolean;
  } {
    if (!text) {
      return {
        riskIndicators: [],
        urgencyLevel: 'low',
        recommendProfessionalReview: false
      };
    }

    const lowercaseText = text.toLowerCase();
    const riskIndicators: string[] = [];
    
    // High-risk indicators
    const severeIndicators = [
      'suicide', 'kill myself', 'end it all', 'not worth living',
      'want to die', 'better off dead', 'harm myself'
    ];
    
    const highIndicators = [
      'hopeless', 'can\'t go on', 'give up', 'no point',
      'worthless', 'burden', 'escape', 'pills'
    ];
    
    const moderateIndicators = [
      'overwhelmed', 'desperate', 'trapped', 'alone',
      'scared', 'panic', 'crisis', 'help'
    ];

    // Check for severe indicators
    severeIndicators.forEach(indicator => {
      if (lowercaseText.includes(indicator)) {
        riskIndicators.push(`Severe: ${indicator}`);
      }
    });

    // Check for high indicators
    highIndicators.forEach(indicator => {
      if (lowercaseText.includes(indicator)) {
        riskIndicators.push(`High: ${indicator}`);
      }
    });

    // Check for moderate indicators
    moderateIndicators.forEach(indicator => {
      if (lowercaseText.includes(indicator)) {
        riskIndicators.push(`Moderate: ${indicator}`);
      }
    });

    // Determine urgency level
    let urgencyLevel: 'low' | 'moderate' | 'high' | 'severe' = 'low';
    let recommendProfessionalReview = false;

    if (riskIndicators.some(r => r.startsWith('Severe'))) {
      urgencyLevel = 'severe';
      recommendProfessionalReview = true;
    } else if (riskIndicators.some(r => r.startsWith('High'))) {
      urgencyLevel = 'high';
      recommendProfessionalReview = true;
    } else if (riskIndicators.some(r => r.startsWith('Moderate'))) {
      urgencyLevel = 'moderate';
      recommendProfessionalReview = riskIndicators.length > 2;
    }

    return {
      riskIndicators,
      urgencyLevel,
      recommendProfessionalReview
    };
  }
}
