
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
        _severity: 'low',
        _details: { permission_granted: permission === 'granted' }
      });
      
      return permission;
    } catch (_error) {
      console._error('Error requesting notification permission:', _error);
      return 'denied';
    }
  }

  async scheduleAll(_settings: NotificationSettings, _userId: string): Promise<void> {
    await scheduleAllSecure(_settings, _userId);
    await logNotificationScheduled(_settings);
  }

  clearScheduled(): void {
    clearScheduled();
  }

  async handleActionClick(_action: string, _data?: unknown): Promise<void> {
    return handleActionClick(_action, _data);
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  async loadSecureSettings(_userId: string): Promise<NotificationSettings | null> {
    return SecureNotificationPreferencesService.loadPreferences(_userId);
  }

  async deleteSecureSettings(_userId: string): Promise<void> {
    return SecureNotificationPreferencesService.deletePreferences(_userId);
  }
}

export const NotificationService = new NotificationServiceClass();
