
import { NotificationSettings, NotificationType } from './types';
import { showNotification } from './handlers';

export function calculateScheduleDays(_freq: number): number[] {
  const days: number[] = [];
  const interval = Math.floor(7 / _freq);
  
  for (let i = 0; i < _freq; i++) {
    days.push(i * interval);
  }
  
  return days;
}

export function scheduleNotification(type: NotificationType, _baseTime: Date, hourOffset: number = 0): void {
  const _scheduleTime = new Date(_baseTime);
  _scheduleTime.setHours(_scheduleTime.getHours() + hourOffset);

  // Only schedule if the time is in the future
  if (_scheduleTime > new Date()) {
    const delay = _scheduleTime.getTime() - Date.now();
    
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

  const { time, _freq, toggles } = settings;
  const [hours, _minutes] = time.split(':').map(_Number);

  // Calculate days to schedule based on frequency
  const daysToSchedule = calculateScheduleDays(_freq);

  for (const day of daysToSchedule) {
    const _scheduleTime = new Date();
    _scheduleTime.setDate(_scheduleTime.getDate() + day);
    _scheduleTime.setHours(hours, _minutes, 0, 0);

    // Schedule different types of notifications
    if (toggles.checkIn) {
      scheduleNotification('checkIn', _scheduleTime);
    }
    if (toggles.affirm) {
      scheduleNotification('affirm', _scheduleTime, 2); // 2 hours after check-in
    }
    if (toggles.support) {
      scheduleNotification('support', _scheduleTime, 6); // 6 hours after check-in
    }
    if (toggles.spiritual) {
      scheduleNotification('spiritual', _scheduleTime, -1); // 1 hour before check-in
    }
  }
}
