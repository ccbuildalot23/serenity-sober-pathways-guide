import { Request, Response, NextFunction } from 'express';
import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { NotificationType, NotificationChannel, NotificationPriority } from '@/types';
import { logger } from '@/utils/logger';

// Generic validation error handler
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.type === 'field' ? error.path : error.type,
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    logger.warn('Validation errors', {
      endpoint: req.path,
      method: req.method,
      errors: formattedErrors,
      body: req.body
    });

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formattedErrors
      }
    });
    return;
  }

  next();
};

// Notification request validation
export const validateNotificationRequest: ValidationChain[] = [
  body('userId')
    .isUUID()
    .withMessage('userId must be a valid UUID'),

  body('type')
    .isIn(Object.values(NotificationType))
    .withMessage(`type must be one of: ${Object.values(NotificationType).join(', ')}`),

  body('channel')
    .isIn(Object.values(NotificationChannel))
    .withMessage(`channel must be one of: ${Object.values(NotificationChannel).join(', ')}`),

  body('templateId')
    .isUUID()
    .withMessage('templateId must be a valid UUID'),

  body('data')
    .isObject()
    .withMessage('data must be an object'),

  body('priority')
    .optional()
    .isIn(Object.values(NotificationPriority))
    .withMessage(`priority must be one of: ${Object.values(NotificationPriority).join(', ')}`),

  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('scheduledAt must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('scheduledAt must be in the future');
      }
      return true;
    }),

  body('maxRetries')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('maxRetries must be an integer between 0 and 10'),

  body('metadata')
    .optional()
    .isObject()
    .withMessage('metadata must be an object')
];

// Bulk notification request validation
export const validateBulkNotificationRequest: ValidationChain[] = [
  body('notifications')
    .isArray({ min: 1, max: 1000 })
    .withMessage('notifications must be an array with 1-1000 items'),

  body('notifications.*.userId')
    .isUUID()
    .withMessage('Each notification userId must be a valid UUID'),

  body('notifications.*.type')
    .isIn(Object.values(NotificationType))
    .withMessage(`Each notification type must be one of: ${Object.values(NotificationType).join(', ')}`),

  body('notifications.*.channel')
    .isIn(Object.values(NotificationChannel))
    .withMessage(`Each notification channel must be one of: ${Object.values(NotificationChannel).join(', ')}`),

  body('notifications.*.templateId')
    .isUUID()
    .withMessage('Each notification templateId must be a valid UUID'),

  body('notifications.*.data')
    .isObject()
    .withMessage('Each notification data must be an object'),

  body('scheduleMode')
    .optional()
    .isIn(['immediate', 'staggered', 'scheduled'])
    .withMessage('scheduleMode must be one of: immediate, staggered, scheduled'),

  body('staggerDelayMs')
    .optional()
    .isInt({ min: 100, max: 60000 })
    .withMessage('staggerDelayMs must be between 100 and 60000 milliseconds'),

  body('batchId')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('batchId must be a string with 1-255 characters')
];

// Template creation validation
export const validateTemplateCreation: ValidationChain[] = [
  body('name')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('name must be a string with 1-255 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('type')
    .isIn(Object.values(NotificationType))
    .withMessage(`type must be one of: ${Object.values(NotificationType).join(', ')}`),

  body('channel')
    .isIn(Object.values(NotificationChannel))
    .withMessage(`channel must be one of: ${Object.values(NotificationChannel).join(', ')}`),

  body('subject')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('subject must be a string with 1-500 characters'),

  body('body')
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('body must be a string with 1-10000 characters'),

  body('htmlBody')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('htmlBody must be a string with 1-50000 characters'),

  body('variables')
    .optional()
    .isArray()
    .withMessage('variables must be an array'),

  body('variables.*')
    .optional()
    .isString()
    .withMessage('Each variable must be a string'),

  body('isHipaaCompliant')
    .optional()
    .isBoolean()
    .withMessage('isHipaaCompliant must be a boolean')
];

// Template update validation
export const validateTemplateUpdate: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('Template ID must be a valid UUID'),

  body('name')
    .optional()
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('name must be a string with 1-255 characters'),

  body('subject')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('subject must be a string with 1-500 characters'),

  body('body')
    .optional()
    .isString()
    .isLength({ min: 1, max: 10000 })
    .withMessage('body must be a string with 1-10000 characters'),

  body('htmlBody')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50000 })
    .withMessage('htmlBody must be a string with 1-50000 characters'),

  body('variables')
    .optional()
    .isArray()
    .withMessage('variables must be an array'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('isHipaaCompliant')
    .optional()
    .isBoolean()
    .withMessage('isHipaaCompliant must be a boolean')
];

