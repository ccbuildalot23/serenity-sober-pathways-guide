import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createLogger, securityLogger } from '@utils/logger';
import { getClientIp, getUserAgent, maskSensitiveData } from '@utils/helpers';
import { redisManager } from '@utils/redis';
import config from '@config/index';

const logger = createLogger('Security');

/**
 * Input validation middleware
 */
export const inputValidation = (schema: {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
  headers?: Joi.Schema;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors: string[] = [];

      // Validate body
      if (schema.body && req.body) {
        const { error } = schema.body.validate(req.body);
        if (error) {
          errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
        }
      }

      // Validate query parameters
      if (schema.query && req.query) {
        const { error } = schema.query.validate(req.query);
        if (error) {
          errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
        }
      }

      // Validate path parameters
      if (schema.params && req.params) {
        const { error } = schema.params.validate(req.params);
        if (error) {
          errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
        }
      }

      // Validate headers
      if (schema.headers && req.headers) {
        const { error } = schema.headers.validate(req.headers);
        if (error) {
          errors.push(`Headers: ${error.details.map(d => d.message).join(', ')}`);
        }
      }

      if (errors.length > 0) {
        securityLogger.warn('Input validation failed', {
          request_id: req.request_id,
          errors,
          ip: getClientIp(req),
          user_id: req.user?.id,
          path: req.path,
          method: req.method
        });

        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors,
            timestamp: new Date().toISOString(),
            request_id: req.request_id
          }
        });
      }

      next();
    } catch (error) {
      logger.error('Input validation error:', error);
      next(error);
    }
  };
};

