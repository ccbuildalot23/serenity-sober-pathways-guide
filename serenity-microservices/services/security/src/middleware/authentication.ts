import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@/config/config';
import { encryptionService } from '@/utils/encryption';
import { auditLogger, errorLogger } from '@/utils/logger';
import { db } from '@/database/connection';
import { AuthenticatedRequest } from '@/types';

// Extend Request interface
declare global {
  namespace Express {
    interface Request extends AuthenticatedRequest {
      requestId?: string;
      apiKey?: {
        id: string;
        hash: string;
        name: string;
        permissions: string[];
      };
      skipRateLimit?: boolean;
    }
  }
}

// JWT token verification middleware
export const verifyJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token required',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, config.security.jwtSecret) as any;
      
      // Validate token structure
      if (!decoded.user_id || !decoded.username || !decoded.role) {
        throw new Error('Invalid token structure');
      }

      // Check if token is blacklisted (in production, use Redis)
      const isBlacklisted = await checkTokenBlacklist(token);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }

      // Attach user info to request
      req.user = {
        id: decoded.user_id,
        username: decoded.username,
        role: decoded.role,
        permissions: decoded.permissions || [],
      };

      // Log successful authentication
      auditLogger.authentication(decoded.user_id, true, {
        endpoint: req.path,
        method: req.method,
        source_ip: req.ip,
        user_agent: req.get('User-Agent'),
        request_id: req.requestId,
      });

      next();
    } catch (jwtError) {
      const errorMessage = jwtError instanceof Error ? jwtError.message : 'Token verification failed';
      
      auditLogger.authentication('unknown', false, {
        failure_reason: errorMessage,
        endpoint: req.path,
        method: req.method,
        source_ip: req.ip,
        user_agent: req.get('User-Agent'),
        request_id: req.requestId,
      });

      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  } catch (error) {
    errorLogger.application(error as Error, {
      component: 'authentication',
      operation: 'verifyJWT',
      request_id: req.requestId,
    });

    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication service error',
      },
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
    });
  }
};

// API Key authentication middleware
export const verifyApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      res.status(401).json({
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key required',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
      return;
    }

    // Validate API key format
    if (!/^[a-f0-9]{64}$/.test(apiKey)) {
      res.status(401).json({
        error: {
          code: 'INVALID_API_KEY_FORMAT',
          message: 'Invalid API key format',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
      return;
    }

    // Look up API key in database
    const result = await db.query(`
      SELECT ak.id, ak.name, ak.key_hash, ak.permissions, ak.status, ak.expires_at
      FROM api_keys ak
      WHERE ak.key_hash = $1 AND ak.status = 'ACTIVE'
    `, [encryptionService.hash(apiKey)]);

    if (result.rows.length === 0) {
      auditLogger.authentication('api-key', false, {
        failure_reason: 'Invalid API key',
        endpoint: req.path,
        method: req.method,
        source_ip: req.ip,
        api_key_partial: apiKey.substring(0, 8) + '...',
        request_id: req.requestId,
      });

      res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
      return;
    }

    const apiKeyRecord = result.rows[0];

    // Check if API key is expired
    if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
      auditLogger.authentication('api-key', false, {
        failure_reason: 'Expired API key',
        api_key_id: apiKeyRecord.id,
        endpoint: req.path,
        method: req.method,
        source_ip: req.ip,
        request_id: req.requestId,
      });

      res.status(401).json({
        error: {
          code: 'EXPIRED_API_KEY',
          message: 'API key has expired',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
      return;
    }

    // Verify the API key hash
    if (!encryptionService.verifyApiKey(apiKey, apiKeyRecord.key_hash)) {
      auditLogger.authentication('api-key', false, {
        failure_reason: 'API key hash mismatch',
        api_key_id: apiKeyRecord.id,
        endpoint: req.path,
        method: req.method,
        source_ip: req.ip,
        request_id: req.requestId,
      });

      res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
      return;
    }

    // Attach API key info to request
    req.apiKey = {
      id: apiKeyRecord.id,
      hash: apiKeyRecord.key_hash,
      name: apiKeyRecord.name,
      permissions: apiKeyRecord.permissions || [],
    };

    // Log successful API key authentication
    auditLogger.authentication('api-key', true, {
      api_key_id: apiKeyRecord.id,
      api_key_name: apiKeyRecord.name,
      endpoint: req.path,
      method: req.method,
      source_ip: req.ip,
      request_id: req.requestId,
    });

    // Update last used timestamp
    await db.query(`
      UPDATE api_keys 
      SET last_used_at = NOW(), usage_count = usage_count + 1
      WHERE id = $1
    `, [apiKeyRecord.id]);

    next();
  } catch (error) {
    errorLogger.application(error as Error, {
      component: 'authentication',
      operation: 'verifyApiKey',
      request_id: req.requestId,
    });

    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication service error',
      },
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
    });
  }
};

// Combined authentication middleware (JWT or API Key)
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Use JWT authentication
    await verifyJWT(req, res, next);
  } else if (apiKey) {
    // Use API Key authentication
    await verifyApiKey(req, res, next);
  } else {
    res.status(401).json({
      error: {
        code: 'MISSING_CREDENTIALS',
        message: 'Authentication required. Provide either Bearer token or API key.',
      },
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
    });
  }
};

