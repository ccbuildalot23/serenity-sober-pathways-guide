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
  delivered_at?: string;
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
  async getNotifications(userId: string, includeRead: boolean = false): Promise<RecoveryNotification[]> {
    try {
      let query = supabase
        .from('recovery_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!includeRead) {
        query = query.eq('is_read', false);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as RecoveryNotification[];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  // Get unread notification count
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('recovery_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recovery_notifications')
        .update({ 
          is_read: true,
          delivered_at: new Date().toISOString()
        })
        .eq('id', notificationId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recovery_notifications')
        .update({ 
          is_read: true,
          delivered_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Create a new notification
  async createNotification(
    userId: string,
    type: RecoveryNotification['notification_type'],
    title: string,
    message: string,
    data: Record<string, any> = {},
    priority: RecoveryNotification['priority'] = 'normal',
    scheduledFor?: Date
  ): Promise<void> {
    try {
      const notification = {
        user_id: userId,
        notification_type: type,
        title,
        message,
        data,
        priority,
        scheduled_for: scheduledFor?.toISOString(),
      };

      const { error } = await supabase
        .from('recovery_notifications')
        .insert(notification);
      
      if (error) throw error;

      // Show in-app notification immediately if not scheduled
      if (!scheduledFor) {
        this.showInAppNotification(title, message, priority);
      }
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Show in-app toast notification
  private showInAppNotification(title: string, message: string, priority: RecoveryNotification['priority']): void {
    const duration = priority === 'urgent' ? 10000 : priority === 'high' ? 7000 : 5000;
    
    toast({
      title,
      description: message,
      duration,
      variant: priority === 'urgent' || priority === 'high' ? 'destructive' : 'default',
    });
  }

  // Get notification preferences
  async getPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('recovery_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No preferences found, create default ones
          return this.createDefaultPreferences(userId);
        }
        throw error;
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
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  // Create default preferences
  private async createDefaultPreferences(userId: string): Promise<NotificationPreferences> {
    const defaultPrefs = {
      user_id: userId,
      goal_reminders_enabled: true,
      goal_reminder_days_before: [1, 3, 7],
      goal_reminder_time: '09:00:00',
      milestone_celebrations_enabled: true,
      streak_notifications_enabled: true,
      streak_milestones: [3, 7, 14, 30, 60, 90, 180, 365],
      progress_encouragement_enabled: true,
      weekly_summary_enabled: true,
      weekly_summary_day: 0,
      delivery_methods: { in_app: true, email: false, sms: false },
      quiet_hours: { enabled: true, start_time: '22:00', end_time: '08:00', timezone: 'UTC' },
      daily_limit: 10,
    };

    try {
      const { error } = await supabase
        .from('recovery_notification_preferences')
        .insert(defaultPrefs);
      
      if (error) throw error;

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
    } catch (error) {
      console.error('Error creating default preferences:', error);
      throw error;
    }
  }

  // Update notification preferences
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      const { error } = await supabase
        .from('recovery_notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Create goal reminder notifications
  async createGoalReminders(userId: string, goalId: string, goalTitle: string, dueDate: Date): Promise<void> {
    try {
      const preferences = await this.getPreferences(userId);
      if (!preferences?.goal_reminders_enabled) return;

      for (const daysBefore of (preferences.goal_reminder_days_before || [])) {
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() - daysBefore);
        
        // Set the time based on preferences
        const [hours, minutes] = preferences.goal_reminder_time.split(':');
        reminderDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        // Only schedule if the reminder date is in the future
        if (reminderDate > new Date()) {
          await this.createNotification(
            userId,
            'goal_due_reminder',
            `Goal Reminder: ${goalTitle}`,
            `Your goal "${goalTitle}" is due in ${daysBefore} day${daysBefore !== 1 ? 's' : ''}. Keep up the great work!`,
            { goal_id: goalId, days_until_due: daysBefore },
            daysBefore <= 1 ? 'high' : 'normal',
            reminderDate
          );
        }
      }
    } catch (error) {
      console.error('Error creating goal reminders:', error);
    }
  }

  // Create milestone achievement notification
  async createMilestoneNotification(
    userId: string, 
    milestoneType: 'goal' | 'streak',
    title: string,
    description: string,
    data: Record<string, any> = {}
  ): Promise<void> {
    try {
      const preferences = await this.getPreferences(userId);
      if (!preferences?.milestone_celebrations_enabled) return;

      await this.createNotification(
        userId,
        'milestone_achieved',
        `🎉 ${title}`,
        description,
        { milestone_type: milestoneType, ...data },
        'high'
      );
    } catch (error) {
      console.error('Error creating milestone notification:', error);
    }
  }

  // Update user activity pattern for smart timing
  async updateActivityPattern(userId: string, activityHour: number): Promise<void> {
    try {
      // Get current pattern or create new one
      const { data: existing } = await supabase
        .from('user_activity_patterns')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing pattern
        const currentHours = Array.isArray(existing.most_active_hours) ? existing.most_active_hours : [];
        const updatedHours = [...new Set([...currentHours, activityHour])].slice(0, 5); // Keep top 5 hours

        await supabase
          .from('user_activity_patterns')
          .update({
            most_active_hours: updatedHours,
            last_calculated: new Date().toISOString(),
          })
          .eq('user_id', userId);
      } else {
        // Create new pattern
        await supabase
          .from('user_activity_patterns')
          .insert({
            user_id: userId,
            most_active_hours: [activityHour],
          });
      }
    } catch (error) {
      console.error('Error updating activity pattern:', error);
    }
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recovery_notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Snooze notification (reschedule for later)
  async snoozeNotification(notificationId: string, snoozeMinutes: number): Promise<void> {
    try {
      const newScheduledTime = new Date();
      newScheduledTime.setMinutes(newScheduledTime.getMinutes() + snoozeMinutes);

      const { error } = await supabase
        .from('recovery_notifications')
        .update({
          scheduled_for: newScheduledTime.toISOString(),
          is_read: false,
          delivered_at: null,
        })
        .eq('id', notificationId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error snoozing notification:', error);
      throw error;
    }
  }
}

export const recoveryNotificationService = new RecoveryNotificationService();