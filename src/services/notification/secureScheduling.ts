
import { NotificationSettings, NotificationType } from './types';
import { showNotification } from './handlers';
import { SecureNotificationPreferencesService } from '@/services/secureNotificationPreferencesService';
import { EnhancedSecurityMonitoringService } from '@/services/enhancedSecurityMonitoringService';

// Rate limiting for notifications
const notificationCounts = new Map<string, { count: number; resetTime: number }>();
const MAX_NOTIFICATIONS_PER_HOUR = 10;

export function validateNotificationRate(userId: string): boolean {
  const now = Date.now();
  const hourKey = `${userId}_${Math.floor(now / (60 * 60 * 1000))}`;
  
  const current = notificationCounts.get(hourKey) || { count: 0, resetTime: now + 60 * 60 * 1000 };
  
  if (now > current.resetTime) {
    // Reset counter
    notificationCounts.set(hourKey, { count: 1, resetTime: now + 60 * 60 * 1000 });
    return true;
  }
  
  if (current.count >= MAX_NOTIFICATIONS_PER_HOUR) {
    // Log rate limit exceeded
    EnhancedSecurityMonitoringService.logSecurityEvent({
      eventType: 'NOTIFICATION_RATE_LIMIT_EXCEEDED',
      severity: 'medium',
      details: { hour_key: hourKey, count: current.count },
      userId
    });
    return false;
  }
  
  current.count++;
  notificationCounts.set(hourKey, current);
  return true;
}

export function calculateScheduleDays(freq: number): number[] {
  // Validate frequency to prevent abuse
  const validFreq = Math.max(1, Math.min(7, freq));
  const days: number[] = [];
  const interval = Math.floor(7 / validFreq);
  
  for (let i = 0; i < validFreq; i++) {
    days.push(i * interval);
  }
  
  return days;
}

export function scheduleSecureNotification(
  type: NotificationType, 
  baseTime: Date, 
  hourOffset: number = 0,
  userId?: string
): void {
  // Validate inputs
  if (userId && !validateNotificationRate(userId)) {
    console.warn('Notification rate limit exceeded for user:', userId);
    return;
  }

  const scheduleTime = new Date(baseTime);
  scheduleTime.setHours(scheduleTime.getHours() + hourOffset);

  // Only schedule if the time is in the future
  if (scheduleTime > new Date()) {
    const delay = scheduleTime.getTime() - Date.now();
    
    // Validate delay is reasonable (not too far in future, not negative)
    if (delay > 0 && delay < 7 * 24 * 60 * 60 * 1000) { // Max 7 days
      setTimeout(() => {
        showNotification(type);
        
        // Log successful notification
        if (userId) {
          EnhancedSecurityMonitoringService.logSecurityEvent({
            eventType: 'NOTIFICATION_SENT',
            severity: 'low',
            details: { type, scheduled_time: scheduleTime.toISOString() },
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

  const { time, freq, toggles } = settings;
  const [hours, minutes] = time.split(':').map(Number);

  // Validate time values
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid time format');
  }

  // Calculate days to schedule based on frequency
  const daysToSchedule = calculateScheduleDays(freq);

  for (const day of daysToSchedule) {
    const scheduleTime = new Date();
    scheduleTime.setDate(scheduleTime.getDate() + day);
    scheduleTime.setHours(hours, minutes, 0, 0);

    // Schedule different types of notifications with rate limiting
    if (toggles.checkIn) {
      scheduleSecureNotification('checkIn', scheduleTime, 0, userId);
    }
    if (toggles.affirm) {
      scheduleSecureNotification('affirm', scheduleTime, 2, userId); // 2 hours after check-in
    }
    if (toggles.support) {
      scheduleSecureNotification('support', scheduleTime, 6, userId); // 6 hours after check-in
    }
    if (toggles.spiritual) {
      scheduleSecureNotification('spiritual', scheduleTime, -1, userId); // 1 hour before check-in
    }
  }

  // Log scheduling event
  EnhancedSecurityMonitoringService.logSecurityEvent({
    eventType: 'NOTIFICATIONS_SCHEDULED',
    severity: 'low',
    details: { frequency: freq, types: Object.keys(toggles).filter(k => toggles[k as keyof typeof toggles]) },
    userId
  });
}
