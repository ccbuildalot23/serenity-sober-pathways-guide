import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { redisManager } from '@utils/redis';
import { createLogger, securityLogger } from '@utils/logger';
import { getClientIp, getUserAgent } from '@utils/helpers';
import { RateLimitConfig } from '@types/index';
import config from '@config/index';

const logger = createLogger('RateLimiter');

interface RateLimitStore {
  incr(key: string): Promise<{ totalHits: number; resetTime?: Date }>;
  decrement(key: string): Promise<void>;
  resetKey(key: string): Promise<void>;
}

/**
 * Redis-based rate limit store
 */
class RedisRateLimitStore implements RateLimitStore {
  private windowMs: number;

  constructor(windowMs: number) {
    this.windowMs = windowMs;
  }

  async incr(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const multi = redisManager.getClient().multi();
    const expires = Math.ceil(this.windowMs / 1000);
    
    multi.incr(key);
    multi.expire(key, expires);
    
    const results = await multi.exec();
    const totalHits = results?.[0]?.[1] as number || 0;
    const resetTime = new Date(Date.now() + this.windowMs);
    
    return { totalHits, resetTime };
  }

  async decrement(key: string): Promise<void> {
    try {
      await redisManager.getClient().decr(key);
    } catch (error) {
      logger.error('Error decrementing rate limit key:', error);
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await redisManager.del(key);
    } catch (error) {
      logger.error('Error resetting rate limit key:', error);
    }
  }
}

/**
 * Generate rate limit key based on different strategies
 */
const generateRateLimitKey = (req: Request, prefix: string, keyGenerator?: string): string => {
  const ip = getClientIp(req);
  
  switch (keyGenerator) {
    case 'user_id':
      return req.user ? `${prefix}:user:${req.user.id}` : `${prefix}:ip:${ip}`;
    case 'api_key':
      return req.api_key ? `${prefix}:api_key:${req.api_key.id}` : `${prefix}:ip:${ip}`;
    case 'ip':
      return `${prefix}:ip:${ip}`;
    case 'user_agent':
      const userAgent = getUserAgent(req);
      return `${prefix}:ua:${Buffer.from(userAgent).toString('base64')}`;
    case 'endpoint':
      return `${prefix}:endpoint:${req.method}:${req.route?.path || req.path}`;
    default:
      // Default to IP-based rate limiting
      return `${prefix}:ip:${ip}`;
  }
};

/**
 * Advanced rate limiter with Redis backend
 */
export const createAdvancedRateLimiter = (
  config: RateLimitConfig & { 
    prefix?: string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
    onLimitReached?: (req: Request, res: Response) => void;
  }
) => {
  const {
    window_ms,
    max_requests,
    key_generator = 'ip',
    prefix = 'rate_limit',
    skip_successful_requests = false,
    skipFailedRequests = false,
    onLimitReached
  } = config;

  const store = new RedisRateLimitStore(window_ms);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = generateRateLimitKey(req, prefix, key_generator);
      const { totalHits, resetTime } = await store.incr(key);

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max_requests.toString(),
        'X-RateLimit-Remaining': Math.max(0, max_requests - totalHits).toString(),
        'X-RateLimit-Reset': resetTime ? Math.ceil(resetTime.getTime() / 1000).toString() : '',
        'X-RateLimit-Window': window_ms.toString()
      });

      if (totalHits > max_requests) {
        // Log rate limit exceeded
        securityLogger.warn('Rate limit exceeded', {
          request_id: req.request_id,
          ip: getClientIp(req),
          user_id: req.user?.id,
          api_key_id: req.api_key?.id,
          method: req.method,
          path: req.path,
          user_agent: getUserAgent(req),
          hits: totalHits,
          limit: max_requests,
          window_ms
        });

        if (onLimitReached) {
          onLimitReached(req, res);
        }

        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
            details: {
              limit: max_requests,
              window_ms,
              retry_after: Math.ceil(window_ms / 1000)
            },
            timestamp: new Date().toISOString(),
            request_id: req.request_id
          }
        });
      }

      // Handle skip conditions
      const originalSend = res.send;
      res.send = function(body) {
        const statusCode = res.statusCode;
        
        if (skip_successful_requests && statusCode < 400) {
          store.decrement(key);
        } else if (skipFailedRequests && statusCode >= 400) {
          store.decrement(key);
        }
        
        return originalSend.call(this, body);
      };

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
};

