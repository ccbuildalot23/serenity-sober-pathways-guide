// Hope Messenger Service - Gentle reminders that you matter

import { toast } from '@/hooks/use-toast';

export interface HopeMessage {
  id: string;
  type: 'victory' | 'encouragement' | 'milestone' | 'connection';
  message: string;
  showAt?: string;
}

// Recovery-focused messages
const hopeMessages = {
  morning: [
    "Good morning, warrior. Today is a gift.",
    "You woke up clean. That's a victory.",
    "Today is all that matters. You've got this.",
    "Another day, another chance to be amazing.",
    "Your recovery matters. You matter."
  ],
  
  struggling: [
    "This feeling will pass. You're stronger than you know.",
    "Reach out. Someone understands exactly how you feel.",
    "You've survived 100% of your worst days.",
    "It's okay to not be okay. Just don't give up.",
    "Your struggle today is someone else's hope tomorrow."
  ],
  
  victory: [
    "Look at you go! Every day clean is a miracle.",
    "You're living proof that recovery works.",
    "Your strength is inspiring others right now.",
    "This is what courage looks like.",
    "You chose recovery today. That's beautiful."
  ],
  
  evening: [
    "You made it through another day. Be proud.",
    "Rest well, warrior. Tomorrow needs you strong.",
    "Today you stayed clean. That's enough.",
    "Sweet dreams. You're exactly where you need to be.",
    "Another day in the books. You're doing this."
  ]
};

class HopeMessengerService {
  // Send an encouraging message
  sendHope(type: 'morning' | 'struggling' | 'victory' | 'evening' = 'victory') {
    const messages = hopeMessages[type];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    toast({
      title: "💙 For You",
      description: message,
      duration: 5000,
    });
    
    return message;
  }
  
  // Schedule a hope message
  scheduleHope(delayMinutes: number, type: 'morning' | 'struggling' | 'victory' | 'evening') {
    setTimeout(() => {
      this.sendHope(type);
    }, delayMinutes * 60 * 1000);
  }
  
  // Get a message without showing toast
  getHopeMessage(type: 'morning' | 'struggling' | 'victory' | 'evening' = 'victory'): string {
    const messages = hopeMessages[type];
    return messages[Math.floor(Math.random() * messages.length)];
  }
  
  // Send milestone celebration
  celebrateMilestone(days: number) {
    let message = '';
    
    if (days === 1) {
      message = "24 hours! The hardest day is behind you. 🌟";
    } else if (days === 7) {
      message = "One week! You're doing something amazing. 🎉";
    } else if (days === 30) {
      message = "30 days! Look at you, changing your life. 🏆";
    } else if (days === 90) {
      message = "90 days! You're not the same person who started. 💪";
    } else if (days === 365) {
      message = "ONE YEAR! You're a walking miracle. 🎊";
    } else if (days % 100 === 0) {
      message = `${days} days! Every single one matters. Keep going! 🌈`;
    } else {
      message = `Day ${days}! You're building something beautiful. ✨`;
    }
    
    toast({
      title: "🎉 Milestone!",
      description: message,
      duration: 8000,
    });
    
    return message;
  }
  
  // Connection reminder
  remindToConnect() {
    const messages = [
      "Maybe check in with someone today? Connection helps.",
      "Your story could help someone today. Consider sharing.",
      "Isolation is the enemy. Reach out to someone.",
      "Someone needs to hear from you today.",
      "Connection is the opposite of addiction. Who can you call?"
    ];
    
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    toast({
      title: "💬 Gentle Reminder",
      description: message,
      duration: 6000,
    });
    
    return message;
  }
}

export const hopeMessenger = new HopeMessengerService();

// Daily hope scheduling
export const setupDailyHope = () => {
  const now = new Date();
  const hours = now.getHours();
  
  // Morning message (8 AM)
  if (hours >= 8 && hours < 10) {
    hopeMessenger.sendHope('morning');
  }
  // Evening message (8 PM)
  else if (hours >= 20 && hours < 22) {
    hopeMessenger.sendHope('evening');
  }
  
  // Schedule next check in 1 hour
  setTimeout(setupDailyHope, 60 * 60 * 1000);
};