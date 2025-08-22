import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import WebSocket from 'ws';
import { createLogger, securityLogger } from '@utils/logger';
import { redisManager } from '@utils/redis';
import { getClientIp, getUserAgent } from '@utils/helpers';
import { serviceDiscovery } from './serviceDiscovery';
import { loadBalancer } from './loadBalancer';
import { jwtAuth } from '@middleware/auth';
import { WebSocketConnection } from '@types/index';
import config from '@config/index';

const logger = createLogger('WebSocketProxy');

export class WebSocketProxyService {
  private io: SocketIOServer;
  private connections: Map<string, WebSocketConnection> = new Map();
  private serviceProxies: Map<string, WebSocket> = new Map();
  private heartbeatInterval: NodeJS.Timer | null = null;

  constructor(server: HttpServer) {
    this.io = new SocketIOServer(server, {
      path: process.env.WS_PATH || '/ws',
      cors: {
        origin: config.security.cors.origin,
        credentials: config.security.cors.credentials,
        methods: ['GET', 'POST']
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      upgradeTimeout: 10000,
      allowEIO3: true,
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    
    logger.info('WebSocket proxy service initialized');
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', this.handleConnection.bind(this));
    
    // Global error handler
    this.io.engine.on('connection_error', (err) => {
      logger.error('WebSocket connection error:', err);
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(socket: Socket): Promise<void> {
    try {
      const clientIp = getClientIp(socket.request as any);
      const userAgent = getUserAgent(socket.request as any);
      
      logger.info('New WebSocket connection', {
        socket_id: socket.id,
        ip: clientIp,
        user_agent: userAgent
      });

      // Authenticate connection
      await this.authenticateConnection(socket);

      // Setup connection tracking
      this.trackConnection(socket);

      // Setup event handlers for this connection
      this.setupConnectionHandlers(socket);

      // Setup service-specific handlers
      this.setupServiceHandlers(socket);

    } catch (error) {
      logger.error('Connection handling error:', error);
      socket.disconnect(true);
    }
  }

  /**
   * Authenticate WebSocket connection
   */
  private async authenticateConnection(socket: Socket): Promise<void> {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      securityLogger.warn('WebSocket connection without token', {
        socket_id: socket.id,
        ip: getClientIp(socket.request as any)
      });
      throw new Error('Authentication required');
    }

    try {
      // Create fake request object for auth middleware
      const fakeReq = {
        headers: { authorization: `Bearer ${token}` },
        request_id: socket.id,
        ...socket.request
      } as any;

      const fakeRes = {} as any;
      
      await new Promise<void>((resolve, reject) => {
        jwtAuth(fakeReq, fakeRes, (error) => {
          if (error) reject(error);
          else resolve();
        });
      });

      // Store user info in socket
      socket.data.user = fakeReq.user;
      
      securityLogger.info('WebSocket authentication successful', {
        socket_id: socket.id,
        user_id: fakeReq.user?.id,
        ip: getClientIp(socket.request as any)
      });

    } catch (error) {
      securityLogger.warn('WebSocket authentication failed', {
        socket_id: socket.id,
        ip: getClientIp(socket.request as any),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Track WebSocket connection
   */
  private trackConnection(socket: Socket): void {
    const connection: WebSocketConnection = {
      id: socket.id,
      user_id: socket.data.user?.id,
      service: 'gateway',
      connected_at: new Date(),
      last_activity: new Date(),
      metadata: {
        ip: getClientIp(socket.request as any),
        user_agent: getUserAgent(socket.request as any),
        rooms: []
      }
    };

    this.connections.set(socket.id, connection);

    // Store in Redis for cross-instance tracking
    this.storeConnectionInRedis(connection);
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(socket: Socket): void {
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
      this.updateLastActivity(socket.id);
    });

    // Handle room joining
    socket.on('join_room', (room: string) => {
      this.handleJoinRoom(socket, room);
    });

    // Handle room leaving
    socket.on('leave_room', (room: string) => {
      this.handleLeaveRoom(socket, room);
    });

    // Handle service subscription
    socket.on('subscribe_service', (serviceName: string) => {
      this.handleServiceSubscription(socket, serviceName);
    });

    // Handle service unsubscription
    socket.on('unsubscribe_service', (serviceName: string) => {
      this.handleServiceUnsubscription(socket, serviceName);
    });
  }

  /**
   * Setup service-specific event handlers
   */
  private setupServiceHandlers(socket: Socket): void {
    // Crisis service handlers
    socket.on('crisis:alert', (data) => {
      this.proxyCrisisAlert(socket, data);
    });

    socket.on('crisis:status', (data) => {
      this.proxyCrisisStatus(socket, data);
    });

    // Chat/messaging handlers
    socket.on('chat:message', (data) => {
      this.proxyChatMessage(socket, data);
    });

    socket.on('chat:typing', (data) => {
      this.proxyChatTyping(socket, data);
    });

    // Notification handlers
    socket.on('notifications:subscribe', (data) => {
      this.proxyNotificationSubscription(socket, data);
    });

    // Real-time data handlers
    socket.on('data:subscribe', (data) => {
      this.proxyDataSubscription(socket, data);
    });

    // Generic service proxy
    socket.on('service:request', (data) => {
      this.proxyServiceRequest(socket, data);
    });
  }

  /**
   * Handle room joining
   */
  private async handleJoinRoom(socket: Socket, room: string): Promise<void> {
    try {
      // Validate room access
      if (!await this.validateRoomAccess(socket, room)) {
        socket.emit('error', { code: 'ROOM_ACCESS_DENIED', message: 'Access denied to room' });
        return;
      }

      await socket.join(room);
      
      // Update connection metadata
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.metadata.rooms.push(room);
        this.connections.set(socket.id, connection);
        this.storeConnectionInRedis(connection);
      }

      socket.emit('room_joined', { room });
      
      logger.info(`Socket ${socket.id} joined room: ${room}`);
    } catch (error) {
      logger.error(`Error joining room ${room}:`, error);
      socket.emit('error', { code: 'ROOM_JOIN_ERROR', message: 'Failed to join room' });
    }
  }

  /**
   * Handle room leaving
   */
  private async handleLeaveRoom(socket: Socket, room: string): Promise<void> {
    try {
      await socket.leave(room);
      
      // Update connection metadata
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.metadata.rooms = connection.metadata.rooms.filter((r: string) => r !== room);
        this.connections.set(socket.id, connection);
        this.storeConnectionInRedis(connection);
      }

      socket.emit('room_left', { room });
      
      logger.info(`Socket ${socket.id} left room: ${room}`);
    } catch (error) {
      logger.error(`Error leaving room ${room}:`, error);
    }
  }

  /**
   * Handle service subscription
   */
  private async handleServiceSubscription(socket: Socket, serviceName: string): Promise<void> {
    try {
      // Check if service exists and is healthy
      if (!serviceDiscovery.isServiceAvailable(serviceName)) {
        socket.emit('service_error', { 
          service: serviceName, 
          error: 'Service not available' 
        });
        return;
      }

      // Create or get existing proxy connection to service
      await this.createServiceProxy(serviceName);
      
      // Add socket to service-specific room
      const serviceRoom = `service:${serviceName}`;
      await socket.join(serviceRoom);
      
      socket.emit('service_subscribed', { service: serviceName });
      
      logger.info(`Socket ${socket.id} subscribed to service: ${serviceName}`);
    } catch (error) {
      logger.error(`Error subscribing to service ${serviceName}:`, error);
      socket.emit('service_error', { 
        service: serviceName, 
        error: 'Subscription failed' 
      });
    }
  }

  /**
   * Handle service unsubscription
   */
  private async handleServiceUnsubscription(socket: Socket, serviceName: string): Promise<void> {
    try {
      const serviceRoom = `service:${serviceName}`;
      await socket.leave(serviceRoom);
      
      socket.emit('service_unsubscribed', { service: serviceName });
      
      logger.info(`Socket ${socket.id} unsubscribed from service: ${serviceName}`);
    } catch (error) {
      logger.error(`Error unsubscribing from service ${serviceName}:`, error);
    }
  }

  /**
   * Create proxy connection to backend service
   */
  private async createServiceProxy(serviceName: string): Promise<void> {
    if (this.serviceProxies.has(serviceName)) {
      return; // Proxy already exists
    }

    try {
      const instance = loadBalancer.selectInstance(serviceName);
      if (!instance) {
        throw new Error(`No healthy instances for service: ${serviceName}`);
      }

      const wsUrl = `ws://${instance.address}:${instance.port}/ws`;
      const proxy = new WebSocket(wsUrl);

      proxy.on('open', () => {
        logger.info(`Connected to service WebSocket: ${serviceName}`);
        this.serviceProxies.set(serviceName, proxy);
      });

      proxy.on('message', (data) => {
        this.handleServiceMessage(serviceName, data);
      });

      proxy.on('error', (error) => {
        logger.error(`Service WebSocket error for ${serviceName}:`, error);
        this.serviceProxies.delete(serviceName);
      });

      proxy.on('close', () => {
        logger.warn(`Service WebSocket closed for ${serviceName}`);
        this.serviceProxies.delete(serviceName);
        
        // Attempt reconnection after delay
        setTimeout(() => {
          this.createServiceProxy(serviceName);
        }, 5000);
      });

    } catch (error) {
      logger.error(`Failed to create service proxy for ${serviceName}:`, error);
    }
  }

  /**
   * Handle message from backend service
   */
  private handleServiceMessage(serviceName: string, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      const serviceRoom = `service:${serviceName}`;
      
      // Broadcast to all subscribers of this service
      this.io.to(serviceRoom).emit('service_message', {
        service: serviceName,
        data: message
      });

      // Handle specific message types
      switch (message.type) {
        case 'crisis_alert':
          this.handleCrisisAlert(message);
          break;
        case 'notification':
          this.handleNotification(message);
          break;
        case 'data_update':
          this.handleDataUpdate(serviceName, message);
          break;
      }

    } catch (error) {
      logger.error(`Error handling service message from ${serviceName}:`, error);
    }
  }

  /**
   * Handle crisis alert
   */
  private handleCrisisAlert(message: any): void {
    // Broadcast crisis alerts to all connected sockets
    this.io.emit('crisis_alert', message.data);
    
    // Log critical event
    securityLogger.error('Crisis alert broadcasted', {
      alert_id: message.data.id,
      user_id: message.data.user_id,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle notification
   */
  private handleNotification(message: any): void {
    const { user_id, notification } = message.data;
    
    // Send to specific user if they're connected
    this.sendToUser(user_id, 'notification', notification);
  }

  /**
   * Handle data update
   */
  private handleDataUpdate(serviceName: string, message: any): void {
    const { entity_type, entity_id, data } = message.data;
    
    // Broadcast to relevant rooms
    const entityRoom = `${entity_type}:${entity_id}`;
    this.io.to(entityRoom).emit('data_update', {
      service: serviceName,
      entity_type,
      entity_id,
      data
    });
  }

  /**
   * Proxy crisis alert
   */
  private async proxyCrisisAlert(socket: Socket, data: any): Promise<void> {
    try {
      const serviceProxy = this.serviceProxies.get('crisis-service');
      if (serviceProxy && serviceProxy.readyState === WebSocket.OPEN) {
        serviceProxy.send(JSON.stringify({
          type: 'crisis_alert',
          user_id: socket.data.user?.id,
          data
        }));
      } else {
        socket.emit('error', { code: 'SERVICE_UNAVAILABLE', message: 'Crisis service unavailable' });
      }
    } catch (error) {
      logger.error('Error proxying crisis alert:', error);
    }
  }

  /**
   * Proxy crisis status
   */
  private async proxyCrisisStatus(socket: Socket, data: any): Promise<void> {
    try {
      const serviceProxy = this.serviceProxies.get('crisis-service');
      if (serviceProxy && serviceProxy.readyState === WebSocket.OPEN) {
        serviceProxy.send(JSON.stringify({
          type: 'crisis_status',
          user_id: socket.data.user?.id,
          data
        }));
      } else {
        socket.emit('error', { code: 'SERVICE_UNAVAILABLE', message: 'Crisis service unavailable' });
      }
    } catch (error) {
      logger.error('Error proxying crisis status:', error);
    }
  }

  /**
   * Proxy chat message
   */
  private async proxyChatMessage(socket: Socket, data: any): Promise<void> {
    try {
      const serviceProxy = this.serviceProxies.get('communication-service');
      if (serviceProxy && serviceProxy.readyState === WebSocket.OPEN) {
        serviceProxy.send(JSON.stringify({
          type: 'chat_message',
          user_id: socket.data.user?.id,
          data
        }));
      } else {
        socket.emit('error', { code: 'SERVICE_UNAVAILABLE', message: 'Communication service unavailable' });
      }
    } catch (error) {
      logger.error('Error proxying chat message:', error);
    }
  }

  /**
   * Proxy chat typing indicator
   */
  private async proxyChatTyping(socket: Socket, data: any): Promise<void> {
    try {
      // Broadcast typing indicator to room participants
      const { room_id } = data;
      socket.to(`chat:${room_id}`).emit('chat:typing', {
        user_id: socket.data.user?.id,
        typing: data.typing
      });
    } catch (error) {
      logger.error('Error proxying chat typing:', error);
    }
  }

  /**
   * Proxy notification subscription
   */
  private async proxyNotificationSubscription(socket: Socket, data: any): Promise<void> {
    try {
      const serviceProxy = this.serviceProxies.get('notification-service');
      if (serviceProxy && serviceProxy.readyState === WebSocket.OPEN) {
        serviceProxy.send(JSON.stringify({
          type: 'notification_subscription',
          user_id: socket.data.user?.id,
          data
        }));
      }
    } catch (error) {
      logger.error('Error proxying notification subscription:', error);
    }
  }

  /**
   * Proxy data subscription
   */
  private async proxyDataSubscription(socket: Socket, data: any): Promise<void> {
    try {
      const { service, entity_type, entity_id } = data;
      
      // Join entity-specific room
      const entityRoom = `${entity_type}:${entity_id}`;
      await socket.join(entityRoom);
      
      socket.emit('data_subscribed', { entity_type, entity_id });
    } catch (error) {
      logger.error('Error proxying data subscription:', error);
    }
  }

  /**
   * Proxy generic service request
   */
  private async proxyServiceRequest(socket: Socket, data: any): Promise<void> {
    try {
      const { service, action, payload } = data;
      
      const serviceProxy = this.serviceProxies.get(service);
      if (serviceProxy && serviceProxy.readyState === WebSocket.OPEN) {
        serviceProxy.send(JSON.stringify({
          type: action,
          user_id: socket.data.user?.id,
          socket_id: socket.id,
          data: payload
        }));
      } else {
        socket.emit('service_error', { 
          service, 
          error: 'Service unavailable' 
        });
      }
    } catch (error) {
      logger.error('Error proxying service request:', error);
    }
  }

  /**
   * Send message to specific user
   */
  private sendToUser(userId: string, event: string, data: any): void {
    // Find all sockets for this user
    const userSockets = Array.from(this.connections.values())
      .filter(conn => conn.user_id === userId)
      .map(conn => conn.id);

    for (const socketId of userSockets) {
      this.io.to(socketId).emit(event, data);
    }
  }

  /**
   * Validate room access
   */
  private async validateRoomAccess(socket: Socket, room: string): Promise<boolean> {
    const user = socket.data.user;
    if (!user) return false;

    // Implement room access logic based on user role and permissions
    if (room.startsWith('admin:') && user.role !== 'admin') {
      return false;
    }

    if (room.startsWith('provider:') && !['provider', 'admin'].includes(user.role)) {
      return false;
    }

    if (room.startsWith('user:')) {
      const userId = room.split(':')[1];
      return user.id === userId || user.role === 'admin';
    }

    return true;
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(socket: Socket, reason: string): void {
    logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    
    // Clean up connection tracking
    this.connections.delete(socket.id);
    this.removeConnectionFromRedis(socket.id);
    
    // Notify services about disconnection
    this.notifyServicesOfDisconnection(socket);
  }

  /**
   * Notify services about disconnection
   */
  private notifyServicesOfDisconnection(socket: Socket): void {
    for (const [serviceName, proxy] of this.serviceProxies) {
      if (proxy.readyState === WebSocket.OPEN) {
        proxy.send(JSON.stringify({
          type: 'user_disconnected',
          user_id: socket.data.user?.id,
          socket_id: socket.id
        }));
      }
    }
  }

  /**
   * Update last activity for connection
   */
  private updateLastActivity(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.last_activity = new Date();
      this.connections.set(socketId, connection);
    }
  }

  /**
   * Store connection in Redis
   */
  private async storeConnectionInRedis(connection: WebSocketConnection): Promise<void> {
    try {
      const key = `ws_connection:${connection.id}`;
      await redisManager.setJSON(key, connection, 3600); // 1 hour TTL
    } catch (error) {
      logger.error('Error storing connection in Redis:', error);
    }
  }

  /**
   * Remove connection from Redis
   */
  private async removeConnectionFromRedis(connectionId: string): Promise<void> {
    try {
      const key = `ws_connection:${connectionId}`;
      await redisManager.del(key);
    } catch (error) {
      logger.error('Error removing connection from Redis:', error);
    }
  }

  /**
   * Start heartbeat for connection health
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, 30000); // 30 seconds
  }

  /**
   * Perform heartbeat check
   */
  private performHeartbeat(): void {
    const now = new Date();
    const staleConnections: string[] = [];

    for (const [socketId, connection] of this.connections) {
      const timeSinceActivity = now.getTime() - connection.last_activity.getTime();
      
      if (timeSinceActivity > 120000) { // 2 minutes
        staleConnections.push(socketId);
      }
    }

    // Disconnect stale connections
    for (const socketId of staleConnections) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
      this.connections.delete(socketId);
    }

    if (staleConnections.length > 0) {
      logger.info(`Cleaned up ${staleConnections.length} stale connections`);
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): Record<string, any> {
    return {
      total_connections: this.connections.size,
      connected_services: this.serviceProxies.size,
      connections_by_service: this.getConnectionsByService(),
      active_rooms: this.getActiveRooms()
    };
  }

  /**
   * Get connections by service
   */
  private getConnectionsByService(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const connection of this.connections.values()) {
      const service = connection.service;
      stats[service] = (stats[service] || 0) + 1;
    }
    
    return stats;
  }

  /**
   * Get active rooms
   */
  private getActiveRooms(): string[] {
    return Array.from(this.io.sockets.adapter.rooms.keys());
  }

  /**
   * Shutdown WebSocket proxy
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all service proxies
    for (const proxy of this.serviceProxies.values()) {
      proxy.close();
    }

    // Disconnect all clients
    this.io.disconnectSockets(true);
    
    this.connections.clear();
    this.serviceProxies.clear();
    
    logger.info('WebSocket proxy service shutdown complete');
  }
}

export let websocketProxy: WebSocketProxyService | null = null;

export const initializeWebSocketProxy = (server: HttpServer): WebSocketProxyService => {
  websocketProxy = new WebSocketProxyService(server);
  return websocketProxy;
};