/**
 * Global rate limiter
 */
export const globalRateLimit = createAdvancedRateLimiter({
  ...config.security.rate_limiting.global,
  prefix: 'global_rate_limit',
  onLimitReached: (req, res) => {
    securityLogger.error('Global rate limit exceeded', {
      request_id: req.request_id,
      ip: getClientIp(req),
      user_agent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
  }
});

/**
 * Per-user rate limiter
 */
export const userRateLimit = createAdvancedRateLimiter({
  ...config.security.rate_limiting.per_user,
  prefix: 'user_rate_limit',
  key_generator: 'user_id',
  skip_successful_requests: true
});

/**
 * Per-API key rate limiter
 */
export const apiKeyRateLimit = createAdvancedRateLimiter({
  ...config.security.rate_limiting.per_api_key,
  prefix: 'api_key_rate_limit',
  key_generator: 'api_key',
  skip_successful_requests: true
});

/**
 * Authentication endpoint rate limiter (more restrictive)
 */
export const authRateLimit = createAdvancedRateLimiter({
  window_ms: 15 * 60 * 1000, // 15 minutes
  max_requests: 5, // Only 5 login attempts per 15 minutes
  prefix: 'auth_rate_limit',
  key_generator: 'ip',
  onLimitReached: (req, res) => {
    securityLogger.error('Authentication rate limit exceeded', {
      request_id: req.request_id,
      ip: getClientIp(req),
      user_agent: getUserAgent(req),
      method: req.method,
      path: req.path
    });
  }
});

/**
 * File upload rate limiter
 */
export const uploadRateLimit = createAdvancedRateLimiter({
  window_ms: 60 * 60 * 1000, // 1 hour
  max_requests: 20, // 20 uploads per hour
  prefix: 'upload_rate_limit',
  key_generator: 'user_id'
});

/**
 * Crisis endpoint rate limiter (more lenient for emergency situations)
 */
export const crisisRateLimit = createAdvancedRateLimiter({
  window_ms: 60 * 1000, // 1 minute
  max_requests: 50, // Higher limit for crisis situations
  prefix: 'crisis_rate_limit',
  key_generator: 'user_id',
  skip_successful_requests: true
});

/**
 * Slow down middleware for gradual throttling
 */
export const createSlowDown = (config: {
  windowMs: number;
  delayAfter: number;
  delayMs: number;
  maxDelayMs?: number;
  keyGenerator?: string;
}) => {
  const {
    windowMs,
    delayAfter,
    delayMs,
    maxDelayMs = 20000,
    keyGenerator = 'ip'
  } = config;

  return slowDown({
    windowMs,
    delayAfter,
    delayMs,
    maxDelayMs,
    keyGenerator: (req) => generateRateLimitKey(req, 'slow_down', keyGenerator),
    store: new Map(), // In-memory store for simplicity, could use Redis
    onLimitReached: (req, res) => {
      securityLogger.warn('Slow down limit reached', {
        request_id: req.request_id,
        ip: getClientIp(req),
        user_id: req.user?.id,
        method: req.method,
        path: req.path
      });
    }
  });
};

/**
 * Global slow down middleware
 */
export const globalSlowDown = createSlowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Start slowing down after 50 requests
  delayMs: 500, // Add 500ms delay
  maxDelayMs: 10000 // Maximum 10 seconds delay
});

/**
 * Adaptive rate limiter that adjusts based on system load
 */
