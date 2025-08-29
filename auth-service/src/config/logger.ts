import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message} ${
      info.metadata ? JSON.stringify(info.metadata) : ''
    }`
  )
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports
const transports: winston.transport[] = [];

// Console transport for development
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// File transport for general logs
transports.push(
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'auth-service-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: process.env.LOG_MAX_SIZE || '100m',
    maxFiles: process.env.LOG_MAX_FILES || '30d',
    format: fileFormat,
  })
);

// Error file transport
transports.push(
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'auth-service-error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: process.env.LOG_MAX_SIZE || '100m',
    maxFiles: process.env.LOG_MAX_FILES || '30d',
    level: 'error',
    format: fileFormat,
  })
);

// HIPAA audit log transport (never delete, encrypted)
transports.push(
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'audit', 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '100m',
    maxFiles: process.env.LOG_AUDIT_RETENTION || '2557d', // 7 years for HIPAA
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      // Custom format for audit logs with additional security
      winston.format.printf((info) => {
        if (info.audit === true) {
          return JSON.stringify({
            ...info,
            timestamp: info.timestamp,
            hash: generateLogHash(info), // Add integrity hash
          });
        }
        return JSON.stringify(info);
      })
    ),
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
    }),
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
    }),
  ],
});

// Audit logger for HIPAA compliance
export const auditLogger = {
  log: (action: string, details: any, userId?: string, sessionId?: string, ipAddress?: string) => {
    logger.info(`AUDIT: ${action}`, {
      audit: true,
      action,
      userId,
      sessionId,
      ipAddress,
      details,
      timestamp: new Date().toISOString(),
      compliance: 'HIPAA',
    });
  },
  
  userAction: (action: string, userId: string, details: any, sessionId?: string, ipAddress?: string) => {
    logger.info(`USER_AUDIT: ${action}`, {
      audit: true,
      type: 'user_action',
      action,
      userId,
      sessionId,
      ipAddress,
      details,
      timestamp: new Date().toISOString(),
      compliance: 'HIPAA',
    });
  },
  
  securityEvent: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any) => {
    logger.warn(`SECURITY_AUDIT: ${event}`, {
      audit: true,
      type: 'security_event',
      event,
      severity,
      details,
      timestamp: new Date().toISOString(),
      compliance: 'HIPAA',
    });
  },
  
  accessLog: (resource: string, action: string, userId: string, granted: boolean, details: any) => {
    logger.info(`ACCESS_AUDIT: ${resource}:${action}`, {
      audit: true,
      type: 'access_control',
      resource,
      action,
      userId,
      granted,
      details,
      timestamp: new Date().toISOString(),
      compliance: 'HIPAA',
    });
  },
  
  dataEvent: (event: string, dataType: string, recordId: string, userId: string, details: any) => {
    logger.info(`DATA_AUDIT: ${event}`, {
      audit: true,
      type: 'data_event',
      event,
      dataType,
      recordId,
      userId,
      details,
      timestamp: new Date().toISOString(),
      compliance: 'HIPAA',
      phi: dataType.includes('phi') || dataType.includes('medical'),
    });
  },
};

// Helper function to generate log hash for integrity
function generateLogHash(logEntry: any): string {
  const crypto = require('crypto');
  const logString = JSON.stringify(logEntry);
  return crypto.createHash('sha256').update(logString).digest('hex');
}

// HTTP request logging middleware
export const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'http', 'access-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '30d',
    }),
  ],
});

// Performance logger
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'performance', 'perf-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '100m',
      maxFiles: '14d',
    }),
  ],
});

// Error reporting helper
export const reportError = (error: Error, context?: any, userId?: string, sessionId?: string) => {
  logger.error('Application error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
    context,
    userId,
    sessionId,
    timestamp: new Date().toISOString(),
  });
  
  // Also log as security event if it might be security-related
  if (error.message.includes('unauthorized') || 
      error.message.includes('forbidden') ||
      error.message.includes('invalid token')) {
    auditLogger.securityEvent('error_security_related', 'medium', {
      error: error.message,
      context,
      userId,
      sessionId,
    });
  }
};

// Structured logging helpers
export const loggers = {
  auth: {
    login: (success: boolean, userId?: string, ip?: string, userAgent?: string) => {
      const level = success ? 'info' : 'warn';
      logger.log(level, `Login ${success ? 'successful' : 'failed'}`, {
        type: 'authentication',
        success,
        userId,
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
      });
      
      auditLogger.userAction(
        success ? 'login_success' : 'login_failed',
        userId || 'unknown',
        { ip, userAgent, success }
      );
    },
    
    logout: (userId: string, sessionId: string, ip?: string) => {
      logger.info('User logout', {
        type: 'authentication',
        userId,
        sessionId,
        ip,
        timestamp: new Date().toISOString(),
      });
      
      auditLogger.userAction('logout', userId, { sessionId, ip });
    },
    
    mfa: (action: string, success: boolean, userId: string, ip?: string) => {
      logger.info(`MFA ${action} ${success ? 'successful' : 'failed'}`, {
        type: 'mfa',
        action,
        success,
        userId,
        ip,
        timestamp: new Date().toISOString(),
      });
      
      auditLogger.userAction(`mfa_${action}`, userId, { success, ip });
    },
  },
  
  security: {
    rateLimitExceeded: (ip: string, endpoint: string, userAgent?: string) => {
      logger.warn('Rate limit exceeded', {
        type: 'security',
        ip,
        endpoint,
        userAgent,
        timestamp: new Date().toISOString(),
      });
      
      auditLogger.securityEvent('rate_limit_exceeded', 'medium', {
        ip,
        endpoint,
        userAgent,
      });
    },
    
    bruteForceDetected: (identifier: string, ip: string, attempts: number) => {
      logger.warn('Brute force attack detected', {
        type: 'security',
        identifier,
        ip,
        attempts,
        timestamp: new Date().toISOString(),
      });
      
      auditLogger.securityEvent('brute_force_detected', 'high', {
        identifier,
        ip,
        attempts,
      });
    },
    
    suspiciousActivity: (activity: string, details: any, severity: 'low' | 'medium' | 'high' | 'critical') => {
      logger.warn(`Suspicious activity: ${activity}`, {
        type: 'security',
        activity,
        details,
        severity,
        timestamp: new Date().toISOString(),
      });
      
      auditLogger.securityEvent(`suspicious_${activity}`, severity, details);
    },
  },
};

export default logger;