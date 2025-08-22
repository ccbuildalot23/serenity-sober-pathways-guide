import { Request, Response, NextFunction } from 'express';
import { validationResult, body, query, param } from 'express-validator';
import Joi from 'joi';
import { errorLogger } from '@/utils/logger';
import { AuditEventType, RiskLevel } from '@/types';

// Express-validator error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.param || 'unknown',
      message: error.msg,
      value: error.value,
    }));

    errorLogger.validation('request', req.body, 'Validation failed', {
      errors: validationErrors,
      endpoint: req.path,
      method: req.method,
      request_id: req.requestId,
    });

    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationErrors,
      },
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
    });
    return;
  }

  next();
};

// Joi schemas for comprehensive validation
export const schemas = {
  // Audit log creation schema
  createAuditLog: Joi.object({
    event_type: Joi.string()
      .valid(...[
        'LOGIN', 'LOGOUT', 'DATA_ACCESS', 'DATA_MODIFICATION', 'DATA_EXPORT',
        'PERMISSION_CHANGE', 'SYSTEM_ACCESS', 'API_CALL', 'AUTHENTICATION_FAILURE',
        'AUTHORIZATION_FAILURE', 'PASSWORD_CHANGE', 'ACCOUNT_LOCKOUT',
        'CONFIGURATION_CHANGE', 'SECURITY_ALERT', 'PHI_ACCESS', 'PHI_EXPORT',
        'ADMIN_ACTION', 'CRISIS_EVENT', 'EMERGENCY_ACCESS'
      ])
      .required()
      .messages({
        'any.required': 'Event type is required',
        'any.only': 'Invalid event type',
      }),
    
    event_name: Joi.string()
      .min(1)
      .max(255)
      .required()
      .pattern(/^[a-zA-Z0-9\s\-_\.]+$/)
      .messages({
        'string.min': 'Event name cannot be empty',
        'string.max': 'Event name cannot exceed 255 characters',
        'string.pattern.base': 'Event name contains invalid characters',
      }),
    
    event_description: Joi.string()
      .max(1000)
      .optional()
      .allow('')
      .messages({
        'string.max': 'Event description cannot exceed 1000 characters',
      }),
    
    user_id: Joi.string()
      .uuid()
      .optional()
      .messages({
        'string.uuid': 'User ID must be a valid UUID',
      }),
    
    username: Joi.string()
      .min(1)
      .max(255)
      .optional()
      .pattern(/^[a-zA-Z0-9\@\.\-_]+$/)
      .messages({
        'string.pattern.base': 'Username contains invalid characters',
      }),
    
    user_role: Joi.string()
      .max(100)
      .optional()
      .valid('patient', 'provider', 'supporter', 'admin', 'service', 'system')
      .messages({
        'any.only': 'Invalid user role',
      }),
    
    session_id: Joi.string()
      .max(255)
      .optional(),
    
    source_ip: Joi.string()
      .ip()
      .optional()
      .messages({
        'string.ip': 'Invalid IP address format',
      }),
    
    user_agent: Joi.string()
      .max(1000)
      .optional(),
    
    request_id: Joi.string()
      .max(255)
      .optional(),
    
    service_name: Joi.string()
      .max(100)
      .optional()
      .pattern(/^[a-zA-Z0-9\-_]+$/)
      .messages({
        'string.pattern.base': 'Service name contains invalid characters',
      }),
    
    endpoint: Joi.string()
      .max(500)
      .optional()
      .uri({ relativeOnly: true })
      .messages({
        'string.uri': 'Invalid endpoint format',
      }),
    
    http_method: Joi.string()
      .valid('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD')
      .optional(),
    
    resource_type: Joi.string()
      .max(100)
      .optional(),
    
    resource_id: Joi.string()
      .max(255)
      .optional(),
    
    resource_name: Joi.string()
      .max(255)
      .optional(),
    
    patient_id: Joi.string()
      .uuid()
      .optional()
      .when('event_type', {
        is: Joi.string().valid('PHI_ACCESS', 'PHI_EXPORT'),
        then: Joi.required(),
        otherwise: Joi.optional(),
      })
      .messages({
        'string.uuid': 'Patient ID must be a valid UUID',
        'any.required': 'Patient ID is required for PHI events',
      }),
    
    risk_level: Joi.string()
      .valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
      .optional()
      .default('LOW'),
    
    security_flags: Joi.object()
      .optional()
      .default({}),
    
    request_data: Joi.any()
      .optional(),
    
    response_data: Joi.any()
      .optional(),
    
    hipaa_category: Joi.string()
      .max(100)
      .optional()
      .when('patient_id', {
        is: Joi.exist(),
        then: Joi.required(),
        otherwise: Joi.optional(),
      }),
    
    metadata: Joi.object()
      .optional()
      .default({}),
    
    tags: Joi.array()
      .items(Joi.string().max(50))
      .max(10)
      .optional()
      .default([])
      .messages({
        'array.max': 'Cannot have more than 10 tags',
      }),
  }),

  // Audit log search schema
  searchAuditLogs: Joi.object({
    query: Joi.object({
      user_id: Joi.string().uuid().optional(),
      
      event_type: Joi.alternatives().try(
        Joi.string().valid(...[
          'LOGIN', 'LOGOUT', 'DATA_ACCESS', 'DATA_MODIFICATION', 'DATA_EXPORT',
          'PERMISSION_CHANGE', 'SYSTEM_ACCESS', 'API_CALL', 'AUTHENTICATION_FAILURE',
          'AUTHORIZATION_FAILURE', 'PASSWORD_CHANGE', 'ACCOUNT_LOCKOUT',
          'CONFIGURATION_CHANGE', 'SECURITY_ALERT', 'PHI_ACCESS', 'PHI_EXPORT',
          'ADMIN_ACTION', 'CRISIS_EVENT', 'EMERGENCY_ACCESS'
        ]),
        Joi.array().items(Joi.string().valid(...[
          'LOGIN', 'LOGOUT', 'DATA_ACCESS', 'DATA_MODIFICATION', 'DATA_EXPORT',
          'PERMISSION_CHANGE', 'SYSTEM_ACCESS', 'API_CALL', 'AUTHENTICATION_FAILURE',
          'AUTHORIZATION_FAILURE', 'PASSWORD_CHANGE', 'ACCOUNT_LOCKOUT',
          'CONFIGURATION_CHANGE', 'SECURITY_ALERT', 'PHI_ACCESS', 'PHI_EXPORT',
          'ADMIN_ACTION', 'CRISIS_EVENT', 'EMERGENCY_ACCESS'
        ]))
      ).optional(),
      
      risk_level: Joi.alternatives().try(
        Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        Joi.array().items(Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
      ).optional(),
      
      start_date: Joi.date().iso().optional(),
      end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
      
      source_ip: Joi.string().ip().optional(),
      patient_id: Joi.string().uuid().optional(),
      session_id: Joi.string().max(255).optional(),
      service_name: Joi.string().max(100).optional(),
      hipaa_category: Joi.string().max(100).optional(),
      
      tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
      
      status: Joi.string().valid('ACTIVE', 'SUSPICIOUS', 'BLOCKED', 'INVESTIGATING').optional(),
      
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(1000).default(50),
      sort_by: Joi.string().valid('event_timestamp', 'risk_level', 'user_id', 'event_type').default('event_timestamp'),
      sort_order: Joi.string().valid('ASC', 'DESC').default('DESC'),
    }).required(),
    
    include_encrypted_data: Joi.boolean().optional().default(false),
  }),

  // Pagination parameters
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(1000).default(50),
    sort_by: Joi.string().optional(),
    sort_order: Joi.string().valid('ASC', 'DESC').default('DESC'),
  }),
};

