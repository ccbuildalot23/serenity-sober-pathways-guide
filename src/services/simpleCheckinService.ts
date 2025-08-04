// Simple Check-in Service - How are you today? That's all we need to know.

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { hopeMessenger } from './hopeMessengerService';
import { victoryTracker } from './victoryTrackerService';

export type MoodToday = 'struggling' | 'managing' | 'good';

export interface SimpleCheckin {
  id: string;
  user_id: string;
  mood: MoodToday;
  date: string;
  created_at: string;
}

class SimpleCheckinService {
  // Check in with just mood
  async checkIn(mood: MoodToday): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Save check-in
      await supabase.from('simple_checkins').insert({
        user_id: user.id,
        mood: mood,
        date: new Date().toISOString().split('T')[0]
      });
      
      // Update streak
      await this.updateStreak();
      
      // Send appropriate response
      if (mood === 'struggling') {
        hopeMessenger.sendHope('struggling');
        toast.info('Remember: It\'s okay to not be okay. Reach out to someone.', {
          duration: 6000
        });
      } else if (mood === 'managing') {
        hopeMessenger.sendHope('victory');
        toast.success('Managing is winning. Keep using your tools.', {
          duration: 5000
        });
      } else {
        hopeMessenger.sendHope('victory');
        await victoryTracker.trackPersonalVictory('Feeling good today!');
        toast.success('Beautiful! Your joy gives others hope. 🌟', {
          duration: 5000
        });
      }
      
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast.error('Couldn\'t save check-in, but your feelings are still valid.');
    }
  }
  
  // Get today's check-in
  async getTodaysCheckin(): Promise<SimpleCheckin | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('simple_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      return data;
    } catch (error) {
      console.error('Error loading check-in:', error);
      return null;
    }
  }
  
  // Get check-in history
  async getCheckinHistory(days: number = 30): Promise<SimpleCheckin[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('simple_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error loading check-in history:', error);
      return [];
    }
  }
  
  // Update clean days streak
  private async updateStreak(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get consecutive check-ins
      const history = await this.getCheckinHistory(365);
      
      let streak = 0;
      const today = new Date();
      
      // Count backwards from today
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const hasCheckin = history.some(c => c.date === dateStr);
        
        if (hasCheckin) {
          streak++;
        } else if (i > 0) {
          // Allow today to be missing, but break on any other missing day
          break;
        }
      }
      
      // Update local storage
      localStorage.setItem('clean_days', streak.toString());
      
      // Update user metadata
      await supabase.auth.updateUser({
        data: { clean_days: streak }
      });
      
      // Check for milestones
      if (streak > 0 && (streak === 1 || streak % 7 === 0 || [30, 60, 90, 180, 365].includes(streak))) {
        hopeMessenger.celebrateMilestone(streak);
      }
      
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  }
  
  // Get mood summary
  async getMoodSummary(days: number = 7): Promise<{ struggling: number; managing: number; good: number }> {
    const history = await this.getCheckinHistory(days);
    
    return history.reduce((summary, checkin) => {
      summary[checkin.mood]++;
      return summary;
    }, { struggling: 0, managing: 0, good: 0 });
  }
  
  // Get encouragement based on recent moods
  async getPersonalizedEncouragement(): Promise<string> {
    const summary = await this.getMoodSummary(7);
    const total = summary.struggling + summary.managing + summary.good;
    
    if (total === 0) {
      return "Check in today. We miss you and care about how you're doing.";
    }
    
    const strugglingPercent = (summary.struggling / total) * 100;
    const goodPercent = (summary.good / total) * 100;
    
    if (strugglingPercent > 50) {
      return "You've had some tough days. Remember: This too shall pass. Reach out for support.";
    } else if (goodPercent > 70) {
      return "You're doing amazing! Your recovery is inspiring others.";
    } else {
      return "You're navigating ups and downs. That's real recovery. Keep going.";
    }
  }
}

export const simpleCheckin = new SimpleCheckinService();

// Reminder to check in
export const setupCheckinReminder = () => {
  const checkTime = () => {
    const now = new Date();
    const hours = now.getHours();
    
    // Remind at 10 AM and 7 PM if not checked in
    if ((hours === 10 || hours === 19)) {
      simpleCheckin.getTodaysCheckin().then(checkin => {
        if (!checkin) {
          toast('How are you today?', {
            description: 'Take a moment to check in with yourself.',
            duration: 8000,
            action: {
              label: 'Check In',
              onClick: () => window.location.href = '/checkin'
            }
          });
        }
      });
    }
  };
  
  // Check now and every hour
  checkTime();
  setInterval(checkTime, 60 * 60 * 1000);
};