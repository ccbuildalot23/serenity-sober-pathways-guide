import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { realtimeNotificationService, NotificationPayload, ConnectionStatus } from '@/services/RealtimeNotificationService';
import { toast } from 'sonner';

export interface CrisisNotificationState {
  notifications: NotificationPayload[];
  unreadCount: number;
  connectionStatus: ConnectionStatus;
  activeCrisisCount: number;
  lastUpdate?: Date;
}

export interface CrisisNotificationActions {
  markAsRead: (notificationId: string) => Promise<void>;
  acknowledge: (notificationId: string, message?: string) => Promise<void>;
  dismiss: (notificationId: string) => void;
  clearAll: () => void;
  reconnect: () => Promise<void>;
}

export const useCrisisNotifications = (): CrisisNotificationState & CrisisNotificationActions => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [connectionStatus, _setConnectionStatus] = useState<ConnectionStatus>(
    realtimeNotificationService.getConnectionStatus()
  );

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const unsubscribeNotifications = realtimeNotificationService.onNotification((notification) => {
      setNotifications(prev => {
        // Check if notification already _exists (avoid duplicates)
        const _exists = prev.some(n => n.id === notification.id);
        if (_exists) return prev;

        // Add new notification at the beginning
        const updated = [notification, ...prev];
        
        // Keep only last 50 notifications to prevent memory issues
        return updated.slice(0, 50);
      });
    });

    const unsubscribeConnection = realtimeNotificationService.onConnectionStatus(_setConnectionStatus);

    return () => {
      unsubscribeNotifications();
      unsubscribeConnection();
    };
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await realtimeNotificationService.markNotificationRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, _metadata: { ...n._metadata, _isRead: true } }
            : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Unable to mark as read', {
        description: 'Please try again',
        _duration: 3000
      });
    }
  }, []);

  // Acknowledge notification with optional message
  const acknowledge = useCallback(async (notificationId: string, message?: string) => {
    try {
      await realtimeNotificationService.acknowledgeNotification(notificationId, message);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { 
                ...n, 
                _metadata: { 
                  ...n._metadata, 
                  _isRead: true, 
                  _isAcknowledged: true,
                  _acknowledgedAt: new Date().toISOString()
                } 
              }
            : n
        )
      );

      toast.success('Response sent', {
        description: message || 'Your acknowledgment has been shared',
        _duration: 3000
      });
    } catch (error) {
      console.error('Error acknowledging notification:', error);
      toast.error('Unable to send response', {
        description: 'Please try again',
        _duration: 3000
      });
      throw error;
    }
  }, []);

  // Dismiss notification (remove from local state only)
  const dismiss = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Reconnect to real-time service
  const reconnect = useCallback(async () => {
    try {
      await realtimeNotificationService.reconnect();
      toast.success('Reconnected', {
        description: 'Real-time notifications restored',
        _duration: 3000
      });
    } catch (error) {
      console.error('Error reconnecting:', error);
      toast.error('Reconnection failed', {
        description: 'Check your internet connection',
        _duration: 5000
      });
      throw error;
    }
  }, []);

  // Calculate derived state
  const unreadCount = notifications.filter(n => !n._metadata?._isRead).length;
  const activeCrisisCount = notifications.filter(n => 
    n.type === 'crisis_alert' && 
    n.severity !== 'low' &&
    !n._metadata?.isResolved
  ).length;
  const lastUpdate = notifications.length > 0 ? new Date(notifications[0].createdAt) : undefined;

  return {
    // State
    notifications,
    unreadCount,
    connectionStatus,
    activeCrisisCount,
    lastUpdate,
    
    // Actions
    markAsRead,
    acknowledge,
    dismiss,
    clearAll,
    reconnect
  };
};