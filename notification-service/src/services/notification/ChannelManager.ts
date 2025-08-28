import { supabase } from '@/integrations/supabase/client';

interface ChannelConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  retryAttempts: number;
  timeout: number;
  rateLimit?: {
    perMinute?: number;
    perHour?: number;
    perDay?: number;
  };
}

interface DeliveryResult {
  channel: string;
  success: boolean;
  timestamp: Date;
  messageId?: string;
  error?: string;
  retryable?: boolean;
}

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export class ChannelManager {
  private channels: Map<string, ChannelConfig> = new Map();
  private channelHandlers: Map<string, (payload: NotificationPayload) => Promise<DeliveryResult>> = new Map();
  private deliveryMetrics: Map<string, { sent: number; failed: number; lastReset: Date }> = new Map();
  
  constructor() {
    this.initializeChannels();
    this.registerHandlers();
    this.startMetricsReset();
  }

  /**
   * Initialize channel configurations
   */
  private initializeChannels(): void {
    const defaultChannels: ChannelConfig[] = [
      {
        id: 'in_app',
        name: 'In-App Notifications',
        enabled: true,
        priority: 1,
        retryAttempts: 1,
        timeout: 5000
      },
      {
        id: 'push',
        name: 'Push Notifications',
        enabled: true,
        priority: 2,
        retryAttempts: 3,
        timeout: 10000,
        rateLimit: {
          perMinute: 5,
          perHour: 30,
          perDay: 100
        }
      },
      {
        id: 'email',
        name: 'Email',
        enabled: true,
        priority: 3,
        retryAttempts: 3,
        timeout: 30000,
        rateLimit: {
          perHour: 20,
          perDay: 50
        }
      },
      {
        id: 'sms',
        name: 'SMS',
        enabled: true,
        priority: 4,
        retryAttempts: 2,
        timeout: 15000,
        rateLimit: {
          perMinute: 2,
          perHour: 10,
          perDay: 30
        }
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp',
        enabled: true,
        priority: 5,
        retryAttempts: 3,
        timeout: 20000,
        rateLimit: {
          perMinute: 3,
          perHour: 20,
          perDay: 60
        }
      }
    ];

    defaultChannels.forEach(channel => {
      this.channels.set(channel.id, channel);
      this.deliveryMetrics.set(channel.id, {
        sent: 0,
        failed: 0,
        lastReset: new Date()
      });
    });
  }

  /**
   * Register channel-specific handlers
   */
  private registerHandlers(): void {
    this.channelHandlers.set('in_app', this.sendInApp.bind(this));
    this.channelHandlers.set('push', this.sendPush.bind(this));
    this.channelHandlers.set('email', this.sendEmail.bind(this));
    this.channelHandlers.set('sms', this.sendSMS.bind(this));
    this.channelHandlers.set('whatsapp', this.sendWhatsApp.bind(this));
  }

  /**
   * Send notification through multiple channels
   */
  async sendMultiChannel(
    payload: NotificationPayload,
    requestedChannels: string[]
  ): Promise<Map<string, DeliveryResult>> {
    const results = new Map<string, DeliveryResult>();
    
    // Filter and sort channels by priority
    const activeChannels = requestedChannels
      .filter(ch => {
        const config = this.channels.get(ch);
        return config?.enabled && this.checkChannelRateLimit(ch);
      })
      .sort((a, b) => {
        const configA = this.channels.get(a)!;
        const configB = this.channels.get(b)!;
        return configA.priority - configB.priority;
      });

    // Check user channel preferences
    const userChannels = await this.getUserEnabledChannels(payload.userId, activeChannels);
    
    // Send through each channel
    for (const channelId of userChannels) {
      const result = await this.sendToChannel(channelId, payload);
      results.set(channelId, result);
      
      // Update metrics
      this.updateMetrics(channelId, result.success);
      
      // If urgent and successful, can skip lower priority channels
      if (payload.priority === 'urgent' && result.success) {
        break;
      }
    }

    // Log delivery results
    await this.logDeliveryResults(payload, results);
    
    return results;
  }

  /**
   * Send to a specific channel with retry logic
   */
  private async sendToChannel(
    channelId: string,
    payload: NotificationPayload
  ): Promise<DeliveryResult> {
    const config = this.channels.get(channelId);
    const handler = this.channelHandlers.get(channelId);
    
    if (!config || !handler) {
      return {
        channel: channelId,
        success: false,
        timestamp: new Date(),
        error: 'Channel not configured'
      };
    }

    let lastError: string | undefined;
    let retryable = true;
    
    for (let attempt = 0; attempt <= config.retryAttempts; attempt++) {
      try {
        // Apply timeout
        const result = await Promise.race([
          handler(payload),
          new Promise<DeliveryResult>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), config.timeout)
          )
        ]);
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        retryable = this.isRetryableError(error);
        
        if (!retryable || attempt === config.retryAttempts) {
          break;
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    return {
      channel: channelId,
      success: false,
      timestamp: new Date(),
      error: lastError,
      retryable
    };
  }

  /**
   * In-App notification handler
   */
  private async sendInApp(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      // Store notification
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.body,
          priority: payload.priority,
          metadata: payload.data,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Send realtime event
      await supabase.channel(`user:${payload.userId}`)
        .send({
          type: 'broadcast',
          event: 'new_notification',
          payload: {
            id: data.id,
            type: payload.type,
            title: payload.title,
            body: payload.body,
            priority: payload.priority
          }
        });

      return {
        channel: 'in_app',
        success: true,
        timestamp: new Date(),
        messageId: data.id
      };
    } catch (error) {
      return {
        channel: 'in_app',
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Failed to send in-app notification',
        retryable: true
      };
    }
  }

  /**
   * Push notification handler
   */
  private async sendPush(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      // Get user's push subscriptions
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', payload.userId);

      if (!subscriptions || subscriptions.length === 0) {
        throw new Error('No push subscriptions found');
      }

      // Send to all subscriptions
      const results = await Promise.allSettled(
        subscriptions.map(async (sub) => {
          const pushPayload = {
            title: payload.title,
            body: payload.body,
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            data: payload.data,
            tag: payload.type,
            requireInteraction: payload.priority === 'urgent'
          };

          // In production, use Web Push API or FCM
          // For now, queue for processing
          await supabase
            .from('push_queue')
            .insert({
              subscription_id: sub.id,
              payload: pushPayload,
              priority: payload.priority,
              created_at: new Date().toISOString()
            });
        })
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      return {
        channel: 'push',
        success: successCount > 0,
        timestamp: new Date(),
        messageId: crypto.randomUUID()
      };
    } catch (error) {
      return {
        channel: 'push',
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Failed to send push notification',
        retryable: true
      };
    }
  }

  /**
   * Email notification handler
   */
  private async sendEmail(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      // Get user email
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', payload.userId)
        .single();

      if (!profile?.email) {
        throw new Error('User email not found');
      }

      // Prepare email content
      let emailHtml = payload.body;
      
      // Apply template if specified
      if (payload.templateId) {
        const { data: template } = await supabase
          .from('notification_templates')
          .select('*')
          .eq('id', payload.templateId)
          .single();

        if (template) {
          emailHtml = this.applyTemplate(template.content, {
            ...payload.templateData,
            userName: profile.full_name,
            title: payload.title,
            body: payload.body
          });
        }
      }

      // Queue email
      const { data, error } = await supabase
        .from('email_queue')
        .insert({
          to: profile.email,
          subject: payload.title,
          html: emailHtml,
          text: payload.body,
          priority: payload.priority,
          metadata: payload.data,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        channel: 'email',
        success: true,
        timestamp: new Date(),
        messageId: data.id
      };
    } catch (error) {
      return {
        channel: 'email',
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Failed to send email',
        retryable: true
      };
    }
  }

  /**
   * SMS notification handler
   */
  private async sendSMS(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      // Get user phone
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', payload.userId)
        .single();

      if (!profile?.phone) {
        throw new Error('User phone not found');
      }

      // Format message
      const message = `${payload.title}\n\n${payload.body}`.substring(0, 160);

      // Queue SMS
      const { data, error } = await supabase
        .from('sms_queue')
        .insert({
          to: profile.phone,
          message,
          priority: payload.priority,
          metadata: payload.data,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        channel: 'sms',
        success: true,
        timestamp: new Date(),
        messageId: data.id
      };
    } catch (error) {
      return {
        channel: 'sms',
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Failed to send SMS',
        retryable: true
      };
    }
  }

  /**
   * WhatsApp notification handler
   */
  private async sendWhatsApp(payload: NotificationPayload): Promise<DeliveryResult> {
    try {
      // Check opt-in status
      const { data: optIn } = await supabase
        .from('whatsapp_opt_ins')
        .select('phone_number')
        .eq('user_id', payload.userId)
        .eq('opted_in', true)
        .single();

      if (!optIn?.phone_number) {
        throw new Error('User not opted in for WhatsApp');
      }

      // Format message with markdown
      const message = `*${payload.title}*\n\n${payload.body}`;

      // Queue WhatsApp message
      const { data, error } = await supabase
        .from('whatsapp_queue')
        .insert({
          to: optIn.phone_number,
          message,
          template_name: payload.templateId,
          template_data: payload.templateData,
          priority: payload.priority,
          metadata: payload.data,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      return {
        channel: 'whatsapp',
        success: true,
        timestamp: new Date(),
        messageId: data.id
      };
    } catch (error) {
      return {
        channel: 'whatsapp',
        success: false,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Failed to send WhatsApp',
        retryable: error instanceof Error && !error.message.includes('not opted in')
      };
    }
  }

  /**
   * Check if a channel has exceeded rate limits
   */
  private checkChannelRateLimit(channelId: string): boolean {
    const config = this.channels.get(channelId);
    const metrics = this.deliveryMetrics.get(channelId);
    
    if (!config?.rateLimit || !metrics) {
      return true;
    }

    const now = new Date();
    const minutesSinceReset = (now.getTime() - metrics.lastReset.getTime()) / 60000;
    
    if (config.rateLimit.perMinute && minutesSinceReset < 1) {
      return metrics.sent < config.rateLimit.perMinute;
    }
    
    if (config.rateLimit.perHour && minutesSinceReset < 60) {
      return metrics.sent < config.rateLimit.perHour;
    }
    
    if (config.rateLimit.perDay && minutesSinceReset < 1440) {
      return metrics.sent < config.rateLimit.perDay;
    }
    
    return true;
  }

  /**
   * Get user's enabled channels
   */
  private async getUserEnabledChannels(
    userId: string,
    requestedChannels: string[]
  ): Promise<string[]> {
    const { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('channels')
      .eq('user_id', userId)
      .single();

    if (!prefs?.channels) {
      return requestedChannels;
    }

    return requestedChannels.filter(ch => prefs.channels[ch] === true);
  }

  /**
   * Apply template variables
   */
  private applyTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (!error) return false;
    
    const message = (error as Error).message || String(error);
    const nonRetryableErrors = [
      'not opted in',
      'invalid number',
      'unsubscribed',
      'blocked',
      'invalid email',
      'user not found'
    ];
    
    return !nonRetryableErrors.some(err => 
      message.toLowerCase().includes(err)
    );
  }

  /**
   * Update delivery metrics
   */
  private updateMetrics(channelId: string, success: boolean): void {
    const metrics = this.deliveryMetrics.get(channelId);
    if (metrics) {
      if (success) {
        metrics.sent++;
      } else {
        metrics.failed++;
      }
    }
  }

  /**
   * Reset metrics periodically
   */
  private startMetricsReset(): void {
    // Reset every hour
    setInterval(() => {
      const now = new Date();
      this.deliveryMetrics.forEach((metrics, _channelId) => {
        const hoursSinceReset = (now.getTime() - metrics.lastReset.getTime()) / 3600000;
        if (hoursSinceReset >= 1) {
          metrics.sent = 0;
          metrics.failed = 0;
          metrics.lastReset = now;
        }
      });
    }, 3600000);
  }

  /**
   * Log delivery results for analytics
   */
  private async logDeliveryResults(
    payload: NotificationPayload,
    results: Map<string, DeliveryResult>
  ): Promise<void> {
    const deliveryLog = {
      user_id: payload.userId,
      notification_type: payload.type,
      priority: payload.priority,
      channels_attempted: Array.from(results.keys()),
      delivery_status: Object.fromEntries(
        Array.from(results.entries()).map(([channel, result]) => [
          channel,
          {
            success: result.success,
            error: result.error,
            messageId: result.messageId,
            timestamp: result.timestamp.toISOString()
          }
        ])
      ),
      created_at: new Date().toISOString()
    };

    await supabase
      .from('notification_delivery_logs')
      .insert(deliveryLog);
  }

  /**
   * Get channel statistics
   */
  getChannelStats(): Map<string, {
    config: ChannelConfig;
    metrics: { sent: number; failed: number; successRate: number };
  }> {
    const stats = new Map();
    
    this.channels.forEach((config, channelId) => {
      const metrics = this.deliveryMetrics.get(channelId)!;
      const total = metrics.sent + metrics.failed;
      const successRate = total > 0 ? metrics.sent / total : 0;
      
      stats.set(channelId, {
        config,
        metrics: {
          sent: metrics.sent,
          failed: metrics.failed,
          successRate
        }
      });
    });
    
    return stats;
  }

  /**
   * Enable or disable a channel
   */
  setChannelEnabled(channelId: string, enabled: boolean): void {
    const config = this.channels.get(channelId);
    if (config) {
      config.enabled = enabled;
    }
  }

  /**
   * Update channel configuration
   */
  updateChannelConfig(channelId: string, updates: Partial<ChannelConfig>): void {
    const config = this.channels.get(channelId);
    if (config) {
      Object.assign(config, updates);
    }
  }
}

// Export singleton instance
export const channelManager = new ChannelManager();