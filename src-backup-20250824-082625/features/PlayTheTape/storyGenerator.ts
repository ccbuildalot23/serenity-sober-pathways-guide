
import { UserData, GeneratedStory } from './types';

export const generateRecoveryStory = async (userData: UserData): Promise<GeneratedStory> => {
  const { sobrietyDays, challengeHistory } = userData;
  
  const consequences = challengeHistory.map(r => r.consequence).join(', ');
  const triggers = challengeHistory.map(r => r.trigger).join(', ');
  
  const storyVariants = [
    `You've been sober for ${sobrietyDays} days. The urge feels strong right now, but let's think this through. Remember what happened last time - ${consequences}. That started with ${triggers}, just like now. But this time, you noticed the pattern. You're here, making a different choice.`,
    
    `${sobrietyDays} days of clarity. ${sobrietyDays} days of healing. The voice in your head says "just once won't hurt," but your body remembers the truth. It remembers ${consequences}. Your recovery matters more than this moment of discomfort.`,
    
    `Imagine tomorrow morning. If you use tonight, you'll wake up to day zero again. The ${consequences} from before could happen again, or worse. But if you stay strong tonight, tomorrow is day ${sobrietyDays + 1}. Which tomorrow do you choose?`
  ];
  
  // Generic stories for users with no challenge history
  const genericStories = [
    `You've been sober for ${sobrietyDays} days. Each day is a victory. The urge feels strong right now, but this feeling will pass. Think about tomorrow morning - do you want to wake up proud of your choice tonight, or filled with regret? Your future self is counting on you to choose recovery.`,
    
    `${sobrietyDays} days of building a new life. The voice telling you to use is the same voice that got you into trouble before. But you've grown stronger. You've learned new ways to cope. This moment of discomfort is temporary, but your recovery is forever.`,
    
    `Picture yourself explaining to someone you care about why you used tonight. Now picture yourself telling them how you got through another difficult moment in recovery. Which conversation feels better? Which person do you want to be?`
  ];
  
  // Add delay to simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const stories = challengeHistory.length > 0 ? storyVariants : genericStories;
  
  return {
    id: Date.now().toString(),
    transcript: stories[Math.floor(Math.random() * stories.length)],
    duration: 45,
    generatedAt: new Date().toISOString()
  };
};
