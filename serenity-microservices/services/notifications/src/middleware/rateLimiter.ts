import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { config } from '@/config';
import { logger, securityLogger } from '@/utils/logger';
import { AuthenticatedRequest } from './auth';

// Redis client for distributed rate limiting
const redis = new Redis(config.redis.url);

// Base rate limiter configuration
const createBaseLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip),
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    handler: (req: Request, res: Response) => {
      securityLogger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        method: req.method,
        userId: (req as AuthenticatedRequest).user?.id
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: options.message
        },
        meta: {
          retryAfter: Math.round(options.windowMs / 1000),
          windowMs: options.windowMs,
          maxRequests: options.max
        }
      });
    }
  });
};

// General API rate limiter (applied to all routes)
export const generalLimiter = createBaseLimiter({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.maxRequests, // 100 requests per window
  message: 'Too many requests, please try again later'
});

// Strict rate limiter for sensitive operations
export const strictLimiter = createBaseLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  message: 'Too many requests for this operation, please wait'
});

// Rate limiter for sending notifications
export const notificationSendLimiter = createBaseLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 notifications per minute per user
  message: 'Notification sending rate limit exceeded',
  keyGenerator: (req: AuthenticatedRequest) => {
    return (req.user?.id || req.ip) + ':send';
  }
});

// Rate limiter for bulk operations
export const bulkOperationLimiter = createBaseLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // 3 bulk operations per 5 minutes
  message: 'Bulk operation rate limit exceeded',
  keyGenerator: (req: AuthenticatedRequest) => {
    return (req.user?.id || req.ip) + ':bulk';
  }
});

// Rate limiter for user preferences updates
export const preferencesUpdateLimiter = createBaseLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 preference updates per minute
  message: 'Too many preference updates, please wait',
  keyGenerator: (req: AuthenticatedRequest) => {
    return (req.user?.id || req.ip) + ':preferences';
  }
});

// Advanced Redis-based rate limiter for more complex scenarios
export class AdvancedRateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = redis;
  }

  // Sliding window rate limiter
  async slidingWindowLimiter(
    key: string,
    windowSizeMs: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const now = Date.now();
      const windowStart = now - windowSizeMs;

      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove old entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(windowSizeMs / 1000));

      const results = await pipeline.exec();
      
      if (!results) {
        throw new Error('Redis pipeline execution failed');
      }

      const currentCount = (results[1]?.[1] as number) || 0;
      const allowed = currentCount < maxRequests;
      const remaining = Math.max(0, maxRequests - currentCount - (allowed ? 1 : 0));
      const resetTime = now + windowSizeMs;

      return { allowed, remaining, resetTime };

    } catch (error) {
      logger.error('Sliding window rate limiter error', { key, error });
      // Fail open - allow request on error
      return { allowed: true, remaining: maxRequests - 1, resetTime: Date.now() + windowSizeMs };
    }
  }

  // Token bucket rate limiter
  async tokenBucketLimiter(
    key: string,
    capacity: number,
    refillRate: number,
    tokens: number = 1
  ): Promise<{ allowed: boolean; tokensRemaining: number }> {
    try {
      const now = Date.now();
      const bucketKey = `bucket:${key}`;

      // Get current bucket state
      const bucketData = await this.redis.hmget(bucketKey, 'tokens', 'lastRefill');
      let currentTokens = parseInt(bucketData[0] || capacity.toString());
      let lastRefill = parseInt(bucketData[1] || now.toString());

      // Calculate tokens to add based on time elapsed
      const timeDelta = now - lastRefill;
      const tokensToAdd = Math.floor((timeDelta / 1000) * refillRate);
      currentTokens = Math.min(capacity, currentTokens + tokensToAdd);

      const allowed = currentTokens >= tokens;
      const newTokenCount = allowed ? currentTokens - tokens : currentTokens;

      // Update bucket state
      await this.redis.hmset(bucketKey, {
        tokens: newTokenCount,
        lastRefill: now
      });
      await this.redis.expire(bucketKey, 3600); // 1 hour expiration

      return { allowed, tokensRemaining: newTokenCount };

    } catch (error) {
      logger.error('Token bucket rate limiter error', { key, error });
      // Fail open - allow request on error
      return { allowed: true, tokensRemaining: capacity - tokens };
    }
  }
}

