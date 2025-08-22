import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { logger, securityLogger } from '@/utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export interface ServiceAuthRequest extends Request {
  service?: {
    name: string;
    permissions: string[];
  };
}

// JWT Authentication middleware
export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      securityLogger.warn('Authentication attempt without token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path
      });
      
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Access token required'
        }
      });
      return;
    }

    jwt.verify(token, config.jwt.secret, (err: any, decoded: any) => {
      if (err) {
        securityLogger.warn('Invalid JWT token', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          error: err.message
        });

        let errorMessage = 'Invalid token';
        if (err.name === 'TokenExpiredError') {
          errorMessage = 'Token has expired';
        } else if (err.name === 'JsonWebTokenError') {
          errorMessage = 'Invalid token format';
        }

        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: errorMessage
          }
        });
        return;
      }

      // Validate required fields in token
      if (!decoded.id || !decoded.email) {
        securityLogger.warn('JWT token missing required fields', {
          ip: req.ip,
          decoded: { ...decoded, id: '[REDACTED]', email: '[REDACTED]' }
        });

        res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN_PAYLOAD',
            message: 'Token payload invalid'
          }
        });
        return;
      }

      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
        permissions: decoded.permissions || []
      };

      logger.debug('User authenticated successfully', {
        userId: req.user.id,
        role: req.user.role,
        endpoint: req.path
      });

      next();
    });

  } catch (error) {
    logger.error('Authentication middleware error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication service error'
      }
    });
  }
};

// Service-to-service authentication middleware
export const authenticateService = (
  req: ServiceAuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const serviceToken = req.headers['x-service-token'] as string;
    const serviceName = req.headers['x-service-name'] as string;

    if (!serviceToken || !serviceName) {
      securityLogger.warn('Service authentication attempt without credentials', {
        ip: req.ip,
        serviceName,
        endpoint: req.path
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'SERVICE_UNAUTHORIZED',
          message: 'Service credentials required'
        }
      });
      return;
    }

    // Verify service token (in production, this would be more sophisticated)
    if (!isValidServiceToken(serviceName, serviceToken)) {
      securityLogger.warn('Invalid service credentials', {
        ip: req.ip,
        serviceName,
        endpoint: req.path
      });

      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_SERVICE_CREDENTIALS',
          message: 'Invalid service credentials'
        }
      });
      return;
    }

    req.service = {
      name: serviceName,
      permissions: getServicePermissions(serviceName)
    };

    logger.debug('Service authenticated successfully', {
      serviceName,
      endpoint: req.path
    });

    next();

  } catch (error) {
    logger.error('Service authentication middleware error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVICE_AUTHENTICATION_ERROR',
        message: 'Service authentication error'
      }
    });
  }
};

// Optional authentication middleware (allows both authenticated and anonymous access)
export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token provided, continue without authentication
    next();
    return;
  }

  try {
    jwt.verify(token, config.jwt.secret, (err: any, decoded: any) => {
      if (!err && decoded?.id && decoded?.email) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role || 'user',
          permissions: decoded.permissions || []
        };
      }
      // Continue regardless of token validity for optional auth
      next();
    });
  } catch (error) {
    // Continue without authentication on error
    next();
  }
};

// Authorization middleware factory
export const requirePermissions = (requiredPermissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission) || userPermissions.includes('*')
    );

    if (!hasPermissions) {
      securityLogger.warn('Insufficient permissions', {
        userId: req.user.id,
        requiredPermissions,
        userPermissions,
        endpoint: req.path
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions'
        }
      });
      return;
    }

    next();
  };
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      securityLogger.warn('Insufficient role privileges', {
        userId: req.user.id,
        userRole: req.user.role,
        allowedRoles,
        endpoint: req.path
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `Role '${req.user.role}' not authorized for this action`
        }
      });
      return;
    }

    next();
  };
};

// HIPAA access control middleware
export const requireHipaaAuthorization = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required'
      }
    });
    return;
  }

  const hipaaPermissions = [
    'notifications:hipaa:read',
    'notifications:hipaa:write',
    'notifications:phi:access'
  ];

  const hasHipaaAccess = hipaaPermissions.some(permission =>
    req.user!.permissions.includes(permission) || req.user!.permissions.includes('*')
  );

  if (!hasHipaaAccess) {
    securityLogger.warn('HIPAA access denied', {
      userId: req.user.id,
      userRole: req.user.role,
      userPermissions: req.user.permissions,
      endpoint: req.path
    });

    res.status(403).json({
      success: false,
      error: {
        code: 'HIPAA_ACCESS_DENIED',
        message: 'HIPAA authorization required'
      }
    });
    return;
  }

  // Log HIPAA access for audit trail
  logger.info('HIPAA protected resource accessed', {
    userId: req.user.id,
    userRole: req.user.role,
    endpoint: req.path,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  next();
};

// Helper functions
function isValidServiceToken(serviceName: string, token: string): boolean {
  // In production, this would verify against a service registry or database
  const validServices: Record<string, string> = {
    'serenity-crisis-service': process.env.CRISIS_SERVICE_TOKEN || 'crisis-token-123',
    'serenity-identity-service': process.env.IDENTITY_SERVICE_TOKEN || 'identity-token-123',
    'serenity-clinical-service': process.env.CLINICAL_SERVICE_TOKEN || 'clinical-token-123',
    'serenity-gateway': process.env.GATEWAY_SERVICE_TOKEN || 'gateway-token-123'
  };

  return validServices[serviceName] === token;
}

function getServicePermissions(serviceName: string): string[] {
  const servicePermissions: Record<string, string[]> = {
    'serenity-crisis-service': [
      'notifications:send',
      'notifications:crisis:send',
      'notifications:priority:high'
    ],
    'serenity-identity-service': [
      'notifications:user:preferences',
      'notifications:send'
    ],
    'serenity-clinical-service': [
      'notifications:send',
      'notifications:hipaa:send',
      'notifications:appointment:send'
    ],
    'serenity-gateway': [
      'notifications:*'
    ]
  };

  return servicePermissions[serviceName] || [];
}

// User ownership validation middleware
export const requireUserOwnership = (userIdParam: string = 'userId') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    const targetUserId = req.params[userIdParam] || req.body[userIdParam] || req.query[userIdParam];
    
    // Admin users can access any user's data
    if (req.user.role === 'admin' || req.user.permissions.includes('*')) {
      next();
      return;
    }

    // Users can only access their own data
    if (req.user.id !== targetUserId) {
      securityLogger.warn('Unauthorized user data access attempt', {
        userId: req.user.id,
        targetUserId,
        endpoint: req.path
      });

      res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own data'
        }
      });
      return;
    }

    next();
  };
};