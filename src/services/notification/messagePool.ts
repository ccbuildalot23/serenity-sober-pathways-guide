
import { NotificationMessage } from './types';

export const messagePool: Record<string, NotificationMessage[]> = {
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

export function getRandomMessage(type: keyof typeof messagePool): NotificationMessage | null {
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
