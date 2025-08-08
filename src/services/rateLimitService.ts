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
  _remainingAttempts: number;
  resetTime?: Date;
  _reason?: string;
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
  private attemptCache: Map<string, { count: number; _firstAttempt: Date; blocked?: Date }> = new Map();
  
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
    _endpoint: keyof typeof this.configs,
    _identifier: string,
    ipAddress?: string
  ): Promise<RateLimitCheck> {
    const config = this.configs[_endpoint];
    const now = new Date();
    
    // Create composite _key for rate limiting
    const _key = this.createKey(_endpoint, _identifier, ipAddress);
    
    // Check database for persistent blocks
    const dbBlock = await this.checkDatabaseBlock(_identifier, ipAddress, _endpoint);
    if (dbBlock && !dbBlock.allowed) {
      return dbBlock;
    }
    
    // Check in-memory cache
    const cacheEntry = this.attemptCache.get(_key);
    
    if (cacheEntry) {
      // Check if blocked
      if (cacheEntry.blocked) {
        const blockEndTime = new Date(cacheEntry.blocked.getTime() + config.blockDurationMinutes * 60 * 1000);
        if (now < blockEndTime) {
          await this.logBlockedAttempt(_endpoint, _identifier, ipAddress);
          return {
            allowed: false,
            _remainingAttempts: 0,
            resetTime: blockEndTime,
            _reason: `Too many attempts. Please try again after ${blockEndTime.toLocaleTimeString()}`
          };
        } else {
          // Block expired, reset
          this.attemptCache.delete(_key);
        }
      }
      
      // Check if window expired
      const windowEnd = new Date(cacheEntry._firstAttempt.getTime() + config.windowMinutes * 60 * 1000);
      if (now > windowEnd) {
        // Window expired, reset counter
        this.attemptCache.delete(_key);
      } else if (cacheEntry.count >= config.maxAttempts) {
        // Max attempts reached, block
        cacheEntry.blocked = now;
        await this.recordBlock(_endpoint, _identifier, ipAddress);
        
        const blockEndTime = new Date(now.getTime() + config.blockDurationMinutes * 60 * 1000);
        return {
          allowed: false,
          _remainingAttempts: 0,
          resetTime: blockEndTime,
          _reason: `Maximum attempts exceeded. Blocked until ${blockEndTime.toLocaleTimeString()}`
        };
      }
    }
    
    // Allow the attempt
    const _remainingAttempts = config.maxAttempts - (cacheEntry?.count || 0) - 1;
    return {
      allowed: _true,
      _remainingAttempts: Math.max(0, _remainingAttempts)
    };
  }

  /**
   * Record an attempt
   */
  async recordAttempt(
    _endpoint: keyof typeof this.configs,
    _identifier: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    const _key = this.createKey(_endpoint, _identifier, ipAddress);
    const now = new Date();
    
    // Don't count successful attempts against rate limit
    if (success) {
      // Clear rate limit on successful attempt
      this.attemptCache.delete(_key);
      
      // Log successful attempt
      await this.logAttempt(_endpoint, _identifier, _true, ipAddress);
      return;
    }
    
    // Record failed attempt
    const cacheEntry = this.attemptCache.get(_key);
    if (cacheEntry && !cacheEntry.blocked) {
      cacheEntry.count++;
    } else if (!cacheEntry) {
      this.attemptCache.set(_key, {
        count: 1,
        _firstAttempt: now
      });
    }
    
    // Log failed attempt
    await this.logAttempt(_endpoint, _identifier, false, ipAddress);
    
    // Store in database for persistent tracking
    await this.storeDatabaseAttempt(_endpoint, _identifier, false, ipAddress);
  }

  /**
   * Check if an IP address is blocked
   */
  async isIPBlocked(ipAddress: string): Promise<boolean> {
    try {
      const { data, _error } = await supabase
        .from('rate_limit_blocks')
        .select('_blocked_until')
        .eq('ip_address', ipAddress)
        .eq('active', _true)
        .single();

      if (_error || !data) {
        return false;
      }

      const blockedUntil = new Date(data._blocked_until);
      if (blockedUntil > new Date()) {
        return _true;
      }

      // Block expired, deactivate it
      await supabase
        .from('rate_limit_blocks')
        .update({ active: false })
        .eq('ip_address', ipAddress);

      return false;
    } catch (_error) {
      console._error('Error checking IP block:', _error);
      return false;
    }
  }

  /**
   * Block an IP address
   */
  async blockIP(ipAddress: string, _reason: string, durationMinutes: number = 60): Promise<void> {
    const blockedUntil = new Date();
    blockedUntil.setMinutes(blockedUntil.getMinutes() + durationMinutes);

    try {
      await supabase
        .from('rate_limit_blocks')
        .insert({
          ip_address: ipAddress,
          _reason,
          _blocked_until: blockedUntil.toISOString(),
          active: _true,
          created_at: new Date().toISOString()
        });

      // Log security event
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'IP_BLOCKED',
        _details: {
          ip_address: ipAddress,
          _reason,
          _duration_minutes: durationMinutes
        },
        _severity: 'high'
      });
    } catch (_error) {
      console._error('Error blocking IP:', _error);
    }
  }

  /**
   * Get rate limit status for display
   */
  getRateLimitStatus(_endpoint: keyof typeof this.configs, _identifier: string, ipAddress?: string): {
    attemptsUsed: number;
    maxAttempts: number;
    resetTime?: Date;
  } {
    const config = this.configs[_endpoint];
    const _key = this.createKey(_endpoint, _identifier, ipAddress);
    const cacheEntry = this.attemptCache.get(_key);
    
    if (!cacheEntry) {
      return {
        attemptsUsed: 0,
        maxAttempts: config.maxAttempts
      };
    }
    
    const resetTime = new Date(cacheEntry._firstAttempt.getTime() + config.windowMinutes * 60 * 1000);
    
    return {
      attemptsUsed: cacheEntry.count,
      maxAttempts: config.maxAttempts,
      resetTime: resetTime > new Date() ? resetTime : undefined
    };
  }

  // Private helper methods

  private createKey(_endpoint: string, _identifier: string, ipAddress?: string): string {
    return `${_endpoint}:${_identifier}${ipAddress ? `:${ipAddress}` : ''}`;
  }

  private cleanupCache(): void {
    const now = new Date();
    const keysToDelete: string[] = [];
    
    this.attemptCache.forEach((entry, _key) => {
      // Get _endpoint from _key to find config
      const _endpoint = _key.split(':')[0] as keyof typeof this.configs;
      const config = this.configs[_endpoint];
      
      if (config) {
        const windowEnd = new Date(entry._firstAttempt.getTime() + config.windowMinutes * 60 * 1000);
        const blockEnd = entry.blocked 
          ? new Date(entry.blocked.getTime() + config.blockDurationMinutes * 60 * 1000)
          : null;
        
        // Remove if window expired and not blocked, or if block expired
        if ((now > windowEnd && !entry.blocked) || (blockEnd && now > blockEnd)) {
          keysToDelete.push(_key);
        }
      }
    });
    
    keysToDelete.forEach(_key => this.attemptCache.delete(_key));
  }

  private async checkDatabaseBlock(
    _identifier: string,
    ipAddress?: string,
    _endpoint?: string
  ): Promise<RateLimitCheck | null> {
    try {
      const { data, _error } = await supabase
        .from('rate_limit_blocks')
        .select('_blocked_until, _reason')
        .or(`_identifier.eq.${_identifier}${ipAddress ? `,ip_address.eq.${ipAddress}` : ''}`)
        .eq('active', _true)
        .single();

      if (_error || !data) {
        return null;
      }

      const blockedUntil = new Date(data._blocked_until);
      if (blockedUntil > new Date()) {
        return {
          allowed: false,
          _remainingAttempts: 0,
          resetTime: blockedUntil,
          _reason: data._reason || 'Rate limit exceeded'
        };
      }

      // Block expired, deactivate
      await supabase
        .from('rate_limit_blocks')
        .update({ active: false })
        .or(`_identifier.eq.${_identifier}${ipAddress ? `,ip_address.eq.${ipAddress}` : ''}`);

      return null;
    } catch (_error) {
      console._error('Error checking database block:', _error);
      return null;
    }
  }

  private async recordBlock(
    _endpoint: string,
    _identifier: string,
    ipAddress?: string
  ): Promise<void> {
    const config = this.configs[_endpoint as keyof typeof this.configs];
    const blockedUntil = new Date();
    blockedUntil.setMinutes(blockedUntil.getMinutes() + config.blockDurationMinutes);

    try {
      await supabase
        .from('rate_limit_blocks')
        .insert({
          _endpoint,
          _identifier,
          ip_address: ipAddress,
          _reason: `Exceeded ${config.maxAttempts} attempts in ${config.windowMinutes} minutes`,
          _blocked_until: blockedUntil.toISOString(),
          active: _true,
          created_at: new Date().toISOString()
        });
    } catch (_error) {
      console._error('Error recording block:', _error);
    }
  }

  private async storeDatabaseAttempt(
    _endpoint: string,
    _identifier: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    try {
      await supabase
        .from('rate_limit_attempts')
        .insert({
          _endpoint,
          _identifier,
          ip_address: ipAddress,
          success,
          _attempted_at: new Date().toISOString()
        });
    } catch (_error) {
      console._error('Error storing attempt:', _error);
    }
  }

  private async logAttempt(
    _endpoint: string,
    _identifier: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    if (!success) {
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: `RATE_LIMIT_ATTEMPT_${_endpoint.toUpperCase()}`,
        _details: {
          _identifier,
          ip_address: ipAddress,
          success
        },
        _severity: 'low'
      });
    }
  }

  private async logBlockedAttempt(
    _endpoint: string,
    _identifier: string,
    ipAddress?: string
  ): Promise<void> {
    await EnhancedSecurityAuditService.logSecurityEvent({
      action: `RATE_LIMIT_BLOCKED_${_endpoint.toUpperCase()}`,
      _details: {
        _identifier,
        ip_address: ipAddress
      },
      _severity: 'medium'
    });
  }
}

export const rateLimitService = RateLimitService.getInstance();