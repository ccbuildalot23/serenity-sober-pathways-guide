import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import Redis from 'ioredis';
import { config } from '@/config';
import { logger, auditLogger } from '@/utils/logger';
import { InAppPayload, NotificationStatus } from '@/types';
import { EncryptionService } from '../EncryptionService';
import { notificationModel } from '@/models/NotificationModel';

export class InAppService {
  private io: SocketIOServer | null = null;
  private redis: Redis;
  private encryptionService: EncryptionService;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor() {
    this.redis = new Redis(config.redis.url);
    this.encryptionService = new EncryptionService();
    this.setupRedisListeners();
  }

  initializeSocketServer(httpServer: any): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupSocketHandlers();
    logger.info('Socket.IO server initialized for in-app notifications');
  }

  private setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.use(async (socket, next) => {
      try {
        // Authenticate socket connection
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify JWT token (implementation depends on your auth system)
        const userId = await this.verifyToken(token);
        if (!userId) {
          return next(new Error('Invalid authentication token'));
        }

        socket.userId = userId;
        next();
      } catch (error) {
        logger.error('Socket authentication failed', { error });
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = socket.userId;
      
      if (!userId) {
        socket.disconnect();
        return;
      }

      // Track connected user
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socket.id);

      // Join user to their personal room
      socket.join(`user:${userId}`);

      logger.info('User connected to in-app notifications', {
        userId,
        socketId: socket.id,
        totalConnections: this.connectedUsers.get(userId)!.size
      });

      // Send unread notifications on connection
      this.sendUnreadNotifications(userId);

      // Handle notification acknowledgment
      socket.on('notification:read', async (notificationId: string) => {
        try {
          await notificationModel.markAsRead(notificationId, userId);
          
          // Broadcast read status to all user's connections
          this.io!.to(`user:${userId}`).emit('notification:read', {
            notificationId,
            readAt: new Date().toISOString()
          });

          logger.debug('Notification marked as read', { notificationId, userId });
        } catch (error) {
          logger.error('Failed to mark notification as read', { notificationId, userId, error });
        }
      });

      // Handle typing indicators for support chat
      socket.on('typing:start', (data) => {
        socket.to(`user:${data.targetUserId}`).emit('typing:start', {
          userId,
          timestamp: new Date().toISOString()
        });
      });

      socket.on('typing:stop', (data) => {
        socket.to(`user:${data.targetUserId}`).emit('typing:stop', {
          userId,
          timestamp: new Date().toISOString()
        });
      });

      // Handle presence updates
      socket.on('presence:update', (status: 'online' | 'away' | 'busy') => {
        this.updateUserPresence(userId, status);
      });

      socket.on('disconnect', (reason) => {
        // Remove socket from user's connections
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.connectedUsers.delete(userId);
            this.updateUserPresence(userId, 'offline');
          }
        }

        logger.info('User disconnected from in-app notifications', {
          userId,
          socketId: socket.id,
          reason,
          remainingConnections: userSockets?.size || 0
        });
      });
    });
  }

  async sendInAppNotification(payload: InAppPayload, isHipaaCompliant: boolean = false): Promise<{
    success: boolean;
    delivered: boolean;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      // Check if user is connected
      const isUserOnline = this.connectedUsers.has(payload.userId);

      // Encrypt content if HIPAA compliant
      let processedPayload = payload;
      if (isHipaaCompliant) {
        processedPayload = await this.encryptHipaaContent(payload);
      }

      // Prepare notification data
      const notificationData = {
        id: payload.data?.notificationId || this.generateNotificationId(),
        title: processedPayload.title,
        message: processedPayload.message,
        data: processedPayload.data,
        actionUrl: processedPayload.actionUrl,
        expiresAt: processedPayload.expiresAt,
        timestamp: new Date().toISOString(),
        isHipaaCompliant,
        priority: payload.data?.priority || 'normal'
      };

      if (isUserOnline && this.io) {
        // Send to connected user immediately
        this.io.to(`user:${payload.userId}`).emit('notification:new', notificationData);
        
        logger.info('In-app notification sent to online user', {
          userId: payload.userId,
          notificationId: notificationData.id,
          title: payload.title,
          isHipaaCompliant,
          deliveryTime: Date.now() - startTime
        });

        // Store in Redis for persistence and offline delivery
        await this.storeNotificationForUser(payload.userId, notificationData);

        // HIPAA audit logging
        if (isHipaaCompliant) {
          auditLogger.info('HIPAA in-app notification sent', {
            userId: payload.userId,
            notificationId: notificationData.id,
            timestamp: new Date().toISOString(),
            deliveryTime: Date.now() - startTime,
            encryptionUsed: true,
            delivered: true
          });
        }

        return {
          success: true,
          delivered: true
        };
      } else {
        // User offline, store for later delivery
        await this.storeNotificationForUser(payload.userId, notificationData);
        
        logger.info('In-app notification stored for offline user', {
          userId: payload.userId,
          notificationId: notificationData.id,
          title: payload.title,
          isHipaaCompliant
        });

        return {
          success: true,
          delivered: false
        };
      }

    } catch (error: any) {
      logger.error('Failed to send in-app notification', {
        userId: payload.userId,
        title: payload.title,
        error: error.message,
        isHipaaCompliant
      });

      return {
        success: false,
        delivered: false,
        error: error.message
      };
    }
  }

  async sendBroadcast(
    title: string,
    message: string,
    data?: Record<string, any>,
    targetUserIds?: string[],
    isHipaaCompliant: boolean = false
  ): Promise<{
    success: boolean;
    deliveredCount: number;
    storedCount: number;
  }> {
    try {
      let deliveredCount = 0;
      let storedCount = 0;

      if (targetUserIds && targetUserIds.length > 0) {
        // Send to specific users
        for (const userId of targetUserIds) {
          const result = await this.sendInAppNotification({
            userId,
            title,
            message,
            data
          }, isHipaaCompliant);

          if (result.delivered) {
            deliveredCount++;
          } else if (result.success) {
            storedCount++;
          }
        }
      } else if (this.io) {
        // Broadcast to all connected users
        const notificationData = {
          id: this.generateNotificationId(),
          title: isHipaaCompliant ? await this.encryptionService.encryptHipaaData(title) : title,
          message: isHipaaCompliant ? await this.encryptionService.encryptHipaaData(message) : message,
          data,
          timestamp: new Date().toISOString(),
          isHipaaCompliant,
          isBroadcast: true
        };

        this.io.emit('notification:broadcast', notificationData);
        deliveredCount = this.io.sockets.sockets.size;

        logger.info('Broadcast notification sent', {
          notificationId: notificationData.id,
          title,
          connectedUsers: deliveredCount,
          isHipaaCompliant
        });
      }

      return {
        success: true,
        deliveredCount,
        storedCount
      };

    } catch (error: any) {
      logger.error('Failed to send broadcast notification', {
        title,
        error: error.message,
        isHipaaCompliant
      });

      return {
        success: false,
        deliveredCount: 0,
        storedCount: 0
      };
    }
  }

  async getUnreadNotifications(userId: string): Promise<any[]> {
    try {
      const notifications = await this.redis.lrange(`notifications:${userId}`, 0, -1);
      return notifications.map(n => JSON.parse(n)).filter(n => !n.read);
    } catch (error) {
      logger.error('Failed to get unread notifications', { userId, error });
      return [];
    }
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
    try {
      const notifications = await this.redis.lrange(`notifications:${userId}`, 0, -1);
      const updatedNotifications = notifications.map(n => {
        const parsed = JSON.parse(n);
        if (parsed.id === notificationId) {
          parsed.read = true;
          parsed.readAt = new Date().toISOString();
        }
        return JSON.stringify(parsed);
      });

      await this.redis.del(`notifications:${userId}`);
      if (updatedNotifications.length > 0) {
        await this.redis.lpush(`notifications:${userId}`, ...updatedNotifications);
      }

      return true;
    } catch (error) {
      logger.error('Failed to mark notification as read', { userId, notificationId, error });
      return false;
    }
  }

  private async sendUnreadNotifications(userId: string): Promise<void> {
    try {
      const unreadNotifications = await this.getUnreadNotifications(userId);
      
      if (unreadNotifications.length > 0 && this.io) {
        this.io.to(`user:${userId}`).emit('notifications:unread', {
          notifications: unreadNotifications,
          count: unreadNotifications.length
        });

        logger.debug('Sent unread notifications to user', {
          userId,
          count: unreadNotifications.length
        });
      }
    } catch (error) {
      logger.error('Failed to send unread notifications', { userId, error });
    }
  }

  private async storeNotificationForUser(userId: string, notification: any): Promise<void> {
    try {
      // Store with TTL based on expiration
      const ttl = notification.expiresAt 
        ? Math.floor((new Date(notification.expiresAt).getTime() - Date.now()) / 1000)
        : 86400 * 7; // 7 days default

      await this.redis.lpush(`notifications:${userId}`, JSON.stringify(notification));
      await this.redis.expire(`notifications:${userId}`, ttl);

      // Limit to last 100 notifications per user
      await this.redis.ltrim(`notifications:${userId}`, 0, 99);
    } catch (error) {
      logger.error('Failed to store notification for user', { userId, error });
    }
  }

  private async encryptHipaaContent(payload: InAppPayload): Promise<InAppPayload> {
    try {
      const encryptedTitle = await this.encryptionService.encryptHipaaData(payload.title);
      const encryptedMessage = await this.encryptionService.encryptHipaaData(payload.message);
      
      return {
        ...payload,
        title: encryptedTitle,
        message: encryptedMessage,
        data: {
          ...payload.data,
          encrypted: true
        }
      };
    } catch (error) {
      logger.error('Failed to encrypt HIPAA in-app notification content', { error });
      throw error;
    }
  }

  private async verifyToken(token: string): Promise<string | null> {
    // Implement JWT verification logic here
    // This should return the userId if token is valid, null otherwise
    try {
      // Placeholder implementation
      // You would typically use jsonwebtoken library here
      return 'user-id-from-token';
    } catch (error) {
      return null;
    }
  }

  private generateNotificationId(): string {
    return this.encryptionService.generateSecureToken(16);
  }

  private async updateUserPresence(userId: string, status: string): Promise<void> {
    try {
      await this.redis.setex(`presence:${userId}`, 300, status); // 5 minutes TTL
      
      // Notify other users about presence change if needed
      if (this.io) {
        this.io.emit('presence:update', { userId, status, timestamp: new Date().toISOString() });
      }
    } catch (error) {
      logger.error('Failed to update user presence', { userId, status, error });
    }
  }

  private setupRedisListeners(): void {
    this.redis.on('error', (error) => {
      logger.error('Redis connection error in InAppService', { error });
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected for InAppService');
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('In-app service connection verification failed', { error });
      return false;
    }
  }

  async getConnectedUsersCount(): Promise<number> {
    return this.connectedUsers.size;
  }

  async getUserConnectionCount(userId: string): Promise<number> {
    return this.connectedUsers.get(userId)?.size || 0;
  }

  async close(): Promise<void> {
    if (this.io) {
      this.io.close();
    }
    await this.redis.quit();
    logger.info('InAppService connections closed');
  }
}

export const inAppService = new InAppService();