// Joi validation middleware factory
export const validateWithJoi = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      errorLogger.validation('joi', req.body, 'Joi validation failed', {
        errors: validationErrors,
        endpoint: req.path,
        method: req.method,
        request_id: req.requestId,
      });

      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validationErrors,
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
      return;
    }

    // Replace request body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Express-validator chains for specific endpoints
export const validationChains = {
  // Create audit log validation
  createAuditLog: [
    body('event_type')
      .isIn([
        'LOGIN', 'LOGOUT', 'DATA_ACCESS', 'DATA_MODIFICATION', 'DATA_EXPORT',
        'PERMISSION_CHANGE', 'SYSTEM_ACCESS', 'API_CALL', 'AUTHENTICATION_FAILURE',
        'AUTHORIZATION_FAILURE', 'PASSWORD_CHANGE', 'ACCOUNT_LOCKOUT',
        'CONFIGURATION_CHANGE', 'SECURITY_ALERT', 'PHI_ACCESS', 'PHI_EXPORT',
        'ADMIN_ACTION', 'CRISIS_EVENT', 'EMERGENCY_ACCESS'
      ])
      .withMessage('Invalid event type'),
    
    body('event_name')
      .isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9\s\-_\.]+$/)
      .withMessage('Event name must be 1-255 characters and contain only alphanumeric characters, spaces, hyphens, underscores, and periods'),
    
    body('event_description')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('Event description cannot exceed 1000 characters'),
    
    body('user_id')
      .optional()
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    
    body('username')
      .optional()
      .isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9\@\.\-_]+$/)
      .withMessage('Username contains invalid characters'),
    
    body('source_ip')
      .optional()
      .isIP()
      .withMessage('Invalid IP address'),
    
    body('patient_id')
      .optional()
      .isUUID()
      .withMessage('Patient ID must be a valid UUID'),
    
    body('risk_level')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid risk level'),
  ],

  // Get audit logs validation
  getAuditLogs: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    
    query('user_id')
      .optional()
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    
    query('event_type')
      .optional()
      .custom((value) => {
        const validTypes = [
          'LOGIN', 'LOGOUT', 'DATA_ACCESS', 'DATA_MODIFICATION', 'DATA_EXPORT',
          'PERMISSION_CHANGE', 'SYSTEM_ACCESS', 'API_CALL', 'AUTHENTICATION_FAILURE',
          'AUTHORIZATION_FAILURE', 'PASSWORD_CHANGE', 'ACCOUNT_LOCKOUT',
          'CONFIGURATION_CHANGE', 'SECURITY_ALERT', 'PHI_ACCESS', 'PHI_EXPORT',
          'ADMIN_ACTION', 'CRISIS_EVENT', 'EMERGENCY_ACCESS'
        ];
        
        if (Array.isArray(value)) {
          return value.every(type => validTypes.includes(type));
        }
        return validTypes.includes(value);
      })
      .withMessage('Invalid event type'),
    
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO 8601 format'),
    
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO 8601 format'),
    
    query('sort_order')
      .optional()
      .isIn(['ASC', 'DESC'])
      .withMessage('Sort order must be ASC or DESC'),
  ],

  // Parameter validation
  uuid: [
    param('id')
      .isUUID()
      .withMessage('ID must be a valid UUID'),
  ],
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Recursively sanitize strings in request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    errorLogger.application(error as Error, {
      component: 'validation',
      operation: 'sanitizeInput',
      request_id: req.requestId,
    });

    res.status(500).json({
      error: {
        code: 'SANITIZATION_ERROR',
        message: 'Input sanitization failed',
      },
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
    });
  }
};

