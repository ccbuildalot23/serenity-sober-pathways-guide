/**
 * API Rate Limiting Middleware
 * Implements rate limiting to prevent abuse and ensure fair usage
 * with special considerations for healthcare critical operations
 */

import { supabase } from '@/integrations/supabase/client';
import logger from '@/services/loggerService';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (context: any) => string; // Custom key generation
  handler?: (context: any) => void; // Custom rate limit handler
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class RateLimitMiddleware {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  // Different rate limits for different endpoints
  private limits: { [pattern: string]: RateLimitConfig } = {
    // Critical healthcare endpoints - more lenient
    '/api/crisis/*': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100, // Allow more for emergencies
    },
    '/api/emergency/*': {
      windowMs: 60 * 1000,
      maxRequests: 100,
    },
    
    // Authentication endpoints - strict to prevent brute force
    '/api/auth/login': {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5, // Only 5 login attempts per 15 minutes
      skipSuccessfulRequests: true,
    },
    '/api/auth/register': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3, // Only 3 registrations per hour per IP
    },
    '/api/auth/reset-password': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
    },
    
    // Data access endpoints - moderate limits
    '/api/patients/*': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
    },
    '/api/providers/*': {
      windowMs: 60 * 1000,
      maxRequests: 30,
    },
    '/api/appointments/*': {
      windowMs: 60 * 1000,
      maxRequests: 20,
    },
    
    // Notification endpoints - prevent spam
    '/api/notifications/send': {
      windowMs: 60 * 1000,
      maxRequests: 10,
    },
    '/api/sms/send': {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20, // Limit SMS to prevent cost overruns
    },
    
    // Default for all other endpoints
    'default': {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 1 request per second average
    },
  };

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Main middleware function to check rate limits
   */
  public async checkRateLimit(
    endpoint: string,
    identifier: string,
    options?: Partial<RateLimitConfig>
  ): Promise<{ allowed: boolean; retryAfter?: number; remaining?: number }> {
    try {
      const config = this.getConfigForEndpoint(endpoint, options);
      const key = this.generateKey(endpoint, identifier, config);
      const now = Date.now();

      // Get or create rate limit entry
      let entry = this.store[key];
      if (!entry || entry.resetTime <= now) {
        entry = {
          count: 0,
          resetTime: now + config.windowMs,
        };
        this.store[key] = entry;
      }

      // Check if limit exceeded
      if (entry.count >= config.maxRequests) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        
        // Log rate limit violation
        await this.logRateLimitViolation(endpoint, identifier, retryAfter);
        
        // Call custom handler if provided
        if (config.handler) {
          config.handler({ endpoint, identifier, retryAfter });
        }

        return {
          allowed: false,
          retryAfter,
          remaining: 0,
        };
      }

      // Increment counter
      entry.count++;

      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
      };
    } catch (error) {
      logger.error('Rate limit check failed', error, { endpoint, identifier });
      // On error, allow the request but log it
      return { allowed: true };
    }
  }

  /**
   * Get configuration for a specific endpoint
   */
  private getConfigForEndpoint(
    endpoint: string,
    customConfig?: Partial<RateLimitConfig>
  ): RateLimitConfig {
    // Check for exact match first
    if (this.limits[endpoint]) {
      return { ...this.limits[endpoint], ...customConfig };
    }

    // Check for pattern match
    for (const pattern in this.limits) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        if (regex.test(endpoint)) {
          return { ...this.limits[pattern], ...customConfig };
        }
      }
    }

    // Return default config
    return { ...this.limits.default, ...customConfig };
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(
    endpoint: string,
    identifier: string,
    config: RateLimitConfig
  ): string {
    if (config.keyGenerator) {
      return config.keyGenerator({ endpoint, identifier });
    }
    return `${endpoint}:${identifier}`;
  }

  /**
   * Clean up expired entries from the store
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const key in this.store) {
      if (this.store[key].resetTime <= now) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      delete this.store[key];
    });

    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired rate limit entries`);
    }
  }

  /**
   * Log rate limit violations for security monitoring
   */
  private async logRateLimitViolation(
    endpoint: string,
    identifier: string,
    retryAfter: number
  ): Promise<void> {
    try {
      // Log to database for security auditing
      const { error } = await supabase
        .from('rate_limit_violations')
        .insert({
          endpoint,
          identifier,
          retry_after: retryAfter,
          timestamp: new Date().toISOString(),
        });

      if (error) {
        logger.error('Failed to log rate limit violation to database', error);
      }

      // Log to application logs
      logger.warn('Rate limit exceeded', {
        endpoint,
        identifier,
        retryAfter,
      });

      // If this is a critical pattern, alert security team
      if (await this.isAttackPattern(identifier, endpoint)) {
        logger.security('Potential attack detected - rate limit pattern', {
          endpoint,
          identifier,
          severity: 'high',
        });
      }
    } catch (error) {
      logger.error('Error logging rate limit violation', error);
    }
  }

  /**
   * Detect potential attack patterns
   */
  private async isAttackPattern(
    identifier: string,
    _endpoint: string
  ): Promise<boolean> {
    try {
      // Check for multiple violations from the same identifier
      const { data, error } = await supabase
        .from('rate_limit_violations')
        .select('count')
        .eq('identifier', identifier)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (error) {
        logger.error('Failed to check attack pattern', error);
        return false;
      }

      // If more than 10 violations in the last hour, consider it an attack
      return data && data.length > 10;
    } catch (error) {
      logger.error('Error checking attack pattern', error);
      return false;
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  public resetRateLimit(endpoint: string, identifier: string): void {
    const key = `${endpoint}:${identifier}`;
    delete this.store[key];
    logger.info('Rate limit reset', { endpoint, identifier });
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(
    endpoint: string,
    identifier: string
  ): { count: number; resetTime: number; limit: number } | null {
    const config = this.getConfigForEndpoint(endpoint);
    const key = `${endpoint}:${identifier}`;
    const entry = this.store[key];

    if (!entry) {
      return {
        count: 0,
        resetTime: Date.now() + config.windowMs,
        limit: config.maxRequests,
      };
    }

    return {
      count: entry.count,
      resetTime: entry.resetTime,
      limit: config.maxRequests,
    };
  }

  /**
   * Update rate limit configuration
   */
  public updateLimits(pattern: string, config: RateLimitConfig): void {
    this.limits[pattern] = config;
    logger.info('Rate limit configuration updated', { pattern, config });
  }

  /**
   * Destroy the middleware and clean up
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store = {};
    logger.info('Rate limit middleware destroyed');
  }
}

// Export singleton instance
export const rateLimitMiddleware = new RateLimitMiddleware();

// Supabase Edge Function wrapper
export async function withRateLimit(
  request: Request,
  handler: (request: Request) => Promise<Response>
): Promise<Response> {
  const endpoint = new URL(request.url).pathname;
  const identifier = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';

  const { allowed, retryAfter } = await rateLimitMiddleware.checkRateLimit(
    endpoint,
    identifier
  );

  if (!allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many requests',
        retryAfter,
        message: `Please retry after ${retryAfter} seconds`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(rateLimitMiddleware.getRateLimitStatus(endpoint, identifier)?.limit || 0),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(rateLimitMiddleware.getRateLimitStatus(endpoint, identifier)?.resetTime || 0),
        },
      }
    );
  }

  // Process the request
  const response = await handler(request);

  // Add rate limit headers to response
  const status = rateLimitMiddleware.getRateLimitStatus(endpoint, identifier);
  if (status) {
    response.headers.set('X-RateLimit-Limit', String(status.limit));
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, status.limit - status.count)));
    response.headers.set('X-RateLimit-Reset', String(status.resetTime));
  }

  return response;
}