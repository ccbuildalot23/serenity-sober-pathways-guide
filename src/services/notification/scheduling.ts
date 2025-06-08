
import { NotificationSettings, NotificationType } from './types';
import { showNotification } from './handlers';

export function calculateScheduleDays(freq: number): number[] {
  const days: number[] = [];
  const interval = Math.floor(7 / freq);
  
  for (let i = 0; i < freq; i++) {
    days.push(i * interval);
  }
  
  return days;
}

export function scheduleNotification(type: NotificationType, baseTime: Date, hourOffset: number = 0): void {
  const scheduleTime = new Date(baseTime);
  scheduleTime.setHours(scheduleTime.getHours() + hourOffset);

  // Only schedule if the time is in the future
  if (scheduleTime > new Date()) {
    const delay = scheduleTime.getTime() - Date.now();
    
    setTimeout(() => {
      showNotification(type);
    }, delay);
  }
}

export function clearScheduled(): void {
  // Clear any stored scheduling data
  ['used_checkIn', 'used_affirm', 'used_support', 'used_spiritual'].forEach(key => {
    localStorage.removeItem(key);
  });
}

export async function scheduleAll(settings: NotificationSettings): Promise<void> {
  // Clear existing scheduled notifications
  clearScheduled();

  if (Notification.permission !== 'granted') {
    console.warn('Notifications not permitted');
    return;
  }

  const { time, freq, toggles } = settings;
  const [hours, minutes] = time.split(':').map(Number);

  // Calculate days to schedule based on frequency
  const daysToSchedule = calculateScheduleDays(freq);

  for (const day of daysToSchedule) {
    const scheduleTime = new Date();
    scheduleTime.setDate(scheduleTime.getDate() + day);
    scheduleTime.setHours(hours, minutes, 0, 0);

    // Schedule different types of notifications
    if (toggles.checkIn) {
      scheduleNotification('checkIn', scheduleTime);
    }
    if (toggles.affirm) {
      scheduleNotification('affirm', scheduleTime, 2); // 2 hours after check-in
    }
    if (toggles.support) {
      scheduleNotification('support', scheduleTime, 6); // 6 hours after check-in
    }
    if (toggles.spiritual) {
      scheduleNotification('spiritual', scheduleTime, -1); // 1 hour before check-in
    }
  }
}
