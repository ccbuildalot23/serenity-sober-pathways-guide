
import { supabase } from '@/integrations/supabase/client';
import { NotificationSettings } from './notification/types';
import { scheduleAllSecure, clearScheduled } from './notification/secureScheduling';
import { handleActionClick, logNotificationScheduled } from './notification/handlers';
import { SecureNotificationPreferencesService } from './secureNotificationPreferencesService';
import { EnhancedSecurityMonitoringService } from './enhancedSecurityMonitoringService';

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
      
      // Log permission request
      await EnhancedSecurityMonitoringService.logSecurityEvent({
        eventType: 'NOTIFICATION_PERMISSION_REQUESTED',
        severity: 'low',
        details: { permission_granted: permission === 'granted' }
      });
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }

  async scheduleAll(settings: NotificationSettings, userId: string): Promise<void> {
    await scheduleAllSecure(settings, userId);
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

  async loadSecureSettings(userId: string): Promise<NotificationSettings | null> {
    return SecureNotificationPreferencesService.loadPreferences(userId);
  }

  async deleteSecureSettings(userId: string): Promise<void> {
    return SecureNotificationPreferencesService.deletePreferences(userId);
  }
}

export const NotificationService = new NotificationServiceClass();
