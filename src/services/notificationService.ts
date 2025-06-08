
import { supabase } from '@/integrations/supabase/client';
import { NotificationSettings } from './notification/types';
import { scheduleAll, clearScheduled } from './notification/scheduling';
import { handleActionClick, logNotificationScheduled } from './notification/handlers';

class NotificationServiceClass {
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  async scheduleAll(settings: NotificationSettings): Promise<void> {
    await scheduleAll(settings);
    await logNotificationScheduled(settings);
  }

  clearScheduled(): void {
    clearScheduled();
  }

  async handleActionClick(action: string, data?: any): Promise<void> {
    return handleActionClick(action, data);
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

export const NotificationService = new NotificationServiceClass();