// Role-based authorization middleware
export const authorize = (requiredRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const userRole = req.user?.role;
      const apiKeyPermissions = req.apiKey?.permissions || [];

      // Check user role
      if (userRole && requiredRoles.includes(userRole)) {
        next();
        return;
      }

      // Check API key permissions
      const hasPermission = requiredRoles.some(role => 
        apiKeyPermissions.includes(role) || apiKeyPermissions.includes('*')
      );

      if (hasPermission) {
        next();
        return;
      }

      // Log authorization failure
      auditLogger.authorization(
        req.user?.id || 'api-key',
        req.path,
        req.method,
        {
          required_roles: requiredRoles,
          user_role: userRole,
          api_key_permissions: apiKeyPermissions,
          endpoint: req.path,
          method: req.method,
          request_id: req.requestId,
        }
      );

      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions to access this resource',
          required_roles: requiredRoles,
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'authentication',
        operation: 'authorize',
        request_id: req.requestId,
      });

      res.status(500).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Authorization service error',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  };
};

// Optional authentication (allows both authenticated and unauthenticated requests)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];

  if (authHeader || apiKey) {
    // If credentials provided, validate them
    await authenticate(req, res, next);
  } else {
    // No credentials provided, continue without authentication
    next();
  }
};

// Helper function to check token blacklist
async function checkTokenBlacklist(token: string): Promise<boolean> {
  try {
    // In production, this would typically check Redis or a database table
    const result = await db.query(
      'SELECT 1 FROM blacklisted_tokens WHERE token_hash = $1',
      [encryptionService.hash(token)]
    );
    return result.rows.length > 0;
  } catch (error) {
    errorLogger.application(error as Error, {
      component: 'authentication',
      operation: 'checkTokenBlacklist',
    });
    return false; // Fail open for availability
  }
}

// Token blacklist management
export const blacklistToken = async (token: string, reason: string, expiresAt?: Date): Promise<void> => {
  try {
    const tokenHash = encryptionService.hash(token);
    await db.query(`
      INSERT INTO blacklisted_tokens (token_hash, reason, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (token_hash) DO NOTHING
    `, [tokenHash, reason, expiresAt || null]);

    auditLogger.securityEvent('TOKEN_BLACKLISTED', 'MEDIUM', {
      reason,
      expires_at: expiresAt?.toISOString(),
    });
  } catch (error) {
    errorLogger.application(error as Error, {
      component: 'authentication',
      operation: 'blacklistToken',
    });
  }
};

// Service-to-service authentication
export const serviceAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const serviceToken = req.headers['x-service-token'] as string;
    const serviceName = req.headers['x-service-name'] as string;

    if (!serviceToken || !serviceName) {
      res.status(401).json({
        error: {
          code: 'MISSING_SERVICE_CREDENTIALS',
          message: 'Service authentication required',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
      return;
    }

    // Verify service token (in production, use proper service registry)
    const expectedToken = encryptionService.hash(`${serviceName}:${config.security.apiKeySecret}`);
    const providedTokenHash = encryptionService.hash(serviceToken);

    if (expectedToken !== providedTokenHash) {
      auditLogger.authentication('service', false, {
        failure_reason: 'Invalid service token',
        service_name: serviceName,
        endpoint: req.path,
        method: req.method,
        source_ip: req.ip,
        request_id: req.requestId,
      });

      res.status(401).json({
        error: {
          code: 'INVALID_SERVICE_TOKEN',
          message: 'Invalid service credentials',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
      return;
    }

    // Attach service info to request
    req.user = {
      id: `service:${serviceName}`,
      username: serviceName,
      role: 'service',
      permissions: ['service:*'],
    };

    auditLogger.authentication('service', true, {
      service_name: serviceName,
      endpoint: req.path,
      method: req.method,
      source_ip: req.ip,
      request_id: req.requestId,
    });

    next();
  } catch (error) {
    errorLogger.application(error as Error, {
      component: 'authentication',
      operation: 'serviceAuth',
      request_id: req.requestId,
    });

    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Service authentication error',
      },
      timestamp: new Date().toISOString(),
      request_id: req.requestId,
    });
  }
};