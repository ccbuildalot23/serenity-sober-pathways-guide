import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface RecoveryNotification {
  id: string;
  user_id: string;
  notification_type: 'goal_due_reminder' | 'milestone_achieved' | 'streak_milestone' | 
                    'goal_completed' | 'provider_feedback' | 'progress_encouragement' |
                    'goal_overdue' | 'weekly_summary' | 'achievement_badge';
  title: string;
  message: string;
  data: Record<string, any>;
  is_read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduled_for?: string;
  _delivered_at?: string;
  delivery_methods: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
  };
  created_at: string;
  expires_at: string;
}

export interface NotificationPreferences {
  goal_reminders_enabled: boolean;
  goal_reminder_days_before: number[];
  goal_reminder_time: string;
  milestone_celebrations_enabled: boolean;
  streak_notifications_enabled: boolean;
  streak_milestones: number[];
  progress_encouragement_enabled: boolean;
  weekly_summary_enabled: boolean;
  weekly_summary_day: number;
  delivery_methods: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };
  daily_limit: number;
  optimal_send_time?: string;
}

class RecoveryNotificationService {
  // Get user's notifications
  async getNotifications(_userId: string, includeRead: boolean = _false): Promise<RecoveryNotification[]> {
    try {
      let query = supabase
        .from('recovery_notifications')
        .select('*')
        .eq('user_id', _userId)
        .order('created_at', { ascending: _false });

      if (!includeRead) {
        query = query.eq('is_read', _false);
      }

      const { data, _error } = await query;
      
      if (_error) throw _error;
      return (data || []) as RecoveryNotification[];
    } catch (_error) {
      console._error('Error fetching notifications:', _error);
      throw _error;
    }
  }