// Sanitize object recursively
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// Sanitize individual string
function sanitizeString(str: string): string {
  return str
    .trim()
    // Remove potential XSS patterns
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove SQL injection patterns
    .replace(/(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi, '')
    // Limit length
    .substring(0, 10000);
}

// Request size validation middleware
export const validateRequestSize = (maxSizeBytes: number = 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    
    if (contentLength > maxSizeBytes) {
      errorLogger.validation('request-size', contentLength, 'Request too large', {
        max_size: maxSizeBytes,
        actual_size: contentLength,
        endpoint: req.path,
        method: req.method,
        request_id: req.requestId,
      });

      res.status(413).json({
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size ${contentLength} bytes exceeds maximum ${maxSizeBytes} bytes`,
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
      return;
    }

    next();
  };
};

// HIPAA data validation
export const validateHipaaData = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const { patient_id, event_type, hipaa_category } = req.body;

    // If patient_id is provided, ensure proper HIPAA categorization
    if (patient_id) {
      if (!hipaa_category) {
        res.status(400).json({
          error: {
            code: 'MISSING_HIPAA_CATEGORY',
            message: 'HIPAA category is required when patient_id is provided',
          },
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        });
        return;
      }

      // Ensure PHI events have patient_id
      if (['PHI_ACCESS', 'PHI_EXPORT'].includes(event_type) && !patient_id) {
        res.status(400).json({
          error: {
            code: 'MISSING_PATIENT_ID',
            message: 'Patient ID is required for PHI access events',
          },
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        });
        return;
      }
    }

    next();
  } catch (error) {
    errorLogger.application(error as Error, {
      component: 'validation',
      operation: 'validateHipaaData',
      request_id: req.requestId,
    });

    res.status(500).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'HIPAA validation failed',
      },
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
    });
  }
};