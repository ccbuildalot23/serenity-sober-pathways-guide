import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';
export type NotificationType = 'check_in' | 'goal_deadline' | 'appointment' | 'crisis' | 'community' | 'provider' | 'system';
export type NotificationPriority = 1 | 2 | 3 | 4; // 1=urgent, 2=high, 3=normal, 4=low

export interface NotificationTemplate {
  id: string;
  name: string;
  type: string;
  channel: string;
  subject_template?: string;
  body_template: string;
  variables: Json;
  is_active: boolean;
  language_code: string;
}

export interface NotificationPreferences {
  user_id: string;
  check_in_channels: Json;
  goal_deadline_channels: Json;
  appointment_channels: Json;
  crisis_channels: Json;
  community_channels: Json;
  provider_channels: Json;
  system_channels: Json;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  quiet_hours_timezone: string;
  max_daily_notifications: number;
  max_hourly_notifications: number;
  batch_similar_notifications: boolean;
  batch_delay_minutes: number;
  language_preference: string;
  emergency_override: boolean;
  optimal_delivery_enabled: boolean;
  unsubscribed_types: Json;
  global_unsubscribe: boolean;
}

export interface QueuedNotification {
  id?: string;
  user_id: string;
  template_id?: string;
  channel: NotificationChannel;
  priority: NotificationPriority;
  scheduled_for: Date;
  variables: Record<string, any>;
  subject?: string;
  body: string;
  recipient_address?: string;
}

export interface NotificationAnalytics {
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  failed_count: number;
  open_rate: number;
  click_rate: number;
  delivery_rate: number;
  engagement_score: number;
}

class ComprehensiveNotificationService {

  // Template Management
  async getTemplates(type?: NotificationType, channel?: NotificationChannel): Promise<NotificationTemplate[]> {
    let query = supabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true);

    if (type) query = query.eq('type', type);
    if (channel) query = query.eq('channel', channel);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createTemplate(template: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate> {
    const { data, error } = await supabase
      .from('notification_templates')
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Notification Preferences
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: userId, ...preferences });

