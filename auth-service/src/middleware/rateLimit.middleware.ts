import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { logger, auditLogger } from '../config/logger';

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  headers?: boolean;
}

class RateLimitService {
  private createRateLimit(options: RateLimitOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = options.keyGenerator ? options.keyGenerator(req) : this.getDefaultKey(req);
        const windowMs = options.windowMs;
        const max = options.max;

        // Check rate limit
        const result = await redis.incrementRateLimit(
          key,
          Math.floor(windowMs / 1000),
          max
        );

        // Set rate limit headers
        if (options.headers !== false) {
          res.set({
            'X-RateLimit-Limit': max.toString(),
            'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
            'X-RateLimit-Reset': result.reset.toString(),
          });
        }

        if (result.blocked) {
          // Log rate limit violation
          auditLogger.securityEvent('rate_limit_exceeded', 'medium', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            endpoint: req.path,
            key,
            attempts: result.count,
            limit: max,
            windowMs,
          });

          logger.warn('Rate limit exceeded', {
            ip: req.ip,
            endpoint: req.path,
            key,
            attempts: result.count,
            limit: max,
          });

          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: options.message || 'Too many requests, please try again later.',
              details: {
                limit: max,
                windowMs,
                remaining: 0,
                reset: result.reset,
              },
            },
            timestamp: new Date().toISOString(),
            requestId: req.get('X-Request-ID') || 'unknown',
          });
        }

        next();
      } catch (error) {
        logger.error('Rate limit middleware error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          ip: req.ip,
          endpoint: req.path,
        });

        // Continue on error to avoid blocking requests
        next();
      }
    };
  }

  private getDefaultKey(req: Request): string {
    return `rate_limit:${req.ip}:${req.path}`;
  }

  // Different rate limiters for different endpoints
  public readonly global = this.createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    message: 'Too many requests from this IP, please try again later.',
  });

  public readonly api = this.createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    keyGenerator: (req) => `api_rate_limit:${req.ip}`,
    message: 'Too many API requests, please try again later.',
  });

  public readonly login = this.createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 login attempts per window
    keyGenerator: (req) => `login_rate_limit:${req.ip}`,
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true,
  });

  public readonly register = this.createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 registrations per hour per IP
    keyGenerator: (req) => `register_rate_limit:${req.ip}`,
    message: 'Too many registration attempts, please try again later.',
  });

  public readonly passwordReset = this.createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 password reset requests per hour
    keyGenerator: (req) => `password_reset_rate_limit:${req.body.email || req.ip}`,
    message: 'Too many password reset requests, please try again later.',
  });

  public readonly passwordChange = this.createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 password changes per hour
    keyGenerator: (req) => `password_change_rate_limit:${req.userId || req.ip}`,
    message: 'Too many password change attempts, please try again later.',
  });

  public readonly mfa = this.createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 MFA attempts per window
    keyGenerator: (req) => `mfa_rate_limit:${req.userId || req.ip}`,
    message: 'Too many MFA attempts, please try again later.',
  });

  public readonly token = this.createRateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // 20 token refresh attempts per window
    keyGenerator: (req) => `token_rate_limit:${req.ip}`,
    message: 'Too many token refresh attempts, please try again later.',
  });

  public readonly emailVerification = this.createRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 email verification requests per hour
    keyGenerator: (req) => `email_verification_rate_limit:${req.userId || req.ip}`,
    message: 'Too many email verification requests, please try again later.',
  });

  public readonly dataExport = this.createRateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 2, // 2 data export requests per day
    keyGenerator: (req) => `data_export_rate_limit:${req.userId}`,
    message: 'Too many data export requests, please try again tomorrow.',
  });

  // Brute force protection for specific users
  public bruteForceProtection = async (
    identifier: string,
    maxAttempts: number = 5,
    lockoutDuration: number = 30 * 60 // 30 minutes in seconds
  ): Promise<{
    isLocked: boolean;
    attemptsRemaining: number;
    lockoutExpires?: Date;
  }> => {
    try {
      // Check if account is currently locked
      const isLocked = await redis.isAccountLocked(identifier);
      if (isLocked) {
        return {
          isLocked: true,
          attemptsRemaining: 0,
          lockoutExpires: new Date(Date.now() + lockoutDuration * 1000),
        };
      }

      // Get current failed attempts
      const failedAttempts = await redis.getFailedLoginCount(identifier);
      const attemptsRemaining = Math.max(0, maxAttempts - failedAttempts);

      return {
        isLocked: false,
        attemptsRemaining,
      };
    } catch (error) {
      logger.error('Brute force protection check failed', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Return safe default on error
      return {
        isLocked: false,
        attemptsRemaining: maxAttempts,
      };
    }
  };

  public recordFailedAttempt = async (
    identifier: string,
    maxAttempts: number = 5,
    lockoutDuration: number = 30 * 60 // 30 minutes in seconds
  ): Promise<void> => {
    try {
      const failedAttempts = await redis.recordFailedLogin(identifier);

      if (failedAttempts >= maxAttempts) {
        // Lock the account
        await redis.lockAccount(identifier, lockoutDuration);

        auditLogger.securityEvent('account_locked_brute_force', 'high', {
          identifier,
          failedAttempts,
          lockoutDuration,
        });

        logger.warn('Account locked due to brute force', {
          identifier,
          failedAttempts,
          lockoutDuration,
        });
      }
    } catch (error) {
      logger.error('Failed to record failed attempt', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  public recordSuccessfulLogin = async (identifier: string): Promise<void> => {
    try {
      // Clear failed login attempts on successful login
      await redis.clearFailedLogins(identifier);
      await redis.unlockAccount(identifier);
    } catch (error) {
      logger.error('Failed to clear failed attempts', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Custom rate limiter for specific scenarios
  public createCustomRateLimit = (options: RateLimitOptions) => {
    return this.createRateLimit(options);
  };

  // Progressive rate limiting - increases restrictions based on behavior
  public createProgressiveRateLimit = (baseOptions: RateLimitOptions) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      const key = baseOptions.keyGenerator ? baseOptions.keyGenerator(req) : this.getDefaultKey(req);
      
      try {
        // Check if this IP has been flagged for suspicious behavior
        const suspiciousKey = `suspicious:${req.ip}`;
        const suspiciousActivity = await redis.get(suspiciousKey);

        let adjustedMax = baseOptions.max;
        let adjustedWindow = baseOptions.windowMs;

        if (suspiciousActivity) {
          // Reduce limits for suspicious IPs
          adjustedMax = Math.max(1, Math.floor(baseOptions.max * 0.3));
          adjustedWindow = baseOptions.windowMs * 2; // Longer window

          logger.warn('Progressive rate limiting applied to suspicious IP', {
            ip: req.ip,
            originalMax: baseOptions.max,
            adjustedMax,
            suspiciousActivity,
          });
        }

        // Apply the adjusted rate limit
        const result = await redis.incrementRateLimit(
          key,
          Math.floor(adjustedWindow / 1000),
          adjustedMax
        );

        // Set headers
        res.set({
          'X-RateLimit-Limit': adjustedMax.toString(),
          'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
          'X-RateLimit-Reset': result.reset.toString(),
        });

        if (result.blocked) {
          // Mark IP as suspicious if they hit the reduced limit
          if (suspiciousActivity && result.count > adjustedMax) {
            await redis.set(suspiciousKey, 'high_activity', 3600); // 1 hour
            
            auditLogger.securityEvent('escalated_suspicious_activity', 'high', {
              ip: req.ip,
              endpoint: req.path,
              attempts: result.count,
              adjustedMax,
            });
          }

          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: suspiciousActivity 
                ? 'Rate limit exceeded for suspicious activity'
                : 'Too many requests, please try again later.',
            },
            timestamp: new Date().toISOString(),
            requestId: req.get('X-Request-ID') || 'unknown',
          });
        }

        next();
      } catch (error) {
        logger.error('Progressive rate limit error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          ip: req.ip,
        });
        next();
      }
    };
  };

  // Mark IP as suspicious
  public markSuspicious = async (
    ip: string,
    reason: string,
    duration: number = 3600 // 1 hour
  ): Promise<void> => {
    try {
      const key = `suspicious:${ip}`;
      await redis.set(key, reason, duration);

      auditLogger.securityEvent('ip_marked_suspicious', 'medium', {
        ip,
        reason,
        duration,
      });

      logger.warn('IP marked as suspicious', { ip, reason, duration });
    } catch (error) {
      logger.error('Failed to mark IP as suspicious', {
        ip,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

export const rateLimiter = new RateLimitService();