import { supabase } from '@/integrations/supabase/client';
import _type { Json } from '@/integrations/supabase/types';

export _type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';
export _type NotificationType = 'check_in' | 'goal_deadline' | 'appointment' | 'crisis' | 'community' | 'provider' | 'system';
export _type NotificationPriority = 1 | 2 | 3 | 4; // 1=urgent, 2=high, 3=normal, 4=low

export interface NotificationTemplate {
  id: string;
  name: string;
  _type: string;
  _channel: string;
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
  _unsubscribed_types: Json;
  global_unsubscribe: boolean;
}

export interface QueuedNotification {
  id?: string;
  user_id: string;
  _template_id?: string;
  _channel: NotificationChannel;
  priority: NotificationPriority;
  _scheduled_for: Date;
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
  async getTemplates(_type?: NotificationType, _channel?: NotificationChannel): Promise<NotificationTemplate[]> {
    let query = supabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true);

    if (_type) query = query.eq('_type', _type);
    if (_channel) query = query.eq('_channel', _channel);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async createTemplate(_template: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate> {
    const { data, error } = await supabase
      .from('notification_templates')
      .insert(_template)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Notification Preferences
  async getPreferences(_userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', _userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async updatePreferences(_userId: string, _preferences: Partial<NotificationPreferences>): Promise<void> {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({ user_id: _userId, ..._preferences });

    if (error) throw error;
  }

  async initializeDefaultPreferences(_userId: string): Promise<void> {
    const _defaultPreferences: Partial<NotificationPreferences> = {
      user_id: _userId,
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
      _unsubscribed_types: [],
      global_unsubscribe: false
    };

    await this.updatePreferences(_userId, _defaultPreferences);
  }

  // Notification Scheduling and Queuing
  async scheduleNotification(notification: QueuedNotification): Promise<string> {
    // Check user _preferences first
    const _preferences = await this.getPreferences(notification.user_id);
    if (!_preferences || _preferences.global_unsubscribe) {
      throw new Error('User has unsubscribed from all notifications');
    }

    // Apply quiet hours logic
    if (_preferences.quiet_hours_enabled && !this.isEmergencyOverride(notification.priority)) {
      const scheduledTime = this.adjustForQuietHours(notification._scheduled_for, _preferences);
      notification._scheduled_for = scheduledTime;
    }

    // Apply optimal delivery timing if enabled
    if (_preferences.optimal_delivery_enabled) {
      notification._scheduled_for = await this.calculateOptimalDeliveryTime(
        notification.user_id,
        notification._scheduled_for
      );
    }

    // Check frequency limits
    await this.enforceFrequencyLimits(notification.user_id, _preferences);

    // Queue the notification
    const { data, error } = await supabase
      .from('notification_queue')
      .insert({
        user_id: notification.user_id,
        _template_id: notification._template_id,
        _channel: notification._channel,
        priority: notification.priority,
        _scheduled_for: notification._scheduled_for.toISOString(),
        variables: notification.variables,
        subject: notification.subject,
        body: notification.body,
        recipient_address: notification.recipient_address
      })
      .select()
      .single();

    if (error) throw error;

    // Handle batching if enabled
    if (_preferences.batch_similar_notifications) {
      await this.handleNotificationBatching(notification.user_id, data.id, _preferences);
    }

    return data.id;
  }

  async sendImmediateNotification(
    _userId: string,
    _type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 3,
    data?: Record<string, any>
  ): Promise<void> {
    const _preferences = await this.getPreferences(_userId);
    if (!_preferences) return;

    const channels = this.getChannelsForType(_type, _preferences);
    
    for (const _channel of channels) {
      const notification: QueuedNotification = {
        user_id: _userId,
        _channel,
        priority,
        _scheduled_for: new Date(),
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
  private async calculateOptimalDeliveryTime(_userId: string, _proposedTime: Date): Promise<Date> {
    // Get user's historical engagement patterns
    const { data: analytics } = await supabase
      .from('notification_analytics')
      .select('timestamp, event_type')
      .eq('user_id', _userId)
      .eq('event_type', 'opened')
      .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (!analytics || analytics.length < 5) {
      return _proposedTime; // Not enough data, use proposed time
    }

    // Calculate optimal hours based on historical opens
    const _hourCounts: Record<number, number> = {};
    analytics.forEach(record => {
      const hour = new Date(record.timestamp).getHours();
      _hourCounts[hour] = (_hourCounts[hour] || 0) + 1;
    });

    const optimalHour = Object.entries(_hourCounts)
      .sort(([,a], [,b]) => b - a)[0][0];

    // Adjust the proposed time to the optimal hour
    const optimizedTime = new Date(_proposedTime);
    optimizedTime.setHours(parseInt(optimalHour), 0, 0, 0);

    // If the optimal time has passed today, schedule for tomorrow
    if (optimizedTime <= new Date()) {
      optimizedTime.setDate(optimizedTime.getDate() + 1);
    }

    return optimizedTime;
  }

  private async handleNotificationBatching(
    _userId: string,
    _notificationId: string,
    _preferences: NotificationPreferences
  ): Promise<void> {
    const batchWindow = new Date(Date.now() + _preferences.batch_delay_minutes * 60 * 1000);

    // Check for existing batch within the time window
    const { data: existingBatch } = await supabase
      .from('notification_batches')
      .select('*')
      .eq('user_id', _userId)
      .eq('status', 'pending')
      .gte('_scheduled_for', new Date().toISOString())
      .lte('_scheduled_for', batchWindow.toISOString())
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
          user_id: _userId,
          _batch_type: 'time_based',
          _scheduled_for: batchWindow.toISOString(),
          notification_count: 1
        });
    }
  }

  private async enforceFrequencyLimits(
    _userId: string,
    _preferences: NotificationPreferences
  ): Promise<void> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check hourly limit
    const { count: hourlyCount } = await supabase
      .from('notification_queue')
      .select('*', { count: 'exact', _head: true })
      .eq('user_id', _userId)
      .gte('created_at', hourAgo.toISOString());

    if (hourlyCount && hourlyCount >= _preferences.max_hourly_notifications) {
      throw new Error('Hourly notification limit exceeded');
    }

    // Check daily limit
    const { count: dailyCount } = await supabase
      .from('notification_queue')
      .select('*', { count: 'exact', _head: true })
      .eq('user_id', _userId)
      .gte('created_at', dayAgo.toISOString());

    if (dailyCount && dailyCount >= _preferences.max_daily_notifications) {
      throw new Error('Daily notification limit exceeded');
    }
  }

  private adjustForQuietHours(_proposedTime: Date, _preferences: NotificationPreferences): Date {
    const _quietStart = this.parseTime(_preferences.quiet_hours_start);
    const quietEnd = this.parseTime(_preferences.quiet_hours_end);
    const _proposedHour = _proposedTime.getHours();
    const _proposedMinutes = _proposedTime.getMinutes();

    // Check if proposed time falls within quiet hours
    const _isInQuietHours = this.isTimeInQuietHours(
      _proposedHour,
      _proposedMinutes,
      _quietStart,
      quietEnd
    );

    if (_isInQuietHours) {
      // Schedule for end of quiet hours
      const adjustedTime = new Date(_proposedTime);
      adjustedTime.setHours(quietEnd.hours, quietEnd.minutes, 0, 0);
      
      // If that time has passed today, schedule for tomorrow
      if (adjustedTime <= new Date()) {
        adjustedTime.setDate(adjustedTime.getDate() + 1);
      }
      
      return adjustedTime;
    }

    return _proposedTime;
  }

  private isEmergencyOverride(priority: NotificationPriority): boolean {
    return priority <= 2; // Urgent or high priority
  }

  private getChannelsForType(
    _type: NotificationType,
    _preferences: NotificationPreferences
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

    const channelKey = channelMap[_type];
    const channels = _preferences[channelKey] as unknown as NotificationChannel[];
    return Array.isArray(channels) ? channels : [];
  }

  private parseTime(timeString: string): { hours: number; minutes: number } {
    const [hours, minutes] = timeString.split(':').map(_Number);
    return { hours, minutes };
  }

  private isTimeInQuietHours(
    hour: number,
    minutes: number,
    _quietStart: { hours: number; minutes: number },
    quietEnd: { hours: number; minutes: number }
  ): boolean {
    const timeInMinutes = hour * 60 + minutes;
    const startInMinutes = _quietStart.hours * 60 + _quietStart.minutes;
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
    _notificationId: string,
    _userId: string,
    eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed',
    eventData?: Record<string, any>
  ): Promise<void> {
    // Get notification details for required fields
    const { data: notification } = await supabase
      .from('notification_queue')
      .select('_template_id, _channel')
      .eq('id', _notificationId)
      .single();

    if (!notification) return;

    const { error } = await supabase
      .from('notification_analytics')
      .insert({
        user_id: _userId,
        _notification_id: _notificationId,
        _template_id: notification._template_id,
        _channel: notification._channel,
        _type: 'notification', // Default _type since column doesn't exist in queue table
        event_type: eventType,
        _event_data: eventData || {},
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
      .eq('id', _notificationId);
  }

  async getNotificationAnalytics(
    _userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<NotificationAnalytics> {
    let query = supabase
      .from('notification_analytics')
      .select('event_type')
      .eq('user_id', _userId);

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
  async unsubscribeFromType(_userId: string, _type: NotificationType): Promise<void> {
    const _preferences = await this.getPreferences(_userId);
    if (!_preferences) return;

    const currentTypes = Array.isArray(_preferences._unsubscribed_types) 
      ? _preferences._unsubscribed_types as string[]
      : [];
    const updatedTypes = [...currentTypes, _type];
    await this.updatePreferences(_userId, { 
      _unsubscribed_types: updatedTypes 
    });
  }

  async globalUnsubscribe(_userId: string): Promise<void> {
    await this.updatePreferences(_userId, { global_unsubscribe: true });
  }

  async resubscribe(_userId: string, _type?: NotificationType): Promise<void> {
    const _preferences = await this.getPreferences(_userId);
    if (!_preferences) return;

    if (_type) {
      const currentTypes = Array.isArray(_preferences._unsubscribed_types) 
        ? _preferences._unsubscribed_types as string[]
        : [];
      const updatedTypes = currentTypes.filter(t => t !== _type);
      await this.updatePreferences(_userId, { 
        _unsubscribed_types: updatedTypes 
      });
    } else {
      await this.updatePreferences(_userId, { 
        global_unsubscribe: false,
        _unsubscribed_types: []
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
          _scheduled_for: nextRetry.toISOString(),
          retry_count: notification.retry_count + 1
        })
        .eq('id', notification.id);
    }
  }
}

export const comprehensiveNotificationService = new ComprehensiveNotificationService();