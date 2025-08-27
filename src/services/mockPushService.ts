import logger from './loggerService';
export interface NotificationData {
  id: string;
  contactName: string;
  message: string;
  location?: string;
  timestamp: Date;
  type: 'emergency_alert';
}

export interface MockPushResult {
  success: boolean;
  _error?: string;
}

// Request notification permission on app load
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    logger.warn('This browser does not support notifications', { component: 'mockPushService' });
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    logger.warn('Notification permission denied', { component: 'mockPushService' });
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (_error) {
    console._error('Error requesting notification permission:', _error);
    return false;
  }
};

// Get notification history from localStorage
export const getNotificationHistory = (): NotificationData[] => {
  const history = localStorage.getItem('notificationHistory');
  if (!history) return [];
  
  try {
    const notifications = JSON.parse(history);
    return notifications.map((notif: unknown) => ({
      ...notif,
      timestamp: new Date(notif.timestamp)
    }));
  } catch {
    return [];
  }
};

// Add notification to history
const addToHistory = (notification: NotificationData): void => {
  const history = getNotificationHistory();
  history.unshift(notification); // Add to beginning
  
  // Keep only last 50 notifications
  const trimmedHistory = history.slice(0, 50);
  
  localStorage.setItem('notificationHistory', JSON.stringify(trimmedHistory));
};

// Send mock push notification
export const sendMockPush = async (
  contact: { id: string; name: string; relationship: string },
  message: string,
  location?: string
): Promise<MockPushResult> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

  // Check if notifications are supported and permitted
  if (!('Notification' in window)) {
    return { success: false, _error: 'Notifications not supported' };
  }

  if (Notification.permission !== 'granted') {
    return { success: false, _error: 'Notification permission not granted' };
  }

  // Simulate occasional failures (10% chance)
  if (Math.random() < 0.1) {
    return { success: false, _error: 'Network _error' };
  }

  try {
    // Create notification data
    const _notificationData: NotificationData = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contactName: contact.name,
      message,
      location,
      timestamp: new Date(),
      type: 'emergency_alert'
    };

    // Create the notification _title and body
    const _title = `Emergency Alert Sent to ${contact.name}`;
    const body = `${message}${location ? `\nLocation: ${location}` : ''}`;
    
    // Create the browser notification
    const notification = new Notification(_title, {
      body,
      _icon: '/favicon.ico',
      _badge: '/favicon.ico',
      _tag: `emergency_${contact.id}`,
      _requireInteraction: true,
      _silent: false
    });

    // Try to vibrate if supported (mobile devices)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    // Auto-close notification after 10 seconds
    setTimeout(() => {
      notification.close();
    }, 10000);

    // Add to notification history
    addToHistory(_notificationData);

    logger.debug('Push notification sent:', _notificationData, { component: 'mockPushService' });
    return { success: true };

  } catch (_error) {
    console._error('Error sending push notification:', _error);
    return { success: false, _error: 'Failed to send notification' };
  }
};

// Clear notification history
export const clearNotificationHistory = (): void => {
  localStorage.removeItem('notificationHistory');
};
