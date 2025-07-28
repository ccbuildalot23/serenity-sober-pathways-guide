import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RealtimeNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    // Load existing notifications
    loadNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'realtime_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as RealtimeNotification;
          
          // Add to notifications list
          setNotifications(prev => [newNotification, ...prev]);
          
          // Show toast notification
          showToastNotification(newNotification);
          
          // Update unread count
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'realtime_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const updatedNotification = payload.new as RealtimeNotification;
          
          setNotifications(prev => 
            prev.map(n => 
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );

          // Update unread count if notification was marked as read
          if (updatedNotification.read_at && !payload.old.read_at) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('realtime_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      
      // Calculate unread count
      const unread = data?.filter(n => !n.read_at).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('realtime_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('realtime_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user?.id)
        .is('read_at', null);

      if (error) throw error;

      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const showToastNotification = (notification: RealtimeNotification) => {
    const toastConfig = {
      title: notification.title,
      description: notification.message,
    };

    switch (notification.type) {
      case 'crisis_alert':
        toast.error(notification.title, {
          description: notification.message,
          duration: 10000,
        });
        break;
      case 'moderation_action':
        toast.warning(notification.title, {
          description: notification.message,
        });
        break;
      case 'forum_reply':
      case 'forum_mention':
        toast.info(notification.title, {
          description: notification.message,
        });
        break;
      default:
        toast(notification.title, {
          description: notification.message,
        });
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications: loadNotifications
  };
};