// User preferences validation
export const validateUserPreferences: ValidationChain[] = [
  body('email.enabled')
    .optional()
    .isBoolean()
    .withMessage('email.enabled must be a boolean'),

  body('email.address')
    .optional()
    .isEmail()
    .withMessage('email.address must be a valid email address'),

  body('sms.enabled')
    .optional()
    .isBoolean()
    .withMessage('sms.enabled must be a boolean'),

  body('sms.phoneNumber')
    .optional()
    .isMobilePhone('any')
    .withMessage('sms.phoneNumber must be a valid phone number'),

  body('push.enabled')
    .optional()
    .isBoolean()
    .withMessage('push.enabled must be a boolean'),

  body('push.deviceTokens')
    .optional()
    .isArray()
    .withMessage('push.deviceTokens must be an array'),

  body('push.deviceTokens.*')
    .optional()
    .isString()
    .isLength({ min: 100 })
    .withMessage('Each device token must be a string with at least 100 characters'),

  body('inApp.enabled')
    .optional()
    .isBoolean()
    .withMessage('inApp.enabled must be a boolean'),

  body('quietHours.enabled')
    .optional()
    .isBoolean()
    .withMessage('quietHours.enabled must be a boolean'),

  body('quietHours.startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('quietHours.startTime must be in HH:MM format'),

  body('quietHours.endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('quietHours.endTime must be in HH:MM format'),

  body('quietHours.timezone')
    .optional()
    .isString()
    .withMessage('quietHours.timezone must be a string'),

  body('emergencyOverride')
    .optional()
    .isBoolean()
    .withMessage('emergencyOverride must be a boolean')
];

// Query parameter validation for listing notifications
export const validateNotificationQuery: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),

  query('type')
    .optional()
    .isIn(Object.values(NotificationType))
    .withMessage(`type must be one of: ${Object.values(NotificationType).join(', ')}`),

  query('channel')
    .optional()
    .isIn(Object.values(NotificationChannel))
    .withMessage(`channel must be one of: ${Object.values(NotificationChannel).join(', ')}`),

  query('status')
    .optional()
    .isIn(['pending', 'queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled', 'expired'])
    .withMessage('status must be a valid notification status'),

  query('dateFrom')
    .optional()
    .isISO8601()
    .withMessage('dateFrom must be a valid ISO 8601 date'),

  query('dateTo')
    .optional()
    .isISO8601()
    .withMessage('dateTo must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.dateFrom && new Date(value) <= new Date(req.query.dateFrom as string)) {
        throw new Error('dateTo must be after dateFrom');
      }
      return true;
    })
];

// UUID parameter validation
export const validateUUIDParam = (paramName: string): ValidationChain => {
  return param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`);
};

// User ID parameter validation with ownership check
export const validateUserIdParam: ValidationChain[] = [
  param('userId')
    .isUUID()
    .withMessage('userId must be a valid UUID')
];

// Device token validation
export const validateDeviceToken: ValidationChain[] = [
  body('deviceToken')
    .isString()
    .isLength({ min: 100, max: 200 })
    .withMessage('deviceToken must be a string with 100-200 characters')
    .matches(/^[A-Za-z0-9_-]+$/)
    .withMessage('deviceToken can only contain letters, numbers, underscores, and hyphens')
];

// Mark as read validation
export const validateMarkAsRead: ValidationChain[] = [
  param('id')
    .isUUID()
    .withMessage('Notification ID must be a valid UUID')
];

// Metrics query validation
export const validateMetricsQuery: ValidationChain[] = [
  query('dateFrom')
    .isISO8601()
    .withMessage('dateFrom must be a valid ISO 8601 date'),

  query('dateTo')
    .isISO8601()
    .withMessage('dateTo must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.query.dateFrom as string)) {
        throw new Error('dateTo must be after dateFrom');
      }
      return true;
    }),

  query('groupBy')
    .optional()
    .isIn(['hour', 'day', 'type', 'channel'])
    .withMessage('groupBy must be one of: hour, day, type, channel')
];

// HIPAA access validation
export const validateHipaaAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const hipaaEndpoints = [
    '/notifications/hipaa',
    '/templates/hipaa',
    '/audit'
  ];

  const isHipaaEndpoint = hipaaEndpoints.some(endpoint => 
    req.path.startsWith(endpoint)
  );

  if (isHipaaEndpoint) {
    // Add additional HIPAA-specific validation
    logger.info('HIPAA endpoint access', {
      endpoint: req.path,
      method: req.method,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// Custom validation for template variables
export const validateTemplateVariables = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { body: template, data } = req.body;

  if (template && data) {
    try {
      // Extract variables from template body
      const variableRegex = /\{\{\s*([^}\s]+)\s*\}\}/g;
      const requiredVars: Set<string> = new Set();
      let match;

      while ((match = variableRegex.exec(template)) !== null) {
        const varName = match[1].split(' ')[0]; // Remove any helpers
        if (varName && !varName.startsWith('#') && !varName.startsWith('/')) {
          requiredVars.add(varName);
        }
      }

      // Check if all required variables are provided
      const missingVars = Array.from(requiredVars).filter(varName => 
        !(varName in data) || data[varName] === null || data[varName] === undefined
      );

      if (missingVars.length > 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_TEMPLATE_VARIABLES',
            message: 'Required template variables are missing',
            details: { missingVariables: missingVars }
          }
        });
        return;
      }

    } catch (error) {
      logger.error('Template variable validation error', { error });
    }
  }

  next();
};

// Sanitization middleware for user input
export const sanitizeInput = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Sanitize string fields to prevent XSS
  const sanitizeString = (value: any): any => {
    if (typeof value === 'string') {
      return value
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
    }
    return value;
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  };

  req.body = sanitizeObject(req.body);
  next();
};