    if (error) throw error;
  }

  async initializeDefaultPreferences(userId: string): Promise<void> {
    const defaultPreferences: Partial<NotificationPreferences> = {
      user_id: userId,
      check_in_channels: ['in_app'],
      goal_deadline_channels: ['in_app', 'email'],
      appointment_channels: ['in_app', 'email', 'sms'],
      crisis_channels: ['in_app', 'email', 'sms', 'push'],
      community_channels: ['in_app'],
      provider_channels: ['in_app', 'email'],
      system_channels: ['in_app', 'email'],
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      quiet_hours_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      max_daily_notifications: 10,
      max_hourly_notifications: 3,
      batch_similar_notifications: true,
      batch_delay_minutes: 15,
      language_preference: 'en',
      emergency_override: true,
      optimal_delivery_enabled: true,
      unsubscribed_types: [],
      global_unsubscribe: false
    };

    await this.updatePreferences(userId, defaultPreferences);
  }

  // Notification Scheduling and Queuing
  async scheduleNotification(notification: QueuedNotification): Promise<string> {
    // Check user preferences first
    const preferences = await this.getPreferences(notification.user_id);
    if (!preferences || preferences.global_unsubscribe) {
      throw new Error('User has unsubscribed from all notifications');
    }

    // Apply quiet hours logic
    if (preferences.quiet_hours_enabled && !this.isEmergencyOverride(notification.priority)) {
      const scheduledTime = this.adjustForQuietHours(notification.scheduled_for, preferences);
      notification.scheduled_for = scheduledTime;
    }

    // Apply optimal delivery timing if enabled
    if (preferences.optimal_delivery_enabled) {
      notification.scheduled_for = await this.calculateOptimalDeliveryTime(
        notification.user_id,
        notification.scheduled_for
      );
    }

    // Check frequency limits
    await this.enforceFrequencyLimits(notification.user_id, preferences);

    // Queue the notification
    const { data, error } = await supabase
      .from('notification_queue')
      .insert({
        user_id: notification.user_id,
        template_id: notification.template_id,
        channel: notification.channel,
        priority: notification.priority,
        scheduled_for: notification.scheduled_for.toISOString(),
        variables: notification.variables,
        subject: notification.subject,
        body: notification.body,
        recipient_address: notification.recipient_address
      })
      .select()
      .single();

    if (error) throw error;

    // Handle batching if enabled
    if (preferences.batch_similar_notifications) {
      await this.handleNotificationBatching(notification.user_id, data.id, preferences);
    }

    return data.id;
  }

  async sendImmediateNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 3,
    data?: Record<string, any>
  ): Promise<void> {
    const preferences = await this.getPreferences(userId);
    if (!preferences) return;

    const channels = this.getChannelsForType(type, preferences);
    
    for (const channel of channels) {
      const notification: QueuedNotification = {
        user_id: userId,
        channel,
        priority,
        scheduled_for: new Date(),
        variables: data || {},
        subject: title,
        body: message
      };

      await this.scheduleNotification(notification);
    }

    // For in-app notifications, we'd typically use a different service
    // This is handled by the existing notification system
  }

  // Smart Features
  private async calculateOptimalDeliveryTime(userId: string, proposedTime: Date): Promise<Date> {
    // Get user's historical engagement patterns
    const { data: analytics } = await supabase
      .from('notification_analytics')
      .select('timestamp, event_type')
      .eq('user_id', userId)
      .eq('event_type', 'opened')
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!analytics || analytics.length < 5) {
      return proposedTime; // Not enough data, use proposed time
    }

    // Calculate optimal hours based on historical opens
    const hourCounts: Record<number, number> = {};
    analytics.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const optimalHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    // Adjust the proposed time to the optimal hour
    const optimizedTime = new Date(proposedTime);
    optimizedTime.setHours(parseInt(optimalHour), 0, 0, 0);

    // If the optimal time has passed today, schedule for tomorrow
    if (optimizedTime <= new Date()) {
      optimizedTime.setDate(optimizedTime.getDate() + 1);
    }

    return optimizedTime;
  }

  private async handleNotificationBatching(
    userId: string,
    notificationId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    const batchWindow = new Date(Date.now() + preferences.batch_delay_minutes * 60 * 1000);

    // Check for existing batch within the time window
    const { data: existingBatch } = await supabase
      .from('notification_batches')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('scheduled_for', new Date().toISOString())
      .lte('scheduled_for', batchWindow.toISOString())
      .single();

    if (existingBatch) {
      // Add to existing batch
      await supabase
        .from('notification_batches')
        .update({ 
          notification_count: existingBatch.notification_count + 1 
        })
        .eq('id', existingBatch.id);
    } else {
      // Create new batch
      await supabase
        .from('notification_batches')
        .insert({
          user_id: userId,
          batch_type: 'time_based',
          scheduled_for: batchWindow.toISOString(),
          notification_count: 1
        });
    }
  }

  private async enforceFrequencyLimits(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly limit
    const { count: hourlyCount } = await supabase
      .from('notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', hourAgo.toISOString());

    if (hourlyCount && hourlyCount >= preferences.max_hourly_notifications) {
      throw new Error('Hourly notification limit exceeded');
    }

    // Check daily limit
    const { count: dailyCount } = await supabase
      .from('notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', dayAgo.toISOString());

    if (dailyCount && dailyCount >= preferences.max_daily_notifications) {
      throw new Error('Daily notification limit exceeded');
    }
  }

  private adjustForQuietHours(proposedTime: Date, preferences: NotificationPreferences): Date {
    const quietStart = this.parseTime(preferences.quiet_hours_start);
    const quietEnd = this.parseTime(preferences.quiet_hours_end);
    const proposedHour = proposedTime.getHours();
    const proposedMinutes = proposedTime.getMinutes();

    // Check if proposed time falls within quiet hours
    const isInQuietHours = this.isTimeInQuietHours(
      proposedHour,
      proposedMinutes,
      quietStart,
      quietEnd
    );

    if (isInQuietHours) {
      // Schedule for end of quiet hours
      const adjustedTime = new Date(proposedTime);
      adjustedTime.setHours(quietEnd.hours, quietEnd.minutes, 0, 0);
      
      // If that time has passed today, schedule for tomorrow
      if (adjustedTime <= new Date()) {
        adjustedTime.setDate(adjustedTime.getDate() + 1);
      }
      
      return adjustedTime;
    }

    return proposedTime;
  }

  private isEmergencyOverride(priority: NotificationPriority): boolean {
    return priority <= 2; // Urgent or high priority
  }

  private getChannelsForType(
    type: NotificationType,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    const channelMap: Record<string, keyof NotificationPreferences> = {
      check_in: 'check_in_channels',
      goal_deadline: 'goal_deadline_channels',
      appointment: 'appointment_channels',
      crisis: 'crisis_channels',
      community: 'community_channels',
      provider: 'provider_channels',
      system: 'system_channels'
    };

    const channelKey = channelMap[type];
    const channels = preferences[channelKey] as unknown as NotificationChannel[];
    return Array.isArray(channels) ? channels : [];
  }

  private parseTime(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(Number);
    return { hours, minutes };
  }

  private isTimeInQuietHours(
    hour: number,
    minutes: number,
    quietStart: { hours: number; minutes: number },
    quietEnd: { hours: number; minutes: number }
  ): boolean {
    const timeInMinutes = hour * 60 + minutes;
    const startInMinutes = quietStart.hours * 60 + quietStart.minutes;
    const endInMinutes = quietEnd.hours * 60 + quietEnd.minutes;

    if (startInMinutes <= endInMinutes) {
      // Same day quiet hours
      return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
    } else {
      // Overnight quiet hours
      return timeInMinutes >= startInMinutes || timeInMinutes <= endInMinutes;
    }
  }

  // Analytics and Tracking
  async trackNotificationEvent(
    notificationId: string,
    userId: string,
    eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed',
    eventData?: Record<string, any>
  ): Promise<void> {
    // Get notification details for required fields
    const { data: notification } = await supabase
      .from('notification_queue')
      .select('template_id, channel')
      .eq('id', notificationId)
      .single();

    if (!notification) return;

    const { error } = await supabase
      .from('notification_analytics')
      .insert({
        user_id: userId,
        notification_id: notificationId,
        template_id: notification.template_id,
        channel: notification.channel,
        type: 'notification', // Default type since column doesn't exist in queue table
        event_type: eventType,
        event_data: eventData || {},
        timestamp: new Date().toISOString()
      });

    if (error) console.error('Failed to track notification event:', error);

    // Update notification queue status
    const statusMap = {
      sent: 'sent',
      delivered: 'sent',
      opened: 'sent',
      clicked: 'sent',
      failed: 'failed'
    };

    await supabase
      .from('notification_queue')
      .update({
        status: statusMap[eventType],
        [`${eventType}_at`]: new Date().toISOString()
      })
      .eq('id', notificationId);
  }

  async getNotificationAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<NotificationAnalytics> {
    let query = supabase
      .from('notification_analytics')
      .select('event_type')
      .eq('user_id', userId);

    if (startDate) {
      query = query.gte('timestamp', startDate.toISOString());
    }
    if (endDate) {
      query = query.lte('timestamp', endDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;

    const events = data || [];
    const sent_count = events.filter(e => e.event_type === 'sent').length;
    const delivered_count = events.filter(e => e.event_type === 'delivered').length;
    const opened_count = events.filter(e => e.event_type === 'opened').length;
    const clicked_count = events.filter(e => e.event_type === 'clicked').length;
    const failed_count = events.filter(e => e.event_type === 'failed').length;

    return {
      sent_count,
      delivered_count,
      opened_count,
      clicked_count,
      failed_count,
      open_rate: sent_count > 0 ? (opened_count / sent_count) * 100 : 0,
      click_rate: opened_count > 0 ? (clicked_count / opened_count) * 100 : 0,
      delivery_rate: sent_count > 0 ? (delivered_count / sent_count) * 100 : 0,
      engagement_score: sent_count > 0 ? ((opened_count + clicked_count * 2) / sent_count) * 100 : 0
    };
  }

  // Unsubscribe Management
  async unsubscribeFromType(userId: string, type: NotificationType): Promise<void> {
    const preferences = await this.getPreferences(userId);
    if (!preferences) return;

    const currentTypes = Array.isArray(preferences.unsubscribed_types) 
      ? preferences.unsubscribed_types as string[]
      : [];
    const updatedTypes = [...currentTypes, type];
    await this.updatePreferences(userId, { 
      unsubscribed_types: updatedTypes 
    });
  }

  async globalUnsubscribe(userId: string): Promise<void> {
    await this.updatePreferences(userId, { global_unsubscribe: true });
  }

  async resubscribe(userId: string, type?: NotificationType): Promise<void> {
    const preferences = await this.getPreferences(userId);
    if (!preferences) return;

    if (type) {
      const currentTypes = Array.isArray(preferences.unsubscribed_types) 
        ? preferences.unsubscribed_types as string[]
        : [];
      const updatedTypes = currentTypes.filter(t => t !== type);
      await this.updatePreferences(userId, { 
        unsubscribed_types: updatedTypes 
      });
    } else {
      await this.updatePreferences(userId, { 
        global_unsubscribe: false,
        unsubscribed_types: []
      });
    }
  }

  // Retry Logic
  async processFailedNotifications(): Promise<void> {
    const { data: failedNotifications } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'failed')
      .filter('retry_count', 'lt', 'max_retries');

    if (!failedNotifications) return;

    for (const notification of failedNotifications) {
      // Exponential backoff: wait 2^retry_count minutes
      const retryDelay = Math.pow(2, notification.retry_count) * 60 * 1000;
      const nextRetry = new Date(Date.now() + retryDelay);

      await supabase
        .from('notification_queue')
        .update({
          status: 'pending',
          scheduled_for: nextRetry.toISOString(),
          retry_count: notification.retry_count + 1
        })
        .eq('id', notification.id);
    }
  }
}

export const comprehensiveNotificationService = new ComprehensiveNotificationService();