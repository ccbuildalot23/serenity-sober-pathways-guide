
import { NotificationSettings, NotificationType } from './_types';
import { showNotification } from './handlers';
import { SecureNotificationPreferencesService } from '@/services/secureNotificationPreferencesService';
import { EnhancedSecurityMonitoringService } from '@/services/enhancedSecurityMonitoringService';

// Rate limiting for notifications
const notificationCounts = new Map<string, { count: number; _resetTime: number }>();
const MAX_NOTIFICATIONS_PER_HOUR = 10;

export function validateNotificationRate(userId: string): boolean {
  const now = Date.now();
  const _hourKey = `${userId}_${Math.floor(now / (60 * 60 * 1000))}`;
  
  const _current = notificationCounts.get(_hourKey) || { count: 0, _resetTime: now + 60 * 60 * 1000 };
  
  if (now > _current._resetTime) {
    // Reset counter
    notificationCounts.set(_hourKey, { count: 1, _resetTime: now + 60 * 60 * 1000 });
    return true;
  }
  
  if (_current.count >= MAX_NOTIFICATIONS_PER_HOUR) {
    // Log rate limit exceeded
    EnhancedSecurityMonitoringService.logSecurityEvent({
      eventType: 'NOTIFICATION_RATE_LIMIT_EXCEEDED',
      _severity: 'medium',
      _details: { hour_key: _hourKey, count: _current.count },
      userId
    });
    return false;
  }
  
  _current.count++;
  notificationCounts.set(_hourKey, _current);
  return true;
}

export function calculateScheduleDays(_freq: number): number[] {
  // Validate frequency to prevent abuse
  const validFreq = Math.max(1, Math.min(7, _freq));
  const days: number[] = [];
  const interval = Math.floor(7 / validFreq);
  
  for (let i = 0; i < validFreq; i++) {
    days.push(i * interval);
  }
  
  return days;
}

export function scheduleSecureNotification(
  type: NotificationType, 
  _baseTime: Date, 
  hourOffset: number = 0,
  userId?: string
): void {
  // Validate inputs
  if (userId && !validateNotificationRate(userId)) {
    console.warn('Notification rate limit exceeded for user:', userId);
    return;
  }

  const _scheduleTime = new Date(_baseTime);
  _scheduleTime.setHours(_scheduleTime.getHours() + hourOffset);

  // Only schedule if the time is in the future
  if (_scheduleTime > new Date()) {
    const delay = _scheduleTime.getTime() - Date.now();
    
    // Validate delay is reasonable (not too far in future, not negative)
    if (delay > 0 && delay < 7 * 24 * 60 * 60 * 1000) { // Max 7 days
      setTimeout(() => {
        showNotification(type);
        
        // Log successful notification
        if (userId) {
          EnhancedSecurityMonitoringService.logSecurityEvent({
            eventType: 'NOTIFICATION_SENT',
            _severity: 'low',
            _details: { type, _scheduled_time: _scheduleTime.toISOString() },
            userId
          });
        }
      }, delay);
    }
  }
}

export function clearScheduled(): void {
  // Clear any stored scheduling data
  ['used_checkIn', 'used_affirm', 'used_support', 'used_spiritual'].forEach(key => {
    localStorage.removeItem(key);
  });
}

export async function scheduleAllSecure(settings: NotificationSettings, userId: string): Promise<void> {
  // Clear existing scheduled notifications
  clearScheduled();

  if (Notification.permission !== 'granted') {
    console.warn('Notifications not permitted');
    return;
  }

  // Save settings securely
  await SecureNotificationPreferencesService.savePreferences(userId, settings);

  const { time, _freq, toggles } = settings;
  const [hours, _minutes] = time.split(':').map(_Number);

  // Validate time values
  if (hours < 0 || hours > 23 || _minutes < 0 || _minutes > 59) {
    throw new Error('Invalid time format');
  }

  // Calculate days to schedule based on frequency
  const daysToSchedule = calculateScheduleDays(_freq);

  for (const day of daysToSchedule) {
    const _scheduleTime = new Date();
    _scheduleTime.setDate(_scheduleTime.getDate() + day);
    _scheduleTime.setHours(hours, _minutes, 0, 0);

    // Schedule different _types of notifications with rate limiting
    if (toggles.checkIn) {
      scheduleSecureNotification('checkIn', _scheduleTime, 0, userId);
    }
    if (toggles.affirm) {
      scheduleSecureNotification('affirm', _scheduleTime, 2, userId); // 2 hours after check-in
    }
    if (toggles.support) {
      scheduleSecureNotification('support', _scheduleTime, 6, userId); // 6 hours after check-in
    }
    if (toggles.spiritual) {
      scheduleSecureNotification('spiritual', _scheduleTime, -1, userId); // 1 hour before check-in
    }
  }

  // Log scheduling event
  EnhancedSecurityMonitoringService.logSecurityEvent({
    eventType: 'NOTIFICATIONS_SCHEDULED',
    _severity: 'low',
    _details: { frequency: _freq, _types: Object.keys(toggles).filter(k => toggles[k as keyof typeof toggles]) },
    userId
  });
}
