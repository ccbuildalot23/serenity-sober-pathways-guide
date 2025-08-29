import io, {Socket} from 'socket.io-client';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WebSocketConfig {
  url: string;
  options?: {
    timeout?: number;
    forceNew?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
  };
}

export interface MessageData {
  id: string;
  type: 'text' | 'image' | 'voice' | 'crisis_alert' | 'system';
  content: string;
  senderId: string;
  senderName: string;
  conversationId: string;
  timestamp: string;
  isEncrypted: boolean;
}

export interface TypingData {
  userId: string;
  userName: string;
  conversationId: string;
  isTyping: boolean;
}

export interface UserStatusData {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
}

export interface CrisisAlertData {
  alertId: string;
  userId: string;
  userName: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

export class WebSocketService {
  private socket: Socket | null = null;
  private userId: string;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Event callbacks
  private onMessageCallback?: (data: MessageData) => void;
  private onTypingCallback?: (conversationId: string, userId: string, isTyping: boolean) => void;
  private onUserStatusCallback?: (userId: string, status: 'online' | 'offline' | 'away') => void;
  private onCrisisAlertCallback?: (data: CrisisAlertData) => void;
  private onConnectionCallback?: (connected: boolean) => void;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(config?: WebSocketConfig): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const defaultConfig: WebSocketConfig = {
        url: 'ws://localhost:3000', // Replace with your WebSocket server URL
        options: {
          timeout: 10000,
          forceNew: false,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: 1000,
        },
      };

      const wsConfig = config || defaultConfig;
      
      // Get auth token for WebSocket authentication
      const authToken = await AsyncStorage.getItem('auth_token');
      
      this.socket = io(wsConfig.url, {
        ...wsConfig.options,
        auth: {
          token: authToken,
          userId: this.userId,
        },
        transports: ['websocket', 'polling'],
      });

      this.setupEventListeners();
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, wsConfig.options?.timeout || 10000);

        this.socket!.on('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('WebSocket connected');
          
          // Join user room for personal notifications
          this.socket!.emit('join_user_room', {userId: this.userId});
          
          // Start heartbeat
          this.startHeartbeat();
          
          this.onConnectionCallback?.(true);
          resolve();
        });

        this.socket!.on('connect_error', (error) => {
          clearTimeout(timeout);
          console.error('WebSocket connection error:', error);
          this.onConnectionCallback?.(false);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.onConnectionCallback?.(false);
      console.log('WebSocket disconnected');
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.stopHeartbeat();
      this.onConnectionCallback?.(false);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.onConnectionCallback?.(true);
    });

    this.socket.on('reconnect_error', (error) => {
      this.reconnectAttempts++;
      console.error('WebSocket reconnect error:', error);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        Alert.alert(
          'Connection Lost',
          'Unable to maintain connection to the server. Some features may not work properly.',
          [{text: 'OK'}]
        );
      }
    });

    // Message events
    this.socket.on('new_message', (data: MessageData) => {
      console.log('Received new message:', data);
      this.onMessageCallback?.(data);
    });

    this.socket.on('message_status_update', (data: {messageId: string; status: string}) => {
      console.log('Message status updated:', data);
      // Handle message status updates (delivered, read, etc.)
    });

    // Typing events
    this.socket.on('user_typing', (data: TypingData) => {
      console.log('User typing:', data);
      this.onTypingCallback?.(data.conversationId, data.userId, data.isTyping);
    });

    // User status events
    this.socket.on('user_status_change', (data: UserStatusData) => {
      console.log('User status changed:', data);
      this.onUserStatusCallback?.(data.userId, data.status);
    });

    // Crisis alert events
    this.socket.on('crisis_alert', (data: CrisisAlertData) => {
      console.log('Crisis alert received:', data);
      this.onCrisisAlertCallback?.(data);
    });

    // System events
    this.socket.on('system_notification', (data: any) => {
      console.log('System notification:', data);
      // Handle system notifications
    });

    // Error events
    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_conversation', {
        conversationId,
        userId: this.userId,
      });
      console.log('Joined conversation:', conversationId);
    }
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('leave_conversation', {
        conversationId,
        userId: this.userId,
      });
      console.log('Left conversation:', conversationId);
    }
  }

  /**
   * Send a message
   */
  sendMessage(messageData: Omit<MessageData, 'id' | 'timestamp'>): void {
    if (this.socket && this.isConnected) {
      const message: MessageData = {
        ...messageData,
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
      };

      this.socket.emit('send_message', message);
      console.log('Message sent:', message);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId: string, isTyping: boolean): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', {
        conversationId,
        userId: this.userId,
        isTyping,
      });
    }
  }

  /**
   * Update user status
   */
  updateStatus(status: 'online' | 'offline' | 'away'): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('update_status', {
        userId: this.userId,
        status,
        timestamp: new Date().toISOString(),
      });
      console.log('Status updated:', status);
    }
  }

  /**
   * Send crisis alert
   */
  sendCrisisAlert(alertData: Omit<CrisisAlertData, 'timestamp'>): void {
    if (this.socket && this.isConnected) {
      const alert: CrisisAlertData = {
        ...alertData,
        timestamp: new Date().toISOString(),
      };

      this.socket.emit('crisis_alert', alert);
      console.log('Crisis alert sent:', alert);
    } else {
      console.warn('Cannot send crisis alert: WebSocket not connected');
    }
  }

  /**
   * Mark message as read
   */
  markMessageRead(messageId: string, conversationId: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('mark_read', {
        messageId,
        conversationId,
        userId: this.userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('heartbeat', {
          userId: this.userId,
          timestamp: new Date().toISOString(),
        });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Set callback for new messages
   */
  onMessage(callback: (data: MessageData) => void): void {
    this.onMessageCallback = callback;
  }

  /**
   * Set callback for typing indicators
   */
  onTyping(callback: (conversationId: string, userId: string, isTyping: boolean) => void): void {
    this.onTypingCallback = callback;
  }

  /**
   * Set callback for user status changes
   */
  onUserStatusChange(callback: (userId: string, status: 'online' | 'offline' | 'away') => void): void {
    this.onUserStatusCallback = callback;
  }

  /**
   * Set callback for crisis alerts
   */
  onCrisisAlert(callback: (data: CrisisAlertData) => void): void {
    this.onCrisisAlertCallback = callback;
  }

  /**
   * Set callback for connection status changes
   */
  onConnectionChange(callback: (connected: boolean) => void): void {
    this.onConnectionCallback = callback;
  }

  /**
   * Get connection status
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * Emit custom event
   */
  emit(event: string, data: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Listen for custom event
   */
  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    connected: boolean;
    reconnectAttempts: number;
    socketId?: string;
    userId: string;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id,
      userId: this.userId,
    };
  }
}