import { McpServiceInterface, McpHealthStatus } from '../McpServiceRegistry';
import { realtimeNotificationService } from '../../RealtimeNotificationService';

/**
 * Notification Service
 * Manages all notification channels and delivery via MCP
 */
export class NotificationService implements McpServiceInterface {
  private connected: boolean = false;
  private lastHealthCheck: Date = new Date();
  private channels: Map<string, NotificationChannel> = new Map();
  private deliveryStats: DeliveryStats = {
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0
  };

  async initialize(): Promise<void> {
    try {
      // Initialize notification channels
      this.initializeChannels();
      this.connected = true;
      console.log('Notification Service initialized');
    } catch (error) {
      console.error('Failed to initialize Notification Service:', error);
      throw error;
    }
  }

  async execute(operation: string, params: Record<string, any>): Promise<any> {
    if (!this.connected) {
      throw new Error('Service not connected');
    }

    switch (operation) {
      case 'send':
        return this.sendNotification(params);
      
      case 'sendBatch':
        return this.sendBatchNotifications(params.notifications);
      
      case 'getStatus':
        return this.getNotificationStatus(params.notificationId);
      
      case 'cancel':
        return this.cancelNotification(params.notificationId);
      
      case 'getStats':
        return this.getDeliveryStats();
      
      case 'configureChannel':
        return this.configureChannel(params.channel, params.config);
      
      case 'testChannel':
        return this.testChannel(params.channel);
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  async healthCheck(): Promise<McpHealthStatus> {
    this.lastHealthCheck = new Date();
    
    try {
      const issues: string[] = [];
      
      if (!this.connected) {
        issues.push('Service disconnected');
      }
      
      // Check channel health
      for (const [name, channel] of this.channels.entries()) {
        if (!channel.healthy) {
          issues.push(`Channel ${name} unhealthy`);
        }
      }
      
      // Check delivery rate
      const deliveryRate = this.deliveryStats.delivered / 
        (this.deliveryStats.sent || 1);
      
      if (deliveryRate < 0.8) {
        issues.push(`Low delivery rate: ${(deliveryRate * 100).toFixed(1)}%`);
      }
      
      return {
        healthy: issues.length === 0,
        issues,
        recoverable: true,
        lastCheck: this.lastHealthCheck.toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        issues: ['Health check failed: ' + error.message],
        recoverable: true,
        lastCheck: this.lastHealthCheck.toISOString()
      };
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.channels.clear();
    console.log('Notification Service disconnected');
  }

  // Private methods

  private initializeChannels() {
    // In-app notifications (always available)
    this.channels.set('in_app', {
      name: 'in_app',
      type: 'internal',
      healthy: true,
      enabled: true,
      priority: 1
    });

    // SMS notifications (if configured)
    if (process.env.VITE_TWILIO_ACCOUNT_SID) {
      this.channels.set('sms', {
        name: 'sms',
        type: 'external',
        healthy: true,
        enabled: true,
        priority: 2,
        config: {
          provider: 'twilio',
          accountSid: process.env.VITE_TWILIO_ACCOUNT_SID
        }
      });
    }

    // Email notifications (if configured)
    if (process.env.VITE_SENDGRID_API_KEY) {
      this.channels.set('email', {
        name: 'email',
        type: 'external',
        healthy: true,
        enabled: true,
        priority: 3,
        config: {
          provider: 'sendgrid',
          apiKey: process.env.VITE_SENDGRID_API_KEY
        }
      });
    }

    // Push notifications (if configured)
    if (process.env.VITE_FCM_SERVER_KEY) {
      this.channels.set('push', {
        name: 'push',
        type: 'external',
        healthy: true,
        enabled: true,
        priority: 1,
        config: {
          provider: 'fcm',
          serverKey: process.env.VITE_FCM_SERVER_KEY
        }
      });
    }
  }

  private async sendNotification(params: any) {
    const notificationId = this.generateNotificationId();
    
    try {
      this.deliveryStats.sent++;
      this.deliveryStats.pending++;

      // Determine channel
      const channel = this.channels.get(params.channel || 'in_app');
      if (!channel || !channel.enabled) {
        throw new Error(`Channel ${params.channel} not available`);
      }

      // Route to appropriate handler
      let result;
      switch (channel.name) {
        case 'in_app':
          result = await this.sendInAppNotification(params);
          break;
        case 'sms':
          result = await this.sendSmsNotification(params);
          break;
        case 'email':
          result = await this.sendEmailNotification(params);
          break;
        case 'push':
          result = await this.sendPushNotification(params);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel.name}`);
      }

      if (result.success) {
        this.deliveryStats.delivered++;
      } else {
        this.deliveryStats.failed++;
      }
      
      this.deliveryStats.pending--;

      return {
        notificationId,
        ...result
      };

    } catch (error) {
      this.deliveryStats.failed++;
      this.deliveryStats.pending--;
      
      throw error;
    }
  }

  private async sendBatchNotifications(notifications: any[]) {
    const results = await Promise.allSettled(
      notifications.map(n => this.sendNotification(n))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      total: notifications.length,
      successful,
      failed,
      results
    };
  }

  private async sendInAppNotification(params: any) {
    return await realtimeNotificationService.sendNotification({
      _user_id: params.userId,
      _supporter_id: params.supporterId,
      _type: params.type || 'general',
      _severity: params.severity || 'medium',
      _title: params.title,
      _message: params.message,
      _channel: 'in_app',
      _priority: params.priority || 5,
      _delay_seconds: params.delay || 0,
      _tier_level: params.tierLevel || 1,
      _status: 'sending',
      _metadata: params.metadata
    });
  }

  private async sendSmsNotification(params: any) {
    // Implementation would use Twilio or similar
    console.log('Sending SMS notification:', params);
    
    // Simulate sending
    return {
      success: true,
      channel: 'sms',
      messageId: this.generateNotificationId()
    };
  }

  private async sendEmailNotification(params: any) {
    // Implementation would use SendGrid or similar
    console.log('Sending email notification:', params);
    
    // Simulate sending
    return {
      success: true,
      channel: 'email',
      messageId: this.generateNotificationId()
    };
  }

  private async sendPushNotification(params: any) {
    // Implementation would use FCM or similar
    console.log('Sending push notification:', params);
    
    // Simulate sending
    return {
      success: true,
      channel: 'push',
      messageId: this.generateNotificationId()
    };
  }

  private async getNotificationStatus(notificationId: string) {
    // Would query notification status from database
    return {
      notificationId,
      status: 'delivered',
      deliveredAt: new Date().toISOString()
    };
  }

  private async cancelNotification(notificationId: string) {
    // Would cancel pending notification
    return {
      success: true,
      notificationId,
      cancelledAt: new Date().toISOString()
    };
  }

  private getDeliveryStats() {
    return {
      ...this.deliveryStats,
      deliveryRate: (this.deliveryStats.delivered / 
        (this.deliveryStats.sent || 1) * 100).toFixed(1) + '%',
      failureRate: (this.deliveryStats.failed / 
        (this.deliveryStats.sent || 1) * 100).toFixed(1) + '%'
    };
  }

  private async configureChannel(channelName: string, config: any) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel ${channelName} not found`);
    }

    channel.config = { ...channel.config, ...config };
    channel.enabled = config.enabled !== undefined ? config.enabled : channel.enabled;

    return {
      success: true,
      channel: channelName,
      config: channel.config
    };
  }

  private async testChannel(channelName: string) {
    const channel = this.channels.get(channelName);
    if (!channel) {
      throw new Error(`Channel ${channelName} not found`);
    }

    try {
      // Send test notification
      const result = await this.sendNotification({
        channel: channelName,
        title: 'Test Notification',
        message: `Testing ${channelName} channel`,
        userId: 'test-user',
        priority: 1
      });

      channel.healthy = result.success;
      
      return {
        success: result.success,
        channel: channelName,
        healthy: channel.healthy
      };
    } catch (error) {
      channel.healthy = false;
      throw error;
    }
  }

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Types
interface NotificationChannel {
  name: string;
  type: 'internal' | 'external';
  healthy: boolean;
  enabled: boolean;
  priority: number;
  config?: Record<string, any>;
}

interface DeliveryStats {
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}