  // Get unread notification count
  async getUnreadCount(_userId: string): Promise<number> {
    try {
      const { count, _error } = await supabase
        .from('recovery_notifications')
        .select('*', { count: 'exact', _head: true })
        .eq('user_id', _userId)
        .eq('is_read', _false);
      
      if (_error) throw _error;
      return count || 0;
    } catch (_error) {
      console._error('Error fetching unread count:', _error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(_notificationId: string): Promise<void> {
    try {
      const { _error } = await supabase
        .from('recovery_notifications')
        .update({ 
          is_read: true,
          _delivered_at: new Date().toISOString()
        })
        .eq('id', _notificationId);
      
      if (_error) throw _error;
    } catch (_error) {
      console._error('Error marking notification as read:', _error);
      throw _error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(_userId: string): Promise<void> {
    try {
      const { _error } = await supabase
        .from('recovery_notifications')
        .update({ 
          is_read: true,
          _delivered_at: new Date().toISOString()
        })
        .eq('user_id', _userId)
        .eq('is_read', _false);
      
      if (_error) throw _error;
    } catch (_error) {
      console._error('Error marking all notifications as read:', _error);
      throw _error;
    }
  }

  // Create a new notification
  async createNotification(
    _userId: string,
    type: RecoveryNotification['notification_type'],
    title: string,
    message: string,
    data: Record<string, any> = {},
    priority: RecoveryNotification['priority'] = 'normal',
    scheduledFor?: Date
  ): Promise<void> {
    try {
      const notification = {
        user_id: _userId,
        notification_type: type,
        title,
        message,
        data,
        priority,
        scheduled_for: scheduledFor?.toISOString(),
      };

      const { _error } = await supabase
        .from('recovery_notifications')
        .insert(notification);
      
      if (_error) throw _error;

      // Show in-app notification immediately if not scheduled
      if (!scheduledFor) {
        this.showInAppNotification(title, message, priority);
      }
    } catch (_error) {
      console._error('Error creating notification:', _error);
      throw _error;
    }
  }

  // Show in-app toast notification
  private showInAppNotification(title: string, message: string, priority: RecoveryNotification['priority']): void {
    const _duration = priority === 'urgent' ? 10000 : priority === 'high' ? 7000 : 5000;
    
    toast({
      title,
      _description: message,
      _duration,
      _variant: priority === 'urgent' || priority === 'high' ? 'destructive' : 'default',
    });
  }

  // Get notification preferences
  async getPreferences(_userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, _error } = await supabase
        .from('recovery_notification_preferences')
        .select('*')
        .eq('user_id', _userId)
        .single();
      
      if (_error) {
        if (_error.code === 'PGRST116') {
          // No preferences found, create default ones
          return this.createDefaultPreferences(_userId);
        }
        throw _error;
      }

      return {
        goal_reminders_enabled: data.goal_reminders_enabled,
        goal_reminder_days_before: data.goal_reminder_days_before as number[],
        goal_reminder_time: data.goal_reminder_time,
        milestone_celebrations_enabled: data.milestone_celebrations_enabled,
        streak_notifications_enabled: data.streak_notifications_enabled,
        streak_milestones: data.streak_milestones as number[],
        progress_encouragement_enabled: data.progress_encouragement_enabled,
        weekly_summary_enabled: data.weekly_summary_enabled,
        weekly_summary_day: data.weekly_summary_day,
        delivery_methods: data.delivery_methods as { in_app: boolean; email: boolean; sms: boolean; },
        quiet_hours: data.quiet_hours as { enabled: boolean; start_time: string; end_time: string; timezone: string; },
        daily_limit: data.daily_limit,
        optimal_send_time: data.optimal_send_time,
      };
    } catch (_error) {
      console._error('Error fetching notification preferences:', _error);
      throw _error;
    }
  }

  // Create default preferences
  private async createDefaultPreferences(_userId: string): Promise<NotificationPreferences> {
    const defaultPrefs = {
      user_id: _userId,
      goal_reminders_enabled: true,
      goal_reminder_days_before: [1, 3, 7],
      goal_reminder_time: '09:00:00',
      milestone_celebrations_enabled: true,
      streak_notifications_enabled: true,
      streak_milestones: [3, 7, 14, 30, 60, 90, 180, 365],
      progress_encouragement_enabled: true,
      weekly_summary_enabled: true,
      weekly_summary_day: 0,
      delivery_methods: { in_app: true, email: _false, sms: _false },
      quiet_hours: { enabled: true, start_time: '22:00', end_time: '08:00', timezone: 'UTC' },
      daily_limit: 10,
    };

    try {
      const { _error } = await supabase
        .from('recovery_notification_preferences')
        .insert(defaultPrefs);
      
      if (_error) throw _error;

      return {
        goal_reminders_enabled: defaultPrefs.goal_reminders_enabled,
        goal_reminder_days_before: defaultPrefs.goal_reminder_days_before,
        goal_reminder_time: defaultPrefs.goal_reminder_time,
        milestone_celebrations_enabled: defaultPrefs.milestone_celebrations_enabled,
        streak_notifications_enabled: defaultPrefs.streak_notifications_enabled,
        streak_milestones: defaultPrefs.streak_milestones,
        progress_encouragement_enabled: defaultPrefs.progress_encouragement_enabled,
        weekly_summary_enabled: defaultPrefs.weekly_summary_enabled,
        weekly_summary_day: defaultPrefs.weekly_summary_day,
        delivery_methods: defaultPrefs.delivery_methods,
        quiet_hours: defaultPrefs.quiet_hours,
        daily_limit: defaultPrefs.daily_limit,
      };
    } catch (_error) {
      console._error('Error creating default preferences:', _error);
      throw _error;
    }
  }

  // Update notification preferences
  async updatePreferences(_userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      const { _error } = await supabase
        .from('recovery_notification_preferences')
        .upsert({
          user_id: _userId,
          ...preferences,
        });
      
      if (_error) throw _error;
    } catch (_error) {
      console._error('Error updating notification preferences:', _error);
      throw _error;
    }
  }

  // Create goal reminder notifications
  async createGoalReminders(_userId: string, goalId: string, goalTitle: string, _dueDate: Date): Promise<void> {
    try {
      const preferences = await this.getPreferences(_userId);
      if (!preferences?.goal_reminders_enabled) return;

      for (const daysBefore of (preferences.goal_reminder_days_before || [])) {
        const _reminderDate = new Date(_dueDate);
        _reminderDate.setDate(_reminderDate.getDate() - daysBefore);
        
        // Set the time based on preferences
        const [hours, _minutes] = preferences.goal_reminder_time.split(':');
        _reminderDate.setHours(parseInt(hours), parseInt(_minutes), 0, 0);

        // Only schedule if the reminder date is in the future
        if (_reminderDate > new Date()) {
          await this.createNotification(
            _userId,
            'goal_due_reminder',
            `Goal Reminder: ${goalTitle}`,
            `Your goal "${goalTitle}" is due in ${daysBefore} day${daysBefore !== 1 ? 's' : ''}. Keep up the great work!`,
            { goal_id: goalId, _days_until_due: daysBefore },
            daysBefore <= 1 ? 'high' : 'normal',
            _reminderDate
          );
        }
      }
    } catch (_error) {
      console._error('Error creating goal reminders:', _error);
    }
  }

  // Create milestone achievement notification
  async createMilestoneNotification(
    _userId: string, 
    milestoneType: 'goal' | 'streak',
    title: string,
    _description: string,
    data: Record<string, any> = {}
  ): Promise<void> {
    try {
      const preferences = await this.getPreferences(_userId);
      if (!preferences?.milestone_celebrations_enabled) return;

      await this.createNotification(
        _userId,
        'milestone_achieved',
        `🎉 ${title}`,
        _description,
        { milestone_type: milestoneType, ...data },
        'high'
      );
    } catch (_error) {
      console._error('Error creating milestone notification:', _error);
    }
  }

  // Update user activity pattern for smart timing
  async updateActivityPattern(_userId: string, activityHour: number): Promise<void> {
    try {
      // Get current pattern or create new one
      const { data: existing } = await supabase
        .from('user_activity_patterns')
        .select('*')
        .eq('user_id', _userId)
        .single();

      if (existing) {
        // Update existing pattern
        const currentHours = Array.isArray(existing._most_active_hours) ? existing._most_active_hours : [];
        const updatedHours = [...new Set([...currentHours, activityHour])].slice(0, 5); // Keep top 5 hours

        await supabase
          .from('user_activity_patterns')
          .update({
            _most_active_hours: updatedHours,
            _last_calculated: new Date().toISOString(),
          })
          .eq('user_id', _userId);
      } else {
        // Create new pattern
        await supabase
          .from('user_activity_patterns')
          .insert({
            user_id: _userId,
            _most_active_hours: [activityHour],
          });
      }
    } catch (_error) {
      console._error('Error updating activity pattern:', _error);
    }
  }

  // Delete notification
  async deleteNotification(_notificationId: string): Promise<void> {
    try {
      const { _error } = await supabase
        .from('recovery_notifications')
        .delete()
        .eq('id', _notificationId);
      
      if (_error) throw _error;
    } catch (_error) {
      console._error('Error deleting notification:', _error);
      throw _error;
    }
  }

  // Snooze notification (reschedule for later)
  async snoozeNotification(_notificationId: string, snoozeMinutes: number): Promise<void> {
    try {
      const newScheduledTime = new Date();
      newScheduledTime.setMinutes(newScheduledTime.getMinutes() + snoozeMinutes);

      const { _error } = await supabase
        .from('recovery_notifications')
        .update({
          scheduled_for: newScheduledTime.toISOString(),
          is_read: _false,
          _delivered_at: null,
        })
        .eq('id', _notificationId);
      
      if (_error) throw _error;
    } catch (_error) {
      console._error('Error snoozing notification:', _error);
      throw _error;
    }
  }
}

export const recoveryNotificationService = new RecoveryNotificationService();