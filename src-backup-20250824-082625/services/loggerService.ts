/**
 * Centralized Logging Service for Serenity Sober Pathways
 * 
 * Features:
 * - Environment-aware logging (production vs development)
 * - PHI data sanitization to prevent sensitive data exposure
 * - Structured logging with context
 * - Error tracking for production monitoring
 * - Performance logging
 * - Security audit logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  environment: string;
}

// PHI-sensitive field patterns that should be sanitized
const PHI_PATTERNS = [
  /password/i,
  /email/i,
  /phone/i,
  /ssn/i,
  /medical_record/i,
  /diagnosis/i,
  /medication/i,
  /insurance/i,
  /emergency_contact/i,
  /address/i,
  /dob/i,
  /date_of_birth/i,
  /birth_date/i,
];

// Specific PHI field names to sanitize
const PHI_FIELDS = new Set([
  'password',
  'email',
  'phone_number',
  'phone',
  'ssn',
  'social_security',
  'medical_record_number',
  'diagnosis',
  'medication',
  'emergency_contact',
  'address',
  'street_address',
  'date_of_birth',
  'dob',
  'birth_date',
  'insurance_number',
  'token',
  'access_token',
  'refresh_token',
  'session_token',
]);

class LoggerService {
  private isDevelopment: boolean;
  private isProduction: boolean;
  private enableConsoleInDev: boolean;
  private logLevel: LogLevel;
  private enablePerformanceLogging: boolean;
  
  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.isProduction = import.meta.env.PROD;
    
    // Environment-based console logging control
    const envConsoleLogging = import.meta.env.VITE_ENABLE_CONSOLE_LOGGING;
    this.enableConsoleInDev = envConsoleLogging === 'true' || 
      (this.isDevelopment && envConsoleLogging !== 'false');
    
    // Set minimum log level based on environment
    this.logLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 
      (this.isDevelopment ? 'debug' : 'error');
    
    // Performance logging control
    this.enablePerformanceLogging = import.meta.env.VITE_ENABLE_PERFORMANCE_LOGGING === 'true';
  }

  /**
   * Check if a log level should be processed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      security: 4
    };
    
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Sanitizes data to remove PHI and sensitive information
   * Enhanced to handle nested objects, arrays, and common data patterns
   */
  private sanitizeData(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      // Enhanced string sanitization
      const str = data.toString();
      
      // Email pattern
      if (str.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
        return '[EMAIL_REDACTED]';
      }
      
      // Phone number patterns
      if (/(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/.test(str)) {
        return '[PHONE_REDACTED]';
      }
      
      // Social Security Number patterns
      if (/^\d{3}-?\d{2}-?\d{4}$/.test(str)) {
        return '[SSN_REDACTED]';
      }
      
      // Long strings that might contain sensitive data
      if (str.length > 100) {
        return '[LONG_STRING_REDACTED]';
      }
      
      // JWT tokens or similar
      if (str.includes('.') && str.length > 50 && !str.includes(' ')) {
        return '[TOKEN_REDACTED]';
      }
      
      // Base64 encoded data
      if (/^[A-Za-z0-9+/=]+$/.test(str) && str.length > 20) {
        return '[ENCODED_DATA_REDACTED]';
      }
      
      return str;
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        
        // Check if field name indicates PHI or sensitive data
        if (PHI_FIELDS.has(lowerKey) || PHI_PATTERNS.some(pattern => pattern.test(lowerKey))) {
          sanitized[key] = '[REDACTED]';
        } else if (key === 'password' || key === 'token' || key === 'secret' || key === 'key') {
          sanitized[key] = '[REDACTED]';
        } else if (key.toLowerCase().includes('auth') && typeof value === 'string' && value.length > 10) {
          sanitized[key] = '[AUTH_REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      
      return sanitized;
    }

    return data;
  }

  /**
   * Creates a structured log entry
   */
  private createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      level,
      message,
      context: context ? this.sanitizeData(context) as LogContext : undefined,
      timestamp: new Date().toISOString(),
      environment: this.isDevelopment ? 'development' : 'production',
    };
  }

  /**
   * Sends logs to external monitoring service in production
   */
  private async sendToMonitoring(entry: LogEntry): Promise<void> {
    if (!this.isProduction) {
      return;
    }

    try {
      // In production, send to monitoring service (e.g., Sentry, LogRocket, etc.)
      // This is a placeholder for the actual implementation
      if (window.gtag && entry.level === 'error') {
        window.gtag('event', 'exception', {
          description: entry.message,
          fatal: entry.level === 'error',
          custom_map: {
            level: entry.level,
            component: entry.context?.component,
          }
        });
      }
    } catch (error) {
      // Fallback: Don't let monitoring failures break the app
      if (this.isDevelopment) {
        console.error('Failed to send log to monitoring service:', error);
      }
    }
  }

  /**
   * Debug logging - only in development and when log level allows
   */
  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) {
      return;
    }

    const entry = this.createLogEntry('debug', message, context);
    
    if (this.enableConsoleInDev && this.isDevelopment) {
      console.log(`[DEBUG] ${message}`, context ? this.sanitizeData(context) : '');
    }
  }

  /**
   * Info logging - respects log level configuration
   */
  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) {
      return;
    }

    const entry = this.createLogEntry('info', message, context);
    
    if (this.isDevelopment && this.enableConsoleInDev) {
      console.info(`[INFO] ${message}`, context ? this.sanitizeData(context) : '');
    }
    
    // In production, only log critical info events
    if (this.isProduction && context?.action === 'critical') {
      this.sendToMonitoring(entry);
    }
  }

  /**
   * Warning logging - always logged when level allows
   */
  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) {
      return;
    }

    const entry = this.createLogEntry('warn', message, context);
    
    if (this.isDevelopment && this.enableConsoleInDev) {
      console.warn(`[WARN] ${message}`, context ? this.sanitizeData(context) : '');
    }
    
    // Always send warnings to monitoring in production
    if (this.isProduction) {
      this.sendToMonitoring(entry);
    }
  }

  /**
   * Error logging - always logged and monitored
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext: LogContext = {
      ...context,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: this.isDevelopment ? error?.stack : '[REDACTED]',
    };

    const entry = this.createLogEntry('error', message, errorContext);
    
    if (this.isDevelopment && this.enableConsoleInDev) {
      console.error(`[ERROR] ${message}`, error, context ? this.sanitizeData(context) : '');
    }
    
    // Always send errors to monitoring
    this.sendToMonitoring(entry);
  }

  /**
   * Security audit logging - always logged with high priority
   */
  security(message: string, context?: LogContext): void {
    const entry = this.createLogEntry('security', message, {
      ...context,
      securityEvent: true,
      timestamp: new Date().toISOString(),
    });
    
    if (this.isDevelopment && this.enableConsoleInDev) {
      console.log(`[SECURITY] ${message}`, context ? this.sanitizeData(context) : '');
    }
    
    // Always send security events to monitoring
    this.sendToMonitoring(entry);
  }

  /**
   * Performance logging for monitoring
   */
  performance(message: string, duration: number, context?: LogContext): void {
    // Only log performance data if explicitly enabled
    if (!this.enablePerformanceLogging) {
      return;
    }

    const perfContext: LogContext = {
      ...context,
      duration,
      performance: true,
    };

    const entry = this.createLogEntry('info', message, perfContext);
    
    if (this.isDevelopment && this.enableConsoleInDev) {
      console.log(`[PERF] ${message} (${duration}ms)`, context ? this.sanitizeData(context) : '');
    }
    
    // Send performance logs to monitoring in production
    if (this.isProduction) {
      this.sendToMonitoring(entry);
    }
  }

  /**
   * API call logging
   */
  api(method: string, url: string, status: number, duration: number, context?: LogContext): void {
    const apiContext: LogContext = {
      ...context,
      method,
      url: url.replace(/\/[0-9a-f-]{36}/g, '/[ID]'), // Remove UUIDs from URLs
      status,
      duration,
      api: true,
    };

    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    const message = `API ${method} ${apiContext.url} - ${status} (${duration}ms)`;
    
    if (level === 'error') {
      this.error(message, undefined, apiContext);
    } else if (level === 'warn') {
      this.warn(message, apiContext);
    } else {
      this.info(message, apiContext);
    }
  }

  /**
   * Database operation logging
   */
  database(operation: string, table: string, duration: number, context?: LogContext): void {
    const dbContext: LogContext = {
      ...context,
      operation,
      table,
      duration,
      database: true,
    };

    const message = `DB ${operation} on ${table} (${duration}ms)`;
    this.debug(message, dbContext);
  }

  /**
   * User action logging for analytics
   */
  userAction(action: string, context?: LogContext): void {
    const userContext: LogContext = {
      ...context,
      userAction: true,
      action,
    };

    this.info(`User action: ${action}`, userContext);
  }
}

// Create singleton instance
const logger = new LoggerService();

// Export default instance and class for testing
export { LoggerService };
export default logger;