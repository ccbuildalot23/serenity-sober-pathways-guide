
import { supabase } from '@/integrations/supabase/client';

interface NotificationSettings {
  time: string;
  freq: number;
  toggles: {
    checkIn: boolean;
    affirm: boolean;
    support: boolean;
    spiritual: boolean;
  };
}

interface NotificationMessage {
  title: string;
  body: string;
  actions?: { action: string; title: string; icon?: string }[];
}

const messagePool = {
  checkIn: [
    { 
      title: 'Just Checking In 🌿', 
      body: 'We believe in you—tap to log today\'s mood when you\'re ready.',
      actions: [
        { action: 'log_mood', title: 'Log Mood', icon: '/heart-icon.png' },
        { action: 'snooze', title: 'Remind Later' }
      ]
    },
    { 
      title: 'Your Journey Matters 💚', 
      body: 'Take a moment to check in with yourself today.',
      actions: [
        { action: 'log_mood', title: 'Check In Now' },
        { action: 'snooze', title: 'Later' }
      ]
    },
    { 
      title: 'Recovery Check-In 🌱', 
      body: 'How are you feeling today? Your progress matters.',
      actions: [
        { action: 'log_mood', title: 'Log Feelings' },
        { action: 'snooze', title: 'Snooze 1h' }
      ]
    }
  ],
  affirm: [
    { 
      title: 'Daily Affirmation ✨', 
      body: 'You are stronger than your struggles. You are worthy of recovery.',
      actions: [
        { action: 'feedback', title: 'Thanks!' },
        { action: 'snooze', title: 'Remind Later' }
      ]
    },
    { 
      title: 'You\'ve Got This 💪', 
      body: 'Every day in recovery is a victory. Celebrate your strength.',
      actions: [
        { action: 'feedback', title: 'Needed This' },
        { action: 'snooze', title: 'Later' }
      ]
    },
    { 
      title: 'Believe in Yourself 🌟', 
      body: 'Your recovery journey is unique and valuable. Keep going.',
      actions: [
        { action: 'feedback', title: 'Helpful' },
        { action: 'snooze', title: 'Snooze' }
      ]
    }
  ],
  support: [
    { 
      title: 'Support Network 🤝', 
      body: 'Consider reaching out to someone in your support circle today.',
      actions: [
        { action: 'call_support', title: 'Call Someone' },
        { action: 'snooze', title: 'Maybe Later' }
      ]
    },
    { 
      title: 'Connection Reminder 📞', 
      body: 'A quick call to your support person can make a big difference.',
      actions: [
        { action: 'call_support', title: 'Make Call' },
        { action: 'snooze', title: 'Not Now' }
      ]
    }
  ],
  spiritual: [
    { 
      title: 'Spiritual Reflection 🙏', 
      body: 'Take a moment for gratitude. What are you thankful for today?',
      actions: [
        { action: 'reflect', title: 'Reflect Now' },
        { action: 'snooze', title: 'Later' }
      ]
    },
    { 
      title: 'One Day at a Time 🌅', 
      body: 'Focus on today. You only need to stay strong for today.',
      actions: [
        { action: 'reflect', title: 'Meditate' },
        { action: 'snooze', title: 'Remind Later' }
      ]
    }
  ]
};

class NotificationServiceClass {
  private usedMessages: Set<string> = new Set();

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
    // Clear existing scheduled notifications
    this.clearScheduled();

    if (Notification.permission !== 'granted') {
      console.warn('Notifications not permitted');
      return;
    }

    const { time, freq, toggles } = settings;
    const [hours, minutes] = time.split(':').map(Number);

    // Calculate days to schedule based on frequency
    const daysToSchedule = this.calculateScheduleDays(freq);

    for (const day of daysToSchedule) {
      const scheduleTime = new Date();
      scheduleTime.setDate(scheduleTime.getDate() + day);
      scheduleTime.setHours(hours, minutes, 0, 0);

      // Schedule different types of notifications
      if (toggles.checkIn) {
        this.scheduleNotification('checkIn', scheduleTime);
      }
      if (toggles.affirm) {
        this.scheduleNotification('affirm', scheduleTime, 2); // 2 hours after check-in
      }
      if (toggles.support) {
        this.scheduleNotification('support', scheduleTime, 6); // 6 hours after check-in
      }
      if (toggles.spiritual) {
        this.scheduleNotification('spiritual', scheduleTime, -1); // 1 hour before check-in
      }
    }

    // Log scheduling
    await this.logNotificationScheduled(settings);
  }

  private calculateScheduleDays(freq: number): number[] {
    const days: number[] = [];
    const interval = Math.floor(7 / freq);
    
    for (let i = 0; i < freq; i++) {
      days.push(i * interval);
    }
    
    return days;
  }

  private scheduleNotification(type: keyof typeof messagePool, baseTime: Date, hourOffset: number = 0): void {
    const scheduleTime = new Date(baseTime);
    scheduleTime.setHours(scheduleTime.getHours() + hourOffset);

    // Only schedule if the time is in the future
    if (scheduleTime > new Date()) {
      const delay = scheduleTime.getTime() - Date.now();
      
      setTimeout(() => {
        this.showNotification(type);
      }, delay);
    }
  }

  private showNotification(type: keyof typeof messagePool): void {
    const message = this.getRandomMessage(type);
    if (!message) return;

    const notification = new Notification(message.title, {
      body: message.body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `serenity_${type}_${Date.now()}`,
      requireInteraction: true,
      actions: message.actions || [],
      data: { type, timestamp: Date.now() }
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
      this.handleNotificationClick(type);
    };

    // Auto-close after 30 seconds
    setTimeout(() => {
      notification.close();
    }, 30000);
  }

  private getRandomMessage(type: keyof typeof messagePool): NotificationMessage | null {
    const pool = messagePool[type];
    if (!pool || pool.length === 0) return null;

    // Reset used messages if we've used them all
    const typeKey = `used_${type}`;
    const usedForType = JSON.parse(localStorage.getItem(typeKey) || '[]');
    
    if (usedForType.length >= pool.length) {
      localStorage.setItem(typeKey, '[]');
      usedForType.length = 0;
    }

    // Find unused messages
    const availableMessages = pool.filter((_, index) => !usedForType.includes(index));
    
    if (availableMessages.length === 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }

    const selectedMessage = availableMessages[Math.floor(Math.random() * availableMessages.length)];
    const selectedIndex = pool.indexOf(selectedMessage);
    
    // Mark as used
    usedForType.push(selectedIndex);
    localStorage.setItem(typeKey, JSON.stringify(usedForType));

    return selectedMessage;
  }

  private handleNotificationClick(type: string): void {
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

  async handleActionClick(action: string, data?: any): Promise<void> {
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
            this.showNotification(data.type);
          }
        }, 60 * 60 * 1000); // 1 hour
        break;
      case 'feedback':
        await this.logFeedback(data);
        break;
    }
  }

  private async logNotificationScheduled(settings: NotificationSettings): Promise<void> {
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

  private async logFeedback(data: any): Promise<void> {
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

  private clearScheduled(): void {
    // Clear any stored scheduling data
    ['used_checkIn', 'used_affirm', 'used_support', 'used_spiritual'].forEach(key => {
      localStorage.removeItem(key);
    });
  }

  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }
}

export const NotificationService = new NotificationServiceClass();
