import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { config } from '@/config/config';
import { auditLogger, errorLogger } from '@/utils/logger';
import { db } from '@/database/connection';

// Store for rate limiting data (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Enhanced rate limiter with audit logging
export const createRateLimiter = (options?: {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  const windowMs = options?.windowMs || config.rateLimiting.windowMs;
  const maxRequests = options?.maxRequests || config.rateLimiting.maxRequests;
  
  const keyGenerator = options?.keyGenerator || ((req: Request) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  });

  return rateLimit({
    windowMs,
    max: maxRequests,
    keyGenerator,
    skipSuccessfulRequests: options?.skipSuccessfulRequests || false,
    skipFailedRequests: options?.skipFailedRequests || false,
    
    // Custom handler for rate limit exceeded
    handler: async (req: Request, res: Response) => {
      const clientKey = keyGenerator(req);
      
      // Log rate limit violation
      auditLogger.securityEvent('RATE_LIMIT_EXCEEDED', 'MEDIUM', {
        client_key: clientKey,
        endpoint: req.path,
        method: req.method,
        user_agent: req.get('User-Agent'),
        request_id: req.requestId,
      });

      // Log to API access logs
      await logApiAccess(req, 429, false, 'Rate limit exceeded');

      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          retry_after: Math.ceil(windowMs / 1000),
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    },

    // Custom skip function for specific scenarios
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      if (req.path === '/health' || req.path === '/api/v1/health') {
        return true;
      }
      
      // Skip for internal service calls (identified by special header)
      if (req.get('X-Internal-Service') === 'true') {
        return true;
      }

      return false;
    },

    // Add headers to response
    standardHeaders: true,
    legacyHeaders: false,

    // Custom store for tracking (in production, use Redis)
    store: {
      incr: (key: string) => {
        const now = Date.now();
        const record = rateLimitStore.get(key);
        
        if (!record || now > record.resetTime) {
          // Reset window
          rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
          return Promise.resolve({ totalHits: 1, resetTime: new Date(now + windowMs) });
        } else {
          // Increment counter
          record.count++;
          rateLimitStore.set(key, record);
          return Promise.resolve({ totalHits: record.count, resetTime: new Date(record.resetTime) });
        }
      },
      decrement: (key: string) => {
        const record = rateLimitStore.get(key);
        if (record && record.count > 0) {
          record.count--;
          rateLimitStore.set(key, record);
        }
        return Promise.resolve();
      },
      resetKey: (key: string) => {
        rateLimitStore.delete(key);
        return Promise.resolve();
      },
    },

    // On limit reached callback
    onLimitReached: async (req: Request) => {
      const clientKey = keyGenerator(req);
      
      auditLogger.securityEvent('RATE_LIMIT_WARNING', 'LOW', {
        client_key: clientKey,
        endpoint: req.path,
        method: req.method,
        requests_remaining: 0,
        request_id: req.requestId,
      });
    },
  });
};

// Specialized rate limiters for different endpoints
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 auth attempts per window
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    // Rate limit by IP and username for auth endpoints
    const username = req.body?.username || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `auth_${ip}_${username}`;
  },
});

export const auditLogRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 100, // 100 audit log entries per minute
  keyGenerator: (req: Request) => {
    // Rate limit by service name or API key
    const serviceKey = req.get('X-Service-Name') || req.get('X-API-Key') || req.ip;
    return `audit_${serviceKey}`;
  },
});

export const searchRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 20, // 20 searches per 5 minutes
  keyGenerator: (req: Request) => {
    const userId = req.user?.id || req.ip;
    return `search_${userId}`;
  },
});

// Adaptive rate limiter that adjusts based on system load
export class AdaptiveRateLimiter {
  private baseLimit: number;
  private currentMultiplier: number = 1;
  private lastCheck: number = Date.now();
  private checkInterval: number = 60000; // 1 minute

  constructor(baseLimit: number = 100) {
    this.baseLimit = baseLimit;
  }

  async getMiddleware(): Promise<(req: Request, res: Response, next: NextFunction) => void> {
    await this.adjustLimits();
    
    const currentLimit = Math.floor(this.baseLimit * this.currentMultiplier);
    
    return createRateLimiter({
      maxRequests: currentLimit,
      windowMs: config.rateLimiting.windowMs,
    });
  }

  private async adjustLimits(): Promise<void> {
    const now = Date.now();
    
    if (now - this.lastCheck < this.checkInterval) {
      return;
    }

    try {
      // Check system metrics
      const memoryUsage = process.memoryUsage();
      const memoryPercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
      
      // Check database performance
      const dbHealth = await db.healthCheck();
      
      // Adjust multiplier based on system health
      if (memoryPercent > 0.8 || dbHealth.latency > 1000) {
        // System under stress, reduce limits
        this.currentMultiplier = Math.max(0.5, this.currentMultiplier * 0.9);
      } else if (memoryPercent < 0.5 && dbHealth.latency < 100) {
        // System performing well, can increase limits
        this.currentMultiplier = Math.min(2.0, this.currentMultiplier * 1.1);
      }

      this.lastCheck = now;
      
      auditLogger.securityEvent('RATE_LIMIT_ADJUSTMENT', 'LOW', {
        memory_percent: memoryPercent,
        db_latency: dbHealth.latency,
        new_multiplier: this.currentMultiplier,
        new_limit: Math.floor(this.baseLimit * this.currentMultiplier),
      });
      
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'AdaptiveRateLimiter',
        operation: 'adjustLimits',
      });
    }
  }
}

// Helper function to log API access
async function logApiAccess(
  req: Request, 
  statusCode: number, 
  success: boolean, 
  errorMessage?: string
): Promise<void> {
  try {
    await db.query(`
      INSERT INTO api_access_logs (
        api_key_hash,
        endpoint,
        http_method,
        source_ip,
        user_agent,
        status_code,
        success,
        error_message,
        rate_limit_exceeded,
        request_timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      req.apiKey?.hash || null,
      req.path,
      req.method,
      req.ip || req.connection.remoteAddress,
      req.get('User-Agent'),
      statusCode,
      success,
      errorMessage || null,
      statusCode === 429,
    ]);
  } catch (error) {
    errorLogger.application(error as Error, {
      component: 'rateLimiter',
      operation: 'logApiAccess',
      endpoint: req.path,
    });
  }
}

// Rate limit bypass for emergency situations
export const emergencyBypass = (req: Request, res: Response, next: NextFunction): void => {
  // Check for emergency bypass header (should be secured)
  const emergencyKey = req.get('X-Emergency-Bypass');
  
  if (emergencyKey && emergencyKey === config.security.apiKeySecret) {
    auditLogger.securityEvent('EMERGENCY_RATE_LIMIT_BYPASS', 'HIGH', {
      endpoint: req.path,
      method: req.method,
      source_ip: req.ip,
      user_agent: req.get('User-Agent'),
      request_id: req.requestId,
    });
    
    // Skip rate limiting
    req.skipRateLimit = true;
  }
  
  next();
};

// Export default rate limiter
export const defaultRateLimiter = createRateLimiter();