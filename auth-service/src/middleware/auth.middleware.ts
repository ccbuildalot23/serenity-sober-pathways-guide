import { Request, Response, NextFunction } from 'express';
import { jwtService, JWTPayload } from '../services/jwt.service';
import { rbacService, PermissionCheck } from '../services/rbac.service';
import { logger, auditLogger } from '../config/logger';
import { ApiError } from '../types/api';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      sessionId?: string;
      userId?: string;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
        },
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || 'unknown',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate JWT token
    const payload = await jwtService.validateAccessToken(token);
    
    if (!payload) {
      auditLogger.securityEvent('invalid_access_token', 'medium', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        token: token.substring(0, 10) + '...',
      });

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Access token is invalid or expired',
        },
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || 'unknown',
      });
    }

    // Attach user data to request
    req.user = payload;
    req.userId = payload.userId;
    req.sessionId = payload.sessionId;

    // Log access for audit
    auditLogger.accessLog(req.path, req.method.toLowerCase() as any, payload.userId, true, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      sessionId: payload.sessionId,
    });

    next();
  } catch (error) {
    logger.error('Authentication middleware error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: req.ip,
      endpoint: req.path,
    });

    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed',
      },
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || 'unknown',
    });
  }
};

export const authorize = (permission: string | PermissionCheck | PermissionCheck[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.userId) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          requestId: req.get('X-Request-ID') || 'unknown',
        });
      }

      const userId = req.userId;
      let hasPermission = false;

      if (typeof permission === 'string') {
        // Simple permission string like "users:read"
        const [resource, action] = permission.split(':');
        hasPermission = await rbacService.hasPermission(userId, {
          resource,
          action: action as any,
        });
      } else if (Array.isArray(permission)) {
        // Array of permission checks - user needs at least one
        for (const perm of permission) {
          const allowed = await rbacService.hasPermission(userId, perm);
          if (allowed) {
            hasPermission = true;
            break;
          }
        }
      } else {
        // Single permission check object
        hasPermission = await rbacService.hasPermission(userId, permission);
      }

      if (!hasPermission) {
        auditLogger.accessLog(
          req.path, 
          req.method.toLowerCase() as any, 
          userId, 
          false,
          {
            reason: 'insufficient_permissions',
            requiredPermission: permission,
            userRoles: req.user.roles,
            ip: req.ip,
          }
        );

        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to perform this action',
          },
          timestamp: new Date().toISOString(),
          requestId: req.get('X-Request-ID') || 'unknown',
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.userId,
        permission,
        ip: req.ip,
        endpoint: req.path,
      });

      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization check failed',
        },
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || 'unknown',
      });
    }
  };
};

// Middleware to require specific roles
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || 'unknown',
      });
    }

    const userRoles = req.user.roles;
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    
    if (!hasRole) {
      auditLogger.accessLog(req.path, req.method.toLowerCase() as any, req.user.userId, false, {
        reason: 'insufficient_role',
        requiredRoles,
        userRoles,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: 'Required role not found',
        },
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || 'unknown',
      });
    }

    next();
  };
};

// Optional authentication - sets user if token is valid but doesn't require it
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token provided, continue without authentication
    }

    const token = authHeader.substring(7);
    const payload = await jwtService.validateAccessToken(token);
    
    if (payload) {
      req.user = payload;
      req.userId = payload.userId;
      req.sessionId = payload.sessionId;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token validation fails
    next();
  }
};

// Middleware to check if user owns resource
export const requireOwnership = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || 'unknown',
      });
    }

    const resourceUserId = req.params[userIdParam] || req.body[userIdParam];
    const currentUserId = req.user.userId;

    // Admin users can access any resource
    if (req.user.roles.includes('admin')) {
      return next();
    }

    if (resourceUserId !== currentUserId) {
      auditLogger.accessLog(req.path, req.method.toLowerCase() as any, currentUserId, false, {
        reason: 'resource_ownership_violation',
        resourceUserId,
        currentUserId,
        ip: req.ip,
      });

      return res.status(403).json({
        success: false,
        error: {
          code: 'RESOURCE_ACCESS_DENIED',
          message: 'You can only access your own resources',
        },
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || 'unknown',
      });
    }

    next();
  };
};

// Middleware for MFA verification
export const requireMFA = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
      },
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || 'unknown',
    });
  }

  // Check if this session has completed MFA
  const mfaCompleted = req.get('X-MFA-Completed');
  
  if (!mfaCompleted) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'MFA_REQUIRED',
        message: 'Multi-factor authentication is required',
      },
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || 'unknown',
    });
  }

  next();
};

// Middleware to validate API key for service-to-service communication
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.get('X-API-Key');
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    auditLogger.securityEvent('invalid_api_key', 'high', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      providedKey: apiKey?.substring(0, 8) + '...' || 'none',
    });

    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Valid API key is required',
      },
      timestamp: new Date().toISOString(),
      requestId: req.get('X-Request-ID') || 'unknown',
    });
  }

  next();
};