const advancedLimiter = new AdvancedRateLimiter();

// Custom middleware for advanced rate limiting
export const createAdvancedRateLimiter = (options: {
  type: 'sliding' | 'bucket';
  windowMs?: number;
  maxRequests?: number;
  capacity?: number;
  refillRate?: number;
  keyGenerator: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
}) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = options.keyGenerator(req);
      let result: { allowed: boolean; remaining?: number; tokensRemaining?: number; resetTime?: number };

      if (options.type === 'sliding') {
        result = await advancedLimiter.slidingWindowLimiter(
          key,
          options.windowMs || 60000,
          options.maxRequests || 10
        );
      } else {
        result = await advancedLimiter.tokenBucketLimiter(
          key,
          options.capacity || 10,
          options.refillRate || 1
        );
      }

      if (!result.allowed) {
        securityLogger.warn('Advanced rate limit exceeded', {
          key,
          type: options.type,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path
        });

        res.status(429).json({
          success: false,
          error: {
            code: 'ADVANCED_RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded'
          },
          meta: {
            remaining: result.remaining || result.tokensRemaining || 0,
            resetTime: result.resetTime
          }
        });
        return;
      }

      // Add rate limit headers
      res.set({
        'X-RateLimit-Remaining': (result.remaining || result.tokensRemaining || 0).toString(),
        'X-RateLimit-Type': options.type
      });

      if (result.resetTime) {
        res.set('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000).toString());
      }

      next();

    } catch (error) {
      logger.error('Advanced rate limiter middleware error', { error });
      // Fail open - continue on error
      next();
    }
  };
};

// Crisis alert rate limiter (more permissive for emergency situations)
export const crisisAlertLimiter = createAdvancedRateLimiter({
  type: 'bucket',
  capacity: 5, // 5 crisis alerts allowed
  refillRate: 0.1, // 1 token every 10 seconds
  keyGenerator: (req: AuthenticatedRequest) => {
    return `crisis:${req.user?.id || req.ip}`;
  }
});

// HIPAA audit logging rate limiter
export const hipaaAuditLimiter = createAdvancedRateLimiter({
  type: 'sliding',
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // Higher limit for audit logs
  keyGenerator: (req: AuthenticatedRequest) => {
    return `hipaa:${req.user?.id || req.ip}`;
  }
});

// Template management rate limiter
export const templateManagementLimiter = createBaseLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 template operations per 5 minutes
  message: 'Template management rate limit exceeded',
  keyGenerator: (req: AuthenticatedRequest) => {
    return (req.user?.id || req.ip) + ':templates';
  }
});

// Health check rate limiter (more permissive)
export const healthCheckLimiter = createBaseLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 1 request per second
  message: 'Health check rate limit exceeded'
});

// User-specific rate limiter based on user tier/role
export const createUserTierLimiter = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    // Apply basic rate limiting for unauthenticated users
    generalLimiter(req, res, next);
    return;
  }

  // Define rate limits based on user role
  const roleLimits: Record<string, { windowMs: number; max: number }> = {
    admin: { windowMs: 60 * 1000, max: 1000 }, // 1000 requests per minute
    provider: { windowMs: 60 * 1000, max: 200 }, // 200 requests per minute
    patient: { windowMs: 60 * 1000, max: 60 }, // 60 requests per minute
    supporter: { windowMs: 60 * 1000, max: 100 } // 100 requests per minute
  };

  const userLimit = roleLimits[req.user.role] || roleLimits.patient;

  const dynamicLimiter = createBaseLimiter({
    ...userLimit,
    message: `Rate limit exceeded for ${req.user.role} role`,
    keyGenerator: () => `user:${req.user!.id}:${req.user!.role}`
  });

  dynamicLimiter(req, res, next);
};

// Export cleanup function for graceful shutdown
export const cleanup = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info('Rate limiter Redis connection closed');
  } catch (error) {
    logger.error('Error closing rate limiter Redis connection', { error });
  }
};