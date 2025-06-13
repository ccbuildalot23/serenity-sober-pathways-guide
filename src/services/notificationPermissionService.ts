
import { toast } from 'sonner';

const NOTIFICATION_PERMISSION_KEY = 'notification-permission-requested';
const NOTIFICATION_BANNER_DISMISSED_KEY = 'notification-banner-dismissed';

export const notificationPermissionService = {
  hasRequestedPermission(): boolean {
    return localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'true';
  },

  markPermissionRequested() {
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
  },

  isBannerDismissed(): boolean {
    return localStorage.getItem(NOTIFICATION_BANNER_DISMISSED_KEY) === 'true';
  },

  dismissBanner() {
    localStorage.setItem(NOTIFICATION_BANNER_DISMISSED_KEY, 'true');
  },

  shouldShowPermissionPrompt(): boolean {
    if (this.hasRequestedPermission()) return false;
    if ('Notification' in window && Notification.permission !== 'default') return false;
    return true;
  },

  shouldShowBanner(): boolean {
    if (this.isBannerDismissed()) return false;
    if (!('Notification' in window)) return false;
    return Notification.permission === 'denied';
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      toast.error('Notifications not supported in this browser');
      return 'denied';
    }

    this.markPermissionRequested();
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notifications enabled successfully!');
      } else {
        toast.info('You can enable notifications later in your browser settings');
      }
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to request notification permission');
      return 'denied';
    }
  }
};
