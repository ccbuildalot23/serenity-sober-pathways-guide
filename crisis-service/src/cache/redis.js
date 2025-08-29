/**
 * Redis Cache and Pub/Sub System
 * High-performance caching and real-time messaging for crisis management
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('../config/config');

class RedisManager {
    constructor() {
        this.client = null;
        this.subscriber = null;
        this.publisher = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        
        // Event handlers registry
        this.eventHandlers = new Map();
    }

    async connect() {
        try {
            logger.info('Connecting to Redis...');

            const redisOptions = {
                ...config.redis,
                retryDelayOnFailover: config.redis.retryDelayOnFailover,
                maxRetriesPerRequest: 3,
                lazyConnect: false,
                keepAlive: 30000,
                family: 4,
                enableOfflineQueue: true,
                
                // Connection retry strategy
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: null,
                retryConnect: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    logger.info(`Redis reconnection attempt ${times}, delay: ${delay}ms`);
                    return delay;
                }
            };

            // Main client for regular operations
            this.client = new Redis(redisOptions);
            
            // Dedicated subscriber client
            this.subscriber = new Redis(redisOptions);
            
            // Dedicated publisher client
            this.publisher = new Redis(redisOptions);

            // Setup event listeners
            this.setupEventListeners();

            // Test connections
            await Promise.all([
                this.client.ping(),
                this.subscriber.ping(),
                this.publisher.ping()
            ]);

            this.isConnected = true;
            this.reconnectAttempts = 0;

            logger.info('Redis connected successfully');

            // Initialize crisis-specific channels
            await this.initializeCrisisChannels();

            return this.client;
        } catch (error) {
            logger.error('Redis connection failed:', error);
            this.handleConnectionError();
            throw error;
        }
    }

    setupEventListeners() {
        // Main client events
        this.client.on('connect', () => {
            logger.debug('Redis client connected');
            this.isConnected = true;
        });

        this.client.on('ready', () => {
            logger.debug('Redis client ready');
        });

        this.client.on('error', (err) => {
            logger.error('Redis client error:', err);
            this.handleConnectionError();
        });

        this.client.on('close', () => {
            logger.warn('Redis client connection closed');
            this.isConnected = false;
        });

        this.client.on('reconnecting', (delay) => {
            logger.info(`Redis client reconnecting in ${delay}ms`);
        });

        // Subscriber events
        this.subscriber.on('error', (err) => {
            logger.error('Redis subscriber error:', err);
        });

        this.subscriber.on('message', (channel, message) => {
            this.handleMessage(channel, message);
        });

        // Publisher events
        this.publisher.on('error', (err) => {
            logger.error('Redis publisher error:', err);
        });
    }

    async handleConnectionError() {
        this.isConnected = false;
        this.reconnectAttempts++;

        if (this.reconnectAttempts <= this.maxReconnectAttempts) {
            const delay = Math.min(this.reconnectAttempts * 1000, 30000);
            logger.info(`Attempting Redis reconnection in ${delay}ms (attempt ${this.reconnectAttempts})`);
            
            setTimeout(() => {
                this.connect().catch(err => {
                    logger.error('Redis reconnection failed:', err);
                });
            }, delay);
        } else {
            logger.error('Max Redis reconnection attempts exceeded');
        }
    }

    async initializeCrisisChannels() {
        try {
            // Subscribe to crisis-related channels
            const channels = [
                'crisis:alerts',
                'crisis:escalations',
                'crisis:responses',
                'location:updates',
                'safety:checkins',
                'emergency:notifications'
            ];

            await this.subscriber.subscribe(...channels);
            logger.info(`Subscribed to ${channels.length} crisis channels`);

        } catch (error) {
            logger.error('Error initializing crisis channels:', error);
        }
    }

    handleMessage(channel, message) {
        try {
            const data = JSON.parse(message);
            const handlers = this.eventHandlers.get(channel) || [];
            
            logger.debug(`Received message on channel ${channel}:`, data);

            // Call all registered handlers for this channel
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    logger.error(`Error in message handler for channel ${channel}:`, error);
                }
            });

        } catch (error) {
            logger.error(`Error handling message from channel ${channel}:`, error);
        }
    }

    // Public methods for crisis management

    async publishCrisisAlert(userId, crisisData) {
        try {
            const message = {
                userId,
                timestamp: new Date().toISOString(),
                ...crisisData
            };

            await this.publisher.publish('crisis:alerts', JSON.stringify(message));
            
            logger.crisis('Crisis alert published', crisisData.severity, {
                userId,
                channel: 'crisis:alerts'
            });

            return true;
        } catch (error) {
            logger.error('Error publishing crisis alert:', error);
            return false;
        }
    }

    async publishEscalation(escalationData) {
        try {
            const message = {
                timestamp: new Date().toISOString(),
                ...escalationData
            };

            await this.publisher.publish('crisis:escalations', JSON.stringify(message));
            
            logger.info('Escalation published', {
                crisisId: escalationData.crisisId,
                level: escalationData.level
            });

            return true;
        } catch (error) {
            logger.error('Error publishing escalation:', error);
            return false;
        }
    }

    async publishLocationUpdate(userId, locationData) {
        try {
            const message = {
                userId,
                timestamp: new Date().toISOString(),
                ...locationData
            };

            await this.publisher.publish('location:updates', JSON.stringify(message));
            return true;
        } catch (error) {
            logger.error('Error publishing location update:', error);
            return false;
        }
    }

    async publishSafetyCheckin(userId, checkinData) {
        try {
            const message = {
                userId,
                timestamp: new Date().toISOString(),
                ...checkinData
            };

            await this.publisher.publish('safety:checkins', JSON.stringify(message));
            return true;
        } catch (error) {
            logger.error('Error publishing safety checkin:', error);
            return false;
        }
    }

    // Event handler registration
    onCrisisAlert(handler) {
        this.addEventListener('crisis:alerts', handler);
    }

    onEscalation(handler) {
        this.addEventListener('crisis:escalations', handler);
    }

    onLocationUpdate(handler) {
        this.addEventListener('location:updates', handler);
    }

    onSafetyCheckin(handler) {
        this.addEventListener('safety:checkins', handler);
    }

    addEventListener(channel, handler) {
        if (!this.eventHandlers.has(channel)) {
            this.eventHandlers.set(channel, []);
        }
        this.eventHandlers.get(channel).push(handler);
    }

    // Cache operations for crisis data

    async cacheUserBaseline(userId, baseline) {
        try {
            const key = `baseline:${userId}`;
            const data = {
                ...baseline,
                lastUpdated: new Date().toISOString()
            };

            await this.client.hset(key, data);
            await this.client.expire(key, 30 * 24 * 60 * 60); // 30 days

            return true;
        } catch (error) {
            logger.error('Error caching user baseline:', error);
            return false;
        }
    }

    async getUserBaseline(userId) {
        try {
            const key = `baseline:${userId}`;
            const baseline = await this.client.hgetall(key);
            
            if (baseline && Object.keys(baseline).length > 0) {
                return baseline;
            }
            return null;
        } catch (error) {
            logger.error('Error getting user baseline:', error);
            return null;
        }
    }

    async cacheDetectionResult(userId, result) {
        try {
            const key = `detection:${userId}:${Date.now()}`;
            const data = {
                ...result,
                timestamp: new Date().toISOString()
            };

            await this.client.hset(key, data);
            await this.client.expire(key, 7 * 24 * 60 * 60); // 7 days

            // Maintain list of recent detections
            const recentKey = `recent_detections:${userId}`;
            await this.client.lpush(recentKey, key);
            await this.client.ltrim(recentKey, 0, 99); // Keep last 100
            await this.client.expire(recentKey, 7 * 24 * 60 * 60);

            return true;
        } catch (error) {
            logger.error('Error caching detection result:', error);
            return false;
        }
    }

    async getRecentDetections(userId, limit = 10) {
        try {
            const recentKey = `recent_detections:${userId}`;
            const detectionKeys = await this.client.lrange(recentKey, 0, limit - 1);
            
            if (detectionKeys.length === 0) return [];

            const pipeline = this.client.pipeline();
            detectionKeys.forEach(key => pipeline.hgetall(key));
            
            const results = await pipeline.exec();
            return results.map(([err, result]) => err ? null : result).filter(Boolean);
        } catch (error) {
            logger.error('Error getting recent detections:', error);
            return [];
        }
    }

    async cacheEmergencyContacts(userId, contacts) {
        try {
            const key = `emergency_contacts:${userId}`;
            await this.client.set(key, JSON.stringify(contacts));
            await this.client.expire(key, 24 * 60 * 60); // 24 hours

            return true;
        } catch (error) {
            logger.error('Error caching emergency contacts:', error);
            return false;
        }
    }

    async getEmergencyContacts(userId) {
        try {
            const key = `emergency_contacts:${userId}`;
            const contacts = await this.client.get(key);
            
            return contacts ? JSON.parse(contacts) : null;
        } catch (error) {
            logger.error('Error getting emergency contacts:', error);
            return null;
        }
    }

    async cacheUserLocation(userId, location) {
        try {
            const key = `location:${userId}`;
            const data = {
                ...location,
                timestamp: new Date().toISOString()
            };

            await this.client.hset(key, data);
            await this.client.expire(key, 60 * 60); // 1 hour

            return true;
        } catch (error) {
            logger.error('Error caching user location:', error);
            return false;
        }
    }

    async getUserLocation(userId) {
        try {
            const key = `location:${userId}`;
            return await this.client.hgetall(key);
        } catch (error) {
            logger.error('Error getting user location:', error);
            return null;
        }
    }

    // Session management for real-time connections
    async addUserSession(userId, sessionId, socketId) {
        try {
            const key = `sessions:${userId}`;
            const sessionData = {
                sessionId,
                socketId,
                connectedAt: new Date().toISOString()
            };

            await this.client.hset(key, sessionId, JSON.stringify(sessionData));
            await this.client.expire(key, 24 * 60 * 60); // 24 hours

            // Add to active users set
            await this.client.sadd('active_users', userId);

            return true;
        } catch (error) {
            logger.error('Error adding user session:', error);
            return false;
        }
    }

    async removeUserSession(userId, sessionId) {
        try {
            const key = `sessions:${userId}`;
            await this.client.hdel(key, sessionId);

            // Check if user has any active sessions
            const sessions = await this.client.hlen(key);
            if (sessions === 0) {
                await this.client.srem('active_users', userId);
            }

            return true;
        } catch (error) {
            logger.error('Error removing user session:', error);
            return false;
        }
    }

    async getUserSessions(userId) {
        try {
            const key = `sessions:${userId}`;
            const sessions = await this.client.hgetall(key);
            
            const result = {};
            for (const [sessionId, data] of Object.entries(sessions)) {
                result[sessionId] = JSON.parse(data);
            }

            return result;
        } catch (error) {
            logger.error('Error getting user sessions:', error);
            return {};
        }
    }

    async getActiveUsers() {
        try {
            return await this.client.smembers('active_users');
        } catch (error) {
            logger.error('Error getting active users:', error);
            return [];
        }
    }

    // Performance monitoring
    async recordPerformanceMetric(metric, value, tags = {}) {
        try {
            const key = `metrics:${metric}`;
            const timestamp = Date.now();
            
            const data = {
                value,
                timestamp,
                ...tags
            };

            await this.client.zadd(key, timestamp, JSON.stringify(data));
            
            // Keep only last 1000 entries
            await this.client.zremrangebyrank(key, 0, -1001);
            
            return true;
        } catch (error) {
            logger.error('Error recording performance metric:', error);
            return false;
        }
    }

    // Health check
    async healthCheck() {
        try {
            const start = Date.now();
            await this.client.ping();
            const responseTime = Date.now() - start;
            
            return {
                status: 'healthy',
                responseTime,
                isConnected: this.isConnected
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                isConnected: false
            };
        }
    }

    async close() {
        logger.info('Closing Redis connections...');
        
        if (this.client) {
            await this.client.quit();
        }
        
        if (this.subscriber) {
            await this.subscriber.quit();
        }
        
        if (this.publisher) {
            await this.publisher.quit();
        }
        
        this.isConnected = false;
        logger.info('Redis connections closed');
    }

    getClient() {
        return this.client;
    }

    isHealthy() {
        return this.isConnected && this.client && this.client.status === 'ready';
    }
}

// Singleton instance
let redisInstance = null;

async function connectRedis() {
    if (!redisInstance) {
        redisInstance = new RedisManager();
        await redisInstance.connect();
    }
    return redisInstance;
}

function getRedisClient() {
    if (!redisInstance) {
        throw new Error('Redis not connected. Call connectRedis() first.');
    }
    return redisInstance.getClient();
}

function getRedisManager() {
    if (!redisInstance) {
        throw new Error('Redis not connected. Call connectRedis() first.');
    }
    return redisInstance;
}

module.exports = {
    connectRedis,
    getRedisClient,
    getRedisManager
};