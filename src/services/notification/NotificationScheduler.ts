import { supabase } from '@/integrations/supabase/client';

interface ScheduledNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  channels: string[];
  scheduledFor: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
  retryCount?: number;
  maxRetries?: number;
}

interface RateLimitState {
  userId: string;
  hourlyCount: number;
  dailyCount: number;
  lastHourReset: Date;
  lastDayReset: Date;
}

interface QueueItem {
  id: string;
  notification: ScheduledNotification;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
}

export class NotificationScheduler {
  private queue: Map<string, QueueItem> = new Map();
  private rateLimits: Map<string, RateLimitState> = new Map();
  private processingInterval: NodeJS.Timer | null = null;
  private readonly PROCESS_INTERVAL_MS = 5000; // Process queue every 5 seconds
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 60000; // 1 minute between retries

  constructor() {
    this.startProcessor();
    this.loadPendingNotifications();
  }

  /**
   * Schedule a notification for future delivery
   */
  async scheduleNotification(notification: Omit<ScheduledNotification, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    const scheduledNotification: ScheduledNotification = {
      ...notification,
      id,
      retryCount: 0,
      maxRetries: notification.maxRetries ?? this.MAX_RETRIES
    };

    // Store in database
    const { error } = await supabase
      .from('scheduled_notifications')
      .insert({
        id,
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        channels: notification.channels,
        scheduled_for: notification.scheduledFor.toISOString(),
        priority: notification.priority,
        metadata: notification.metadata,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to schedule notification: ${error.message}`);
    }

    // Add to local queue if scheduled soon
    const timeUntilDelivery = notification.scheduledFor.getTime() - Date.now();
    if (timeUntilDelivery <= 60000) { // If within 1 minute, add to queue
      this.addToQueue(scheduledNotification);
    }

    return id;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<boolean> {
    // Remove from queue
    this.queue.delete(notificationId);

    // Update database
    const { error } = await supabase
      .from('scheduled_notifications')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    return !error;
  }

  /**
   * Reschedule a notification
   */
  async rescheduleNotification(
    notificationId: string, 
    newScheduledFor: Date
  ): Promise<boolean> {
    // Remove from current queue
    this.queue.delete(notificationId);

    // Update database
    const { error } = await supabase
      .from('scheduled_notifications')
      .update({ 
        scheduled_for: newScheduledFor.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (!error) {
      // Reload if scheduled soon
      const timeUntilDelivery = newScheduledFor.getTime() - Date.now();
      if (timeUntilDelivery <= 60000) {
        await this.loadNotification(notificationId);
      }
    }

    return !error;
  }

  /**
   * Check if user has exceeded rate limits
   */
  async checkRateLimit(userId: string, priority: string): Promise<boolean> {
    // Get user preferences
    const { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('max_per_hour, max_per_day, emergency_override')
      .eq('user_id', userId)
      .single();

    const maxPerHour = prefs?.max_per_hour ?? 10;
    const maxPerDay = prefs?.max_per_day ?? 50;
    const emergencyOverride = prefs?.emergency_override ?? true;

    // Emergency notifications bypass rate limits
    if (priority === 'urgent' && emergencyOverride) {
      return true;
    }

    // Get or create rate limit state
    let state = this.rateLimits.get(userId);
    const now = new Date();

    if (!state) {
      state = {
        userId,
        hourlyCount: 0,
        dailyCount: 0,
        lastHourReset: now,
        lastDayReset: now
      };
      this.rateLimits.set(userId, state);
    }

    // Reset counters if needed
    const hoursSinceReset = (now.getTime() - state.lastHourReset.getTime()) / 3600000;
    const daysSinceReset = (now.getTime() - state.lastDayReset.getTime()) / 86400000;

    if (hoursSinceReset >= 1) {
      state.hourlyCount = 0;
      state.lastHourReset = now;
    }

    if (daysSinceReset >= 1) {
      state.dailyCount = 0;
      state.lastDayReset = now;
    }

    // Check limits
    if (state.hourlyCount >= maxPerHour || state.dailyCount >= maxPerDay) {
      // Log rate limit exceeded
      await this.logRateLimitExceeded(userId, state.hourlyCount, state.dailyCount);
      return false;
    }

    // Increment counters
    state.hourlyCount++;
    state.dailyCount++;

    return true;
  }

  /**
   * Check if notification should be sent during quiet hours
   */
  async checkQuietHours(userId: string, priority: string): Promise<boolean> {
    // Get user preferences
    const { data: prefs } = await supabase
      .from('user_notification_preferences')
      .select('quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone, allow_emergency_override')
      .eq('user_id', userId)
      .single();

    if (!prefs?.quiet_hours_enabled) {
      return true; // No quiet hours configured
    }

    // Emergency notifications can override quiet hours
    if (priority === 'urgent' && prefs.allow_emergency_override) {
      return true;
    }

    // Check current time against quiet hours
    const userTimezone = prefs.timezone || 'UTC';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: userTimezone
    });
    
    const currentTime = formatter.format(now);
    const startTime = prefs.quiet_hours_start;
    const endTime = prefs.quiet_hours_end;

    // Handle overnight quiet hours
    if (startTime > endTime) {
      // Quiet hours span midnight
      return currentTime < endTime || currentTime >= startTime ? false : true;
    } else {
      // Normal quiet hours
      return currentTime >= startTime && currentTime < endTime ? false : true;
    }
  }

  /**
   * Process a single notification
   */
  private async processNotification(item: QueueItem): Promise<void> {
    const { notification } = item;

    try {
      // Update status
      item.status = 'processing';
      item.lastAttempt = new Date();

      // Check rate limits
      const rateLimitOk = await this.checkRateLimit(notification.userId, notification.priority);
      if (!rateLimitOk) {
        // Reschedule for later
        const delayMs = notification.priority === 'high' ? 300000 : 3600000; // 5 min or 1 hour
        const newScheduledFor = new Date(Date.now() + delayMs);
        await this.rescheduleNotification(notification.id, newScheduledFor);
        item.status = 'pending';
        return;
      }

      // Check quiet hours
      const quietHoursOk = await this.checkQuietHours(notification.userId, notification.priority);
      if (!quietHoursOk) {
        // Reschedule for after quiet hours
        const { data: prefs } = await supabase
          .from('user_notification_preferences')
          .select('quiet_hours_end, timezone')
          .eq('user_id', notification.userId)
          .single();

        if (prefs) {
          const endTime = prefs.quiet_hours_end;
          const [hours, minutes] = endTime.split(':').map(Number);
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(hours, minutes, 0, 0);
          
          await this.rescheduleNotification(notification.id, tomorrow);
          item.status = 'pending';
          return;
        }
      }

      // Send notification through channels
      await this.sendThroughChannels(notification);

      // Mark as completed
      item.status = 'completed';
      await supabase
        .from('scheduled_notifications')
        .update({ 
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('id', notification.id);

      // Remove from queue
      this.queue.delete(notification.id);

    } catch (error) {
      console.error('Error processing notification:', error);
      item.attempts++;
      item.error = error instanceof Error ? error.message : 'Unknown error';

      if (item.attempts >= this.MAX_RETRIES) {
        // Max retries reached, mark as failed
        item.status = 'failed';
        await supabase
          .from('scheduled_notifications')
          .update({ 
            status: 'failed',
            error: item.error,
            failed_at: new Date().toISOString()
          })
          .eq('id', notification.id);

        // Remove from queue
        this.queue.delete(notification.id);
      } else {
        // Retry later
        item.status = 'pending';
      }
    }
  }

  /**
   * Send notification through configured channels
   */
  private async sendThroughChannels(notification: ScheduledNotification): Promise<void> {
    const results = await Promise.allSettled(
      notification.channels.map(channel => this.sendToChannel(notification, channel))
    );

    // Log delivery results
    const deliveryStatus = notification.channels.reduce((acc, channel, index) => {
      acc[channel] = results[index].status === 'fulfilled' ? 'delivered' : 'failed';
      return acc;
    }, {} as Record<string, string>);

    await supabase
      .from('notification_delivery_logs')
      .insert({
        notification_id: notification.id,
        user_id: notification.userId,
        channels: notification.channels,
        delivery_status: deliveryStatus,
        delivered_at: new Date().toISOString()
      });
  }

  /**
   * Send notification to a specific channel
   */
  private async sendToChannel(notification: ScheduledNotification, channel: string): Promise<void> {
    switch (channel) {
      case 'in_app':
        return this.sendInAppNotification(notification);
      case 'email':
        return this.sendEmailNotification(notification);
      case 'sms':
        return this.sendSMSNotification(notification);
      case 'whatsapp':
        return this.sendWhatsAppNotification(notification);
      case 'push':
        return this.sendPushNotification(notification);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(notification: ScheduledNotification): Promise<void> {
    // Store in notifications table
    await supabase
      .from('notifications')
      .insert({
        user_id: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.body,
        priority: notification.priority,
        metadata: notification.metadata,
        created_at: new Date().toISOString()
      });

    // Send realtime event
    await supabase
      .from('realtime_notifications')
      .insert({
        user_id: notification.userId,
        event: 'new_notification',
        payload: {
          type: notification.type,
          title: notification.title,
          body: notification.body,
          priority: notification.priority
        },
        created_at: new Date().toISOString()
      });
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: ScheduledNotification): Promise<void> {
    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', notification.userId)
      .single();

    if (!profile?.email) {
      throw new Error('User email not found');
    }

    // Queue email for sending (integrate with email service)
    await supabase
      .from('email_queue')
      .insert({
        to: profile.email,
        subject: notification.title,
        body: notification.body,
        template: notification.metadata?.template,
        variables: notification.metadata?.variables,
        priority: notification.priority,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: ScheduledNotification): Promise<void> {
    // Get user phone
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', notification.userId)
      .single();

    if (!profile?.phone) {
      throw new Error('User phone not found');
    }

    // Queue SMS for sending (integrate with Twilio)
    await supabase
      .from('sms_queue')
      .insert({
        to: profile.phone,
        message: `${notification.title}\n${notification.body}`,
        priority: notification.priority,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Send WhatsApp notification
   */
  private async sendWhatsAppNotification(notification: ScheduledNotification): Promise<void> {
    // Check WhatsApp opt-in
    const { data: optIn } = await supabase
      .from('whatsapp_opt_ins')
      .select('phone_number')
      .eq('user_id', notification.userId)
      .eq('opted_in', true)
      .single();

    if (!optIn?.phone_number) {
      throw new Error('User not opted in for WhatsApp');
    }

    // Queue WhatsApp message (integrate with Twilio WhatsApp)
    await supabase
      .from('whatsapp_queue')
      .insert({
        to: optIn.phone_number,
        message: `*${notification.title}*\n\n${notification.body}`,
        priority: notification.priority,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: ScheduledNotification): Promise<void> {
    // Get push subscriptions
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', notification.userId);

    if (!subscriptions || subscriptions.length === 0) {
      throw new Error('No push subscriptions found');
    }

    // Queue push notifications (integrate with FCM/Web Push)
    await Promise.all(
      subscriptions.map(sub => 
        supabase
          .from('push_queue')
          .insert({
            subscription: sub.subscription,
            title: notification.title,
            body: notification.body,
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            data: notification.metadata,
            priority: notification.priority,
            created_at: new Date().toISOString()
          })
      )
    );
  }

  /**
   * Load pending notifications from database
   */
  private async loadPendingNotifications(): Promise<void> {
    const { data: notifications } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date(Date.now() + 60000).toISOString())
      .order('scheduled_for', { ascending: true });

    if (notifications) {
      notifications.forEach(n => {
        const notification: ScheduledNotification = {
          id: n.id,
          userId: n.user_id,
          type: n.type,
          title: n.title,
          body: n.body,
          channels: n.channels,
          scheduledFor: new Date(n.scheduled_for),
          priority: n.priority,
          metadata: n.metadata,
          retryCount: n.retry_count || 0,
          maxRetries: n.max_retries || this.MAX_RETRIES
        };
        this.addToQueue(notification);
      });
    }
  }

  /**
   * Load a specific notification
   */
  private async loadNotification(notificationId: string): Promise<void> {
    const { data: n } = await supabase
      .from('scheduled_notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (n && n.status === 'pending') {
      const notification: ScheduledNotification = {
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        body: n.body,
        channels: n.channels,
        scheduledFor: new Date(n.scheduled_for),
        priority: n.priority,
        metadata: n.metadata,
        retryCount: n.retry_count || 0,
        maxRetries: n.max_retries || this.MAX_RETRIES
      };
      this.addToQueue(notification);
    }
  }

  /**
   * Add notification to processing queue
   */
  private addToQueue(notification: ScheduledNotification): void {
    if (!this.queue.has(notification.id)) {
      this.queue.set(notification.id, {
        id: notification.id,
        notification,
        status: 'pending',
        attempts: 0
      });
    }
  }

  /**
   * Start the queue processor
   */
  private startProcessor(): void {
    if (this.processingInterval) {
      return;
    }

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.PROCESS_INTERVAL_MS);
  }

  /**
   * Stop the queue processor
   */
  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  /**
   * Process the notification queue
   */
  private async processQueue(): Promise<void> {
    const now = new Date();
    const items = Array.from(this.queue.values());

    for (const item of items) {
      // Skip if already processing or failed
      if (item.status === 'processing' || item.status === 'failed') {
        continue;
      }

      // Check if it's time to send
      if (item.notification.scheduledFor <= now) {
        // Check retry delay
        if (item.lastAttempt) {
          const timeSinceLastAttempt = now.getTime() - item.lastAttempt.getTime();
          if (timeSinceLastAttempt < this.RETRY_DELAY_MS) {
            continue; // Wait before retrying
          }
        }

        // Process notification
        await this.processNotification(item);
      }
    }

    // Load more notifications if queue is low
    if (this.queue.size < 10) {
      await this.loadPendingNotifications();
    }
  }

  /**
   * Log rate limit exceeded event
   */
  private async logRateLimitExceeded(
    userId: string, 
    hourlyCount: number, 
    dailyCount: number
  ): Promise<void> {
    await supabase
      .from('notification_events')
      .insert({
        user_id: userId,
        event_type: 'rate_limit_exceeded',
        details: {
          hourly_count: hourlyCount,
          daily_count: dailyCount
        },
        created_at: new Date().toISOString()
      });
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  } {
    const items = Array.from(this.queue.values());
    return {
      total: items.length,
      pending: items.filter(i => i.status === 'pending').length,
      processing: items.filter(i => i.status === 'processing').length,
      completed: items.filter(i => i.status === 'completed').length,
      failed: items.filter(i => i.status === 'failed').length
    };
  }
}

// Export singleton instance
export const notificationScheduler = new NotificationScheduler();