import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';

class RedisManager {
  private client: RedisClientType;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0'),
      socket: {
        reconnectStrategy: (retries) => {
          if (retries >= this.maxReconnectAttempts) {
            logger.error('Redis max reconnection attempts reached');
            return new Error('Redis connection failed');
          }
          const delay = Math.min(retries * 50, 1000);
          logger.warn(`Redis reconnection attempt ${retries + 1} in ${delay}ms`);
          return delay;
        }
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('Redis client connected and ready');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      logger.error('Redis client error', {
        error: err.message,
        stack: err.stack
      });
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis client disconnected');
    });

    this.client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.info(`Redis client reconnecting... (attempt ${this.reconnectAttempts})`);
    });
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      logger.info('Redis connection established');
    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis connection', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Session management
  async setSession(sessionId: string, sessionData: any, ttl: number): Promise<void> {
    try {
      const key = `session:${sessionId}`;
      await this.client.setEx(key, ttl, JSON.stringify(sessionData));
      logger.debug('Session stored in Redis', { sessionId, ttl });
    } catch (error) {
      logger.error('Failed to store session in Redis', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<any> {
    try {
      const key = `session:${sessionId}`;
      const sessionData = await this.client.get(key);
      if (sessionData) {
        logger.debug('Session retrieved from Redis', { sessionId });
        return JSON.parse(sessionData);
      }
      return null;
    } catch (error) {
      logger.error('Failed to retrieve session from Redis', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    try {
      const key = `session:${sessionId}`;
      await this.client.del(key);
      logger.debug('Session deleted from Redis', { sessionId });
    } catch (error) {
      logger.error('Failed to delete session from Redis', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async deleteUserSessions(userId: string): Promise<void> {
    try {
      const pattern = `session:*`;
      const keys = await this.client.keys(pattern);
      
      for (const key of keys) {
        const sessionData = await this.client.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.userId === userId) {
            await this.client.del(key);
          }
        }
      }
      
      logger.debug('All user sessions deleted from Redis', { userId });
    } catch (error) {
      logger.error('Failed to delete user sessions from Redis', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Rate limiting
  async incrementRateLimit(key: string, window: number, max: number): Promise<{
    count: number;
    remaining: number;
    reset: number;
    blocked: boolean;
  }> {
    try {
      const pipeline = this.client.multi();
      pipeline.incr(key);
      pipeline.expire(key, window);
      
      const results = await pipeline.exec();
      const count = results?.[0] as number || 0;
      
      const remaining = Math.max(0, max - count);
      const reset = Math.floor(Date.now() / 1000) + window;
      const blocked = count > max;

      logger.debug('Rate limit check', { key, count, remaining, blocked });
      
      return { count, remaining, reset, blocked };
    } catch (error) {
      logger.error('Failed to check rate limit', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Brute force protection
  async recordFailedLogin(identifier: string): Promise<number> {
    try {
      const key = `failed_login:${identifier}`;
      const count = await this.client.incr(key);
      
      if (count === 1) {
        // Set expiration on first attempt
        await this.client.expire(key, parseInt(process.env.BRUTE_FORCE_DECAY_RATE || '3600'));
      }
      
      logger.debug('Failed login recorded', { identifier, count });
      return count;
    } catch (error) {
      logger.error('Failed to record failed login', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getFailedLoginCount(identifier: string): Promise<number> {
    try {
      const key = `failed_login:${identifier}`;
      const count = await this.client.get(key);
      return parseInt(count || '0');
    } catch (error) {
      logger.error('Failed to get failed login count', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  async clearFailedLogins(identifier: string): Promise<void> {
    try {
      const key = `failed_login:${identifier}`;
      await this.client.del(key);
      logger.debug('Failed login count cleared', { identifier });
    } catch (error) {
      logger.error('Failed to clear failed login count', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async lockAccount(identifier: string, duration: number): Promise<void> {
    try {
      const key = `account_locked:${identifier}`;
      await this.client.setEx(key, duration, 'locked');
      logger.info('Account locked', { identifier, duration });
    } catch (error) {
      logger.error('Failed to lock account', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async isAccountLocked(identifier: string): Promise<boolean> {
    try {
      const key = `account_locked:${identifier}`;
      const locked = await this.client.get(key);
      return locked === 'locked';
    } catch (error) {
      logger.error('Failed to check account lock status', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  async unlockAccount(identifier: string): Promise<void> {
    try {
      const key = `account_locked:${identifier}`;
      await this.client.del(key);
      await this.clearFailedLogins(identifier);
      logger.info('Account unlocked', { identifier });
    } catch (error) {
      logger.error('Failed to unlock account', {
        identifier,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  // Cache management
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error('Failed to set cache value', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Failed to get cache value', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error('Failed to delete cache value', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async healthCheck(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      await this.client.ping();
      const responseTime = Date.now() - start;
      return { status: 'healthy', responseTime };
    } catch (error) {
      const responseTime = Date.now() - start;
      return { status: 'unhealthy', responseTime };
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const redis = new RedisManager();