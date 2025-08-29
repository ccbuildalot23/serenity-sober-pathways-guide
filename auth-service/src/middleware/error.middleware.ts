import { Request, Response, NextFunction } from 'express';
import { logger, auditLogger } from '../config/logger';
import { ApiError, ApiResponse } from '../types/api';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;
  public details?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: Record<string, any>
  ) {
    super(message);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Custom error classes for different scenarios
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', details?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', details?: Record<string, any>) {
    super(message, 404, 'NOT_FOUND', true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: Record<string, any>) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: Record<string, any>) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, details);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable', details?: Record<string, any>) {
    super(message, 503, 'SERVICE_UNAVAILABLE', true, details);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.get('X-Request-ID') || generateRequestId();
  const userId = req.userId;
  const sessionId = req.sessionId;

  // Log error details
  logger.error('Error occurred', {
    requestId,
    userId,
    sessionId,
    ip: req.ip,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  });

  // Audit security-related errors
  if (isSecurityError(err)) {
    auditLogger.securityEvent('security_error', 'high', {
      requestId,
      userId,
      sessionId,
      ip: req.ip,
      method: req.method,
      url: req.url,
      error: {
        name: err.name,
        message: err.message,
        code: err instanceof AppError ? err.code : 'UNKNOWN',
      },
    });
  }

  // Handle different error types
  if (err instanceof AppError) {
    handleAppError(err, req, res, requestId);
  } else if (err.name === 'ValidationError') {
    handleValidationError(err, req, res, requestId);
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    handleJWTError(err, req, res, requestId);
  } else if (err.name === 'SequelizeError' || err.name === 'QueryFailedError') {
    handleDatabaseError(err, req, res, requestId);
  } else {
    handleGenericError(err, req, res, requestId);
  }
};

// Handle AppError instances
const handleAppError = (err: AppError, req: Request, res: Response, requestId: string): void => {
  const response: ApiResponse = {
    success: false,
    error: {
      code: err.code,
      message: err.message,
      details: err.details,
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  // Don't expose internal details in production
  if (process.env.NODE_ENV === 'production' && err.statusCode >= 500) {
    response.error!.message = 'Internal server error';
    delete response.error!.details;
  }

  res.status(err.statusCode).json(response);
};

// Handle validation errors
const handleValidationError = (err: Error, req: Request, res: Response, requestId: string): void => {
  logger.warn('Validation error', {
    requestId,
    error: err.message,
    body: req.body,
  });

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { validationError: err.message },
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  res.status(400).json(response);
};

// Handle JWT errors
const handleJWTError = (err: Error, req: Request, res: Response, requestId: string): void => {
  logger.warn('JWT error', {
    requestId,
    error: err.message,
    token: req.get('Authorization')?.substring(0, 20) + '...',
  });

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INVALID_TOKEN',
      message: 'Invalid or expired token',
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  res.status(401).json(response);
};

// Handle database errors
const handleDatabaseError = (err: Error, req: Request, res: Response, requestId: string): void => {
  logger.error('Database error', {
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  });

  // Check for specific database constraint violations
  let statusCode = 500;
  let code = 'DATABASE_ERROR';
  let message = 'Database operation failed';

  if (err.message.includes('duplicate key') || err.message.includes('UNIQUE constraint')) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    message = 'Resource already exists';
  } else if (err.message.includes('foreign key constraint') || err.message.includes('FOREIGN KEY constraint')) {
    statusCode = 400;
    code = 'INVALID_REFERENCE';
    message = 'Invalid reference to related resource';
  } else if (err.message.includes('not found') || err.message.includes('NO DATA')) {
    statusCode = 404;
    code = 'NOT_FOUND';
    message = 'Resource not found';
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message: process.env.NODE_ENV === 'production' ? message : err.message,
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  res.status(statusCode).json(response);
};

// Handle generic errors
const handleGenericError = (err: Error, req: Request, res: Response, requestId: string): void => {
  logger.error('Unhandled error', {
    requestId,
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  });

  const response: ApiResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' 
        ? 'An unexpected error occurred' 
        : err.message,
    },
    timestamp: new Date().toISOString(),
    requestId,
  };

  res.status(500).json(response);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.method} ${req.url} not found`);
  next(error);
};

// Utility functions
const generateRequestId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

const isSecurityError = (err: Error): boolean => {
  const securityErrorTypes = [
    'AuthenticationError',
    'AuthorizationError',
    'JsonWebTokenError',
    'TokenExpiredError',
  ];

  const securityKeywords = [
    'unauthorized',
    'forbidden',
    'invalid token',
    'expired token',
    'authentication',
    'authorization',
    'permission',
    'access denied',
  ];

  return securityErrorTypes.includes(err.name) ||
         securityKeywords.some(keyword => 
           err.message.toLowerCase().includes(keyword)
         );
};

// Global error handlers for uncaught exceptions
export const setupGlobalErrorHandlers = (): void => {
  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught Exception:', {
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
      },
    });

    auditLogger.securityEvent('uncaught_exception', 'critical', {
      error: {
        name: err.name,
        message: err.message,
      },
    });

    // Allow some time for logging before exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });

  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at:', {
      promise,
      reason: reason instanceof Error ? {
        name: reason.name,
        message: reason.message,
        stack: reason.stack,
      } : reason,
    });

    auditLogger.securityEvent('unhandled_rejection', 'high', {
      reason: reason instanceof Error ? reason.message : String(reason),
    });
  });
};

// Request timeout handler
export const requestTimeout = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn('Request timeout', {
          method: req.method,
          url: req.url,
          timeout,
          ip: req.ip,
        });

        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout',
          },
          timestamp: new Date().toISOString(),
          requestId: req.get('X-Request-ID') || 'unknown',
        });
      }
    }, timeout);

    // Clear timeout when response is finished
    res.on('finish', () => {
      clearTimeout(timer);
    });

    next();
  };
};