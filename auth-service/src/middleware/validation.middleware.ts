import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationError as ExpressValidationError } from 'express-validator';
import { logger } from '../config/logger';
import { ValidationError } from './error.middleware';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = errors.array().reduce((acc: Record<string, string[]>, error: ExpressValidationError) => {
      const field = error.type === 'field' ? error.path : 'unknown';
      if (!acc[field]) {
        acc[field] = [];
      }
      acc[field].push(error.msg);
      return acc;
    }, {});

    logger.debug('Request validation failed', {
      endpoint: req.path,
      method: req.method,
      errors: errorDetails,
      body: req.body,
      query: req.query,
      params: req.params,
    });

    const validationError = new ValidationError(
      'Validation failed',
      {
        fields: errorDetails,
        errorCount: errors.array().length,
      }
    );

    return next(validationError);
  }

  next();
};

// Custom validation helpers
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
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

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters');
  }

  if (/123|abc|qwe/i.test(password)) {
    errors.push('Password should not contain sequential characters');
  }

  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty', 'abc123',
    'admin', 'administrator', 'welcome', 'login', 'user'
  ];

  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    errors.push('Password should not contain common words');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateEmail = (email: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
    return { isValid: false, errors };
  }

  // Check email length
  if (email.length > 320) {
    errors.push('Email address is too long');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\+.*\+/, // Multiple + signs
    /\.{2,}/, // Multiple consecutive dots
    /@.*@/, // Multiple @ signs (already caught by basic regex, but just in case)
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(email))) {
    errors.push('Email format appears suspicious');
  }

  // Check for disposable email domains (basic list)
  const disposableDomains = [
    '10minutemail.com',
    'tempmail.org',
    'guerrillamail.com',
    'mailinator.com',
    'throwaway.email'
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && disposableDomains.includes(domain)) {
    errors.push('Disposable email addresses are not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validatePhoneNumber = (phone: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    errors.push('Phone number must be between 10 and 15 digits');
  }

  // Check for suspicious patterns
  if (/^(\d)\1{9,}$/.test(digitsOnly)) {
    errors.push('Phone number appears to be invalid (repeated digits)');
  }

  if (/^(123|000|111|999)/.test(digitsOnly)) {
    errors.push('Phone number appears to be invalid (suspicious prefix)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  // Remove potential XSS patterns
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

export const validateObjectId = (id: string): boolean => {
  // UUID v4 validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const validateJSON = (jsonString: string): { isValid: boolean; data?: any; error?: string } => {
  try {
    const data = JSON.parse(jsonString);
    return { isValid: true, data };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Invalid JSON'
    };
  }
};

// Middleware to sanitize request body
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeInput(obj);
      } else if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      } else if (obj && typeof obj === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
      }
      return obj;
    };

    req.body = sanitizeObject(req.body);
  }

  next();
};

// Rate limiting validation
export const validateRateLimitKey = (key: string): boolean => {
  // Ensure rate limit keys are properly formatted to prevent injection
  return /^[a-zA-Z0-9_:.-]+$/.test(key) && key.length <= 255;
};

// Device info validation
export const validateDeviceInfo = (deviceInfo: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!deviceInfo || typeof deviceInfo !== 'object') {
    errors.push('Device info must be an object');
    return { isValid: false, errors };
  }

  const allowedTypes = ['desktop', 'mobile', 'tablet'];
  if (deviceInfo.type && !allowedTypes.includes(deviceInfo.type)) {
    errors.push('Device type must be one of: desktop, mobile, tablet');
  }

  if (deviceInfo.os && typeof deviceInfo.os !== 'string') {
    errors.push('Device OS must be a string');
  }

  if (deviceInfo.browser && typeof deviceInfo.browser !== 'string') {
    errors.push('Device browser must be a string');
  }

  if (deviceInfo.version && typeof deviceInfo.version !== 'string') {
    errors.push('Device version must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Metadata validation
export const validateMetadata = (metadata: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (metadata === null || metadata === undefined) {
    return { isValid: true, errors }; // Null/undefined metadata is OK
  }

  if (typeof metadata !== 'object' || Array.isArray(metadata)) {
    errors.push('Metadata must be an object');
    return { isValid: false, errors };
  }

  // Check for dangerous keys
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  for (const key of Object.keys(metadata)) {
    if (dangerousKeys.includes(key)) {
      errors.push(`Metadata key '${key}' is not allowed`);
    }
  }

  // Check metadata size (prevent DoS)
  const jsonString = JSON.stringify(metadata);
  if (jsonString.length > 10000) { // 10KB limit
    errors.push('Metadata is too large (maximum 10KB)');
  }

  // Validate nested structure depth
  const getDepth = (obj: any, depth = 0): number => {
    if (depth > 10) return depth; // Prevent infinite recursion
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return Math.max(...Object.values(obj).map(val => getDepth(val, depth + 1)));
    }
    return depth;
  };

  if (getDepth(metadata) > 5) {
    errors.push('Metadata nesting is too deep (maximum 5 levels)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Custom validation chain builder
export const validationChain = {
  password: () => ({
    validate: validatePassword,
    message: 'Password does not meet security requirements'
  }),
  
  email: () => ({
    validate: validateEmail,
    message: 'Email address is invalid'
  }),
  
  phone: () => ({
    validate: validatePhoneNumber,
    message: 'Phone number is invalid'
  }),
  
  deviceInfo: () => ({
    validate: validateDeviceInfo,
    message: 'Device information is invalid'
  }),
  
  metadata: () => ({
    validate: validateMetadata,
    message: 'Metadata format is invalid'
  })
};