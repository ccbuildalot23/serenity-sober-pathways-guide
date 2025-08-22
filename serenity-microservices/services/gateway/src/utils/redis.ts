import Redis from 'ioredis';
import { createLogger } from './logger';
import config from '@config/index';

const logger = createLogger('Redis');

class RedisManager {
  private client: Redis;
  private cluster?: Redis.Cluster;
  private isCluster: boolean = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const { host, port, password, db, cluster_nodes } = config.redis;

    try {
      if (cluster_nodes && cluster_nodes.length > 0) {
        // Initialize Redis Cluster
        this.isCluster = true;
        const nodes = cluster_nodes.map(node => {
          const [nodeHost, nodePort] = node.split(':');
          return { host: nodeHost, port: parseInt(nodePort) };
        });

        this.cluster = new Redis.Cluster(nodes, {
          redisOptions: {
            password,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3
          },
          enableOfflineQueue: false
        });

        this.cluster.on('connect', () => {
          logger.info('Redis cluster connected successfully');
        });

        this.cluster.on('error', (error) => {
          logger.error('Redis cluster connection error:', error);
        });

        this.cluster.on('close', () => {
          logger.warn('Redis cluster connection closed');
        });

        this.client = this.cluster as any;
      } else {
        // Initialize single Redis instance
        this.client = new Redis({
          host,
          port,
          password,
          db,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: 3,
          enableOfflineQueue: false,
          lazyConnect: true
        });

        this.client.on('connect', () => {
          logger.info('Redis connected successfully');
        });

        this.client.on('error', (error) => {
          logger.error('Redis connection error:', error);
        });

        this.client.on('close', () => {
          logger.warn('Redis connection closed');
        });
      }
    } catch (error) {
      logger.error('Failed to initialize Redis client:', error);
      throw error;
    }
  }

  async connect(): Promise<void> {
    try {
      if (!this.isCluster) {
        await this.client.connect();
      }
      logger.info('Redis client connected');
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Redis client disconnected');
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  // Basic key-value operations
  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Error setting key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      logger.error(`Error deleting key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      logger.error(`Error setting expiration for key ${key}:`, error);
      return false;
    }
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    try {
      return await this.client.hget(key, field);
    } catch (error) {
      logger.error(`Error getting hash field ${field} from key ${key}:`, error);
      return null;
    }
  }

  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      await this.client.hset(key, field, value);
      return true;
    } catch (error) {
      logger.error(`Error setting hash field ${field} in key ${key}:`, error);
      return false;
    }
  }

  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      return await this.client.hgetall(key);
    } catch (error) {
      logger.error(`Error getting all hash fields from key ${key}:`, error);
      return null;
    }
  }

  async hdel(key: string, field: string): Promise<boolean> {
    try {
      const result = await this.client.hdel(key, field);
      return result > 0;
    } catch (error) {
      logger.error(`Error deleting hash field ${field} from key ${key}:`, error);
      return false;
    }
  }

  // List operations
  async lpush(key: string, value: string): Promise<number | null> {
    try {
      return await this.client.lpush(key, value);
    } catch (error) {
      logger.error(`Error pushing to list ${key}:`, error);
      return null;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      return await this.client.rpop(key);
    } catch (error) {
      logger.error(`Error popping from list ${key}:`, error);
      return null;
    }
  }

  async llen(key: string): Promise<number | null> {
    try {
      return await this.client.llen(key);
    } catch (error) {
      logger.error(`Error getting length of list ${key}:`, error);
      return null;
    }
  }

  // Set operations
  async sadd(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sadd(key, member);
      return result > 0;
    } catch (error) {
      logger.error(`Error adding member to set ${key}:`, error);
      return false;
    }
  }

  async srem(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.srem(key, member);
      return result > 0;
    } catch (error) {
      logger.error(`Error removing member from set ${key}:`, error);
      return false;
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.sismember(key, member);
      return result === 1;
    } catch (error) {
      logger.error(`Error checking membership in set ${key}:`, error);
      return false;
    }
  }

  async smembers(key: string): Promise<string[] | null> {
    try {
      return await this.client.smembers(key);
    } catch (error) {
      logger.error(`Error getting members of set ${key}:`, error);
      return null;
    }
  }

  // Sorted set operations
  async zadd(key: string, score: number, member: string): Promise<boolean> {
    try {
      const result = await this.client.zadd(key, score, member);
      return result > 0;
    } catch (error) {
      logger.error(`Error adding member to sorted set ${key}:`, error);
      return false;
    }
  }

  async zrem(key: string, member: string): Promise<boolean> {
    try {
      const result = await this.client.zrem(key, member);
      return result > 0;
    } catch (error) {
      logger.error(`Error removing member from sorted set ${key}:`, error);
      return false;
    }
  }

  async zrange(key: string, start: number, stop: number): Promise<string[] | null> {
    try {
      return await this.client.zrange(key, start, stop);
    } catch (error) {
      logger.error(`Error getting range from sorted set ${key}:`, error);
      return null;
    }
  }

  // Advanced operations
  async incr(key: string): Promise<number | null> {
    try {
      return await this.client.incr(key);
    } catch (error) {
      logger.error(`Error incrementing key ${key}:`, error);
      return null;
    }
  }

  async incrby(key: string, increment: number): Promise<number | null> {
    try {
      return await this.client.incrby(key, increment);
    } catch (error) {
      logger.error(`Error incrementing key ${key} by ${increment}:`, error);
      return null;
    }
  }

  async setWithLock(key: string, value: string, ttl: number = 30): Promise<boolean> {
    try {
      const result = await this.client.set(key, value, 'PX', ttl * 1000, 'NX');
      return result === 'OK';
    } catch (error) {
      logger.error(`Error setting lock for key ${key}:`, error);
      return false;
    }
  }

  async releaseLock(key: string, value: string): Promise<boolean> {
    const script = `
      if redis.call("GET", KEYS[1]) == ARGV[1] then
        return redis.call("DEL", KEYS[1])
      else
        return 0
      end
    `;
    try {
      const result = await this.client.eval(script, 1, key, value);
      return result === 1;
    } catch (error) {
      logger.error(`Error releasing lock for key ${key}:`, error);
      return false;
    }
  }

  // Cache operations with JSON serialization
  async setJSON(key: string, obj: any, ttl?: number): Promise<boolean> {
    try {
      const value = JSON.stringify(obj);
      return await this.set(key, value, ttl);
    } catch (error) {
      logger.error(`Error setting JSON for key ${key}:`, error);
      return false;
    }
  }

  async getJSON<T = any>(key: string): Promise<T | null> {
    try {
      const value = await this.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Error getting JSON for key ${key}:`, error);
      return null;
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  // Get client for advanced operations
  getClient(): Redis {
    return this.client;
  }
}

// Export singleton instance
export const redisManager = new RedisManager();
export default redisManager;