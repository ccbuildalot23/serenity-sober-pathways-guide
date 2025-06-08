
import { supabase } from '@/integrations/supabase/client';
import { NotificationType } from './types';
import { getRandomMessage } from './messagePool';

export function showNotification(type: NotificationType): void {
  const message = getRandomMessage(type);
  if (!message) return;

  const notification = new Notification(message.title, {
    body: message.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: `serenity_${type}_${Date.now()}`,
    requireInteraction: true,
    data: { type, timestamp: Date.now() }
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
    handleNotificationClick(type);
  };

  // Auto-close after 30 seconds
  setTimeout(() => {
    notification.close();
  }, 30000);
}

export function handleNotificationClick(type: string): void {
  // Navigate to appropriate page based on notification type
  switch (type) {
    case 'checkIn':
      window.location.href = '/#daily-checkin';
      break;
    case 'support':
      window.location.href = '/#support-network';
      break;
    case 'affirm':
    case 'spiritual':
      window.location.href = '/#cbt-skills';
      break;
  }
}

export async function handleActionClick(action: string, data?: any): Promise<void> {
  switch (action) {
    case 'log_mood':
      window.location.href = '/#daily-checkin';
      break;
    case 'call_support':
      window.location.href = '/#support-network';
      break;
    case 'reflect':
      window.location.href = '/#cbt-skills';
      break;
    case 'snooze':
      // Reschedule for 1 hour later
      setTimeout(() => {
        if (data?.type) {
          showNotification(data.type);
        }
      }, 60 * 60 * 1000); // 1 hour
      break;
    case 'feedback':
      await logFeedback(data);
      break;
  }
}

export async function logFeedback(data: any): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      action: 'NOTIFICATION_FEEDBACK',
      details: {
        feedback: 'positive',
        notification_type: data?.type,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to log notification feedback:', error);
  }
}

export async function logNotificationScheduled(settings: any): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      action: 'NOTIFICATION_SCHEDULED',
      details: {
        settings,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to log notification scheduling:', error);
  }
}