export const adaptiveRateLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get system metrics (this would be connected to monitoring)
    const systemLoad = await getSystemLoad();
    const errorRate = await getErrorRate();
    
    // Adjust rate limits based on system health
    let multiplier = 1.0;
    
    if (systemLoad > 0.8) multiplier *= 0.5; // Reduce by 50% if high load
    if (errorRate > 0.1) multiplier *= 0.7; // Reduce by 30% if high error rate
    
    const adjustedLimit = Math.floor(config.security.rate_limiting.global.max_requests * multiplier);
    
    // Create dynamic rate limiter
    const dynamicLimiter = createAdvancedRateLimiter({
      window_ms: config.security.rate_limiting.global.window_ms,
      max_requests: adjustedLimit,
      prefix: 'adaptive_rate_limit'
    });
    
    return dynamicLimiter(req, res, next);
  } catch (error) {
    logger.error('Adaptive rate limiter error:', error);
    next();
  }
};

/**
 * DDoS protection middleware
 */
export const ddosProtection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ip = getClientIp(req);
    const { burst, limit, max_expiry } = config.security.ddos_protection;
    
    const burstKey = `ddos:burst:${ip}`;
    const limitKey = `ddos:limit:${ip}`;
    
    // Check burst limit (short-term)
    const burstCount = await redisManager.incr(burstKey);
    if (burstCount === 1) {
      await redisManager.expire(burstKey, 1); // 1 second window
    }
    
    if (burstCount && burstCount > burst) {
      securityLogger.error('DDoS burst protection triggered', {
        request_id: req.request_id,
        ip,
        burst_count: burstCount,
        burst_limit: burst,
        user_agent: getUserAgent(req)
      });
      
      return res.status(429).json({
        error: {
          code: 'DDOS_PROTECTION',
          message: 'Request rate too high, please slow down',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }
    
    // Check sustained limit (long-term)
    const limitCount = await redisManager.incr(limitKey);
    if (limitCount === 1) {
      await redisManager.expire(limitKey, Math.floor(max_expiry / 1000));
    }
    
    if (limitCount && limitCount > limit) {
      securityLogger.error('DDoS sustained protection triggered', {
        request_id: req.request_id,
        ip,
        limit_count: limitCount,
        limit,
        user_agent: getUserAgent(req)
      });
      
      return res.status(429).json({
        error: {
          code: 'DDOS_PROTECTION',
          message: 'Too many requests from this IP address',
          timestamp: new Date().toISOString(),
          request_id: req.request_id
        }
      });
    }
    
    next();
  } catch (error) {
    logger.error('DDoS protection error:', error);
    next();
  }
};

/**
 * Get system load (mock implementation)
 */
async function getSystemLoad(): Promise<number> {
  try {
    const load = await redisManager.get('system:load');
    return load ? parseFloat(load) : 0.5;
  } catch {
    return 0.5; // Default moderate load
  }
}

/**
 * Get error rate (mock implementation)
 */
async function getErrorRate(): Promise<number> {
  try {
    const errorRate = await redisManager.get('system:error_rate');
    return errorRate ? parseFloat(errorRate) : 0.05;
  } catch {
    return 0.05; // Default 5% error rate
  }
}

/**
 * Custom rate limiter factory
 */
export const createCustomRateLimit = (config: RateLimitConfig & {
  name?: string;
  skipIf?: (req: Request) => boolean;
  keyGenerator?: string;
}) => {
  const { name = 'custom', skipIf, ...rateLimitConfig } = config;
  
  const limiter = createAdvancedRateLimiter({
    ...rateLimitConfig,
    prefix: `${name}_rate_limit`
  });
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (skipIf && skipIf(req)) {
      return next();
    }
    
    return limiter(req, res, next);
  };
};

/**
 * Rate limit bypass for health checks and monitoring
 */
export const rateLimitBypass = (req: Request, res: Response, next: NextFunction) => {
  const bypassPaths = ['/health', '/metrics', '/ping'];
  const bypassUserAgents = ['monitoring', 'health-check', 'prometheus'];
  
  const path = req.path;
  const userAgent = getUserAgent(req).toLowerCase();
  
  if (bypassPaths.some(p => path.startsWith(p)) || 
      bypassUserAgents.some(ua => userAgent.includes(ua))) {
    return next();
  }
  
  return globalRateLimit(req, res, next);
};