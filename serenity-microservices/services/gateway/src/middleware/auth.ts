import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger, securityLogger } from '@utils/logger';
import { redisManager } from '@utils/redis';
import { getClientIp, getUserAgent } from '@utils/helpers';
import { JWTPayload, User, ApiKey, UserRole } from '@types/index';

const logger = createLogger('AuthMiddleware');

interface AuthConfig {
  jwtSecret: string;
  jwtRefreshSecret: string;
  apiKeySalt: string;
  apiKeyHeader: string;
}

const authConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  apiKeySalt: process.env.API_KEY_SALT || 'fallback-salt',
  apiKeyHeader: process.env.API_KEY_HEADER || 'X-API-Key'
};

/**
 * JWT Authentication Middleware
 */
export const jwtAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token is blacklisted
    const isBlacklisted = await redisManager.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      securityLogger.warn('Blacklisted token used', {
        request_id: req.request_id,
        ip: getClientIp(req),
        user_agent: getUserAgent(req),
        token_prefix: token.substring(0, 10)
      });

      return res.status(401).json({
        error: {
          code: 'TOKEN_BLACKLISTED',
          message: 'Token has been revoked',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, authConfig.jwtSecret) as JWTPayload;

    // Check if user session exists in Redis
    const sessionKey = `session:${decoded.sub}`;
    const sessionData = await redisManager.getJSON<User>(sessionKey);

    if (!sessionData) {
      return res.status(401).json({
        error: {
          code: 'SESSION_EXPIRED',
          message: 'Session has expired, please login again',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Check if user is active
    if (!sessionData.is_active) {
      securityLogger.warn('Inactive user attempted access', {
        request_id: req.request_id,
        user_id: decoded.sub,
        ip: getClientIp(req)
      });

      return res.status(403).json({
        error: {
          code: 'USER_INACTIVE',
          message: 'User account is inactive',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Extend session if needed (refresh session TTL)
    await redisManager.expire(sessionKey, 15 * 60); // 15 minutes

    // Attach user to request
    req.user = sessionData;

    // Log successful authentication
    securityLogger.info('Successful JWT authentication', {
      request_id: req.request_id,
      user_id: decoded.sub,
      role: decoded.role,
      ip: getClientIp(req),
      method: req.method,
      path: req.path
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      securityLogger.warn('Invalid JWT token', {
        request_id: req.request_id,
        error: error.message,
        ip: getClientIp(req),
        user_agent: getUserAgent(req)
      });

      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    logger.error('JWT authentication error:', error);
    return res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication service error',
        timestamp: new Date().toISOString(),
        request_id: req.request_id
      }
    });
  }
};

/**
 * API Key Authentication Middleware
 */
export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers[authConfig.apiKeyHeader.toLowerCase()] as string;
    
    if (!apiKey) {
      return res.status(401).json({
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Get API key data from Redis
    const apiKeyData = await redisManager.getJSON<ApiKey>(`api_key:${apiKey}`);
    
    if (!apiKeyData) {
      securityLogger.warn('Invalid API key used', {
        request_id: req.request_id,
        api_key_prefix: apiKey.substring(0, 10),
        ip: getClientIp(req),
        user_agent: getUserAgent(req)
      });

      return res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Check if API key is active
    if (!apiKeyData.is_active) {
      securityLogger.warn('Inactive API key used', {
        request_id: req.request_id,
        api_key_id: apiKeyData.id,
        ip: getClientIp(req)
      });

      return res.status(403).json({
        error: {
          code: 'API_KEY_INACTIVE',
          message: 'API key is inactive',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Check if API key has expired
    if (apiKeyData.expires_at && new Date() > new Date(apiKeyData.expires_at)) {
      securityLogger.warn('Expired API key used', {
        request_id: req.request_id,
        api_key_id: apiKeyData.id,
        expired_at: apiKeyData.expires_at,
        ip: getClientIp(req)
      });

      return res.status(401).json({
        error: {
          code: 'API_KEY_EXPIRED',
          message: 'API key has expired',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    // Update last used timestamp and usage count
    apiKeyData.last_used_at = new Date();
    apiKeyData.usage_count++;
    await redisManager.setJSON(`api_key:${apiKey}`, apiKeyData);

    // Attach API key to request
    req.api_key = apiKeyData;

    // Log successful API key authentication
    securityLogger.info('Successful API key authentication', {
      request_id: req.request_id,
      api_key_id: apiKeyData.id,
      user_id: apiKeyData.user_id,
      ip: getClientIp(req),
      method: req.method,
      path: req.path
    });

    next();
  } catch (error) {
    logger.error('API key authentication error:', error);
    return res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication service error',
        timestamp: new Date().toISOString(),
        request_id: req.request_id
      }
    });
  }
};

/**
 * Optional Authentication Middleware (allows both JWT and API key)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers[authConfig.apiKeyHeader.toLowerCase()] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return jwtAuth(req, res, next);
  } else if (apiKey) {
    return apiKeyAuth(req, res, next);
  } else {
    // No authentication provided, continue without user context
    next();
  }
};

/**
 * Role-based Authorization Middleware
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user && !req.api_key) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    let userRole: UserRole;
    let userId: string;

    if (req.user) {
      userRole = req.user.role;
      userId = req.user.id;
    } else if (req.api_key && req.api_key.user_id) {
      // For API keys, we would need to fetch user data
      // For now, we'll assume API keys don't have role restrictions
      return next();
    } else {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    if (!allowedRoles.includes(userRole)) {
      securityLogger.warn('Access denied - insufficient role', {
        request_id: req.request_id,
        user_id: userId,
        user_role: userRole,
        required_roles: allowedRoles,
        ip: getClientIp(req),
        method: req.method,
        path: req.path
      });

      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    next();
  };
};

/**
 * Permission-based Authorization Middleware
 */
export const requirePermission = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user && !req.api_key) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    let userPermissions: string[];
    let userId: string;

    if (req.user) {
      userPermissions = req.user.permissions;
      userId = req.user.id;
    } else if (req.api_key) {
      userPermissions = req.api_key.permissions;
      userId = req.api_key.user_id || req.api_key.id;
    } else {
      userPermissions = [];
      userId = 'unknown';
    }

    const hasPermission = requiredPermissions.every(permission => 
      userPermissions.includes(permission) || userPermissions.includes('*')
    );

    if (!hasPermission) {
      securityLogger.warn('Access denied - insufficient permissions', {
        request_id: req.request_id,
        user_id: userId,
        user_permissions: userPermissions,
        required_permissions: requiredPermissions,
        ip: getClientIp(req),
        method: req.method,
        path: req.path
      });

      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    next();
  };
};

/**
 * Admin-only Authorization Middleware
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Provider-only Authorization Middleware
 */
export const requireProvider = requireRole(['provider', 'admin']);

/**
 * Patient or Provider Authorization Middleware
 */
export const requirePatientOrProvider = requireRole(['patient', 'provider', 'admin']);

/**
 * Self-access Authorization Middleware (user can only access their own data)
 */
export const requireSelfAccess = (userIdParam: string = 'userId') => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    const requestedUserId = req.params[userIdParam];
    const currentUserId = req.user.id;

    // Admin can access any user's data
    if (req.user.role === 'admin') {
      return next();
    }

    // Provider can access their patients' data (this would need additional logic)
    if (req.user.role === 'provider') {
      // TODO: Implement provider-patient relationship check
      return next();
    }

    // User can only access their own data
    if (requestedUserId !== currentUserId) {
      securityLogger.warn('Attempted access to other user data', {
        request_id: req.request_id,
        user_id: currentUserId,
        requested_user_id: requestedUserId,
        ip: getClientIp(req),
        method: req.method,
        path: req.path
      });

      return res.status(403).json({
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own data',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }

    next();
  };
};

/**
 * Revoke JWT Token (add to blacklist)
 */
export const revokeToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redisManager.set(`blacklist:${token}`, '1', ttl);
      }
    }
  } catch (error) {
    logger.error('Error revoking token:', error);
  }
};

/**
 * Generate JWT Token
 */
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string => {
  return jwt.sign(
    {
      ...payload,
      iss: 'serenity-api-gateway',
      aud: 'serenity-services'
    },
    authConfig.jwtSecret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    }
  );
};

/**
 * Generate Refresh Token
 */
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    authConfig.jwtRefreshSecret,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    }
  );
};