// Recovery Wisdom Service - Daily strength from those who've been there

import { toast } from 'sonner';

// Recovery wisdom that actually helps
const recoveryWisdom = {
  justForToday: [
    "Just for today, I will have faith in someone who believes in me.",
    "Just for today, I will try to live through this day only.",
    "Just for today, I will be happy knowing I'm exactly where I need to be.",
    "Just for today, I will not use no matter what.",
    "Just for today, I am enough."
  ],
  
  slogans: [
    "One day at a time",
    "Progress not perfection",
    "Keep it simple",
    "Easy does it",
    "First things first",
    "Let go and let God",
    "This too shall pass",
    "HALT - Don't get too Hungry, Angry, Lonely, or Tired",
    "It works if you work it",
    "Keep coming back"
  ],
  
  experience: [
    "The drugs were just a symptom. Recovery taught me how to live.",
    "I thought I'd lost everything. Turns out, I was about to gain a life worth living.",
    "My worst day clean is better than my best day using.",
    "Recovery didn't open the gates of heaven to let me in. It opened the gates of hell to let me out.",
    "I came for my drinking. I stayed for my thinking.",
    "The opposite of addiction isn't sobriety. It's connection.",
    "Rock bottom became the solid foundation on which I rebuilt my life.",
    "I used to live to use and use to live. Today I'm just grateful to be alive.",
    "Recovery gave me everything drugs promised.",
    "I'm not telling you it's going to be easy. I'm telling you it's going to be worth it."
  ],
  
  encouragement: [
    "You're not alone in this. We've all been where you are.",
    "Your recovery matters to people you haven't even met yet.",
    "Relapse isn't a requirement. You never have to use again.",
    "If you're reading this, you've already taken the first step.",
    "Your pain has a purpose. Your story will help someone else.",
    "Recovery is possible. I'm living proof.",
    "The obsession will leave you. Give it time.",
    "You're exactly where you need to be right now.",
    "Trust the process, even when you can't see the outcome.",
    "You're braver than you believe, stronger than you seem."
  ]
};

// Personal recovery reasons stored locally
const PERSONAL_REASONS_KEY = 'recovery_reasons';

class RecoveryWisdomService {
  // Get wisdom for right now
  getTodaysWisdom(): string {
    const allWisdom = [
      ...recoveryWisdom.justForToday,
      ...recoveryWisdom.experience,
      ...recoveryWisdom.encouragement
    ];
    
    // Use date as seed for consistent daily message
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    
    return allWisdom[dayOfYear % allWisdom.length];
  }
  
  // Get a random slogan
  getSlogan(): string {
    return recoveryWisdom.slogans[Math.floor(Math.random() * recoveryWisdom.slogans.length)];
  }
  
  // Get wisdom by type
  getWisdom(type: 'justForToday' | 'experience' | 'encouragement' = 'encouragement'): string {
    const wisdom = recoveryWisdom[type];
    return wisdom[Math.floor(Math.random() * wisdom.length)];
  }
  
  // Save personal recovery reasons
  savePersonalReason(reason: string): void {
    const reasons = this.getPersonalReasons();
    reasons.push({
      id: Date.now().toString(),
      reason,
      createdAt: new Date().toISOString()
    });
    
    localStorage.setItem(PERSONAL_REASONS_KEY, JSON.stringify(reasons));
    
    toast.success('Your reason has been saved. We\'ll remind you when you need it most.');
  }
  
  // Get personal recovery reasons
  getPersonalReasons(): Array<{ id: string; reason: string; createdAt: string }> {
    try {
      const stored = localStorage.getItem(PERSONAL_REASONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }
  
  // Get a random personal reason
  getRandomPersonalReason(): string | null {
    const reasons = this.getPersonalReasons();
    if (reasons.length === 0) return null;
    
    return reasons[Math.floor(Math.random() * reasons.length)].reason;
  }
  
  // Show wisdom toast
  showWisdom(type?: 'justForToday' | 'experience' | 'encouragement'): void {
    const wisdom = type ? this.getWisdom(type) : this.getTodaysWisdom();
    
    toast(wisdom, {
      duration: 8000,
      icon: '💙',
    });
  }
  
  // Show personal reason or wisdom
  showPersonalOrWisdom(): void {
    const personalReason = this.getRandomPersonalReason();
    
    if (personalReason) {
      toast(personalReason, {
        duration: 8000,
        description: 'Your reason for recovery',
        icon: '💪',
      });
    } else {
      this.showWisdom();
    }
  }
  
  // Crisis wisdom - when they really need it
  getCrisisWisdom(): string[] {
    return [
      "This craving will pass whether you use or not.",
      "Play the tape forward. How will you feel tomorrow?",
      "You've come too far to give up now.",
      "Reach out before you use. Someone is waiting for your call.",
      "You don't have to want to stay clean. You just have to not use.",
      "The pain of staying clean is nothing compared to the pain of going back.",
      "You've survived 100% of your worst days.",
      "Your addiction is doing push-ups, waiting. Don't give it the chance.",
      "There's nothing so bad that using won't make worse.",
      "Just make it through the next hour. That's all."
    ];
  }
}

export const recoveryWisdom = new RecoveryWisdomService();

// Daily wisdom setup
export const setupDailyWisdom = () => {
  // Show wisdom at 9 AM and 7 PM
  const now = new Date();
  const hours = now.getHours();
  
  if (hours === 9 || hours === 19) {
    recoveryWisdom.showWisdom();
  }
  
  // Check again in 1 hour
  setTimeout(setupDailyWisdom, 60 * 60 * 1000);
};