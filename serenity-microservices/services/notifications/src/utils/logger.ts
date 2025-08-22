import pino from 'pino';
import { config } from '@/config';

const isDevelopment = config.env === 'development';

export const logger = pino({
  level: config.monitoring.logLevel,
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname'
    }
  } : undefined,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    log: (object) => {
      // Remove sensitive data from logs for HIPAA compliance
      const sanitized = { ...object };
      
      // Remove common sensitive fields
      const sensitiveFields = [
        'password', 'token', 'secret', 'key', 'authorization',
        'phoneNumber', 'email', 'ssn', 'dob', 'address'
      ];

      function sanitizeObject(obj: any): any {
        if (typeof obj !== 'object' || obj === null) {
          return obj;
        }

        if (Array.isArray(obj)) {
          return obj.map(sanitizeObject);
        }

        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveFields.some(field => lowerKey.includes(field))) {
            result[key] = '[REDACTED]';
          } else if (typeof value === 'object') {
            result[key] = sanitizeObject(value);
          } else {
            result[key] = value;
          }
        }
        return result;
      }

      return sanitizeObject(sanitized);
    }
  },
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'res.headers["set-cookie"]',
      'password',
      'token',
      'secret',
      'key',
      'authorization'
    ],
    censor: '[REDACTED]'
  }
});

// HIPAA-compliant audit logger
export const auditLogger = pino({
  level: 'info',
  base: {
    service: 'notification-service',
    auditLog: true,
    hipaaCompliant: true
  },
  transport: {
    target: 'pino/file',
    options: {
      destination: './logs/audit.log'
    }
  },
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
    log: (object) => ({
      ...object,
      timestamp: new Date().toISOString(),
      environment: config.env
    })
  }
});

// Security event logger
export const securityLogger = pino({
  level: 'warn',
  base: {
    service: 'notification-service',
    securityLog: true
  },
  transport: {
    target: 'pino/file',
    options: {
      destination: './logs/security.log'
    }
  }
});

export default logger;