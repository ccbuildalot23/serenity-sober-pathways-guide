/**
 * Rate Limiting Service for Authentication and API Endpoints
 * HIPAA-compliant rate limiting with IP-based and user-based throttling
 */

import { supabase } from '@/integrations/supabase/client';
import { EnhancedSecurityAuditService } from './EnhancedSecurityAuditService';

interface RateLimitConfig {
  maxAttempts: number;
  windowMinutes: number;
  blockDurationMinutes: number;
}

interface RateLimitCheck {
  allowed: boolean;
  remainingAttempts: number;
  resetTime?: Date;
  reason?: string;
}

export class RateLimitService {
  private static instance: RateLimitService;
  
  // Rate limit configurations for different endpoints
  private readonly configs: Record<string, RateLimitConfig> = {
    login: {
      maxAttempts: 5,
      windowMinutes: 15,
      blockDurationMinutes: 30
    },
    mfa: {
      maxAttempts: 3,
      windowMinutes: 5,
      blockDurationMinutes: 60
    },
    passwordReset: {
      maxAttempts: 3,
      windowMinutes: 60,
      blockDurationMinutes: 120
    },
    registration: {
      maxAttempts: 3,
      windowMinutes: 60,
      blockDurationMinutes: 240
    },
    api: {
      maxAttempts: 100,
      windowMinutes: 1,
      blockDurationMinutes: 5
    }
  };

  // In-memory cache for rate limiting (in production, use Redis)
  private attemptCache: Map<string, { count: number; firstAttempt: Date; blocked?: Date }> = new Map();
  
  static getInstance(): RateLimitService {
    if (!this.instance) {
      this.instance = new RateLimitService();
    }
    return this.instance;
  }

  constructor() {
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }

  /**
   * Check if an action is rate limited
   */
  async checkRateLimit(
    endpoint: keyof typeof this.configs,
    identifier: string,
    ipAddress?: string
  ): Promise<RateLimitCheck> {
    const config = this.configs[endpoint];
    const now = new Date();
    
    // Create composite key for rate limiting
    const key = this.createKey(endpoint, identifier, ipAddress);
    
    // Check database for persistent blocks
    const dbBlock = await this.checkDatabaseBlock(identifier, ipAddress, endpoint);
    if (dbBlock && !dbBlock.allowed) {
      return dbBlock;
    }
    
    // Check in-memory cache
    const cacheEntry = this.attemptCache.get(key);
    
    if (cacheEntry) {
      // Check if blocked
      if (cacheEntry.blocked) {
        const blockEndTime = new Date(cacheEntry.blocked.getTime() + config.blockDurationMinutes * 60 * 1000);
        if (now < blockEndTime) {
          await this.logBlockedAttempt(endpoint, identifier, ipAddress);
          return {
            allowed: false,
            remainingAttempts: 0,
            resetTime: blockEndTime,
            reason: `Too many attempts. Please try again after ${blockEndTime.toLocaleTimeString()}`
          };
        } else {
          // Block expired, reset
          this.attemptCache.delete(key);
        }
      }
      
      // Check if window expired
      const windowEnd = new Date(cacheEntry.firstAttempt.getTime() + config.windowMinutes * 60 * 1000);
      if (now > windowEnd) {
        // Window expired, reset counter
        this.attemptCache.delete(key);
      } else if (cacheEntry.count >= config.maxAttempts) {
        // Max attempts reached, block
        cacheEntry.blocked = now;
        await this.recordBlock(endpoint, identifier, ipAddress);
        
        const blockEndTime = new Date(now.getTime() + config.blockDurationMinutes * 60 * 1000);
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: blockEndTime,
          reason: `Maximum attempts exceeded. Blocked until ${blockEndTime.toLocaleTimeString()}`
        };
      }
    }
    
