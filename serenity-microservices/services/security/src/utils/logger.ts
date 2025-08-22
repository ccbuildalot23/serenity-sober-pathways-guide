import winston from 'winston';
import { config } from '@/config/config';

// Custom log format for HIPAA compliance
const hipaaFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    // Remove sensitive data from logs
    const sanitizedMeta = sanitizeLogData(meta);
    
    const logEntry = {
      timestamp,
      level,
      message,
      service: config.serviceName,
      version: config.serviceVersion,
      environment: config.nodeEnv,
      ...sanitizedMeta,
    };

    return JSON.stringify(logEntry);
  })
);

// Development format for better readability
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(sanitizeLogData(meta), null, 2) : '';
    return `${timestamp} [${level}]: ${message} ${metaStr}`;
  })
);

// Configure transports
const transports: winston.transport[] = [
  new winston.transports.Console({
    level: config.logging.level,
    format: config.nodeEnv === 'development' ? devFormat : hipaaFormat,
  }),
];

// Add file transports for production
if (config.nodeEnv === 'production') {
  transports.push(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: hipaaFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      format: hipaaFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 30,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.logging.level,
  format: hipaaFormat,
  defaultMeta: {
    service: config.serviceName,
    version: config.serviceVersion,
  },
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
  exitOnError: false,
});

// Sanitize sensitive data from logs
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'ssn',
    'social_security_number',
    'credit_card',
    'phone',
    'email',
    'address',
    'dob',
    'date_of_birth',
    'medical_record_number',
    'patient_id',
    'phi_data',
    'encrypted_data',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (sanitized[field] !== undefined) {
      sanitized[field] = '[REDACTED]';
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeLogData(sanitized[key]);
    }
  }

  return sanitized;
}

// HIPAA audit logging functions
export const auditLogger = {
  // Log user authentication events
  authentication: (userId: string, success: boolean, details: any = {}) => {
    logger.info('Authentication attempt', {
      event_type: 'AUTHENTICATION',
      user_id: userId,
      success,
      ...sanitizeLogData(details),
      audit: true,
    });
  },

  // Log data access events
  dataAccess: (userId: string, resourceType: string, resourceId: string, details: any = {}) => {
    logger.info('Data access', {
      event_type: 'DATA_ACCESS',
      user_id: userId,
      resource_type: resourceType,
      resource_id: resourceId,
      ...sanitizeLogData(details),
      audit: true,
    });
  },

  // Log PHI access events
  phiAccess: (userId: string, patientId: string, dataType: string, details: any = {}) => {
    logger.info('PHI access', {
      event_type: 'PHI_ACCESS',
      user_id: userId,
      patient_id: patientId,
      data_type: dataType,
      ...sanitizeLogData(details),
      audit: true,
      hipaa_category: 'PHI_ACCESS',
    });
  },

  // Log security events
  securityEvent: (eventType: string, severity: string, details: any = {}) => {
    logger.warn('Security event', {
      event_type: 'SECURITY_EVENT',
      security_event_type: eventType,
      severity,
      ...sanitizeLogData(details),
      audit: true,
    });
  },

  // Log system configuration changes
  configurationChange: (userId: string, component: string, change: any, details: any = {}) => {
    logger.info('Configuration change', {
      event_type: 'CONFIGURATION_CHANGE',
      user_id: userId,
      component,
      change: sanitizeLogData(change),
      ...sanitizeLogData(details),
      audit: true,
    });
  },

  // Log API calls for audit trail
  apiCall: (method: string, endpoint: string, userId?: string, details: any = {}) => {
    logger.info('API call', {
      event_type: 'API_CALL',
      http_method: method,
      endpoint,
      user_id: userId,
      ...sanitizeLogData(details),
      audit: true,
    });
  },
};

// Performance logging
export const performanceLogger = {
  // Log slow queries or operations
  slowOperation: (operation: string, duration: number, details: any = {}) => {
    logger.warn('Slow operation detected', {
      operation,
      duration_ms: duration,
      ...sanitizeLogData(details),
      performance: true,
    });
  },

  // Log database query performance
  dbQuery: (query: string, duration: number, rows?: number) => {
    if (duration > 1000) { // Log queries taking more than 1 second
      logger.warn('Slow database query', {
        query: query.substring(0, 100),
        duration_ms: duration,
        rows_affected: rows,
        performance: true,
      });
    }
  },
};

// Error logging with context
export const errorLogger = {
  // Log application errors
  application: (error: Error, context: any = {}) => {
    logger.error('Application error', {
      error_message: error.message,
      error_stack: error.stack,
      ...sanitizeLogData(context),
    });
  },

  // Log validation errors
  validation: (field: string, value: any, message: string, context: any = {}) => {
    logger.warn('Validation error', {
      validation_field: field,
      validation_message: message,
      ...sanitizeLogData(context),
    });
  },

  // Log authentication errors
  authentication: (userId: string, reason: string, context: any = {}) => {
    logger.error('Authentication error', {
      user_id: userId,
      failure_reason: reason,
      ...sanitizeLogData(context),
      audit: true,
    });
  },

  // Log authorization errors
  authorization: (userId: string, resource: string, action: string, context: any = {}) => {
    logger.error('Authorization error', {
      user_id: userId,
      resource,
      action,
      ...sanitizeLogData(context),
      audit: true,
    });
  },
};

// Create a request logger middleware
export const createRequestLogger = () => {
  return (req: any, res: any, next: any) => {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Add request ID to request object
    req.requestId = requestId;

    // Log request start
    logger.info('Request started', {
      request_id: requestId,
      method: req.method,
      url: req.url,
      user_agent: req.get('User-Agent'),
      source_ip: req.ip || req.connection.remoteAddress,
    });

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk: any, encoding: any) {
      const duration = Date.now() - startTime;
      
      logger.info('Request completed', {
        request_id: requestId,
        method: req.method,
        url: req.url,
        status_code: res.statusCode,
        duration_ms: duration,
        user_id: req.user?.id,
      });

      // Log slow requests
      if (duration > 5000) {
        performanceLogger.slowOperation('HTTP Request', duration, {
          request_id: requestId,
          method: req.method,
          url: req.url,
        });
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

export default logger;