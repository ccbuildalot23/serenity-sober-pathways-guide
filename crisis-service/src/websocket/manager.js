/**
 * WebSocket Manager
 * Real-time communication for crisis management and emergency response
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const config = require('../config/config');
const { getRedisManager } = require('../cache/redis');

class WebSocketManager {
    constructor(io) {
        this.io = io;
        this.redis = null;
        this.connectedUsers = new Map(); // userId -> Set of socketIds
        this.socketUsers = new Map(); // socketId -> userId
        this.roomUsers = new Map(); // roomId -> Set of userIds
        this.userSessions = new Map(); // userId -> session data
        
        // Connection statistics
        this.stats = {
            totalConnections: 0,
            activeConnections: 0,
            messagesHandled: 0,
            crisisAlertsDelivered: 0,
            emergencyNotificationsSent: 0
        };
        
        // Message handlers
        this.messageHandlers = new Map();
        
        this.initialize();
    }

    initialize() {
        try {
            logger.info('Initializing WebSocket Manager...');
            
            this.redis = getRedisManager();
            
            // Setup Socket.IO event handlers
            this.setupSocketHandlers();
            
            // Setup Redis pub/sub listeners
            this.setupRedisListeners();
            
            // Start background monitoring
            this.startBackgroundMonitoring();
            
            logger.info('WebSocket Manager initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize WebSocket Manager:', error);
            throw error;
        }
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });

        // Register message handlers
        this.registerMessageHandlers();
    }

    setupRedisListeners() {
        // Listen for crisis alerts
        this.redis.onCrisisAlert((crisisData) => {
            this.handleCrisisAlert(crisisData);
        });

        // Listen for escalation updates
        this.redis.onEscalation((escalationData) => {
            this.handleEscalationUpdate(escalationData);
        });

        // Listen for location updates
        this.redis.onLocationUpdate((locationData) => {
            this.handleLocationUpdate(locationData);
        });

        // Listen for safety check-ins
        this.redis.onSafetyCheckin((checkinData) => {
            this.handleSafetyCheckin(checkinData);
        });

        logger.info('Redis pub/sub listeners configured');
    }

    startBackgroundMonitoring() {
        // Clean up stale connections
        setInterval(() => {
            this.cleanupStaleConnections();
        }, 30000); // Every 30 seconds

        // Send heartbeat to connected clients
        setInterval(() => {
            this.sendHeartbeat();
        }, config.websocket.heartbeatInterval);

        // Update connection statistics
        setInterval(() => {
            this.updateConnectionStats();
        }, 60000); // Every minute

        logger.info('WebSocket background monitoring started');
    }

    handleConnection(socket) {
        const sessionId = uuidv4();
        const clientInfo = {
            sessionId,
            socketId: socket.id,
            connectedAt: new Date(),
            ipAddress: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent'],
            lastActivity: new Date(),
            authenticated: false,
            userId: null,
            rooms: new Set()
        };

        this.stats.totalConnections++;
        this.stats.activeConnections++;

        logger.info(`New WebSocket connection established`, {
            sessionId,
            socketId: socket.id,
            ip: clientInfo.ipAddress,
            userAgent: clientInfo.userAgent
        });

        // Store session info
        socket.sessionId = sessionId;
        socket.clientInfo = clientInfo;

        // Handle authentication
        socket.on('authenticate', (authData) => {
            this.handleAuthentication(socket, authData);
        });

        // Handle crisis events
        socket.on('crisis:report', (crisisData) => {
            this.handleCrisisReport(socket, crisisData);
        });

        socket.on('crisis:acknowledge', (ackData) => {
            this.handleCrisisAcknowledge(socket, ackData);
        });

        // Handle location sharing
        socket.on('location:update', (locationData) => {
            this.handleLocationShare(socket, locationData);
        });

        socket.on('location:emergency_share', (emergencyData) => {
            this.handleEmergencyLocationShare(socket, emergencyData);
        });

        // Handle safety check-ins
        socket.on('safety:checkin', (checkinData) => {
            this.handleSafetyCheckinSocket(socket, checkinData);
        });

        socket.on('safety:panic', (panicData) => {
            this.handlePanicButton(socket, panicData);
        });

        // Handle room management
        socket.on('room:join', (roomData) => {
            this.handleRoomJoin(socket, roomData);
        });

        socket.on('room:leave', (roomData) => {
            this.handleRoomLeave(socket, roomData);
        });

        // Handle messaging
        socket.on('message:send', (messageData) => {
            this.handleMessage(socket, messageData);
        });

        // Handle heartbeat
        socket.on('heartbeat', (data) => {
            this.handleHeartbeat(socket, data);
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            this.handleDisconnection(socket, reason);
        });

        // Handle errors
        socket.on('error', (error) => {
            logger.error(`WebSocket error for session ${sessionId}:`, error);
        });

        // Send welcome message
        socket.emit('connected', {
            sessionId,
            timestamp: new Date().toISOString(),
            features: [
                'crisis_alerts',
                'emergency_response',
                'location_sharing',
                'safety_checkins',
                'real_time_messaging'
            ]
        });
    }

    handleAuthentication(socket, authData) {
        try {
            const { userId, token, userType = 'patient' } = authData;

            // In a real implementation, validate the JWT token
            // For now, we'll simulate successful authentication
            if (!userId || !token) {
                socket.emit('auth:error', {
                    error: 'Missing userId or token',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Update client info
            socket.clientInfo.authenticated = true;
            socket.clientInfo.userId = userId;
            socket.clientInfo.userType = userType;
            socket.clientInfo.lastActivity = new Date();

            // Add to user connections
            if (!this.connectedUsers.has(userId)) {
                this.connectedUsers.set(userId, new Set());
            }
            this.connectedUsers.get(userId).add(socket.id);
            this.socketUsers.set(socket.id, userId);

            // Add session to Redis
            this.redis.addUserSession(userId, socket.sessionId, socket.id);

            // Join user-specific room
            socket.join(`user:${userId}`);

            // Join type-specific rooms
            socket.join(`type:${userType}`);
            if (userType === 'provider') {
                socket.join('providers');
            } else if (userType === 'supporter') {
                socket.join('supporters');
            }

            logger.info(`User authenticated via WebSocket`, {
                userId,
                sessionId: socket.sessionId,
                socketId: socket.id,
                userType
            });

            socket.emit('auth:success', {
                userId,
                sessionId: socket.sessionId,
                timestamp: new Date().toISOString(),
                availableRooms: this.getAvailableRooms(userId, userType)
            });

            // Send any pending notifications
            this.sendPendingNotifications(userId, socket);

        } catch (error) {
            logger.error('Error handling authentication:', error);
            socket.emit('auth:error', {
                error: 'Authentication failed',
                timestamp: new Date().toISOString()
            });
        }
    }

    handleCrisisReport(socket, crisisData) {
        try {
            if (!socket.clientInfo.authenticated) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            const userId = socket.clientInfo.userId;
            const enhancedCrisisData = {
                ...crisisData,
                userId,
                reportedVia: 'websocket',
                sessionId: socket.sessionId,
                timestamp: new Date().toISOString(),
                location: crisisData.location || null
            };

            logger.crisis('Crisis reported via WebSocket', crisisData.severity || 8, {
                userId,
                sessionId: socket.sessionId,
                type: crisisData.type || 'manual_report'
            });

            // Publish crisis alert to Redis
            this.redis.publishCrisisAlert(userId, enhancedCrisisData);

            // Immediate acknowledgment to user
            socket.emit('crisis:reported', {
                crisisId: enhancedCrisisData.crisisId || `ws-${Date.now()}`,
                timestamp: enhancedCrisisData.timestamp,
                message: 'Crisis report received. Help is on the way.',
                emergencyResponse: true
            });

            this.stats.messagesHandled++;

        } catch (error) {
            logger.error('Error handling crisis report:', error);
            socket.emit('crisis:error', {
                error: 'Failed to process crisis report',
                timestamp: new Date().toISOString()
            });
        }
    }

    handleCrisisAcknowledge(socket, ackData) {
        try {
            if (!socket.clientInfo.authenticated) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            const { crisisId, acknowledgedBy, message } = ackData;
            const userId = socket.clientInfo.userId;

            logger.info(`Crisis acknowledgment received`, {
                crisisId,
                acknowledgedBy: userId,
                sessionId: socket.sessionId
            });

            // Broadcast acknowledgment to relevant parties
            this.broadcastToSupporers(userId, 'crisis:acknowledged', {
                crisisId,
                acknowledgedBy: userId,
                acknowledgedAt: new Date().toISOString(),
                message
            });

            socket.emit('crisis:ack_received', {
                crisisId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error handling crisis acknowledgment:', error);
        }
    }

    handleLocationShare(socket, locationData) {
        try {
            if (!socket.clientInfo.authenticated) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            const userId = socket.clientInfo.userId;
            const enhancedLocationData = {
                ...locationData,
                userId,
                timestamp: new Date().toISOString(),
                source: 'websocket_share'
            };

            // Publish location update
            this.redis.publishLocationUpdate(userId, enhancedLocationData);

            // Broadcast to emergency contacts if this is during a crisis
            if (locationData.emergencyShare) {
                this.broadcastToEmergencyContacts(userId, 'location:emergency_update', enhancedLocationData);
            }

            socket.emit('location:shared', {
                timestamp: enhancedLocationData.timestamp,
                shared: locationData.emergencyShare || false
            });

        } catch (error) {
            logger.error('Error handling location share:', error);
        }
    }

    handleEmergencyLocationShare(socket, emergencyData) {
        try {
            if (!socket.clientInfo.authenticated) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            const userId = socket.clientInfo.userId;
            const locationData = {
                ...emergencyData,
                userId,
                timestamp: new Date().toISOString(),
                emergencyShare: true,
                source: 'emergency_websocket'
            };

            logger.emergency(`Emergency location shared via WebSocket`, 9, {
                userId,
                sessionId: socket.sessionId,
                location: locationData.location
            });

            // Publish emergency location update
            this.redis.publishLocationUpdate(userId, locationData);

            // Immediately notify all emergency contacts and providers
            this.broadcastToEmergencyContacts(userId, 'location:emergency_alert', locationData);
            this.broadcastToProviders('location:patient_emergency', locationData);

            socket.emit('location:emergency_shared', {
                timestamp: locationData.timestamp,
                notifiedContacts: true,
                message: 'Your location has been shared with emergency contacts'
            });

            this.stats.emergencyNotificationsSent++;

        } catch (error) {
            logger.error('Error handling emergency location share:', error);
        }
    }

    handleSafetyCheckinSocket(socket, checkinData) {
        try {
            if (!socket.clientInfo.authenticated) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            const userId = socket.clientInfo.userId;
            const enhancedCheckinData = {
                ...checkinData,
                userId,
                timestamp: new Date().toISOString(),
                source: 'websocket'
            };

            // Publish safety check-in
            this.redis.publishSafetyCheckin(userId, enhancedCheckinData);

            socket.emit('safety:checkin_received', {
                timestamp: enhancedCheckinData.timestamp,
                status: checkinData.status,
                message: this.getCheckinResponseMessage(checkinData.status)
            });

            // If concerning status, notify providers
            if (checkinData.status === 'concerned' || checkinData.status === 'crisis') {
                this.broadcastToProviders('safety:patient_concern', {
                    userId,
                    status: checkinData.status,
                    timestamp: enhancedCheckinData.timestamp
                });
            }

        } catch (error) {
            logger.error('Error handling safety check-in:', error);
        }
    }

    handlePanicButton(socket, panicData) {
        try {
            if (!socket.clientInfo.authenticated) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            const userId = socket.clientInfo.userId;
            const emergencyData = {
                userId,
                type: 'panic_button',
                severity: 10,
                confidence: 1.0,
                timestamp: new Date().toISOString(),
                location: panicData.location,
                sessionId: socket.sessionId,
                source: 'panic_button'
            };

            logger.emergency(`PANIC BUTTON ACTIVATED via WebSocket`, 10, {
                userId,
                sessionId: socket.sessionId,
                location: panicData.location
            });

            // Immediate crisis alert
            this.redis.publishCrisisAlert(userId, emergencyData);

            // Immediate response to user
            socket.emit('panic:activated', {
                timestamp: emergencyData.timestamp,
                message: 'Emergency services have been notified. Help is on the way.',
                crisisId: `panic-${Date.now()}`
            });

            // Broadcast to all emergency contacts and providers immediately
            this.broadcastToEmergencyContacts(userId, 'panic:alert', emergencyData);
            this.broadcastToProviders('panic:patient_alert', emergencyData);

            this.stats.crisisAlertsDelivered++;
            this.stats.emergencyNotificationsSent++;

        } catch (error) {
            logger.error('Error handling panic button:', error);
        }
    }

    handleRoomJoin(socket, roomData) {
        try {
            if (!socket.clientInfo.authenticated) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            const { roomId, roomType } = roomData;
            const userId = socket.clientInfo.userId;

            // Validate room access
            if (!this.canJoinRoom(userId, socket.clientInfo.userType, roomId, roomType)) {
                socket.emit('room:access_denied', {
                    roomId,
                    error: 'Access denied to this room'
                });
                return;
            }

            socket.join(roomId);
            socket.clientInfo.rooms.add(roomId);

            // Track room membership
            if (!this.roomUsers.has(roomId)) {
                this.roomUsers.set(roomId, new Set());
            }
            this.roomUsers.get(roomId).add(userId);

            socket.emit('room:joined', {
                roomId,
                roomType,
                timestamp: new Date().toISOString()
            });

            // Notify other room members
            socket.to(roomId).emit('room:user_joined', {
                userId,
                userType: socket.clientInfo.userType,
                timestamp: new Date().toISOString()
            });

            logger.info(`User joined room`, {
                userId,
                roomId,
                roomType
            });

        } catch (error) {
            logger.error('Error handling room join:', error);
        }
    }

    handleRoomLeave(socket, roomData) {
        try {
            const { roomId } = roomData;
            const userId = socket.clientInfo.userId;

            socket.leave(roomId);
            socket.clientInfo.rooms.delete(roomId);

            // Update room membership
            if (this.roomUsers.has(roomId)) {
                this.roomUsers.get(roomId).delete(userId);
                if (this.roomUsers.get(roomId).size === 0) {
                    this.roomUsers.delete(roomId);
                }
            }

            socket.emit('room:left', {
                roomId,
                timestamp: new Date().toISOString()
            });

            // Notify other room members
            socket.to(roomId).emit('room:user_left', {
                userId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error handling room leave:', error);
        }
    }

    handleMessage(socket, messageData) {
        try {
            if (!socket.clientInfo.authenticated) {
                socket.emit('error', { message: 'Authentication required' });
                return;
            }

            const { roomId, message, messageType = 'text' } = messageData;
            const userId = socket.clientInfo.userId;

            // Validate room membership
            if (!socket.clientInfo.rooms.has(roomId)) {
                socket.emit('message:error', {
                    error: 'Not a member of this room',
                    roomId
                });
                return;
            }

            const enhancedMessage = {
                messageId: uuidv4(),
                roomId,
                senderId: userId,
                senderType: socket.clientInfo.userType,
                message,
                messageType,
                timestamp: new Date().toISOString()
            };

            // Broadcast message to room members
            socket.to(roomId).emit('message:received', enhancedMessage);

            // Confirm to sender
            socket.emit('message:sent', {
                messageId: enhancedMessage.messageId,
                timestamp: enhancedMessage.timestamp
            });

            this.stats.messagesHandled++;

        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }

    handleHeartbeat(socket, data) {
        socket.clientInfo.lastActivity = new Date();
        socket.emit('heartbeat_ack', {
            timestamp: new Date().toISOString()
        });
    }

    handleDisconnection(socket, reason) {
        const clientInfo = socket.clientInfo;
        
        if (clientInfo) {
            const userId = clientInfo.userId;
            
            // Remove from user connections
            if (userId && this.connectedUsers.has(userId)) {
                this.connectedUsers.get(userId).delete(socket.id);
                if (this.connectedUsers.get(userId).size === 0) {
                    this.connectedUsers.delete(userId);
                }
            }
            
            // Remove from socket users mapping
            this.socketUsers.delete(socket.id);
            
            // Clean up room memberships
            for (const roomId of clientInfo.rooms) {
                if (this.roomUsers.has(roomId)) {
                    this.roomUsers.get(roomId).delete(userId);
                    if (this.roomUsers.get(roomId).size === 0) {
                        this.roomUsers.delete(roomId);
                    }
                }
            }
            
            // Remove from Redis session tracking
            if (userId) {
                this.redis.removeUserSession(userId, clientInfo.sessionId);
            }
            
            this.stats.activeConnections--;

            logger.info(`WebSocket disconnected`, {
                sessionId: clientInfo.sessionId,
                socketId: socket.id,
                userId,
                reason,
                duration: Date.now() - clientInfo.connectedAt.getTime()
            });
        }
    }

    // Redis event handlers

    handleCrisisAlert(crisisData) {
        try {
            const { userId } = crisisData;
            
            // Send to user's connections
            this.broadcastToUser(userId, 'crisis:alert', {
                ...crisisData,
                timestamp: new Date().toISOString()
            });

            // Send to providers
            this.broadcastToProviders('crisis:patient_alert', crisisData);

            // Send to supporters/emergency contacts
            this.broadcastToSupporers(userId, 'crisis:contact_alert', crisisData);

            this.stats.crisisAlertsDelivered++;
            
            logger.info(`Crisis alert broadcasted via WebSocket`, {
                userId,
                severity: crisisData.severity
            });

        } catch (error) {
            logger.error('Error handling crisis alert broadcast:', error);
        }
    }

    handleEscalationUpdate(escalationData) {
        try {
            const { userId, crisisId } = escalationData;

            // Send to user
            this.broadcastToUser(userId, 'escalation:update', {
                ...escalationData,
                timestamp: new Date().toISOString()
            });

            // Send to providers
            this.broadcastToProviders('escalation:progress', escalationData);

        } catch (error) {
            logger.error('Error handling escalation update broadcast:', error);
        }
    }

    handleLocationUpdate(locationData) {
        try {
            const { userId } = locationData;

            // Send to user's connections
            this.broadcastToUser(userId, 'location:updated', {
                ...locationData,
                timestamp: new Date().toISOString()
            });

            // If emergency share, send to providers
            if (locationData.emergencyShare) {
                this.broadcastToProviders('location:patient_emergency', locationData);
            }

        } catch (error) {
            logger.error('Error handling location update broadcast:', error);
        }
    }

    handleSafetyCheckin(checkinData) {
        try {
            const { userId } = checkinData;

            // Send confirmation to user
            this.broadcastToUser(userId, 'safety:checkin_processed', {
                ...checkinData,
                timestamp: new Date().toISOString(),
                message: this.getCheckinResponseMessage(checkinData.status)
            });

            // If concerning, notify providers
            if (checkinData.status === 'concerned' || checkinData.status === 'crisis') {
                this.broadcastToProviders('safety:patient_concern', checkinData);
            }

        } catch (error) {
            logger.error('Error handling safety checkin broadcast:', error);
        }
    }

    // Broadcasting methods

    broadcastToUser(userId, event, data) {
        const userSockets = this.connectedUsers.get(userId);
        if (userSockets) {
            for (const socketId of userSockets) {
                const socket = this.io.sockets.sockets.get(socketId);
                if (socket) {
                    socket.emit(event, data);
                }
            }
        }
    }

    broadcastToProviders(event, data) {
        this.io.to('providers').emit(event, data);
    }

    broadcastToSupporers(userId, event, data) {
        // This would broadcast to the user's support network
        // For now, we'll broadcast to a general supporters room
        this.io.to('supporters').emit(event, { ...data, forUserId: userId });
    }

    broadcastToEmergencyContacts(userId, event, data) {
        // This would send to specific emergency contacts
        // Implementation would require contact management integration
        this.io.to(`emergency_contacts:${userId}`).emit(event, data);
    }

    broadcastToRoom(roomId, event, data) {
        this.io.to(roomId).emit(event, data);
    }

    // Utility methods

    canJoinRoom(userId, userType, roomId, roomType) {
        // Implement room access control logic
        const allowedRoomTypes = {
            'patient': ['general', 'peer_support', 'patient_provider'],
            'provider': ['general', 'provider_only', 'patient_provider', 'crisis_team'],
            'supporter': ['general', 'support_network'],
            'admin': ['general', 'admin_only', 'crisis_team']
        };

        return allowedRoomTypes[userType]?.includes(roomType) || false;
    }

    getAvailableRooms(userId, userType) {
        const rooms = {
            'patient': [
                { id: 'general', name: 'General Support', type: 'general' },
                { id: 'peer_support', name: 'Peer Support', type: 'peer_support' },
                { id: `patient_${userId}`, name: 'Your Care Team', type: 'patient_provider' }
            ],
            'provider': [
                { id: 'general', name: 'General Discussion', type: 'general' },
                { id: 'provider_only', name: 'Providers Only', type: 'provider_only' },
                { id: 'crisis_team', name: 'Crisis Response Team', type: 'crisis_team' }
            ],
            'supporter': [
                { id: 'general', name: 'General Support', type: 'general' },
                { id: 'support_network', name: 'Support Network', type: 'support_network' }
            ]
        };

        return rooms[userType] || rooms.general;
    }

    getCheckinResponseMessage(status) {
        const messages = {
            'safe': "Thank you for checking in! It's great to hear you're feeling safe.",
            'concerned': "Thank you for being honest. We're here to support you.",
            'crisis': "Thank you for reaching out. Help is on the way. You're not alone."
        };
        return messages[status] || "Thank you for checking in.";
    }

    async sendPendingNotifications(userId, socket) {
        try {
            // Get pending notifications from Redis
            // This would retrieve any notifications that were queued while user was offline
            const pendingKey = `pending_notifications:${userId}`;
            const notifications = await this.redis.getClient().lrange(pendingKey, 0, -1);

            for (const notification of notifications) {
                try {
                    const notificationData = JSON.parse(notification);
                    socket.emit('notification:pending', notificationData);
                } catch (parseError) {
                    logger.error('Error parsing pending notification:', parseError);
                }
            }

            // Clear pending notifications
            if (notifications.length > 0) {
                await this.redis.getClient().del(pendingKey);
                logger.info(`Sent ${notifications.length} pending notifications to user ${userId}`);
            }

        } catch (error) {
            logger.error(`Error sending pending notifications to user ${userId}:`, error);
        }
    }

    sendHeartbeat() {
        this.io.emit('heartbeat', {
            timestamp: new Date().toISOString(),
            activeConnections: this.stats.activeConnections
        });
    }

    cleanupStaleConnections() {
        const staleTimeout = config.websocket.timeout;
        const now = Date.now();

        let staleCount = 0;
        
        for (const [socketId, socket] of this.io.sockets.sockets) {
            const clientInfo = socket.clientInfo;
            if (clientInfo && (now - clientInfo.lastActivity.getTime()) > staleTimeout) {
                logger.warn(`Disconnecting stale connection`, {
                    sessionId: clientInfo.sessionId,
                    socketId,
                    userId: clientInfo.userId,
                    lastActivity: clientInfo.lastActivity
                });
                
                socket.disconnect(true);
                staleCount++;
            }
        }

        if (staleCount > 0) {
            logger.info(`Cleaned up ${staleCount} stale WebSocket connections`);
        }
    }

    updateConnectionStats() {
        this.stats.activeConnections = this.io.sockets.sockets.size;
        
        logger.info('WebSocket Manager Statistics', {
            totalConnections: this.stats.totalConnections,
            activeConnections: this.stats.activeConnections,
            connectedUsers: this.connectedUsers.size,
            activeRooms: this.roomUsers.size,
            messagesHandled: this.stats.messagesHandled,
            crisisAlertsDelivered: this.stats.crisisAlertsDelivered,
            emergencyNotificationsSent: this.stats.emergencyNotificationsSent
        });
    }

    // Public methods for external use

    isUserConnected(userId) {
        return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
    }

    getUserConnectionCount(userId) {
        return this.connectedUsers.has(userId) ? this.connectedUsers.get(userId).size : 0;
    }

    getConnectedUsers() {
        return Array.from(this.connectedUsers.keys());
    }

    getRoomMembers(roomId) {
        return this.roomUsers.has(roomId) ? Array.from(this.roomUsers.get(roomId)) : [];
    }

    async close() {
        logger.info('Closing WebSocket Manager...');
        
        // Disconnect all clients
        this.io.disconnectSockets(true);
        
        // Clear data structures
        this.connectedUsers.clear();
        this.socketUsers.clear();
        this.roomUsers.clear();
        this.userSessions.clear();
        this.messageHandlers.clear();
        
        logger.info('WebSocket Manager closed');
    }

    registerMessageHandlers() {
        // Register custom message handlers here
        this.messageHandlers.set('ping', (socket, data) => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });

        this.messageHandlers.set('get_stats', (socket, data) => {
            if (socket.clientInfo.userType === 'admin') {
                socket.emit('stats_response', this.stats);
            }
        });
    }
}

module.exports = WebSocketManager;