    // Allow the attempt
    const remainingAttempts = config.maxAttempts - (cacheEntry?.count || 0) - 1;
    return {
      allowed: true,
      remainingAttempts: Math.max(0, remainingAttempts)
    };
  }

  /**
   * Record an attempt
   */
  async recordAttempt(
    endpoint: keyof typeof this.configs,
    identifier: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    const key = this.createKey(endpoint, identifier, ipAddress);
    const now = new Date();
    
    // Don't count successful attempts against rate limit
    if (success) {
      // Clear rate limit on successful attempt
      this.attemptCache.delete(key);
      
      // Log successful attempt
      await this.logAttempt(endpoint, identifier, true, ipAddress);
      return;
    }
    
    // Record failed attempt
    const cacheEntry = this.attemptCache.get(key);
    if (cacheEntry && !cacheEntry.blocked) {
      cacheEntry.count++;
    } else if (!cacheEntry) {
      this.attemptCache.set(key, {
        count: 1,
        firstAttempt: now
      });
    }
    
    // Log failed attempt
    await this.logAttempt(endpoint, identifier, false, ipAddress);
    
    // Store in database for persistent tracking
    await this.storeDatabaseAttempt(endpoint, identifier, false, ipAddress);
  }

  /**
   * Check if an IP address is blocked
   */
  async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('rate_limit_blocks')
        .select('blocked_until')
        .eq('ip_address', ipAddress)
        .eq('active', true)
        .single();

      if (error || !data) {
        return false;
      }

      const blockedUntil = new Date(data.blocked_until);
      if (blockedUntil > new Date()) {
        return true;
      }

      // Block expired, deactivate it
      await supabase
        .from('rate_limit_blocks')
        .update({ active: false })
        .eq('ip_address', ipAddress);

      return false;
    } catch (error) {
      console.error('Error checking IP block:', error);
      return false;
    }
  }

  /**
   * Block an IP address
   */
  async blockIP(ipAddress: string, reason: string, durationMinutes: number = 60): Promise<void> {
    const blockedUntil = new Date();
    blockedUntil.setMinutes(blockedUntil.getMinutes() + durationMinutes);

    try {
      await supabase
        .from('rate_limit_blocks')
        .insert({
          ip_address: ipAddress,
          reason,
          blocked_until: blockedUntil.toISOString(),
          active: true,
          created_at: new Date().toISOString()
        });

      // Log security event
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'IP_BLOCKED',
        details: {
          ip_address: ipAddress,
          reason,
          duration_minutes: durationMinutes
        },
        severity: 'high'
      });
    } catch (error) {
      console.error('Error blocking IP:', error);
    }
  }

  /**
   * Get rate limit status for display
   */
  getRateLimitStatus(endpoint: keyof typeof this.configs, identifier: string, ipAddress?: string): {
    attemptsUsed: number;
    maxAttempts: number;
    resetTime?: Date;
  } {
    const config = this.configs[endpoint];
    const key = this.createKey(endpoint, identifier, ipAddress);
    const cacheEntry = this.attemptCache.get(key);
    
    if (!cacheEntry) {
      return {
        attemptsUsed: 0,
        maxAttempts: config.maxAttempts
      };
    }
    
    const resetTime = new Date(cacheEntry.firstAttempt.getTime() + config.windowMinutes * 60 * 1000);
    
    return {
      attemptsUsed: cacheEntry.count,
      maxAttempts: config.maxAttempts,
      resetTime: resetTime > new Date() ? resetTime : undefined
    };
  }

  // Private helper methods

  private createKey(endpoint: string, identifier: string, ipAddress?: string): string {
    return `${endpoint}:${identifier}${ipAddress ? `:${ipAddress}` : ''}`;
  }

  private cleanupCache(): void {
    const now = new Date();
    const keysToDelete: string[] = [];
    
    this.attemptCache.forEach((entry, key) => {
      // Get endpoint from key to find config
      const endpoint = key.split(':')[0] as keyof typeof this.configs;
      const config = this.configs[endpoint];
      
      if (config) {
        const windowEnd = new Date(entry.firstAttempt.getTime() + config.windowMinutes * 60 * 1000);
        const blockEnd = entry.blocked 
          ? new Date(entry.blocked.getTime() + config.blockDurationMinutes * 60 * 1000)
          : null;
        
        // Remove if window expired and not blocked, or if block expired
        if ((now > windowEnd && !entry.blocked) || (blockEnd && now > blockEnd)) {
          keysToDelete.push(key);
        }
      }
    });
    
    keysToDelete.forEach(key => this.attemptCache.delete(key));
  }

  private async checkDatabaseBlock(
    identifier: string,
    ipAddress?: string,
    endpoint?: string
  ): Promise<RateLimitCheck | null> {
    try {
      const { data, error } = await supabase
        .from('rate_limit_blocks')
        .select('blocked_until, reason')
        .or(`identifier.eq.${identifier}${ipAddress ? `,ip_address.eq.${ipAddress}` : ''}`)
        .eq('active', true)
        .single();

      if (error || !data) {
        return null;
      }

      const blockedUntil = new Date(data.blocked_until);
      if (blockedUntil > new Date()) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: blockedUntil,
          reason: data.reason || 'Rate limit exceeded'
        };
      }

      // Block expired, deactivate
      await supabase
        .from('rate_limit_blocks')
        .update({ active: false })
        .or(`identifier.eq.${identifier}${ipAddress ? `,ip_address.eq.${ipAddress}` : ''}`);

      return null;
    } catch (error) {
      console.error('Error checking database block:', error);
      return null;
    }
  }

  private async recordBlock(
    endpoint: string,
    identifier: string,
    ipAddress?: string
  ): Promise<void> {
    const config = this.configs[endpoint as keyof typeof this.configs];
    const blockedUntil = new Date();
    blockedUntil.setMinutes(blockedUntil.getMinutes() + config.blockDurationMinutes);

    try {
      await supabase
        .from('rate_limit_blocks')
        .insert({
          endpoint,
          identifier,
          ip_address: ipAddress,
          reason: `Exceeded ${config.maxAttempts} attempts in ${config.windowMinutes} minutes`,
          blocked_until: blockedUntil.toISOString(),
          active: true,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error recording block:', error);
    }
  }

  private async storeDatabaseAttempt(
    endpoint: string,
    identifier: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    try {
      await supabase
        .from('rate_limit_attempts')
        .insert({
          endpoint,
          identifier,
          ip_address: ipAddress,
          success,
          attempted_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error storing attempt:', error);
    }
  }

  private async logAttempt(
    endpoint: string,
    identifier: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    if (!success) {
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: `RATE_LIMIT_ATTEMPT_${endpoint.toUpperCase()}`,
        details: {
          identifier,
          ip_address: ipAddress,
          success
        },
        severity: 'low'
      });
    }
  }

  private async logBlockedAttempt(
    endpoint: string,
    identifier: string,
    ipAddress?: string
  ): Promise<void> {
    await EnhancedSecurityAuditService.logSecurityEvent({
      action: `RATE_LIMIT_BLOCKED_${endpoint.toUpperCase()}`,
      details: {
        identifier,
        ip_address: ipAddress
      },
      severity: 'medium'
    });
  }
}

export const rateLimitService = RateLimitService.getInstance();