/**
 * SQL Injection protection middleware
 */
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  try {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(\'|\"|;|--|\/*|\*/|xp_|sp_)/gi,
      /(\b(WAITFOR|DELAY)\b)/gi,
      /(\b(BENCHMARK|SLEEP)\b)/gi
    ];

    const checkString = (str: string): boolean => {
      return sqlPatterns.some(pattern => pattern.test(str));
    };

    const checkObject = (obj: any): boolean => {
      for (const key in obj) {
        if (typeof obj[key] === 'string' && checkString(obj[key])) {
          return true;
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (checkObject(obj[key])) {
            return true;
          }
        }
      }
      return false;
    };

    // Check query parameters
    if (req.query && checkObject(req.query)) {
      securityLogger.error('SQL injection attempt detected in query', {
        request_id: req.request_id,
        ip: getClientIp(req),
        user_agent: getUserAgent(req),
        query: maskSensitiveData(req.query),
        path: req.path
      });

      return res.status(400).json({
        error: {
          code: 'SECURITY_VIOLATION',
          message: 'Suspicious input detected',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Check body
    if (req.body && checkObject(req.body)) {
      securityLogger.error('SQL injection attempt detected in body', {
        request_id: req.request_id,
        ip: getClientIp(req),
        user_agent: getUserAgent(req),
        body: maskSensitiveData(req.body),
        path: req.path
      });

      return res.status(400).json({
        error: {
          code: 'SECURITY_VIOLATION',
          message: 'Suspicious input detected',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    next();
  } catch (error) {
    logger.error('SQL injection protection error:', error);
    next();
  }
};

/**
 * XSS protection middleware
 */
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  try {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<\s*(object|embed|applet|form)/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi
    ];

    const sanitizeString = (str: string): string => {
      let sanitized = str;
      xssPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
      });
      return sanitized
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };

    const sanitizeObject = (obj: any): any => {
      if (typeof obj === 'string') {
        return sanitizeString(obj);
      }
      if (typeof obj === 'object' && obj !== null) {
        const sanitized: any = Array.isArray(obj) ? [] : {};
        for (const key in obj) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
        return sanitized;
      }
      return obj;
    };

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    next();
  } catch (error) {
    logger.error('XSS protection error:', error);
    next();
  }
};

/**
 * Request size validation middleware
 */
export const requestSizeValidation = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { max_body_size, max_param_length, max_query_length } = config.security.input_validation;

    // Check URL length
    if (req.url.length > max_query_length) {
      securityLogger.warn('Request URL too long', {
        request_id: req.request_id,
        ip: getClientIp(req),
        url_length: req.url.length,
        max_length: max_query_length
      });

      return res.status(414).json({
        error: {
          code: 'REQUEST_URI_TOO_LONG',
          message: 'Request URI is too long',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Check individual parameter lengths
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string' && value.length > max_param_length) {
        securityLogger.warn('Query parameter too long', {
          request_id: req.request_id,
          ip: getClientIp(req),
          parameter: key,
          length: value.length,
          max_length: max_param_length
        });

        return res.status(400).json({
          error: {
            code: 'PARAMETER_TOO_LONG',
            message: `Parameter ${key} is too long`,
            timestamp: new Date().toISOString(),
            request_id: req.request_id
          }
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Request size validation error:', error);
    next();
  }
};

/**
 * Path traversal protection middleware
 */
export const pathTraversalProtection = (req: Request, res: Response, next: NextFunction) => {
  try {
    const pathTraversalPatterns = [
      /\.\./g,
      /\.\\/g,
      /\.\/\./g,
      /%2e%2e/gi,
      /%2f/gi,
      /%5c/gi
    ];

    const checkPath = (path: string): boolean => {
      return pathTraversalPatterns.some(pattern => pattern.test(path));
    };

    if (checkPath(req.path) || checkPath(req.url)) {
      securityLogger.error('Path traversal attempt detected', {
        request_id: req.request_id,
        ip: getClientIp(req),
        user_agent: getUserAgent(req),
        path: req.path,
        url: req.url
      });

      return res.status(400).json({
        error: {
          code: 'SECURITY_VIOLATION',
          message: 'Invalid path detected',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    next();
  } catch (error) {
    logger.error('Path traversal protection error:', error);
    next();
  }
};

/**
 * User agent validation middleware
 */
export const userAgentValidation = (req: Request, res: Response, next: NextFunction) => {
  try {
    const userAgent = getUserAgent(req);
    
    // Block known malicious user agents
    const maliciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nessus/i,
      /burp/i,
      /owasp/i,
      /masscan/i,
      /nmap/i,
      /bot.*scanner/i,
      /vulnerability.*scanner/i
    ];

    if (maliciousPatterns.some(pattern => pattern.test(userAgent))) {
      securityLogger.error('Malicious user agent detected', {
        request_id: req.request_id,
        ip: getClientIp(req),
        user_agent: userAgent,
        path: req.path
      });

      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Block empty or suspicious user agents
    if (!userAgent || userAgent.length < 10 || userAgent.length > 1000) {
      securityLogger.warn('Suspicious user agent', {
        request_id: req.request_id,
        ip: getClientIp(req),
        user_agent: userAgent,
        path: req.path
      });
    }

    next();
  } catch (error) {
    logger.error('User agent validation error:', error);
    next();
  }
};

/**
 * Request method validation middleware
 */
export const requestMethodValidation = (allowedMethods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!allowedMethods.includes(req.method)) {
      securityLogger.warn('Invalid request method', {
        request_id: req.request_id,
        ip: getClientIp(req),
        method: req.method,
        path: req.path,
        allowed_methods: allowedMethods
      });

      return res.status(405).json({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: `Method ${req.method} not allowed`,
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    next();
  };
};

/**
 * Content type validation middleware
 */
export const contentTypeValidation = (allowedTypes: string[] = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only check for requests with body
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      const contentType = req.headers['content-type']?.split(';')[0];
      
      if (contentType && !allowedTypes.includes(contentType)) {
        securityLogger.warn('Invalid content type', {
          request_id: req.request_id,
          ip: getClientIp(req),
          content_type: contentType,
          path: req.path,
          allowed_types: allowedTypes
        });

        return res.status(415).json({
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
            message: `Content type ${contentType} not supported`,
            timestamp: new Date().toISOString(),
            request_id: req.request_id
          }
        });
      }
    }

    next();
  };
};

/**
 * IP address validation middleware
 */
export const ipValidation = (blockedIPs: string[] = [], allowedIPs: string[] = []) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const clientIP = getClientIp(req);

      // Check if IP is explicitly blocked
      if (blockedIPs.includes(clientIP)) {
        securityLogger.error('Blocked IP address detected', {
          request_id: req.request_id,
          ip: clientIP,
          path: req.path
        });

        return res.status(403).json({
          error: {
            code: 'IP_BLOCKED',
            message: 'Access denied from your IP address',
            timestamp: new Date().toISOString(),
            request_id: req.request_id
          }
        });
      }

      // Check if IP is in Redis blacklist
      const isBlacklisted = await redisManager.exists(`blacklist:ip:${clientIP}`);
      if (isBlacklisted) {
        securityLogger.error('Blacklisted IP address detected', {
          request_id: req.request_id,
          ip: clientIP,
          path: req.path
        });

        return res.status(403).json({
          error: {
            code: 'IP_BLACKLISTED',
            message: 'Access denied from your IP address',
            timestamp: new Date().toISOString(),
            request_id: req.request_id
          }
        });
      }

      // If allowed IPs are specified, check if IP is in the list
      if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        securityLogger.warn('IP not in allowed list', {
          request_id: req.request_id,
          ip: clientIP,
          path: req.path
        });

        return res.status(403).json({
          error: {
            code: 'IP_NOT_ALLOWED',
            message: 'Access denied from your IP address',
            timestamp: new Date().toISOString(),
            request_id: req.request_id
          }
        });
      }

      next();
    } catch (error) {
      logger.error('IP validation error:', error);
      next();
    }
  };
};

/**
 * Suspicious activity detection middleware
 */
export const suspiciousActivityDetection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIP = getClientIp(req);
    const userAgent = getUserAgent(req);
    const currentTime = Date.now();
    
    // Track request frequency per IP
    const requestKey = `requests:${clientIP}`;
    const requestCount = await redisManager.incr(requestKey);
    
    if (requestCount === 1) {
      await redisManager.expire(requestKey, 60); // 1 minute window
    }

    // Flag suspicious activity if too many requests
    if (requestCount > 100) { // 100 requests per minute
      securityLogger.error('Suspicious activity detected - high request frequency', {
        request_id: req.request_id,
        ip: clientIP,
        user_agent: userAgent,
        request_count: requestCount,
        path: req.path
      });

      // Add IP to temporary blacklist
      await redisManager.set(`blacklist:ip:${clientIP}`, '1', 3600); // 1 hour
    }

    // Track unique endpoints accessed
    const endpointKey = `endpoints:${clientIP}`;
    await redisManager.sadd(endpointKey, req.path);
    await redisManager.expire(endpointKey, 300); // 5 minutes

    const uniqueEndpoints = await redisManager.smembers(endpointKey);
    
    // Flag if accessing too many unique endpoints
    if (uniqueEndpoints && uniqueEndpoints.length > 50) {
      securityLogger.warn('Suspicious activity detected - scanning behavior', {
        request_id: req.request_id,
        ip: clientIP,
        user_agent: userAgent,
        unique_endpoints: uniqueEndpoints.length,
        path: req.path
      });
    }

    next();
  } catch (error) {
    logger.error('Suspicious activity detection error:', error);
    next();
  }
};

/**
 * HIPAA compliance validation middleware
 */
export const hipaaComplianceValidation = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Ensure HTTPS for PHI data
    if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
      securityLogger.error('Insecure connection attempt for HIPAA data', {
        request_id: req.request_id,
        ip: getClientIp(req),
        path: req.path,
        protocol: req.protocol
      });

      return res.status(426).json({
        error: {
          code: 'HTTPS_REQUIRED',
          message: 'HTTPS is required for this resource',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Check for required authentication for PHI endpoints
    const phiPaths = ['/api/v1/checkins', '/api/v1/clinical', '/api/v1/crisis'];
    const isPHIEndpoint = phiPaths.some(path => req.path.startsWith(path));

    if (isPHIEndpoint && !req.user) {
      securityLogger.error('Unauthenticated access attempt to PHI endpoint', {
        request_id: req.request_id,
        ip: getClientIp(req),
        path: req.path
      });

      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required for this resource',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Log access to PHI data for audit trail
    if (isPHIEndpoint && req.user) {
      securityLogger.info('PHI data access', {
        request_id: req.request_id,
        user_id: req.user.id,
        user_role: req.user.role,
        ip: getClientIp(req),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    logger.error('HIPAA compliance validation error:', error);
    next();
  }
};

/**
 * Combined security middleware
 */
export const applySecurity = (options: {
  sqlInjection?: boolean;
  xss?: boolean;
  pathTraversal?: boolean;
  userAgent?: boolean;
  requestSize?: boolean;
  suspiciousActivity?: boolean;
  hipaaCompliance?: boolean;
  allowedMethods?: string[];
  allowedContentTypes?: string[];
  blockedIPs?: string[];
  allowedIPs?: string[];
} = {}) => {
  const middlewares: any[] = [];

  if (options.sqlInjection !== false) {
    middlewares.push(sqlInjectionProtection);
  }

  if (options.xss !== false) {
    middlewares.push(xssProtection);
  }

  if (options.pathTraversal !== false) {
    middlewares.push(pathTraversalProtection);
  }

  if (options.userAgent !== false) {
    middlewares.push(userAgentValidation);
  }

  if (options.requestSize !== false) {
    middlewares.push(requestSizeValidation);
  }

  if (options.allowedMethods) {
    middlewares.push(requestMethodValidation(options.allowedMethods));
  }

  if (options.allowedContentTypes) {
    middlewares.push(contentTypeValidation(options.allowedContentTypes));
  }

  if (options.blockedIPs || options.allowedIPs) {
    middlewares.push(ipValidation(options.blockedIPs, options.allowedIPs));
  }

  if (options.suspiciousActivity !== false) {
    middlewares.push(suspiciousActivityDetection);
  }

  if (options.hipaaCompliance) {
    middlewares.push(hipaaComplianceValidation);
  }

  return middlewares;
};