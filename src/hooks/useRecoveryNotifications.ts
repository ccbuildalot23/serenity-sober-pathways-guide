import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { recoveryNotificationService, RecoveryNotification, NotificationPreferences } from '@/services/recoveryNotificationService';
import { supabase } from '@/integrations/supabase/client';

export function useRecoveryNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RecoveryNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Load notifications and preferences
  const loadData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const [notificationsData, unreadCountData, preferencesData] = await Promise.all([
        recoveryNotificationService.getNotifications(user.id),
        recoveryNotificationService.getUnreadCount(user.id),
        recoveryNotificationService.getPreferences(user.id),
      ]);

      setNotifications(notificationsData);
      setUnreadCount(unreadCountData);
      setPreferences(preferencesData);
    } catch (error) {
      console.error('Error loading notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await recoveryNotificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await recoveryNotificationService.markAllAsRead(user.id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Update notification preferences
  const updatePreferences = async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user?.id) return;

    try {
      await recoveryNotificationService.updatePreferences(user.id, newPreferences);
      setPreferences(prev => prev ? { ...prev, ...newPreferences } : null);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await recoveryNotificationService.deleteNotification(notificationId);
      
      // Update local state
      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Snooze notification
  const snoozeNotification = async (notificationId: string, minutes: number) => {
    try {
      await recoveryNotificationService.snoozeNotification(notificationId, minutes);
      
      // Remove from current notifications (it will reappear when scheduled)
      const snoozedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (snoozedNotification && !snoozedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error snoozing notification:', error);
    }
  };

  // Track user activity for smart timing
  const trackActivity = async () => {
    if (!user?.id) return;

    const currentHour = new Date().getHours();
    try {
      await recoveryNotificationService.updateActivityPattern(user.id, currentHour);
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('recovery-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recovery_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Notification change:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as RecoveryNotification;
            setNotifications(prev => [newNotification, ...prev]);
            if (!newNotification.is_read) {
              setUnreadCount(prev => prev + 1);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotification = payload.new as RecoveryNotification;
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setNotifications(prev => prev.filter(n => n.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Load data when user changes
  useEffect(() => {
    loadData();
  }, [user?.id]);

  // Track activity on component mount
  useEffect(() => {
    trackActivity();
  }, []);

  return {
    notifications,
    unreadCount,
    preferences,
    loading,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    deleteNotification,
    snoozeNotification,
    refreshData: loadData,
  };
}