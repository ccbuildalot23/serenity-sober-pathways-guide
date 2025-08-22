import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Request } from 'express';
import { createLogger } from './logger';

const logger = createLogger('Helpers');

/**
 * Generate a unique request ID
 */
export const generateRequestId = (): string => {
  return uuidv4();
};

/**
 * Generate a trace ID for distributed tracing
 */
export const generateTraceId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Generate API key
 */
export const generateApiKey = (): string => {
  return `sk_${crypto.randomBytes(32).toString('hex')}`;
};

/**
 * Hash API key for storage
 */
export const hashApiKey = (apiKey: string, salt: string): string => {
  return crypto.pbkdf2Sync(apiKey, salt, 10000, 64, 'sha256').toString('hex');
};

/**
 * Verify API key
 */
export const verifyApiKey = (apiKey: string, hash: string, salt: string): boolean => {
  const computedHash = hashApiKey(apiKey, salt);
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(computedHash));
};

/**
 * Extract client IP address from request
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'] as string;
  const realIp = req.headers['x-real-ip'] as string;
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
};

/**
 * Extract user agent from request
 */
export const getUserAgent = (req: Request): string => {
  return req.headers['user-agent'] || 'unknown';
};

/**
 * Generate cache key for requests
 */
export const generateCacheKey = (
  method: string,
  path: string,
  userId?: string,
  query?: Record<string, any>
): string => {
  const queryString = query ? JSON.stringify(query) : '';
  const baseKey = `${method}:${path}:${queryString}`;
  
  if (userId) {
    return `user:${userId}:${baseKey}`;
  }
  
  return `global:${baseKey}`;
};

/**
 * Parse request body size
 */
export const parseBodySize = (sizeString: string): number => {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = sizeString.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  
  if (!match) {
    throw new Error(`Invalid size format: ${sizeString}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';
  
  return value * units[unit as keyof typeof units];
};

/**
 * Sanitize file name
 */
export const sanitizeFileName = (fileName: string): string => {
  // Remove unsafe characters and limit length
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  if (typeof obj === 'object') {
    const cloned = {} as { [key: string]: any };
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned as T;
  }
  
  return obj;
};

/**
 * Merge objects deeply
 */
export const deepMerge = (target: any, ...sources: any[]): any => {
  if (!sources.length) return target;
  const source = sources.shift();
  
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  
  return deepMerge(target, ...sources);
};

/**
 * Check if value is object
 */
export const isObject = (item: any): boolean => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Retry function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> => {
  let attempt = 1;
  
  while (attempt <= maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
      logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, error);
      
      await sleep(delay);
      attempt++;
    }
  }
  
  throw new Error('Max attempts reached');
};

/**
 * Sleep utility
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Format bytes to human readable format
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Format duration in milliseconds to human readable format
 */
export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
};

/**
 * Validate JSON schema
 */
export const validateSchema = (data: any, schema: any): { valid: boolean; errors: any[] } => {
  // This would typically use a library like Joi or AJV
  // For now, return a simple validation
  return { valid: true, errors: [] };
};

/**
 * Clean object by removing undefined/null values
 */
export const cleanObject = (obj: any): any => {
  const cleaned: any = {};
  
  for (const key in obj) {
    if (obj[key] !== null && obj[key] !== undefined) {
      if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        const cleanedNested = cleanObject(obj[key]);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = obj[key];
      }
    }
  }
  
  return cleaned;
};

/**
 * Get nested property from object
 */
export const getNestedProperty = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

/**
 * Set nested property in object
 */
export const setNestedProperty = (obj: any, path: string, value: any): void => {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!(key in current)) {
      current[key] = {};
    }
    return current[key];
  }, obj);
  
  target[lastKey] = value;
};

/**
 * Convert string to camelCase
 */
export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Convert string to snake_case
 */
export const toSnakeCase = (str: string): string => {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
};

/**
 * Mask sensitive data
 */
export const maskSensitiveData = (data: any, sensitiveFields: string[] = []): any => {
  const defaultSensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'ssn', 'credit_card', 'api_key', 'private_key'
  ];
  
  const fieldsToMask = [...defaultSensitiveFields, ...sensitiveFields];
  
  const maskValue = (value: any): any => {
    if (typeof value === 'string' && value.length > 4) {
      return `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
    }
    return '***masked***';
  };
  
  const maskObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(maskObject);
    }
    
    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (fieldsToMask.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        masked[key] = maskValue(value);
      } else if (typeof value === 'object') {
        masked[key] = maskObject(value);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  };
  
  return maskObject(data);
};